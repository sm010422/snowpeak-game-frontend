// src/game/maps/builders/TableBuilder.ts
import * as THREE from "three";

export interface BuildTableParams {
  // 테이블 위치 (월드 좌표)
  x: number;
  z: number;

  // 테이블 크기 (월드 단위)
  width?: number;   // 가로(X)
  depth?: number;   // 세로(Z)
  height?: number;  // 전체 높이(Y)

  // 상판 두께
  topThickness?: number;

  // 다리 두께
  legThickness?: number;

  // 색상(원하시면 외부에서 바꾸기 쉽게)
  topColor?: number;
  legColor?: number;

  // 충돌 박스 높이 (기본: 테이블 높이 그대로)
  colliderHeight?: number;

  // 충돌 박스에 여유를 조금 줄지(벽에 끼임 방지)
  colliderPadding?: number;
}

export interface BuildTableResult {
  mesh: THREE.Group;   // 시각용(상판+다리)
  collider: THREE.Mesh; // 충돌용(안 보이는 박스)
}

export function buildTable(params: BuildTableParams): BuildTableResult {
  const {
    x,
    z,
    width = 2.0,
    depth = 1.0,
    height = 0.9,
    topThickness = 0.12,
    legThickness = 0.12,
    topColor = 0x8b5a2b,
    legColor = 0x4b2e1f,
    colliderHeight = height,
    colliderPadding = 0.05,
  } = params;

  // -------------------------
  // 1) 시각용 테이블 (Group)
  // -------------------------
  const group = new THREE.Group();

  // 상판
  const topGeo = new THREE.BoxGeometry(width, topThickness, depth);
  const topMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.7 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(0, height - topThickness / 2, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // 다리 4개
  const legGeo = new THREE.BoxGeometry(legThickness, height - topThickness, legThickness);
  const legMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.9 });

  const legY = (height - topThickness) / 2;

  const halfX = width / 2 - legThickness / 2;
  const halfZ = depth / 2 - legThickness / 2;

  const legPositions: Array<[number, number]> = [
    [-halfX, -halfZ],
    [halfX, -halfZ],
    [-halfX, halfZ],
    [halfX, halfZ],
  ];

  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, legY, lz);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  }

  // 테이블 그룹의 월드 위치
  group.position.set(x, 0, z);

  // -------------------------
  // 2) 충돌용 콜라이더 (Mesh)
  //    - 보이지 않음
  //    - 상판/다리 형태를 정확히 따르지 않고 단순 박스로 처리(최적화)
  // -------------------------
  const colW = Math.max(0.01, width - colliderPadding * 2);
  const colD = Math.max(0.01, depth - colliderPadding * 2);
  const colH = Math.max(0.01, colliderHeight);

  const colliderGeo = new THREE.BoxGeometry(colW, colH, colD);
  const colliderMat = new THREE.MeshBasicMaterial({ visible: false });
  const collider = new THREE.Mesh(colliderGeo, colliderMat);

  // 바닥 기준으로 세워지도록 가운데 높이로 올림
  collider.position.set(x, colH / 2, z);

  // Raycaster 대상으로 쓰기 때문에 옵션(원하시면)
  collider.castShadow = false;
  collider.receiveShadow = false;

  return { mesh: group, collider };
}
