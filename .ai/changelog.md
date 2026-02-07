# Changelog

Tất cả những thay đổi đáng chú ý của dự án này sẽ được ghi lại trong file này.

Format dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- **Config Schema & Runtime Validation** (`ConfigSchema.ts`): Schema-based validation cho extension settings với type checking và range validation.
- **SyncHooks Interface** (`SyncHooks.ts`): Extensibility hooks cho sync lifecycle (`onBeforeSync`, `onAfterSync`, `onConflictResolved`) để dễ dàng thêm telemetry/plugins.
- **Performance Optimization Guide**: Thêm documentation chi tiết về tối ưu performance cho repo lớn (exclude patterns, sync interval, per-agent config).
- Tạo file `.ai/changelog.md` để theo dõi lịch sử thay đổi nội bộ.

### Changed

- `ConfigService.getConfig()`: Tích hợp runtime validation, log warning khi config không hợp lệ nhưng không block extension.
- `SyncService`: Hỗ trợ custom hooks qua `setHooks()`, tracking file count cho hooks callbacks.
- Cấu trúc provider: Giữ nguyên provider classes độc lập, bỏ qua JSON metadata approach để đơn giản hóa.

### Technical Details

- Config validation ranges: `syncIntervalMinutes` (1-60), `syncMode` enum validation, locale validation.
- Hooks are optional và có default no-op implementation (`DefaultSyncHooks`).
- Documentation updates: README.md và README_VI.md có performance section mới.
