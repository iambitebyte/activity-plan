# Activity Plan · 活动日程管理与报名平台

面向线下技术大会（QECon / QCon 等）的自托管活动工具：多场活动的日程浏览、场次报名、活动感想留言、资料共享，以及按软件工程生命周期的内容分布分析和技术亮点洞察。

## 功能特性

- **多活动管理**：master-data 按活动分目录永久归档，历史活动的报名/留言/附件记录不丢失，顶部活动切换 Tab 默认聚焦最新活动
- **活动日程**：按天/时段浏览全部场次，支持专场、讲者、场馆、议题详情（背景/大纲/听众收益）
- **报名系统**：注册登录后一键报名/取消，实时显示报名人数与成员
- **活动感想**：文字留言 + 浏览器语音输入（Whisper STT，支持 Groq/硅基流动/OpenAI 兼容接口）
- **资料共享**：场次级 PDF 上传预览、图片上传与画廊浏览（20MB 上限，MD5 去重）
- **内容分布可视化**：场次按软件工程生命周期阶段（需求规划→架构设计→编码→代码评审→测试→发布→运维，一对多标签）统计，流水线视图 / 覆盖对比 / 阶段×时段热力矩阵 / 专场构成
- **技术洞察**：每场活动可附 `tech.md` 技术亮点分析（GFM Markdown，表格/列表/引用渲染），多活动横评
- **数据可携带**：日程与感想的导入/导出（JSON），跨实例迁移

## 技术栈

Next.js 16（App Router / Turbopack）· React 19 · Tailwind CSS 4 · better-sqlite3 · react-markdown

## 快速开始

```bash
pnpm install

# 配置环境变量（数据目录与可选的 STT key）
cat > .env <<'EOF'
DATA_DIR=/path/to/activity_data
GROQ_API_KEY=<可选，语音输入用>
EOF

# 开发
pnpm dev

# 生产（构建 + pm2 守护，默认端口 10034）
./start.sh
./stop.sh
```

## 数据与代码分离

所有运行时状态集中在一个可通过 `DATA_DIR` 配置的目录（默认 `../activity_data`），与代码仓库彻底分离，备份只需拷贝该目录：

```
activity_data/
├── db/qecon.db               # SQLite：用户/会话/报名/留言/上传记录
├── uploads/                  # 上传的 PDF/图片（UUID 文件名）
└── master-data/              # 活动日程，按活动分目录
    ├── <activity-a>/
    │   ├── meta.json         #   { "name": "显示名" }（可选）
    │   ├── tech.md           #   技术亮点分析（可选，「技术洞察」页渲染）
    │   ├── 20260904.json     #   每天一个文件：[{ time, topic, speaker, ... }]
    │   └── 20260905.json
    └── <activity-b>/...
```

- 场次 ID 格式为 `YYYYMMDD-序号`，数据库中的报名/留言通过 ID 关联，历史 master data 永久保留即历史记录始终可追溯；仅当两场活动撞同一日期时自动加活动前缀消歧
- 首次运行时若发现旧版数据（`~/.qecon/` 或项目内 `upload/`）会自动迁移至新目录

### 日程 JSON 字段

`time`（`YYYY-MM-DD HH:mm-HH:mm`）、`topic`、`speaker`、`venue`、`track`、`producer`、`speaker_title`、`speaker_bio`、`speakers_detail`、`stages`（生命周期标签数组，一对多）、`stage_summary`、`detail`（`intro/outline/gains`）、`track_url`

### 新增一场活动

1. `master-data/` 下新建文件夹（建议 `名称-年月`）
2. 放入按天命名的日程 JSON
3. 可选：`meta.json` 显示名、`tech.md` 技术分析
4. 重启服务即可

## License

[MIT](./LICENSE)
