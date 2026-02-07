# Changelog

All notable changes to the "ai-context-sync" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.0.0] - 2026-02-07

### 🚨 Breaking Changes

- **Project Rename**: Renamed extension from `antigravity-sync` to `ai-context-sync`.
  - **New ID**: `j2teamnnl.ai-context-sync`
  - **New Command Prefix**: `aiContextSync.*` (was `antigravitySync.*`)
  - **New Config Prefix**: `aiContextSync.*` (was `antigravitySync.*`)

### Config Migration Guide

If you are upgrading from v1.x, please migrate your settings manually:

- `antigravitySync.repositoryUrl` → `aiContextSync.repositoryUrl`
- `antigravitySync.enabled` → `aiContextSync.enabled`
- ...and all other `antigravitySync.*` settings.

### Changed

- **Multi-IDE Support**: Explicitly positioned as a context sync tool for multiple IDEs (Cursor, Windsurf, VS Code).
- **Documentation**: Updated READMEs to reflect the new name and purpose.

## [1.1.0] - 2026-02-07

### Added

- **Config Schema & Runtime Validation** (`ConfigSchema.ts`): Schema-based validation for extension settings with type checking and range validation.
- **SyncHooks Interface**: Extensibility points for `onBeforeSync`, `onAfterSync`, and `onConflictResolved`.
- **Performance Optimization Guide**: Documentation for handling large repositories.

### Changed

- Integrated configuration validation into `ConfigService`.
- Integrated hooks into `SyncService`.

## [1.0.0] - 2026-01-XX

### Initial Release (as Antigravity Sync)

- Multi-agent sync support.
- Private Git repository sync.
- Auto-sync with file watching.
- Smart merge conflict resolution.
- Localization (English/Vietnamese).
