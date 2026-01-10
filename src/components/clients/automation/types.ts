// Types for the new automation execution flow

export interface MetricsData {
  cpa: number;
  ctr: number;
  spend: number;
  conversions: number;
  clicks: number;
  impressions: number;
  reach: number;
  frequency: number;
  cpc: number;
}

export interface AdHierarchy {
  id: string;
  facebook_id: string;
  name: string;
  status: string;
  metrics?: MetricsData;
}

export interface AdSetHierarchy {
  id: string;
  facebook_id: string;
  name: string;
  status: string;
  metrics?: MetricsData;
  ads: AdHierarchy[];
}

export interface CampaignHierarchy {
  id: string;
  facebook_id: string;
  name: string;
  status: string;
  objective: string;
  metrics?: MetricsData;
  adsets: AdSetHierarchy[];
}

export interface RuleExecution {
  ruleId: string;
  ruleName: string;
  ruleDescription?: string;
  entityType: 'campaign' | 'adset' | 'ad';
  actionType: string;
  campaignObjectives: string[];
  timeWindowDays: number;
  status: 'pending' | 'running' | 'completed';
  results: RuleEntityResult[];
}

export interface RuleEntityResult {
  entityId: string;
  entityName: string;
  entityType: 'campaign' | 'adset' | 'ad';
  parentCampaignName?: string;
  parentAdsetName?: string;
  status: 'ignored' | 'skipped' | 'actioned' | 'error' | 'processing';
  reason?: string;
  metrics?: MetricsData;
  cooldown?: {
    inCooldown: boolean;
    daysSinceAction?: number;
    daysRemaining?: number;
  };
}

export interface ExecutionPhase {
  phase: 'collecting' | 'metrics' | 'applying' | 'completed' | 'error';
  message: string;
  progress: number;
}

export interface ProgressUpdate {
  id: string;
  entity_type: 'campaign' | 'adset' | 'ad' | 'system';
  entity_name: string;
  status: 'processing' | 'evaluated' | 'actioned' | 'skipped' | 'error' | 'ignored';
  rule_name: string;
  message: string;
  created_at: string;
  metadata?: {
    phase?: 'collecting' | 'metrics' | 'applying';
    hierarchy?: CampaignHierarchy[];
    rule_execution?: RuleExecution;
    campaign_objective?: string;
    parent_campaign?: string;
    parent_adset?: string;
    metrics?: MetricsData;
    total_campaigns?: number;
    total_adsets?: number;
    total_ads?: number;
  };
}
