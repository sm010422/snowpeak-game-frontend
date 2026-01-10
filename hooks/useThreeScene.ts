// src/hooks/useThreeScene.ts
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Environment } from "../game/Environment";

export const useThreeScene = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const mountEl = mountRef.current;

    // 1. 씬 생성
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 컨테이너 기준으로 사이즈를 잡습니다 (window 기준 X)
    const getSize = () => {
      const rect = mountEl.getBoundingClientRect();
      // 안전장치: 0 방지
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      return { width, height };
    };

    const { width: initW, height: initH } = getSize();

    // 2. 카메라 생성
    const camera = new THREE.PerspectiveCamera(60, initW / initH, 0.1, 1000);
    cameraRef.current = camera;

    // 카메라 기본 위치(프로젝트에 맞게 조정하세요)
    // 이미 다른 곳에서 세팅 중이면 이 2줄은 제거하셔도 됩니다.
    camera.position.set(0, 12, 18);
    camera.lookAt(0, 0, 0);

    // 3. 렌더러 생성
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: true,
    });
    rendererRef.current = renderer;

    // 캔버스가 부모에 딱 맞게 붙도록
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initW, initH, false);

    renderer.shadowMap.enabled = false;

    mountEl.appendChild(renderer.domElement);

    renderer.domElement.tabIndex = 1;
    renderer.domElement.focus();

    // 4. 환경(조명 등) 생성
    new Environment(scene);

    // 5. 리사이즈: 컨테이너 크기 기준으로 업데이트
    const applyResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;

      const { width, height } = getSize();

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current.setSize(width, height, false);
    };

    // ResizeObserver로 mount 영역 변화를 추적 (레이아웃 변화에도 안정적)
    const ro = new ResizeObserver(() => applyResize());
    ro.observe(mountEl);

    // 혹시라도 브라우저 자체 리사이즈도 같이 커버
    window.addEventListener("resize", applyResize);

    // 6. 줌(확대/축소): 휠로 카메라 fov 조절 방식
    // 트랙패드도 wheel 이벤트로 들어옵니다.
    const MIN_FOV = 25;
    const MAX_FOV = 75;
    const ZOOM_SPEED = 0.05; // 민감도 (원하시면 0.03~0.08 사이로 조절)

    const onWheel = (e: WheelEvent) => {
      // 페이지 스크롤/확대와 충돌 줄이기
      e.preventDefault();

      const cam = cameraRef.current;
      if (!cam) return;

      // deltaY > 0 : 보통 아래로 스크롤(줌 아웃 느낌)이라 fov를 늘리고
      // deltaY < 0 : 위로 스크롤(줌 인 느낌)이라 fov를 줄입니다.
      const next = cam.fov + e.deltaY * ZOOM_SPEED;
      cam.fov = THREE.MathUtils.clamp(next, MIN_FOV, MAX_FOV);
      cam.updateProjectionMatrix();
    };

    // passive: false 해야 preventDefault가 먹습니다
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // 초기 1회 보정
    applyResize();

    // 정리(Cleanup)
    return () => {
      renderer.domElement.removeEventListener("wheel", onWheel as any);
      window.removeEventListener("resize", applyResize);
      ro.disconnect();

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (mountEl && renderer.domElement) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  return { mountRef, sceneRef, cameraRef, rendererRef };
};
