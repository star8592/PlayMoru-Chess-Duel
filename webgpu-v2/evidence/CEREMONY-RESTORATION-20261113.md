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

## Public Pages verification after deployment
Published in GitHub Pages gh-pages commit 0b9a8178e8e0fbffd145978cb69b5756737ed071. Public script index-C1W_ZL9-.js returned HTTP 200 and status built. Independent URL:
https://star8592.github.io/PlayMoru-Chess-Duel/webgpu-v2/

Independent real Chrome public network test results:
- Desktop (1440x900): full hall appears with official-style Chess Duel branding; Enter Battlefield begins duel, title card ends, canvas mouse move e2->e4 succeeds; return to hall succeeds. 32/32 skinned figures; WebGL2 confirmed; no JS errors or missing asset requests.
- Simulated phone viewport (390x844): same full flow via mobile touch; 32/32 skinned actors, no page JS errors or missing assets. This does not certify a real phone GPU.
- Archived real public screenshots: royal-public-desktop-menu.jpg, royal-public-desktop-battle.jpg, royal-public-mobile-menu.jpg, royal-public-mobile-battle.jpg.
- Existing independent scripted tests also passed actual Qxd7+, O-O, exf6 captures/castling/en passant.
- review=1 query intentionally skips the ceremonial hall, solely for deterministic debugging/QA. Normal visitors receive the full ceremony.

## Background architecture extension
The earlier PBR stage looked like a sample board floating over a featureless plain.
A separate royalArchitecture module now supplies two stone-and-bronze porticos,
two hanging royal banners and subtle torch accents behind the actual board,
without enclosing the figures in a dark hall. The first continuous 30m lintel
looked like a floating shelf in Chrome and was **discarded**. The final two
separate portal groups do not block playable squares.
Local browser QA with the new environment: desktop+mobile ceremony/hall e2->e4
and back navigation 2/2; 3/3 queen capture/castle/en passant all passed.
See royal-porticos-*-menu.jpg and royal-porticos-*-battle.jpg.
