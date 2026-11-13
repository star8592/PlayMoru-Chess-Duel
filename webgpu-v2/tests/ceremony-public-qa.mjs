import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('../../web/node_modules/playwright');
const base='https://star8592.github.io/PlayMoru-Chess-Duel/webgpu-v2/';
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=vulkan','--ignore-gpu-blocklist']});
let fail=0;
try{
 for(const [name,opts] of [['desktop',{viewport:{width:1440,height:900}}],['mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}]]){
  const ctx=await browser.newContext(opts),page=await ctx.newPage();
  const errors=[],failed=[];const begin=Date.now();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url().slice(-100))});
  try{
   await page.goto(base+'?v=royal',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.__pmv2?.info().pieces===32&&window.__pmv2.info().phase==='menu',null,{timeout:90000,polling:250});
   await page.waitForTimeout(950);
   const menuShot='/tmp/pm-royal-public-'+name+'-menu.jpg';
   await page.screenshot({path:menuShot,type:'jpeg',quality:84});
   const mainTitle=await page.locator('.ceremony h1').innerText();
   const originalAttribution=await page.locator('.stage-signature').innerText();
   await page.locator('#intro-start').click();
   await page.waitForFunction(()=>window.__pmv2?.info().phase==='playing',null,{timeout:6500,polling:150});
   const battleShot='/tmp/pm-royal-public-'+name+'-battle.jpg';
   await page.screenshot({path:battleShot,type:'jpeg',quality:84});
   for(const sq of ['e2','e4']){
     const pt=await page.evaluate(s=>window.__pmv2.squareScreen(s),sq);
     if(name==='mobile')await page.touchscreen.tap(pt.x,pt.y);
     else await page.mouse.click(pt.x,pt.y);
     await page.waitForTimeout(150);
   }
   await page.waitForFunction(()=>window.__pmv2?.snapshot().sanList[0]==='e4'&&!window.__pmv2.snapshot().busy,null,{timeout:16000,polling:250});
   const state=await page.evaluate(()=>({info:window.__pmv2.info(),san:window.__pmv2.snapshot().sanList}));
   await page.locator('#menu-button').click();
   const returned=await page.waitForFunction(()=>window.__pmv2.info().phase==='menu',null,{timeout:6000}).then(()=>true,()=>false);
   const pass=returned&&mainTitle.includes('CHESS')&&originalAttribution.includes('MIT')&&state.info.backend==='WebGL2'&&state.info.skinned===32&&state.san[0]==='e4'&&errors.length===0&&failed.length===0;
   if(!pass)fail++;
   console.log(JSON.stringify({mode:name,pass,timeMs:Date.now()-begin,backend:state.info.backend,skinned:state.info.skinned,returned,moves:state.san,errors,failed,menuShot,battleShot}));
  }catch(e){fail++;console.log(JSON.stringify({mode:name,pass:false,error:String(e.stack||e).slice(0,680),errors,failed}))}
  await ctx.close();
 }
}finally{await browser.close()}
console.log('PUBLIC_CEREMONY_QA '+(fail?'FAIL '+fail:'PASS'));
process.exitCode=fail?1:0;
