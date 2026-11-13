# R4 role-based physical combat choreography · 2026-11-13

## Objective
Restore the formal character-fighting quality of the original chess game. Do
not substitute low-poly characters, fake card animations or camera-only effects.

## Engineering changes

- New `src/combatDirection.js`: distinct role-directed locomotion, standoff,
  facing, wind-up, impact, death and advance parameters for all six chess roles.
- Both sides' original GLB models have a verified local +Z forward axis. The
  attacker and defender smoothly turn to one another using shortest-path yaw.
  No more attacking enemies with their backs turned.
- The captured piece remains on its own square during the face-off; the
  attacker stops at an arm's-length standoff, winds up, uses its actual source
  attack animation, and plays a real source death clip against the victim.
  The attacker advances onto the destination only after the victim falls.
- No overlapping actors at attack contact and no instant 0-size corpse.
  This also handles en-passant, where the victim square differs from the
  attacker's destination.
- The 24 optional idle/walk/attack/death GLBs are now mandatory and awaited
  during bootstrap. A fast first move can no longer race missing animations.
- Rig-compatible animations are controlled with appropriate clip timescale
  and cross-fade instead of abruptly stopping all clips.
- Intro/capture camera mechanics, PBR lights, and true legal chess state remain
  unchanged. Impact ring and synthesized sound cues use individual role colour
  and sound profiles.
- Game restart cancels queued visual promises and marks the old visual epoch
  invalid so no abandoned animation may mutate newly-created actors.
- Back to home-facing orientation is interpolated; no abrupt 180-degree snap.

## Real source animation mapping

| Piece | Authored attack clip | Intended read | Contact style |
|---|---|---|---|
| Pawn | Thrust_Slash | disciplined spear thrust | quick amber |
| Knight | Heavy_Hammer_Swing | forceful mobile strike | steel-blue |
| Rook | Heavy_Hammer_Swing | deliberate heavy blow | bronze-orange |
| Bishop | Sword_Judgment | formal judicial strike | violet |
| Queen | Charged_Spell_Cast | royal magical execution | purple |
| King | Sword_Judgment | royal blade decree | gold |

All roles retain original 9–11MB rigged high-resolution GLBs and independent
skeleton poses. Different timing and staged movement distinguish pieces even
when the source artist has reused certain attack clips.

## Source and release boundary

Derivative under source MIT license with attribution preserved. No changes to
the old playable chess page, playmoru.com, existing rules or player accounts.
The V2 preview still uses Three r187 WebGPURenderer WebGL2 backend, not
unverified native WebGPU. Physical phone GPU and broad driver qualification
have not passed; use mobile emulation claims only within that scope.

## Tests
The automated real-Chrome suite `tests/role-facing-qa.mjs` validates legal
captures for all 6 role types, true attack clip names, both facing errors,
standoff separation and removal counts. It also interrupts an in-progress
capture with a restart, ensuring no lingering move job. Prior smoke tests
cover normal e2/e4, AI replies, castling, en passant, checkmate, rematch and
the full ceremony on desktop and emulated touch.

Evidence screenshots are real browser pixels, not AI-generated mockups.

## Signed-off test evidence, isolated GitHub Pages preview

Source commit: b71c25d31fc77aeb8b7d5fb8e6d0b7ed7015f305.
Page deployment commit: 2e9b4e493506079ca395557eba40a881649d0672.
Published new hashed script index-CWXaqhhX.js; both index and asset HTTP 200.

Desktop Chrome on Z890 RTX 5070 Ti, real mouse (local and live public):
- All six role captures passed and sourced their actual GLB attack clips.
- Attackers and defenders: yaw facing error 0 within displayed 4-decimal radian precision.
- Standoff lengths: Pawn 0.65, Knight 0.80, Rook 0.83, Bishop 0.88,
  Queen 0.86, King 0.63 world units. No actor-overlap in faceoff.
- Each test had valid SAN move, expected 1-piece capture decrement,
  zero JS errors and zero missing resource requests.
- Restart while a queen attack was winding up restored 32 actors,
  zero pending visual jobs and a clean empty history.
- Public Chrome regression: original ceremony, desktop and emulated mobile
  full entry -> e2/e4 -> return hall all passed, 32/32 skinned characters.
- Public capture camera, mobile viewport and staged checkmate/rematch
  all passed; FOV and camera distance reset after captures.
- This is NOT a physical mobile-device/GPU performance acceptance.
- Native WebGPU remains unqualified; playable backend is r187 WebGPURenderer
  on certified WebGL2.
- Screenshots role-facing-public-{n,q,r}.jpg are from the deployed actual
  public browser page, not a mockup.
