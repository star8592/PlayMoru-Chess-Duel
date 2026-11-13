import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('../../web/node_modules/playwright');
const root=new URL('../',import.meta.url).pathname,port=18781;
const base='http://127.0.0.1:'+port+'/';
const server=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore'});
let browser;let fail=0;
const tests=[
{name:'capture',fen:'rnb1kbnr/ppppqppp/8/8/8/8/PPPQPPPP/RNB1KBNR w KQkq - 0 1',from:'d2',to:'d7',san:'Qxd7+',captures:1},
{name:'castle',fen:'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',from:'e1',to:'g1',san:'O-O',captures:0},
{name:'enpassant',fen:'rnbqkbnr/pppp1ppp/8/4Pp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',from:'e5',to:'f6',san:'exf6',captures:1},
];
try{
 for(let i=0;i<55;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,260))}
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=vulkan','--ignore-gpu-blocklist']});
 for(const t of tests){
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const began=Date.now();
  try{
   await page.goto(base+'?review=1&fen='+encodeURIComponent(t.fen),{waitUntil:'domcontentloaded',timeout:20000});
   await page.waitForFunction(()=>window.__pmv2?.info()?.pieces>=6,null,{timeout:60000});
   const initial=await page.evaluate(()=>window.__pmv2.info());
   for(const sq of [t.from,t.to]){
    const p=await page.evaluate(s=>window.__pmv2.squareScreen(s),sq);
    await page.mouse.click(p.x,p.y);
    await page.waitForTimeout(180);
   }
   await page.waitForFunction(expected=>{
    const x=window.__pmv2;return x?.snapshot().sanList.at(-1)===expected&&!x.snapshot().busy;
   },t.san,{timeout:16000,polling:250});
   const state=await page.evaluate(()=>({info:window.__pmv2.info(),sans:window.__pmv2.snapshot().sanList}));
   const output='/tmp/pm-v2-combat-'+t.name+'.jpg';await page.screenshot({path:output,type:'jpeg',quality:75});
   const good=state.sans.at(-1)===t.san&&state.info.animationTimeouts===0&&state.info.activeMoves===0&&state.info.pieces===initial.pieces-t.captures&&errors.length===0;
   if(!good)fail++;
   console.log(JSON.stringify({scenario:t.name,pass:good,elapsed:Date.now()-began,move:state.sans,initial:initial.pieces,remaining:state.info.pieces,clipCount:state.info.clipsLoaded,errors,shot:output}));
  }catch(e){fail++;console.log(JSON.stringify({scenario:t.name,pass:false,error:String(e.stack||e).slice(0,350),errors}));}
  await page.close();
 }
}catch(e){fail++;console.log('FATAL '+String(e.stack||e).slice(0,450))}
finally{await browser?.close();server.kill('SIGTERM')}
console.log('V2_COMBAT_QA '+(fail?'FAIL '+fail:'PASS'));
process.exitCode=fail?1:0;
