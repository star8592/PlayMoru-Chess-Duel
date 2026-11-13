import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('../../web/node_modules/playwright');
const root=new URL('../',import.meta.url).pathname,port=18799,base='http://127.0.0.1:'+port+'/';
const srv=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore'});
let browser,fail=0;
try{
 for(let i=0;i<65;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,260))}
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=vulkan','--ignore-gpu-blocklist']});
 for(const [mode,options] of [['desktop',{viewport:{width:1440,height:900}}],['mobile',{viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}]]){
  const ctx=await browser.newContext(options);const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__pmv2?.info().pieces===32,null,{timeout:70000});
   const btn=page.locator('#listen-overture');
   const visible=await btn.isVisible(),bbox=await btn.boundingBox();
   if(mode==='mobile')await btn.tap();else await btn.click();
   await page.waitForFunction(()=>window.__pmv2?.info().audio?.voicePlaying&&window.__pmv2?.info().audio?.phase==='hall',null,{timeout:8000,polling:100});
   const hall=await page.evaluate(()=>({audio:window.__pmv2.info().audio,subtitle:document.querySelector('.royal-subtitle-line').textContent}));
   const shot='/tmp/pm-royal-audio-preview-'+mode+'.jpg';
   await page.screenshot({path:shot,type:'jpeg',quality:84});
   if(mode==='mobile')await page.locator('#intro-start').tap();else await page.locator('#intro-start').click();
   await page.waitForFunction(()=>window.__pmv2?.info().audio.phase==='battle'&&window.__pmv2?.info().audio.voicePlaying,null,{timeout:8000,polling:100});
   const start=await page.evaluate(()=>window.__pmv2.info().audio);
   const pass=visible&&bbox?.y>0&&bbox?.y+bbox?.height<options.viewport.height-12&&hall.audio.voicePlaying&&hall.audio.musicPlaying&&hall.audio.lastVoiceId?.startsWith('hall-')&&hall.subtitle.length>3&&start.phase==='battle'&&!errors.length;
   if(!pass)fail++;
   console.log(JSON.stringify({mode,pass,buttonVisible:visible,buttonBox:bbox,hall,start,errors,shot}));
  }catch(e){fail++;console.log(JSON.stringify({mode,pass:false,error:String(e.stack||e).slice(0,550),errors}))}
  await ctx.close();
 }
}catch(e){fail++;console.log('FATAL',String(e.stack||e).slice(0,460))}
finally{await browser?.close();srv.kill('SIGTERM')}
console.log('ROYAL_AUDIO_PREVIEW_QA '+(fail?'FAIL '+fail:'PASS'));
process.exitCode=fail?1:0;
