export interface CardRecord {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  email: string;
  mobile: string;
  landline: string;
  website: string;
  address: string;
  city: string;
  country: string;
  notes?: string;
  is_duplicate?: boolean;
  needs_verification?: boolean;
  verification_reasons?: string[];
  [key: string]: any;
}

export type ModelProvider = string;

export interface AuditStats {
  total_cards: number;
  cleanliness_score: number;
  corrections_made: number;
  duplicates_found: number;
  missing_values_count: number;
  flagged_verification_count?: number;
}

export interface AuditResponse {
  processed_cards: CardRecord[];
  stats: AuditStats;
  audit_logs: string[];
}
