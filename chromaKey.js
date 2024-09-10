// 크로마키 관련 셰이더 및 유틸리티 함수

// 크로마키용 Vertex Shader 코드
export const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0); // 전체 화면에 맞게 그리기
    v_texCoord = a_texCoord;
  }
`;

// 크로마키용 Fragment Shader 코드
export const fragmentShaderSource = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_texture;
  uniform vec3 u_chromaKeyColor;
  uniform float u_threshold;
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    float diff = distance(color.rgb, u_chromaKeyColor);
    if (diff < u_threshold) {
      discard; // 크로마키 영역 투명 처리
    } else {
      gl_FragColor = color;
    }
  }
`;

// 크로마키 셰이더 프로그램을 설정하는 함수
export function setupChromaKeyProgram(gl, vertexShaderSource, fragmentShaderSource) {
  const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
  const program = createProgram(gl, vertexShader, fragmentShader);

  if (!program) {
    console.error('Failed to initialize Chroma Key program');
    return null;
  }

  return program;
}

// 셰이더 컴파일 함수
function compileShader(gl, source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// 프로그램 생성 함수
function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}