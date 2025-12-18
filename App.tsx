
import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import GameContainer from './game/GameContainer';
import HUD from './components/HUD';
import { socketService } from './services/SocketService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'LOGIN' | 'PLAYING'>('LOGIN');
  const [user, setUser] = useState<{nickname: string, role: string} | null>(null);

  const handleJoin = (nickname: string, role: string) => {
    // Attempt to connect via socket service
    socketService.connect(nickname, role, () => {
      setUser({ nickname, role });
      setGameState('PLAYING');
    });
  };

  const handleLeave = () => {
    socketService.disconnect();
    setGameState('LOGIN');
    setUser(null);
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      {gameState === 'LOGIN' ? (
        <LoginScreen onJoin={handleJoin} />
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
