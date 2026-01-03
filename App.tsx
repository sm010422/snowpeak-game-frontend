import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import GameContainer from './game/GameContainer';
import HUD from './components/HUD';
import { socketService } from './services/SocketService';

const App: React.FC = () => {
  // 'CONNECTING' 상태 제거 (GameContainer가 알아서 연결함)
  const [gameState, setGameState] = useState<'LOGIN' | 'PLAYING'>('LOGIN');
  const [user, setUser] = useState<{nickname: string, role: string} | null>(null);

  // 1. 로그인 버튼 누르면 -> 그냥 바로 게임 화면으로 전환
  const handleJoin = (nickname: string, role: string) => {
    setUser({ nickname, role });
    setGameState('PLAYING');
    // ❌ 여기서 socketService.connect 하지 않음! (GameContainer가 할 예정)
  };

  const handleLeave = () => {
    socketService.disconnect();
    setGameState('LOGIN');
    setUser(null);
  };

  return (
    <div className="w-full h-screen bg-[#1a1a1a] overflow-hidden relative">
      {gameState === 'LOGIN' ? (
        <div className="relative z-10">
          <LoginScreen onJoin={handleJoin} />
        </div>
      ) : (
        <>
          {/* 2. 화면이 바뀌면서 GameContainer가 마운트됨 -> 이때 소켓 연결 시작! */}
          <GameContainer 
            nickname={user?.nickname || 'Player'} 
            role={user?.role || 'HALL_SERVER'} 
          />
          <HUD 
            nickname={user?.nickname || 'Player'} 
            role={user?.role || 'Hall Server'} 
            onLeave={handleLeave}
          />
        </>
      )}
    </div>
  );
};

export default App;
