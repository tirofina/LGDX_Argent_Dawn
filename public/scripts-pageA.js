const video = document.getElementById("video");
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let scale = 1;

const minScale = 0.08;
const maxScale = 0.15;

if (!gl) {
  alert("WebGL not supported");
}

function initWebGL() {
  // WebGL 설정 및 셰이더 컴파일, 프로그램 생성
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
        discard; // 크로마키 적용
      } else {
        gl_FragColor = color;
      }
    }
  `;

  const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

  const program = createProgram(gl, vertexShader, fragmentShader);
  gl.useProgram(program);

  // 비디오 텍스처와 좌표 설정
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1
  ]), gl.STATIC_DRAW);

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 1,
    1, 1,
    0, 0,
    1, 0
  ]), gl.STATIC_DRAW);

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

  const chromaKeyColor = [56 / 255, 255 / 255, 26 / 255];  // 크로마키 색상 (#38FF1A)
  const threshold = 0.6;

  gl.uniform3fv(u_chromaKeyColor, chromaKeyColor);
  gl.uniform1f(u_threshold, threshold);

  // 비디오 텍스처 설정
  const texture = setupVideoTexture(gl, video);

  function updateVideoTexture() {
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
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

  render();  // 첫 번째 렌더링 호출
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

let lastDragUpdate = 0;  // 마지막으로 업데이트한 시간
const dragUpdateInterval = 50;  // 50ms마다 업데이트

// 드래그 시작
canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  offsetX = e.clientX - canvas.offsetLeft;
  offsetY = e.clientY - canvas.offsetTop;
  canvas.style.cursor = "grabbing";
});

// 드래그 중 마우스 이동 시
document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    const newX = e.clientX - offsetX;
    const newY = e.clientY - offsetY;
    canvas.style.left = `${newX}px`;
    canvas.style.top = `${newY}px`;

    const now = Date.now();
    if (now - lastDragUpdate > dragUpdateInterval) {
      syncVideoState();  // 위치 정보를 일정 시간마다 저장
      lastDragUpdate = now;
    }
  }
});

// 드래그 종료
document.addEventListener("mouseup", () => {
  isDragging = false;
  canvas.style.cursor = "move";
  syncVideoState();  // 드래그 종료 후 최종 위치 저장
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
    syncVideoState();  // 크기 변경 후 동기화
  }
});

// localStorage를 통해 상태 저장
function syncVideoState() {
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

// 비디오 상태가 변경될 때마다 동기화
video.addEventListener("timeupdate", syncVideoState);
video.addEventListener("play", syncVideoState);
video.addEventListener("pause", syncVideoState);

// 비디오 재생 시간 동기화
video.addEventListener("canplay", () => {
  if (video.paused) video.play();
});

// 비디오가 항상 재생되도록 설정
video.addEventListener("pause", () => {
  video.play();
});
