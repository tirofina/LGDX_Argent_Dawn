const express = require('express');
const path = require('path');
const app = express();
const port = 9080;

// public 폴더 내의 정적 파일을 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 페이지 A 라우팅
app.get('/pageA', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pageA.html'));
});

// 페이지 B 라우팅
app.get('/pageB', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pageB.html'));
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
