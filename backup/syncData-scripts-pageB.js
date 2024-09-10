//scripts-pageB.js
document.addEventListener('DOMContentLoaded', function() {
  const video = document.getElementById("video");
  const canvas = document.getElementById("glcanvas");
  const gl = canvas.getContext("webgl");

  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;
  let scale = 1;

  const minScale = 0.08;
  const maxScale = 0.15;
  const syncKey = 'syncData';  // 동기화에 사용할 키

  if (!gl) {
    alert("WebGL not supported");
  }

  // 비디오가 로드된 후 상태 동기화
  if (video) {
    video.addEventListener('loadedmetadata', function() {
      syncVideoState();
    });
  } else {
    console.error("Video element not found.");
  }

  // WebGL 초기화 코드
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

    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    const program = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), gl.STATIC_DRAW);

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
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
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

  // 마우스 클릭 및 동작 감지
  document.addEventListener('click', (e) => {
    const eventData = {
      type: 'click',
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now()
    };
    sendEvent(eventData);
  });

  document.addEventListener('keydown', (e) => {
    const eventData = {
      type: 'keydown',
      key: e.key,
      timestamp: Date.now()
    };
    sendEvent(eventData);
  });

  let lastDragUpdate = 0;
  const dragUpdateInterval = 50;

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
          type: 'mousemove',
          x: newX,
          y: newY,
          timestamp: Date.now()
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
        type: 'wheel',
        scale: scale,
        timestamp: Date.now()
      };
      sendEvent(eventData);
    }
  });

  function syncVideoState() {
    if (!video) {
      console.error("Video element not found.");
      return;
    }

    const videoState = {
      currentTime: video.currentTime,
      paused: video.paused,
      width: canvas.style.width,
      height: canvas.style.height,
      left: canvas.style.left,
      top: canvas.style.top
    };

    localStorage.setItem("videoState", JSON.stringify(videoState));
  }

  function sendEvent(eventData) {
    localStorage.setItem(syncKey, JSON.stringify(eventData));
  }

  window.addEventListener('storage', (e) => {
    if (e.key === syncKey && e.newValue) {
      const eventData = JSON.parse(e.newValue);

      if (eventData.type === 'click') {
        simulateClick(eventData.x, eventData.y);
      } else if (eventData.type === 'keydown') {
        simulateKeydown(eventData.key);
      } else if (eventData.type === 'mousemove') {
        simulateMouseMove(eventData.x, eventData.y);
      } else if (eventData.type === 'wheel') {
        simulateWheel(eventData.scale);
      }
    }
  });

  function simulateClick(x, y) {
    const clickIndicator = document.createElement('div');
    clickIndicator.style.position = 'absolute';
    clickIndicator.style.left = `${x}px`;
    clickIndicator.style.top = `${y}px`;
    clickIndicator.style.width = '10px';
    clickIndicator.style.height = '10px';
    clickIndicator.style.backgroundColor = 'blue';
    clickIndicator.style.borderRadius = '50%';
    document.body.appendChild(clickIndicator);
    setTimeout(() => document.body.removeChild(clickIndicator), 1000);
  }

  function simulateKeydown(key) {
    console.log(`Key pressed: ${key}`);
  }

  function simulateMouseMove(x, y) {
    canvas.style.left = `${x}px`;
    canvas.style.top = `${y}px`;
  }

  function simulateWheel(scale) {
    canvas.style.width = `${video.videoWidth * scale}px`;
    canvas.style.height = `${video.videoHeight * scale}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
});