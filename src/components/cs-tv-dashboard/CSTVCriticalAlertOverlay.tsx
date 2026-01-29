import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X, User, MessageCircle, ThermometerSun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CriticalAlert {
  id: string;
  conversationId: string;
  contactName: string;
  contactPhone: string;
  clientName: string | null;
  attendantId: string | null;
  attendantName: string | null;
  score: number;
  temperature: string;
  interpretation: string | null;
  suggestion: string | null;
  analyzedAt: string;
}

interface CSTVCriticalAlertOverlayProps {
  alerts: CriticalAlert[];
  onDismiss: (alertId: string) => void;
  onDismissAll: () => void;
  rotation?: number;
}

const AUTO_DISMISS_SECONDS = 30;

export function CSTVCriticalAlertOverlay({ alerts, onDismiss, onDismissAll, rotation = 0 }: CSTVCriticalAlertOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS);
  const sirenPlayedRef = useRef(false);

  // Play siren sound ONCE when alerts first appear
  useEffect(() => {
    if (alerts.length > 0 && !sirenPlayedRef.current) {
      sirenPlayedRef.current = true;
      playSiren();
    }
    
    // Reset when no alerts
    if (alerts.length === 0) {
      sirenPlayedRef.current = false;
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

  const playSiren = async () => {
    try {
      // Create audio context for siren sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator for siren effect
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      // Siren frequency modulation
      const startTime = audioContext.currentTime;
      const duration = 3; // 3 seconds siren
      
      for (let i = 0; i < 6; i++) {
        const cycleStart = startTime + (i * 0.5);
        oscillator.frequency.setValueAtTime(400, cycleStart);
        oscillator.frequency.linearRampToValueAtTime(800, cycleStart + 0.25);
        oscillator.frequency.linearRampToValueAtTime(400, cycleStart + 0.5);
      }
      
      // Fade out
      gainNode.gain.setValueAtTime(0.3, startTime + duration - 0.5);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
      
      setTimeout(() => {
        audioContext.close();
      }, duration * 1000);
      
    } catch (error) {
      console.error('Error playing siren:', error);
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

  const getTemperatureLabel = (temp: string) => {
    switch (temp) {
      case 'positive': return 'Positivo';
      case 'neutral': return 'Neutro';
      case 'negative': return 'Negativo';
      default: return temp;
    }
  };

  const isRotated = rotation === 90 || rotation === 270;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: rotation === 90 ? 'top left' : rotation === 270 ? 'bottom right' : 'center',
        width: isRotated ? '100vh' : '100%',
        height: isRotated ? '100vw' : '100%',
        position: 'fixed',
        top: rotation === 90 ? 0 : rotation === 270 ? 'auto' : 0,
        left: rotation === 90 ? '100vw' : 0,
        bottom: rotation === 270 ? '100vh' : undefined,
        right: rotation === 270 ? 0 : undefined,
      }}
    >
      {/* Pulsing background effect */}
      <div className="absolute inset-0 bg-red-600/20 animate-pulse" />
      
      {/* Main alert container */}
      <div className="relative w-full max-w-4xl mx-4 bg-background border-4 border-red-500 rounded-2xl shadow-2xl overflow-hidden">
        {/* Flashing header */}
        <div className={cn(
          "flex items-center justify-between px-6 py-4",
          "bg-red-600 animate-pulse"
        )}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-white animate-bounce" />
            <span className="text-2xl font-bold text-white uppercase tracking-wider">
              ⚠️ ALERTA CRÍTICO - NOTA {currentAlert.score.toFixed(1)}
            </span>
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
          {/* Contact and attendant info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Cliente</p>
                <p className="text-xl font-bold text-foreground">{currentAlert.contactName}</p>
                {currentAlert.clientName && (
                  <p className="text-sm text-muted-foreground">Empresa: {currentAlert.clientName}</p>
                )}
                <p className="text-sm text-muted-foreground">{currentAlert.contactPhone}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Atendente</p>
                <p className="text-xl font-bold text-foreground">
                  {currentAlert.attendantName || 'Não atribuído'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <ThermometerSun className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-500 font-medium">
                    Sentimento: {getTemperatureLabel(currentAlert.temperature)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Score display */}
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
              Nota da Análise de IA
            </p>
            <div className="inline-flex items-center gap-4">
              <span className="text-8xl font-black text-red-500 animate-pulse">
                {currentAlert.score.toFixed(1)}
              </span>
              <span className="text-4xl text-muted-foreground">/10</span>
            </div>
          </div>
          
          {/* AI Analysis */}
          {currentAlert.interpretation && (
            <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-500 uppercase tracking-wider font-medium mb-3">
                📊 Análise da IA
              </p>
              <p className="text-lg text-foreground leading-relaxed">
                {currentAlert.interpretation}
              </p>
            </div>
          )}
          
          {/* Suggestion */}
          {currentAlert.suggestion && (
            <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <p className="text-sm text-amber-500 uppercase tracking-wider font-medium mb-3">
                💡 Sugestão de Ação
              </p>
              <p className="text-lg text-foreground leading-relaxed">
                {currentAlert.suggestion}
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onDismiss(currentAlert.id)}
              className="px-8"
            >
              Entendido
            </Button>
            {alerts.length > 1 && (
              <Button
                variant="destructive"
                size="lg"
                onClick={onDismissAll}
                className="px-8"
              >
                Dispensar Todos ({alerts.length})
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
                    ? "bg-red-500 scale-125" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
