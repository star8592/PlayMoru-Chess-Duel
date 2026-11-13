import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('../../web/node_modules/playwright');
const root=new URL('../',import.meta.url).pathname,port=18783;
const base='http://127.0.0.1:'+port+'/';
const srv=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore'});
let browser,fail=0;
async function ready(){for(let i=0;i<70;i++){try{if((await fetch(base)).ok)return}catch{}await new Promise(r=>setTimeout(r,260))}throw Error('Vite preview did not start')}
try{
 await ready();
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=vulkan','--ignore-gpu-blocklist']});
 for(const [name,options] of [['desktop',{viewport:{width:1440,height:900}}],['mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}]]){
  const context=await browser.newContext(options),page=await context.newPage();
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))failed.push(r.status()+' '+r.url().slice(-90))});
  const start=Date.now();
  try{
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:25000});
   await page.waitForFunction(()=>window.__pmv2?.info()?.pieces===32&&document.querySelector('#app').dataset.phase==='menu',null,{timeout:85000,polling:330});
   // Capture after the real CSS title-unfurl transition has settled.
   await page.waitForTimeout(1200);
   const title=await page.locator('.ceremony h1').innerText();
   const visible=await page.locator('#intro-start').isVisible();
   const clickable=await page.locator('#intro-start').boundingBox();
   const beginPass=visible&&title.includes('CHESS DUEL')&&clickable.height>=45;
   const menuShot='/tmp/pm-ceremony-'+name+'-menu.jpg';
   await page.screenshot({path:menuShot,type:'jpeg',quality:85});
   await page.locator('#intro-start').click({timeout:12000});
   await page.waitForFunction(()=>document.querySelector('#app').dataset.phase==='playing'&&window.__pmv2?.info()?.phase==='playing',null,{timeout:7000,polling:150});
   const isHud=await page.locator('#battle-ui').isVisible();
   const battleShot='/tmp/pm-ceremony-'+name+'-battle.jpg';
   await page.screenshot({path:battleShot,type:'jpeg',quality:84});
   for(const sq of ['e2','e4']){
    const p=await page.evaluate(s=>window.__pmv2.squareScreen(s),sq);
    if(name==='mobile')await page.touchscreen.tap(p.x,p.y);
    else await page.mouse.click(p.x,p.y);
    await page.waitForTimeout(140);
   }
   await page.waitForFunction(()=>window.__pmv2.snapshot().sanList.length>=1&&!window.__pmv2.snapshot().busy,null,{timeout:17000,polling:240});
   const s=await page.evaluate(()=>({san:window.__pmv2.snapshot().sanList,phase:window.__pmv2.info().phase,backend:window.__pmv2.info().backend,pieces:window.__pmv2.info().pieces,skinned:window.__pmv2.info().skinned}));
   await page.locator('#menu-button').click();
   await page.waitForFunction(()=>window.__pmv2?.info()?.phase==='menu',null,{timeout:6000,polling:120});
   const backToHall=await page.locator('#intro-start').isVisible();
   const pass=beginPass&&isHud&&backToHall&&s.san[0]==='e4'&&s.backend==='WebGL2'&&s.pieces===32&&s.skinned===32&&errors.length===0&&failed.length===0;
   if(!pass)fail++;
   console.log(JSON.stringify({mode:name,pass,beginPass,isHud,backToHall,elapsed:Date.now()-start,game:s,errors,failed,menuShot,battleShot}));
  }catch(e){fail++;console.log(JSON.stringify({mode:name,pass:false,error:String(e.stack||e).slice(0,880),errors,failed}))}
  await context.close();
 }
}catch(e){fail++;console.log('FATAL',String(e.stack||e))}
finally{await browser?.close();srv.kill('SIGTERM')}
console.log('CEREMONY_QA '+(fail?'FAIL '+fail:'PASS'));
process.exitCode=fail?1:0;
