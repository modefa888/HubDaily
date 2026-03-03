const http = require('http');

const BASE_URL = '127.0.0.1';
const PORT = 8802;

function httpRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ error: 'Invalid JSON', data });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function testUserEndpoints() {
    try {
        // 1. 登录获取 token
        console.log('1. 尝试登录...');
        const loginOptions = {
            hostname: BASE_URL,
            port: PORT,
            path: '/api/user/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const loginData = await httpRequest(loginOptions, JSON.stringify({
            username: 'admin@example.com',
            password: 'admin123'
        }));
        console.log('登录响应:', loginData);
        
        if (loginData.code !== 200) {
            console.error('登录失败:', loginData.message);
            return;
        }
        
        const token = loginData.data.token;
        
        // 2. 测试各个用户相关端点
        const endpoints = [
            { path: '/api/user/profile', method: 'GET' },
            { path: '/api/user/security-question', method: 'GET' },
            { path: '/api/user/stats', method: 'GET' },
            { path: '/api/user/available-pages', method: 'GET' },
            { path: '/api/user/announcements', method: 'GET' },
            { path: '/api/user/articles?page=1&pageSize=5', method: 'GET' },
            { path: '/api/user/feedbacks?page=1&pageSize=20', method: 'GET' },
            { path: '/api/user/official-apis', method: 'GET' },
            { path: '/api/user/parse-apis', method: 'GET' },
            { path: '/api/user/route-access', method: 'GET' },
            { path: '/api/user/route-access-stats', method: 'GET' }
        ];
        
        for (const endpoint of endpoints) {
            console.log(`\n测试 ${endpoint.method} ${endpoint.path}...`);
            const options = {
                hostname: BASE_URL,
                port: PORT,
                path: endpoint.path,
                method: endpoint.method,
                headers: {
                    'x-user-token': token
                }
            };
            
            try {
                const response = await httpRequest(options);
                console.log('响应:', response);
                if (response.code === 400 && response.message === '用户ID不合法') {
                    console.log('❌ 发现问题端点:', endpoint.path);
                } else {
                    console.log('✅ 端点正常');
                }
            } catch (error) {
                console.error('请求失败:', error.message);
            }
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

testUserEndpoints();
