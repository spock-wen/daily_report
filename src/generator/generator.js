const { formatDate, formatStars } = require('../utils/utils');
const { analyzeProject, detectProjectType } = require('./analyzer');
const translate = require('google-translate-api');

// 翻译缓存（避免重复翻译相同内容）
const translationCache = new Map();

// 翻译描述（使用免费的 Google 翻译）
async function translateDescription(desc) {
  if (!desc) return '';
  
  // 清理 HTML 实体
  const cleanDesc = desc.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  
  // 1. 检查是否是中文（已经有中文描述）
  if (/[\u4e00-\u9fa5]/.test(cleanDesc)) {
    return cleanDesc;
  }
  
  // 2. 检查缓存
  if (translationCache.has(cleanDesc)) {
    return translationCache.get(cleanDesc);
  }
  
  // 3. 调用 Google 翻译（免费）
  try {
    const result = await translate(cleanDesc, { to: 'zh-CN' });
    const translated = result.text;
    
    // 缓存翻译结果
    translationCache.set(cleanDesc, translated);
    
    return translated;
  } catch (error) {
    console.error('翻译失败，返回原文:', error.message);
    // 翻译失败时返回原文
    return cleanDesc;
  }
}

// 批量翻译描述（用于飞书通知）
async function batchTranslateDescriptions(descriptions) {
  const translatedMap = new Map();
  
  for (const desc of descriptions) {
    if (!desc || /[\u4e00-\u9fa5]/.test(desc)) {
      translatedMap.set(desc, desc);
      continue;
    }
    
    try {
      const result = await translate(desc, { to: 'zh-CN' });
      translatedMap.set(desc, result.text);
    } catch (error) {
      console.error('翻译失败:', desc.substring(0, 30), error.message);
      translatedMap.set(desc, desc);
    }
    
    // 避免请求过快，稍作延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return translatedMap;
}

async function generateMarkdown(projects) {
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
  
  // 批量翻译所有项目描述
  const allDescs = projects.map(p => p.desc);
  const translatedDescs = await batchTranslateDescriptions(allDescs);
  
  // 只展示前 5 个项目的详细信息
  const displayCount = Math.min(5, projects.length);
  for (let i = 0; i < displayCount; i++) {
    const project = projects[i];
    const analysis = analyzeProject(project);
    const aiTag = project.isAI ? ' 🤖' : '';
    
    md += `### ${i + 1}. [${project.repo}](https://github.com/${project.repo})${aiTag}\n\n`;
    
    // 项目类型标签
    md += `**类型**: ${analysis.typeName}\n\n`;
    
    // 描述（使用 Google 翻译）
    if (project.desc) {
      const translatedDesc = translatedDescs.get(project.desc) || project.desc;
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
  }
  
  // 添加提示：还有更多项目
  if (projects.length > displayCount) {
    md += `## 📋 更多项目\n\n`;
    md += `今日还有 **${projects.length - displayCount}** 个热门项目，详细数据请访问服务器页面查看完整列表。\n\n`;
    md += `---\n\n`;
  }
  
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
