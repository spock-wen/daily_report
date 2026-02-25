#!/usr/bin/env node

const { execSync } = require('child_process');
const config = require('./src/config/config');

const SERVER_USER = process.env.SERVER_USER;
const SERVER_IP = process.env.SERVER_IP;
const SERVER_PATH = process.env.SERVER_PATH;

if (!SERVER_USER || !SERVER_IP || !SERVER_PATH) {
  console.error('❌ 请配置以下环境变量:');
  if (!SERVER_USER) console.error('  - SERVER_USER: 服务器用户名');
  if (!SERVER_IP) console.error('  - SERVER_IP: 服务器IP地址');
  if (!SERVER_PATH) console.error('  - SERVER_PATH: 服务器部署路径');
  process.exit(1);
}

function deploy() {
  console.log('🚀 部署到服务器');
  console.log('='.repeat(60));
  console.log(`服务器: ${SERVER_USER}@${SERVER_IP}`);
  console.log(`路径: ${SERVER_PATH}`);
  console.log('='.repeat(60));
  
  try {
    console.log('\n📦 创建服务器目录...');
    execSync(`ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${SERVER_PATH}"`, { stdio: 'inherit' });
    
    console.log('\n📤 上传项目文件...');
    execSync(`scp -r src templates package.json package-lock.json run.js ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/`, { stdio: 'inherit' });
    
    console.log('\n📤 上传简报文件...');
    execSync(`scp -r briefs ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/`, { stdio: 'inherit' });
    
    console.log('\n📦 安装依赖...');
    execSync(`ssh ${SERVER_USER}@${SERVER_IP} "cd ${SERVER_PATH} && npm install"`, { stdio: 'inherit' });
    
    console.log('\n🌐 生成 HTML 页面...');
    execSync(`ssh ${SERVER_USER}@${SERVER_IP} "cd ${SERVER_PATH} && node src/server/generate_pages.js"`, { stdio: 'inherit' });
    
    console.log('\n🔄 重启服务器...');
    try {
      execSync(`ssh ${SERVER_USER}@${SERVER_IP} "pkill -f 'node src/server/server.js'"`, { stdio: 'inherit' });
    } catch (e) {
      console.log('没有运行中的服务器进程');
    }
    
    execSync(`ssh ${SERVER_USER}@${SERVER_IP} "cd ${SERVER_PATH} && nohup npm run server > server.log 2>&1 &"`, { stdio: 'inherit' });
    
    console.log('\n⏳ 等待服务器启动...');
    setTimeout(() => {
      console.log('\n' + '='.repeat(60));
      console.log('✅ 部署完成！');
      console.log(`🌐 访问地址: http://${SERVER_IP}:${config.server.port}`);
      console.log('='.repeat(60));
    }, 2000);
    
  } catch (error) {
    console.error('\n❌ 部署失败:', error.message);
    process.exit(1);
  }
}

deploy();