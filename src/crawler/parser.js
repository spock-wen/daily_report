const { isAIProject } = require('../utils/utils');
const config = require('../config/config');

function parseTrending(html) {
  const projects = [];
  const seen = new Set();
  
  const articleRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let articleMatch;
  
  while ((articleMatch = articleRegex.exec(html)) !== null) {
    const articleContent = articleMatch[1];
    
    const repoMatch = articleContent.match(/href="\/([^"\/]+\/[^"\/]+)"[^>]*>/);
    if (!repoMatch) continue;
    
    const repo = repoMatch[1];
    if (seen.has(repo)) continue;
    seen.add(repo);
    
    if (repo.includes('login') || repo.includes('sponsors') || repo.includes('marketplace')) continue;
    
    const descMatch = articleContent.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    const desc = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : '';
    
    const starsMatch = articleContent.match(/href="\/[^"]*\/stargazers"[^>]*>([\s\S]*?)<\/a>/);
    const stars = starsMatch ? starsMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim() : '0';
    
    const forksMatch = articleContent.match(/href="\/[^"]*\/forks"[^>]*>([\s\S]*?)<\/a>/);
    const forks = forksMatch ? forksMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim() : '0';
    
    const langMatch = articleContent.match(/<span[^>]*itemprop="programmingLanguage"[^>]*>([^<]+)<\/span>/);
    const language = langMatch ? langMatch[1].trim() : 'Unknown';
    
    const todayStarsMatch = articleContent.match(/(\d[\d,]*)\s*stars?\s*today/i);
    const todayStars = todayStarsMatch ? todayStarsMatch[1].replace(/,/g, '') : '0';
    
    const isAI = isAIProject(repo, desc, language);
    
    projects.push({
      repo,
      desc,
      stars,
      forks,
      language,
      todayStars,
      isAI
    });
    
    if (projects.length >= config.crawler.max_projects) break;
  }
  
  const aiProjects = projects.filter(p => p.isAI);
  const otherProjects = projects.filter(p => !p.isAI);
  
  const sortedProjects = [...aiProjects, ...otherProjects].slice(0, config.generator.max_display_projects);
  
  console.log(`解析完成: 共 ${projects.length} 个项目，其中 AI 相关 ${aiProjects.length} 个`);
  
  return sortedProjects;
}

module.exports = { parseTrending };
