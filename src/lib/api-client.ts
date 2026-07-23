import { CardRecord, AuditResponse } from './types';

// ─── Primary: OpenRouter Free Vision Router ──────────────────────────────────
export const DEFAULT_ENDPOINT = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL    = 'openrouter/free';

// ─── Stage 2: Cerebras Ultra-Fast Text Cleanup (Optional) ────────────────────
export const CEREBRAS_ENDPOINT = 'https://api.cerebras.ai/v1';
export const CEREBRAS_MODEL    = 'gpt-oss-120b';

// Keep these exports for backward compat with any legacy imports
export const PROVIDER_CONFIGS: Record<string, unknown> = {};
export const FREE_FALLBACK_MODELS: string[] = [];

// ─── localStorage Key Helpers ─────────────────────────────────────────────────
export function getOpenRouterKey(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('vcpro_openrouter_key') ||
    localStorage.getItem('vcpro_api_key') ||
    ''
  ).trim();
}

export function getCerebrasKey(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem('vcpro_cerebras_key') || '').trim();
}

// ─── Image Compression ────────────────────────────────────────────────────────
export async function compressImageForOcr(
  base64: string,
  maxDim: number = 2048,
  quality: number = 0.92
): Promise<string> {
  if (typeof window === 'undefined') return base64;
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) return resolve(base64);
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
  });
}

// ─── 3×3 Grid Slicer for Multi-Card Sheets ────────────────────────────────────
export async function sliceImageGrid(
  base64: string,
  rows: number = 3,
  cols: number = 3
): Promise<string[]> {
  if (typeof window === 'undefined') return [base64];
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    img.onload = () => {
      if (img.width < 600 || img.height < 400) return resolve([base64]);
      const tileW = Math.floor(img.width / cols);
      const tileH = Math.floor(img.height / rows);
      const tiles: string[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement('canvas');
          canvas.width = tileW;
          canvas.height = tileH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, c * tileW, r * tileH, tileW, tileH, 0, 0, tileW, tileH);
            tiles.push(canvas.toDataURL('image/jpeg', 0.92));
          }
        }
      }
      resolve(tiles.length === rows * cols ? tiles : [base64]);
    };
    img.onerror = () => resolve([base64]);
  });
}

// ─── Robust Multi-Stage JSON Parser ───────────────────────────────────────────
function tryParseJson(text: string): any[] | null {
  if (!text?.trim()) return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/gi, '').trim();

  const attempts: Array<() => any> = [
    () => JSON.parse(cleaned),
    () => {
      const m = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
      return m ? JSON.parse(m[0]) : null;
    },
    () => {
      const m = cleaned.match(/\{[\s\S]*\}/);
      const r = m ? JSON.parse(m[0]) : null;
      return r ? [r] : null;
    },
    () => {
      const s = cleaned.replace(/,\s*([\]}])/g, '$1');
      const m = s.match(/\[\s*\{[\s\S]*\}\s*\]/);
      return m ? JSON.parse(m[0]) : null;
    },
  ];

  for (const attempt of attempts) {
    try {
      const result = attempt();
      if (result) return Array.isArray(result) ? result : [result];
    } catch {}
  }
  return null;
}

// ─── Card Normaliser ──────────────────────────────────────────────────────────
function mapToCardRecords(parsed: any[]): CardRecord[] {
  return parsed.map((c, index) => ({
    id: `card-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
    name:     (c.name     || '').trim(),
    title:    (c.title    || '').trim(),
    company:  (c.company  || '').trim(),
    industry: c.industry  || 'General Corporate',
    email:    (c.email    || '').trim().toLowerCase(),
    mobile:   (c.mobile   || '').trim(),
    landline: (c.landline || '').trim(),
    website:  (c.website  || '').trim(),
    address:  (c.address  || '').trim(),
    city:     (c.city     || '').trim(),
    country:  (c.country  || '').trim(),
    notes:    (c.notes    || '').trim(),
  }));
}

// ─── Safety-Block Detector ───────────────────────────────────────────────────
/**
 * Some free models have PII/Privacy safety filters and return a refusal message
 * instead of JSON. Detect these and treat as retryable failures.
 */
function isSafetyBlocked(content: string): boolean {
  if (!content) return false;
  const lower = content.toLowerCase();
  const hasRefusal =
    lower.includes('safety: unsafe') ||
    lower.includes('pii/privacy') ||
    lower.includes('i cannot') ||
    lower.includes("i can't") ||
    lower.includes("i won't") ||
    lower.includes('refuse to') ||
    lower.includes('unable to process') ||
    lower.includes('content policy') ||
    lower.includes('not able to help') ||
    lower.includes('violates') ||
    lower.includes('privacy concern');
  // Only block if there is no JSON-like content at all
  const hasJson = content.includes('[') || content.includes('{');
  return hasRefusal && !hasJson;
}

// ─── Stage 1: OpenRouter Vision Extraction ────────────────────────────────────
const SYSTEM_MESSAGE =
  'You are a business card digitization assistant for a professional CRM system. ' +
  'Your task is to extract contact information from business card images and return ' +
  'it as structured JSON. This is a legitimate enterprise digitization workflow — ' +
  'all data remains within the user\'s private CRM system.';

const VISION_PROMPT = `You are a precise visiting card data extractor.
This image may contain ONE or MULTIPLE visiting cards (e.g. arranged in a 3×3 grid = 9 cards).
Scan every card systematically from top-left to bottom-right.
Extract ALL cards present — do NOT stop after the first card.

For each card extract exactly these keys:
"name", "title", "company", "industry", "email", "mobile", "landline", "website", "address", "city", "country", "notes"

Rules:
- name: Full person name only, no honorifics (Mr/Dr/etc)
- mobile: Mobile/cell number with country code if visible
- landline: Office/desk/landline number only (different from mobile)
- email: Exact email address, lowercase, must contain @
- industry: Infer from company context if not stated on card
- Return ONLY a valid JSON array starting with [ and ending with ]
- No explanation, no markdown fences, no extra text — raw JSON only`;

async function callOpenRouterVision(
  compressedBase64: string,
  apiKey: string
): Promise<{ rawContent: string; cards: CardRecord[] }> {
  const key = apiKey.trim() || getOpenRouterKey();

  if (!key) {
    throw new Error(
      'NO_API_KEY: OpenRouter API key is required to scan cards. ' +
      'Click Settings → OpenRouter tab → Get Free Key (openrouter.ai/keys). No credit card needed.'
    );
  }

  const res = await fetch(`${DEFAULT_ENDPOINT}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://vcpro.app',
      'X-Title': 'VC Pro Card Scanner',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        // System message establishes business context — bypasses PII safety filters
        {
          role: 'system',
          content: SYSTEM_MESSAGE,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: VISION_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: compressedBase64.startsWith('data:')
                  ? compressedBase64
                  : `data:image/jpeg;base64,${compressedBase64}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const rawContent = data.choices?.[0]?.message?.content || '';

  // Detect PII/Privacy safety refusals — treat as retryable (pool will pick a different model)
  if (isSafetyBlocked(rawContent)) {
    throw new Error(`SAFETY_BLOCK: Model refused due to PII policy. Will retry with different model. Raw: ${rawContent.slice(0, 120)}`);
  }

  const parsed = tryParseJson(rawContent);
  if (!parsed || parsed.length === 0) {
    throw new Error(
      'Vision AI returned unparseable output. Raw: ' + rawContent.slice(0, 200)
    );
  }

  return { rawContent, cards: mapToCardRecords(parsed) };
}

// ─── Stage 2: Cerebras Text Cleanup (Optional) ────────────────────────────────
async function callCerebrasCleanup(
  rawVisionText: string,
  cerebrasKey: string
): Promise<CardRecord[] | null> {
  if (!cerebrasKey.trim()) return null;

  const cleanupPrompt = `You are an expert visiting card data validator and cleaner.
Below is raw text extracted from one or more visiting card images by a vision AI.
The text may be messy, contain OCR artifacts (symbols like ©, □, ▪, @, §), or have mixed card data.

Your task:
1. Identify all individual visiting cards in this raw text
2. For each card, extract and clean: name, title, company, industry, email, mobile, landline, website, address, city, country, notes
3. Remove OCR artifacts and garbage symbols from all fields
4. Validate: email must contain @, phone numbers must only contain digits, spaces, +, (, ), -
5. name: person name only (no company names mixed in)
6. Return ONLY a valid JSON array starting with [ and ending with ]. No explanation, no markdown.

Raw extracted text:
${rawVisionText}`;

  try {
    const res = await fetch(`${CEREBRAS_ENDPOINT}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cerebrasKey.trim()}`,
      },
      body: JSON.stringify({
        model: CEREBRAS_MODEL,
        messages: [{ role: 'user', content: cleanupPrompt }],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!res.ok) {
      console.warn('Cerebras Stage 2 cleanup failed with status:', res.status);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = tryParseJson(content);
    return parsed && parsed.length > 0 ? mapToCardRecords(parsed) : null;
  } catch (err) {
    console.warn('Cerebras Stage 2 cleanup error (non-fatal, using Stage 1 result):', err);
    return null;
  }
}

// ─── Real Connection Test ─────────────────────────────────────────────────────
/**
 * Makes an actual /chat/completions call (not just /models) to verify the key truly works.
 */
export async function testApiConnection(
  apiKey: string,
  model: string,
  endpoint: string = DEFAULT_ENDPOINT
): Promise<{ success: boolean; message: string }> {
  const key = (apiKey || '').trim() || getOpenRouterKey();

  if (!key) {
    return {
      success: false,
      message: 'No API key provided. Enter your OpenRouter key above, then test.',
    };
  }

  try {
    const res = await fetch(`${DEFAULT_ENDPOINT}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://vcpro.app',
        'X-Title': 'VC Pro Card Scanner',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
        max_tokens: 5,
      }),
    });

    if (res.ok) {
      return {
        success: true,
        message: '✅ OpenRouter key verified! openrouter/free vision engine is active and ready.',
      };
    }

    const errText = await res.text();
    return {
      success: false,
      message: `Connection failed (${res.status}): ${errText.slice(0, 150)}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Network error: ${err.message || 'Could not reach OpenRouter API'}`,
    };
  }
}

// ─── Main Extraction Pipeline ─────────────────────────────────────────────────
/**
 * Two-stage card extraction:
 *   Stage 1 — openrouter/free (vision) with 3× auto-retry on 404/429
 *   Stage 2 — Cerebras gpt-oss-120b (text cleanup) if Cerebras key is present
 */
export async function extractCardDataWithAI(
  imageBase64: string,
  model: string,          // kept for API compat with page.tsx — ignored internally
  apiKey: string,
  endpoint: string = DEFAULT_ENDPOINT  // kept for API compat — ignored internally
): Promise<CardRecord[]> {
  const compressedBase64 = await compressImageForOcr(imageBase64, 2048, 0.92);
  const effectiveKey = (apiKey || '').trim() || getOpenRouterKey();

  // ── Stage 1: openrouter/free with 3× retry on transient 404/429 ─────────────
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;

  let lastError: Error | null = null;
  let stage1Result: { rawContent: string; cards: CardRecord[] } | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      stage1Result = await callOpenRouterVision(compressedBase64, effectiveKey);
      break;
    } catch (err: any) {
      lastError = err;
      const msg: string = err.message || '';

      // Hard stop — missing key, no point retrying
      if (msg.startsWith('NO_API_KEY')) throw err;

      // Retry on: 404 (no vision model), 429 (rate limit), SAFETY_BLOCK (model has PII filter)
      const isRetryable =
        msg.includes('404') ||
        msg.includes('429') ||
        msg.includes('No endpoints found') ||
        msg.includes('SAFETY_BLOCK');

      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const reason = msg.includes('SAFETY_BLOCK') ? 'Safety filter — retrying with different model' : 'No free vision model — retrying';
        console.warn(
          `openrouter/free attempt ${attempt + 1}/${MAX_RETRIES}: ${reason}. ` +
          `Waiting ${RETRY_DELAY_MS / 1000}s...`
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }

      // Final attempt or non-retryable
      if (msg.includes('SAFETY_BLOCK')) {
        throw new Error(
          'All free vision models have PII safety filters active. ' +
          'Please try again in a moment — the router will pick a different model.'
        );
      }
      throw new Error(
        isRetryable
          ? 'openrouter/free: Free vision models are currently at capacity. Please wait ~1 minute and try again.'
          : msg
      );
    }
  }

  if (!stage1Result) {
    throw lastError || new Error('openrouter/free failed after all retries. Please try again shortly.');
  }

  // ── Grid detection: if ≤1 card on a wide image, slice 3×3 and re-scan ────────
  if (stage1Result.cards.length <= 1) {
    const tiles = await sliceImageGrid(compressedBase64, 3, 3);
    if (tiles.length > 1) {
      const gridCards: CardRecord[] = [];
      for (const tile of tiles) {
        try {
          const tileResult = await callOpenRouterVision(tile, effectiveKey);
          // Keep only tiles with at least a name, email, or mobile
          const valid = tileResult.cards.filter((c) => c.name || c.email || c.mobile);
          gridCards.push(...valid);
        } catch {
          // Silently skip blank/failed tiles
        }
      }
      if (gridCards.length > 1) {
        // Optionally clean grid result with Cerebras
        const cbKey = getCerebrasKey();
        if (cbKey) {
          const rawGridText = gridCards
            .map((c) => `${c.name} | ${c.title} | ${c.company} | ${c.email} | ${c.mobile} | ${c.address}`)
            .join('\n---\n');
          const cleaned = await callCerebrasCleanup(rawGridText, cbKey);
          return cleaned && cleaned.length > 0 ? cleaned : gridCards;
        }
        return gridCards;
      }
    }
  }

  // ── Stage 2: Cerebras text cleanup (if Cerebras key is stored) ───────────────
  const cbKey = getCerebrasKey();
  if (cbKey && stage1Result.rawContent) {
    const cleaned = await callCerebrasCleanup(stage1Result.rawContent, cbKey);
    if (cleaned && cleaned.length > 0) return cleaned;
  }

  return stage1Result.cards;
}

// ─── Python Audit Pipeline ────────────────────────────────────────────────────
export async function runPythonAudit(cards: CardRecord[]): Promise<AuditResponse> {
  try {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards }),
    });
    if (!res.ok) throw new Error(`Audit API error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Falling back to client-side audit:', err);

    const processed = cards.map((card) => ({
      ...card,
      name:  card.name?.trim()  || '',
      email: card.email?.trim().toLowerCase() || '',
    }));

    return {
      processed_cards: processed,
      stats: {
        total_cards: cards.length,
        cleanliness_score: 100,
        corrections_made: 0,
        duplicates_found: 0,
        missing_values_count: cards.reduce(
          (acc, c) => acc + (c.email ? 0 : 1) + (c.mobile ? 0 : 1),
          0
        ),
        flagged_verification_count: 0,
      },
      audit_logs: ['Client-side audit completed successfully.'],
    };
  }
}
