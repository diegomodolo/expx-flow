import { useState } from "react";
import { SearchableClientSelect } from "@/components/ui/searchable-client-select";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  Link,
  Download,
  TrendingUp,
  ArrowUpDown,
  X,
  Plus,
  Sparkles,
} from "lucide-react";
import { useKeywordPlanner } from "@/hooks/useKeywordPlanner";
import { useCompany } from "@/contexts/CompanyContext";
import { useClients } from "@/hooks/useClients";

type SortField = "keyword" | "avgMonthlySearches" | "competition" | "cpcLow" | "cpcHigh";
type SortDirection = "asc" | "desc";

export default function KeywordPlannerPage() {
  const { activeCompany } = useCompany();
  const { clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [inputMode, setInputMode] = useState<"keywords" | "url">("keywords");
  const [keywordInput, setKeywordInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [seedKeywords, setSeedKeywords] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("avgMonthlySearches");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [competitionFilter, setCompetitionFilter] = useState<string>("all");

  const {
    loading,
    keywords,
    generateKeywordIdeas,
    formatCurrency,
    formatNumber,
    getCompetitionLabel,
    getCompetitionColor,
    clearKeywords,
  } = useKeywordPlanner({
    companyId: activeCompany?.company_id || "",
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleAddKeyword = () => {
    const keyword = keywordInput.trim();
    if (keyword && !seedKeywords.includes(keyword)) {
      setSeedKeywords([...seedKeywords, keyword]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setSeedKeywords(seedKeywords.filter((k) => k !== keyword));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSearch = async () => {
    if (inputMode === "keywords" && seedKeywords.length > 0) {
      await generateKeywordIdeas(seedKeywords);
    } else if (inputMode === "url" && urlInput.trim()) {
      await generateKeywordIdeas([], urlInput.trim());
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredAndSortedKeywords = keywords
    .filter((kw) => {
      if (competitionFilter === "all") return true;
      return kw.competition === competitionFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "keyword":
          comparison = a.keyword.localeCompare(b.keyword);
          break;
        case "avgMonthlySearches":
          comparison = a.avgMonthlySearches - b.avgMonthlySearches;
          break;
        case "competition":
          const order = { LOW: 1, MEDIUM: 2, HIGH: 3, UNSPECIFIED: 0 };
          comparison = (order[a.competition] || 0) - (order[b.competition] || 0);
          break;
        case "cpcLow":
          comparison = a.lowTopOfPageBidMicros - b.lowTopOfPageBidMicros;
          break;
        case "cpcHigh":
          comparison = a.highTopOfPageBidMicros - b.highTopOfPageBidMicros;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const handleExportCSV = () => {
    if (filteredAndSortedKeywords.length === 0) return;

    const headers = ["Palavra-chave", "Vol. Mensal", "Competição", "CPC Baixo", "CPC Alto"];
    const rows = filteredAndSortedKeywords.map((kw) => [
      kw.keyword,
      kw.avgMonthlySearches,
      getCompetitionLabel(kw.competition),
      formatCurrency(kw.lowTopOfPageBidMicros),
      formatCurrency(kw.highTopOfPageBidMicros),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `keyword-planner-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planejador de Palavras-chave</h1>
          <p className="text-muted-foreground">
            Descubra palavras-chave relevantes para suas campanhas do Google Ads
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Pesquisar Palavras-chave
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Client selector (optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente (opcional)</label>
              <SearchableClientSelect
                clients={clients.map(c => ({ id: c.id, name: c.name }))}
                value={selectedClientId}
                onValueChange={setSelectedClientId}
                noneLabel="Nenhum cliente"
                placeholder="Selecione um cliente"
              />
            </div>

            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "keywords" | "url")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="keywords" className="gap-2">
                  <Search className="h-4 w-4" />
                  Por Palavras-chave
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <Link className="h-4 w-4" />
                  Por URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="keywords" className="space-y-3 mt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite uma palavra-chave e pressione Enter"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                  />
                  <Button onClick={handleAddKeyword} disabled={!keywordInput.trim() || loading} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {seedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {seedKeywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="gap-1 pr-1">
                        {keyword}
                        <button
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="url" className="mt-4">
                <Input
                  placeholder="https://exemplo.com.br/pagina"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  O Google irá extrair palavras-chave relevantes desta página
                </p>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleSearch}
              disabled={
                loading ||
                (inputMode === "keywords" && seedKeywords.length === 0) ||
                (inputMode === "url" && !urlInput.trim())
              }
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando ideias...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Gerar Ideias de Palavras-chave
                </>
              )}
            </Button>

            {keywords.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      {filteredAndSortedKeywords.length} de {keywords.length} palavras-chave
                    </p>
                    <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Competição" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="LOW">Baixa</SelectItem>
                        <SelectItem value="MEDIUM">Média</SelectItem>
                        <SelectItem value="HIGH">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                      <Download className="h-4 w-4" />
                      Exportar CSV
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearKeywords}>
                      Limpar
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHeader field="keyword">Palavra-chave</SortableHeader>
                        <SortableHeader field="avgMonthlySearches">Vol. Mensal</SortableHeader>
                        <SortableHeader field="competition">Competição</SortableHeader>
                        <SortableHeader field="cpcLow">CPC Mín.</SortableHeader>
                        <SortableHeader field="cpcHigh">CPC Máx.</SortableHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedKeywords.slice(0, 50).map((kw, index) => (
                        <TableRow key={`${kw.keyword}-${index}`}>
                          <TableCell className="font-medium">{kw.keyword}</TableCell>
                          <TableCell>{formatNumber(kw.avgMonthlySearches)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getCompetitionColor(kw.competition)}
                            >
                              {getCompetitionLabel(kw.competition)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(kw.lowTopOfPageBidMicros)}</TableCell>
                          <TableCell>{formatCurrency(kw.highTopOfPageBidMicros)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredAndSortedKeywords.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Exibindo 50 de {filteredAndSortedKeywords.length} resultados. Exporte para ver todos.
                  </p>
                )}
              </div>
            )}

            {!loading && keywords.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Digite palavras-chave ou uma URL para descobrir ideias</p>
                <p className="text-sm mt-1">
                  Use o Planejador para encontrar termos relevantes para suas campanhas
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
