# HDR skyboxes

1k equirectangular HDRIs from [Poly Haven](https://polyhaven.com), released
under [CC0](https://polyhaven.com/license) (public domain). Credit isn't
required, but here it is:

| File | HDRI | Author |
|---|---|---|
| `neon_photostudio_1k.hdr` | [Neon Photostudio](https://polyhaven.com/a/neon_photostudio) | Sergej Majboroda |
| `studio_small_09_1k.hdr` | [Studio Small 09](https://polyhaven.com/a/studio_small_09) | Sergej Majboroda |
| `venice_sunset_1k.hdr` | [Venice Sunset](https://polyhaven.com/a/venice_sunset) | Greg Zaal |
| `kloppenheim_06_puresky_1k.hdr` | [Kloppenheim 06 (Pure Sky)](https://polyhaven.com/a/kloppenheim_06_puresky) | Greg Zaal, Jarod Guest |

Load one with `nova64.light.createHDRSkybox('/assets/sky/hdr/venice_sunset_1k.hdr')`.
It becomes the visible sky and the reflection/refraction map for PBR materials.
