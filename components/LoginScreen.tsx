
import React, { useState } from 'react';
import { Coffee, Tent, User, ArrowRight, Mountain } from 'lucide-react';

interface LoginScreenProps {
  onJoin: (nickname: string, role: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onJoin }) => {
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<'HALL_SERVER' | 'BARISTA'>('HALL_SERVER');

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#f5f1e9] bg-[url('https://picsum.photos/1920/1080?blur=10')] bg-cover bg-center">
      <div className="absolute inset-0 bg-[#3d2b1f]/20 backdrop-blur-sm" />
      
      <div className="relative w-full max-w-md p-8 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#5d4037] text-white rounded-2xl mb-4 shadow-lg rotate-3">
             <Mountain size={40} />
          </div>
          <h1 className="text-3xl font-bold text-[#3d2b1f] tracking-tight">Snowpeak Game</h1>
          <p className="text-[#8d6e63] font-medium mt-1">Cozy Camping & Cafe Co-op</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[#5d4037] mb-2 px-1">Choose a Nickname</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a1887f]" size={18} />
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex: Camper_John"
                className="w-full pl-12 pr-4 py-4 bg-[#fdfaf5] border-2 border-[#efebe9] rounded-2xl focus:border-[#8d6e63] focus:outline-none transition-all text-[#3d2b1f] font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#5d4037] mb-3 px-1">Select Your Role</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setRole('HALL_SERVER')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  role === 'HALL_SERVER' 
                  ? 'bg-[#5d4037] border-[#5d4037] text-white shadow-md' 
                  : 'bg-white border-[#efebe9] text-[#8d6e63] hover:border-[#d7ccc8]'
                }`}
              >
                <Tent size={24} />
                <span className="text-sm font-bold">Hall Server</span>
              </button>
              <button
                onClick={() => setRole('BARISTA')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  role === 'BARISTA' 
                  ? 'bg-[#5d4037] border-[#5d4037] text-white shadow-md' 
                  : 'bg-white border-[#efebe9] text-[#8d6e63] hover:border-[#d7ccc8]'
                }`}
              >
                <Coffee size={24} />
                <span className="text-sm font-bold">Barista</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => nickname.trim() && onJoin(nickname, role)}
            disabled={!nickname.trim()}
            className="w-full group flex items-center justify-center gap-2 py-5 bg-[#3e2723] text-[#f5f1e9] rounded-2xl font-bold text-lg hover:bg-[#211b19] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-xl"
          >
            Start Adventure
            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-[#efebe9] text-center">
          <p className="text-xs text-[#a1887f] font-medium">Built with React & ThreeJS</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
