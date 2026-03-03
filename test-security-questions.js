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

async function testSecurityQuestions() {
    try {
        // 测试 /api/user/security-questions 端点
        console.log('测试 /api/user/security-questions 端点...');
        const options = {
            hostname: BASE_URL,
            port: PORT,
            path: '/api/user/security-questions',
            method: 'GET'
        };
        
        const response = await httpRequest(options);
        console.log('响应:', response);
        
        if (response.code === 200 && response.data && response.data.securityQuestions) {
            console.log('✅ 成功获取安全问题列表');
            console.log('安全问题:', response.data.securityQuestions);
        } else {
            console.log('❌ 获取安全问题列表失败');
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

testSecurityQuestions();
