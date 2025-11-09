import { LucideIcon } from "lucide-react";

export interface EventPreset {
  name: string;
  displayName: string;
  description: string;
  actionSource: 'crm' | 'system_generated' | 'website' | 'app' | 'phone_call';
  category: 'lead' | 'engagement' | 'sales' | 'conversion' | 'negative' | 'custom';
  suggestedValue: number | null;
  requiresValue?: boolean;
  icon: string;
  color: string;
  metaOptimizable?: boolean;
  isNegativeSignal?: boolean;
  requiresReason?: boolean;
}

export const EVENT_PRESETS = {
  LEAD_CREATED: {
    name: "Lead",
    displayName: "Lead Criado",
    description: "Novo lead entrou no CRM",
    actionSource: "crm" as const,
    category: "lead" as const,
    suggestedValue: 0,
    icon: "UserPlus",
    color: "blue",
  },
  LEAD_QUALIFIED: {
    name: "LeadQualified",
    displayName: "Lead Qualificado (MQL)",
    description: "Lead passou pela qualificação e é um MQL",
    actionSource: "crm" as const,
    category: "lead" as const,
    suggestedValue: 0,
    icon: "CheckCircle",
    color: "green",
    metaOptimizable: true,
  },
  MEETING_SCHEDULED: {
    name: "MeetingScheduled",
    displayName: "Reunião Agendada",
    description: "Lead agendou reunião comercial",
    actionSource: "crm" as const,
    category: "engagement" as const,
    suggestedValue: 0,
    icon: "Calendar",
    color: "purple",
  },
  PROPOSAL_SENT: {
    name: "ProposalSent",
    displayName: "Proposta Enviada",
    description: "Proposta comercial foi enviada ao lead",
    actionSource: "crm" as const,
    category: "sales" as const,
    suggestedValue: 0,
    icon: "FileText",
    color: "indigo",
  },
  PURCHASE: {
    name: "Purchase",
    displayName: "Compra Realizada",
    description: "Lead converteu em cliente (fechou contrato)",
    actionSource: "crm" as const,
    category: "conversion" as const,
    suggestedValue: null,
    requiresValue: true,
    icon: "DollarSign",
    color: "green",
    metaOptimizable: true,
  },
  LEAD_DISQUALIFIED: {
    name: "LeadDisqualified",
    displayName: "Lead Desqualificado",
    description: "Lead não se encaixa no perfil ideal (ICP)",
    actionSource: "crm" as const,
    category: "negative" as const,
    suggestedValue: 0,
    icon: "UserX",
    color: "red",
    isNegativeSignal: true,
    requiresReason: true,
  },
  CUSTOM: {
    name: "Custom",
    displayName: "Evento Personalizado",
    description: "Defina um evento customizado",
    actionSource: "crm" as const,
    category: "custom" as const,
    suggestedValue: 0,
    icon: "Settings",
    color: "gray",
  },
} as const;

export type EventPresetKey = keyof typeof EVENT_PRESETS;

export const getEventConfig = (eventName: string): EventPreset => {
  const preset = Object.values(EVENT_PRESETS).find(
    (p) => p.name === eventName
  );
  return preset || EVENT_PRESETS.CUSTOM;
};

export const NEGATIVE_EVENT_NAMES = Object.values(EVENT_PRESETS)
  .filter((e) => 'isNegativeSignal' in e && e.isNegativeSignal === true)
  .map((e) => e.name);

export const OPTIMIZABLE_EVENT_NAMES = Object.values(EVENT_PRESETS)
  .filter((e) => 'metaOptimizable' in e && e.metaOptimizable === true)
  .map((e) => e.name);

export const getIconName = (iconString: string) => {
  return iconString;
};

export const getCategoryColor = (category: string) => {
  switch (category) {
    case 'lead': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'engagement': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'sales': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'conversion': return 'bg-green-100 text-green-800 border-green-300';
    case 'negative': return 'bg-red-100 text-red-800 border-red-300';
    case 'custom': return 'bg-gray-100 text-gray-800 border-gray-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};
