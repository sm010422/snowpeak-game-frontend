import * as THREE from "three";
import { createTileTexture } from "../rendering/textures/textureFactory";

export function buildTiledFloor(params: {
  sizeX: number;
  sizeZ: number;
  tileWorldSize?: number;
}) {
  const { sizeX, sizeZ, tileWorldSize = 2 } = params;

  const geometry = new THREE.PlaneGeometry(sizeX, sizeZ);
  const tex = createTileTexture(512);
  tex.repeat.set(sizeX / tileWorldSize, sizeZ / tileWorldSize);

  const material = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;

  return { mesh: floor, texture: tex };
}
