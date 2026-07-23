import { CleanedRecord } from './eda-engine';
import { getOpenRouterKey, getCerebrasKey, DEFAULT_ENDPOINT, DEFAULT_MODEL, CEREBRAS_ENDPOINT, CEREBRAS_MODEL } from './api-client';

// ─── Usage Cap (localStorage, daily reset) ────────────────────────────────────

const USAGE_KEY      = 'vcpro_enrichment_used';
const USAGE_DATE_KEY = 'vcpro_enrichment_date';

export function getEnrichmentUsed(): number {
  if (typeof window === 'undefined') return 0;
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem(USAGE_DATE_KEY);
  if (storedDate !== today) {
    localStorage.setItem(USAGE_DATE_KEY, today);
    localStorage.setItem(USAGE_KEY, '0');
    return 0;
  }
  return parseInt(localStorage.getItem(USAGE_KEY) || '0', 10);
}

function incrementUsed(): void {
  if (typeof window === 'undefined') return;
  const current = getEnrichmentUsed();
  localStorage.setItem(USAGE_KEY, String(current + 1));
}

export function resetEnrichmentCount(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USAGE_KEY, '0');
  localStorage.setItem(USAGE_DATE_KEY, new Date().toDateString());
}

// ─── Industry Taxonomy ────────────────────────────────────────────────────────

export const INDUSTRY_CATEGORIES = [
  'Technology & IT Services', 'Finance & Banking', 'Healthcare & Pharmaceuticals',
  'Manufacturing & Engineering', 'Retail & E-Commerce', 'Professional Services',
  'Education & Training', 'Real Estate & Construction', 'Hospitality & Travel',
  'Energy & Utilities', 'Media & Entertainment', 'Automotive',
  'Logistics & Supply Chain', 'Food & Beverage', 'Agriculture & Agribusiness',
  'Government & Public Sector', 'Non-Profit & NGO', 'Telecommunications',
  'Legal Services', 'General Corporate',
] as const;

// ─── Enrichment Suggestion ────────────────────────────────────────────────────

export interface EnrichmentSuggestion {
  recordId: string;
  field: string;
  currentValue: string;
  suggestedValue: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  accepted: boolean;
}

export interface EnrichmentResult {
  suggestions: EnrichmentSuggestion[];
  usedCount: number;
  skippedCount: number;
  errorCount: number;
}

// ─── AI Caller (prefers Cerebras for speed, falls back to OpenRouter text) ────

async function callTextAI(prompt: string, apiKey: string): Promise<string> {
  const cbKey = getCerebrasKey();

  // Prefer Cerebras (3000 tok/s) for fast text inference
  if (cbKey) {
    try {
      const res = await fetch(`${CEREBRAS_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cbKey}` },
        body: JSON.stringify({
          model: CEREBRAS_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1, max_tokens: 100,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return (data.choices?.[0]?.message?.content || '').trim();
      }
    } catch {}
  }

  // Fallback to OpenRouter text model (no image needed)
  const orKey = apiKey || getOpenRouterKey();
  if (!orKey) throw new Error('No API key available for enrichment');

  const res = await fetch(`${DEFAULT_ENDPOINT}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orKey}`,
      'HTTP-Referer': 'https://vcpro.app',
      'X-Title': 'VC Pro Data Enrichment',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',  // text only — cheap and reliable
      messages: [
        { role: 'system', content: 'You are a business data enrichment assistant. Reply concisely with only the requested value.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, max_tokens: 100,
    }),
  });

  if (!res.ok) throw new Error(`AI call failed: ${res.status}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

// ─── Per-Field Enrichment Prompts ─────────────────────────────────────────────

async function inferIndustry(record: CleanedRecord, apiKey: string): Promise<EnrichmentSuggestion | null> {
  if (record.industry) return null;
  if (!record.company) return null;

  const prompt = `Company: "${record.company}"${record.title ? `, Job Title: "${record.title}"` : ''}
What is the most likely industry for this company?
Choose EXACTLY ONE from this list:
${INDUSTRY_CATEGORIES.join(', ')}
Reply with ONLY the category name, nothing else.`;

  const suggestion = await callTextAI(prompt, apiKey);
  const matched = INDUSTRY_CATEGORIES.find(c => c.toLowerCase() === suggestion.toLowerCase());

  return {
    recordId: record._id,
    field: 'industry',
    currentValue: '',
    suggestedValue: matched || suggestion,
    confidence: matched ? 'high' : 'medium',
    reasoning: `Inferred from company name "${record.company}"`,
    accepted: false,
  };
}

async function inferWebsite(record: CleanedRecord, apiKey: string): Promise<EnrichmentSuggestion | null> {
  if (record.website || !record.company) return null;

  // Try to guess from email domain first (zero AI calls)
  if (record.company_domain) {
    return {
      recordId: record._id,
      field: 'website',
      currentValue: '',
      suggestedValue: `https://${record.company_domain}`,
      confidence: 'high',
      reasoning: `Extracted from email domain`,
      accepted: false,
    };
  }

  const prompt = `Company: "${record.company}"${record.industry ? `, Industry: "${record.industry}"` : ''}
What is the most likely official website domain for this company?
Reply with ONLY the domain in format: company.com (no https://, no trailing slash, no explanation).`;

  const suggestion = await callTextAI(prompt, apiKey);
  const cleaned = suggestion.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();

  return {
    recordId: record._id,
    field: 'website',
    currentValue: '',
    suggestedValue: `https://${cleaned}`,
    confidence: 'low',
    reasoning: `AI inference from company name "${record.company}" — verify before use`,
    accepted: false,
  };
}

async function inferCountry(record: CleanedRecord, apiKey: string): Promise<EnrichmentSuggestion | null> {
  if (record.country || record.country_code) return null;
  if (!record.mobile && !record.city && !record.address) return null;

  const context = [
    record.mobile && `Phone: "${record.mobile}"`,
    record.city && `City: "${record.city}"`,
    record.address && `Address: "${record.address}"`,
  ].filter(Boolean).join(', ');

  const prompt = `Based on this contact data: ${context}
What country is this person most likely from?
Reply with ONLY the country name in full (e.g., India, United Kingdom, United States).`;

  const suggestion = await callTextAI(prompt, apiKey);

  return {
    recordId: record._id,
    field: 'country',
    currentValue: '',
    suggestedValue: suggestion.trim(),
    confidence: 'medium',
    reasoning: `Inferred from phone/city/address data`,
    accepted: false,
  };
}

async function inferEmailPattern(record: CleanedRecord, _apiKey: string): Promise<EnrichmentSuggestion | null> {
  if (record.email || !record.first_name || !record.company_domain) return null;

  // Pattern: firstname.lastname@domain or first.initial + lastname@domain — no AI call needed
  const fn = record.first_name.toLowerCase();
  const ln = record.last_name.toLowerCase();
  const domain = record.company_domain;

  const candidates = ln
    ? [`${fn}.${ln}@${domain}`, `${fn}@${domain}`, `${fn[0]}${ln}@${domain}`]
    : [`${fn}@${domain}`];

  return {
    recordId: record._id,
    field: 'email',
    currentValue: '',
    suggestedValue: candidates[0],
    confidence: 'low',
    reasoning: `Pattern inferred: first.last@${domain} — verify before sending`,
    accepted: false,
  };
}

// ─── Batch Enrichment Engine ──────────────────────────────────────────────────

export async function enrichRecords(
  records: CleanedRecord[],
  cap: number,
  apiKey: string,
  onProgress?: (done: number, total: number, current: string) => void
): Promise<EnrichmentResult> {
  const suggestions: EnrichmentSuggestion[] = [];
  let usedCount = getEnrichmentUsed();
  let sessionUsed = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const needsEnrichment = records.filter(r =>
    !r.industry || !r.website || !r.country || !r.email
  );

  const total = Math.min(needsEnrichment.length, cap - usedCount);

  for (let i = 0; i < needsEnrichment.length; i++) {
    if (usedCount >= cap) { skippedCount++; continue; }

    const record = needsEnrichment[i];
    onProgress?.(i, total, record.name || record.company || record._id);

    const enrichers = [inferIndustry, inferCountry, inferWebsite, inferEmailPattern];

    for (const enricher of enrichers) {
      if (usedCount >= cap) break;
      try {
        // email pattern and website-from-domain don't count against cap
        const isFreeSuggestion = enricher === inferEmailPattern ||
          (enricher === inferWebsite && !!record.company_domain);

        const suggestion = await enricher(record, apiKey);
        if (suggestion) {
          suggestions.push(suggestion);
          if (!isFreeSuggestion) {
            incrementUsed();
            usedCount++;
            sessionUsed++;
          }
        }
      } catch (err) {
        console.warn('Enrichment error for', record._id, err);
        errorCount++;
      }
    }
  }

  onProgress?.(total, total, 'Complete');

  return { suggestions, usedCount: sessionUsed, skippedCount, errorCount };
}

// Apply accepted suggestions back to records
export function applyEnrichmentSuggestions(
  records: CleanedRecord[],
  suggestions: EnrichmentSuggestion[]
): CleanedRecord[] {
  const accepted = suggestions.filter(s => s.accepted);
  const byRecord: Record<string, EnrichmentSuggestion[]> = {};
  accepted.forEach(s => {
    if (!byRecord[s.recordId]) byRecord[s.recordId] = [];
    byRecord[s.recordId].push(s);
  });

  return records.map(record => {
    const toApply = byRecord[record._id];
    if (!toApply) return record;
    const updated = { ...record };
    toApply.forEach(s => {
      updated[s.field] = s.suggestedValue;
      updated._changes = [
        ...(updated._changes || []),
        { field: s.field, before: s.currentValue, after: s.suggestedValue, rule: `AI Enrichment (${s.confidence} confidence)` },
      ];
    });
    return updated;
  });
}
