# 灯下词 · CATLIGHT06 v148 开发调试包

导出日期：2026-11-13。准确版本见 EXPORT-VERSION.json；历史文档中的旧版本号仅代表当时记录。

## 本地启动

- Mac：解压后双击 Start-Mac.command，需要 Python 3。若系统不允许直接打开，可在终端进入本目录执行 `python3 offline/serve.py`。
- Windows：安装 Python 3 后双击 Start-Windows.bat。
- 开发者：安装 Node.js 22 或更新版本，在本目录执行 `node scripts/preview.mjs`，访问 http://localhost:4173。前端预览不需要 npm install。
- Python 启动器默认打开 http://127.0.0.1:8840；端口被占用时会另选空闲端口。浏览器存储按地址和端口隔离，建议关闭旧服务后复用同一地址。
- 请通过本地 HTTP 服务打开，勿直接双击 dist/index.html。按 Ctrl+C 停止服务。

## 交付内容与调试

`dist/` 就是未压缩的前端源码和运行素材，不是只有编译产物。修改后刷新浏览器即可；Node 预览设置 no-store，Python 预览必要时强制刷新。浏览器开发者工具可查看 Console、Network、Storage 和 Canvas。

| 位置 | 内容 |
| --- | --- |
| dist/index.html、style.css、console.css | 主界面、布局与控制台 |
| dist/app.js、presets.js、defaults.js | 应用状态、三模式 JSON 导入导出、内置默认参数 |
| dist/caster.js、cover-background.js、sleeve.js | 歌词投影、封面背景和封面翻转 |
| dist/cat-*.js、cat-motion/、cat-stills/、cat-sleep/ | 猫咪交互与完整动画素材 |
| dist/fonts/、covers/、audio/、materials/ | 完整字体、封面、试听音频与材质 |
| worker/、netlify/ | 系统默认值与封面歌词的服务端实现及适配层 |
| scripts/、tests/ | 构建工具及已有回归测试 |
| docs/、art/、art-source/、checkpoints/ | 设计和历史验证资料、美术源素材、节点记录 |

当前包含封面背景的细分模糊调节，以及翻转背面 10% 不透明度的淡封面。字体与媒体保持原文件，未降低质量。

## 设置与 JSON

一份“导出全部 JSON”保存投影、立体、悬浮三种模式及共用参数。音频、图片和系统默认值不包含在这份 JSON 中。

本包已内置用户提供的「悬浮歌词 · 系统默认-全部模式.json」，副本见 dist/defaults/user-presets.json。首次打开以及切换三种模式时自动采用其中的视觉参数，无需再次导入。静态预览的“恢复默认”恢复到这份用户参数。使用本包专用浏览器存储键，避免旧本地版本缓存覆盖初始设置；后续本地修改仍会记住。封面与播放状态继续沿用项目逻辑，JSON 不是完整运行画面的快照。

“保存预设”和当前参数保存在当前浏览器的 localStorage。导入 JSON 后再压缩项目文件夹，不会将这些浏览器设置带给别人。分享时应附 JSON 让接收方导入，或由开发把经过确认的 JSON 接入初始配置。

## 服务端能力边界

两个本地启动器都只提供静态前端，不启动系统默认值保存服务。`/api/system-defaults` 和 `/api/cover-lyrics/:cover` 在静态预览中不可用，读取失败时会回退到本包内置的用户参数；“设为系统默认值”和“设为此封面默认歌词”不能在此模式保存，也不会修改线上项目。相应 404/不支持请求日志属于该运行模式的限制。

如需调试服务端，先执行 `node scripts/build-console.mjs` 生成 Worker 配置和入口。实现使用 ASSETS 静态资源、BUCKET 存储，以及 SYSTEM_DEFAULTS_PASSWORD 服务端配置；请由开发在独立本地或测试环境配置这些依赖。构建命令只生成文件，不会部署。

Netlify 适配需要 `npm ci` 安装锁定依赖，随后 `npm run build:netlify`。该适配使用独立持久化存储与密码校验器；netlify/seed.json 已同步这份用户参数作为新部署的种子，不会覆盖已有服务器存储。仅打包源码不等于已配置后端。

## 验证命令

在项目根目录使用 Node.js 22 或更新版本：

```sh
node scripts/build-console.mjs
node tests/local-bundled-presets.cjs
node tests/cover-background.cjs
node tests/defaults-api.mjs
```

包内保留其他历史测试，供相关功能修改时使用。完整媒体和字体使用许可沿用项目中的许可文件与来源说明。
