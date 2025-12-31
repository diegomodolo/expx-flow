import { useState, useEffect } from "react";
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
  Wand2,
  AlertCircle,
} from "lucide-react";
import { useKeywordPlanner, KeywordIdea } from "@/hooks/useKeywordPlanner";
import { useCompany } from "@/contexts/CompanyContext";
import { useClientContext } from "./ClienteContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type SortField = "keyword" | "avgMonthlySearches" | "competition" | "cpcLow" | "cpcHigh";
type SortDirection = "asc" | "desc";

export function ClienteKeywordPlanner() {
  const { activeCompany } = useCompany();
  const { client } = useClientContext();
  const [inputMode, setInputMode] = useState<"keywords" | "url" | "briefing">("briefing");
  const [keywordInput, setKeywordInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [seedKeywords, setSeedKeywords] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("avgMonthlySearches");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [competitionFilter, setCompetitionFilter] = useState<string>("all");

  // Usar o customer ID da conta Google Ads vinculada ao cliente
  const googleCustomerId = client?.google_ads_account?.google_customer_id;

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
    customerId: googleCustomerId,
  });

  // Extract keywords from client briefing
  const extractKeywordsFromBriefing = (): string[] => {
    if (!client) return [];
    
    const keywords: string[] = [];
    
    // Add product/service name
    if (client.product_name) {
      keywords.push(client.product_name);
    }
    
    // Add company name
    if (client.company) {
      keywords.push(client.company);
    }
    
    // Add sector
    if (client.sector) {
      keywords.push(client.sector);
    }
    
    // Extract keywords from briefing
    if (client.ai_briefing) {
      // Extract key phrases from briefing (simplified extraction)
      const briefingText = client.ai_briefing.toLowerCase();
      
      // Common patterns to extract
      const patterns = [
        /produto[s]?:\s*([^.;]+)/gi,
        /serviço[s]?:\s*([^.;]+)/gi,
        /oferece[m]?\s+([^.;]+)/gi,
        /especializado[s]?\s+em\s+([^.;]+)/gi,
        /foco\s+em\s+([^.;]+)/gi,
      ];
      
      patterns.forEach(pattern => {
        const matches = briefingText.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            const extracted = match[1].trim().split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 50);
            keywords.push(...extracted);
          }
        }
      });
    }
    
    // Add target audience keywords
    if (client.target_audience) {
      keywords.push(client.target_audience);
    }
    
    // Add objectives
    if (client.objectives) {
      keywords.push(client.objectives);
    }
    
    // Filter and deduplicate
    const uniqueKeywords = [...new Set(keywords)]
      .filter(k => k && k.length > 2 && k.length < 50)
      .slice(0, 10);
    
    return uniqueKeywords;
  };

  // Pre-populate URL from client website
  useEffect(() => {
    if (client?.website_url && !urlInput) {
      setUrlInput(client.website_url);
    }
  }, [client?.website_url]);

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
    } else if (inputMode === "briefing") {
      const briefingKeywords = extractKeywordsFromBriefing();
      if (briefingKeywords.length > 0) {
        await generateKeywordIdeas(briefingKeywords);
      }
    }
  };

  const handleSearchFromBriefing = async () => {
    const briefingKeywords = extractKeywordsFromBriefing();
    if (briefingKeywords.length > 0) {
      await generateKeywordIdeas(briefingKeywords);
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
    link.download = `keyword-planner-${client?.name || 'cliente'}-${new Date().toISOString().split("T")[0]}.csv`;
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

  const briefingKeywords = extractKeywordsFromBriefing();
  const hasBriefing = briefingKeywords.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Planejador de Palavras-chave</h1>
        <p className="text-muted-foreground">
          Descubra palavras-chave relevantes para {client?.name || "este cliente"}
        </p>
        {client?.google_ads_account && (
          <p className="text-xs text-muted-foreground mt-1">
            Conta Google Ads: {client.google_ads_account.account_name} ({client.google_ads_account.google_customer_id})
          </p>
        )}
      </div>

      {/* Aviso se não houver conta Google Ads vinculada */}
      {!client?.google_ads_account && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Conta Google Ads não vinculada</AlertTitle>
          <AlertDescription>
            Este cliente não possui uma conta Google Ads vinculada. Vincule uma conta nas configurações do cliente para usar o Planejador de Palavras-chave.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Suggestions from Briefing */}
      {hasBriefing && keywords.length === 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">Sugestões Automáticas</h3>
                  <p className="text-sm text-muted-foreground">
                    Baseado no briefing e dados do cliente, identificamos estas palavras-chave iniciais:
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {briefingKeywords.map((kw, i) => (
                    <Badge key={i} variant="secondary">
                      {kw}
                    </Badge>
                  ))}
                </div>
                <Button onClick={handleSearchFromBriefing} disabled={loading} className="gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Gerar Ideias de Palavras-chave
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasBriefing && keywords.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Briefing não encontrado</AlertTitle>
          <AlertDescription>
            Este cliente não possui briefing configurado. Adicione palavras-chave manualmente ou uma URL para gerar ideias.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pesquisar Palavras-chave
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "keywords" | "url" | "briefing")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="briefing" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Do Briefing
              </TabsTrigger>
              <TabsTrigger value="keywords" className="gap-2">
                <Search className="h-4 w-4" />
                Por Palavras-chave
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-2">
                <Link className="h-4 w-4" />
                Por URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="briefing" className="space-y-3 mt-4">
              {hasBriefing ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Palavras-chave extraídas do briefing do cliente:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {briefingKeywords.map((kw, i) => (
                      <Badge key={i} variant="outline">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum briefing disponível. Configure o briefing do cliente para usar esta opção.
                </p>
              )}
            </TabsContent>

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
              (inputMode === "url" && !urlInput.trim()) ||
              (inputMode === "briefing" && !hasBriefing)
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

          {!loading && keywords.length === 0 && !hasBriefing && (
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
  );
}
