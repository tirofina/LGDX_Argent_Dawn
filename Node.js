const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 7700 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // 받은 메시지를 다른 클라이언트에게 브로드캐스트
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('클라이언트가 연결을 끊었습니다.');
  });

  ws.send('Signaling 서버에 연결되었습니다.');
});

console.log('WebSocket Signaling 서버가 7700 포트에서 실행 중입니다.');
