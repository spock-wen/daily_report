const { isAIProject } = require('../utils/utils');
const config = require('../config/config');

/**
 * 清理 HTML 标签和多余内容
 */
function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * 从 HTML 中提取数字（处理带逗号的数字）
 */
function extractNumber(text) {
  if (!text) return 0;
  const cleaned = cleanHtml(text).replace(/,/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * 增强版解析 GitHub Trending HTML
 */
function parseTrending(html) {
  const projects = [];
  const seen = new Set();
  
  if (!html || html.length < 1000) {
    throw new Error('HTML 内容无效，长度过短');
  }
  
  // 验证是否包含 GitHub Trending 特征
  if (!html.includes('github-trending') && !html.includes('Box-row')) {
    throw new Error('HTML 内容不包含 GitHub Trending 特征，页面结构可能已变化');
  }
  
  console.log('🔍 开始解析 HTML 内容...');
  
  // 多种解析策略，提高容错性
  
  // 策略 1: 使用 article 标签解析（GitHub 标准结构）
  const articleRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let articleMatch;
  
  while ((articleMatch = articleRegex.exec(html)) !== null) {
    const project = parseArticle(articleMatch[1]);
    if (project && !seen.has(project.repo)) {
      seen.add(project.repo);
      projects.push(project);
    }
  }
  
  // 策略 2: 如果策略 1 失败，尝试使用 div 标签解析（备用方案）
  if (projects.length === 0) {
    console.warn('⚠️ 标准解析失败，尝试备用解析方案...');
    const divRegex = /<div[^>]*class="[^"]*f4[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    while ((articleMatch = divRegex.exec(html)) !== null) {
      const project = parseArticle(articleMatch[1]);
      if (project && project.repo && !seen.has(project.repo)) {
        seen.add(project.repo);
        projects.push(project);
      }
    }
  }
  
  if (projects.length === 0) {
    throw new Error('无法解析任何项目，GitHub Trending 页面结构可能已发生重大变化');
  }
  
  console.log(`✅ 解析完成：共 ${projects.length} 个项目`);
  
  // 过滤无效项目
  const validProjects = projects.filter(p => {
    return p.repo && !p.repo.includes('login') && !p.repo.includes('sponsors');
  });
  
  // 排序：AI 项目优先
  const aiProjects = validProjects.filter(p => p.isAI);
  const otherProjects = validProjects.filter(p => !p.isAI);
  
  console.log(`📊 AI 相关项目：${aiProjects.length} 个`);
  console.log(`📊 其他项目：${otherProjects.length} 个`);
  
  // 返回前 N 个项目
  const sortedProjects = [...aiProjects, ...otherProjects].slice(0, config.generator.max_display_projects);
  
  return sortedProjects;
}

/**
 * 解析单个项目文章
 */
function parseArticle(articleContent) {
  try {
    // 提取仓库名称（多种模式匹配）
    let repo = null;
    
    // 模式 1: 标准链接
    const repoMatch = articleContent.match(/href="\/([^"\/]+\/[^"\/]+)"[^>]*>/);
    if (repoMatch) {
      repo = repoMatch[1];
    }
    
    // 模式 2: data-href 属性
    if (!repo) {
      const dataHrefMatch = articleContent.match(/data-href="\/([^"\/]+\/[^"\/]+)"/);
      if (dataHrefMatch) {
        repo = dataHrefMatch[1];
      }
    }
    
    if (!repo) return null;
    
    // 提取描述（多种模式匹配）
    let desc = '';
    
    // 模式 1: col-9 类
    const descMatch = articleContent.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    if (descMatch) {
      desc = cleanHtml(descMatch[1]);
    }
    
    // 模式 2: text-gray 类
    if (!desc) {
      const descMatch2 = articleContent.match(/<p[^>]*class="[^"]*text-gray[^"]*"[^>]*>([\s\S]*?)<\/p>/);
      if (descMatch2) {
        desc = cleanHtml(descMatch2[1]);
      }
    }
    
    // 提取 Stars 数量
    let stars = '0';
    const starsMatch = articleContent.match(/href="\/[^"]*\/stargazers"[^>]*>([\s\S]*?)<\/a>/);
    if (starsMatch) {
      stars = cleanHtml(starsMatch[1]).replace(/\s+/g, '');
    }
    
    // 提取 Forks 数量
    let forks = '0';
    const forksMatch = articleContent.match(/href="\/[^"]*\/forks"[^>]*>([\s\S]*?)<\/a>/);
    if (forksMatch) {
      forks = cleanHtml(forksMatch[1]).replace(/\s+/g, '');
    }
    
    // 提取编程语言
    let language = 'Unknown';
    const langMatch = articleContent.match(/<span[^>]*itemprop="programmingLanguage"[^>]*>([^<]+)<\/span>/);
    if (langMatch) {
      language = cleanHtml(langMatch[1]);
    }
    
    // 提取今日 Stars 增长（多种模式）
    let todayStars = '0';
    
    // 模式 1: "XXX stars today"
    const todayStarsMatch = articleContent.match(/(\d[\d,]*)\s*stars?\s*today/i);
    if (todayStarsMatch) {
      todayStars = todayStarsMatch[1].replace(/,/g, '');
    }
    
    // 模式 2: 直接数字 + star
    if (todayStars === '0') {
      const todayMatch2 = articleContent.match(/>(\d[\d,]*)\s*star/);
      if (todayMatch2) {
        todayStars = todayMatch2[1].replace(/,/g, '');
      }
    }
    
    // 判断是否是 AI 项目
    const isAI = isAIProject(repo, desc, language);
    
    return {
      repo,
      desc,
      stars,
      forks,
      language,
      todayStars,
      isAI
    };
    
  } catch (error) {
    console.warn(`⚠️ 解析项目失败：${error.message}`);
    return null;
  }
}

module.exports = { parseTrending, parseArticle, cleanHtml, extractNumber };
