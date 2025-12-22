
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
  const playersRef = useRef<Map<string, THREE.Group>>(new Map());
  const myPlayerRef = useRef<THREE.Group | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    // 2. Camera Setup (도면 뷰에 최적화된 높은 시점)
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(25, 35, 25);
    camera.lookAt(0, 0, 0);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(20, 40, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.camera.left = -30;
    mainLight.shadow.camera.right = 30;
    mainLight.shadow.camera.top = 30;
    mainLight.shadow.camera.bottom = -30;
    scene.add(mainLight);

    // 5. Floor (도면의 베이지색 바닥)
    const floorWidth = 22;
    const floorHeight = 44;
    const floorGeo = new THREE.PlaneGeometry(floorWidth, floorHeight);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0xdbcbb6, // 도면의 바닥톤
      roughness: 0.8 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid Helper (도면의 격자 느낌)
    const grid = new THREE.GridHelper(50, 50, 0x000000, 0xcccccc);
    grid.position.y = 0.01;
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    scene.add(grid);

    // --- 건축 요소 헬퍼 함수 ---
    const createWall = (x: number, z: number, w: number, d: number, h: number = 3) => {
      const wallGeo = new THREE.BoxGeometry(w, h, d);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(x, h/2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
    };

    const createPillar = (x: number, z: number) => {
      const pillarGeo = new THREE.BoxGeometry(1.2, 4, 1.8);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 2, z);
      scene.add(pillar);
    };

    const createDesk = (x: number, z: number, rotation: number = 0) => {
      const group = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 2.5), new THREE.MeshStandardMaterial({ color: 0xa1887f }));
      top.position.y = 0.8;
      group.add(top);
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      scene.add(group);
    };

    // --- 도면 재현 데이터 입력 ---
    
    // 1. 외벽 (Outer Walls)
    createWall(0, -21, 21, 0.4); // 상단 외벽
    createWall(0, 21, 21, 0.4);  // 하단 외벽
    createWall(-10.5, 0, 0.4, 42); // 좌측 외벽
    createWall(10.5, 0, 0.4, 42);  // 우측 외벽

    // 2. 검은 기둥 (Side Pillars - 도면의 검은 사각형들)
    const pillarZPos = [-15, -7, 7, 15];
    pillarZPos.forEach(z => {
      createPillar(-10.8, z);
      createPillar(10.8, z);
    });

    // 3. 내부 칸막이 (Interior Partitions)
    // 상단 룸 섹션
    createWall(-6, -15, 9, 0.3); 
    createWall(6, -15, 9, 0.3);
    
    // 중앙 작은 방들 (도면의 이름 없는 방 19.15m^2, 14.45m^2 등)
    createWall(-7, -4, 7, 0.3); // 상단 좌측 방 가로벽
    createWall(-3.5, -7, 0.3, 6); // 상단 좌측 방 세로벽
    
    createWall(7, -4, 7, 0.3); // 상단 우측 방 가로벽
    createWall(3.5, -7, 0.3, 6); // 상단 우측 방 세로벽

    // 하단 룸 섹션 (큰 방 구획)
    createWall(-4, 16, 13, 0.3);
    createWall(4, 16, 13, 0.3);
    createWall(0, 18.5, 0.3, 5); // 하단 중앙 세로벽

    // 4. 가구 배치 (도면의 갈색 책상들)
    const deskPositions = [
      {x: -9, z: -18}, {x: -9, z: -14}, {x: -9, z: -10},
      {x: 9, z: -18}, {x: 9, z: -14}, {x: 9, z: -10}
    ];
    deskPositions.forEach(pos => createDesk(pos.x, pos.z));

    // 5. 플레이어 생성
    const createPlayerObject = (isMe: boolean) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.5, 1, 4, 8),
        new THREE.MeshStandardMaterial({ color: isMe ? 0x4ade80 : 0xf87171 })
      );
      body.position.y = 1;
      body.castShadow = true;
      group.add(body);
      
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

    myPlayerRef.current = createPlayerObject(true);
    myPlayerRef.current.position.set(0, 0, 0);

    // 6. Interaction & Animation
    const onKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let lastSent = 0;
    const animate = () => {
      requestAnimationFrame(animate);

      if (myPlayerRef.current) {
        const speed = 0.18;
        let moved = false;
        
        if (keysRef.current['w'] || keysRef.current['arrowup']) { myPlayerRef.current.position.z -= speed; moved = true; }
        if (keysRef.current['s'] || keysRef.current['arrowdown']) { myPlayerRef.current.position.z += speed; moved = true; }
        if (keysRef.current['a'] || keysRef.current['arrowleft']) { myPlayerRef.current.position.x -= speed; moved = true; }
        if (keysRef.current['d'] || keysRef.current['arrowright']) { myPlayerRef.current.position.x += speed; moved = true; }

        // 경계 제한 (Floor 내부에만 머물기)
        myPlayerRef.current.position.x = THREE.MathUtils.clamp(myPlayerRef.current.position.x, -10, 10);
        myPlayerRef.current.position.z = THREE.MathUtils.clamp(myPlayerRef.current.position.z, -20.5, 20.5);

        // 카메라 추적
        camera.position.lerp(new THREE.Vector3(myPlayerRef.current.position.x + 15, 25, myPlayerRef.current.position.z + 15), 0.08);
        camera.lookAt(myPlayerRef.current.position);

        if (moved && Date.now() - lastSent > 80) {
          socketService.sendMessage('/app/update', {
            playerId: nickname,
            nickname,
            x: Math.round(myPlayerRef.current.position.x * 100),
            y: Math.round(myPlayerRef.current.position.z * 100),
            role: role.toUpperCase(),
            roomId: "1"
          });
          lastSent = Date.now();
        }
      }

      playersRef.current.forEach(p => {
        if (p.userData.targetPos) p.position.lerp(p.userData.targetPos, 0.2);
      });

      renderer.render(scene, camera);
    };
    animate();

    // 7. Socket
    const unsubscribe = socketService.subscribe((msg: any) => {
      const pid = msg.playerId || msg.nickname;
      if (!pid || pid === nickname) return;
      if (!playersRef.current.has(pid)) {
        playersRef.current.set(pid, createPlayerObject(false));
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
