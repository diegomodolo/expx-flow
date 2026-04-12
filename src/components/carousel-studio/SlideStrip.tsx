import React from "react";
import { StudioSlide, StudioProject } from "./types";
import { SlideCanvas } from "./SlideCanvas";

interface Props {
  slides: StudioSlide[];
  project: StudioProject;
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function SlideStrip({ slides, project, activeIndex, onSelect }: Props) {
  // Slides são 1080×1350px (4:5 Instagram)
  const SLIDE_W = 1080;
  const SLIDE_H = 1350;
  const THUMB_H = 96;
  const scale = THUMB_H / SLIDE_H;
  const thumbW = Math.round(SLIDE_W * scale);

  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-3 items-start bg-card">
      {slides.map((slide, i) => (
        <button
          key={slide.id}
          onClick={() => onSelect(i)}
          className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
            i === activeIndex
              ? "border-primary"
              : "border-transparent hover:border-border"
          }`}
          style={{ width: thumbW, height: THUMB_H }}
        >
          <div
            style={{
              width: SLIDE_W,
              height: SLIDE_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <SlideCanvas slide={slide} project={project} />
          </div>
        </button>
      ))}
    </div>
  );
}
