# Antigravity Sync (Tiếng Việt)

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/mrd9999.antigravity-sync.svg)](https://marketplace.visualstudio.com/items?itemName=mrd9999.antigravity-sync)
[![Open VSX](https://img.shields.io/open-vsx/v/mrd9999/antigravity-sync)](https://open-vsx.org/extension/mrd9999/antigravity-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

VS Code Extension đồng bộ **Gemini Antigravity context** (`~/.gemini/antigravity/`) giữa các máy thông qua private Git repository.

**Vấn đề:** Khi switch máy, toàn bộ conversation history, Knowledge Items và brain artifacts của Gemini Antigravity bị mất. Extension này sync tự động qua Git để giải quyết vấn đề đó.

![Antigravity Sync Panel](docs/images/panel-preview.png)

---

## ⚠️ QUAN TRỌNG: Cross-Machine Sync

### Workspace Path Matching

Antigravity lưu conversation history theo **đường dẫn tuyệt đối của workspace**. Để xem được conversation từ máy cũ trên máy mới, **đường dẫn workspace phải GIỐNG NHAU**.

**Ví dụ:**
- Máy A: `/Users/dung.leviet/Documents/myproject`
- Máy B: **PHẢI là** `/Users/dung.leviet/Documents/myproject`

Nếu đường dẫn khác nhau, conversation sẽ không hiển thị dù đã sync thành công.

### Giải pháp: Symlink

Tạo symlink trên máy mới để match đường dẫn máy cũ:

```bash
# Linux/macOS
sudo mkdir -p /Users/dung.leviet/Documents
sudo ln -s /actual/path/to/project /Users/dung.leviet/Documents/myproject

# Windows (Run as Administrator)
mklink /D "C:\Users\dung.leviet\Documents\myproject" "D:\actual\path\to\project"
```

### Reload Window Sau Khi Sync

Sau khi Pull data từ remote, bạn **PHẢI reload VS Code window** để Antigravity load conversation mới:

```
Cmd+Shift+P (macOS) / Ctrl+Shift+P (Windows/Linux)
→ "Developer: Reload Window"
```

### OS Compatibility

| Sync giữa | Hoạt động? | Ghi chú |
|-----------|------------|---------|
| macOS ↔ macOS | ✅ | Dùng symlink |
| Linux ↔ Linux | ✅ | Dùng symlink |
| Windows ↔ Windows | ✅ | Dùng `mklink /D` (Admin) |
| macOS ↔ Linux | ✅ | Dùng symlink |
| macOS/Linux ↔ Windows WSL | ✅ | Symlink trong WSL + VS Code Remote |
| **macOS/Linux ↔ Windows native** | ❌ | **Path format không tương thích** |

> **Lưu ý:** 
> - `knowledge/` và `brain/` hoạt động trên tất cả platforms mà không cần symlink
> - Chỉ `conversations/` cần workspace path matching

---

## Features

- **Auto-sync** — Tự động sync changes lên private repository
- **Private repo only** — Validate repository phải là private
- **Sensitive data protection** — Auto-exclude OAuth tokens và credentials
- **Side panel** — Dashboard hiển thị sync status, files và history
- **Selective sync** — Chọn folders cần sync
- **Setup wizard** — Config step-by-step

## Installation

### Từ Marketplace

**VS Code Marketplace:**
https://marketplace.visualstudio.com/items?itemName=mrd9999.antigravity-sync

**Open VSX (cho Cursor, VSCodium):**
https://open-vsx.org/extension/mrd9999/antigravity-sync

### Từ VS Code/Antigravity

1. Mở Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search "Antigravity Sync"
3. Install

### Từ VSIX

```bash
# Nếu agy đã có trong PATH:
agy --install-extension antigravity-sync-0.1.1.vsix

# Nếu agy CHƯA có trong PATH, add trước:
# Cmd+Shift+P → "Shell Command: Install 'agy' command in PATH"
# Sau đó chạy lệnh install ở trên
```

## Quick Start

1. Tạo **private Git repository** (GitHub, GitLab, Bitbucket)
2. Generate **access token** với repo scope
   - GitHub: [github.com/settings/tokens](https://github.com/settings/tokens)
   - GitLab: Settings → Access Tokens
   - Bitbucket: App passwords
3. Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
4. Run `Antigravity Sync: Configure Repository`
5. Follow setup wizard

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `antigravitySync.repositoryUrl` | `""` | Git repository URL (phải private) |
| `antigravitySync.autoSync` | `true` | Auto sync changes |
| `antigravitySync.syncIntervalMinutes` | `5` | Auto-sync interval (phút) |
| `antigravitySync.syncFolders` | `["knowledge", "antigravity"]` | Folders cần sync |
| `antigravitySync.excludePatterns` | `[]` | Additional exclude patterns |
| `antigravitySync.geminiPath` | `""` | Custom path tới .gemini |

## Excluded Files (Default)

Các files sau **không bao giờ sync** để protect privacy:

| Pattern | Reason |
|---------|--------|
| `google_accounts.json` | OAuth credentials |
| `oauth_creds.json` | OAuth credentials |
| `browser_recordings/` | Large video files |
| `code_tracker/` | Machine-specific data |
| `implicit/` | Workspace indexing |
| `user_settings.pb` | User preferences |

> **Note**: `conversations/*.pb` ĐƯỢC sync (chat history).

Custom patterns có thể add trong `.antigravityignore` tại `.gemini/antigravity`.

## Commands

| Command | Description |
|---------|-------------|
| `Antigravity Sync: Configure Repository` | Setup hoặc change repository |
| `Antigravity Sync: Sync Now` | Manual sync (push + pull) |
| `Antigravity Sync: Push Changes` | Push local changes only |
| `Antigravity Sync: Pull Changes` | Pull remote changes only |
| `Antigravity Sync: Show Status` | Show sync status |

## Security

> ⚠️ Extension yêu cầu Git access token với repo scope.

- Token lưu trong VS Code Secret Storage
- Chỉ work với **private repositories**
- Sensitive files auto-excluded
- HTTPS only

## Development

```bash
git clone https://github.com/mrd9999/antigravity-sync.git
cd antigravity-sync
yarn install
yarn build
yarn test

# Run extension (dev mode)
agy . && press F5
```

## Contributing

- [Report bugs](https://github.com/mrd9999/antigravity-sync/issues/new?template=bug_report.md)
- [Request features](https://github.com/mrd9999/antigravity-sync/issues/new?template=feature_request.md)
- [Improve docs](https://github.com/mrd9999/antigravity-sync/pulls)

## License

MIT © [Dung Le](https://www.facebook.com/mrd.900s)

---

## Contact

- Facebook: [@mrd.900s](https://www.facebook.com/mrd.900s)
- GitHub: [Issues](https://github.com/mrd9999/antigravity-sync/issues)
