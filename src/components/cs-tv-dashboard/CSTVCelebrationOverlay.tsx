import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, X, User, MessageCircle, Sparkles, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CelebrationAlert {
  id: string;
  conversationId: string;
  contactName: string;
  contactPhone: string;
  clientName: string | null;
  attendantId: string | null;
  attendantName: string | null;
  squadName: string | null;
  score: number;
  temperature: string;
  interpretation: string | null;
  lastClientMessage: string | null;
  analyzedAt: string;
}

interface CSTVCelebrationOverlayProps {
  alerts: CelebrationAlert[];
  onDismiss: (alertId: string) => void;
  onDismissAll: () => void;
  rotation?: number;
}

const SLIDE_DURATION_SECONDS = 30;
const CONFETTI_COUNT = 150;

interface Confetti {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

export function CSTVCelebrationOverlay({ alerts, onDismiss, onDismissAll, rotation = 0 }: CSTVCelebrationOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideCountdown, setSlideCountdown] = useState(SLIDE_DURATION_SECONDS);
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const celebrationPlayedRef = useRef(false);
  const [viewedSlides, setViewedSlides] = useState<Set<number>>(new Set([0]));

  // Generate confetti
  useEffect(() => {
    if (alerts.length > 0) {
      const colors = ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF', '#FF69B4', '#9370DB'];
      const newConfetti: Confetti[] = [];
      
      for (let i = 0; i < CONFETTI_COUNT; i++) {
        newConfetti.push({
          id: i,
          x: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 3,
          duration: 3 + Math.random() * 2,
          size: 8 + Math.random() * 8,
        });
      }
      
      setConfetti(newConfetti);
    }
  }, [alerts.length]);

  // Play celebration sound ONCE when alerts first appear
  useEffect(() => {
    if (alerts.length > 0 && !celebrationPlayedRef.current) {
      celebrationPlayedRef.current = true;
      playCelebrationSound();
    }
    
    // Reset when no alerts
    if (alerts.length === 0) {
      celebrationPlayedRef.current = false;
    }
  }, [alerts.length]);

  // Auto-advance slides every 30 seconds, only dismiss after all viewed
  useEffect(() => {
    if (alerts.length === 0) {
      setSlideCountdown(SLIDE_DURATION_SECONDS);
      setViewedSlides(new Set([0]));
      return;
    }

    const interval = setInterval(() => {
      setSlideCountdown(prev => {
        if (prev <= 1) {
          // Time to advance to next slide
          setCurrentIndex(currentIdx => {
            const nextIndex = (currentIdx + 1) % alerts.length;
            setViewedSlides(viewed => {
              const newViewed = new Set(viewed);
              newViewed.add(nextIndex);
              
              // If all slides have been viewed and we're going back to 0, dismiss all
              if (newViewed.size >= alerts.length && nextIndex === 0) {
                setTimeout(() => onDismissAll(), 100);
              }
              return newViewed;
            });
            return nextIndex;
          });
          return SLIDE_DURATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [alerts.length, onDismissAll]);

  // Reset when new alerts appear
  useEffect(() => {
    if (alerts.length > 0) {
      setSlideCountdown(SLIDE_DURATION_SECONDS);
      setCurrentIndex(0);
      setViewedSlides(new Set([0]));
    }
  }, [alerts.length]);

  const playCelebrationSound = async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create applause using white noise with filtering
      const createApplause = (startTime: number, duration: number, intensity: number = 0.3) => {
        const bufferSize = audioContext.sampleRate * duration;
        const noiseBuffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);
        
        // Generate noise with clapping pattern
        for (let channel = 0; channel < 2; channel++) {
          const output = noiseBuffer.getChannelData(channel);
          for (let i = 0; i < bufferSize; i++) {
            // Create rhythmic clapping pattern
            const time = i / audioContext.sampleRate;
            const clapFreq = 8 + Math.sin(time * 2) * 2; // Variable clapping speed
            const clapPattern = Math.pow(Math.sin(time * clapFreq * Math.PI) * 0.5 + 0.5, 0.3);
            output[i] = (Math.random() * 2 - 1) * clapPattern;
          }
        }
        
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Bandpass filter to make it sound more like clapping
        const bandpass = audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 2000;
        bandpass.Q.value = 0.5;
        
        // High-pass to remove rumble
        const highpass = audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 500;
        
        // Gain envelope
        const gainNode = audioContext.createGain();
        const now = audioContext.currentTime + startTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(intensity, now + 0.1);
        gainNode.gain.setValueAtTime(intensity, now + duration - 0.3);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
        
        noiseSource.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        noiseSource.start(now);
        noiseSource.stop(now + duration);
      };
      
      // Create a celebratory chime
      const playChime = (frequency: number, startTime: number, duration: number, gain: number = 0.15) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTime);
        
        const now = audioContext.currentTime + startTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(gain, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
      };
      
      // Applause sound (3 seconds)
      createApplause(0, 3, 0.25);
      
      // Victory chimes overlay
      playChime(1046.50, 0.1, 0.8);   // C6
      playChime(1318.51, 0.2, 0.6);   // E6
      playChime(1567.98, 0.3, 0.8);   // G6
      playChime(2093.00, 0.5, 1.2);   // C7 (triumph!)
      
      // Second wave of chimes
      playChime(1046.50, 1.0, 0.5, 0.1);
      playChime(1318.51, 1.1, 0.5, 0.1);
      playChime(1567.98, 1.2, 0.5, 0.1);
      playChime(2093.00, 1.4, 1.0, 0.12);
      
      setTimeout(() => {
        audioContext.close();
      }, 4000);
      
    } catch (error) {
      console.error('Error playing celebration sound:', error);
    }
  };

  // Calculate total remaining time
  const slidesRemaining = alerts.length - viewedSlides.size;
  const totalRemainingSeconds = slideCountdown + (slidesRemaining * SLIDE_DURATION_SECONDS);

  if (alerts.length === 0) return null;

  const currentAlert = alerts[currentIndex] || alerts[0];
  if (!currentAlert) return null;

  const isRotated = rotation === 90 || rotation === 270;

  // Estilos para o conteúdo interno rotacionado
  const getContentStyle = () => {
    if (rotation === 0) return {};
    
    return {
      transform: `rotate(${rotation}deg)`,
      transformOrigin: 'center center',
      width: isRotated ? '100vh' : '100vw',
      height: isRotated ? '100vw' : '100vh',
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 overflow-hidden">
      {/* Container que aplica a rotação ao conteúdo */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
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
        
        {/* Glowing background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-emerald-500/10 to-amber-500/10 animate-pulse" />
        
        {/* Floating stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <Star
              key={i}
              className="absolute text-amber-400/60 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${16 + Math.random() * 24}px`,
                height: `${16 + Math.random() * 24}px`,
                animationDelay: `${Math.random() * 2}s`,
              }}
              fill="currentColor"
            />
          ))}
        </div>
        
        {/* Main alert container */}
        <div className="relative w-full max-w-4xl mx-4 bg-gradient-to-br from-background via-background to-amber-900/10 border-4 border-amber-500 rounded-2xl shadow-2xl overflow-hidden shadow-amber-500/30">
        {/* Golden header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-white animate-bounce" />
            <span className="text-2xl font-bold text-white uppercase tracking-wider">
              🎉 ATENDIMENTO NOTA 10! 🏆
            </span>
            <Sparkles className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div className="flex items-center gap-4">
            {/* Countdown timer */}
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
              <span className="text-white text-sm font-medium">
                {alerts.length > 1 
                  ? `Próximo em ${slideCountdown}s` 
                  : `Fecha em ${slideCountdown}s`}
              </span>
            </div>
            {alerts.length > 1 && (
              <span className="text-white/80 text-sm">
                {currentIndex + 1} de {alerts.length}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onDismissAll}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
        
        {/* Alert content */}
        <div className="p-8 space-y-6">
          {/* Contact, attendant and squad info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cliente</p>
                <p className="text-lg font-bold text-foreground">{currentAlert.contactName}</p>
                {currentAlert.clientName && (
                  <p className="text-sm text-muted-foreground">{currentAlert.clientName}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Atendente</p>
                <p className="text-lg font-bold text-foreground">
                  {currentAlert.attendantName || 'Não atribuído'}
                </p>
                <p className="text-sm text-emerald-500 font-medium">⭐ Excelente trabalho!</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Squad</p>
                <p className="text-lg font-bold text-foreground">
                  {currentAlert.squadName || 'Sem squad'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Score display */}
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
              Nota da Análise de IA
            </p>
            <div className="inline-flex items-center gap-4">
              <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 animate-pulse">
                {currentAlert.score.toFixed(1)}
              </span>
              <span className="text-4xl text-muted-foreground">/10</span>
            </div>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-8 h-8 text-amber-400 fill-amber-400" />
              ))}
            </div>
          </div>
          
          {/* Last client message */}
          {currentAlert.lastClientMessage && (
            <div className="p-6 bg-muted/30 border border-muted rounded-xl">
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium mb-3">
                💬 Última Mensagem do Cliente
              </p>
              <p className="text-lg text-foreground leading-relaxed italic">
                "{currentAlert.lastClientMessage}"
              </p>
            </div>
          )}
          
          {/* AI Analysis */}
          {currentAlert.interpretation && (
            <div className="p-6 bg-gradient-to-r from-emerald-500/5 to-amber-500/5 border border-emerald-500/20 rounded-xl">
              <p className="text-sm text-emerald-500 uppercase tracking-wider font-medium mb-3">
                🎯 Análise da IA - Por que Nota 10?
              </p>
              <p className="text-lg text-foreground leading-relaxed">
                {currentAlert.interpretation}
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onDismiss(currentAlert.id)}
              className="px-8 border-amber-500/50 hover:bg-amber-500/10"
            >
              Celebrar! 🎉
            </Button>
            {alerts.length > 1 && (
              <Button
                size="lg"
                onClick={onDismissAll}
                className="px-8 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
              >
                Ver Todos ({alerts.length})
              </Button>
            )}
          </div>
        </div>
        
        {/* Alert indicators */}
        {alerts.length > 1 && (
          <div className="flex items-center justify-center gap-2 pb-6">
            {alerts.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  index === currentIndex 
                    ? "bg-amber-500 scale-125" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        )}
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
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}
