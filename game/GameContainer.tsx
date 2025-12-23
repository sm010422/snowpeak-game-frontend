
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

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xecf0f1);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    // 초기 카메라 위치 (플레이어를 바라볼 수 있는 쿼터뷰)
    camera.position.set(15, 20, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    scene.add(directionalLight);

    // 3. World Environment
    // Floor
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid (이동 확인을 위한 가이드라인)
    const grid = new THREE.GridHelper(50, 50, 0xbdc3c7, 0xbdc3c7);
    scene.add(grid);

    // Walls
    const createWall = (x: number, z: number, w: number, d: number) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(w, 4, d),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      wall.position.set(x, 2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
    };
    createWall(0, -25, 50, 1); // Top
    createWall(0, 25, 50, 1);  // Bottom
    createWall(-25, 0, 1, 50); // Left
    createWall(25, 0, 1, 50);  // Right

    // 4. Detailed Human Avatar
    const createHumanAvatar = (isMe: boolean, hatColor: number) => {
      const group = new THREE.Group();
      
      // Body Container
      const bodyParts = new THREE.Group();
      group.add(bodyParts);

      // Torso
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.9, 0.4),
        new THREE.MeshStandardMaterial({ color: hatColor })
      );
      torso.position.y = 1.15;
      torso.castShadow = true;
      bodyParts.add(torso);

      // Head
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xffdbac })
      );
      head.position.y = 1.85;
      head.castShadow = true;
      bodyParts.add(head);

      // Arms
      const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
      const lArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: hatColor }));
      lArm.position.set(-0.5, 1.15, 0);
      bodyParts.add(lArm);
      const rArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: hatColor }));
      rArm.position.set(0.5, 1.15, 0);
      bodyParts.add(rArm);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
      const lLeg = new THREE.Mesh(legGeo, legMat);
      lLeg.position.set(-0.2, 0.35, 0);
      bodyParts.add(lLeg);
      const rLeg = new THREE.Mesh(legGeo, legMat);
      rLeg.position.set(0.2, 0.35, 0);
      bodyParts.add(rLeg);

      // Nickname Label (Simple)
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 256;
        canvas.height = 64;
        context.fillStyle = 'rgba(0,0,0,0.5)';
        context.fillRect(0, 0, 256, 64);
        context.font = 'bold 32px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(isMe ? 'ME' : 'PLAYER', 128, 45);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
      label.position.y = 2.5;
      label.scale.set(1.5, 0.4, 1);
      group.add(label);

      group.userData = { visuals: { lArm, rArm, lLeg, rLeg, torso, head } };
      scene.add(group);
      return group;
    };

    myPlayerRef.current = createHumanAvatar(true, role === 'BARISTA' ? 0x8d6e63 : 0x27ae60);
    myPlayerRef.current.position.set(0, 0, 0);

    // 5. Input Listeners
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

    // 6. Game Loop
    let lastSent = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      
      // Delta calculation with fallback to avoid 0 speed
      let delta = clock.getDelta();
      if (delta === 0) delta = 1/60; 
      const elapsed = clock.getElapsedTime();

      if (myPlayerRef.current) {
        let moveX = 0;
        let moveZ = 0;
        const actualSpeed = 12 * delta; // Increased speed for better feedback

        // Check keys
        if (keysRef.current['w'] || keysRef.current['arrowup']) moveZ -= 1;
        if (keysRef.current['s'] || keysRef.current['arrowdown']) moveZ += 1;
        if (keysRef.current['a'] || keysRef.current['arrowleft']) moveX -= 1;
        if (keysRef.current['d'] || keysRef.current['arrowright']) moveX += 1;

        if (moveX !== 0 || moveZ !== 0) {
          // Normalize and Apply Position
          const moveDir = new THREE.Vector3(moveX, 0, moveZ).normalize().multiplyScalar(actualSpeed);
          myPlayerRef.current.position.add(moveDir);

          // Rotation: Look where you're moving
          const angle = Math.atan2(moveX, moveZ);
          myPlayerRef.current.rotation.y = THREE.MathUtils.lerp(myPlayerRef.current.rotation.y, angle, 0.2);

          // Walk Animation (Swing Arms/Legs)
          const { lArm, rArm, lLeg, rLeg } = myPlayerRef.current.userData.visuals;
          const swing = Math.sin(elapsed * 15) * 0.5;
          lLeg.rotation.x = swing;
          rLeg.rotation.x = -swing;
          lArm.rotation.x = -swing;
          rArm.rotation.x = swing;

          // Boundary
          myPlayerRef.current.position.x = THREE.MathUtils.clamp(myPlayerRef.current.position.x, -24, 24);
          myPlayerRef.current.position.z = THREE.MathUtils.clamp(myPlayerRef.current.position.z, -24, 24);

          // Socket Update
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
          // Idle Reset
          const { lArm, rArm, lLeg, rLeg } = myPlayerRef.current.userData.visuals;
          lLeg.rotation.x = THREE.MathUtils.lerp(lLeg.rotation.x, 0, 0.1);
          rLeg.rotation.x = THREE.MathUtils.lerp(rLeg.rotation.x, 0, 0.1);
          lArm.rotation.x = THREE.MathUtils.lerp(lArm.rotation.x, 0, 0.1);
          rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, 0, 0.1);
        }

        // Camera Follow (Smooth Lerp)
        const offset = new THREE.Vector3(15, 18, 15);
        const targetCamPos = myPlayerRef.current.position.clone().add(offset);
        camera.position.lerp(targetCamPos, 0.1);
        camera.lookAt(myPlayerRef.current.position);
      }

      // Other Players Rendering
      playersRef.current.forEach((p, id) => {
        if (p.userData.targetPos) {
          const oldPos = p.position.clone();
          p.position.lerp(p.userData.targetPos, 0.15);
          
          if (p.position.distanceTo(oldPos) > 0.02) {
            const angle = Math.atan2(p.position.x - oldPos.x, p.position.z - oldPos.z);
            p.rotation.y = THREE.MathUtils.lerp(p.rotation.y, angle, 0.2);
            p.userData.visuals.lLeg.rotation.x = Math.sin(elapsed * 15) * 0.5;
            p.userData.visuals.rLeg.rotation.x = -Math.sin(elapsed * 15) * 0.5;
          }
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // 7. Network Listeners
    const unsubscribe = socketService.subscribe((msg: any) => {
      const pid = msg.playerId || msg.nickname;
      if (!pid || pid === nickname) return;
      if (!playersRef.current.has(pid)) {
        playersRef.current.set(pid, createHumanAvatar(false, 0xe74c3c));
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
