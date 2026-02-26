const AI_KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'deep learning',
  'neural network', 'nlp', 'natural language processing', 'computer vision',
  'gpt', 'llm', 'large language model', 'transformer', 'bert', 'chatgpt',
  'openai', 'langchain', 'llama', 'stable diffusion', 'midjourney',
  'hugging face', 'huggingface', 'pytorch', 'tensorflow', 'keras',
  'reinforcement learning', 'gan', 'generative', 'embedding', 'vector',
  'rag', 'retrieval augmented', 'fine-tuning', 'finetuning',
  'autogpt', 'agent', 'copilot', 'assistant', 'chatbot',
  'speech recognition', 'text-to-speech', 'tts', 'asr', 'ocr',
  'object detection', 'image generation', 'text generation',
  'prompt', 'inference', 'training', 'model', 'dataset',
  '人工智能', '机器学习', '深度学习', '神经网络', '自然语言处理',
  '计算机视觉', '大模型', '生成式', '智能'
];

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatStars(stars) {
  const num = parseInt(stars.replace(/,/g, '')) || 0;
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return stars;
}

function isAIProject(repo, desc, language) {
  const textToCheck = `${repo} ${desc} ${language}`.toLowerCase();
  
  return AI_KEYWORDS.some(keyword => textToCheck.includes(keyword.toLowerCase()));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  formatDate,
  formatStars,
  isAIProject,
  sleep,
  AI_KEYWORDS
};
