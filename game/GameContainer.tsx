
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { socketService } from '../services/SocketService';

interface GameContainerProps {
  nickname: string;
  role: string;
}

const GameContainer: React.FC<GameContainerProps> = ({ nickname, role }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const playersRef = useRef<Map<string, THREE.Group>>(new Map());
  const myPlayerRef = useRef<THREE.Group | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(15, 20, 15);
    camera.lookAt(0, 0, 0);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(20, 40, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(2048, 2048);
    scene.add(mainLight);

    // 5. Floor & Architecture (Based on the plan provided earlier)
    const floorGeo = new THREE.PlaneGeometry(22, 44);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xdbcbb6, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const createWall = (x: number, z: number, w: number, d: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      wall.position.set(x, 1.5, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
    };

    const createPillar = (x: number, z: number) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 1.8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      pillar.position.set(x, 2, z);
      scene.add(pillar);
    };

    // Architecture Placement
    createWall(0, -21, 21, 0.4); createWall(0, 21, 21, 0.4);
    createWall(-10.5, 0, 0.4, 42); createWall(10.5, 0, 0.4, 42);
    [-15, -7, 7, 15].forEach(z => { createPillar(-10.8, z); createPillar(10.8, z); });

    // --- Human Character Creator ---
    const createHumanAvatar = (color: number) => {
      const group = new THREE.Group();
      
      // Body (Torso)
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.4),
        new THREE.MeshStandardMaterial({ color })
      );
      torso.position.y = 1.2;
      torso.castShadow = true;
      group.add(torso);

      // Head
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.45, 0.45),
        new THREE.MeshStandardMaterial({ color: 0xffdbac }) // Skin tone
      );
      head.position.y = 1.85;
      head.castShadow = true;
      group.add(head);

      // Hair/Hat
      const hat = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.15, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x3e2723 })
      );
      hat.position.y = 2.1;
      group.add(hat);

      // Arms
      const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
      const armMat = new THREE.MeshStandardMaterial({ color });
      const leftArm = new THREE.Mesh(armGeo, armMat);
      leftArm.position.set(-0.45, 1.2, 0);
      group.add(leftArm);
      const rightArm = new THREE.Mesh(armGeo, armMat);
      rightArm.position.set(0.45, 1.2, 0);
      group.add(rightArm);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x212121 }); // Pants
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.2, 0.4, 0);
      group.add(leftLeg);
      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.2, 0.4, 0);
      group.add(rightLeg);

      // Visual Group for inner rotations/animations
      group.userData.visuals = { torso, head, leftArm, rightArm, leftLeg, rightLeg };

      // Shadow
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.02;
      group.add(shadow);

      scene.add(group);
      return group;
    };

    // My Player Setup
    myPlayerRef.current = createHumanAvatar(role === 'BARISTA' ? 0x5d4037 : 0x4ade80);
    myPlayerRef.current.position.set(0, 0, 0);

    // 6. Movement Handling
    const onKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let lastSent = 0;
    const animate = (time: number) => {
      requestAnimationFrame(animate);

      if (myPlayerRef.current) {
        const speed = 0.15;
        let dx = 0;
        let dz = 0;

        if (keysRef.current['w'] || keysRef.current['arrowup']) dz -= 1;
        if (keysRef.current['s'] || keysRef.current['arrowdown']) dz += 1;
        if (keysRef.current['a'] || keysRef.current['arrowleft']) dx -= 1;
        if (keysRef.current['d'] || keysRef.current['arrowright']) dx += 1;

        if (dx !== 0 || dz !== 0) {
          // 이동 및 방향 전환
          const moveVec = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(speed);
          myPlayerRef.current.position.add(moveVec);
          
          // 캐릭터가 움직이는 방향을 부드럽게 바라보게 함
          const targetRotation = Math.atan2(dx, dz);
          myPlayerRef.current.rotation.y = THREE.MathUtils.lerp(myPlayerRef.current.rotation.y, targetRotation, 0.2);

          // 간단한 걷기 애니메이션 (몸을 살짝 흔듦)
          myPlayerRef.current.position.y = Math.sin(time * 0.01) * 0.05;

          // 경계 제한
          myPlayerRef.current.position.x = THREE.MathUtils.clamp(myPlayerRef.current.position.x, -10, 10);
          myPlayerRef.current.position.z = THREE.MathUtils.clamp(myPlayerRef.current.position.z, -20.5, 20.5);

          // 위치 동기화 전송
          if (Date.now() - lastSent > 80) {
            socketService.sendMessage('/app/update', {
              playerId: nickname, nickname,
              x: Math.round(myPlayerRef.current.position.x * 100),
              y: Math.round(myPlayerRef.current.position.z * 100),
              role: role.toUpperCase(), roomId: "1"
            });
            lastSent = Date.now();
          }
        } else {
          myPlayerRef.current.position.y = THREE.MathUtils.lerp(myPlayerRef.current.position.y, 0, 0.1);
        }

        // 카메라가 플레이어를 따라가도록
        camera.position.lerp(new THREE.Vector3(myPlayerRef.current.position.x + 10, 15, myPlayerRef.current.position.z + 10), 0.08);
        camera.lookAt(myPlayerRef.current.position);
      }

      // 타 플레이어 업데이트
      playersRef.current.forEach(p => {
        if (p.userData.targetPos) {
          const prevPos = p.position.clone();
          p.position.lerp(p.userData.targetPos, 0.2);
          
          // 타 플레이어도 이동 방향에 따라 회전
          const diff = p.position.clone().sub(prevPos);
          if (diff.length() > 0.01) {
            const targetRot = Math.atan2(diff.x, diff.z);
            p.rotation.y = THREE.MathUtils.lerp(p.rotation.y, targetRot, 0.2);
          }
        }
      });

      renderer.render(scene, camera);
    };
    requestAnimationFrame(animate);

    // Socket Subscription
    const unsubscribe = socketService.subscribe((msg: any) => {
      const pid = msg.playerId || msg.nickname;
      if (!pid || pid === nickname) return;
      if (!playersRef.current.has(pid)) {
        playersRef.current.set(pid, createHumanAvatar(0xf87171));
      }
      const p = playersRef.current.get(pid);
      if (p && msg.x !== undefined) {
        p.userData.targetPos = new THREE.Vector3(msg.x / 100, 0, msg.y / 100);
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

  return <div ref={mountRef} className="w-full h-screen" />;
};

export default GameContainer;
