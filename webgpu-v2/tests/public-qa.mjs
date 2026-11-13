import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('../../web/node_modules/playwright');
const BASE='https://star8592.github.io/PlayMoru-Chess-Duel/webgpu-v2/';
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=vulkan','--ignore-gpu-blocklist']});
let fail=0;
try{
 for(const [name,options] of [['desktop',{viewport:{width:1440,height:900}}],['mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}]]){
  const ctx=await browser.newContext(options),page=await ctx.newPage();
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url().slice(-80))});
  const t=Date.now();
  try{
   await page.goto(BASE+'?review=1&v=2',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.__pmv2?.info().pieces===32,null,{timeout:95000,polling:300});
   for(const sq of ['e2','e4']){
    const p=await page.evaluate(s=>window.__pmv2.squareScreen(s),sq);
    if(name==='mobile')await page.touchscreen.tap(p.x,p.y);
    else await page.mouse.click(p.x,p.y);
    await page.waitForTimeout(140);
   }
   await page.waitForFunction(()=>window.__pmv2.snapshot().sanList.at(-1)==='e4'&&!window.__pmv2.snapshot().busy,null,{timeout:17000,polling:250});
   const d=await page.evaluate(()=>({info:window.__pmv2.info(),san:window.__pmv2.snapshot().sanList}));
   const shot='/tmp/pm-v2-public-'+name+'.jpg';
   await page.screenshot({path:shot,type:'jpeg',quality:80});
   const okay=d.info.backend==='WebGL2'&&d.info.skinned===32&&d.info.animationTimeouts===0&&d.san[0]==='e4'&&!errors.length&&!failed.length;
   if(!okay)fail++;
   console.log(JSON.stringify({name,pass:okay,elapsedMs:Date.now()-t,info:{backend:d.info.backend,roles:d.info.roles,skinned:d.info.skinned,clips:d.info.clipsLoaded,fps:d.info.fps},san:d.san,errors,failed,shot}));
  }catch(e){fail++;console.log(JSON.stringify({name,pass:false,error:String(e.stack||e).slice(0,560),errors,failed}))}
  await ctx.close();
 }
}finally{await browser.close()}
console.log('PUBLIC_V2_QA '+(fail?'FAIL '+fail:'PASS'));process.exitCode=fail?1:0;
