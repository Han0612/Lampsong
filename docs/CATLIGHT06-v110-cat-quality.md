# CATLIGHT06 · v110 猫咪画质恢复与上沿跳走

## 恢复基准
- pre-v106 commit `420f81cb46a71f14907c266ea99584b3e9a7a552`，即引入光流插帧之前。
- `dist/cat-paw.js`、`dist/cat-visit.js` 与该基准逐字节一致。恢复原始图集、原始清晰画帧的直接采样与旧版灯光投影，不再使用后台形态重建或叠帧。
- 除 `exit-upper.webp` 外的26份图集逐字节保留，不锐化、不缩小、不重采样。
- 旧版有意保留原画帧节奏；没有宣称所有动作达到60张独立原画/秒。位移仍逐显示帧更新。

## 独立重做的上沿跳走
新16姿态：0–4侧向转头/胸部朝向观众，5–7屈腿收爪，8–10蹬离，11–15前爪朝下、后腿收起与尾巴平衡。保持单一清晰轮廓，不使用光流、模糊交叉渐变或独立拉伸四肢。

- 主场景使用0.68秒转身、0.28秒蓄力、0.16秒蹬离，起跳后向下加速，完全离开视口才结束。
- 起跳之前支持脚保持水平；起跳后锁定释放锚点，避免锚点从脚部切到身体时出现位置跳变。
- 素材一览中的上沿动作也使用同一个 `CatDeparture` 轨迹，暂停/逐帧检查仍显示原始完整姿态。

## 生成与文件
使用内置 imagegen，以 v106 上沿图集作为身份与毛色参考，重绘16格透明素材，再通过第二次 imagegen 修正所有格子的留白。生成原图为1536×1024，格子384×256；运行图集统一打包成2304×1536、每格576×384。这个打包放大不创造额外毛发细节，主体清晰度来自取消原先288×192的运行时轮廓重建。

- 原图：`art-source/cat-exits/upper-jump-v110.png`
- 原图联系表：`docs/CATLIGHT06-v110-upper-contact-sheet.png`（与生成原图一致，非额外重绘）
- 运行图集：`dist/cat-motion/exit-upper.webp`，lossless WebP，保留生成alpha。
- 测量：`docs/CATLIGHT06-v110-cat-alpha-bounds.json`。

生成提示要点：exact 4×4 atlas; same fluffy dark-plum kitten; turn toward viewer and look down, crouch, hindleg push, downward dive, visible face and forepaws; consistent body proportions and chest registration; true alpha, no cast shadow, no grids, no blur or ghosting. 第二次仅要求所有姿态统一缩小至78%，保留原姿态及细毛边，补足完整尾尖/脚并留出透明边距。包装脚本仅均匀重采样与测量，不改轮廓。

## 验证
- `node tests/cat-native-quality.cjs`：恢复源码精确比对；26图集二进制比对；左右两个方向×三个尺寸共6次完整跳走，16个姿态全部使用，持续向下并完全出画；全部格子的脚、尾、毛边留白检查。
- `node tests/cat-random.cjs`：2880次各姿态放置、1000次随机不重复、三种底沿退场通过。
- `node --check`：cat-paw、cat-exit、gallery review通过。
- 可视检查新联系表：正面/侧面脸可辨；末段前爪向下；完整尾巴和脚保留，无相邻格串像。

旧插帧专属测试归档在 `docs/history/cat-interpolation-v107/`；父任务应移除主页面的cat-motion-smooth脚本引用并不再打包旧worker/flow资源。
