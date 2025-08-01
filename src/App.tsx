import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Import the real pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import Configuracoes from "./pages/Configuracoes";
import Clientes from "./pages/Clientes";
import Campanhas from "./pages/Campanhas";
import Colaboradores from "./pages/Colaboradores";
import Squad from "./pages/Squad";
import Tarefas from "./pages/Tarefas";
import Relatorios from "./pages/Relatorios";
import Conhecimento from "./pages/Conhecimento";
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
    </QueryClientProvider>
  );
};

export default App;