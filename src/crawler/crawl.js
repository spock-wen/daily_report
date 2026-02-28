#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { fetchTrending } = require('./fetcher');
const { parseTrending } = require('./parser');
const { generateMarkdown, generateFeishuMessage, generateJsonData } = require('../generator/generator');
const { sendMessage } = require('../generator/feishu');
const config = require('../config/config');

const BRIEF_DIR = path.join(__dirname, '..', '..', config.generator.briefs_dir);
const DATE = new Date().toISOString().split('T')[0];
const OUTPUT_FILE = path.join(BRIEF_DIR, `github-ai-trending-${DATE}.md`);

const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const FEISHU_RECEIVE_ID = process.env.FEISHU_RECEIVE_ID;
const FEISHU_RECEIVE_ID_TYPE = process.env.FEISHU_RECEIVE_ID_TYPE || 'chat_id';

async function main() {
  console.log('🦞 大龙虾 GitHub 简报生成器');
  console.log('='.repeat(50));
  console.log(`启动时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log('='.repeat(50));
  
  try {
    if (!fs.existsSync(BRIEF_DIR)) {
      fs.mkdirSync(BRIEF_DIR, { recursive: true });
      console.log(`创建简报目录: ${BRIEF_DIR}`);
    }
    
    console.log('\n📊 正在获取 GitHub Trending 数据...');
    const html = await fetchTrending();
    
    console.log('\n🔍 正在解析项目信息...');
    const projects = parseTrending(html);
    
    if (projects.length === 0) {
      throw new Error('未解析到任何项目，请检查 GitHub Trending 页面结构是否变化');
    }
    
    console.log('\n📝 正在生成简报...');
    const md = await generateMarkdown(projects);
    fs.writeFileSync(OUTPUT_FILE, md, 'utf8');
    console.log(`✅ 简报已生成：${OUTPUT_FILE}`);
    
    const jsonFile = path.join(BRIEF_DIR, 'data.json');
    const jsonData = generateJsonData(projects);
    fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log(`✅ 数据文件已生成：${jsonFile}`);
    
    if (FEISHU_APP_ID && FEISHU_APP_SECRET && FEISHU_RECEIVE_ID) {
      console.log('\n📤 正在发送到飞书...');
      const feishuMessage = await generateFeishuMessage(projects);
      await sendMessage(FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_RECEIVE_ID, FEISHU_RECEIVE_ID_TYPE, feishuMessage);
    } else {
      console.log('\n⚠️ 未配置飞书凭证，跳过推送');
      console.log('提示：请设置环境变量 FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_RECEIVE_ID');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ 简报生成完成！');
    console.log(`📄 文件位置: ${OUTPUT_FILE}`);
    console.log(`📊 项目数量: ${projects.length}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ 生成失败:', error.message);
    console.error('\n详细错误信息:');
    console.error(error.stack);
    process.exit(1);
  }
}

main();