const video = document.getElementById("video");
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");
let hasSyncedTime = false;  // 재생 시간 동기화가 한 번만 일어나도록 플래그 설정

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

// 페이지 A의 상태를 가져와 적용하는 함수
function applyVideoState() {
  const videoState = JSON.parse(localStorage.getItem("videoState"));
  if (videoState) {
    // 재생 시간은 한 번만 동기화
    if (!hasSyncedTime) {
      video.currentTime = videoState.currentTime;
      hasSyncedTime = true;
    }

    // 재생 상태 동기화
    if (videoState.paused) {
      video.pause();
    } else {
      video.play();
    }

    // 크기 및 위치 동기화
    canvas.style.width = videoState.width;
    canvas.style.height = videoState.height;
    canvas.style.left = videoState.left;
    canvas.style.top = videoState.top;
  }
}

// 애니메이션 프레임을 통한 위치 및 크기 동기화
function syncWithPageA() {
  applyVideoState();  // 상태를 매 프레임마다 확인 및 반영
  requestAnimationFrame(syncWithPageA);
}

// 페이지 로드 시와 storage 변경 시 애니메이션 동기화 시작
window.addEventListener("load", () => {
  requestAnimationFrame(syncWithPageA);  // 동기화 루프 시작
});

// localStorage가 변경될 때 한 번만 재생 시간 동기화
window.addEventListener("storage", (event) => {
  if (event.key === "videoState") {
    hasSyncedTime = false;  // localStorage 변경 감지 시 재생 시간 동기화 플래그 초기화
  }
});


// 페이지 B에서는 크기 및 위치 조작 비활성화
canvas.addEventListener("mousedown", (e) => {
  e.preventDefault();  // 드래그 비활성화
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();  // 크기 조절 비활성화
});

// 비디오 재생 시간 동기화
video.addEventListener("canplay", () => {
  if (video.paused) video.play();
});

// 비디오가 항상 재생되도록 설정
video.addEventListener("pause", () => {
  video.play();
});
