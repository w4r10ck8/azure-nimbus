import { MenuSystem } from "../utils/ui/menu-system.js";
import { AzureOperations } from "../utils/azure/operations.js";
import { ReportsOperations } from "../utils/reports/operations.js";
import chalk from "chalk";

export class DashboardManager {
  constructor(private version: string) {}

  async showMainDashboard(): Promise<void> {
    MenuSystem.displayWelcome(this.version);

    const choices = MenuSystem.getMainMenuChoices();
    const action = await MenuSystem.showMenu(
      "What would you like to do?",
      choices
    );

    await MenuSystem.handleNavigation(action, {
      azure: () => this.showAzureDashboard(),
      reports: () => this.showReportsDashboard(),
      exit: () => this.exit(),
    });
  }

  async showAzureDashboard(): Promise<void> {
    MenuSystem.displayAzureSettings();

    const choices = MenuSystem.getAzureSettingsChoices();
    const action = await MenuSystem.showMenu(
      "Select an Azure option:",
      choices
    );

    await MenuSystem.handleNavigation(action, {
      healthcheck: () => this.runHealthCheckAndReturn(),
      subscriptions: () => this.runSubscriptionsAndReturn(),
      resources: () => this.runResourcesAndReturn(),
      login: () => this.runLoginAndReturn(),
      back: () => this.showMainDashboard(),
    });
  }

  async showReportsDashboard(): Promise<void> {
    MenuSystem.displayReportsMenu();

    const choices = MenuSystem.getReportsChoices();
    const action = await MenuSystem.showMenu(
      "Select a report to generate:",
      choices
    );

    await MenuSystem.handleNavigation(action, {
      "dev-release-report": () => this.runDevReleaseReportAndReturn(),
      "uat-release-report": () => this.runUATReleaseReportAndReturn(),
      "prod-release-report": () => this.runProductionReleaseReportAndReturn(),
      "cleanup-reports": () => this.runCleanupReportsAndReturn(),
      back: () => this.showMainDashboard(),
    });
  }

  private async runDevReleaseReportAndReturn(): Promise<void> {
    await ReportsOperations.generateReleaseReport();

    const shouldReturn = await MenuSystem.askConfirmation(
      "Return to Reports menu?"
    );
    if (shouldReturn) {
      await this.showReportsDashboard();
    } else {
      await this.showMainDashboard();
    }
  }

  private async runUATReleaseReportAndReturn(): Promise<void> {
    await ReportsOperations.generateUATReleaseReport();

    const shouldReturn = await MenuSystem.askConfirmation(
      "Return to Reports menu?"
    );
    if (shouldReturn) {
      await this.showReportsDashboard();
    } else {
      await this.showMainDashboard();
    }
  }

  private async runProductionReleaseReportAndReturn(): Promise<void> {
    await ReportsOperations.generateProductionReleaseReport();

    const shouldReturn = await MenuSystem.askConfirmation(
      "Return to Reports menu?"
    );
    if (shouldReturn) {
      await this.showReportsDashboard();
    } else {
      await this.showMainDashboard();
    }
  }

  private async runCleanupReportsAndReturn(): Promise<void> {
    await ReportsOperations.cleanupReports();

    const shouldReturn = await MenuSystem.askConfirmation(
      "Return to Reports menu?"
    );
    if (shouldReturn) {
      await this.showReportsDashboard();
    } else {
      await this.showMainDashboard();
    }
  }

  private async runHealthCheckAndReturn(): Promise<void> {
    await AzureOperations.runHealthCheck();

    const shouldReturn = await MenuSystem.askConfirmation(
      "Return to Azure Settings?"
    );
    if (shouldReturn) {
      await this.showAzureDashboard();
    } else {
      await this.showMainDashboard();
    }
  }

  private async runSubscriptionsAndReturn(): Promise<void> {
    try {
      await AzureOperations.listSubscriptions();

      const shouldReturn = await MenuSystem.askConfirmation(
        "Return to Azure Settings?"
      );
      if (shouldReturn) {
        await this.showAzureDashboard();
      } else {
        await this.showMainDashboard();
      }
    } catch (error) {
      MenuSystem.displayError(
        "",
        error instanceof Error ? error.message : "Unknown error"
      );

      const shouldReturn = await MenuSystem.askConfirmation(
        "Return to Azure Settings?"
      );
      if (shouldReturn) {
        await this.showAzureDashboard();
      } else {
        await this.showMainDashboard();
      }
    }
  }

  private async runResourcesAndReturn(): Promise<void> {
    try {
      const subscriptionId = await MenuSystem.askInput(
        "Enter subscription ID (leave empty for default):"
      );
      await AzureOperations.listResources(subscriptionId || undefined);

      const shouldReturn = await MenuSystem.askConfirmation(
        "Return to Azure Settings?"
      );
      if (shouldReturn) {
        await this.showAzureDashboard();
      } else {
        await this.showMainDashboard();
      }
    } catch (error) {
      MenuSystem.displayError(
        "",
        error instanceof Error ? error.message : "Unknown error"
      );

      const shouldReturn = await MenuSystem.askConfirmation(
        "Return to Azure Settings?"
      );
      if (shouldReturn) {
        await this.showAzureDashboard();
      } else {
        await this.showMainDashboard();
      }
    }
  }

  private async runLoginAndReturn(): Promise<void> {
    await AzureOperations.runAzureLogin();

    const shouldReturn = await MenuSystem.askConfirmation(
      "Return to Azure Settings?"
    );
    if (shouldReturn) {
      await this.showAzureDashboard();
    } else {
      await this.showMainDashboard();
    }
  }

  private async exit(): Promise<void> {
    console.log(chalk.green("👋 Goodbye!"));
    process.exit(0);
  }
}
