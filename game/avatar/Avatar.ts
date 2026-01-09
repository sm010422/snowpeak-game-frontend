import * as THREE from "three";
import { buildAvatarMesh } from "./builders/buildAvatarMesh";
import { buildNameLabel } from "./builders/buildNameLabel";

export class Avatar {
  public group: THREE.Group;
  public body: THREE.Mesh;
  public lLeg: THREE.Mesh;
  public rLeg: THREE.Mesh;

  public targetPos: THREE.Vector3 = new THREE.Vector3();
  public targetRotation: number = 0;

  private accumulatedTime = 0;

  private label?: { texture: THREE.Texture; material: THREE.SpriteMaterial };
  private disposables: Array<THREE.Material | THREE.BufferGeometry> = [];

  constructor(color: number, name: string) {
    const parts = buildAvatarMesh(color);

    this.group = parts.group;
    this.body = parts.body;
    this.lLeg = parts.lLeg;
    this.rLeg = parts.rLeg;
    this.disposables = parts.disposables;

    const label = buildNameLabel(name);
    this.group.add(label.sprite);
    this.label = { texture: label.texture, material: label.material };

    this.group.userData = { name };
    this.targetPos.copy(this.group.position);
  }

  public updateWalkAnimation(delta: number, isMoving: boolean) {
    if (isMoving) {
      this.accumulatedTime += delta * 12;
      const t = this.accumulatedTime;

      this.lLeg.rotation.x = Math.sin(t) * 0.8;
      this.rLeg.rotation.x = -Math.sin(t) * 0.8;
      this.body.position.y = 0.5 + Math.abs(Math.cos(t)) * 0.2;
      this.body.rotation.z = Math.sin(t * 0.5) * 0.1;
    } else {
      this.lLeg.rotation.x = THREE.MathUtils.lerp(this.lLeg.rotation.x, 0, 0.1);
      this.rLeg.rotation.x = THREE.MathUtils.lerp(this.rLeg.rotation.x, 0, 0.1);
      this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, 0.5, 0.1);
      this.body.rotation.z = THREE.MathUtils.lerp(this.body.rotation.z, 0, 0.1);
    }
  }

  public lerpToTarget(alpha: number) {
    this.group.position.lerp(this.targetPos, alpha);
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.targetRotation, alpha);
  }

  public dispose() {
    // 이름표 리소스
    this.label?.material.dispose();
    this.label?.texture.dispose();

    // 메시 리소스
    for (const d of this.disposables) {
      if ((d as any).dispose) (d as any).dispose();
    }
    this.disposables = [];
  }
}
