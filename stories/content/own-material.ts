// Coastal Signal — per-mesh material ownership
//
// The engine's primitive constructors (createSphere, createCube, createCapsule,
// createPlane, ...) don't give each mesh its own material: they pull from a
// shared cache keyed on a *subset* of the options — colour, emissive colour,
// metalness, roughness, transparent, opacity, wireframe. Two things follow
// from that, and both are easy to trip over:
//
//  1. `emissiveIntensity` is NOT part of the cache key. Meshes created with
//     the same colour and opacity but deliberately different glow values
//     silently share one material, so every one of them ends up rendering with
//     whichever intensity was written last.
//  2. Mutating `mesh.material.*` per frame (a fade, a pulse) mutates that
//     shared instance, so the change bleeds into every other mesh holding it —
//     and `destroyMesh` disposes it while the cache still holds the reference,
//     handing a disposed material to any mesh created later with the same
//     options.
//
// Any cart that animates material properties per frame, or that varies glow
// across otherwise-identical meshes, wants its own material instead. Cloning
// after creation is the smallest way to get one without needing a
// cart-facing material API that doesn't exist.
//
// Used by both chapters' cinematic sequences, where dozens of short-lived
// meshes fade in and out together and are then destroyed en masse.

/**
 * Give `mesh` a private clone of its material, optionally setting the
 * emissive intensity that the shared cache would otherwise have ignored.
 * Returns the same mesh so it can wrap a create* call inline.
 */
export function ownMaterial<T>(mesh: T, emissiveIntensity?: number): T {
  const cached = (mesh as { material?: { clone?: () => Record<string, unknown> } } | null)?.material;
  if (cached?.clone) {
    const mat = cached.clone();
    if (emissiveIntensity !== undefined) mat.emissiveIntensity = emissiveIntensity;
    (mesh as { material: unknown }).material = mat;
  }
  return mesh;
}
