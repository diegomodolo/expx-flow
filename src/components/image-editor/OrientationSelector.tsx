import React from 'react';
import { cn } from '@/lib/utils';
import {
  Monitor,
  Smartphone,
  Square,
  RectangleHorizontal,
  RectangleVertical,
} from 'lucide-react';

export interface Orientation {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
  icon: React.ElementType;
}

export const ORIENTATIONS: Orientation[] = [
  { id: 'youtube', label: 'YouTube', ratio: '16:9', width: 1920, height: 1080, icon: Monitor },
  { id: 'reels', label: 'Reels/TikTok', ratio: '9:16', width: 1080, height: 1920, icon: Smartphone },
  { id: 'stories', label: 'Stories', ratio: '9:16', width: 1080, height: 1920, icon: Smartphone },
  { id: 'post', label: 'Post', ratio: '1:1', width: 1080, height: 1080, icon: Square },
  { id: 'facebook', label: 'Facebook', ratio: '1.91:1', width: 1200, height: 628, icon: RectangleHorizontal },
  { id: 'pinterest', label: 'Pinterest', ratio: '2:3', width: 1000, height: 1500, icon: RectangleVertical },
];

interface OrientationSelectorProps {
  selected: string;
  onSelect: (orientation: Orientation) => void;
}

export const OrientationSelector: React.FC<OrientationSelectorProps> = ({
  selected,
  onSelect,
}) => {
  return (
    <div className="space-y-1.5">
      {ORIENTATIONS.map((orientation) => {
        const Icon = orientation.icon;
        const isSelected = selected === orientation.id;
        
        return (
          <button
            key={orientation.id}
            onClick={() => onSelect(orientation)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors",
              isSelected
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left truncate">{orientation.label}</span>
            <span className="text-[10px] opacity-60">{orientation.ratio}</span>
          </button>
        );
      })}
    </div>
  );
};
