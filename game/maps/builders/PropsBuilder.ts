import * as THREE from "three";

export function buildSimpleTable(params: {
  x: number;
  z: number;
  width?: number;
  depth?: number;
  height?: number;
}) {
  const { x, z, width = 2.0, depth = 1.2, height = 0.75 } = params;

  const group = new THREE.Group();

  const topGeo = new THREE.BoxGeometry(width, 0.08, depth);
  const topMat = new THREE.MeshStandardMaterial({ color: 0x6b4f3a, roughness: 0.7 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(0, height, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, height, 10);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.8 });

  const dx = width / 2 - 0.15;
  const dz = depth / 2 - 0.15;

  const legs: THREE.Mesh[] = [];
  const legPositions: [number, number][] = [
    [dx, dz],
    [-dx, dz],
    [dx, -dz],
    [-dx, -dz],
  ];

  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, height / 2, lz);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
    legs.push(leg);
  }

  group.position.set(x, 0, z);

  return {
    group,
    meshes: [top, ...legs],
  };
}
