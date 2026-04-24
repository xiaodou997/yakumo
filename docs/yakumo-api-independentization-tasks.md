# Yakumo API 独立化后续开发任务清单

这份文档给后续开发者使用，目标是把当前 Yaak fork 逐步整理成独立项目 `Yakumo API`。请按阶段推进，不要一次性大改。每完成一个小任务，都先运行对应验证命令，再继续下一步。

## 0. 开发前必读

### 当前状态

- 第一阶段工具链迁移已经基本完成：主入口是 `bun run dev`，包管理器是 Bun，前端构建使用官方 Vite。
- 当前仍保留 Yaak 的应用名、Tauri identifier、deep link scheme、crate/package 名称，避免第一阶段破坏启动和插件系统。
- 插件运行时仍使用 vendored Node：`crates-tauri/yaak-app/vendored/node/yaaknode`。
- 后续品牌统一目标是 `Yakumo API`，已记录在 `TODO.md`。

### 工作原则

- 每次只做一个小范围任务，不要跨阶段混改。
- 不要删除 MIT License 和 Yaak 原版权声明。
- 不要直接 `commit`、`push`、`tag`，除非负责人明确要求。
- 不要在未验证前删除 `.git`；Git 重建是最后步骤。
- 改配置前先搜索全仓库，确认同名配置是否有多处。
- 修改 Tauri、插件 runtime、发布配置时，一定要同时检查 macOS、Windows、Linux 影响。

### 常用命令

```sh
bun install
node scripts/ensure-vendored.mjs
bun run dev
bun run typecheck
bun run lint
bun run build
cargo check -p yaak-models
cargo check -p yaak-app
```

如果 `wasm-pack` 缺失，运行：

```sh
bun run bootstrap:install-wasm-pack
```

如果 vendored 资源缺失，运行：

```sh
node scripts/ensure-vendored.mjs
```

## 1. 第一阶段收尾：确保 Bun + Vite + Tauri 稳定

### 1.1 检查工具链残留

**目标**：确认项目不再依赖 Vite+ 和 npm-only 流程。

**要检查的关键词**：

```sh
rg "vite-plus|@voidzero|\bvp\b|npm run|npm install|run-s|run-p|package-lock"
```

**处理方式**：

- 如果是构建脚本里的 `npm run`，改成 `bun run`。
- 如果是测试 import 里的 `vite-plus/test`，改成 `vitest`。
- 如果是文档示例里的 `npm install`，改成 Bun 示例。
- 如果是历史说明、第三方文档引用，可以保留但要确认不误导开发者。

**验收标准**：

- `bun.lock` 存在。
- `package-lock.json` 不存在。
- `package.json` 的 `packageManager` 是 Bun。
- `bun run typecheck` 通过。
- `bun run lint` 通过。

### 1.2 检查 Dev 启动链路

**目标**：新手运行 `bun run dev` 时，自动准备必要 vendored 资源并打开 Tauri 开发环境。

**重点文件**：

- `package.json`
- `scripts/run-dev.mjs`
- `scripts/run-workspaces-dev.mjs`
- `scripts/ensure-vendored.mjs`
- `crates-tauri/yaak-app/tauri.conf.json`
- `crates-tauri/yaak-app/tauri.development.conf.json`

**要确认的行为**：

- `bun run dev` 会先检查 vendored 资源。
- 缺少 `vendored/protoc/include` 时会运行 `vendor:vendor-protoc`。
- 缺少 `vendored/plugin-runtime/index.cjs` 时会构建插件 runtime。
- 缺少 `vendored/plugins` 时会构建并复制 bundled plugins。
- 缺少 `vendored/node/yaaknode` 或 `yaaknode.exe` 时会下载 Node sidecar。
- Vite dev server 使用 `YAKUMO_DEV_PORT`，默认端口是 `1420`。
- Tauri devUrl 和 Vite 端口保持一致。

**验收命令**：

```sh
node scripts/ensure-vendored.mjs
bun run dev
```

**人工验收**：

- App 窗口能打开。
- 控制台不再出现 `vendored/protoc/include` 缺失。
- 修改 `.env.local` 中 `YAKUMO_DEV_PORT=1421` 后，Tauri 能连到对应端口。

### 1.3 检查 Build 链路

**目标**：确保 `bun run build` 至少完成 workspace 构建、模板 wasm 构建、前端构建。

**重点文件**：

- `package.json`
- `crates/yaak-templates/package.json`
- `crates/yaak-templates/build-wasm.cjs`
- `src-web/package.json`
- `src-web/vite.config.ts`

**验收命令**：

```sh
bun run build
```

**允许存在的非阻塞警告**：

- Vite chunk size warning。
- PostCSS 插件缺少 `from` option 的 warning。
- wasm-pack/cargo 的 future incompatibility warning。

**不允许存在的问题**：

- `wasm-pack: command not found`。
- `vite-plus` 找不到。
- `Package subpath './internal' is not defined`。
- plugin build 因并行顺序失败。

### 1.4 检查 Biome 和 TypeScript 分工

**目标**：Biome 只做基础 lint/format，严格类型检查交给 TypeScript。

**重点文件**：

- `biome.json`
- `package.json`
- `src-web/package.json`

**建议策略**：

- Biome 不要一开始打开太多风格规则，否则会被历史代码淹没。
- 先保持 `bun run lint` 通过。
- 后续如果要提高 lint 严格度，单独开任务处理，不要混在重构任务里。

**验收命令**：

```sh
bun run lint
bun run typecheck
```

## 2. 第二阶段：品牌迁移到 Yakumo API

这一阶段开始真正改名。请先完成第一阶段验证，再做这里的任务。

### 2.1 梳理所有品牌关键词

**目标**：列出所有需要改名的地方，先做清单，不急着修改。

**搜索命令**：

```sh
rg "Yaak|yaak|YAAK|app\.yaak|yaak://|@yaak|@yaakapp|yaakapp"
```

**建议分类记录**：

- 用户可见文案：菜单、设置页、关于页、README、窗口标题。
- Tauri 配置：productName、identifier、deep link scheme。
- 包名和 crate 名：`@yaakapp/*`、`yaak-*`。
- Rust module/crate 内部名称。
- 数据目录、配置目录、缓存目录。
- CLI 名称和 npm package。
- GitHub Actions、release artifact 名称。
- 插件 package 名称。
- 文档、截图、图标。

**输出文件建议**：

- `docs/brand-migration-inventory.md`

**验收标准**：

- 每一类都有搜索结果和处理建议。
- 明确哪些第一批改，哪些延后改。

### 2.2 修改用户可见品牌

**目标**：先改用户能看到的名称，不动底层 identifier。

**优先修改**：

- README 标题和描述。
- App 关于页、设置页中的产品名。
- 窗口标题或菜单中显示的 `Yaak`。
- 文档中的项目名称。

**暂时不要修改**：

- Tauri `identifier`。
- deep link scheme。
- 数据目录名称。
- crate/package 名称。

**验收命令**：

```sh
bun run typecheck
bun run lint
bun run build
```

**人工验收**：

- App 窗口和设置页显示 `Yakumo API`。
- 原有中文翻译仍正常。
- 没有新出现英文/中文混乱的关键按钮。

### 2.3 修改 Tauri 标识和 deep link

**目标**：把桌面 App 的系统级身份从 Yaak 切到 Yakumo API。

**重点文件**：

- `crates-tauri/yaak-app/tauri.conf.json`
- `crates-tauri/yaak-app/tauri.development.conf.json`
- `crates-tauri/yaak-app/Capabilities` 或 `capabilities` 目录
- Rust 中处理 deep link 的文件，例如 `crates-tauri/yaak-app/src/uri_scheme.rs`
- macOS entitlement / plist 相关文件

**建议修改项**：

- `productName`: `Yakumo API`
- `identifier`: 例如 `app.yakumo.api` 或负责人指定值
- deep link scheme: 例如 `yakumo` 或 `yakumo-api`

**注意事项**：

- 改 identifier 会影响系统数据目录，旧数据可能不会自动迁移。
- deep link 改动会影响 OAuth 回调、外部链接打开、CLI 唤起。
- 发布前要确认 macOS/Windows/Linux 打包配置都同步。

**验收命令**：

```sh
bun run build
cargo check -p yaak-app
```

**人工验收**：

- App 能启动。
- OAuth/deep link 相关入口不报错。
- 开发环境和正式构建配置一致。

### 2.4 替换图标和视觉资产

**目标**：为 Yakumo API 使用独立图标，避免继续使用 Yaak 品牌资产。

**重点目录**：

- `crates-tauri/yaak-app/icons/`
- `src-web` 中引用图标或 logo 的组件
- README 中的图片链接

**建议步骤**：

1. 准备源图标，例如 `icons/icon.png` 和 `icons/icon-dev.png`。
2. 运行：

```sh
bun run icons
```

3. 检查生成的 macOS `.icns`、Windows `.ico`、PNG 是否存在。
4. 启动 App 看 dock/taskbar 图标是否正确。

**验收标准**：

- release/dev 图标都能生成。
- README 不再引用 Yaak 上游图标。
- App 打包资源中包含新图标。

## 3. 第三阶段：插件 runtime Bun 化实验

这一阶段风险较高。不要在第二阶段品牌迁移未稳定前开始。

### 3.1 梳理现有 Node runtime 启动逻辑

**目标**：理解 Rust 侧如何启动 `yaaknode`。

**重点文件**：

- `crates/yaak-plugins/src/nodejs.rs`
- `crates/yaak-plugins/src/manager.rs`
- `packages/plugin-runtime/package.json`
- `packages/plugin-runtime/src/`
- `crates-tauri/yaak-app/vendored/plugin-runtime/index.cjs`

**要记录的问题**：

- Rust 侧 Node binary 路径在哪里拼出来？
- 插件 runtime 是 CJS 还是 ESM？
- runtime 依赖哪些 Node API？
- 插件和 App 之间如何通信？gRPC、WebSocket 还是 stdio？
- 打包时 Tauri 如何把 binary 加进 resources？

**输出文件建议**：

- `docs/plugin-runtime-runtime-analysis.md`

### 3.2 抽象 JavaScript runtime 配置

**目标**：Rust 不要写死 `yaaknode`，而是可以选择 Node 或 Bun。

**建议设计**：

- 新增 enum：`JavaScriptRuntimeKind::Node | Bun`。
- 新增配置结构：包含 binary path、runtime args、env。
- 默认仍使用 Node。
- dev 模式可以通过环境变量切换，例如：

```sh
YAKUMO_PLUGIN_RUNTIME=bun bun run dev
```

**重点验收**：

- 默认 Node 行为完全不变。
- 设置 Bun 实验变量时，只影响插件 runtime，不影响前端构建。
- 切换失败时错误信息清楚。

### 3.3 增加 vendored Bun 下载脚本

**目标**：类似 `scripts/vendor-node.cjs`，增加 Bun runtime 的下载脚本。

**建议文件**：

- `scripts/vendor-bun.cjs`
- `scripts/ensure-vendored.mjs`
- `package.json`
- `crates-tauri/yaak-app/tauri.conf.json`

**要支持的平台**：

- macOS arm64/x64
- Linux arm64/x64
- Windows x64/arm64（如 Bun 官方支持）

**验收标准**：

- 下载后生成类似 `vendored/bun/yakumobun` 或 `yakumobun.exe`。
- 校验 SHA256，不要只下载不校验。
- `node scripts/ensure-vendored.mjs` 能自动补齐 Bun runtime。

### 3.4 验证插件兼容性

**目标**：确认 Bun 能否运行现有 `packages/plugin-runtime` 的 CJS bundle。

**建议测试项**：

- 插件列表能加载。
- 模板函数插件可用：UUID、timestamp、json、xml、prompt。
- 认证插件可用：basic、bearer、jwt、oauth2。
- importer 插件可用：Postman、OpenAPI、Insomnia、curl。
- WebSocket/gRPC 相关插件不崩溃。

**保底策略**：

- 如果 Bun runtime 兼容性不足，不要强行替换。
- 保留 Node fallback。
- 文档中明确：Bun 是包管理和前端构建主工具，插件 runtime 可继续用 Node。

## 4. 第四阶段：发布与仓库独立化

### 4.1 清理 GitHub Actions

**目标**：CI 和 release 不再使用 Vite+ 或 npm-only 命令。

**重点目录**：

- `.github/workflows/`

**检查项**：

```sh
rg "vite-plus|setup-vp|vp install|vp test|npm ci|npm run" .github
```

**建议替换**：

- `setup-vp` -> `oven-sh/setup-bun`
- `vp install` -> `bun install --frozen-lockfile`
- `vp test` -> `bun run test`
- `npm run ...` -> `bun run ...`

**验收标准**：

- CI 能安装依赖。
- CI 能执行 lint/typecheck/test/build。
- release workflow 中 app 和 CLI tag 规则清晰。

### 4.2 明确 tag 和发布规则

**当前约束**：

- App release 使用 `v*` tag。
- CLI release 使用 `yaak-cli-*` tag。
- 未来要改名时必须重新定义 tag 规则。

**建议新规则**：

- App：`v*` 暂时保留，或迁移到 `yakumo-api-v*`。
- CLI：未来可迁移到 `yakumo-cli-*`。
- API package：未来可迁移到 `yakumo-api-*` 或独立 npm tag。

**必须做的事**：

- 修改前先和负责人确认。
- 不要擅自 retag。
- 不要删除历史 tag。

**输出文件建议**：

- `docs/release-policy.md`

### 4.3 补充来源与许可证说明

**目标**：独立项目仍保留开源归属说明。

**重点文件**：

- `LICENSE`
- `README.md`
- `NOTICE.md`（建议新增）

**建议内容**：

- 本项目基于 Yaak 开源项目演进。
- 保留原 MIT License 和版权声明。
- 新增 Yakumo API 后续修改的说明。
- 如果替换图标、字体、第三方素材，需要记录来源和许可证。

**验收标准**：

- 没有删除原版权声明。
- README 能清楚说明项目来源。
- 新增素材来源可追溯。

### 4.4 Git 重建

**目标**：在技术迁移稳定后，把当前目录作为新项目初始历史。

**前置条件**：

- `bun run typecheck` 通过。
- `bun run lint` 通过。
- `bun run build` 通过。
- `cargo check -p yaak-models` 通过。
- `cargo check -p yaak-app` 通过。
- 负责人确认要删除旧 Git 历史。
- 负责人确认新远端地址。

**操作建议**：

```sh
# 只在负责人确认后执行
rm -rf .git
git init
git add .
git commit -m "Initial Yakumo API codebase"
git remote add origin <NEW_REMOTE_URL>
```

**注意**：

- 不要自动 push。
- 不要带旧 upstream remote。
- 如果需要保留旧历史备份，先复制整个目录或打包备份。

## 5. 第五阶段：核心功能冒烟测试

每次完成一个大阶段，都要做一次桌面 App 冒烟测试。

### 5.1 REST 请求

**步骤**：

1. 启动：`bun run dev`。
2. 新建 workspace。
3. 新建 HTTP GET 请求。
4. 请求一个公开测试接口，例如本地 mock 或 `https://httpbin.org/get`。
5. 查看 Body、Headers、Cookies、Timeline。

**验收标准**：

- 请求能发送。
- 响应能显示。
- Timeline 不报错。
- 中文界面文案正常。

### 5.2 GraphQL

**步骤**：

1. 新建 GraphQL 请求。
2. 填写 endpoint。
3. 打开 schema/introspection 相关入口。

**验收标准**：

- GraphQL 编辑器能打开。
- 不因为 Vite/Bun 迁移导致页面崩溃。

### 5.3 gRPC

**步骤**：

1. 新建 gRPC 请求。
2. 选择或导入 proto。
3. 检查是否能读取 `vendored/protoc/include`。

**验收标准**：

- 不再出现 `vendored/protoc/include` 缺失。
- proto 相关错误能正常提示，而不是启动失败。

### 5.4 WebSocket 和 SSE

**步骤**：

1. 新建 WebSocket 请求。
2. 新建 SSE 请求。
3. 连接测试服务。

**验收标准**：

- 入口能打开。
- 连接失败时有正常错误提示。
- 不出现白屏或前端 crash。

### 5.5 导入导出

**步骤**：

1. 打开导入弹窗。
2. 尝试 Postman/OpenAPI/curl 导入入口。
3. 打开导出弹窗。

**验收标准**：

- 弹窗能打开。
- 中文文案正常。
- 插件 importer 不崩溃。

### 5.6 插件

**步骤**：

1. 打开插件相关页面或触发插件功能。
2. 测试内置模板函数：UUID、timestamp、json path。
3. 测试认证插件：Basic、Bearer、JWT。

**验收标准**：

- 插件列表能加载。
- 插件 runtime 没有启动失败。
- `vendored/plugin-runtime/index.cjs` 存在。
- `vendored/node/yaaknode` 存在。

## 6. 推荐开发顺序

开发者可以按这个顺序做：

1. 先跑通本地环境：`bun install`、`node scripts/ensure-vendored.mjs`、`bun run dev`。
2. 完成第一阶段收尾检查，确保没有 Vite+/npm-only 残留。
3. 写 `docs/brand-migration-inventory.md`，只做清单，不改代码。
4. 改用户可见品牌为 `Yakumo API`，不改 identifier。
5. 做一次完整冒烟测试。
6. 修改 Tauri identifier、deep link、系统级配置。
7. 替换图标和 README 视觉素材。
8. 补充 `NOTICE.md` 和发布策略文档。
9. 设计插件 runtime Bun 实验，但默认保持 Node。
10. 所有验证通过后，再由负责人决定是否重建 Git。

## 7. 每个任务完成后的汇报模板

完成任务后，按这个格式写给负责人：

```md
## 本次完成

- 做了什么：
- 修改了哪些文件：
- 没有改哪些高风险项：

## 验证结果

- `bun run typecheck`：通过/失败，失败原因：
- `bun run lint`：通过/失败，失败原因：
- `bun run build`：通过/失败，失败原因：
- `cargo check -p yaak-models`：通过/失败，失败原因：
- `cargo check -p yaak-app`：通过/失败，失败原因：

## 人工测试

- App 是否能打开：
- REST 请求是否正常：
- 插件是否正常：
- 中文文案是否正常：

## 下一步建议

- 建议继续做：
- 需要负责人确认：
```
