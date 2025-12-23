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
    // 배경색을 따뜻한 실내 벽지 톤으로 변경
    scene.background = new THREE.Color(0xf0eade);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    // 맵이 넓어졌으므로 카메라를 조금 더 높고 멀리 배치하여 시야 확보
    camera.position.set(0, 30, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // 2. Lighting (실내 분위기로 조정)
    // 전체적으로 따뜻하고 밝은 빛
    const ambLight = new THREE.AmbientLight(0xffedd0, 0.8);
    scene.add(ambLight);

    // 그림자를 드리우는 주광원 (창문에서 들어오는 빛 느낌)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(50, 80, 30); // 위치 조정
    dirLight.castShadow = true;
    // 그림자 맵 크기와 범위를 넓혀서 전체 맵 커버
    dirLight.shadow.mapSize.set(4096, 4096);
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    scene.add(dirLight);

    // 3. Environment Building (도면 기반 맵 생성)
    
    // 바닥 (따뜻한 나무 마루 색상)
    const floorGeo = new THREE.PlaneGeometry(120, 120);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0xd4b895, // Wood color
        roughness: 0.8,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // --- 도면 구조물 생성 함수 ---
    const buildCafeMap = () => {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2eadb, roughness: 0.9 }); // 베이지색 벽
        const wallHeight = 6; // 벽 높이
        const thickness = 0.8; // 벽 두께

        // 벽 생성 헬퍼 함수 (중심 좌표 x, z, 너비, 깊이)
        const addWall = (x: number, z: number, width: number, depth: number) => {
            const geo = new THREE.BoxGeometry(width, wallHeight, depth);
            const mesh = new THREE.Mesh(geo, wallMat);
            mesh.position.set(x, wallHeight / 2, z); // 바닥 위에 놓기
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
        };

        // 도면을 참고한 대략적인 구조 배치 (좌표는 비율에 맞춰 조정됨)
        // 맵 중심을 (0,0)으로 기준

        // 1. 외곽 벽 (Outer Walls)
        addWall(-20, 0, thickness, 80); // 왼쪽 긴 벽
        addWall(20, 0, thickness, 80);  // 오른쪽 긴 벽
        addWall(0, -40, 40 + thickness, thickness); // 상단 벽
        addWall(0, 40, 40 + thickness, thickness);  // 하단 벽

        // 2. 상단부 구조 (Top Section)
        // 상단 가로 벽 (입구쪽 복도 형성)
        addWall(-10, -30, 20, thickness); 
        addWall(15, -30, 10, thickness); // 문 틈을 위해 분할

        // 상단 'ㄷ'자 파티션
        addWall(-5, -22, thickness, 16); // 세로
        addWall(0, -14, 10, thickness);  // 가로 밑변

        // 3. 중단부 방 구조 (Middle Rooms)
        const midZ = 0;
        // 왼쪽 방 (큰 방)
        addWall(-10, midZ - 5, 20, thickness); // 방 상단 벽
        addWall(-10, midZ + 10, 20, thickness); // 방 하단 벽
        addWall(0, midZ + 2.5, thickness, 15);  // 방 오른쪽 벽

        // 오른쪽 방들 (작은 방 2개)
        addWall(10, midZ - 5, 20, thickness); // 방 상단 벽
        addWall(10, midZ + 10, 20, thickness); // 방 하단 벽
        addWall(10, midZ + 2.5, thickness, 15); // 방 사이 벽

        // 4. 하단부 넓은 홀 및 파티션 (Bottom Hall)
        // 중앙 'ㄷ'자형 파티션
        addWall(-5, 25, thickness, 10); // 세로
        addWall(0, 20, 10, thickness);  // 가로 윗변
        addWall(0, 30, 10, thickness);  // 가로 아랫변

        // 하단 좌우측 구석 파티션
        addWall(-15, 32, thickness, 16); // 왼쪽 구석 세로
        addWall(-10, 24, 10, thickness); // 왼쪽 구석 가로
        addWall(15, 32, thickness, 16);  // 오른쪽 구석 세로
        addWall(10, 24, 10, thickness);  // 오른쪽 구석 가로
    };

    // 맵 생성 실행
    buildCafeMap();


    // 4. Avatar Factory (기존 캐릭터 유지)
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
    // 시작 위치를 맵 중앙의 넓은 홀쪽으로 약간 이동
    myPlayerRef.current.position.set(0, 0.25, 15);

    // 5. Input System (기존 유지)
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 6. Animation Loop (기존 유지)
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

        // World boundaries (맵 크기에 맞춰 조정)
        player.position.x = THREE.MathUtils.clamp(player.position.x, -38, 38);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -38, 38);

        // Camera Follow
        const camOffset = new THREE.Vector3(0, 30, 30); // 카메라 각도 약간 수정
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

    // 7. Network Subscription (기존 유지)
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
