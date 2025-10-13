import chalk from "chalk";
import { AzureService } from "../../services/azure-service.js";
import { MenuSystem } from "../ui/menu-system.js";
import { exec } from "child_process";
import { promisify } from "util";
import { CLIProgress } from "../core/progress.js";

const execAsync = promisify(exec);

export class AzureOperations {
  private static azureService = new AzureService();

  static async runHealthCheck(): Promise<void> {
    MenuSystem.displayOperationHeader(
      "Running Azure Health Check",
      "Health Check"
    );

    const progress = new CLIProgress("Checking Azure authentication...");
    progress.start();

    try {
      const subscriptions = await this.azureService.getSubscriptions();

      progress.succeed("✅ Azure authentication successful");
      console.log("");
      console.log(chalk.green("🎉 Health Check Results:"));
      console.log(chalk.white(`   ✅ Azure SDK: Connected`));
      console.log(chalk.white(`   ✅ Authentication: Valid`));
      console.log(
        chalk.white(`   ✅ Subscriptions found: ${subscriptions.length}`)
      );

      if (subscriptions.length > 0) {
        console.log("");
        console.log(chalk.cyan("📋 Available Subscriptions:"));
        subscriptions.forEach((sub, index) => {
          console.log(
            chalk.white(
              `   ${index + 1}. ${sub.displayName} (${sub.subscriptionId})`
            )
          );
        });
      }

      console.log("");
      console.log(chalk.green("✨ You're all set to use Azure Report CLI!"));
    } catch (error) {
      progress.fail("❌ Azure authentication failed!");
      console.log("");
      console.log(chalk.red("🚨 Health Check Results:"));
      console.log(chalk.white("   ❌ Azure SDK: Error"));
      console.log(chalk.white("   ❌ Authentication: Failed"));
      console.log("");

      MenuSystem.displayInfo("🔧 Troubleshooting Steps", [
        "1. Run 'az login' to authenticate with Azure",
        "2. Ensure you have the Azure CLI installed",
        "3. Check your network connection",
        "4. Verify your Azure permissions",
      ]);

      console.log("");
      MenuSystem.displayError(
        "",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  static async runAzureLogin(): Promise<void> {
    console.log("");
    console.log(chalk.blue("🔐 Azure CLI Login"));
    console.log("");
    console.log(
      chalk.yellow(
        "This will open your web browser to authenticate with Azure..."
      )
    );

    const shouldProceed = await MenuSystem.askConfirmation(
      "Do you want to proceed with Azure login?"
    );

    if (!shouldProceed) {
      return;
    }

    const progress = new CLIProgress("Opening Azure login...");
    progress.start();

    try {
      await execAsync("az login");
      progress.succeed("✅ Azure login completed!");

      console.log("");
      MenuSystem.displaySuccess("🎉 Successfully authenticated with Azure!");
      console.log(chalk.white("You can now use all Azure features."));
    } catch (error) {
      progress.fail("❌ Azure login failed!");
      console.log("");
      MenuSystem.displayError(
        "",
        error instanceof Error ? error.message : "Unknown error"
      );
      console.log("");

      MenuSystem.displayInfo("📝 Make sure you have Azure CLI installed", [
        "• macOS: brew install azure-cli",
        "• Windows: Download from https://aka.ms/installazurecliwindows",
        "• Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash",
      ]);
    }
  }

  static async listSubscriptions(): Promise<void> {
    MenuSystem.displayOperationHeader(
      "Listing Azure Subscriptions",
      "List Subscriptions"
    );

    const progress = new CLIProgress("Fetching subscriptions...");
    progress.start();

    try {
      const subscriptions = await this.azureService.getSubscriptions();
      progress.stop();

      MenuSystem.displayResults(
        `Azure Subscriptions (${subscriptions.length} found)`,
        subscriptions,
        (subscription, index) => {
          let output = chalk.cyan(`${index + 1}. ${subscription.displayName}`);
          output += `\n${chalk.gray(`   ID: ${subscription.subscriptionId}`)}`;
          output += `\n${chalk.gray(`   State: ${subscription.state}`)}`;
          output += "\n";
          return output;
        }
      );
    } catch (error) {
      progress.fail("❌ Failed to fetch subscriptions");
      throw error;
    }
  }

  static async listResources(subscriptionId?: string): Promise<void> {
    MenuSystem.displayOperationHeader(
      "Listing Azure Resources",
      "List Resources"
    );

    const progress = new CLIProgress("Fetching resources...");
    progress.start();

    try {
      const resources = await this.azureService.getResources(subscriptionId);
      progress.stop();

      MenuSystem.displayResults(
        `Azure Resources (${resources.length} found)`,
        resources,
        (resource, index) => {
          let output = chalk.cyan(
            `${index + 1}. ${resource.name} (${resource.type})`
          );
          output += `\n${chalk.gray(`   Location: ${resource.location}`)}`;
          output += `\n${chalk.gray(
            `   Resource Group: ${resource.resourceGroup}`
          )}`;
          output += "\n";
          return output;
        }
      );
    } catch (error) {
      progress.fail("❌ Failed to fetch resources");
      throw error;
    }
  }
}
