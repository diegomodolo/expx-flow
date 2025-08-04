import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileText, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

interface ReportLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  onExportPDF?: () => void;
  onSendEmail?: () => void;
  showFilters?: boolean;
}

export function ReportLayout({ 
  title, 
  description, 
  children, 
  onExportPDF, 
  onSendEmail,
  showFilters = true
}: ReportLayoutProps) {
  const navigate = useNavigate();

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
                  <p className="text-xs text-muted-foreground">Configure os parâmetros do relatório (Esta seção especifica)</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Data Inicial */}
                    <div className="space-y-2">
                      <Label htmlFor="data-inicial" className="text-xs font-medium">Data Inicial</Label>
                      <div className="relative">
                        <Input
                          id="data-inicial"
                          type="date"
                          className="h-8 text-xs"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>

                    {/* Data Final */}
                    <div className="space-y-2">
                      <Label htmlFor="data-final" className="text-xs font-medium">Data Final</Label>
                      <Input
                        id="data-final"
                        type="date"
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Cliente */}
                    <div className="space-y-2">
                      <Label htmlFor="cliente" className="text-xs font-medium">Cliente</Label>
                      <Select>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos os clientes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os clientes</SelectItem>
                          <SelectItem value="cliente1">Cliente 1</SelectItem>
                          <SelectItem value="cliente2">Cliente 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Colaborador */}
                    <div className="space-y-2">
                      <Label htmlFor="colaborador" className="text-xs font-medium">Colaborador</Label>
                      <Select>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos os colaboradores" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os colaboradores</SelectItem>
                          <SelectItem value="colaborador1">Colaborador 1</SelectItem>
                          <SelectItem value="colaborador2">Colaborador 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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