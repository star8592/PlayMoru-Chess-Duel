import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('../../web/node_modules/playwright');
const root=new URL('../',import.meta.url).pathname,port=18777;
const server=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore'});
let browser;
try{
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:'+port+'/')).ok)break}catch{}await new Promise(r=>setTimeout(r,230))}
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=vulkan','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const logs=[];page.on('pageerror',e=>logs.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push(m.text())});
 await page.goto('http://127.0.0.1:'+port+'/?backend=webgl&review=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__pmv2?.info().pieces===32,null,{timeout:60000});
 const status=()=>page.evaluate(()=>({info:window.__pmv2.info(),turn:window.__pmv2.snapshot().turn,busy:window.__pmv2.snapshot().busy,status:window.__pmv2.snapshot().status,sans:window.__pmv2.snapshot().sanList}));
 const a=await page.evaluate(()=>window.__pmv2.squareScreen('e2')),b=await page.evaluate(()=>window.__pmv2.squareScreen('e4'));
 console.log('INIT',JSON.stringify({a,b,state:await status()}));
 await page.mouse.click(a.x,a.y);await page.waitForTimeout(200);
 console.log('AFTER_E2',JSON.stringify(await status()));
 await page.mouse.click(b.x,b.y);await page.waitForTimeout(650);
 console.log('AFTER_E4',JSON.stringify(await status()));
 if((await status()).sans.length===0){
  console.log('DIRECT_MOVE',await page.evaluate(()=>window.__pmv2.tryMove('e2','e4')));
  await page.waitForTimeout(1200);
  console.log('DIRECT_STATE',JSON.stringify(await status()));
 }
 console.log('ERRORS',JSON.stringify(logs.slice(0,10)));
 await page.screenshot({path:'/tmp/pm-webgpu-v2-input-debug.jpg',type:'jpeg',quality:75});
}catch(e){console.log('FAIL',String(e.stack||e).slice(0,1000))}
finally{await browser?.close();server.kill('SIGTERM')}
