
import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, LogOut, Map as MapIcon, Layers } from 'lucide-react';
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
    socketService.sendMessage('/app/chat', { type: 'CHAT', nickname, content: chatInput });
    setChatInput('');
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-8 font-sans">
      {/* Top Navigation */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xl p-2 pr-6 rounded-2xl shadow-xl border border-white/50">
          <div className="w-12 h-12 bg-[#3e2723] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
            {nickname[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800 leading-none">{nickname}</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{role.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex bg-white/80 backdrop-blur-xl p-1 rounded-2xl shadow-xl border border-white/50">
            <button className="p-3 text-gray-500 hover:text-black hover:bg-black/5 rounded-xl transition-all"><Users size={20} /></button>
            <button className="p-3 text-gray-500 hover:text-black hover:bg-black/5 rounded-xl transition-all"><Layers size={20} /></button>
            <div className="w-px bg-gray-200 mx-1 self-stretch" />
            <button onClick={onLeave} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"><LogOut size={20} /></button>
          </div>
        </div>
      </div>

      {/* Mini Map Style UI (Visual only) */}
      <div className="absolute right-8 top-32 pointer-events-auto">
        <div className="w-48 h-48 bg-white/60 backdrop-blur-md rounded-3xl border border-white border-dashed overflow-hidden relative shadow-lg">
           <div className="absolute inset-4 bg-[#e5e0d8] rounded-xl opacity-50" />
           <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-red-500 rounded-full animate-pulse transform -translate-x-1/2 -translate-y-1/2" />
           <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">FLOOR PLAN VIEW</div>
        </div>
      </div>

      {/* Chat Component */}
      <div className="flex flex-col items-start gap-4 pointer-events-auto">
        <div className={`w-80 transition-all duration-500 origin-bottom-left ${isChatOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
          <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] p-6 shadow-2xl border border-white/50">
            <div className="h-40 overflow-y-auto mb-4 space-y-4 scrollbar-hide">
              {messages.map((m, i) => (
                <div key={i} className="animate-in fade-in slide-in-from-left-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">{m.sender}</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-2xl rounded-tl-none">{m.text}</p>
                </div>
              ))}
              {messages.length === 0 && <p className="text-xs text-gray-300 italic text-center py-4">Start a conversation...</p>}
            </div>
            <form onSubmit={sendChat}>
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-gray-100 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-black/5 transition-all outline-none"
              />
            </form>
          </div>
        </div>
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-16 h-16 rounded-3xl shadow-2xl flex items-center justify-center transition-all active:scale-90 ${isChatOpen ? 'bg-black text-white' : 'bg-white text-black'}`}
        >
          <MessageSquare size={24} />
        </button>
      </div>
    </div>
  );
};

export default HUD;
