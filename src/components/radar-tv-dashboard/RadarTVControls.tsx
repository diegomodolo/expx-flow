import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Settings, 
  RefreshCw, 
  Maximize, 
  Minimize, 
  Moon, 
  Sun,
  X,
  Eye,
  EyeOff,
  ZoomIn,
  Plus,
  Minus,
  RotateCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface RadarTVControlsProps {
  refreshInterval: number;
  onRefreshIntervalChange: (interval: number) => void;
  onRefreshNow: () => void;
  isRefreshing: boolean;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  rotation?: number;
  onRotationChange?: (rotation: number) => void;
}

export function RadarTVControls({ 
  refreshInterval, 
  onRefreshIntervalChange, 
  onRefreshNow,
  isRefreshing,
  zoom = 100,
  onZoomChange,
  rotation = 0,
  onRotationChange
}: RadarTVControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (isKioskMode) {
      const timer = setTimeout(() => setIsOpen(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isKioskMode, isOpen]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const intervalMinutes = refreshInterval / 60000;

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
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 shadow-lg",
          isOpen && "bg-primary text-primary-foreground"
        )}
      >
        <Settings className={cn("h-5 w-5", isOpen && "animate-spin")} />
      </Button>

      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80 bg-card rounded-2xl shadow-xl p-6 space-y-6 max-h-[80vh] overflow-y-auto border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Controles Radar TV</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {onZoomChange && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ZoomIn className="h-4 w-4" />
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
            </div>
          )}

          {onRotationChange && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCw className="h-4 w-4" />
                <Label>Rotação 90°</Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRotationChange((rotation + 90) % 360)}
                className="h-8 px-3"
              >
                {rotation}°
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Auto-refresh</Label>
              <span className="text-sm text-muted-foreground">
                {intervalMinutes} min
              </span>
            </div>
            <Slider
              value={[intervalMinutes]}
              onValueChange={([val]) => onRefreshIntervalChange(val * 60000)}
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
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Atualizar Agora
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <Label>Tema Escuro</Label>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              <Label>Tela Cheia</Label>
            </div>
            <Switch
              checked={isFullscreen}
              onCheckedChange={toggleFullscreen}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isKioskMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
