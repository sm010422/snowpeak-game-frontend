
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { socketService } from '../services/SocketService';
import { Avatar } from './Avatar';
import { Environment } from './Environment';

interface GameContainerProps {
  nickname: string;
  role: string;
}

const GameContainer: React.FC<GameContainerProps> = ({ nickname, role }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const myAvatarRef = useRef<Avatar | null>(null);
  const otherAvatarsRef = useRef<Map<string, Avatar>>(new Map());
  const keysRef = useRef<{ [key: string]: boolean }>({});
  
  // 상태 관리를 위한 Refs
  const requestRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const activeRef = useRef<boolean>(true);

  useEffect(() => {
    if (!mountRef.current) return;
    activeRef.current = true;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: 'high-performance',
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // 캔버스에 포커스를 줄 수 있도록 설정
    renderer.domElement.tabIndex = 1;
    renderer.domElement.style.outline = 'none';
    renderer.domElement.focus();

    // 2. Initialize World
    new Environment(scene);

    // 3. Initialize My Avatar
    const myColor = role === 'BARISTA' ? 0x8b4513 : 0x2e8b57;
    const myAvatar = new Avatar(myColor, nickname);
    myAvatar.group.position.set(0, 0, 0);
    scene.add(myAvatar.group);
    myAvatarRef.current = myAvatar;

    // 4. Input Listeners (더 견고하게 관리)
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;
      // 방향키 스크롤 방지
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 5. Physics state
    const velocity = new THREE.Vector3();
    const moveSpeed = 22; // 속도 상향
    let lastNetSync = 0;

    // 6. Main Update Loop
    const update = () => {
      if (!activeRef.current) return;

      const deltaTime = clockRef.current.getDelta();
      const elapsedTime = clockRef.current.getElapsedTime();

      // 환경 애니메이션 (풍차 등)
      scene.traverse((obj) => {
        if (obj.userData.bladeGroup) {
          obj.userData.bladeGroup.rotation.z += deltaTime * 3;
        }
      });

      if (myAvatarRef.current) {
        const avatar = myAvatarRef.current;
        const inputDir = new THREE.Vector3(0, 0, 0);

        // 입력 감지
        if (keysRef.current['w'] || keysRef.current['arrowup']) inputDir.z -= 1;
        if (keysRef.current['s'] || keysRef.current['arrowdown']) inputDir.z += 1;
        if (keysRef.current['a'] || keysRef.current['arrowleft']) inputDir.x -= 1;
        if (keysRef.current['d'] || keysRef.current['arrowright']) inputDir.x += 1;

        if (inputDir.length() > 0) {
          inputDir.normalize();
          const targetVelocity = inputDir.multiplyScalar(moveSpeed);
          velocity.lerp(targetVelocity, 0.25); // 더 기민한 반응성

          const targetAngle = Math.atan2(velocity.x, velocity.z);
          avatar.group.rotation.y = THREE.MathUtils.lerp(avatar.group.rotation.y, targetAngle, 0.2);
        } else {
          velocity.lerp(new THREE.Vector3(0, 0, 0), 0.25); // 더 빠른 정지
        }

        // 실제 이동 적용
        const moveStep = velocity.clone().multiplyScalar(deltaTime);
        avatar.group.position.add(moveStep);
        
        // 애니메이션: 속도가 일정 수준 이상일 때만 작동
        const isMoving = velocity.length() > 0.8;
        avatar.updateAnimation(elapsedTime, isMoving);

        // 맵 경계 제한 (Environment의 WORLD_SIZE 기준)
        avatar.group.position.x = THREE.MathUtils.clamp(avatar.group.position.x, -28, 28);
        avatar.group.position.z = THREE.MathUtils.clamp(avatar.group.position.z, -28, 28);

        // 카메라 추적 (부드럽게)
        const camOffset = new THREE.Vector3(18, 22, 18);
        const camTarget = avatar.group.position.clone().add(camOffset);
        camera.position.lerp(camTarget, 0.08);
        camera.lookAt(avatar.group.position);

        // 네트워크 동기화 (이동 중일 때만 더 자주 보냄)
        const now = performance.now();
        if (now - lastNetSync > 50) {
          socketService.sendMessage('/app/update', {
            playerId: nickname, nickname,
            x: Math.round(avatar.group.position.x * 100),
            y: Math.round(avatar.group.position.z * 100),
            role: role.toUpperCase(), roomId: "1"
          });
          lastNetSync = now;
        }
      }

      // 다른 플레이어 위치 보간
      otherAvatarsRef.current.forEach((other) => {
        const oldPos = other.group.position.clone();
        other.lerpToTarget(0.2);
        const moved = other.group.position.distanceTo(oldPos) > 0.05;
        other.updateAnimation(elapsedTime, moved);
      });

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(update);
    };

    clockRef.current.start();
    requestRef.current = requestAnimationFrame(update);

    // 7. Network Listeners
    const unsubscribe = socketService.subscribe((msg: any) => {
      const pid = msg.playerId || msg.nickname;
      if (!pid || pid === nickname) return;

      if (!otherAvatarsRef.current.has(pid)) {
        const otherPlayer = new Avatar(0xe74c3c, pid);
        scene.add(otherPlayer.group);
        otherAvatarsRef.current.set(pid, otherPlayer);
      }

      const other = otherAvatarsRef.current.get(pid);
      if (other && msg.x !== undefined) {
        other.targetPos.set(msg.x / 100, 0, msg.y / 100);
      }
    });

    // 8. Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 9. Cleanup
    return () => {
      activeRef.current = false;
      unsubscribe();
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, [nickname, role]);

  // 클릭 시 포커스를 캔버스로 강제 이동시키는 헬퍼
  const handleFocus = () => {
    const canvas = mountRef.current?.querySelector('canvas');
    if (canvas) canvas.focus();
  };

  return (
    <div 
      ref={mountRef} 
      onClick={handleFocus}
      className="w-full h-screen touch-none outline-none cursor-pointer" 
    />
  );
};

export default GameContainer;
