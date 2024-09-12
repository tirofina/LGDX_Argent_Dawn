async function startWebcam() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInput = devices.find(
        (device) => device.kind === "videoinput" && device.label.includes("USB webcam")
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
  
      const videoElement = document.getElementById("video");
      videoElement.srcObject = localStream;
  
      // WebGL 초기화
      initializeWebGL(videoElement);
  
      // MediaPipe Selfie Segmentation 적용
      applySelfieSegmentation(videoElement);
    } catch (error) {
      console.error("웹캠 스트림을 가져오는 중 오류 발생:", error);
    }
  }
  
  async function applySelfieSegmentation(videoElement) {
    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
  
    selfieSegmentation.setOptions({
      modelSelection: 1, // Selfie 모델 사용
    });
  
    // Selfie Segmentation의 결과 처리
    selfieSegmentation.onResults((results) => {
      const canvasElement = document.getElementById("glcanvas");
      const canvasCtx = canvasElement.getContext("2d");
  
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  
      // segmentationMask에서 사람 부분만 투명하지 않게 그리기
      canvasCtx.drawImage(
        results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height
      );
  
      // 사람만 남기고 배경을 투명하게 만들기
      canvasCtx.globalCompositeOperation = 'source-in';
      canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  
      // 다시 기본 상태로 설정
      canvasCtx.globalCompositeOperation = 'source-over';
    });
  
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await selfieSegmentation.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });
  
    camera.start();
  }
  
  // WebGL 초기화 함수는 그대로 사용
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
  
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);
  
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    const texCoords = [0, 1, 1, 1, 0, 0, 1, 0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
  
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  
    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(texCoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
  
    const videoUniformLocation = gl.getUniformLocation(program, "u_video");
  
    function render() {
      if (localStream && videoElement.readyState >= 2) {
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      requestAnimationFrame(render);
    }
    render();
  }
  
  // 셰이더 생성 함수 그대로 사용
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
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
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
  window.onload = function() {
    const canvasElement = document.getElementById("glcanvas");
  
    if (!canvasElement) {
      console.error("glcanvas 요소를 찾을 수 없습니다.");
      return;
    }
  
    const canvasCtx = canvasElement.getContext("2d");
  
    if (!canvasCtx) {
      console.error("2D 컨텍스트를 가져오지 못했습니다.");
      return;
    }
  
    startWebcam();
  };