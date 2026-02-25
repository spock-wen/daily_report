const fetch = require('node-fetch');

async function sendToFeishu(webhookUrl, message) {
  if (!webhookUrl) {
    console.log('未配置飞书 Webhook URL，跳过推送');
    return null;
  }
  
  console.log('正在发送消息到飞书...');
  
  const payload = {
    msg_type: 'interactive',
    card: {
      config: {
        wide_screen_mode: true
      },
      elements: [
        {
          tag: 'markdown',
          content: message
        }
      ]
    }
  };
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    timeout: 15000
  });
  
  if (!response.ok) {
    throw new Error(`飞书 Webhook 请求失败: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (result.code !== 0) {
    throw new Error(`飞书推送失败: ${result.msg || JSON.stringify(result)}`);
  }
  
  console.log('✅ 飞书消息发送成功');
  return result;
}

module.exports = { sendToFeishu };
