import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "youtube-script-builder-panels";

interface PanelSizes {
  // Horizontal split between left and right columns
  leftColumn: number;
  rightColumn: number;
  // Left column vertical splits
  scriptEditor: number;
  slidesSection: number;
  // Right column vertical splits
  thumbnail: number;
  chat: number;
  titles: number;
}

const DEFAULT_SIZES: PanelSizes = {
  leftColumn: 66,
  rightColumn: 34,
  scriptEditor: 50,
  slidesSection: 50,
  thumbnail: 30,
  chat: 45,
  titles: 25,
};

export function useScriptBuilderPanelSizes() {
  const [sizes, setSizes] = useState<PanelSizes>(DEFAULT_SIZES);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Get user ID on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        loadSizes(user.id);
      } else {
        setIsLoaded(true);
      }
    };
    getUser();
  }, []);

  const loadSizes = (uid: string) => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}-${uid}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSizes({
          ...DEFAULT_SIZES,
          ...parsed,
        });
      }
    } catch (error) {
      console.error("Error loading panel sizes:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSizes = useCallback((newSizes: Partial<PanelSizes>) => {
    if (!userId) return;
    
    setSizes(prev => {
      const updated = { ...prev, ...newSizes };
      try {
        localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(updated));
      } catch (error) {
        console.error("Error saving panel sizes:", error);
      }
      return updated;
    });
  }, [userId]);

  const setHorizontalSizes = useCallback((left: number, right: number) => {
    saveSizes({ leftColumn: left, rightColumn: right });
  }, [saveSizes]);

  const setLeftColumnSizes = useCallback((script: number, slides: number) => {
    saveSizes({ scriptEditor: script, slidesSection: slides });
  }, [saveSizes]);

  const setRightColumnSizes = useCallback((thumbnail: number, chat: number, titles: number) => {
    saveSizes({ thumbnail, chat, titles });
  }, [saveSizes]);

  return {
    sizes,
    isLoaded,
    setHorizontalSizes,
    setLeftColumnSizes,
    setRightColumnSizes,
  };
}
