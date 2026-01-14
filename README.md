# Antigravity Sync

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/antigravity-sync.antigravity-sync.svg)](https://marketplace.visualstudio.com/items?itemName=antigravity-sync.antigravity-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Sync your **Gemini Antigravity** context (`~/.gemini/antigravity/`) across machines via a private Git repository (GitHub, GitLab, Bitbucket, etc.).

![Antigravity Sync Panel](docs/images/panel-preview.png)

## ✨ Features

- 🔄 **Auto-sync** — Automatically sync changes to your private repository
- 🔒 **Private repo only** — Extension validates that your repository is private
- 🛡️ **Sensitive data protection** — Automatically excludes OAuth tokens and credentials
- 📊 **Side panel** — Visual dashboard showing sync status, files, and history
- 🎯 **Selective sync** — Choose which folders to sync
- ⚡ **Setup wizard** — Easy step-by-step configuration

## 📦 Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for "Antigravity Sync"
4. Click Install

### From VSIX

```bash
code --install-extension antigravity-sync-0.1.0.vsix
```

## 🚀 Quick Start

1. **Create a private Git repository** (GitHub, GitLab, Bitbucket, etc.)
2. **Generate an access token** with repo scope
   - GitHub: [github.com/settings/tokens](https://github.com/settings/tokens)
   - GitLab: Settings → Access Tokens
   - Bitbucket: App passwords
3. **Open Command Palette** (`Cmd+Shift+P` / `Ctrl+Shift+P`)
4. **Run** `Antigravity Sync: Configure Repository`
5. **Follow the setup wizard**

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `antigravitySync.repositoryUrl` | `""` | GitHub repository URL (must be private) |
| `antigravitySync.autoSync` | `true` | Automatically sync changes |
| `antigravitySync.syncIntervalMinutes` | `5` | Auto-sync interval |
| `antigravitySync.syncFolders` | `["knowledge", "antigravity"]` | Folders to sync |
| `antigravitySync.excludePatterns` | `[]` | Additional patterns to exclude |
| `antigravitySync.geminiPath` | `""` | Custom .gemini path |

## 🛡️ Excluded Files (Default)

The following files are **never synced** to protect your privacy:

| Pattern | Reason |
|---------|--------|
| `google_accounts.json` | OAuth credentials |
| `oauth_creds.json` | OAuth credentials |
| `browser_recordings/` | Large video files |
| `code_tracker/` | Machine-specific |
| `implicit/` | Workspace indexing |
| `user_settings.pb` | User preferences |

> **Note**: `conversations/*.pb` ARE synced (chat history).

You can add custom patterns in `.antigravityignore` at the root of your `.gemini/antigravity` folder.

## 📋 Commands

| Command | Description |
|---------|-------------|
| `Antigravity Sync: Configure Repository` | Setup or change repository |
| `Antigravity Sync: Sync Now` | Manual sync (push + pull) |
| `Antigravity Sync: Push Changes` | Push local changes only |
| `Antigravity Sync: Pull Changes` | Pull remote changes only |
| `Antigravity Sync: Show Status` | Show sync status |

## 🔐 Security

> ⚠️ **Important**: This extension requires a Git access token with repo scope.

- Your token is stored securely in VS Code's secret storage
- The extension **only** works with private repositories
- Sensitive files are automatically excluded from sync
- All communication uses HTTPS

## 🖥️ Cross-Machine Setup

After syncing to a new machine, Gemini needs matching workspace paths to recognize conversations.

### Step 1: Pull synced data
Install the extension, connect to the same repo, and **Pull** to get all data.

### Step 2: Create symlinks for workspace paths
Gemini binds conversations to workspace paths. Create symlinks on the new machine:

```bash
# Example: If old machine had workspace at /Users/dung.leviet/Documents/core
# On new machine (Linux/Mac):
sudo mkdir -p /Users/dung.leviet/Documents
sudo ln -s /actual/path/to/your/project /Users/dung.leviet/Documents/core

# On Windows (Run as Admin):
mklink /D "C:\Users\dung.leviet\Documents\core" "D:\actual\path\to\project"
```

### What syncs across machines:
| Folder | Cross-machine compatibility |
|--------|----------------------------|
| `knowledge/` | ✅ Works immediately (global) |
| `brain/` | ✅ Artifacts readable |
| `conversations/` | ⚠️ Needs symlink to match paths |

### OS Compatibility (for conversations):
| Sync between | Works? | Notes |
|--------------|--------|-------|
| macOS ↔ macOS | ✅ | symlink |
| Linux ↔ Linux | ✅ | symlink |
| Windows ↔ Windows | ✅ | `mklink /D` (Run as Admin) |
| macOS ↔ Linux | ✅ | symlink |
| macOS/Linux ↔ Windows WSL | ✅ | symlink in WSL + VS Code Remote |
| macOS/Linux ↔ Windows native | ❌ | Path format incompatible |

> **Note:** Knowledge Items work across ALL platforms without symlinks.

## 🛠️ Development

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for local development setup.

```bash
# Clone the repo
git clone https://github.com/mrd9999/antigravity-sync.git
cd antigravity-sync

# Install dependencies
yarn install

# Build
yarn build

# Run tests
yarn test

# Launch extension in development mode
code . && press F5
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/CONTRIBUTING.md) first.

- 🐛 [Report bugs](https://github.com/mrd9999/antigravity-sync/issues/new?template=bug_report.md)
- 💡 [Request features](https://github.com/mrd9999/antigravity-sync/issues/new?template=feature_request.md)
- 📖 [Improve docs](https://github.com/mrd9999/antigravity-sync/pulls)

## 📄 License

MIT © [Dung Le](https://www.facebook.com/mrd.900s)

---

Made with ❤️ for the Gemini community

## 📬 Contact

- Facebook: [@mrd.900s](https://www.facebook.com/mrd.900s)
- GitHub Issues: [Report a bug](https://github.com/mrd9999/antigravity-sync/issues)
