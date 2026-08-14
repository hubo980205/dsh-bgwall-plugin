# dsh-bgwall-plugin 背景图片墙（Background Wall）

把 DeepSeek Harness Web 界面的背景换成任意图片（远程 URL 或服务器本地文件），
支持**透明度 / 模糊 / 铺放方式**调节；控制面板位于「设置 → 背景图片」页，
关闭设置后背景保持生效。

## 功能

- 背景图片两种来源：远程图片 URL，或服务器本地文件路径（相对路径基于工作区根目录解析）
- 透明度 0–100% 实时调节：图片与原始界面背景色平滑混合，不会出现黑屏
- 模糊 0–40px、铺放方式（铺满 / 适应 / 拉伸）
- 「侧边栏背景也透明」开关、一键「清除背景」
- 本地图片经 Host HTTP 路由同源加载，规避超长 data URL 在 CSS 中失效的问题（单张上限 15MB）
- 纯 JavaScript，无构建步骤

## 安装

```bash
# 从 GitHub 安装
dsh plugin --profile web add github:hubo980205/dsh-bgwall-plugin

# 或从 npm 安装（发布后）
dsh plugin --profile web add dsh-bgwall-plugin

# 或本地目录 / tarball
dsh plugin --profile web add ./dsh-bgwall-plugin
dsh plugin --profile web add ./dsh-bgwall-plugin-1.0.0.tgz
```

安装后重启 `dsh --profile web` 并刷新浏览器（Host 行与 client 名单在启动时扫描）。

> 手动安装：把本包放入 `$DSH_HOME/profiles/node_modules`，并在 profile 的
> `cordis.patch.yml` 追加 `- insert: [{ id: bgwall, name: dsh-bgwall-plugin }]`。

## 使用

1. 打开左下角「设置」→ 新增的「**背景图片**」页
2. **图片来源**：
   - 粘贴图片 URL（https://…）→ 点「应用」
   - 或填服务器本地路径（如 `dog.jpg` 或 `/root/pic.png`）→ 点「加载」
3. 拖动「透明度 / 模糊」滑杆、选择「铺放方式」实时预览
4. 「清除背景」一键还原

> 说明：状态为会话内存态，不持久化——页面刷新后背景恢复默认。

## 包结构

```
dsh-bgwall-plugin/
├── package.json        # dsh.bundle（配置层）+ dsh.client（Web 名单）双清单
├── lib/index.js        # Host 半区（ESM Cordis 插件）：/bgwall/load 接口 + 图片路由
├── lib/client.js       # Client 半区（__ModuleLoader__ 模块）：常驻图层 + 设置页
└── cordis.patch.yml    # bundle 配置层：bgwall 插件行
```

## 卸载

```bash
dsh plugin --profile web remove dsh-bgwall-plugin
```

## License

MIT
