# Yakumo API 开发日志

本文档记录 Yakumo API 独立化项目的开发进度和关键决策。

---

## 2026-04-24 第一阶段：工具链迁移完成

### 关键决策确认

通过用户确认以下关键参数：

| 决策项 | 最终方案 |
|-----|---------|
| identifier | `app.yakumo.api` |
| deep link | `yakumo://` |
| crate/package 重命名 | 第二阶段后期统一处理 |
| 数据迁移 | 不需要（新项目） |
| 插件 runtime Bun 化 | 延后到第四阶段后 |
| 发布平台 | 仅 macOS |
| release tag | 继续使用 `v*` |
| Git 重建 | 第二阶段完成后 |
| 图标 | 先用 placeholder |
| 验证深度 | 基础验证 |

### 完成的任务

#### 1. vite-plus 残留清理
- `src/lib/model_util.test.ts`: `vite-plus/test` → `vitest`
- `src/components/core/Editor/twig/twig.test.ts`: `vite-plus/test` → `vitest`
- `src/vite-env.d.ts`: `vite-plus/client` → `vite/client`

#### 2. 环境变量名统一化 (YAAK_* → YAKUMO_*)
- `scripts/run-dev.mjs`: `YAAK_DEV_PORT` → `YAKUMO_DEV_PORT`
- `scripts/vendor-node.cjs`: `YAAK_TARGET_ARCH` → `YAKUMO_TARGET_ARCH`
- `scripts/vendor-protoc.cjs`: `YAAK_TARGET_ARCH` → `YAKUMO_TARGET_ARCH`
- `scripts/replace-version.cjs`: `YAAK_VERSION` → `YAKUMO_VERSION`
- `scripts/git-hooks/post-checkout.mjs`: 全部环境变量更新
- `npm/cli/index.js`, `npm/cli/bin/cli.js`: `YAAK_CLI_INSTALL_SOURCE` → `YAKUMO_CLI_INSTALL_SOURCE`
- `npm/prepare-publish.js`: `YAAK_CLI_VERSION` → `YAKUMO_CLI_VERSION`
- `plugins-external/mcp-server/src/index.ts`: `YAAK_PLUGIN_MCP_SERVER_PORT` → `YAKUMO_PLUGIN_MCP_SERVER_PORT`
- `.github/workflows/release-app.yml`: `YAAK_TARGET_ARCH` → `YAKUMO_TARGET_ARCH`
- `.github/workflows/release-cli-npm.yml`: `YAAK_CLI_VERSION` → `YAKUMO_CLI_VERSION`

#### 3. 文档优化
- `docs/yakumo-api-independentization-tasks.md`: 开发者称呼通用化（大黄 → 开发者）
- 同上文档：环境变量示例更新

### 验证结果

| 检查项 | 结果 |
|-----|-----|
| `bun run typecheck` | ✅ 通过 |
| `bun run lint` | ✅ 通过 |
| `bun run build` | ✅ 通过（有预期的非阻塞警告） |
| `cargo check -p yaak-models` | ✅ 通过 |
| `cargo check -p yaak-app` | ✅ 通过 |
| `bun.lock` 存在 | ✅ 存在 |
| `package-lock.json` 不存在 | ✅ 不存在 |
| vite-plus 残留 | ✅ 仅文档中有，代码中已清理 |

### Git 提交

```
commit b53d605d
feat: 第一阶段工具链迁移完成 - Bun/Vite/Tauri稳定
105 files changed, 4961 insertions(+), 17826 deletions(-)
```

---

## 2026-04-24 第二阶段：品牌迁移进度

### 已完成

#### 1. 品牌清单梳理
- 输出 `docs/brand-migration-inventory.md`
- 分类：用户可见、Tauri配置、内部代码等
- 确定处理优先级

#### 2. 用户可见品牌修改
- `README.md`: 标题改为 "Yakumo API"，添加中文描述和来源说明
- `CONTRIBUTING.md`: 改为 "Contributing to Yakumo API"
- `src/index.html`: `<title>` 改为 "Yakumo API"
- `src/commands/openSettings.tsx`: 窗口标题改为 "Yakumo API Settings"
- `src/lib/initGlobalListeners.tsx`: 更新通知文案
- `src/components/Settings/SettingsGeneral.tsx`: 更新隐私说明
- `src/components/responseViewers/WebPageViewer.tsx`: iframe title 更新

#### 3. Tauri 标识和 deep link
- `tauri.conf.json`:
  - `productName`: "Yaak" → "Yakumo API"
  - `identifier`: "app.yaak.desktop" → "app.yakumo.api"
  - deep link scheme: "yaak" → "yakumo"
- `tauri.development.conf.json`:
  - `productName`: "Daak" → "Yakumo API (Dev)"
  - `identifier`: "app.yaak.desktop.dev" → "app.yakumo.api.dev"
- `tauri.release.conf.json`:
  - `publisher`: "Yaak" → "Yakumo"
  - `copyright`: 更新来源说明
- `scripts/git-hooks/post-checkout.mjs`: worktree identifier 更新

#### 4. 图标 placeholder
- 保持现有 Yaak 图标作为临时 placeholder
- 待后续准备 Yakumo API 专属图标

### 验证结果

| 检查项 | 结果 |
|-----|-----|
| `bun run typecheck` | ✅ 通过 |
| `cargo check -p yaak-app` | ✅ 通过 |

### 延后任务（第三批）
- npm package 名称 (`@yaakapp/*` → `@yakumo/*`)
- Rust crate 名称 (`yaak-*` → `yakumo-*`)
- 内部代码 import 引用
- CLI 命令名

---

## 下一步

- Git 重建（待用户确认远端地址）
- 运行完整构建验证
- 冒烟测试

---

## 2026-04-24 Git 重建完成

### 执行步骤

1. 删除旧 `.git` 目录
2. `git init` 初始化新仓库
3. `git add .` 添加所有文件
4. `git commit` 创建初始提交

### 验证结果

```
$ git log --oneline
db1f926 (HEAD -> main) Initial Yakumo API codebase

$ git status
On branch main
nothing to commit, working tree clean
```

### 提交内容

- 1241 files changed, 117929 insertions
- 包含所有第一阶段、第二阶段改动
- 无旧历史记录，作为 Yakumo API 项目起点

### 远端状态

暂不配置远端，用户稍后手动添加。

---

## 当前状态总结

### 已完成 ✅

| 阶段 | 任务 | 状态 |
|-----|-----|-----|
| 第一阶段 | 工具链迁移（Bun/Vite/Tauri） | ✅ |
| 第一阶段 | 环境变量名统一 | ✅ |
| 第二阶段 | 品牌清单梳理 | ✅ |
| 第二阶段 | 用户可见品牌更新 | ✅ |
| 第二阶段 | Tauri identifier/deep link | ✅ |
| Git 重建 | 删除旧历史，初始提交 | ✅ |

### 延后处理 ⏳

- npm package 重命名 (`@yaakapp/*` → `@yakumo/*`)
- Rust crate 重命名 (`yaak-*` → `yakumo-*`)
- 内部代码 import 引用更新
- CLI 命令名 (`yaak` → `yakumo`)
- 图标替换（使用现有 placeholder）
- 第三阶段：插件 runtime Bun 化
- 第五阶段：冒烟测试（需人工执行）

---

## 2026-04-24 第四阶段剩余任务完成

### 已完成

| 任务 | 状态 |
|-----|-----|
| 4.1 清理 GitHub Actions | ✅ release-api-npm.yml npm ci → bun install |
| 4.2 发布规则文档 | ✅ docs/release-policy.md |
| 4.3 许可证说明 | ✅ NOTICE.md |

### 验证结果

- `bun run typecheck` ✓
- `bun run lint` ✓
- `bun run build` ✓
- `cargo check -p yaak-app` ✓

---

## 任务清单完成状态

根据 docs/yakumo-api-independentization-tasks.md 对比：

| 阶段 | 任务 | 状态 |
|-----|-----|-----|
| **第一阶段** | 1.1 检查工具链残留 | ✅ 完成 |
| | 1.2 检查 Dev 启动链路 | ✅ 完成（未人工验收） |
| | 1.3 检查 Build 链路 | ✅ 完成 |
| | 1.4 Biome/TypeScript 分工 | ✅ 完成 |
| **第二阶段** | 2.1 梳理品牌关键词 | ✅ 完成 |
| | 2.2 修改用户可见品牌 | ✅ 完成（未人工验收） |
| | 2.3 修改 Tauri 标识 | ✅ 完成（未人工验收） |
| | 2.4 替换图标 | ⏳ placeholder |
| **第三阶段** | 插件 runtime Bun 化 | ⏳ 延后 |
| **第四阶段** | 4.1 清理 GitHub Actions | ✅ 完成 |
| | 4.2 发布规则文档 | ✅ 完成 |
| | 4.3 许可证说明 | ✅ 完成 |
| | 4.4 Git 重建 | ✅ 完成 |
| **第五阶段** | 冒烟测试 | ⏳ 未执行（需人工） |

### 延后任务

- 图标替换（用户确认 placeholder）
- 第三阶段：插件 runtime Bun 化
- npm package/crate 重命名
- 第五阶段冒烟测试