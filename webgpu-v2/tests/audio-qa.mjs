import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('../../web/node_modules/playwright');
const root=new URL('../',import.meta.url).pathname;
const port=18797,base='http://127.0.0.1:'+port+'/';
const server=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore'});
let browser,fail=0;
async function ready(){for(let i=0;i<70;i++){try{if((await fetch(base)).ok)return}catch{}await new Promise(r=>setTimeout(r,250))}throw Error('vite not ready')}
async function clickSquare(page,square){
 const p=await page.evaluate(s=>window.__pmv2.squareScreen(s),square);
 await page.mouse.click(p.x,p.y);await page.waitForTimeout(110);
}
try{
 await ready();
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=vulkan','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))failed.push(r.status()+' '+r.url().slice(-90))});
 try{
  await page.goto(base+'?debug=1',{waitUntil:'domcontentloaded',timeout:23000});
  await page.waitForFunction(()=>window.__pmv2?.info()?.pieces===32,null,{timeout:70000,polling:300});
  const before=await page.evaluate(()=>window.__pmv2.info().audio);
  await page.locator('#intro-start').click();
  await page.waitForFunction(()=>window.__pmv2?.info()?.audio?.speechesPlayed>=1,null,{timeout:9500,polling:120});
  await page.waitForTimeout(800);
  const started=await page.evaluate(()=>({audio:window.__pmv2.info().audio,subtitle:document.querySelector('.royal-subtitle-line').textContent,subtitleHidden:document.querySelector('#royal-subtitle').hidden}));
  const shot='/tmp/pm-royal-audio-intro-desktop.jpg';
  await page.screenshot({path:shot,type:'jpeg',quality:83});
  await page.waitForFunction(()=>window.__pmv2?.info()?.audio?.music==='arena',null,{timeout:13800,polling:220});
  const arena=await page.evaluate(()=>window.__pmv2.info().audio);
  await page.locator('#sound-toggle').click();
  await page.waitForTimeout(450);
  const muted=await page.evaluate(()=>window.__pmv2.info().audio);
  await page.locator('#sound-toggle').click();
  await page.waitForTimeout(550);
  const resumed=await page.evaluate(()=>window.__pmv2.info().audio);
  const passed=before.voicesAvailable===36&&started.audio.music==='overture'&&started.audio.musicPlaying===true&&started.audio.voicePlaying===true&&started.subtitle.includes('王座之战')&&!started.subtitleHidden&&arena.music==='arena'&&arena.musicPlaying===true&&muted.enabled===false&&muted.musicPlaying===false&&resumed.enabled===true&&resumed.musicPlaying===true&&!errors.length&&!failed.length;
  if(!passed)fail++;
  console.log(JSON.stringify({scenario:'opening-music-and-voice-then-ambient-and-mute',pass:passed,before,started,arena,muted,resumed,errors,failed,shot}));
 }catch(e){fail++;console.log(JSON.stringify({scenario:'opening-music-and-voice-then-ambient-and-mute',pass:false,error:String(e.stack||e).slice(0,650),errors,failed}))}
 await page.close();

 const capture=await browser.newPage({viewport:{width:1440,height:900}}),errors2=[];
 capture.on('pageerror',e=>errors2.push(e.message));
 try{
  const fen='rnb1kbnr/ppppqppp/8/8/8/8/PPPQPPPP/RNB1KBNR w KQkq - 0 1';
  await capture.goto(base+'?review=1&fen='+encodeURIComponent(fen),{waitUntil:'domcontentloaded'});
  await capture.waitForFunction(()=>window.__pmv2?.info().audio.voicesAvailable===36&&window.__pmv2?.info().pieces===30,null,{timeout:70000});
  await clickSquare(capture,'d2');await clickSquare(capture,'d7');
  await capture.waitForFunction(()=>window.__pmv2?.info().combat.phase==='windup',null,{timeout:10000,polling:80});
  const spoke=await capture.evaluate(()=>({audio:window.__pmv2.info().audio,text:document.querySelector('.royal-subtitle-line').textContent,hidden:document.querySelector('#royal-subtitle').hidden}));
  await capture.waitForFunction(()=>window.__pmv2?.snapshot().sanList.at(-1)==='Qxd7+'&&!window.__pmv2.snapshot().busy,null,{timeout:20000});
  const ended=await capture.evaluate(()=>window.__pmv2.info().audio);
  const passed=spoke.audio.speechesPlayed>=1&&spoke.audio.lastVoiceId?.startsWith('attack-q')&&spoke.text.length>0&&!spoke.hidden&&ended.speechesPlayed>=1&&errors2.length===0;
  if(!passed)fail++;
  console.log(JSON.stringify({scenario:'queen-attack-original-voice',pass:passed,spoke,ended,errors:errors2}));
 }catch(e){fail++;console.log(JSON.stringify({scenario:'queen-attack-original-voice',pass:false,error:String(e.stack||e).slice(0,650),errors2}))}
 await capture.close();

 const mate=await browser.newPage({viewport:{width:1440,height:900}}),errors3=[];
 mate.on('pageerror',e=>errors3.push(e.message));
 try{
  const fen='7k/8/5KQ1/8/8/8/8/8 w - - 0 1';
  await mate.goto(base+'?review=1&fen='+encodeURIComponent(fen),{waitUntil:'domcontentloaded'});
  await mate.waitForFunction(()=>window.__pmv2?.info().pieces===3&&window.__pmv2.info().audio.voicesAvailable===36,null,{timeout:70000});
  await clickSquare(mate,'g6');await clickSquare(mate,'g7');
  await mate.waitForFunction(()=>window.__pmv2?.info()?.audio?.phase==='result'&&!document.querySelector('#result-overlay').hidden,null,{timeout:17000,polling:180});
  await mate.waitForTimeout(350);
  const state=await mate.evaluate(()=>window.__pmv2.info().audio);
  const passed=state.music==='victory'&&state.voicePlaying===true&&state.lastVoiceId?.startsWith('victory-w')&&errors3.length===0;
  if(!passed)fail++;
  console.log(JSON.stringify({scenario:'royal-victory-score-and-voiced-declaration',pass:passed,audio:state,errors:errors3}));
 }catch(e){fail++;console.log(JSON.stringify({scenario:'royal-victory-score-and-voiced-declaration',pass:false,error:String(e.stack||e).slice(0,650),errors3}))}
 await mate.close();
}catch(e){fail++;console.log('FATAL',String(e.stack||e).slice(0,460))}
finally{await browser?.close();server.kill('SIGTERM')}
console.log('ROYAL_AUDIO_QA '+(fail?'FAIL '+fail:'PASS'));
process.exitCode=fail?1:0;
