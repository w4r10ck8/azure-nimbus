import chalk from "chalk";
import { MenuSystem } from "../ui/menu-system.js";
import { CLIProgress } from "../core/progress.js";
import { AzureService } from "../../services/azureService.js";
import {
  AzureDevOpsService,
  BuildReport,
} from "../../services/azureDevOpsService.js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import inquirer from "inquirer";

export class ReportsOperations {
  private static azureService = new AzureService();
  private static azureDevOpsService = new AzureDevOpsService();

  static async generateReleaseReport(): Promise<void> {
    MenuSystem.displayOperationHeader(
      "Generating Release Report",
      "Release Report"
    );

    // Ask for build number
    console.log(chalk.cyan("📋 Release Report Generator"));
    console.log("");
    console.log(
      chalk.white(
        "This will generate a comprehensive build and deployment report."
      )
    );
    console.log(
      chalk.gray("Examples: 20251013.1 (build number) or 156536 (build ID)")
    );
    console.log("");

    const { buildInput } = await inquirer.prompt([
      {
        type: "input",
        name: "buildInput",
        message: "Enter the build number or build ID:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Build number or ID is required";
          }
          return true;
        },
      },
    ]);

    const progress = new CLIProgress("Connecting to Azure DevOps...");
    progress.start();

    try {
      // Configure Azure DevOps and verify authentication
      await this.azureDevOpsService.configureDefaults();

      const isAuthenticated =
        await this.azureDevOpsService.verifyAuthentication();
      if (!isAuthenticated) {
        progress.fail("❌ Not authenticated with Azure DevOps");
        console.log("");
        MenuSystem.displayError(
          "Authentication required",
          "Please authenticate with: az login --allow-no-subscriptions"
        );
        return;
      }

      progress.updateText("Resolving build information...");

      // Get build details
      let buildDetails;
      try {
        // Check if input looks like a build number (YYYYMMDD.X format)
        if (/^\d{8}\.\d+$/.test(buildInput.trim())) {
          buildDetails = await this.azureDevOpsService.getBuildByNumber(
            buildInput.trim()
          );
        } else {
          buildDetails = await this.azureDevOpsService.getBuildById(
            buildInput.trim()
          );
        }
      } catch (error) {
        progress.fail("❌ Build not found");
        console.log("");
        MenuSystem.displayError(
          "Build lookup failed",
          error instanceof Error ? error.message : "Unknown error"
        );
        return;
      }

      const buildInfo = this.azureDevOpsService.extractBuildInfo(buildDetails);

      progress.updateText("Extracting health check results...");
      const healthCheck =
        await this.azureDevOpsService.extractHealthCheckResults(buildInfo.id);

      progress.updateText("Gathering test results...");
      const { testing, coverage } =
        await this.azureDevOpsService.extractAllTestResults(buildInfo.id);

      progress.updateText("Retrieving build artifacts...");
      const artifacts = await this.azureDevOpsService.getBuildArtifacts(
        buildInfo.id
      );

      // Create build report data
      const buildReport: BuildReport = {
        build: buildInfo,
        healthCheck,
        testing,
        coverage,
        artifacts,
        generatedAt: new Date().toISOString(),
      };

      progress.updateText("Generating report files...");

      // Ensure output directory exists
      const outputDir = join(process.cwd(), "output");
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Generate both JSON and Markdown reports
      const reportName = `build-report-${buildInput.trim()}`;
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];

      const jsonFilename = `${reportName}-${timestamp}.json`;
      const mdFilename = `${reportName}-${timestamp}.md`;
      const jsonFilepath = join(outputDir, jsonFilename);
      const mdFilepath = join(outputDir, mdFilename);

      // Write JSON report
      writeFileSync(jsonFilepath, JSON.stringify(buildReport, null, 2));

      // Write Markdown report
      const markdownReport = this.generateBuildMarkdownReport(buildReport);
      writeFileSync(mdFilepath, markdownReport);

      progress.succeed("✅ Release report generated successfully!");

      // Display summary
      console.log("");
      console.log(chalk.green("🎉 BUILD REPORT COMPLETE!"));
      console.log("");
      console.log(chalk.cyan("📊 Build Summary:"));
      console.log(
        chalk.white(`   � Build: ${buildInfo.number} (ID: ${buildInfo.id})`)
      );
      console.log(
        chalk.white(`   � Status: ${buildInfo.status} / ${buildInfo.result}`)
      );
      console.log(chalk.white(`   ⏱️  Duration: ${buildInfo.duration}`));
      console.log(chalk.white(`   🌿 Branch: ${buildInfo.sourceBranch}`));

      console.log("");
      console.log(chalk.cyan("🏥 Health Check Summary:"));
      console.log(chalk.white(`   🔒 Security: ${healthCheck.securityAudit}`));
      console.log(
        chalk.white(`   � Environment: ${healthCheck.environmentCheck}`)
      );
      console.log(chalk.white(`   🎨 Prettier: ${healthCheck.prettier}`));
      console.log(chalk.white(`   📝 ESLint: ${healthCheck.eslint}`));
      console.log(chalk.white(`   📘 TypeScript: ${healthCheck.typescript}`));
      console.log(chalk.white(`   🔨 Build: ${healthCheck.buildSuccess}`));

      if (testing.tests !== "No test results found") {
        console.log("");
        console.log(chalk.cyan("🧪 Test Summary:"));
        console.log(chalk.white(`   📁 Files: ${testing.testFiles}`));
        console.log(chalk.white(`   🧪 Tests: ${testing.tests}`));
        console.log(chalk.white(`   ⏱️  Duration: ${testing.duration}`));
      }

      console.log("");
      console.log(chalk.green("📁 Generated Files:"));
      console.log(chalk.white(`   📄 ${jsonFilename} (machine-readable)`));
      console.log(chalk.white(`   📄 ${mdFilename} (human-readable)`));
      console.log(chalk.gray(`   📍 Location: ${outputDir}`));

      console.log("");
      console.log(chalk.yellow("💡 Next steps:"));
      console.log(chalk.white("   • Review the generated report files"));
      console.log(chalk.white("   • Share with your development team"));
      console.log(chalk.white("   • Use for release documentation"));
      console.log(chalk.white(`   • View online: ${buildInfo.buildUrl}`));
    } catch (error) {
      progress.fail("❌ Failed to generate release report");
      console.log("");
      MenuSystem.displayError(
        "Report generation failed",
        error instanceof Error ? error.message : "Unknown error"
      );

      console.log("");
      MenuSystem.displayInfo("🛠️ Troubleshooting", [
        "• Ensure you're authenticated with Azure DevOps: az login --allow-no-subscriptions",
        "• Verify the build number/ID is correct",
        "• Check your network connection",
        "• Ensure you have access to the Azure DevOps project",
      ]);
    }
  }

  private static generateReportContent(
    subscriptions: any[],
    allResources: any[],
    resourcesByType: Record<string, any[]>,
    resourcesByLocation: Record<string, any[]>
  ): string {
    const timestamp = new Date().toLocaleString();

    let report = `# Azure Release Test Report

Generated on: ${timestamp}

## Executive Summary

This report provides a comprehensive overview of Azure resources for release testing validation.

### Key Metrics
- **Total Subscriptions**: ${subscriptions.length}
- **Total Resources**: ${allResources.length}
- **Resource Types**: ${Object.keys(resourcesByType).length}
- **Azure Regions**: ${Object.keys(resourcesByLocation).length}

## Subscription Details

`;

    // Add subscription information
    subscriptions.forEach((sub, index) => {
      const subResources = allResources.filter(
        (r) => r.subscriptionId === sub.subscriptionId
      );
      report += `### ${index + 1}. ${sub.displayName}
- **Subscription ID**: \`${sub.subscriptionId}\`
- **State**: ${sub.state}
- **Resources Count**: ${subResources.length}

`;
    });

    // Add resource breakdown by type
    report += `## Resource Breakdown by Type

`;

    const sortedTypes = Object.entries(resourcesByType).sort(
      ([, a], [, b]) => b.length - a.length
    );

    sortedTypes.forEach(([type, resources]) => {
      report += `### ${type}
- **Count**: ${resources.length}
- **Locations**: ${[...new Set(resources.map((r) => r.location))].join(", ")}

`;
    });

    // Add geographic distribution
    report += `## Geographic Distribution

`;

    const sortedLocations = Object.entries(resourcesByLocation).sort(
      ([, a], [, b]) => b.length - a.length
    );

    sortedLocations.forEach(([location, resources]) => {
      const uniqueTypes = [...new Set(resources.map((r) => r.type))];
      report += `### ${location}
- **Resources**: ${resources.length}
- **Resource Types**: ${uniqueTypes.length}
- **Types**: ${uniqueTypes.slice(0, 5).join(", ")}${
        uniqueTypes.length > 5 ? "..." : ""
      }

`;
    });

    // Add detailed resource list
    report += `## Detailed Resource Inventory

| Name | Type | Location | Resource Group | Subscription |
|------|------|----------|----------------|--------------|
`;

    allResources.forEach((resource) => {
      const subscription = subscriptions.find(
        (s) => s.subscriptionId === resource.subscriptionId
      );
      report += `| ${resource.name} | ${resource.type} | ${
        resource.location
      } | ${resource.resourceGroup} | ${
        subscription?.displayName || "N/A"
      } |\n`;
    });

    // Add testing recommendations
    report += `
## Release Testing Recommendations

### High Priority Testing Areas
1. **Critical Resource Types**: Focus on resources with high counts
2. **Multi-Region Resources**: Verify cross-region functionality
3. **Resource Dependencies**: Test interconnected resources

### Testing Checklist
- [ ] Verify resource availability and health
- [ ] Test network connectivity between resources
- [ ] Validate backup and disaster recovery procedures
- [ ] Confirm monitoring and alerting configurations
- [ ] Test scaling capabilities where applicable

### Notes
- This report was generated automatically by Azure Report CLI
- Resource data is current as of report generation time
- For real-time status, use Azure Portal or Azure CLI commands

---
*Report generated by Azure Report CLI*
`;

    return report;
  }

  private static generateBuildMarkdownReport(buildReport: BuildReport): string {
    const { build, healthCheck, testing, coverage, artifacts } = buildReport;

    let report = `# Build & Deployment Report: ${build.number}

**Generated:** ${new Date(buildReport.generatedAt).toLocaleString()}  
**Build ID:** ${build.id}  
**Build URL:** [View in Azure DevOps](${build.buildUrl})

## 📋 Build Information

- **Build Number:** ${build.number}
- **Build ID:** ${build.id}
- **Status:** ${build.status}
- **Result:** ${build.result}
- **Start Time:** ${build.startTime}
- **Finish Time:** ${build.finishTime}
- **Duration:** ${build.duration}
- **Source Branch:** ${build.sourceBranch}
- **Requested By:** ${build.requestedBy}
- **Trigger:** ${build.triggerInfo}
- **Source Commit:** ${build.sourceCommit}

## 🏥 Health Check Results

### Code Quality & Security
- **Security Audit:** ${healthCheck.securityAudit}
- **Environment Validation:** ${healthCheck.environmentCheck}
- **Code Formatting (Prettier):** ${healthCheck.prettier}
- **Linting (ESLint):** ${healthCheck.eslint}
- **Type Checking (TypeScript):** ${healthCheck.typescript}
- **Build Status:** ${healthCheck.buildSuccess}

## 🧪 Test Results
`;

    if (testing.tests !== "No test results found") {
      report += `
- **Test Files:** ${testing.testFiles}
- **Tests:** ${testing.tests}
- **Duration:** ${testing.duration}

### Code Coverage

- **Statements:** ${coverage.statements}
- **Branches:** ${coverage.branches}
- **Functions:** ${coverage.functions}
- **Lines:** ${coverage.lines}
`;
    } else {
      report += `
- No test results available in this build
`;
    }

    report += `
## 📦 Build Artifacts

`;

    if (artifacts.length > 0) {
      artifacts.forEach((artifact) => {
        report += `- **${artifact.name}** (${artifact.type})`;
        if (artifact.size) {
          report += ` - ${artifact.size}`;
        }
        report += `\n`;
      });
    } else {
      report += `- No artifacts found\n`;
    }

    report += `
## 📊 Build Quality Assessment

### ✅ **Passed Checks**
`;

    // Add passed checks
    const checks = [
      { name: "Security Audit", status: healthCheck.securityAudit },
      { name: "Environment Check", status: healthCheck.environmentCheck },
      { name: "Code Formatting", status: healthCheck.prettier },
      { name: "Linting", status: healthCheck.eslint },
      { name: "Type Checking", status: healthCheck.typescript },
      { name: "Build", status: healthCheck.buildSuccess },
    ];

    const passedChecks = checks.filter((check) => check.status.includes("✅"));
    const failedChecks = checks.filter((check) => check.status.includes("❌"));
    const warningChecks = checks.filter((check) => check.status.includes("⚠️"));

    passedChecks.forEach((check) => {
      report += `- ${check.name}: ${check.status}\n`;
    });

    if (warningChecks.length > 0) {
      report += `
### ⚠️ **Warnings**
`;
      warningChecks.forEach((check) => {
        report += `- ${check.name}: ${check.status}\n`;
      });
    }

    if (failedChecks.length > 0) {
      report += `
### ❌ **Failed Checks**
`;
      failedChecks.forEach((check) => {
        report += `- ${check.name}: ${check.status}\n`;
      });
    }

    report += `
## 🚀 Deployment Readiness

**Overall Status:** ${
      build.result === "succeeded" && failedChecks.length === 0
        ? "✅ Ready for Deployment"
        : "⚠️ Review Required"
    }

### Pre-Deployment Checklist
- [ ] All health checks passed
- [ ] Test coverage meets requirements
- [ ] No security vulnerabilities found
- [ ] Code quality standards met
- [ ] Build artifacts generated successfully
- [ ] Release notes prepared
- [ ] Deployment plan reviewed

## 🔗 Additional Resources

- **Azure DevOps Build:** [Build ${build.number}](${build.buildUrl})
- **Build Logs:** [View Logs](${build.buildUrl}&view=logs)
- **Test Results:** [View Tests](${
      build.buildUrl
    }&view=ms.vss-test-web.build-test-results-tab)

---
*Report generated on ${new Date(
      buildReport.generatedAt
    ).toLocaleString()} by Azure Report CLI*
`;

    return report;
  }
}
