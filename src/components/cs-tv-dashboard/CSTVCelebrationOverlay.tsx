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
}

const AUTO_DISMISS_SECONDS = 30;
const CONFETTI_COUNT = 150;

interface Confetti {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

export function CSTVCelebrationOverlay({ alerts, onDismiss, onDismissAll }: CSTVCelebrationOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS);
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const celebrationPlayedRef = useRef(false);

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

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (alerts.length === 0) {
      setCountdown(AUTO_DISMISS_SECONDS);
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onDismissAll();
          return AUTO_DISMISS_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [alerts.length, onDismissAll]);

  // Reset countdown when new alerts appear
  useEffect(() => {
    if (alerts.length > 0) {
      setCountdown(AUTO_DISMISS_SECONDS);
    }
  }, [alerts.length]);

  const playCelebrationSound = async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a celebratory fanfare
      const playNote = (frequency: number, startTime: number, duration: number, gain: number = 0.2) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTime);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(gain, audioContext.currentTime + startTime + 0.05);
        gainNode.gain.setValueAtTime(gain, audioContext.currentTime + startTime + duration - 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + startTime + duration);
        
        oscillator.start(audioContext.currentTime + startTime);
        oscillator.stop(audioContext.currentTime + startTime + duration);
      };
      
      // Celebratory fanfare notes (C major chord arpeggio + triumph)
      playNote(523.25, 0, 0.2);      // C5
      playNote(659.25, 0.15, 0.2);   // E5
      playNote(783.99, 0.3, 0.2);    // G5
      playNote(1046.50, 0.45, 0.4);  // C6 (higher, longer)
      
      // Add some sparkle
      playNote(1318.51, 0.6, 0.15, 0.1);  // E6
      playNote(1567.98, 0.7, 0.15, 0.1);  // G6
      playNote(2093.00, 0.8, 0.6, 0.15);  // C7 (finale)
      
      // Second layer - harmony
      playNote(392.00, 0, 0.2, 0.1);      // G4
      playNote(493.88, 0.15, 0.2, 0.1);   // B4
      playNote(587.33, 0.3, 0.2, 0.1);    // D5
      playNote(783.99, 0.45, 0.4, 0.1);   // G5
      
      setTimeout(() => {
        audioContext.close();
      }, 2000);
      
    } catch (error) {
      console.error('Error playing celebration sound:', error);
    }
  };

  // Cycle through alerts
  useEffect(() => {
    if (alerts.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % alerts.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [alerts.length]);

  if (alerts.length === 0) return null;

  const currentAlert = alerts[currentIndex] || alerts[0];
  if (!currentAlert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 overflow-hidden">
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
              transform: `rotate(${Math.random() * 360}deg)`,
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
                Fecha em {countdown}s
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
