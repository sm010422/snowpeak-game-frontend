
import * as THREE from 'three';

export class Avatar {
  public group: THREE.Group;
  public body: THREE.Mesh;
  public lLeg: THREE.Mesh;
  public rLeg: THREE.Mesh;
  public targetPos: THREE.Vector3 = new THREE.Vector3();

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
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xffdbac })
    );
    head.position.y = 1.3;
    head.castShadow = true;
    this.group.add(head);

    // Hat
    const hat = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.2, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    hat.position.y = 1.6;
    this.group.add(hat);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    this.lLeg = new THREE.Mesh(legGeo, legMat);
    this.lLeg.position.set(-0.25, 0, 0);
    this.group.add(this.lLeg);

    this.rLeg = new THREE.Mesh(legGeo, legMat);
    this.rLeg.position.set(0.25, 0, 0);
    this.group.add(this.rLeg);

    this.group.userData = { name };
  }

  public updateAnimation(time: number, isMoving: boolean) {
    if (isMoving) {
      const t = time * 10; // Faster animation cycle
      this.lLeg.rotation.x = Math.sin(t) * 0.6;
      this.rLeg.rotation.x = -Math.sin(t) * 0.6;
      this.body.position.y = 0.5 + Math.abs(Math.cos(t)) * 0.15;
    } else {
      this.lLeg.rotation.x = THREE.MathUtils.lerp(this.lLeg.rotation.x, 0, 0.1);
      this.rLeg.rotation.x = THREE.MathUtils.lerp(this.rLeg.rotation.x, 0, 0.1);
      this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, 0.5, 0.1);
    }
  }

  public lerpToTarget(alpha: number = 0.1) {
    this.group.position.lerp(this.targetPos, alpha);
  }
}
