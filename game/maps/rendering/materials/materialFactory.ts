import * as THREE from "three";
import { createBrickTexture, createTileTexture } from "../textures/textureFactory";

export function createTiledFloorMaterial(params: { sizeX: number; sizeZ: number; tileWorldSize?: number }) {
  const { sizeX, sizeZ, tileWorldSize = 2 } = params;

  const tex = createTileTexture(512);
  tex.repeat.set(sizeX / tileWorldSize, sizeZ / tileWorldSize);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  return { material: mat, texture: tex };
}

export const WALL_TYPES = {
  DEFAULT: "default",
  BLUE: "blue",
  GLASS: "glass",
  CONCRETE: "concrete",
} as const;

export type WallType = (typeof WALL_TYPES)[keyof typeof WALL_TYPES];

export function createWallMaterials() {
  const brickTex = createBrickTexture(512);
  brickTex.repeat.set(6, 2);

  const materials: Record<WallType, THREE.Material> = {
    [WALL_TYPES.DEFAULT]: new THREE.MeshStandardMaterial({
      map: brickTex,
      color: 0xffffff,
      roughness: 0.75,
      metalness: 0,
    }),
    [WALL_TYPES.BLUE]: new THREE.MeshStandardMaterial({
      map: brickTex,
      color: 0x8fb0ff,
      roughness: 0.7,
      metalness: 0,
    }),
    [WALL_TYPES.CONCRETE]: new THREE.MeshStandardMaterial({
      map: brickTex,
      color: 0xd0d0d0,
      roughness: 0.9,
      metalness: 0,
    }),
    [WALL_TYPES.GLASS]: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 1.0,
      thickness: 0.5,
      transparent: true,
    }),
  };

  return { materials, sharedTexture: brickTex };
}
