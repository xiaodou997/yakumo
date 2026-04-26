# Yakumo API 功能清单

状态说明：`已实现` 表示当前代码路径存在并通过基础构建检查；`待修复` 表示入口存在但能力不完整或仍需回归验证；`待实现` 表示目标能力仍缺主要实现；`已移除` 表示第一阶段不再保留。

## 核心请求

| 功能 | 状态 | 说明 |
|------|------|------|
| HTTP REST | 已实现 | 桌面 App 和 `yaku send` 当前支持 HTTP 发送。 |
| GraphQL | 待修复 | 仍走 HTTP 请求 UI，需补完整回归。 |
| gRPC | 待修复 | 桌面 App 保留反射、连接和发送入口；CLI send 暂不支持。 |
| WebSocket | 待修复 | 桌面 App 保留连接和发送入口；CLI send 暂不支持。 |
| SSE | 待修复 | 桌面 App 保留事件读取和展示入口。 |
| Cookie jar | 待修复 | 模型和 UI 存在，CLI 需继续补齐 AI 场景。 |

## 数据组织

| 功能 | 状态 | 说明 |
|------|------|------|
| Workspace / Folder / Environment | 已实现 | App 与 CLI 均保留基础 CRUD 路径。 |
| 请求/响应历史 | 已实现 | 桌面 App 保留历史模型和清理命令。 |
| Git / 文件系统同步 | 待修复 | 功能入口保留，需按 Yakumo release scope 复核。 |

## 安全与认证

| 功能 | 状态 | 说明 |
|------|------|------|
| Basic / Bearer / API Key / JWT / OAuth2 | 待修复 | 已迁移为内置 auth registry，仍需 schema/UI 回归。 |
| Workspace secrets | 已实现 | `cmd_secure_template` / `cmd_decrypt_template` 和 `secure()` 渲染使用 `EncryptionManager`。 |
| Client certificates | 待修复 | 设置和发送路径保留，需 smoke test。 |

## 模板函数

| 功能 | 状态 | 说明 |
|------|------|------|
| `secure` | 已实现 | 使用 workspace key 加密/解密。 |
| UUID / timestamp / hash / base64 / random / JSONPath / regex | 待修复 | 内置 Rust 函数和 Tauri summaries/config 已注册，参数和 UI 仍需补全验证。 |
| 环境变量渲染 | 已实现 | 由 `yakumo-templates` 和环境链解析处理。 |
| prompt / cookie / request / response / fs / XML | 待实现 | 插件移除后尚未迁移为内置函数。 |

## 导入导出

| 功能 | 状态 | 说明 |
|------|------|------|
| Curl 导入 | 已实现 | `cmd_curl_to_request` 和文件导入路径均使用内置 curl importer。 |
| Yakumo native JSON | 已实现 | 内置 importer 已补样例回归，覆盖 workspace/folder/http/gRPC/websocket 资源读取。 |
| Postman / Insomnia / OpenAPI 3 / Swagger 2 | 已实现 | 内置 importer 已支持主要 JSON 导入路径，并补了基础样例测试。 |
| 导出 JSON | 已实现 | 桌面导出命令保留。 |

## Actions 与响应处理

| 功能 | 状态 | 说明 |
|------|------|------|
| Copy as curl | 已实现 | 内置 HTTP request action 写入剪贴板。 |
| Copy as grpcurl | 已实现 | 内置 gRPC request action 写入剪贴板。 |
| Workspace / Folder / WebSocket actions | 已实现 | 内置 actions 已返回真实列表；Folder 支持 `Send All`（HTTP）与复制 ID。 |
| 响应 body 读取 | 已实现 | `cmd_http_response_body` 已注册。 |
| JSONPath / XPath 响应过滤 | 已实现 | 内置 JSONPath / XPath 过滤已接入响应体读取路径。 |
| JSON / GraphQL 格式化 | 已实现 | Tauri 格式化命令保留。 |

## CLI

| 功能 | 状态 | 说明 |
|------|------|------|
| `yaku` binary | 已实现 | 源码构建，本阶段不发布 npm 包。 |
| schema/list/show/create/update/delete | 待修复 | 已覆盖主要模型，需继续补 AI 友好输出一致性。 |
| HTTP send | 已实现 | 当前 CLI send 只支持 HTTP。 |
| gRPC / WebSocket send | 待实现 | 第一阶段明确 HTTP-only。 |

## 已移除

| 功能 | 状态 | 说明 |
|------|------|------|
| JavaScript 插件安装/运行时 | 已移除 | 不再作为产品能力保留。 |
| npm CLI 发布 | 已移除 | `yaku` 仅源码构建。 |
| plugin API npm 发布 | 已移除 | 不维护旧插件 API 发布链路。 |
| Flatpak / sponsors / 旧 Yaak release 链路 | 已移除 | 后续按 Yakumo release scope 重建。 |

最后更新：2026-04-25
