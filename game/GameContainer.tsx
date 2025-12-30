
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { socketService } from '../services/SocketService';
import { Avatar } from './Avatar';
import { Environment } from './Environment';
import { PlayerState } from '../types';

interface GameContainerProps {
  nickname: string;
  role: string;
}

const GameContainer: React.FC<GameContainerProps> = ({ nickname, role }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // 1. 플레이어 데이터 관리를 위한 React State (중복 방지 및 빠른 조회를 위해 Record/Object 사용)
  // 이 상태는 주로 '누가 방에 있는가'를 추적하는 용도로 사용합니다.
  const [playerRegistry, setPlayerRegistry] = useState<Record<string, PlayerState>>({});
  
  // 2. 3D 객체 인스턴스 관리를 위한 Refs (성능을 위해 렌더 루프에서 직접 접근)
  const myAvatarRef = useRef<Avatar | null>(null);
  const otherAvatarsRef = useRef<Map<string, Avatar>>(new Map());
  
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const requestRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const activeRef = useRef<boolean>(true);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // 3. 플레이어 업데이트 처리 로직 (함수형 업데이트 적용)
  const handleIncomingUpdate = useCallback((data: any) => {
    const pid = data.playerId || data.nickname;
    if (!pid || pid === nickname) return;

    // 함수형 업데이트를 사용하여 이전 상태(prev)를 기반으로 안전하게 병합
    setPlayerRegistry((prev) => {
      // 이미 존재하는 플레이어고 좌표만 바뀐 경우, 3D 객체에 즉시 반영 (React 렌더링 없이)
      const avatar = otherAvatarsRef.current.get(pid);
      if (avatar && data.x !== undefined) {
        avatar.targetPos.set(data.x / 100, 0, data.y / 100);
        if (data.direction) avatar.targetRotation = parseFloat(data.direction);
      }

      // 새로운 플레이어거나 정보가 변경된 경우 상태 업데이트
      if (!prev[pid]) {
        return {
          ...prev,
          [pid]: data as PlayerState
        };
      }
      return prev; // 이동 데이터는 Avatar 인스턴스가 처리하므로 상태 변경 최소화
    }, []);
  }, [nickname]);

  useEffect(() => {
    if (!mountRef.current) return;
    activeRef.current = true;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: 'high-performance',
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    renderer.domElement.tabIndex = 1;
    renderer.domElement.focus();

    new Environment(scene);

    // 내 캐릭터 설정
    const myColor = role === 'BARISTA' ? 0x8b4513 : 0x2e8b57;
    const myAvatar = new Avatar(myColor, nickname);
    scene.add(myAvatar.group);
    myAvatarRef.current = myAvatar;

    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const velocity = new THREE.Vector3();
    const moveSpeed = 22;
    let lastNetSync = 0;
    const lastSentPosition = new THREE.Vector3();

    const update = () => {
      if (!activeRef.current) return;
      const deltaTime = clockRef.current.getDelta();
      const elapsedTime = clockRef.current.getElapsedTime();

      // 환경 애니메이션
      scene.traverse((obj) => {
        if (obj.userData.bladeGroup) obj.userData.bladeGroup.rotation.z += deltaTime * 3;
      });

      // 내 캐릭터 이동 로직
      if (myAvatarRef.current) {
        const avatar = myAvatarRef.current;
        const inputDir = new THREE.Vector3(0, 0, 0);
        if (keysRef.current['w'] || keysRef.current['arrowup']) inputDir.z -= 1;
        if (keysRef.current['s'] || keysRef.current['arrowdown']) inputDir.z += 1;
        if (keysRef.current['a'] || keysRef.current['arrowleft']) inputDir.x -= 1;
        if (keysRef.current['d'] || keysRef.current['arrowright']) inputDir.x += 1;

        if (inputDir.length() > 0) {
          inputDir.normalize();
          velocity.lerp(inputDir.multiplyScalar(moveSpeed), 0.25);
          avatar.group.rotation.y = THREE.MathUtils.lerp(avatar.group.rotation.y, Math.atan2(velocity.x, velocity.z), 0.2);
        } else {
          velocity.lerp(new THREE.Vector3(0, 0, 0), 0.25);
        }

        avatar.group.position.add(velocity.clone().multiplyScalar(deltaTime));
        avatar.updateAnimation(elapsedTime, velocity.length() > 0.8);

        // 카메라 추적
        camera.position.lerp(avatar.group.position.clone().add(new THREE.Vector3(18, 22, 18)), 0.08);
        camera.lookAt(avatar.group.position);

        // 네트워크 전송 (100ms 쓰로틀링)
        const now = performance.now();
        if (now - lastNetSync > 100) {
          if (avatar.group.position.distanceTo(lastSentPosition) > 0.05) {
            socketService.sendMessage('/app/update', {
              playerId: nickname, nickname,
              x: Math.round(avatar.group.position.x * 100),
              y: Math.round(avatar.group.position.z * 100),
              direction: avatar.group.rotation.y.toString(),
              role: role.toUpperCase(), roomId: "1"
            });
            lastNetSync = now;
            lastSentPosition.copy(avatar.group.position);
          }
        }
      }

      // 타인 캐릭터 보간 및 애니메이션
      otherAvatarsRef.current.forEach((other) => {
        const oldPos = other.group.position.clone();
        other.lerpToTarget(0.15);
        other.updateAnimation(elapsedTime, other.group.position.distanceTo(oldPos) > 0.02);
      });

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    // 네트워크 구독
    const unsubscribe = socketService.subscribe((msg: any) => {
      if (Array.isArray(msg)) {
        msg.forEach(p => handleIncomingUpdate(p));
      } else {
        handleIncomingUpdate(msg);
      }
    });

    return () => {
      activeRef.current = false;
      unsubscribe();
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.dispose();
    };
  }, [nickname, role, handleIncomingUpdate]);

  // 4. Registry 상태 변화에 따른 3D 객체 생성/삭제 동기화
  useEffect(() => {
    if (!sceneRef.current) return;
    
    Object.keys(playerRegistry).forEach(pid => {
      if (!otherAvatarsRef.current.has(pid)) {
        const data = playerRegistry[pid];
        const newAvatar = new Avatar(0xe74c3c, data.nickname || pid);
        const startX = (data.x || 0) / 100;
        const startZ = (data.y || 0) / 100;
        newAvatar.group.position.set(startX, 0, startZ);
        newAvatar.targetPos.set(startX, 0, startZ);
        
        sceneRef.current?.add(newAvatar.group);
        otherAvatarsRef.current.set(pid, newAvatar);
      }
    });
  }, [playerRegistry]);

  return <div ref={mountRef} className="w-full h-screen touch-none outline-none" />;
};

export default GameContainer;
