
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

    // 1. Scene & Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f5);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(15, 20, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // 2. Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(10, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);

    // 3. Environment (Floor & Walls)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 44),
      new THREE.MeshStandardMaterial({ color: 0xdbcbb6, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

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

    // Outer Walls
    createWall(0, -21, 21, 0.4); createWall(0, 21, 21, 0.4);
    createWall(-10.5, 0, 0.4, 42); createWall(10.5, 0, 0.4, 42);
    // Interior Partition
    createWall(-6, -10, 9, 0.3);

    // 4. Human Avatar Creator
    const createHuman = (color: number) => {
      const group = new THREE.Group();
      
      const visuals = new THREE.Group();
      group.add(visuals);

      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), new THREE.MeshStandardMaterial({ color }));
      torso.position.y = 1.1;
      torso.castShadow = true;
      visuals.add(torso);

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
      head.position.y = 1.75;
      head.castShadow = true;
      visuals.add(head);

      // Arms
      const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
      const lArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color }));
      lArm.position.set(-0.45, 1.1, 0);
      visuals.add(lArm);
      const rArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color }));
      rArm.position.set(0.45, 1.1, 0);
      visuals.add(rArm);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const lLeg = new THREE.Mesh(legGeo, legMat);
      lLeg.position.set(-0.2, 0.35, 0);
      visuals.add(lLeg);
      const rLeg = new THREE.Mesh(legGeo, legMat);
      rLeg.position.set(0.2, 0.35, 0);
      visuals.add(rLeg);

      // Shadow
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.45, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.01;
      group.add(shadow);

      group.userData = { visuals: { lArm, rArm, lLeg, rLeg, torso, head }, targetPos: null };
      scene.add(group);
      return group;
    };

    myPlayerRef.current = createHuman(role === 'BARISTA' ? 0x795548 : 0x4caf50);
    myPlayerRef.current.position.set(0, 0, 0);

    // 5. Input System (Robust Key Handling)
    const onKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // 6. Animation & Game Loop
    let lastSent = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (myPlayerRef.current) {
        let dx = 0;
        let dz = 0;
        const moveSpeed = 7.5 * delta; // Adjusted speed

        // Check Movement Keys (Support both WASD and Arrows)
        if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) dz -= 1;
        if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) dz += 1;
        if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) dx -= 1;
        if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) dx += 1;

        if (dx !== 0 || dz !== 0) {
          // Calculate and Apply Move
          const moveDir = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(moveSpeed);
          myPlayerRef.current.position.add(moveDir);

          // Update Rotation to Face Movement
          const targetAngle = Math.atan2(dx, dz);
          myPlayerRef.current.rotation.y = THREE.MathUtils.lerp(myPlayerRef.current.rotation.y, targetAngle, 0.15);

          // Simple Walking Animation
          const walkFreq = 12;
          const { lArm, rArm, lLeg, rLeg, torso } = myPlayerRef.current.userData.visuals;
          lLeg.rotation.x = Math.sin(elapsed * walkFreq) * 0.6;
          rLeg.rotation.x = -Math.sin(elapsed * walkFreq) * 0.6;
          lArm.rotation.x = -Math.sin(elapsed * walkFreq) * 0.6;
          rArm.rotation.x = Math.sin(elapsed * walkFreq) * 0.6;
          torso.position.y = 1.1 + Math.abs(Math.sin(elapsed * walkFreq)) * 0.08;

          // Boundary Constraints
          myPlayerRef.current.position.x = THREE.MathUtils.clamp(myPlayerRef.current.position.x, -10, 10);
          myPlayerRef.current.position.z = THREE.MathUtils.clamp(myPlayerRef.current.position.z, -20.5, 20.5);

          // Socket Sync
          if (Date.now() - lastSent > 60) {
            socketService.sendMessage('/app/update', {
              playerId: nickname, nickname,
              x: Math.round(myPlayerRef.current.position.x * 100),
              y: Math.round(myPlayerRef.current.position.z * 100),
              role: role.toUpperCase(), roomId: "1"
            });
            lastSent = Date.now();
          }
        } else {
          // Idle State: Reset positions smoothly
          const { lArm, rArm, lLeg, rLeg, torso } = myPlayerRef.current.userData.visuals;
          lLeg.rotation.x = THREE.MathUtils.lerp(lLeg.rotation.x, 0, 0.1);
          rLeg.rotation.x = THREE.MathUtils.lerp(rLeg.rotation.x, 0, 0.1);
          lArm.rotation.x = THREE.MathUtils.lerp(lArm.rotation.x, 0, 0.1);
          rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, 0, 0.1);
          torso.position.y = THREE.MathUtils.lerp(torso.position.y, 1.1, 0.1);
        }

        // Camera Follow (Smooth follow with offset)
        const cameraOffset = new THREE.Vector3(12, 16, 12);
        const targetCamPos = myPlayerRef.current.position.clone().add(cameraOffset);
        camera.position.lerp(targetCamPos, 0.08);
        camera.lookAt(myPlayerRef.current.position);
      }

      // Render other players
      playersRef.current.forEach(p => {
        if (p.userData.targetPos) {
          const oldPos = p.position.clone();
          p.position.lerp(p.userData.targetPos, 0.2);
          
          if (p.position.distanceTo(oldPos) > 0.01) {
            const angle = Math.atan2(p.position.x - oldPos.x, p.position.z - oldPos.z);
            p.rotation.y = THREE.MathUtils.lerp(p.rotation.y, angle, 0.2);
            // Simple generic walking for others
            p.userData.visuals.lLeg.rotation.x = Math.sin(elapsed * 12) * 0.5;
            p.userData.visuals.rLeg.rotation.x = -Math.sin(elapsed * 12) * 0.5;
          }
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // 7. Network Updates
    const unsubscribe = socketService.subscribe((msg: any) => {
      const pid = msg.playerId || msg.nickname;
      if (!pid || pid === nickname) return;
      if (!playersRef.current.has(pid)) {
        playersRef.current.set(pid, createHuman(0xf87171));
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
