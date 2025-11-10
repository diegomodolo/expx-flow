import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CRMUser {
  id: string;
  email: string;
  full_name: string;
  workspace_id: string;
  role: 'admin' | 'collaborator';
}

interface CRMAuthContextType {
  user: CRMUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (workspaceToken: string, email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  checkAuth: (workspaceToken: string) => boolean;
}

const CRMAuthContext = createContext<CRMAuthContextType | null>(null);

const CRM_SESSION_KEY = 'crm_session';

export function CRMAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CRMUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se existe sessão salva no localStorage
    const savedSession = localStorage.getItem(CRM_SESSION_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setUser(session.user);
      } catch (error) {
        console.error('Erro ao carregar sessão do CRM:', error);
        localStorage.removeItem(CRM_SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (workspaceToken: string, email: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('crm-auth', {
        body: {
          workspaceToken,
          email,
          password,
          action: 'login',
        },
      });

      if (error) throw error;

      if (data.error) {
        return { error: data.error };
      }

      if (data.success && data.user) {
        const sessionData = {
          user: data.user,
          session: data.session,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(CRM_SESSION_KEY, JSON.stringify(sessionData));
        setUser(data.user);
        return {};
      }

      return { error: 'Falha na autenticação' };
    } catch (error: any) {
      console.error('Erro no login CRM:', error);
      return { error: error.message || 'Erro ao fazer login' };
    }
  };

  const logout = () => {
    localStorage.removeItem(CRM_SESSION_KEY);
    setUser(null);
  };

  const checkAuth = (workspaceToken: string): boolean => {
    const savedSession = localStorage.getItem(CRM_SESSION_KEY);
    if (!savedSession) return false;

    try {
      const session = JSON.parse(savedSession);
      // Verificar se a sessão é para o workspace correto
      return session.user.workspace_id === workspaceToken;
    } catch {
      return false;
    }
  };

  return (
    <CRMAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </CRMAuthContext.Provider>
  );
}

export function useCRMAuth() {
  const context = useContext(CRMAuthContext);
  if (!context) {
    throw new Error('useCRMAuth must be used within CRMAuthProvider');
  }
  return context;
}
