import voicePlan from '../audio/voice-plan.json';
import overtureUrl from '../audio/music/royal-overture.ogg?url';
import arenaUrl from '../audio/music/royal-arena-loop.ogg?url';
import victoryUrl from '../audio/music/royal-victory.ogg?url';
import drawUrl from '../audio/music/royal-draw.ogg?url';
import duelUrl from '../audio/music/royal-duel-sting.ogg?url';

const VOICE_ASSETS=import.meta.glob('../audio/voices/*.ogg',{eager:true,query:'?url',import:'default'});
const SOUNDTRACK={overture:overtureUrl,arena:arenaUrl,victory:victoryUrl,draw:drawUrl,duel:duelUrl};
const SPEAKER_NAMES={
 herald:'王庭传令官',female_herald:'王庭记录官',king:'国王',queen:'皇后',
 knight:'骑士',rook:'军团统帅',bishop:'圣殿裁决者',pawn:'先锋步兵'
};
const clamp=(x,a,b)=>Math.max(a,Math.min(x,b));

/**
 * Royal-game audio director — actual mastered OGG tracks and offline
 * licensed original-character TTS lines. Music starts on a real user gesture;
 * browsers that block initial autoplay keep music enabled for the next gesture.
 */
export class RoyalAudioDirector {
 constructor(subtitle){
  this.subtitle=subtitle;
  this.enabled=true; // user requirement: sound on by default
  this.voiceEnabled=true;
  this.musicEnabled=true;
  this.phase='hall';
  this.music=null;
  this.musicKind=null;
  this.sting=null;
  this.voice=null;
  this.voicePriority=-1;
  this.musicVolume=.23;
  this.targetMusicVolume=.23;
  this.fadeHandle=null;
  this.fadingOut=null;
  this.lastSpeechAt=0;
  this.lastEventAt=new Map();
  this.lastLineByEvent=new Map();
  this.timer=null;
  this.introTimer=null;
  this.entryReplyTimer=null;
  this.hallNarrationTimer=null;
  this.hallNarrated=false;
  this.unlocked=false;
  this.subtitleTimer=null;
  this.totalVoices=0;
  this.totalSpeeches=0;
  this.lastVoiceId=null;
  this.missing=[];
  this.voiceById=new Map(voicePlan.lines.map(line=>[line.id,line]));
  for(const item of voicePlan.lines){
   if(!VOICE_ASSETS['../audio/voices/'+item.id+'.ogg'])
    this.missing.push(item.id);
  }
 }
 snapshot(){
  return {enabled:this.enabled,musicEnabled:this.musicEnabled,voiceEnabled:this.voiceEnabled,
   phase:this.phase,music:this.musicKind,musicPlaying:!!this.music&&!this.music.paused,
   musicLevel:Number((this.music?.volume||0).toFixed(3)),musicTarget:Number(this.targetMusicVolume.toFixed(3)),unlocked:this.unlocked,
   voicePlaying:!!this.voice&&!this.voice.paused,voicesExpected:voicePlan.lines.length,
   voicesAvailable:voicePlan.lines.length-this.missing.length,missing:this.missing.slice(0,5),
   speechesPlayed:this.totalSpeeches,lastVoiceId:this.lastVoiceId};
 }
 setEnabled(enabled){
  this.enabled=!!enabled;
  if(!this.enabled){
   this.cancelEntryReply();
   this.cancelHallNarration();
   this.stopMusic();
   this.stopVoice();
  }else{
   this.resumeAfterGesture();
  }
 }
 setMusicVolume(value){
  this.musicVolume=clamp(Number(value)||0,0,.58);
  this.targetMusicVolume=this.voice?.paused===false?this.musicVolume*.28:this.musicVolume;
  if(this.music)this.music.volume=this.targetMusicVolume;
 }
 setVoiceEnabled(value){
  this.voiceEnabled=!!value;
  if(!this.voiceEnabled)this.stopVoice();
 }
 resumeAfterGesture(){
  if(!this.enabled)return;
  this.unlocked=true;
  if(this.phase==='hall'&&!this.hallNarrated&&!this.hallNarrationTimer){
   this.hallNarrationTimer=setTimeout(()=>{
    this.hallNarrationTimer=null;
    if(this.enabled&&this.phase==='hall'&&!this.hallNarrated){
     this.hallNarrated=true;
     this.speak('hall',{priority:3,cooldown:0});
    }
   },850);
  }
  if(this.music?.paused){
   this.music.play().catch(()=>{});
  }else if(!this.music){
   this.playMusic(this.phase==='hall'?'overture':this.phase==='battle'?'arena':this.phase==='result'?'victory':'overture');
  }
 }
 playMusic(kind,loop=true){
  this.musicKind=kind;
  this.cancelIntroTimer();
  if(!this.enabled||!this.musicEnabled)return;
  const url=SOUNDTRACK[kind];
  if(!url)return;
  if(this.music?.dataset?.kind===kind&&!this.music.ended){
   this.music.play().catch(()=>{});
   return;
  }
  const previous=this.music;
  const next=new Audio(url);
  next.preload='auto';next.loop=loop;next.dataset.kind=kind;
  next.volume=0;
  this.music=next;
  const target=this.voice&&!this.voice.paused?this.musicVolume*.27:this.musicVolume;
  this.targetMusicVolume=target;
  // Do not introduce a page error when autoplay policy blocks the title song.
  next.play().then(()=>this.crossfade(previous,next,target,1100)).catch(()=>{
   next.volume=target;
   if(previous&&previous!==next){previous.pause();previous.src='';}
  });
 }
 crossfade(previous,next,target,duration){
  if(this.fadeHandle){cancelAnimationFrame(this.fadeHandle);this.fadeHandle=null;}
  const begin=performance.now(),start=previous?.volume||0;
  const run=now=>{
   const t=clamp((now-begin)/duration,0,1),smooth=t*t*(3-2*t);
   if(this.music===next)next.volume=clamp(target*smooth,0,1);
   if(previous&&previous!==next)previous.volume=clamp(start*(1-smooth),0,1);
   if(t<1)this.fadeHandle=requestAnimationFrame(run);
   else{
    this.fadeHandle=null;
    if(previous&&previous!==next){previous.pause();previous.removeAttribute('src');previous.load();}
   }
  };
  this.fadeHandle=requestAnimationFrame(run);
 }
 changeMusicGain(){
  const reduced=this.voice&&!this.voice.paused;
  this.targetMusicVolume=this.musicVolume*(reduced?.26:1);
  if(this.music){
   // Smoothed ramp over 200ms avoids audibly pumping on every announcement.
   const old=this.music.volume,target=this.targetMusicVolume,start=performance.now();
   const current=this.music;
   const fade=now=>{
    if(this.music!==current)return;
    const t=clamp((now-start)/220,0,1);
    current.volume=clamp(old+(target-old)*t,0,1);
    if(t<1)requestAnimationFrame(fade);
   };
   requestAnimationFrame(fade);
  }
 }
 cancelIntroTimer(){
  if(this.introTimer){clearTimeout(this.introTimer);this.introTimer=null;}
 }
 cancelEntryReply(){
  if(this.entryReplyTimer){clearTimeout(this.entryReplyTimer);this.entryReplyTimer=null;}
 }
 cancelHallNarration(){
  if(this.hallNarrationTimer){clearTimeout(this.hallNarrationTimer);this.hallNarrationTimer=null;}
 }
 clearSubtitle(){
  if(this.subtitleTimer){clearTimeout(this.subtitleTimer);this.subtitleTimer=null;}
  this.subtitle.hidden=true;
  this.subtitle.querySelector('.royal-subtitle-actor').textContent='';
  this.subtitle.querySelector('.royal-subtitle-line').textContent='';
 }
 showSubtitle(line){
  this.clearSubtitle();
  this.subtitle.querySelector('.royal-subtitle-actor').textContent=SPEAKER_NAMES[line.actor]||'王庭';
  this.subtitle.querySelector('.royal-subtitle-line').textContent=line.text;
  this.subtitle.hidden=false;
 }
 stopVoice(){
  if(this.voice){
   this.voice.pause();
   this.voice.removeAttribute('src');
   this.voice.load();
   this.voice=null;
  }
  this.voicePriority=-1;
  this.clearSubtitle();
  this.changeMusicGain();
 }
 pick(event){
  const candidates=voicePlan.lines.filter(row=>row.event===event&&VOICE_ASSETS['../audio/voices/'+row.id+'.ogg']);
  if(!candidates.length)return null;
  const prior=this.lastLineByEvent.get(event);
  const choices=candidates.length>1?candidates.filter(v=>v.id!==prior):candidates;
  const selection=choices[Math.floor(Math.random()*choices.length)];
  this.lastLineByEvent.set(event,selection.id);
  return selection;
 }
 speak(event,{priority=3,cooldown=0,force=false,exactId=null}={}){
  if(!this.enabled||!this.voiceEnabled)return false;
  const now=performance.now();
  if(!force&&now-(this.lastEventAt.get(event)||0)<cooldown)return false;
  if(!force&&this.voice&&!this.voice.paused&&priority<this.voicePriority)return false;
  if(!force&&now-this.lastSpeechAt<1200)return false;
  const row=exactId?this.voiceById.get(exactId):this.pick(event);
  if(!row)return false;
  const url=VOICE_ASSETS['../audio/voices/'+row.id+'.ogg'];
  if(!url)return false;
  this.stopVoice();
  this.lastSpeechAt=now;
  this.lastEventAt.set(event,now);
  this.voicePriority=priority;
  this.lastVoiceId=row.id;
  this.totalSpeeches++;
  this.showSubtitle(row);
  const clip=new Audio(url);
  clip.preload='auto';clip.volume=.89;
  this.voice=clip;
  clip.onplaying=()=>this.changeMusicGain();
  clip.onended=()=>{
   if(this.voice!==clip)return;
   this.voice=null;this.voicePriority=-1;
   this.changeMusicGain();
   this.subtitleTimer=setTimeout(()=>this.clearSubtitle(),650);
  };
  clip.onerror=()=>{
   if(this.voice!==clip)return;
   this.voice=null;this.voicePriority=-1;this.changeMusicGain();
   this.subtitleTimer=setTimeout(()=>this.clearSubtitle(),2000);
  };
  clip.play().catch(()=>{
   if(this.voice===clip){this.voice=null;this.voicePriority=-1;this.changeMusicGain();}
   this.subtitleTimer=setTimeout(()=>this.clearSubtitle(),2200);
  });
  this.changeMusicGain();
  return true;
 }
 previewHall(){
  this.onHall();
  this.cancelHallNarration();
  this.hallNarrated=true;
  this.resumeAfterGesture();
  if(this.music)this.music.currentTime=0;
  this.speak('hall',{priority:6,force:true});
 }
 onHall(){
  this.phase='hall';
  this.cancelEntryReply();
  this.cancelHallNarration();
  this.hallNarrated=false;
  this.stopVoice();
  this.playMusic('overture',true);
  // Only announce after the visitor has previously interacted with the
  // document. Fresh tabs without a gesture must never pretend sound plays.
  if(this.unlocked)this.resumeAfterGesture();
 }
 enterBattle(){
  this.phase='battle';
  this.cancelHallNarration();
  this.cancelEntryReply();
  this.stopVoice();
  // Give the main orchestral fanfare 9.5 seconds during the dramatic opening.
  // The music is ready on the user click and then gently transfers to arena bed.
  this.playMusic('overture',false);
  if(this.music)this.music.currentTime=0;
  // The royal cast changes each time, rather than repeating one line every
  // new game. The next voice answers in the same ceremony.
  this.speak('enter',{priority:9,force:true});
  this.entryReplyTimer=setTimeout(()=>{
   this.entryReplyTimer=null;
   if(this.enabled&&this.phase==='battle'&&this.voice&&!this.voice.paused)return;
   if(this.enabled&&this.phase==='battle')this.speak('enter',{priority:6,force:true});
  },4700);
  this.introTimer=setTimeout(()=>{
   if(this.phase!=='battle')return;
   this.playMusic('arena',true);
   this.introTimer=null;
  },9500);
 }
 onAttack(role){
  if(this.phase!=='battle')return;
  this.cancelEntryReply();
  this.speak('attack-'+role,{priority:4,cooldown:2400});
 }
 onImpact(){
  if(this.phase!=='battle'||!this.enabled)return;
  const s=new Audio(SOUNDTRACK.duel);
  s.volume=.22;s.preload='auto';
  this.sting?.pause();this.sting=s;
  s.play().catch(()=>{});
 }
 onCheck(){
  if(this.phase!=='battle')return;
  this.speak('check',{priority:7,cooldown:4500});
 }
 onCastling(){
  if(this.phase!=='battle')return;
  this.speak('castling',{priority:4,cooldown:5000});
 }
 onResult(result){
  this.phase='result';
  this.cancelEntryReply();
  this.stopVoice();
  this.playMusic(result?.winner?'victory':'draw',false);
  const event=result?.winner==='w'?'victory-w':result?.winner==='b'?'victory-b':'draw';
  this.speak(event,{priority:10,force:true});
 }
 stopMusic(){
  this.cancelIntroTimer();
  this.cancelEntryReply();
  this.cancelHallNarration();
  if(this.fadeHandle){cancelAnimationFrame(this.fadeHandle);this.fadeHandle=null;}
  this.music?.pause();
  this.music=null;
  this.sting?.pause();
  this.sting=null;
 }
 dispose(){
  this.stopVoice();this.stopMusic();
 }
}
