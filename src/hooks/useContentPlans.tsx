import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface ContentPlanSlide {
  id: string;
  post_id: string;
  order_index: number;
  headline: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

export interface ContentPlanPost {
  id: string;
  content_plan_id: string;
  order_index: number;
  post_type: "estatico" | "carrossel" | "reels";
  objective: string | null;
  headline: string | null;
  subheadline: string | null;
  caption: string | null;
  script: any | null;
  scheduled_date: string | null;
  status: "rascunho" | "finalizado" | "enviado_criativo";
  image_url: string | null;
  review_status: string | null;
  review_feedback: string | null;
  reviewed_at: string | null;
  reels_uploaded_video_url?: string | null;
  reels_generation_status?: string | null;
  reels_generation_progress?: any | null;
  reels_cover_url?: string | null;
  created_at: string;
  updated_at: string;
  slides?: ContentPlanSlide[];
}

export interface ContentPlan {
  id: string;
  client_id: string;
  company_id: string;
  user_id: string;
  name: string;
  month: number;
  year: number;
  status: "rascunho" | "em_revisao" | "aprovado";
  created_at: string;
  updated_at: string;
  posts?: ContentPlanPost[];
  total_posts?: number;
  approved_posts?: number;
  clients?: { 
    id?: string;
    name: string; 
    company: string; 
    avatar?: string;
    team_id?: string;
    teams?: { id: string; name: string };
    ai_briefing?: string;
  };
}

export function useContentPlans(clientId?: string) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  // Fetch all content plans
  const { data: plans, isLoading, refetch } = useQuery({
    queryKey: ["content-plans", activeCompany?.company_id, clientId],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      let query = supabase
        .from("content_plans")
        .select(`
          *,
          clients:client_id (id, name, company, avatar, team_id, teams:team_id (id, name))
        `)
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch post counts for each plan
      const planIds = data?.map(p => p.id) || [];
      if (planIds.length === 0) return data as ContentPlan[];

      const { data: postCounts, error: countError } = await supabase
        .from("content_plan_posts")
        .select("content_plan_id, review_status")
        .in("content_plan_id", planIds);

      if (countError) throw countError;

      // Calculate counts per plan
      const countsMap = new Map<string, { total: number; approved: number }>();
      postCounts?.forEach(post => {
        const planId = post.content_plan_id;
        if (!countsMap.has(planId)) {
          countsMap.set(planId, { total: 0, approved: 0 });
        }
        const counts = countsMap.get(planId)!;
        counts.total++;
        if (post.review_status === "approved") {
          counts.approved++;
        }
      });

      // Attach counts to plans
      const plansWithCounts = data?.map(plan => ({
        ...plan,
        total_posts: countsMap.get(plan.id)?.total || 0,
        approved_posts: countsMap.get(plan.id)?.approved || 0,
      }));

      return plansWithCounts as ContentPlan[];
    },
    enabled: !!activeCompany?.company_id,
  });

  // Fetch a single plan with posts and slides
  const fetchPlanWithPosts = useCallback(async (planId: string) => {
    const { data: plan, error: planError } = await supabase
      .from("content_plans")
      .select(`
        *,
        clients:client_id (name, company, ai_briefing)
      `)
      .eq("id", planId)
      .single();

    if (planError) throw planError;

    const { data: posts, error: postsError } = await supabase
      .from("content_plan_posts")
      .select("*")
      .eq("content_plan_id", planId)
      .order("order_index", { ascending: true });

    if (postsError) throw postsError;

    // Fetch slides for carousel posts
    const carouselPostIds = posts
      ?.filter((p: any) => p.post_type === "carrossel")
      .map((p: any) => p.id) || [];

    let slides: ContentPlanSlide[] = [];
    if (carouselPostIds.length > 0) {
      const { data: slidesData, error: slidesError } = await supabase
        .from("content_plan_slides")
        .select("*")
        .in("post_id", carouselPostIds)
        .order("order_index", { ascending: true });

      if (slidesError) throw slidesError;
      slides = (slidesData || []).map((s: any) => ({
        ...s,
        image_url: s.image_url || null,
      })) as ContentPlanSlide[];
    }

    // Attach slides to their respective posts
    const postsWithSlides = posts?.map((post: any) => ({
      ...post,
      slides: slides.filter((s) => s.post_id === post.id),
    }));

    return { ...plan, posts: postsWithSlides } as ContentPlan;
  }, []);

  // Create a new content plan
  const createPlan = useMutation({
    mutationFn: async (data: {
      client_id: string;
      name: string;
      month: number;
      year: number;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user || !activeCompany?.company_id) throw new Error("Não autenticado");

      const { data: plan, error } = await supabase
        .from("content_plans")
        .insert({
          ...data,
          company_id: activeCompany.company_id,
          user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast.success("Planejamento criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar planejamento: " + error.message);
    },
  });

  // Update a content plan
  const updatePlan = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      month?: number;
      year?: number;
      status?: "rascunho" | "em_revisao" | "aprovado";
    }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from("content_plans")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar planejamento: " + error.message);
    },
  });

  // Delete a content plan
  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from("content_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast.success("Planejamento excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir planejamento: " + error.message);
    },
  });

  // Add a post to a plan
  const addPost = useMutation({
    mutationFn: async (data: {
      content_plan_id: string;
      post_type?: "estatico" | "carrossel" | "reels";
      order_index?: number;
    }) => {
      const { data: post, error } = await supabase
        .from("content_plan_posts")
        .insert({
          content_plan_id: data.content_plan_id,
          post_type: data.post_type || "estatico",
          order_index: data.order_index || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plan-detail"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar post: " + error.message);
    },
  });

  // Update a post
  const updatePost = useMutation({
    mutationFn: async (data: Partial<ContentPlanPost> & { id: string }) => {
      const { id, slides, ...updateData } = data;
      const { error } = await supabase
        .from("content_plan_posts")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plan-detail"] });
    },
  });

  // Delete a post
  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("content_plan_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plan-detail"] });
      toast.success("Post excluído!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir post: " + error.message);
    },
  });

  // Reorder posts
  const reorderPosts = useMutation({
    mutationFn: async (posts: { id: string; order_index: number }[]) => {
      const updates = posts.map(({ id, order_index }) =>
        supabase.from("content_plan_posts").update({ order_index }).eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plan-detail"] });
    },
  });

  // Add a slide to a carousel post
  const addSlide = useMutation({
    mutationFn: async (data: {
      post_id: string;
      order_index?: number;
      headline?: string;
      content?: string;
    }) => {
      const { data: slide, error } = await supabase
        .from("content_plan_slides")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return slide;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plan-detail"] });
    },
  });

  // Update a slide
  const updateSlide = useMutation({
    mutationFn: async (data: Partial<ContentPlanSlide> & { id: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from("content_plan_slides")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plan-detail"] });
    },
  });

  // Delete a slide
  const deleteSlide = useMutation({
    mutationFn: async (slideId: string) => {
      const { error } = await supabase
        .from("content_plan_slides")
        .delete()
        .eq("id", slideId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plan-detail"] });
    },
  });

  return {
    plans,
    isLoading,
    refetch,
    fetchPlanWithPosts,
    createPlan,
    updatePlan,
    deletePlan,
    addPost,
    updatePost,
    deletePost,
    reorderPosts,
    addSlide,
    updateSlide,
    deleteSlide,
  };
}
