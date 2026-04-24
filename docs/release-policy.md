# Yakumo API 发布规则

本文档记录 Yakumo API 项目的发布 tag 规则和版本管理策略。

## 当前 Tag 规则

项目继承自 Yaak，当前使用以下 tag 规则：

| 发布类型 | Tag 格式 | 触发 Workflow | 示例 |
|---------|---------|--------------|------|
| App Release | `v*` | `release-app.yml` | `v1.0.0`, `v1.0.1-beta` |
| CLI Release | `yaak-cli-*` | `release-cli-npm.yml` | `yaak-cli-0.4.0` |
| API Package | `yaak-api-*` | `release-api-npm.yml` | `yaak-api-0.9.0` |

## Tag 规则说明

### App Release (`v*`)

- 格式：`v<major>.<minor>.<patch>` 或 `v<version>-<prerelease>`
- 触发 Tauri 打包，生成 macOS/Windows/Linux 安装包
- prerelease 版本（如 `-beta`, `-rc`）会标记为 GitHub prerelease

### CLI Release (`yaak-cli-*`)

- 格式：`yaak-cli-<version>`
- 发布 `@yaakapp/cli` 及平台特定包到 npm
- 版本号从 tag 中提取

### API Package (`yaak-api-*`)

- 格式：`yaak-api-<version>`
- 发布 `@yaakapp/api` 到 npm
- 包含 plugin-runtime-types 类型定义

## 未来迁移规划

品牌迁移完成后，可能调整为：

| 发布类型 | 当前 Tag | 目标 Tag |
|---------|---------|---------|
| App Release | `v*` | `yakumo-api-v*` 或保留 `v*` |
| CLI Release | `yaak-cli-*` | `yakumo-cli-*` |
| API Package | `yaak-api-*` | `yakumo-api-*` |

**注意**：迁移前需与负责人确认，确保：
- npm package 名称同步更新
- 用户迁移文档完备
- 不删除历史 tag

## 重要规则

1. **不擅自创建/删除 tag**：所有 release tag 需负责人确认
2. **不 retag**：已发布的 tag 不得修改或覆盖
3. **不跳过验证**：发布前必须通过 CI lint/test/build
4. **版本号遵循 SemVer**：major.minor.patch 格式
5. **prelease 标签明确**：`-alpha`, `-beta`, `-rc` 等

## 发布流程

### App 发布

```sh
# 1. 确保代码已合并到 main
git checkout main
git pull

# 2. 运行完整验证
bun run typecheck
bun run lint
bun run build
cargo check -p yaak-app

# 3. 创建 tag（需负责人确认）
git tag v1.0.0
git push origin v1.0.0

# 4. GitHub Actions 自动构建并创建 Release
```

### CLI/API npm 发布

同上流程，使用对应 tag 格式触发 workflow。

## 相关文件

- `.github/workflows/release-app.yml`
- `.github/workflows/release-cli-npm.yml`
- `.github/workflows/release-api-npm.yml`
- `crates-tauri/yaak-app/tauri.release.conf.json`
- `npm/prepare-publish.js`