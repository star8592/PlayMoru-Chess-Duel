# Royal cinematic restoration, 2026-11-13

Project: PlayMoru Chess Duel V2. Visually restore a full-fledged game while keeping the new renderer and original authoritative chess rules.

## Actual new features
- 3D camera director: on a capture, glides toward the actual defender square, narrows field of view from 44 to 36 degrees, holds a three-quarter close shot of real GLB fighters, then restores camera framing and field of view. Ordinary moves retain board camera.
- 3D contact burst: small gold ring and local PointLight burst at defender square, followed by disposal; NOT a full-screen flash. No legacy GLSL, SSAO or EffectComposer.
- Check alert: based on authoritative chess controller check event.
- Endgame verdict: based on authoritative gameover event with winner and reason. Focuses camera on actual winning king if available, then presents Chinese+English declaration with rematch/return to hall.
- Rematch restores normal scene, controller and 32 rigged actors. Rendering backend technical text remains behind debug=1.
- Honours prefers-reduced-motion and sound-toggle. No sound until a user action.
- Previous royal hall architecture, two banners, daylight exposure, MIT credits and WebGL2-safe WebGPURenderer remain unchanged.

## Local real Chrome acceptance (Z890 RTX 5070 Ti, 2026-11-13)
- Capture queen Qxd7+: 30 -> 29 actors. Camera distance 19.86 -> 9.70 -> 19.86, FOV 44 -> approximately 36 -> 44; no JS errors, animation timeouts or missing asset requests. See royal-cinematic-capture-closeup.jpg and capture-return.jpg.
- Simulated mobile viewport / touch capture: matching camera recovery; field of view returned to 56 degrees; simulated mobile GPU is desktop RTX 5070 Ti, not phone hardware. See capture-mobile-closeup.jpg and capture-mobile-return.jpg.
- Forced legal mate from 7k/8/5KQ1/8/8/8/8/8 w - - 0 1, play Qg7#: authoritative checkmate/winner white, displayed 象牙王庭 凯旋 and 将死 · CHECKMATE; clicking rematch produced a clean new 32-actor game with empty moves. See checkmate-verdict.jpg.
- Full ceremonial hall -> enter -> e2/e4 -> back to hall, desktop and simulated phone 2/2.
- Queen capture Qxd7+, castling O-O, en passant exf6 real input 3/3 still passed.

## Known gaps
- Native WebGPU on Z890 Chrome/Vulkan still fails black-screen pixel gate; playable renderer is Three r187 WebGPURenderer/WebGL2 backend. UI must not claim native WebGPU has passed.
- No real-phone device FPS or battery test. No refreshed mocap animation beyond existing GLB clips.
- Look review is subjective, not full artistic signoff.
- Draft preview, not merged to PlayMoru production.

Screenshots are actual browser captures, not image-generation mockups.
