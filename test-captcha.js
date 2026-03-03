const http = require('http');

const BASE_URL = '127.0.0.1';
const PORT = 8800;

function httpRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, headers: res.headers, data });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, data });
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

async function testCaptcha() {
    try {
        // 1. 测试生成验证码
        console.log('1. 测试生成验证码...');
        const captchaOptions = {
            hostname: BASE_URL,
            port: PORT,
            path: '/api/user/captcha',
            method: 'GET'
        };
        
        const captchaResponse = await httpRequest(captchaOptions);
        console.log('验证码生成响应状态码:', captchaResponse.status);
        console.log('验证码响应头:', captchaResponse.headers['content-type']);
        if (captchaResponse.status === 200 && captchaResponse.headers['content-type'] === 'image/svg+xml') {
            console.log('✅ 验证码生成成功');
            // 显示验证码的前100个字符（SVG内容）
            console.log('验证码SVG预览:', captchaResponse.data.substring(0, 100) + '...');
        } else {
            console.log('❌ 验证码生成失败');
            return;
        }
        
        // 2. 测试验证验证码（这里需要手动输入验证码，因为我们没有session）
        console.log('\n2. 测试验证验证码...');
        console.log('请打开浏览器访问 http://127.0.0.1:8800/api/user/captcha 查看验证码');
        console.log('然后输入验证码进行测试:');
        
        // 由于这是一个脚本，我们无法直接获取用户输入
        // 实际使用中，前端会通过表单提交验证码
        console.log('\n验证码验证功能需要在注册页面中测试');
        console.log('注册页面地址: http://127.0.0.1:8800/login/index.html');
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

testCaptcha();
