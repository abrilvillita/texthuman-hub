import { PDFDocument, degrees, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'
import { canvasBlob, download, imageCanvas } from './lib'

export async function runFileTool(slug:string,files:File[],width:number,height:number){
  if(!files.length)throw new Error('Selecciona un archivo')
  if(slug==='merge-pdf'){const out=await PDFDocument.create();for(const file of files){const src=await PDFDocument.load(await file.arrayBuffer());const pages=await out.copyPages(src,src.getPageIndices());pages.forEach(p=>out.addPage(p))}download(await out.save(),'pdf-unidos.pdf','application/pdf');return 'PDF listo para descargar'}
  if(slug==='split-pdf'){const src=await PDFDocument.load(await files[0].arrayBuffer());for(let i=0;i<src.getPageCount();i++){const out=await PDFDocument.create();out.addPage((await out.copyPages(src,[i]))[0]);download(await out.save(),`pagina-${i+1}.pdf`,'application/pdf')}return `${src.getPageCount()} páginas descargadas`}
  if(slug==='rotate-pdf'||slug==='number-pdf'){const doc=await PDFDocument.load(await files[0].arrayBuffer());const font=slug==='number-pdf'?await doc.embedFont(StandardFonts.Helvetica):null;doc.getPages().forEach((p,i)=>{if(slug==='rotate-pdf')p.setRotation(degrees((p.getRotation().angle+90)%360));else p.drawText(`${i+1}`,{x:p.getWidth()/2,y:20,size:11,font:font!,color:rgb(.2,.2,.2)})});download(await doc.save(),slug==='rotate-pdf'?'pdf-rotado.pdf':'pdf-numerado.pdf','application/pdf');return 'PDF listo para descargar'}
  if(slug==='images-to-pdf'){const doc=await PDFDocument.create();for(const file of files){const bytes=await file.arrayBuffer();const img=file.type==='image/png'?await doc.embedPng(bytes):await doc.embedJpg(bytes);const page=doc.addPage([img.width,img.height]);page.drawImage(img,{x:0,y:0,width:img.width,height:img.height})}download(await doc.save(),'imagenes.pdf','application/pdf');return 'PDF listo para descargar'}
  for(const file of files){const canvas=await imageCanvas(file);let type='image/png',extension='png',quality=0.9;
    if(slug==='resize-image'){const ratio=canvas.width/canvas.height;const w=Math.max(1,width||canvas.width),h=Math.max(1,height||Math.round(w/ratio));const resized=document.createElement('canvas');resized.width=w;resized.height=h;resized.getContext('2d')!.drawImage(canvas,0,0,w,h);canvas.width=w;canvas.height=h;canvas.getContext('2d')!.drawImage(resized,0,0)}
    if(slug==='favicon'){const icon=document.createElement('canvas');icon.width=64;icon.height=64;icon.getContext('2d')!.drawImage(canvas,0,0,64,64);canvas.width=64;canvas.height=64;canvas.getContext('2d')!.drawImage(icon,0,0)}
    if(slug==='png-to-jpg'){type='image/jpeg';extension='jpg';const bg=document.createElement('canvas');bg.width=canvas.width;bg.height=canvas.height;const ctx=bg.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,bg.width,bg.height);ctx.drawImage(canvas,0,0);canvas.getContext('2d')!.drawImage(bg,0,0)}
    if(slug==='image-to-webp'||slug==='compress-image'){type='image/webp';extension='webp';quality=slug==='compress-image'?.68:.85}
    const blob=await canvasBlob(canvas,type,quality);download(blob,`${file.name.replace(/\.[^.]+$/,'')}-${slug}.${extension}`,type)
  }return `${files.length} archivo${files.length===1?'':'s'} descargado${files.length===1?'':'s'}`
}
function csvParse(text:string){const rows:string[][]=[];let row:string[]=[],cell='',quote=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++}else quote=!quote}else if(c===','&&!quote){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=c}row.push(cell);rows.push(row);return rows.filter(r=>r.some(Boolean))}
function csvCell(v:unknown){const s=String(v??'');return /[",\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s}
export async function runTextTool(slug:string,input:string,mode:string){
  switch(slug){
    case 'word-counter': return `${input.trim()?input.trim().split(/\s+/).length:0} palabras · ${input.length} caracteres · ${input.split(/\n/).length} líneas`
    case 'clean-text':return input.replace(/\r\n/g,'\n').split('\n').map(s=>s.trim().replace(/[ \t]+/g,' ')).join('\n').replace(/\n{3,}/g,'\n\n').trim()
    case 'change-case':return mode==='lower'?input.toLocaleLowerCase():mode==='title'?input.toLocaleLowerCase().replace(/\b\p{L}/gu,c=>c.toLocaleUpperCase()):input.toLocaleUpperCase()
    case 'slug-generator':return input.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
    case 'json-formatter':return JSON.stringify(JSON.parse(input),null,2)
    case 'json-to-csv':{const data=JSON.parse(input);if(!Array.isArray(data)||!data.every(x=>x&&typeof x==='object'&&!Array.isArray(x)))throw new Error('Escribe una lista JSON de objetos');const keys=[...new Set(data.flatMap(x=>Object.keys(x)))];return [keys.map(csvCell).join(','),...data.map(x=>keys.map(k=>csvCell(x[k])).join(','))].join('\n')}
    case 'csv-to-json':{const [keys,...rows]=csvParse(input);return JSON.stringify(rows.map(r=>Object.fromEntries(keys.map((k,i)=>[k,r[i]??'']))),null,2)}
    case 'base64':return mode==='decode'?new TextDecoder().decode(Uint8Array.from(atob(input),c=>c.charCodeAt(0))):btoa(String.fromCharCode(...new TextEncoder().encode(input)))
    case 'url-encoder':return mode==='decode'?decodeURIComponent(input):encodeURIComponent(input)
    case 'jwt-decoder':{const parts=input.split('.');if(parts.length<2)throw new Error('JWT no válido');const b64=parts[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.stringify(JSON.parse(atob(b64)),null,2)+'\n\nFirma no verificada.'}
    case 'hash-generator':{const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}
    case 'timestamp':{const n=Number(input);return Number.isFinite(n)&&input.trim()?new Date(n<1e12?n*1000:n).toISOString():String(Math.floor(new Date(input).getTime()/1000))}
    case 'uuid-generator':return crypto.randomUUID()
    case 'password-generator':{const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';const result=[];const random=new Uint32Array(20);crypto.getRandomValues(random);for(const n of random)result.push(chars[n%chars.length]);return result.join('')}
    case 'qr-generator':return await QRCode.toDataURL(input,{width:320,margin:2})
    default:throw new Error('Herramienta desconocida')
  }
}
