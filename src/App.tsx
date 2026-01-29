import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Import the real pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import IAChat from "./pages/IAChat";
import Configuracoes from "./pages/Configuracoes";
import Perfil from "./pages/Perfil";
import Clientes from "./pages/Clientes";
import ClienteDetalhes from "./pages/ClienteDetalhes";
import Campanhas from "./pages/Campanhas";
import CampanhasUnificadas from "./pages/CampanhasUnificadas";
import CampanhaDetalhes from "./pages/CampanhaDetalhes";
import Colaboradores from "./pages/Colaboradores";
import Squad from "./pages/Squad";
import Tarefas from "./pages/Tarefas";
import TarefasRecorrentes from "./pages/TarefasRecorrentes";
import Relatorios from "./pages/Relatorios";
import RelatorioExecutivo from "./pages/reports/RelatorioExecutivo";
import RelatorioFunil from "./pages/reports/RelatorioFunil";
import RelatorioAnaliseCompetitiva from "./pages/reports/RelatorioAnaliseCompetitiva";
import RelatorioClientesZonaCritica from "./pages/reports/RelatorioClientesZonaCritica";
import RelatorioCriativosBaixoDesempenho from "./pages/reports/RelatorioCriativosBaixoDesempenho";
import RelatorioCampanhasIneficientes from "./pages/reports/RelatorioCampanhasIneficientes";
import RelatorioOrcamentoMalDistribuido from "./pages/reports/RelatorioOrcamentoMalDistribuido";
import RelatorioOportunidades from "./pages/reports/RelatorioOportunidades";
import RelatorioPerformanceCliente from "./pages/reports/RelatorioPerformanceCliente";
import RelatorioCampanhas from "./pages/reports/RelatorioCampanhas";
import RelatorioTarefasPlanner from "./pages/reports/RelatorioTarefasPlanner";
import RelatorioProdutividadeSquads from "./pages/reports/RelatorioProdutividadeSquads";
import RelatorioRHColaboradores from "./pages/reports/RelatorioRHColaboradores";
import RelatorioAlertasCriticos from "./pages/reports/RelatorioAlertasCriticos";
import RelatorioSnapshotsPerformance from "./pages/reports/RelatorioSnapshotsPerformance";
import RelatorioSaldoPrePagos from "./pages/reports/RelatorioSaldoPrePagos";
import RelatoriosMarketing from "./pages/marketing/RelatoriosMarketing";
import GeradorCampanhas from "./pages/GeradorCampanhas";
import GeradorConteudo from "./pages/GeradorConteudo";
import GeradorCriativos from "./pages/GeradorCriativos";
import GeradorApresentacoes from "./pages/GeradorApresentacoes";
import ApresentacaoDetalhes from "./pages/ApresentacaoDetalhes";
import Geradores from "./pages/Geradores";
import RevisaoDiaria from "./pages/geradores/RevisaoDiaria";
import ConfiguracaoFabrica from "./pages/geradores/ConfiguracaoFabrica";
import AnunciosVencedores from "./pages/geradores/AnunciosVencedores";
import DashboardFabrica from "./pages/geradores/DashboardFabrica";
import HistoricoGeracoes from "./pages/geradores/HistoricoGeracoes";
import HistoricoPublicacoesAutopilot from "./pages/geradores/HistoricoPublicacoesAutopilot";
import FabricaAnuncios from "./pages/geradores/FabricaAnuncios";
import FabricaCriativos from "./pages/geradores/FabricaCriativos";
import DashboardFabricaCriativos from "./pages/geradores/DashboardFabricaCriativos";
import RevisaoDiariaCriativos from "./pages/geradores/RevisaoDiariaCriativos";
import ConfiguracaoFabricaCriativos from "./pages/geradores/ConfiguracaoFabricaCriativos";
import TemasFabricaCriativos from "./pages/geradores/TemasFabricaCriativos";
import HistoricoGeracoesCriativos from "./pages/geradores/HistoricoGeracoesCriativos";
import CriativosPublicados from "./pages/geradores/CriativosPublicados";
import FabricaCarrosseis from "./pages/geradores/FabricaCarrosseis";
import DashboardFabricaCarrosseis from "./pages/geradores/DashboardFabricaCarrosseis";
import RevisaoDiariaCarrosseis from "./pages/geradores/RevisaoDiariaCarrosseis";
import ConfiguracaoFabricaCarrosseis from "./pages/geradores/ConfiguracaoFabricaCarrosseis";
import TemasFabricaCarrosseis from "./pages/geradores/TemasFabricaCarrosseis";
import HistoricoGeracoesCarrosseis from "./pages/geradores/HistoricoGeracoesCarrosseis";
import CarrosseisPublicados from "./pages/geradores/CarrosseisPublicados";
import PlanejamentoConteudo from "./pages/PlanejamentoConteudo";
import GeradorCarrosseis from "./pages/GeradorCarrosseis";
import AgentesIA from "./pages/AgentesIA";
import AgentChat from "./pages/AgentChat";
import AgentEdit from "./pages/AgentEdit";
import EditorFunil from "./pages/EditorFunil";
import { FunnelEditor } from "./components/funnel-editor/FunnelEditor";
import NotFound from "./pages/NotFound";
import FacebookCallback from "./pages/FacebookCallback";
import GoogleAdsCallback from "./pages/GoogleAdsCallback";
import ReportLeadDesqualificado from "./pages/ReportLeadDesqualificado";
import AdminLeadReports from "./pages/AdminLeadReports";
import CRMPublicView from "./pages/CRMPublicView";
import CRMLogin from "./pages/CRMLogin";
import Automacoes from "./pages/Automacoes";
import DashboardOrcamento from "./pages/DashboardOrcamento";
import ClientDashboardPublic from "./pages/ClientDashboardPublic";
import Agendamento from "./pages/Agendamento";
import ApresentacaoPublica from "./pages/ApresentacaoPublica";
import ApresentacaoResultadosPublica from "./pages/ApresentacaoResultadosPublica";
import NotificacoesWhatsApp from "./pages/NotificacoesWhatsApp";
import LeadIntelligenceHub from "./pages/LeadIntelligenceHub";
import LeadIntelligenceSegmentsView from "./pages/LeadIntelligenceSegmentsView";
import LeadIntelligenceSegments from "./pages/LeadIntelligenceSegments";
import LeadIntelligenceHistory from "./pages/LeadIntelligenceHistory";
import LeadIntelligenceFilters from "./pages/LeadIntelligenceFilters";
import LeadIntelligenceApiKeys from "./pages/LeadIntelligenceApiKeys";
import CnaeBaseDashboard from "./pages/CnaeBaseDashboard";
import CnaeLeadsView from "./pages/CnaeLeadsView";
import GoogleProspectingPage from "./pages/GoogleProspectingPage";
import InstagramProspectingPage from "./pages/InstagramProspectingPage";
import RadarSaude from "./pages/RadarSaude";
import RadarSaudeDashboard from "./pages/radar/RadarSaudeDashboard";
import RadarUrlsDashboard from "./pages/radar/RadarUrlsDashboard";
import Rotinas from "./pages/Rotinas";
import AutomatizadoresHub from "./pages/AutomatizadoresHub";
import AutomatizadoresInstagram from "./pages/AutomatizadoresInstagram";
import AutomatizadorInstagramDetalhes from "./pages/AutomatizadorInstagramDetalhes";
import AutomatizadoresWordpress from "./pages/AutomatizadoresWordpress";
import AutomatizadorWordpressDetalhes from "./pages/AutomatizadorWordpressDetalhes";
import AlertasDoSistema from "./pages/AlertasDoSistema";
import DashboardTrafego from "./pages/DashboardTrafego";
import DashboardTrafegoPublic from "./pages/DashboardTrafegoPublic";
import DashboardSocialTVPublic from "./pages/DashboardSocialTVPublic";
import DashboardRadarTVPublic from "./pages/DashboardRadarTVPublic";
import DashboardCSTVPublic from "./pages/DashboardCSTVPublic";
import KeywordPlannerPage from "./pages/KeywordPlanner";
import RepositorioCriativos from "./pages/RepositorioCriativos";
import PublicContentReview from "./pages/PublicContentReview";
import CSLayout from "./components/cs/CSLayout";
import CSCockpitPage from "./pages/cs/CSCockpitPage";
import CSPortfolioPage from "./pages/cs/CSPortfolioPage";
import CSJourneyKanbanPage from "./pages/cs/CSJourneyKanbanPage";
import CSActionsPage from "./pages/cs/CSActionsPage";
import CSClientsList from "./pages/cs/CSClientsList";
import CSTVPage from "./pages/cs/CSTVPage";
import ValueStatementPublic from "./pages/cs/ValueStatementPublic";
import { AuthProvider } from "@/hooks/useAuth";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { CRMAuthProvider } from "@/contexts/CRMAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PermissionProtectedRoute } from "@/components/PermissionProtectedRoute";
import SuperAdmin from "@/pages/SuperAdmin";
import { ThemeProvider } from "next-themes";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="light" 
        enableSystem={false}
        storageKey="dashboard-theme"
      >
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <CompanyProvider>
              <CRMAuthProvider>
                <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<FacebookCallback />} />
              <Route path="/google-ads/callback" element={<GoogleAdsCallback />} />
              <Route path="/report-lead-desqualificado/:token" element={<ReportLeadDesqualificado />} />
              <Route path="/dashboard-publico/:token" element={<ClientDashboardPublic />} />
              <Route path="/apresentacao/:token" element={<ApresentacaoPublica />} />
              <Route path="/resultados/:token" element={<ApresentacaoResultadosPublica />} />
              <Route path="/crm/:token/login" element={<CRMLogin />} />
              <Route path="/crm/:token/*" element={<CRMPublicView />} />
              <Route path="/tv/:token" element={<DashboardTrafegoPublic />} />
              <Route path="/social-tv/:token" element={<DashboardSocialTVPublic />} />
              <Route path="/radar-tv/:token" element={<DashboardRadarTVPublic />} />
              <Route path="/cs-tv/:token" element={<DashboardCSTVPublic />} />
              <Route path="/content-review" element={<PublicContentReview />} />
              <Route path="/super-admin" element={<SuperAdmin />} />
              
               {/* Protected routes */}
               <Route path="/dashboard" element={
                 <ProtectedRoute>
                   <DashboardPage />
                 </ProtectedRoute>
               } />
               <Route path="/radar-saude" element={
                 <ProtectedRoute>
                   <RadarSaude />
                 </ProtectedRoute>
               }>
                 <Route index element={<RadarSaudeDashboard />} />
                 <Route path="urls" element={<RadarUrlsDashboard />} />
               </Route>
               <Route path="/dashboard-trafego" element={
                 <ProtectedRoute>
                   <DashboardTrafego />
                 </ProtectedRoute>
               } />
               <Route path="/rotinas" element={
                 <ProtectedRoute>
                   <Rotinas />
                 </ProtectedRoute>
               } />
               <Route path="/ia" element={
                 <PermissionProtectedRoute requiredPermission="ia">
                   <IAChat />
                 </PermissionProtectedRoute>
               } />
               <Route path="/ia/agents" element={
                 <PermissionProtectedRoute requiredPermission="agentes-ia">
                   <AgentesIA />
                 </PermissionProtectedRoute>
               } />
               <Route path="/ia/agents/new" element={
                 <PermissionProtectedRoute requiredPermission="editar-agentes">
                   <AgentEdit />
                 </PermissionProtectedRoute>
               } />
               <Route path="/ia/agents/:agentId" element={
                 <PermissionProtectedRoute requiredPermission="agentes-ia">
                   <AgentChat />
                 </PermissionProtectedRoute>
               } />
               <Route path="/ia/agents/:agentId/edit" element={
                 <PermissionProtectedRoute requiredPermission="editar-agentes">
                   <AgentEdit />
                 </PermissionProtectedRoute>
               } />
                <Route path="/clientes" element={
                  <PermissionProtectedRoute requiredPermission="clientes">
                    <Clientes />
                  </PermissionProtectedRoute>
                } />
                 <Route path="/clientes/:id/*" element={
                   <PermissionProtectedRoute requiredPermission="clientes">
                     <ClienteDetalhes />
                   </PermissionProtectedRoute>
                 } />
                <Route path="/campanhas" element={
                  <PermissionProtectedRoute requiredPermission="campanhas">
                    <Campanhas />
                  </PermissionProtectedRoute>
                } />
                <Route path="/campanhas-unificadas" element={
                  <PermissionProtectedRoute requiredPermission="campanhas">
                    <CampanhasUnificadas />
                  </PermissionProtectedRoute>
                } />
                <Route path="/campanhas/:id" element={
                  <PermissionProtectedRoute requiredPermission="campanhas">
                    <CampanhaDetalhes />
                  </PermissionProtectedRoute>
                } />
               <Route path="/colaboradores" element={
                 <PermissionProtectedRoute requiredPermission="colaboradores">
                   <Colaboradores />
                 </PermissionProtectedRoute>
               } />
               <Route path="/squad" element={
                 <PermissionProtectedRoute requiredPermission="squad">
                   <Squad />
                 </PermissionProtectedRoute>
               } />
                 <Route path="/tarefas" element={
                  <ProtectedRoute>
                    <Tarefas />
                  </ProtectedRoute>
                } />
                <Route path="/tarefas-recorrentes" element={
                  <ProtectedRoute>
                    <TarefasRecorrentes />
                  </ProtectedRoute>
                } />
                 <Route path="/relatorios" element={
                  <PermissionProtectedRoute requiredPermission="relatorios">
                    <Relatorios />
                  </PermissionProtectedRoute>
                } />
                <Route path="/relatorios/executivo" element={
                  <PermissionProtectedRoute requiredPermission="relatorios">
                    <RelatorioExecutivo />
                  </PermissionProtectedRoute>
                } />
                 <Route path="/relatorios/funil" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioFunil />
                   </PermissionProtectedRoute>
                 } />
                  <Route path="/relatorios/concorrencia" element={
                    <PermissionProtectedRoute requiredPermission="relatorios">
                      <RelatorioAnaliseCompetitiva />
                    </PermissionProtectedRoute>
                  } />
                 <Route path="/relatorios/clientes-zona-critica" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioClientesZonaCritica />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/relatorios/criativos-baixo-desempenho" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioCriativosBaixoDesempenho />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/relatorios/campanhas-ineficientes" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioCampanhasIneficientes />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/relatorios/orcamento-mal-distribuido" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioOrcamentoMalDistribuido />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/relatorios/oportunidades" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioOportunidades />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/relatorios/performance-cliente" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioPerformanceCliente />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/relatorios/campanhas" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioCampanhas />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/relatorios/tarefas-planner" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioTarefasPlanner />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/relatorios/produtividade-squads" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioProdutividadeSquads />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/relatorios/rh-colaboradores" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioRHColaboradores />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/relatorios/alertas-criticos" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioAlertasCriticos />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/relatorios/snapshots-performance" element={
                   <PermissionProtectedRoute requiredPermission="relatorios">
                     <RelatorioSnapshotsPerformance />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/leads-desqualificados" element={
                   <ProtectedRoute>
                     <AdminLeadReports />
                   </ProtectedRoute>
                 } />
                 {/* Nova página de Geradores */}
                 <Route path="/geradores" element={
                  <PermissionProtectedRoute requiredPermission="geradores">
                    <Geradores />
                  </PermissionProtectedRoute>
                } />
                 {/* Novas rotas dos geradores */}
                 <Route path="/geradores/campanhas" element={
                  <PermissionProtectedRoute requiredPermission="gerador-campanhas">
                    <GeradorCampanhas />
                  </PermissionProtectedRoute>
                } />
                 <Route path="/geradores/campanhas/:id" element={
                  <PermissionProtectedRoute requiredPermission="gerador-campanhas">
                    <GeradorCampanhas />
                  </PermissionProtectedRoute>
                 } />
                 <Route path="/geradores/conteudo" element={
                  <PermissionProtectedRoute requiredPermission="gerador-conteudo">
                    <GeradorConteudo />
                  </PermissionProtectedRoute>
                } />
                 <Route path="/geradores/criativos" element={
                  <PermissionProtectedRoute requiredPermission="gerador-criativos">
                    <GeradorCriativos />
                  </PermissionProtectedRoute>
                } />
                 {/* Gerador de Carrossel - Standalone */}
                 <Route path="/geradores/carrosseis" element={
                  <PermissionProtectedRoute requiredPermission="geradores">
                    <GeradorCarrosseis />
                  </PermissionProtectedRoute>
                } />
                 <Route path="/geradores/apresentacoes" element={
                  <PermissionProtectedRoute requiredPermission="geradores">
                    <GeradorApresentacoes />
                  </PermissionProtectedRoute>
                } />
                 <Route path="/geradores/apresentacoes/:id" element={
                  <PermissionProtectedRoute requiredPermission="geradores">
                    <ApresentacaoDetalhes />
                  </PermissionProtectedRoute>
                } />
                 <Route path="/geradores/planejamento-conteudo" element={
                  <PermissionProtectedRoute requiredPermission="gerador-conteudo">
                    <PlanejamentoConteudo />
                  </PermissionProtectedRoute>
                } />
                 {/* Fábrica de Anúncios - Rotas aninhadas */}
                 <Route path="/geradores/fabrica-anuncios" element={
                  <PermissionProtectedRoute requiredPermission="geradores">
                    <FabricaAnuncios />
                  </PermissionProtectedRoute>
                }>
                  <Route path="dashboard" element={<DashboardFabrica />} />
                  <Route path="revisao-diaria" element={<RevisaoDiaria />} />
                  <Route path="configuracao" element={<ConfiguracaoFabrica />} />
                  <Route path="vencedores" element={<AnunciosVencedores />} />
                  <Route path="historico" element={<HistoricoGeracoes />} />
                  <Route path="publicacoes-autopilot" element={<HistoricoPublicacoesAutopilot />} />
                </Route>
                 {/* Fábrica de Criativos - Rotas aninhadas */}
                 <Route path="/geradores/fabrica-criativos" element={
                  <PermissionProtectedRoute requiredPermission="gerador-criativos">
                    <FabricaCriativos />
                  </PermissionProtectedRoute>
                }>
                  <Route path="dashboard" element={<DashboardFabricaCriativos />} />
                  <Route path="revisao-diaria" element={<RevisaoDiariaCriativos />} />
                  <Route path="configuracao" element={<ConfiguracaoFabricaCriativos />} />
                  <Route path="temas" element={<TemasFabricaCriativos />} />
                  <Route path="historico" element={<HistoricoGeracoesCriativos />} />
                  <Route path="publicados" element={<CriativosPublicados />} />
                </Route>
                 {/* Fábrica de Carrosseis - Rotas aninhadas */}
                 <Route path="/geradores/fabrica-carrosseis" element={
                  <PermissionProtectedRoute requiredPermission="geradores">
                    <FabricaCarrosseis />
                  </PermissionProtectedRoute>
                }>
                  <Route path="dashboard" element={<DashboardFabricaCarrosseis />} />
                  <Route path="revisao-diaria" element={<RevisaoDiariaCarrosseis />} />
                  <Route path="configuracao" element={<ConfiguracaoFabricaCarrosseis />} />
                  <Route path="temas" element={<TemasFabricaCarrosseis />} />
                  <Route path="historico" element={<HistoricoGeracoesCarrosseis />} />
                  <Route path="publicados" element={<CarrosseisPublicados />} />
                </Route>
                 {/* Repositório de Criativos */}
                 <Route path="/repositorio-criativos" element={
                  <PermissionProtectedRoute requiredPermission="gerador-criativos">
                    <RepositorioCriativos />
                  </PermissionProtectedRoute>
                } />
                 {/* Rotas antigas - redirects para compatibilidade */}
                 <Route path="/gerador-campanhas" element={
                  <PermissionProtectedRoute requiredPermission="gerador-campanhas">
                    <GeradorCampanhas />
                  </PermissionProtectedRoute>
                } />
                 <Route path="/gerador-campanhas/:id" element={
                  <PermissionProtectedRoute requiredPermission="gerador-campanhas">
                    <GeradorCampanhas />
                  </PermissionProtectedRoute>
                 } />
                 <Route path="/gerador-conteudo" element={
                  <PermissionProtectedRoute requiredPermission="gerador-conteudo">
                    <GeradorConteudo />
                  </PermissionProtectedRoute>
                } />
                 <Route path="/gerador-criativos" element={
                  <PermissionProtectedRoute requiredPermission="gerador-criativos">
                    <GeradorCriativos />
                  </PermissionProtectedRoute>
                } />
                 <Route path="/editor-funil" element={
                  <PermissionProtectedRoute requiredPermission="editor-funil">
                    <EditorFunil />
                  </PermissionProtectedRoute>
                } />
                 <Route path="/editor-funil/:clientId/:funnelId" element={
                  <PermissionProtectedRoute requiredPermission="editor-funil">
                    <FunnelEditor />
                  </PermissionProtectedRoute>
                } />
                <Route path="/automacoes" element={
                  <ProtectedRoute>
                    <Automacoes />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard-orcamento" element={
                  <ProtectedRoute>
                    <DashboardOrcamento />
                   </ProtectedRoute>
                 } />
                 <Route path="/agendamento" element={
                    <ProtectedRoute>
                      <Agendamento />
                    </ProtectedRoute>
                  } />
                  <Route path="/automatizadores" element={
                    <ProtectedRoute>
                      <AutomatizadoresHub />
                    </ProtectedRoute>
                  } />
                  <Route path="/automatizadores/instagram" element={
                    <ProtectedRoute>
                      <AutomatizadoresInstagram />
                    </ProtectedRoute>
                  } />
                  <Route path="/automatizadores/instagram/:configId" element={
                    <ProtectedRoute>
                      <AutomatizadorInstagramDetalhes />
                    </ProtectedRoute>
                  } />
                  <Route path="/automatizadores/wordpress" element={
                    <ProtectedRoute>
                      <AutomatizadoresWordpress />
                    </ProtectedRoute>
                  } />
                  <Route path="/automatizadores/wordpress/:configId" element={
                    <ProtectedRoute>
                      <AutomatizadorWordpressDetalhes />
                    </ProtectedRoute>
                  } />
                  <Route path="/notificacoes/whatsapp" element={
                   <PermissionProtectedRoute requiredPermission="whatsapp">
                     <NotificacoesWhatsApp />
                   </PermissionProtectedRoute>
                 } />
                 <Route path="/lead-intelligence" element={
                   <ProtectedRoute>
                     <LeadIntelligenceHub />
                   </ProtectedRoute>
                 } />
                 <Route path="/lead-intelligence/segments-view" element={
                   <ProtectedRoute>
                     <LeadIntelligenceSegmentsView />
                   </ProtectedRoute>
                 } />
                 <Route path="/lead-intelligence/segments" element={
                   <ProtectedRoute>
                     <LeadIntelligenceSegments />
                   </ProtectedRoute>
                 } />
                 <Route path="/lead-intelligence/history" element={
                   <ProtectedRoute>
                     <LeadIntelligenceHistory />
                   </ProtectedRoute>
                 } />
                 <Route path="/lead-intelligence/filters" element={
                   <ProtectedRoute>
                     <LeadIntelligenceFilters />
                   </ProtectedRoute>
                 } />
                 <Route path="/lead-intelligence/api-keys" element={
                    <ProtectedRoute>
                      <LeadIntelligenceApiKeys />
                    </ProtectedRoute>
                   } />
                  <Route path="/lead-intelligence/cnae-base" element={
                    <ProtectedRoute>
                      <CnaeBaseDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/lead-intelligence/cnae-base/:cnaeCode" element={
                    <ProtectedRoute>
                      <CnaeLeadsView />
                    </ProtectedRoute>
                  } />
                  <Route path="/lead-intelligence/google-prospecting" element={
                    <ProtectedRoute>
                      <GoogleProspectingPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/lead-intelligence/instagram-prospecting" element={
                    <ProtectedRoute>
                      <InstagramProspectingPage />
                    </ProtectedRoute>
                  } />
                 <Route path="/alertas" element={
                   <ProtectedRoute>
                     <AlertasDoSistema />
                   </ProtectedRoute>
                 } />
                 <Route path="/keyword-planner" element={
                   <ProtectedRoute>
                     <KeywordPlannerPage />
                   </ProtectedRoute>
                  } />
                 <Route path="/marketing/relatorios" element={
                   <ProtectedRoute>
                     <RelatoriosMarketing />
                   </ProtectedRoute>
                 } />
                 <Route path="/marketing/relatorios/saldo-pre-pagos" element={
                   <ProtectedRoute>
                     <RelatorioSaldoPrePagos />
                   </ProtectedRoute>
                 } />
                <Route path="/configuracoes/*" element={
                   <PermissionProtectedRoute requiredPermission="configuracoes">
                     <Configuracoes />
                   </PermissionProtectedRoute>
                 } />
                <Route path="/perfil/*" element={
                  <ProtectedRoute>
                    <Perfil />
                  </ProtectedRoute>
                } />
                
                {/* Customer Success Module */}
                <Route path="/cs" element={
                  <ProtectedRoute>
                    <CSLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Navigate to="/cs/cockpit" replace />} />
                  <Route path="cockpit" element={<CSCockpitPage />} />
                  <Route path="carteira" element={<CSPortfolioPage />} />
                  <Route path="jornada" element={<CSJourneyKanbanPage />} />
                  <Route path="acoes" element={<CSActionsPage />} />
                  <Route path="clientes" element={<CSClientsList />} />
                  <Route path="tv" element={<CSTVPage />} />
                </Route>
                
                {/* Public CS Routes */}
                <Route path="/cs/value-statement/:token" element={<ValueStatementPublic />} />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </CRMAuthProvider>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;