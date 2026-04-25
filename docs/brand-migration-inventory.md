# Yakumo API 品牌迁移清单

本文档梳理所有需要从 Yaak 改名为 Yakumo API 的地方。分为多个类别，明确优先级和处理建议。

---

## 1. 用户可见文案（第一批处理）

### 1.1 README 和文档

| 文件 | 当前内容 | 目标内容 | 优先级 |
|-----|---------|---------|--------|
| `README.md` | 标题 "Yaak"、描述、链接 | "Yakumo API" | 高 |
| `CONTRIBUTING.md` | "Contributing to Yaak" | "Contributing to Yakumo API" | 高 |
| `DEVELOPMENT.md` | 开发说明中的 Yaak 名称 | Yakumo API | 高 |
| `src/index.html` | `<title>Yaak App</title>` | `<title>Yakumo API</title>` | 高 |
| `docs/*.md` | 文档中的项目名称 | Yakumo API | 高 |

### 1.2 界面文案

| 文件/位置 | 当前内容 | 目标内容 | 优先级 |
|---------|---------|---------|--------|
| 窗口标题 | "Yaak" | "Yakumo API" | 高 |
| 设置页产品名 | "Yaak" | "Yakumo API" | 高 |
| 关于页 | "Yaak" + 版本信息 | "Yakumo API" | 高 |
| Sidebar 组件 | 各种 Yaak 引用 | Yakumo API | 中 |
| 导入/导出对话框 | "Yaak" 相关文案 | Yakumo API | 中 |

---

## 2. Tauri 配置（第二批处理）

### 2.1 核心配置文件

| 文件 | 当前值 | 目标值 | 优先级 |
|-----|------|------|--------|
| `src-tauri/tauri.conf.json` | `productName: "Yaak"` | `productName: "Yakumo API"` | 高 |
| 同上 | `identifier: "app.yaak.desktop"` | `identifier: "app.yakumo.api"` | 高 |
| 同上 | deep link scheme: `"yaak"` | `"yakumo"` | 高 |
| `src-tauri/tauri.development.conf.json` | 同上配置 | 同步更新 | 高 |

### 2.2 macOS 特定文件

| 文件 | 需要修改 |
|-----|---------|
| `src-tauri/macos/entitlements.*.plist` | 检查是否包含 Yaak 引用 |
| Info.plist 相关配置 | CFBundleName, CFBundleIdentifier 等 |

### 2.3 Windows/Linux 特定文件

| 文件 | 需要修改 |
|-----|---------|
| Windows 打包配置 | 检查 app name 和 identifier |
| Linux desktop entry | 检查 .desktop 文件配置 |

---

## 3. 包名和 crate 名（第三批处理 - 延后）

### 3.1 npm packages

| 当前名称 | 目标名称 | 文件位置 |
|---------|---------|---------|
| `yaak-app` | `yakumo-app` | `package.json` |
| `@yaakapp/app` | `@yakumo/app` | `src/package.json` |
| `@yaakapp-internal/*` | `@yakumo-internal/*` | 各 packages 目录 |

已移除：npm CLI packages、plugin API package、external plugin packages。

### 3.2 Rust crates

| 当前名称 | 目标名称 | 文件位置 |
|---------|---------|---------|
| `yaak-app` | `yakumo-app` | `src-tauri/Cargo.toml` |
| `yaak-models` | `yakumo-models` | `crates/yaak-models/Cargo.toml` |
| `yaak-plugins` | `yakumo-plugins` | `crates/yaak-plugins/Cargo.toml` |
| `yaak-cli` | `yakumo-cli` | `crates-cli/yaak-cli/Cargo.toml` |
| 其他 `yaak-*` crates | `yakumo-*` | 各 crates 目录 |

---

## 4. 内部代码引用（第三批处理 - 延后）

### 4.1 Rust module 名称

需要全局替换：
- `yaak_models::` → `yakumo_models::`
- `yaak_plugins::` → `yakumo_plugins::`
- 其他 `yaak_*` module 引用

### 4.2 TypeScript/JavaScript imports

需要全局替换：
- `@yaakapp-internal/*` → `@yakumo-internal/*`

---

## 5. 数据目录和系统路径（第二批处理）

| 当前路径 | 目标路径 |
|---------|---------|
| macOS: `~/Library/Application Support/app.yaak.desktop` | `~/Library/Application Support/app.yakumo.api` |
| Windows: `%APPDATA%/app.yaak.desktop` | `%APPDATA%/app.yakumo.api` |
| Linux: `~/.local/share/app.yaak.desktop` | `~/.local/share/app.yakumo.api` |

**注意**: 改 identifier 后数据目录会变化。这是新项目，不需要迁移旧数据。

---

## 6. CLI 和命令行工具（第三批处理）

| 当前 | 目标 |
|-----|-----|
| CLI 命令名: `yaak` | `yakumo` |
| CLI binary: `yaak` / `yaak.exe` | `yakumo` / `yakumo.exe` |
| CLI 帮助文案中的 "Yaak CLI" | "Yakumo CLI" |

---

## 7. GitHub Actions 和发布配置（第二批处理）

| 文件 | 需要修改 |
|-----|---------|
| `.github/workflows/release-app.yml` | 检查是否包含 Yaak 名称 |

已移除：CLI npm、plugin API npm、Flatpak、sponsors workflow。

---

## 8. 图标和视觉资产（第二批处理）

| 目录/文件 | 需要修改 |
|---------|---------|
| `src-tauri/icons/` | 替换为新 Yakumo API 图标 |
| README 截图链接 | 更新为 Yakumo API 截图 |
| 文档中的图片 | 更新品牌相关图片 |

---

## 9. Vendored 资源命名（暂不处理）

以下资源名称暂时保持不变，避免影响插件系统：
- `yaaknode` / `yaaknode.exe` (Node sidecar)
- `yaakprotoc` / `yaakprotoc.exe` (Protoc sidecar)
- `yaakcli` (CLI 工具，用于 plugin build)

---

## 10. 外部引用（保留或更新）

| 类型 | 处理建议 |
|-----|---------|
| 原始 Yaak 上游链接 | 保留来源说明 |
| yaak.app 网站 | 移除或替换为新网站（待定） |
| GitHub repository URL | 待新 repository 确定后更新 |

---

## 处理顺序建议

### 第一批（立即处理）
1. 用户可见文案：README、窗口标题、设置页、关于页
2. 不改变 identifier 和 deep link

### 第二批（验证稳定后）
1. Tauri identifier 和 deep link
2. macOS/Windows/Linux 打包配置
3. 图标替换

### 第三批（延后处理）
1. npm package 名称
2. Rust crate 名称
3. 内部代码引用
4. CLI 命令名

---

## 统计摘要

| 类别 | 需修改文件数 | 优先级 |
|-----|------------|--------|
| 用户可见文案 | ~15 | 高（第一批） |
| Tauri 配置 | ~5 | 高（第二批） |
| npm packages | ~30+ | 低（第三批） |
| Rust crates | ~15+ | 低（第三批） |
| 内部代码引用 | ~200+ | 低（第三批） |
| 图标 | ~10 | 中（第二批） |

**总计**: 约 260+ 处需要修改
