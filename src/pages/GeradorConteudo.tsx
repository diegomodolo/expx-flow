import React from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ContentGrid } from "@/components/content-generator/ContentGrid";
import { Sparkles } from "lucide-react";

export default function GeradorConteudo() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gerador de Conteúdo com IA</h1>
            <p className="text-muted-foreground">
              Crie conteúdo profissional para redes sociais, anúncios e campanhas
            </p>
          </div>
        </div>
        
        <ContentGrid />
      </div>
    </DashboardLayout>
  );
}