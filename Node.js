// 서버 (Node.js)
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 7703 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // 받은 메시지를 모든 클라이언트에게 전송
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});
