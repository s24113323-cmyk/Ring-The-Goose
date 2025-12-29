
import React, { useState, useEffect, useRef } from 'react';
import GameEngine from './components/GameEngine';
import GameOverlay from './components/GameOverlay';
import { GameStatus, GameSettings, GraphicsQuality, LeaderboardEntry, Inventory, SkillType, ActiveSkills } from './types';
import { MAX_HOOPS, BGM_URL, AMBIENT_URL, TURN_TIME_LIMIT, SFX_MIC_ON, SFX_MIC_OFF, SFX_UI_POP, SKILL_DURATIONS, SFX_COIN } from './constants';
import { GoogleGenAI } from "@google/genai";

const SETTINGS_KEY = 'ring_the_goose_settings';
const PLAYER_NAME_KEY = 'ring_the_goose_player_name';
const LEADERBOARD_KEY = 'ring_the_goose_global_leaderboard';
const COINS_KEY = 'ring_the_goose_coins';
const INVENTORY_KEY = 'ring_the_goose_inventory';

const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.4,
  sfxVolume: 0.7,
  graphicsQuality: GraphicsQuality.HIGH,
  showTrajectory: true,
};

const DEFAULT_INVENTORY: Inventory = {
  freeze: 0,
  slow: 0,
  lure: 0
};

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hoopsLeft, setHoopsLeft] = useState(MAX_HOOPS);
  const [isMuted, setIsMuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(PLAYER_NAME_KEY) || '');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  
  // Economy & Shop
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem(COINS_KEY) || '0'));
  const [inventory, setInventory] = useState<Inventory>(() => {
    const saved = localStorage.getItem(INVENTORY_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_INVENTORY;
  });
  const [activeSkills, setActiveSkills] = useState<ActiveSkills>({ freeze: 0, slow: 0, lure: 0 });

  // Transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const playSFX = (url: string) => {
    const audio = new Audio(url);
    audio.volume = settings.sfxVolume;
    audio.play().catch((err) => console.warn("SFX play blocked or failed:", err));
  };

  // Persistence
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(PLAYER_NAME_KEY, playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem(COINS_KEY, coins.toString());
  }, [coins]);

  useEffect(() => {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  }, [inventory]);

  // Skill timer update
  useEffect(() => {
    let interval: number;
    if (status === GameStatus.PLAYING && !isPaused) {
      interval = window.setInterval(() => {
        setActiveSkills(prev => ({
          freeze: Math.max(0, prev.freeze - 100),
          slow: Math.max(0, prev.slow - 100),
          lure: Math.max(0, prev.lure - 100),
        }));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status, isPaused]);

  const fetchLeaderboard = () => {
    const saved = localStorage.getItem(LEADERBOARD_KEY);
    if (saved) {
      setLeaderboard(JSON.parse(saved));
    } else {
      const mockData: LeaderboardEntry[] = [
        { name: 'Sifu_Goose', score: 120, timestamp: Date.now() },
        { name: 'NightMarketFan', score: 85, timestamp: Date.now() },
        { name: 'LuckyCharm', score: 60, timestamp: Date.now() },
        { name: 'WaddleKing', score: 45, timestamp: Date.now() },
        { name: 'LanternLight', score: 30, timestamp: Date.now() },
      ];
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(mockData));
      setLeaderboard(mockData);
    }
  };

  const submitScore = (finalScore: number) => {
    if (finalScore <= 0 || !playerName.trim()) return;
    const earnedCoins = Math.floor(finalScore / 5);
    if (earnedCoins > 0) {
      setCoins(prev => prev + earnedCoins);
      playSFX(SFX_COIN);
    }

    const saved = localStorage.getItem(LEADERBOARD_KEY);
    let currentLeaderboard: LeaderboardEntry[] = saved ? JSON.parse(saved) : [];
    currentLeaderboard.push({ name: playerName.trim(), score: finalScore, timestamp: Date.now() });
    currentLeaderboard.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
    const updatedLeaderboard = currentLeaderboard.slice(0, 10);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updatedLeaderboard));
    setLeaderboard(updatedLeaderboard);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [status]);

  useEffect(() => {
    const initAudio = (url: string) => {
      const audio = new Audio(url);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0; 
      return audio;
    };
    musicRef.current = initAudio(BGM_URL);
    ambientRef.current = initAudio(AMBIENT_URL);
    return () => {
      musicRef.current?.pause();
      ambientRef.current?.pause();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.muted = isMuted;
      musicRef.current.volume = (isMuted || isPaused) ? 0 : settings.musicVolume;
    }
    if (ambientRef.current) {
      ambientRef.current.muted = isMuted;
      ambientRef.current.volume = isMuted ? 0 : settings.musicVolume * 0.7;
    }
  }, [isMuted, isPaused, settings.musicVolume]);

  useEffect(() => {
    if (status === GameStatus.PLAYING && !isPaused && activeSkills.freeze <= 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeout();
            return TURN_TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, hoopsLeft, isPaused, activeSkills.freeze]);

  const handleTimeout = () => {
    if (status !== GameStatus.PLAYING) return;
    setStreak(0);
    handleHoopThrow();
  };

  const handleStart = () => {
    if (!playerName.trim()) return;
    setScore(0);
    setStreak(0);
    setHoopsLeft(MAX_HOOPS);
    setTimeLeft(TURN_TIME_LIMIT);
    setIsPaused(false);
    setActiveSkills({ freeze: 0, slow: 0, lure: 0 });
    setStatus(GameStatus.PLAYING);
    if (musicRef.current) musicRef.current.play().catch(() => {});
    if (ambientRef.current) ambientRef.current.play().catch(() => {});
  };

  const handleExit = () => {
    setScore(0);
    setStreak(0);
    setHoopsLeft(MAX_HOOPS);
    setIsPaused(false);
    setStatus(GameStatus.MENU);
    fetchLeaderboard();
  };

  // Fix: Added handleToggleMute to handle audio muting logic
  const handleToggleMute = () => {
    setIsMuted(prev => !prev);
    playSFX(SFX_UI_POP);
  };

  // Fix: Added updateSettings to allow partial settings updates
  const updateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const useSkill = (type: SkillType) => {
    if (status !== GameStatus.PLAYING || inventory[type] <= 0 || isPaused) return;
    setInventory(prev => ({ ...prev, [type]: prev[type] - 1 }));
    setActiveSkills(prev => ({ ...prev, [type]: SKILL_DURATIONS[type] }));
    playSFX(SFX_UI_POP);
  };

  const buySkill = (type: SkillType, cost: number) => {
    if (coins < cost) return;
    setCoins(prev => prev - cost);
    setInventory(prev => ({ ...prev, [type]: prev[type] + 1 }));
    playSFX(SFX_UI_POP);
  };

  const handleScoreUpdate = (points: number, isHit: boolean) => {
    if (status !== GameStatus.PLAYING || isPaused) return;
    if (isHit) {
      const multiplier = Math.min(streak + 1, 5); 
      setScore(prev => prev + (points * multiplier));
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }
  };

  const handleHoopThrow = () => {
    if (status !== GameStatus.PLAYING || isPaused) return;
    if (hoopsLeft <= 0) return;
    setTimeLeft(TURN_TIME_LIMIT);
    setHoopsLeft(prev => {
      const newVal = prev - 1;
      if (newVal <= 0) {
        setTimeout(() => {
            setStatus(current => {
              if (current === GameStatus.PLAYING) {
                setScore(finalScore => {
                  submitScore(finalScore);
                  return finalScore;
                });
                return GameStatus.GAME_OVER;
              }
              return current;
            });
        }, 1800); 
      }
      return newVal;
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setTranscription(null);
      playSFX(SFX_MIC_ON);
    } catch (err) { console.error(err); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      playSFX(SFX_MIC_OFF);
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { mimeType: 'audio/webm', data: base64Data } },
              { text: "Accurately transcribe the audio. If the player says words like 'freeze', 'slow', or 'lure', ensure they are captured. Only return the text." }
            ],
          },
        });
        const text = response.text?.toLowerCase() || "";
        setTranscription(text);
        if (text.includes("freeze")) useSkill("freeze");
        else if (text.includes("slow")) useSkill("slow");
        else if (text.includes("lure")) useSkill("lure");
        setIsTranscribing(false);
        playSFX(SFX_UI_POP);
        setTimeout(() => setTranscription(null), 5000);
      };
    } catch (error) { setIsTranscribing(false); }
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden select-none">
      <GameEngine 
        status={status}
        setStatus={setStatus}
        onScoreUpdate={handleScoreUpdate}
        onHoopThrow={handleHoopThrow}
        settings={settings}
        isPaused={isPaused}
        activeSkills={activeSkills}
      />
      <GameOverlay 
        status={status}
        score={score}
        streak={streak}
        hoopsLeft={hoopsLeft}
        isMuted={isMuted}
        timeLeft={timeLeft}
        playerName={playerName}
        setPlayerName={setPlayerName}
        leaderboard={leaderboard}
        onToggleMute={handleToggleMute}
        onStart={handleStart}
        onRestart={handleStart}
        onExit={handleExit}
        setIsPaused={setIsPaused}
        isPaused={isPaused}
        settings={settings}
        updateSettings={updateSettings}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        transcription={transcription}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        coins={coins}
        inventory={inventory}
        onUseSkill={useSkill}
        onBuySkill={buySkill}
        activeSkills={activeSkills}
      />
    </div>
  );
};

export default App;
