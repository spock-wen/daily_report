const fetch = require('node-fetch');
const config = require('../config/config');

async function fetchTrending() {
  const url = config.crawler.github_trending_url;
  
  console.log(`正在获取: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': config.crawler.user_agent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    },
    timeout: config.crawler.timeout
  });
  
  if (!response.ok) {
    throw new Error(`GitHub 请求失败: ${response.status} ${response.statusText}`);
  }
  
  const html = await response.text();
  console.log(`成功获取页面内容，长度: ${html.length} 字符`);
  
  return html;
}

module.exports = { fetchTrending };
