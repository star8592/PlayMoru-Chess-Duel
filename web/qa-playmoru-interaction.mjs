import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const ROOT=path.resolve(import.meta.dirname,'dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 const u=decodeURIComponent(req.url.split('?')[0]);
 const file=path.resolve(ROOT,'.'+(u==='/'?'/index.html':u));
 if(!file.startsWith(ROOT+'/'))return res.writeHead(403).end();
 fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream'}).end(data)});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const BASE='http://127.0.0.1:'+server.address().port+'/';
const args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist'];
if(process.env.PLAYMORU_QA_GPU==='vulkan') args.push('--use-angle=vulkan','--enable-features=Vulkan','--enable-gpu');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args});
let failures=0;
async function playTap(page,square,mobile){
 const p=await page.evaluate(s=>window.__kg?.pickPointFor(s),square);
 if(!p?.ok)throw Error('unpickable square '+square+' '+JSON.stringify(p));
 const check=await page.evaluate(({x,y})=>window.__kg.pickAt(x,y),p);
 if(check?.square!==square)throw Error('incorrect pick '+square+' -> '+check?.square);
 if(mobile)await page.touchscreen.tap(p.x,p.y);
 else await page.mouse.click(p.x,p.y);
}
try{
 for(const mode of ['desktop','mobile']){
  const mobile=mode==='mobile';
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const start=Date.now();
  try{
   await page.goto(BASE+'?review=1&probe=1&seed=manual',{waitUntil:'domcontentloaded',timeout:20000});
   await page.waitForFunction(()=>window.__kg?.roster()?.pieces===32 && window.__kg?.controller?.getSnapshot()?.status==='playing',null,{timeout:90000,polling:300});
   await page.waitForTimeout(1500);
   const pre=await page.evaluate(()=>({roster:window.__kg.roster(),camera:window.__kg.cameraState(),source:window.__kg.provenance()}));
   if(pre.source.era!=='rome' || pre.source.foreign.length || !pre.source.complete) throw Error('Default game not fully local Rome roster '+JSON.stringify(pre.source));
   await playTap(page,'e2',mobile);
   await page.waitForTimeout(150);
   const selected=await page.evaluate(()=>window.__kg.selection());
   if(selected.selected!=='e2'||!selected.targets.includes('e4'))throw Error('selection '+JSON.stringify(selected));
   await playTap(page,'e4',mobile);
   await page.waitForFunction(()=>{const s=window.__kg?.controller?.getSnapshot();return s?.sanList?.length===1&&!s.busy},null,{timeout:35000,polling:250});
   const state=await page.evaluate(()=>{const k=window.__kg,s=k.controller.getSnapshot();return {san:s.sanList,fen:s.fen,roster:k.roster(),perf:k.perf(),timeouts:k.controller.getAnimationTimeouts(),camera:k.cameraState()}});
   const output='/tmp/pm-chess-'+mode+'-manual.jpg';await page.screenshot({path:output,type:'jpeg',quality:76});
   const pass=state.san[0]==='e4' && state.timeouts===0 && errors.length===0 && state.roster.pieces===32 && state.roster.skinned===32;
   if(!pass)failures++;
   console.log(JSON.stringify({mode,pass,timeMs:Date.now()-start,move:state.san,elapsedFrameP95:state.perf.p95,rosterSkinned:state.roster.skinned,camera:state.camera,sourceEra:pre.source.era,foreignAssets:pre.source.foreign.length,errors:errors.slice(0,5),output}));
  }catch(e){failures++;console.log(JSON.stringify({mode,pass:false,error:String(e).slice(0,550),errors:errors.slice(0,6)}))}
  await ctx.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
console.log(JSON.stringify({type:'manual-input-qa',passed:2-failures,total:2}));
process.exitCode=failures?1:0;

