# GitHub API 集成使用说明

## 功能概述

系统现在支持通过 GitHub API 获取更详细的项目信息，包括：

- 📊 **基本信息**: 仓库名称、描述、语言、主页、话题标签
- ⭐ **统计信息**: Stars、Forks、Watchers、开放 Issues 数量
- 🕒 **时间信息**: 创建时间、更新时间、最后推送时间
- 👥 **社区信息**: 订阅者数量、贡献者数量、近 30 天 Commits 数
- 📄 **许可证**: 项目许可证信息
- 🔧 **状态**: 是否归档、是否 Fork、默认分支

## 使用方法

### 1. 获取 GitHub Token

访问 [GitHub Personal Access Tokens](https://github.com/settings/tokens)，生成一个新的 Personal Access Token。

建议勾选的权限：
- `public_repo` - 访问公开仓库信息
- `repo:status` - 访问仓库状态

### 2. 设置环境变量

在 GitHub Action 中设置环境变量：

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

或者在本地环境中设置：

```bash
# Linux/macOS
export GITHUB_TOKEN=your_token_here

# Windows PowerShell
$env:GITHUB_TOKEN="your_token_here"
```

### 3. 运行简报生成

设置好 GITHUB_TOKEN 后，运行：

```bash
npm run crawl
```

系统会自动检测 GITHUB_TOKEN 环境变量，如果存在则会获取详细的项目信息。

## 输出示例

### 不带 GITHUB_TOKEN

```
🦞 大龙虾 GitHub 简报生成器
==================================================
...
⚠️ 未设置 GITHUB_TOKEN，跳过详细信息获取
提示：设置 GITHUB_TOKEN 环境变量可获取更新时间、Commits 等详细信息
```

### 带 GITHUB_TOKEN

```
🦞 大龙虾 GitHub 简报生成器
==================================================
...
📡 正在获取 GitHub API 详细数据...
✅ 详细信息获取完成
```

### 生成的简报内容（带详细信息）

```markdown
### 1. [huggingface/transformers](https://github.com/huggingface/transformers) 🤖

**类型**: LLM 工具/框架

**描述**: 状态-of-the-art 机器学习框架，支持 PyTorch、TensorFlow 和 JAX

| 语言 | Stars | 今日增长 | 社区活跃度 |
|------|-------|----------|------------|
| Python | 157.1k | ⭐ 100 | 极高 |

✨ **核心功能**:
- 提供大语言模型训练和推理能力
- 支持模型微调和参数优化
- 集成主流 Transformer 架构
- 提供模型部署和 serving 工具

📈 **趋势分析**:
- ⭐ 明星项目，在开发者社区具有重要影响力
- 🕒 最近更新时间：2026/2/28 20:59:59
- 📝 近 30 天 Commits：204
- 👥 贡献者数量：214+
- 🧠 大模型生态日趋成熟，微调部署工具需求旺盛
```

## 注意事项

### API 速率限制

- **未认证**: 每小时 60 次请求
- **已认证**: 每小时 5000 次请求

建议始终使用 GITHUB_TOKEN 以避免触发速率限制。

### 性能影响

启用 GitHub API 集成会增加执行时间：
- 每个项目约增加 100-1000ms 的 API 调用时间
- 10 个项目约增加 1-10 秒的总执行时间

### 错误处理

如果 API 调用失败，系统会自动降级到基础模式，不会影响简报生成。

## 本地测试

```bash
# 设置 Token
export GITHUB_TOKEN=your_token_here

# 运行
node src/crawler/crawl.js
```

## 在 GitHub Action 中使用

```yaml
jobs:
  generate-brief:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Generate Brief
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run crawl
```

## 故障排除

### 问题：API 速率限制错误

**解决方案**: 设置 GITHUB_TOKEN 环境变量

### 问题：获取详细信息失败

**解决方案**: 
1. 检查 Token 是否有效
2. 确认 Token 权限是否正确
3. 查看错误日志获取详细信息

### 问题：执行时间过长

**解决方案**: 
1. 减少 `max_display_projects` 配置项
2. 使用缓存机制
3. 考虑异步获取详细信息
