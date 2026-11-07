import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { TRANSLATION_CONCURRENCY, TRANSLATION_EFFORT, TRANSLATION_MODEL, TRANSLATIONS_DIR } from "./config.ts";
import { protect, restore, type Token } from "./enricher-tokens.ts";

/**
 * Site translations are stored in translations/*.json and versioned with
 * the code: they can be reviewed, edited by hand and marked "reviewed".
 * A translation is redone only when the English source text changes.
 */
export interface StoredTranslation {
  hash: string;
  fields: Record<string, string>;
  status: "unreviewed" | "reviewed";
  model: string;
  date: string;
  /** Previous version kept when the source changed after a review. */
  previous?: Record<string, string>;
}

type Store = Record<string, StoredTranslation>;
type ReviewStatus = StoredTranslation["status"];

const hashOf = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
const today = () => new Date().toISOString().slice(0, 10);

const INSTRUCTIONS = `You translate rules of the Pathfinder Second Edition roleplaying game (Remaster) from English into French.

Mandatory rules:
- Follow the official French terminology of Pathfinder 2 Remaster. Use the provided glossary: every English glossary term must be rendered exactly by its French translation.
- Convert distances: 5 feet = 1,5 m (10 feet = 3 m, 30 feet = 9 m), 1 mile = 1,5 km. Use a decimal comma.
- Keep every HTML tag and every <ref id="n">…</ref> or <ref id="n"/> tag exactly as is. Only translate the text inside <ref> tags that have content, agreeing it with the French sentence.
- Add or remove no information. Keep numbers, dice (2d6) and DCs unchanged.
- Address the reader with "vous", as in the French rulebooks.
- Answer with a valid JSON object only, with exactly the same keys as the input object, no surrounding text and no code fence.`;

export class Translator {
  private client: Anthropic | null;
  private stores = new Map<string, Store>();
  private running = 0;
  private queue: (() => void)[] = [];
  readonly failures: string[] = [];
  calls = 0;
  readonly usage = { input: 0, output: 0 };
  /** Translations not yet written to disk: saved in small groups so that an interrupted run loses little. */
  private unsaved = 0;

  constructor(
    enabled: boolean,
    private glossary: Map<string, string>,
  ) {
    this.client = enabled && process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  get model(): string {
    return TRANSLATION_MODEL;
  }

  addGlossaryTerm(english: string, french: string): void {
    if (english && french && english.length > 2 && !this.glossary.has(english)) this.glossary.set(english, french);
  }

  private store(name: string): Store {
    let store = this.stores.get(name);
    if (!store) {
      const file = path.join(TRANSLATIONS_DIR, `${name}.json`);
      store = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Store) : {};
      this.stores.set(name, store);
    }
    return store;
  }

  save(): void {
    this.unsaved = 0;
    mkdirSync(TRANSLATIONS_DIR, { recursive: true });
    for (const [name, store] of this.stores) {
      const sorted = Object.fromEntries(Object.entries(store).sort(([a], [b]) => a.localeCompare(b)));
      writeFileSync(path.join(TRANSLATIONS_DIR, `${name}.json`), JSON.stringify(sorted, null, 2) + "\n");
    }
  }

  private async limit<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= TRANSLATION_CONCURRENCY) await new Promise<void>((resolve) => this.queue.push(resolve));
    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
      this.queue.shift()?.();
    }
  }

  private patterns = new Map<string, RegExp>();

  private relevantGlossary(texts: string[]): string {
    const corpus = texts.join("\n").toLowerCase();
    const lines: string[] = [];
    for (const [english, french] of this.glossary) {
      let pattern = this.patterns.get(english);
      if (!pattern) {
        pattern = new RegExp(`\\b${english.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
        this.patterns.set(english, pattern);
      }
      if (pattern.test(corpus)) lines.push(`${english} → ${french}`);
      if (lines.length >= 150) break;
    }
    return lines.length ? `Glossary:\n${lines.join("\n")}` : "Glossary: (no term)";
  }

  private async call(fields: Record<string, string>, context: string): Promise<Record<string, string>> {
    // Streaming: the longest rules sections need more output than a plain request allows.
    const response = await this.client!.messages
      .stream({
        model: TRANSLATION_MODEL,
        max_tokens: 64000,
        output_config: { effort: TRANSLATION_EFFORT },
        system: INSTRUCTIONS,
        messages: [
          {
            role: "user",
            content: `${context}\n\n${this.relevantGlossary(Object.values(fields))}\n\nObject to translate:\n${JSON.stringify(fields, null, 2)}`,
          },
        ],
      })
      .finalMessage();
    this.calls++;
    this.usage.input += response.usage.input_tokens;
    this.usage.output += response.usage.output_tokens;
    if (response.stop_reason === "refusal") throw new Error(`refused (${response.stop_details?.category ?? "no category"})`);
    if (response.stop_reason === "max_tokens") throw new Error("output truncated (max_tokens)");
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .replace(/^```(?:json)?\s*|\s*```$/g, "")
      .trim();
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const output: Record<string, string> = {};
    for (const key of Object.keys(fields)) {
      if (typeof parsed[key] !== "string" || !parsed[key]) throw new Error(`missing field "${key}"`);
      output[key] = parsed[key] as string;
    }
    return output;
  }

  /**
   * Translates the English fields of an entry.
   * Returns null when no translation is possible (no API key, model failure).
   */
  async translateEntry(
    collection: string,
    foundryId: string,
    englishFields: Record<string, string>,
    context: string,
  ): Promise<{ fields: Record<string, string>; status: ReviewStatus } | null> {
    const store = this.store(collection);
    const hash = hashOf(englishFields);
    const existing = store[foundryId];
    if (existing && existing.hash === hash) return { fields: existing.fields, status: existing.status };
    if (!this.client) return null;

    return this.limit(async () => {
      const protectedFields: Record<string, string> = {};
      const tokens: Record<string, Token[]> = {};
      for (const [key, value] of Object.entries(englishFields)) {
        const p = protect(value);
        protectedFields[key] = p.text;
        tokens[key] = p.tokens;
      }
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const raw = await this.call(protectedFields, context);
          const fields: Record<string, string> = {};
          for (const key of Object.keys(raw)) fields[key] = restore(raw[key], tokens[key]);
          store[foundryId] = {
            hash,
            fields,
            status: "unreviewed",
            model: TRANSLATION_MODEL,
            date: today(),
            ...(existing?.status === "reviewed" ? { previous: existing.fields } : {}),
          };
          if (++this.unsaved >= 20) this.save();
          return { fields, status: "unreviewed" as const };
        } catch (error) {
          if (attempt === 2) this.failures.push(`${collection}/${foundryId}: ${(error as Error).message}`);
        }
      }
      return null;
    });
  }

  /** Translates short labels (language keys, book titles…) in batches. */
  async translateKeys(keys: Map<string, string>, context: string): Promise<Map<string, { french: string; status: ReviewStatus }>> {
    const store = this.store("dictionary");
    const result = new Map<string, { french: string; status: ReviewStatus }>();
    const todo: [string, string][] = [];
    for (const [key, english] of keys) {
      const existing = store[key];
      if (existing && existing.hash === hashOf(english)) result.set(key, { french: existing.fields.french, status: existing.status });
      else todo.push([key, english]);
    }
    if (!this.client || todo.length === 0) return result;

    const batches: [string, string][][] = [];
    for (let i = 0; i < todo.length; i += 40) batches.push(todo.slice(i, i + 40));
    await Promise.all(
      batches.map((batch) =>
        this.limit(async () => {
          try {
            const raw = await this.call(Object.fromEntries(batch), context);
            for (const [key, english] of batch) {
              store[key] = { hash: hashOf(english), fields: { french: raw[key] }, status: "unreviewed", model: TRANSLATION_MODEL, date: today() };
              result.set(key, { french: raw[key], status: "unreviewed" });
            }
          } catch (error) {
            this.failures.push(`dictionary (${batch.length} keys): ${(error as Error).message}`);
          }
        }),
      ),
    );
    return result;
  }
}
