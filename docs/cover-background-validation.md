# 封面氛围背景 · CATLIGHT06

2026-11-12，继续当前节点。

- 控制台「背景氛围」增加「封面氛围背景」开关，默认开启；关闭后渐变恢复纯黑。
- 封面以 cover 比例填满屏幕，低饱和强虚化，黑色蒙层 86%，边缘再压暗；左侧封面卡片保持原样。
- 换封面 1.2 秒平滑过渡，连续切换从当前混合画面接续；减少动态偏好时直接切换。
- 独立保存已解码封面快照，避免封面图片换 src 期间调整窗口导致背景空白。
- 缓存长边 320px，仅封面/视口尺寸变化时进行模糊；稳定帧只合成缓存。背景不参与节奏明暗，screen 合成不压暗现有主光束。
- 三模式共用，刷新记忆、一次保存系统默认值、JSON 合并导出/导入均覆盖。兼容旧文件和服务端记录；不改写已有参数记录。
- 与主场景同画布合成，Cmd/Ctrl+S 包含背景。

验证：Node 语法及构建通过；preset-bundle、system-defaults、defaults-api 测试通过；新增默认开启迁移、false 值三模式保存/重载/JSON 往返、后端一致性校验覆盖。Netlify 构建适配通过，未发布 Netlify。

浏览器检查：投影/立体/悬浮切换，关闭恢复纯黑，关闭后刷新保持，重新开启同步到其他模式；暖色及冷色封面效果、卡片清晰、文字可读。截图见 qa/cover-background.jpg。未作用户设备帧率基准测试。

## 背景滑杆

- 背景模糊 0–60，默认24，保持原缓存尺度；蒙层压暗 0–100%，默认86%。
- 蒙层通过合成强度即时更新，不重做模糊；模糊值变化时只更新低分辨率缓存，不重启换封面过渡。
- 开关关闭隐藏两个滑杆，重新开启保留数值；旧配置缺字段时补24/86。
- 构建与 preset-bundle、system-defaults、defaults-api 通过，覆盖零值、上下限、三模式共用、默认保存、合并JSON往返、旧文件迁移与后端越界拒绝。
- 浏览器验证0/60模糊、30%/50%/100%蒙层即时效果、刷新保存、开关收起及恢复；默认24/86截图见 qa/background-sliders.jpg。未做用户设备帧率基准测试。

## Pixel blur correction (2026-11-12, CATLIGHT06)

- Removed Canvas2D filter dependency from the cover background. Three separable running-sum box passes approximate Gaussian blur; saturation remains 55%. Opaque clamped edge samples avoid transparent/black fringes at high strengths.
- Background blur range 0–120, default 24. Dimmer remains 0–100, default 86. Shared persistence and screenshot canvas composition unchanged.
- Unit checks: monotonically broader blur at 0/24/60/120, symmetric edges, constant colors/opacity, 1-pixel-wide inputs, no regeneration during stable rendering or dim-only changes. Warm local 320×180 kernel runs measured about 2.6–3.2 ms at 24–120; this is not a claim about every user's device.
- Browser QA (shared Chrome): 0 shows cover outlines; 24 removes fine detail; 60/120 progressively spread the color wash. Slider maximum 120 confirmed. Cover switch changes the background colors. Restored preview values 24/86. Screenshot shortcut produced a completed 1363×936 PNG download. Reopened it from the executor: lyrics, lamp and blurred background present; interface and cover panel absent. Actual Safari device testing remains outstanding.
- Existing preset-bundle, system-defaults, defaults-api tests passed. API accepts 120 and rejects 121; prior saved defaults remain untouched. Netlify output builds, but its live site is not published by this release.
- Screenshot: `docs/qa/background-blur-fixed.jpg`.
