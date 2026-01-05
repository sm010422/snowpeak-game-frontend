import * as THREE from 'three';

export interface IGameMap {
    // 맵을 초기화하고 오브젝트들을 Scene에 추가하는 함수
    init(scene: THREE.Scene): void;
    
    // (선택사항) 맵에서 애니메이션이 필요하다면 사용 (풍차 돌리기 등)
    update(delta: number): void;
    
    // 맵을 떠날 때 청소하는 함수 (메모리 관리)
    dispose(): void;
}
