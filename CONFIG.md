# 一人国企·OPC - 配置说明

## 后端配置（配置文件）

配置文件位置：启动程序时通过命令行参数传入，如未指定则使用默认配置。

### 配置项说明

#### 1. enable_agent（AI Agent 功能开关）
- **说明**：是否启用 AI Agent 智能助手功能
- **默认值**：`false`（不启用）
- **可选值**：`true`, `false`, `1`, `0`, `yes`, `no`, `on`, `off`
- **影响**：
  - `false`：不加载 AI Agent 路由，Agent API 不可用
  - `true`：加载 AI Agent 路由，功能正常工作

**配置示例：**
```ini
[系统配置]
enable_agent = true
```

#### 2. enable_tray（系统托盘开关）
- **说明**：是否启用系统托盘图标
- **默认值**：`true`（启用）
- **可选值**：`true`, `false`, `1`, `0`, `yes`, `no`, `on`, `off`
- **影响**：
  - `true`：系统托盘模式，显示托盘图标，可最小化到托盘
  - `false`：纯服务器模式，无托盘，适用于 Docker/服务器部署

**配置示例：**
```ini
[系统配置]
enable_tray = false
```

#### 3. 其他基础配置
```ini
[系统配置]
name = 一人国企·OPC
db = sqlite.db
port = 8005
```

---

## 前端配置（环境变量）

前端配置通过 `.env` 文件管理。

### 开发环境配置文件

**文件位置**：`.env.development`

### 生产环境配置文件

**文件位置**：`.env.production`

### 配置项说明

#### VITE_ENABLE_AGENT（AI Agent 功能开关）
- **说明**：是否在前端启用 AI Agent 功能
- **默认值**：`false`（不启用）
- **可选值**：`true`, `false`
- **影响**：
  - `false`：
    - 不显示"智慧助手"菜单项和路由
    - 不显示右下角悬浮 Agent 窗口
    - Agent 相关组件完全不加载
  - `true`：
    - 显示"智慧助手"菜单项
    - 显示右下角悬浮 Agent 窗口
    - 完整的 Agent 功能可用

**配置示例：**

`.env.development`:
```bash
# AI Agent 功能开关（默认不启用）
VITE_ENABLE_AGENT = true
```

`.env.production`:
```bash
# AI Agent 功能开关（默认不启用）
VITE_ENABLE_AGENT = false
```

---

## 使用场景说明

### 场景一：桌面应用（默认）
**配置：**
- 后端：`enable_tray = true`（默认）
- 前端：根据需要设置 `VITE_ENABLE_AGENT`

**效果：**
- 有系统托盘图标
- 可最小化到托盘
- 支持托盘菜单操作

### 场景二：服务器/Docker 部署
**配置：**
- 后端：`enable_tray = false`
- 前端：根据需要设置 `VITE_ENABLE_AGENT`

**效果：**
- 无系统托盘
- 纯命令行模式运行
- 使用 Ctrl+C 停止服务

### 场景三：启用 AI Agent
**配置：**
- 后端：`enable_agent = true`
- 前端：`VITE_ENABLE_AGENT = true`

**效果：**
- 后端 API 可用
- 前端显示 Agent 入口
- 完整的智能助手功能

### 场景四：不启用 AI Agent（默认）
**配置：**
- 后端：`enable_agent = false`（默认）
- 前端：`VITE_ENABLE_AGENT = false`（默认）

**效果：**
- 后端不加载 Agent 路由
- 前端完全隐藏 Agent 功能
- 系统更轻量

---

## 启动日志说明

启动时会输出配置状态：

```bash
# 启用 AI Agent
✓ AI Agent 功能已启用

# 系统托盘模式
✓ 系统托盘模式启动

# 纯服务器模式
✓ 纯服务器模式启动（无托盘）
```

---

## 注意事项

1. **前后端独立控制**：前端和后端的 Agent 开关是独立的，建议保持一致
2. **配置生效时机**：
   - 后端配置：需要重启应用
   - 前端配置：需要重新构建（`npm run build`）
3. **默认安全**：所有可选功能默认关闭，需要手动启用
4. **开发环境热重载**：开发环境下修改 `.env.development` 后需要重启 Vite 开发服务器

---

## 快速启用指南

### 启用 AI Agent 功能

1. **后端**：在配置文件中添加
   ```ini
   enable_agent = true
   ```

2. **前端**：在 `.env.development` 或 `.env.production` 中设置
   ```bash
   VITE_ENABLE_AGENT = true
   ```

3. **重启应用**

### 切换到纯服务器模式

1. **后端**：在配置文件中添加
   ```ini
   enable_tray = false
   ```

2. **重启应用**
