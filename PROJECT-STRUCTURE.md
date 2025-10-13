# Project Structure

The Azure Report CLI has been reorganized with a clean, modular structure using kebab-case filenames and logical folder organization.

## Directory Structure

```
src/
├── index.ts                    # Main entry point
├── managers/                   # High-level application managers
│   ├── dashboard-manager.ts    # Main dashboard and navigation logic
│   └── index.ts               # Manager exports
├── services/                   # External service integrations
│   └── azureService.ts        # Azure SDK wrapper
└── utils/                     # Utility modules organized by domain
    ├── azure/                 # Azure-specific operations
    │   └── operations.ts      # Azure health checks, login, resource operations
    ├── core/                  # Core utilities
    │   ├── formatter.ts       # Output formatting utilities
    │   ├── logger.ts          # Logging utilities
    │   └── progress.ts        # Progress bars and spinners
    ├── ui/                    # User interface utilities
    │   └── menu-system.ts     # Combined menu display, navigation, and choices
    └── index.ts               # Utility exports
```

## Key Improvements

### 1. **Kebab-Case Naming**

- All files now use kebab-case (`dashboard-manager.ts` instead of `dashboardManager.ts`)
- Consistent with modern web development standards
- Better readability and consistency

### 2. **Domain-Organized Folders**

- **`managers/`**: High-level orchestration and flow control
- **`utils/azure/`**: All Azure-specific operations
- **`utils/ui/`**: User interface and menu systems
- **`utils/core/`**: Core utilities (logging, progress, formatting)
- **`services/`**: External API integrations

### 3. **Combined Modules**

- **`menu-system.ts`**: Combines display, navigation, and choices in one coherent module
- **`operations.ts`**: All Azure operations in one place
- **Index files**: Clean exports for easy importing

### 4. **Reduced Code Duplication**

- Menu logic consolidated into single `MenuSystem` class
- Consistent error handling patterns
- Reusable display methods

## Usage Examples

### Clean Imports

```typescript
import { DashboardManager } from "./managers/index.js";
import { AzureOperations, MenuSystem, CLIProgress } from "./utils/index.js";
```

### Modular Architecture

- Each module has a single responsibility
- Easy to test individual components
- Simple to extend functionality

### Type Safety

- Consistent interfaces across modules
- Better IntelliSense support
- Reduced runtime errors

## Benefits

1. **Maintainability**: Easier to find and modify specific functionality
2. **Scalability**: Simple to add new features in appropriate domains
3. **Testability**: Each module can be tested independently
4. **Readability**: Clear separation of concerns
5. **Consistency**: Uniform naming and organization patterns

## Adding New Features

- **Azure operations**: Add to `utils/azure/operations.ts`
- **UI components**: Add to `utils/ui/menu-system.ts`
- **Core utilities**: Add new files in `utils/core/`
- **New managers**: Add to `managers/` folder
- **External services**: Add to `services/` folder

This structure provides a solid foundation for future development while maintaining clean, organized, and maintainable code.
