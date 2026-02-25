const fetch = require('node-fetch');

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

let cachedToken = null;
let tokenExpireTime = 0;

async function getTenantAccessToken(appId, appSecret) {
  if (cachedToken && Date.now() < tokenExpireTime) {
    return cachedToken;
  }

  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret
    }),
    timeout: 15000
  });

  if (!response.ok) {
    throw new Error(`获取 token 失败: ${response.status}`);
  }

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(`获取 token 失败: ${result.msg}`);
  }

  cachedToken = result.tenant_access_token;
  tokenExpireTime = Date.now() + (result.expire - 300) * 1000;

  return cachedToken;
}

async function sendMessage(appId, appSecret, receiveId, receiveIdType, message) {
  if (!appId || !appSecret) {
    console.log('未配置飞书 App ID 或 App Secret，跳过推送');
    return null;
  }

  if (!receiveId) {
    console.log('未配置飞书接收者 ID，跳过推送');
    return null;
  }

  console.log('正在发送消息到飞书...');

  const token = await getTenantAccessToken(appId, appSecret);

  const payload = {
    receive_id: receiveId,
    msg_type: 'interactive',
    content: JSON.stringify({
      config: {
        wide_screen_mode: true
      },
      elements: [
        {
          tag: 'markdown',
          content: message
        }
      ]
    })
  };

  const response = await fetch(`${FEISHU_API_BASE}/im/v1/messages?receive_id_type=${receiveIdType}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload),
    timeout: 15000
  });

  if (!response.ok) {
    throw new Error(`飞书 API 请求失败: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(`飞书推送失败: ${result.msg || JSON.stringify(result)}`);
  }

  console.log('✅ 飞书消息发送成功');
  return result;
}

module.exports = { sendMessage, getTenantAccessToken };
