import * as THREE from "three";
import { Avatar } from "../Avatar";

export class LocalAvatarController {
  private raycaster = new THREE.Raycaster();
  private readonly SPEED = 22;

  private vDir = new THREE.Vector3();
  private vRayOrigin = new THREE.Vector3();
  private vUpHalf = new THREE.Vector3(0, 0.5, 0);

  public update(avatar: Avatar, delta: number, mapObjects: THREE.Object3D[], inputVector: THREE.Vector3) {
    let isMoving = false;

    if (inputVector.lengthSq() > 0) {
      isMoving = true;

      this.vDir.copy(inputVector).normalize();

      const angle = Math.atan2(this.vDir.x, this.vDir.z);
      avatar.targetRotation = angle;

      this.vRayOrigin.copy(avatar.group.position).add(this.vUpHalf);
      this.raycaster.set(this.vRayOrigin, this.vDir);

      const intersects = this.raycaster.intersectObjects(mapObjects, false);

      if (!(intersects.length > 0 && intersects[0].distance < 0.6)) {
        avatar.group.position.addScaledVector(this.vDir, this.SPEED * delta);
        avatar.targetPos.copy(avatar.group.position);
      }
    }

    // 회전 최단 경로 보간(지터 방지)
    let rotDiff = avatar.targetRotation - avatar.group.rotation.y;
    rotDiff = ((rotDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
    avatar.group.rotation.y += rotDiff * 0.1;

    avatar.updateWalkAnimation(delta, isMoving);
  }
}
