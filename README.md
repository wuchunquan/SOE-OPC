# 一人国企·OPC

一个面向日常办公场景的 AI 工作台项目，包含后台管理、AI 会话工作区、技能系统、知识库、文件管理和桌面端打包能力。

当前开源版本的核心定位是：

- 一个可本地运行的 AI Agent 工作台
- 一个带会话工作区的代码/文档协作界面
- 一个适合二次开发的 `Vue 3 + FastAPI + Tauri` 全栈项目

## 功能概览

- AI 会话与多会话管理
- 会话级工作区、文件上传、文件树与内容编辑
- 额外挂载目录支持
- 技能系统（`SKILL.md`）
- 工具调用、确认模式、计划模式
- 上下文压缩与会话恢复
- 角色/人设配置
- 用户个人知识库、角色知识库
- 公开角色访问入口
- 基础后台能力：用户、权限、配置、文档等
- Tauri 桌面端打包

## 技术栈

- 前端：Vue 3、Vite、Pinia、Vue Router、Element Plus
- 后端：FastAPI、SQLAlchemy、SQLite
- 桌面端：Tauri 2
- Agent Runtime：项目内置 `claw-code-agent` 适配层
- 打包：PyInstaller、Tauri

## 项目特点

- 每个 AI 会话都有独立工作区
- 支持将工作区之外的目录挂载给 Agent 访问
- 支持文件工具、命令工具、内部 API 工具
- 支持审批流，不同权限模式下行为不同
- 支持技能目录和会话级技能注入
- 支持本地桌面应用形态，也支持纯服务端运行

## 快速开始

### 环境要求

- Node.js `>= 20`
- pnpm `>= 8`
- Python `>= 3.11`
- 推荐使用 `uv`

### 1. 安装前端依赖

```bash
pnpm install
```

### 2. 安装后端依赖

```bash
cd pysrc
uv venv
uv pip install -r requirements.txt
```

### 3. 启动后端

默认本地配置文件是 `pysrc/static/conf/local.ini`，默认端口是 `8766`。

```bash
cd pysrc
python main.py local
```

### 4. 启动前端开发环境

默认前端开发端口是 `3006`。

```bash
pnpm dev
```

打开浏览器访问：

- 前端开发地址：`http://127.0.0.1:3006`
- 后端健康检查：`http://127.0.0.1:8766/health`

## 默认配置说明

当前仓库默认是 Agent 启用状态：

- 前端：`.env` 中 `VITE_ENABLE_AGENT=true`
- 后端：`pysrc/static/conf/local.ini` 中 `enable_agent=true`

本地模式下默认配置为：

- 数据库：`pysrc/static/sqlite.db`
- 后端端口：`8766`
- 前端端口：`3006`
- 运行模式：纯服务器模式，无托盘

## 目录结构

```text
.
├─ src/                 前端源码
├─ pysrc/               FastAPI 后端源码
│  ├─ modules/agent/    Agent 相关模块
│  ├─ claw_code_agent/  内置 Agent runtime
│  ├─ static/           后端静态资源与默认配置
│  └─ main.py           后端入口
├─ src-tauri/           Tauri 桌面端
├─ public/              前端静态资源
├─ BUILD.md             打包说明
└─ CONFIG.md            配置说明
```

## Agent 能力说明

当前开源版本的 Agent 主要围绕“会话工作区”展开：

- 会话独立工作区
- 自定义额外挂载目录
- 文件读取、搜索、编辑、写入
- 命令执行
- 技能目录加载
- 上下文压缩与恢复
- 工具审批与计划审批

这套机制适合做：

- 本地办公助手
- 文档整理助手
- 代码协作助手
- 内部知识库问答助手
- 桌面端 AI 工作台

## 打包

如果你要构建桌面版或后端可执行文件，请直接查看：

- [BUILD.md](./BUILD.md)

项目支持两种形态：

- 纯后端服务
- Tauri 桌面应用

## 配置

配置相关说明见：

- [CONFIG.md](./CONFIG.md)

## 开源说明

这个仓库更适合作为一个“可运行的项目骨架”和“二次开发基础工程”，而不是一个已经完全产品化的 SaaS 成品。

当前开源版本优先保留了这些能力：

- AI 会话主链路
- 工作区与文件系统
- 技能系统
- 审批模式
- 桌面端能力
- 基础后台模块

部分偏内部化、渠道化或特定场景的能力，在开源版本中可能默认隐藏、关闭或未作为主要入口暴露。

## 适合谁

- 想做本地 AI 工作台的人
- 想做桌面端 Agent 产品的人
- 想基于 FastAPI + Vue 继续扩展后台系统的人
- 想把 AI 会话、工作区、知识库、技能系统放进自己产品的人

## License

本项目使用 [GNU AGPL v3.0](./LICENSE)，许可证标识为 `AGPL-3.0-only`。
