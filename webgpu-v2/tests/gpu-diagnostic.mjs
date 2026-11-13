import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require('../../web/node_modules/playwright');
const root=new URL('../',import.meta.url).pathname;
const PORT=18776,base='http://127.0.0.1:'+PORT;
const child=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{cwd:root,stdio:'ignore'});
let browser;
async function ready(){for(let i=0;i<60;i++){try{if((await fetch(base+'/smoke.html')).ok)return}catch{}await new Promise(r=>setTimeout(r,250))}throw Error('No Vite dev')}
try{
 await ready();
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-webgpu','--enable-features=Vulkan,WebGPUDeveloperFeatures','--use-angle=vulkan','--ignore-gpu-blocklist']});
 for(const name of ['smoke','v2']){
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  const errors=[];const msgs=[];
  page.on('pageerror',e=>errors.push('JS '+e.message));
  page.on('console',m=>{if(m.type()!=='log')msgs.push(m.type()+' '+m.text().slice(0,400))});
  page.on('response',r=>{if(r.status()>=400)msgs.push('HTTP '+r.status()+' '+r.url().slice(-125))});
  await page.goto(base+(name==='smoke'?'/smoke.html':'/?review=1'),{waitUntil:'domcontentloaded',timeout:20000});
  if(name==='smoke')await page.waitForFunction(()=>window.__smoke?.frames()>30,null,{timeout:30000});
  else await page.waitForFunction(()=>window.__pmv2?.info()?.pieces===32,null,{timeout:70000});
  await page.waitForTimeout(2000);
  const data=await page.evaluate(async()=>{
    const adapter=await navigator.gpu?.requestAdapter();
    const smoke=window.__smoke;
    const v2=window.__pmv2;
    return {gpu:!!navigator.gpu,adapter:adapter?.info?.description,smoke:smoke?{backend:smoke.backend,frames:smoke.frames()}:null,v2:v2?.info(),env:{isSecureContext,crossOriginIsolated},canvas:[...document.querySelectorAll('canvas')].map(c=>({w:c.width,h:c.height,clientWidth:c.clientWidth,clientHeight:c.clientHeight}))};
  });
  const shot='/tmp/pm-webgpu-'+name+'-debug.png';
  await page.screenshot({path:shot});
  console.log(JSON.stringify({name,data,errors,msgs:msgs.slice(0,18),shot}));
  await page.close();
 }
}catch(e){console.log('FAIL '+String(e.stack||e).slice(0,500))}
finally{await browser?.close();child.kill('SIGTERM')}
