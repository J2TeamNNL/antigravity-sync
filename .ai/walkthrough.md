# Walkthrough (VN + tech terms)

## Snapshot hiện tại

- Extension đã hỗ trợ đa agent (Antigravity/Cursor/Windsurf), multi-mode, i18n EN/VI, SetupWizard đơn giản, ErrorDisplay.
- Docs đã chuyển sang **sync-only**; Auto Retry đã loại bỏ.
- Project mode: Side Panel hiển thị **danh sách file thay đổi (read-only)**, chưa auto-sync.

## Cách chạy & test nhanh (dev host)

```bash
cd /Users/hangvalong/Code/antigravity-sync
npm install
npm run build:dev
# VS Code/Antigravity: F5 để mở Extension Development Host
```

- Trong window Dev Host: mở panel Antigravity Sync, chạy `Configure Repository`, kiểm tra log ở Developer Tools.

## Ghi chú cho contributor

- **Agent metadata**: nằm tại `resources/agent-mapping.json`. Provider phải đọc file này; nếu mất file, fallback về defaults hardcoded.
- **Hooks đề xuất**: thêm `onBeforeSync`, `onAfterSync`, `onConflictResolved` trong SyncService (no-op mặc định) để plugin/telemetry dễ gắn.
- **Smart merge strategy**: mặc định “larger/newer for binaries”; nên đóng gói theo strategy interface để thay thế được.
- **Config schema**: tập trung vào `ConfigService` để validation runtime + generate docs/UI từ cùng một nguồn.
- **Perf tips**: điều chỉnh `syncIntervalMinutes`, thêm exclude cho binary/log, tận dụng mapping JSON để chia sẻ mẫu exclude.
- **Project mode**: nếu mở rộng auto-sync, cần thêm setting + confirm step để tránh push nhầm repo team.

## Danh sách kiểm thử đề xuất

- Provider load từ JSON vs fallback.
- Config validation với schema (giá trị ngoài range phải cảnh báo).
- Sync flow với hooks bật/tắt vẫn ổn định.
- Smart merge chọn đúng phiên bản với file nhị phân khác kích thước/thời gian.

## Việc tiếp theo (liên quan mở rộng)

- Wire-up mapping JSON vào provider factory.
- Thêm schema validation + cập nhật README/README_VI liên kết mapping và mô tả project read-only list.
- Bổ sung test cho provider/config/merge.
