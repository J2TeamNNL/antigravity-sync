# Kế hoạch triển khai (public-friendly, dễ mở rộng)

Ngôn ngữ chính: Tiếng Việt, kèm thuật ngữ kỹ thuật tiếng Anh để dev bên ngoài dễ hiểu.

## Mục tiêu

- Đồng bộ đa agent: Antigravity, Cursor, Windsurf.
- Hai chế độ: **private mode** (global data) và **project mode** (read-only list các thay đổi trong workspace).
- Ưu tiên mở rộng/tuỳ biến: dễ thêm agent mới, thay đổi đường dẫn, exclude, chiến lược merge.

## Kiến trúc & điểm mở rộng

- **Agent metadata single source**: `resources/agent-mapping.json` (id, displayName, globalPaths, projectPaths, defaultExcludes, ignoreFileName). Providers đọc từ đây, fallback giá trị hardcoded nếu file thiếu.
- **Provider registry**: `providers/index.ts` giữ danh sách AgentProvider; agent mới chỉ cần khai báo metadata + implement minimal interface.
- **Config schema + runtime validation**: định nghĩa type Schema trong `ConfigService`, validate VS Code settings khi load; dùng schema này để sinh phần “Config Reference” (README/UI).
- **SyncService public surface**: giữ API ổn định `sync/push/pull/getStatus/getDetailedStatus/copyFilesOnly/setGitLogger/setCountdownCallback`. Thêm hook interface (`onBeforeSync`, `onAfterSync`, `onConflictResolved`) với default no-op để plugin/telemetry về sau gắn vào.
- **Smart Merge pluggable**: giữ chiến lược mặc định “larger/newer for binaries”; đóng gói strategy interface để có thể thêm policy khác.
- **Project mode**: hiện tại chỉ hiển thị danh sách file thay đổi (read-only) trong Side Panel. Kịch bản mở rộng: thêm auto-sync project paths sau khi có confirm setting.
- **Perf/scale**: watcher debounce bằng `syncIntervalMinutes`; khuyến nghị exclude thêm cho repo lớn (ghi trong mapping JSON).
- **Logging**: GitService đã hỗ trợ UI logger; cho phép gắn sink khác (file/telemetry) qua callback.

## Lộ trình thực thi

1. Nạp metadata từ `resources/agent-mapping.json` trong provider factory; fallback an toàn.
2. Thêm schema + validator cho config; document mapping giữa schema ↔ README/UI.
3. Bổ sung hook interface vào SyncService (no-op mặc định) + tài liệu cách dùng.
4. Cập nhật README/README_VI: dẫn link mapping JSON, giải thích project mode là read-only list, giữ mermaid flow.
5. Viết test: provider loading (JSON vs default), config validation, smart-merge strategy selection.
6. Perf guidance: thêm ví dụ exclude/interval trong README.

## Kiểm thử & xác nhận

- Unit: provider loading, config validation, smart-merge strategy.
- Manual (F5):
  - Configure repo (private) thành công.
  - Project mode hiển thị đúng danh sách file (không auto-sync).
  - Sync flow hoạt động với hooks bật/tắt không lỗi.
- JSON lint: `node -e "JSON.parse(fs.readFileSync('resources/agent-mapping.json'))"`.

## Quyết định thiết kế (đã chốt)

- **UI/UX**: Tối giản, không expose cấu hình hooks phức tạp.
- **Project Mode**: Hiện tại sử dụng cơ chế manual trigger hoặc confirm đơn giản, tránh auto-sync gây nhầm lẫn.
- **Documentation**: Maintain thủ công bảng config change trong README để dễ tùy chỉnh.
- **Provider Architecture**: Giữ nguyên provider classes độc lập, bỏ JSON metadata approach.

## Triển khai đã hoàn thành

- [x] **ConfigSchema** (`src/services/ConfigSchema.ts`): Schema definition + runtime validation với type/range/enum checks.
- [x] **SyncHooks Interface** (`src/services/SyncHooks.ts`): Lifecycle hooks với default no-op implementation (`DefaultSyncHooks`).
- [x] **ConfigService Integration**: Tích hợp validation vào `getConfig()`, log warning nếu invalid.
- [x] **SyncService Hooks**: Support `setHooks()`, trigger hooks tại sync lifecycle, track file count.
- [x] **README Updates**: Performance optimization section + config schema docs + extensibility hooks examples (EN + VI).
- [x] **Changelog**: Tracking internal changes trong `.ai/changelog.md`.
