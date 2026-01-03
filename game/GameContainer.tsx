import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import * as THREE from "three";
import { socketService } from "../services/SocketService";
import { Avatar } from "./Avatar";
import { Environment } from "./Environment";
import { PlayerState } from "../types";
import { useKeyboard } from "../hooks/userKeyboard";

interface GameContainerProps {
  nickname: string;
  role: string;
}

const GameContainer: React.FC<GameContainerProps> = ({ nickname, role }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // 1. 플레이어 데이터 관리를 위한 React State (중복 방지 및 빠른 조회를 위해 Record/Object 사용)
  // 이 상태는 주로 '누가 방에 있는가'를 추적하는 용도로 사용합니다.
  const [playerRegistry, setPlayerRegistry] = useState<
    Record<string, PlayerState>
  >({});

  // 2. 3D 객체 인스턴스 관리를 위한 Refs (성능을 위해 렌더 루프에서 직접 접근)
  const myAvatarRef = useRef<Avatar | null>(null);
  const otherAvatarsRef = useRef<Map<string, Avatar>>(new Map());

  const keysRef = useKeyboard();
  const requestRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const activeRef = useRef<boolean>(true);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const tempVector = useMemo(() => new THREE.Vector3(), []);
  const tempInputDir = useMemo(() => new THREE.Vector3(), []);
  const cameraOffset = useMemo(() => new THREE.Vector3(18, 22, 18), []);

  // 3. 플레이어 업데이트 처리 로직 (함수형 업데이트 적용)
  // 3. 플레이어 업데이트 처리 로직 (성능 최적화 버전)
  const handleIncomingUpdate = useCallback(
    (data: any) => {
      const pid = data.playerId || data.nickname;
      if (!pid || pid === nickname) return;

      // [최적화] 이미 있는 유저가 '이동'만 한 경우 -> 리액트 렌더링 건너뜀 (Ref만 수정)
      const avatar = otherAvatarsRef.current.get(pid);
      if (avatar && data.status !== "LEAVE") {
        if (data.x !== undefined) {
          avatar.targetPos.set(data.x / 100, 0, data.y / 100);
          if (data.direction) {
            avatar.targetRotation = parseFloat(data.direction);
          }
        }
        return; // ★ 여기서 함수 종료! (setPlayerRegistry 호출 안 함)
      }

      // 새로운 유저(JOIN)거나 나간 유저(LEAVE)인 경우에만 상태 업데이트
      setPlayerRegistry((prev) => {
        if (data.status === "LEAVE") {
          const newState = { ...prev };
          delete newState[pid];
          return newState;
        }
        if (prev[pid]) return prev; // 이미 있으면 패스

        return {
          ...prev,
          [pid]: data as PlayerState,
        };
      });
    },
    [nickname],
  );

  useEffect(() => {
    if (!mountRef.current) return;
    activeRef.current = true;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    renderer.domElement.tabIndex = 1;
    renderer.domElement.focus();

    new Environment(scene);

    // 내 캐릭터 설정
    const myColor = role === "BARISTA" ? 0x8b4513 : 0x2e8b57;
    const myAvatar = new Avatar(myColor, nickname);
    scene.add(myAvatar.group);
    myAvatarRef.current = myAvatar;

    const velocity = new THREE.Vector3();
    const moveSpeed = 22;
    let lastNetSync = 0;
    const lastSentPosition = new THREE.Vector3();

    // useEffect 안쪽의 update 함수
    const update = () => {
      if (!activeRef.current) return;
      const deltaTime = clockRef.current.getDelta();
      const elapsedTime = clockRef.current.getElapsedTime();

      // 환경 애니메이션
      scene.traverse((obj) => {
        if (obj.userData.bladeGroup)
          obj.userData.bladeGroup.rotation.z += deltaTime * 3;
      });

      // 내 캐릭터 이동 로직 (최적화됨)
      if (myAvatarRef.current) {
        const avatar = myAvatarRef.current;

        // [수정] new Vector3() 대신 tempInputDir 재사용
        tempInputDir.set(0, 0, 0);
        if (keysRef.current["w"] || keysRef.current["arrowup"])
          tempInputDir.z -= 1;
        if (keysRef.current["s"] || keysRef.current["arrowdown"])
          tempInputDir.z += 1;
        if (keysRef.current["a"] || keysRef.current["arrowleft"])
          tempInputDir.x -= 1;
        if (keysRef.current["d"] || keysRef.current["arrowright"])
          tempInputDir.x += 1;

        if (tempInputDir.lengthSq() > 0) {
          tempInputDir.normalize();
          velocity.lerp(tempInputDir.multiplyScalar(moveSpeed), 0.25);
          avatar.group.rotation.y = THREE.MathUtils.lerp(
            avatar.group.rotation.y,
            Math.atan2(velocity.x, velocity.z),
            0.2,
          );
        } else {
          // [수정] 0,0,0 만들지 않고 set 사용
          velocity.lerp(tempVector.set(0, 0, 0), 0.25);
        }

        avatar.group.position.add(velocity.clone().multiplyScalar(deltaTime));
        avatar.updateAnimation(elapsedTime, velocity.lengthSq() > 0.5);

        // 카메라 추적 (최적화됨)
        // [수정] clone()과 new Vector3() 제거
        tempVector.copy(avatar.group.position).add(cameraOffset);
        camera.position.lerp(tempVector, 0.08);
        camera.lookAt(avatar.group.position);

        // 네트워크 전송 (쓰로틀링)
        const now = performance.now();
        if (now - lastNetSync > 80) {
          // 100ms -> 80ms (반응성 향상)
          if (
            avatar.group.position.distanceToSquared(lastSentPosition) > 0.0025
          ) {
            socketService.sendMessage("/app/update", {
              playerId: nickname,
              nickname,
              x: Math.round(avatar.group.position.x * 100),
              y: Math.round(avatar.group.position.z * 100),
              direction: avatar.group.rotation.y.toFixed(2),
              role: role.toUpperCase(),
              roomId: "1",
            });
            lastNetSync = now;
            lastSentPosition.copy(avatar.group.position);
          }
        }
      }

      // 타인 캐릭터 보간
      otherAvatarsRef.current.forEach((other) => {
        const oldPos = other.group.position.clone(); // 여기 clone은 비교용이라 유지
        other.lerpToTarget(0.2); // 보간 속도 약간 올림
        other.updateAnimation(
          elapsedTime,
          other.group.position.distanceToSquared(oldPos) > 0.0004,
        );
      });

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    // 네트워크 구독
    const unsubscribe = socketService.subscribe((msg: any) => {
      if (Array.isArray(msg)) {
        msg.forEach((p) => handleIncomingUpdate(p));
      } else {
        handleIncomingUpdate(msg);
      }
    });

    return () => {
      activeRef.current = false;
      unsubscribe();
      cancelAnimationFrame(requestRef.current);
      renderer.dispose();
    };
  }, [nickname, role, handleIncomingUpdate]);

  // 4. Registry 상태 변화에 따른 3D 객체 생성/삭제 동기화
  useEffect(() => {
    if (!sceneRef.current) return;

    Object.keys(playerRegistry).forEach((pid) => {
      if (!otherAvatarsRef.current.has(pid)) {
        const data = playerRegistry[pid];
        const newAvatar = new Avatar(0xe74c3c, data.nickname || pid);
        const startX = (data.x || 0) / 100;
        const startZ = (data.y || 0) / 100;
        newAvatar.group.position.set(startX, 0, startZ);
        newAvatar.targetPos.set(startX, 0, startZ);

        sceneRef.current?.add(newAvatar.group);
        otherAvatarsRef.current.set(pid, newAvatar);
      }
    });

    // 2. ★ (수정됨) 나간 사람 삭제 로직 (더 안전한 방식)
    // 현재 레지스트리에 있는(살아남아야 할) ID들을 집합(Set)으로 만듭니다.
    const activeIds = new Set(Object.keys(playerRegistry));

    // 현재 화면에 있는 아바타들의 ID 목록을 가져와서 검사합니다.
    Array.from(otherAvatarsRef.current.keys()).forEach((pid: string) => {
      // "어? 살아남아야 할 명단(activeIds)에 이 ID가 없네?" -> 삭제 대상
      if (!activeIds.has(pid)) {
        const avatarToRemove = otherAvatarsRef.current.get(pid);

        if (avatarToRemove) {
          sceneRef.current?.remove(avatarToRemove.group); // 1. 3D 씬에서 제거

          // (선택사항) 만약 Avatar 클래스에 메모리 정리용 dispose 함수를 만드셨다면 여기서 호출
          // avatarToRemove.dispose();
        }

        otherAvatarsRef.current.delete(pid); // 2. 관리 목록(Map)에서 제거
      }
    });
  }, [playerRegistry]);

  return (
    <div ref={mountRef} className="w-full h-screen touch-none outline-none" />
  );
};

export default GameContainer;
