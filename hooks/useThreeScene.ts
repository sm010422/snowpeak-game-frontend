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

    // 1. 씬 생성
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. 카메라 생성
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;

    // 3. 렌더러 생성
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    renderer.domElement.tabIndex = 1;
    renderer.domElement.focus();

    // 4. 환경(조명 등) 생성
    new Environment(scene);

    // 정리(Cleanup)
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return { mountRef, sceneRef, cameraRef, rendererRef };
};
