# 灯下词 · Lampsong

灯下词是一个能拨动吊灯、翻唱片和看歌词摆动的网页。拖动灯再松手，字影会跟着光线摇晃。当前源码基于 CATLIGHT06 v148。

## 在本地打开

- Windows 安装 Python 3 后双击 `Start-Windows.bat`。
- macOS 安装 Python 3 后双击 `Start-Mac.command`，也可以运行 `python3 offline/serve.py`。
- 使用 Node.js 22 或更新版本时，可以运行 `node scripts/preview.mjs`，再访问 `http://localhost:4173`。

## 玩法

- 切换投影、立体和悬浮歌词，调节字体、排版和逐字起伏。
- 更换吊灯和封面，试听内置音乐或播放本地音频。音乐可以驱动字和灯的节奏，歌词按设定间隔换行。
- 点击猫爪召唤剪影猫。按 `F` 隐藏界面，按 `Ctrl+S` 或 `⌘S` 保存画面。
- 控制台支持导入和导出三种模式的参数。个人设置保存在当前浏览器，本地预览使用内置默认预设。

浏览器端的源码和运行素材在 `dist/`。保存共享默认值需要配置后端，详见 [本地开发说明](README-LOCAL.md)。
