# Multi-Agent Sync Extension - Tasks

## Mục tiêu

Mở rộng extension `antigravity-sync` để hỗ trợ đồng bộ cấu hình và artifacts từ nhiều AI agents (Antigravity, Cursor, Windsurf) lên private repo và/hoặc project repo.

---

## Tasks

### Phase 1: Thiết kế kiến trúc mới

- [x] Phân tích cấu trúc project hiện tại
- [x] Phân tích UX issues và requirements
- [x] Tạo implementation plan chi tiết (với UX & i18n focus)
- [x] Tạo setup guide để test local
- [ ] Review và approval từ user

### Phase 2: UX & i18n Implementation

- [x] Tạo `LocalizationService` với EN/VI support
- [x] Tạo translation files: `en.json`, `vi.json`
- [x] Tạo `SetupWizard` đơn giản (không cần reload IDE)
- [x] Tạo `ErrorDisplay` với detailed messages
- [x] Integrate i18n vào extension.ts
- [x] Build thành công

### Phase 3: Core Services & Providers

- [ ] Tạo `AgentProvider` interface để hỗ trợ nhiều agents
- [ ] Implement providers: `AntigravityProvider`, `CursorProvider`, `WindsurfProvider`
- [ ] Refactor `ConfigService` để hỗ trợ per-agent settings
- [ ] Refactor `SyncService` để hỗ trợ 2 modes: private repo & project repo
- [ ] Tạo `ProjectSyncService` cho project repo mode
- [ ] Update `FilterService` để xử lý exclude patterns cho từng agent

### Phase 4: Update Configuration

- [ ] Thêm settings mới vào `package.json` (enabledAgents, projectSyncEnabled, etc)
- [ ] Hỗ trợ global rules với local override
- [ ] Thêm locale setting

### Phase 5: Update UI

- [ ] Update webview panel để hiển thị multi-agent status
- [ ] Thêm toggle cho từng agent
- [ ] Thêm mode selector (private repo / project repo / both)
- [ ] Thêm language selector (EN/VI)
- [ ] Update error displays với ErrorDisplay component

### Phase 6: Testing & Documentation

- [ ] Viết unit tests cho LocalizationService
- [ ] Viết unit tests cho các providers mới
- [ ] Test multilingual UI (EN/VI)
- [ ] Test setup wizard flow
- [ ] Test error handling
- [ ] Update README (EN/VI versions)
- [ ] Test local với F5

---

## Ghi chú

- Auth: Giữ nguyên cách dùng PAT như hiện tại
- Conflict: Cho người dùng tự resolve
- Priority: Per-project settings, global rules có thể override
