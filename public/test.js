// let localStream;
// let videoTexture;
// let gl;

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
  
      // 비디오 요소에 스트림 연결
      const videoElement = document.getElementById("video");
      videoElement.srcObject = localStream;
  
      // WebGL 초기화
      initializeWebGL(videoElement);
    } catch (error) {
      console.error("웹캠 스트림을 가져오는 중 오류 발생:", error);
    }
  }
  
  function initializeWebGL(videoElement) {
    const canvas = document.getElementById("glcanvas");
    gl = canvas.getContext("webgl");
  
    if (!gl) {
      console.error("WebGL을 지원하지 않는 브라우저입니다.");
      return;
    }
  
    // 비디오 텍스처 생성
    videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
    // 셰이더 프로그램 초기화
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
      }
    `;
  
    const fragmentShaderSource = `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_video;
      
      void main() {
        vec4 color = texture2D(u_video, v_texCoord);
        gl_FragColor = color;
      }
    `;
  
    // 셰이더 컴파일 및 프로그램 연결
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);
  
    // 위치 및 텍스처 좌표 설정
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    const texCoords = [0, 1, 1, 1, 0, 0, 1, 0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
  
    // 셰이더에서 위치 및 텍스처 좌표 속성에 데이터를 연결
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  
    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(texCoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
  
    const videoUniformLocation = gl.getUniformLocation(program, "u_video");
  
    // WebGL 렌더링 함수
    function render() {
      if (localStream && videoElement.readyState >= 2) {
        // 비디오를 텍스처로 업데이트
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          videoElement
        );
  
        // 렌더링
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      requestAnimationFrame(render);
    }
    render();
  }
  
  // 셰이더 컴파일 및 프로그램 생성 함수
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("셰이더 컴파일 오류:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  
  function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("프로그램 연결 오류:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }
  
  // 페이지 로드 시 웹캠 시작
  window.onload = startWebcam;
  