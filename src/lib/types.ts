export interface CardRecord {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  mobile: string;
  landline: string;
  website: string;
  address: string;
  city: string;
  country: string;
  notes?: string;
  is_duplicate?: boolean;
  [key: string]: any;
}

export type ModelProvider = string;

export interface AuditStats {
  total_cards: number;
  cleanliness_score: number;
  corrections_made: number;
  duplicates_found: number;
  missing_values_count: number;
}

export interface AuditResponse {
  processed_cards: CardRecord[];
  stats: AuditStats;
  audit_logs: string[];
}
