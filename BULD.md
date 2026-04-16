# 一人国企·OPC - 打包指南

本项目包含两种产品形态：
1. **服务端版本** - 独立运行的后端服务，适合部署到服务器
2. **桌面应用版本（一人国企·OPC）** - Tauri 打包的桌面应用，内嵌后端服务

---

## 一、服务端打包

服务端打包会生成独立的可执行文件，可直接运行提供 API 服务。

### 1.1 Windows 服务端

**脚本**: `pysrc/build_win.bat`

```batch
cd pysrc
build_win.bat
```

**输出目录**: `zhiran-ai-release/`

**输出结构**:
```
zhiran-ai-release/
├── zhiran-ai.exe    # 主程序
├── static/            # 静态资源
├── timer/             # 定时任务
├── scripts/           # 脚本文件
└── res/               # 资源文件
```

**运行方式**:
```batch
cd zhiran-ai-release
zhiran-ai.exe
# 访问 http://localhost:8005
```

---

### 1.2 macOS 服务端

**脚本**: `pysrc/build_mac.sh`

```bash
cd pysrc
chmod +x build_mac.sh
./build_mac.sh
```

**输出目录**: `zhiran-ai-release/`

**输出结构**:
```
zhiran-ai-release/
├── 一人国企·OPC.app/    # macOS 应用程序包
│   └── Contents/MacOS/
│       ├── static/
│       ├── timer/
│       ├── scripts/
│       └── res/
├── static/
├── timer/
├── scripts/
└── res/
```

**运行方式**:
```bash
cd zhiran-ai-release
open 一人国企·OPC.app
# 或在终端运行: ./一人国企·OPC.app/Contents/MacOS/一人国企·OPC
# 访问 http://localhost:8005
```

**注意事项**:
- 首次运行可能需要在"系统偏好设置 > 安全性与隐私"中允许运行
- 如遇权限问题: `chmod +x 一人国企·OPC.app/Contents/MacOS/*`

---

## 二、桌面应用打包（一人国企·OPC）

桌面应用使用 Tauri 框架，需要先打包后端 sidecar，再打包前端应用。

### 2.1 打包后端 Sidecar

#### Windows Sidecar

**配置文件**: `pysrc/build_no_cmd.spec`

```batch
cd pysrc
pyinstaller --distpath=../src-tauri/binaries --workpath=build build_no_cmd.spec
```

**输出**: `src-tauri/binaries/一人国企·OPC.exe`

> 需要手动重命名为 `backend-x86_64-pc-windows-msvc.exe`

#### macOS Sidecar (Apple Silicon)

**配置文件**: `pysrc/build_no_cmd_mac.spec`

```bash
cd pysrc
pyinstaller --distpath=../src-tauri/binaries --workpath=build build_no_cmd_mac.spec
```

**输出**: `src-tauri/binaries/backend-aarch64-apple-darwin`

> 如果是 Intel Mac，需要修改 spec 文件中的 `name` 为 `backend-x86_64-apple-darwin`

**设置执行权限**:
```bash
chmod +x src-tauri/binaries/backend-aarch64-apple-darwin
```

---

### 2.2 打包 Tauri 应用

确保后端 sidecar 已打包到 `src-tauri/binaries/` 目录后：

```bash
pnpm tauri build
```

**Windows 输出**: `src-tauri/target/release/bundle/nsis/一人国企·OPC_x.x.x_x64-setup.exe`

**macOS 输出**: `src-tauri/target/release/bundle/dmg/一人国企·OPC_x.x.x_aarch64.dmg`

---

## 三、打包前准备

### 3.1 环境要求

**Python 环境**:
```bash
cd pysrc
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
pip install pyinstaller
```

**Node.js 环境**:
```bash
pnpm install
```

**Tauri 环境**:
- Rust 工具链
- 平台特定依赖（参考 [Tauri 官方文档](https://tauri.app/v1/guides/getting-started/prerequisites)）

### 3.2 Sidecar 命名规范

Tauri sidecar 文件名必须符合以下格式：

| 平台 | 文件名 |
|------|--------|
| Windows x64 | `backend-x86_64-pc-windows-msvc.exe` |
| macOS Intel | `backend-x86_64-apple-darwin` |
| macOS Apple Silicon | `backend-aarch64-apple-darwin` |
| Linux x64 | `backend-x86_64-unknown-linux-gnu` |

---

## 四、常见问题

### Q: macOS 打包后应用无法启动？

1. 检查 sidecar 是否有执行权限
2. 检查 `entitlements.plist` 是否包含必要权限
3. 查看日志: `~/ai-debt-logs/app.log`

### Q: Windows 打包后提示缺少 DLL？

确保使用相同版本的 Python 环境打包，建议使用虚拟环境。

### Q: 打包后 static 目录找不到？

桌面应用版本使用 `local_agent=true` 配置，数据目录位于：
- Windows: `%APPDATA%/一人国企·OPC/static/`
- macOS: `~/Library/Application Support/一人国企·OPC/static/`

---

## 五、打包命令速查

| 场景 | 命令 |
|------|------|
| Windows 服务端 | `cd pysrc && build_win.bat` |
| macOS 服务端 | `cd pysrc && ./build_mac.sh` |
| Windows Sidecar | `cd pysrc && pyinstaller --distpath=../src-tauri/binaries build_no_cmd.spec` |
| macOS Sidecar | `cd pysrc && pyinstaller --distpath=../src-tauri/binaries build_no_cmd_mac.spec` |
| Tauri 桌面应用 | `pnpm tauri build` |
