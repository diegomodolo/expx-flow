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
import CampanhaDetalhes from "./pages/CampanhaDetalhes";
import Colaboradores from "./pages/Colaboradores";
import Squad from "./pages/Squad";
import Tarefas from "./pages/Tarefas";
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
import GeradorCampanhas from "./pages/GeradorCampanhas";
import NotFound from "./pages/NotFound";
import FacebookCallback from "./pages/FacebookCallback";

// Context providers
import { AuthProvider } from "@/hooks/useAuth";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <CompanyProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<FacebookCallback />} />
              
               {/* Protected routes */}
               <Route path="/dashboard" element={
                 <ProtectedRoute>
                   <DashboardPage />
                 </ProtectedRoute>
               } />
               <Route path="/ia" element={
                 <ProtectedRoute>
                   <IAChat />
                 </ProtectedRoute>
               } />
                <Route path="/clientes" element={
                  <ProtectedRoute>
                    <Clientes />
                  </ProtectedRoute>
                } />
                <Route path="/clientes/:id" element={
                  <ProtectedRoute>
                    <ClienteDetalhes />
                  </ProtectedRoute>
                } />
               <Route path="/campanhas" element={
                 <ProtectedRoute>
                   <Campanhas />
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
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;