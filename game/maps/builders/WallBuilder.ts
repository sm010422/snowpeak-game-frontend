import * as THREE from "three";
import { createBrickTexture } from "../rendering/textures/textureFactory";

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
