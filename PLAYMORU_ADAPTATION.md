# PlayMoru Chess Duel — cinematic chess adaptation

Original: https://github.com/ade5791/rork-medieval-3d-chess
Pinned source commit: 4a2187c866892fda8de1e40e8a6ed5503559bad4

Original game, characters, skeletal clips, code and original audio are published under the original contributors' MIT LICENSE and README. This is a fork / derivative, not a completely original PlayMoru game.

Changes: PlayMoru title and source credits, online tab hidden until a real multiplayer relay is configured with VITE_ENABLE_ONLINE=true. Game rules, input, figures, cinematic capture effects and AI remain the upstream implementation.

## Preview
cd web
npm ci --ignore-scripts
npm run build
npm run preview

For subpath deployment, set PUBLIC_BASE=/preview/chess-duel/ during build and serve the complete dist under that path.

## Gate
Do not list as a finished PlayMoru game before independent visual, actual gameplay and mobile tests. Three armies ship ~186 MB of GLBs. Loading times, LOD and licensed material provenance must be audited. Never replace high-quality characters with crude primitive models only to cut download size.
