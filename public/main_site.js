let localStream;
const peerConnections = {};

// 웹캠 시작 함수
async function startWebcam() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInput = devices.find(
      (device) =>
        device.kind === "videoinput" && device.label.includes("USB webcam")
    );

    if (!videoInput) {
      console.error("USB webcam을 찾을 수 없습니다.");
      return;
    }

    // 웹캠 스트림 가져오기
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: videoInput.deviceId },
      audio: true,
    });
    document.getElementById("video").srcObject = localStream; // ID를 video로 변경

    // WebRTC 연결 시작
    startWebRTC("pageA");
    startWebRTC("pageB");
  } catch (error) {
    console.error("웹캠 스트림을 가져오는 중 오류 발생:", error);
  }
}

// WebRTC 연결 설정 함수
function startWebRTC(page) {
  const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[page] = peerConnection;

  // 로컬 스트림의 모든 트랙을 추가
  localStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, localStream));

  // ICE 후보 생성 시 처리
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      // ICE 후보를 JSON으로 직렬화하여 전송
      window.frames[page === "pageA" ? 0 : 1].postMessage(
        { type: "iceCandidate", candidate: JSON.stringify(event.candidate) },
        "*"
      );
    }
  };

  // Offer 생성 후 pageA 또는 pageB로 전송
  peerConnection
    .createOffer()
    .then((offer) => {
      peerConnection.setLocalDescription(offer);
      // Offer를 JSON으로 직렬화하여 전송
      window.frames[page === "pageA" ? 0 : 1].postMessage(
        { type: "offer", offer: JSON.stringify(offer) },
        "*"
      );
    })
    .catch((error) => console.error("Offer 생성 중 오류:", error));
}

// pageA와 pageB에서 온 메시지 처리
window.addEventListener("message", (event) => {
  const { type, answer, candidate, page } = event.data;
  const peerConnection = peerConnections[page];

  if (type === "answer") {
    // Answer를 JSON으로 파싱한 후 RTCSessionDescription 객체로 변환
    const parsedAnswer = new RTCSessionDescription(JSON.parse(answer));
    peerConnection
      .setRemoteDescription(parsedAnswer)
      .catch((error) => console.error("Answer 설정 중 오류:", error));
  }

  if (type === "iceCandidate") {
    // ICE 후보를 JSON으로 파싱한 후 RTCIceCandidate 객체로 변환
    const parsedCandidate = new RTCIceCandidate(JSON.parse(candidate));
    peerConnection
      .addIceCandidate(parsedCandidate)
      .catch((error) => console.error("ICE 후보 추가 중 오류:", error));
  }
});

// 페이지 로드 시 웹캠 시작
window.onload = startWebcam;
