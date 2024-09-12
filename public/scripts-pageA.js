// redirect via BroadcastChannel
document.addEventListener("DOMContentLoaded", function () {
  const card4 = document.getElementById("card4");
  const channel = new BroadcastChannel("redirect_channel");

  // Card 4 클릭 시 리다이렉트 동작
  card4.addEventListener("click", () => {
    syncRedirect();
    redirectToPageC();
  });

  // Page C로 리다이렉트
  function redirectToPageC() {
    window.location.href = "pageC.html";
  }

  // 리다이렉트 동기화
  function syncRedirect() {
    channel.postMessage({ type: "redirect", target: "pageC" });
  }

  // 다른 페이지에서 리다이렉트 수신
  channel.onmessage = (event) => {
    if (event.data.type === "redirect" && event.data.target === "pageC") {
      redirectToPageC();
    }
  };
});

// click event sync
window.addEventListener("message", function (event) {
  if (event.data === "clickCard1") {
    // Simulate card 1 click
    const card1 = document.getElementById("card1");
    card1.click(); // or you can trigger any specific function for this card
  }
});

// card effects
document.addEventListener("DOMContentLoaded", function () {
  const card1 = document.getElementById("card1");
  const card2 = document.getElementById("card2");
  const card3 = document.getElementById("card3");
  const overlay = document.getElementById("overlay");
  const syncKey = "syncOverlay";
  const glowSyncKey = "syncGlow";
  const zIndexSyncKey = "syncZIndex";
  let isOverlayVisible = false;
  let isGlowActive = false;

  // Card 1 클릭 시 덮개 토글
  card1.addEventListener("click", () => {
    toggleOverlay(card1);
    syncOverlay(isOverlayVisible, "card1");
    syncZIndex("card1", isOverlayVisible ? 10001 : 50); // z-index 공유, 해제 시 50으로 설정
  });

  // Card 2 클릭 시 글로우 효과 토글
  card2.addEventListener("click", () => {
    toggleGlowEffect(card2);
    syncGlowEffect(isGlowActive, "card2");
    syncZIndex("card2", isGlowActive ? 10001 : 50); // z-index 공유, 해제 시 50으로 설정
  });

  // Card 3 클릭 시 덮개 + 글로우 효과 모두 적용
  card3.addEventListener("click", () => {
    toggleOverlay(card3);
    toggleGlowEffect(card3);
    syncOverlay(isOverlayVisible, "card3");
    syncGlowEffect(isGlowActive, "card3");
    syncZIndex("card3", isOverlayVisible || isGlowActive ? 10001 : 50); // z-index 공유
  });

  // 덮개 토글 함수
  function toggleOverlay(card) {
    isOverlayVisible = !isOverlayVisible;
    if (isOverlayVisible) {
      overlay.style.display = "block";
      overlay.style.zIndex = "10000"; // 덮개 z-index
      card.style.zIndex = "10001"; // 클릭된 카드 z-index
      overlay.style.animation = "fadeInDark 0.5s ease forwards"; // 어두워지는 애니메이션
    } else {
      overlay.style.animation = "fadeOutDark 0.5s ease forwards"; // 밝아지는 애니메이션
      setTimeout(() => {
        overlay.style.display = "none";
        card.style.zIndex = "50"; // 해제 시 z-index 50으로 설정
      }, 500);
    }
  }

  // 덮개 상태 동기화
  function syncOverlay(visible, cardId) {
    const eventData = {
      type: "toggleOverlay",
      visible: visible,
      targetCard: cardId,
    };
    localStorage.setItem(syncKey, JSON.stringify(eventData));
  }

  // 글로우 효과 토글 함수
  function toggleGlowEffect(card) {
    isGlowActive = !isGlowActive;
    card.classList.toggle("glow-effect");
    if (!isGlowActive) {
      card.style.zIndex = "50"; // 글로우 해제 시 z-index 50으로 설정
    }
  }

  // 글로우 상태 동기화
  function syncGlowEffect(glowState, cardId) {
    const glowEvent = {
      type: "toggleGlow",
      active: glowState,
      targetCard: cardId,
    };
    localStorage.setItem(glowSyncKey, JSON.stringify(glowEvent));
  }

  // z-index 동기화
  function syncZIndex(cardId, zIndexValue) {
    const zIndexEvent = {
      type: "updateZIndex",
      targetCard: cardId,
      zIndex: zIndexValue,
    };
    localStorage.setItem(zIndexSyncKey, JSON.stringify(zIndexEvent));
  }

  // 다른 페이지에서 덮개, 글로우, z-index 상태 동기화 수신
  window.addEventListener("storage", (e) => {
    if (e.key === syncKey && e.newValue) {
      const eventData = JSON.parse(e.newValue);
      const targetCard = document.getElementById(eventData.targetCard);
      isOverlayVisible = eventData.visible;
      if (isOverlayVisible) {
        overlay.style.display = "block";
        overlay.style.zIndex = "10000";
        targetCard.style.zIndex = "10001";
        overlay.style.animation = "fadeInDark 0.5s ease forwards";
      } else {
        overlay.style.animation = "fadeOutDark 0.5s ease forwards";
        setTimeout(() => {
          overlay.style.display = "none";
          targetCard.style.zIndex = "50"; // 해제 시 z-index 50으로 설정
        }, 500);
      }
    }

    if (e.key === glowSyncKey && e.newValue) {
      const glowEvent = JSON.parse(e.newValue);
      const targetCard = document.getElementById(glowEvent.targetCard);
      isGlowActive = glowEvent.active;
      if (isGlowActive) {
        targetCard.classList.add("glow-effect");
        targetCard.style.zIndex = "10001"; // 글로우가 활성화된 카드 z-index 10001
      } else {
        targetCard.classList.remove("glow-effect");
        targetCard.style.zIndex = "50"; // 글로우 해제 시 z-index 50으로 설정
      }
    }

    if (e.key === zIndexSyncKey && e.newValue) {
      const zIndexEvent = JSON.parse(e.newValue);
      const targetCard = document.getElementById(zIndexEvent.targetCard);
      targetCard.style.zIndex = zIndexEvent.zIndex;
    }
  });
});

// mouse sync
document.addEventListener("DOMContentLoaded", function () {
  const cursor = document.getElementById("virtualCursor");
  const syncKey = "syncMouse";
  const toggleKey = "toggleMouseVisibility"; // 마우스 이미지 비저블 상태 동기화 키
  let mouseEnabled = true; // 마우스 기능 활성화 여부

  // 마우스 커서가 페이지를 나갔을 때 이미지 숨기기
  document.addEventListener("mouseleave", () => {
    cursor.style.display = "none"; // 마우스 이미지 숨기기
  });

  // 마우스 커서가 다시 들어오면 이미지 보이기
  document.addEventListener("mouseenter", () => {
    cursor.style.display = "block"; // 마우스 이미지 보이기
  });

  // 마우스가 페이지 위에 있을 때 커서 동기화 및 표시
  document.addEventListener("mousemove", (e) => {
    if (mouseEnabled) {
      updateCursor(e.clientX, e.clientY);
      syncCursor(e.clientX, e.clientY);
    }
    virtualCursor.style.zIndex = "10001";
  });

  // F9 키로 마우스 기능 토글
  document.addEventListener("keydown", (e) => {
    if (e.key === "F9") {
      toggleMouse();
    }
  });

  function updateCursor(x, y) {
    cursor.style.display = "block";
    cursor.src = "cursor_blue.png"; // A에서 커서 이미지 설정
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;

    // 실제 마우스 커서를 숨김
    document.body.style.cursor = "none";
  }

  function syncCursor(x, y) {
    const eventData = {
      type: "mousemove",
      x: x,
      y: y,
    };
    localStorage.setItem(syncKey, JSON.stringify(eventData));
  }

  function toggleMouse() {
    mouseEnabled = !mouseEnabled;
    if (!mouseEnabled) {
      cursor.style.display = "none";
      document.body.style.cursor = "auto"; // 원래 커서 표시
    } else {
      cursor.style.display = "block";
      document.body.style.cursor = "none"; // 가상 커서 표시
    }

    // 마우스 이미지 상태를 B에도 동기화
    const toggleEvent = {
      type: "toggleMouse",
      visible: mouseEnabled,
    };
    localStorage.setItem(toggleKey, JSON.stringify(toggleEvent));
  }

  // Page B에서 마우스 커서 동기화 수신
  window.addEventListener("storage", (e) => {
    if (e.key === syncKey && e.newValue) {
      const eventData = JSON.parse(e.newValue);
      if (mouseEnabled) {
        updateCursor(eventData.x, eventData.y);
      }
    }

    // Page B에서 마우스 이미지 비저블 상태 동기화 수신
    if (e.key === toggleKey && e.newValue) {
      const toggleEvent = JSON.parse(e.newValue);
      if (toggleEvent.visible) {
        cursor.style.display = "block";
        document.body.style.cursor = "none"; // 가상 커서 표시
      } else {
        cursor.style.display = "none";
        document.body.style.cursor = "auto"; // 원래 커서 표시
      }
    }
  });
});

// vedio
document.addEventListener("DOMContentLoaded", function () {
  const video = document.getElementById("video");
  const canvas = document.getElementById("glcanvas");
  const gl = canvas.getContext("webgl");

  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;
  let scale = 1;

  const minScale = 0.08;
  const maxScale = 0.15;
  const syncKey = "syncData";

  // 비디오 자동재생 설정
  video.muted = true;

  if (!gl) {
    alert("WebGL not supported");
  }

  // F8 키를 눌렀을 때 비디오 숨김/보임 토글
  document.addEventListener("keydown", (e) => {
    if (e.key === "F8") {
      toggleCanvasVisibility();
    }
  });

  function toggleCanvasVisibility() {
    if (canvas.style.display === "none") {
      canvas.style.display = "block";
    } else {
      canvas.style.display = "none";
    }

    // 동기화 이벤트 전송
    const eventData = {
      type: "toggleCanvasVisibility",
      visibility: canvas.style.display,
    };
    sendEvent(eventData);
  }

  // 드래그 이벤트 또는 클릭이 발생할 때 B에 재생 시간 동기화 이벤트 전송
  //  document.addEventListener('click', syncVideoTimeToB);
  //  document.addEventListener('mousemove', syncVideoTimeToB);
  document.addEventListener("mouseup", syncVideoTimeToB);

  function syncVideoTimeToB() {
    const eventData = {
      type: "syncVideoTime",
      currentTime: video.currentTime,
      paused: video.paused,
    };
    sendEvent(eventData);
  }

  // 비디오가 준비된 후 재생 시도
  video.addEventListener("canplay", () => {
    ensureVideoPlayback();
  });

  function ensureVideoPlayback() {
    try {
      video.play().catch((error) => {
        console.error("Autoplay failed: ", error);
      });
    } catch (error) {
      console.error("Error playing video: ", error);
    }
  }

  // WebGL 초기화 함수
  function initWebGL() {
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_texture;
      uniform vec3 u_chromaKeyColor;
      uniform float u_threshold;
      void main() {
        vec4 color = texture2D(u_texture, v_texCoord);
        float diff = distance(color.rgb, u_chromaKeyColor);
        if (diff < u_threshold) {
          discard; 
        } else {
          gl_FragColor = color;
        }
      }
    `;

    const vertexShader = compileShader(
      gl,
      vertexShaderSource,
      gl.VERTEX_SHADER
    );
    const fragmentShader = compileShader(
      gl,
      fragmentShaderSource,
      gl.FRAGMENT_SHADER
    );
    const program = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
      gl.STATIC_DRAW
    );

    const a_position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(a_position);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    const a_texCoord = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(a_texCoord);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 0, 0);

    const u_texture = gl.getUniformLocation(program, "u_texture");
    const u_chromaKeyColor = gl.getUniformLocation(program, "u_chromaKeyColor");
    const u_threshold = gl.getUniformLocation(program, "u_threshold");

    const chromaKeyColor = [56 / 255, 255 / 255, 26 / 255];
    const threshold = 0.6;

    gl.uniform3fv(u_chromaKeyColor, chromaKeyColor);
    gl.uniform1f(u_threshold, threshold);

    const texture = setupVideoTexture(gl, video);

    function updateVideoTexture() {
      if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          video
        );
      }
    }

    function render() {
      updateVideoTexture();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    }

    render();
  }

  // 비디오가 로드되면 재생 시간 동기화
  video.addEventListener("loadedmetadata", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const savedState = localStorage.getItem("videoState");
    if (savedState) {
      const videoState = JSON.parse(savedState);
      video.currentTime = videoState.currentTime; // 재생 시간 동기화
      if (videoState.paused) {
        video.pause();
      } else {
        ensureVideoPlayback();
      }
      canvas.style.width = videoState.width;
      canvas.style.height = videoState.height;
      canvas.style.left = videoState.left;
      canvas.style.top = videoState.top;
    } else {
      ensureVideoPlayback();
    }
  });
  // 비디오 일시정지 방지 (항상 재생 보장)
  video.addEventListener("pause", ensureVideoPlayback);

  // 클릭 시 이벤트 전송
  document.addEventListener("click", (e) => {
    const x = e.clientX;
    const y = e.clientY;

    const eventData = {
      type: "click",
      x: x,
      y: y,
      timestamp: Date.now(),
    };
    sendEvent(eventData);
  });
  // 비디오 재생 시간 동기화 함수
  function syncVideoTime() {
    const savedState = localStorage.getItem("videoState");
    if (savedState) {
      const videoState = JSON.parse(savedState);
      const timeDifference = Math.abs(
        video.currentTime - videoState.currentTime
      );

      if (timeDifference > syncThreshold) {
        video.currentTime = videoState.currentTime;
        if (videoState.paused && !video.paused) {
          video.pause();
        } else if (!videoState.paused && video.paused) {
          video.play();
        }
      }
    }
  }
  // 비디오 위치 및 상태 동기화
  function syncVideoState() {
    const videoState = {
      currentTime: video.currentTime,
      paused: video.paused,
      width: canvas.style.width,
      height: canvas.style.height,
      left: canvas.style.left,
      top: canvas.style.top,
    };
    localStorage.setItem("videoState", JSON.stringify(videoState));
  }

  function sendEvent(eventData) {
    localStorage.setItem(syncKey, JSON.stringify(eventData));
  }

  window.addEventListener("storage", (e) => {
    if (e.key === syncKey && e.newValue) {
      const eventData = JSON.parse(e.newValue);

      if (eventData.type === "click") {
        simulateClick(eventData.x, eventData.y);
      }
    }
  });

  // 다른 페이지에서 이벤트 수신 (Page B에서 클릭한 경우만 점 표시)
  window.addEventListener("storage", (e) => {
    if (e.key === syncKey && e.newValue) {
      const eventData = JSON.parse(e.newValue);

      if (eventData.type === "click") {
        simulateClick(eventData.x, eventData.y);
      }
    }
  });

  function simulateClick(x, y) {
    const clickIndicator = document.createElement("div");
    clickIndicator.style.position = "absolute";
    clickIndicator.style.left = `${x - 5}px`;
    clickIndicator.style.top = `${y - 5}px`;
    clickIndicator.style.width = "10px";
    clickIndicator.style.height = "10px";
    clickIndicator.style.backgroundColor = "red";
    clickIndicator.style.borderRadius = "50%";
    document.body.appendChild(clickIndicator);

    setTimeout(() => {
      document.body.removeChild(clickIndicator);
    }, 1000);
  }

  // 상태 동기화 함수
  function syncVideoState() {
    const videoState = {
      currentTime: video.currentTime,
      paused: video.paused,
      width: canvas.style.width,
      height: canvas.style.height,
      left: canvas.style.left,
      top: canvas.style.top,
    };
    localStorage.setItem("videoState", JSON.stringify(videoState));
  }

  // 이벤트 전송 함수
  function sendEvent(eventData) {
    localStorage.setItem(syncKey, JSON.stringify(eventData));
  }

  // 이벤트 및 상태 동기화
  window.addEventListener("storage", (e) => {
    if (e.key === syncKey && e.newValue) {
      const eventData = JSON.parse(e.newValue);
      if (eventData.type === "mousemove") {
        canvas.style.left = `${eventData.x}px`;
        canvas.style.top = `${eventData.y}px`;
      } else if (eventData.type === "wheel") {
        scale = eventData.scale;
        canvas.style.width = `${video.videoWidth * scale}px`;
        canvas.style.height = `${video.videoHeight * scale}px`;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    }
  });

  initWebGL();

  function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile failed:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link failed:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  function setupVideoTexture(gl, video) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
  }

  // 비디오 및 캔버스 설정
  video.addEventListener("loadedmetadata", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  });

  let lastDragUpdate = 0;
  const dragUpdateInterval = 50;

  // 드래그 이벤트 처리
  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - canvas.offsetLeft;
    offsetY = e.clientY - canvas.offsetTop;
    canvas.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;
      canvas.style.left = `${newX}px`;
      canvas.style.top = `${newY}px`;

      const now = Date.now();
      if (now - lastDragUpdate > dragUpdateInterval) {
        syncVideoState();
        lastDragUpdate = now;

        const eventData = {
          type: "mousemove",
          x: newX,
          y: newY,
          timestamp: Date.now(),
        };
        sendEvent(eventData);
      }
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    canvas.style.cursor = "move";
    syncVideoState();
  });

  // 크기 조절 (Ctrl + 휠)
  canvas.addEventListener("wheel", (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      scale *= delta;
      scale = Math.min(maxScale, Math.max(minScale, scale));
      canvas.style.width = `${video.videoWidth * scale}px`;
      canvas.style.height = `${video.videoHeight * scale}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      syncVideoState();

      const eventData = {
        type: "wheel",
        scale: scale,
        timestamp: Date.now(),
      };
      sendEvent(eventData);
    }
  });
});

// WebRTC video
let peerConnection;

// WebRTC 연결 시작 함수
function startWebRTC() {
  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  peerConnection = new RTCPeerConnection(config);

  // 수신된 스트림을 비디오 요소에 연결
  peerConnection.ontrack = event => {
    document.getElementById('video').srcObject = event.streams[0]; // 수신된 스트림을 비디오에 출력
  };

  // ICE 후보 생성 시 부모 페이지로 전송
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      window.parent.postMessage({ type: 'iceCandidate', candidate: JSON.stringify(event.candidate), page: 'pageA' }, '*');
    }
  };
}

// main_site에서 보낸 메시지 처리
window.addEventListener('message', event => {
  if (event.data.type === 'offer') {
    startWebRTC(); // WebRTC 시작
    const offer = new RTCSessionDescription(JSON.parse(event.data.offer)); // Offer 수신
    peerConnection.setRemoteDescription(offer)
      .then(() => peerConnection.createAnswer()) // Answer 생성
      .then(answer => {
        peerConnection.setLocalDescription(answer);
        window.parent.postMessage({ type: 'answer', answer: JSON.stringify(answer), page: 'pageA' }, '*'); // Answer 전송
      })
      .catch(error => console.error('Offer 처리 중 오류:', error));
  }

  if (event.data.type === 'iceCandidate') {
    const candidate = new RTCIceCandidate(JSON.parse(event.data.candidate)); // ICE 후보 처리
    peerConnection.addIceCandidate(candidate).catch(error => console.error('ICE 후보 추가 중 오류:', error));
  }
});
