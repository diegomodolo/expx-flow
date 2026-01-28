import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Trash2, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppVoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export function WhatsAppVoiceRecorder({ 
  onRecordingComplete, 
  onCancel,
  isUploading = false 
}: WhatsAppVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Use webm for better compatibility, will be converted if needed
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(Math.floor(audioRef.current.currentTime));
    }
  };

  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setPlaybackTime(0);
    setIsPlaying(false);
  };

  const confirmRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, recordingTime);
    }
  };

  // Recording state - show recording animation
  if (isRecording) {
    return (
      <div className="border-2 border-destructive rounded-lg p-6 bg-destructive/5">
        <div className="flex flex-col items-center gap-4">
          {/* Recording indicator */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-destructive/40 flex items-center justify-center animate-pulse">
                <Mic className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive animate-pulse" />
          </div>
          
          {/* Timer */}
          <div className="text-2xl font-mono font-semibold text-destructive">
            {formatTime(recordingTime)}
          </div>
          
          <p className="text-sm text-muted-foreground">Gravando...</p>
          
          {/* Stop button */}
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={stopRecording}
            className="w-full max-w-xs"
          >
            <Square className="h-4 w-4 mr-2 fill-current" />
            Parar Gravação
          </Button>
        </div>
      </div>
    );
  }

  // Preview state - show recorded audio with playback
  if (audioBlob && audioUrl) {
    return (
      <div className="border-2 border-primary rounded-lg p-6 bg-primary/5">
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnded}
          onTimeUpdate={handleTimeUpdate}
        />
        
        <div className="flex flex-col items-center gap-4">
          {/* Playback controls */}
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={togglePlayback}
              disabled={isUploading}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            
            <div className="text-lg font-mono">
              {formatTime(isPlaying ? playbackTime : recordingTime)}
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">Mensagem de voz gravada</p>
          
          {/* Action buttons */}
          <div className="flex gap-2 w-full max-w-xs">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={discardRecording}
              disabled={isUploading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Descartar
            </Button>
            <Button
              type="button"
              variant="default"
              className="flex-1"
              onClick={confirmRecording}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {isUploading ? 'Salvando...' : 'Usar Áudio'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Initial state - show record button
  return (
    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Mic className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium">Gravar Mensagem de Voz</p>
          <p className="text-xs text-muted-foreground">
            Clique para iniciar a gravação
          </p>
        </div>
        
        <Button
          type="button"
          variant="default"
          size="lg"
          onClick={startRecording}
          className="w-full max-w-xs"
        >
          <Mic className="h-4 w-4 mr-2" />
          Iniciar Gravação
        </Button>
      </div>
    </div>
  );
}
