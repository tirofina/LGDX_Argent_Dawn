const express = require('express');
const path = require('path');
const app = express();

// 정적 파일 제공 (HTML, CSS, JS, 이미지, 비디오 파일 등)
app.use(express.static(path.join(__dirname, '/')));

// 기본 경로에서 index.html 제공
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 실행
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
