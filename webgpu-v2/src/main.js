import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { buildRoyalArchitecture } from './royalArchitecture.js';
import { RoyalCameraDirector, royalImpact } from './royalCinematics.js';
import { combatStyle, restingYaw, targetYaw, shortestYawDelta, standoffPoint } from './combatDirection.js';
import { GameController } from '../../web/src/core/gameController.ts';
import './style.css';

const $ = id => document.getElementById(id);
const SQ = 1.34;
const ROLES = ['p','r','n','b','q','k'];
const ROLE_NAME = {p:'步兵',r:'战车',n:'骑士',b:'主教',q:'皇后',k:'国王'};
const COLORS = {
  ivory:0xe2d5bc, onyx:0x344e61, gold:0xc9a775, shadow:0x1f3646,
  sky:0xc1d3de, white:0xf2e9d9, dark:0x63788b
};
const params=new URLSearchParams(location.search);
const testFen=params.get('fen');
const requestedBackend=params.get('backend');
const testMode=params.get('review')==='1';
const STAGE=$('stage');
$('app').dataset.debug=params.get('debug')==='1'?'1':'0';
const scene=new THREE.Scene();
scene.background=new THREE.Color(COLORS.sky);
scene.fog=new THREE.Fog(COLORS.sky,24,60);

const camera=new THREE.PerspectiveCamera(44,1,0.08,120);
camera.position.set(0,11.6,16.5);
const renderer=new THREE.WebGPURenderer({
  canvas:STAGE, antialias:true, alpha:false, powerPreference:'high-performance',
  // Native WebGPU remains an explicit GPU-driver qualification path.
  // The r187 WebGL2 backend is the certified default on current Z890 Chrome.
  ...(requestedBackend==='webgpu'?{}:{forceWebGL:true})
});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.AgXToneMapping;
renderer.toneMappingExposure=1.22;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
const orbit=new OrbitControls(camera, STAGE);
orbit.target.set(0,0.55,0);
orbit.enableDamping=true;
orbit.dampingFactor=.085;
orbit.minDistance=9.7;
orbit.maxDistance=27;
orbit.maxPolarAngle=Math.PI*.46;
orbit.minPolarAngle=.30;
orbit.enablePan=false;
orbit.update();

const ambient=new THREE.HemisphereLight(0xe8f4ff,0x758a90,3.0);
scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffe2bd,4.1);
sun.position.set(-8,18,11);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-12;
sun.shadow.camera.right=12;
sun.shadow.camera.top=12;
sun.shadow.camera.bottom=-12;
sun.shadow.camera.far=55;
sun.shadow.normalBias=.012;
sun.shadow.bias=-.00015;
scene.add(sun);
sun.target.position.set(0,0,0);scene.add(sun.target);
const fill=new THREE.DirectionalLight(0xc9e7ff,2.2);
fill.position.set(8,12,-8);scene.add(fill);

const mat=(hex,roughness=.55,metalness=.12)=>new THREE.MeshPhysicalMaterial({
 color:hex,roughness,metalness,clearcoat:.12,clearcoatRoughness:.46
});
const lightMat=mat(COLORS.white,.47,.05);
const darkMat=mat(COLORS.dark,.53,.10);
const trimMat=mat(COLORS.gold,.29,.65);
const stoneMat=mat(0x697d88,.73,.03);
const groundMat=mat(0x95abb5,.96,.0);
const tileGeo=new THREE.BoxGeometry(SQ*.986,.16,SQ*.986);
const tiles=[];
const boardHit=[];
const marks=[];
const actorMap=new Map();
const templates=new Map();
const mixers=new Set();
const activeMoves=[];
const loader=new GLTFLoader();
const controller=new GameController();
let selected=null;
let targetSquares=[];
let loading=true;
let stageReady=false;
let lastFrames=0;
let frameSamples=0;
let displayedFPS=0;
let currentBackend='初始化中';
let currentMode=testMode?'hotseat':'ai';
let previousTick=performance.now();
let frameMS=16.7;
let lastFrameAt=performance.now();

let audioCtx=null;
let hovered=null;
let visualEpoch=0;
let combatState={phase:'idle',role:null,attacker:null,defender:null,standoff:null,impactCount:0};
let ceremonialPhase='loading';
let soundEnabled=true;
let announcementTimer=null;
let duelTimer=null;
let resultOverlayEpoch=0;
let checkCalloutTimer=null;
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const ceremonyStartedAt=performance.now();
const stageStats={loadedRoleModels:0,modelCount:0,skinnedCount:0,errors:[],firstFrameAt:null};

function add(mesh, parent=scene){parent.add(mesh);return mesh;}
function box(w,h,d,material,x,y,z,cast=false,receive=true){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=receive;
 return add(m);
}
function createWorld(){
  // Architectural chess dais: premium crafted objects, no fake terrain geometry.
  box(11.85,.52,11.85,stoneMat,0,-.30,0,true,true);
  box(11.28,.25,11.28,trimMat,0,.004,0,true,true);
  box(10.95,.27,10.95,mat(0x233d50,.41,.39),0,.155,0,true,true);
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    const x=(col-3.5)*SQ,z=(3.5-row)*SQ;
    const mesh=new THREE.Mesh(tileGeo,(row+col)%2===0?lightMat:darkMat);
    mesh.position.set(x,.36,z);
    mesh.receiveShadow=true;mesh.castShadow=false;
    mesh.userData.square='abcdefgh'[col]+(row+1);
    tiles.push(mesh);boardHit.push(mesh);scene.add(mesh);
  }
  const ring=new THREE.Mesh(new THREE.TorusGeometry(7.55,.066,12,144),trimMat);
  ring.rotation.x=Math.PI/2;ring.position.y=-.37;scene.add(ring);
  const ring2=new THREE.Mesh(new THREE.TorusGeometry(8.14,.028,8,144),mat(0xc7c1b3,.53,.48));
  ring2.rotation.x=Math.PI/2;ring2.position.y=-.53;scene.add(ring2);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),groundMat);
  floor.rotation.x=-Math.PI/2;floor.position.y=-.585;floor.receiveShadow=true;scene.add(floor);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(9.2,9.8,.2,80),stoneMat);
  plinth.position.y=-.64;plinth.receiveShadow=true;scene.add(plinth);
  // Gold fillets and subtle position landmarks make the board readable at long distances.
  for(let i=0;i<4;i++){
    const x=(i%2?.5:-.5)*11.25,z=(Math.floor(i/2)?.5:-.5)*11.25;
    box(.28,.31,.28,trimMat,x,.02,z,true,true);
  }
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    const square='abcdefgh'[col]+(row+1);
    const marker=new THREE.Mesh(new THREE.CircleGeometry(.13,28),new THREE.MeshBasicMaterial({
      color:0xeab96d,transparent:true,opacity:.86,depthWrite:false,
      side:THREE.DoubleSide,toneMapped:false
    }));
    marker.rotation.x=-Math.PI/2;marker.position.set((col-3.5)*SQ,.454,(3.5-row)*SQ);
    marker.visible=false;marker.userData.square=square;
    marker.userData.kind='move-target';
    marks.push(marker);scene.add(marker);
  }
}
createWorld();
buildRoyalArchitecture(THREE,scene,mat);

const XZ=square=>{
 const col=square.charCodeAt(0)-97;
 const row=Number(square[1])-1;
 return new THREE.Vector3((col-3.5)*SQ,.46,(3.5-row)*SQ);
};
const asset=(kind,clip)=>import.meta.env.BASE_URL+'models/rome/'+kind+'-'+clip+'.glb';

async function preload(){
 const entries=await Promise.all(ROLES.map(async(kind)=>{
   const base=await loader.loadAsync(asset(kind,'rigged'));
   stageStats.loadedRoleModels++;
   $('load-message').textContent='已载入 '+stageStats.loadedRoleModels+'/6 类精细人物骨骼…';
   const clips={idle:base.animations[0]};
   return [kind,{scene:base.scene,clips}];
 }));
 for(const [kind,v]of entries)templates.set(kind,v);
 // All 24 actual rig-compatible clips load before first human input.
 await Promise.all(ROLES.flatMap(kind=>
  ['idle','walk','attack','death'].map(async name=>{
   const gltf=await loader.loadAsync(asset(kind,name));
   if(!gltf.animations[0])throw new Error('Missing '+name+' skeleton clip: '+kind);
   templates.get(kind).clips[name]=gltf.animations[0];
  })
 ));
 stageStats.loadedCombatClips=24;
}

function skinnedRoot(kind,color,square){
 const template=templates.get(kind);
 if(!template)throw new Error('Missing native character model '+kind);
 const actor=new THREE.Group();actor.name='actor-'+color+kind+'-'+square;
 actor.userData.square=square;actor.userData.kind='chess-piece';
 const form=cloneSkeleton(template.scene);
 form.name='roman-figure-'+kind;
 form.rotation.y=restingYaw(color);
 form.scale.setScalar(.82);
 actor.add(form);
 let meshes=0,skins=0;
 form.traverse(child=>{
  if(!child.isMesh)return;
  meshes++;
  if(child.isSkinnedMesh)skins++;
  child.castShadow=true;child.receiveShadow=true;
  child.frustumCulled=false;
  // Preserve glTF textures and real geometry, but remove shader injection entirely.
  const normalize=m=>{
   if(!m?.isMeshStandardMaterial&&!m?.isMeshPhysicalMaterial)return m;
   const copy=m.clone();
   copy.roughness=Math.max(.37,copy.roughness??.6);
   copy.metalness=Math.min(.68,copy.metalness??.2);
   // PBR faction livery: substantial tonal difference without reducing mesh
   // topology, discarding source textures or rebuilding human models.
   copy.color.multiply(new THREE.Color(color==='w'?0xfff0d5:0x82c2ec));
   return copy;
  };
  child.material=Array.isArray(child.material)?child.material.map(normalize):normalize(child.material);
 });
 // No procedural cartoon stand-ins: only the actual skinned GLB qualifies as a piece.
 if(!skins)throw new Error('No skinned mesh: '+kind+' '+square);
 stageStats.skinnedCount++;
 const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(.47,.51,.115,48),
   color==='w'?mat(0xcdb789,.32,.55):mat(0x38546a,.28,.62));
 pedestal.position.y=-.018;pedestal.castShadow=true;pedestal.receiveShadow=true;actor.add(pedestal);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.475,.026,10,50),trimMat);
 rim.rotation.x=Math.PI/2;rim.position.y=.045;actor.add(rim);
 const p=XZ(square);actor.position.copy(p);
 const mixer=new THREE.AnimationMixer(form);
 mixers.add(mixer);
 actor.userData.mixer=mixer;
 actor.userData.currentAction=null;
 actor.userData.form=form;
 actor.userData.restScale=1;
 actor.userData.role=kind;
 actor.userData.faction=color;
 scene.add(actor);
 actorMap.set(square,actor);
 stageStats.modelCount++;
 action(actor,'idle');
 return actor;
}

function clearPieces(){
 visualEpoch++;
 royalCamera.cancel();
 for(const job of activeMoves.splice(0))job.resolve();
 combatState={phase:'idle',role:null,attacker:null,defender:null,standoff:null,impactCount:combatState.impactCount};
 for(const actor of actorMap.values()){
  mixers.delete(actor.userData.mixer);
  actor.userData.mixer.stopAllAction();
  actor.traverse(x=>{
   if(x.isMesh && x.material){
    const mats=Array.isArray(x.material)?x.material:[x.material];
    for(const m of mats) if(![lightMat,darkMat,trimMat,stoneMat].includes(m))m.dispose?.();
   }
  });
  actor.removeFromParent();
 }
 actorMap.clear();activeMoves.length=0;
 stageStats.skinnedCount=0;stageStats.modelCount=0;
 clearSelection();
}

function rebuild(){
 clearPieces();
 for(const piece of controller.getBoard())skinnedRoot(piece.kind,piece.color,piece.square);
}
const markerMat=mat(0xe8bf75,.46,.18);
function clearSelection(){
 selected=null;targetSquares=[];
 for(const m of marks)m.visible=false;
 for(const tile of tiles){
  const sq=tile.userData.square;
  const col=sq.charCodeAt(0)-97,row=Number(sq[1])-1;
  tile.material=(col+row)%2===0?lightMat:darkMat;
 }
}
function select(square){
 clearSelection();
 selected=square;
 targetSquares=controller.legalTargets(square).map(x=>x.to);
 for(const target of targetSquares){
  const mark=marks.find(m=>m.userData.square===target);
  if(mark)mark.visible=true;
 }
 const tile=tiles.find(m=>m.userData.square===square);
 if(tile)tile.material=markerMat;
 $('status').textContent=ROLE_NAME[controller.pieceAt(square)?.kind]+' 已选中 · 点击高亮格子落子';
}

function sound(freq=520,dur=.10){
 if(!soundEnabled)return;
 try{
  audioCtx??=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),now=audioCtx.currentTime;
  osc.type='sine';osc.frequency.setValueAtTime(freq,now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(160,freq*.74),now+dur);
  gain.gain.setValueAtTime(.001,now);
  gain.gain.exponentialRampToValueAtTime(.055,now+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
  osc.connect(gain).connect(audioCtx.destination);osc.start(now);osc.stop(now+dur);
 }catch(_){}
}
function playHeraldFanfare(){
 if(!soundEnabled)return;
 try{
  audioCtx??=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')void audioCtx.resume();
  const start=audioCtx.currentTime;
  // Three-note original ceremonial motif; synthesised locally after a click.
  for(const [freq,offset,duration] of [[196,0,.27],[293.66,.19,.33],[392,.41,.75]]){
   const oscillator=audioCtx.createOscillator();
   const gain=audioCtx.createGain();
   const filter=audioCtx.createBiquadFilter();
   oscillator.type='triangle';
   oscillator.frequency.setValueAtTime(freq,start+offset);
   oscillator.frequency.linearRampToValueAtTime(freq*1.006,start+offset+duration*.65);
   filter.type='lowpass';filter.frequency.value=1300;
   gain.gain.setValueAtTime(.001,start+offset);
   gain.gain.linearRampToValueAtTime(.07,start+offset+.045);
   gain.gain.exponentialRampToValueAtTime(.0001,start+offset+duration);
   oscillator.connect(filter).connect(gain).connect(audioCtx.destination);
   oscillator.start(start+offset);oscillator.stop(start+offset+duration+.02);
  }
 }catch(e){console.warn('[ceremony] audio unavailable',String(e))}
}
function showDuelCallout(role){
 if(reducedMotion||ceremonialPhase!=='playing')return;
 const callout=$('duel-callout');
 if(!callout)return;
 const titles={p:'步兵突刺',r:'重装破阵',n:'骑士突袭',b:'圣裁降临',q:'皇后秘法',k:'王者裁决'};
 callout.querySelector('small').textContent=titles[role]||'荣耀之战';
 if(duelTimer)clearTimeout(duelTimer);
 callout.hidden=false;
 duelTimer=setTimeout(()=>{callout.hidden=true;duelTimer=null},900);
}
function action(actor,name,seconds=null){
 if(!actor?.parent)return null;
 const clip=templates.get(actor.userData.role)?.clips?.[name];
 if(!clip)return null;
 const mixer=actor.userData.mixer;
 try{
  const next=mixer.clipAction(clip);
  const old=actor.userData.currentAction;
  if(old&&old!==next)old.fadeOut(.11);
  next.reset().setEffectiveWeight(1).setLoop(name==='idle'||name==='walk'?THREE.LoopRepeat:THREE.LoopOnce,name==='idle'||name==='walk'?Infinity:1);
  next.clampWhenFinished=name!=='idle'&&name!=='walk';
  next.setEffectiveTimeScale(seconds&&seconds>.05?Math.min(4.2,Math.max(.48,clip.duration/seconds)):1);
  next.fadeIn(.11).play();
  actor.userData.currentAction=next;
  return next;
 }catch(e){console.warn('[v2] animation fallback',e);return null}
}

function addJob(duration,update){
 return new Promise(resolve=>activeMoves.push({duration,elapsed:0,update,resolve}));
}
const royalCamera = new RoyalCameraDirector(THREE,camera,orbit,addJob);

function dismissResult(){
 resultOverlayEpoch++;
 $('result-overlay').hidden=true;
 royalCamera.cancel();
 if(checkCalloutTimer){clearTimeout(checkCalloutTimer);checkCalloutTimer=null;}
 $('check-callout').hidden=true;
}
function showCheck(){
 if(reducedMotion||ceremonialPhase!=='playing')return;
 const node=$('check-callout');
 if(checkCalloutTimer)clearTimeout(checkCalloutTimer);
 node.hidden=false;
 checkCalloutTimer=setTimeout(()=>{node.hidden=true;checkCalloutTimer=null;},1300);
}
async function revealRoyalResult(result){
 if(ceremonialPhase!=='playing')return;
 const epoch=++resultOverlayEpoch;
 ceremonialPhase='result';
 $('app').dataset.phase='result';
 const title = result.winner==='w'?'象牙王庭 凯旋':result.winner==='b'?'黑曜军团 凯旋':'王庭议和';
 const explanation = result.reason==='checkmate'?'将死 · CHECKMATE'
  :result.reason==='stalemate'?'逼和 · STALEMATE'
  :result.reason==='resignation'?'认输 · RESIGNATION'
  :result.reason==='timeout'?'时间耗尽 · TIMEOUT':'和棋 · DRAW';
 $('result-title').textContent=title;
 $('result-reason').textContent=explanation;
 $('result-overlay').hidden=false;
 // There is no CGI-only victory. Focus on the actual winning commander.
 const commander=[...actorMap.values()].find(a=>a.userData.role==='k'&&a.userData.faction===(result.winner||'w'));
 if(commander&&!reducedMotion){
  try{await royalCamera.endgame(commander.position,result.winner||'w');}
  catch(e){console.warn('[ceremony] winner camera fallback',String(e));}
 }
 if(epoch!==resultOverlayEpoch)return;
 playHeraldFanfare();
}
function faceActor(actor,point){
 const yaw=targetYaw(actor.position,point);
 if(yaw===null)return;
 actor.userData.form.rotation.y=yaw;
}
async function swivelActor(actor,yaw,duration,epoch){
 if(yaw===null)return;
 const form=actor.userData.form;
 const from=form.rotation.y;
 const delta=shortestYawDelta(from,yaw);
 if(Math.abs(delta)<.025){form.rotation.y=yaw;return;}
 await addJob(duration,t=>{
  if(epoch===visualEpoch&&actor.parent)form.rotation.y=from+delta*t;
 });
 if(epoch===visualEpoch&&actor.parent)form.rotation.y=yaw;
}
async function turnCombatants(attacker,defender,duration,epoch){
 const a=attacker.userData.form,b=defender.userData.form;
 const toA=targetYaw(attacker.position,defender.position);
 const toB=targetYaw(defender.position,attacker.position);
 if(toA===null||toB===null)return;
 const a0=a.rotation.y,b0=b.rotation.y;
 const da=shortestYawDelta(a0,toA),db=shortestYawDelta(b0,toB);
 await addJob(duration,t=>{
  if(epoch!==visualEpoch)return;
  a.rotation.y=a0+da*t;
  b.rotation.y=b0+db*t;
 });
 if(epoch!==visualEpoch)return;
 a.rotation.y=toA;b.rotation.y=toB;
}
function combatInfo(){
 const a=combatState.attacker,b=combatState.defender;
 let facingError=null,opponentFacingError=null,distance=null;
 if(a&&b&&a.parent&&b.parent){
  const ya=targetYaw(a.position,b.position),yb=targetYaw(b.position,a.position);
  facingError=ya===null?null:Math.abs(shortestYawDelta(a.userData.form.rotation.y,ya));
  opponentFacingError=yb===null?null:Math.abs(shortestYawDelta(b.userData.form.rotation.y,yb));
  distance=Number(a.position.distanceTo(b.position).toFixed(2));
 }
 return {phase:combatState.phase,role:combatState.role,
  style:combatState.role?combatStyle(combatState.role).name:null,
  facingError,opponentFacingError,distance,standoff:combatState.standoff,impactCount:combatState.impactCount,
  attackerClip:a?.userData.currentAction?.getClip()?.name||null,
  defenderClip:b?.userData.currentAction?.getClip()?.name||null};
}
function playCombatSound(profile){
 if(!soundEnabled)return;
 sound(profile.frequency,Math.min(.22,profile.swing*.30));
 try{
  audioCtx??=new(window.AudioContext||window.webkitAudioContext)();
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),t=audioCtx.currentTime;
  osc.type=['royal-spell','judgement'].includes(profile.name)?'sine':'triangle';
  osc.frequency.setValueAtTime(profile.frequency*1.75,t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(80,profile.frequency*.44),t+.16);
  gain.gain.setValueAtTime(.0001,t);
  gain.gain.linearRampToValueAtTime(.06,t+.014);
  gain.gain.exponentialRampToValueAtTime(.0001,t+.2);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);osc.stop(t+.205);
 }catch(e){}
}
async function animateMove(event){
 const from=actorMap.get(event.from);
 if(!from){
  console.warn('[v2] visual desync: missing source piece',event.from);
  rebuild();return;
 }
 const epoch=visualEpoch;
 const style=combatStyle(event.kind);
 const valid=()=>epoch===visualEpoch&&from.parent===scene;
 const victim=event.capture?actorMap.get(event.capture.square):null;
 const isCapture=!!victim;
 actorMap.delete(event.from);
 if(victim)actorMap.delete(event.capture.square);
 actorMap.set(event.to,from);
 from.userData.square=event.to;
 const start=from.position.clone(),end=XZ(event.to);
 const defenderSpot=victim?.position.clone()||null;
 const chargeTarget=isCapture?standoffPoint(THREE,start,defenderSpot,style.standoff):end;
 const travel=start.distanceTo(chargeTarget);
 const seconds=Math.min(1.14,Math.max(.32,travel*.18))/style.charge;
 if(isCapture){
  combatState={phase:'camera',role:event.kind,attacker:from,defender:victim,standoff:null,impactCount:combatState.impactCount};
  if(!reducedMotion)await royalCamera.enterCapture(start,defenderSpot);
  if(!valid())return;
 }
 await swivelActor(from,targetYaw(from.position,chargeTarget),isCapture?.16:.12,epoch);
 if(!valid())return;
 action(from,'walk',seconds);
 if(isCapture)combatState.phase='approach';
 await addJob(seconds,t=>{
  if(!valid())return;
  from.position.lerpVectors(start,chargeTarget,t);
  from.position.y+=Math.sin(Math.PI*t)*Math.min(.14,travel*.03);
 });
 if(!valid())return;
 from.position.copy(chargeTarget);
 if(event.rook){
  const rook=actorMap.get(event.rook.from);
  if(rook){
   actorMap.delete(event.rook.from);
   actorMap.set(event.rook.to,rook);
   rook.userData.square=event.rook.to;
   const rStart=rook.position.clone(),rEnd=XZ(event.rook.to);
   faceActor(rook,rEnd);action(rook,'walk',.36);
   await addJob(.36,t=>{if(epoch===visualEpoch)rook.position.lerpVectors(rStart,rEnd,t)});
   if(!valid())return;
   rook.position.copy(rEnd);
   rook.userData.form.rotation.y=restingYaw(rook.userData.faction);
   action(rook,'idle');
  }
 }
 if(isCapture){
  combatState.phase='faceoff';
  await turnCombatants(from,victim,style.turn,epoch);
  if(!valid())return;
  combatState.standoff=Number(from.position.distanceTo(victim.position).toFixed(2));
  combatState.phase='windup';
  showDuelCallout(event.kind);
  action(from,'attack',style.wind+style.swing+style.recovery);
  await addJob(style.wind+style.swing*.55,()=>{});
  if(!valid())return;
  combatState.phase='impact';
  combatState.impactCount++;
  playCombatSound(style);
  action(victim,'death',style.fall);
  const startingZ=victim.rotation.z;
  const effect=royalImpact(THREE,scene,defenderSpot,addJob,style.impact);
  const body=addJob(style.fall,t=>{
   if(epoch!==visualEpoch)return;
   // Authored bones perform the fall. Only ground settling accompanies them.
   victim.position.y=defenderSpot.y-.08*t;
   victim.rotation.z=startingZ+((event.color==='w')?1:-1)*.07*t;
  });
  await Promise.all([effect,body]);
  if(!valid())return;
  victim.userData.mixer.stopAllAction();
  mixers.delete(victim.userData.mixer);
  victim.removeFromParent();
  stageStats.modelCount=Math.max(0,stageStats.modelCount-1);
  stageStats.skinnedCount=Math.max(0,stageStats.skinnedCount-1);
  combatState.phase='advance';
  const occupyingFrom=from.position.clone();
  await addJob(style.follow,t=>{if(valid())from.position.lerpVectors(occupyingFrom,end,t)});
  if(!valid())return;
  from.position.copy(end);
  if(!reducedMotion)await Promise.all([
   royalCamera.exitCapture(),
   swivelActor(from,restingYaw(event.color),.28,epoch)
  ]);
  else await swivelActor(from,restingYaw(event.color),.24,epoch);
  if(!valid())return;
  combatState.phase='complete';
 }else{
  from.position.copy(end);
  sound(480,.12);
  await swivelActor(from,restingYaw(event.color),.17,epoch);
  if(!valid())return;
 }
 if(event.promotion){
  from.userData.mixer.stopAllAction();
  mixers.delete(from.userData.mixer);
  from.removeFromParent();
  actorMap.delete(event.to);
  stageStats.modelCount=Math.max(0,stageStats.modelCount-1);
  stageStats.skinnedCount=Math.max(0,stageStats.skinnedCount-1);
  skinnedRoot(event.promotion,event.color,event.to);
 }else{
  action(from,'idle');
 }
 if(!isCapture)orbit.target.lerp(new THREE.Vector3(0,.55,0),.5);
 clearSelection();
 combatState={phase:'idle',role:null,attacker:null,defender:null,standoff:null,impactCount:combatState.impactCount};
}


function updateHud(){
 const s=controller.getSnapshot();
 if(!loading){
  let msg=s.status==='over'?(s.result?.reason==='checkmate'?'将死 · 对局结束':'对局结束'):s.thinking?'AI 正在思考…':s.busy?'角色正在执行动作…':s.turn==='w'?'白方回合 · 选择你的棋子':'黑方回合 · 选择你的棋子';
  if(s.inCheck&&s.status!=='over')msg+=' · 将军！';
  $('status').textContent=msg;
 }
 $('moves').textContent=s.sanList.length?s.sanList.map((v,i)=>(i%2===0?String(Math.floor(i/2)+1)+'. ':'')+v).join('  '):'等待第一手落子。';
}

function getSquareByPointer(event){
 const rect=STAGE.getBoundingClientRect();
 const pointer=new THREE.Vector2(
  ((event.clientX-rect.left)/rect.width)*2-1,
  -((event.clientY-rect.top)/rect.height)*2+1
 );
 const raycaster=new THREE.Raycaster();
 raycaster.setFromCamera(pointer,camera);
 // Always hit the BOARD PLANE, not a neighbouring character's shoulder.
 // This prevents a large knight model from stealing the selection of a pawn.
 const hit=new THREE.Vector3();
 const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.46);
 if(!raycaster.ray.intersectPlane(plane,hit))return null;
 const file=Math.round(hit.x/SQ+3.5);
 const rank=Math.round(3.5-hit.z/SQ);
 if(file<0||file>7||rank<0||rank>7)return null;
 return 'abcdefgh'[file]+String(rank+1);
}
let down=null;
STAGE.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
STAGE.addEventListener('pointerup',async e=>{
 if(!stageReady||ceremonialPhase!=='playing'||!down||Math.hypot(down.x-e.clientX,down.y-e.clientY)>14)return;
 down=null;
 if(!controller.isHumanTurn())return;
 const square=getSquareByPointer(e);
 if(!square)return;
 const piece=controller.pieceAt(square);
 const current=controller.getSnapshot();
 if(selected&&selected!==square&&targetSquares.includes(square)){
  const from=selected;clearSelection();
  const result=await controller.tryMove(from,square,'q');
  if(!result)updateHud();return;
 }
 if(piece&&piece.color===current.turn){select(square);sound(580,.09);}
 else clearSelection();
});
window.addEventListener('pointercancel',()=>{down=null;});

function enterCeremonialHall(){
 dismissResult();
 ceremonialPhase='menu';
 $('app').dataset.phase='menu';
 $('battle-ui').hidden=true;
 $('battle-announcement').hidden=true;
 $('intro-menu').setAttribute('aria-hidden','false');
 orbit.enabled=false;
 clearSelection();
 camera.position.set(5.6,10.5,16.6);
 orbit.target.set(-2.0,.6,0);
 camera.lookAt(orbit.target);
 $('status').textContent='即将迎战';
}

function performRoyalEntrance(){
 if(reducedMotion)return;
 const marching=[];
 for(const actor of actorMap.values()){
  const finish=actor.position.clone();
  const direction=actor.userData.faction==='w'?1:-1;
  const begin=finish.clone().add(new THREE.Vector3(0,0,direction*1.45));
  actor.position.copy(begin);
  if(templates.get(actor.userData.role)?.clips.walk)action(actor,'walk');
  marching.push({actor,begin,finish});
 }
 // Both armies take their places in unison while the herald calls the duel.
 void addJob(1.3,t=>{
  for(const {actor,begin,finish} of marching)
   actor.position.lerpVectors(begin,finish,t);
 }).then(()=>{
  for(const {actor,finish} of marching){
   if(!actor.parent)continue;
   actor.position.copy(finish);
   action(actor,'idle');
  }
 });
}
function startCeremonialMatch(){
 if(!stageReady)return;
 dismissResult();
 currentMode=$('game-mode').value;
 const difficulty=$('difficulty').value;
 controller.start({mode:currentMode,difficulty,playerColor:'w',clockMinutes:null});
 rebuild();
 performRoyalEntrance();
 clearSelection();
 ceremonialPhase='announcing';
 $('app').dataset.phase='playing';
 $('intro-menu').setAttribute('aria-hidden','true');
 $('battle-ui').hidden=true;
 orbit.enabled=false;
 // Portrait users need the entire 8x8 board in frame, not clipped ranks.
 const portrait=STAGE.clientWidth/Math.max(1,STAGE.clientHeight)<.75;
 camera.position.set(0,portrait?15.5:10.8,portrait?24.0:15.0);
 orbit.target.set(0,.55,0);
 camera.lookAt(orbit.target);
 playHeraldFanfare();
 $('battle-announcement').hidden=false;
 if(announcementTimer)clearTimeout(announcementTimer);
 const duration=reducedMotion?250:1850;
 announcementTimer=setTimeout(()=>{
  $('battle-announcement').hidden=true;
  $('battle-ui').hidden=false;
  ceremonialPhase='playing';
  orbit.enabled=true;
  announcementTimer=null;
 },duration);
 updateHud();
}
function configureUI(){
 $('intro-start').addEventListener('click',startCeremonialMatch);
 $('start').addEventListener('click',()=>{
  dismissResult();
  if(announcementTimer){clearTimeout(announcementTimer);announcementTimer=null}
  $('battle-announcement').hidden=true;
  $('battle-ui').hidden=false;
  ceremonialPhase='playing';
  orbit.enabled=true;
  currentMode=$('game-mode').value;
  controller.start({mode:currentMode,difficulty:$('difficulty').value,playerColor:'w',clockMinutes:null});
  rebuild();playHeraldFanfare();
 });
 $('undo').addEventListener('click',()=>{
  if(controller.undo()){rebuild();sound(310,.09);}
 });
 $('flip').addEventListener('click',()=>{
  camera.position.set(-camera.position.x,camera.position.y,-camera.position.z);
  orbit.update();
 });
 $('menu-button').addEventListener('click',()=>{
  dismissResult();
  if(announcementTimer){clearTimeout(announcementTimer);announcementTimer=null}
  controller.stop();
  enterCeremonialHall();
 });
 $('fullscreen-button').addEventListener('click',async()=>{
  try{
   if(document.fullscreenElement)await document.exitFullscreen();
   else await document.documentElement.requestFullscreen();
  }catch(e){console.warn('[ceremony] fullscreen unavailable',String(e))}
 });
 $('sound-toggle').addEventListener('click',()=>{
  soundEnabled=!soundEnabled;
  $('sound-toggle').setAttribute('aria-pressed',String(soundEnabled));
  $('sound-toggle').innerHTML=soundEnabled?'♫ <span>音效 开</span>':'♪ <span>音效 关</span>';
  if(soundEnabled)sound(650,.07);
 });
 $('game-mode').addEventListener('change',()=>{
  $('difficulty').disabled=$('game-mode').value!=='ai';
 });
 $('result-rematch').addEventListener('click',()=>{
  dismissResult();
  ceremonialPhase='playing';
  $('app').dataset.phase='playing';
  $('battle-ui').hidden=false;
  const portrait=STAGE.clientWidth/Math.max(1,STAGE.clientHeight)<.75;
  camera.position.set(0,portrait?15.5:10.8,portrait?24:15);
  orbit.target.set(0,.55,0);
  camera.fov=portrait?56:44;
  camera.updateProjectionMatrix();
  camera.lookAt(orbit.target);
  orbit.enabled=true;
  controller.start({mode:currentMode,difficulty:$('difficulty').value,playerColor:'w',clockMinutes:null});
  rebuild();
  playHeraldFanfare();
 });
 $('result-hall').addEventListener('click',()=>{
  dismissResult();
  controller.stop();
  enterCeremonialHall();
 });
 controller.on('state',updateHud);
 controller.on('check',showCheck);
 controller.on('gameover',result=>{void revealRoyalResult(result);});
}

function updateSize(){
 const rect=STAGE.getBoundingClientRect();
 const w=Math.max(320,rect.width),h=Math.max(280,rect.height);
 camera.aspect=w/h;camera.fov=w/h<.8?56:44;camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);
}
const resizeObserver=new ResizeObserver(updateSize);
resizeObserver.observe(STAGE);
const fpsTicks=[];
function frame(){
 const now=performance.now();
 const dt=Math.min(.05,(now-previousTick)/1000);
 previousTick=now;
 frameMS=now-lastFrameAt;lastFrameAt=now;
 fpsTicks.push(frameMS);if(fpsTicks.length>80)fpsTicks.shift();
 frameSamples++;
 if(frameSamples%40===0){
  const s=fpsTicks.reduce((a,b)=>a+b,0)/fpsTicks.length;
  displayedFPS=Math.round(1000/s);
  $('frame-stats').textContent=currentBackend+' · '+displayedFPS+' FPS';
 }
 for(const mixer of mixers)mixer.update(dt);
 for(let i=activeMoves.length-1;i>=0;i--){
  const job=activeMoves[i];
  job.elapsed+=dt;
  const t=Math.min(1,job.elapsed/job.duration);
  const smooth=t*t*(3-2*t);
  job.update(smooth);
  if(t>=1){activeMoves.splice(i,1);job.resolve();}
 }
 if(ceremonialPhase==='menu'&&!reducedMotion){
  // The opening camera glides across the actual battle-ready characters.
  // No pre-rendered video, placeholders or fake character artwork.
  const t=(now-ceremonyStartedAt)/1000;
  camera.position.x=5.6+Math.sin(t*.22)*.62;
  camera.position.y=10.5+Math.sin(t*.18)*.32;
  camera.position.z=16.6+Math.cos(t*.19)*.34;
  camera.lookAt(orbit.target);
 }else orbit.update();
 if(stageReady) renderer.render(scene,camera);
}

async function init(){
 configureUI();
 try{
  $('load-message').textContent='正在初始化 WebGPU / WebGL2 图形后端…';
  await renderer.init();
  currentBackend=renderer.backend?.isWebGPUBackend?'WebGPU':renderer.backend?.isWebGLBackend?'WebGL2':'后端 '+(renderer.backend?.constructor?.name||'未知');
  $('backend-pill').textContent=currentBackend+' · THREE r187';
  $('backend-pill').dataset.backend=currentBackend;
  resizeObserver.disconnect();
  updateSize();
  resizeObserver.observe(STAGE);
  renderer.setAnimationLoop(frame);
  $('load-message').textContent='正在加载真实高精度人物模型…';
  await preload();
  loading=false;
  stageReady=true;
  controller.setAnimator(animateMove);
  controller.start({mode:currentMode,difficulty:'medium',playerColor:'w',clockMinutes:null,fen:testFen});
  rebuild();
  $('loading').classList.add('hidden');
  if(testMode){
   ceremonialPhase='playing';
   $('app').dataset.phase='playing';
   $('battle-ui').hidden=false;
   $('intro-menu').setAttribute('aria-hidden','true');
   orbit.enabled=true;
  }else{
   enterCeremonialHall();
  }
  updateHud();
  stageStats.firstFrameAt=performance.now();
  window.__pmv2=Object.freeze({
   snapshot:()=>controller.getSnapshot(),
   info:()=>({backend:currentBackend,backendName:renderer.backend?.constructor?.name,webgpu:!!renderer.backend?.isWebGPUBackend,roles:stageStats.loadedRoleModels,clipsLoaded:[...templates.values()].reduce((n,t)=>n+Object.keys(t.clips).length,0),pieces:actorMap.size,skinned:stageStats.skinnedCount,fps:displayedFPS,selected,targets:targetSquares,activeMoves:activeMoves.length,animationTimeouts:controller.getAnimationTimeouts(),lastErrors:stageStats.errors.slice(-3),phase:ceremonialPhase,cinematicActive:royalCamera.isActive,combat:combatInfo(),cameraDistance:+camera.position.distanceTo(orbit.target).toFixed(2),cameraFov:+camera.fov.toFixed(2),version:'v2-royal-cinematic'}),
   squareScreen: square=>{
    const p=XZ(square).project(camera),r=STAGE.getBoundingClientRect();
    return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
   },
   legal:from=>controller.legalTargets(from),
   // Test-only move entry uses authoritative chess.js; it is not independent of the game rules.
   tryMove:(from,to)=>controller.tryMove(from,to,'q'),
   reset:(fen=null)=>{controller.start({mode:'hotseat',difficulty:'medium',playerColor:'w',clockMinutes:null,fen});rebuild()},
  });
 }catch(e){
  stageStats.errors.push(String(e));
  console.error('[WebGPU V2] bootstrap failed',e);
  $('load-message').textContent='启动失败：'+String(e).slice(0,140);
  $('backend-pill').textContent='图形初始化失败';
 }
}
init();
window.addEventListener('beforeunload',()=>{
 if(announcementTimer)clearTimeout(announcementTimer);
 if(duelTimer)clearTimeout(duelTimer);
 if(checkCalloutTimer)clearTimeout(checkCalloutTimer);
 royalCamera.cancel();
 try{controller.dispose();renderer.dispose();resizeObserver.disconnect();audioCtx?.close()}catch(e){}
});
