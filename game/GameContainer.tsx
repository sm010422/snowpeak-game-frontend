
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
  
  const requestRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const activeRef = useRef<boolean>(true);
  const sceneRef = useRef<THREE.Scene | null>(null);

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
    renderer.domElement.style.outline = 'none';
    renderer.domElement.focus();

    new Environment(scene);

    // 내 캐릭터 생성
    const myColor = role === 'BARISTA' ? 0x8b4513 : 0x2e8b57;
    const myAvatar = new Avatar(myColor, nickname);
    myAvatar.group.position.set(0, 0, 0);
    scene.add(myAvatar.group);
    myAvatarRef.current = myAvatar;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;
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

    const velocity = new THREE.Vector3();
    const moveSpeed = 22;
    let lastNetSync = 0;
    const lastSentPosition = new THREE.Vector3();

    // 헬퍼: 다른 플레이어 추가/업데이트
    const processPlayerUpdate = (data: any) => {
      const pid = data.playerId || data.nickname;
      if (!pid || pid === nickname) return;

      if (!otherAvatarsRef.current.has(pid)) {
        console.log("New player detected:", pid);
        const otherPlayer = new Avatar(0xe74c3c, pid);
        // 생성 즉시 위치 설정 (텔레포트 방지)
        if (data.x !== undefined) {
          const startX = data.x / 100;
          const startZ = data.y / 100;
          otherPlayer.group.position.set(startX, 0, startZ);
          otherPlayer.targetPos.set(startX, 0, startZ);
        }
        scene.add(otherPlayer.group);
        otherAvatarsRef.current.set(pid, otherPlayer);
      }

      const other = otherAvatarsRef.current.get(pid);
      if (other && data.x !== undefined) {
        other.targetPos.set(data.x / 100, 0, data.y / 100);
        if (data.direction) {
          other.targetRotation = parseFloat(data.direction);
        }
      }
    };

    const update = () => {
      if (!activeRef.current) return;

      const deltaTime = clockRef.current.getDelta();
      const elapsedTime = clockRef.current.getElapsedTime();

      scene.traverse((obj) => {
        if (obj.userData.bladeGroup) {
          obj.userData.bladeGroup.rotation.z += deltaTime * 3;
        }
      });

      if (myAvatarRef.current) {
        const avatar = myAvatarRef.current;
        const inputDir = new THREE.Vector3(0, 0, 0);

        if (keysRef.current['w'] || keysRef.current['arrowup']) inputDir.z -= 1;
        if (keysRef.current['s'] || keysRef.current['arrowdown']) inputDir.z += 1;
        if (keysRef.current['a'] || keysRef.current['arrowleft']) inputDir.x -= 1;
        if (keysRef.current['d'] || keysRef.current['arrowright']) inputDir.x += 1;

        if (inputDir.length() > 0) {
          inputDir.normalize();
          const targetVelocity = inputDir.multiplyScalar(moveSpeed);
          velocity.lerp(targetVelocity, 0.25);
          const targetAngle = Math.atan2(velocity.x, velocity.z);
          avatar.group.rotation.y = THREE.MathUtils.lerp(avatar.group.rotation.y, targetAngle, 0.2);
        } else {
          velocity.lerp(new THREE.Vector3(0, 0, 0), 0.25);
        }

        avatar.group.position.add(velocity.clone().multiplyScalar(deltaTime));
        const isMoving = velocity.length() > 0.8;
        avatar.updateAnimation(elapsedTime, isMoving);

        avatar.group.position.x = THREE.MathUtils.clamp(avatar.group.position.x, -28, 28);
        avatar.group.position.z = THREE.MathUtils.clamp(avatar.group.position.z, -28, 28);

        const camOffset = new THREE.Vector3(18, 22, 18);
        const camTarget = avatar.group.position.clone().add(camOffset);
        camera.position.lerp(camTarget, 0.08);
        camera.lookAt(avatar.group.position);

        const now = performance.now();
        if (now - lastNetSync > 100) {
          const distanceMoved = avatar.group.position.distanceTo(lastSentPosition);
          if (distanceMoved > 0.1 || (isMoving === false && distanceMoved > 0.01)) {
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

      otherAvatarsRef.current.forEach((other) => {
        const oldPos = other.group.position.clone();
        other.lerpToTarget(0.15);
        const moved = other.group.position.distanceTo(oldPos) > 0.02;
        other.updateAnimation(elapsedTime, moved);
      });

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(update);
    };

    clockRef.current.start();
    requestRef.current = requestAnimationFrame(update);

    // 네트워크 구독: 배열과 단일 객체 모두 대응
    const unsubscribe = socketService.subscribe((msg: any) => {
      if (Array.isArray(msg)) {
        msg.forEach(playerData => processPlayerUpdate(playerData));
      } else {
        processPlayerUpdate(msg);
      }
    });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

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
