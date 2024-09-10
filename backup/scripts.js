const video = document.getElementById("video");

const canvas = document.getElementById("glcanvas");

const gl = canvas.getContext("webgl");

let offsetX = 0;

let offsetY = 0;

let isDragging = false;

let scale = 1;

let originalWidth;

let originalHeight;

const minScale = 0.08;

const maxScale = 0.15;

if (!gl) {
  alert("WebGL not supported");
}

// 비디오가 로드되었을 때, 원본 크기를 변수로 저장, 비디오 크기에 맞춰 캔버스 크기 설정

video.addEventListener("loadedmetadata", () => {
  originalWidth = video.videoWidth;

  originalHeight = video.videoHeight;

  canvas.width = originalWidth;

  canvas.height = originalHeight;

  canvas.style.width = `${originalWidth}px`;

  canvas.style.height = `${originalHeight}px`;

  gl.viewport(0, 0, canvas.width, canvas.height);
});

// WebGL 셰이더 (크로마키 적용)

const vertexShaderSource = `

  attribute vec2 a_position;

  attribute vec2 a_texCoord;

  varying vec2 v_texCoord;

  void main() {

    gl_Position = vec4(a_position, 0.0, 1.0); // 전체 화면에 맞게 그리기

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

      discard; // 해당 픽셀을 제거하여 투명하게 만듦

    } else {

      gl_FragColor = color;

    }

  }

`;

// 셰이더 컴파일 함수

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

// 프로그램을 생성하고 연결하는 함수

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

// 비디오 텍스처 설정

function setupVideoTexture(gl, video) {
  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
}

let previousVideoFrame = null; // 이전 프레임 추적 변수

// WebGL 초기화 및 비디오 렌더링

let texture,
  program,
  vertexShader,
  fragmentShader,
  positionBuffer,
  texCoordBuffer;

function initWebGL() {
  vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);

  fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

  program = createProgram(gl, vertexShader, fragmentShader);

  if (!program) {
    return;
  }

  gl.useProgram(program);

  // 비디오의 좌표 및 텍스처 좌표 설정

  positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1,
      -1, // 좌측 하단

      1,
      -1, // 우측 하단

      -1,
      1, // 좌측 상단

      1,
      1, // 우측 상단
    ]),
    gl.STATIC_DRAW
  );

  texCoordBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      0, 1,

      1, 1,

      0, 0,

      1, 0,
    ]),
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

  texture = setupVideoTexture(gl, video);

  const u_texture = gl.getUniformLocation(program, "u_texture");

  const u_chromaKeyColor = gl.getUniformLocation(program, "u_chromaKeyColor");

  const u_threshold = gl.getUniformLocation(program, "u_threshold");

  const chromaKeyColor = [56 / 255, 255 / 255, 26 / 255]; // #38FF1A

  const threshold = 0.6; // 크로마키 제거 민감도

  gl.uniform3fv(u_chromaKeyColor, chromaKeyColor);

  gl.uniform1f(u_threshold, threshold);

  // 비디오 텍스처 업데이트

  function updateVideoTexture() {
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      if (!previousVideoFrame || video.currentTime !== previousVideoFrame) {
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          video
        );

        previousVideoFrame = video.currentTime;
      }
    }
  }

  // 비디오 프레임 렌더링

  function render() {
    updateVideoTexture();

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    animationFrameId = requestAnimationFrame(render);
  }

  render();
}

// 비디오 로드 후 WebGL 초기화 및 자동 재생

video.addEventListener("canplay", () => {
  canvas.width = video.videoWidth;

  canvas.height = video.videoHeight;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); // 비디오 크기에 맞춘 뷰포트 설정

  initWebGL();

  // 동영상 자동 재생 보장

  if (video.paused || video.ended) {
    video.play().catch((error) => {
      console.error("Auto-play failed:", error);
    });
  }
});

// 드래그 이벤트

canvas.addEventListener("mousedown", (e) => {
  isDragging = true;

  offsetX = e.clientX - canvas.offsetLeft;

  offsetY = e.clientY - canvas.offsetTop;

  canvas.style.cursor = "grabbing"; // 드래그 중 커서 변경
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    const newX = e.clientX - offsetX;

    const newY = e.clientY - offsetY;

    canvas.style.left = `${newX}px`;

    canvas.style.top = `${newY}px`;
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;

  canvas.style.cursor = "move"; // 드래그 종료 후 커서 복원
});

// Ctrl+스크롤로 비디오 크기 조절

canvas.addEventListener("wheel", (e) => {
  if (e.ctrlKey) {
    e.preventDefault(); // 기본 스크롤 동작을 막음

    // 스크롤 방향에 따라 크기 변화

    const delta = e.deltaY > 0 ? 0.9 : 1.1;

    scale *= delta;

    // 스케일 제한

    scale = Math.min(maxScale, Math.max(minScale, scale));

    // 캔버스 크기 조정

    canvas.style.width = `${video.videoWidth * scale}px`;

    canvas.style.height = `${video.videoHeight * scale}px`;

    // WebGL 뷰포트도 새 크기에 맞게 조정

    canvas.width = video.videoWidth * scale;

    canvas.height = video.videoHeight * scale;

    gl.viewport(0, 0, canvas.width, canvas.height);

    // 다시 렌더링 호출

    render();
  }
});

// 비디오가 항상 재생되도록 보장

video.addEventListener("pause", () => {
  video.play();
});

let animationFrameId;

function stopRendering() {
  cancelAnimationFrame(animationFrameId);
}

// WebGL 리소스 정리

function cleanupWebGL() {
  gl.deleteTexture(texture);

  gl.deleteProgram(program);

  gl.deleteShader(vertexShader);

  gl.deleteShader(fragmentShader);

  gl.deleteBuffer(positionBuffer);

  gl.deleteBuffer(texCoordBuffer);
}

window.addEventListener("beforeunload", () => {
  stopRendering();

  cleanupWebGL();
});

// Add an event listener for the keydown event
document.addEventListener('keydown', (e) => {
  if (e.key === 'F8') { // Check if the pressed key is F8
    const canvas = document.getElementById('glcanvas');
    // Toggle the visibility of the canvas
    if (canvas.style.display === 'none') {
      canvas.style.display = 'block';
    } else {
      canvas.style.display = 'none';
    }
  }
});