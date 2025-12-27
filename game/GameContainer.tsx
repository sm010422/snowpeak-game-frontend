
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

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Basic Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // 2. Initialize Map (Environment)
    new Environment(scene);

    // 3. Initialize Me (Avatar)
    const myColor = role === 'BARISTA' ? 0x8b4513 : 0x2e8b57;
    const myAvatar = new Avatar(myColor, nickname);
    myAvatar.group.position.set(0, 0, 0);
    scene.add(myAvatar.group);
    myAvatarRef.current = myAvatar;

    // 4. Keyboard Controls
    const onKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // 5. Game Loop (The Control Logic)
    let lastTime = performance.now();
    let lastNetSync = 0;
    const velocity = new THREE.Vector3();

    const update = (time: number) => {
      const deltaTime = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (myAvatarRef.current) {
        const avatar = myAvatarRef.current;
        const inputDir = new THREE.Vector3();

        if (keysRef.current['w'] || keysRef.current['arrowup']) inputDir.z -= 1;
        if (keysRef.current['s'] || keysRef.current['arrowdown']) inputDir.z += 1;
        if (keysRef.current['a'] || keysRef.current['arrowleft']) inputDir.x -= 1;
        if (keysRef.current['d'] || keysRef.current['arrowright']) inputDir.x += 1;

        const isMoving = inputDir.length() > 0;
        if (isMoving) {
          inputDir.normalize();
          velocity.lerp(inputDir.multiplyScalar(12), 0.15); // Smooth speed up
          
          const targetRot = Math.atan2(velocity.x, velocity.z);
          avatar.group.rotation.y = THREE.MathUtils.lerp(avatar.group.rotation.y, targetRot, 0.2);
        } else {
          velocity.lerp(new THREE.Vector3(), 0.15); // Smooth stop
        }

        avatar.group.position.add(velocity.clone().multiplyScalar(deltaTime));
        avatar.updateAnimation(time, velocity.length() > 0.5);

        // Camera Follow
        const camOffset = new THREE.Vector3(12, 16, 12);
        camera.position.lerp(avatar.group.position.clone().add(camOffset), 0.1);
        camera.lookAt(avatar.group.position);

        // Network Update (Sync position)
        if (time - lastNetSync > 50) {
          socketService.sendMessage('/app/update', {
            playerId: nickname, nickname,
            x: Math.round(avatar.group.position.x * 100),
            y: Math.round(avatar.group.position.z * 100),
            role: role.toUpperCase(), roomId: "1"
          });
          lastNetSync = time;
        }
      }

      // Update Other Players (Sync interpolation)
      otherAvatarsRef.current.forEach((avatar) => {
        const prevPos = avatar.group.position.clone();
        avatar.lerpToTarget(0.15);
        const moved = avatar.group.position.distanceTo(prevPos) > 0.01;
        avatar.updateAnimation(time, moved);
      });

      renderer.render(scene, camera);
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);

    // 6. Network Listeners
    const unsubscribe = socketService.subscribe((msg: any) => {
      const pid = msg.playerId || msg.nickname;
      if (!pid || pid === nickname) return;

      if (!otherAvatarsRef.current.has(pid)) {
        const newOther = new Avatar(0xe74c3c, pid);
        scene.add(newOther.group);
        otherAvatarsRef.current.set(pid, newOther);
      }

      const other = otherAvatarsRef.current.get(pid);
      if (other && msg.x !== undefined) {
        other.targetPos.set(msg.x / 100, 0, msg.y / 100);
      }
    });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, [nickname, role]);

  return <div ref={mountRef} className="w-full h-screen touch-none" />;
};

export default GameContainer;
