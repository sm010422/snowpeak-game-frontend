
import * as THREE from 'three';

export class Environment {
  private scene: THREE.Scene;
  private readonly TILE_SIZE = 4;
  private readonly WORLD_SIZE = 15;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // 1. 기본 조명 및 배경 설정
    scene.background = new THREE.Color(0x0b0e14);
    
    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(30, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    // 2. 아일랜드(타일 맵) 생성 - 정중앙 (0,0) 기준
    const totalHalfWidth = (this.WORLD_SIZE * this.TILE_SIZE) / 2;
    
    for (let iz = 0; iz < this.WORLD_SIZE; iz++) {
      for (let ix = 0; ix < this.WORLD_SIZE; ix++) {
        const x = (ix * this.TILE_SIZE) - totalHalfWidth + (this.TILE_SIZE / 2);
        const z = (iz * this.TILE_SIZE) - totalHalfWidth + (this.TILE_SIZE / 2);
        
        const tileGeo = new THREE.BoxGeometry(this.TILE_SIZE - 0.2, 0.2, this.TILE_SIZE - 0.2);
        const tileMat = new THREE.MeshStandardMaterial({ 
          color: (ix + iz) % 2 === 0 ? 0x38b000 : 0x2d9e00, // 격자 무늬 추가
          roughness: 0.8 
        });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set(x, -0.1, z);
        tile.receiveShadow = true;
        this.scene.add(tile);
      }
    }

    // 3. 기존 프랍(Props) 재현 (좌표를 맵 규모에 맞춰 조정)
    this.createTree(-10, -10);
    this.createTree(-5, -12);
    this.createCastle(15, 15);
    this.createWindmill(-15, 15);
  }

  private createTree(x: number, z: number) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 1),
      new THREE.MeshStandardMaterial({ color: 0x5d4037 })
    );
    trunk.position.y = 0.5;
    trunk.castShadow = true;
    group.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1b4332 });
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1, 1.5, 8), leafMat);
    cone1.position.y = 1.5;
    cone1.castShadow = true;
    group.add(cone1);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private createCastle(x: number, z: number) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 4),
      new THREE.MeshStandardMaterial({ color: 0xced4da })
    );
    body.position.y = 2;
    body.castShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.5, 2.5, 4),
      new THREE.MeshStandardMaterial({ color: 0xae2012 })
    );
    roof.position.y = 5.25;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private createWindmill(x: number, z: number) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.2, 4, 6),
      new THREE.MeshStandardMaterial({ color: 0x6c757d })
    );
    base.position.y = 2;
    group.add(base);

    const bladeGroup = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(4, 0.3, 0.1);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const b1 = new THREE.Mesh(bladeGeo, bladeMat);
    const b2 = new THREE.Mesh(bladeGeo, bladeMat);
    b2.rotation.z = Math.PI / 2;
    bladeGroup.add(b1, b2);
    bladeGroup.position.set(0, 3.5, 0.8);
    group.add(bladeGroup);

    group.userData.bladeGroup = bladeGroup;
    group.position.set(x, 0, z);
    this.scene.add(group);
  }
}
