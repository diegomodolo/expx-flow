import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ZoomIn, 
  RefreshCw, 
  Maximize, 
  Minimize,
  Moon,
  Sun,
  X,
  Monitor,
  Plus,
  Minus,
  Eye,
  EyeOff,
  RotateCw
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  onRotationChange,
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
      }, 3000);
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

  const intervalToMinutes = (ms: number) => Math.floor(ms / 60000);
  const minutesToInterval = (mins: number) => mins * 60000;

  // Show minimal trigger in kiosk mode when closed
  if (isKioskMode && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-2 rounded-full bg-background/20 hover:bg-background/40 transition-all opacity-0 hover:opacity-100 z-50"
      >
        <Settings className="h-4 w-4 text-foreground/50" />
      </button>
    );
  }

  return (
    <>
      {/* Floating controls button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 elevation-2",
          isOpen && "bg-primary text-primary-foreground"
        )}
      >
        <Settings className={cn("h-5 w-5", isOpen && "animate-spin")} />
      </Button>

      {/* Control panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80 bg-card rounded-2xl elevation-3 border border-border p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-foreground">Controles do Dashboard</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ZoomIn className="h-4 w-4 text-primary" />
                <Label>Zoom da Página</Label>
              </div>
              <span className="text-sm text-muted-foreground font-medium">
                {zoom}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onZoomChange(Math.max(50, zoom - 5))}
                disabled={zoom <= 50}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Slider
                value={[zoom]}
                onValueChange={([val]) => onZoomChange(val)}
                min={50}
                max={150}
                step={5}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onZoomChange(Math.min(150, zoom + 5))}
                disabled={zoom >= 150}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50%</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={() => onZoomChange(100)}
              >
                Resetar
              </Button>
              <span>150%</span>
            </div>
          </div>

          {/* Refresh Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                <Label>Auto-refresh</Label>
              </div>
              <span className="text-sm text-muted-foreground">
                {intervalToMinutes(refreshInterval)} min
              </span>
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
              className="w-full"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar Agora'}
            </Button>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-primary" />
              ) : (
                <Sun className="h-4 w-4 text-primary" />
              )}
              <Label>Tema Escuro</Label>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          {/* Rotation Control */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RotateCw className="h-4 w-4 text-primary" />
              <Label>Rotação da Tela</Label>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([0, 90, 180, 270] as const).map((deg) => (
                <Button
                  key={deg}
                  variant={rotation === deg ? "default" : "outline"}
                  size="sm"
                  onClick={() => onRotationChange(deg)}
                  className="text-xs"
                >
                  {deg}°
                </Button>
              ))}
            </div>
          </div>

          {/* Fullscreen Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isFullscreen ? (
                <Minimize className="h-4 w-4 text-primary" />
              ) : (
                <Maximize className="h-4 w-4 text-primary" />
              )}
              <Label>Tela Cheia</Label>
            </div>
            <Switch
              checked={isFullscreen}
              onCheckedChange={toggleFullscreen}
            />
          </div>

          {/* Kiosk Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isKioskMode ? (
                <EyeOff className="h-4 w-4 text-primary" />
              ) : (
                <Eye className="h-4 w-4 text-primary" />
              )}
              <Label>Modo Kiosk</Label>
            </div>
            <Switch
              checked={isKioskMode}
              onCheckedChange={setIsKioskMode}
            />
          </div>
          
          <p className="text-xs text-muted-foreground">
            O modo Kiosk oculta os controles automaticamente.
          </p>
        </div>
      )}
    </>
  );
}
