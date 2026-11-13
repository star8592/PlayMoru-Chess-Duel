import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('../../web/node_modules/playwright');
const base='https://star8592.github.io/PlayMoru-Chess-Duel/webgpu-v2/';
const srv=null;
let browser,fail=0;
async function ready(){for(let i=0;i<70;i++){try{if((await fetch(base)).ok)return}catch{}await new Promise(r=>setTimeout(r,240))}throw Error('server not ready')}
async function tap(page,square){
 const pt=await page.evaluate(s=>window.__pmv2.squareScreen(s),square);
 if(page.context()._options?.isMobile)await page.touchscreen.tap(pt.x,pt.y);
 else await page.mouse.click(pt.x,pt.y);
 await page.waitForTimeout(110);
}
try{
 await ready();
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=vulkan','--ignore-gpu-blocklist']});
 for(const scenario of ['capture','capture-mobile','checkmate']){
  const mobile=scenario.endsWith('-mobile');
  const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true}:{viewport:{width:1440,height:900}});
  const page=await ctx.newPage();
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url().slice(-90))});
  try{
   const capture=scenario.startsWith('capture');
   const fen=capture?'rnb1kbnr/ppppqppp/8/8/8/8/PPPQPPPP/RNB1KBNR w KQkq - 0 1':'7k/8/5KQ1/8/8/8/8/8 w - - 0 1';
   await page.goto(base+'?review=1&fen='+encodeURIComponent(fen),{waitUntil:'domcontentloaded',timeout:20000});
   await page.waitForFunction(n=>window.__pmv2?.info()?.pieces===n,capture?30:3,{timeout:65000,polling:280});
   const before=await page.evaluate(()=>window.__pmv2.info());
   if(capture){
    await tap(page,'d2');
    await tap(page,'d7');
    // Sample while the dramatic close-up is active.
    await page.waitForFunction(()=>window.__pmv2?.info()?.cinematicActive===true,null,{timeout:6000,polling:100});
    await page.waitForFunction(()=>window.__pmv2?.info()?.cameraFov<=36.5,null,{timeout:6500,polling:85});
    const mid=await page.evaluate(()=>window.__pmv2.info());
    await page.screenshot({path:'/tmp/pm-royal-cinematic-public-'+scenario+'-closeup.jpg',type:'jpeg',quality:80});
    await page.waitForFunction(()=>window.__pmv2.snapshot().sanList.at(-1)==='Qxd7+'&&!window.__pmv2.snapshot().busy,null,{timeout:15000,polling:220});
    const after=await page.evaluate(()=>window.__pmv2.info());
    await page.screenshot({path:'/tmp/pm-royal-cinematic-public-'+scenario+'-return.jpg',type:'jpeg',quality:80});
    const pass=mid.cinematicActive===true&&mid.cameraDistance<before.cameraDistance&&after.cinematicActive===false&&after.cameraFov===before.cameraFov&&after.pieces===29&&after.animationTimeouts===0&&errors.length===0&&failed.length===0;
    if(!pass)fail++;
    console.log(JSON.stringify({scenario,pass,initialCamera:before.cameraDistance,midCamera:mid.cameraDistance,midFov:mid.cameraFov,finalCamera:after.cameraDistance,finalFov:after.cameraFov,remaining:after.pieces,errors,failed}));
   }else{
    await tap(page,'g6');await tap(page,'g7');
    await page.waitForFunction(()=>window.__pmv2?.snapshot().status==='over'&&!document.querySelector('#result-overlay').hidden,null,{timeout:17000,polling:150});
    await page.waitForTimeout(1250);
    const beforeReset=await page.evaluate(()=>({snapshot:window.__pmv2.snapshot(),info:window.__pmv2.info(),title:document.querySelector('#result-title').textContent,reason:document.querySelector('#result-reason').textContent}));
    await page.screenshot({path:'/tmp/pm-royal-cinematic-checkmate-verdict.jpg',type:'jpeg',quality:84});
    await page.locator('#result-rematch').click();
    await page.waitForFunction(()=>window.__pmv2?.info()?.pieces===32&&window.__pmv2?.snapshot().status==='playing'&&document.querySelector('#result-overlay').hidden,null,{timeout:9000,polling:150});
    const afterReset=await page.evaluate(()=>({snapshot:window.__pmv2.snapshot(),info:window.__pmv2.info()}));
    const pass=beforeReset.snapshot.result?.reason==='checkmate'&&beforeReset.snapshot.result?.winner==='w'&&beforeReset.title.includes('象牙')&&beforeReset.reason.includes('CHECKMATE')&&afterReset.snapshot.sanList.length===0&&afterReset.info.pieces===32&&afterReset.info.phase==='playing'&&!errors.length&&!failed.length;
    if(!pass)fail++;
    console.log(JSON.stringify({scenario,pass,reason:beforeReset.snapshot.result,uiTitle:beforeReset.title,uiReason:beforeReset.reason,rematchActors:afterReset.info.pieces,errors,failed}));
   }
  }catch(e){fail++;console.log(JSON.stringify({scenario,pass:false,error:String(e.stack||e).slice(0,640),errors,failed}))}
  await ctx.close();
 }
}catch(e){fail++;console.log('FATAL',String(e.stack||e).slice(0,440))}
finally{await browser?.close();srv?.kill('SIGTERM')}
console.log('ROYAL_CINEMATIC_QA '+(fail?'FAIL '+fail:'PASS'));process.exitCode=fail?1:0;
