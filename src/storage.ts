import { EventEmitter, type Memento } from "vscode";
import { type TestResult, resultKey } from "../shared/messages";

const HISTORY_KEY = "warmUp.history";
const MIGRATION_KEY = "warmUp.migratedFromV1";

/** Keep the stored history bounded; it lives in VS Code's global state. */
const MAX_RESULTS = 500;

export class ResultStore {
  private readonly changed = new EventEmitter<TestResult[]>();
  /** Fires whenever the stored history changes. */
  readonly onDidChange = this.changed.event;

  constructor(private readonly memento: Memento) {}

  all(): TestResult[] {
    return this.memento.get<TestResult[]>(HISTORY_KEY, []);
  }

  async add(result: TestResult): Promise<TestResult[]> {
    const results = [result, ...this.all()].slice(0, MAX_RESULTS);
    await this.memento.update(HISTORY_KEY, results);
    this.changed.fire(results);
    return results;
  }

  async clear(): Promise<void> {
    await this.memento.update(HISTORY_KEY, []);
    this.changed.fire([]);
  }

  /** Best run per comparable configuration, fastest first. */
  personalBests(): TestResult[] {
    const bests = new Map<string, TestResult>();

    for (const result of this.all()) {
      const key = resultKey(result);
      const current = bests.get(key);
      if (!current || result.wpm > current.wpm) {
        bests.set(key, result);
      }
    }

    return [...bests.values()].sort((a, b) => b.wpm - a.wpm);
  }

  hasMigrated(): boolean {
    return this.memento.get<boolean>(MIGRATION_KEY, false);
  }

  async markMigrated(): Promise<void> {
    await this.memento.update(MIGRATION_KEY, true);
  }

  dispose(): void {
    this.changed.dispose();
  }
}
