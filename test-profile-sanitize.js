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

async function testProfileSanitize() {
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
        
        // 2. 测试 /api/user/profile 端点
        console.log('\n2. 测试 /api/user/profile 端点...');
        const profileOptions = {
            hostname: BASE_URL,
            port: PORT,
            path: '/api/user/profile',
            method: 'GET',
            headers: {
                'x-user-token': token
            }
        };
        
        const profileData = await httpRequest(profileOptions);
        console.log('Profile 响应:', profileData);
        
        // 检查是否包含安全问题和答案字段
        const userData = profileData.data;
        if (userData.securityQuestion || userData.securityAnswer) {
            console.log('❌ 发现问题：profile 响应中仍然包含安全问题或答案字段');
            console.log('securityQuestion:', userData.securityQuestion);
            console.log('securityAnswer:', userData.securityAnswer);
        } else {
            console.log('✅ 成功：profile 响应中不包含安全问题和答案字段');
        }
        
        // 3. 测试 /api/user/security-question 端点
        console.log('\n3. 测试 /api/user/security-question 端点...');
        const securityQuestionOptions = {
            hostname: BASE_URL,
            port: PORT,
            path: '/api/user/security-question',
            method: 'GET',
            headers: {
                'x-user-token': token
            }
        };
        
        const securityQuestionData = await httpRequest(securityQuestionOptions);
        console.log('Security Question 响应:', securityQuestionData);
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

testProfileSanitize();
