import * as THREE from "three";
import { createTiledFloorMaterial } from "../rendering/materials/materialFactory";

export function buildFloor(params: { sizeX: number; sizeZ: number; tileWorldSize?: number }) {
  const { sizeX, sizeZ, tileWorldSize } = params;

  const geometry = new THREE.PlaneGeometry(sizeX, sizeZ);
  const { material, texture } = createTiledFloorMaterial({ sizeX, sizeZ, tileWorldSize });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;

  return { mesh, texture };
}
