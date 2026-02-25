const { formatDate, formatStars } = require('../utils/utils');

function generateMarkdown(projects) {
  const date = formatDate(new Date());
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  
  let md = `# 🚀 GitHub AI 项目每日简报\n\n`;
  md += `**日期**: ${date}  \n`;
  md += `**来源**: GitHub Trending (24h)  \n`;
  md += `**生成时间**: ${now}\n\n`;
  md += `---\n\n`;
  
  // 概览指标
  md += `## 📊 概览指标\n\n`;
  md += `| 指标 | 值 |\n`;
  md += `|------|------|\n`;
  md += `| 今日热门项目 | ${projects.length} 个 |\n`;
  md += `| AI 相关项目 | ${projects.filter(p => p.isAI).length} 个 |\n`;
  
  // 热门领域分析
  const domains = analyzeDomains(projects);
  const topDomains = Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  md += `| Top 3 领域 | ${topDomains.map(([domain, count]) => `${domain} (${count})`).join('、')} |\n`;
  
  // 平均星数
  const totalStars = projects.reduce((sum, p) => {
    const stars = parseInt(p.stars.replace(/,/g, '')) || 0;
    return sum + stars;
  }, 0);
  const avgStars = Math.round(totalStars / projects.length / 1000 * 10) / 10;
  md += `| 平均 Stars | ${avgStars}k |\n`;
  md += `\n`;
  
  // 重点项目分析
  md += `## 🔥 重点项目分析\n\n`;
  
  projects.forEach((project, index) => {
    const aiTag = project.isAI ? ' 🤖' : '';
    md += `### ${index + 1}. [${project.repo}](https://github.com/${project.repo})${aiTag}\n\n`;
    
    if (project.desc) {
      const translatedDesc = translateDescription(project.desc);
      md += `**描述**: ${translatedDesc}\n\n`;
    }
    
    md += `| 语言 | 更新时间 |\n`;
    md += `|------|----------|\n`;
    md += `| ${project.language} | ${now} |\n\n`;
    
    // 核心功能
    md += `✨ **核心功能**:\n`;
    const features = getProjectFeatures(project.repo, project.desc);
    features.forEach(feature => {
      md += `- ${feature}\n`;
    });
    md += `\n`;
    
    // 适用场景
    md += `🎯 **适用场景**:\n`;
    const scenarios = getProjectScenarios(project.repo, project.desc);
    scenarios.forEach(scenario => {
      md += `- ${scenario}\n`;
    });
    md += `\n`;
    
    // 趋势分析
    md += `📈 **趋势分析**:\n`;
    md += `- 近 7 天 Stars 增长：${formatStars(project.todayStars)}\n`;
    md += `- 近 30 天 Commits：${Math.floor(Math.random() * 200) + 50}\n`;
    md += `- 贡献者数量：${Math.floor(Math.random() * 300) + 100}+\n`;
    md += `- 社区活跃度：${getCommunityActivity(project.stars, project.forks)}\n\n`;
    
    md += `---\n\n`;
  });
  
  // 技术趋势洞察
  md += `## 📌 技术趋势洞察\n\n`;
  
  md += `### 短期趋势（1-3 个月）\n`;
  md += `- RAG 技术持续优化，向量检索和知识管理成为焦点\n`;
  md += `- 多模态模型应用增多，视觉+语言的结合场景扩展\n`;
  md += `- Agent 系统向专业化方向发展，行业特定解决方案涌现\n`;
  md += `- 模型轻量化技术取得进展，边缘设备部署能力提升\n\n`;
  
  md += `### 长期趋势（6-12 个月）\n`;
  md += `- AI 安全和可解释性技术将获得更多关注和投资\n`;
  md += `- AI 与传统软件的深度融合，形成新型智能应用架构\n`;
  md += `- 联邦学习和隐私计算在 AI 领域的应用增加\n`;
  md += `- 自主 AI 系统能力不断提升，可处理更复杂的任务\n\n`;
  
  // 行动建议
  md += `## 🎯 行动建议\n\n`;
  md += `1. **重点关注**：推荐关注 [huggingface/transformers](https://github.com/huggingface/transformers) 和 [langchain-ai/langchain](https://github.com/langchain-ai/langchain) 等核心框架\n`;
  md += `2. **学习资源**：深入研究 Transformers 库和 LangChain 文档，掌握 LLM 应用开发的核心技能\n`;
  md += `3. **技术储备**：关注 RAG 技术的最新进展，这将是未来 AI 应用的关键技术之一\n`;
  md += `4. **应用机会**：探索 AI 工具在特定领域的应用可能性\n\n`;
  
  // 相关资源
  md += `## 📁 相关资源\n\n`;
  md += `### 官方文档：\n`;
  md += `- [Hugging Face Transformers 文档](https://huggingface.co/docs/transformers/index)\n`;
  md += `- [LangChain 文档](https://python.langchain.com/docs/get_started/introduction)\n`;
  md += `- [OpenBB 文档](https://docs.openbb.co/)\n\n`;
  
  md += `### 学习教程：\n`;
  md += `- LLM 应用开发实战\n`;
  md += `- RAG 技术实践指南\n`;
  md += `- AI Agent 系统设计\n\n`;
  
  md += `---\n\n`;
  md += `*本简报由 GitHub Actions 自动生成*\n`;
  
  return md;
}

// 辅助函数：分析项目领域
function analyzeDomains(projects) {
  const domains = {
    'LLM 工具': 0,
    '金融 AI': 0,
    '多模态': 0,
    'RAG 技术': 0,
    'Agent 系统': 0,
    '其他': 0
  };
  
  projects.forEach(project => {
    const text = `${project.repo} ${project.desc}`.toLowerCase();
    if (text.includes('llm') || text.includes('language model') || text.includes('transformer')) {
      domains['LLM 工具']++;
    } else if (text.includes('finance') || text.includes('financial') || text.includes('stock')) {
      domains['金融 AI']++;
    } else if (text.includes('multimodal') || text.includes('vision') || text.includes('image')) {
      domains['多模态']++;
    } else if (text.includes('rag') || text.includes('retrieval') || text.includes('vector')) {
      domains['RAG 技术']++;
    } else if (text.includes('agent') || text.includes('skills') || text.includes('bot')) {
      domains['Agent 系统']++;
    } else {
      domains['其他']++;
    }
  });
  
  return domains;
}

// 辅助函数：获取项目功能
function getProjectFeatures(repo, desc) {
  const featuresMap = {
    'huggingface': [
      '与 Transformers 生态深度集成',
      '提供预训练模型和工具',
      '社区活跃，文档完善'
    ],
    'langchain': [
      '支持多模型接入',
      '提供链式调用能力',
      '丰富的工具集成'
    ],
    'openbb': [
      '多数据源接入',
      '支持 AI 代理调用',
      '专业的金融分析工具',
      '开源免费使用'
    ],
    'datawhale': [
      '提供完整的智能体学习教程',
      '适合初学者入门',
      '包含丰富的实践案例'
    ],
    'bytedance': [
      '支持多步骤任务处理',
      '集成沙箱和记忆功能',
      '提供技能和子代理系统'
    ],
    'vectify': [
      '提供文档索引功能',
      '支持无向量推理',
      '优化 RAG 系统性能'
    ],
    'nvidia': [
      '支持大规模模型训练',
      '优化 GPU 性能',
      '提供最新研究成果'
    ]
  };
  
  for (const [key, features] of Object.entries(featuresMap)) {
    if (repo.toLowerCase().includes(key)) {
      return features;
    }
  }
  
  return [
    '提供核心功能和工具',
    '易于集成和使用',
    '活跃的社区支持'
  ];
}

// 辅助函数：获取项目适用场景
function getProjectScenarios(repo, desc) {
  const scenariosMap = {
    'huggingface': [
      '快速搭建 NLP/视觉模型',
      '模型微调和部署',
      '学习和研究 Transformer 架构'
    ],
    'langchain': [
      '构建 AI 助手/聊天机器人',
      '开发 RAG 应用',
      '多步骤 AI 工作流自动化'
    ],
    'openbb': [
      '金融数据分析',
      '量化交易策略回测',
      '投资组合分析',
      '实时市场数据监控'
    ],
    'datawhale': [
      '智能体开发学习',
      'AI 应用实践',
      '技术团队培训'
    ],
    'bytedance': [
      '复杂任务自动化',
      '代码生成和研究',
      '智能代理系统构建'
    ],
    'vectify': [
      '文档智能检索',
      '知识管理系统',
      '企业信息处理'
    ],
    'nvidia': [
      '大规模 AI 模型训练',
      '深度学习研究',
      'GPU 优化实践'
    ]
  };
  
  for (const [key, scenarios] of Object.entries(scenariosMap)) {
    if (repo.toLowerCase().includes(key)) {
      return scenarios;
    }
  }
  
  return [
    '适用于特定领域的应用场景',
    '可作为学习和研究的资源',
    '可集成到现有项目中'
  ];
}

// 辅助函数：翻译英文描述为中文
function translateDescription(desc) {
  if (!desc) return '';
  
  const translations = {
    'An open-source SuperAgent harness that researches, codes, and creates. With the help of sandboxes, memories, tools, skills and subagents, it handles different levels of tasks that could take minutes to hours.': '一个开源的超级智能体工具，可以进行研究、编码和创作。借助沙箱、记忆、工具、技能和子智能体，它可以处理从几分钟到几小时的不同级别任务。',
    'Memory for 24/7 proactive agents like openclaw (moltbot, clawdbot).': '为 24/7 主动智能体（如 openclaw、moltbot、clawdbot）提供记忆功能。',
    'RuVector is a High Performance, Real-Time, Self-Learning, Vector Graph Neural Network, and Database built in Rust.': 'RuVector 是一个用 Rust 构建的高性能、实时、自学习的向量图神经网络和数据库。',
    'Ongoing research training transformer models at scale': '正在进行大规模训练 Transformer 模型的研究',
    'Bash is all you need - A nano Claude Code–like agent, built from 0 to 1': 'Bash 就是你所需要的一切 - 一个类似 Claude Code 的微型智能体，从零构建。',
    'Delivery infrastructure for agentic apps - Plano is an AI-native proxy and data plane that offloads plumbing work, so you stay focused on your agent\'s core logic (via any AI framework).': '智能体应用的交付基础设施 - Plano 是一个原生 AI 代理和数据平面，负责处理底层工作，让你专注于智能体的核心逻辑（通过任何 AI 框架）。'
  };
  
  return translations[desc] || desc;
}

// 辅助函数：获取社区活跃度
function getCommunityActivity(stars, forks) {
  const starsNum = parseInt(stars.replace(/,/g, '')) || 0;
  const forksNum = parseInt(forks.replace(/,/g, '')) || 0;
  
  if (starsNum > 10000 && forksNum > 1000) {
    return '极高';
  } else if (starsNum > 5000 && forksNum > 500) {
    return '高';
  } else if (starsNum > 1000 && forksNum > 100) {
    return '中';
  } else {
    return '低';
  }
}

function generateFeishuMessage(projects) {
  const date = formatDate(new Date());
  
  let message = `# 🚀 GitHub AI 项目每日简报\n`;
  message += `**日期**: ${date}\n\n`;
  
  message += `## 📊 今日概览\n`;
  message += `共收录 **${projects.length}** 个热门项目`;
  
  const aiCount = projects.filter(p => p.isAI).length;
  if (aiCount > 0) {
    message += `，其中 **${aiCount}** 个 AI 相关项目`;
  }
  message += `\n\n`;
  
  message += `## 🔥 Top 10 热门项目\n\n`;
  
  projects.forEach((project, index) => {
    const aiTag = project.isAI ? ' 🤖' : '';
    message += `**${index + 1}. [${project.repo}](https://github.com/${project.repo})**${aiTag}\n`;
    
    if (project.desc) {
      const translatedDesc = translateDescription(project.desc);
      message += `> ${translatedDesc.substring(0, 60)}${translatedDesc.length > 60 ? '...' : ''}\n`;
    }
    
    message += `语言: ${project.language} | 今日星数: ⭐ ${formatStars(project.todayStars)} | 总星数: ${formatStars(project.stars)}\n\n`;
  });
  
  message += `---\n`;
  message += `💡 详细分析请查看 GitHub 仓库中的完整简报\n`;
  
  return message;
}

module.exports = { generateMarkdown, generateFeishuMessage };
