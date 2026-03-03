const { formatDate, formatStars } = require('../utils/utils');
const { analyzeProject, detectProjectType } = require('./analyzer');
const fetch = require('node-fetch');

// 翻译缓存（避免重复翻译相同内容）
const translationCache = new Map();

// 翻译描述（使用 MyMemory Translation API - 免费无需 API key）
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
  
  // 3. 使用 MyMemory Translation API（免费，无需 API key）
  // API 文档：https://mymemory.translated.net/doc/spec.php
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanDesc)}&langpair=en|zh-CN`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
      const translated = data.responseData.translatedText;
      
      // 缓存翻译结果
      translationCache.set(cleanDesc, translated);
      
      return translated;
    } else {
      throw new Error(data.responseDetails || 'Translation failed');
    }
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
      // 直接使用 translateDescription 函数，它已经包含了缓存和错误处理
      const translated = await translateDescription(desc);
      translatedMap.set(desc, translated);
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
    let stars = 0;
    if (typeof p.stars === 'string') {
      stars = parseInt(p.stars.replace(/,/g, ''), 10);
    } else if (typeof p.stars === 'number') {
      stars = p.stars;
    }
    return sum + (isNaN(stars) ? 0 : stars);
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

async function generateFeishuMessage(projects) {
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
  
  for (let i = 0; i < Math.min(5, projects.length); i++) {
    const project = projects[i];
    const analysis = analyzeProject(project);
    const aiTag = project.isAI ? ' 🤖' : '';
    message += `**${i + 1}. [${project.repo}](https://github.com/${project.repo})**${aiTag}\n`;
    
    if (project.desc) {
      const translatedDesc = await translateDescription(project.desc);
      message += `> ${translatedDesc.substring(0, 60)}${translatedDesc.length > 60 ? '...' : ''}\n`;
    }
    
    message += `类型: ${analysis.typeName} | 语言: ${project.language} | 今日: ⭐ ${formatStars(project.todayStars)}\n\n`;
  }
  
  message += `---\n`;
  message += `💡 详细数据和 AI 趋势分析请访问服务器页面\n`;
  
  return message;
}

// 生成极简的 summary 数据，用于给 AI 分析
async function generateSummaryForAI(projects) {
  const typeCount = {};
  const langCount = {};
  let totalTodayStars = 0;
  let maxTodayStars = 0;
  let topProject = null;
  
  const projectSummaries = await Promise.all(projects.map(async p => {
    const type = detectProjectType(p.repo, p.desc);
    typeCount[type] = (typeCount[type] || 0) + 1;
    langCount[p.language] = (langCount[p.language] || 0) + 1;
    
    let todayStars = 0;
    if (typeof p.todayStars === 'string') {
      todayStars = parseInt(p.todayStars.replace(/,/g, ''), 10) || 0;
    } else if (typeof p.todayStars === 'number') {
      todayStars = p.todayStars;
    }
    
    totalTodayStars += todayStars;
    if (todayStars > maxTodayStars) {
      maxTodayStars = todayStars;
      topProject = p.repo;
    }
    
    const translatedDesc = await translateDescription(p.desc);
    return {
      name: p.repo,
      type: type,
      lang: p.language,
      stars: p.stars,
      todayStars: p.todayStars,
      desc: translatedDesc.substring(0, 50) // 只取前50字
    };
  }));
  
  // 找出最热门的类型和语言
  const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];
  const topLang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0];
  
  const totalStarsVal = projects.reduce((sum, p) => {
    let stars = 0;
    if (typeof p.stars === 'string') {
      stars = parseInt(p.stars.replace(/,/g, ''), 10) || 0;
    } else if (typeof p.stars === 'number') {
      stars = p.stars;
    }
    return sum + stars;
  }, 0);

  return {
    date: formatDate(new Date()),
    total: projects.length,
    aiCount: projects.filter(p => p.isAI).length,
    avgStars: `${Math.round(totalStarsVal / projects.length / 1000 * 10) / 10}k`,
    topType: topType ? { name: topType[0], count: topType[1] } : null,
    topLang: topLang ? { name: topLang[0], count: topLang[1] } : null,
    topProject: topProject,
    maxTodayStars: maxTodayStars,
    hotProjectCount: projects.filter(p => {
      let todayStars = 0;
      if (typeof p.todayStars === 'string') {
        todayStars = parseInt(p.todayStars.replace(/,/g, ''), 10) || 0;
      } else if (typeof p.todayStars === 'number') {
        todayStars = p.todayStars;
      }
      return todayStars > 300;
    }).length,
    projects: projectSummaries
  };
}

async function generateJsonData(projects) {
  const now = new Date().toISOString();
  const date = formatDate(new Date());
  
  const totalStars = projects.reduce((sum, p) => {
    let stars = 0;
    if (typeof p.stars === 'string') {
      stars = parseInt(p.stars.replace(/,/g, ''), 10) || 0;
    } else if (typeof p.stars === 'number') {
      stars = p.stars;
    }
    return sum + stars;
  }, 0);
  
  // 批量翻译项目描述
  const allDescs = projects.map(p => p.desc);
  const translatedDescs = await batchTranslateDescriptions(allDescs);
  
  return {
    generatedAt: now,
    date: date,
    projects: projects.map(p => {
      const analysis = analyzeProject(p);
      return {
        // 基础信息
        repo: p.repo,
        name: p.name,
        fullName: p.full_name,
        desc: p.desc,
        descZh: translatedDescs.get(p.desc),
        language: p.language,
        homepage: p.homepage,
        topics: p.topics || [],
        
        // 统计信息
        stars: p.stars,
        forks: p.forks,
        watchers: p.watchers,
        openIssues: p.open_issues,
        todayStars: p.todayStars,
        
        // 时间信息
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        pushedAt: p.pushed_at,
        updateTime: p.update_time,
        createdTime: p.created_time,
        
        // 社区信息
        subscribersCount: p.subscribers_count,
        hasIssues: p.has_issues,
        hasWiki: p.has_wiki,
        hasDiscussions: p.has_discussions,
        
        // 许可证
        license: p.license,
        
        // 状态
        isFork: p.is_fork,
        isArchived: p.is_archived,
        defaultBranch: p.default_branch,
        
        // GitHub API 详细数据标记
        hasApiData: p.has_api_data,
        
        // AI 标记
        isAI: p.isAI,
        
        // 链接
        url: `https://github.com/${p.repo}`,
        
        // 分析结果（包含类型、核心功能、适用场景、趋势分析）
        analysis: {
          type: analysis.type,
          typeName: analysis.typeName,
          coreFunctions: analysis.coreFunctions,
          useCases: analysis.useCases,
          trends: analysis.trends,
          community: analysis.community
        }
      };
    }),
    stats: {
      totalProjects: projects.length,
      aiProjects: projects.filter(p => p.isAI).length,
      avgStars: `${Math.round(totalStars / projects.length / 1000 * 10) / 10}k`
    },
    // 新增：给 AI 分析的极简 summary
    summary: await generateSummaryForAI(projects)
  };
}

module.exports = { generateMarkdown, generateFeishuMessage, generateJsonData };
