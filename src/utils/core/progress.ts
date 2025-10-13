import ora from "ora";
import cliProgress from "cli-progress";
import chalk from "chalk";

export class CLIProgress {
  private spinner: any;
  private progressBar: cliProgress.SingleBar | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
    this.spinner = ora({
      text: message,
      spinner: "dots",
    });
  }

  start(): void {
    this.spinner.start();
  }

  stop(): void {
    this.spinner.stop();
  }

  succeed(message?: string): void {
    this.spinner.succeed(message || this.message);
  }

  fail(message?: string): void {
    this.spinner.fail(message || `Failed: ${this.message}`);
  }

  updateText(text: string): void {
    this.spinner.text = text;
  }

  // Progress bar for longer operations
  startProgressBar(total: number, message?: string): void {
    this.stop(); // Stop spinner first

    this.progressBar = new cliProgress.SingleBar({
      format: `${message || this.message} |${chalk.cyan(
        "{bar}"
      )}| {percentage}% | {value}/{total} items`,
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    });

    this.progressBar.start(total, 0);
  }

  updateProgress(current: number): void {
    if (this.progressBar) {
      this.progressBar.update(current);
    }
  }

  stopProgressBar(): void {
    if (this.progressBar) {
      this.progressBar.stop();
      this.progressBar = null;
    }
  }

  // Static utility methods
  static async withSpinner<T>(
    message: string,
    task: () => Promise<T>
  ): Promise<T> {
    const progress = new CLIProgress(message);
    progress.start();

    try {
      const result = await task();
      progress.succeed();
      return result;
    } catch (error) {
      progress.fail();
      throw error;
    }
  }

  static async withProgressBar<T>(
    message: string,
    items: any[],
    processor: (item: any, index: number) => Promise<T>
  ): Promise<T[]> {
    const progress = new CLIProgress(message);
    progress.startProgressBar(items.length);

    const results: T[] = [];

    try {
      for (let i = 0; i < items.length; i++) {
        const result = await processor(items[i], i);
        results.push(result);
        progress.updateProgress(i + 1);
      }

      progress.stopProgressBar();
      console.log(chalk.green("✅ Operation completed successfully!"));
      return results;
    } catch (error) {
      progress.stopProgressBar();
      console.error(chalk.red("❌ Operation failed!"));
      throw error;
    }
  }
}
