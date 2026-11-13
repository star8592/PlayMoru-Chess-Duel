# Royal Hall restoration — keep cinematic chess, not a development dashboard

2026-11-13. Player feedback: V2 had become a bare technical subproject, losing the original King's Gambit / Chess Duel's formal, ceremonial feeling.

## New game-facing identity
- Full-viewport 3D stage; no permanent 330px developer sidebar.
- Branded PlayMoru CLASSICS opening hall with crown, heraldry, chess title, two opposed royal factions and deliberate gold/ivory/obsidian palette.
- Human-selectable AI vs hotseat and difficulty inside the hall, with a single prominent Enter Battlefield action.
- Camera slowly glides across the actual 32 skinned character actors during the opening hall (not pre-rendered marketing art).
- User-triggered, original three-note royalty fanfare (WebAudio after interaction, enabled by default; mute supported).
- After confirming battle, both sides march into starting squares, followed by the 1.85s match title reveal; no old GLSL/EffectComposer.
- Live match has two readable faction score banners, move chronicle, new/undo/flip/menu and optional fullscreen; capture uses transient DUEL callout and existing skeleton combat actions.
- Backend/version diagnostics are NOT public-facing UI. They remain available with ?debug=1; the source still reports true backend, currently r187 WebGL2.
- Old MIT source/author attribution remains visible in-page. Avoid misleading users that this derivative is a fully original model set.
- Reduced-motion preference shortens intro and suppresses nonessential UI animations.

## True browser QA
Chrome on Z890 desktop 1440x900 and simulated mobile 390x844:
- Complete automatic bootstrap to ceremony hall: both pass.
- Displayed the title, banner and Enter Battlefield CTA as actual browser pixels: pass.
- Entered the arena, cleared the 1.85s announcement, match HUD visible: pass.
- Selected and played e2->e4 through real mouse / touch: both pass, 32/32 rigged units, WebGL2 backend, no page JS/asset errors.
- Returned to game hall from active battle: both pass.
- Regressions with scripted FEN and actor animation: Qxd7+, O-O, exf6 all pass, no animation timeouts.
- This does NOT certify native WebGPU (known black visual issue on Z890/Vulkan) or actual physical phone FPS.

## Evidence
royal-hall-desktop.jpg
royal-battle-desktop.jpg
royal-hall-mobile.jpg
royal-battle-mobile.jpg

Compare earlier v2-public-desktop.jpg in this folder: the initial V2 had a prominent technical sidebar and no game-opening sequence. Review both screenshots to judge the identity change.

Separate GitHub Pages preview only. The original public chess page and playmoru.com remain untouched.
