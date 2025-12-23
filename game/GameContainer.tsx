
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

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f5);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(12, 18, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // 2. Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);

    // 3. Floor & Walls (도면 기반)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 44),
      new THREE.MeshStandardMaterial({ color: 0xdbcbb6, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 가이드 격자 (이동 감각을 도움)
    const grid = new THREE.GridHelper(50, 50, 0x000000, 0x000000);
    grid.material.opacity = 0.05;
    grid.material.transparent = true;
    scene.add(grid);

    const createWall = (x: number, z: number, w: number, d: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      wall.position.set(x, 1.5, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
    };

    createWall(0, -21, 21, 0.4); createWall(0, 21, 21, 0.4);
    createWall(-10.5, 0, 0.4, 42); createWall(10.5, 0, 0.4, 42);
    // 내부 방 구획 (약식)
    createWall(-6, -10, 9, 0.3); createWall(6, -10, 9, 0.3);

    // 4. Human Avatar Creator
    const createHuman = (isMe: boolean, customColor?: number) => {
      const group = new THREE.Group();
      const color = customColor || (role === 'BARISTA' ? 0x795548 : 0x4caf50);

      // Body Parts Container for Animation
      const visuals = new THREE.Group();
      group.add(visuals);

      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.35), new THREE.MeshStandardMaterial({ color }));
      torso.position.y = 1.05;
      torso.castShadow = true;
      visuals.add(torso);

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
      head.position.y = 1.65;
      head.castShadow = true;
      visuals.add(head);

      // Arms
      const armGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
      const lArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color }));
      lArm.position.set(-0.4, 1.05, 0);
      visuals.add(lArm);
      const rArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color }));
      rArm.position.set(0.4, 1.05, 0);
      visuals.add(rArm);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const lLeg = new THREE.Mesh(legGeo, legMat);
      lLeg.position.set(-0.18, 0.35, 0);
      visuals.add(lLeg);
      const rLeg = new THREE.Mesh(legGeo, legMat);
      rLeg.position.set(0.18, 0.35, 0);
      visuals.add(rLeg);

      // Shadow Circle
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.4, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.01;
      group.add(shadow);

      group.userData = { visuals: { lArm, rArm, lLeg, rLeg, torso, head }, isMoving: false };
      scene.add(group);
      return group;
    };

    myPlayerRef.current = createHuman(true);

    // 5. Input Handling
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      keysRef.current[e.key.toLowerCase()] = isDown;
    };
    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));

    let lastSent = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (myPlayerRef.current) {
        let dx = 0;
        let dz = 0;
        const moveSpeed = 8 * delta;

        if (keysRef.current['w'] || keysRef.current['arrowup']) dz -= 1;
        if (keysRef.current['s'] || keysRef.current['arrowdown']) dz += 1;
        if (keysRef.current['a'] || keysRef.current['arrowleft']) dx -= 1;
        if (keysRef.current['d'] || keysRef.current['arrowright']) dx += 1;

        if (dx !== 0 || dz !== 0) {
          const moveVec = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(moveSpeed);
          myPlayerRef.current.position.add(moveVec);
          
          // 회전 로직
          const targetAngle = Math.atan2(dx, dz);
          myPlayerRef.current.rotation.y = THREE.MathUtils.lerp(myPlayerRef.current.rotation.y, targetAngle, 0.15);
          
          myPlayerRef.current.userData.isMoving = true;

          // 워킹 애니메이션 (팔다리 교차 흔들기)
          const walkSpeed = 12;
          const { lArm, rArm, lLeg, rLeg, torso } = myPlayerRef.current.userData.visuals;
          lLeg.rotation.x = Math.sin(elapsed * walkSpeed) * 0.5;
          rLeg.rotation.x = -Math.sin(elapsed * walkSpeed) * 0.5;
          lArm.rotation.x = -Math.sin(elapsed * walkSpeed) * 0.5;
          rArm.rotation.x = Math.sin(elapsed * walkSpeed) * 0.5;
          torso.position.y = 1.05 + Math.abs(Math.sin(elapsed * walkSpeed)) * 0.05;

          // 경계 제한
          myPlayerRef.current.position.x = THREE.MathUtils.clamp(myPlayerRef.current.position.x, -10.2, 10.2);
          myPlayerRef.current.position.z = THREE.MathUtils.clamp(myPlayerRef.current.position.z, -20.5, 20.5);

          // 소켓 전송
          if (Date.now() - lastSent > 50) {
            socketService.sendMessage('/app/update', {
              playerId: nickname, nickname,
              x: Math.round(myPlayerRef.current.position.x * 100),
              y: Math.round(myPlayerRef.current.position.z * 100),
              role: role.toUpperCase(), roomId: "1"
            });
            lastSent = Date.now();
          }
        } else {
          // 정지 상태 애니메이션 초기화
          const { lArm, rArm, lLeg, rLeg, torso } = myPlayerRef.current.userData.visuals;
          lLeg.rotation.x = THREE.MathUtils.lerp(lLeg.rotation.x, 0, 0.2);
          rLeg.rotation.x = THREE.MathUtils.lerp(rLeg.rotation.x, 0, 0.2);
          lArm.rotation.x = THREE.MathUtils.lerp(lArm.rotation.x, 0, 0.2);
          rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, 0, 0.2);
          torso.position.y = THREE.MathUtils.lerp(torso.position.y, 1.05, 0.2);
          myPlayerRef.current.userData.isMoving = false;
        }

        // 카메라 팔로잉 (부드럽게 따라오기)
        const camTarget = new THREE.Vector3(
          myPlayerRef.current.position.x + 10,
          16,
          myPlayerRef.current.position.z + 10
        );
        camera.position.lerp(camTarget, 0.05);
        camera.lookAt(myPlayerRef.current.position);
      }

      // 타 플레이어 업데이트
      playersRef.current.forEach(p => {
        if (p.userData.targetPos) {
          const oldPos = p.position.clone();
          p.position.lerp(p.userData.targetPos, 0.2);
          
          const dist = p.position.distanceTo(oldPos);
          if (dist > 0.01) {
            const angle = Math.atan2(p.position.x - oldPos.x, p.position.z - oldPos.z);
            p.rotation.y = THREE.MathUtils.lerp(p.rotation.y, angle, 0.2);
            
            // 타 플레이어 걷기 애니메이션
            const { lArm, rArm, lLeg, rLeg } = p.userData.visuals;
            lLeg.rotation.x = Math.sin(elapsed * 12) * 0.5;
            rLeg.rotation.x = -Math.sin(elapsed * 12) * 0.5;
          }
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    const unsubscribe = socketService.subscribe((msg: any) => {
      const pid = msg.playerId || msg.nickname;
      if (!pid || pid === nickname) return;
      if (!playersRef.current.has(pid)) {
        playersRef.current.set(pid, createHuman(false, 0xf87171));
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
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, [nickname, role]);

  return <div ref={mountRef} className="w-full h-screen" />;
};

export default GameContainer;
