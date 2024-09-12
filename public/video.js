let localStream;
const peerConnections = {};

// 웹캠 시작 함수
async function startWebcam() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInput = devices.find(device => device.kind === 'videoinput' && device.label.includes('USB webcam'));

    if (!videoInput) {
      console.error('USB webcam을 찾을 수 없습니다.');
      return;
    }

    // 웹캠 스트림 가져오기
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: videoInput.deviceId },
      audio: true
    });
    document.getElementById('video').srcObject = localStream;

    // WebRTC 연결 시작
    startWebRTC('pageA');
    startWebRTC('pageB');

  } catch (error) {
    console.error('웹캠 스트림을 가져오는 중 오류 발생:', error);
  }
}

// 페이지 로드 시 웹캠 시작
window.onload = startWebcam;
