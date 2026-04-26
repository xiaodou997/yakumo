# Yakumo API 功能清单

状态说明：`已实现` 表示当前代码路径存在并通过基础构建检查；`待修复` 表示入口存在但能力不完整或仍需回归验证；`待实现` 表示目标能力仍缺主要实现；`已移除` 表示第一阶段不再保留。

## 核心请求

| 功能 | 状态 | 说明 |
|------|------|------|
| HTTP REST | 已实现 | 桌面 App 和 `yaku send` 当前支持 HTTP 发送。 |
| GraphQL | 已实现 | 仍走 HTTP 请求 UI；已补请求 body/query 参数、JSON content-type、格式化入口和响应读取基础回归。 |
| gRPC | 已实现 | 桌面 App 保留反射、连接、发送、事件落库和状态清理入口；CLI send 暂不支持。 |
| WebSocket | 已实现 | 桌面 App 保留连接、发送、关闭、事件列表和状态清理入口；CLI send 暂不支持。 |
| SSE | 已实现 | 桌面 App 保留事件读取和展示入口；已修复 blob-backed response body 读取并补事件解析回归。 |
| Cookie jar | 已实现 | 模型和 UI 存在；CLI `cookie-jar list`、默认 jar 解析、发送携带和响应后持久化已补回归。 |

## 数据组织

| 功能 | 状态 | 说明 |
|------|------|------|
| Workspace / Folder / Environment | 已实现 | App 与 CLI 均保留基础 CRUD 路径。 |
| 请求/响应历史 | 已实现 | 桌面 App 保留历史模型和清理命令。 |
| Git / 文件系统同步 | 已实现 | 功能入口保留；同步目录解析、基础 git 状态/操作入口和 git 相对路径边界已复核。 |

## 安全与认证

| 功能 | 状态 | 说明 |
|------|------|------|
| Basic / Bearer / API Key / JWT / OAuth2 | 已实现 | 内置 auth registry 已覆盖摘要标签、字段名、默认值和敏感字段配置回归。 |
| Workspace secrets | 已实现 | `cmd_secure_template` / `cmd_decrypt_template` 和 `secure()` 渲染使用 `EncryptionManager`。 |
| Client certificates | 已实现 | 设置路径保留；HTTP/gRPC/WebSocket 发送路径均接入证书匹配，已补 URL/端口匹配回归。 |

## 模板函数

| 功能 | 状态 | 说明 |
|------|------|------|
| `secure` | 已实现 | 使用 workspace key 加密/解密。 |
| UUID / timestamp / hash / base64 / random / JSONPath / regex | 已实现 | 内置 Rust 函数和 Tauri summaries/config 已对齐，已补元数据覆盖回归。 |
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
| schema/list/show/create/update/delete | 已实现 | workspace/folder/environment/request 主路径已统一为稳定 JSON 输出，folder schema 也已补齐。 |
| HTTP send | 已实现 | 当前 CLI send 只支持 HTTP。 |
| gRPC / WebSocket send | 待实现 | 第一阶段明确 HTTP-only。 |

## 已移除

| 功能 | 状态 | 说明 |
|------|------|------|
| JavaScript 插件安装/运行时 | 已移除 | 不再作为产品能力保留。 |
| npm CLI 发布 | 已移除 | `yaku` 仅源码构建。 |
| plugin API npm 发布 | 已移除 | 不维护旧插件 API 发布链路。 |
| Flatpak / sponsors / 旧 Yaak release 链路 | 已移除 | 后续按 Yakumo release scope 重建。 |

最后更新：2026-04-26
