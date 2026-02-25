const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// 读取简报目录
const BRIEFS_DIR = path.join(__dirname, '..', '..', config.generator.briefs_dir);
const TEMPLATES_DIR = path.join(__dirname, '..', '..', config.server.templates_dir);
const OUTPUT_DIR = path.join(__dirname, '..', '..', config.server.output_dir);

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

// 生成索引页面 HTML
function generateIndexHtml(briefs) {
  try {
    const templatePath = path.join(TEMPLATES_DIR, 'index.html');
    if (!fs.existsSync(templatePath)) {
      console.error(`模板文件 ${templatePath} 不存在`);
      return null;
    }
    
    const template = fs.readFileSync(templatePath, 'utf-8');
    const briefsJson = JSON.stringify(briefs, null, 2);
    const html = template.replace('{{BRIEFS_DATA}}', briefsJson);
    
    return html;
  } catch (error) {
    console.error('生成索引页面失败:', error.message);
    return null;
  }
}

// 生成单个简报的查看页面 HTML
function generateViewerHtml(brief) {
  try {
    const templatePath = path.join(TEMPLATES_DIR, 'viewer.html');
    if (!fs.existsSync(templatePath)) {
      console.error(`模板文件 ${templatePath} 不存在`);
      return null;
    }
    
    const template = fs.readFileSync(templatePath, 'utf-8');
    
    // 转义 Markdown 内容中的特殊字符
    let escapedContent = brief.content.replace(/`/g, '\\`').replace(/\$/g, '\\$');
    
    // 替换模板中的占位符
    let html = template.replace('{{TITLE}}', brief.title);
    html = html.replace('{{DATE}}', brief.date);
    html = html.replace('{{TIME}}', brief.time);
    html = html.replace('{{PROJECT_COUNT}}', brief.projectCount.toString());
    html = html.replace('{{AI_COUNT}}', brief.aiCount.toString());
    html = html.replace('{{MARKDOWN_CONTENT}}', escapedContent);
    
    return html;
  } catch (error) {
    console.error('生成简报详情页面失败:', error.message);
    return null;
  }
}

// 主函数
function main() {
  console.log(`开始扫描目录: ${BRIEFS_DIR}`);
  
  // 确保目录存在
  if (!fs.existsSync(BRIEFS_DIR)) {
    console.error(`错误: 目录 ${BRIEFS_DIR} 不存在`);
    return;
  }
  
  // 扫描所有 .md 文件
  const mdFiles = fs.readdirSync(BRIEFS_DIR)
    .filter(file => file.endsWith('.md'))
    .sort()
    .reverse();
  
  if (mdFiles.length === 0) {
    console.log('警告: 未找到任何 .md 文件');
    return;
  }
  
  console.log(`找到 ${mdFiles.length} 个 Markdown 文件`);
  
  // 解析所有简报
  const briefs = [];
  for (const mdFile of mdFiles) {
    console.log(`解析文件: ${mdFile}`);
    const filepath = path.join(BRIEFS_DIR, mdFile);
    const brief = parseMarkdownFile(filepath);
    if (brief) {
      // 添加 HTML 文件名用于链接
      brief.htmlFilename = brief.filename.replace('.md', '.html');
      briefs.push(brief);
    }
  }
  
  // 生成索引页面
  console.log('\n生成索引页面...');
  const indexHtml = generateIndexHtml(briefs);
  if (indexHtml) {
    const indexPath = path.join(OUTPUT_DIR, 'index.html');
    fs.writeFileSync(indexPath, indexHtml, 'utf-8');
    console.log(`✓ 索引页面已生成: ${indexPath}`);
  } else {
    console.log('警告: 无法生成索引页面');
  }
  
  // 为每个简报生成 HTML 页面
  console.log('\n生成简报详情页...');
  for (const brief of briefs) {
    console.log(`生成页面: ${brief.filename}`);
    const viewerHtml = generateViewerHtml(brief);
    
    if (!viewerHtml) {
      console.log(`警告: 无法生成页面 ${brief.filename}`);
      continue;
    }
    
    // 使用原文件名，但扩展名改为 .html
    const htmlFilename = brief.filename.replace('.md', '.html');
    const htmlPath = path.join(OUTPUT_DIR, htmlFilename);
    
    fs.writeFileSync(htmlPath, viewerHtml, 'utf-8');
    console.log(`✓ 页面已生成: ${htmlPath}`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✓ 所有页面生成完成！');
  console.log('='.repeat(50));
  console.log(`\n访问地址: http://localhost:${config.server.port}/index.html`);
  console.log(`或者直接在浏览器中打开: ${path.join(OUTPUT_DIR, 'index.html')}`);
}

// 导出函数
module.exports = {
  main,
  parseMarkdownFile,
  generateIndexHtml,
  generateViewerHtml
};

// 如果直接运行此文件
if (require.main === module) {
  main();
}