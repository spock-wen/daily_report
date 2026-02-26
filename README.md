# 🦞 GitHub AI 项目每日简报系统

自动抓取 GitHub Trending 中的 AI 相关项目，生成每日简报并推送到飞书，同时部署静态网页供浏览。

## ✨ 功能特性

- 🔍 **自动抓取**：每日自动抓取 GitHub Trending 热门项目
- 🤖 **AI 识别**：智能识别 AI 相关项目
- 📝 **简报生成**：生成 Markdown 格式的详细简报
- 📱 **飞书推送**：支持推送到飞书机器人
- 🌐 **静态网页**：自动生成可浏览的 HTML 页面
- ⏰ **定时任务**：GitHub Actions 自动执行

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/daily_report.git
cd daily_report
npm install
```

### 2. 本地运行

```bash
# 生成简报
npm run crawl

# 生成 HTML 页面
npm run generate-pages

# 启动本地服务器（可选）
npm run server
```

## ⚙️ 配置说明

### 环境变量配置

创建 `.env` 文件或在环境中设置以下变量：

```env
# 飞书配置（必填，用于推送消息）
FEISHU_APP_ID=your-app-id
FEISHU_APP_SECRET=your-app-secret
FEISHU_RECEIVE_ID=your-open-id
FEISHU_RECEIVE_ID_TYPE=open_id

# 服务器配置（用于部署）
SERVER_USER=root
SERVER_IP=your-server-ip
SERVER_PATH=/root/github_daily_report
```

### 如何获取配置信息

#### 1️⃣ 飞书应用配置

**步骤一：创建飞书应用**

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 点击「开发者后台」→「创建企业自建应用」
3. 填写应用名称和描述，点击「创建」

**步骤二：获取 App ID 和 App Secret**

1. 进入应用详情页
2. 在「凭证与基础信息」页面可以看到：
   - **App ID**：复制到 `FEISHU_APP_ID`
   - **App Secret**：点击「查看」后复制到 `FEISHU_APP_SECRET`

**步骤三：配置应用权限**

在「权限管理」页面，开通以下权限：
- `im:message:send_as_bot` - 以应用身份发消息
- `contact:user.base:readonly` - 获取用户基本信息（可选）

**步骤四：发布应用**

1. 在「版本管理与发布」页面
2. 点击「创建版本」并发布
3. 等待审核通过

**步骤五：获取接收者 Open ID**

方式一：运行项目提供的脚本
```bash
FEISHU_APP_ID=your-app-id FEISHU_APP_SECRET=your-app-secret npm run get-openid
```

方式二：在飞书中查看
1. 打开飞书，进入与机器人的对话
2. 点击机器人头像，查看 URL 中的 `open_id` 参数
3. 格式类似：`ou_xxxxxxxx`

将获取到的 Open ID 填入 `FEISHU_RECEIVE_ID`

#### 2️⃣ 服务器配置

**SERVER_USER**：服务器登录用户名
- 通常是 `root` 或其他有权限的用户

**SERVER_IP**：服务器 IP 地址
- 你的云服务器公网 IP

**SERVER_PATH**：部署路径
- 服务器上存放项目的目录，如 `/root/github_daily_report`

**SERVER_SSH_KEY**：SSH 私钥（用于 GitHub Actions）

1. 在本地生成 SSH 密钥对：
   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github_actions_key
   ```

2. 将公钥添加到服务器：
   ```bash
   # 在本地执行
   ssh-copy-id -i ~/.ssh/github_actions_key.pub root@your-server-ip
   
   # 或手动添加
   cat ~/.ssh/github_actions_key.pub | ssh root@your-server-ip "cat >> ~/.ssh/authorized_keys"
   ```

3. 复制私钥内容到 GitHub Secrets：
   ```bash
   cat ~/.ssh/github_actions_key
   ```
   复制完整输出（包括 `-----BEGIN` 和 `-----END` 行）

### GitHub Secrets 配置

在 GitHub 仓库中配置 Secrets：

1. 进入仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret** 添加以下配置：

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `FEISHU_APP_ID` | 飞书应用 ID | `cli_xxxxxxxx` |
| `FEISHU_APP_SECRET` | 飞书应用密钥 | `xxxxxxxxxxxxxx` |
| `FEISHU_RECEIVE_ID` | 接收者 Open ID | `ou_xxxxxxxx` |
| `FEISHU_RECEIVE_ID_TYPE` | ID 类型 | `open_id` |
| `SERVER_USER` | 服务器用户名 | `root` |
| `SERVER_IP` | 服务器 IP | `223.109.200.65` |
| `SERVER_PATH` | 部署路径 | `/root/github_daily_report` |
| `SERVER_SSH_KEY` | SSH 私钥 | `-----BEGIN RSA PRIVATE KEY-----...` |

## 📦 部署说明

### GitHub Actions 自动部署

项目已配置 GitHub Actions，每天 UTC 23:00（北京时间早上 7:00）自动执行：

1. 抓取 GitHub Trending 数据
2. 生成简报和 HTML 页面
3. 推送代码到仓库
4. 部署静态文件到服务器

### 手动触发

在 GitHub 仓库的 **Actions** 页面，选择 `Daily GitHub AI Brief` workflow，点击 **Run workflow** 手动触发。

### 服务器 Nginx 配置

在服务器上配置 Nginx 提供静态文件服务：

```nginx
server {
    listen 8080;
    server_name _;

    root /root/github_daily_report;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /briefs/ {
        alias /root/github_daily_report/briefs/;
    }
}
```

确保目录权限正确：
```bash
chmod 755 /root/
chmod 755 /root/github_daily_report/
chmod 644 /root/github_daily_report/*.html
```

## 📁 项目结构

```
daily_report/
├── .github/
│   └── workflows/
│       └── daily-brief.yml    # GitHub Actions 配置
├── briefs/                     # 生成的简报文件
├── src/
│   ├── config/                 # 配置文件
│   ├── crawler/                # 爬虫模块
│   ├── generator/              # 生成器模块
│   │   ├── generator.js        # 简报生成
│   │   ├── feishu.js           # 飞书推送
│   │   └── insights.js         # 趋势分析
│   ├── server/                 # 服务器模块
│   └── utils/                  # 工具函数
├── templates/                  # HTML 模板
├── deploy.js                   # 部署脚本
├── run.js                      # 运行入口
└── package.json
```

## 🔧 自定义配置

### 修改定时任务时间

编辑 `.github/workflows/daily-brief.yml`：

```yaml
on:
  schedule:
    - cron: '0 23 * * *'  # UTC 时间，改为你需要的时间
```

### 修改抓取项目数量

编辑 `src/config/config.json`：

```json
{
  "crawler": {
    "max_projects": 25
  }
}
```

### 添加自定义项目分析

编辑 `src/generator/generator.js` 中的 `getProjectFeatures` 和 `getProjectScenarios` 函数。

## 📝 License

MIT License
