import chalk from "chalk";
import inquirer from "inquirer";

export interface MenuChoice {
  name: string;
  value: string;
}

export class MenuSystem {
  // Display Methods
  static displayHeader(
    title: string,
    subtitle?: string,
    breadcrumbs?: string[]
  ): void {
    console.clear();
    console.log(
      chalk.blue(
        "┌──────────────────────────────────────────────────────────────────────────────────────────────────┐"
      )
    );
    console.log(chalk.blue("│") + " ".repeat(98) + chalk.blue("│"));
    console.log(
      chalk.blue("│") +
        chalk.cyan(
          "   █████╗ ███████╗██╗   ██╗██████╗ ███████╗    ███╗   ██╗██╗███╗   ███╗██████╗ ██╗   ██╗███████╗  "
        ) +
        chalk.blue("│")
    );
    console.log(
      chalk.blue("│") +
        chalk.cyan(
          "  ██╔══██╗╚══███╔╝██║   ██║██╔══██╗██╔════╝    ████╗  ██║██║████╗ ████║██╔══██╗██║   ██║██╔════╝  "
        ) +
        chalk.blue("│")
    );
    console.log(
      chalk.blue("│") +
        chalk.cyan(
          "  ███████║  ███╔╝ ██║   ██║██████╔╝█████╗      ██╔██╗ ██║██║██╔████╔██║██████╔╝██║   ██║███████╗  "
        ) +
        chalk.blue("│")
    );
    console.log(
      chalk.blue("│") +
        chalk.cyan(
          "  ██╔══██║ ███╔╝  ██║   ██║██╔══██╗██╔══╝      ██║╚██╗██║██║██║╚██╔╝██║██╔══██╗██║   ██║╚════██║  "
        ) +
        chalk.blue("│")
    );
    console.log(
      chalk.blue("│") +
        chalk.cyan(
          "  ██║  ██║███████╗╚██████╔╝██║  ██║███████╗    ██║ ╚████║██║██║ ╚═╝ ██║██████╔╝╚██████╔╝███████║  "
        ) +
        chalk.blue("│")
    );
    console.log(
      chalk.blue("│") +
        chalk.cyan(
          "  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═══╝╚═╝╚═╝     ╚═╝╚═════╝  ╚═════╝ ╚══════╝  "
        ) +
        chalk.blue("│")
    );
    console.log(
      chalk.blue("│") +
        " ".repeat(76) +
        chalk.gray("developed by w4r10ck") +
        " ".repeat(2) +
        chalk.blue("│")
    );
    console.log(chalk.blue("│") + " ".repeat(98) + chalk.blue("│"));
    console.log(
      chalk.blue(
        "└──────────────────────────────────────────────────────────────────────────────────────────────────┘"
      )
    );

    console.log("");

    if (breadcrumbs && breadcrumbs.length > 0) {
      this.displayBreadcrumbs(breadcrumbs);
    }

    if (subtitle) {
      console.log(chalk.cyan(subtitle));
      console.log("");
    }
  }

  static displayBreadcrumbs(breadcrumbs: string[]): void {
    const breadcrumbText = breadcrumbs
      .map((crumb, index) => {
        if (index === breadcrumbs.length - 1) {
          // Current page - highlighted
          return chalk.white.bold(crumb);
        } else {
          // Previous pages - dimmed
          return chalk.gray(crumb);
        }
      })
      .join(chalk.gray(" › "));

    console.log(`🧭 ${breadcrumbText}`);
    console.log("");
  }

  static displayWelcome(version: string): void {
    this.displayHeader("ddd Azure Report CLI", "Welcome Dashboard", ["Home"]);
    console.log(chalk.cyan(`🔧 Version: ${version}`));
    console.log(chalk.yellow("🚀 Welcome to Azure Report CLI!"));
    console.log("");
    console.log(
      chalk.white(
        "This tool helps you retrieve and analyze Azure resource information."
      )
    );
    console.log("");
  }

  static displayAzureSettings(): void {
    this.displayHeader(
      "Azure Settings",
      "Manage your Azure connection and resources",
      ["Home", "Azure Settings"]
    );
  }

  static displayOperationHeader(title: string, operation: string): void {
    console.clear();
    this.displayBreadcrumbs(["Home", "Azure Settings", operation]);
    console.log(chalk.blue(`🔧 ${title}`));
    console.log("");
  }

  static displayResults(
    title: string,
    items: any[],
    formatter?: (item: any, index: number) => string
  ): void {
    console.log(chalk.green(`\n✅ ${title}:`));

    if (items.length === 0) {
      console.log(chalk.yellow("   No items found"));
      return;
    }

    items.forEach((item, index) => {
      if (formatter) {
        console.log(formatter(item, index));
      } else {
        console.log(chalk.cyan(`   ${index + 1}. ${JSON.stringify(item)}`));
      }
    });
  }

  static displayError(message: string, details?: string): void {
    console.error(chalk.red("❌ Error:", message));
    if (details) {
      console.log("");
      console.log(chalk.red("Error details:", details));
    }
  }

  static displaySuccess(message: string): void {
    console.log(chalk.green(message));
  }

  static displayInfo(title: string, items: string[]): void {
    console.log(chalk.yellow(`📝 ${title}:`));
    items.forEach((item) => {
      console.log(chalk.white(`   ${item}`));
    });
  }

  // Navigation Methods
  static async showMenu(
    message: string,
    choices: MenuChoice[]
  ): Promise<string> {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: message,
        choices: choices,
      },
    ]);
    return answer.action;
  }

  static async askConfirmation(
    message: string,
    defaultValue: boolean = true
  ): Promise<boolean> {
    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "continue",
        message: message,
        default: defaultValue,
      },
    ]);
    return answer.continue;
  }

  static async askInput(
    message: string,
    defaultValue?: string
  ): Promise<string> {
    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "value",
        message: message,
        default: defaultValue,
      },
    ]);
    return answer.value;
  }

  static async handleNavigation(
    action: string,
    handlers: Record<string, () => Promise<void>>
  ): Promise<void> {
    const handler = handlers[action];
    if (handler) {
      await handler();
    } else {
      console.error(`Unknown action: ${action}`);
    }
  }

  // Menu Choices
  static getMainMenuChoices(): MenuChoice[] {
    return [
      {
        name: "☁️  Azure Settings",
        value: "azure",
      },
      {
        name: "📊 Reports",
        value: "reports",
      },
      {
        name: "❌ Exit",
        value: "exit",
      },
    ];
  }

  static getAzureSettingsChoices(): MenuChoice[] {
    return [
      {
        name: "🏥 Health Check - Test Azure Connection",
        value: "healthcheck",
      },
      {
        name: "📋 List Subscriptions",
        value: "subscriptions",
      },
      {
        name: "📊 List Resources",
        value: "resources",
      },
      {
        name: "🔧 Azure CLI Login",
        value: "login",
      },
      {
        name: "⬅️  Back to Main Menu",
        value: "back",
      },
    ];
  }

  static getReportsChoices(): MenuChoice[] {
    return [
      {
        name: "🚀 Generate Release Report",
        value: "release-report",
      },
      {
        name: "⬅️  Back to Main Menu",
        value: "back",
      },
    ];
  }

  static displayReportsMenu(): void {
    this.displayHeader(
      "Reports",
      "Generate various Azure reports and analyses",
      ["Home", "Reports"]
    );
  }
}
