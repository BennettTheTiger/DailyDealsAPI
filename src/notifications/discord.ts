import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { ScraperResult } from "../types/index.js";

const FAILURE_THRESHOLD = 4;

interface RetailerFailureState {
  consecutiveFailures: number;
  alerted: boolean;
  lastError?: string;
  lastAttempt: string;
}

type FailureState = Record<string, RetailerFailureState>;

function getStateFile(): string {
  return process.env.SCRAPE_FAILURE_STATE_FILE ?? "data/scrape-failures.json";
}

async function loadFailureState(): Promise<FailureState> {
  try {
    return JSON.parse(await readFile(getStateFile(), "utf8")) as FailureState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

async function saveFailureState(state: FailureState): Promise<void> {
  const stateFile = getStateFile();
  const temporaryFile = `${stateFile}.tmp`;

  await mkdir(dirname(stateFile), { recursive: true });
  await writeFile(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporaryFile, stateFile);
}

async function sendDiscordMessage(content: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook returned HTTP ${response.status}`);
  }
}

export async function notifyScrapeFailures(results: ScraperResult[]): Promise<void> {
  const state = await loadFailureState();
  const now = new Date().toISOString();
  const notifications: string[] = [];

  for (const result of results) {
    const key = result.retailer.toLowerCase();
    const previous = state[key] ?? {
      consecutiveFailures: 0,
      alerted: false,
      lastAttempt: now,
    };

    if (result.success) {
      if (previous.alerted) {
        notifications.push(`✅ Daily Deals recovered for ${result.retailer} after ${previous.consecutiveFailures} consecutive failures.`);
      }

      delete state[key];
      continue;
    }

    const consecutiveFailures = previous.consecutiveFailures + 1;
    const alerted = previous.alerted || consecutiveFailures >= FAILURE_THRESHOLD;

    state[key] = {
      consecutiveFailures,
      alerted,
      lastError: result.error,
      lastAttempt: now,
    };

    if (consecutiveFailures === FAILURE_THRESHOLD) {
      notifications.push(
        `🚨 Daily Deals scrape failed ${consecutiveFailures} times in a row for ${result.retailer}. Latest error: ${result.error ?? "Unknown error"}`,
      );
    }
  }

  await saveFailureState(state);

  for (const notification of notifications) {
    await sendDiscordMessage(notification);
  }
}