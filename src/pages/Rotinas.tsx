import React from "react";
import { Navigate } from "react-router-dom";

const Rotinas = () => {
  // Redirecionar para a página de tarefas que agora inclui o sistema de quadros individuais
  return <Navigate to="/tarefas" replace />;
};

export default Rotinas;
