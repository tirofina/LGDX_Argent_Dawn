let socket;

export function setupWebSocket(pageId) {
  socket = new WebSocket('ws://localhost:7703');

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'resize' && pageId === 'B') {
      const canvas = document.getElementById('glcanvas');
      canvas.style.width = `${data.width}px`;
      canvas.style.height = `${data.height}px`;
      canvas.style.left = `${data.left}px`;
      canvas.style.top = `${data.top}px`;
    }

    if (data.type === 'button-click') {
      console.log(`Button ${data.buttonId} clicked on page ${data.pageId}`);
    }
  };
}

export function sendResizeEvent(resizeData) {
  socket.send(JSON.stringify({
    type: 'resize',
    ...resizeData
  }));
}

export function sendButtonEvent(buttonId) {
  socket.send(JSON.stringify({
    type: 'button-click',
    buttonId
  }));
}
