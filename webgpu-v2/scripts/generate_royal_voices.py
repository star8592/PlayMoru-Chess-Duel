#!/usr/bin/env python3
"""Offline, original-role Kokoro dubbing for PlayMoru Chess Duel.
Use model-author voices, no voice cloning or actor imitation, CPU-only.
No external TTS service, no user recordings; rights and hashes written to manifest.
"""
import os
os.environ['CUDA_VISIBLE_DEVICES']=''
os.environ['HF_HUB_OFFLINE']='1'
os.environ['OMP_NUM_THREADS']='2'
os.environ['MKL_NUM_THREADS']='2'
os.environ['TOKENIZERS_PARALLELISM']='false'
from pathlib import Path
import json,hashlib,argparse,subprocess
import numpy as np
import soundfile as sf
import torch
from huggingface_hub import hf_hub_download
from kokoro import KPipeline

ROOT=Path(__file__).resolve().parents[1]
PLAN=ROOT/'audio/voice-plan.json'
OUT=ROOT/'audio/voices'
MODEL='hexgrad/Kokoro-82M-v1.1-zh'
REVISION='01e7505bd6a7a2ac4975463114c3a7650a9f7218'
MODEL_FILE='kokoro-v1_1-zh.pth'

def sha(path):
 h=hashlib.sha256()
 with Path(path).open('rb') as f:
  for b in iter(lambda:f.read(1<<20),b''):h.update(b)
 return h.hexdigest()

def generate(args):
 torch.set_num_threads(2)
 OUT.mkdir(parents=True,exist_ok=True)
 plan=json.loads(PLAN.read_text())
 rows=plan['lines'][:args.limit] if args.limit else plan['lines']
 weight=Path(hf_hub_download(MODEL,MODEL_FILE,revision=REVISION,local_files_only=True))
 print('MODEL_SHA256',sha(weight),flush=True)
 for speaker in {r['actor'] for r in rows}:
  voice=plan['voices'][speaker]['voice']
  path=Path(hf_hub_download(MODEL,'voices/'+voice+'.pt',revision=REVISION,local_files_only=True))
  print('VOICE_SOURCE',voice,sha(path),flush=True)
 print('MODEL_LOADING_CPU',flush=True)
 pipe=KPipeline(lang_code='z',repo_id=MODEL,device='cpu')
 done=[]
 for i,row in enumerate(rows):
  target=OUT/(row['id']+'.ogg')
  performer=plan['voices'][row['actor']]
  if not target.exists() or target.stat().st_size<1600 or args.force:
   print('VOICE_GENERATE',i+1,len(rows),row['id'],performer['voice'],row['text'],flush=True)
   segments=list(pipe(row['text'],voice=performer['voice'],speed=performer['speed'],split_pattern=r'\n+'))
   if not segments:raise RuntimeError('empty generated speech: '+row['id'])
   arr=np.concatenate([np.array(c.audio,dtype=np.float32).reshape(-1) for c in segments])
   if not np.isfinite(arr).all():raise ValueError('invalid float in '+row['id'])
   rms=float(np.sqrt(np.mean(arr**2)));peak=float(np.max(np.abs(arr)));sec=len(arr)/24000
   if not (rms>.002 and peak>.02 and .35<sec<13):
    raise ValueError(f'bad audio {row["id"]} rms={rms} peak={peak} sec={sec}')
   arr=np.pad(arr,(600,3000))
   wav=OUT/('.'+row['id']+'.wav')
   try:
    sf.write(wav,arr,24000,subtype='PCM_16')
    subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(wav),
     '-ar','24000','-ac','1','-codec:a','libvorbis','-q:a','4',str(target)],check=True)
   finally:wav.unlink(missing_ok=True)
  probe=json.loads(subprocess.run(['ffprobe','-v','quiet','-of','json',
   '-show_entries','format=duration:stream=codec_name,sample_rate',str(target)],capture_output=True,text=True,check=True).stdout)
  length=float(probe['format']['duration'])
  if length<=.3:raise RuntimeError('broken audio '+row['id'])
  done.append({'id':row['id'],'actor':row['actor'],'event':row['event'],'text':row['text'],
   'voice':performer['voice'],'speed':performer['speed'],'file':target.name,
   'size':target.stat().st_size,'seconds':round(length,3),'sha256':sha(target),
   'model':MODEL,'revision':REVISION,'license':'Apache-2.0','audition':'pending'})
  (ROOT/'audio/voice-manifest.json').write_text(json.dumps({
   'schema':'playmoru-chess-voice-assets.v1','model':MODEL,'revision':REVISION,
   'generation':'original Chinese lines voiced with offline fixed Kokoro voices; not cloned human performances',
   'license':'Apache-2.0','model_sha256':sha(weight),
   'commercial_use':'requires normal license compliance and human listening review',
   'clips':done
  },indent=2,ensure_ascii=False)+'\n')
  print('VOICE_DONE',row['id'],target.stat().st_size,round(length,2),flush=True)
 print('VOICE_COMPLETE',len(done),'TOTAL_BYTES',sum(r['size'] for r in done),flush=True)

if __name__=='__main__':
 p=argparse.ArgumentParser()
 p.add_argument('--limit',type=int,default=0)
 p.add_argument('--force',action='store_true')
 generate(p.parse_args())
