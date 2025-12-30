// hooks/useKeyboard.ts
import { useEffect, useRef } from 'react';

export const useKeyboard = () => {
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { 
        keys.current[e.key.toLowerCase()] = true; 
        keys.current[e.key] = true; // 대소문자 이슈 방지용 안전장치
    };
    const up = (e: KeyboardEvent) => { 
        keys.current[e.key.toLowerCase()] = false; 
        keys.current[e.key] = false;
    };
    
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return keys;
};
