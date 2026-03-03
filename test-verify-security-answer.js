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

async function testVerifySecurityAnswer() {
    try {
        // 1. 测试 /api/user/forgot-password 端点，获取用户的安全问题
        console.log('1. 测试 /api/user/forgot-password 端点...');
        const forgotPasswordOptions = {
            hostname: BASE_URL,
            port: PORT,
            path: '/api/user/forgot-password',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const forgotPasswordData = await httpRequest(forgotPasswordOptions, JSON.stringify({
            email: 'admin@example.com'
        }));
        console.log('Forgot Password 响应:', forgotPasswordData);
        
        if (forgotPasswordData.code !== 200) {
            console.error('获取安全问题失败:', forgotPasswordData.message);
            return;
        }
        
        const { userId, securityQuestion } = forgotPasswordData.data;
        console.log('用户ID:', userId);
        console.log('安全问题:', securityQuestion);
        
        // 2. 测试 /api/user/verify-security-answer 端点，验证安全问题答案
        console.log('\n2. 测试 /api/user/verify-security-answer 端点...');
        const verifySecurityAnswerOptions = {
            hostname: BASE_URL,
            port: PORT,
            path: '/api/user/verify-security-answer',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // 假设答案是 "北京"
        const verifySecurityAnswerData = await httpRequest(verifySecurityAnswerOptions, JSON.stringify({
            userId: userId,
            securityAnswer: '北京'
        }));
        console.log('Verify Security Answer 响应:', verifySecurityAnswerData);
        
        if (verifySecurityAnswerData.code === 200) {
            console.log('✅ 验证成功！安全问题答案正确');
        } else {
            console.log('❌ 验证失败：', verifySecurityAnswerData.message);
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

testVerifySecurityAnswer();
