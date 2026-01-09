import * as THREE from "three";
import { IGameMap } from "../IGameMap";
import { DisposableItem, disposeLight, disposeMesh, disposeTexture } from "./Disposables";

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
      if (item.kind === "mesh") disposeMesh(this.scene, item.obj, this.mapObjects);
      if (item.kind === "light") disposeLight(this.scene, item.obj);
      if (item.kind === "texture") disposeTexture(item.obj);
    }

    this.disposables = [];
    this.scene = null;
  }

  protected addMesh(mesh: THREE.Mesh, opts?: { collide?: boolean }) {
    if (!this.scene) return;

    this.scene.add(mesh);
    this.disposables.push({ kind: "mesh", obj: mesh });

    if (opts?.collide) this.mapObjects.push(mesh);
  }

  protected addLight(light: THREE.Light) {
    if (!this.scene) return;

    this.scene.add(light);
    this.disposables.push({ kind: "light", obj: light });
  }

  protected trackTexture(tex: THREE.Texture) {
    this.disposables.push({ kind: "texture", obj: tex });
  }

  protected abstract onInit(): void;
  protected onUpdate(delta: number): void {}
}
