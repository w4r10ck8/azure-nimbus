import ora from "ora";
import cliProgress from "cli-progress";
import chalk from "chalk";

export class CLIProgress {
  private spinner: any;
  private progressBar: cliProgress.SingleBar | null = null;
  private message: string;
  private startTime: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(message: string) {
    this.message = message;
    this.startTime = Date.now();
    this.spinner = ora({
      text: message,
      spinner: "dots",
    });
  }

  start(): void {
    this.startTime = Date.now();
    this.spinner.start();
    this.startTimer();
  }

  stop(): void {
    this.spinner.stop();
    this.stopTimer();
  }

  succeed(message?: string): void {
    const duration = this.getDuration();
    const finalMessage = `${message || this.message} ${chalk.gray(
      `(${duration})`
    )}`;
    this.spinner.succeed(finalMessage);
    this.stopTimer();
  }

  fail(message?: string): void {
    const duration = this.getDuration();
    const finalMessage = `${message || `Failed: ${this.message}`} ${chalk.gray(
      `(${duration})`
    )}`;
    this.spinner.fail(finalMessage);
    this.stopTimer();
  }

  updateText(text: string): void {
    const duration = this.getDuration();
    this.spinner.text = `${text} ${chalk.gray(`(${duration})`)}`;
  }

  private startTimer(): void {
    // Update the spinner text with elapsed time every second
    this.timer = setInterval(() => {
      const duration = this.getDuration();
      if (this.spinner && this.spinner.isSpinning) {
        this.spinner.text = `${this.message} ${chalk.gray(`(${duration})`)}`;
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private getDuration(): string {
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
  }

  // Progress bar for longer operations
  startProgressBar(total: number, message?: string): void {
    this.stop(); // Stop spinner first
    this.startTime = Date.now(); // Reset start time for progress bar

    this.progressBar = new cliProgress.SingleBar({
      format: `${message || this.message} |${chalk.cyan(
        "{bar}"
      )}| {percentage}% | {value}/{total} items | {duration}`,
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
      formatValue: (v: number, options: any, type: string) => {
        switch (type) {
          case "duration":
            const elapsed = Date.now() - this.startTime;
            const seconds = Math.floor(elapsed / 1000);
            if (seconds < 60) {
              return `${seconds}s`;
            } else {
              const minutes = Math.floor(seconds / 60);
              const remainingSeconds = seconds % 60;
              return `${minutes}m ${remainingSeconds}s`;
            }
          default:
            return String(v);
        }
      },
    });

    this.progressBar.start(total, 0, { duration: "0s" });
  }

  updateProgress(current: number): void {
    if (this.progressBar) {
      const elapsed = Date.now() - this.startTime;
      const seconds = Math.floor(elapsed / 1000);
      const duration =
        seconds < 60
          ? `${seconds}s`
          : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

      this.progressBar.update(current, { duration });
    }
  }

  stopProgressBar(message?: string): void {
    if (this.progressBar) {
      const finalDuration = this.getDuration();
      this.progressBar.stop();
      this.progressBar = null;

      const finalMessage = message || `${this.message} completed`;
      console.log(chalk.green(`✓ ${finalMessage} (${finalDuration})`));
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
