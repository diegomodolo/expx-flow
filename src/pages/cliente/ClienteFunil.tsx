import { FunnelAnalysis } from "@/components/funnel/FunnelAnalysis";
import { useClientContext } from "./ClienteContext";

export function ClienteFunil() {
  const { client } = useClientContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Análise do Funil de Conversão</h3>
      <FunnelAnalysis campaigns={client?.campaigns || []} />
    </div>
  );
}
