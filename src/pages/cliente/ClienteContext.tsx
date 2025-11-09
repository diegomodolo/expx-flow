import { createContext, useContext, ReactNode } from "react";
import { ClientDetailsData } from "@/hooks/useClientDetails";

interface ClientContextValue {
  client: ClientDetailsData;
  selectedCampaignId: string | null;
  setSelectedCampaignId: (id: string | null) => void;
  selectedAdSetId: string | null;
  setSelectedAdSetId: (id: string | null) => void;
  refetchClient: () => void;
  refetchAdSets: () => void;
  refetchAds: () => void;
}

const ClientContext = createContext<ClientContextValue | null>(null);

export function useClientContext() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClientContext must be used within ClientContext Provider");
  }
  return context;
}

interface ClientContextProviderProps {
  children: ReactNode;
  value: ClientContextValue;
}

export function ClientContextProvider({ children, value }: ClientContextProviderProps) {
  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}
