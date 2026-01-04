import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Maximize, 
  Minimize,
  Moon,
  Sun,
  X,
  RotateCw,
  Monitor
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface SocialTVControlsProps {
  refreshInterval: number;
  onRefreshIntervalChange: (interval: number) => void;
  onRefreshNow: () => void;
  isRefreshing?: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  rotation: 0 | 90 | 180 | 270;
  onRotationChange: (rotation: 0 | 90 | 180 | 270) => void;
}

export function SocialTVControls({
  refreshInterval,
  onRefreshIntervalChange,
  onRefreshNow,
  isRefreshing = false,
  zoom,
  onZoomChange,
  rotation,
  onRotationChange
}: SocialTVControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls in kiosk mode
  useEffect(() => {
    if (isKioskMode) {
      const timeout = setTimeout(() => {
        setIsOpen(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isKioskMode, isOpen]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleRotate = () => {
    const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
    const currentIndex = rotations.indexOf(rotation);
    const nextIndex = (currentIndex + 1) % rotations.length;
    onRotationChange(rotations[nextIndex]);
  };

  const intervalToMinutes = (ms: number) => Math.floor(ms / 60000);
  const minutesToInterval = (mins: number) => mins * 60000;

  // Show minimal trigger in kiosk mode when closed
  if (isKioskMode && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-3 h-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-50"
      />
    );
  }

  return (
    <>
      {/* Floating settings button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-200",
          isOpen 
            ? "bg-red-500 hover:bg-red-600 text-white" 
            : "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20"
        )}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
      </button>

      {/* Control panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-72 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-medium text-white">Controles do Dashboard</h3>
          </div>

          <div className="p-4 space-y-6">
            {/* Rotation Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-white/80">Rotação</span>
                </div>
                <span className="text-xs text-white/50">{rotation}°</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {([0, 90, 180, 270] as const).map((deg) => (
                  <button
                    key={deg}
                    onClick={() => onRotationChange(deg)}
                    className={cn(
                      "py-2 text-xs font-medium rounded-lg transition-colors",
                      rotation === deg
                        ? "bg-purple-500 text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    )}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-white/80">Zoom</span>
                </div>
                <span className="text-xs text-white/50">{zoom}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onZoomChange(Math.max(50, zoom - 10))}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <Slider
                  value={[zoom]}
                  onValueChange={([val]) => onZoomChange(val)}
                  min={50}
                  max={150}
                  step={5}
                  className="flex-1"
                />
                <button
                  onClick={() => onZoomChange(Math.min(150, zoom + 10))}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Refresh Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-white/80">Atualização</span>
                </div>
                <span className="text-xs text-white/50">{intervalToMinutes(refreshInterval)} min</span>
              </div>
              <Slider
                value={[intervalToMinutes(refreshInterval)]}
                onValueChange={([val]) => onRefreshIntervalChange(minutesToInterval(val))}
                min={1}
                max={30}
                step={1}
                className="w-full"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshNow}
                disabled={isRefreshing}
                className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
                {isRefreshing ? 'Atualizando...' : 'Atualizar Agora'}
              </Button>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-yellow-400" />
                ) : (
                  <Sun className="w-4 h-4 text-orange-400" />
                )}
                <span className="text-sm text-white/80">Tema</span>
              </div>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
              >
                {theme === 'dark' ? 'Claro' : 'Escuro'}
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isFullscreen ? (
                  <Minimize className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Maximize className="w-4 h-4 text-cyan-400" />
                )}
                <span className="text-sm text-white/80">Tela Cheia</span>
              </div>
              <button
                onClick={toggleFullscreen}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
              >
                {isFullscreen ? 'Sair' : 'Ativar'}
              </button>
            </div>

            {/* Kiosk Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-pink-400" />
                <span className="text-sm text-white/80">Modo Quiosque</span>
              </div>
              <button
                onClick={() => setIsKioskMode(!isKioskMode)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  isKioskMode 
                    ? "bg-pink-500 text-white" 
                    : "bg-white/10 hover:bg-white/20 text-white/70"
                )}
              >
                {isKioskMode ? 'Ativo' : 'Ativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
