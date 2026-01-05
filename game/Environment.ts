// src/components/game/Environment.ts
import * as THREE from 'three';
import { IGameMap } from './maps/IGameMap';
import { SnowMap } from './maps/SnowMap';

export class Environment {
  private scene: THREE.Scene;
  private currentMap: IGameMap | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // 기본으로 SnowMap을 로드
    this.loadMap(new SnowMap());
  }

  public loadMap(map: IGameMap) {
    // 기존 맵이 있다면 정리(청소)
    if (this.currentMap) {
      this.currentMap.dispose();
    }

    // 새 맵 설정 및 초기화
    this.currentMap = map;
    this.currentMap.init(this.scene);
  }
}
