# R4 Black-board compatibility repair — 2026-11-13

## User-visible failure
User screenshot: full 3D chess screen nearly black; floor and board disappear, pieces silhouette while text/icon sprites stay lit. This is not intended lighting. Do not commit the user's desktop screenshot because it includes unrelated browser tabs.

## Source audit
- detectQualityPreset() used to auto-select Ultra on fast RTX/modern GPU; earlier acceptance screenshots predominantly used quality=medium and missed the actual user's default path.
- QUALITY_SETTINGS.ultra.ssao was TRUE. Extra SSAOPass is a plausible ANGLE/driver bug risk, especially when the game becomes dark but unlit labels remain. This remains a strong *hypothesis*, NOT a universally reproduced proof: Vulkan on Z890 rendered Ultra properly.
- High-end GPUs now select High by default; 3D skinned animations, shadows, bloom remain. Ultra stays opt-in with 4K shadows/dense effects but without SSAO.
- Previous black frame guard only checked the central 8x8 patch twice during initial loading. Now a populated daytime scene samples 9 central pixels periodically and drops postprocessing when 8/9 points have luma <24 for three checks. Dark Dusk art is excluded.
- UI description was corrected to avoid claiming disabled SSAO.

## Verification
- Z890 RTX 5070 Ti real Chrome with Vulkan, 1440x900:
  - High: mean frame brightness 91.4/255, post enabled, zero JS errors.
  - Ultra: 92.1/255, post enabled, zero JS errors.
  - Evidence images pm-r4-quality-high-vulkan.jpg and pm-r4-quality-ultra-vulkan.jpg.
- Default auto quality, 32/32 skinned 3D pieces, desktop+emulated phone tap e2->e4 2/2 passed, no JS errors.
- Combat capture, castling, checkmate 3/3 passed, no watchdogs.
- Unforced native headless GL software path on the machine was <=2 FPS and timed out on heavy ultra test. This does NOT prove exact user's graphical issue.
- New visibility safety guard did not falsely disable postprocessing in normal bright Vulkan tests. Corrupted GL output was not reproduced in this session, so a real failure recovery is not confirmed.
- Original user-profile Chrome tab is not exposed by available CDP target inventory; user-specific visual confirmation remains necessary.

## Deployment boundary
Isolated GitHub Pages preview only; no PlayMoru master/catalog/database changes.
