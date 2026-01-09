// src/hooks/usePlayerSystem.ts
import React, { useState, useRef, useCallback, useEffect } from "react";
import { PlayerState } from "../types";
import { Avatar } from "../game/avatar/Avatar";
import * as THREE from "three";

export const usePlayerSystem = (nickname: string, sceneRef: React.MutableRefObject<THREE.Scene | null>) => {
  const [playerRegistry, setPlayerRegistry] = useState<Record<string, PlayerState>>({});
  
  // 다른 플레이어들의 3D 객체를 담는 Map
  const otherAvatarsRef = useRef<Map<string, Avatar>>(new Map());

  // 메시지 처리 핸들러 (최적화됨)
  const handleIncomingUpdate = useCallback((data: any) => {
      const pid = data.playerId || data.nickname;
      if (!pid || pid === nickname) return;

      // 1. 단순 이동 처리 (리액트 렌더링 X)
      const avatar = otherAvatarsRef.current.get(pid);
      if (avatar && data.status !== "LEAVE") {
        if (data.x !== undefined) {
          avatar.targetPos.set(data.x / 100, 0, data.y / 100);
          if (data.direction) avatar.targetRotation = parseFloat(data.direction);
        }
        return; 
      }

      // 2. 입장/퇴장 처리 (리액트 렌더링 O)
      setPlayerRegistry((prev) => {
        if (data.status === "LEAVE") {
          const newState = { ...prev };
          delete newState[pid];
          return newState;
        }
        if (prev[pid]) return prev;
        return { ...prev, [pid]: data as PlayerState };
      });
    }, [nickname]);

  // Registry 변경 시 3D 객체 생성/삭제 동기화
  useEffect(() => {
    if (!sceneRef.current) return;

    // 생성 로직
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

    // 삭제 로직 (타입 에러 수정됨)
    const activeIds = new Set(Object.keys(playerRegistry));
    Array.from(otherAvatarsRef.current.keys()).forEach((pid: string) => {
      if (!activeIds.has(pid)) {
        const avatarToRemove = otherAvatarsRef.current.get(pid);
        if (avatarToRemove) sceneRef.current?.remove(avatarToRemove.group);
        otherAvatarsRef.current.delete(pid);
      }
    });
  }, [playerRegistry, sceneRef]);

  return { otherAvatarsRef, handleIncomingUpdate };
};
