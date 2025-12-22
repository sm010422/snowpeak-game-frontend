
import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Settings, LogOut, Map as MapIcon } from 'lucide-react';
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
        <div className="bg-[#1a1c23]/80 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-gradient-to-br from-[#5d4037] to-[#3e2723] rounded-xl flex items-center justify-center text-white font-bold shadow-inner">
            {nickname[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">{nickname}</p>
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">{role.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="bg-[#1a1c23]/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 flex gap-1">
             <button className="p-2.5 text-gray-400 hover:text-white transition-colors">
               <Users size={20} />
             </button>
             <button className="p-2.5 text-gray-400 hover:text-white transition-colors">
               <MapIcon size={20} />
             </button>
             <div className="w-px bg-white/10 mx-1" />
             <button 
              onClick={onLeave}
              className="p-2.5 text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Side Inventory / Stats Style Panel (Hidden logic, just visual placeholder) */}
      <div className="absolute right-6 top-24 pointer-events-auto hidden md:flex flex-col gap-3">
         <div className="w-16 h-16 bg-[#1a1c23]/80 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center text-yellow-500 shadow-xl">
            <div className="text-xs font-bold">LV.1</div>
         </div>
         <div className="w-16 h-48 bg-[#1a1c23]/80 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col items-center py-4 gap-4 shadow-xl">
            <div className="w-10 h-10 bg-white/5 rounded-lg" />
            <div className="w-10 h-10 bg-white/5 rounded-lg" />
            <div className="w-10 h-10 bg-white/5 rounded-lg" />
         </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-col items-start gap-4 pointer-events-auto">
        <div className={`w-80 transition-all duration-300 origin-bottom-left ${isChatOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
          <div className="bg-[#1a1c23]/90 backdrop-blur-xl rounded-3xl p-5 text-white overflow-hidden shadow-2xl border border-white/10">
            <div className="h-48 overflow-y-auto mb-4 space-y-3 scrollbar-hide pr-2">
              {messages.map((m, i) => (
                <div key={i} className="text-sm animate-in slide-in-from-left-2 duration-300">
                  <span className="font-bold text-yellow-500">{m.sender}: </span>
                  <span className="text-gray-300">{m.text}</span>
                </div>
              ))}
              {messages.length === 0 && <p className="text-xs text-white/30 italic">Silence in the snow...</p>}
            </div>
            <form onSubmit={sendChat}>
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Whisper to the world..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-yellow-500/50 transition-all placeholder:text-white/20"
              />
            </form>
          </div>
        </div>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`p-5 rounded-full shadow-2xl transition-all active:scale-90 ${isChatOpen ? 'bg-yellow-500 text-black' : 'bg-[#1a1c23]/80 backdrop-blur-md text-white border border-white/10'}`}
        >
          <MessageSquare size={24} />
        </button>
      </div>
    </div>
  );
};

export default HUD;
