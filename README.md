# AI Context Sync

**AI Context Sync** (formerly Antigravity Sync) is a VS Code extension designed to synchronize your **AI Context** (Knowledge Items, Memories, Rules) and **Settings** across multiple machines and IDEs (Cursor, Windsurf, VS Code).

It uses a **private Git repository** as the storage backend, ensuring your data is secure, versioned, and under your control.

## ✨ Features

- **Multi-IDE Support**: Works seamlessly with VS Code, Cursor, and Windsurf.
- **Private & Secure**: Syncs to your own private GitHub/GitLab/Bitbucket repository.
- **AI Context Sync**: Automatically syncs `.gemini/` (or custom) folders containing your AI's brain.
- **Zero Babysitting**:
  - Auto-sync on file changes (configurable debounce).
  - Auto-pull on startup.
  - Smart conflict resolution (newer wins, or manual merge).
- **Project & Global Modes**:
  - **Global Mode**: Syncs your central AI knowledge base.
  - **Project Mode**: Syncs project-specific rules (`.ai/`, `.cursorrules`).
- **Extensible**: Hooks for custom logic (`onBeforeSync`, `onAfterSync`).
- **Localization**: English and Vietnamese support (Tiếng Việt).

## 🚀 Installation

### From VS Code Marketplace

Search for **"AI Context Sync"** and install.

### From VSIX

1. Download the latest `.vsix` release.
2. Run: `code --install-extension ai-context-sync-2.0.0.vsix`

## ⚙️ Configuration

1. **Create a Private Repository**: Create a new empty private repository on GitHub/GitLab.
2. **Configure Extension**:
   - Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
   - Run **"AI Context Sync: Configure Repository"**.
   - Enter your Repository URL and Personal Access Token (PAT).

### Settings

| Setting                             | Default     | Description                                       |
| :---------------------------------- | :---------- | :------------------------------------------------ |
| `aiContextSync.repositoryUrl`       | `""`        | URL of your private sync repo.                    |
| `aiContextSync.autoSync`            | `true`      | Enable auto-sync on file change.                  |
| `aiContextSync.syncIntervalMinutes` | `5`         | Interval for background sync (min).               |
| `aiContextSync.syncMode`            | `"private"` | `private` (global), `project` (local), or `both`. |
| `aiContextSync.excludePatterns`     | `[]`        | Glob patterns to exclude from sync.               |

## 🧩 Compatibility

- **VS Code**: v1.85.0+
- **Cursor**: Compatible
- **Windsurf**: Compatible

## 🤝 Contributing

Contributions are welcome! Please submit Pull Requests to the [GitHub Repository](https://github.com/j2teamnnl/ai-context-sync).

## 📄 License

MIT License.
