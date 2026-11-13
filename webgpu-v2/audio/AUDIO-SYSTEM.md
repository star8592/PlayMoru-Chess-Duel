# PlayMoru Chess Duel · Royal sound system R5

**Direction:** An original game soundtrack blending Arthurian round-table pageantry with the military gravity of Roman legions. No movie recordings, film themes, third-party music beds, soundfont samples, or cloned actors.

## What is actually built
- Five original stereo OGG cues composed from scratch in scripts/compose_original_score.py: ceremonial overture (~20.9 seconds), arena loop (~31 seconds), victory (~10 seconds), royal draw (~10.8 seconds), combat sting (~2.14 seconds). Original D minor motifs, dynamically synthesised horn/string/choir/harp/bell/timpani instrument timbres. All oscillator/noise maths is original; no external samples were used.
- Thirty-six original Chinese game lines in audio/voice-plan.json: herald, king, queen, six combat roles, check, castling, white/black victory, draw and opening. Eight personas over four preset Kokoro voices, different tempi; not eight independently trained speakers.
- Offline pre-synthesized audio assets in audio/voices. The Chinese Kokoro model (hexgrad/Kokoro-82M-v1.1-zh) is distributed upstream under Apache-2.0. Pinned snapshot 01e7505bd6a7a2ac4975463114c3a7650a9f7218, model SHA256 b1d8410fa44dfb5c15471fd6c4225ea6b4e9ac7fa03c98e8bea47a9928476e2b.
- Source: https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh . The model card confirms Apache-2.0 and provenance. A line-level file manifest tracks hashes, text, model, speaker, length and size. No user voice data, no remote TTS inference.
- Audio director in src/royalAudio.js uses actual sound files, not a web SpeechSynthesis placeholder: loop switching, smooth fades, speech-driven music duck, non-repeating role lines, event cooldown, original fanfare-to-battle transition, human-readable subtitles, accessible default-on mute. Scene cues are driven by the existing chess controller and role-specific attack animations.
- Autoplay policy limitation: initial music is enabled by default but a real browser may not permit playback until the player interacts with the page; the first gesture resumes it without a preference change. Do not misrepresent bypassing browser restrictions.
- Audio downloads are only requested when needed: emitting static URL metadata for all 36 clips does not download their OGG bytes on the first page load. No runtime AI model in the browser.

## Licenses and pending creative sign-off
The installed Ubuntu TimGM6mb SoundFont was deliberately EXCLUDED because its sample library is GPL-2.0, unsuitable for an unreviewed commercial reuse. All five tracks here are newly generated from original mathematical synthesis. The audio is not taken from Arthurian movies or Roman epics.

The 36 speaker clips use preset Kokoro model voices, and upstream model attribution is provided. A professional human listening pass, final mix balance, mouth movement/lip-sync, real speaker/headphone review and real physical mobile-device test are still PENDING. The game should not be described as a professionally recorded orchestra or human voice actor work.

## Reproduction
- Regenerate the score: python3 scripts/compose_original_score.py
- Regenerate the voices: run scripts/generate_royal_voices.py with HF_HUB_OFFLINE=1 in an isolated CPU-enabled Kokoro environment using the pinned model and voices. The local venv remains outside this repository.
- Run npm run build followed by node tests/audio-qa.mjs.
- Audio runtime does NOT require the model, GPUs or cloud services.

## Acceptance
Real desktop Chrome confirms 36/36 OGG speech URLs present; the royal overture and Chinese subtitle/voice play on entering battle; 9.5 seconds later battle music takes over; mute/unmute restores playback; the queen's actual strike starts an original spoken role phrase; real legal Qg7# changes to victory score and spoken declaration; zero JavaScript exceptions or missing media requests. Existing six-role facing, castling, en-passant, intro-to-board and phone-size touch tests must remain green.

Actual Chrome evidence: evidence/royal-audio-intro-desktop.jpg. The screenshot is a rendering, not a proof of audible waveform, so media playback state and asset traces are tested separately.
