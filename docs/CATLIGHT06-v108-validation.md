# CATLIGHT06 v108 · 关闭按钮焦点框修复

v107发布后用户指出控制台关闭按钮偶发金色椭圆框。原因是全局button:focus-visible外扩6px的金色outline，在打开控制台时closePanel.focus()与浏览器输入方式启发式共同触发，并非系统故障。

本次对closePanel明确关闭hover/active/focus/focus-visible下的outline、border和box-shadow；保留键盘焦点与Esc关闭，键盘聚焦仅提亮X图标。其余v107灯具、猫咪、投影和管理秘密保持不变。

验证：控制台通过鼠标和键盘打开后关闭按钮均无外框；键盘仍可关闭和返回设置入口。构建与CSS差异检查通过。
