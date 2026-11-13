import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('../../web/node_modules/playwright');
const root=new URL('../',import.meta.url).pathname;
const port=18798,base='http://127.0.0.1:'+port+'/';
const server=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore'});
let browser,fail=0;
async function ready(){for(let i=0;i<65;i++){try{if((await fetch(base)).ok)return}catch{}await new Promise(r=>setTimeout(r,270))}throw Error('not ready')}
try{
 await ready();
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=vulkan','--ignore-gpu-blocklist']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const page=await context.newPage(),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))failed.push(r.status()+' '+r.url().slice(-90))});
 try{
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>window.__pmv2?.info().pieces===32&&window.__pmv2.info().phase==='menu',null,{timeout:70000});
  await page.locator('#intro-start').tap();
  await page.waitForFunction(()=>window.__pmv2?.info().phase==='playing'&&!document.querySelector('#battle-ui').hidden&&window.__pmv2?.info().audio.voicePlaying,null,{timeout:8500,polling:120});
  const audio=await page.evaluate(()=>window.__pmv2.info().audio);
  const bboxSubtitle=await page.locator('#royal-subtitle').boundingBox();
  const bboxHUD=await page.locator('.battle-controls').boundingBox();
  const bboxChronicle=await page.locator('.chronicle').boundingBox();
  await page.screenshot({path:'/tmp/pm-royal-audio-mobile-subtitle.jpg',type:'jpeg',quality:85});
  const clearOfHUD=bboxSubtitle?.y+bboxSubtitle?.height<=bboxChronicle?.y+2;
  await page.waitForFunction(()=>window.__pmv2?.info().audio.music==='arena',null,{timeout:14000,polling:200});
  await page.waitForTimeout(1300);
  const arena=await page.evaluate(()=>window.__pmv2.info().audio);
  const pass=clearOfHUD&&audio.voicesAvailable===36&&audio.voicePlaying===true&&arena.music==='arena'&&arena.musicPlaying===true&&arena.musicLevel>.10&&!errors.length&&!failed.length;
  if(!pass)fail++;
  console.log(JSON.stringify({pass,clearOfHUD,subtitle:bboxSubtitle,controls:bboxHUD,chronicle:bboxChronicle,audio,arena,errors,failed,shot:'/tmp/pm-royal-audio-mobile-subtitle.jpg'}));
 }catch(e){fail++;console.log(JSON.stringify({pass:false,error:String(e.stack||e).slice(0,680),errors,failed}))}
 await context.close();
}catch(e){fail++;console.log('FATAL',String(e.stack||e).slice(0,400))}
finally{await browser?.close();server.kill('SIGTERM')}
console.log('ROYAL_AUDIO_MOBILE_QA '+(fail?'FAIL '+fail:'PASS'));
process.exitCode=fail?1:0;
