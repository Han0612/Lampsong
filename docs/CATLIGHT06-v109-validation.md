# CATLIGHT06 · v109 验证记录

## 范围
仅回退歌词渲染。基准为首次清晰度调整前 `b21e5f7a810b9fe969adfb5bd0cdb9c96526b586`；dist/caster.js 字节完全一致。原投影为212px高、宽度最多1400px，字形按原96px字体标尺采样。撤掉后台投影合成/清晰度采样、两套绘制路径切换和等待贴图冻结动画。旧异步实现及相关专属测试归档至 docs/history/projection-v108，不再随页面加载。

## 保留
现行换行、逐行推移及渐隐选项、边界、投影渐隐与透视参数、所有字体文件、模式独立设置、灯具/Disco/猫咪/UI 和管理服务。未改系统默认数据或管理秘密。

## 检查
11项：projection-rollback、shadow-fade-and-fan、lyric-layout-and-throw、visual-row-navigation、lyric-boundaries、lyrics-projection、system-defaults、console-interactions、ui-motion、clean-mode、defaults-api。
回退测试：原码逐字节对照；180帧、两模式、4行，共720次可见绘制；每行稳定复用缓存，缓存失效后当帧重新绘制，无后台等待。其余检查覆盖渐隐数值、远近透视与影长、逻辑换行、视觉行导航、独立参数、边界和默认服务。
浏览器：两种模式均已显示；逐行按钮、整屏渐隐、透视与渐隐滑杆、控制台开关正常。浏览器扩展有自身元数据日志，未发现本应用错误。

## 限制与验收
恢复原精度，静止时会比高清版本柔和。同步旧逻辑在新字形/新参数首次计算时仍可能有短暂耗时；不宣称所有设备恒定帧率。需用户实机重点验收：逐行推移、灯摆变形、连续切封面和调参数是否恢复旧版体验。此轮未实施灯具及猫咪后续TODO，见 CATLIGHT06-pending-todo.md。
