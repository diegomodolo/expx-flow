import React, { useRef } from "react";
import { SidebarSection } from "../SidebarSection";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StudioSlide } from "../types";

interface Props {
  slide: StudioSlide;
  onChange: (patch: Partial<StudioSlide>) => void;
}

export function BadgeSection({ slide, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <SidebarSection title="Badge de Perfil">
      <div className="flex items-center gap-2">
        <Switch
          checked={slide.badge_enabled}
          onCheckedChange={(v) => onChange({ badge_enabled: v })}
        />
        <Label className="text-xs text-muted-foreground">Exibir badge</Label>
      </div>

      {slide.badge_enabled && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) =>
                onChange({ badge_photo_url: ev.target?.result as string });
              reader.readAsDataURL(file);
            }}
          />
          <button
            className="w-full py-2 border border-border rounded text-xs text-muted-foreground hover:bg-muted/50"
            onClick={() => fileRef.current?.click()}
          >
            {slide.badge_photo_url
              ? "Trocar foto de perfil"
              : "Adicionar foto de perfil"}
          </button>
          {slide.badge_photo_url && (
            <img
              src={slide.badge_photo_url}
              className="w-12 h-12 rounded-full object-cover mx-auto"
              alt="badge"
            />
          )}
        </>
      )}
    </SidebarSection>
  );
}
