# 一人国企·OPC

一个面向办公场景的 AI 工作台，包含后台管理、AI 会话工作区、文件系统、技能系统、知识库，以及 `pywebview` 桌面端。

## 项目定位

- 本地可运行的 AI Agent 工作台
- 带独立会话工作区的文档/代码协作界面
- 可二次开发的 `Vue 3 + FastAPI + pywebview` 全栈项目

## 核心能力

- AI 会话与多会话管理
- 会话级工作区、文件树、内容编辑
- 额外挂载目录
- 技能系统（`SKILL.md`）
- 工具调用、确认模式、计划模式
- 上下文压缩与会话恢复
- 角色/人设、知识库、公开角色入口
- 基础后台：用户、权限、配置、文档
- 桌面运行与桌面打包

## 技术栈

- 前端：Vue 3、Vite、Pinia、Vue Router、Element Plus
- 后端：FastAPI、SQLAlchemy、SQLite
- 桌面端：pywebview
- Agent Runtime：项目内置 `claw`
- 打包：PyInstaller

## 目录结构

```text
.
├─ src/                         前端源码
├─ pysrc/                       后端源码
│  ├─ desktop.py                pywebview 桌面入口
│  ├─ main.py                   FastAPI 入口
│  ├─ common/                   配置、路径、数据库、启动公共逻辑
│  ├─ modules/agent/            Agent 相关模块
│  ├─ claw/                     内置 Agent runtime
│  └─ static/                   默认配置、文档、静态资源
├─ build/
│  ├─ pywebview/scripts/        桌面打包脚本
│  ├─ pywebview/spec/           PyInstaller spec
│  ├─ pywebview/work/           PyInstaller 工作缓存
│  └─ pywebview/release/        桌面打包产物
├─ public/                      前端 public 资源
└─ README.md
```

## 环境要求

- Node.js `>= 20`
- pnpm `>= 8`
- Python `>= 3.11`
- 推荐使用 `uv`

## 快速开始

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

支持 3 套后端配置：

- `local`：桌面客户端本地后端，默认端口 `8766`
- `remote`：服务端模式，默认端口 `8005`
- `self_use`：自用模式本地后端，默认端口 `8005`

```bash
cd pysrc
python main.py local
python main.py remote
python main.py self_use
```

默认端口：

- 本地客户端配置：`8766`
- 服务端配置：`8005`

健康检查：

- `http://127.0.0.1:8766/health`
- `http://127.0.0.1:8005/health`

### 4. 启动前端开发环境

```bash
pnpm dev
```

默认前端开发地址：

- `http://127.0.0.1:3006`

### 5. 启动桌面端

先构建前端：

```bash
pnpm build
```

再按模式启动：

```bash
pnpm desktop:client
pnpm desktop:service
pnpm desktop:self-use
pnpm desktop:self-use:dev
```

含义：

- `desktop:client`
  - 桌面客户端模式
  - 使用 `pysrc/static/conf/local.ini`
  - 本地后端 `8766`
  - 可进入本地页面或远程 `desktop_entry_url`
- `desktop:service`
  - 服务端模式
  - 使用 `pysrc/static/conf/remote.ini`
  - 只启动后端，不打开 pywebview
- `desktop:self-use`
  - 自用模式
  - 使用 `pysrc/static/conf/self_use.ini`
  - 数据目录走 exe 同级 `static`
  - 自动登录预置账号
  - pywebview 直接进入本机服务地址
- `desktop:self-use:dev`
  - 自用模式开发联调
  - pywebview 直接进入本地 Vite 页面
  - 仍按 `self_use` 运行时规则处理 API、自动登录和界面裁剪

前端开发联调时，也可以让 pywebview 指向 Vite：

```bash
pnpm desktop:client:dev
```

## 运行模式

这个项目现在是“一套后端 + 一个桌面启动器”，可以跑三种模式。

### 1. 服务端模式

适合部署到服务器或局域网机器。

- `runtime_mode=service`
- 使用普通后端配置
- `local_agent=false`
- 数据、数据库、静态目录都放在可执行文件同级目录
- 默认端口 `8005`

### 2. 桌面客户端模式

适合单机桌面运行。

- `runtime_mode=desktop_client`
- `local_agent=true`
- 本地后端跑在 `8766`
- 数据目录走 appdir
- 页面可进入本地页面，也可以进入预配置的远程 `desktop_entry_url`

### 3. 自用模式

适合单机自用、本地部署给个人或单台机器。

- `runtime_mode=self_use`
- 启动 pywebview，但数据目录走 exe 同级 `static`
- 默认端口 `8005`
- 自动登录预置账号
- 本地页面和本地 API 使用同一地址
- 不使用 NewAPI 额度/邀请体系
- 隐藏云端 AI、本地/远程切换、额度和邀请码入口
- 保留桌面端能力，例如打开 Knowledge Base 和 Skills 当前目录

## 推荐启动方式

开发时通常只需要这 4 组命令：

```bash
pnpm dev
pnpm backend:service
pnpm backend:self-use
pnpm desktop:client:dev
pnpm desktop:self-use:dev
```

可以这样理解：

- 做纯前端页面开发：`pnpm dev`
- 调服务端模式接口：`pnpm backend:service`
- 调自用模式接口：`pnpm backend:self-use`
- 调桌面客户端壳子：`pnpm desktop:client:dev`
- 调自用模式桌面壳子：`pnpm desktop:self-use:dev`

生产/打包时再使用：

```bash
pnpm desktop:client
pnpm desktop:service
pnpm desktop:self-use
pnpm build:desktop
```

## 配置说明

### 后端配置文件

配置文件 section 为：

```ini
[系统配置]
```

常用配置项：

```ini
[系统配置]
name=一人国企·OPC
app_dir_name=一人国企·OPC
db=sqlite.db
port=8005
enable_agent=true
enable_tray=false
local_agent=false
desktop_entry_url=
runtime_mode=service
auto_login_username=admin
auto_login_password=admin123
```

字段说明：

- `name`
  - 产品显示名
- `app_dir_name`
  - 本地 appdir 目录名
- `db`
  - 数据库文件路径
- `port`
  - 后端端口
- `enable_agent`
  - 是否启用 Agent
- `enable_tray`
  - 当前项目已不再使用托盘，保留兼容字段
- `local_agent`
  - 兼容旧字段
  - 现在以 `runtime_mode` 为准，不建议再单独依赖它判断模式
- `desktop_entry_url`
  - 桌面客户端启动时进入的远程页面地址
- `runtime_mode`
  - `service` / `desktop_client` / `self_use`
- `auto_login_username`
  - 自用模式自动登录用户名
- `auto_login_password`
  - 自用模式自动登录密码

### 默认配置文件

- `pysrc/static/conf/local.ini`
- `pysrc/static/conf/remote.ini`
- `pysrc/static/conf/default.ini`
- `pysrc/static/conf/self_use.ini`

### 三种典型配置

服务端模式：

```ini
[系统配置]
runtime_mode=service
name=一人国企·OPC
app_dir_name=一人国企·OPC
db=sqlite.db
port=8005
local_agent=false
desktop_entry_url=
```

桌面客户端模式：

```ini
[系统配置]
runtime_mode=desktop_client
name=一人国企·OPC
app_dir_name=一人国企·OPC
db=static/sqlite.db
port=8766
local_agent=true
desktop_entry_url=https://your-server.example.com
```

自用模式：

```ini
[系统配置]
runtime_mode=self_use
name=一人国企·OPC
app_dir_name=一人国企·OPC
db=static/sqlite.db
port=8005
local_agent=false
desktop_entry_url=
auto_login_username=admin
auto_login_password=admin123
```

### 启动时配置选择

```bash
cd pysrc
python main.py local
python main.py remote
python main.py self_use
python main.py D:\\path\\to\\config.ini
```

桌面端也支持读取外部 `config.ini`：

- 如果可执行文件同级有 `config.ini`，会优先使用它
- 没有时才回退到内置默认配置
- 也可以直接传 `local` / `remote` / `self_use`
- `runtime_mode` 是当前的主判断字段
- `desktop_client` 走 appdir
- `service` 和 `self_use` 走 exe 同级目录

## 产品改名

项目已经整理成“显示名”和“目录名”可分离。

### 后端/桌面运行时改名

改 `config.ini`：

```ini
[系统配置]
name=你的新产品名
app_dir_name=你的新目录名
```

### 前端改名

改根目录 `.env`：

```bash
VITE_APP_NAME=你的新产品名
VITE_APP_DIR_NAME=你的新目录名
```

然后重新构建前端：

```bash
pnpm build
```

## 本地数据目录

### 桌面客户端模式

`local_agent=true` 时，数据目录在 appdir：

- Windows: `%APPDATA%/{app_dir_name}`
- macOS: `~/Library/Application Support/{app_dir_name}`
- Linux: `~/.local/share/{app_dir_name}`

### 服务端模式

打包后服务端模式下，数据目录在可执行文件同级：

- `./static`
- `./sqlite.db` 或配置指定的数据库路径

## 前端环境变量

常用项在根目录 `.env*`：

```bash
VITE_ENABLE_AGENT=true
VITE_LOCAL_API_BASE_URL=http://127.0.0.1:8766
VITE_APP_NAME=一人国企·OPC
VITE_APP_DIR_NAME=一人国企·OPC
```

其他环境文件：

- `.env`
- `.env.development`
- `.env.production`

## 打包

### 构建前端静态资源

```bash
pnpm build
```

前端构建产物输出到：

- `pysrc/static/dist`

### pywebview 桌面打包

推荐直接用仓库脚本：

```bash
pnpm build:desktop
```

它会先执行前端构建，再自动按当前系统选择打包脚本。

也可以分开用：

- 只执行当前系统桌面打包：`pnpm build:desktop:only`
- 强制 Windows 打包：`pnpm build:desktop:win`
- 强制 macOS 打包：`pnpm build:desktop:mac`

Windows：

```bat
build\pywebview\scripts\build-win.bat
```

macOS：

```bash
chmod +x build/pywebview/scripts/build-mac.sh
./build/pywebview/scripts/build-mac.sh
```

相关目录：

- 打包脚本：`build/pywebview/scripts`
- spec：`build/pywebview/spec`
- 工作缓存：`build/pywebview/work`
- 打包产物：`build/pywebview/release`

### 当前桌面入口

- `pysrc/desktop.py`
- Windows 图标优先读取：
  - `pysrc/res/icon.ico`
  - 没有时回退 `pysrc/res/logo.ico`
  - 再没有时回退 `public/favicon.ico`

## 常见问题

### 1. 桌面端白屏

先确认：

- 已执行 `pnpm build`
- `pysrc/static/dist` 存在
- 或开发模式下使用 `pnpm desktop:pywebview:dev`
 - 或开发模式下使用 `pnpm desktop:client:dev`

### 2. 打包后静态资源找不到

桌面模式会把打包内资源释放到目标目录：

- 客户端模式：释放到 appdir
- 服务端模式：释放到 exe 同级 `static`

### 3. 桌面端打开的是服务端页面还是本地页面

由这几个值决定：

- `runtime_mode`
- `desktop_entry_url`
- 启动时外部 `config.ini`

### 4. 打包后没有任何输出

当前桌面入口会写日志，优先看启动日志和 `health` 端点是否正常。

## Agent 能力范围

当前开源版本主要围绕“会话工作区”展开：

- 会话独立工作区
- 额外挂载目录
- 文件读写、搜索、编辑
- 命令执行
- 技能加载
- 上下文压缩与恢复
- 工具审批与计划审批

适合做：

- 本地办公助手
- 文档整理助手
- 代码协作助手
- 内部知识库问答助手
- 桌面端 AI 工作台

## 开源说明

这个仓库更适合作为“可运行的项目骨架”和“二次开发基础工程”，不是完全产品化的 SaaS 成品。

当前开源版本优先保留了：

- AI 会话主链路
- 工作区与文件系统
- 技能系统
- 审批模式
- pywebview 桌面能力
- 基础后台模块

部分渠道化、内部化能力默认隐藏、关闭或未作为主要入口暴露。

## License

本项目使用 [GNU AGPL v3.0](./LICENSE)，许可证标识为 `AGPL-3.0-only`。
