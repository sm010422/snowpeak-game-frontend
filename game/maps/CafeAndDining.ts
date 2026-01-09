import * as THREE from "three";
import { BaseGameMap } from "./base/BaseGameMap";
import { buildFloor } from "./builders/FloorBuilder";
import { buildWallMesh } from "./builders/WallBuilder";
import { createWallMaterials, WALL_TYPES } from "./rendering/materials/materialFactory";

export class CafeAndDining extends BaseGameMap {
  private readonly WALL_HEIGHT = 4;
  private readonly WALL_THICKNESS = 0.3;
  private readonly FLOOR_SIZE_X = 90;
  private readonly FLOOR_SIZE_Z = 100;

  protected onInit(): void {
    this.setupLighting();

    const { mesh: floor, texture: floorTex } = buildFloor({
      sizeX: this.FLOOR_SIZE_X,
      sizeZ: this.FLOOR_SIZE_Z,
      tileWorldSize: 20,
    });
    this.addMesh(floor);
    this.trackTexture(floorTex);

    this.createWalls();
  }

  private setupLighting(): void {
    if (!this.scene) return;

    this.scene.background = new THREE.Color(0xf5f5f5);

    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    this.addLight(amb);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(50, 100, 50);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);

    const d = 60;
    dir.shadow.camera.left = -d;
    dir.shadow.camera.right = d;
    dir.shadow.camera.top = d;
    dir.shadow.camera.bottom = -d;

    this.addLight(dir);
  }

  private createWalls(): void {
    if (!this.scene) return;

    const { materials, sharedTexture } = createWallMaterials();
    this.trackTexture(sharedTexture);

    const wallsData: [number, number, number, number, string?][] = [
      [0, -this.FLOOR_SIZE_Z / 2, this.FLOOR_SIZE_X, this.WALL_THICKNESS, WALL_TYPES.DEFAULT],
      [0, this.FLOOR_SIZE_Z / 2, this.FLOOR_SIZE_X, this.WALL_THICKNESS, WALL_TYPES.DEFAULT],
      [-this.FLOOR_SIZE_X / 2, 0, this.WALL_THICKNESS, this.FLOOR_SIZE_Z, WALL_TYPES.DEFAULT],
      [this.FLOOR_SIZE_X / 2, 0, this.WALL_THICKNESS, this.FLOOR_SIZE_Z, WALL_TYPES.DEFAULT],

      [0, -30, this.FLOOR_SIZE_X, this.WALL_THICKNESS, WALL_TYPES.DEFAULT],
      [-10, -40, this.WALL_THICKNESS, 20, WALL_TYPES.DEFAULT],
      [10, -40, this.WALL_THICKNESS, 20, WALL_TYPES.DEFAULT],

      [0, 35, this.FLOOR_SIZE_X, this.WALL_THICKNESS, WALL_TYPES.GLASS],
      [-15, 42.5, this.WALL_THICKNESS, 15, WALL_TYPES.GLASS],
      [15, 42.5, this.WALL_THICKNESS, 15, WALL_TYPES.GLASS],
    ];

    for (const [x, z, w, d2, type] of wallsData) {
      const key = (type || WALL_TYPES.DEFAULT) as keyof typeof materials;

      const wall = buildWallMesh({
        x,
        z,
        w,
        d: d2,
        height: this.WALL_HEIGHT,
        material: materials[key],
      });

      this.addMesh(wall, { collide: true });
    }
  }
}
