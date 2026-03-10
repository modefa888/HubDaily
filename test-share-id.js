// 直接复制生成分享ID的函数逻辑
const generateShareIdFromContent = (title, apiName) => {
    const crypto = require("crypto");
    const content = (title || "") + (apiName || "");
    const hash = crypto.createHash("md5").update(content).digest("hex");
    const num = parseInt(hash.substring(0, 8), 16);
    let encrypted = Buffer.from(String(num)).toString("base64").replace(/[\+\/=]/g, "");
    while (encrypted.length < 18) {
        encrypted += Math.random().toString(36).substring(2, 10);
    }
    encrypted = encrypted.substring(0, 18);
    return `s_${encrypted}`;
};

// 测试生成分享ID
const testTitle = '测试视频';
const testApiName = 'test-api';

const shareId = generateShareIdFromContent(testTitle, testApiName);
console.log('生成的分享ID:', shareId);
console.log('分享ID长度:', shareId.length);
console.log('是否以s_开头:', shareId.startsWith('s_'));
console.log('是否为20长度:', shareId.length === 20);

// 测试不同参数
const testCases = [
    ['视频1', 'api1'],
    ['视频2', 'api2'],
    ['视频3', 'api3'],
];

testCases.forEach(([title, apiName], index) => {
    const id = generateShareIdFromContent(title, apiName);
    console.log(`\n测试用例 ${index + 1}:`);
    console.log('标题:', title);
    console.log('接口名:', apiName);
    console.log('生成的ID:', id);
    console.log('长度:', id.length);
    console.log('是否有效:', id.length === 20 && id.startsWith('s_'));
});
