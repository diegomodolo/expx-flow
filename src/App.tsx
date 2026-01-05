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
import KeywordPlannerPage from "./pages/KeywordPlanner";
import RepositorioCriativos from "./pages/RepositorioCriativos";
import PublicContentReview from "./pages/PublicContentReview";
import { AuthProvider } from "@/hooks/useAuth";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { CRMAuthProvider } from "@/contexts/CRMAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "next-themes";

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
              <Route path="/content-review" element={<PublicContentReview />} />
              
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
               } />
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
                 <ProtectedRoute>
                   <IAChat />
                 </ProtectedRoute>
               } />
               <Route path="/ia/agents" element={
                 <ProtectedRoute>
                   <AgentesIA />
                 </ProtectedRoute>
               } />
               <Route path="/ia/agents/new" element={
                 <ProtectedRoute>
                   <AgentEdit />
                 </ProtectedRoute>
               } />
               <Route path="/ia/agents/:agentId" element={
                 <ProtectedRoute>
                   <AgentChat />
                 </ProtectedRoute>
               } />
               <Route path="/ia/agents/:agentId/edit" element={
                 <ProtectedRoute>
                   <AgentEdit />
                 </ProtectedRoute>
               } />
                <Route path="/clientes" element={
                  <ProtectedRoute>
                    <Clientes />
                  </ProtectedRoute>
                } />
                 <Route path="/clientes/:id/*" element={
                   <ProtectedRoute>
                     <ClienteDetalhes />
                   </ProtectedRoute>
                 } />
                <Route path="/campanhas" element={
                  <ProtectedRoute>
                    <Campanhas />
                  </ProtectedRoute>
                } />
                <Route path="/campanhas-unificadas" element={
                  <ProtectedRoute>
                    <CampanhasUnificadas />
                  </ProtectedRoute>
                } />
                <Route path="/campanhas/:id" element={
                  <ProtectedRoute>
                    <CampanhaDetalhes />
                  </ProtectedRoute>
                } />
               <Route path="/colaboradores" element={
                 <ProtectedRoute>
                   <Colaboradores />
                 </ProtectedRoute>
               } />
               <Route path="/squad" element={
                 <ProtectedRoute>
                   <Squad />
                 </ProtectedRoute>
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
                  <ProtectedRoute>
                    <Relatorios />
                  </ProtectedRoute>
                } />
                <Route path="/relatorios/executivo" element={
                  <ProtectedRoute>
                    <RelatorioExecutivo />
                  </ProtectedRoute>
                } />
                 <Route path="/relatorios/funil" element={
                   <ProtectedRoute>
                     <RelatorioFunil />
                   </ProtectedRoute>
                 } />
                  <Route path="/relatorios/concorrencia" element={
                    <ProtectedRoute>
                      <RelatorioAnaliseCompetitiva />
                    </ProtectedRoute>
                  } />
                 <Route path="/relatorios/clientes-zona-critica" element={
                   <ProtectedRoute>
                     <RelatorioClientesZonaCritica />
                   </ProtectedRoute>
                 } />
                 <Route path="/relatorios/criativos-baixo-desempenho" element={
                   <ProtectedRoute>
                     <RelatorioCriativosBaixoDesempenho />
                   </ProtectedRoute>
                 } />
                 <Route path="/relatorios/campanhas-ineficientes" element={
                   <ProtectedRoute>
                     <RelatorioCampanhasIneficientes />
                   </ProtectedRoute>
                 } />
                 <Route path="/relatorios/orcamento-mal-distribuido" element={
                   <ProtectedRoute>
                     <RelatorioOrcamentoMalDistribuido />
                   </ProtectedRoute>
                 } />
                 <Route path="/relatorios/oportunidades" element={
                   <ProtectedRoute>
                     <RelatorioOportunidades />
                   </ProtectedRoute>
                 } />
                 <Route path="/relatorios/performance-cliente" element={
                   <ProtectedRoute>
                     <RelatorioPerformanceCliente />
                   </ProtectedRoute>
                 } />
                 <Route path="/relatorios/campanhas" element={
                   <ProtectedRoute>
                     <RelatorioCampanhas />
                   </ProtectedRoute>
                 } />
                 <Route path="/relatorios/tarefas-planner" element={
                   <ProtectedRoute>
                     <RelatorioTarefasPlanner />
                   </ProtectedRoute>
                 } />
                 <Route path="/relatorios/produtividade-squads" element={
                   <ProtectedRoute>
                     <RelatorioProdutividadeSquads />
                   </ProtectedRoute>
                 } />
                 <Route path="/relatorios/rh-colaboradores" element={
                   <ProtectedRoute>
                     <RelatorioRHColaboradores />
                   </ProtectedRoute>
                 } />
                 <Route path="/relatorios/alertas-criticos" element={
                   <ProtectedRoute>
                     <RelatorioAlertasCriticos />
                   </ProtectedRoute>
                 } />
                 <Route path="/relatorios/snapshots-performance" element={
                   <ProtectedRoute>
                     <RelatorioSnapshotsPerformance />
                   </ProtectedRoute>
                 } />
                 <Route path="/leads-desqualificados" element={
                   <ProtectedRoute>
                     <AdminLeadReports />
                   </ProtectedRoute>
                 } />
                 {/* Nova página de Geradores */}
                 <Route path="/geradores" element={
                  <ProtectedRoute>
                    <Geradores />
                  </ProtectedRoute>
                } />
                 {/* Novas rotas dos geradores */}
                 <Route path="/geradores/campanhas" element={
                  <ProtectedRoute>
                    <GeradorCampanhas />
                  </ProtectedRoute>
                } />
                 <Route path="/geradores/campanhas/:id" element={
                  <ProtectedRoute>
                    <GeradorCampanhas />
                  </ProtectedRoute>
                 } />
                 <Route path="/geradores/conteudo" element={
                  <ProtectedRoute>
                    <GeradorConteudo />
                  </ProtectedRoute>
                } />
                 <Route path="/geradores/criativos" element={
                  <ProtectedRoute>
                    <GeradorCriativos />
                  </ProtectedRoute>
                } />
                 <Route path="/geradores/apresentacoes" element={
                  <ProtectedRoute>
                    <GeradorApresentacoes />
                  </ProtectedRoute>
                } />
                 <Route path="/geradores/apresentacoes/:id" element={
                  <ProtectedRoute>
                    <ApresentacaoDetalhes />
                  </ProtectedRoute>
                } />
                 <Route path="/geradores/planejamento-conteudo" element={
                  <ProtectedRoute>
                    <PlanejamentoConteudo />
                  </ProtectedRoute>
                } />
                 {/* Fábrica de Anúncios - Rotas aninhadas */}
                 <Route path="/geradores/fabrica-anuncios" element={
                  <ProtectedRoute>
                    <FabricaAnuncios />
                  </ProtectedRoute>
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
                  <ProtectedRoute>
                    <FabricaCriativos />
                  </ProtectedRoute>
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
                  <ProtectedRoute>
                    <FabricaCarrosseis />
                  </ProtectedRoute>
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
                  <ProtectedRoute>
                    <RepositorioCriativos />
                  </ProtectedRoute>
                } />
                 {/* Rotas antigas - redirects para compatibilidade */}
                 <Route path="/gerador-campanhas" element={
                  <ProtectedRoute>
                    <GeradorCampanhas />
                  </ProtectedRoute>
                } />
                 <Route path="/gerador-campanhas/:id" element={
                  <ProtectedRoute>
                    <GeradorCampanhas />
                  </ProtectedRoute>
                 } />
                 <Route path="/gerador-conteudo" element={
                  <ProtectedRoute>
                    <GeradorConteudo />
                  </ProtectedRoute>
                } />
                 <Route path="/gerador-criativos" element={
                  <ProtectedRoute>
                    <GeradorCriativos />
                  </ProtectedRoute>
                } />
                 <Route path="/editor-funil" element={
                  <ProtectedRoute>
                    <EditorFunil />
                  </ProtectedRoute>
                } />
                 <Route path="/editor-funil/:clientId/:funnelId" element={
                  <ProtectedRoute>
                    <FunnelEditor />
                  </ProtectedRoute>
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
                   <ProtectedRoute>
                     <NotificacoesWhatsApp />
                   </ProtectedRoute>
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
                <Route path="/configuracoes/*" element={
                   <ProtectedRoute>
                     <Configuracoes />
                   </ProtectedRoute>
                 } />
                <Route path="/perfil/*" element={
                  <ProtectedRoute>
                    <Perfil />
                  </ProtectedRoute>
                } />
              
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