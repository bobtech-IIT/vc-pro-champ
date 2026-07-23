import * as XLSX from 'xlsx';
import { CardRecord } from './types';

// ─── Core Types ────────────────────────────────────────────────────────────────

export interface RawRecord {
  _id: string;
  _source: string;
  _row: number;
  [key: string]: any;
}

export interface CleanChange {
  field: string;
  before: string;
  after: string;
  rule: string;
}

export interface CleanedRecord {
  _id: string;
  _source: string;
  _lead_score: number;
  _changes: CleanChange[];
  _needs_verification: boolean;
  _verification_reasons: string[];
  name: string;
  first_name: string;
  last_name: string;
  title: string;
  company: string;
  company_domain: string;
  industry: string;
  email: string;
  mobile: string;
  landline: string;
  website: string;
  address: string;
  city: string;
  country: string;
  country_code: string;
  notes: string;
  [key: string]: any;
}

export interface Anomaly {
  recordId: string;
  recordName: string;
  field: string;
  issue: string;
  value: string;
  severity: 'high' | 'medium' | 'low';
}

export interface DuplicateGroup {
  ids: string[];
  names: string[];
  matchField: string;
  matchValue: string;
  confidence: 'definite' | 'probable';
}

export interface FieldDistribution {
  [value: string]: number;
}

export interface EdaReport {
  totalRecords: number;
  fields: string[];
  completenessMatrix: Record<string, number>; // field -> % (0-100)
  missingCounts: Record<string, number>;       // field -> count missing
  anomalies: Anomaly[];
  duplicateGroups: DuplicateGroup[];
  distributions: {
    industry: FieldDistribution;
    country: FieldDistribution;
    company: FieldDistribution;
  };
  overallQualityScore: number; // 0-100
}

export interface FreshsalesRecord {
  'First Name': string;
  'Last Name': string;
  'Email': string;
  'Mobile Number': string;
  'Work Phone': string;
  'Job Title': string;
  'Account Name': string;
  'Industry': string;
  'Website': string;
  'Address': string;
  'City': string;
  'Country': string;
  'Notes': string;
  'Lead Score': number;
  'Source File': string;
}

// ─── Column Name Auto-Mapper ───────────────────────────────────────────────────

const COLUMN_MAP: Record<string, string> = {
  // name variants
  'name': 'name', 'full name': 'name', 'contact name': 'name', 'person': 'name', 'contact': 'name',
  // title variants
  'title': 'title', 'job title': 'title', 'position': 'title', 'designation': 'title', 'role': 'title',
  // company
  'company': 'company', 'company name': 'company', 'organization': 'company', 'organisation': 'company',
  'employer': 'company', 'business': 'company', 'account': 'company', 'account name': 'company',
  // industry
  'industry': 'industry', 'sector': 'industry', 'vertical': 'industry', 'domain': 'industry',
  // email
  'email': 'email', 'email address': 'email', 'e-mail': 'email', 'email id': 'email', 'mail': 'email',
  // mobile
  'mobile': 'mobile', 'mobile number': 'mobile', 'cell': 'mobile', 'cell phone': 'mobile',
  'phone': 'mobile', 'phone number': 'mobile',
  // landline
  'landline': 'landline', 'office phone': 'landline', 'work phone': 'landline',
  'telephone': 'landline', 'tel': 'landline', 'direct line': 'landline',
  // website
  'website': 'website', 'url': 'website', 'web': 'website', 'web address': 'website',
  'homepage': 'website', 'linkedin': 'website',
  // address
  'address': 'address', 'street': 'address', 'street address': 'address', 'location': 'address',
  // city
  'city': 'city', 'town': 'city',
  // country
  'country': 'country', 'nation': 'country', 'country code': 'country',
  // notes
  'notes': 'notes', 'remarks': 'notes', 'comments': 'notes', 'note': 'notes',
};

function normalizeColumnName(col: string): string {
  const lower = col.toLowerCase().trim();
  return COLUMN_MAP[lower] || lower;
}

// ─── Excel Parser & Merger ─────────────────────────────────────────────────────

export function parseExcelBuffer(buffer: ArrayBuffer, filename: string): RawRecord[] {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    const records: RawRecord[] = [];
    let rowIndex = 0;

    wb.SheetNames.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      rows.forEach((row) => {
        const mapped: RawRecord = {
          _id: `${filename.replace(/\W/g, '_')}_${rowIndex++}`,
          _source: filename,
          _row: rowIndex,
        };
        // Normalize column names
        Object.entries(row).forEach(([col, val]) => {
          const normalizedCol = normalizeColumnName(col);
          mapped[normalizedCol] = String(val ?? '').trim();
        });
        // Only include rows with at least a name or email
        if (mapped.name || mapped.email || mapped.company) {
          records.push(mapped);
        }
      });
    });

    return records;
  } catch (e) {
    console.error('Excel parse error for', filename, e);
    return [];
  }
}

export function mergeRecords(arrays: RawRecord[][]): RawRecord[] {
  const merged = arrays.flat();
  // Re-index IDs to avoid conflicts
  return merged.map((r, i) => ({ ...r, _id: `rec_${i}_${Math.random().toString(36).substr(2, 4)}` }));
}

// ─── Phone Normaliser (E.164) ──────────────────────────────────────────────────

const COUNTRY_PHONE_PREFIXES: Record<string, string> = {
  '+1': 'US', '+44': 'GB', '+91': 'IN', '+86': 'CN', '+49': 'DE',
  '+33': 'FR', '+39': 'IT', '+34': 'ES', '+61': 'AU', '+55': 'BR',
  '+81': 'JP', '+82': 'KR', '+65': 'SG', '+971': 'AE', '+966': 'SA',
  '+27': 'ZA', '+234': 'NG', '+254': 'KE', '+60': 'MY', '+66': 'TH',
  '+63': 'PH', '+62': 'ID', '+64': 'NZ', '+48': 'PL', '+90': 'TR',
  '+31': 'NL', '+46': 'SE', '+47': 'NO', '+45': 'DK', '+358': 'FI',
  '+41': 'CH', '+43': 'AT', '+32': 'BE', '+351': 'PT', '+30': 'GR',
  '+7': 'RU', '+380': 'UA', '+420': 'CZ', '+36': 'HU', '+40': 'RO',
  '+94': 'LK', '+880': 'BD', '+92': 'PK', '+98': 'IR', '+964': 'IQ',
  '+212': 'MA', '+20': 'EG', '+216': 'TN', '+213': 'DZ',
};

export function normalizePhone(phone: string): { e164: string; countryCode: string; valid: boolean } {
  if (!phone) return { e164: '', countryCode: '', valid: false };

  // Strip all non-digit chars except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If starts with 00, convert to +
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);

  // Detect country from prefix
  let countryCode = '';
  for (const [prefix, cc] of Object.entries(COUNTRY_PHONE_PREFIXES)) {
    if (cleaned.startsWith(prefix)) { countryCode = cc; break; }
  }

  // Basic validity: 7-15 digits
  const digits = cleaned.replace('+', '');
  const valid = digits.length >= 7 && digits.length <= 15;

  return { e164: cleaned, countryCode, valid };
}

// ─── Email Validator ───────────────────────────────────────────────────────────

export function validateEmail(email: string): { valid: boolean; domain: string; normalized: string } {
  if (!email) return { valid: false, domain: '', normalized: '' };
  const normalized = email.toLowerCase().trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized);
  const domain = valid ? normalized.split('@')[1] : '';
  return { valid, domain, normalized };
}

// ─── Country Normaliser ────────────────────────────────────────────────────────

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'india': 'IN', 'united states': 'US', 'usa': 'US', 'us': 'US', 'america': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB', 'britain': 'GB',
  'germany': 'DE', 'france': 'FR', 'italy': 'IT', 'spain': 'ES',
  'australia': 'AU', 'canada': 'CA', 'brazil': 'BR', 'china': 'CN',
  'japan': 'JP', 'south korea': 'KR', 'korea': 'KR', 'singapore': 'SG',
  'uae': 'AE', 'united arab emirates': 'AE', 'dubai': 'AE',
  'saudi arabia': 'SA', 'south africa': 'ZA', 'nigeria': 'NG',
  'kenya': 'KE', 'malaysia': 'MY', 'thailand': 'TH', 'indonesia': 'ID',
  'philippines': 'PH', 'new zealand': 'NZ', 'netherlands': 'NL',
  'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK', 'finland': 'FI',
  'switzerland': 'CH', 'austria': 'AT', 'belgium': 'BE', 'portugal': 'PT',
  'poland': 'PL', 'turkey': 'TR', 'russia': 'RU', 'pakistan': 'PK',
  'bangladesh': 'BD', 'sri lanka': 'LK', 'egypt': 'EG', 'morocco': 'MA',
};

function normalizeCountry(country: string): { name: string; code: string } {
  if (!country) return { name: '', code: '' };
  const lower = country.toLowerCase().trim();
  const code = COUNTRY_NAME_TO_CODE[lower] || country.toUpperCase().slice(0, 2);
  const name = country.trim();
  return { name, code };
}

// ─── Company Name Normaliser ───────────────────────────────────────────────────

const COMPANY_SUFFIXES = [
  /\b(pvt\.?\s*ltd\.?|private\s+limited|p\.?\s*ltd\.?)\b/gi,
  /\b(ltd\.?|limited)\b/gi,
  /\b(inc\.?|incorporated)\b/gi,
  /\b(llc\.?|llp\.?)\b/gi,
  /\b(corp\.?|corporation)\b/gi,
  /\b(co\.?)\b/gi,
  /\b(group)\b/gi,
];

function normalizeCompany(company: string): string {
  if (!company) return '';
  let cleaned = company.trim();
  // Keep original for reference but clean for display
  return cleaned
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function extractCompanyDomain(website: string, email: string): string {
  if (website) {
    try {
      const url = website.startsWith('http') ? website : `https://${website}`;
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {}
  }
  if (email && email.includes('@')) {
    return email.split('@')[1];
  }
  return '';
}

// ─── Name Splitter ─────────────────────────────────────────────────────────────

function splitName(fullName: string): { firstName: string; lastName: string } {
  const honorifics = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sir', 'dame', 'rev', 'er', 'capt', 'col'];
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(p => !honorifics.includes(p.toLowerCase().replace(/\./g, '')));

  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeWebsite(website: string): string {
  if (!website) return '';
  let w = website.trim();
  if (!w.startsWith('http://') && !w.startsWith('https://')) w = `https://${w}`;
  return w.replace(/\/$/, '');
}

// ─── Record Cleaner ────────────────────────────────────────────────────────────

export function cleanRecord(raw: RawRecord): CleanedRecord {
  const changes: CleanChange[] = [];
  const verificationReasons: string[] = [];

  const track = (field: string, before: string, after: string, rule: string) => {
    if (before !== after) changes.push({ field, before, after, rule });
  };

  // ── Name ──────────────────────────────────────────────────────────────────────
  const rawName = String(raw.name || '').trim();
  const cleanedName = toTitleCase(rawName);
  track('name', rawName, cleanedName, 'Title Case');
  const { firstName, lastName } = splitName(cleanedName);

  // ── Company ───────────────────────────────────────────────────────────────────
  const rawCompany = String(raw.company || '').trim();
  const cleanedCompany = normalizeCompany(rawCompany);
  track('company', rawCompany, cleanedCompany, 'Company Name Normalisation');

  // ── Email ─────────────────────────────────────────────────────────────────────
  const rawEmail = String(raw.email || '').trim();
  const { valid: emailValid, domain, normalized: emailNorm } = validateEmail(rawEmail);
  track('email', rawEmail, emailNorm, 'Lowercase + Trim');
  if (rawEmail && !emailValid) verificationReasons.push(`Invalid email format: "${rawEmail}"`);

  // ── Mobile ────────────────────────────────────────────────────────────────────
  const rawMobile = String(raw.mobile || '').trim();
  const { e164: mobileE164, countryCode: mobileCC, valid: mobileValid } = normalizePhone(rawMobile);
  track('mobile', rawMobile, mobileE164, 'E.164 Format');
  if (rawMobile && !mobileValid) verificationReasons.push(`Unusual mobile number: "${rawMobile}"`);

  // ── Landline ──────────────────────────────────────────────────────────────────
  const rawLandline = String(raw.landline || '').trim();
  const { e164: landlineE164, valid: landlineValid } = normalizePhone(rawLandline);
  track('landline', rawLandline, landlineE164, 'E.164 Format');
  if (rawLandline && !landlineValid) verificationReasons.push(`Unusual landline number: "${rawLandline}"`);

  // ── Website ───────────────────────────────────────────────────────────────────
  const rawWebsite = String(raw.website || '').trim();
  const cleanedWebsite = normalizeWebsite(rawWebsite);
  track('website', rawWebsite, cleanedWebsite, 'Add https:// + remove trailing slash');

  // ── Country ───────────────────────────────────────────────────────────────────
  const rawCountry = String(raw.country || '').trim();
  const { name: countryName, code: countryCode } = normalizeCountry(rawCountry);
  // Infer country from mobile if missing
  const inferredCC = countryCode || mobileCC || '';

  // ── City ──────────────────────────────────────────────────────────────────────
  const rawCity = String(raw.city || '').trim();
  const cleanedCity = toTitleCase(rawCity);

  // ── Title ─────────────────────────────────────────────────────────────────────
  const cleanedTitle = toTitleCase(String(raw.title || '').trim());

  // ── Industry ──────────────────────────────────────────────────────────────────
  const cleanedIndustry = String(raw.industry || '').trim() || '';

  // ── Missing critical fields check ──────────────────────────────────────────────
  if (!cleanedName) verificationReasons.push('Missing name');
  if (!emailNorm) verificationReasons.push('Missing email');
  if (!mobileE164 && !landlineE164) verificationReasons.push('Missing phone number');

  // ── Company Domain ────────────────────────────────────────────────────────────
  const companyDomain = extractCompanyDomain(cleanedWebsite, emailNorm);

  // ── Lead Score ─────────────────────────────────────────────────────────────────
  let score = 0;
  if (cleanedName) score += 20;
  if (emailNorm && emailValid) score += 20;
  if (mobileE164 && mobileValid) score += 15;
  if (cleanedCompany) score += 15;
  if (cleanedTitle) score += 10;
  if (cleanedWebsite) score += 5;
  if (String(raw.address || '').trim()) score += 5;
  if (cleanedCity) score += 5;
  if (inferredCC) score += 3;
  if (cleanedIndustry) score += 2;

  return {
    _id: raw._id,
    _source: raw._source,
    _lead_score: Math.min(100, score),
    _changes: changes,
    _needs_verification: verificationReasons.length > 0,
    _verification_reasons: verificationReasons,
    name: cleanedName || rawName,
    first_name: firstName,
    last_name: lastName,
    title: cleanedTitle,
    company: cleanedCompany || rawCompany,
    company_domain: companyDomain,
    industry: cleanedIndustry,
    email: emailNorm || rawEmail,
    mobile: mobileE164 || rawMobile,
    landline: landlineE164 || rawLandline,
    website: cleanedWebsite || rawWebsite,
    address: String(raw.address || '').trim(),
    city: cleanedCity || rawCity,
    country: countryName || rawCountry,
    country_code: inferredCC,
    notes: String(raw.notes || '').trim(),
  };
}

export function cleanAllRecords(records: RawRecord[]): CleanedRecord[] {
  return records.map(cleanRecord);
}

// ─── EDA Report Generator ─────────────────────────────────────────────────────

const KEY_FIELDS = ['name', 'title', 'company', 'industry', 'email', 'mobile', 'landline', 'website', 'address', 'city', 'country'];

export function generateEdaReport(records: RawRecord[]): EdaReport {
  const total = records.length;
  if (total === 0) {
    return {
      totalRecords: 0, fields: KEY_FIELDS,
      completenessMatrix: {}, missingCounts: {}, anomalies: [],
      duplicateGroups: [], distributions: { industry: {}, country: {}, company: {} },
      overallQualityScore: 0,
    };
  }

  // Completeness matrix
  const missingCounts: Record<string, number> = {};
  KEY_FIELDS.forEach(f => { missingCounts[f] = 0; });

  records.forEach(r => {
    KEY_FIELDS.forEach(f => {
      if (!r[f] || String(r[f]).trim() === '') missingCounts[f]++;
    });
  });

  const completenessMatrix: Record<string, number> = {};
  KEY_FIELDS.forEach(f => {
    completenessMatrix[f] = Math.round(((total - missingCounts[f]) / total) * 100);
  });

  // Anomalies
  const anomalies: Anomaly[] = [];
  records.forEach(r => {
    const { valid: emailValid } = validateEmail(String(r.email || ''));
    if (r.email && !emailValid) {
      anomalies.push({ recordId: r._id, recordName: r.name || r._id, field: 'email', issue: 'Invalid email format', value: r.email, severity: 'high' });
    }
    const { valid: mobileValid } = normalizePhone(String(r.mobile || ''));
    if (r.mobile && !mobileValid) {
      anomalies.push({ recordId: r._id, recordName: r.name || r._id, field: 'mobile', issue: 'Invalid phone number', value: r.mobile, severity: 'medium' });
    }
    if (!r.name || String(r.name).trim() === '') {
      anomalies.push({ recordId: r._id, recordName: '(no name)', field: 'name', issue: 'Missing name', value: '', severity: 'high' });
    }
  });

  // Duplicate detection
  const duplicateGroups: DuplicateGroup[] = [];

  // Exact email duplicates (definite)
  const emailMap: Record<string, RawRecord[]> = {};
  records.forEach(r => {
    const email = String(r.email || '').toLowerCase().trim();
    if (email) {
      if (!emailMap[email]) emailMap[email] = [];
      emailMap[email].push(r);
    }
  });
  Object.entries(emailMap).forEach(([email, recs]) => {
    if (recs.length > 1) {
      duplicateGroups.push({
        ids: recs.map(r => r._id),
        names: recs.map(r => r.name || '(unnamed)'),
        matchField: 'email',
        matchValue: email,
        confidence: 'definite',
      });
    }
  });

  // Probable: same name + company
  const nameCompanyMap: Record<string, RawRecord[]> = {};
  records.forEach(r => {
    const key = `${String(r.name || '').toLowerCase().trim()}|${String(r.company || '').toLowerCase().trim()}`;
    if (key !== '|') {
      if (!nameCompanyMap[key]) nameCompanyMap[key] = [];
      nameCompanyMap[key].push(r);
    }
  });
  Object.entries(nameCompanyMap).forEach(([key, recs]) => {
    if (recs.length > 1) {
      const alreadyDefinite = duplicateGroups.some(g => g.ids.some(id => recs.map(r => r._id).includes(id)) && g.confidence === 'definite');
      if (!alreadyDefinite) {
        duplicateGroups.push({
          ids: recs.map(r => r._id),
          names: recs.map(r => r.name || '(unnamed)'),
          matchField: 'name + company',
          matchValue: key,
          confidence: 'probable',
        });
      }
    }
  });

  // Distributions
  const industryDist: FieldDistribution = {};
  const countryDist: FieldDistribution = {};
  const companyDist: FieldDistribution = {};

  records.forEach(r => {
    const ind = String(r.industry || 'Unknown').trim();
    industryDist[ind] = (industryDist[ind] || 0) + 1;
    const ctr = String(r.country || 'Unknown').trim();
    countryDist[ctr] = (countryDist[ctr] || 0) + 1;
    const comp = String(r.company || 'Unknown').trim();
    companyDist[comp] = (companyDist[comp] || 0) + 1;
  });

  // Overall quality score = average completeness of critical fields
  const criticalFields = ['name', 'email', 'mobile', 'company'];
  const avgCompleteness = criticalFields.reduce((sum, f) => sum + (completenessMatrix[f] || 0), 0) / criticalFields.length;
  const duplicatePenalty = Math.min(30, (duplicateGroups.filter(g => g.confidence === 'definite').length / total) * 100);
  const anomalyPenalty = Math.min(20, (anomalies.filter(a => a.severity === 'high').length / total) * 100);
  const overallQualityScore = Math.max(0, Math.round(avgCompleteness - duplicatePenalty - anomalyPenalty));

  return {
    totalRecords: total,
    fields: KEY_FIELDS,
    completenessMatrix,
    missingCounts,
    anomalies,
    duplicateGroups,
    distributions: { industry: industryDist, country: countryDist, company: companyDist },
    overallQualityScore,
  };
}

// ─── Freshsales Field Mapper ───────────────────────────────────────────────────

export function mapToFreshsales(records: CleanedRecord[]): FreshsalesRecord[] {
  return records.map(r => ({
    'First Name': r.first_name || r.name.split(' ')[0] || '',
    'Last Name': r.last_name || r.name.split(' ').slice(1).join(' ') || '',
    'Email': r.email,
    'Mobile Number': r.mobile,
    'Work Phone': r.landline,
    'Job Title': r.title,
    'Account Name': r.company,
    'Industry': r.industry,
    'Website': r.website,
    'Address': r.address,
    'City': r.city,
    'Country': r.country,
    'Notes': r.notes,
    'Lead Score': r._lead_score,
    'Source File': r._source,
  }));
}

// ─── Export Helpers ────────────────────────────────────────────────────────────

export function exportToExcel(data: any[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, filename);
}

export function exportToCsv(data: any[], filename: string): void {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
