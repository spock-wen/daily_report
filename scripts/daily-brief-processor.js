#!/usr/bin/env node
/**
 * OpenClaw - GitHub 每日简报处理器
 * 读取 daily_report 生成的 data.json，进行 AI 分析并生成 HTML
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_FILE = '/root/github_daily_report/briefs/data.json';
const STATE_FILE = '/root/github_daily_report/.processor_state.json';
const OUTPUT_DIR = '/root/github_daily_report';
const RETENTION_DAYS = 60;

const BAILIAN_API_KEY = 'sk-df0b4905fe034a23b59f5d7ecf139967';
const BAILIAN_BASE_URL = 'dashscope.aliyuncs.com';
const BAILIAN_MODEL = 'qwen3.5-plus';

const FEISHU_APP_ID = 'cli_a916e5b5a1b8dcd4';
const FEISHU_APP_SECRET = 'rXVOqRNAKGtD8edjDwuYmbaWjuJbHSmO';
const FEISHU_RECEIVE_ID = 'ou_c5f7c0e7dda00b982d531a474fb0d542';

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (e) {}
    return { lastProcessedAt: null };
}

function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {}
    return null;
}

async function callBailianAPI(prompt) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: BAILIAN_MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500
        });

        const req = https.request({
            hostname: BAILIAN_BASE_URL,
            port: 443,
            path: '/compatible-mode/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BAILIAN_API_KEY}`,
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: 60000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.choices?.[0]?.message?.content || '');
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.write(body);
        req.end();
    });
}

// 生成极简的 prompt，节省 tokens
function generateCompactPrompt(summary) {
    const { date, total, aiCount, topType, topLang, topProject, maxTodayStars, hotProjectCount, projects } = summary;
    
    // 只保留最关键的项目信息
    const projectList = projects.map((p, i) => 
        `${i + 1}. ${p.name}(${p.type},${p.lang},+${p.todayStars})`
    ).join('\n');
    
    return `分析GitHub AI项目趋势：
日期:${date}
项目:${total}个(AI:${aiCount})
最热类型:${topType?.name}(${topType?.count}个)
最热语言:${topLang?.name}(${topLang?.count}个)
增长冠军:${topProject}(+${maxTodayStars})
高热项目:${hotProjectCount}个(>300 stars)

项目列表:
${projectList}

请生成：
1.今日热点(2-3条)
2.短期趋势1-3个月(3-4条)
3.长期趋势6-12个月(3-4条)
4.行动建议(4条)

用中文,Markdown格式,简洁专业。`;
}

async function analyzeTrends(summary) {
    const prompt = generateCompactPrompt(summary);
    
    console.log('🤖 调用 AI 生成趋势洞察...');
    console.log(`📝 Prompt 长度: ${prompt.length} 字符`);
    
    try {
        const content = await callBailianAPI(prompt);
        return content;
    } catch (e) {
        console.error('AI 分析失败:', e.message);
        return generateFallbackInsights(summary);
    }
}

// 备用：如果 AI 调用失败，使用基于规则的洞察
function generateFallbackInsights(summary) {
    const { topType, topLang, topProject, hotProjectCount } = summary;
    
    let md = `## 📌 技术趋势洞察\n\n`;
    
    md += `### 今日热点\n`;
    if (topType && topType.count >= 2) {
        md += `- **${topType.name}** 领域项目集中，共有 ${topType.count} 个上榜\n`;
    }
    md += `- 今日共有 **${hotProjectCount}** 个高热项目（增长>300 Stars）\n`;
    if (topLang && topLang.count >= 2) {
        md += `- **${topLang.name}** 成为最热门语言\n`;
    }
    
    md += `\n### 短期趋势（1-3 个月）\n`;
    md += `- ${topType?.name || 'AI'} 领域持续活跃，技术创新加速\n`;
    md += `- 开发者关注度和社区贡献度保持高位\n`;
    md += `- 企业级应用场景不断拓展\n`;
    
    md += `\n### 长期趋势（6-12 个月）\n`;
    md += `- AI 基础设施逐步成熟，从实验走向生产\n`;
    md += `- 多智能体系统和自主 AI 成为竞争焦点\n`;
    md += `- 边缘 AI 和轻量化部署需求增长\n`;
    md += `- AI 开发工具链标准化，降低应用门槛\n`;
    
    md += `\n## 🎯 行动建议\n\n`;
    md += `1. **重点关注**: ${topProject} 增长领先，值得深入研究\n`;
    md += `2. **学习方向**: 关注 ${topType?.name || 'AI'} 领域技术演进\n`;
    md += `3. **应用机会**: 结合业务场景探索技术落地\n`;
    md += `4. **社区参与**: 积极参与开源项目跟踪趋势\n`;
    
    return md;
}

// 生成深色主题的 HTML，与 26 号简报风格一致
function generateHtml(data, insights) {
    const { date, projects, stats } = data;
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    
    // 生成项目表格行
    let projectRows = projects.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><a href="${p.url}" target="_blank">${p.repo}</a>${p.isAI ? ' 🤖' : ''}</td>
            <td>${p.descZh || p.desc || ''}</td>
            <td>${p.language}</td>
            <td>⭐ ${p.todayStars}</td>
            <td>${p.stars}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 GitHub AI 项目每日简报 - ${date}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@300;400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        :root {
            --bg-primary: #0a0e17;
            --bg-secondary: #111827;
            --bg-card: #1a2332;
            --bg-card-hover: #243045;
            --text-primary: #f0f4f8;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --accent-primary: #3b82f6;
            --accent-secondary: #8b5cf6;
            --accent-gradient: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            --border-color: #1e293b;
            --success: #10b981;
            --warning: #f59e0b;
            --code-bg: #0d1117;
            --table-border: #2d3748;
            --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
            --shadow-glow: 0 0 20px rgba(59, 130, 246, 0.3);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.7;
            min-height: 100vh;
            background-image:
                radial-gradient(ellipse at top, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                radial-gradient(ellipse at bottom right, rgba(139, 92, 246, 0.05) 0%, transparent 50%);
        }

        .container { max-width: 900px; margin: 0 auto; padding: 0 24px; }

        header {
            padding: 48px 0 32px;
            border-bottom: 1px solid var(--border-color);
            position: relative;
            overflow: hidden;
        }

        header::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 1px;
            background: var(--accent-gradient);
            opacity: 0.5;
        }

        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            flex-wrap: wrap;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .logo-icon {
            width: 48px; height: 48px;
            background: var(--accent-gradient);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: var(--shadow-glow);
        }

        .logo-text h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 28px; font-weight: 600;
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .logo-text p {
            color: var(--text-secondary);
            font-size: 14px;
            margin-top: 2px;
        }

        .back-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            color: var(--text-primary);
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .back-btn:hover {
            border-color: var(--accent-primary);
            transform: translateX(-4px);
        }

        .meta-bar {
            display: flex;
            gap: 24px;
            padding: 24px 0;
            flex-wrap: wrap;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-secondary);
            font-size: 14px;
        }

        .meta-icon { font-size: 16px; }

        .meta-value {
            font-family: 'JetBrains Mono', monospace;
            color: var(--text-primary);
        }

        main { padding: 32px 0 64px; }

        .content-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 40px;
            margin-bottom: 24px;
            animation: fadeInUp 0.5s ease;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-bottom: 32px;
        }

        .stat-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            transition: all 0.3s ease;
        }

        .stat-card:hover {
            border-color: var(--accent-primary);
            transform: translateY(-2px);
        }

        .stat-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 32px;
            font-weight: 700;
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
        }

        .stat-label {
            color: var(--text-secondary);
            font-size: 14px;
        }

        h2 {
            font-family: 'Outfit', sans-serif;
            font-size: 24px;
            font-weight: 600;
            margin: 32px 0 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border-color);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 12px;
        }

        h2::before {
            content: '';
            width: 4px; height: 24px;
            background: var(--accent-gradient);
            border-radius: 2px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            margin: 24px 0;
        }

        th, td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid var(--table-border);
        }

        th {
            background: var(--bg-secondary);
            font-weight: 600;
            color: var(--text-primary);
            font-family: 'Outfit', sans-serif;
        }

        tr:hover { background: var(--bg-card-hover); }

        a {
            color: var(--accent-primary);
            text-decoration: none;
            transition: all 0.3s ease;
        }

        a:hover {
            color: var(--accent-secondary);
            text-decoration: underline;
        }

        .insights {
            margin-top: 32px;
            padding-top: 32px;
            border-top: 1px solid var(--border-color);
        }

        .insights h3 {
            font-family: 'Outfit', sans-serif;
            font-size: 20px;
            font-weight: 600;
            margin: 24px 0 16px;
            color: var(--text-primary);
        }

        .insights ul, .insights ol {
            margin-bottom: 20px;
            padding-left: 24px;
        }

        .insights li {
            margin-bottom: 8px;
            color: var(--text-secondary);
        }

        .insights li::marker {
            color: var(--accent-primary);
        }

        .insights strong {
            color: var(--text-primary);
            font-weight: 600;
        }

        footer {
            padding: 32px 0;
            border-top: 1px solid var(--border-color);
            text-align: center;
            color: var(--text-muted);
            font-size: 14px;
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                align-items: flex-start;
            }
            .back-btn { width: 100%; justify-content: center; }
            .content-card { padding: 24px; }
            .stat-value { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="header-content">
                <div class="logo">
                    <div class="logo-icon">🚀</div>
                    <div class="logo-text">
                        <h1>GitHub AI 项目每日简报</h1>
                        <p>${date}</p>
                    </div>
                </div>
                <a href="/" class="back-btn">
                    <span>←</span>
                    <span>返回列表</span>
                </a>
            </div>
            <div class="meta-bar">
                <div class="meta-item">
                    <span class="meta-icon">📅</span>
                    <span class="meta-value">${date}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-icon">⏰</span>
                    <span class="meta-value">${now}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-icon">📊</span>
                    <span class="meta-value">${stats.totalProjects} 个项目</span>
                </div>
                <div class="meta-item">
                    <span class="meta-icon">🤖</span>
                    <span class="meta-value">${stats.aiProjects} 个 AI 项目</span>
                </div>
            </div>
        </header>

        <main>
            <div class="content-card">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalProjects}</div>
                        <div class="stat-label">热门项目</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.aiProjects}</div>
                        <div class="stat-label">AI 相关</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.avgStars}</div>
                        <div class="stat-label">平均 Stars</div>
                    </div>
                </div>

                <h2>📋 项目列表</h2>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>项目</th>
                            <th>描述</th>
                            <th>语言</th>
                            <th>今日增长</th>
                            <th>总 Stars</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${projectRows}
                    </tbody>
                </table>

                <div class="insights" id="insights">
                    <h2>📌 技术趋势洞察</h2>
                    <div id="insights-content">${insights ? '' : '<p style="color: var(--text-secondary);">AI 分析中...</p>'}</div>
                </div>
            </div>
        </main>

        <footer>
            <p>由 OpenClaw 自动生成 · 数据来源于 GitHub Trending</p>
        </footer>
    </div>

    ${insights ? `<script>
        document.getElementById('insights-content').innerHTML = marked.parse(\`${insights.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);
    </script>` : ''}
</body>
</html>`;
}

function generateIndexHtml() {
    const today = new Date().toISOString().split('T')[0];
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub AI 每日简报</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0a0e17;
            --bg-secondary: #111827;
            --bg-card: #1a2332;
            --text-primary: #f0f4f8;
            --text-secondary: #94a3b8;
            --accent-primary: #3b82f6;
            --accent-secondary: #8b5cf6;
            --accent-gradient: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            --border-color: #1e293b;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            background-image:
                radial-gradient(ellipse at top, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                radial-gradient(ellipse at bottom right, rgba(139, 92, 246, 0.05) 0%, transparent 50%);
            padding: 40px 20px;
        }

        .container { max-width: 800px; margin: 0 auto; }

        h1 {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 10px;
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .subtitle {
            text-align: center;
            color: var(--text-secondary);
            margin-bottom: 40px;
            font-size: 1.1rem;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            backdrop-filter: blur(10px);
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
        }

        .stat-label { color: var(--text-secondary); font-size: 0.95rem; }

        .brief-list {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 24px;
        }

        .brief-list h2 {
            font-size: 1.3rem;
            margin-bottom: 20px;
            padding-left: 12px;
            border-left: 4px solid var(--accent-primary);
        }

        .brief-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            margin-bottom: 12px;
            background: var(--bg-secondary);
            border-radius: 10px;
            border: 1px solid var(--border-color);
            transition: all 0.3s ease;
            text-decoration: none;
            color: inherit;
        }

        .brief-item:hover {
            border-color: var(--accent-primary);
            transform: translateX(4px);
        }

        .brief-date { font-weight: 600; font-size: 1.1rem; }
        .brief-title { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }
        .brief-arrow { color: var(--accent-primary); font-size: 1.2rem; }

        .footer {
            text-align: center;
            margin-top: 40px;
            color: #64748b;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 GitHub AI 每日简报</h1>
        <p class="subtitle">追踪技术前沿，发现优质项目</p>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value" id="total-count">-</div>
                <div class="stat-label">简报总数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="project-count">-</div>
                <div class="stat-label">收录项目</div>
            </div>
        </div>

        <div class="brief-list">
            <h2>历史简报</h2>
            <div id="brief-list">
                <p style="color: var(--text-secondary); text-align: center;">加载中...</p>
            </div>
        </div>

        <p class="footer">由 OpenClaw 自动生成 | 每日更新</p>
    </div>

    <script>
        // 动态生成简报列表
        const dates = [];
        const startDate = new Date('2026-02-25');
        const today = new Date();
        
        for (let d = new Date(today); d >= startDate; d.setDate(d.getDate() - 1)) {
            dates.push(d.toISOString().split('T')[0]);
        }
        
        document.getElementById('total-count').textContent = dates.length;
        document.getElementById('project-count').textContent = dates.length * 7;
        
        const listHtml = dates.map(date => \`
            <a href="/github-ai-trending-\${date}.html" class="brief-item">
                <div>
                    <div class="brief-date">\${date}</div>
                    <div class="brief-title">🚀 GitHub AI 项目每日简报</div>
                </div>
                <div class="brief-arrow">查看详情 →</div>
            </a>
        \`).join('');
        
        document.getElementById('brief-list').innerHTML = listHtml;
    </script>
</body>
</html>`;
}

async function getFeishuToken() {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            app_id: FEISHU_APP_ID,
            app_secret: FEISHU_APP_SECRET
        });

        const req = https.request({
            hostname: 'open.feishu.cn',
            port: 443,
            path: '/open-apis/auth/v3/tenant_access_token/internal',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: 10000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.tenant_access_token);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function sendFeishuNotification(date, token) {
    const body = JSON.stringify({
        receive_id: FEISHU_RECEIVE_ID,
        msg_type: 'post',
        content: JSON.stringify({
            zh_cn: {
                title: '📊 GitHub AI 简报已更新',
                content: [
                    [{ tag: 'text', text: `详细数据已部署到服务器\n🔗 访问地址：http://223.109.200.65:8080/\n\n日期：${date}\nAI 趋势分析已完成` }]
                ]
            }
        })
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'open.feishu.cn',
            port: 443,
            path: '/open-apis/im/v1/messages?receive_id_type=open_id',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: 10000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function cleanupOldFiles() {
    const briefsDir = path.join(OUTPUT_DIR, 'briefs');
    const now = Date.now();
    const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    try {
        const files = fs.readdirSync(briefsDir);
        let cleaned = 0;
        
        files.forEach(file => {
            const filePath = path.join(briefsDir, file);
            const stat = fs.statSync(filePath);
            
            if (now - stat.mtimeMs > maxAge) {
                fs.unlinkSync(filePath);
                cleaned++;
            }
        });

        if (cleaned > 0) {
            console.log(`🧹 清理了 ${cleaned} 个过期文件`);
        }
    } catch (e) {
        console.error('清理文件失败:', e.message);
    }
}

async function main() {
    console.log('🦞 OpenClaw 每日简报处理器');
    console.log('='.repeat(50));
    console.log(`运行时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    
    const state = loadState();
    const data = loadData();

    if (!data) {
        console.log('⚠️ 未找到数据文件，退出');
        return;
    }

    if (state.lastProcessedAt === data.generatedAt) {
        console.log('ℹ️ 数据已处理过，跳过');
        return;
    }

    console.log(`📊 处理数据: ${data.date}, 共 ${data.projects.length} 个项目`);

    // 使用 summary 数据生成洞察，节省 tokens
    const summary = data.summary;
    if (!summary) {
        console.log('⚠️ 未找到 summary 数据，使用完整数据回退');
    }
    
    console.log('\n🤖 正在进行 AI 分析...');
    const insights = await analyzeTrends(summary || data);

    console.log('\n📝 生成 HTML 页面...');
    const html = generateHtml(data, insights);
    const htmlFile = path.join(OUTPUT_DIR, `github-ai-trending-${data.date}.html`);
    fs.writeFileSync(htmlFile, html, 'utf8');
    console.log(`✅ HTML 已生成: ${htmlFile}`);

    const indexHtml = generateIndexHtml();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml, 'utf8');
    console.log('✅ 首页已更新');

    console.log('\n📤 发送飞书通知...');
    try {
        const token = await getFeishuToken();
        await sendFeishuNotification(data.date, token);
        console.log('✅ 飞书通知已发送');
    } catch (e) {
        console.error('❌ 飞书通知失败:', e.message);
    }

    console.log('\n🧹 清理过期文件...');
    cleanupOldFiles();

    state.lastProcessedAt = data.generatedAt;
    saveState(state);

    console.log('\n' + '='.repeat(50));
    console.log('✅ 处理完成！');
}

main().catch(console.error);
