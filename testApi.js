const http = require('http');

// 测试搜索关键字统计API
const options = {
  hostname: 'localhost',
  port: 8800,
  path: '/api/user/search-keywords/stats',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('API响应:', data);
  });
});

req.on('error', (e) => {
  console.error('连接错误:', e);
});

req.end();
