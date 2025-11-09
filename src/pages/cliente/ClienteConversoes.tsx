import { useParams } from "react-router-dom";
import { OfflineConversionsTab } from "@/components/clients/OfflineConversionsTab";

export function ClienteConversoes() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Conversões Offline</h3>
      <OfflineConversionsTab clientId={id || ""} />
    </div>
  );
}
