const { formatDate, formatStars } = require('../utils/utils');

function generateMarkdown(projects) {
  const date = formatDate(new Date());
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  
  let md = `# 🚀 GitHub AI 项目每日简报\n\n`;
  md += `**日期**: ${date}  \n`;
  md += `**来源**: GitHub Trending (24h)  \n`;
  md += `**生成时间**: ${now}\n\n`;
  md += `---\n\n`;
  
  md += `## 📊 概览指标\n\n`;
  md += `| 指标 | 值 |\n`;
  md += `|------|------|\n`;
  md += `| 今日热门项目 | ${projects.length} 个 |\n`;
  md += `| AI 相关项目 | ${projects.filter(p => p.isAI).length} 个 |\n`;
  
  const domains = analyzeDomains(projects);
  const topDomains = Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  md += `| Top 3 领域 | ${topDomains.map(([domain, count]) => `${domain} (${count})`).join('、')} |\n`;
  
  const totalStars = projects.reduce((sum, p) => {
    const stars = parseInt(p.stars.replace(/,/g, '')) || 0;
    return sum + stars;
  }, 0);
  const avgStars = Math.round(totalStars / projects.length / 1000 * 10) / 10;
  md += `| 平均 Stars | ${avgStars}k |\n`;
  md += `\n`;
  
  md += `## 🔥 重点项目分析\n\n`;
  
  projects.forEach((project, index) => {
    const aiTag = project.isAI ? ' 🤖' : '';
    md += `### ${index + 1}. [${project.repo}](https://github.com/${project.repo})${aiTag}\n\n`;
    
    if (project.desc) {
      const translatedDesc = translateDescription(project.desc);
      md += `**描述**: ${translatedDesc}\n\n`;
    }
    
    md += `| 语言 | Stars | 今日增长 |\n`;
    md += `|------|-------|----------|\n`;
    md += `| ${project.language} | ${formatStars(project.stars)} | ⭐ ${formatStars(project.todayStars)} |\n\n`;
    
    md += `---\n\n`;
  });
  
  md += `---\n\n`;
  md += `*本简报由 GitHub Actions 自动生成*\n`;
  md += `*详细趋势分析请访问服务器页面*\n`;
  
  return md;
}

function analyzeDomains(projects) {
  const domains = {
    'LLM 工具': 0,
    'Agent 系统': 0,
    'RAG 技术': 0,
    '多模态': 0,
    '其他': 0
  };
  
  projects.forEach(project => {
    const text = `${project.repo} ${project.desc}`.toLowerCase();
    if (text.includes('llm') || text.includes('language model') || text.includes('transformer')) {
      domains['LLM 工具']++;
    } else if (text.includes('agent') || text.includes('skills') || text.includes('bot')) {
      domains['Agent 系统']++;
    } else if (text.includes('rag') || text.includes('retrieval') || text.includes('vector')) {
      domains['RAG 技术']++;
    } else if (text.includes('multimodal') || text.includes('vision') || text.includes('image')) {
      domains['多模态']++;
    } else {
      domains['其他']++;
    }
  });
  
  return domains;
}

function translateDescription(desc) {
  if (!desc) return '';
  
  const translations = {
    'An open-source SuperAgent harness that researches, codes, and creates. With the help of sandboxes, memories, tools, skills and subagents, it handles different levels of tasks that could take minutes to hours.': '一个开源的超级智能体工具，可以进行研究、编码和创作。',
    'Memory for 24/7 proactive agents like openclaw (moltbot, clawdbot).': '为 24/7 主动智能体提供记忆功能。',
    'RuVector is a High Performance, Real-Time, Self-Learning, Vector Graph Neural Network, and Database built in Rust.': '用 Rust 构建的高性能向量图神经网络和数据库。',
    'Ongoing research training transformer models at scale': '正在进行大规模训练 Transformer 模型的研究',
    'Bash is all you need - A nano Claude Code–like agent, built from 0 to 1': '一个类似 Claude Code 的微型智能体，从零构建。'
  };
  
  return translations[desc] || desc;
}

function generateFeishuMessage(projects) {
  const date = formatDate(new Date());
  
  let message = `# 🚀 GitHub AI 项目每日简报\n`;
  message += `**日期**: ${date}\n\n`;
  
  message += `## 📊 今日概览\n`;
  message += `共收录 **${projects.length}** 个热门项目`;
  
  const aiCount = projects.filter(p => p.isAI).length;
  if (aiCount > 0) {
    message += `，其中 **${aiCount}** 个 AI 相关项目`;
  }
  message += `\n\n`;
  
  message += `## 🔥 Top 5 热门项目\n\n`;
  
  projects.slice(0, 5).forEach((project, index) => {
    const aiTag = project.isAI ? ' 🤖' : '';
    message += `**${index + 1}. [${project.repo}](https://github.com/${project.repo})**${aiTag}\n`;
    
    if (project.desc) {
      const translatedDesc = translateDescription(project.desc);
      message += `> ${translatedDesc.substring(0, 60)}${translatedDesc.length > 60 ? '...' : ''}\n`;
    }
    
    message += `语言: ${project.language} | 今日星数: ⭐ ${formatStars(project.todayStars)}\n\n`;
  });
  
  message += `---\n`;
  message += `💡 详细数据和 AI 趋势分析请访问服务器页面\n`;
  
  return message;
}

function generateJsonData(projects) {
  const now = new Date().toISOString();
  const date = formatDate(new Date());
  
  const totalStars = projects.reduce((sum, p) => {
    return sum + (parseInt(p.stars.replace(/,/g, '')) || 0);
  }, 0);
  
  return {
    generatedAt: now,
    date: date,
    projects: projects.map(p => ({
      repo: p.repo,
      desc: p.desc,
      descZh: translateDescription(p.desc),
      language: p.language,
      stars: p.stars,
      todayStars: p.todayStars,
      forks: p.forks,
      isAI: p.isAI,
      url: `https://github.com/${p.repo}`
    })),
    stats: {
      totalProjects: projects.length,
      aiProjects: projects.filter(p => p.isAI).length,
      avgStars: `${Math.round(totalStars / projects.length / 1000 * 10) / 10}k`
    }
  };
}

module.exports = { generateMarkdown, generateFeishuMessage, generateJsonData };
