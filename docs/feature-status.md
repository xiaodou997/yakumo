# Yakumo API Feature Status

状态说明：`已实现` 表示当前代码路径存在并通过基础构建检查；`待修复` 表示入口存在但能力不完整或仍需回归验证；`待实现` 表示目标能力仍缺主要实现；`已移除` 表示第一阶段不再保留。

## 核心请求

| 功能 | 状态 | 说明 |
|------|------|------|
| HTTP REST | 已实现 | 桌面 App 和 `yaku send` 当前支持 HTTP 发送。 |
| GraphQL | 已实现 | 仍走 HTTP 请求 UI；已补请求 body/query 参数、JSON content-type、格式化入口和响应读取基础回归。 |
| gRPC | 已实现 | 桌面 App 保留反射、连接、发送、事件落库和状态清理入口；CLI send 暂不支持。 |
| WebSocket | 已实现 | 桌面 App 保留连接、发送、关闭、事件列表和状态清理入口；CLI send 暂不支持。 |
| SSE | 已实现 | 桌面 App 保留事件读取和展示入口；已修复 blob-backed response body 读取并补事件解析回归。 |
| Cookie jar | 待实现 | 旧模型路径已移除；Yaku-native cookie jar 需要重新设计存储、发送集成和 UI。 |

## 数据组织

| 功能 | 状态 | 说明 |
|------|------|------|
| Workspace / Folder / Environment | 已实现 | App 与 CLI 均保留基础 CRUD 路径。 |
| 请求/响应历史 | 已实现 | 桌面 App 保留历史模型和清理命令。 |
| Git / 文件系统同步 | 已移除 | 旧 AnyModel sync 路径已退出桌面入口；如需同步，后续按 Yaku-native 数据模型重建。 |

## 安全与认证

| 功能 | 状态 | 说明 |
|------|------|------|
| Basic / Bearer / API Key / JWT / OAuth2 | 已实现 | 内置 auth registry 已覆盖摘要标签、字段名、默认值和敏感字段配置回归。 |
| Workspace secrets | 待实现 | 旧 secure/template 命令已移除；后续需要 Yaku-native secrets store 与模板渲染。 |
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
| Yaku workspace backup | 已实现 | 桌面和 CLI 均支持 Yaku-native workspace backup import/export。 |
| Curl 导入 | 待实现 | 旧导入入口已移除；后续需要按 Yaku request config 重建。 |
| Yakumo legacy JSON | 已移除 | 不做启动自动迁移；如需要，只能后续做显式 one-way importer。 |
| Postman / Insomnia / OpenAPI 3 / Swagger 2 | 待实现 | 旧 AnyModel importer 已退出桌面入口；后续按 Yaku-native importer 重建。 |

## Actions 与响应处理

| 功能 | 状态 | 说明 |
|------|------|------|
| Copy as curl | 待实现 | 旧 action surface 已移除；后续应基于 Yaku request config 重建。 |
| Copy as grpcurl | 待实现 | 旧 action surface 已移除；后续应基于 Yaku gRPC config 重建。 |
| Workspace / Folder / WebSocket actions | 待实现 | 旧 action registry 已移除；Yaku tree/context menu 只保留基础 CRUD/send。 |
| 响应 body 读取 | 已实现 | Yaku run body 通过 `cmd_yaku_run_body_bytes` 读取。 |
| JSONPath / XPath 响应过滤 | 待实现 | 旧响应过滤入口已移除；后续在 Yaku body viewer 重建。 |
| JSON / GraphQL 格式化 | 已实现 | Tauri 格式化命令保留。 |

## CLI

| 功能 | 状态 | 说明 |
|------|------|------|
| `yaku` binary | 已实现 | 源码构建，本阶段不发布 npm 包。 |
| schema/list/show/create/update/delete | 已实现 | workspace/folder/environment/request 主路径已统一为稳定 JSON 输出，folder schema 也已补齐。 |
| HTTP / GraphQL / SSE / WebSocket / gRPC send | 已实现 | CLI send 走 `yaku-engine`，与桌面 Yaku send runtime 对齐。 |

## 已移除

| 功能 | 状态 | 说明 |
|------|------|------|
| JavaScript 插件安装/运行时 | 已移除 | 不再作为产品能力保留。 |
| npm CLI 发布 | 已移除 | `yaku` 仅源码构建。 |
| plugin API npm 发布 | 已移除 | 不维护旧插件 API 发布链路。 |
| Flatpak / sponsors / 旧 Yaak release 链路 | 已移除 | 后续按 Yakumo release scope 重建。 |
| License UI/runtime | 已移除 | 旧 license 插件和 Settings tab 不再作为 Yaku 第一阶段入口。 |

Last updated: 2026-05-21
