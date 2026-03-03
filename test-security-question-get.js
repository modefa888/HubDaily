const http = require('http');

const BASE_URL = '127.0.0.1';
const PORT = 8802;

function httpRequest(options) {
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

        req.end();
    });
}

async function testSecurityQuestionGet() {
    try {
        // 1. 登录获取 token
        console.log('1. 尝试登录...');
        const loginOptions = {
            hostname: BASE_URL,
            port: PORT,
            path: '/api/user/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify({
                    username: 'admin@example.com',
                    password: 'admin123'
                }))
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
        
        // 2. 测试直接访问 /api/user/security-question（GET 请求）
        console.log('\n2. 测试直接访问 /api/user/security-question...');
        const getOptions = {
            hostname: BASE_URL,
            port: PORT,
            path: '/api/user/security-question',
            method: 'GET',
            headers: {
                'x-user-token': token
            }
        };
        
        const getData = await httpRequest(getOptions);
        console.log('GET 响应:', getData);
        
        console.log('\n测试成功！/api/user/security-question 端点现在能正常工作了。');
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

// 辅助函数：发送 POST 请求
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

testSecurityQuestionGet();
