const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const ADMIN_PASS = process.env.ADMIN_PASSWORD || "0904";
const GH_TOKEN = process.env.GH_TOKEN;
const REPO = "hothiptv/AnsBM";
const WEB_CHINH = "https://anshub-production.up.railway.app/";

// Hàm đồng bộ lên GitHub
async function syncToGithub(data, fileName) {
    if (!GH_TOKEN) return;
    try {
        const url = `https://api.github.com/repos/${REPO}/contents/file.json`;
        const { data: ghData } = await axios.get(url, {
            headers: { Authorization: `token ${GH_TOKEN}` }
        }).catch(() => ({ data: { sha: null } }));

        await axios.put(url, {
            message: `Admin cập nhật: ${fileName}`,
            content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
            sha: ghData.sha
        }, {
            headers: { Authorization: `token ${GH_TOKEN}` }
        });
    } catch (e) { console.error("Lỗi đồng bộ GitHub:", e.message); }
}

// 1. Vào trang chủ -> Đá sang web chính
app.get('/', (req, res) => res.redirect(WEB_CHINH));

// 2. Vào cổng Admin
app.get(`/${ADMIN_PASS}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 3. API Lưu & Xóa
app.post('/api/save', async (req, res) => {
    const { name, content, isDelete } = req.body;
    let data = JSON.parse(fs.readFileSync('file.json', 'utf8') || '{}');
    
    if (isDelete) {
        delete data[name];
    } else {
        data[name] = content;
    }
    
    fs.writeFileSync('file.json', JSON.stringify(data, null, 2));
    await syncToGithub(data, name);
    res.json({ success: true });
});

// 4. Link Raw Bảo Mật: /raw/:name/:pass
app.get('/raw/:name/:pass', (req, res) => {
    if (req.params.pass !== ADMIN_PASS) {
        return res.send('FILE ĐƯỢC BẢO MẬT BỞI ANSCRIPT');
    }
    const data = JSON.parse(fs.readFileSync('file.json', 'utf8') || '{}');
    res.setHeader('Content-Type', 'text/plain');
    res.send(data[req.params.name] || "-- Không tìm thấy file");
});

app.get('/api/files', (req, res) => {
    res.json(JSON.parse(fs.readFileSync('file.json', 'utf8') || '{}'));
});

app.listen(PORT, () => console.log(`Hệ thống chạy tại /${ADMIN_PASS}`));
