# Yakumo API NOTICE

本项目是基于 Yaak 开源项目的衍生作品。

## 项目来源

Yakumo API 源自 [Yaak](https://github.com/mountain-loop/yaak)，由 Mountain Loop LLC 开发并开源。

原项目采用 MIT License 发布。

## 许可证

本项目继承原 Yaak 项目的 MIT License，完整许可证文本请见 [LICENSE](./LICENSE) 文件。

原版权声明：

```
Copyright (c) Mountain Loop LLC
```

## Yakumo API 修改说明

本项目在 Yaak 原代码基础上进行了以下修改：

- 迁移到 Bun 包管理器和 Vite 构建系统
- 品牌迁移为 Yakumo API
  - productName: Yakumo API
  - identifier: app.yakumo.api
  - deep link: yakumo://
- 环境变量名统一为 YAKUMO_* 前缀
- 添加中文本地化支持
- 添加开发文档

所有修改内容同样遵循 MIT License。

## 第三方素材

### 图标

当前图标沿用 Yaak 原项目图标作为 placeholder。后续替换时需记录新图标来源和许可证。

### 依赖

本项目使用的第三方依赖（npm packages、Rust crates）各自遵循其独立许可证。主要依赖包括：

- Tauri (Apache-2.0 / MIT)
- React (MIT)
- Vite (MIT)
- Bun (MIT)
- 以及其他间接依赖

完整依赖列表及其许可证可通过 `bun licenses` 或 `cargo license` 工具获取。

## 致谢

感谢 Mountain Loop LLC 及 Yaak 开源社区为本项目提供的基础代码和设计参考。

---

如有疑问，请联系项目负责人。