const express = require('express');
const app = express();
const port = 9080;

// public 폴더에 있는 파일들을 서빙
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
