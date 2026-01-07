// src/game/GameContainer.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { socketService } from '../services/SocketService';
import { Environment } from './Environment';
import { Avatar } from './Avatar';
import { useKeyboard } from '../hooks/userKeyboard';
import { useThreeScene } from '../hooks/useThreeScene';   // [1]
import { usePlayerSystem } from '../hooks/usePlayerSystem'; // [2]

interface GameContainerProps {
  nickname: string;
  role: string;
}

const GameContainer: React.FC<GameContainerProps> = ({ nickname, role }) => {
  // 1. 커스텀 훅으로 로직 분리
  const { mountRef, sceneRef, cameraRef, rendererRef } = useThreeScene();
  const { otherAvatarsRef, handleIncomingUpdate } = usePlayerSystem(nickname, sceneRef);

  const keysRef = useKeyboard();
  const requestRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const activeRef = useRef<boolean>(true);
  
  const environmentRef = useRef<Environment | null>(null);

  // 내 캐릭터는 입력 반응성을 위해 여기서 직접 관리
  const myAvatarRef = useRef<Avatar | null>(null);

  // 최적화 변수들
  const tempVector = useMemo(() => new THREE.Vector3(), []);
  const tempInputDir = useMemo(() => new THREE.Vector3(), []);
  const cameraOffset = useMemo(() => new THREE.Vector3(0, 22, 18), []);

  // 2. 메인 게임 루프 & 소켓 연결
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    activeRef.current = true;

    //  환경(맵) 초기화 및 Ref에 저장
    const environment = new Environment(sceneRef.current);
    environmentRef.current = environment;

    // 내 캐릭터 생성
    const myColor = role === 'BARISTA' ? 0x8b4513 : 0x2e8b57;
    const myAvatar = new Avatar(myColor, nickname);
    sceneRef.current.add(myAvatar.group);
    myAvatarRef.current = myAvatar;

    // 변수 초기화
    // const velocity = new THREE.Vector3();
    // const moveSpeed = 22;
    let lastNetSync = 0;
    const lastSentPosition = new THREE.Vector3();

    // 애니메이션 루프
    const update = () => {
      if (!activeRef.current) return;
      const deltaTime = clockRef.current.getDelta();
      const elapsedTime = clockRef.current.getElapsedTime();

// 👇 [여기 추가] 누락된 풍차/환경 애니메이션 로직 복구
      sceneRef.current?.traverse((obj) => {
        if (obj.userData.bladeGroup) {
            obj.userData.bladeGroup.rotation.z += deltaTime * 3;
        }
      });

      // (1) 내 캐릭터 이동
      if (myAvatarRef.current && environmentRef.current) {
        const avatar = myAvatarRef.current;
        tempInputDir.set(0, 0, 0);
        if (keysRef.current['w'] || keysRef.current['arrowup']) tempInputDir.z -= 1;
        if (keysRef.current['s'] || keysRef.current['arrowdown']) tempInputDir.z += 1;
        if (keysRef.current['a'] || keysRef.current['arrowleft']) tempInputDir.x -= 1;
        if (keysRef.current['d'] || keysRef.current['arrowright']) tempInputDir.x += 1;

        avatar.update(deltaTime, environmentRef.current.mapObjects, tempInputDir);

        // 카메라 추적
        tempVector.copy(avatar.group.position).add(cameraOffset);
        cameraRef.current!.position.lerp(tempVector, 0.08);
        cameraRef.current!.lookAt(avatar.group.position);

        // 네트워크 전송
        const now = performance.now();
        if (now - lastNetSync > 80) {
          if (avatar.group.position.distanceToSquared(lastSentPosition) > 0.0025) {
            socketService.sendMessage('/app/update', {
              playerId: nickname, nickname,
              x: Math.round(avatar.group.position.x * 100),
              y: Math.round(avatar.group.position.z * 100),
              direction: avatar.group.rotation.y.toFixed(2),
              role: role.toUpperCase(), roomId: "1"
            });
            lastNetSync = now;
            lastSentPosition.copy(avatar.group.position);
          }
        }
      }

      // (2) 다른 플레이어 보간
      otherAvatarsRef.current.forEach((other) => {
        const oldPos = other.group.position.clone();
        other.lerpToTarget(0.2);
        other.updateAnimation(elapsedTime, other.group.position.distanceToSquared(oldPos) > 0.0004);
      });

      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    // 3. 소켓 연결 (순서 보장 로직 유지)
    let unsubscribeTopic: (() => void) | undefined;
    let unsubscribePrivate: (() => void) | undefined;

    socketService.connect(
        '/ws-snowpeak',
        () => {
            console.log("🚀 게임 컨테이너: 소켓 연결 성공 & 구독 시작");

            unsubscribeTopic = socketService.subscribe(`/topic/room.1`, (msg: any) => {
                handleIncomingUpdate(msg);
            });

            unsubscribePrivate = socketService.subscribe(`/topic/private/${nickname}`, (msg: any) => {
                if (msg.type === 'SYNC' && Array.isArray(msg.players)) {
                  console.log("👥 기존 플레이어 목록 동기화:", msg.players);
                  msg.players.forEach((player: any) => {
                      // "나"는 제외하고 처리
                      if (player.nickname !== nickname) {
                          handleIncomingUpdate(player); 
                      }
                  });
                }
                else if (Array.isArray(msg)) msg.forEach(p => handleIncomingUpdate(p));
                else handleIncomingUpdate(msg);
            });

            socketService.sendMessage('/app/join', {
                nickname, x: 0, y: 0, role, direction: "0"
            });
        },
        (err) => console.error("연결 실패:", err)
    );

    return () => {
      activeRef.current = false;

      if (environmentRef.current) {

        environmentRef.current.loadMap({ init:()=>{}, update:()=>{}, dispose:()=>{} } as any); // null 처리 혹은 dispose 호출
      }


      if (unsubscribeTopic) unsubscribeTopic();
      if (unsubscribePrivate) unsubscribePrivate();
      
      cancelAnimationFrame(requestRef.current);
      // renderer dispose는 useThreeScene에서 처리함
    };
  }, [nickname, role, handleIncomingUpdate]); // 의존성 배열 최소화

  return <div ref={mountRef} className="w-full h-screen touch-none outline-none" />;
};

export default GameContainer;
