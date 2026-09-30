import * as pdfjs from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { canvasBlob, download } from './lib'
pdfjs.GlobalWorkerOptions.workerSrc=workerSrc
export async function runPdfExtra(slug:string,file:File){const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;try{
  if(slug==='extract-pdf-text'){let text='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();text+=`\n--- Página ${i} ---\n`+content.items.map(item=>'str' in item?item.str:'').join(' ')}download(new TextEncoder().encode(text.trim()),'texto-extraido.txt','text/plain');return `${pdf.numPages} páginas leídas y texto descargado`}
  if(slug==='pdf-to-images'){for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),viewport=page.getViewport({scale:1.6}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise;download(await canvasBlob(canvas,'image/png'),`pagina-${i}.png`,'image/png')}return `${pdf.numPages} imágenes descargadas`}
  if(slug==='ocr-pdf'){const Tesseract=await import('tesseract.js');const worker=await Tesseract.createWorker('spa+eng');let text='';try{for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),viewport=page.getViewport({scale:2}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise;const result=await worker.recognize(canvas);text+=`\n--- Página ${i} ---\n${result.data.text}`}}finally{await worker.terminate()}download(new TextEncoder().encode(text.trim()),'ocr-pdf.txt','text/plain');return `${pdf.numPages} páginas reconocidas y texto descargado`}
  throw new Error('Herramienta desconocida')
}finally{await pdf.cleanup()}}
