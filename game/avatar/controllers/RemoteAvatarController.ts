import { Avatar } from "../Avatar";

export class RemoteAvatarController {
  public update(avatar: Avatar, delta: number, smoothing = 12) {
    const alpha = 1 - Math.exp(-smoothing * delta);
    avatar.lerpToTarget(alpha);

    // 원격도 걷는 애니메이션은 “얼마나 움직였는지”로 판단하는 게 좋지만
    // 최소로는 타겟과의 거리로 판정 가능
    const distSq = avatar.group.position.distanceToSquared(avatar.targetPos);
    const isMoving = distSq > 0.0001;

    avatar.updateWalkAnimation(delta, isMoving);
  }
}
