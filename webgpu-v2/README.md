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
