
import * as THREE from 'three';

export class Environment {
  private scene: THREE.Scene;
  private readonly TILE_SIZE = 4;
  private readonly WORLD_SIZE = 15;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // 1. 기본 조명 및 배경 설정
    scene.background = new THREE.Color(0x0b0e14); // Phaser 배경색과 동일하게 어둡게 설정
    
    const ambLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(30, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    // 2. 아일랜드(타일 맵) 생성
    // Phaser의 MainScene처럼 중앙을 기준으로 15x15 그리드를 만듭니다.
    const offset = (this.WORLD_SIZE * this.TILE_SIZE) / 2;
    
    for (let iz = 0; iz < this.WORLD_SIZE; iz++) {
      for (let ix = 0; ix < this.WORLD_SIZE; ix++) {
        const x = ix * this.TILE_SIZE - offset;
        const z = iz * this.TILE_SIZE - offset;
        
        const tileGeo = new THREE.BoxGeometry(this.TILE_SIZE - 0.1, 0.2, this.TILE_SIZE - 0.1);
        const tileMat = new THREE.MeshStandardMaterial({ 
          color: 0x38b000, // Phaser의 밝은 초록색
          roughness: 0.8 
        });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set(x, -0.1, z);
        tile.receiveShadow = true;
        this.scene.add(tile);
      }
    }

    // 3. 기존 프랍(Props) 재현
    // Phaser 좌표: Tree(128,128), Tree(256,128), Castle(512,512), Windmill(64,512)
    // 64px 당 1타일(4단위)로 환산하여 배치합니다.
    this.createTree(128 / 16 - offset/2, 128 / 16 - offset/2);
    this.createTree(256 / 16 - offset/2, 128 / 16 - offset/2);
    this.createCastle(512 / 16 - offset/2, 512 / 16 - offset/2);
    this.createWindmill(64 / 16 - offset/2, 512 / 16 - offset/2);
  }

  private createTree(x: number, z: number) {
    const group = new THREE.Group();
    
    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 1),
      new THREE.MeshStandardMaterial({ color: 0x5d4037 })
    );
    trunk.position.y = 0.5;
    trunk.castShadow = true;
    group.add(trunk);

    // Leaves (Cones)
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1b4332 });
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1, 1.5, 8), leafMat);
    cone1.position.y = 1.5;
    cone1.castShadow = true;
    group.add(cone1);

    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 8), leafMat);
    cone2.position.y = 2.2;
    cone2.castShadow = true;
    group.add(cone2);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private createCastle(x: number, z: number) {
    const group = new THREE.Group();
    
    // Main Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3, 3, 3),
      new THREE.MeshStandardMaterial({ color: 0xced4da })
    );
    body.position.y = 1.5;
    body.castShadow = true;
    group.add(body);

    // Roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 2, 4),
      new THREE.MeshStandardMaterial({ color: 0xae2012 })
    );
    roof.position.y = 4;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    // Towers
    const towerGeo = new THREE.BoxGeometry(0.8, 4, 0.8);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xadb5bd });
    
    const t1 = new THREE.Mesh(towerGeo, towerMat);
    t1.position.set(-1.5, 2, -1.5);
    group.add(t1);

    const t2 = new THREE.Mesh(towerGeo, towerMat);
    t2.position.set(1.5, 2, -1.5);
    group.add(t2);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private createWindmill(x: number, z: number) {
    const group = new THREE.Group();
    
    // Base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 1, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x6c757d })
    );
    base.position.y = 1.5;
    group.add(base);

    // Blades
    const bladeGroup = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(3, 0.2, 0.1);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    
    const b1 = new THREE.Mesh(bladeGeo, bladeMat);
    const b2 = new THREE.Mesh(bladeGeo, bladeMat);
    b2.rotation.z = Math.PI / 2;
    
    bladeGroup.add(b1, b2);
    bladeGroup.position.set(0, 2.5, 0.6);
    group.add(bladeGroup);

    // Animation reference
    group.userData.bladeGroup = bladeGroup;

    group.position.set(x, 0, z);
    this.scene.add(group);
  }
}
