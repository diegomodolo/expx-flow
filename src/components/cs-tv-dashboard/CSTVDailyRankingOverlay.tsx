import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, X, Crown, Medal, Star, MessageCircle, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface RankingAttendant {
  id: string;
  name: string;
  avatarUrl: string | null;
  averageScore: number | null;
  activeConversations: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  averageResponseTimeMinutes: number | null;
  messagesSent: number;
}

interface CSTVDailyRankingOverlayProps {
  ranking: RankingAttendant[];
  isVisible: boolean;
  onClose: () => void;
  rotation?: number;
  zoom?: number;
}

const DISPLAY_DURATION_SECONDS = 90;
const CONFETTI_COUNT = 200;

interface Confetti {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

export function CSTVDailyRankingOverlay({ 
  ranking, 
  isVisible, 
  onClose, 
  rotation = 0, 
  zoom = 100 
}: CSTVDailyRankingOverlayProps) {
  const [countdown, setCountdown] = useState(DISPLAY_DURATION_SECONDS);
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const audioPlayedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Generate confetti when visible
  useEffect(() => {
    if (isVisible) {
      const colors = ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF', '#FF69B4', '#9370DB', '#FFE135'];
      const newConfetti: Confetti[] = [];
      
      for (let i = 0; i < CONFETTI_COUNT; i++) {
        newConfetti.push({
          id: i,
          x: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 5,
          duration: 4 + Math.random() * 3,
          size: 8 + Math.random() * 10,
        });
      }
      
      setConfetti(newConfetti);
      setCountdown(DISPLAY_DURATION_SECONDS);
    }
  }, [isVisible]);

  // Play victory theme when overlay appears
  useEffect(() => {
    if (isVisible && !audioPlayedRef.current) {
      audioPlayedRef.current = true;
      playVictoryTheme();
    }
    
    if (!isVisible) {
      audioPlayedRef.current = false;
      // Stop audio if still playing
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  }, [isVisible]);

  // Countdown timer
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onClose();
          return DISPLAY_DURATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, onClose]);

  const playVictoryTheme = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const MELODY_DURATION = 8; // Duration of one complete melody cycle in seconds
      
      const playMelodyCycle = (cycleStart: number) => {
        // Ayrton Senna's Victory Theme - Main melody notes (approximation)
        const playNote = (freq: number, start: number, duration: number, gain: number = 0.15) => {
          const osc = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          const filter = audioContext.createBiquadFilter();
          
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          
          filter.type = 'lowpass';
          filter.frequency.value = 2000;
          
          const now = audioContext.currentTime + cycleStart + start;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(gain, now + 0.05);
          gainNode.gain.setValueAtTime(gain, now + duration * 0.7);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
          
          osc.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          osc.start(now);
          osc.stop(now + duration);
        };

        const playChime = (freq: number, start: number) => {
          const osc = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          osc.type = 'sine';
          osc.frequency.value = freq;
          
          const now = audioContext.currentTime + cycleStart + start;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.06, now + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          
          osc.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          osc.start(now);
          osc.stop(now + 0.8);
        };

        // Fanfare intro - triumphant brass-like sound
        playNote(392, 0, 0.3, 0.18);      // G4
        playNote(493.88, 0.15, 0.3, 0.18); // B4
        playNote(587.33, 0.3, 0.3, 0.18);  // D5
        playNote(783.99, 0.45, 0.5, 0.22); // G5 (held longer)
        
        // Second phrase - higher
        playNote(880, 0.9, 0.25, 0.18);    // A5
        playNote(783.99, 1.1, 0.25, 0.18); // G5
        playNote(659.25, 1.3, 0.25, 0.18); // E5
        playNote(587.33, 1.5, 0.4, 0.22); // D5 (held)
        
        // Victory resolution
        playNote(392, 2.0, 0.2, 0.16);    // G4
        playNote(493.88, 2.15, 0.2, 0.16); // B4
        playNote(587.33, 2.3, 0.2, 0.16);  // D5
        playNote(783.99, 2.45, 0.6, 0.2); // G5
        playNote(987.77, 2.6, 0.8, 0.22);  // B5 (triumph!)
        
        // Triumphant chord (G major)
        playNote(392, 3.4, 1.2, 0.1);     // G4
        playNote(493.88, 3.4, 1.2, 0.1);  // B4
        playNote(587.33, 3.4, 1.2, 0.1);  // D5
        playNote(783.99, 3.4, 1.2, 0.12);  // G5
        
        // Bridge section - variation
        playNote(659.25, 4.8, 0.25, 0.16); // E5
        playNote(587.33, 5.0, 0.25, 0.16); // D5
        playNote(523.25, 5.2, 0.25, 0.16); // C5
        playNote(493.88, 5.4, 0.4, 0.18);  // B4
        
        // Final fanfare
        playNote(392, 6.0, 0.2, 0.16);    // G4
        playNote(587.33, 6.15, 0.2, 0.16); // D5
        playNote(783.99, 6.3, 0.5, 0.2);  // G5
        playNote(987.77, 6.5, 0.8, 0.22); // B5
        
        // Sparkle chimes
        playChime(2093, 0.5);
        playChime(2637, 0.7);
        playChime(3136, 0.9);
        playChime(2093, 2.7);
        playChime(2637, 2.9);
        playChime(3136, 3.1);
        playChime(2349, 5.5);
        playChime(2793, 5.7);
      };
      
      // Create continuous applause for the entire duration
      const createContinuousApplause = () => {
        const duration = DISPLAY_DURATION_SECONDS;
        const bufferSize = audioContext.sampleRate * duration;
        const noiseBuffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
          const output = noiseBuffer.getChannelData(channel);
          for (let i = 0; i < bufferSize; i++) {
            const time = i / audioContext.sampleRate;
            // Variable clapping pattern with fade in/out
            const fadeIn = Math.min(1, time / 2);
            const fadeOut = Math.min(1, (duration - time) / 3);
            const envelope = fadeIn * fadeOut;
            const clapPattern = Math.pow(Math.sin(time * 8 * Math.PI) * 0.5 + 0.5, 0.3);
            output[i] = (Math.random() * 2 - 1) * clapPattern * envelope;
          }
        }
        
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        const bandpass = audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 2500;
        bandpass.Q.value = 0.5;
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.12;
        
        noiseSource.connect(bandpass);
        bandpass.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        noiseSource.start(audioContext.currentTime);
        noiseSource.stop(audioContext.currentTime + duration);
      };
      
      // Start continuous applause
      createContinuousApplause();
      
      // Play melody in a loop
      const totalCycles = Math.ceil(DISPLAY_DURATION_SECONDS / MELODY_DURATION);
      for (let i = 0; i < totalCycles; i++) {
        playMelodyCycle(i * MELODY_DURATION);
      }
      
    } catch (error) {
      console.error('Error playing victory theme:', error);
    }
  }, []);

  const formatTime = (minutes: number | null): string => {
    if (minutes === null) return '--';
    if (minutes < 1) return '<1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getBrasiliaDate = (): string => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brasilia = new Date(utc - (3 * 60 * 60 * 1000));
    
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    return `${days[brasilia.getDay()]}, ${brasilia.getDate()} de ${months[brasilia.getMonth()]}`;
  };

  if (!isVisible || ranking.length === 0) return null;

  const winner = ranking[0];
  const secondPlace = ranking[1];
  const thirdPlace = ranking[2];
  const firstName = winner.name.split(' ')[0];

  const getContentStyle = (): React.CSSProperties => {
    const transforms: string[] = [];
    
    if (rotation !== 0) {
      transforms.push(`rotate(${rotation}deg)`);
    }
    
    if (zoom !== 100) {
      transforms.push(`scale(${zoom / 100})`);
    }
    
    return {
      transform: transforms.length > 0 ? transforms.join(' ') : undefined,
      transformOrigin: 'center center',
    };
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md animate-in fade-in duration-500 overflow-hidden">
      <div 
        className="w-full h-full flex items-center justify-center"
        style={getContentStyle()}
      >
        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confetti.map((c) => (
            <div
              key={c.id}
              className="absolute animate-confetti"
              style={{
                left: `${c.x}%`,
                top: '-20px',
                width: `${c.size}px`,
                height: `${c.size}px`,
                backgroundColor: c.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
              }}
            />
          ))}
        </div>

        {/* Golden radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent" />
        
        {/* Floating stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <Star
              key={i}
              className="absolute text-amber-400/50 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${20 + Math.random() * 30}px`,
                height: `${20 + Math.random() * 30}px`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
              fill="currentColor"
            />
          ))}
        </div>

        {/* Main container */}
        <div className="relative w-full max-w-5xl mx-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Trophy className="h-12 w-12 text-amber-400 animate-bounce" />
              <div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 uppercase tracking-wider">
                  🏆 Ranking do Dia
                </h1>
                <p className="text-amber-200/80 text-lg">
                  17:00 - {getBrasiliaDate()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/10 px-4 py-2 rounded-full">
                <span className="text-white text-lg font-medium">
                  Fecha em {countdown}s
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Winner Card */}
          <div className="bg-gradient-to-br from-amber-500/30 via-yellow-500/20 to-amber-600/30 border-4 border-amber-400 rounded-3xl p-8 mb-6 relative overflow-hidden shadow-2xl shadow-amber-500/30">
            {/* Crown decoration */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <Crown className="h-16 w-16 text-amber-400 fill-amber-400 drop-shadow-lg" />
            </div>
            
            <div className="flex items-center gap-8 mt-6">
              {/* Avatar */}
              <div className="relative">
                <div className="absolute inset-0 bg-amber-400 rounded-full animate-pulse blur-xl opacity-50" />
                <Avatar className="h-40 w-40 border-4 border-amber-400 shadow-2xl relative">
                  <AvatarImage src={winner.avatarUrl || undefined} />
                  <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-amber-500 to-yellow-600 text-white">
                    {getInitials(winner.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white text-2xl font-black px-4 py-1 rounded-full shadow-lg">
                  1º
                </div>
              </div>
              
              {/* Info */}
              <div className="flex-1">
                <p className="text-amber-300 text-lg uppercase tracking-wider mb-1">Campeã do Dia</p>
                <h2 className="text-5xl font-black text-white mb-2">{winner.name}</h2>
                <p className="text-2xl text-amber-200 italic mb-4">
                  "Parabéns, {firstName}! Você é a campeã de atendimento de hoje! 🏆"
                </p>
                
                {/* Score */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-amber-300/80 text-sm uppercase">Nota Média</p>
                    <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
                      {winner.averageScore?.toFixed(1) || '--'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-8 h-8 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <MessageCircle className="h-6 w-6 text-amber-300 mx-auto mb-1" />
                  <p className="text-3xl font-bold text-white">{winner.activeConversations}</p>
                  <p className="text-amber-200/80 text-sm">Conversas</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Clock className="h-6 w-6 text-amber-300 mx-auto mb-1" />
                  <p className="text-3xl font-bold text-white">{formatTime(winner.averageResponseTimeMinutes)}</p>
                  <p className="text-amber-200/80 text-sm">Tempo Médio</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center col-span-2">
                  <TrendingUp className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-emerald-400 font-bold">+{winner.positiveCount}</span>
                    <span className="text-amber-300 font-bold">{winner.neutralCount}</span>
                    <span className="text-red-400 font-bold">{winner.negativeCount}</span>
                  </div>
                  <p className="text-amber-200/80 text-sm">Sentimento</p>
                </div>
              </div>
            </div>
          </div>

          {/* Second and Third Place */}
          <div className="grid grid-cols-2 gap-6">
            {/* Second Place */}
            {secondPlace && (
              <div className="bg-gradient-to-br from-slate-400/20 to-slate-500/10 border-2 border-slate-400 rounded-2xl p-6 relative">
                <Medal className="absolute top-4 right-4 h-8 w-8 text-slate-300" />
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-2 border-slate-400">
                      <AvatarImage src={secondPlace.avatarUrl || undefined} />
                      <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-slate-400 to-slate-500 text-white">
                        {getInitials(secondPlace.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-slate-400 text-white text-sm font-black px-2 py-0.5 rounded-full">
                      2º
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-300 text-sm uppercase">Vice-Campeã</p>
                    <h3 className="text-2xl font-bold text-white">{secondPlace.name}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-3xl font-black text-slate-300">
                        {secondPlace.averageScore?.toFixed(1) || '--'}
                      </span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-300">{secondPlace.activeConversations} conversas</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Third Place */}
            {thirdPlace && (
              <div className="bg-gradient-to-br from-amber-700/20 to-amber-800/10 border-2 border-amber-700 rounded-2xl p-6 relative">
                <Medal className="absolute top-4 right-4 h-8 w-8 text-amber-600" />
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-2 border-amber-700">
                      <AvatarImage src={thirdPlace.avatarUrl || undefined} />
                      <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-amber-600 to-amber-700 text-white">
                        {getInitials(thirdPlace.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-amber-700 text-white text-sm font-black px-2 py-0.5 rounded-full">
                      3º
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-600 text-sm uppercase">Terceiro Lugar</p>
                    <h3 className="text-2xl font-bold text-white">{thirdPlace.name}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-3xl font-black text-amber-600">
                        {thirdPlace.averageScore?.toFixed(1) || '--'}
                      </span>
                      <span className="text-amber-700">|</span>
                      <span className="text-amber-600">{thirdPlace.activeConversations} conversas</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .animate-confetti {
          animation: confetti-fall linear infinite;
        }
      `}</style>
    </div>
  );
}
