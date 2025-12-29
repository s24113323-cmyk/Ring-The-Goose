
import React, { useMemo, useState } from 'react';
import { GameStatus, GameSettings, GraphicsQuality, LeaderboardEntry, Inventory, SkillType, ActiveSkills } from '../types';
import { SKILL_COSTS } from '../constants';

interface GameOverlayProps {
  status: GameStatus;
  score: number;
  streak: number;
  hoopsLeft: number;
  isMuted: boolean;
  timeLeft: number;
  playerName: string;
  setPlayerName: (name: string) => void;
  leaderboard: LeaderboardEntry[];
  onToggleMute: () => void;
  onStart: () => void;
  onRestart: () => void;
  onExit: () => void;
  isPaused: boolean;
  setIsPaused: (p: boolean) => void;
  settings: GameSettings;
  updateSettings: (s: Partial<GameSettings>) => void;
  isRecording: boolean;
  isTranscribing: boolean;
  transcription: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  // Shop & Skills
  coins: number;
  inventory: Inventory;
  onUseSkill: (type: SkillType) => void;
  onBuySkill: (type: SkillType, cost: number) => void;
  activeSkills: ActiveSkills;
}

const Lantern: React.FC<{ delay?: string; scale?: number; left: string }> = ({ delay = '0s', scale = 1, left }) => (
  <div 
    className="absolute top-0 pointer-events-none z-0" 
    style={{ left, transform: `scale(${scale})`, animation: `lanternSway 4s ease-in-out ${delay} infinite alternate` }}
  >
    <div className="w-[2px] h-12 bg-white/10 mx-auto" />
    <div className="w-8 h-2 bg-[#1a1b4b] rounded-t-sm mx-auto" />
    <div className="w-12 h-16 bg-[#FFB300] rounded-[10px] mx-auto relative shadow-[0_0_30px_rgba(255,179,0,0.6)]" style={{ boxShadow: '0 0 25px #FFB300, inset 0 0 15px rgba(255,255,255,0.4)' }}>
      <div className="absolute inset-x-0 top-1/4 h-[1px] bg-black/10" />
      <div className="absolute inset-x-0 top-2/4 h-[1px] bg-black/10" />
      <div className="absolute inset-x-0 top-3/4 h-[1px] bg-black/10" />
    </div>
    <div className="w-8 h-3 bg-[#1a1b4b] rounded-b-sm mx-auto" />
    <div className="w-[1px] h-6 bg-red-500/60 mx-auto" />
  </div>
);

const CalligraphyBanner: React.FC = () => (
  <div className="fixed left-8 top-12 flex flex-col items-center z-30 pointer-events-none group">
    <div className="w-16 h-[280px] bg-red-700 border-2 border-yellow-500 shadow-2xl relative flex flex-col items-center py-6">
      <div className="absolute -top-4 w-20 h-2 bg-[#4b1d1d] rounded-full" />
      <div className="text-yellow-500 font-asian text-4xl leading-tight text-center flex flex-col gap-2">
        <span>趙</span>
        <span>浩</span>
        <span>然</span>
      </div>
      <div className="absolute bottom-4 w-8 h-8 border-2 border-yellow-500 flex items-center justify-center opacity-60">
        <span className="text-yellow-500 text-[8px]">浩然</span>
      </div>
    </div>
    <div className="w-1 h-12 bg-white/20 mt-[-2px]" />
    <div className="w-16 h-1 bg-white/10 rounded-full blur-[2px]" />
  </div>
);

const LeaderboardRow: React.FC<{ entry: LeaderboardEntry; rank: number }> = ({ entry, rank }) => {
  const isTop3 = rank <= 3;
  const icon = rank === 1 ? '🏮' : rank === 2 ? '🌸' : rank === 3 ? '🪙' : '';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 group">
      <div className="flex items-center gap-2">
        <span className={`w-4 text-[10px] font-asian ${isTop3 ? 'text-yellow-400' : 'text-white/30'}`}>{isTop3 ? icon : rank}</span>
        <span className="text-white/80 text-[11px] font-asian tracking-wider truncate max-w-[80px] group-hover:text-pink-400 transition-colors">{entry.name}</span>
      </div>
      <span className="text-pink-400 text-[11px] font-mono font-bold">{entry.score}</span>
    </div>
  );
};

const GameOverlay: React.FC<GameOverlayProps> = ({
  status, score, streak, hoopsLeft, isMuted, timeLeft, playerName, setPlayerName, leaderboard, onToggleMute, onStart, onRestart, onExit, isPaused, setIsPaused, settings, updateSettings, isRecording, isTranscribing, transcription, onStartRecording, onStopRecording, coins, inventory, onUseSkill, onBuySkill, activeSkills
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const elements = useMemo(() => {
    if (settings.graphicsQuality === GraphicsQuality.LOW) return [];
    const isMed = settings.graphicsQuality === GraphicsQuality.MEDIUM;
    const petalCount = isMed ? 10 : 25;
    const emberCount = isMed ? 12 : 30;
    return [
      ...Array.from({ length: petalCount }).map((_, i) => ({ id: `p-${i}`, type: 'sakura', left: `${Math.random() * 100}%`, delay: `-${Math.random() * 20}s`, duration: `${12 + Math.random() * 8}s`, size: `${6 + Math.random() * 8}px`, opacity: 0.3 + Math.random() * 0.4 })),
      ...Array.from({ length: emberCount }).map((_, i) => ({ id: `e-${i}`, type: 'ember', left: `${Math.random() * 100}%`, delay: `-${Math.random() * 15}s`, duration: `${6 + Math.random() * 10}s`, size: `${2 + Math.random() * 4}px`, opacity: 0.6 + Math.random() * 0.4 }))
    ];
  }, [settings.graphicsQuality]);

  const ShopModal = isShopOpen && (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[70] flex items-center justify-center p-6 pointer-events-auto">
      <div className="bg-[#2d1b4d] border-2 border-yellow-500/30 w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl" />
        <h2 className="text-4xl font-asian text-yellow-500 mb-2 text-center glow-text uppercase">Mystic Stall</h2>
        <p className="text-pink-200/50 text-[10px] font-asian tracking-widest text-center uppercase mb-8">Jade Chips: {coins} 🪙</p>
        
        <div className="space-y-4">
          {[
            { id: 'freeze' as SkillType, name: 'Freeze Incense', icon: '🏮', desc: 'Stops all geese for 4 seconds.' },
            { id: 'slow' as SkillType, name: 'Petal Mist', icon: '🌸', desc: 'Slows the market by 50% for 8 seconds.' },
            { id: 'lure' as SkillType, name: 'Golden Corn', icon: '🌽', desc: 'Lures geese to center for 6 seconds.' }
          ].map(item => (
            <div key={item.id} className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl hover:border-yellow-500/50 transition-all group">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{item.icon}</span>
                <div>
                  <h4 className="text-white font-asian text-sm tracking-widest group-hover:text-yellow-500 transition-colors">{item.name}</h4>
                  <p className="text-white/40 text-[9px] uppercase tracking-wider">{item.desc}</p>
                </div>
              </div>
              <button 
                onClick={() => onBuySkill(item.id, SKILL_COSTS[item.id])}
                disabled={coins < SKILL_COSTS[item.id]}
                className={`px-4 py-2 rounded-xl font-asian text-[10px] tracking-widest transition-all ${
                  coins >= SKILL_COSTS[item.id] ? 'bg-yellow-600 text-white hover:bg-yellow-500' : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                {SKILL_COSTS[item.id]} 🪙
              </button>
            </div>
          ))}
        </div>
        
        <button onClick={() => { setIsShopOpen(false); setIsPaused(false); }} className="w-full mt-10 py-5 bg-white/5 hover:bg-white/10 text-white font-asian text-xs tracking-[0.3em] rounded-2xl transition-all border border-white/10 uppercase">Return to Market</button>
      </div>
    </div>
  );

  const SkillBar = (
    <div className="flex flex-col gap-3 pointer-events-auto">
      {[
        { id: 'freeze' as SkillType, icon: '🏮' },
        { id: 'slow' as SkillType, icon: '🌸' },
        { id: 'lure' as SkillType, icon: '🌽' }
      ].map(skill => (
        <button 
          key={skill.id}
          onClick={() => onUseSkill(skill.id)}
          disabled={inventory[skill.id] <= 0 || activeSkills[skill.id] > 0}
          className={`relative w-14 h-14 rounded-2xl border transition-all flex items-center justify-center group ${
            activeSkills[skill.id] > 0 
              ? 'bg-yellow-500/20 border-yellow-500 animate-pulse' 
              : inventory[skill.id] > 0 
                ? 'bg-white/10 border-white/20 hover:bg-white/20' 
                : 'bg-black/40 border-white/5 opacity-30 cursor-not-allowed grayscale'
          }`}
        >
          <span className="text-2xl">{skill.icon}</span>
          {inventory[skill.id] > 0 && activeSkills[skill.id] <= 0 && (
            <span className="absolute -top-2 -right-2 bg-pink-600 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white/20 shadow-lg">
              {inventory[skill.id]}
            </span>
          )}
          {activeSkills[skill.id] > 0 && (
            <div className="absolute inset-0 bg-yellow-500/40 rounded-2xl origin-bottom transition-all" style={{ height: `${(activeSkills[skill.id] / 5000) * 100}%` }} />
          )}
        </button>
      ))}
    </div>
  );

  if (status === GameStatus.PLAYING) {
    const radius = 90; const circumference = 2 * Math.PI * radius;
    const offset = circumference - (timeLeft / 10) * circumference;
    const isUrgent = timeLeft <= 3;
    return (
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col z-10">
        <div className="absolute top-0 left-0 w-full flex justify-around opacity-80">
           <Lantern left="22%" delay="0.2s" scale={0.7} />
           <Lantern left="45%" delay="0.5s" scale={0.8} />
           <Lantern left="68%" delay="0s" scale={0.7} />
        </div>
        {elements.map(e => ( <div key={e.id} className={e.type === 'sakura' ? 'sakura-petal' : 'fire-flake'} style={{ left: e.left, width: e.size, height: e.size, opacity: e.opacity, animation: `${e.type === 'sakura' ? 'floatPetal' : 'fallEmber'} ${e.duration} linear ${e.delay} infinite, emberFlicker 1.5s ease-in-out infinite alternate`, }} /> ))}

        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-4">
            <div className="bg-pink-900/30 border border-pink-500/30 rounded-2xl p-4 min-w-[140px] text-center backdrop-blur-md">
              <span className="text-pink-200 block text-[10px] font-asian uppercase tracking-[0.2em] mb-1">Score</span>
              <span className="text-white text-4xl font-asian tracking-widest">{score}</span>
            </div>
            {SkillBar}
          </div>
          
          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-full px-4 py-2 backdrop-blur-md text-yellow-500 font-asian text-[10px] tracking-widest uppercase">
                {coins} 🪙
              </div>
              <button onClick={() => { setShowExitConfirm(true); setIsPaused(true); }} className="pointer-events-auto bg-white/10 border border-white/20 p-2 rounded-full hover:bg-white/20 transition-all active:scale-95 group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/60 group-hover:text-yellow-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M3 3h18v18H3zM3 9h18M9 21V9" /> <path d="M12 3v6M15 21V9" /> </svg>
              </button>
              <button onMouseDown={onStartRecording} onMouseUp={onStopRecording} onTouchStart={onStartRecording} onTouchEnd={onStopRecording} className={`pointer-events-auto p-3 rounded-full transition-all active:scale-95 shadow-lg border relative ${isRecording ? 'bg-red-500 border-red-400 animate-pulse' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isRecording ? 'text-white' : 'text-white/60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /> </svg>
              </button>
              <button onClick={() => { setIsSettingsOpen(true); setIsPaused(true); }} className="pointer-events-auto bg-white/10 border border-white/20 p-2 rounded-full hover:bg-white/20 transition-all active:scale-95"> <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> </svg> </button>
              <button onClick={onToggleMute} className="pointer-events-auto bg-white/10 border border-white/20 p-2 rounded-full hover:bg-white/20 transition-all active:scale-95">
                {isMuted ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /> </svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /> </svg>}
              </button>
              <div className="bg-white/10 border border-white/20 rounded-full px-5 py-2 backdrop-blur-md flex items-center gap-3">
                <span className="text-white/60 font-asian text-[10px] tracking-widest uppercase">Hoops</span>
                <div className="flex gap-2"> {Array.from({ length: 10 }).map((_, i) => ( <div key={i} className={`w-4 h-4 rounded-full border border-white/20 transition-all ${i < hoopsLeft ? 'bg-pink-500 shadow-[0_0_12px_#ec4899]' : 'bg-white/5 opacity-20'}`} /> ))} </div>
              </div>
            </div>
            <div className="bg-indigo-900/20 border border-white/10 rounded-2xl p-4 w-48 backdrop-blur-md shadow-lg pointer-events-auto">
              <div className="flex items-center justify-between mb-3"> <span className="text-yellow-500/80 font-asian text-[10px] tracking-widest uppercase">Hall of Fame</span> <div className="w-1 h-1 rounded-full bg-yellow-500 animate-pulse" /> </div>
              <div className="space-y-1"> {leaderboard.slice(0, 5).map((entry, i) => ( <LeaderboardRow key={`${entry.name}-${entry.timestamp}`} entry={entry} rank={i + 1} /> ))} </div>
            </div>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <svg width="240" height="240" viewBox="0 0 240 240">
            <circle cx="120" cy="120" r={radius} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="4" />
            <circle cx="120" cy="120" r={radius} fill="none" stroke={isUrgent ? '#ec4899' : '#fbcfe8'} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={circumference - (timeLeft / 10) * circumference} strokeLinecap="round" className="timer-ring" transform="rotate(-90 120 120)" />
          </svg>
          <span className="absolute text-[100px] font-asian text-white glow-text">{timeLeft}</span>
        </div>
        
        <div className="mt-auto flex justify-center pb-10">
           <div className="bg-black/40 border border-white/10 rounded-3xl px-12 py-5 backdrop-blur-xl text-center">
             <span className="text-white text-sm font-asian tracking-[0.3em] uppercase block mb-1">DRAG TO AIM • RELEASE TO THROW</span>
             <span className="text-pink-200/50 text-[10px] font-asian tracking-[0.1em] uppercase block">PLAYER: {playerName || '???'}</span>
           </div>
        </div>
        {isSettingsOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 pointer-events-auto"> <div className="bg-[#1a0b2e] border border-pink-500/30 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative"> <h2 className="text-3xl font-asian text-white mb-8 text-center glow-text uppercase">Settings</h2> <div className="space-y-8"> <div className="space-y-3"> <div className="flex justify-between items-center"> <span className="text-pink-400/70 font-asian text-[10px] tracking-widest uppercase">Music Volume</span> <span className="text-white text-xs font-mono">{Math.round(settings.musicVolume * 100)}%</span> </div> <input type="range" min="0" max="1" step="0.05" value={settings.musicVolume} onChange={(e) => updateSettings({ musicVolume: parseFloat(e.target.value) })} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500" /> </div> <div className="space-y-3"> <div className="flex justify-between items-center"> <span className="text-pink-400/70 font-asian text-[10px] tracking-widest uppercase">SFX Volume</span> <span className="text-white text-xs font-mono">{Math.round(settings.sfxVolume * 100)}%</span> </div> <input type="range" min="0" max="1" step="0.05" value={settings.sfxVolume} onChange={(e) => updateSettings({ sfxVolume: parseFloat(e.target.value) })} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500" /> </div> </div> <button onClick={() => { setIsSettingsOpen(false); setIsPaused(false); }} className="w-full mt-10 py-4 bg-white/10 hover:bg-white/20 text-white font-asian text-sm tracking-[0.2em] rounded-2xl transition-all border border-white/10 uppercase">Close</button> </div> </div>}
        {showExitConfirm && <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-6 pointer-events-auto"> <div className="bg-[#1a0b2e] border-2 border-pink-500/30 w-full max-w-xs rounded-[2rem] p-8 shadow-2xl text-center"> <h2 className="text-2xl font-asian text-white mb-4 uppercase glow-text">Abandon hunt?</h2> <p className="text-white/60 text-xs font-asian tracking-widest mb-8 leading-relaxed uppercase">The market awaits your presence. All progress shall be lost to time.</p> <div className="space-y-4"> <button onClick={() => { setShowExitConfirm(false); onExit(); }} className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white font-asian text-sm tracking-[0.2em] rounded-xl transition-all border border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.3)] uppercase"> Leave </button> <button onClick={() => { setShowExitConfirm(false); setIsPaused(false); }} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 font-asian text-sm tracking-[0.2em] rounded-xl transition-all border border-white/10 uppercase"> Stay </button> </div> </div> </div>}
      </div>
    );
  }

  if (status === GameStatus.MENU) {
    const isNameValid = playerName.trim().length >= 3;
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b2e] to-[#4c0519] flex items-center justify-center z-20 overflow-hidden">
        <CalligraphyBanner />
        <div className="absolute top-0 left-0 w-full flex justify-around opacity-60">
           <Lantern left="10%" delay="0s" scale={0.9} /> <Lantern left="30%" delay="0.3s" scale={0.6} /> <Lantern left="70%" delay="0.6s" scale={0.6} /> <Lantern left="90%" delay="0.9s" scale={0.9} />
        </div>
        <div className="absolute top-6 right-6 flex gap-4 pointer-events-auto">
           <button onClick={() => { setIsShopOpen(true); setIsPaused(true); }} className="bg-yellow-600/20 border border-yellow-500/30 p-2 rounded-full hover:bg-yellow-500/40 transition-all flex items-center gap-2 px-4 group shadow-xl">
             <span className="text-yellow-500 text-sm font-asian">Shop</span>
             <span className="text-yellow-400 text-xs font-mono">{coins}🪙</span>
           </button>
           <button onClick={() => { setIsSettingsOpen(true); setIsPaused(true); }} className="bg-white/10 border border-white/20 p-2 rounded-full hover:bg-white/20 transition-all"> <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> </svg> </button>
           <button onClick={onToggleMute} className="bg-white/10 border border-white/20 p-2 rounded-full hover:bg-white/20 transition-all"> {isMuted ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /> </svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /> </svg>} </button>
        </div>
        <div className="relative p-8 text-center max-w-2xl w-full flex flex-col items-center">
          <div className="mb-2 animate-pulse">
            <span className="text-xl md:text-2xl text-pink-200/90 font-asian glow-text uppercase tracking-[0.15em]">
              Presented by: <span className="text-yellow-500">趙浩然</span>
            </span>
          </div>
          <h1 className="text-6xl md:text-8xl text-white font-asian font-bold mb-4 tracking-tight glow-text uppercase"> RING THE<br/><span className="text-pink-500">GOOSE</span> </h1>
          <div className="w-full max-w-xs mb-8 pointer-events-auto">
            <p className="text-pink-400 font-asian text-[10px] tracking-[0.3em] uppercase mb-3 text-center">Enter Thy Name</p>
            <input type="text" maxLength={12} value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="YOUR NAME..." className="w-full bg-black/40 border-2 border-pink-500/20 rounded-2xl px-6 py-4 text-white font-asian text-center focus:border-pink-500 focus:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all outline-none placeholder:text-white/10" />
          </div>
          <button onClick={onStart} disabled={!isNameValid} className={`group relative px-16 py-6 font-bold tracking-[0.3em] transition-all rounded-full border border-pink-400/50 pointer-events-auto ${isNameValid ? 'bg-pink-600 text-white hover:bg-pink-500 hover:scale-105 active:scale-95 shadow-[0_0_80px_rgba(236,72,153,0.4)]' : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed grayscale'}`}> <span className="font-asian text-3xl">Play Game</span> </button>
          <div className="mt-12 bg-indigo-900/10 border border-white/5 rounded-[2rem] p-6 backdrop-blur-sm w-full max-w-sm"> <h3 className="text-yellow-500/60 font-asian text-[10px] tracking-widest uppercase mb-4">Global Hall of Fame</h3> <div className="space-y-1"> {leaderboard.slice(0, 5).map((entry, i) => ( <LeaderboardRow key={`menu-${entry.name}-${entry.timestamp}`} entry={entry} rank={i + 1} /> ))} </div> </div>
        </div>
        {ShopModal}
        {isSettingsOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 pointer-events-auto"> <div className="bg-[#1a0b2e] border border-pink-500/30 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative"> <h2 className="text-3xl font-asian text-white mb-8 text-center glow-text uppercase">Settings</h2> <div className="space-y-8"> <div className="space-y-3"> <div className="flex justify-between items-center"> <span className="text-pink-400/70 font-asian text-[10px] tracking-widest uppercase">Music Volume</span> <span className="text-white text-xs font-mono">{Math.round(settings.musicVolume * 100)}%</span> </div> <input type="range" min="0" max="1" step="0.05" value={settings.musicVolume} onChange={(e) => updateSettings({ musicVolume: parseFloat(e.target.value) })} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500" /> </div> <div className="space-y-3"> <div className="flex justify-between items-center"> <span className="text-pink-400/70 font-asian text-[10px] tracking-widest uppercase">SFX Volume</span> <span className="text-white text-xs font-mono">{Math.round(settings.sfxVolume * 100)}%</span> </div> <input type="range" min="0" max="1" step="0.05" value={settings.sfxVolume} onChange={(e) => updateSettings({ sfxVolume: parseFloat(e.target.value) })} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500" /> </div> </div> <button onClick={() => { setIsSettingsOpen(false); setIsPaused(false); }} className="w-full mt-10 py-4 bg-white/10 hover:bg-white/20 text-white font-asian text-sm tracking-[0.2em] rounded-2xl transition-all border border-white/10 uppercase">Close</button> </div> </div>}
      </div>
    );
  }

  if (status === GameStatus.GAME_OVER) {
    return (
      <div className="absolute inset-0 bg-[#0f172a]/95 flex items-center justify-center z-20">
        <div className="p-16 text-center flex flex-col items-center max-w-md w-full border border-pink-500/20 bg-white/5 backdrop-blur-2xl rounded-[3rem] shadow-2xl relative">
          <h2 className="text-5xl font-asian text-white mb-8 uppercase glow-text">Game Over</h2>
          <div className="w-full space-y-4 mb-8">
            <div className="flex justify-between border-b border-white/5 pb-2"> <span className="text-pink-400/50 text-[10px] font-asian tracking-widest uppercase">Player</span> <span className="text-white font-asian">{playerName}</span> </div>
            <div className="flex justify-between border-b border-white/5 pb-2"> <span className="text-pink-400/50 text-[10px] font-asian tracking-widest uppercase">Score</span> <span className="text-4xl font-bold text-white">{score}</span> </div>
            <div className="flex justify-between border-b border-white/5 pb-2"> <span className="text-yellow-500/50 text-[10px] font-asian tracking-widest uppercase">Earned Chips</span> <span className="text-2xl font-bold text-yellow-500">+{Math.floor(score/5)} 🪙</span> </div>
          </div>
          <button onClick={onRestart} className="w-full py-6 bg-pink-600 text-white font-asian text-2xl hover:bg-pink-500 transition-all rounded-full shadow-lg border border-pink-400"> Play Again </button>
        </div>
      </div>
    );
  }
  return null;
};

export default GameOverlay;
