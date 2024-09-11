// redirect via BroadcastChannel
document.addEventListener('DOMContentLoaded', function() {
  const card4 = document.getElementById("card4");
  const channel = new BroadcastChannel('redirect_channel');

  // Card 4 클릭 시 리다이렉트 동작
  card4.addEventListener('click', () => {
    syncRedirect();
    redirectToPageC();
  });

  // Page C로 리다이렉트
  function redirectToPageC() {
    window.location.href = 'pageC.html';
  }

  // 리다이렉트 동기화
  function syncRedirect() {
    channel.postMessage({ type: 'redirect', target: 'pageC' });
  }

  // 다른 페이지에서 리다이렉트 수신
  channel.onmessage = (event) => {
    if (event.data.type === 'redirect' && event.data.target === 'pageC') {
      redirectToPageC();
    }
  };
});

// card effects
document.addEventListener('DOMContentLoaded', function() {
  const card1 = document.getElementById("card1");
  const card2 = document.getElementById("card2");
  const card3 = document.getElementById("card3");
  const overlay = document.getElementById("overlay");
  const syncKey = 'syncOverlay';
  const glowSyncKey = 'syncGlow';
  const zIndexSyncKey = 'syncZIndex';
  let isOverlayVisible = false;
  let isGlowActive = false;

  // Card 1 클릭 시 덮개 토글
  card1.addEventListener('click', () => {
    toggleOverlay(card1);
    syncOverlay(isOverlayVisible, 'card1');
    syncZIndex('card1', isOverlayVisible ? 10001 : 50);  // z-index 공유, 해제 시 50으로 설정
  });

  // Card 2 클릭 시 글로우 효과 토글
  card2.addEventListener('click', () => {
    toggleGlowEffect(card2);
    syncGlowEffect(isGlowActive, 'card2');
    syncZIndex('card2', isGlowActive ? 10001 : 50);  // z-index 공유, 해제 시 50으로 설정
  });

  // Card 3 클릭 시 덮개 + 글로우 효과 모두 적용
  card3.addEventListener('click', () => {
    toggleOverlay(card3);
    toggleGlowEffect(card3);
    syncOverlay(isOverlayVisible, 'card3');
    syncGlowEffect(isGlowActive, 'card3');
    syncZIndex('card3', (isOverlayVisible || isGlowActive) ? 10001 : 50);  // z-index 공유
  });

  // 덮개 토글 함수
  function toggleOverlay(card) {
    isOverlayVisible = !isOverlayVisible;
    if (isOverlayVisible) {
      overlay.style.display = 'block';
      overlay.style.zIndex = '10000';  // 덮개 z-index
      card.style.zIndex = '10001';  // 클릭된 카드 z-index
      overlay.style.animation = 'fadeInDark 0.5s ease forwards';  // 어두워지는 애니메이션
    } else {
      overlay.style.animation = 'fadeOutDark 0.5s ease forwards';  // 밝아지는 애니메이션
      setTimeout(() => {
        overlay.style.display = 'none';
        card.style.zIndex = '50';  // 해제 시 z-index 50으로 설정
      }, 500);
    }
  }

  // 덮개 상태 동기화
  function syncOverlay(visible, cardId) {
    const eventData = {
      type: 'toggleOverlay',
      visible: visible,
      targetCard: cardId
    };
    localStorage.setItem(syncKey, JSON.stringify(eventData));
  }

  // 글로우 효과 토글 함수
  function toggleGlowEffect(card) {
    isGlowActive = !isGlowActive;
    card.classList.toggle('glow-effect');
    if (!isGlowActive) {
      card.style.zIndex = '50';  // 글로우 해제 시 z-index 50으로 설정
    }
  }

  // 글로우 상태 동기화
  function syncGlowEffect(glowState, cardId) {
    const glowEvent = {
      type: 'toggleGlow',
      active: glowState,
      targetCard: cardId
    };
    localStorage.setItem(glowSyncKey, JSON.stringify(glowEvent));
  }

  // z-index 동기화
  function syncZIndex(cardId, zIndexValue) {
    const zIndexEvent = {
      type: 'updateZIndex',
      targetCard: cardId,
      zIndex: zIndexValue
    };
    localStorage.setItem(zIndexSyncKey, JSON.stringify(zIndexEvent));
  }

  // 다른 페이지에서 덮개, 글로우, z-index 상태 동기화 수신
  window.addEventListener('storage', (e) => {
    if (e.key === syncKey && e.newValue) {
      const eventData = JSON.parse(e.newValue);
      const targetCard = document.getElementById(eventData.targetCard);
      isOverlayVisible = eventData.visible;
      if (isOverlayVisible) {
        overlay.style.display = 'block';
        overlay.style.zIndex = '10000';
        targetCard.style.zIndex = '10001';
        overlay.style.animation = 'fadeInDark 0.5s ease forwards';
      } else {
        overlay.style.animation = 'fadeOutDark 0.5s ease forwards';
        setTimeout(() => {
          overlay.style.display = 'none';
          targetCard.style.zIndex = '50';  // 해제 시 z-index 50으로 설정
        }, 500);
      }
    }

    if (e.key === glowSyncKey && e.newValue) {
      const glowEvent = JSON.parse(e.newValue);
      const targetCard = document.getElementById(glowEvent.targetCard);
      isGlowActive = glowEvent.active;
      if (isGlowActive) {
        targetCard.classList.add('glow-effect');
        targetCard.style.zIndex = '10001';  // 글로우가 활성화된 카드 z-index 10001
      } else {
        targetCard.classList.remove('glow-effect');
        targetCard.style.zIndex = '50';  // 글로우 해제 시 z-index 50으로 설정
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
document.addEventListener('DOMContentLoaded', function() {
  const cursor = document.getElementById("virtualCursor");
  const syncKey = 'syncMouse';
  const toggleKey = 'toggleMouseVisibility'; // 마우스 이미지 비저블 상태 동기화 키
  let mouseEnabled = true;  // 마우스 기능 활성화 여부

  // 마우스 커서가 페이지를 나갔을 때 이미지 숨기기
  document.addEventListener('mouseleave', () => {
    cursor.style.display = 'none';  // 마우스 이미지 숨기기
  });

  // 마우스 커서가 다시 들어오면 이미지 보이기
  document.addEventListener('mouseenter', () => {
    cursor.style.display = 'block';  // 마우스 이미지 보이기
  });

  // Page B에서 마우스 커서 위치 동기화 및 표시
  document.addEventListener('mousemove', (e) => {
    if (mouseEnabled) {
      updateCursor(e.clientX, e.clientY);
      syncCursor(e.clientX, e.clientY);
    }
    virtualCursor.style.zIndex = '10001';
  });

  function updateCursor(x, y) {
    cursor.style.display = 'block';
    cursor.src = 'cursor.png';  // B에서 커서 이미지 설정
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;

    // 실제 마우스 커서를 숨김
    document.body.style.cursor = 'none';
  }

  function syncCursor(x, y) {
    const eventData = {
      type: 'mousemove',
      x: x,
      y: y
    };
    localStorage.setItem(syncKey, JSON.stringify(eventData));
  }

  // // F9 키로 마우스 기능 토글 (Page B에서도 가능하게 설정)
  // document.addEventListener('keydown', (e) => {
  //   if (e.key === "F9") {
  //     toggleMouse();
  //   }
  // });

  function toggleMouse() {
    mouseEnabled = !mouseEnabled;
    if (!mouseEnabled) {
      cursor.style.display = 'none';
      document.body.style.cursor = 'auto';  // 원래 커서 표시
    } else {
      cursor.style.display = 'block';
      document.body.style.cursor = 'none';  // 가상 커서 표시
    }
  }

  // Page A에서 마우스 커서 동기화 수신
  window.addEventListener('storage', (e) => {
    if (e.key === syncKey && e.newValue) {
      const eventData = JSON.parse(e.newValue);
      if (mouseEnabled) {
        updateCursor(eventData.x, eventData.y);
      }
    }

    // Page A에서 마우스 이미지 비저블 상태 동기화 수신
    if (e.key === toggleKey && e.newValue) {
      const toggleEvent = JSON.parse(e.newValue);
      if (toggleEvent.visible) {
        cursor.style.display = 'block';
        document.body.style.cursor = 'none';  // 가상 커서 표시
      } else {
        cursor.style.display = 'none';
        document.body.style.cursor = 'auto';  // 원래 커서 표시
      }
    }
  });
});

// vedio
document.addEventListener("DOMContentLoaded", function () {
  const video = document.getElementById("video");
  const canvas = document.getElementById("glcanvas");
  const gl = canvas.getContext("webgl");

  let scale = 1;
  const minScale = 0.08;
  const maxScale = 0.15;
  const syncKey = "syncData";
  const syncThreshold = 0.1; // 0.1초 이내로 맞추기

  // 비디오 자동 재생 설정
  video.muted = true;

  if (!gl) {
    alert("WebGL not supported");
  }

  // Page A에서 WebGL 캔버스 숨김/보임 토글 이벤트 수신 및 적용
  window.addEventListener("storage", (e) => {
    if (e.key === syncKey && e.newValue) {
      const eventData = JSON.parse(e.newValue);

      if (eventData.type === "toggleCanvasVisibility") {
        canvas.style.display = eventData.visibility;
      }
    }
  });

  // 이벤트 수신: A에서 재생 시간 동기화 이벤트가 오면 적용
  window.addEventListener("storage", (e) => {
    if (e.key === syncKey && e.newValue) {
      const eventData = JSON.parse(e.newValue);

      // 재생 시간 동기화 처리
      if (eventData.type === "syncVideoTime") {
        syncVideoTime(eventData.currentTime, eventData.paused);
      }
    }
  });

  // 재생 시간 동기화 함수
  function syncVideoTime(currentTime, paused) {
    video.currentTime = currentTime;
    if (paused) {
      video.pause();
    } else {
      video.play().catch((error) => {
        console.error("Error playing video: ", error);
      });
    }
  }

  // 다른 페이지에서 이벤트 수신 시 동기화
  window.addEventListener("storage", (e) => {
    if (e.key === syncKey && e.newValue) {
      const eventData = JSON.parse(e.newValue);

      if (eventData.type === "click") {
        simulateClick(eventData.x, eventData.y);
      } else if (eventData.type === "timeupdate") {
        syncVideoTime(); // 실시간 동기화
      }
    }
  });

  // 비디오가 준비된 후 재생 시도 및 시간 동기화
  video.addEventListener("canplay", () => {
    ensureVideoPlayback();
  });

  // 비디오가 로드되면 재생 시간 동기화
  video.addEventListener("loadedmetadata", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const savedState = localStorage.getItem("videoState");
    if (savedState) {
      const videoState = JSON.parse(savedState);
      video.currentTime = videoState.currentTime;
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

  function ensureVideoPlayback() {
    try {
      video.play().catch((error) => {
        console.error("Autoplay failed: ", error);
      });
    } catch (error) {
      console.error("Error playing video: ", error);
    }
  }

  // 비디오 재생 보장 함수
  function ensureVideoPlayback() {
    try {
      video.play().catch((error) => {
        console.error("Autoplay failed: ", error);
      });
    } catch (error) {
      console.error("Error playing video: ", error);
    }
  }

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

  // WebGL 초기화
  initWebGL();

  // 이벤트 수신 (Page A에서 발생한 동작 반영)
  window.addEventListener("storage", (e) => {
    if (e.key === syncKey && e.newValue) {
      const eventData = JSON.parse(e.newValue);

      if (eventData.type === "mousemove") {
        canvas.style.left = `${eventData.x}px`;
        canvas.style.top = `${eventData.y}px`;
      } else if (eventData.type === "wheel") {
        simulateWheel(eventData.scale);
      }
    }
  });

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
    clickIndicator.style.backgroundColor = "blue"; // 파란 점
    clickIndicator.style.borderRadius = "50%";
    document.body.appendChild(clickIndicator);

    setTimeout(() => {
      document.body.removeChild(clickIndicator);
    }, 1000); // 1초 후 점 삭제
  }

  function simulateWheel(scale) {
    canvas.style.width = `${video.videoWidth * scale}px`;
    canvas.style.height = `${video.videoHeight * scale}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // Page B에서 클릭 시 이벤트 전송 (Page A에서 점이 찍히도록)
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

  function sendEvent(eventData) {
    localStorage.setItem(syncKey, JSON.stringify(eventData));
  }
});