// src/components/game/maps/SnowMap.ts
import * as THREE from 'three';
import { IGameMap } from './IGameMap';

export class SnowMap implements IGameMap {
  private readonly TILE_SIZE = 4;
  private readonly WORLD_SIZE = 15;
  private scene: THREE.Scene | null = null;
  
  // 맵에 추가된 물체들을 추적하기 위한 배열 (나중에 삭제를 위해)
  private mapObjects: THREE.Object3D[] = []

  // ★ 기존 constructor에 있던 로직이 여기(init)로 다 들어옵니다!
  public init(scene: THREE.Scene): void {
    this.scene = scene;

    // 1. 기본 조명 및 배경 설정 (여기로 이동)
    scene.background = new THREE.Color(0x0b0e14);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambLight);
    this.mapObjects.push(ambLight); // 관리 목록에 추가

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(30, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);
    this.mapObjects.push(dirLight);

    // 2. 아일랜드(타일 맵) 생성 (여기로 이동)
    const totalHalfWidth = (this.WORLD_SIZE * this.TILE_SIZE) / 2;

    for (let iz = 0; iz < this.WORLD_SIZE; iz++) {
      for (let ix = 0; ix < this.WORLD_SIZE; ix++) {
        const x = (ix * this.TILE_SIZE) - totalHalfWidth + (this.TILE_SIZE / 2);
        const z = (iz * this.TILE_SIZE) - totalHalfWidth + (this.TILE_SIZE / 2);

        const tileGeo = new THREE.BoxGeometry(this.TILE_SIZE - 0.2, 0.2, this.TILE_SIZE - 0.2);
        const tileMat = new THREE.MeshStandardMaterial({
          color: (ix + iz) % 2 === 0 ? 0x38b000 : 0x2d9e00,
          roughness: 0.8
        });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set(x, -0.1, z);
        tile.receiveShadow = true;
        
        scene.add(tile);
        this.mapObjects.push(tile);
      }
    }

    // 3. 오브젝트 생성 호출 (여기로 이동)
    this.createTree(-10, -10);
    this.createTree(-5, -12);
    this.createCastle(15, 15);
    this.createWindmill(-15, 15);
  }
  public update(delta: number): void {
          // 지금은 딱히 움직일 게 없으니 비워둬도 됩니다.
          // 나중에 풍차 날개 회전 코드를 여기에 넣습니다.
          /*
          const windmill = this.mapObjects.find(obj => obj.userData.bladeGroup);
          if(windmill) {
              windmill.userData.bladeGroup.rotation.z -= delta * 2;
          }
          */
  }

  // 맵 나갈 때 청소하는 기능
  public dispose(): void {
    if (!this.scene) return;
    this.mapObjects.forEach(obj => this.scene!.remove(obj));
    this.mapObjects = [];
  }

  // --- 기존 create 함수들 (그대로 유지하되 this.scene!.add 로 변경) ---
  
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
