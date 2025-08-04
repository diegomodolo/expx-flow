import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileText, Save, Plus, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

interface ReportLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  onExportPDF?: () => void;
  onSendEmail?: () => void;
  showFilters?: boolean;
  availableClients?: { id: string; name: string }[];
}

export function ReportLayout({ 
  title, 
  description, 
  children, 
  onExportPDF, 
  onSendEmail,
  showFilters = true,
  availableClients = []
}: ReportLayoutProps) {
  const navigate = useNavigate();
  const [showExtraFilters, setShowExtraFilters] = useState(false);

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        {/* Header Section */}
        <div className="space-y-6">
          {/* Title and Actions */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar para Dashboard
              </Button>
              {onExportPDF && (
                <Button variant="outline" size="sm" onClick={onExportPDF}>
                  <FileText className="w-4 h-4 mr-1" />
                  PDF
                </Button>
              )}
              <Button size="sm">
                <Save className="w-4 h-4 mr-1" />
                Salvar
              </Button>
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-foreground">Filtros</h3>
                  <p className="text-xs text-muted-foreground">Configure os parâmetros para análise de distribuição de orçamento</p>
                  
                  {/* Primeira linha de filtros */}
                  <div className="flex items-end gap-4 flex-wrap">
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 flex-1">
                      {/* Cliente */}
                      <div className="space-y-2">
                        <Label htmlFor="cliente" className="text-xs font-medium">Cliente</Label>
                        <Select>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Todos os clientes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os clientes</SelectItem>
                            {availableClients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Nível de Severidade */}
                      <div className="space-y-2">
                        <Label htmlFor="severidade" className="text-xs font-medium">Nível de Severidade</Label>
                        <Select>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Todos os níveis" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os níveis</SelectItem>
                            <SelectItem value="critico">Crítico (&gt; 60%)</SelectItem>
                            <SelectItem value="moderado">Moderado (30-60%)</SelectItem>
                            <SelectItem value="leve">Leve (&lt; 30%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Orçamento Mínimo */}
                      <div className="space-y-2">
                        <Label htmlFor="orcamento-minimo" className="text-xs font-medium">Orçamento Mínimo</Label>
                        <Select>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Sem limite" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sem-limite">Sem limite</SelectItem>
                            <SelectItem value="1000">R$ 1.000+</SelectItem>
                            <SelectItem value="5000">R$ 5.000+</SelectItem>
                            <SelectItem value="10000">R$ 10.000+</SelectItem>
                            <SelectItem value="50000">R$ 50.000+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Botão + Filtros */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowExtraFilters(!showExtraFilters)}
                      className="h-8 mb-2"
                    >
                      {showExtraFilters ? (
                        <>
                          <Minus className="w-3 h-3 mr-1" />
                          Filtros
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 mr-1" />
                          Filtros
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Segunda linha de filtros (condicional) */}
                  {showExtraFilters && (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
                      {/* Tipo de Desequilíbrio */}
                      <div className="space-y-2">
                        <Label htmlFor="tipo-desequilibrio" className="text-xs font-medium">Tipo de Desequilíbrio</Label>
                        <Select>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Todos os tipos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os tipos</SelectItem>
                            <SelectItem value="excesso">Excesso de verba</SelectItem>
                            <SelectItem value="deficit">Déficit de verba</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Etapa do Funil */}
                      <div className="space-y-2">
                        <Label htmlFor="etapa-funil" className="text-xs font-medium">Etapa do Funil</Label>
                        <Select>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Todas as etapas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas as etapas</SelectItem>
                            <SelectItem value="topo">Topo do Funil</SelectItem>
                            <SelectItem value="meio">Meio do Funil</SelectItem>
                            <SelectItem value="fundo">Fundo do Funil</SelectItem>
                            <SelectItem value="retencao">Retenção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {children}
      </div>
    </DashboardLayout>
  );
}