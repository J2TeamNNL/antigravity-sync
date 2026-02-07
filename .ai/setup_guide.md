# Setup Guide - Test Extension Locally

## Hướng dẫn test extension ở local

### Bước 1: Cài đặt dependencies

```bash
cd /Users/hangvalong/Code/ai-context-sync
npm install
```

### Bước 2: Build extension

```bash
# Build cho development (faster, có source maps)
npm run build:dev

# Hoặc build production
npm run build
```

### Bước 3: Run extension trong Extension Development Host

1. Mở project trong Antigravity/VSCode:

   ```bash
   agy /Users/hangvalong/Code/ai-context-sync
   ```

2. Nhấn **F5** (hoặc Run > Start Debugging)
   - Extension sẽ compile và mở cửa sổ mới (Extension Development Host)
   - Trong cửa sổ mới này, extension đã được activate

3. Trong Extension Development Host:
   - Mở AI Context Sync panel từ sidebar (icon sync)
   - Hoặc Command Palette (`Cmd+Shift+P`) → "AI Context Sync: Configure Repository"

### Bước 4: Debug

- **Console logs**: Mở Developer Tools trong Extension Development Host
  - `Cmd+Shift+P` → "Developer: Toggle Developer Tools"
  - Tab "Console" sẽ hiển thị `console.log()` từ extension

- **Extension Host logs**: Xem trong cửa sổ debug của parent IDE
  - Panel "Debug Console"

- **Reload extension**: Trong Extension Development Host
  - `Cmd+Shift+P` → "Developer: Reload Window"

### Bước 5: Test setup wizard mới

Khi implementation xong, test các scenario:

#### ✅ Happy Path

1. Chưa config → Hiển thị welcome message
2. Click "Configure Now" → Setup wizard mở
3. Nhập PAT + Repo URL đúng
4. Extension tự động setup (không cần reload)
5. Success screen hiển thị

#### ❌ Error Cases

1. **Invalid PAT**: Hiển thị error với suggested action
2. **Public repo**: Show warning, từ chối setup
3. **Network error**: Retry button với detailed error
4. **CDP not available**: Auto-guide user để enable CDP hoặc disable Auto Retry

#### 🌐 Multilingual

1. VSCode language = Vietnamese → UI tiếng Việt
2. VSCode language = English → UI tiếng Anh
3. Switch language in-app → UI update ngay

---

## Troubleshooting

### Extension không activate

- Check `package.json` → `activationEvents`
- Check console logs for errors

### Build errors

```bash
# Clean và rebuild
rm -rf dist/
npm run build:dev
```

### CDP issues khi test Auto Retry

```bash
# Restart IDE với CDP flag
/Applications/Antigravity.app/Contents/MacOS/Electron --remote-debugging-port=31905
```

---

## Sau khi test xong

### Package extension

```bash
npm run package
# Tạo file .vsix để install
```

### Install VSIX locally

```bash
agy --install-extension ai-context-sync-2.0.0.vsix
```
