#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 GitHub 每日简报系统');
console.log('='.repeat(60));
console.log(`启动时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
console.log('='.repeat(60));

try {
  console.log('\n📊 正在执行抓取和生成...');
  execSync('node src/crawler/crawl.js', { stdio: 'inherit' });
  
  console.log('\n🌐 正在生成 HTML 页面...');
  execSync('node src/server/generate_pages.js', { stdio: 'inherit' });
  
  console.log('\n🚀 系统准备就绪！');
  console.log('\n可以通过以下命令启动本地服务器：');
  console.log('   npm run server');
  console.log('\n然后访问：http://localhost:8080');
  console.log('\n或者使用以下命令部署到服务器：');
  console.log('   node deploy.js');
  
} catch (error) {
  console.error('\n❌ 执行失败:', error.message);
  process.exit(1);
}