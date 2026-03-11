import { useEffect } from "react";
import { Bot, Loader2 } from "lucide-react";
import { useFetchIssueStatus } from "@/hooks/useFetchIssueStatus";
import type { UserReport } from "@/hooks/useUserReports";

interface ReportDetailAccordionProps {
  report: UserReport;
  companyId: string;
  isExpanded: boolean;
}

export function ReportDetailAccordion({
  report,
  companyId,
  isExpanded,
}: ReportDetailAccordionProps) {
  const fetchStatus = useFetchIssueStatus();

  useEffect(() => {
    if (isExpanded && report.github_issue_number) {
      fetchStatus.mutate({
        report_id: report.id,
        github_issue_number: report.github_issue_number,
        company_id: companyId,
      });
    }
  }, [isExpanded, report.id, report.github_issue_number, companyId]);

  if (!isExpanded) return null;

  const ef = report.extra_fields || {};

  return (
    <div className="px-4 pb-4 pt-2 space-y-3 bg-muted/5">
      {/* Descrição */}
      <div>
        <div className="text-xs font-bold text-primary uppercase mb-1">
          Descrição
        </div>
        <div className="text-sm text-muted-foreground bg-background rounded p-3">
          {report.description}
        </div>
      </div>

      {/* Campos extras do Bug */}
      {report.type === "bug" && (
        <>
          {ef.url && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">URL</div>
              <div className="text-sm text-muted-foreground">{ef.url}</div>
            </div>
          )}
          {ef.steps && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Passos para Reproduzir</div>
              <div className="text-sm text-muted-foreground bg-background rounded p-3 whitespace-pre-wrap">{ef.steps}</div>
            </div>
          )}
          {ef.stack_trace && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Stack Trace</div>
              <pre className="text-xs text-muted-foreground bg-background rounded p-3 overflow-x-auto">{ef.stack_trace}</pre>
            </div>
          )}
          {ef.suspected_file && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Arquivo Suspeito</div>
              <div className="text-sm text-muted-foreground font-mono">{ef.suspected_file}</div>
            </div>
          )}
        </>
      )}

      {/* Campos extras do Feature */}
      {report.type === "feature" && (
        <>
          {ef.category && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Categoria</div>
              <div className="text-sm text-muted-foreground">{ef.category}</div>
            </div>
          )}
          {ef.proposal && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Proposta</div>
              <div className="text-sm text-muted-foreground bg-background rounded p-3 whitespace-pre-wrap">{ef.proposal}</div>
            </div>
          )}
          {ef.impact && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Impacto</div>
              <div className="text-sm text-muted-foreground">{ef.impact}</div>
            </div>
          )}
          {ef.complexity && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Complexidade</div>
              <div className="text-sm text-muted-foreground">{ef.complexity}</div>
            </div>
          )}
        </>
      )}

      {/* Resposta do Claude */}
      {fetchStatus.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Atualizando status...
        </div>
      )}
      {report.claude_response && (
        <div>
          <div className="text-xs font-bold text-primary uppercase mb-1">
            Resposta da Análise
          </div>
          <div className="bg-primary/5 border border-primary/10 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-primary">Claude Code</span>
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {report.claude_response}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
