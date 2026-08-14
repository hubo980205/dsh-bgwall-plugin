# dsh-bgwall-plugin 背景图片墙（Background Wall）

把 DeepSeek Harness Web 界面的背景换成任意图片（远程 URL 或服务器本地文件），
支持**透明度 / 模糊 / 铺放方式**调节；控制面板位于「设置 → 背景图片」页，
关闭设置后背景保持生效。

- 背景图层：`body::before` 固定全屏层 + 主题 token 透明覆盖，图片与原始背景色平滑混合
- 本地图片经 Host `webServer` HTTP 路由同源加载，规避超长 data URL 在 CSS 中失效的问题（单张上限 15MB）
- 纯 JavaScript，无构建步骤；Client 半区为标准 Web 插件模块（`__ModuleLoader__` + `require('react')`）

## 安装

```bash
# 从 GitHub 安装（纯 JS 包，无需 prepare 构建）
dsh plugin --profile web add github:<你的用户名>/dsh-bgwall-plugin

# 或从 npm 安装（发布后）
dsh plugin --profile web add dsh-bgwall-plugin

# 或本地目录 / tarball
dsh plugin --profile web add ./dsh-bgwall-plugin
dsh plugin --profile web add ./dsh-bgwall-plugin-1.0.0.tgz
```

然后重启 `dsh --profile web` 并刷新浏览器（Host 行与 client 名单在启动时扫描）。

> 手动安装（不通过 `dsh plugin`）：把本包放入 `$DSH_HOME/profiles/node_modules`，
> 并在 profile 的 `cordis.patch.yml` 追加 `- insert: [{ id: bgwall, name: dsh-bgwall-plugin }]`。

## 使用

- 打开左下角「设置」→ 新增的「**背景图片**」页
- **图片来源**：粘贴图片 URL（https://…）点「应用」；或填服务器本地路径
  （相对路径基于工作区根目录解析，如 `dog.jpg`；绝对路径如 `/root/pic.png`），点「加载」
- 拖动「透明度 / 模糊」滑杆、选择「铺放方式」，可勾选「侧边栏背景也透明」
- 「清除背景」一键还原；页面刷新后背景恢复默认（不持久化）

## 包结构

```
dsh-bgwall-plugin/
├── package.json        # dsh.bundle（配置层）+ dsh.client（Web 名单）双清单
├── lib/index.js        # Host 半区（ESM Cordis 插件）：/bgwall/load 接口 + 图片路由
├── lib/client.js       # Client 半区（__ModuleLoader__ 模块）：常驻图层 + 设置页
└── cordis.patch.yml    # bundle 配置层：bgwall 插件行
```

## 加入 DeepSeek Harness 开源生态

官方（`CONTRIBUTING.md`）对社区插件的指引：**把项目发布到自己的 GitHub 仓库，
并为仓库添加 `dsh-plugin` 话题（topic）**，便于社区发现。官方仓库当前不接受外部
PR，插件生态是分布式的——本仓库即社区插件之一。

```bash
# 创建仓库并推送（gh CLI）
gh repo create dsh-bgwall-plugin --public --source . --push

# 添加发现话题（与 GitHub 页面 Settings → About → Topics 等效）
gh repo edit dsh-bgwall-plugin --add-topic dsh-plugin \
  --add-topic deepseek-harness --add-topic cordis
```

可选：发布到 npm 让 `dsh plugin add dsh-bgwall-plugin` 可直接安装：

```bash
npm login
npm publish
```

## 卸载

```bash
dsh plugin --profile web remove dsh-bgwall-plugin
```

## 限制

- 状态为会话内存态，不持久化（页面刷新后恢复默认背景）
- `/bgwall/load` 是本地调试接口，按 fs 服务沙箱策略放行
