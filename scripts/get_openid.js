#!/usr/bin/env node

const fetch = require('node-fetch');

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

async function getTenantAccessToken(appId, appSecret) {
  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret })
  });

  const result = await response.json();
  if (result.code !== 0) {
    throw new Error(`获取 token 失败: ${result.msg}`);
  }
  return result.tenant_access_token;
}

async function getUserList(token) {
  const response = await fetch(`${FEISHU_API_BASE}/contact/v3/users?page_size=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const result = await response.json();
  if (result.code !== 0) {
    throw new Error(`获取用户列表失败: ${result.msg}`);
  }
  return result.data.items;
}

async function main() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    console.error('请设置环境变量 FEISHU_APP_ID 和 FEISHU_APP_SECRET');
    console.error('可参考 .env.example 文件创建 .env 文件');
    process.exit(1);
  }

  try {
    console.log('正在获取 access token...');
    const token = await getTenantAccessToken(appId, appSecret);

    console.log('\n正在获取用户列表...');
    const users = await getUserList(token);

    console.log('\n用户列表:');
    console.log('='.repeat(80));
    users.forEach(user => {
      console.log(`姓名: ${user.name}`);
      console.log(`open_id: ${user.open_id}`);
      console.log(`user_id: ${user.user_id}`);
      console.log(`union_id: ${user.union_id}`);
      console.log('-'.repeat(80));
    });

    console.log('\n请复制你的 open_id 配置到 FEISHU_RECEIVE_ID');

  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

main();
