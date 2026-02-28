const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

const CACHE_DIR = path.join(__dirname, '..', '..', 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'trending-cache.json');
const CACHE_TTL = config.crawler.cache_ttl || 3600000; // 默认 1 小时

/**
 * 延迟执行
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查缓存是否有效
 */
function isValidCache(cacheData) {
  if (!cacheData || !cacheData.timestamp) return false;
  const now = Date.now();
  return (now - cacheData.timestamp) < CACHE_TTL;
}

/**
 * 读取缓存
 */
function readCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (isValidCache(cacheData)) {
        console.log('✅ 使用缓存数据');
        return cacheData.html;
      }
    }
  } catch (error) {
    console.warn('⚠️ 读取缓存失败:', error.message);
  }
  return null;
}

/**
 * 写入缓存
 */
function writeCache(html) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const cacheData = {
      html: html,
      timestamp: Date.now(),
      url: config.crawler.github_trending_url
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
    console.log('💾 已保存缓存');
  } catch (error) {
    console.warn('⚠️ 写入缓存失败:', error.message);
  }
}

/**
 * 清除缓存
 */
function clearCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
      console.log('🗑️ 已清除缓存');
    }
  } catch (error) {
    console.warn('⚠️ 清除缓存失败:', error.message);
  }
}

/**
 * 带重试机制的获取 GitHub Trending
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<string>} HTML 内容
 */
async function fetchTrending(maxRetries = 3) {
  const url = config.crawler.github_trending_url;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌐 正在获取：${url} (尝试 ${attempt}/${maxRetries})`);
      
      // 添加随机延迟，避免请求过于频繁
      if (attempt > 1) {
        const delay = Math.random() * 2000 + 1000;
        console.log(`⏳ 等待 ${Math.round(delay)}ms 后重试...`);
        await sleep(delay);
      }
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': config.crawler.user_agent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          // 添加额外的请求头，模拟真实浏览器
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: config.crawler.timeout,
        size: 1024 * 1024 // 限制响应大小为 1MB
      });
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // 检查响应类型
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new Error(`意外的内容类型：${contentType}`);
      }
      
      const html = await response.text();
      
      // 验证 HTML 内容
      if (!html || html.length < 1000) {
        throw new Error(`HTML 内容过短：${html.length} 字符`);
      }
      
      // 检查是否包含 GitHub Trending 特征
      if (!html.includes('github-trending')) {
        throw new Error('HTML 内容不包含 GitHub Trending 特征');
      }
      
      console.log(`✅ 成功获取页面内容，长度：${html.length} 字符`);
      
      // 保存到缓存
      writeCache(html);
      
      return html;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ 尝试 ${attempt}/${maxRetries} 失败：${error.message}`);
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        console.error('💥 所有重试均失败');
        break;
      }
      
      // 检查是否是致命错误（如 DNS 解析失败）
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error('⚠️ 网络连接错误，可能无法访问 GitHub');
        break;
      }
    }
  }
  
  // 所有重试失败，尝试使用缓存
  console.warn('⚠️ 尝试使用缓存数据...');
  const cachedHtml = readCache();
  if (cachedHtml) {
    console.log('✅ 使用缓存数据作为备用');
    return cachedHtml;
  }
  
  // 缓存也不可用，抛出错误
  throw new Error(`获取 GitHub Trending 失败：${lastError.message}`);
}

/**
 * 强制刷新（不使用缓存）
 */
async function fetchTrendingForceRefresh() {
  clearCache();
  return fetchTrending();
}

module.exports = { 
  fetchTrending,
  fetchTrendingForceRefresh,
  clearCache,
  readCache
};
