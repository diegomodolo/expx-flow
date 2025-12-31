export interface EditableCreative {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  headline: string;
  body: string;
  description: string;
  linkUrl: string;
  callToAction: string;
  mediaUrls: string[];
  urlParameters: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
  };
}

export interface EditableAdSet {
  id: string;
  name: string;
  includedAudiences: string[];
  excludedAudiences: string[];
  creatives: EditableCreative[];
}

export interface EditableStrategy {
  // Budget
  dailyBudget: number;
  duration: number;
  totalBudget: number;
  
  // Targeting
  ageMin: number;
  ageMax: number;
  genders: ('all' | 'male' | 'female')[];
  interests: string[];
  behaviors: string[];
  
  // Audiences
  includedAudiences: string[];
  excludedAudiences: string[];
  
  // Schedule
  startDate: Date;
  endDate: Date;
  useOptimalHours: boolean;
  optimalHours: string;
  
  // Bidding
  bidStrategy: 'LOWEST_COST' | 'COST_CAP' | 'BID_CAP';
  targetCPA?: number;
  targetROAS?: number;
  
  // Ad Sets
  adSets: EditableAdSet[];
  
  // Recommendations
  recommendations: string[];
  estimatedReach: string;
}

export const CAMPAIGN_OBJECTIVES: Record<string, string> = {
  'awareness': 'OUTCOME_AWARENESS',
  'traffic': 'OUTCOME_TRAFFIC',
  'leads': 'OUTCOME_LEADS',
  'conversions': 'OUTCOME_SALES',
  'remarketing': 'OUTCOME_SALES',
  'retention': 'OUTCOME_ENGAGEMENT',
};

export const BID_STRATEGIES = [
  { value: 'LOWEST_COST', label: 'Menor Custo', description: 'Meta otimiza para o menor custo por resultado' },
  { value: 'COST_CAP', label: 'CPA Alvo', description: 'Defina um custo máximo por resultado' },
  { value: 'BID_CAP', label: 'Lance Máximo', description: 'Defina um lance máximo nos leilões' },
];

export const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'BOOK_NOW', label: 'Reserve Agora' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'GET_QUOTE', label: 'Obter Cotação' },
  { value: 'APPLY_NOW', label: 'Candidatar-se' },
  { value: 'SUBSCRIBE', label: 'Assinar' },
  { value: 'SEND_MESSAGE', label: 'Enviar Mensagem' },
  { value: 'GET_OFFER', label: 'Obter Oferta' },
];
