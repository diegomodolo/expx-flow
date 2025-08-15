import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Palette, Sparkles, History, Settings } from "lucide-react";
import { CreativeGenerator } from "@/components/creative-generator/CreativeGenerator";
import { CreativeHistory } from "@/components/creative-generator/CreativeHistory";
import { IdeogramPromptConfigModal } from "@/components/creative-generator/IdeogramPromptConfigModal";

export default function GeradorCriativos() {
  const [activeTab, setActiveTab] = useState("generate");
  const [showPromptConfig, setShowPromptConfig] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Palette className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gerador de Criativos com IA</h1>
              <p className="text-muted-foreground">
                Crie criativos visuais profissionais com inteligência artificial
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPromptConfig(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Configurar Prompt
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Gerar Novo
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="mt-6">
            <CreativeGenerator />
          </TabsContent>
          
          <TabsContent value="history" className="mt-6">
            <CreativeHistory />
          </TabsContent>
        </Tabs>
        
        <IdeogramPromptConfigModal
          open={showPromptConfig}
          onOpenChange={setShowPromptConfig}
        />
      </div>
    </DashboardLayout>
  );
}