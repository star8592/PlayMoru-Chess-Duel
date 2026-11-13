#!/usr/bin/env python3
"""PlayMoru Chess Duel — originally composed Arthurian/Roman-inspired soundtrack.
NO third-party soundfonts, samples, film themes, music playback libraries or vocals.
All sound is synthesized mathematically from additive waveforms/noise; royalty-free
original compositions. Deterministic seed and source score are committed.
"""
from pathlib import Path
import math, os, subprocess, tempfile, wave
import numpy as np

RATE=32000
PI=math.pi
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audio/music'
OUT.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(20261113)

def hz(note):
    return 440 * 2**((note-69)/12)
def env(t,dur,attack=.08,release=.28):
    a=np.minimum(1.0,t/max(.006,attack))
    r=np.minimum(1.0,(dur-t)/max(.006,release))
    return np.power(np.maximum(0.0,np.minimum(a,r)),1.25)
def voice(note,dur,typ='horn',vel=.7):
    count=max(1,round(dur*RATE));t=np.arange(count,dtype=np.float32)/RATE
    freq=hz(note)
    if typ=='horn':
        # Dynamic rich brass with breath fluctuation. Original additive timbre.
        vibr=1+.0022*np.sin(2*PI*5.25*t)
        phase=2*PI*freq*np.cumsum(vibr)/RATE
        y=sum((1/k**1.24)*np.sin(k*phase + .035*k) for k in range(1,10) if k*freq<RATE*.46)
        volume=env(t,dur,.13,.26)*(1+.095*np.sin(2*PI*2.1*t))
    elif typ=='strings':
        y=np.zeros(count,dtype=np.float32)
        for detune in [-.007,-.003,0,.0025,.006]:
            phase=2*PI*freq*(1+detune)*t + .1*np.sin(2*PI*4.2*t)
            y+=sum((1/k**1.6)*np.sin(k*phase) for k in range(1,9) if k*freq<RATE*.43)
        y/=5
        volume=env(t,dur,.26,.46)*(1+.06*np.sin(2*PI*3.4*t))
    elif typ=='choir':
        phase=2*PI*freq*t
        y=sum((.63*np.exp(-.5*((k*freq-720)/440)**2)+.48*np.exp(-.5*((k*freq-1200)/550)**2))/k**.68*np.sin(k*phase) for k in range(1,12) if k*freq<RATE*.43)
        volume=env(t,dur,.34,.48)
    elif typ=='cello':
        phase=2*PI*freq*t*(1+.0014*np.sin(2*PI*5.1*t))
        y=sum((1/k**1.35)*np.sin(k*phase) for k in range(1,11) if k*freq<RATE*.44)
        volume=env(t,dur,.10,.32)
    elif typ=='harp':
        phase=2*PI*freq*t
        y=sum((1/k**1.19)*np.sin(k*phase*np.sqrt(1+.001*k*k)) for k in range(1,10) if k*freq<RATE*.44)
        volume=np.exp(-t/(dur*.22+.16))*env(t,dur,.003,.14)
    elif typ=='bell':
        phase=2*PI*freq*t
        y=sum(a*np.sin(phase*h+.1*k) for k,(h,a) in enumerate([(1,.64),(2.01,.29),(2.76,.16),(4.1,.09),(5.43,.045)]))
        volume=np.exp(-t/(dur*.33+.1))*env(t,dur,.006,.22)
    elif typ=='timpani':
        pitch=freq*(1+.37*np.exp(-t*13))
        phase=2*PI*np.cumsum(pitch)/RATE
        y=.8*np.sin(phase)+.14*np.sin(2*phase)
        volume=np.exp(-t*6)*env(t,dur,.007,.2)
    elif typ=='drum':
        noise=rng.standard_normal(count).astype(np.float32)
        low=np.cumsum(noise);low=low/(max(np.max(np.abs(low)),1))
        y=noise*.28+np.sin(2*PI*(80*t+140*(1-np.exp(-10*t))/10))*.8+low*.07
        volume=np.exp(-t*9)*env(t,dur,.005,.20)
    elif typ=='snare':
        y=rng.standard_normal(count).astype(np.float32)*.8 + np.sin(2*PI*170*t)*.24
        volume=np.exp(-t*18)*env(t,dur,.003,.09)
    else:raise ValueError(typ)
    return np.asarray(y*volume*vel,dtype=np.float32)

class Score:
    def __init__(self,name,bpm,bars):
        self.name=name;self.bpm=bpm;self.beat=60/bpm;self.bars=bars
        self.duration=bars*4*self.beat
        self.l=np.zeros(round((self.duration+1.7)*RATE),dtype=np.float32)
        self.r=self.l.copy()
    def note(self,n,start,dur,kind,vol=.2,pan=.0):
        if start>=self.duration-.05:return
        dur=min(dur,self.duration-start-.025)
        if dur<.015:return
        w=voice(n,dur,kind,vol)
        off=round(start*RATE);e=min(off+len(w),len(self.l));w=w[:e-off]
        left=math.cos((pan+1)*PI/4);right=math.sin((pan+1)*PI/4)
        self.l[off:e]+=w*left
        self.r[off:e]+=w*right
    def beatnote(self,n,beat,length,kind,vol=.2,pan=0):
        self.note(n,beat*self.beat,length*self.beat,kind,vol,pan)
    def beds(self,progression,texture='full'):
        for bar in range(self.bars):
            chord=progression[bar%len(progression)]
            start=4*bar
            root,third,fifth=chord
            for i,n in enumerate([root+12,third+12,fifth+12,root+24]):
                self.beatnote(n,start,4.03,'strings',.065 if texture=='soft' else .081,[-.55,-.2,.18,.53][i])
            self.beatnote(root-12,start,3.55,'cello',.13 if texture=='soft' else .18,-.17)
            if bar%2==0:
                for i,n in enumerate([root,third,fifth]):
                    self.beatnote(n+12,start+i*.72,2.3,'choir',.052 if texture=='soft' else .065,[-.22,.07,.33][i])
            # Carved, rolling medieval harp arpeggios.
            for i,idx in enumerate([0,2,1,2,0,2,1,2]):
                base=chord[idx]+24+(12 if i==7 else 0)
                self.beatnote(base,start+i*.5,.8,'harp',.086 if texture=='soft' else .10,(-.47 if i%2 else .43))
            # Processional kettle drum is heard under the music, never dominating.
            if texture!='soft':
                self.beatnote(38,start,.55,'timpani',.29,0)
                self.beatnote(36,start+2,.48,'timpani',.20,.17)
                if bar%2==1:self.beatnote(40,start+3.5,.25,'snare',.07,.36)
    def hornphrase(self,notes,start=0,vol=.22,part='horn',pan=0):
        for n,beat,beats in notes:
            self.beatnote(n,start+beat,beats,part,vol,pan)
    def finish(self):
        # Subtle cross-channel reflection and hall acoustics; original dry sources.
        # Energy-preserving delays only, avoid harsh synthetic reverb build-up.
        for delay,decay in [(0.074,.09),(.127,.07),(.213,.053),(.347,.037)]:
            d=round(delay*RATE)
            self.r[d:]+=self.l[:-d]*decay
            self.l[d:]+=self.r[:-d]*decay*.74
        length=round(self.duration*RATE)
        l=self.l[:length];r=self.r[:length]
        # Concert-hall fade only in/out; fixed music loop avoids hard clicks.
        fade_in=min(round(.28*RATE),length//10)
        fade_out=min(round(.58*RATE),length//10)
        l[:fade_in]*=np.linspace(0,1,fade_in);r[:fade_in]*=np.linspace(0,1,fade_in)
        l[-fade_out:]*=np.linspace(1,0,fade_out);r[-fade_out:]*=np.linspace(1,0,fade_out)
        stereo=np.stack([l,r],axis=1)
        peak=float(np.max(np.abs(stereo)));rms=float(np.sqrt(np.mean(stereo**2)))
        stereo=np.tanh(stereo*(.82/max(.08,peak)))
        p=OUT/(self.name+'.ogg')
        with tempfile.NamedTemporaryFile(suffix='.wav',delete=False) as tmp:
            wav=Path(tmp.name)
        try:
            with wave.open(str(wav),'wb') as f:
                f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE)
                f.writeframes((np.clip(stereo,-1,1)*32767).astype('<i2').tobytes())
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libvorbis','-q:a','4','-ar','32000',str(p)],check=True)
        finally:wav.unlink(missing_ok=True)
        print('COMPOSED',self.name,'sec',round(self.duration,2),'bytes',p.stat().st_size,'dry_rms',round(rms,4),flush=True)
        assert p.stat().st_size>10000 and rms>.025
        return p

# Independent medieval/Roman fanfare, no borrowed leitmotif.
Dm=(50,53,57);Bb=(46,50,53);F=(53,57,60);C=(48,52,55);Gm=(43,46,50);A=(45,49,52)
intro=Score('royal-overture',92,8)
intro.beds([Dm,Bb,F,C,Gm,Dm,Bb,A])
intro.hornphrase([(62,0,1.7),(69,1.75,.78),(70,2.65,.8),(72,3.55,.5),(74,4.15,1.8),
                   (69,6.1,1.6),(65,8.0,.9),(67,9.0,.9),(69,10,1.65),
                   (74,12,.75),(72,12.85,.75),(69,13.8,1.55),
                   (65,16,.8),(70,17,.9),(69,18,1.9),(74,20.1,2.1),
                   (77,24,1.15),(76,25.25,.8),(74,26.2,1.9),(69,28.45,3.25)],0,.235,'horn',-.20)
for beat,n in [(0,74),(8,77),(16,81),(24,86)]:
    intro.beatnote(n,beat,2.1,'bell',.17,.50)
intro.finish()

# Loopable restrained music while the player thinks.
battle=Score('royal-arena-loop',93,12)
battle.beds([Dm,Bb,Gm,A,Dm,F,Bb,A,Dm,Gm,Bb,A],texture='soft')
battle.hornphrase([(62,0,1.5),(65,2,.75),(69,3,.8),(70,5,1.7),(69,8,1.4),
                   (67,12,.9),(65,13.1,.85),(62,14.2,1.25),
                   (69,17,.9),(72,18,.9),(74,19,1.7),(69,22,1.0),
                   (65,25,1.0),(67,26.1,1.05),(69,27.2,1.6),
                   (70,30.5,1.1),(69,32,1.15),(65,34.3,1.0),
                   (62,36,1.8),(69,40,1.1),(65,42.3,1.2),
                   (62,44.1,2.0)],0,.095,'horn',-.21)
battle.finish()

victory=Score('royal-victory',96,4)
victory.beds([Dm,F,Bb,Dm])
victory.hornphrase([(62,0,1),(69,1,1),(74,2,1.4),(77,4,1.15),(74,5.2,1.0),
                    (81,6.5,2.0),(79,9,1.0),(77,10,1.0),(74,11,4.5)],0,.27,'horn',-.12)
for b in [0,4,8,12]:victory.beatnote(86,b,1.7,'bell',.18,.3)
victory.finish()

draw=Score('royal-draw',89,4)
draw.beds([Dm,Gm,Bb,A],texture='soft')
draw.hornphrase([(69,0,1.1),(65,1.3,1.2),(62,2.9,1.9),(60,5.9,1.4),
                 (62,8.1,1.5),(65,10.5,1.2),(62,12,2.6)],0,.13,'horn',-.12)
draw.finish()

# Very short responsive transition sting that can overlap with the battle bed.
impact=Score('royal-duel-sting',112,1)
for note,b,d in [(62,0,.9),(69,.5,.8),(74,1.12,1.4)]:
    impact.beatnote(note,b,d,'horn',.25,-.24)
impact.beatnote(38,0,.9,'timpani',.4)
impact.beatnote(74,1.15,1.1,'bell',.18,.4)
impact.finish()
