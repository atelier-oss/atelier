/**
 * Figma REST adapter — fetch variables and styles from a Figma file and
 * normalize them for the agent's role-mapping preamble.
 *
 * Phase 3a contract:
 *   - extractFileKey: parse a Figma URL or raw key into the bare file key.
 *   - loadFigmaContext: fetch Variables API + Styles API, normalize both.
 *   - Uses global fetch (Node 20+). No node-fetch dependency.
 *   - Auth header: X-Figma-Token: <token>.
 *   - On error (401, 403, 404, 429) throws a contextual Error. NO retry.
 *
 * COLOR variables: RGBA (0..1 floats) -> hex (#RRGGBB or #RRGGBBAA when a < 1).
 * TEXT styles: names only -- style values require /files/{key} (deferred Phase 3b).
 */

export interface FigmaVariable {
  name: string;
  /** Hex color (#RRGGBB or #RRGGBBAA) for COLOR variables; raw value otherwise. */
  value: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
}

export interface FigmaStyle {
  name: string;
  type: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  /** Hex color for FILL styles when a resolved value is available. */
  value?: string;
}

export interface FigmaContext {
  fileKey: string;
  fileName: string;
  variables: FigmaVariable[];
  styles: FigmaStyle[];
}

// Matches https://www.figma.com/file/ABC123/... and /design/ABC123/...
const FIGMA_URL_RE = /figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/;
const RAW_KEY_RE = /^[A-Za-z0-9]+$/;
// Real Figma file keys are 22 characters of base62. Reject obvious garbage
// like a single char or short alphanumeric strings that would pass the
// regex but produce a guaranteed 404 against the API.
const MIN_RAW_KEY_LENGTH = 10;

/**
 * Extract the bare Figma file key from a URL or raw key string.
 * Accepts /file/ and /design/ URL forms, or a plain alphanumeric key
 * of at least 10 characters (real keys are 22).
 * Throws on malformed input.
 */
export function extractFileKey(input: string): string {
  const trimmed = input.trim();

  const urlMatch = FIGMA_URL_RE.exec(trimmed);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  if (RAW_KEY_RE.test(trimmed)) {
    if (trimmed.length < MIN_RAW_KEY_LENGTH) {
      throw new Error(
        `Agent.figma: input "${input}" is too short to be a Figma file key. ` +
          `Real keys are 22 characters; minimum accepted: ${MIN_RAW_KEY_LENGTH}.`,
      );
    }
    return trimmed;
  }

  throw new Error(
    `Agent.figma: cannot extract file key from input "${input}". ` +
      'Expected a Figma URL (https://www.figma.com/file/KEY/...) or raw key (alphanumeric, ≥10 chars).',
  );
}

function clamp255(n: number): number {
  return Math.round(Math.max(0, Math.min(1, n)) * 255);
}

function toHex2(n: number): string {
  return n.toString(16).padStart(2, '0');
}

/**
 * Convert a Figma RGBA object (0..1 floats) to a hex string.
 * Returns #RRGGBB when alpha is 1 (or absent); #RRGGBBAA otherwise.
 */
export function rgbaToHex(rgba: {
  r: number;
  g: number;
  b: number;
  a?: number;
}): string {
  const r = clamp255(rgba.r);
  const g = clamp255(rgba.g);
  const b = clamp255(rgba.b);
  const a = rgba.a ?? 1;
  const hex = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  if (a < 1) {
    return `${hex}${toHex2(clamp255(a))}`;
  }
  return hex;
}

interface FigmaRgba {
  r: number;
  g: number;
  b: number;
  a?: number;
}

type FigmaVariableValue = FigmaRgba | number | string | boolean;

interface FigmaApiVariable {
  name: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, FigmaVariableValue>;
}

interface FigmaVariablesApiResponse {
  meta: {
    variables: Record<string, FigmaApiVariable>;
  };
}

interface FigmaApiStyle {
  key: string;
  name: string;
  style_type: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
}

interface FigmaStylesApiResponse {
  meta: {
    styles: FigmaApiStyle[];
  };
}

interface FigmaFileMetaApiResponse {
  name: string;
}

function normalizeVariableValue(variable: FigmaApiVariable): string {
  const modes = Object.values(variable.valuesByMode);
  if (modes.length === 0) return '';

  const value = modes[0];

  if (
    variable.resolvedType === 'COLOR' &&
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'r' in value
  ) {
    return rgbaToHex(value as FigmaRgba);
  }

  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return String(value);

  return '';
}

function normalizeVariables(raw: Record<string, FigmaApiVariable>): FigmaVariable[] {
  return Object.values(raw).map((v) => ({
    name: v.name,
    value: normalizeVariableValue(v),
    type: v.resolvedType,
  }));
}

function normalizeStyles(raw: FigmaApiStyle[]): FigmaStyle[] {
  return raw.map((s) => ({
    name: s.name,
    type: s.style_type,
  }));
}

const FIGMA_API_BASE = 'https://api.figma.com/v1';

async function figmaFetch<T>(
  path: string,
  token: string,
  fileKey: string,
): Promise<T> {
  const url = `${FIGMA_API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { 'X-Figma-Token': token },
  });

  if (!response.ok) {
    const status = response.status;
    const statusMessages: Record<number, string> = {
      401: 'invalid or missing Figma token (401 Unauthorized)',
      403: 'insufficient permissions for this file (403 Forbidden)',
      404: 'endpoint not found (404 Not Found)',
      429: 'Figma API rate limit exceeded (429 Too Many Requests)',
    };
    const detail = statusMessages[status] ?? `HTTP ${status}`;
    throw new Error(
      `Agent.figma: ${detail} for endpoint "${path}" (file key "${fileKey}"). ` +
        'Check FIGMA_TOKEN, file visibility, and that the endpoint is available on your Figma plan.',
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Best-effort fetch for endpoints that may legitimately 404 on non-Enterprise
 * plans (notably /variables/local). On 404 we return the supplied fallback
 * instead of throwing — Variables API is Enterprise-gated; absence is a real
 * world condition, not a hard error.
 */
async function figmaFetchOptional<T>(
  path: string,
  token: string,
  fileKey: string,
  fallback: T,
): Promise<T> {
  try {
    return await figmaFetch<T>(path, token, fileKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('404 Not Found')) {
      return fallback;
    }
    throw err;
  }
}

/**
 * Fetch a Figma file's variables and styles and return a normalized FigmaContext.
 *
 * @param input - A Figma file URL or raw file key.
 * @param token - A Figma personal access token with file:read scope.
 */
export async function loadFigmaContext(
  input: string,
  token: string,
): Promise<FigmaContext> {
  const fileKey = extractFileKey(input);

  // Variables API is Enterprise-gated; treat 404 as "no variables" instead
  // of failing the whole context load. Styles + file-info fetches still
  // hard-fail — they're available on every Figma plan.
  const [variablesData, stylesData, fileData] = await Promise.all([
    figmaFetchOptional<FigmaVariablesApiResponse>(
      `/files/${fileKey}/variables/local`,
      token,
      fileKey,
      { meta: { variables: {} } },
    ),
    figmaFetch<FigmaStylesApiResponse>(
      `/files/${fileKey}/styles`,
      token,
      fileKey,
    ),
    figmaFetch<FigmaFileMetaApiResponse>(
      `/files/${fileKey}?depth=1`,
      token,
      fileKey,
    ),
  ]);

  const variables = normalizeVariables(variablesData.meta?.variables ?? {});
  const styles = normalizeStyles(stylesData.meta?.styles ?? []);

  return {
    fileKey,
    fileName: fileData.name ?? fileKey,
    variables,
    styles,
  };
}
