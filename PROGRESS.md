# 项目进度总览 — Tongji Campus 3D Navigator

---

### 📦 项目文件说明 本次交付包含以下文件：

- `src/`：前端核心代码（页面、组件、样式）
-  `public/`：静态资源（图片、图标等）
- `index.html`：项目入口文件 
- `package.json`：依赖配置与启动命令 
- `vite.config.js`：Vite 项目配置 
-  `package-lock.json`：依赖版本锁定文件（加速安装） 
- `PROGRESS.md`：开发进度说明

---

### ⚙️ 运行前准备

请确保你的电脑已安装以下环境： 

- **Node.js**（推荐版本 v18+，可通过 `node -v` 检查）
-  **npm**（可通过 `npm -v` 检查）

---

### 🚀 运行步骤 

1. 解压文件:

2. 安装依赖:

   打开终端，进入解压后的项目目录，执行以下命令安装依赖： 

   ```npm install
   npm install
   ```

3. 依赖安装完成后，执行启动命令：

   ```npm run dev
   npm run dev

4.  预览页面

   在浏览器中打开终端提示的地址（默认 `http://localhost:5173`），即可看到项目页面。

---



## 成员B 已完成

### 1. Vue3 + ElementPlus 网页框架 ✅
- 主布局：左侧 Sidebar + 中央 3D 画布 + 底部 Dashboard
- 全局暗色主题，毛玻璃效果（backdrop-filter）
- ElementPlus 组件库集成，图标库全局注册

### 2. Sidebar 侧边栏 ✅
- Logo 与标题区域
- 搜索框（支持中英文搜索建筑名，回车触发定位）
- 语音搜索按钮（Web Speech API，点击后说话识别建筑名，自动定位）
- 6 个分类筛选标签：All / Academic / Culture / Dining / Sports / Admin
- 8 个建筑 POI 卡片列表，含图标、中英文名、开放时间
- 点击卡片 → 触发 3D 视角聚焦

### 3. CampusMap 3D 画布（占位） ✅
- Canvas 粒子动画模拟校园建筑点位
- 网格背景 + 建筑间连线
- 建筑聚焦高亮 + 详细弹窗（建筑图片占位、简介、开放时间、楼层、面积）
- 暴露 API：`flyToBuilding(building)`、`resetView()`
- 预留 viewMode 切换（Orbit / FPV）

### 4. Dashboard 底部面板 ✅
- 实时模拟数据：今日访客数（自增）、当前在线人数、当前时间（每秒更新）
- Trending 热门地点标签
- 选中建筑详情（面积、楼层、拥挤度）

### 5. 组件通信机制 ✅
- Sidebar → emit → App → CampusMap / Dashboard
- 搜索 → App.match → Sidebar/CampusMap 联动
- 语音 → App → Sidebar/CampusMap 联动

---

## 还需要做的事

### 成员A：3D 场景与引擎

| 任务 | 说明 |
|---|---|
| 获取同济 OSM 3D 白模 | 用 Blender-OSM 或 OSM2World 导出 glTF/glb |
| 接入 Three.js | 在 CampusMap.vue 中替换 Canvas 占位，加载 glb 模型 |
| Camera Orbit Controls | 鼠标拖拽旋转、滚轮缩放、右键平移 |
| Raycaster 射线检测 | 点击建筑 → 高亮变色 → 触发前端弹窗 |
| 配合 B 跑通通信 | "Vue 点击按钮 → 3D 建筑高亮/视角拉近" |
| WebGL 导出（如用 Unity）| 或直接用 Three.js 原生 |

### 成员C：交互功能 & 视频

| 任务 | 说明 |
|---|---|
| Feature 2：导航路线可视化 | 起点→终点选点，3D 连线 + 小人/光点动画 |
| Feature 3：语音识别完善 | 已预留按钮和 API 调用，C 需要调试 + 加中文识别 |
| 语音结果 → B 的搜索框 | 通信已就绪 |
| 7 分钟视频录制与剪辑 | 4 分钟功能演示 + 3 分钟分工与创意 |
| 英文旁白脚本 | 撰写并配音 |

### 成员B：还差

| 任务 | 说明 |
|---|---|
| 全英文 Report 终稿 | 6 要点：简介、面向用户、优缺点、改进、贡献比（已完成排版，待最终填充） |

### 联调 & 交付

| 任务 | 说明 |
|---|---|
| Phase 3 集成测试 | A 的 3D 嵌入 + C 的导航线 + 语音联调 |
| Bug 修复 | 各方面交叉测试 |
| 界面美化收尾 | 天空盒、粒子效果优化、毛玻璃细节 |
| 压缩包准备 | 整理文件结构，确保格式正确 |

---

## 给成员A的集成指引

`src/components/CampusMap.vue` 中：

1. **替换 Canvas** — 在 `three-placeholder` 处挂载 Three.js WebGLRenderer 的 domElement
2. **保留以下方法签名**供外部调用：

```js
// 选中建筑，外部调用
flyToBuilding(building)   // building = { id, name, nameZh, position, ... }

// 重置视角
resetView()

// 切换视角模式
toggleViewMode()          // orbit <-> fpv
```

3. **建筑数据来源** — 从 `props.buildings` 数组读取，每个建筑都有 `position.x/y`（0~1 归一化坐标）
4. **暴露方法** — 使用 `defineExpose({ flyToBuilding, resetView })` 已在模板中

启动项目后，页面中的 Sidebar 和 Dashboard 已经可用，A 只需专注 Canvas 内的 3D 渲染。
