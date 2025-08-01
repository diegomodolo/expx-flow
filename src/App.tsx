import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Public pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Protected pages
import DashboardPage from "./pages/DashboardPage";
import Clientes from "./pages/Clientes";
import Campanhas from "./pages/Campanhas";
import Squad from "./pages/Squad";
import Colaboradores from "./pages/Colaboradores";
import Tarefas from "./pages/Tarefas";
import Relatorios from "./pages/Relatorios";
import Conhecimento from "./pages/Conhecimento";
import Configuracoes from "./pages/Configuracoes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CompanyProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/clientes" element={
              <ProtectedRoute>
                <Clientes />
              </ProtectedRoute>
            } />
            <Route path="/campanhas" element={
              <ProtectedRoute>
                <Campanhas />
              </ProtectedRoute>
            } />
            <Route path="/squad" element={
              <ProtectedRoute>
                <Squad />
              </ProtectedRoute>
            } />
            <Route path="/colaboradores" element={
              <ProtectedRoute>
                <Colaboradores />
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
            <Route path="/conhecimento" element={
              <ProtectedRoute>
                <Conhecimento />
              </ProtectedRoute>
            } />
            <Route path="/configuracoes/*" element={
              <ProtectedRoute>
                <Configuracoes />
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
