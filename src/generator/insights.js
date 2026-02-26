const { formatStars } = require('../utils/utils');

function analyzeTechTrends(projects) {
  const insights = {
    shortTerm: [],
    longTerm: [],
    emerging: [],
    hotTopics: []
  };

  const languages = {};
  const keywords = {
    'RAG': ['rag', 'retrieval', 'vector', 'embedding', 'knowledge'],
    'Agent': ['agent', 'skills', 'subagent', 'autonomous', 'tool'],
    'Multimodal': ['vision', 'image', 'video', 'multimodal', 'audio'],
    'LLM': ['llm', 'transformer', 'gpt', 'claude', 'model'],
    'Edge AI': ['lightweight', 'edge', 'on-device', 'quantization'],
    'Security': ['security', 'privacy', 'federated', 'encryption']
  };

  projects.forEach(project => {
    const text = `${project.repo} ${project.desc}`.toLowerCase();

    if (project.language) {
      languages[project.language] = (languages[project.language] || 0) + 1;
    }

    for (const [category, terms] of Object.entries(keywords)) {
      const matches = terms.filter(term => text.includes(term.toLowerCase()));
      if (matches.length > 0) {
        if (!insights.hotTopics[category]) {
          insights.hotTopics[category] = 0;
        }
        insights.hotTopics[category] += matches.length;
      }
    }
  });

  const sortedLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topTopics = Object.entries(insights.hotTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topTopics.length > 0) {
    const [topCategory, count] = topTopics[0];
    insights.shortTerm.push(`🔥 ${topCategory} 技术热度最高，当天有 ${count} 个相关项目`);
  }

  if (sortedLanguages.length > 0) {
    const [topLang] = sortedLanguages[0];
    insights.shortTerm.push(`💻 ${topLang[0]} 语言主导，占比 ${Math.round(topLang[1] / projects.length * 100)}%`);
  }

  const ragCount = insights.hotTopics['RAG'] || 0;
  const agentCount = insights.hotTopics['Agent'] || 0;
  if (ragCount > 0 && agentCount > 0) {
    insights.shortTerm.push(`🤖 RAG + Agent 组合架构成为主流，${ragCount} 个 RAG 项目 + ${agentCount} 个 Agent 项目`);
  }

  if (insights.hotTopics['Edge AI'] > 0) {
    insights.longTerm.push(`📱 边缘 AI 技术持续发展，轻量化模型部署能力提升`);
  }

  if (insights.hotTopics['Security'] > 0) {
    insights.longTerm.push(`🔒 AI 安全和隐私保护技术获得更多关注`);
  }

  const totalHotTopics = Object.values(insights.hotTopics).reduce((a, b) => a + b, 0);
  if (totalHotTopics > projects.length * 0.5) {
    insights.emerging.push(`🌟 新兴 AI 技术生态正在快速形成，多技术融合趋势明显`);
  }

  return insights;
}

function generateActionRecommendations(projects, insights) {
  const recommendations = [];

  const languages = [...new Set(projects.map(p => p.language).filter(Boolean))];
  const topLanguages = languages.slice(0, 3);

  const hotTopics = Object.entries(insights.hotTopics || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);

  if (topLanguages.includes('Python')) {
    recommendations.push({
      priority: 'high',
      category: '学习资源',
      title: 'Python AI 生态',
      items: [
        '深入学习 Hugging Face Transformers 库',
        '掌握 LangChain 框架核心概念',
        '实践 RAG 技术栈实现'
      ]
    });
  }

  if (topLanguages.includes('TypeScript') || topLanguages.includes('JavaScript')) {
    recommendations.push({
      priority: 'medium',
      category: '学习资源',
      title: '前端 AI 应用',
      items: [
        '学习 Vercel AI SDK',
        '实践浏览器端 AI 模型部署',
        '探索 Next.js + AI 集成方案'
      ]
    });
  }

  if (hotTopics.includes('RAG')) {
    recommendations.push({
      priority: 'high',
      category: '技术储备',
      title: 'RAG 技术栈',
      items: [
        '学习向量数据库（Pinecone、Qdrant）',
        '掌握文档分割和嵌入技术',
        '实践检索增强生成流程'
      ]
    });
  }

  if (hotTopics.includes('Agent')) {
    recommendations.push({
      priority: 'high',
      category: '技术储备',
      title: 'Agent 系统开发',
      items: [
        '学习 LangChain Agent 模式',
        '实践多智能体协作架构',
        '掌握工具调用和记忆管理'
      ]
    });
  }

  if (hotTopics.includes('Multimodal')) {
    recommendations.push({
      priority: 'medium',
      category: '应用机会',
      title: '多模态应用',
      items: [
        '探索视觉 + 语言组合场景',
        '实践图像理解与生成',
        '开发视频分析应用'
      ]
    });
  }

  const avgStars = projects.reduce((sum, p) => {
    return sum + parseInt(p.stars.replace(/,/g, '') || 0);
  }, 0) / projects.length;

  if (avgStars > 10000) {
    recommendations.push({
      priority: 'medium',
      category: '重点关注',
      title: '高星数项目',
      items: [
        '关注高星数项目的技术架构',
        '学习其社区运营策略',
        '参考其文档和代码质量'
      ]
    });
  }

  return recommendations;
}

function formatInsightsMarkdown(insights) {
  let md = `## 📌 技术趋势洞察\n\n`;

  md += `### 短期趋势（1-3 个月）\n`;
  if (insights.shortTerm.length > 0) {
    insights.shortTerm.forEach(insight => {
      md += `- ${insight}\n`;
    });
  } else {
    md += `- 数据量不足，暂无明显趋势\n`;
  }
  md += `\n`;

  md += `### 长期趋势（6-12 个月）\n`;
  if (insights.longTerm.length > 0) {
    insights.longTerm.forEach(insight => {
      md += `- ${insight}\n`;
    });
  } else {
    md += `- AI 与传统软件深度融合，形成新型智能应用架构\n`;
    md += `- 自主 AI 系统能力不断提升，可处理更复杂的任务\n`;
  }
  md += `\n`;

  md += `### 新兴技术方向\n`;
  if (insights.emerging.length > 0) {
    insights.emerging.forEach(insight => {
      md += `- ${insight}\n`;
    });
  } else {
    md += `- 联邦学习和隐私计算在 AI 领域的应用增加\n`;
  }
  md += `\n`;

  return md;
}

function formatRecommendationsMarkdown(recommendations) {
  let md = `## 🎯 行动建议\n\n`;

  const priorityGroups = {
    high: [],
    medium: [],
    low: []
  };

  recommendations.forEach(rec => {
    priorityGroups[rec.priority].push(rec);
  });

  const priorityLabels = {
    high: '🔴 高优先级',
    medium: '🟡 中优先级',
    low: '🟢 低优先级'
  };

  for (const [priority, recs] of Object.entries(priorityGroups)) {
    if (recs.length === 0) continue;

    md += `### ${priorityLabels[priority]}\n\n`;

    recs.forEach(rec => {
      md += `**${rec.category} - ${rec.title}**\n`;
      rec.items.forEach((item, index) => {
        md += `${index + 1}. ${item}\n`;
      });
      md += `\n`;
    });
  }

  return md;
}

module.exports = {
  analyzeTechTrends,
  generateActionRecommendations,
  formatInsightsMarkdown,
  formatRecommendationsMarkdown
};
