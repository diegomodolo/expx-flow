import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ContentGrid } from "@/components/content-generator/ContentGrid";
import { SavedContentsList } from "@/components/content-generator/SavedContentsList";
import { useContentGenerations } from "@/hooks/useContentGenerations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles, History, Settings, Home } from "lucide-react";
import { PromptConfigurationList } from "@/components/content-generator/PromptConfigurationList";

export default function GeradorConteudo() {
  const navigate = useNavigate();
  const { generations } = useContentGenerations();
  const [activeTab, setActiveTab] = useState("generate");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/geradores')}
            className="flex items-center gap-2 mb-4"
          >
            <Home className="w-4 h-4" />
            Voltar para Geradores
          </Button>
          
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
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Gerar Novo
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Conteúdos Salvos
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="mt-6">
            <ContentGrid />
          </TabsContent>
          
          <TabsContent value="saved" className="mt-6">
            <SavedContentsList />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-6">
            <PromptConfigurationList />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}