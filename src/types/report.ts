export interface CalcRow {
  id: string;
  name: string;
  views: number;
  contacts: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked?: boolean;
}

export interface ChecklistGroup {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface SampleAd {
  id: string;
  tag: string;
  title: string;
  price: string;
  body: string;
  why: string;
  imageSuggestion?: string;
}

export interface MonthData {
  month: string;
  shortMonth?: string;
  percent: number;
  queries?: number;
  share?: number;
  budgetRub?: number;
  seasonLevel?: 'high' | 'medium' | 'low';
  strategyNote?: string;
}

export interface WordstatAnalysis {
  keyword?: string;
  region?: string;
  totalQueries: number;
  avgQueries: number;
  peakMonth: string;
  peakQueries: number;
  troughMonth: string;
  troughQueries: number;
  seasonalityMultiplier: number;
  rawInput?: string;
}

export interface SeasonPeriod {
  title: string;
  desc: string;
}

export interface RoadmapStep {
  step: string;
  action: string;
  proof: string;
}

export interface PriceTier {
  id: string;
  tag: string;
  title: string;
  sum: string;
  details: string;
  isMain?: boolean;
}

export interface PaidServiceItem {
  id: string;
  name: string;
  count: number;
  badge?: string;
}

export interface SearchViewsSummary {
  sectionTitle: string;
  subtitle?: string;
  avgViews: number;
  avgViewsWithPaid: number;
  avgViewsWithoutPaid: number;
  minViews: number;
  maxViews: number;
  totalAds: number;
  adsWithPaid: number;
  adsWithoutPaid: number;
  paidServices: PaidServiceItem[];
  conclusionNote?: string;
}

export interface ReportData {
  id: string;
  nicheKey: string;
  nicheName: string;
  city: string;
  platform: string; // "Авито", "Яндекс Услуги", etc.
  date: string;
  kicker: string;
  title: string;
  lead: string;
  heroImage: string;
  heroCaption: string;
  hasExistingAccount?: boolean; // If false: client has no active Avito account; Section 1 (Where calls are lost) is omitted
  viewsSummary?: SearchViewsSummary;
  sprint: {
    title: string;
    items: string[];
    note: string;
  };
  calculator: {
    sectionTitle: string;
    intro: string;
    note: string;
    thresholdRatio: number; // e.g. 0.6 = 60%
    rows: CalcRow[];
  };
  auditChecklist: {
    sectionTitle: string;
    groups: ChecklistGroup[];
  };
  sampleAds: {
    sectionTitle: string;
    subtitle: string;
    ads: SampleAd[];
  };
  seasonality: {
    sectionTitle: string;
    intro: string;
    annualBudgetRub: number;
    months: MonthData[];
    periods: SeasonPeriod[];
    note: string;
    wordstatAnalysis?: WordstatAnalysis;
    wordstatKeyword?: string;
    wordstatRegion?: string;
    wordstatRawText?: string;
  };
  roadmap: {
    sectionTitle: string;
    steps: RoadmapStep[];
    disclaimer: string;
  };
  pricing: {
    sectionTitle: string;
    tiers: PriceTier[];
    termsNote: string;
  };
  kickoff: {
    sectionTitle: string;
    items: string[];
  };
  footer: string;
  parsedSourceMeta?: {
    keyword: string;
    region: string;
    totalAds: number;
    avgPrice: number;
    paidPromoPercent: number;
    avgRating: number;
    totalViews: number;
    sourceName?: string;
  };
}
