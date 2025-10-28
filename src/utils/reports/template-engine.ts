import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type {
  UATReleaseReport,
  BuildReport,
  EnvironmentInfo,
  ApprovalInfo,
  BuildArtifact,
} from "../../services/azure-devops-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Template engine for generating reports from template files
 */
export class TemplateEngine {
  private static readonly TEMPLATES_DIR = join(
    process.cwd(),
    "src/templates/reports"
  );

  /**
   * Load template content from file
   */
  private static loadTemplate(templateName: string): string {
    const templatePath = join(this.TEMPLATES_DIR, templateName);
    try {
      return readFileSync(templatePath, "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to load template ${templateName}: ${
          error instanceof Error ? error.message : "Unknown error"
        }
Full path attempted: ${templatePath}
Templates directory: ${this.TEMPLATES_DIR}
Working directory: ${process.cwd()}`
      );
    }
  }

  /**
   * Replace placeholders in template with actual values
   */
  private static replacePlaceholders(
    template: string,
    values: Record<string, string>
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, "g"), value || "N/A");
    }

    return result;
  }

  /**
   * Generate environment sections for UAT reports
   */
  private static generateEnvironmentSections(
    environments: EnvironmentInfo[],
    approvals: ApprovalInfo[]
  ): string {
    // Only include MY.DEV and MY.UAT in the environment section
    const envMyDev = environments.find(
      (e: EnvironmentInfo) =>
        e.name.toLowerCase().includes("my.dev") ||
        e.name.toLowerCase().includes("mydev")
    );
    const envMyUat = environments.find(
      (e: EnvironmentInfo) =>
        e.name.toLowerCase().includes("uat") &&
        !e.name.toLowerCase().includes("stage")
    );

    // Keep only MY.DEV/DEV and MY.UAT approvals
    const relevantApprovals = approvals.filter((a) => {
      const env = a.environmentName?.toUpperCase();
      return (
        env === "MY.DEV" || env === "DEV" || env === "MY.UAT" || env === "UAT"
      );
    });

    // Normalize environment names and group
    const approvalsByEnv = new Map<string, ApprovalInfo[]>();
    relevantApprovals.forEach((approval) => {
      let envName = approval.environmentName?.toUpperCase() || "UNKNOWN";
      if (envName === "DEV") envName = "MY.DEV";
      if (envName === "UAT") envName = "MY.UAT";
      if (!approvalsByEnv.has(envName)) approvalsByEnv.set(envName, []);
      approvalsByEnv.get(envName)!.push(approval);
    });

    const generateEnvSection = (
      env: EnvironmentInfo | undefined,
      displayName: string
    ): string => {
      // Determine deployment status with clearer messaging
      let deploymentStatus = "Not deployed";
      let statusIcon = "⚪";

      if (env?.status === "succeeded") {
        deploymentStatus = "Successfully deployed";
        statusIcon = "✅";
      } else if (env?.status === "failed") {
        deploymentStatus = "Deployment failed";
        statusIcon = "❌";
      } else if (env?.status === "canceled" || env?.status === "cancelled") {
        deploymentStatus = "Deployment canceled";
        statusIcon = "🚫";
      } else if (env?.status === "inProgress" || env?.status === "running") {
        deploymentStatus = "Deployment in progress";
        statusIcon = "⏳";
      } else if (env?.status) {
        deploymentStatus = env.status;
        statusIcon = "⏳";
      }

      const isProduction =
        displayName.includes("Production") || displayName.includes("FWC");

      let section = `### ${displayName}

- **Status:** ${statusIcon} ${deploymentStatus}

| Approval Type | Approver | Status | Approval Time |
|---------------|----------|--------|---------------|`;

      const envApprovals = approvalsByEnv.get(displayName) || [];
      const preApprovals = envApprovals.filter(
        (a) => a.approvalType === "preDeploy"
      );
      const postApprovals = envApprovals.filter(
        (a) => a.approvalType === "postDeploy"
      );

      // Pre-deployment approval
      if (preApprovals.length === 0) {
        section += `
| Pre-deployment | Pending | - | - |`;
      } else {
        // Find approved approvals first, then fall back to latest if none approved
        const approvedApprovals = preApprovals.filter(
          (a) => a.status === "approved"
        );
        let selectedApproval;

        if (approvedApprovals.length > 0) {
          selectedApproval = approvedApprovals.sort(
            (a, b) =>
              new Date(a.modifiedOn).getTime() -
              new Date(b.modifiedOn).getTime()
          )[approvedApprovals.length - 1];
        } else {
          selectedApproval = preApprovals.sort(
            (a, b) =>
              new Date(a.modifiedOn).getTime() -
              new Date(b.modifiedOn).getTime()
          )[preApprovals.length - 1];
        }

        if (selectedApproval.status === "pending") {
          section += `
| Pre-deployment | Pending | ⏳ pending | - |`;
        } else {
          const approvalTime = new Date(
            selectedApproval.modifiedOn
          ).toLocaleString("en-GB");
          const statusEmoji =
            selectedApproval.status === "approved"
              ? "✅"
              : selectedApproval.status === "rejected"
              ? "❌"
              : "⚪";

          section += `
| Pre-deployment | ${selectedApproval.approver} | ${statusEmoji} ${selectedApproval.status} | ${approvalTime} |`;
        }
      }

      // Post-deployment approval
      if (postApprovals.length === 0) {
        section += `
| Post-deployment | Pending | - | - |`;
      } else {
        // For post-deployment, prioritize canceled/rejected over approved to show who canceled
        const canceledPostApprovals = postApprovals.filter(
          (a) =>
            a.status === "canceled" ||
            a.status === "cancelled" ||
            a.status === "rejected"
        );
        const approvedPostApprovals = postApprovals.filter(
          (a) => a.status === "approved"
        );
        let selectedPostApproval;

        if (canceledPostApprovals.length > 0) {
          // Show who canceled - pick the latest cancellation
          selectedPostApproval = canceledPostApprovals.sort(
            (a, b) =>
              new Date(a.modifiedOn).getTime() -
              new Date(b.modifiedOn).getTime()
          )[canceledPostApprovals.length - 1];
        } else if (approvedPostApprovals.length > 0) {
          selectedPostApproval = approvedPostApprovals.sort(
            (a, b) =>
              new Date(a.modifiedOn).getTime() -
              new Date(b.modifiedOn).getTime()
          )[approvedPostApprovals.length - 1];
        } else {
          selectedPostApproval = postApprovals.sort(
            (a, b) =>
              new Date(a.modifiedOn).getTime() -
              new Date(b.modifiedOn).getTime()
          )[postApprovals.length - 1];
        }

        if (selectedPostApproval.status === "pending") {
          section += `
| Post-deployment | Pending | ⏳ pending | - |`;
        } else {
          const postApprovalTime = new Date(
            selectedPostApproval.modifiedOn
          ).toLocaleString("en-GB");
          const postStatusEmoji =
            selectedPostApproval.status === "approved"
              ? "✅"
              : selectedPostApproval.status === "rejected"
              ? "❌"
              : "⚪";

          section += `
| Post-deployment | ${selectedPostApproval.approver} | ${postStatusEmoji} ${selectedPostApproval.status} | ${postApprovalTime} |`;
        }
      }

      section += `

`;
      return section;
    };

    return (
      generateEnvSection(envMyDev, "MY.DEV") +
      generateEnvSection(envMyUat, "MY.UAT")
    );
  }

  /**
   * Generate test results section
   */
  private static generateTestResultsSection(
    testing: { testFiles: string; tests: string; duration: string },
    coverage: {
      statements: string;
      branches: string;
      functions: string;
      lines: string;
    }
  ): string {
    if (testing.tests !== "No test results found") {
      return `
- **Test Files:** ${testing.testFiles}
- **Tests:** ${testing.tests}
- **Duration:** ${testing.duration}

### Code Coverage

- **Statements:** ${coverage.statements}
- **Branches:** ${coverage.branches}
- **Functions:** ${coverage.functions}
- **Lines:** ${coverage.lines}`;
    } else {
      return `
- No test results available in this build`;
    }
  }

  /**
   * Generate build artifacts section
   */
  private static generateBuildArtifactsSection(
    artifacts: BuildArtifact[]
  ): string {
    if (artifacts.length > 0) {
      return (
        artifacts
          .map((artifact: BuildArtifact) => {
            let line = `- **${artifact.name}** (${artifact.type})`;
            if (artifact.size) {
              line += ` - ${artifact.size}`;
            }
            return line;
          })
          .join("\n") + "\n"
      );
    } else {
      return "- No artifacts found\n";
    }
  }

  /**
   * Generate UAT release report from template
   */
  static generateUATReleaseReport(uatReport: UATReleaseReport): string {
    const template = this.loadTemplate("uat-release-report.template.md");
    const { release, build, environments, approvals } = uatReport;

    // Find UAT environment deployment date or use release creation date
    const uatEnv = environments.find((env: EnvironmentInfo) =>
      env.name.toLowerCase().includes("uat")
    );
    const deploymentDate =
      uatEnv?.deploymentCompletedTime &&
      uatEnv.deploymentCompletedTime !== "N/A"
        ? new Date(uatEnv.deploymentCompletedTime).toLocaleDateString("en-GB")
        : new Date(release.createdOn).toLocaleDateString("en-GB");

    // Determine a sensible target branch (prefer build.sourceBranch, fallback to release.targetBranch)
    const rawBranch =
      (build?.sourceBranch && build.sourceBranch) ||
      (release?.targetBranch && release.targetBranch) ||
      "";
    const targetBranch = rawBranch
      ? rawBranch.replace(/^refs\/heads\//, "")
      : "Unknown";

    const values = {
      RELEASE_NAME: release.name,
      DEPLOYMENT_DATE: deploymentDate,
      BUILD_NUMBER: build.number,
      TARGET_BRANCH: targetBranch,
      CREATED_BY: release.createdBy,
      CREATED_DATE: new Date(release.createdOn).toLocaleDateString("en-GB"),
      ENVIRONMENT_SECTIONS: this.generateEnvironmentSections(
        environments,
        approvals
      ),
      GENERATED_DATE: new Date(uatReport.generatedAt).toLocaleString(),
      BUILD_ID: build.id,
      BUILD_URL: build.buildUrl,
      BUILD_STATUS: build.status,
      BUILD_RESULT: build.result,
      BUILD_START_TIME: build.startTime,
      BUILD_FINISH_TIME: build.finishTime,
      BUILD_DURATION: build.duration,
      BUILD_SOURCE_BRANCH: build.sourceBranch,
      BUILD_REQUESTED_BY: build.requestedBy,
      BUILD_TRIGGER_INFO: build.triggerInfo,
      BUILD_TRIGGER_PR: build.triggerPR,
      BUILD_SOURCE_COMMIT: build.sourceCommit,
      HEALTH_CHECK_SECURITY_AUDIT: uatReport.healthCheck.securityAudit,
      HEALTH_CHECK_ENVIRONMENT: uatReport.healthCheck.environmentCheck,
      HEALTH_CHECK_PRETTIER: uatReport.healthCheck.prettier,
      HEALTH_CHECK_ESLINT: uatReport.healthCheck.eslint,
      HEALTH_CHECK_TYPESCRIPT: uatReport.healthCheck.typescript,
      HEALTH_CHECK_BUILD_SUCCESS: uatReport.healthCheck.buildSuccess,
      TEST_RESULTS_SECTION: this.generateTestResultsSection(
        uatReport.testing,
        uatReport.coverage
      ),
      BUILD_ARTIFACTS_SECTION: this.generateBuildArtifactsSection(
        uatReport.artifacts
      ),
      RELEASE_URL: `https://dev.azure.com/fwcdev/Customer%20Services%20Platform/_release?releaseId=${release.id}`,
    };

    return this.replacePlaceholders(template, values);
  }

  /**
   * Generate dev release (build) report from template
   */
  static generateDevReleaseReport(buildReport: BuildReport): string {
    const template = this.loadTemplate("dev-release-report.template.md");
    const { build } = buildReport;

    const values = {
      BUILD_NUMBER: build.number,
      GENERATED_DATE: new Date(buildReport.generatedAt).toLocaleString(),
      BUILD_ID: build.id,
      BUILD_URL: build.buildUrl,
      BUILD_STATUS: build.status,
      BUILD_RESULT: build.result,
      BUILD_START_TIME: build.startTime,
      BUILD_FINISH_TIME: build.finishTime,
      BUILD_DURATION: build.duration,
      BUILD_SOURCE_BRANCH: build.sourceBranch,
      BUILD_REQUESTED_BY: build.requestedBy,
      BUILD_TRIGGER_INFO: build.triggerInfo,
      BUILD_TRIGGER_PR: build.triggerPR,
      BUILD_SOURCE_COMMIT: build.sourceCommit,
      HEALTH_CHECK_SECURITY_AUDIT: buildReport.healthCheck.securityAudit,
      HEALTH_CHECK_ENVIRONMENT: buildReport.healthCheck.environmentCheck,
      HEALTH_CHECK_PRETTIER: buildReport.healthCheck.prettier,
      HEALTH_CHECK_ESLINT: buildReport.healthCheck.eslint,
      HEALTH_CHECK_TYPESCRIPT: buildReport.healthCheck.typescript,
      HEALTH_CHECK_BUILD_SUCCESS: buildReport.healthCheck.buildSuccess,
      TEST_RESULTS_SECTION: this.generateTestResultsSection(
        buildReport.testing,
        buildReport.coverage
      ),
      BUILD_ARTIFACTS_SECTION: this.generateBuildArtifactsSection(
        buildReport.artifacts
      ),
    };

    return this.replacePlaceholders(template, values);
  }

  /**
   * Generate production release report from template
   */
  static generateProductionReleaseReport(prodReport: UATReleaseReport): string {
    const template = this.loadTemplate("prod-release-report.template.md");
    const { release, build, environments, approvals } = prodReport;

    // Find Production environment deployment date or use release creation date
    const prodEnv = environments.find(
      (env: EnvironmentInfo) =>
        env.name.toLowerCase().includes("prod") ||
        env.name.toLowerCase().includes("production")
    );
    const deploymentDate =
      prodEnv?.deploymentCompletedTime &&
      prodEnv.deploymentCompletedTime !== "N/A"
        ? new Date(prodEnv.deploymentCompletedTime).toLocaleDateString("en-GB")
        : new Date(release.createdOn).toLocaleDateString("en-GB");

    // Find production deployment approval time
    const productionApprovals = approvals.filter((a) => {
      const env = a.environmentName?.toUpperCase();
      return (
        (env === "PRODUCTION" ||
          env === "MY.FWC" ||
          env === "MY.PRODUCTION" ||
          env === "FWC") &&
        a.approvalType === "preDeploy" &&
        a.status === "approved"
      );
    });

    const productionApprovalTime =
      productionApprovals.length > 0
        ? new Date(
            productionApprovals[productionApprovals.length - 1].modifiedOn
          ).toLocaleString("en-GB", {
            hour12: true,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "N/A";

    // Determine a sensible target branch (prefer build.sourceBranch, fallback to release.targetBranch)
    const rawBranch =
      (build?.sourceBranch && build.sourceBranch) ||
      (release?.targetBranch && release.targetBranch) ||
      "";
    const targetBranch = rawBranch
      ? rawBranch.replace(/^refs\/heads\//, "")
      : "Unknown";

    // Extract version number from branch name (e.g., "release/v2.2.0" -> "v2.2.0")
    const versionMatch = targetBranch.match(/v?\d+\.\d+\.\d+/);
    const version = versionMatch ? versionMatch[0] : "Unknown";
    const displayVersion = version.startsWith("v") ? version : `v${version}`;

    const values = {
      RELEASE_NAME: release.name,
      RELEASE_NUMBER: build.number,
      TARGET_BRANCH: targetBranch,
      VERSION: displayVersion,
      DEPLOYMENT_DATE: deploymentDate,
      DEPLOYMENT_TIME: productionApprovalTime,
      BUILD_NUMBER: build.number,
      CREATED_BY: release.createdBy,
      CREATED_DATE: new Date(release.createdOn).toLocaleDateString("en-GB"),
      ENVIRONMENT_SECTIONS: this.generateProductionEnvironmentSections(
        environments,
        approvals
      ),
      GENERATED_DATE: new Date(prodReport.generatedAt).toLocaleString(),
      BUILD_ID: build.id,
      BUILD_URL: build.buildUrl,
      BUILD_STATUS: build.status,
      BUILD_RESULT: build.result,
      BUILD_START_TIME: build.startTime,
      BUILD_FINISH_TIME: build.finishTime,
      BUILD_DURATION: build.duration,
      BUILD_SOURCE_BRANCH: build.sourceBranch,
      BUILD_REQUESTED_BY: build.requestedBy,
      BUILD_TRIGGER_INFO: build.triggerInfo,
      BUILD_TRIGGER_PR: build.triggerPR,
      BUILD_SOURCE_COMMIT: build.sourceCommit,
      HEALTH_CHECK_SECURITY_AUDIT: prodReport.healthCheck.securityAudit,
      HEALTH_CHECK_ENVIRONMENT: prodReport.healthCheck.environmentCheck,
      HEALTH_CHECK_PRETTIER: prodReport.healthCheck.prettier,
      HEALTH_CHECK_ESLINT: prodReport.healthCheck.eslint,
      HEALTH_CHECK_TYPESCRIPT: prodReport.healthCheck.typescript,
      HEALTH_CHECK_BUILD_SUCCESS: prodReport.healthCheck.buildSuccess,
      TEST_RESULTS_SECTION: this.generateTestResultsSection(
        prodReport.testing,
        prodReport.coverage
      ),
      BUILD_ARTIFACTS_SECTION: this.generateBuildArtifactsSection(
        prodReport.artifacts
      ),
      RELEASE_URL: `https://dev.azure.com/fwcdev/Customer%20Services%20Platform/_release?releaseId=${release.id}`,
    };

    return this.replacePlaceholders(template, values);
  }

  /**
   * Generate production environment sections (UAT and Production)
   */
  private static generateProductionEnvironmentSections(
    environments: EnvironmentInfo[],
    approvals: ApprovalInfo[]
  ): string {
    // For production reports, show all environments: DEV, UAT, STG, and Production
    const envDev = environments.find(
      (e: EnvironmentInfo) =>
        e.name.toLowerCase().includes("dev") &&
        !e.name.toLowerCase().includes("uat") &&
        !e.name.toLowerCase().includes("prod")
    );
    const envUAT = environments.find(
      (e: EnvironmentInfo) =>
        e.name.toLowerCase().includes("uat") &&
        !e.name.toLowerCase().includes("stage")
    );
    const envStage = environments.find(
      (e: EnvironmentInfo) =>
        e.name.toLowerCase().includes("stg") ||
        e.name.toLowerCase().includes("stage")
    );
    const envProduction = environments.find(
      (e: EnvironmentInfo) =>
        e.name.toLowerCase().includes("prod") ||
        e.name.toLowerCase().includes("production") ||
        e.name.toLowerCase().includes("fwc")
    );

    // Keep all relevant environment approvals
    const relevantApprovals = approvals.filter((a) => {
      const env = a.environmentName?.toUpperCase();
      return (
        env === "MY.DEV" ||
        env === "DEV" ||
        env === "MY.UAT" ||
        env === "UAT" ||
        env === "MY.STG" ||
        env === "STG" ||
        env === "STAGE" ||
        env === "MY.PROD" ||
        env === "PROD" ||
        env === "MY.FWC" ||
        env === "FWC" ||
        env === "PRODUCTION" ||
        env === "MY.PRODUCTION"
      );
    });

    // Normalize environment names and group
    const approvalsByEnv = new Map<string, ApprovalInfo[]>();
    relevantApprovals.forEach((approval) => {
      let envName = approval.environmentName?.toUpperCase() || "UNKNOWN";
      if (envName === "DEV") envName = "MY.DEV";
      if (envName === "UAT") envName = "MY.UAT";
      if (envName === "STG" || envName === "STAGE") envName = "MY.STG";
      if (
        envName === "PROD" ||
        envName === "PRODUCTION" ||
        envName === "FWC" ||
        envName === "MY.PRODUCTION"
      )
        envName = "MY.FWC";
      if (!approvalsByEnv.has(envName)) approvalsByEnv.set(envName, []);
      approvalsByEnv.get(envName)!.push(approval);
    });

    const generateEnvSection = (
      env: EnvironmentInfo | undefined,
      displayName: string
    ): string => {
      // Determine deployment status with improved logic
      let deploymentStatus = "Not deployed";
      let statusIcon = "⚪";

      // Check if environment has evidence of deployment (completion time indicates deployment)
      const hasDeploymentEvidence =
        env?.deploymentCompletedTime && env?.deploymentCompletedTime !== "";

      if (
        env?.status === "succeeded" ||
        (hasDeploymentEvidence && env?.status !== "failed")
      ) {
        deploymentStatus = "Successfully deployed";
        statusIcon = "✅";
      } else if (env?.status === "failed") {
        deploymentStatus = "Deployment failed";
        statusIcon = "❌";
      } else if (env?.status === "inProgress" || env?.status === "running") {
        deploymentStatus = "Deployment in progress";
        statusIcon = "⏳";
      } else if (env?.status === "notStarted") {
        // If notStarted but has deployment evidence, it's actually deployed
        if (hasDeploymentEvidence) {
          deploymentStatus = "Successfully deployed";
          statusIcon = "✅";
        } else {
          deploymentStatus = "Not started";
          statusIcon = "⏸️";
        }
      } else if (env?.status === "canceled" || env?.status === "cancelled") {
        // If canceled but has deployment evidence, show deployed
        if (hasDeploymentEvidence) {
          deploymentStatus = "Successfully deployed";
          statusIcon = "✅";
        } else {
          deploymentStatus = "Deployment canceled";
          statusIcon = "🚫";
        }
      } else if (env?.status) {
        // For any other status, check deployment evidence
        if (hasDeploymentEvidence) {
          deploymentStatus = "Successfully deployed";
          statusIcon = "✅";
        } else {
          deploymentStatus = env.status;
          statusIcon = "⏳";
        }
      }

      const isProduction =
        displayName.includes("Production") || displayName.includes("FWC");

      let section = `### ${displayName}

- **Status:** ${statusIcon} ${deploymentStatus}

| Approval Type | Approver | Status | Approval Time |
|---------------|----------|--------|---------------|`;

      const envApprovals = approvalsByEnv.get(displayName) || [];
      const preApprovals = envApprovals.filter(
        (a) => a.approvalType === "preDeploy"
      );
      const postApprovals = envApprovals.filter(
        (a) => a.approvalType === "postDeploy"
      );

      // Pre-deployment approval (permission to deploy)
      const deploymentLabel = isProduction
        ? "Deployment"
        : "Pre-deployment (Deploy Permission)";

      if (preApprovals.length === 0) {
        section += `
| ${deploymentLabel} | No approval required | ✅ automatic | - |`;
      } else {
        // Find approved approvals first, then fall back to latest if none approved
        const approvedApprovals = preApprovals.filter(
          (a) => a.status === "approved"
        );
        let selectedApproval;

        if (approvedApprovals.length > 0) {
          selectedApproval = approvedApprovals.sort(
            (a, b) =>
              new Date(a.modifiedOn).getTime() -
              new Date(b.modifiedOn).getTime()
          )[approvedApprovals.length - 1];
        } else {
          selectedApproval = preApprovals.sort(
            (a, b) =>
              new Date(a.modifiedOn).getTime() -
              new Date(b.modifiedOn).getTime()
          )[preApprovals.length - 1];
        }

        if (selectedApproval.status === "pending") {
          section += `
| ${deploymentLabel} | Pending approval | ⏳ pending | - |`;
        } else {
          const approvalTime = new Date(
            selectedApproval.modifiedOn
          ).toLocaleString("en-GB");
          const statusEmoji =
            selectedApproval.status === "approved"
              ? "✅"
              : selectedApproval.status === "rejected"
              ? "❌"
              : "⚪";

          section += `
| ${deploymentLabel} | ${selectedApproval.approver} | ${statusEmoji} ${selectedApproval.status} | ${approvalTime} |`;
        }
      }

      // Post-deployment approval (testing/validation sign-off) - Skip for production
      if (!isProduction) {
        if (postApprovals.length === 0) {
          section += `
| Post-deployment (Testing Sign-off) | Pending validation | ⏳ pending | - |`;
        } else {
          const approvedPostApprovals = postApprovals.filter(
            (a) => a.status === "approved"
          );
          let selectedPostApproval;

          if (approvedPostApprovals.length > 0) {
            selectedPostApproval = approvedPostApprovals.sort(
              (a, b) =>
                new Date(a.modifiedOn).getTime() -
                new Date(b.modifiedOn).getTime()
            )[approvedPostApprovals.length - 1];
          } else {
            selectedPostApproval = postApprovals.sort(
              (a, b) =>
                new Date(a.modifiedOn).getTime() -
                new Date(b.modifiedOn).getTime()
            )[postApprovals.length - 1];
          }

          if (selectedPostApproval.status === "pending") {
            section += `
| Post-deployment (Testing Sign-off) | ${
              selectedPostApproval.approver || "Tester"
            } | ⏳ pending | - |`;
          } else {
            const postApprovalTime = new Date(
              selectedPostApproval.modifiedOn
            ).toLocaleString("en-GB");
            const postStatusEmoji =
              selectedPostApproval.status === "approved"
                ? "✅"
                : selectedPostApproval.status === "rejected"
                ? "❌"
                : "⚪";

            section += `
| Post-deployment (Testing Sign-off) | ${selectedPostApproval.approver} | ${postStatusEmoji} ${selectedPostApproval.status} | ${postApprovalTime} |`;
          }
        }
      }

      section += `

`;
      return section;
    };

    // Custom function to handle production display name
    const generateProductionEnvSection = (
      env: EnvironmentInfo | undefined
    ): string => {
      return generateEnvSection(env, "MY.FWC").replace(
        "### MY.FWC",
        "### MY.FWC (Production)"
      );
    };

    return (
      generateEnvSection(envDev, "MY.DEV") +
      generateEnvSection(envUAT, "MY.UAT") +
      generateEnvSection(envStage, "MY.STG") +
      generateProductionEnvSection(envProduction)
    );
  }
}
