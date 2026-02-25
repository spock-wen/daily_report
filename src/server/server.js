#!/usr/bin/env node

const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

const app = express();
const PORT = config.server.port || 8000;

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', '..')));

// 缓存机制
const cache = {};
const CACHE_DURATION = 3600000; // 1小时

// 读取简报目录
const BRIEFS_DIR = path.join(__dirname, '..', '..', config.generator.briefs_dir);

// 解析Markdown文件的函数
function parseMarkdownFile(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    
    // 提取日期
    const dateMatch = content.match(/\*\*日期\*\*:\s*([^\n]+)/);
    const date = dateMatch ? dateMatch[1].trim() : '未知日期';
    
    // 提取生成时间
    const timeMatch = content.match(/\*\*生成时间\*\*:\s*([^\n]+)/);
    const time = timeMatch ? timeMatch[1].trim() : '';
    
    // 提取项目总数
    const projectCountMatch = content.match(/今日热门项目.*?(\d+).*?个/);
    const projectCount = projectCountMatch ? parseInt(projectCountMatch[1]) : 0;
    
    // 提取 AI 项目数
    const aiCountMatch = content.match(/AI 相关项目.*?(\d+).*?个/);
    const aiCount = aiCountMatch ? parseInt(aiCountMatch[1]) : 0;
    
    // 提取热门项目（前5个）
    const projects = [];
    const projectPattern = /###\s*\d+\.\s*\[([^\]]+)\]/g;
    let match;
    while ((match = projectPattern.exec(content)) && projects.length < 5) {
      projects.push(match[1]);
    }
    
    // 提取标题
    const titleMatch = content.match(/^#\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `每日简报 - ${date}`;
    
    return {
      filename: path.basename(filepath),
      title,
      date,
      time,
      projectCount,
      aiCount,
      topProjects: projects,
      content
    };
  } catch (error) {
    console.error('解析Markdown文件失败:', error.message);
    return null;
  }
}

// API: 获取所有简报列表
app.get('/api/briefs', (req, res) => {
  const cacheKey = 'briefs_list';
  const now = Date.now();
  
  // 检查缓存
  if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_DURATION) {
    return res.json(cache[cacheKey].data);
  }
  
  try {
    if (!fs.existsSync(BRIEFS_DIR)) {
      return res.json({ success: false, message: '简报目录不存在' });
    }
    
    // 读取所有Markdown文件
    const mdFiles = fs.readdirSync(BRIEFS_DIR).filter(file => file.endsWith('.md')).sort().reverse();
    
    const briefs = mdFiles.map(file => {
      const filepath = path.join(BRIEFS_DIR, file);
      return parseMarkdownFile(filepath);
    }).filter(Boolean);
    
    // 缓存结果
    cache[cacheKey] = {
      data: { success: true, data: briefs },
      timestamp: now
    };
    
    res.json(cache[cacheKey].data);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// API: 获取单个简报详情
app.get('/api/briefs/:filename', (req, res) => {
  const { filename } = req.params;
  const cacheKey = `brief_${filename}`;
  const now = Date.now();
  
  // 检查缓存
  if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_DURATION) {
    return res.json(cache[cacheKey].data);
  }
  
  try {
    const filepath = path.join(BRIEFS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return res.json({ success: false, message: '简报不存在' });
    }
    
    const brief = parseMarkdownFile(filepath);
    
    // 缓存结果
    cache[cacheKey] = {
      data: { success: true, data: brief },
      timestamp: now
    };
    
    res.json(cache[cacheKey].data);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// API: 获取系统状态
app.get('/api/status', (req, res) => {
  const now = new Date();
  res.json({
    success: true,
    data: {
      timestamp: now.toISOString(),
      serverTime: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      version: '1.0.0'
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 GitHub 每日简报服务器');
  console.log('='.repeat(60));
  console.log(`服务器已启动，监听端口: ${PORT}`);
  console.log(`API 接口地址: http://localhost:${PORT}/api`);
  console.log(`静态文件服务: http://localhost:${PORT}`);
  console.log(`索引页面: http://localhost:${PORT}/index.html`);
  console.log('='.repeat(60));
});

module.exports = app;