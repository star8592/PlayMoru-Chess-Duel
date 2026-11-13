import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('../../web/node_modules/playwright');
const ROOT=new URL('../',import.meta.url).pathname,port=18779,base='http://127.0.0.1:'+port+'/';
const srv=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:ROOT,stdio:'ignore'});
async function ready(){for(let i=0;i<60;i++){try{if((await fetch(base)).ok)return}catch{}await new Promise(r=>setTimeout(r,250))}throw Error('Preview not ready')}
let browser;let fails=0;
try{
 await ready();
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=vulkan','--ignore-gpu-blocklist']});
 for(const [name,options] of [['desktop',{viewport:{width:1440,height:900}}],['mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}]]){
  const ctx=await browser.newContext(options),page=await ctx.newPage();
  const errors=[],urls=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)urls.push([r.status(),r.url()])});
  const start=Date.now();
  try{
   await page.goto(base+'?review=1',{waitUntil:'domcontentloaded',timeout:20000});
   await page.waitForFunction(()=>window.__pmv2?.info().pieces===32,null,{timeout:65000});
   const init=await page.evaluate(()=>({info:window.__pmv2.info(),turn:window.__pmv2.snapshot().turn,status:window.__pmv2.snapshot().status}));
   if(init.info.backend!=='WebGL2'||init.info.skinned!==32)throw Error('unsafe or missing backend '+JSON.stringify(init));
   for(const square of ['e2','e4']){
    const point=await page.evaluate(s=>window.__pmv2.squareScreen(s),square);
    if(name==='mobile')await page.touchscreen.tap(point.x,point.y);
    else await page.mouse.click(point.x,point.y);
    await page.waitForTimeout(100);
   }
   await page.waitForFunction(()=>{const p=window.__pmv2;if(!p)return false;return p.snapshot().sanList[0]==='e4'&&!p.snapshot().busy},null,{timeout:15000,polling:250});
   const state=await page.evaluate(()=>({info:window.__pmv2.info(),san:window.__pmv2.snapshot().sanList,status:window.__pmv2.snapshot().status}));
   const screenshot='/tmp/playmoru-webgpu-v2-r1-'+name+'.jpg';
   await page.screenshot({path:screenshot,type:'jpeg',quality:82});
   const body=await page.locator('body').innerText();
   const ok=state.san[0]==='e4'&&state.info.activeMoves===0&&state.info.animationTimeouts===0&&errors.length===0;
   if(!ok)fails++;
   console.log(JSON.stringify({mode:name,pass:ok,timeMs:Date.now()-start,backend:state.info.backend,roleModels:state.info.roles,skinned:state.info.skinned,moves:state.san,frameRate:state.info.fps,urls:urls.slice(0,8),errors:errors.slice(0,5),screenshot}));
  }catch(e){fails++;console.log(JSON.stringify({mode:name,pass:false,error:String(e.stack||e).slice(0,500),errors,urls:urls.slice(0,10)}))}
  await ctx.close();
 }
}catch(e){fails++;console.log('FATAL '+String(e.stack||e))}
finally{await browser?.close();srv.kill('SIGTERM')}
console.log('R1_V2_QA '+(fails?'FAIL '+fails:'PASS'));
process.exitCode=fails?1:0;
