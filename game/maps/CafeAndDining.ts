import * as THREE from 'three';
import { IGameMap } from './IGameMap'; // IGameMap 파일 경로에 맞게 수정하세요

export class CafeAndDining implements IGameMap {
  private scene: THREE.Scene | null = null;
  private mapObjects: THREE.Object3D[]; // 외부에서 주입받은 충돌 검사 리스트
  
  // 맵에서 생성한 모든 메쉬와 라이트를 추적하여 dispose할 때 사용
  private _disposables: { mesh?: THREE.Mesh, light?: THREE.Light, texture?: THREE.Texture }[] = [];

  // 맵 설정 상수
  private readonly WALL_HEIGHT = 4;
  private readonly WALL_THICKNESS = 0.3;
  private readonly FLOOR_SIZE_X = 90;
  private readonly FLOOR_SIZE_Z = 100;

  constructor(mapObjects: THREE.Object3D[]) {
    this.mapObjects = mapObjects;
  }

  // --- [1] IGameMap 구현: 초기화 ---
  public init(scene: THREE.Scene): void {
    this.scene = scene;

    // 1. 조명 설정
    this.setupLighting();

    // 2. 바닥 생성
    this.createFloor();

    // 3. 벽 생성
    this.createWalls();
  }

  // --- [2] IGameMap 구현: 업데이트 (애니메이션) ---
  public update(delta: number): void {
    // 현재는 움직이는 벽이나 오브젝트가 없으므로 비워둡니다.
    // 만약 '자동문'이나 '반짝이는 조명'이 있다면 여기서 처리합니다.
  }

  // --- [3] IGameMap 구현: 리소스 정리 (메모리 해제) ---
  public dispose(): void {
    if (!this.scene) return;

    // 1. 생성했던 모든 오브젝트 순회하며 제거
    this._disposables.forEach((item) => {
      // Mesh 정리
      if (item.mesh) {
        this.scene!.remove(item.mesh); // 씬에서 제거
        item.mesh.geometry.dispose();  // 지오메트리 메모리 해제

        // 재질(Material) 메모리 해제
        if (Array.isArray(item.mesh.material)) {
          item.mesh.material.forEach(m => m.dispose());
        } else {
          item.mesh.material.dispose();
        }

        // 충돌 리스트(mapObjects)에서도 제거
        const index = this.mapObjects.indexOf(item.mesh);
        if (index > -1) {
          this.mapObjects.splice(index, 1);
        }
      }

      // Light 정리
      if (item.light) {
        this.scene!.remove(item.light);
        if (item.light.shadow && item.light.shadow.map) {
            item.light.shadow.map.dispose(); // 그림자 맵 해제
        }
      }

      if (item.texture) {
        item.texture.dispose();
      }
    });

    // 배열 초기화
    this._disposables = [];
    this.scene = null;
  }

  // ==========================================================
  // 아래는 맵 생성 내부 로직 (Private Methods)
  // ==========================================================

  private setupLighting(): void {
    if (!this.scene) return;

    this.scene.background = new THREE.Color(0xf5f5f5);

    // 환경광
    const ambLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambLight);
    this._disposables.push({ light: ambLight });

    // 주광 (그림자)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    
    // 그림자 카메라 범위 설정
    const d = 60;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;

    this.scene.add(dirLight);
    this._disposables.push({ light: dirLight });
  }

  private createFloor(): void {
    if (!this.scene) return;

    const geometry = new THREE.PlaneGeometry(this.FLOOR_SIZE_X, this.FLOOR_SIZE_Z);

    const tileTex = this.createTileTexture(512);
    // 월드 크기에 맞춰 반복 횟수 조절 (타일 한 칸을 대략 2유닛로 가정)
    const TILE_WORLD_SIZE = 2;
    tileTex.repeat.set(this.FLOOR_SIZE_X / TILE_WORLD_SIZE, this.FLOOR_SIZE_Z / TILE_WORLD_SIZE);

    const material = new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;

    this.scene.add(floor);

    // 텍스처도 dispose 대상에 추가
    this._disposables.push({ mesh: floor, texture: tileTex });
  }

  private createWalls(): void {
    const WALL_TYPES = {
      DEFAULT: "default",
      BLUE: "blue",
      GLASS: "glass",
      CONCRETE: "concrete",
    };

    const brickTex = this.createBrickTexture(512);
    // 벽돌 한 칸을 대략 1유닛로 가정해서 반복(대충 보기에 자연스러운 값)
    brickTex.repeat.set(6, 2);

    // 필요하면 벽 타입별 반복을 다르게 하고 싶을 때는,
    // 지금은 간단히 공용으로 씁니다.

    const materials = {
      [WALL_TYPES.DEFAULT]: new THREE.MeshStandardMaterial({
        map: brickTex,
        color: 0xffffff,     // 텍스처 원색 그대로
        roughness: 0.75,
        metalness: 0.0,
      }),
      [WALL_TYPES.BLUE]: new THREE.MeshStandardMaterial({
        map: brickTex,
        color: 0x8fb0ff,     // 벽돌 위에 파란 페인트 느낌(틴트)
        roughness: 0.7,
        metalness: 0.0,
      }),
      [WALL_TYPES.CONCRETE]: new THREE.MeshStandardMaterial({
        // 콘크리트는 그대로 두고 싶으면 map 제거하셔도 됩니다
        map: brickTex,
        color: 0xd0d0d0,
        roughness: 0.9,
        metalness: 0.0,
      }),
      [WALL_TYPES.GLASS]: new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0,
        transmission: 1.0,
        thickness: 0.5,
        transparent: true,
      }),
    };

    // 텍스처 dispose 대상 등록(공용이니 한 번만)
    this._disposables.push({ texture: brickTex });

    const wallsData: [number, number, number, number, string?][] = [
      [0, -this.FLOOR_SIZE_Z / 2, this.FLOOR_SIZE_X, this.WALL_THICKNESS, WALL_TYPES.DEFAULT],
      [0, this.FLOOR_SIZE_Z / 2, this.FLOOR_SIZE_X, this.WALL_THICKNESS, WALL_TYPES.DEFAULT],
      [-this.FLOOR_SIZE_X / 2, 0, this.WALL_THICKNESS, this.FLOOR_SIZE_Z, WALL_TYPES.DEFAULT],
      [this.FLOOR_SIZE_X / 2, 0, this.WALL_THICKNESS, this.FLOOR_SIZE_Z, WALL_TYPES.DEFAULT],

      [0, -30, this.FLOOR_SIZE_X, this.WALL_THICKNESS, WALL_TYPES.DEFAULT],
      [-10, -40, this.WALL_THICKNESS, 20, WALL_TYPES.DEFAULT],
      [10, -40, this.WALL_THICKNESS, 20, WALL_TYPES.DEFAULT],

      [0, 35, this.FLOOR_SIZE_X, this.WALL_THICKNESS, WALL_TYPES.GLASS],
      [-15, 42.5, this.WALL_THICKNESS, 15, WALL_TYPES.GLASS],
      [15, 42.5, this.WALL_THICKNESS, 15, WALL_TYPES.GLASS],

      [-10, 0, 15, this.WALL_THICKNESS, WALL_TYPES.DEFAULT],
      [-17.5, 5, this.WALL_THICKNESS, 10, WALL_TYPES.CONCRETE],
      [10, 10, 15, this.WALL_THICKNESS, WALL_TYPES.CONCRETE],
      [17.5, 15, this.WALL_THICKNESS, 10, WALL_TYPES.CONCRETE],
    ];

    wallsData.forEach(([x, z, w, d, type]) => {
      const materialKey = type || WALL_TYPES.DEFAULT;
      const selectedMaterial = materials[materialKey];
      this.createWallMesh(x, z, w, d, selectedMaterial);
    });
  }

  private createWallMesh(x: number, z: number, w: number, d: number, material: THREE.Material): void {
    if (!this.scene) return;

    const geometry = new THREE.BoxGeometry(w, this.WALL_HEIGHT, d);
    const wall = new THREE.Mesh(geometry, material);
    
    wall.position.set(x, this.WALL_HEIGHT / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;

    this.scene.add(wall);
    this.mapObjects.push(wall); // 충돌 리스트 추가
    this._disposables.push({ mesh: wall }); // 메모리 관리 리스트 추가
  }

  private setTextureColorSpace(tex: THREE.Texture) {
    // three 버전 호환: 최신은 colorSpace, 구버전은 encoding
    const anyTex = tex as any;
    if (anyTex.colorSpace !== undefined && (THREE as any).SRGBColorSpace) {
      anyTex.colorSpace = (THREE as any).SRGBColorSpace;
    } else if (anyTex.encoding !== undefined && (THREE as any).sRGBEncoding) {
      anyTex.encoding = (THREE as any).sRGBEncoding;
    }
  }

  private createTileTexture(size = 512) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d")!;
    // 베이스 색
    ctx.fillStyle = "#dbcbbd";
    ctx.fillRect(0, 0, size, size);

    // 아주 약한 노이즈(단색 느낌 줄이기)
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 10; // -5 ~ +5
      img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
      img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
      img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);

    // 타일 줄(그라우트)
    const tiles = 8; // 한 장의 텍스처 안 타일 개수
    const step = size / tiles;
    ctx.strokeStyle = "rgba(120, 110, 100, 0.55)";
    ctx.lineWidth = 2;

    for (let i = 0; i <= tiles; i++) {
      const p = Math.round(i * step) + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    // 타일 경계 살짝 하이라이트
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= tiles; i++) {
      const p = Math.round(i * step) + 1.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    this.setTextureColorSpace(tex);
    tex.needsUpdate = true;

    return tex;
  }

  private createBrickTexture(size = 512) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d")!;

    // 모르타르(줄눈) 베이스
    ctx.fillStyle = "#d6d2cc";
    ctx.fillRect(0, 0, size, size);

    const brickW = Math.floor(size / 8);   // 벽돌 가로
    const brickH = Math.floor(size / 16);  // 벽돌 세로
    const mortar = 4;

    for (let y = 0; y < size; y += brickH + mortar) {
      const row = Math.floor(y / (brickH + mortar));
      const offset = (row % 2) * Math.floor((brickW + mortar) / 2);

      for (let x = -offset; x < size; x += brickW + mortar) {
        const bx = x + mortar;
        const by = y + mortar;

        // 벽돌 색 랜덤 변조
        const baseR = 150 + Math.random() * 30;
        const baseG = 60 + Math.random() * 20;
        const baseB = 55 + Math.random() * 20;

        ctx.fillStyle = `rgb(${baseR | 0}, ${baseG | 0}, ${baseB | 0})`;
        ctx.fillRect(bx, by, brickW, brickH);

        // 약한 음영(입체감)
        ctx.fillStyle = "rgba(0,0,0,0.10)";
        ctx.fillRect(bx, by + brickH - 3, brickW, 3);

        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(bx, by, brickW, 2);
      }
    }

    // 아주 약한 노이즈
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 8;
      img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
      img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
      img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    this.setTextureColorSpace(tex);
    tex.needsUpdate = true;

    return tex;
  }
}
