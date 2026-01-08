import * as THREE from "three";
import { IGameMap } from "../IGameMap";

type DisposableItem =
  | { kind: "mesh"; obj: THREE.Mesh }
  | { kind: "light"; obj: THREE.Light }
  | { kind: "texture"; obj: THREE.Texture };

export abstract class BaseGameMap implements IGameMap {
  protected scene: THREE.Scene | null = null;
  protected mapObjects: THREE.Object3D[];
  private disposables: DisposableItem[] = [];

  constructor(mapObjects: THREE.Object3D[]) {
    this.mapObjects = mapObjects;
  }

  public init(scene: THREE.Scene): void {
    this.scene = scene;
    this.onInit();
  }

  public update(delta: number): void {
    this.onUpdate(delta);
  }

  public dispose(): void {
    if (!this.scene) return;

    for (const item of this.disposables) {
      if (item.kind === "mesh") {
        const mesh = item.obj;
        this.scene.remove(mesh);

        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }

        const idx = this.mapObjects.indexOf(mesh);
        if (idx > -1) this.mapObjects.splice(idx, 1);
      }

      if (item.kind === "light") {
        const light = item.obj;
        this.scene.remove(light);
        if (light.shadow?.map) light.shadow.map.dispose();
      }

      if (item.kind === "texture") {
        item.obj.dispose();
      }
    }

    this.disposables = [];
    this.scene = null;
  }

  protected addMesh(mesh: THREE.Mesh, opts?: { collide?: boolean }) {
    if (!this.scene) return;
    this.scene.add(mesh);
    this.disposables.push({ kind: "mesh", obj: mesh });

    if (opts?.collide) {
      this.mapObjects.push(mesh);
    }
  }

  protected addLight(light: THREE.Light) {
    if (!this.scene) return;
    this.scene.add(light);
    this.disposables.push({ kind: "light", obj: light });
  }

  protected addTexture(tex: THREE.Texture) {
    this.disposables.push({ kind: "texture", obj: tex });
  }

  protected abstract onInit(): void;
  protected onUpdate(delta: number): void {}
}
