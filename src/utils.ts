import { Deal } from "./types/index.js";
import { Impit } from "impit";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-US,en;q=0.9",
  "DNT": "1",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Cache-Control": "max-age=0",
};

function createScraperClient() {
  return new Impit({
    browser: "chrome",
    ignoreTlsErrors: true,
    headers: DEFAULT_HEADERS,
  });
}

async function fetchTextOrThrow(
  client: any,
  url: string,
  options: Record<string, any> = {}
): Promise<string> {
  const response = await client.fetch(url, {
    headers: {
      ...DEFAULT_HEADERS,
      ...(options.headers || {}),
    },
    redirect: "follow",
    ...options,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
  }

  return text;
}

async function fetchJsonOrThrow(
  client: any,
  url: string,
  options: Record<string, any> = {}
) {
  const response = await client.fetch(url, {
    headers: {
      accept: "application/json",
      ...DEFAULT_HEADERS,
      ...(options.headers || {}),
    },
    redirect: "follow",
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

function firstText(root: any, selectors: string[]): string {
  for (const selector of selectors) {
    const value = root.find(selector).first().text().trim();
    if (value) return value;
  }

  return "";
}

function firstAttr(root: any, selector: string, attr: string): string {
  return root.find(selector).first().attr(attr) || "";
}

function normalizeWhitespace(value: string | undefined | null): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeUrl(href: string, baseUrl: string): string {
  if (!href) return "";
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("http")) return href;
  return `${baseUrl}${href}`;
}

function assertRequiredFields(result: Deal, label: string): void {
  const missing = Object.entries(result)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `${label} fields were incomplete (${missing.join(", ")}): ${JSON.stringify(result, null, 2)}`
    );
  }
}

export {
  DEFAULT_HEADERS,
  assertRequiredFields,
  createScraperClient,
  fetchJsonOrThrow,
  fetchTextOrThrow,
  firstAttr,
  firstText,
  normalizeUrl,
  normalizeWhitespace,
};