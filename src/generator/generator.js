const { formatDate, formatStars } = require('../utils/utils');
const { analyzeProject, detectProjectType } = require('./analyzer');

// 扩展的翻译字典
const TRANSLATIONS = {
  // Agent 相关
  'An open-source SuperAgent harness that researches, codes, and creates. With the help of sandboxes, memories, tools, skills and subagents, it handles different levels of tasks that could take minutes to hours.': '一个开源的超级智能体工具，可以进行研究、编码和创作。借助沙箱、记忆、工具、技能和子智能体，它可以处理从几分钟到几小时的不同级别任务。',
  'Memory for 24/7 proactive agents like openclaw (moltbot, clawdbot).': '为 24/7 主动智能体（如 openclaw、moltbot、clawdbot）提供记忆功能。',
  'Bash is all you need - A nano Claude Code–like agent, built from 0 to 1': 'Bash 就是你所需要的一切 - 一个类似 Claude Code 的微型智能体，从零构建。',
  
  // RAG / 向量相关
  'RuVector is a High Performance, Real-Time, Self-Learning, Vector Graph Neural Network, and Database built in Rust.': 'RuVector 是一个用 Rust 构建的高性能、实时、自学习的向量图神经网络和数据库。',
  'PageIndex: Document Index for Vectorless, Reasoning-based RAG': '📑 PageIndex：面向无向量、基于推理的 RAG 的文档索引',
  
  // LLM / 训练相关
  'Ongoing research training transformer models at scale': '正在进行大规模训练 Transformer 模型的研究',
  
  // 语音相关
  'Fast and accurate automatic speech recognition (ASR) for edge devices': '针对边缘设备的快速准确自动语音识别(ASR)',
  
  // 开发工具
  'A cross-platform desktop All-in-One assistant tool for Claude Code, Codex, OpenCode & Gemini CLI.': 'Claude Code、Codex、OpenCode 和 Gemini CLI 的跨平台桌面一体化助手工具。',
  'The leading agent orchestration platform for Claude. Deploy intelligent multi-agent swarms, coordinate autonomous workflows, and build conversational AI systems. Features enterprise-grade architecture, distributed swarm intelligence, RAG integration, and native Claude Code / Codex Integration': '🌊 领先的 Claude 智能体编排平台。部署智能多智能体集群，协调自主工作流，构建对话式 AI 系统。具有企业级架构、分布式集群智能、RAG 集成以及原生 Claude Code / Codex 集成',
  
  // 教程/学习
  '《从零开始构建智能体》——从零开始的智能体原理与实践教程': '📚 《从零开始构建智能体》——从零开始的智能体原理与实践教程',
  
  // 基础设施
  'Development at the speed of light': '以光速进行开发',
  'Smart infrastructure for agentic applications - Plano is a purpose-built AI-native proxy and data plane that handles the undifferentiated heavy lifting involved in building agents (via any AI framework).': '智能体应用的交付基础设施 - Plano 是一个原生 AI 代理和数据平面，负责处理构建智能体所需的底层工作（通过任何 AI 框架）。',
  
  // 综合资源
  '程序员鱼皮的 AI 资源大全 + Vibe Coding 零基础教程，分享大模型选择指南（DeepSeek / GPT / Gemini / Claude）、最新 AI 资讯、Prompt 提示词大全、AI 知识百科（RAG / MCP / A2A）、AI 编程教程、AI 工具用法（Cursor / Claude Code / OpenClaw / TRAE / Lovable / Agent Skills）、AI 开发框架教程（Spring AI / LangChain）、AI 产品变现指南，帮你快速掌握 AI 技术，走在时代前沿。': '程序员鱼皮的 AI 资源大全 + Vibe Coding 零基础教程，分享大模型选择指南、最新 AI 资讯、Prompt 提示词大全、AI 知识百科、AI 编程教程、AI 工具用法、AI 开发框架教程、AI 产品变现指南，帮你快速掌握 AI 技术，走在时代前沿。'
};

function translateDescription(desc) {
  if (!desc) return '';
  
  // 清理 HTML 实体
  const cleanDesc = desc.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  
  // 1. 直接匹配（0 tokens）
  if (TRANSLATIONS[cleanDesc]) {
    return TRANSLATIONS[cleanDesc];
  }
  
  // 2. 关键词匹配（0 tokens）- 基于项目类型
  const keywords = [
    { pattern: /speech|asr|voice|audio/i, translation: '语音识别/音频处理工具' },
    { pattern: /agent|orchestration|workflow/i, translation: '智能体编排/工作流工具' },
    { pattern: /vector|rag|retrieval|embedding/i, translation: '向量检索/RAG 工具' },
    { pattern: /llm|language model|transformer/i, translation: '大语言模型工具' },
    { pattern: /cli|terminal|command/i, translation: '命令行工具' },
    { pattern: /sandbox|container|runtime/i, translation: '沙箱/容器工具' },
    { pattern: /tutorial|guide|learn|course/i, translation: '教程/学习资源' },
    { pattern: /api|sdk|library|framework/i, translation: '开发框架/库' },
  ];
  
  for (const { pattern, translation } of keywords) {
    if (pattern.test(cleanDesc)) {
      return translation;
    }
  }
  
  // 3. 部分匹配（0 tokens）- 智能匹配前 30 个字符
  for (const [key, value] of Object.entries(TRANSLATIONS)) {
    const cleanKey = key.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const matchLength = Math.min(30, cleanDesc.length, cleanKey.length);
    if (cleanDesc.substring(0, matchLength) === cleanKey.substring(0, matchLength)) {
      return value;
    }
    // 或者包含关系
    if (cleanDesc.length > 50 && cleanKey.length > 50 && 
        (cleanDesc.includes(cleanKey.substring(0, 50)) || cleanKey.includes(cleanDesc.substring(0, 50)))) {
      return value;
    }
  }
  
  // 4. 未匹配的描述，保留英文（由 OpenClaw 批量翻译）
  return cleanDesc;
}

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
    const analysis = analyzeProject(project);
    const aiTag = project.isAI ? ' 🤖' : '';
    
    md += `### ${index + 1}. [${project.repo}](https://github.com/${project.repo})${aiTag}\n\n`;
    
    // 项目类型标签
    md += `**类型**: ${analysis.typeName}\n\n`;
    
    // 描述
    if (project.desc) {
      const translatedDesc = translateDescription(project.desc);
      md += `**描述**: ${translatedDesc}\n\n`;
    }
    
    // 基础信息表格
    md += `| 语言 | Stars | 今日增长 | 社区活跃度 |\n`;
    md += `|------|-------|----------|------------|\n`;
    md += `| ${project.language} | ${formatStars(project.stars)} | ⭐ ${formatStars(project.todayStars)} | ${analysis.community.level} |\n\n`;
    
    // 核心功能
    md += `✨ **核心功能**:\n`;
    analysis.coreFunctions.forEach(func => {
      md += `- ${func}\n`;
    });
    md += `\n`;
    
    // 适用场景
    md += `🎯 **适用场景**:\n`;
    analysis.useCases.forEach(useCase => {
      md += `- ${useCase}\n`;
    });
    md += `\n`;
    
    // 趋势分析
    if (analysis.trends.length > 0) {
      md += `📈 **趋势分析**:\n`;
      analysis.trends.forEach(trend => {
        md += `- ${trend}\n`;
      });
      md += `\n`;
    }
    
    md += `---\n\n`;
  });
  
  // 技术趋势洞察占位符 - 由 OpenClaw 生成
  md += `## 📌 技术趋势洞察\n\n`;
  md += `*正在由 OpenClaw AI 分析生成中...*\n\n`;
  
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
    '语音处理': 0,
    '开发工具': 0,
    '数据库': 0,
    '其他': 0
  };
  
  projects.forEach(project => {
    const type = detectProjectType(project.repo, project.desc);
    const domainMap = {
      'llm': 'LLM 工具',
      'agent': 'Agent 系统',
      'rag': 'RAG 技术',
      'speech': '语音处理',
      'devtool': '开发工具',
      'database': '数据库',
      'general': '其他'
    };
    domains[domainMap[type] || '其他']++;
  });
  
  return domains;
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
    const analysis = analyzeProject(project);
    const aiTag = project.isAI ? ' 🤖' : '';
    message += `**${index + 1}. [${project.repo}](https://github.com/${project.repo})**${aiTag}\n`;
    
    if (project.desc) {
      const translatedDesc = translateDescription(project.desc);
      message += `> ${translatedDesc.substring(0, 60)}${translatedDesc.length > 60 ? '...' : ''}\n`;
    }
    
    message += `类型: ${analysis.typeName} | 语言: ${project.language} | 今日: ⭐ ${formatStars(project.todayStars)}\n\n`;
  });
  
  message += `---\n`;
  message += `💡 详细数据和 AI 趋势分析请访问服务器页面\n`;
  
  return message;
}

// 生成极简的 summary 数据，用于给 AI 分析
function generateSummaryForAI(projects) {
  const typeCount = {};
  const langCount = {};
  let totalTodayStars = 0;
  let maxTodayStars = 0;
  let topProject = null;
  
  const projectSummaries = projects.map(p => {
    const type = detectProjectType(p.repo, p.desc);
    typeCount[type] = (typeCount[type] || 0) + 1;
    langCount[p.language] = (langCount[p.language] || 0) + 1;
    
    const todayStars = parseInt(p.todayStars?.replace(/,/g, '')) || 0;
    totalTodayStars += todayStars;
    if (todayStars > maxTodayStars) {
      maxTodayStars = todayStars;
      topProject = p.repo;
    }
    
    return {
      name: p.repo,
      type: type,
      lang: p.language,
      stars: p.stars,
      todayStars: p.todayStars,
      desc: translateDescription(p.desc).substring(0, 50) // 只取前50字
    };
  });
  
  // 找出最热门的类型和语言
  const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];
  const topLang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0];
  
  return {
    date: formatDate(new Date()),
    total: projects.length,
    aiCount: projects.filter(p => p.isAI).length,
    avgStars: `${Math.round(projects.reduce((sum, p) => sum + (parseInt(p.stars.replace(/,/g, '')) || 0), 0) / projects.length / 1000 * 10) / 10}k`,
    topType: topType ? { name: topType[0], count: topType[1] } : null,
    topLang: topLang ? { name: topLang[0], count: topLang[1] } : null,
    topProject: topProject,
    maxTodayStars: maxTodayStars,
    hotProjectCount: projects.filter(p => (parseInt(p.todayStars?.replace(/,/g, '')) || 0) > 300).length,
    projects: projectSummaries
  };
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
      url: `https://github.com/${p.repo}`,
      analysis: analyzeProject(p)
    })),
    stats: {
      totalProjects: projects.length,
      aiProjects: projects.filter(p => p.isAI).length,
      avgStars: `${Math.round(totalStars / projects.length / 1000 * 10) / 10}k`
    },
    // 新增：给 AI 分析的极简 summary
    summary: generateSummaryForAI(projects)
  };
}

module.exports = { generateMarkdown, generateFeishuMessage, generateJsonData };
