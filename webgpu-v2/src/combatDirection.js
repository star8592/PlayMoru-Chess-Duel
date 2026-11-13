/**
 * Role-directed combat choreography. Source clips are original rig-compatible
 * GLBs. This module controls timing/facing only: never procedural substitute meshes.
 */
export const COMBAT_STYLES = Object.freeze({
  p: {name:'thrust',charge:1.0,standoff:.65,turn:.18,wind:.18,swing:.52,recovery:.25,fall:.80,follow:.29,impact:0xffca86,frequency:340},
  n: {name:'cavalry',charge:1.32,standoff:.80,turn:.20,wind:.22,swing:.55,recovery:.28,fall:.85,follow:.28,impact:0xaad5ee,frequency:430},
  r: {name:'heavy',charge:.75,standoff:.83,turn:.26,wind:.36,swing:.65,recovery:.35,fall:1.0,follow:.37,impact:0xffa958,frequency:155},
  b: {name:'judgement',charge:1.02,standoff:.88,turn:.24,wind:.32,swing:.74,recovery:.38,fall:.90,follow:.34,impact:0xbaa6ff,frequency:530},
  q: {name:'royal-spell',charge:1.18,standoff:.86,turn:.25,wind:.36,swing:.80,recovery:.38,fall:.94,follow:.36,impact:0xecc1ff,frequency:690},
  k: {name:'royal-blade',charge:.87,standoff:.78,turn:.25,wind:.37,swing:.76,recovery:.34,fall:.96,follow:.32,impact:0xffd27f,frequency:225},
});
export function combatStyle(role){return COMBAT_STYLES[role] || COMBAT_STYLES.p;}
// All source glTF sculpts have been classified as +Z front, world +Y up.
export function targetYaw(from,to){
 const dx=to.x-from.x,dz=to.z-from.z;
 if(dx*dx+dz*dz<1e-7)return null;
 return Math.atan2(dx,dz);
}
export function restingYaw(faction){return faction==='w'?Math.PI:0}
export function shortestYawDelta(from,to){return Math.atan2(Math.sin(to-from),Math.cos(to-from))}
export function standoffPoint(THREE,start,target,preferred){
 const direct=target.clone().sub(start).setY(0);
 const distance=direct.length();
 if(distance<=.0001)return start.clone();
 // Leave an actual arm's length gap for the visible strike, even for a
 // one-square capture. For an en-passant sidestep don't move backward.
 const stop=Math.max(0,distance-Math.min(preferred,Math.max(.20,distance*.47)));
 return start.clone().addScaledVector(direct.normalize(),stop);
}
