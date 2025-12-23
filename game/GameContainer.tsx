
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { socketService } from '../services/SocketService';

interface GameContainerProps {
  nickname: string;
  role: string;
}

const GameContainer: React.FC<GameContainerProps> = ({ nickname, role }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const myPlayerRef = useRef<THREE.Group | null>(null);
  const otherPlayersRef = useRef<Map<string, THREE.Group>>(new Map());
  const keysRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdbe9f6); // Soft blue sky
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // 2. Lighting
    const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 50, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    // 3. Environment
    // Ground
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }) // Snow-like white
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Simple Grid to sense movement
    const grid = new THREE.GridHelper(100, 50, 0xccddee, 0xccddee);
    grid.position.y = 0.01;
    scene.add(grid);

    // 4. Avatar Factory
    const createAvatar = (color: number, name: string) => {
      const group = new THREE.Group();
      
      // Body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1, 0.5),
        new THREE.MeshStandardMaterial({ color })
      );
      body.position.y = 0.5;
      body.castShadow = true;
      group.add(body);

      // Head
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xffdbac })
      );
      head.position.y = 1.3;
      head.castShadow = true;
      group.add(head);

      // Hat/Role Indicator
      const hat = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.2, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
      );
      hat.position.y = 1.6;
      group.add(hat);

      // Legs for animation
      const legGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
      const lLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
      lLeg.position.set(-0.25, 0, 0);
      group.add(lLeg);
      const rLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
      rLeg.position.set(0.25, 0, 0);
      group.add(rLeg);

      group.userData = { lLeg, rLeg, body, targetPos: new THREE.Vector3() };
      scene.add(group);
      return group;
    };

    // Create my character
    const myColor = role === 'BARISTA' ? 0x8b4513 : 0x2e8b57;
    myPlayerRef.current = createAvatar(myColor, nickname);
    myPlayerRef.current.position.set(0, 0.25, 0);

    // 5. Input System
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 6. Animation Loop
    let lastTime = performance.now();
    let lastNetworkSync = 0;
    const velocity = new THREE.Vector3();

    const frame = (time: number) => {
      const deltaTime = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (myPlayerRef.current) {
        const player = myPlayerRef.current;
        const inputDir = new THREE.Vector3();

        if (keysRef.current['w'] || keysRef.current['arrowup']) inputDir.z -= 1;
        if (keysRef.current['s'] || keysRef.current['arrowdown']) inputDir.z += 1;
        if (keysRef.current['a'] || keysRef.current['arrowleft']) inputDir.x -= 1;
        if (keysRef.current['d'] || keysRef.current['arrowright']) inputDir.x += 1;

        if (inputDir.length() > 0) {
          inputDir.normalize();
          const speed = 15;
          velocity.lerp(inputDir.multiplyScalar(speed), 0.2);

          // Rotate to face direction
          const targetRotation = Math.atan2(velocity.x, velocity.z);
          player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetRotation, 0.15);

          // Walk animation
          const t = time * 0.01;
          player.userData.lLeg.rotation.x = Math.sin(t) * 0.5;
          player.userData.rLeg.rotation.x = -Math.sin(t) * 0.5;
          player.userData.body.position.y = 0.5 + Math.abs(Math.cos(t)) * 0.1;
        } else {
          velocity.lerp(new THREE.Vector3(), 0.1);
          player.userData.lLeg.rotation.x = THREE.MathUtils.lerp(player.userData.lLeg.rotation.x, 0, 0.1);
          player.userData.rLeg.rotation.x = THREE.MathUtils.lerp(player.userData.rLeg.rotation.x, 0, 0.1);
          player.userData.body.position.y = THREE.MathUtils.lerp(player.userData.body.position.y, 0.5, 0.1);
        }

        player.position.add(velocity.clone().multiplyScalar(deltaTime));

        // World boundaries
        player.position.x = THREE.MathUtils.clamp(player.position.x, -48, 48);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -48, 48);

        // Camera Follow
        const camOffset = new THREE.Vector3(15, 20, 15);
        const targetCamPos = player.position.clone().add(camOffset);
        camera.position.lerp(targetCamPos, 0.1);
        camera.lookAt(player.position);

        // Network Update
        if (time - lastNetworkSync > 50) {
          socketService.sendMessage('/app/update', {
            playerId: nickname, nickname,
            x: Math.round(player.position.x * 100),
            y: Math.round(player.position.z * 100),
            role: role.toUpperCase(), roomId: "1"
          });
          lastNetworkSync = time;
        }
      }

      // Update Other Players
      otherPlayersRef.current.forEach((p) => {
        p.position.lerp(p.userData.targetPos, 0.1);
        const dist = p.position.distanceTo(p.userData.targetPos);
        if (dist > 0.05) {
          const t = time * 0.01;
          p.userData.lLeg.rotation.x = Math.sin(t) * 0.5;
          p.userData.rLeg.rotation.x = -Math.sin(t) * 0.5;
        }
      });

      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);

    // 7. Network Subscription
    const unsubscribe = socketService.subscribe((msg: any) => {
      const pid = msg.playerId || msg.nickname;
      if (!pid || pid === nickname) return;
      
      if (!otherPlayersRef.current.has(pid)) {
        const otherPlayer = createAvatar(0xe74c3c, pid);
        otherPlayersRef.current.set(pid, otherPlayer);
      }
      
      const p = otherPlayersRef.current.get(pid);
      if (p && msg.x !== undefined) {
        p.userData.targetPos.set(msg.x / 100, 0.25, msg.y / 100);
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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, [nickname, role]);

  return <div ref={mountRef} className="w-full h-screen touch-none" />;
};

export default GameContainer;
