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
            max_tokens: 2000
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

async function analyzeTrends(projects) {
    const projectList = projects.slice(0, 10).map((p, i) => 
        `${i + 1}. ${p.repo} - ${p.descZh || p.desc} (${p.language}, ⭐${p.todayStars})`
    ).join('\n');

    const prompt = `分析以下 GitHub 热门项目，生成技术趋势洞察和行动建议：

${projectList}

请用中文回答，格式如下：

## 📌 技术趋势洞察

### 短期趋势（1-3 个月）
- [趋势1]
- [趋势2]

### 长期趋势（6-12 个月）
- [趋势1]
- [趋势2]

## 🎯 行动建议
1. **[建议类型]**：[具体建议]
2. **[建议类型]**：[具体建议]
`;

    try {
        return await callBailianAPI(prompt);
    } catch (e) {
        console.error('AI 分析失败:', e.message);
        return '';
    }
}

function generateHtml(data, insights) {
    const { date, projects, stats } = data;
    
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
    <title>GitHub AI 每日简报 - ${date}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f8fa; color: #24292e; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #0366d6; margin-bottom: 10px; }
        .meta { color: #586069; margin-bottom: 20px; }
        .stats { background: #fff; padding: 20px; border-radius: 6px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
        .stat-item { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #0366d6; }
        .stat-label { color: #586069; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e1e4e8; }
        th { background: #f6f8fa; font-weight: 600; }
        tr:hover { background: #f6f8fa; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .insights { background: #fff; padding: 20px; border-radius: 6px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .insights h2 { color: #0366d6; margin-bottom: 15px; }
        .insights h3 { margin: 15px 0 10px; color: #24292e; }
        .insights ul { padding-left: 20px; }
        .insights li { margin: 5px 0; }
        .footer { text-align: center; margin-top: 30px; color: #586069; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 GitHub AI 项目每日简报</h1>
        <p class="meta">日期：${date} | 来源：GitHub Trending (24h)</p>
        
        <div class="stats">
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${stats.totalProjects}</div>
                    <div class="stat-label">热门项目</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.aiProjects}</div>
                    <div class="stat-label">AI 相关</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.avgStars}</div>
                    <div class="stat-label">平均 Stars</div>
                </div>
            </div>
        </div>

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

        <div class="insights">
            ${insights || '<p>AI 分析中...</p>'}
        </div>

        <p class="footer">由 OpenClaw 自动生成 | <a href="/">返回首页</a></p>
    </div>
</body>
</html>`;
}

function generateIndexHtml() {
    const files = [];
    
    try {
        const htmlFiles = fs.readdirSync(OUTPUT_DIR).filter(file => 
            file.match(/^github-ai-trending-\d{4}-\d{2}-\d{2}\.html$/)
        );
        
        htmlFiles.forEach(file => {
            const match = file.match(/^github-ai-trending-(\d{4}-\d{2}-\d{2})\.html$/);
            if (match) {
                const date = match[1];
                files.push({ date, file });
            }
        });
        
        files.sort((a, b) => b.date.localeCompare(a.date));
    } catch (e) {
        console.error('读取历史文件失败:', e.message);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const isTodayGenerated = files.some(f => f.date === today);
    
    let reportsHtml = '';
    if (files.length > 0) {
        reportsHtml = `
        <div class="reports">
            <h2>历史简报</h2>
            <div class="reports-grid">
                ${files.map((f, index) => `
                <div class="report-card ${f.date === today ? 'latest' : ''}">
                    <div class="report-date">${f.date}${f.date === today ? ' <span class="latest-badge">最新</span>' : ''}</div>
                    <h3>🚀 GitHub AI 项目每日简报</h3>
                    <a href="/${f.file}" class="report-link">查看详情 →</a>
                </div>
                `).join('')}
            </div>
        </div>`;
    }
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub AI 每日简报</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f8fa; color: #24292e; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #0366d6; margin-bottom: 10px; text-align: center; }
        .subtitle { color: #586069; margin-bottom: 30px; text-align: center; }
        .btn { display: inline-block; background: #0366d6; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 0 5px; }
        .btn:hover { background: #0257c2; }
        .cta { text-align: center; margin: 30px 0; }
        .reports { margin-top: 40px; }
        .reports h2 { color: #0366d6; margin-bottom: 20px; }
        .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .report-card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s; }
        .report-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
        .report-card.latest { border-left: 4px solid #28a745; }
        .report-date { font-size: 14px; color: #586069; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .latest-badge { background: #28a745; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
        .report-card h3 { color: #24292e; margin-bottom: 15px; font-size: 16px; }
        .report-link { color: #0366d6; text-decoration: none; font-size: 14px; }
        .report-link:hover { text-decoration: underline; }
        .stats-bar {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            justify-content: center;
            gap: 30px;
        }
        .stat-item {
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #0366d6;
        }
        .stat-label {
            color: #586069;
            font-size: 14px;
        }
        @media (max-width: 768px) {
            .stats-bar {
                flex-direction: column;
                gap: 15px;
            }
            .reports-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 GitHub AI 项目每日简报</h1>
        <p class="subtitle">追踪技术前沿，发现优质项目</p>
        
        <div class="stats-bar">
            <div class="stat-item">
                <div class="stat-value">${files.length}</div>
                <div class="stat-label">简报总数</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${files.reduce((sum, f) => sum + 1, 0) * 10}</div>
                <div class="stat-label">收录项目</div>
            </div>
        </div>
        
        ${isTodayGenerated ? `
        <div class="cta">
            <a href="/github-ai-trending-${today}.html" class="btn">查看今日简报</a>
        </div>
        ` : ''}
        
        ${reportsHtml}
        
        <div class="cta" style="margin-top: 40px;">
            <p>由 OpenClaw 自动生成 | 每日更新</p>
        </div>
    </div>
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

    const htmlFile = path.join(OUTPUT_DIR, `github-ai-trending-${data.date}.html`);
    const indexFile = path.join(OUTPUT_DIR, 'index.html');
    const forceUpdate = !fs.existsSync(indexFile);
    
    console.log(`🔍 检查文件状态:`);
    console.log(`   - HTML 文件: ${fs.existsSync(htmlFile) ? '存在' : '不存在'}`);
    console.log(`   - 首页文件: ${fs.existsSync(indexFile) ? '存在' : '不存在'}`);
    console.log(`   - 强制更新: ${forceUpdate ? '是' : '否'}`);
    console.log(`   - 上次处理时间: ${state.lastProcessedAt}`);
    console.log(`   - 数据生成时间: ${data.generatedAt}`);
    
    if (!forceUpdate && state.lastProcessedAt === data.generatedAt) {
        console.log('ℹ️ 数据已处理过，跳过');
    } else {
        if (forceUpdate) {
            console.log('⚠️ 强制更新：首页文件不存在');
        }
        
        if (!fs.existsSync(htmlFile)) {
            console.log(`📊 处理数据: ${data.date}, 共 ${data.projects.length} 个项目`);

            console.log('\n🤖 正在进行 AI 分析...');
            const insights = await analyzeTrends(data.projects);

            console.log('\n📝 生成 HTML 页面...');
            const html = generateHtml(data, insights);
            fs.writeFileSync(htmlFile, html, 'utf8');
            console.log(`✅ HTML 已生成: ${htmlFile}`);
        } else {
            console.log(`ℹ️ HTML 文件已存在: ${htmlFile}`);
        }

        console.log('\n📝 更新首页...');
        const indexHtml = generateIndexHtml();
        fs.writeFileSync(indexFile, indexHtml, 'utf8');
        console.log('✅ 首页已更新');

        if (!forceUpdate) {
            console.log('\n📤 发送飞书通知...');
            try {
                const token = await getFeishuToken();
                await sendFeishuNotification(data.date, token);
                console.log('✅ 飞书通知已发送');
            } catch (e) {
                console.error('❌ 飞书通知失败:', e.message);
            }
        }

        console.log('\n🧹 清理过期文件...');
        cleanupOldFiles();

        state.lastProcessedAt = data.generatedAt;
        saveState(state);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ 处理完成！');
}

main().catch(console.error);
