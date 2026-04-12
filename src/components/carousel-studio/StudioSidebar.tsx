import React, { useState } from "react";
import { BackgroundSection } from "./sections/BackgroundSection";
import { OverlaySection } from "./sections/OverlaySection";
import { TextSection } from "./sections/TextSection";
import { FontsSection } from "./sections/FontsSection";
import { BadgeSection } from "./sections/BadgeSection";
import { CornersSection } from "./sections/CornersSection";
import { ClientSection, ClientDefaults } from "./sections/ClientSection";
import { StudioSlide, StudioProject } from "./types";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Props {
  slide: StudioSlide;
  project: StudioProject;
  onSlideChange: (patch: Partial<StudioSlide>) => void;
  onGenerateAIImage: () => void;
  isGeneratingImage: boolean;
  onGenerateContent: () => void;
  isGeneratingContent: boolean;
  onDownloadSlide: () => void;
  onClientChange: (
    clientId: string | null,
    defaults: ClientDefaults | null,
  ) => void;
}

export function StudioSidebar({
  slide,
  project,
  onSlideChange,
  onGenerateAIImage,
  isGeneratingImage,
  onGenerateContent,
  isGeneratingContent,
  onDownloadSlide,
  onClientChange,
}: Props) {
  const [applyToNext, setApplyToNext] = useState(false);

  return (
    <div className="w-[280px] flex-shrink-0 bg-card border-r border-border flex flex-col h-full overflow-y-auto">
      <ClientSection clientId={project.client_id} onChange={onClientChange} />
      <BackgroundSection
        slide={slide}
        onChange={onSlideChange}
        onGenerateAIImage={onGenerateAIImage}
        isGeneratingImage={isGeneratingImage}
      />
      <OverlaySection slide={slide} onChange={onSlideChange} />
      <TextSection
        slide={slide}
        onChange={onSlideChange}
        onGenerateContent={onGenerateContent}
        isGenerating={isGeneratingContent}
      />
      <FontsSection
        slide={slide}
        project={project}
        onSlideChange={onSlideChange}
        applyToNext={applyToNext}
        onApplyToNextChange={setApplyToNext}
      />
      <BadgeSection slide={slide} onChange={onSlideChange} />
      <CornersSection slide={slide} onChange={onSlideChange} />

      <div className="p-4 mt-auto">
        <Button variant="outline" className="w-full" onClick={onDownloadSlide}>
          <Download className="w-4 h-4 mr-2" />
          Baixar Slide {slide.slide_number}
        </Button>
      </div>
    </div>
  );
}
