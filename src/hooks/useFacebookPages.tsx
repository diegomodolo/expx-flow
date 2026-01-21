import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

export interface FacebookPage {
  id: string;
  integration_id: string;
  company_id: string;
  page_id: string;
  page_name: string;
  page_access_token: string;
  page_category: string | null;
  instagram_business_account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstagramAccount {
  id: string;
  facebook_page_id: string | null;
  company_id: string;
  instagram_id: string;
  username: string;
  profile_picture_url: string | null;
  followers_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  source?: 'page' | 'business_manager';
  business_id?: string | null;
  facebook_page?: FacebookPage | null;
}

export const useFacebookPages = () => {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchPages = async () => {
    if (!activeCompany?.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('facebook_pages')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .eq('is_active', true);

      if (error) throw error;
      setPages((data || []) as FacebookPage[]);
    } catch (error: any) {
      console.error('Error fetching Facebook pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstagramAccounts = async () => {
    if (!activeCompany?.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('instagram_accounts')
        .select(`
          *,
          facebook_page:facebook_pages(*)
        `)
        .eq('company_id', activeCompany.company_id)
        .eq('is_active', true);

      if (error) throw error;
      setInstagramAccounts((data || []) as InstagramAccount[]);
    } catch (error: any) {
      console.error('Error fetching Instagram accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshPages = async (integrationId: string) => {
    if (!activeCompany?.company_id) return false;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-facebook-pages', {
        body: { 
          integrationId,
          companyId: activeCompany.company_id
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch pages');
      }

      toast({
        title: 'Páginas atualizadas!',
        description: `${data.pages?.length || 0} páginas e ${data.instagramAccounts?.length || 0} contas Instagram encontradas.`,
      });

      await fetchPages();
      await fetchInstagramAccounts();
      return true;
    } catch (error: any) {
      console.error('Error refreshing pages:', error);
      toast({
        title: 'Erro ao atualizar páginas',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.company_id) {
      fetchPages();
      fetchInstagramAccounts();
    }
  }, [activeCompany?.company_id]);

  return {
    pages,
    instagramAccounts,
    loading,
    fetchPages,
    fetchInstagramAccounts,
    refreshPages,
  };
};
