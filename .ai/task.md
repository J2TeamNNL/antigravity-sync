# Multi-Agent Sync Extension - Tasks (VN + tech terms)

## Trạng thái nhanh

- ✅ Multi-agent core (providers Antigravity/Cursor/Windsurf, ConfigService per-agent, SyncService đa mode, ProjectSyncService read-only list).
- ✅ UX/i18n (LocalizationService, SetupWizard, ErrorDisplay, EN/VI translations).
- ✅ Docs sync-only (README/README_VI).
- ⏳ Public-ready & extensibility (schema, hooks, JSON metadata wiring, tests).

## Việc cần làm (ưu tiên public-ready)

- [x] ~~Nạp metadata từ `resources/agent-mapping.json` trong provider factory~~ (Bỏ qua - giữ provider class độc lập)
- [x] Thêm **Config schema** + runtime validation; dùng schema để giữ README/UI đồng bộ giá trị default/range.
- [x] Bổ sung **SyncService hooks** (`onBeforeSync`, `onAfterSync`, `onConflictResolved`) với default no-op; document contract.
- [x] Cập nhật README/README_VI: ghi rõ Project mode là danh sách thay đổi **read-only** trong Side Panel; thêm performance guidance.
- [ ] Test: config validation, hooks functionality (cần refactor test structure).
- [x] Perf guidance: ví dụ exclude + chỉnh `syncIntervalMinutes` cho repo lớn (đã ghi trong README).

## Theo dõi các hạng mục đã xong

- [x] Localization (EN/VI), SetupWizard, ErrorDisplay.
- [x] Provider implementations + per-agent excludes.
- [x] Project mode read-only list (UI).
- [x] Remove CHANGELOG.md (theo yêu cầu public docs).
- [x] Tạo file `.ai/changelog.md` (theo dõi nội bộ).
