
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

  useEffect(() => {
    if (!mountRef.current) return;
    activeRef.current = true;

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

    renderer.domElement.tabIndex = 1;
    renderer.domElement.style.outline = 'none';
    renderer.domElement.focus();

    new Environment(scene);

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

    // Physics & Sync State
    const velocity = new THREE.Vector3();
    const moveSpeed = 22;
    let lastNetSync = 0;
    const lastSentPosition = new THREE.Vector3(); // 마지막으로 서버에 보낸 위치

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

        // --- NETWORK THROTTLING (100ms) ---
        const now = performance.now();
        if (now - lastNetSync > 100) { // 50ms -> 100ms로 변경
          const distanceMoved = avatar.group.position.distanceTo(lastSentPosition);
          
          // 움직임이 있거나, 멈췄을 때의 마지막 상태를 전송 (최소 거리 threshold 적용)
          if (distanceMoved > 0.1 || (isMoving === false && distanceMoved > 0.01)) {
            socketService.sendMessage('/app/update', {
              playerId: nickname, nickname,
              x: Math.round(avatar.group.position.x * 100),
              y: Math.round(avatar.group.position.z * 100),
              direction: avatar.group.rotation.y.toString(), // 회전값 전달
              role: role.toUpperCase(), roomId: "1"
            });
            lastNetSync = now;
            lastSentPosition.copy(avatar.group.position);
          }
        }
      }

      // --- OTHER PLAYERS INTERPOLATION (Smoothing) ---
      otherAvatarsRef.current.forEach((other) => {
        const oldPos = other.group.position.clone();
        
        // 부드러운 이동 보간 (alpha: 0.15~0.2 정도가 적당함)
        other.lerpToTarget(0.15);
        
        // 애니메이션 작동 여부 판단
        const moved = other.group.position.distanceTo(oldPos) > 0.02;
        other.updateAnimation(elapsedTime, moved);
      });

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(update);
    };

    clockRef.current.start();
    requestRef.current = requestAnimationFrame(update);

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
        // 즉시 위치를 바꾸지 않고 'target'만 설정 (보간을 위해)
        other.targetPos.set(msg.x / 100, 0, msg.y / 100);
        if (msg.direction) {
          other.targetRotation = parseFloat(msg.direction);
        }
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
