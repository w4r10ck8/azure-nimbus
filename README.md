# Azure Nimbus CLI ⚡

```
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

A powerful, magical command-line interface for Azure DevOps reporting and Azure resource management. Generate comprehensive build reports, monitor Azure resources, and manage your cloud infrastructure with elegant CLI magic! ✨

## 🌟 Features

### 🚀 **Azure DevOps Integration**

- **📊 Comprehensive Build Reports**: Generate detailed JSON and Markdown reports from Azure DevOps builds
- **🏥 Health Check Analysis**: Extract security audits, linting results, TypeScript checks, and build status
- **🧪 Test Results & Coverage**: Parse test execution results, coverage percentages, and performance metrics
- **📦 Build Artifacts**: List and analyze build artifacts and deployment packages
- **⏱️ Performance Metrics**: Track build duration, test execution time, and deployment statistics

### ☁️ **Azure Resource Management**

- **🔍 Subscription Explorer**: List and manage Azure subscriptions
- **� Resource Discovery**: Browse Azure resources across subscriptions
- **🏥 Health Monitoring**: Check Azure service connectivity and authentication status
- **🔐 Authentication Management**: Seamless Azure CLI integration and credential management

### 🎨 **Beautiful User Experience**

- **🎭 Interactive Dashboard**: Intuitive menu system with breadcrumb navigation
- **📊 Progress Tracking**: Real-time progress bars with timing information for long operations
- **⚡ Performance Timers**: See exactly how long each operation takes
- **🌈 Rich CLI Output**: Colorful, well-formatted output with emojis and visual indicators
- **🧹 Report Management**: Clean up previous reports while preserving important files

### 🛠️ **Developer Experience**

- **⚡ Built with Bun**: Lightning-fast JavaScript runtime for optimal performance
- **📘 TypeScript**: Full type safety and excellent developer experience
- **🔄 Hot Reload**: Development mode with instant code updates
- **📁 Clean Architecture**: Modular, maintainable codebase with clear separation of concerns

## 🎯 Quick Start

### Prerequisites

- **[Bun](https://bun.sh/)** - Modern JavaScript runtime
- **[Azure CLI](https://docs.microsoft.com/en-us/cli/azure/)** - For Azure authentication
- **Node.js 18+** - For Azure SDK compatibility

### Installation

```bash
# Clone the repository
git clone https://github.com/jaypancholi94/azure-report-cli.git
cd azure-report-cli

# Install dependencies
bun install

# Start the magical experience
bun start
```

That's it! The CLI will automatically build and launch. ✨

## 🎮 Usage

### Interactive Mode (Recommended)

```bash
bun start
```

This launches the beautiful interactive dashboard where you can:

- 🏥 **Azure Settings**: Test connections, manage authentication, explore resources
- 📊 **Reports**: Generate release reports, clean up previous reports
- 🧭 **Navigation**: Use breadcrumbs and intuitive menus to explore features

### Command Examples

#### Generate a Build Report

```bash
# Interactive mode will guide you through:
# 1. Enter build number (e.g., 20251013.1) or build ID
# 2. Watch real-time progress with timing
# 3. Get comprehensive JSON + Markdown reports
```

#### Clean Up Previous Reports

```bash
# From Reports menu:
# 1. Select "🧹 Clean Up Previous Reports"
# 2. Review files to be deleted
# 3. Confirm cleanup (preserves .gitkeep)
```

## 🏗️ Project Structure

```
azure-nimbus-cli/
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

## 🔐 Authentication

Azure Nimbus CLI uses **Azure Default Credential** chain:

1. **Environment Variables** (if configured)
2. **Managed Identity** (if running on Azure)
3. **Azure CLI** (recommended for development)
4. **VS Code Azure Extension**
5. **Interactive Browser** (fallback)

### Setup Authentication

```bash
# Login with Azure CLI (recommended)
az login

# For Azure DevOps (additional step)
az login --allow-no-subscriptions
```

## 📊 Report Features

### Build Report Contents

- **📋 Build Information**: ID, number, status, duration, branch, commit details
- **🏥 Health Checks**: Security audits, environment validation, code quality
- **🧪 Test Results**: Test files, execution count, duration, pass/fail status
- **📈 Code Coverage**: Statement, branch, function, and line coverage percentages
- **📦 Artifacts**: Build outputs, packages, and deployment assets
- **🔗 Links**: Direct links to Azure DevOps build pages and test results

### Report Formats

- **📄 JSON**: Machine-readable structured data for automation
- **📝 Markdown**: Human-readable reports with formatting and links
- **📁 Organized Output**: Time-stamped files in git-ignored `output/` directory

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

## 🤝 Contributing

We welcome contributions to Azure Nimbus CLI! Here's how to get started:

1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **💻 Make** your changes with proper TypeScript types
4. **✅ Test** your changes: `bun start` and verify functionality
5. **📝 Commit** your changes: `git commit -m 'Add amazing feature'`
6. **🚀 Push** to your branch: `git push origin feature/amazing-feature`
7. **🎯 Open** a Pull Request

### Development Guidelines

- **📘 TypeScript**: Use proper types and interfaces
- **🎨 Kebab-Case**: Follow the established file naming convention
- **🧪 Test**: Verify your changes work in interactive mode
- **📝 Document**: Update README if adding new features
- **🎨 Style**: Follow existing code formatting and patterns

## 📜 License

MIT License - feel free to use this magical CLI in your own projects! ✨

## 🏆 Credits

**Developed by w4r10ck** - Bringing magic to Azure DevOps reporting! 🧙‍♂️⚡

---

_Azure Nimbus CLI - Where cloud magic meets developer productivity!_ ☁️✨
