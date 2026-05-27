/**
 * Live Verification — Source Querier
 *
 * Takes a configured data source and extracted entities, then fetches
 * real-time data from:
 *   - website_url: fetches the page and returns its text content
 *   - api_endpoint: substitutes {entity_name} placeholders in the URL
 *     and calls the API, returning the JSON response as text
 *
 * Returns a string of raw data text to feed into the LLM for comparison.
 * Non-fatal: returns null on any network or parse error.
 */

const FETCH_TIMEOUT_MS = 8000; // 8s max per source
const MAX_RESPONSE_CHARS = 4000; // trim large responses

type DataSource = {
  id: string;
  name: string;
  type: "website_url" | "api_endpoint";
  url: string | null;
  endpoint_template: string | null;
  http_method: "GET" | "POST";
  auth_header_name: string | null;
  auth_secret_id: string | null; // Vault secret — future use
  entity_hints: string[];
  is_active: boolean;
};

export type SourceQueryResult = {
  sourceName: string;
  entitiesUsed: Record<string, string>;
  rawData: string;
};

/**
 * Substitute {placeholder} tokens in a URL template with extracted entities.
 * e.g. "https://api.co/orders/{order_id}" + {order_id: "ORD-9"} → "https://api.co/orders/ORD-9"
 */
function substituteTemplate(
  template: string,
  entities: Record<string, string>,
): { url: string; usedEntities: Record<string, string> } {
  const usedEntities: Record<string, string> = {};
  const url = template.replace(/\{(\w+)\}/g, (_match, key) => {
    if (entities[key] !== undefined) {
      usedEntities[key] = entities[key];
      return encodeURIComponent(entities[key]);
    }
    return `{${key}}`; // leave unreplaced if entity not found
  });
  return { url, usedEntities };
}

/**
 * Convert HTML to plain text (very simple — strips tags and collapses whitespace).
 * No external library needed.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function querySource(
  source: DataSource,
  entities: Record<string, string>,
): Promise<SourceQueryResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    if (source.type === "website_url") {
      if (!source.url) return null;

      const res = await fetch(source.url, {
        signal: controller.signal,
        headers: { "User-Agent": "QAScope-Verifier/1.0" },
      });
      if (!res.ok) return null;

      const contentType = res.headers.get("content-type") ?? "";
      const body = await res.text();
      const rawData = contentType.includes("html")
        ? htmlToText(body).slice(0, MAX_RESPONSE_CHARS)
        : body.slice(0, MAX_RESPONSE_CHARS);

      return { sourceName: source.name, entitiesUsed: {}, rawData };
    }

    if (source.type === "api_endpoint") {
      if (!source.endpoint_template) return null;

      const { url, usedEntities } = substituteTemplate(
        source.endpoint_template,
        entities,
      );

      // Skip if no entities were substituted (URL still has unreplaced placeholders)
      const hasUnresolved = url.includes("{");
      if (hasUnresolved) return null;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "QAScope-Verifier/1.0",
      };

      // Auth header — value from env var named after auth_header_name
      // Convention: store the secret value in env as DATASOURCE_<AUTH_HEADER_NAME_UPPERCASED>
      if (source.auth_header_name) {
        const envKey = `DATASOURCE_${source.auth_header_name.toUpperCase().replace(/-/g, "_")}`;
        const secret = process.env[envKey];
        if (secret) headers[source.auth_header_name] = secret;
      }

      const res = await fetch(url, {
        method: source.http_method,
        headers,
        signal: controller.signal,
      });
      if (!res.ok) return null;

      const json = await res.json();
      const rawData = JSON.stringify(json, null, 2).slice(0, MAX_RESPONSE_CHARS);

      return { sourceName: source.name, entitiesUsed: usedEntities, rawData };
    }

    return null;
  } catch {
    return null; // timeout or network error — non-fatal
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Query all active data sources for a client in parallel.
 * Returns a combined context string ready to inject into the scoring prompt.
 */
export async function queryAllSources(
  sources: DataSource[],
  entities: Record<string, string>,
): Promise<string> {
  const active = sources.filter((s) => s.is_active);
  if (!active.length) return "";

  const results = await Promise.all(
    active.map((s) => querySource(s, entities).catch(() => null)),
  );

  const lines: string[] = [];
  for (const r of results) {
    if (!r) continue;
    lines.push(`--- Source: ${r.sourceName} ---`);
    if (Object.keys(r.entitiesUsed).length) {
      lines.push(
        `Queried with: ${Object.entries(r.entitiesUsed)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")}`,
      );
    }
    lines.push(r.rawData);
    lines.push("");
  }

  return lines.join("\n");
}
