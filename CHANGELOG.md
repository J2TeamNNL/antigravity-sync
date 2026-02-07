# Changelog

All notable changes to the "antigravity-sync" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1.0] - 2026-02-07

### Added

- **Config Schema & Runtime Validation** (`ConfigSchema.ts`): Schema-based validation for extension settings with type checking and range validation
  - Type validation for string, number, boolean, array, object
  - Range validation for numbers (`syncIntervalMinutes`: 1-60 minutes)
  - Enum validation for strings (`syncMode`, `locale`)
  - Custom `ConfigValidationError` class for detailed error messages

- **SyncHooks Extensibility Interface** (`SyncHooks.ts`): Lifecycle hooks for sync operations
  - `onBeforeSync(operation)`: Called before sync/push/pull operations
  - `onAfterSync(operation, success, fileCount)`: Called after operations complete
  - `onConflictResolved(conflicts)`: Called when conflicts are resolved
  - Default no-op implementation (`DefaultSyncHooks`) for easy adoption

- **Performance Optimization Documentation**: Comprehensive guide for large repositories
  - Sync interval adjustment recommendations
  - Exclude pattern examples (global and per-agent)
  - Mode optimization suggestions
  - Added to both README.md and README_VI.md

### Changed

- **ConfigService**: Integrated runtime validation in `getConfig()`
  - Validates settings on load
  - Logs warnings for invalid configs without blocking extension

- **SyncService**: Enhanced with hooks support
  - Added `setHooks()` method for custom hook registration
  - Tracks file count for hook callbacks
  - Triggers hooks at appropriate lifecycle points

- **Documentation**: Major updates to README files
  - New "Performance & Optimization" section
  - Config schema validation documentation
  - Extensibility hooks usage examples
  - Both English and Vietnamese versions updated

### Technical Details

- Config validation enforces:
  - `syncIntervalMinutes`: 1-60 minutes range
  - `syncMode`: enum validation (private/project/both)
  - `locale`: enum validation (auto/en/vi)
- Hooks are optional with default no-op implementation
- All new code compiled successfully with TypeScript strict mode
- Build output: extension.js (280KB), all type definitions generated

## [1.0.0] - 2026-01-XX

### Initial Release

- Multi-agent sync support (Antigravity, Cursor, Windsurf)
- Private Git repository sync
- Auto-sync with file watching
- Smart merge conflict resolution
- Project mode (read-only file tracking)
- Localization (English/Vietnamese)
- Status bar and side panel UI
- Git credential helper integration
