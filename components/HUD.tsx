
import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Settings, LogOut } from 'lucide-react';
import { socketService } from '../services/SocketService';
import { GameMessage } from '../types';

interface HUDProps {
  nickname: string;
  role: string;
  onLeave: () => void;
}

const HUD: React.FC<HUDProps> = ({ nickname, role, onLeave }) => {
  const [messages, setMessages] = useState<{sender: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    return socketService.subscribe((msg: GameMessage) => {
      if (msg.type === 'CHAT') {
        setMessages(prev => [...prev, { sender: msg.nickname || 'Unknown', text: msg.content || '' }].slice(-10));
      }
    });
  }, []);

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketService.sendMessage('/app/chat', {
      type: 'CHAT',
      nickname,
      content: chatInput
    });
    setChatInput('');
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-6">
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-lg border border-white/50 flex items-center gap-4">
          <div className="w-10 h-10 bg-[#5d4037] rounded-xl flex items-center justify-center text-white font-bold">
            {nickname[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-[#3d2b1f] leading-tight">{nickname}</p>
            <p className="text-[10px] font-bold text-[#8d6e63] uppercase tracking-wider">{role.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="p-3 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/50 text-[#5d4037] hover:bg-white transition-all">
            <Users size={20} />
          </button>
          <button 
            onClick={onLeave}
            className="p-3 bg-red-500/90 backdrop-blur-md rounded-xl shadow-lg border border-red-400 text-white hover:bg-red-600 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-col items-start gap-4 pointer-events-auto">
        <div className={`w-80 transition-all duration-300 ${isChatOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-4 text-white overflow-hidden shadow-2xl border border-white/10">
            <div className="h-48 overflow-y-auto mb-4 space-y-2 scrollbar-hide">
              {messages.map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="font-bold text-yellow-400">{m.sender}: </span>
                  <span className="text-gray-100">{m.text}</span>
                </div>
              ))}
              {messages.length === 0 && <p className="text-xs text-white/50 italic">No messages yet...</p>}
            </div>
            <form onSubmit={sendChat}>
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/40 transition-all"
              />
            </form>
          </div>
        </div>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`p-4 rounded-2xl shadow-xl transition-all ${isChatOpen ? 'bg-white text-[#5d4037]' : 'bg-[#5d4037] text-white'}`}
        >
          <MessageSquare size={24} />
        </button>
      </div>
    </div>
  );
};

export default HUD;
