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
import { useClients } from "@/hooks/useClients";

interface Props {
  slide: StudioSlide;
  slides: StudioSlide[];
  project: StudioProject;
  onSlideChange: (patch: Partial<StudioSlide>) => void;
  onProjectChange: (patch: Partial<StudioProject>) => void;
  onSlidesBatchChange: (ids: string[], patch: Partial<StudioSlide>) => void;
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
  slides,
  project,
  onSlideChange,
  onProjectChange,
  onSlidesBatchChange,
  onGenerateAIImage,
  isGeneratingImage,
  onGenerateContent,
  isGeneratingContent,
  onDownloadSlide,
  onClientChange,
}: Props) {
  const [applyToNext, setApplyToNext] = useState(false);
  const { clients } = useClients();
  const selectedClient = project.client_id
    ? (clients.find((c) => c.id === project.client_id) ?? null)
    : null;
  const clientBadgeUrl =
    selectedClient?.instagram_account?.profile_picture_url ||
    selectedClient?.avatar ||
    null;
  const clientName = selectedClient?.name ?? null;

  return (
    <div className="w-[280px] flex-shrink-0 bg-card border-r border-border flex flex-col h-full overflow-y-auto">
      <ClientSection clientId={project.client_id} onChange={onClientChange} />
      <BackgroundSection
        slide={slide}
        slides={slides}
        project={project}
        onChange={onSlideChange}
        onProjectChange={onProjectChange}
        onSlidesBatchChange={onSlidesBatchChange}
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
        slides={slides}
        project={project}
        onSlideChange={onSlideChange}
        onProjectChange={onProjectChange}
        onSlidesBatchChange={onSlidesBatchChange}
        applyToNext={applyToNext}
        onApplyToNextChange={setApplyToNext}
      />
      <BadgeSection
        slide={slide}
        slides={slides}
        project={project}
        onChange={onSlideChange}
        onProjectChange={onProjectChange}
        onSlidesBatchChange={onSlidesBatchChange}
        clientBadgeUrl={clientBadgeUrl}
        clientName={clientName}
      />
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
