import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('../../web/node_modules/playwright');
const root=new URL('../',import.meta.url).pathname,port=18793,base='http://127.0.0.1:'+port+'/';
const server=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore'});
const cases=[
 {role:'p',fen:'7k/8/8/3p4/4P3/8/8/4K3 w - - 0 1',from:'e4',to:'d5',san:'exd5'},
 {role:'n',fen:'7k/8/8/8/8/5p2/8/4K1N1 w - - 0 1',from:'g1',to:'f3',san:'Nxf3'},
 {role:'r',fen:'7k/p7/8/8/8/8/8/R3K3 w - - 0 1',from:'a1',to:'a7',san:'Rxa7'},
 {role:'b',fen:'7k/5p2/8/8/2B5/8/8/4K3 w - - 0 1',from:'c4',to:'f7',san:'Bxf7'},
 {role:'q',fen:'rnb1kbnr/ppppqppp/8/8/8/8/PPPQPPPP/RNB1KBNR w KQkq - 0 1',from:'d2',to:'d7',san:'Qxd7+'},
 {role:'k',fen:'7k/8/8/8/8/4p3/4K3/8 w - - 0 1',from:'e2',to:'e3',san:'Kxe3'},
];
let browser,fail=0;
async function ready(){for(let i=0;i<65;i++){try{if((await fetch(base)).ok)return}catch{}await new Promise(r=>setTimeout(r,300))}throw Error('preview not running')}
async function clickSquare(page,square){
 const p=await page.evaluate(s=>window.__pmv2.squareScreen(s),square);
 await page.mouse.click(p.x,p.y);
 await page.waitForTimeout(95);
}
try{
 await ready();
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=vulkan','--ignore-gpu-blocklist']});
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 for(const c of cases){
  const page=await context.newPage();const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))requests.push(r.status()+' '+r.url().slice(-85))});
  const begin=Date.now();
  try{
   await page.goto(base+'?review=1&fen='+encodeURIComponent(c.fen),{waitUntil:'domcontentloaded',timeout:20000});
   await page.waitForFunction(()=>window.__pmv2?.info().clipsLoaded===24,null,{timeout:70000,polling:350});
   const before=await page.evaluate(()=>window.__pmv2.info());
   await clickSquare(page,c.from);await clickSquare(page,c.to);
   await page.waitForFunction(()=>window.__pmv2?.info()?.combat.phase==='windup',null,{timeout:8000,polling:65});
   const faceoff=await page.evaluate(()=>window.__pmv2.info().combat);
   if(c.role==='n'||c.role==='q'||c.role==='r')
    await page.screenshot({path:'/tmp/pm-r4-facing-'+c.role+'.jpg',type:'jpeg',quality:84});
   await page.waitForFunction(()=>window.__pmv2?.snapshot().sanList.at(-1)!==undefined&&!window.__pmv2?.snapshot().busy,null,{timeout:14000,polling:200});
   const after=await page.evaluate(()=>({info:window.__pmv2.info(),san:window.__pmv2.snapshot().sanList}));
   const good=faceoff.role===c.role&&faceoff.distance>.20&&faceoff.facingError<.085&&faceoff.opponentFacingError<.085&&typeof faceoff.attackerClip==='string'&&faceoff.attackerClip.startsWith('Armature|')&&after.san.at(-1)===c.san&&after.info.combat.phase==='idle'&&after.info.combat.impactCount===before.combat.impactCount+1&&after.info.pieces===before.pieces-1&&after.info.animationTimeouts===0&&errors.length===0&&requests.length===0;
   if(!good)fail++;
   console.log(JSON.stringify({role:c.role,pass:good,seconds:((Date.now()-begin)/1000).toFixed(1),phase:faceoff.phase,style:faceoff.style,distance:faceoff.distance,facingErr:Number(faceoff.facingError?.toFixed(4)),defenderFacingErr:Number(faceoff.opponentFacingError?.toFixed(4)),attackerClip:faceoff.attackerClip,defenderClip:faceoff.defenderClip,move:after.san.at(-1),errors,requests}));
  }catch(e){fail++;console.log(JSON.stringify({role:c.role,pass:false,error:String(e.stack||e).slice(0,620),errors,requests}))}
  await page.close();
 }
 await context.close();
 // Start/restart during the cinematic must not leave a busy, broken board.
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'?review=1&fen='+encodeURIComponent(cases[4].fen),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__pmv2?.info().clipsLoaded===24);
  await clickSquare(page,'d2');await clickSquare(page,'d7');
  await page.waitForFunction(()=>window.__pmv2?.info()?.combat.phase==='windup',null,{timeout:8000,polling:50});
  await page.locator('#start').click();
  await page.waitForFunction(()=>window.__pmv2?.info().pieces===32&&window.__pmv2.snapshot().sanList.length===0,null,{timeout:9000});
  await page.waitForTimeout(1100);
  const state=await page.evaluate(()=>({info:window.__pmv2.info(),snap:window.__pmv2.snapshot()}));
  const pass=state.info.pieces===32&&state.info.combat.phase==='idle'&&state.info.activeMoves===0&&state.snap.status==='playing'&&state.snap.sanList.length===0&&errors.length===0;
  if(!pass)fail++;
  console.log(JSON.stringify({test:'interrupt-capture-with-restart',pass,actors:state.info.pieces,phase:state.info.combat.phase,activeMoves:state.info.activeMoves,errors}));
 }catch(e){fail++;console.log(JSON.stringify({test:'interrupt-capture-with-restart',pass:false,error:String(e.stack||e).slice(0,600),errors}))}
 await page.close();
}catch(e){fail++;console.log('FATAL '+String(e.stack||e).slice(0,580))}
finally{await browser?.close();server.kill('SIGTERM')}
console.log('ROLE_FACE_AND_RESET_QA '+(fail?'FAIL '+fail:'PASS'));
process.exitCode=fail?1:0;
