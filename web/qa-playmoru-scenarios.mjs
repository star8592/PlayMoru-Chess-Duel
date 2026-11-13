import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import {chromium} from 'playwright';
const ROOT=path.resolve(import.meta.dirname,'dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 const uri=decodeURIComponent(req.url.split('?')[0]);let p=path.resolve(ROOT,'.'+(uri==='/'?'/index.html':uri));
 if(!p.startsWith(ROOT+'/'))return res.writeHead(403).end();
 fs.readFile(p,(err,data)=>{if(err)return res.writeHead(404).end(); res.writeHead(200,{'content-type':MIME[path.extname(p)]||'application/octet-stream'}).end(data)});
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const cases=process.argv.slice(2).length?process.argv.slice(2):['capture','mate','castle','enpassant','promote'];
const args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist'];
if(process.env.PLAYMORU_QA_GPU==='vulkan')args.push('--use-angle=vulkan','--enable-features=Vulkan','--enable-gpu');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args});
let fail=0;
try{
 for(const name of cases){
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  const errors=[];
  let modelCount=0;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().includes('/models/')&&r.status()===200)modelCount++;if(r.url().startsWith(base)&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url().slice(-70))});
  try{
    const start=Date.now();
    await page.goto(base+'/?scenario='+name+'&review=1&probe=1&seed=pmverify&quality=medium&era=rome',{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(()=>{const k=window.__kg;if(!k?.controller)return false;const s=k.controller.getSnapshot();return s.sanList.length>0&&!s.busy},null,{timeout:90000,polling:300});
    const state=await page.evaluate(()=>{const k=window.__kg,s=k.controller.getSnapshot();return {san:s.sanList.at(-1),plies:s.sanList.length,captured:s.captured.length,busy:s.busy,phase:s.status,timeouts:k.controller.getAnimationTimeouts?.(),roster:k.roster?.(),combat:k.combat?.(),perf:k.perf?.()}});
    const file=path.join(process.env.PLAYMORU_QA_EVIDENCE||'/tmp','pm-chess-'+name+'-review.jpg');
    await page.screenshot({path:file,type:'jpeg',quality:75});
    const ok=state.plies===1 && state.busy===false && (state.timeouts??0)===0 && errors.length===0 && (!!state.san) && state.roster?.skinned===state.roster?.pieces && modelCount>=6;
    if(!ok)fail++;
    console.log(JSON.stringify({scenario:name,pass:ok,timeMs:Date.now()-start,modelCount,screen:file,state:{san:state.san,plies:state.plies,captured:state.captured,busy:state.busy,phase:state.phase,timeouts:state.timeouts,roster:state.roster?{pieces:state.roster.pieces,skinned:state.roster.skinned}:null,contacts:state.combat?.contactsResolved,p95:state.perf?.p95},errors:errors.slice(0,5)}));
  }catch(e){fail++;console.log(JSON.stringify({scenario:name,pass:false,error:String(e).slice(0,600),errors:errors.slice(0,6),models:modelCount}));}
  finally{await context.close();}
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({qa:'chess-scenarios',passed:cases.length-fail,total:cases.length}));
process.exitCode=fail?1:0;

