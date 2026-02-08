import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface YouTubeSlide {
  id: string;
  script_id: string;
  slide_order: number;
  title: string;
  content: string | null;
  visual_suggestion: string | null;
  image_url: string | null;
  status: "draft" | "generating" | "completed" | "error";
  created_at: string;
  updated_at: string;
}

export function useYouTubeSlides(scriptId: string | null) {
  const [slides, setSlides] = useState<YouTubeSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingStructure, setGeneratingStructure] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());

  const fetchSlides = useCallback(async () => {
    if (!scriptId) return [];
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("youtube_script_slides")
        .select("*")
        .eq("script_id", scriptId)
        .order("slide_order", { ascending: true });

      if (error) throw error;
      
      const typedSlides = (data || []).map(slide => ({
        ...slide,
        status: slide.status as YouTubeSlide["status"]
      }));
      
      setSlides(typedSlides);
      return typedSlides;
    } catch (error: any) {
      console.error("Error fetching slides:", error);
      toast.error("Erro ao carregar slides");
      return [];
    } finally {
      setLoading(false);
    }
  }, [scriptId]);

  const generateStructure = useCallback(async (
    scriptContent: string, 
    title: string,
    numberOfSlides: number = 10
  ) => {
    if (!scriptId) return null;
    
    setGeneratingStructure(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-presentation-slides", {
        body: { scriptId, scriptContent, title, numberOfSlides },
      });

      if (error) throw error;

      if (data?.slides) {
        const typedSlides = data.slides.map((slide: any) => ({
          ...slide,
          status: slide.status as YouTubeSlide["status"]
        }));
        setSlides(typedSlides);
        toast.success(`${typedSlides.length} slides gerados com sucesso!`);
        return typedSlides;
      }
      
      return null;
    } catch (error: any) {
      console.error("Error generating structure:", error);
      toast.error(error.message || "Erro ao gerar estrutura de slides");
      return null;
    } finally {
      setGeneratingStructure(false);
    }
  }, [scriptId]);

  const updateSlide = useCallback(async (slideId: string, updates: Partial<YouTubeSlide>) => {
    try {
      const { error } = await supabase
        .from("youtube_script_slides")
        .update(updates)
        .eq("id", slideId);

      if (error) throw error;

      setSlides(prev => prev.map(s => 
        s.id === slideId ? { ...s, ...updates } : s
      ));
      
      return true;
    } catch (error: any) {
      console.error("Error updating slide:", error);
      toast.error("Erro ao atualizar slide");
      return false;
    }
  }, []);

  const generateSlideImage = useCallback(async (slideId: string, companyId: string) => {
    setGeneratingImages(prev => new Set(prev).add(slideId));
    
    // Update local state to show generating
    setSlides(prev => prev.map(s => 
      s.id === slideId ? { ...s, status: "generating" as const } : s
    ));

    try {
      const { data, error } = await supabase.functions.invoke("generate-slide-image", {
        body: { slideId, companyId },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setSlides(prev => prev.map(s => 
          s.id === slideId ? { ...s, image_url: data.imageUrl, status: "completed" as const } : s
        ));
        return data.imageUrl;
      }
      
      throw new Error("No image returned");
    } catch (error: any) {
      console.error("Error generating slide image:", error);
      setSlides(prev => prev.map(s => 
        s.id === slideId ? { ...s, status: "error" as const } : s
      ));
      toast.error(`Erro ao gerar imagem: ${error.message}`);
      return null;
    } finally {
      setGeneratingImages(prev => {
        const next = new Set(prev);
        next.delete(slideId);
        return next;
      });
    }
  }, []);

  const generateAllImages = useCallback(async (companyId: string) => {
    const slidesToGenerate = slides.filter(s => !s.image_url || s.status === "draft" || s.status === "error");
    
    if (slidesToGenerate.length === 0) {
      toast.info("Todos os slides já possuem imagens");
      return;
    }

    toast.info(`Gerando ${slidesToGenerate.length} imagens...`);

    let successCount = 0;
    for (const slide of slidesToGenerate) {
      const result = await generateSlideImage(slide.id, companyId);
      if (result) successCount++;
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (successCount === slidesToGenerate.length) {
      toast.success("Todas as imagens foram geradas!");
    } else {
      toast.warning(`${successCount}/${slidesToGenerate.length} imagens geradas`);
    }
  }, [slides, generateSlideImage]);

  const deleteSlide = useCallback(async (slideId: string) => {
    try {
      const { error } = await supabase
        .from("youtube_script_slides")
        .delete()
        .eq("id", slideId);

      if (error) throw error;

      setSlides(prev => prev.filter(s => s.id !== slideId));
      toast.success("Slide removido");
      return true;
    } catch (error: any) {
      console.error("Error deleting slide:", error);
      toast.error("Erro ao remover slide");
      return false;
    }
  }, []);

  const reorderSlides = useCallback(async (slideId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from("youtube_script_slides")
        .update({ slide_order: newOrder })
        .eq("id", slideId);

      if (error) throw error;

      setSlides(prev => {
        const updated = prev.map(s => 
          s.id === slideId ? { ...s, slide_order: newOrder } : s
        );
        return updated.sort((a, b) => a.slide_order - b.slide_order);
      });
      
      return true;
    } catch (error: any) {
      console.error("Error reordering slides:", error);
      return false;
    }
  }, []);

  const hasSlides = slides.length > 0;
  const allImagesGenerated = slides.every(s => s.image_url && s.status === "completed");
  const pendingImages = slides.filter(s => !s.image_url || s.status === "draft" || s.status === "error").length;

  return {
    slides,
    loading,
    generatingStructure,
    generatingImages,
    hasSlides,
    allImagesGenerated,
    pendingImages,
    fetchSlides,
    generateStructure,
    updateSlide,
    generateSlideImage,
    generateAllImages,
    deleteSlide,
    reorderSlides,
  };
}
