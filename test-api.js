const http = require('http');

http.get('http://127.0.0.1:8802/api/share/s_nqJPQfi88A', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(data);
    });
}).on('error', (err) => {
    console.error(err);
});
