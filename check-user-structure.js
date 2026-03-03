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

async function checkUserStructure() {
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
        
        // 2. 更新安全问题答案，确保有正确的存储结构
        console.log('\n2. 更新安全问题答案...');
        const updateSecurityQuestionOptions = {
            hostname: BASE_URL,
            port: PORT,
            path: '/api/user/security-question',
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-token': token
            }
        };
        
        const updateSecurityQuestionData = await httpRequest(updateSecurityQuestionOptions, JSON.stringify({
            securityQuestion: '您的出生城市是？',
            securityAnswer: '北京'
        }));
        console.log('更新安全问题响应:', updateSecurityQuestionData);
        
        // 3. 测试验证安全问题答案
        console.log('\n3. 测试验证安全问题答案...');
        const verifySecurityAnswerOptions = {
            hostname: BASE_URL,
            port: PORT,
            path: '/api/user/verify-security-answer',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const verifySecurityAnswerData = await httpRequest(verifySecurityAnswerOptions, JSON.stringify({
            userId: loginData.data.user._id,
            securityAnswer: '北京'
        }));
        console.log('验证安全问题答案响应:', verifySecurityAnswerData);
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

checkUserStructure();
