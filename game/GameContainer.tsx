
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
    if (!mountRef.current) {
      console.error("[ERROR] Mount point not found");
      return;
    }
    console.log("[INIT] Starting GameContainer...");

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f2f6);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(15, 20, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // 2. Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(10, 20, 10);
    light.castShadow = true;
    scene.add(light);

    // 3. World
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0xbdc3c7 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    scene.add(new THREE.GridHelper(60, 60, 0x7f8c8d, 0x7f8c8d));

    // 4. Avatar Creator
    const createAvatar = (isMe: boolean, color: number) => {
      const group = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.5), new THREE.MeshStandardMaterial({ color }));
      torso.position.y = 1.2;
      torso.castShadow = true;
      group.add(torso);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
      head.position.y = 1.95;
      head.castShadow = true;
      group.add(head);

      const legGeo = new THREE.BoxGeometry(0.3, 0.7, 0.3);
      const lLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x2f3640 }));
      lLeg.position.set(-0.25, 0.35, 0);
      group.add(lLeg);
      const rLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x2f3640 }));
      rLeg.position.set(0.25, 0.35, 0);
      group.add(rLeg);

      group.userData = { lLeg, rLeg, torso };
      scene.add(group);
      return group;
    };

    myPlayerRef.current = createAvatar(true, role === 'BARISTA' ? 0x8d6e63 : 0x27ae60);
    console.log("[INIT] MyPlayer initialized:", myPlayerRef.current.position);

    // 5. Hardened Input Listeners with Logging
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();
      keysRef.current[code] = true;
      keysRef.current[key] = true;
      console.log(`[INPUT] Key Down: ${code} (${key})`);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();
      keysRef.current[code] = false;
      keysRef.current[key] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // 6. Animation Loop
    let lastTime = performance.now();
    let lastSent = 0;

    const animate = (currentTime: number) => {
      requestAnimationFrame(animate);
      
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (myPlayerRef.current) {
        let dx = 0;
        let dz = 0;

        // Check Input State
        if (keysRef.current['KeyW'] || keysRef.current['ArrowUp'] || keysRef.current['w']) dz -= 1;
        if (keysRef.current['KeyS'] || keysRef.current['ArrowDown'] || keysRef.current['s']) dz += 1;
        if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft'] || keysRef.current['a']) dx -= 1;
        if (keysRef.current['KeyD'] || keysRef.current['ArrowRight'] || keysRef.current['d']) dx += 1;

        if (dx !== 0 || dz !== 0) {
          const moveSpeed = 10; // Units per second
          const moveDir = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(moveSpeed * deltaTime);
          
          myPlayerRef.current.position.add(moveDir);
          
          // Debug Move Log
          console.log(`[MOVE] Pos: ${myPlayerRef.current.position.x.toFixed(2)}, ${myPlayerRef.current.position.z.toFixed(2)} | Delta: ${deltaTime.toFixed(4)}`);

          // Look Rotation
          const targetAngle = Math.atan2(dx, dz);
          myPlayerRef.current.rotation.y = THREE.MathUtils.lerp(myPlayerRef.current.rotation.y, targetAngle, 0.2);

          // Animation
          const walkFreq = 15;
          const swing = Math.sin(currentTime * 0.015) * 0.5;
          myPlayerRef.current.userData.lLeg.rotation.x = swing;
          myPlayerRef.current.userData.rLeg.rotation.x = -swing;

          // Socket Sync
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
          // Reset animation when still
          myPlayerRef.current.userData.lLeg.rotation.x = THREE.MathUtils.lerp(myPlayerRef.current.userData.lLeg.rotation.x, 0, 0.1);
          myPlayerRef.current.userData.rLeg.rotation.x = THREE.MathUtils.lerp(myPlayerRef.current.userData.rLeg.rotation.x, 0, 0.1);
        }

        // Camera Update
        const camOffset = new THREE.Vector3(12, 16, 12);
        camera.position.lerp(myPlayerRef.current.position.clone().add(camOffset), 0.1);
        camera.lookAt(myPlayerRef.current.position);
      }

      // Update Other Players
      playersRef.current.forEach((p) => {
        if (p.userData.targetPos) {
          p.position.lerp(p.userData.targetPos, 0.1);
        }
      });

      renderer.render(scene, camera);
    };
    requestAnimationFrame(animate);

    // 7. Network Listeners
    const unsubscribe = socketService.subscribe((msg: any) => {
      const pid = msg.playerId || msg.nickname;
      if (!pid || pid === nickname) return;
      if (!playersRef.current.has(pid)) {
        console.log(`[NETWORK] New player joined: ${pid}`);
        playersRef.current.set(pid, createAvatar(false, 0xe74c3c));
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
      console.log("[CLEANUP] Removing listeners and disposing renderer");
      unsubscribe();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, [nickname, role]);

  return <div ref={mountRef} className="w-full h-screen focus:outline-none" tabIndex={0} />;
};

export default GameContainer;
