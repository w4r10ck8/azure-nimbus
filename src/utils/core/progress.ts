import ora from "ora";
import cliProgress from "cli-progress";
import chalk from "chalk";

export class CLIProgress {
  private spinner: any;
  private progressBar: cliProgress.SingleBar | null = null;
  private message: string;
  private startTime: number;
  private timer: NodeJS.Timeout | null = null;
  private originalConsoleLog: typeof console.log | null = null;
  private originalConsoleWarn: typeof console.warn | null = null;
  private originalConsoleError: typeof console.error | null = null;
  private bufferedMessages: Array<{
    type: "log" | "warn" | "error";
    message: string;
  }> = [];

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
    this.restoreConsole(); // Restore console on failure
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
    this.suppressConsole(); // Suppress console logging to prevent interference

    this.progressBar = new cliProgress.SingleBar({
      format: `${message || this.message} |${chalk.cyan(
        "{bar}"
      )}| {percentage}% | {value}/{total} items | {duration}`,
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
      clearOnComplete: false,
      forceRedraw: true,
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

  /**
   * Display an important message immediately above the progress bar
   * This buffers the message to be shown after progress completes
   */
  showMessageAboveProgress(
    message: string,
    type: "info" | "warn" | "error" = "info"
  ): void {
    // Instead of trying to pause/resume, just buffer important messages
    const messageType = type === "info" ? "log" : type;
    this.bufferedMessages.push({ type: messageType, message });
  }

  stopProgressBar(message?: string): void {
    if (this.progressBar) {
      const finalDuration = this.getDuration();
      this.progressBar.stop();
      this.progressBar = null;
      this.restoreConsole(); // Restore console logging

      const finalMessage = message || `${this.message} completed`;
      console.log(chalk.green(`✓ ${finalMessage} (${finalDuration})`));
    }
  }

  failProgressBar(message?: string): void {
    if (this.progressBar) {
      const finalDuration = this.getDuration();
      this.progressBar.stop();
      this.progressBar = null;
      this.restoreConsole(); // Restore console logging

      const finalMessage = message || `${this.message} failed`;
      console.log(chalk.red(`❌ ${finalMessage} (${finalDuration})`));
    }
  }

  /**
   * Suppress console output to prevent interference with progress bar
   * Messages are buffered and will be displayed after progress completes
   */
  suppressConsole(): void {
    if (!this.originalConsoleLog) {
      this.originalConsoleLog = console.log;
      this.originalConsoleWarn = console.warn;
      this.originalConsoleError = console.error;

      // Buffer console messages instead of suppressing them completely
      console.log = (...args: any[]) => {
        this.bufferedMessages.push({ type: "log", message: args.join(" ") });
      };

      console.warn = (...args: any[]) => {
        this.bufferedMessages.push({ type: "warn", message: args.join(" ") });
      };

      console.error = (...args: any[]) => {
        this.bufferedMessages.push({ type: "error", message: args.join(" ") });
      };
    }
  }

  /**
   * Restore original console functionality and display buffered messages
   */
  restoreConsole(): void {
    if (this.originalConsoleLog) {
      console.log = this.originalConsoleLog;
      console.warn = this.originalConsoleWarn!;
      console.error = this.originalConsoleError!;

      this.originalConsoleLog = null;
      this.originalConsoleWarn = null;
      this.originalConsoleError = null;

      // Display buffered messages after restoring console
      this.displayBufferedMessages();
    }
  }

  /**
   * Display any buffered messages that were captured during progress bar operation
   * Filters out overly verbose debug messages for cleaner output
   */
  private displayBufferedMessages(): void {
    if (this.bufferedMessages.length > 0) {
      console.log(""); // Add spacing

      // Filter out verbose debug messages
      const filteredMessages = this.bufferedMessages.filter((msg) => {
        const message = msg.message.toLowerCase();

        // Skip very verbose debug messages but keep important ones
        if (
          message.includes("build number not found in artifacts") ||
          (message.includes("searching for build") &&
            message.includes("date range")) ||
          (message.includes("found ") &&
            message.includes(" builds with number")) ||
          message.includes("expanding search range") ||
          message.includes("extracting info from build") ||
          message.includes("raw requestedfor") ||
          message.includes("raw sourcebranch") ||
          message.includes("found associated build:")
        ) {
          return false;
        }

        return true;
      });

      filteredMessages.forEach((msg) => {
        switch (msg.type) {
          case "warn":
            console.warn(chalk.yellow(`⚠️  ${msg.message}`));
            break;
          case "error":
            console.error(chalk.red(`❌ ${msg.message}`));
            break;
          default:
            console.log(msg.message);
        }
      });
      this.bufferedMessages = []; // Clear the buffer
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
      progress.restoreConsole(); // Ensure console is restored on error
      console.error(chalk.red("❌ Operation failed!"));
      throw error;
    }
  }
}
