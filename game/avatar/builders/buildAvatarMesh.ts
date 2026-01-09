import * as THREE from "three";

export type AvatarParts = {
  group: THREE.Group;
  body: THREE.Mesh;
  lLeg: THREE.Mesh;
  rLeg: THREE.Mesh;
  disposables: Array<THREE.Material | THREE.BufferGeometry>;
};

export function buildAvatarMesh(color: number): AvatarParts {
  const group = new THREE.Group();
  const disposables: Array<THREE.Material | THREE.BufferGeometry> = [];

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
  const bodyMat = new THREE.MeshStandardMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);
  disposables.push(bodyGeo, bodyMat);

  // Head
  const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.35;
  head.castShadow = true;
  group.add(head);
  disposables.push(headGeo, headMat);

  // Hat
  const hatGeo = new THREE.BoxGeometry(0.7, 0.2, 0.7);
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const hat = new THREE.Mesh(hatGeo, hatMat);
  hat.position.y = 1.65;
  group.add(hat);
  disposables.push(hatGeo, hatMat);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

  const lLeg = new THREE.Mesh(legGeo, legMat);
  lLeg.position.set(-0.25, 0.25, 0);
  group.add(lLeg);

  const rLeg = new THREE.Mesh(legGeo, legMat);
  rLeg.position.set(0.25, 0.25, 0);
  group.add(rLeg);

  disposables.push(legGeo, legMat);

  return { group, body, lLeg, rLeg, disposables };
}
