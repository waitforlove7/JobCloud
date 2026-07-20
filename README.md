# JobCloud — 岗位技能星图

基于真实招聘 JD，将岗位、大类与技能建成可交互图谱，帮助快速比较岗位方向、技能热度与能力组合。

当前前端默认读取 `bytedance_jobs.json`（多公司技术岗合并数据），用 Three.js 三维星图 + Recharts 饼图展示关系；技能视图还支持「加点 DAG」模式。

## 快速开始

```bash
cd JobCloud-main
npm install
npm run dev      # 本地开发，默认 http://127.0.0.1:5173
npm run build    # 生产构建
npm run preview  # 预览构建结果
npm test         # 运行单元测试
```

可选：用 Playwright 重新抓取字节跳动岗位：

```bash
node scrape_bytedance_jobs.mjs [--max-pages N] [--start-page N] [--end-page N] [--output file] [--headful]
```

---

## 目录结构与文件说明

```
JobCloud-main/
├── index.html
├── package.json / package-lock.json
├── vite.config.mjs
├── scrape_bytedance_jobs.mjs
├── .gitignore
├── .openai/hosting.json
├── *.json / hardware_jobs_review.md    # 数据与审查文档
└── src/                                # 前端源码
```

### 工程配置

| 文件 | 作用 |
|------|------|
| `package.json` | 项目元信息与脚本：`dev` / `build` / `preview` / `test`；依赖 React 19、Vite、Three.js、Recharts、Playwright、lucide-react、Vercel Analytics 等 |
| `package-lock.json` | npm 依赖锁定文件，保证安装版本一致 |
| `vite.config.mjs` | Vite 配置，启用 `@vitejs/plugin-react` |
| `index.html` | 页面入口，挂载 `#root`，标题为「岗位技能星图」，加载 `src/main.jsx` |
| `.gitignore` | 忽略 `node_modules/`、`dist/`、系统文件与 `preview.png` |
| `.openai/hosting.json` | OpenAI/相关托管侧的项目标识配置（`project_id`） |

### 数据采集

| 文件 | 作用 |
|------|------|
| `scrape_bytedance_jobs.mjs` | Playwright 爬虫：翻页抓取字节跳动社招列表与详情，输出岗位 JSON；支持分页范围、并发、断点 partial、重试与 headful 模式 |

### 数据与文档

| 文件 | 作用 |
|------|------|
| `bytedance_jobs.json` | **应用主数据源**（`main.jsx` 直接 import）。当前为多公司技术岗合并结果（约 1236 条），字段含 `title` / `description` / `requirement` / `url` / `job_id` 等 |
| `bytedance_jobs_1.json` | 较早的字节跳动全量抓取结果（约 5405 条），可作为备份或对比 |
| `bytedance_jobs_532_pages.json` | 按页抓取的中间/分批结果（约 5313 条） |
| `example.json` | 精简样例数据（约 490 条完整条目），供单元测试与本地轻量调试使用 |
| `jobs_clean.json` | 脱敏/清洗尝试产物（URL、ID 等被改写）；当前 JSON 不完整，不宜直接作为应用输入 |
| `hardware_jobs_review.md` | 人工审查文档：列出归入「硬件」大类的岗位展示名与原始岗位名，用于校验分类规则 |

### 前端源码 `src/`

| 文件 | 作用 |
|------|------|
| `main.jsx` | 应用主入口：构建岗位图谱、视图切换（大类 / 技能）、技能模式（频次分布 / 加点 DAG）、侧栏信息面板、饼图与岗位列表交互，并接入 Vercel Analytics |
| `JobGalaxy.jsx` | Three.js 三维「岗位星图」：大类 / 岗位 / 技能节点与连线，支持旋转缩放、选中高亮、技能组合筛选 |
| `jobGraph.js` | 核心图数据层：岗位大类规则、技能词典、分类与技能抽取、图构建（`buildJobGraph`）、技能三元组统计、相关岗位排序等纯逻辑 |
| `jobGraph.test.mjs` | `jobGraph.js` 的单元测试（分类规则、技能抽取、图统计等） |
| `SkillDag.jsx` | 「加点 DAG」UI：可拖拽技能节点、按技能组布局，并根据已掌握技能评估可解锁岗位大类；含右侧 `SkillDagPanel` |
| `skillDag.js` | DAG 模型逻辑：技能分组、基于高频三技能组合的边、加点匹配评估与推荐技能 |
| `skillDag.test.mjs` | `skillDag.js` 的单元测试 |
| `CareerPath.jsx` | 职业路线可视化组件（分层技能树、进度环、解锁动画、侧栏要求清单）；当前未在 `main.jsx` 中挂载，属可复用模块 |
| `careerRoutes.js` | 职业路线定义与进度计算（前端 / 后端 / AI Agent / 算法 / 数据等路线的必选与任选技能） |
| `careerRoutes.test.mjs` | `careerRoutes.js` 的单元测试 |
| `styles.css` | 全站样式：深色主题、头部与英雄区、星图工作区、信息面板、饼图、技能云、职业路线等 |

---

## 功能概览

1. **大类视图**：把岗位聚合成前端、后端、算法、AI&Agent、数据、客户端、硬件等大类，查看类内技能频次与高频三技能组合。
2. **技能视图 · 频次分布**：按技能提及次数看全局/局部分布，可多选技能筛选同时命中的岗位。
3. **技能视图 · 加点 DAG**：点选已掌握技能，对照各方向高频技能组合，判断「点亮」进度。
4. **侧栏详情**：饼图占比、技能排行、关联岗位列表，以及跳转原始招聘链接。

## 数据如何进入图谱

```
招聘 JSON (bytedance_jobs.json)
        │
        ▼
  buildJobGraph()          ← jobGraph.js：分类规则 + 技能词典匹配
        │
        ▼
  图结构 (categories / jobs / skills / 统计与布局)
        │
        ├─► JobGalaxy      三维星图
        ├─► SkillDag       加点 DAG
        └─► InfoPanel      饼图与列表
```

岗位分类与技能命中规则集中在 `jobGraph.js` 的 `CATEGORY_RULES`、`SKILL_RULES` 与少量 `JOB_CATEGORY_OVERRIDES`；改词典或规则后刷新页面即可生效，无需改可视化组件。

## 技术栈

- **UI**：React 19 + Vite 8
- **三维可视化**：Three.js + OrbitControls
- **图表**：Recharts
- **图标**：lucide-react
- **爬虫**：Playwright
- **测试**：Node.js 内置 `node:test`
- **分析**：`@vercel/analytics`
