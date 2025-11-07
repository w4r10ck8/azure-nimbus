# Azure Nimbus CLI ⚡

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                  │
│   █████╗ ███████╗██╗   ██╗██████╗ ███████╗    ███╗   ██╗██╗███╗   ███╗██████╗ ██╗   ██╗███████╗  │
│  ██╔══██╗╚══███╔╝██║   ██║██╔══██╗██╔════╝    ████╗  ██║██║████╗ ████║██╔══██╗██║   ██║██╔════╝  │
│  ███████║  ███╔╝ ██║   ██║██████╔╝█████╗      ██╔██╗ ██║██║██╔████╔██║██████╔╝██║   ██║███████╗  │
│  ██╔══██║ ███╔╝  ██║   ██║██╔══██╗██╔══╝      ██║╚██╗██║██║██║╚██╔╝██║██╔══██╗██║   ██║╚════██║  │
│  ██║  ██║███████╗╚██████╔╝██║  ██║███████╗    ██║ ╚████║██║██║ ╚═╝ ██║██████╔╝╚██████╔╝███████║  │
│  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═══╝╚═╝╚═╝     ╚═╝╚═════╝  ╚═════╝ ╚══════╝  │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                developed by w4r10ck
```

A powerful, magical command-line interface for Azure DevOps reporting and Azure resource management. Generate comprehensive build and release reports, monitor Azure resources, and manage your cloud infrastructure with elegant CLI magic! ✨

## 🚀 Zero Setup Required

**No environment configuration needed!** Just run `az login` and you're ready to go! 🎯

## 🌟 Features

### 📊 **Release & Build Reports**

#### 🏢 **UAT Release Reports**

- **📋 Release Summary**: Complete release information with deployment path tracking
- **🌍 Environment Status & Approvals**: Combined view with approval tables showing:
  - Pre-deployment and post-deployment approvals
  - Approver names, status (✅ approved, ⏳ pending, ❌ rejected), and timestamps
  - Status emojis for quick visual feedback
- **🎯 Target Branch**: Formatted as `branch-name` for easy identification
- **📦 Associated Build Details**: Linked build information with health checks
- **📝 Template Sections**: Ready-to-fill sections for stories, defects, and testing notes

#### 🚀 **Dev Release Reports**

- **📊 Comprehensive Build Analysis**: Detailed JSON and Markdown reports from Azure DevOps builds
- **🏥 Health Check Analysis**: Extract security audits, linting results, TypeScript checks, and build status
- **🧪 Test Results & Coverage**: Parse test execution results, coverage percentages, and performance metrics
- **📦 Build Artifacts**: List and analyze build artifacts and deployment packages
- **⏱️ Performance Metrics**: Track build duration, test execution time, and deployment statistics
- **📝 Source Branch**: Formatted as `branch-name` matching the target branch style

### ☁️ **Azure Resource Management**

- **🔍 Subscription Explorer**: List and manage Azure subscriptions
- **🏗️ Resource Discovery**: Browse Azure resources across subscriptions
- **🏥 Health Monitoring**: Check Azure service connectivity and authentication status
- **🔐 Authentication Management**: Seamless Azure CLI integration and credential management

### 🎨 **Beautiful User Experience**

- **🎭 Interactive Dashboard**: Intuitive menu system with breadcrumb navigation
- **📊 Progress Tracking**: Real-time progress bars with timing information for long operations
- **⚡ Performance Timers**: See exactly how long each operation takes
- **🌈 Rich CLI Output**: Colorful, well-formatted output with emojis and visual indicators
- **🧹 Report Management**: Clean up previous reports while preserving important files
- **❓ Smart Confirmations**: Return to appropriate menus with user control

### 🛠️ **Developer Experience**

- **⚡ Built with Bun**: Lightning-fast JavaScript runtime for optimal performance
- **📘 TypeScript**: Full type safety and excellent developer experience
- **🔄 Hot Reload**: Development mode with instant code updates
- **📁 Clean Architecture**: Modular, maintainable codebase with clear separation of concerns

## 🎯 Quick Start

### ⚡ Zero Configuration Setup

**No environment variables or complex setup required!** Azure Nimbus CLI works out of the box with just Azure CLI authentication.

### Prerequisites

- **[Bun](https://bun.sh/)** - Modern JavaScript runtime (primary)
- **[Node.js 18+](https://nodejs.org/)** - Alternative runtime (if Bun unavailable)
- **[Azure CLI](https://docs.microsoft.com/en-us/cli/azure/)** - For Azure authentication (**required**)

### Installation & First Run

```bash
# Clone the repository
git clone https://github.com/w4r10ck8/azure-nimbus.git
cd azure-nimbus

# Install dependencies
bun install

# Login to Azure (ONLY requirement)
az login --allow-no-subscriptions

# Start the magical experience
bun start
```

**That's it!** ✨ The CLI automatically builds and launches with a beautiful interactive dashboard.

### Alternative Runtime (Node.js)

If Bun is not available, you can use Node.js:

```bash
# Install dependencies with npm
npm install

# Start with Node.js
npm start
```

## 🎮 Usage

### 🎭 Interactive Mode (Recommended)

```bash
bun start
```

This launches the beautiful interactive dashboard with three main sections:

#### 📊 **Reports Menu**

Generate comprehensive reports for your Azure DevOps projects:

- **🚀 Dev Release Report**:

  - Enter build number (e.g., `20251013.1`) or build ID (e.g., `156973`)
  - Watch real-time progress with timing information
  - Get both JSON and Markdown reports with health checks, test results, and artifacts
  - Includes formatted source branch as `branch-name`

- **🏢 UAT Release Report**:

  - Enter release number (e.g., `Release-490`)
  - Generate comprehensive UAT deployment reports
  - Environment status with approval tracking tables
  - Pre/post-deployment approvals with status emojis
  - Template sections for stories, defects, and testing
  - Formatted target branch as `branch-name`

- **🧹 Clean Up Previous Reports**:
  - Review all generated reports before deletion
  - Safe cleanup that preserves `.gitkeep` files
  - Confirmation prompts for safety

#### ☁️ **Azure Settings Menu**

Manage your Azure environment and resources:

- **🏥 Health Check**: Test Azure CLI authentication and connectivity
- **📋 List Subscriptions**: View all available Azure subscriptions
- **🏗️ List Resources**: Browse resources in specific subscriptions
- **🔐 Azure Login**: Re-authenticate with Azure CLI

#### 🧭 **Navigation Features**

- **Breadcrumb Navigation**: Always know where you are (`🧭 Home › Reports › UAT Release Report`)
- **Smart Returns**: Choose to return to the current menu or main dashboard after operations
- **Progress Tracking**: Real-time progress bars with step-by-step timing
- **Error Handling**: Graceful error messages with navigation options

### 📊 Sample Report Generation Workflow

#### UAT Release Report Example

```bash
# 1. Start the CLI
bun start

# 2. Navigate: Home → Reports → UAT Release Report
# 3. Enter release number: Release-490
# 4. Watch progress:
#    ⏳ Authenticating with Azure DevOps...
#    ⏳ Fetching release information...
#    ⏳ Getting environment details...
#    ⏳ Processing approval data...
#    ⏳ Generating comprehensive report...

# 5. Get output:
# ✅ UAT Report for Release-490 generated!
# 📄 build-report-Release-490-2025-10-17T03-39-15.json
# 📄 build-report-Release-490-2025-10-17T03-39-15.md
# 📍 Location: /output/
```

#### Sample UAT Report Content

The generated Markdown report includes:

```markdown
## 🌍 Environment Status & Approvals

### MY.DEV

- **Status:** ✅ succeeded

| Approval Type   | Approver | Status      | Approval Time        |
| --------------- | -------- | ----------- | -------------------- |
| Pre-deployment  | ITEX-JP  | ✅ approved | 17/10/2025, 09:44:28 |
| Post-deployment | Unknown  | ✅ approved | 17/10/2025, 09:54:00 |

### MY.UAT

- **Status:** ⏳ inProgress

| Approval Type   | Approver | Status      | Approval Time        |
| --------------- | -------- | ----------- | -------------------- |
| Pre-deployment  | ITEX-JP  | ✅ approved | 17/10/2025, 10:21:28 |
| Post-deployment | Pending  | -           | -                    |
```

### 🔧 Development Mode

```bash
# Development with hot reload
bun run dev

# Watch for changes and auto-restart
# Perfect for developing new features
```

## 🏗️ Project Structure

```text
azure-nimbus/
├── 📁 src/
│   ├── 📄 index.ts                     # CLI entry point with command definitions
│   ├── 📁 managers/
│   │   ├── 📄 dashboard-manager.ts      # Interactive dashboard orchestration
│   │   └── 📄 index.ts                  # Manager exports
│   ├── 📁 services/
│   │   ├── 📄 azure-service.ts          # Azure SDK integration
│   │   ├── 📄 azure-devops-service.ts   # Azure DevOps API wrapper
│   │   └── 📄 index.ts                  # Service exports
│   └── 📁 utils/
│       ├── 📁 azure/                    # Azure-specific operations
│       │   └── 📄 operations.ts         # Health checks, resource ops
│       ├── 📁 core/                     # Core utilities
│       │   ├── 📄 formatter.ts          # Output formatting
│       │   ├── 📄 logger.ts             # Logging utilities
│       │   └── 📄 progress.ts           # Progress bars & timers
│       ├── 📁 reports/                  # Report generation
│       │   └── 📄 operations.ts         # Build reports, cleanup
│       ├── 📁 ui/                       # User interface
│       │   └── 📄 menu-system.ts        # Menus, navigation, display
│       └── 📄 index.ts                  # Utility exports
├── 📁 output/                           # Generated reports (git-ignored)
├── 📁 dist/                             # Compiled JavaScript
└── 📄 package.json                      # Dependencies and scripts
```

## 🔧 Development

### Available Scripts

```bash
# Development with hot reload
bun run dev

# Build the project
bun run build

# Start (auto-builds then runs)
bun start

# Clean build directory
bun run clean
```

### Key Development Features

- **🔄 Auto-Build**: `bun start` automatically builds latest code
- **⚡ Hot Reload**: `bun run dev` for instant development feedback
- **📘 TypeScript**: Full type safety and IntelliSense support
- **🎨 Kebab-Case**: Consistent file naming convention
- **🏗️ Modular Architecture**: Clean separation of concerns

## 🔐 Authentication - Zero Configuration Required

Azure Nimbus CLI uses **Azure Default Credential** chain for seamless authentication. **No environment variables or configuration files needed!**

### 🎯 Simple Setup (Only Required Step)

```bash
# Login with Azure CLI (this is all you need!)
az login --allow-no-subscriptions
```

**That's it!** The CLI automatically handles authentication through Azure CLI.

### 🔄 Authentication Flow

The CLI automatically tries authentication methods in this order:

1. **Azure CLI** (✅ recommended - what you set up above)
2. **Environment Variables** (if configured by your organization)
3. **Managed Identity** (if running on Azure infrastructure)
4. **VS Code Azure Extension** (if available)
5. **Interactive Browser** (fallback option)

### 🔍 Verify Authentication

Use the built-in health check to verify your authentication:

```bash
# Start the CLI
bun start

# Navigate: Home → Azure Settings → Health Check
# ✅ Tests your Azure CLI authentication
# ✅ Verifies Azure DevOps connectivity
# ✅ Shows subscription access
```

### 🔧 Troubleshooting Authentication

If you encounter authentication issues:

```bash
# Re-login to Azure CLI
az login --allow-no-subscriptions

# Clear Azure CLI cache (if needed)
az account clear

# Then login again
az login --allow-no-subscriptions
```

### 🏢 Enterprise Environments

For enterprise environments with specific authentication requirements:

- **Conditional Access**: Azure CLI handles MFA and conditional access policies automatically
- **Service Principals**: Can be configured through Azure CLI or environment variables
- **Managed Identity**: Automatically detected when running on Azure resources
- **Private Clouds**: Supported through Azure CLI configuration

No additional configuration needed in Azure Nimbus CLI! 🎉

## 📊 Report Features

### 🏢 UAT Release Report Contents

- **🚀 Release Summary**: Release number, associated build, target branch (`branch-name`), created by, deployment path
- **🌍 Environment Status & Approvals**: Combined table view with:
  - Environment status (✅ succeeded, ⏳ inProgress, ❌ failed)
  - Pre-deployment approvals with approver, status, and timestamp
  - Post-deployment approvals with approver, status, and timestamp
  - Status emojis (✅ approved, ⏳ pending, ❌ rejected) for quick visual feedback
  - Smart pending handling (no approver/time shown for pending approvals)
- **📝 Template Sections**: Ready-to-fill sections for:
  - Stories and requirements
  - Defects fixed
  - Other changes and notes
  - Post-deployment defects
  - Testing information and results
  - Ad-hoc testing details

### 🚀 Dev Release (Build) Report Contents

- **📋 Build Information**: ID, number, status, duration, source branch (`branch-name`), commit details
- **🏥 Health Checks**: Security audits, environment validation, code quality checks
- **🧪 Test Results**: Test files, execution count, duration, pass/fail status with detailed breakdown
- **📈 Code Coverage**: Statement, branch, function, and line coverage percentages
- **📦 Artifacts**: Build outputs, packages, and deployment assets with sizes
- **🔗 Direct Links**: Azure DevOps build pages, test results, and logs

### 📊 Report Formats & Organization

- **📄 JSON Format**: Machine-readable structured data perfect for automation and integration
- **📝 Markdown Format**: Human-readable reports with beautiful formatting, tables, and links
- **📁 Organized Output**: Time-stamped files in git-ignored `output/` directory
- **🔗 Clickable Links**: Direct navigation to Azure DevOps resources
- **📅 Timestamps**: All reports include generation time and date information

### 🎨 Visual Features

- **📋 Professional Tables**: Clean approval tables with proper alignment
- **🎨 Status Emojis**: Visual indicators for quick status recognition
- **📝 Formatted Code**: Branch names and technical details properly formatted
- **🔗 Rich Links**: Clickable links to Azure DevOps builds, releases, and test results
- **📊 Progress Tracking**: Real-time generation progress with timing information

## 🎨 UI Features

### Visual Elements

- **🎭 ASCII Art Header**: Beautiful "Azure Nimbus" branding
- **🧭 Breadcrumb Navigation**: Always know where you are
- **📊 Progress Bars**: Real-time progress with timing for multi-step operations
- **⏱️ Performance Timers**: See operation duration in real-time
- **🌈 Color Coding**: Status indicators, warnings, errors, and success messages
- **📱 Responsive Design**: Works beautifully in any terminal size

### Interactive Features

- **🎮 Menu Navigation**: Arrow keys, enter to select
- **❓ Confirmation Prompts**: Safety checks for destructive operations
- **📝 Input Validation**: Helpful error messages and guidance
- **🔄 Return Navigation**: Easy navigation back to previous menus

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Authentication Problems

```bash
# Problem: "Authentication failed" or "Access denied"
# Solution: Re-authenticate with Azure CLI
az login --allow-no-subscriptions

# Problem: "No subscriptions found"
# Solution: Verify account permissions
az account list
```

#### Build/Release Not Found

```bash
# Problem: "Build number not found"
# Solution: Verify build number format (YYYYMMDD.X) or use build ID
# Example: 20251017.1 or 156973

# Problem: "Release not found"
# Solution: Check release number format
# Example: Release-490, not just 490
```

#### Performance Issues

```bash
# Problem: Slow report generation
# Solution: Check Azure DevOps API connectivity
# The CLI includes progress tracking to show where delays occur

# Problem: Infinite loops during generation
# Solution: Debug logging has been optimized - restart the CLI if needed
```

#### Missing Data in Reports

```bash
# Problem: Missing approval data
# Solution: The CLI now fetches all approval statuses (approved, pending, rejected)
# Approved approvals are prioritized over latest chronological approvals

# Problem: "Unknown" approver names
# Solution: This indicates API limitations - manual correction may be needed
```

### Debug Mode

For development and troubleshooting:

```bash
# Development mode with detailed logging
bun run dev

# Build and run with error details
bun run build && bun start
```

### Getting Help

1. **📋 Check Prerequisites**: Ensure Azure CLI is installed and authenticated
2. **🏥 Run Health Check**: Use built-in Azure Settings → Health Check
3. **🔄 Restart CLI**: Exit and restart if experiencing issues
4. **📝 Check Output**: Review generated logs in the terminal
5. **🆘 Create Issue**: Report bugs on GitHub with detailed error messages

## 🤝 Contributing

We welcome contributions to Azure Nimbus CLI! Here's how to get started:

### 🚀 Quick Start for Contributors

1. **🍴 Fork** the repository

2. **📥 Clone** your fork and install dependencies:

```bash
git clone https://github.com/w4r10ck8/azure-nimbus
cd azure-nimbus
bun install
```

3. **🔐 Authenticate:**

```bash
az login --allow-no-subscriptions
```

4. **🧪 Test** existing functionality:

```bash
bun start
```

5. **🌿 Create** a feature branch:

```bash
git checkout -b feature/amazing-feature
```

6. **💻 Make** your changes with proper TypeScript types

7. **✅ Test** thoroughly: Generate reports and verify functionality

8. **📝 Commit** your changes:

```bash
git commit -m 'Add amazing feature'
```

9. **🚀 Push** to your branch:

```bash
git push origin feature/amazing-feature
```

10. **🎯 Open** a Pull Request with detailed description

## 📜 License

MIT License - feel free to use this magical CLI in your own projects! ✨

## 🏆 Credits

**Developed by w4r10ck** - Bringing magic to Azure DevOps reporting! 🧙‍♂️⚡

---

_Azure Nimbus CLI - Where cloud magic meets developer productivity!_ ☁️✨
