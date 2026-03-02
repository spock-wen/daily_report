const fetch = require('node-fetch');

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

let cachedToken = null;
let tokenExpireTime = 0;

async function getTenantAccessToken(appId, appSecret) {
  if (cachedToken && Date.now() < tokenExpireTime) {
    return cachedToken;
  }

  let response;
  try {
    response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
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
  } catch (error) {
    console.log(`获取飞书 token 请求失败：${error.message}, 跳过推送`);
    return null;
  }

  if (!response.ok) {
    console.log(`获取飞书 token 失败：HTTP ${response.status}, 跳过推送`);
    return null;
  }

  let result;
  try {
    result = await response.json();
  } catch (error) {
    console.log(`解析飞书 token 响应失败：${error.message}, 跳过推送`);
    return null;
  }

  if (result.code !== 0) {
    console.log(`获取飞书 token 失败：${result.msg}, 跳过推送`);
    return null;
  }

  cachedToken = result.tenant_access_token;
  tokenExpireTime = Date.now() + (result.expire - 300) * 1000;

  return cachedToken;
}

async function sendMessage(appId, appSecret, receiveId, receiveIdType, message) {
  // 检查必要配置是否存在
  if (!appId || !appSecret || !receiveId || !receiveIdType) {
    const missingConfigs = [];
    if (!appId) missingConfigs.push('App ID');
    if (!appSecret) missingConfigs.push('App Secret');
    if (!receiveId) missingConfigs.push('接收者 ID');
    if (!receiveIdType) missingConfigs.push('接收者类型');
    
    console.log(`飞书推送配置不完整 (${missingConfigs.join(', ')}),跳过推送`);
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

  let response;
  try {
    response = await fetch(`${FEISHU_API_BASE}/im/v1/messages?receive_id_type=${receiveIdType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      timeout: 15000
    });
  } catch (error) {
    console.log(`飞书消息请求失败：${error.message}, 跳过推送`);
    return null;
  }

  if (!response.ok) {
    console.log(`飞书消息发送失败：HTTP ${response.status} ${response.statusText}, 跳过推送`);
    return null;
  }

  let result;
  try {
    result = await response.json();
  } catch (error) {
    console.log(`解析飞书消息响应失败：${error.message}, 跳过推送`);
    return null;
  }

  if (result.code !== 0) {
    console.log(`飞书推送失败：${result.msg || JSON.stringify(result)}, 跳过推送`);
    return null;
  }

  console.log('✅ 飞书消息发送成功');
  return result;
}

module.exports = { sendMessage, getTenantAccessToken };
