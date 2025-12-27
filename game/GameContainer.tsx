
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
  
  // 게임 루프용 Refs
  const requestRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // 2. Initialize World
    new Environment(scene);

    // 3. Initialize My Avatar
    const myColor = role === 'BARISTA' ? 0x8b4513 : 0x2e8b57;
    const myAvatar = new Avatar(myColor, nickname);
    myAvatar.group.position.set(0, 0, 0);
    scene.add(myAvatar.group);
    myAvatarRef.current = myAvatar;

    // 4. Input Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // 5. Physics & Network state
    const velocity = new THREE.Vector3();
    const moveSpeed = 18; // Increased speed
    let lastNetSync = 0;

    // 6. Main Update Loop
    const update = () => {
      const deltaTime = clockRef.current.getDelta();
      const elapsedTime = clockRef.current.getElapsedTime();

      // Windmill Blades Animation
      scene.traverse((obj) => {
        if (obj.userData.bladeGroup) {
          obj.userData.bladeGroup.rotation.z += deltaTime * 2.5;
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
          // Lerp velocity for smooth acceleration
          const targetVelocity = inputDir.clone().multiplyScalar(moveSpeed);
          velocity.lerp(targetVelocity, 0.2);

          // Rotate to face movement direction
          const targetAngle = Math.atan2(velocity.x, velocity.z);
          avatar.group.rotation.y = THREE.MathUtils.lerp(avatar.group.rotation.y, targetAngle, 0.15);
        } else {
          // Friction / Smooth stop
          velocity.lerp(new THREE.Vector3(0, 0, 0), 0.2);
        }

        // Apply movement
        avatar.group.position.add(velocity.clone().multiplyScalar(deltaTime));
        
        // Animation update
        avatar.updateAnimation(elapsedTime, velocity.length() > 0.5);

        // Map Boundary Clamp
        avatar.group.position.x = THREE.MathUtils.clamp(avatar.group.position.x, -28, 28);
        avatar.group.position.z = THREE.MathUtils.clamp(avatar.group.position.z, -28, 28);

        // Camera Follow (Smooth)
        const camTargetPos = avatar.group.position.clone().add(new THREE.Vector3(15, 20, 15));
        camera.position.lerp(camTargetPos, 0.1);
        camera.lookAt(avatar.group.position);

        // Network Sync
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

      // Sync Other Players
      otherAvatarsRef.current.forEach((other) => {
        const oldPos = other.group.position.clone();
        other.lerpToTarget(0.15);
        const isMoving = other.group.position.distanceTo(oldPos) > 0.01;
        other.updateAnimation(elapsedTime, isMoving);
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

    // 8. Window Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      unsubscribe();
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, [nickname, role]);

  return <div ref={mountRef} className="w-full h-screen touch-none outline-none" tabIndex={0} />;
};

export default GameContainer;
