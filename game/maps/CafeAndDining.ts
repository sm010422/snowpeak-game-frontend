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
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xdbcbbd, 
      roughness: 0.8,
      side: THREE.DoubleSide
    });

    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;

    this.scene.add(floor);
    // 바닥은 충돌체 목록에 넣지 않는다면 _disposables에만 추가
    this._disposables.push({ mesh: floor });
  }

  private createWalls(): void {
      // 벽 타입 정의 (오타 방지를 위해 상수나 Enum 사용 추천)
      const WALL_TYPES = {
        DEFAULT: 'default',
        BLUE: 'blue',
        GLASS: 'glass',
        CONCRETE: 'concrete'
      };

      // 1. 재질(Material) 라이브러리 생성
      const materials = {
        [WALL_TYPES.DEFAULT]: new THREE.MeshStandardMaterial({
          color: 0x912727,
          roughness: 0.5
        }),
        [WALL_TYPES.BLUE]: new THREE.MeshStandardMaterial({
          color: 0x274591, // 파란색
          roughness: 0.3
        }),
        [WALL_TYPES.CONCRETE]: new THREE.MeshStandardMaterial({
          color: 0x808080, // 회색
          roughness: 0.9   // 거친 느낌
        }),
        // ★ 유리 재질 구현
        [WALL_TYPES.GLASS]: new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                metalness: 0,
                roughness: 0,
                transmission: 1.0,  
                thickness: 0.5,     
                transparent: true,
              })
      };

      // 2. 데이터에 'type' 필드 추가: [x, z, width, depth, type?]
      // type이 없으면 기본값(DEFAULT)을 사용하도록 처리할 예정
      const wallsData: [number, number, number, number, string?][] = [
        // 외곽 (기본 붉은 벽)
        [0, -this.FLOOR_SIZE_Z/2, this.FLOOR_SIZE_X, this.WALL_THICKNESS, WALL_TYPES.DEFAULT],
        [0, this.FLOOR_SIZE_Z/2, this.FLOOR_SIZE_X, this.WALL_THICKNESS, WALL_TYPES.DEFAULT],
        [-this.FLOOR_SIZE_X/2, 0, this.WALL_THICKNESS, this.FLOOR_SIZE_Z, WALL_TYPES.DEFAULT],
        [this.FLOOR_SIZE_X/2, 0, this.WALL_THICKNESS, this.FLOOR_SIZE_Z, WALL_TYPES.DEFAULT],
        
        // 상단 룸 (파란 벽으로 포인트)
        [0, -30, this.FLOOR_SIZE_X, this.WALL_THICKNESS, WALL_TYPES.BLUE], 
        [-10, -40, this.WALL_THICKNESS, 20, WALL_TYPES.BLUE], 
        [10, -40, this.WALL_THICKNESS, 20, WALL_TYPES.BLUE],

        // 하단 룸 (유리벽으로 구현!)
        [0, 35, this.FLOOR_SIZE_X, this.WALL_THICKNESS, WALL_TYPES.GLASS],
        [-15, 42.5, this.WALL_THICKNESS, 15, WALL_TYPES.GLASS],
        [15, 42.5, this.WALL_THICKNESS, 15, WALL_TYPES.GLASS],

        // 중앙 파티션 (콘크리트 느낌)
        [-10, 0, 15, this.WALL_THICKNESS, WALL_TYPES.CONCRETE],
        [-17.5, 5, this.WALL_THICKNESS, 10, WALL_TYPES.CONCRETE], 
        [10, 10, 15, this.WALL_THICKNESS, WALL_TYPES.CONCRETE], 
        [17.5, 15, this.WALL_THICKNESS, 10, WALL_TYPES.CONCRETE],
      ];

      // 3. 루프에서 재질 선택 로직 추가
      wallsData.forEach(([x, z, w, d, type]) => {
        // type이 지정되어 있으면 그 재질을, 없으면 DEFAULT 재질 사용
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
}
