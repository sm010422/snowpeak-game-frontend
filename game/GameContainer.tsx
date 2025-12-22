
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { socketService } from '../services/SocketService';
import { GameMessage } from '../types';

interface GameContainerProps {
  nickname: string;
  role: string;
}

const GameContainer: React.FC<GameContainerProps> = ({ nickname, role }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Three.js Core
  const sceneRef = useRef<THREE.Scene | null>(null);
  const playersRef = useRef<Map<string, THREE.Group>>(new Map());
  const myPlayerRef = useRef<THREE.Group | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f5); // 밝은 회색 배경 (Coohom 스타일)
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(15, 20, 15);
    camera.lookAt(0, 0, 0);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // 5. Floor & Walls (Architecture Layout)
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xe5e0d8 }); // 목재 톤
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid Helper
    const grid = new THREE.GridHelper(50, 50, 0x000000, 0xcccccc);
    grid.material.opacity = 0.1;
    grid.material.transparent = true;
    scene.add(grid);

    // Create Walls (Example Room Layout)
    const createWall = (x: number, z: number, w: number, h: number, d: number) => {
      const wallGeo = new THREE.BoxGeometry(w, h, d);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(x, h/2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
    };

    // 가상의 카페 레이아웃 벽면
    createWall(-10, 0, 0.5, 3, 20); // 왼쪽 외벽
    createWall(10, 0, 0.5, 3, 20);  // 오른쪽 외벽
    createWall(0, -10, 20, 3, 0.5); // 상단 외벽
    createWall(5, 0, 0.5, 3, 8);    // 내부 파티션

    // 가구 (테이블)
    const createTable = (x: number, z: number) => {
      const group = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 2), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
      top.position.y = 1;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      leg.position.y = 0.5;
      group.add(top, leg);
      group.position.set(x, 0, z);
      scene.add(group);
    };
    createTable(-5, -5);
    createTable(-5, 0);
    createTable(-5, 5);

    // 6. Player Creation Helper
    const createPlayerObject = (name: string, isMe: boolean) => {
      const group = new THREE.Group();
      
      // Body
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.4, 1, 4, 8),
        new THREE.MeshStandardMaterial({ color: isMe ? 0x4ade80 : 0xf87171 })
      );
      body.position.y = 0.9;
      body.castShadow = true;
      group.add(body);

      // Shadow Indicator
      const shadowCircle = new THREE.Mesh(
        new THREE.CircleGeometry(0.4, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 })
      );
      shadowCircle.rotation.x = -Math.PI / 2;
      shadowCircle.position.y = 0.01;
      group.add(shadowCircle);

      scene.add(group);
      return group;
    };

    // My Player
    myPlayerRef.current = createPlayerObject(nickname, true);
    myPlayerRef.current.position.set(0, 0, 0);

    // 7. Input Handling
    const onKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // 8. Socket Subscription
    const unsubscribe = socketService.subscribe((msg: any) => {
      const pid = msg.playerId || msg.nickname;
      if (!pid || pid === nickname) return;

      if (!playersRef.current.has(pid)) {
        const newObj = createPlayerObject(msg.nickname || 'Guest', false);
        playersRef.current.set(pid, newObj);
      }
      
      const pObj = playersRef.current.get(pid);
      if (pObj && msg.x !== undefined && msg.z !== undefined) {
        // 백엔드 x, y를 Three.js x, z로 매핑 (평면)
        pObj.userData.targetPos = new THREE.Vector3(msg.x / 40, 0, msg.y / 40);
      }
    });

    // 9. Animation Loop
    let lastSent = Date.now();
    const animate = () => {
      requestAnimationFrame(animate);

      if (myPlayerRef.current) {
        const speed = 0.15;
        let moved = false;
        if (keysRef.current['w'] || keysRef.current['arrowup']) { myPlayerRef.current.position.z -= speed; moved = true; }
        if (keysRef.current['s'] || keysRef.current['arrowdown']) { myPlayerRef.current.position.z += speed; moved = true; }
        if (keysRef.current['a'] || keysRef.current['arrowleft']) { myPlayerRef.current.position.x -= speed; moved = true; }
        if (keysRef.current['d'] || keysRef.current['arrowright']) { myPlayerRef.current.position.x += speed; moved = true; }

        // 카메라가 플레이어를 부드럽게 따라감
        camera.position.lerp(new THREE.Vector3(myPlayerRef.current.position.x + 10, 15, myPlayerRef.current.position.z + 10), 0.1);
        camera.lookAt(myPlayerRef.current.position);

        // 위치 정보 전송 (0.1초마다)
        if (moved && Date.now() - lastSent > 100) {
          socketService.sendMessage('/app/update', {
            playerId: nickname,
            nickname: nickname,
            x: Math.round(myPlayerRef.current.position.x * 40),
            y: Math.round(myPlayerRef.current.position.z * 40),
            role: role.toUpperCase(),
            roomId: "1"
          });
          lastSent = Date.now();
        }
      }

      // 타 플레이어 위치 보간(Interpolation)
      playersRef.current.forEach((obj) => {
        if (obj.userData.targetPos) {
          obj.position.lerp(obj.userData.targetPos, 0.2);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.dispose();
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, [nickname, role]);

  return <div ref={mountRef} className="w-full h-screen" />;
};

export default GameContainer;
