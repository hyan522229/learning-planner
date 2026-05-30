# 学习规划应用 — 设计规格书

**日期:** 2026-05-30  
**版本:** 1.0 MVP

---

## 一、项目定位

一个遵循"科学建议者 + 执行记录者 + 节奏维护者"角色的学习规划 PWA。不监督用户、不提供学习内容，只做三件事：
1. 让用户不需要思考"接下来做什么"
2. 保证复习在科学的时间点发生（艾宾浩斯遗忘曲线）
3. 让用户看到自己的累积进展

---

## 二、技术栈

| 层 | 选型 |
|----|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite |
| 样式 | Tailwind CSS |
| 状态管理 | Zustand |
| 路由 | React Router v6 |
| 本地存储 | Dexie.js (IndexedDB 封装) |
| 动画 | Framer Motion |
| PWA | vite-plugin-pwa (Workbox) |

---

## 三、平台策略

- 一套代码，两个平台：桌面浏览器 + 安卓 PWA 安装
- 移动端：底部 4 Tab 导航
- 桌面端：左侧栏导航（≥768px 断点）
- 纯本地存储，零后端依赖
- Service Worker 离线缓存
- 配色：清冷高效风（低饱和冷色 + 大留白）
- 复习 → 橙色 (#f97316)，新学 → 蓝色 (#3b82f6)

---

## 四、页面结构

```
App
├── PersonGuard          — 无人物时引导创建
├── AppShell             — 响应式外壳
│   ├── Sidebar(桌面) / TabBar(移动)
│   └── Routes:
│       ├── TodayPage        — 默认首页，今日学习块列表
│       ├── ProjectsPage     — 学习/运动项目管理
│       ├── ProgressPage     — 进度总览 + 周热力图
│       └── SettingsPage     — 人物/环境/数据管理
└── Overlays:
    ├── TimerModal           — 全屏计时器
    ├── CompleteAnimation    — 完成动画
    └── ConfirmDialog        — 通用确认
```

### 4.1 今日页面 (TodayPage)

默认打开视图，包含：
- 日期 + 环境标签 + 已完成进度环
- 学习块列表：到期复习(橙) > 新学(蓝) > 已完成(灰)
- 每个学习块可点击进入计时器
- 底部统计栏：已完成数 / 复习知识点数 / 消灭错题数

### 4.2 项目管理 (ProjectsPage)

- 列表展示所有项目，每项显示类型图标 + 名称 + 进度条
- 新增/编辑弹窗：名称、类型(学习/运动)、度量单位、总量、当前进度、优先级
- 支持 6 种度量：页数、分钟、题数、词数、篇数、自定义
- 滑动删除，确认后移除

### 4.3 进度总览 (ProgressPage)

- 本周热力图（7 列 × 各项目行）
- 各项目进度条（已完成/总量），带动画
- 不展示"总学习时长"作为主指标
- 展示产出：完成块数、复习知识点数、消灭错题数

### 4.4 设置页 (SettingsPage)

- 人物名称 + 头像颜色修改
- 默认环境模板：可用时段、休息时长
- 数据导出 JSON / 导入 JSON / 清空数据（需二次确认）

---

## 五、数据模型 (IndexedDB)

### persons
| 字段 | 类型 | 说明 |
|------|------|------|
| id | auto | 主键 |
| name | string | 人物名称 |
| avatarColor | string | 头像颜色 hex |
| createdAt | number | 创建时间戳 |

### environments
| 字段 | 类型 | 说明 |
|------|------|------|
| id | auto | 主键 |
| personId | number | 所属人物 |
| name | string | 环境名（在家/在校/周末） |
| availableSlots | json | [{start:"06:00", end:"08:00"}, ...] |
| restDuration | number | 学习块间休息(分钟)，默认10 |
| lunchDuration | number | 午休时长(分钟)，默认30 |

### projects
| 字段 | 类型 | 说明 |
|------|------|------|
| id | auto | 主键 |
| personId | number | 所属人物 |
| name | string | 项目名称 |
| type | enum | "study" \| "sport" |
| measureType | enum | "pages" \| "minutes" \| "questions" \| "words" \| "articles" |
| totalAmount | number | 总量 |
| completedAmount | number | 已完成量 |
| priority | number | 1-5 用户优先级 |
| status | enum | "active" \| "completed" \| "archived" |
| createdAt | number | 创建时间戳 |

### knowledgePoints
| 字段 | 类型 | 说明 |
|------|------|------|
| id | auto | 主键 |
| projectId | number | 所属项目 |
| name | string | 知识点名称 |
| learnDate | string | 首次学习日期 YYYY-MM-DD |
| reviewNodes | json | [{node:"R1", dueDate, status, score?}, ...] |
| currentStage | string | 当前节点 R1-R10 |

### studyBlocks
| 字段 | 类型 | 说明 |
|------|------|------|
| id | auto | 主键 |
| projectId | number | 所属项目 |
| date | string | 日期 YYYY-MM-DD |
| type | enum | "new" \| "review" \| "wrongQuestion" \| "sport" |
| scheduledStart | string | 计划开始 HH:mm |
| scheduledDuration | number | 计划时长(分钟) |
| actualDuration | number | 实际耗时(分钟) |
| status | enum | "pending" \| "inProgress" \| "completed" \| "skipped" |

### wrongQuestions
| 字段 | 类型 | 说明 |
|------|------|------|
| id | auto | 主键 |
| projectId | number | 所属项目 |
| name | string | 错题名称 |
| markedDate | string | 标记日期 YYYY-MM-DD |
| reviewDates | json | [{date, status}] |
| status | enum | "pending" \| "mastered" |

### efficiencyRecords
| 字段 | 类型 | 说明 |
|------|------|------|
| id | auto | 主键 |
| projectId | number | 所属项目 |
| date | string | YYYY-MM-DD |
| estimatedDuration | number | 预估耗时 |
| actualDuration | number | 实际耗时 |
| amount | number | 完成量 |
| speed | number | 速度(单位/小时) |
| dailyScore | number | 日状态自评 1-5(可选) |

---

## 六、核心算法

### 6.1 艾宾浩斯复习引擎

复习节点线：R1(1d) → R2(2d) → R3(4d) → R4(7d) → R5(15d) → R6(30d) → R7(60d) → R8(90d) → R9(180d) → R10(360d)

复习评分规则：
- **已掌握** → 正常推进到下一节点
- **需重学** → 在当前节点额外插入一次补复习
  - 同节点出错 1 次：加插补复习，补完继续
  - 同节点出错 2 次：降级到上一节点
  - 连续出错 3 次：重置回 R1
- 默认不跳过任何节点；连续 3 次零压力才提示用户是否拉长间隔

### 6.2 日计划生成算法

```
1. 拉取硬性任务：
   - 到期复习节点 (dueDate ≤ today)
   - 即将到期复习 (dueDate ≤ today+2)
   - 待重做错题

2. 计算：R = 硬性任务总预估时长
         H = 环境可用时段总长

3. if R > H × 80%:
     仅排硬性任务，不排新学
   else:
     硬性任务先排 → 剩余时间按用户优先级 + 进度比例分配新学

4. 高强度科目之间插入缓冲块

5. 同紧急度内按用户优先级排序
```

### 6.3 速度校准（指数衰减加权）

```
speed = 0.6 × avg(近7天) + 0.3 × avg(8-21天) + 0.1 × avg(22天以上)
```

---

## 七、计时器交互

- 全屏模态页面
- 准备状态：显示项目信息 + 大号预估时长 + 播放按钮
- 运行状态：环形倒计时进度条 + 暂停/完成按钮
- 增减时长按钮（±5分钟），仅暂停状态可用
- 随时可提前完成（绿色 ✓ 按钮）
- 倒计时归零 → 完成动画 → 休息倒计时（默认10分钟，可跳过）
- 休息时间自由控制，不强制，只透明处理后续顺延

---

## 八、MVP 功能范围

### 包含
- [x] 单人物、单环境（默认模板）
- [x] 学习项目 CRUD（多种度量单位）
- [x] 今日学习规划自动生成
- [x] 学习块计时器 + 完成动画
- [x] 艾宾浩斯复习节点自动排期 + 评分
- [x] 进度条可视化（充电动画）
- [x] PWA 安装 + 离线可用
- [x] 数据导出/导入 JSON

### 不包含（后续阶段）
- 多环境模板切换
- 多人物数据隔离
- 效率热力图自动生成
- 中断恢复 / 温柔恢复日
- 认知负荷动态调节
- 错题生命周期（MVP 仅标记）
- 运动项目整合
- 成就徽章

---

## 九、用词规范

| 避免使用 | 使用 |
|----------|------|
| 任务 | 学习块 |
| 任务表 | 今日规划 |
| 截止日期 | 目标日期 |
| 未完成 | 待进行 |
| 逾期 | 等待复习 |
