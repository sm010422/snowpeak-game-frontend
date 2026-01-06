import * as THREE from 'three';

export class Avatar {
  public group: THREE.Group;
  public body: THREE.Mesh;
  public lLeg: THREE.Mesh;
  public rLeg: THREE.Mesh;
  
  // 충돌 감지용 Raycaster
  private raycaster = new THREE.Raycaster();
  // 애니메이션용 누적 시간
  private accumulatedTime: number = 0;
  // 이동 속도
  private readonly SPEED = 22;

  public targetPos: THREE.Vector3 = new THREE.Vector3();
  public targetRotation: number = 0;

  constructor(color: number, name: string) {
    this.group = new THREE.Group();

    // 1. Body
    this.body = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.0, 0.5),
      new THREE.MeshStandardMaterial({ color })
    );
    this.body.position.y = 0.5;
    this.body.castShadow = true;
    this.group.add(this.body);

    // 2. Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xffdbac })
    );
    head.position.y = 1.35;
    head.castShadow = true;
    this.group.add(head);

    // 3. Hat
    const hat = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.2, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    hat.position.y = 1.65;
    this.group.add(hat);

    // 4. Legs
    const legGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    this.lLeg = new THREE.Mesh(legGeo, legMat);
    this.lLeg.position.set(-0.25, 0.25, 0);
    this.group.add(this.lLeg);

    this.rLeg = new THREE.Mesh(legGeo, legMat);
    this.rLeg.position.set(0.25, 0.25, 0);
    this.group.add(this.rLeg);

    // 5. Name Label
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.roundRect(0, 0, 256, 64, 20);
      ctx.fill();
      ctx.font = 'bold 32px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(name, 128, 42);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.y = 2.2;
    sprite.scale.set(2, 0.5, 1);
    this.group.add(sprite);

    this.group.userData = { name };
  }

  /**
   * 메인 업데이트 함수 (충돌 + 이동 + 애니메이션)
   * @param delta 프레임 간 시간 차이 (clock.getDelta())
   * @param mapObjects 충돌 검사할 벽들의 배열
   * @param inputVector 키보드 입력 벡터 (x, z 방향)
   */
  public update(delta: number, mapObjects: THREE.Object3D[], inputVector?: THREE.Vector3) {
    let isMoving = false;

    // 입력값이 있고 길이가 0보다 크면 이동 시도
    if (inputVector && inputVector.length() > 0) {
        isMoving = true;
        
        // 1. 방향 정규화
        const direction = inputVector.clone().normalize();

        // 2. 플레이어 회전 (바라보는 방향)
        // atan2를 사용해 입력 방향으로 부드럽게 회전
        const angle = Math.atan2(direction.x, direction.z);
        this.targetRotation = angle;
        
        // 3. 충돌 감지 (Raycasting)
        // 발 밑(0)이 아니라 몸통 중간(0.5) 높이에서 레이저를 쏴야 벽을 감지함
        const rayOrigin = this.group.position.clone().add(new THREE.Vector3(0, 0.5, 0));
        this.raycaster.set(rayOrigin, direction);
        
        // mapObjects(벽들)과 교차하는지 검사
        const intersects = this.raycaster.intersectObjects(mapObjects);

        // 충돌 체크 거리: 0.6 (몸통 반지름 약 0.4 + 여유분 0.2)
        // 벽이 너무 가까이(0.6 이내) 있으면 이동 금지
        if (intersects.length > 0 && intersects[0].distance < 0.6) {
            // 벽에 부딪힘 -> 이동 안함 (콘솔로 확인 가능: console.log("Bump!"));
        } else {
            // 벽 없음 -> 이동 수행
            const moveAmount = direction.multiplyScalar(this.SPEED * delta);
            this.group.position.add(moveAmount);
            
            // targetPos도 같이 업데이트 (네트워크 동기화 등을 위해)
            this.targetPos.copy(this.group.position);
        }
    }

    // 4. 회전 보간 (부드럽게 돌기)
    // 최단 경로 회전을 위해 angle difference 계산 필요하지만, 간단히 lerp 사용
    // 짐벌락 방지를 위해 쿼터니언을 쓰는게 좋지만 현재 구조 유지
    const rotDiff = this.targetRotation - this.group.rotation.y;
    // -PI ~ PI 사이로 각도 보정 로직은 생략되었으나 간단한 구현에는 작동함
    this.group.rotation.y += rotDiff * 0.1; 

    // 5. 애니메이션 업데이트
    this.updateAnimation(delta, isMoving);
  }

  // 기존 애니메이션 로직 (약간 수정: delta를 받아서 시간 누적)
  private updateAnimation(delta: number, isMoving: boolean) {
    if (isMoving) {
      this.accumulatedTime += delta * 12; // 시간 누적
      const t = this.accumulatedTime;
      
      this.lLeg.rotation.x = Math.sin(t) * 0.8;
      this.rLeg.rotation.x = -Math.sin(t) * 0.8;
      this.body.position.y = 0.5 + Math.abs(Math.cos(t)) * 0.2;
      this.body.rotation.z = Math.sin(t * 0.5) * 0.1;
    } else {
      // 멈췄을 때는 정자세로 복귀
      this.lLeg.rotation.x = THREE.MathUtils.lerp(this.lLeg.rotation.x, 0, 0.1);
      this.rLeg.rotation.x = THREE.MathUtils.lerp(this.rLeg.rotation.x, 0, 0.1);
      this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, 0.5, 0.1);
      this.body.rotation.z = THREE.MathUtils.lerp(this.body.rotation.z, 0, 0.1);
    }
  }

  // (옵션) 원격 플레이어의 위치를 부드럽게 따라갈 때만 사용
  public lerpToTarget(alpha: number = 0.1) {
    this.group.position.lerp(this.targetPos, alpha);
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.targetRotation, alpha);
  }
}
