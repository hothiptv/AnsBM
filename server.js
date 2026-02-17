const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Cần cài thêm: npm install axios
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Biến môi trường từ Railway
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "0904";
const GH_TOKEN = process.env.GH_TOKEN;
const REPO = "hothiptv/AnsBM";
const WEB_CHINH = process.env.WEBSITE_CHINH || "https://anshub-production.up.railway.app/";

// 1. Lối vào bí mật
app.get(`/${ADMIN_PASS}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 2. API Lưu script và tự động đẩy lên GitHub
app.post('/api/save', async (req, res) => {
    const { name, content } = req.body;
    try {
        // Lưu tạm vào server Railway
        let data = JSON.parse(fs.readFileSync('file.json', 'utf8') || '{}');
        data[name] = content;
        fs.writeFileSync('file.json', JSON.stringify(data, null, 2));

        // Tự động Push lên GitHub nếu có Token
        if (GH_TOKEN) {
            const url = `https://api.github.com/repos/${REPO}/contents/file.json`;
            const { data: ghData } = await axios.get(url, {
                headers: { Authorization: `token ${GH_TOKEN}` }
            }).catch(() => ({ data: { sha: null } }));

            await axios.put(url, {
                message: `Admin lưu file: ${name}`,
                content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
                sha: ghData.sha
            }, {
                headers: { Authorization: `token ${GH_TOKEN}` }
            });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Link Raw dành cho Roblox
app.get('/raw/:name', (req, res) => {
    const userAgent = req.headers['user-agent'] || "";
    if (userAgent.includes('Roblox')) {
        const data = JSON.parse(fs.readFileSync('file.json', 'utf8') || '{}');
        res.setHeader('Content-Type', 'text/plain');
        res.send(data[req.params.name] || "-- File không tồn tại");
    } else {
        res.send('FILE ĐƯỢC BẢO MẬT BỞI ANSCRIPT');
    }
});

// 4. API lấy danh sách tệp
app.get('/api/files', (req, res) => {
    const data = JSON.parse(fs.readFileSync('file.json', 'utf8') || '{}');
    res.json(data);
});

// Trang chủ -> Đá đi
app.get('/', (req, res) => res.redirect(WEB_CHINH));

app.listen(PORT, () => console.log(`AnsBM Hệ thống sẵn sàng tại mã /${ADMIN_PASS}`));
