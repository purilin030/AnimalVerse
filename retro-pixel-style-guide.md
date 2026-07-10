# Retro-Pixel Design Style Guide (复古像素风格设计指南)

本设计指南定义了 **AnimalVerse** 的“复古像素与新粗野主义（Retro-Pixel / Neo-Brutalist）”视觉风格。通过本指南，可以轻松将这一独特的复古游戏机界面扩展到项目的其他页面（如 `home.html`、`map.html`、`playback.html` 等）。

---

## 1. 设计系统代币与变量 (Design Tokens)

像素风格的核心是**硬朗的几何线条、纯色块和无渐变的阴影**。请在像素主题下严格遵循以下属性配置：

### A. 颜色系统 (Color System)
* **Ink (黑色主边框/主文字)**: `#0e0f0c` (用于所有边框、文字和偏移实体阴影)
* **Wise Green (高亮主色)**: `#9fe870` (用于激活状态、徽章背景及核心强调)
* **Wise Green Hover (悬停浅绿)**: `#cdffad` (用于按钮或项的悬停状态背景)
* **Canvas Soft (画布背景)**: `#e8ebe6` (页面底色，与背景图相融合)
* **White (表面色)**: `#ffffff` (卡片主体背景、下拉菜单面等)

### B. 字体角色 (Typography)
* **显示与UI字体 (Display & UI)**: `'Pixelify Sans', 'DotGothic16', monospace, sans-serif` (`var(--ff-pixel)`)
  * *应用场景*：页面标题、副标题、导航链接、按钮标签、筛选卡带、微型徽章。
* **数据与特殊标示 (Utility)**: `'JetBrains Mono', monospace` (`var(--ff-mono)`)
  * *应用场景*：视频时长、观看次数、纯数字数据。
* **正文阅读 (Body Text)**: `'Inter', sans-serif` (`var(--ff-body)`)
  * *应用场景*：视频作者信息、段落文字、长篇介绍。保持正文为无衬线字体以确保高可读性。

### C. 形状与阴影规则 (Shapes & Shadows)
* **圆角规则 (Border Radius)**:
  * 普通 UI 组件（按钮、输入框、菜单）：`4px` 或 `2px`（杜绝大圆角，保持方正感）。
  * 页面大容器（Header、Sidebar、卡片）：`0px`（完全直角）。
* **实体投影 (Flat Offset Shadows)**:
  * 绝不使用模糊投影（Blurry shadows）。
  * 必须使用实体偏移阴影，例如：
    * 按钮默认状态：`box-shadow: 2px 2px 0px #0e0f0c;`
    * 组件默认状态：`box-shadow: 3px 3px 0px #0e0f0c;`
    * 页面大卡片/容器：`4px 4px 0px #0e0f0c;`

---

## 2. 作用域隔离与样式结构 (Scoped Theme Pattern)

为防止影响非像素主题页面，所有的像素样式应以 **`.theme-pixel`** 作为选择器的根前缀。

### A. 步骤一：在 HTML 引入类名
在要应用像素风格的 HTML 页面中，直接在 `<body>` 标签中加入 `.theme-pixel`：
```html
<body class="theme-pixel">
  <!-- 页面结构 -->
</body>
```

### B. 步骤二：引入像素背景图
全局背景融合了低透明度的像素风景图与漂浮的像素星空颗粒：
```css
/* 像素风景背景层 */
.theme-pixel::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-image: url('../../assets/images/bg/daf4c7122863af5.png'); /* 像素云海风景 */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  opacity: 0.08; /* 浅背景纹理不透光度 */
  z-index: -2;
  pointer-events: none;
}

/* 暗色模式滤镜微调 */
[data-theme="dark"].theme-pixel::before {
  opacity: 0.04;
  filter: brightness(0.6) contrast(1.2);
}
```

---

## 3. 像素风核心组件标准 (Component Standards)

### A. 弹簧按压按钮 (Interactive Cartridge Buttons)
所有可交互的按钮、筛选药丸（Pills）、标签芯片（Chips），其交互模型为“**弹簧按压反馈**”：
* **未悬停**：位于原位，拥有厚实体阴影。
* **Hover (悬停)**：向上微浮 `1px`，阴影加厚。
* **Active/Pressed (激活/按下)**：物理性向右下移动 `2px`，阴影缩减为 `1px`，代表已牢牢按下。

```css
/* 基础按钮结构 */
.theme-pixel .my-button {
  font-family: var(--ff-pixel) !important;
  background: var(--clr-surface) !important;
  border: 2px solid var(--clr-primary) !important;
  border-radius: 4px !important;
  box-shadow: 2px 2px 0px var(--clr-primary) !important;
  transition: all 150ms ease !important;
}

/* 悬停微浮 */
.theme-pixel .my-button:hover {
  transform: translate(-1px, -1px) !important;
  box-shadow: 3px 3px 0px var(--clr-primary) !important;
  background: var(--clr-accent-hover) !important;
}

/* 按下压实 */
.theme-pixel .my-button:active,
.theme-pixel .my-button--active {
  transform: translate(2px, 2px) !important;
  box-shadow: 1px 1px 0px var(--clr-primary) !important;
  background: var(--clr-accent) !important;
}
```

### B. 像素风对话框/下拉菜单 (Retro Dialog Box)
菜单、弹窗和下拉列表应表现为 8-bit 的文本对话框：
```css
.theme-pixel .menu-container {
  border: 2px solid var(--clr-primary) !important;
  border-radius: 0px !important; /* 取消圆角 */
  box-shadow: 3px 3px 0px var(--clr-primary) !important; /* 硬投影 */
  background: var(--clr-surface) !important;
}

.theme-pixel .menu-item {
  font-family: var(--ff-pixel) !important;
  transition: all 150ms ease !important;
}

.theme-pixel .menu-item:hover {
  background: var(--clr-accent-hover) !important;
  color: var(--clr-primary) !important;
}
```

### C. 像素风加载状态 (Stepper Box Loader)
用一个阶梯缩放的像素块动画，替换原有的平滑旋转圈：
```css
/* 旋转圈转换为像素块 */
.theme-pixel .loading-spinner {
  width: 16px !important;
  height: 16px !important;
  border: 3px solid var(--clr-primary) !important;
  border-radius: 0px !important; /* 纯方块 */
  background: var(--clr-accent) !important;
  animation: pixel-box-loader 1s steps(4) infinite !important; /* 阶梯 steps 动画 */
}

@keyframes pixel-box-loader {
  0% { transform: scale(1); background: var(--clr-accent); }
  50% { transform: scale(0.7); background: var(--clr-primary); }
  100% { transform: scale(1); background: var(--clr-accent); }
}
```

---

## 4. 扩展新页面（Home, Map 等）的简易实操流程

若您想在下一次开发中将 **地图页面 (map.html)** 也改成像素风，只需两步：

1. **第一步 (HTML)**：打开 `map.html`，在 `<body>` 标签中添加像素作用域类名：
   ```html
   <body class="theme-pixel">
   ```
2. **第二步 (CSS)**：打开其关联的 `css/pages/map.css`，在文件底部追加以 `.theme-pixel` 开头的专有组件样式。例如：
   ```css
   /* 地图控制面板像素化 */
   .theme-pixel .map-panel {
     border: 3px solid var(--clr-primary) !important;
     border-radius: 0px !important;
     box-shadow: 4px 4px 0px var(--clr-primary) !important;
     background: var(--clr-surface) !important;
   }
   
   .theme-pixel .map-title {
     font-family: var(--ff-pixel) !important;
   }
   ```
这样不仅能秒变像素风格，又能保障整个项目不同页面的主题独立与可维护性。
