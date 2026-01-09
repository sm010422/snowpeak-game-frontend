import * as THREE from "three";
import { WallType } from "../rendering/materials/materialFactory";

export function buildWallMesh(params: {
  x: number;
  z: number;
  w: number;
  d: number;
  height: number;
  material: THREE.Material;
}) {
  const { x, z, w, d, height, material } = params;

  const geometry = new THREE.BoxGeometry(w, height, d);
  const wall = new THREE.Mesh(geometry, material);
  wall.position.set(x, height / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;

  return wall;
}
