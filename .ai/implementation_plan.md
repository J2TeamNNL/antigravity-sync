# Multi-Agent Sync Extension - Implementation Plan

## Tổng quan

Mở rộng extension `antigravity-sync` để hỗ trợ:

1. **Đồng bộ đa agent**: Antigravity, Cursor, Windsurf
2. **Hai chế độ sync**:
   - **Private Repo Mode**: Đồng bộ settings cá nhân lên private repo
   - **Project Repo Mode**: Đồng bộ `.agent/` vào project repo để team share
3. **Đơn giản hóa setup**: Giảm bước cấu hình so với hiện tại

---

## User Review Required

> [!IMPORTANT]
> **Feedback đã nhận:**
>
> - Project hiện tại có UX issues: setup phức tạp (phải reload IDE, copy command không rõ mục đích)
> - CDP error messages không rõ ràng: "Auto-start: CDP not available. Please restart IDE with CDP flag."
> - Cần **đơn giản hóa** setup flow để người dùng có thể cài và dùng ngay
> - Cần **i18n support** (Tiếng Anh + Tiếng Việt) để dễ hiểu hơn
> - Cần **error messages chi tiết** để dễ debug

> [!CAUTION]
> **Approach mới:**
> Không clone y nguyên project hiện tại. Sẽ **tham khảo code** nhưng **rebuild UX từ đầu** với focus:
>
> 1. **Setup wizard đơn giản**: Không cần reload IDE, không cần copy command thủ công, tự động detect và fix CDP issues
> 2. **Error handling tốt hơn**: Thông báo rõ ràng với suggested actions
> 3. **Multilingual UI**: Hỗ trợ EN/VI với LocalizationService
> 4. **Progressive disclosure**: Chỉ hiển thị options nâng cao khi cần thiết

**Quyết định cần xác nhận:**

> 1. Hỗ trợ **cả 2 mode song song**: Private Repo (settings cá nhân) + Project Repo (`.agent/` share team) - đúng không?
> 2. Project repo mode: Tự động commit nhưng **hiển thị preview** trước để user xác nhận - đồng ý không?
> 3. IDE paths xác nhận:
>    - **Cursor**: `~/.cursor/`, `.cursor/`, `.cursorrules`
>    - **Windsurf**: `~/.codeium/windsurf/`, `.windsurf/`

---

## Dữ liệu đồng bộ theo Agent

| Agent           | Global Path   | Project Path               | Sync Items                                                   |
| --------------- | ------------- | -------------------------- | ------------------------------------------------------------ |
| **Antigravity** | `~/.gemini/`  | `.agent/`, `GEMINI.md`     | brain/, knowledge/, conversations/, skills, workflows, rules |
| **Cursor**      | `~/.cursor/`  | `.cursor/`, `.cursorrules` | settings, rules, context                                     |
| **Windsurf**    | `~/.codeium/` | `.windsurf/`               | settings, rules, context                                     |

---

## Proposed Changes

### Core Architecture

```
src/
├── providers/                    # [NEW] Agent providers
│   ├── AgentProvider.ts          # Interface cho các agents
│   ├── AntigravityProvider.ts    # Antigravity implementation
│   ├── CursorProvider.ts         # Cursor implementation
│   └── WindsurfProvider.ts       # Windsurf implementation
├── services/
│   ├── ConfigService.ts          # [MODIFY] Multi-agent config
│   ├── SyncService.ts            # [MODIFY] Multi-mode sync
│   ├── FilterService.ts          # [MODIFY] Per-agent filters
│   ├── ProjectSyncService.ts     # [NEW] Project repo sync
│   ├── LocalizationService.ts    # [NEW] i18n support
│   └── ...existing files...
├── locales/                      # [NEW] Translation files
│   ├── en.json                   # English
│   └── vi.json                   # Vietnamese
├── ui/
│   ├── SetupWizard.ts            # [NEW] Simplified setup wizard
│   ├── ErrorDisplay.ts           # [NEW] Better error handling
│   └── SidePanelProvider.ts      # [MODIFY] i18n support
└── ...
```

---

## Verification Plan

### Manual Testing (Local F5)

> [!NOTE]
> Để test local, bạn chạy extension trong Extension Development Host:

1. **Setup**:

   ```bash
   cd /Users/hangvalong/Code/antigravity-sync
   npm install
   npm run build:dev
   ```

2. **Run Extension (F5)**:
   - Mở project trong Antigravity/VSCode
   - Nhấn `F5` để mở Extension Development Host
   - Extension sẽ chạy trong cửa sổ mới

3. **Test Cases**:
   - [ ] Verify extension activates without errors
   - [ ] Open Antigravity Sync panel → Should show multi-agent options
   - [ ] Enable Cursor agent → Should detect `.cursor/` paths
   - [ ] Configure private repo → Should clone successfully
   - [ ] Toggle project sync → Should detect if current project has git
   - [ ] Sync Now → Should sync selected agents only
   - [ ] Check conflict handling → Should prompt user to resolve

---

## Timeline dự kiến

| Phase | Thời gian | Tasks                   |
| ----- | --------- | ----------------------- |
| 1     | 1 ngày    | Thiết kế & approval     |
| 2     | 2-3 ngày  | Core services refactor  |
| 3     | 1 ngày    | Configuration updates   |
| 4     | 1-2 ngày  | UI updates              |
| 5     | 1 ngày    | Testing & documentation |

**Tổng: ~6-8 ngày**

---

## Câu hỏi bổ sung

1. Bạn có cần import/export settings giữa các agents không? (Ví dụ: copy rules từ Cursor sang Antigravity)
2. Có cần notifications khi có conflict không?
3. Có muốn thêm command line interface (CLI) để sync từ terminal không?
