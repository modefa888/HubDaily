const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 接口列表
const APIs = [
  { name: 'bilibili', url: '/api/bilibili' },
  { name: 'weibo', url: '/api/weibo' },
  { name: 'zhihu', url: '/api/zhihu' },
  { name: 'baidu', url: '/api/baidu' },
  { name: 'douyin', url: '/api/douyin' },
  { name: 'douyin_new', url: '/api/douyin_new' },
  { name: 'douyin_music', url: '/api/douyin_music' },
  { name: 'douban_new', url: '/api/douban_new' },
  { name: 'douban_group', url: '/api/douban_group' },
  { name: 'tieba', url: '/api/tieba' },
  { name: 'sspai', url: '/api/sspai' },
  { name: 'ithome', url: '/api/ithome' },
  { name: 'thepaper', url: '/api/thepaper' },
  { name: 'toutiao', url: '/api/toutiao' },
  { name: '36kr', url: '/api/36kr' },
  { name: 'juejin', url: '/api/juejin' },
  { name: 'newsqq', url: '/api/newsqq' },
  { name: 'netease', url: '/api/netease' },
  { name: 'lol', url: '/api/lol' },
  { name: 'genshin', url: '/api/genshin' },
  { name: 'weread', url: '/api/weread' },
  { name: 'kuaishou', url: '/api/kuaishou' },
  { name: 'netease_music_toplist', url: '/api/netease_music_toplist?type=1' },
  { name: 'qq_music_toplist', url: '/api/qq_music_toplist?type=1' },
  { name: 'ngabbs', url: '/api/ngabbs' },
  { name: 'github', url: '/api/github' },
  { name: 'v2ex', url: '/api/v2ex' },
  { name: 'calendar', url: '/api/calendar' }
];

// 测试单个接口
async function testAPI(api) {
  try {
    const response = await axios.get(`http://localhost:8800${api.url}`, {
      timeout: 10000
    });
    
    if (response.status === 200 && response.data.code === 200) {
      return { name: api.name, status: '🟢', message: '正常' };
    } else {
      return { name: api.name, status: '🟠', message: '返回异常' };
    }
  } catch (error) {
    return { name: api.name, status: '❌', message: error.message };
  }
}

// 测试所有接口
async function testAllAPIs() {
  console.log('开始测试接口可用性...');
  
  const results = [];
  for (const api of APIs) {
    console.log(`测试: ${api.name}`);
    const result = await testAPI(api);
    results.push(result);
    console.log(`${result.name}: ${result.status} - ${result.message}`);
  }
  
  return results;
}

// 更新README.md
function updateREADME(results) {
  const readmePath = path.join(__dirname, 'README.md');
  let content = fs.readFileSync(readmePath, 'utf8');
  
  // 创建接口状态映射
  const statusMap = {};
  results.forEach(result => {
    statusMap[result.name] = result.status;
  });
  
  // 更新表格中的状态
  content = content.replace(/\| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|/g, (match, site, category, name, oldStatus) => {
    // 处理 douyin / douyin_new 的情况
    if (name.includes('/')) {
      const names = name.split('/').map(n => n.trim());
      const statuses = names.map(n => statusMap[n] || oldStatus);
      // 如果有任何一个接口正常，就显示正常
      const finalStatus = statuses.includes('🟢') ? '🟢' : 
                         statuses.includes('🟠') ? '🟠' : '❌';
      return `| ${site} | ${category} | ${name} | ${finalStatus} |`;
    } else {
      const newStatus = statusMap[name.trim()] || oldStatus;
      return `| ${site} | ${category} | ${name} | ${newStatus} |`;
    }
  });
  
  fs.writeFileSync(readmePath, content, 'utf8');
  console.log('README.md 已更新');
}

// 主函数
async function main() {
  try {
    const results = await testAllAPIs();
    updateREADME(results);
    console.log('测试完成！');
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

main();
