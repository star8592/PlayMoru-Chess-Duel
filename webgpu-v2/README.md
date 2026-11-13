# PlayMoru Chess Duel V2 — universal WebGPU architecture

2026-11-13: independent game-rendering rewrite and isolated preview.

Runtime uses Three.js 0.187.0 WebGPURenderer, PBR daylight lighting and an entirely
new 3D board, camera, piece-animation and pointer/touch pipeline. It deliberately
reuses the original MIT-licensed Roman human models and chess.js authoritative
game controller from ../web/src/core instead of recreating chess rules.

NATIVE WEBGPU LIMITATION: on the tested Z890 Chrome/Vulkan environment,
native WebGPU backend initialized but output an all-black scene. Therefore the
PLAYABLE V2 DEFAULT is the universal r187 WebGPURenderer with WebGL2 backend;
this is **not** labelled as working native WebGPU. To test native WebGPU
explicitly, use ?backend=webgpu. It is an experimental failure path until
visual browser acceptance has passed on each target GPU family.

## Development
In webgpu-v2 run npm ci, then npm run dev, npm run build, npm run preview.
Run node tests/browser-qa.mjs and node tests/combat-qa.mjs.

For a separate GitHub Pages subdirectory:
PUBLIC_BASE=/PlayMoru-Chess-Duel/webgpu-v2/ npm run build

The build embeds only Rome models (~61 MiB), not the old 186 MiB three-era pack.
The original source repo LICENSE / author credits remain in the fork.
No low-poly block characters, no old EffectComposer, SSAO or GLSL injection.

ACCEPTANCE: 32/32 real SkinnedMeshes; desktop real mouse and mobile-size touch
both e2-e4; queen capture Qxd7+, castling O-O, en passant exf6 all passed.
Only browser emulation on desktop GPU was used for mobile tests.
Real phone performance, native WebGPU, art review and production migration remain
gates; no changes are made to playmoru.com or the old public chess preview.

Preview currently live, separate from old production chess page:
https://star8592.github.io/PlayMoru-Chess-Duel/webgpu-v2/

## The Royal Hall restoration (game identity, not a tech dashboard)
After player review, V2 now presents a full-screen cinematic Chess Duel opening hall,
two opposed royal factions, gold heraldry, opening camera drift, user-triggered
fanfare, marching characters, match proclamation, battle HUD and capture DUEL
callouts. Normal game-facing UI hides engine labels (optional ?debug=1 only).
The opening exists in the actual game, not as static concept art.

Enter on the front page; to bypass ceremony in deterministic QA use ?review=1.
See evidence/CEREMONY-RESTORATION-20261113.md and screenshots.

Royal Hall architectural extension: independent PBR stone and bronze colonnades, dual
banners, torch details and a lighter open royal arena background. The arcade is
visual dressing only and never affects chess moves or the Roman SkinnedMesh models.

## R3 — camera duels and real endgame ceremony
The source module src/royalCinematics.js now coordinates the close-up 3D camera
on legal captures, GPU-light contact ring and return to full-board framing.
The chess.js controller check and gameover events drive alerts and verdicts.
Rematch resets the complete 32-character board.
Evidence: evidence/ROYAL-CINEMATICS-20261113.md.

## R4 — six distinct combat roles and correct facing
Real GLB attack/death clips are now loaded before play and staged as
approach -> face-off -> role-specific wind-up -> impact -> actual collapse ->
occupy destination. Characters rotate smoothly toward their opponent and
back to the opposing army; camera close-ups and royal music remain intact.
Mid-combat new-game requests cancel old visual jobs. See
evidence/COMBAT-CHOREOGRAPHY-R4-20261113.md and tests/role-facing-qa.mjs.

## R5 — original royal score and character dubbing
Original medieval/Roman-styled music cues: opening, arena loop, duel sting,
victory and draw. Thirty-six offline-generated Chinese lines use fixed, attributed
Apache-2.0 Kokoro voices across eight character personas. The director provides
scene-synchronized voice + subtitle, automatic music ducking, a call-and-response
opening with randomized variations, and a default-on sound toggle. No copied
third-party music or soundfonts, and no runtime inference. Model and media file
provenance: audio/AUDIO-SYSTEM.md and audio/voice-manifest.json.
