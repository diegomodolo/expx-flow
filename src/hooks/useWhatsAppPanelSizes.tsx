import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "whatsapp-panel-sizes";

interface PanelSizes {
  conversationList: number;
  chatWindow: number;
  aiAssistant: number;
}

const DEFAULT_SIZES: PanelSizes = {
  conversationList: 25,
  chatWindow: 75,
  aiAssistant: 35,
};

export function useWhatsAppPanelSizes() {
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
    
    const updated = { ...sizes, ...newSizes };
    setSizes(updated);
    
    try {
      localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving panel sizes:", error);
    }
  }, [userId, sizes]);

  const setConversationListSize = useCallback((size: number) => {
    saveSizes({ conversationList: size, chatWindow: 100 - size });
  }, [saveSizes]);

  const setAiAssistantSize = useCallback((size: number) => {
    saveSizes({ aiAssistant: size });
  }, [saveSizes]);

  return {
    sizes,
    isLoaded,
    setConversationListSize,
    setAiAssistantSize,
  };
}
