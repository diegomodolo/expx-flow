import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Simple placeholder components for now
const LandingPage = () => (
  <div className="min-h-screen p-8">
    <h1 className="text-2xl font-bold">Landing Page</h1>
    <a href="/configuracoes" className="text-blue-500 underline">Go to Settings</a>
  </div>
);

const ConfiguracoesPage = () => (
  <div className="min-h-screen p-8">
    <h1 className="text-2xl font-bold">Configurações</h1>
    <p>Settings page is working!</p>
    <a href="/" className="text-blue-500 underline">Back to Home</a>
  </div>
);

const NotFound = () => (
  <div className="min-h-screen p-8">
    <h1 className="text-2xl font-bold">Page Not Found</h1>
    <a href="/" className="text-blue-500 underline">Go Home</a>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/configuracoes/*" element={<ConfiguracoesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;