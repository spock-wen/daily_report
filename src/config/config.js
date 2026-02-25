const fs = require('fs');
const path = require('path');

// 配置文件路径
const configPath = path.join(__dirname, 'config.json');

// 读取配置文件
function loadConfig() {
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    return config;
  } catch (error) {
    console.error('读取配置文件失败:', error.message);
    // 返回默认配置
    return {
      crawler: {
        github_trending_url: 'https://github.com/trending?since=daily',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        timeout: 30000,
        max_projects: 25
      },
      generator: {
        briefs_dir: 'briefs',
        max_display_projects: 10,
        feishu_webhook_url: ''
      },
      server: {
        port: 8000,
        host: 'localhost',
        templates_dir: 'templates',
        output_dir: '.'
      },
      deployment: {
        server_ip: '',
        server_user: '',
        server_path: '',
        ssh_key_path: ''
      }
    };
  }
}

// 导出配置
const config = loadConfig();

module.exports = config;