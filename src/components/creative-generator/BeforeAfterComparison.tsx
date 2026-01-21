import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { X, ArrowLeftRight } from "lucide-react";

interface BeforeAfterComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfterComparison({
  open,
  onOpenChange,
  beforeImage,
  afterImage,
  beforeLabel = "Original",
  afterLabel = "Variação"
}: BeforeAfterComparisonProps) {
  const [sliderValue, setSliderValue] = useState([50]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Comparação Antes e Depois
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-4 pb-4">
          {/* Labels */}
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span className="font-medium">{beforeLabel}</span>
            <span className="font-medium">{afterLabel}</span>
          </div>
          
          {/* Comparison Container */}
          <div className="relative w-full aspect-square max-h-[60vh] overflow-hidden rounded-lg border">
            {/* After Image (Background) */}
            <img
              src={afterImage}
              alt={afterLabel}
              className="absolute inset-0 w-full h-full object-contain bg-muted"
            />
            
            {/* Before Image (Clipped) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderValue[0]}%` }}
            >
              <img
                src={beforeImage}
                alt={beforeLabel}
                className="absolute inset-0 w-full h-full object-contain bg-muted"
                style={{ 
                  width: `${100 / (sliderValue[0] / 100)}%`,
                  maxWidth: 'none'
                }}
              />
            </div>
            
            {/* Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-10"
              style={{ left: `${sliderValue[0]}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
          
          {/* Slider Control */}
          <div className="mt-4 px-4">
            <Slider
              value={sliderValue}
              onValueChange={setSliderValue}
              max={100}
              min={0}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>100% Original</span>
              <span>{sliderValue[0]}%</span>
              <span>100% Variação</span>
            </div>
          </div>
          
          {/* Quick Buttons */}
          <div className="flex justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSliderValue([0])}
            >
              Mostrar Variação
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSliderValue([50])}
            >
              50/50
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSliderValue([100])}
            >
              Mostrar Original
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
