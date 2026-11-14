# Scan attribution

- **Apartment — SA3D_R&D_XP47**, Stephane Agullo, https://sa3d.fr.
  Original: https://superspl.at/view?id=cdcec084. CC BY 4.0.
  License statement: https://github.com/playcanvas/engine/blob/main/examples/assets/splats/apartment.txt.
- **gs_Skull**, BabylonJS Assets contributors. The source repository does not
  identify an individual creator. CC BY 4.0 under the repository asset license:
  https://github.com/BabylonJS/Assets/blob/master/README.md.

License: https://creativecommons.org/licenses/by/4.0/.
Each `.source.json` records the pinned download URL, byte size and SHA-256.
The demo applies rotation, scaling and optional shader effects at runtime;
source asset bytes are preserved. Nova64's MIT code license does not replace
these asset licenses. Include this attribution when redistributing these assets.

## Original storybook worlds

**Moonbloom / Voxel Fantasy Grove** and **Stillwater / Zen Garden** are original
Nova64 procedural artwork, distributed under the repository MIT license.
They use no downloaded models, scans, textures, training data or third-party art.
`experiments/splat-worlds/storybook.js` deterministically authors and samples the
geometry into standard Gaussian `.splat` assets. `pnpm splat:assets` regenerates
both files and reports their SHA-256 hashes. They are synthetic Gaussian scenes;
the grove's block shapes do not provide an editable voxel engine.
