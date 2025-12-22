
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainScene } from './MainScene';

interface GameContainerProps {
  nickname: string;
  role: string;
}

const GameContainer: React.FC<GameContainerProps> = ({ nickname, role }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      pixelArt: true, // Keep things sharp
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false,
        },
      },
      scene: [MainScene],
      backgroundColor: '#0b0e14',
    };

    phaserGame.current = new Phaser.Game(config);

    phaserGame.current.events.once('ready', () => {
      const scene = phaserGame.current?.scene.getScene('MainScene') as MainScene;
      if (scene) {
        scene.init({ nickname, role });
      }
    });

    const handleResize = () => {
      if (phaserGame.current) {
        phaserGame.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (phaserGame.current) {
        phaserGame.current.destroy(true);
        phaserGame.current = null;
      }
    };
  }, [nickname, role]);

  return <div ref={gameRef} className="w-full h-screen overflow-hidden" />;
};

export default GameContainer;
