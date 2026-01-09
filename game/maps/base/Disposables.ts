import * as THREE from "three";

export type DisposableItem =
  | { kind: "mesh"; obj: THREE.Mesh }
  | { kind: "light"; obj: THREE.Light }
  | { kind: "texture"; obj: THREE.Texture };

export function disposeMesh(scene: THREE.Scene, mesh: THREE.Mesh, collideList?: THREE.Object3D[]) {
  scene.remove(mesh);

  mesh.geometry.dispose();

  const mat = mesh.material;
  if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
  else mat.dispose();

  if (collideList) {
    const idx = collideList.indexOf(mesh);
    if (idx > -1) collideList.splice(idx, 1);
  }
}

export function disposeLight(scene: THREE.Scene, light: THREE.Light) {
  scene.remove(light);
  if (light.shadow?.map) light.shadow.map.dispose();
}

export function disposeTexture(tex: THREE.Texture) {
  tex.dispose();
}
