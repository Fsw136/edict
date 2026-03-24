# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-03-24

### Changed — 现代化改造

**全面升级为现代企业职场风格的 UI 与交互体验。**

- **前端 UI**：所有组件文本从古代术语替换为现代企业用语（67+ 文件，1700+ 处修改）
- **CSS 视觉升级**：新增玻璃拟态效果、渐变背景、微动画、精致阴影、卡片悬浮光效
- **晨会动画**：升级为粒子效果 + 统计卡片 + 更丰富的视觉层次
- **看板组件**：增加统计摘要栏、空态优化、交互增强
- **高管面板**：新增统计卡片（总人数/在线/离线）、搜索功能、视觉增强
- **Agent 监控**：新增部门卡片渐变色、状态指示灯动画、统计概览
- **后端逻辑**：server.py、kanban_update.py、task.py 等全面更新
- **高管会议引擎**：court_discuss.py 全面重写为现代企业会议风格
- **11 个 Agent SOUL.md**：全部重写为现代职场人格设定
- **演示数据**：tasks_source.json、live_status.json 等 6 个 JSON 文件更新
- **dashboard.html**：原生看板 140+ 处术语替换 + 视觉升级
- **文档体系**：README、docs、examples 等 16+ 个 Markdown 文件更新
- **测试文件**：同步更新所有测试用例

### Added

- `CHANGELOG.md` — 变更日志
- `SECURITY.md` — 安全策略
- 前端空态组件（看板、结案报告、模板、高管面板）
- 卡片悬浮顶部光效动画
- 看板统计摘要栏（总数/进行中/已完成/阻塞）
- 高管面板搜索过滤功能
- Agent 监控部门统计概览

---

## [1.2.0] - 2026-03-01

### Added

- React 18 前端重构（TypeScript + Vite + Zustand，13 个功能组件）
- Agent 思考过程可视化（实时 thinking / 工具调用 / 返回结果）
- 远程 Skills 生态系统（GitHub/URL 一键导入，CLI + API + UI）
- 高管会议功能（多角色 LLM 驱动讨论引擎）
- 前后端一体化部署（server.py 同时提供 API + 静态文件服务）

### Fixed

- Agent ID 不匹配问题（`main` → `taizi`）
- LLM provider 超时自动重试
- 僵尸 Agent 进程检测与清理

---

## [1.1.0] - 2026-02-15

### Added

- 任务模板库（9 个预设模板 + 参数表单）
- 行业早报 + 飞书推送 + 订阅管理
- 模型热切换 + 技能管理
- 高管总览 + Token 消耗统计
- 小任务 / 会话监控
- 需求单数据清洗（路径/元数据/前缀自动剥离）
- 重复任务防护 + 已完成任务保护
- 端到端测试覆盖（17 个断言）

---

## [1.0.0] - 2026-01-20

### Added

- 多部门 Agent 架构（总裁办 + 管理中枢 + 执行部门 + 晨会播报官）
- 权限矩阵（严格的 Agent 间通信控制）
- 总控台实时看板（10 个功能面板）
- 任务叫停 / 取消 / 恢复
- 结案报告系统（自动归档 + 五阶段时间线）
- 晨会开场动画
- Docker 一键部署
- 一键安装脚本
