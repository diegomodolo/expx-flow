import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Public pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Protected pages 
import DashboardPage from "./pages/DashboardPage";
import Configuracoes from "./pages/Configuracoes";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Protected routes - temporarily without protection */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/configuracoes/*" element={<Configuracoes />} />
        
        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;