# AI Context Sync

**AI Context Sync** (tên cũ: Antigravity Sync) là một extension VS Code giúp đồng bộ hóa **AI Context** (Knowledge Items, Memories, Rules) và **Settings** giữa các máy tính và IDE khác nhau (Cursor, Windsurf, VS Code).

Nó sử dụng **Git repository riêng tư (private)** để lưu trữ, đảm bảo dữ liệu của bạn an toàn, có lịch sử phiên bản và hoàn toàn thuộc quyền kiểm soát của bạn.

## ✨ Tính năng chính

- **Hỗ trợ đa IDE**: Hoạt động mượt mà trên VS Code, Cursor và Windsurf.
- **Riêng tư & An toàn**: Đồng bộ về repository cá nhân của bạn trên GitHub/GitLab.
- **Đồng bộ AI Context**: Tự động sync thư mục `.gemini/` (hoặc tùy chỉnh) chứa "bộ não" của AI.
- **Tự động hóa**:
  - Tự động sync khi có thay đổi file (auto-save).
  - Tự động pull khi khởi động.
  - Giải quyết xung đột thông minh (smart conflict resolution).
- **Chế độ Sync**:
  - **Global Mode**: Sync kho tri thức AI trung tâm (Knowledge Base).
  - **Project Mode**: Sync rules của từng dự án (`.ai/`, `.cursorrules`).
- **Mở rộng (Extensible)**: Hỗ trợ Hooks (`onBeforeSync`, `onAfterSync`) cho developer.
- **Đa ngôn ngữ**: Hỗ trợ đầy đủ Tiếng Việt và Tiếng Anh.

## 🚀 Cài đặt

### Từ VS Code Marketplace

Tìm kiếm **"AI Context Sync"** và cài đặt.

### Từ file VSIX

1. Tải file `.vsix` mới nhất từ trang Release.
2. Chạy lệnh: `code --install-extension ai-context-sync-2.0.0.vsix`

## ⚙️ Cấu hình

1. **Tạo Private Repository**: Tạo một repo rỗng trên GitHub/GitLab.
2. **Cấu hình Extension**:
   - Mở Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
   - Chạy lệnh **"AI Context Sync: Configure Repository"**.
   - Nhập URL Repository và Personal Access Token (PAT).

### Các cài đặt quan trọng

| Cài đặt                             | Mặc định    | Mô tả                                                               |
| :---------------------------------- | :---------- | :------------------------------------------------------------------ |
| `aiContextSync.repositoryUrl`       | `""`        | URL của private repo dùng để sync.                                  |
| `aiContextSync.autoSync`            | `true`      | Bật/tắt tự động sync.                                               |
| `aiContextSync.syncIntervalMinutes` | `5`         | Khoảng thời gian sync ngầm (phút).                                  |
| `aiContextSync.syncMode`            | `"private"` | Chế độ: `private` (chung), `project` (dự án), hoặc `both` (cả hai). |
| `aiContextSync.excludePatterns`     | `[]`        | Các file/folder muốn loại trừ khỏi sync.                            |

## 🧩 Tương thích

- **VS Code**: Phiên bản 1.85.0 trở lên
- **Cursor**: Tương thích hoàn toàn
- **Windsurf**: Tương thích hoàn toàn

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng gửi Pull Request tại [GitHub Repository](https://github.com/j2teamnnl/ai-context-sync).

## 📄 Giấy phép

MIT License.
