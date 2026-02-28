const fetch = require('node-fetch');

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * 延迟执行
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 调用 GitHub API 获取项目详细信息
 * @param {string} repo - 仓库名称 (格式：owner/repo)
 * @param {string} token - GitHub Token (可选，用于提高速率限制)
 * @returns {Promise<Object>} 项目详细信息
 */
async function fetchRepoDetails(repo, token = null) {
  const url = `${GITHUB_API_BASE}/repos/${repo}`;
  
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Brief-System'
  };
  
  // 如果有 token，添加认证
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('GitHub API 速率限制已达，请设置 GITHUB_TOKEN 环境变量');
      }
      throw new Error(`GitHub API 返回错误：${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      // 基本信息
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      language: data.language,
      
      // 统计信息
      stars: data.stargazers_count,
      forks: data.forks_count,
      watchers: data.watchers_count,
      open_issues: data.open_issues_count,
      
      // 时间信息
      created_at: data.created_at,
      updated_at: data.updated_at,
      pushed_at: data.pushed_at,
      
      // 社区信息
      subscribers_count: data.subscribers_count,
      has_issues: data.has_issues,
      has_wiki: data.has_wiki,
      has_pages: data.has_pages,
      has_discussions: data.has_discussions,
      
      // 许可证
      license: data.license ? data.license.name : null,
      
      // 其他
      homepage: data.homepage,
      topics: data.topics || [],
      is_fork: data.fork,
      is_archived: data.archived,
      is_disabled: data.disabled,
      default_branch: data.default_branch
    };
  } catch (error) {
    console.error(`获取 ${repo} 详细信息失败:`, error.message);
    return null;
  }
}

/**
 * 获取项目的 Commits 统计信息
 * @param {string} repo - 仓库名称
 * @param {string} token - GitHub Token
 * @returns {Promise<Object>} Commits 统计
 */
async function fetchCommitStats(repo, token = null) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Brief-System'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  try {
    // 获取最近 30 天的 commits
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString();
    
    const url = `${GITHUB_API_BASE}/repos/${repo}/commits?since=${since}&per_page=1`;
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      return null;
    }
    
    // 从 Link header 中解析总 commits 数
    const linkHeader = response.headers.get('link');
    let commitCount = 0;
    
    if (linkHeader) {
      const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
      if (match) {
        commitCount = parseInt(match[1], 10);
      }
    }
    
    // 获取贡献者数量
    const contributorsUrl = `${GITHUB_API_BASE}/repos/${repo}/contributors?per_page=1`;
    const contributorsResponse = await fetch(contributorsUrl, { headers });
    
    let contributorsCount = 0;
    if (contributorsResponse.ok) {
      const contributorsLink = contributorsResponse.headers.get('link');
      if (contributorsLink) {
        const match = contributorsLink.match(/&page=(\d+)>; rel="last"/);
        if (match) {
          contributorsCount = parseInt(match[1], 10);
        }
      }
    }
    
    return {
      commits_last_30_days: commitCount,
      contributors_count: contributorsCount
    };
  } catch (error) {
    console.error(`获取 ${repo} Commits 统计失败:`, error.message);
    return null;
  }
}

/**
 * 批量获取多个项目的详细信息
 * @param {Array} projects - 项目列表
 * @param {string} token - GitHub Token
 * @returns {Promise<Array>} 增强后的项目列表
 */
async function enhanceProjects(projects, token = null) {
  const enhanced = [];
  
  for (const project of projects) {
    try {
      console.log(`📡 获取 ${project.repo} 详细信息...`);
      
      // 获取详细信息
      const details = await fetchRepoDetails(project.repo, token);
      
      if (details) {
        enhanced.push({
          ...project,
          ...details,
          
          // 格式化时间
          update_time: formatTime(details.updated_at),
          created_time: formatTime(details.created_at),
          
          // 标记是否成功获取详细信息
          has_api_data: true
        });
      } else {
        enhanced.push({
          ...project,
          has_api_data: false
        });
      }
      
      // 避免触发速率限制，添加延迟
      if (token) {
        await sleep(100);
      } else {
        await sleep(1000); // 未认证时速率限制更严格，需要更长延迟
      }
      
    } catch (error) {
      console.error(`处理 ${project.repo} 失败:`, error.message);
      enhanced.push({
        ...project,
        has_api_data: false
      });
    }
  }
  
  return enhanced;
}

/**
 * 格式化时间
 */
function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

/**
 * 生成项目详细分析报告
 */
function generateDetailedReport(project) {
  if (!project.has_api_data) {
    return null;
  }
  
  const report = {
    // 基本信息
    name: project.full_name,
    description: project.description || project.desc,
    language: project.language || project.language,
    homepage: project.homepage,
    topics: project.topics,
    
    // 统计信息
    stars: formatNumber(project.stars),
    forks: formatNumber(project.forks),
    watchers: formatNumber(project.watchers),
    open_issues: project.open_issues,
    
    // 时间信息
    created_at: project.created_time,
    updated_at: project.update_time,
    pushed_at: formatTime(project.pushed_at),
    
    // 社区信息
    subscribers: project.subscribers_count,
    has_issues: project.has_issues,
    has_wiki: project.has_wiki,
    has_discussions: project.has_discussions,
    
    // 许可证
    license: project.license,
    
    // 状态
    is_archived: project.is_archived,
    is_fork: project.is_fork,
    default_branch: project.default_branch
  };
  
  return report;
}

/**
 * 格式化数字（添加逗号）
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

module.exports = {
  fetchRepoDetails,
  fetchCommitStats,
  enhanceProjects,
  generateDetailedReport,
  formatTime,
  formatNumber
};
