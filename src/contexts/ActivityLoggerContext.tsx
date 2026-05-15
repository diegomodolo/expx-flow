import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { insertActivityLog, resetSessionId } from "@/lib/activityLogger";

const ROUTE_MODULE_MAP: [string, string][] = [
  ["/dashboard-trafego", "Dashboard de Tráfego"],
  ["/dashboard-orcamento", "Dashboard de Orçamento"],
  ["/dashboard", "Dashboard"],
  ["/clientes", "Clientes"],
  ["/campanhas-unificadas", "Campanhas Unificadas"],
  ["/campanhas", "Campanhas"],
  ["/ia/agents", "Agentes IA"],
  ["/ia/squads", "Agentes IA"],
  ["/ia", "Inteligência Artificial"],
  ["/relatorios", "Relatórios"],
  ["/tarefas", "Tarefas"],
  ["/colaboradores", "Colaboradores"],
  ["/squad", "Squad"],
  ["/geradores/carrosseis", "Fábrica de Carrosseis"],
  ["/geradores/criativos", "Fábrica de Criativos"],
  ["/geradores/conteudo", "Gerador de Conteúdo"],
  ["/geradores", "Geradores"],
  ["/automacoes", "Automações"],
  ["/lead-intelligence", "Lead Intelligence"],
  ["/notificacoes", "Notificações"],
  ["/configuracoes", "Configurações"],
  ["/perfil", "Perfil"],
];

export function resolveModule(pathname: string): string {
  for (const [prefix, module] of ROUTE_MODULE_MAP) {
    if (pathname.startsWith(prefix)) return module;
  }
  return "Outro";
}

interface ActivityLoggerContextValue {
  logAction: (
    actionName: string,
    options?: {
      module?: string;
      entityType?: string;
      entityId?: string;
      metadata?: Record<string, unknown>;
    },
  ) => void;
}

const ActivityLoggerContext = createContext<
  ActivityLoggerContextValue | undefined
>(undefined);

export function ActivityLoggerProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const prevUserRef = useRef<string | null>(null);
  const companyIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const pageEntryTimeRef = useRef<number>(Date.now());
  const prevPathRef = useRef<string>("");

  useEffect(() => {
    companyIdRef.current = activeCompany?.company_id ?? null;
    userIdRef.current = user?.id ?? null;
  }, [user, activeCompany]);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const prevUserId = prevUserRef.current;

    if (prevUserId === currentUserId) return;
    prevUserRef.current = currentUserId;

    if (!activeCompany?.company_id) return;

    if (currentUserId && !prevUserId) {
      resetSessionId();
      insertActivityLog({
        company_id: activeCompany.company_id,
        user_id: currentUserId,
        event_type: "login",
        module: "Sistema",
      });
    } else if (!currentUserId && prevUserId) {
      if (companyIdRef.current) {
        insertActivityLog({
          company_id: companyIdRef.current,
          user_id: prevUserId,
          event_type: "logout",
          module: "Sistema",
        });
      }
    }
  }, [user, activeCompany]);

  useEffect(() => {
    const now = Date.now();
    const companyId = companyIdRef.current;
    const userId = userIdRef.current;
    const prevPath = prevPathRef.current;

    if (prevPath && companyId && userId) {
      const duration = now - pageEntryTimeRef.current;
      insertActivityLog({
        company_id: companyId,
        user_id: userId,
        event_type: "page_view",
        page_path: prevPath,
        module: resolveModule(prevPath),
        duration_ms: duration,
      });
    }

    pageEntryTimeRef.current = now;
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  const logAction = (
    actionName: string,
    options?: {
      module?: string;
      entityType?: string;
      entityId?: string;
      metadata?: Record<string, unknown>;
    },
  ) => {
    const companyId = companyIdRef.current;
    const userId = userIdRef.current;
    if (!companyId || !userId) return;

    insertActivityLog({
      company_id: companyId,
      user_id: userId,
      event_type: "action",
      page_path: location.pathname,
      module: options?.module ?? resolveModule(location.pathname),
      action_name: actionName,
      entity_type: options?.entityType,
      entity_id: options?.entityId,
      metadata: options?.metadata,
    });
  };

  return (
    <ActivityLoggerContext.Provider value={{ logAction }}>
      {children}
    </ActivityLoggerContext.Provider>
  );
}

export function useActivityLoggerContext() {
  const ctx = useContext(ActivityLoggerContext);
  if (!ctx)
    throw new Error(
      "useActivityLoggerContext must be used within ActivityLoggerProvider",
    );
  return ctx;
}
