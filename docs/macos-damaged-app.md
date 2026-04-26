# macOS 提示“安装包损坏”临时解决指南

适用于当前未签名、未公证的 Yakumo API 测试版 macOS 安装包。

在正式接入 Apple Developer ID 签名和 Notarization 公证之前，从 GitHub Release 下载的 `.dmg` 或 `.app` 可能会被 macOS Gatekeeper 拦截，并显示以下提示：

- “Yakumo API 已损坏，无法打开。你应该将它移到废纸篓。”
- “无法验证开发者”
- “来自身份不明的开发者”

这通常不是安装包真的损坏，而是 macOS 对未签名应用的安全限制。

## 推荐处理方式

确认安装包来自项目 GitHub Release 后，按下面步骤处理。

1. 将 Yakumo API 拖入 `/Applications`。
2. 打开“终端”。
3. 执行以下命令：

```bash
xattr -dr com.apple.quarantine /Applications/Yakumo\ API.app
```

4. 再次打开 Yakumo API。

如果应用名或安装位置不同，也可以输入命令前半段后，把 `.app` 拖入终端自动补全路径：

```bash
xattr -dr com.apple.quarantine 
```

最终命令示例：

```bash
xattr -dr com.apple.quarantine /Applications/Yakumo\ API.app
```

## 仍然无法打开时

如果仍然被阻止：

1. 先尝试打开一次 Yakumo API，让 macOS 记录拦截信息。
2. 打开“系统设置”。
3. 进入“隐私与安全性”。
4. 在“安全性”区域找到 Yakumo API 的拦截提示。
5. 点击“仍要打开”。

也可以尝试右键点击应用，选择“打开”，再在弹窗中确认打开。

## 不推荐的做法

不建议为了运行测试版长期关闭 Gatekeeper：

```bash
sudo spctl --master-disable
```

如果你临时开启了“任何来源”，测试完成后建议恢复默认安全策略：

```bash
sudo spctl --master-enable
```

不建议关闭 SIP。关闭 SIP 会显著降低系统安全性，Yakumo API 测试版不需要这样做。

## 正式解决方案

正式发布前应接入：

- Apple Developer ID Application 证书签名
- Apple Notary Service 公证
- stapler 固化公证票据
- GitHub Actions 自动签名与发布

完成后，用户不再需要执行上面的临时命令。
