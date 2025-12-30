
import * as THREE from 'three';

export class Avatar {
  public group: THREE.Group;
  public body: THREE.Mesh;
  public lLeg: THREE.Mesh;
  public rLeg: THREE.Mesh;
  
  // 보간을 위한 목표 지점 및 회전값
  public targetPos: THREE.Vector3 = new THREE.Vector3();
  public targetRotation: number = 0;

  constructor(color: number, name: string) {
    this.group = new THREE.Group();

    // Body
    this.body = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.0, 0.5),
      new THREE.MeshStandardMaterial({ color })
    );
    this.body.position.y = 0.5;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xffdbac })
    );
    head.position.y = 1.35;
    head.castShadow = true;
    this.group.add(head);

    // Hat
    const hat = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.2, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    hat.position.y = 1.65;
    this.group.add(hat);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    this.lLeg = new THREE.Mesh(legGeo, legMat);
    this.lLeg.position.set(-0.25, 0.25, 0);
    this.group.add(this.lLeg);

    this.rLeg = new THREE.Mesh(legGeo, legMat);
    this.rLeg.position.set(0.25, 0.25, 0);
    this.group.add(this.rLeg);

    this.group.userData = { name };
    
    // 초기 타겟 설정
    this.targetPos.copy(this.group.position);
    this.targetRotation = this.group.rotation.y;
  }

  public updateAnimation(time: number, isMoving: boolean) {
    if (isMoving) {
      const t = time * 12; 
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

  /**
   * 서버에서 받은 목표 지점으로 현재 위치와 회전을 부드럽게 보간합니다.
   * @param alpha 보간 계수 (0~1, 클수록 반응속도가 빠름)
   */
  public lerpToTarget(alpha: number = 0.1) {
    // 위치 보간
    this.group.position.lerp(this.targetPos, alpha);
    
    // 회전 보간 (각도 래핑 처리 포함)
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.targetRotation, alpha);
  }
}
