
import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import GameContainer from './game/GameContainer';
import HUD from './components/HUD';
import { socketService } from './services/SocketService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'LOGIN' | 'CONNECTING' | 'PLAYING'>('LOGIN');
  const [user, setUser] = useState<{nickname: string, role: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = (nickname: string, role: string) => {
    setGameState('CONNECTING');
    setError(null);

    // SocketService를 통해 localhost:8080에 연결 시도
    socketService.connect(
      nickname, 
      role, 
      () => {
        // 성공 시
        setUser({ nickname, role });
        setGameState('PLAYING');
      },
      (err) => {
        // 실패 시
        console.error('Connection failed:', err);
        setError('서버 연결에 실패했습니다. (localhost:8080 확인 필요)');
        setGameState('LOGIN');
      }
    );
  };

  const handleLeave = () => {
    socketService.disconnect();
    setGameState('LOGIN');
    setUser(null);
  };

  return (
    <div className="w-full h-screen bg-[#1a1a1a] overflow-hidden relative">
      {gameState === 'LOGIN' || gameState === 'CONNECTING' ? (
        <div className="relative z-10">
          <LoginScreen onJoin={handleJoin} />
          {gameState === 'CONNECTING' && (
            <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
              <p className="text-white font-bold">서버에 연결 중...</p>
            </div>
          )}
          {error && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg font-bold animate-bounce z-50">
              {error}
            </div>
          )}
        </div>
      ) : (
        <>
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
