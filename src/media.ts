import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'
import { download } from './lib'

let instance:FFmpeg|null=null
let loading:Promise<FFmpeg>|null=null
async function getFFmpeg(){if(instance)return instance;if(!loading)loading=(async()=>{const ffmpeg=new FFmpeg();await ffmpeg.load({coreURL,wasmURL});instance=ffmpeg;return ffmpeg})().catch(e=>{loading=null;throw e});return loading}
export async function runMediaTool(slug:string,file:File,options:{start:number,duration:number,speed:number}){
  const ffmpeg=await getFFmpeg();const ext=file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g,'')||'bin';const input=`input.${ext}`;let output='output.mp3',args:string[]=[];
  if(['mp4-to-mp3','wav-to-mp3','m4a-to-mp3'].includes(slug))args=['-i',input,'-vn','-codec:a','libmp3lame','-qscale:a','3',output];
  else if(['webm-to-mp4','mov-to-mp4'].includes(slug)){output='output.mp4';args=['-i',input,'-c:v','libx264','-preset','ultrafast','-c:a','aac','-movflags','+faststart',output]}
  else if(slug==='video-to-gif'){output='output.gif';args=['-t',String(Math.min(10,options.duration||6)),'-i',input,'-vf','fps=10,scale=480:-1:flags=lanczos',output]}
  else if(slug==='gif-to-video'){output='output.mp4';args=['-i',input,'-movflags','+faststart','-pix_fmt','yuv420p','-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2',output]}
  else if(slug==='trim-audio'){args=['-ss',String(options.start||0),'-t',String(options.duration||10),'-i',input,'-codec:a','libmp3lame','-qscale:a','3',output]}
  else if(slug==='trim-video'){output='output.mp4';args=['-ss',String(options.start||0),'-t',String(options.duration||10),'-i',input,'-c:v','libx264','-preset','ultrafast','-c:a','aac',output]}
  else if(slug==='compress-audio')args=['-i',input,'-codec:a','libmp3lame','-b:a','96k',output];
  else if(slug==='compress-video'){output='output.mp4';args=['-i',input,'-c:v','libx264','-preset','ultrafast','-crf','32','-c:a','aac','-b:a','96k',output]}
  else if(slug==='audio-speed')args=['-i',input,'-filter:a',`atempo=${Math.max(.5,Math.min(2,options.speed||1))}`,'-codec:a','libmp3lame',output];
  else if(slug==='video-speed'){output='output.mp4';const speed=Math.max(.5,Math.min(2,options.speed||1));args=['-i',input,'-filter:v',`setpts=PTS/${speed}`,'-filter:a',`atempo=${speed}`,'-c:v','libx264','-preset','ultrafast','-c:a','aac',output]}
  else throw new Error('Conversión no disponible');
  await ffmpeg.writeFile(input,await fetchFile(file));try{const code=await ffmpeg.exec(args);if(code!==0)throw new Error('No se pudo convertir este archivo. Prueba con otro formato o un archivo más pequeño.');const data=await ffmpeg.readFile(output);if(typeof data==='string')throw new Error('Resultado inesperado');download(new Uint8Array(data),`${file.name.replace(/\.[^.]+$/,'')}-${slug}.${output.split('.').pop()}`,output.endsWith('mp4')?'video/mp4':output.endsWith('gif')?'image/gif':'audio/mpeg');return 'Archivo convertido y descargado'}finally{await ffmpeg.deleteFile(input).catch(()=>{});await ffmpeg.deleteFile(output).catch(()=>{})}
}
