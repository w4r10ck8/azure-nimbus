# Build & Deployment Report: {{BUILD_NUMBER}}

**Generated:** {{GENERATED_DATE}}  
**Build ID:** {{BUILD_ID}}  
**Build URL:** [View in Azure DevOps]({{BUILD_URL}})

## 📋 Build Information

- **Build Number:** {{BUILD_NUMBER}}
- **Build ID:** {{BUILD_ID}}
- **Status:** {{BUILD_STATUS}}
- **Result:** {{BUILD_RESULT}}
- **Start Time:** {{BUILD_START_TIME}}
- **Finish Time:** {{BUILD_FINISH_TIME}}
- **Duration:** {{BUILD_DURATION}}
- **Source Branch:** `{{BUILD_SOURCE_BRANCH}}`
- **Requested By:** {{BUILD_REQUESTED_BY}}
- **Trigger:** {{BUILD_TRIGGER_INFO}}
- **Trigger PR:** {{BUILD_TRIGGER_PR}}
- **Source Commit:** {{BUILD_SOURCE_COMMIT}}

## 🏥 Health Check Results

### Code Quality & Security

- **Security Audit:** {{HEALTH_CHECK_SECURITY_AUDIT}}
- **Environment Validation:** {{HEALTH_CHECK_ENVIRONMENT}}
- **Code Formatting (Prettier):** {{HEALTH_CHECK_PRETTIER}}
- **Linting (ESLint):** {{HEALTH_CHECK_ESLINT}}
- **Type Checking (TypeScript):** {{HEALTH_CHECK_TYPESCRIPT}}
- **Build Status:** {{HEALTH_CHECK_BUILD_SUCCESS}}

## 🧪 Test Results

{{TEST_RESULTS_SECTION}}

## 📦 Build Artifacts

{{BUILD_ARTIFACTS_SECTION}}

## 🔗 Additional Resources

- **Azure DevOps Build:** [Build {{BUILD_NUMBER}}]({{BUILD_URL}})
- **Build Logs:** [View Logs]({{BUILD_URL}}&view=logs)
- **Test Results:** [View Tests]({{BUILD_URL}}&view=ms.vss-test-web.build-test-results-tab)

---

Report generated on {{GENERATED_DATE}} by [Azure Nimbus CLI](https://github.com/w4r10ck8/azure-nimbus)
