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
  const PREVIEW_SIZE = 120;
  const scale = PREVIEW_SIZE / 1080;

  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-3 items-start bg-[#111]">
      {slides.map((slide, i) => (
        <button
          key={slide.id}
          onClick={() => onSelect(i)}
          className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
            i === activeIndex
              ? "border-primary"
              : "border-transparent hover:border-white/30"
          }`}
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
        >
          <div
            style={{
              width: 1080,
              height: 1080,
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
