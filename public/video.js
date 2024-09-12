let localStream;
let videoTexture;
let gl;


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

    // 비디오 요소에 스트림 연결
    const videoElement = document.getElementById("video");
    videoElement.srcObject = localStream;

    // WebGL 초기화
    // initializeWebGL(videoElement);

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
const canvasElement = document.getElementById("glcanvas");
const canvasCtx = canvasElement.getContext("2d");

window.onload = startWebcam();



  
/**
 * Skipped minification because the original files appears to be already minified.
 * Original file: /npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
(function(){/*

    Copyright The Closure Library Authors.
    SPDX-License-Identifier: Apache-2.0
   */
   'use strict';var x;function aa(a){var b=0;return function(){return b<a.length?{done:!1,value:a[b++]}:{done:!0}}}var ba="function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,c){if(a==Array.prototype||a==Object.prototype)return a;a[b]=c.value;return a};
   function ca(a){a=["object"==typeof globalThis&&globalThis,a,"object"==typeof window&&window,"object"==typeof self&&self,"object"==typeof global&&global];for(var b=0;b<a.length;++b){var c=a[b];if(c&&c.Math==Math)return c}throw Error("Cannot find global object");}var y=ca(this);function z(a,b){if(b)a:{var c=y;a=a.split(".");for(var d=0;d<a.length-1;d++){var e=a[d];if(!(e in c))break a;c=c[e]}a=a[a.length-1];d=c[a];b=b(d);b!=d&&null!=b&&ba(c,a,{configurable:!0,writable:!0,value:b})}}
   z("Symbol",function(a){function b(g){if(this instanceof b)throw new TypeError("Symbol is not a constructor");return new c(d+(g||"")+"_"+e++,g)}function c(g,f){this.h=g;ba(this,"description",{configurable:!0,writable:!0,value:f})}if(a)return a;c.prototype.toString=function(){return this.h};var d="jscomp_symbol_"+(1E9*Math.random()>>>0)+"_",e=0;return b});
   z("Symbol.iterator",function(a){if(a)return a;a=Symbol("Symbol.iterator");for(var b="Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "),c=0;c<b.length;c++){var d=y[b[c]];"function"===typeof d&&"function"!=typeof d.prototype[a]&&ba(d.prototype,a,{configurable:!0,writable:!0,value:function(){return da(aa(this))}})}return a});function da(a){a={next:a};a[Symbol.iterator]=function(){return this};return a}
   function A(a){var b="undefined"!=typeof Symbol&&Symbol.iterator&&a[Symbol.iterator];return b?b.call(a):{next:aa(a)}}function ea(a){if(!(a instanceof Array)){a=A(a);for(var b,c=[];!(b=a.next()).done;)c.push(b.value);a=c}return a}var fa="function"==typeof Object.assign?Object.assign:function(a,b){for(var c=1;c<arguments.length;c++){var d=arguments[c];if(d)for(var e in d)Object.prototype.hasOwnProperty.call(d,e)&&(a[e]=d[e])}return a};z("Object.assign",function(a){return a||fa});
   var ha="function"==typeof Object.create?Object.create:function(a){function b(){}b.prototype=a;return new b},ia;if("function"==typeof Object.setPrototypeOf)ia=Object.setPrototypeOf;else{var ja;a:{var ka={a:!0},la={};try{la.__proto__=ka;ja=la.a;break a}catch(a){}ja=!1}ia=ja?function(a,b){a.__proto__=b;if(a.__proto__!==b)throw new TypeError(a+" is not extensible");return a}:null}var ma=ia;
   function na(a,b){a.prototype=ha(b.prototype);a.prototype.constructor=a;if(ma)ma(a,b);else for(var c in b)if("prototype"!=c)if(Object.defineProperties){var d=Object.getOwnPropertyDescriptor(b,c);d&&Object.defineProperty(a,c,d)}else a[c]=b[c];a.za=b.prototype}function oa(){this.m=!1;this.j=null;this.i=void 0;this.h=1;this.v=this.s=0;this.l=null}function pa(a){if(a.m)throw new TypeError("Generator is already running");a.m=!0}oa.prototype.u=function(a){this.i=a};
   function qa(a,b){a.l={ma:b,na:!0};a.h=a.s||a.v}oa.prototype.return=function(a){this.l={return:a};this.h=this.v};function D(a,b,c){a.h=c;return{value:b}}function ra(a){this.h=new oa;this.i=a}function sa(a,b){pa(a.h);var c=a.h.j;if(c)return ta(a,"return"in c?c["return"]:function(d){return{value:d,done:!0}},b,a.h.return);a.h.return(b);return ua(a)}
   function ta(a,b,c,d){try{var e=b.call(a.h.j,c);if(!(e instanceof Object))throw new TypeError("Iterator result "+e+" is not an object");if(!e.done)return a.h.m=!1,e;var g=e.value}catch(f){return a.h.j=null,qa(a.h,f),ua(a)}a.h.j=null;d.call(a.h,g);return ua(a)}function ua(a){for(;a.h.h;)try{var b=a.i(a.h);if(b)return a.h.m=!1,{value:b.value,done:!1}}catch(c){a.h.i=void 0,qa(a.h,c)}a.h.m=!1;if(a.h.l){b=a.h.l;a.h.l=null;if(b.na)throw b.ma;return{value:b.return,done:!0}}return{value:void 0,done:!0}}
   function va(a){this.next=function(b){pa(a.h);a.h.j?b=ta(a,a.h.j.next,b,a.h.u):(a.h.u(b),b=ua(a));return b};this.throw=function(b){pa(a.h);a.h.j?b=ta(a,a.h.j["throw"],b,a.h.u):(qa(a.h,b),b=ua(a));return b};this.return=function(b){return sa(a,b)};this[Symbol.iterator]=function(){return this}}function wa(a){function b(d){return a.next(d)}function c(d){return a.throw(d)}return new Promise(function(d,e){function g(f){f.done?d(f.value):Promise.resolve(f.value).then(b,c).then(g,e)}g(a.next())})}
   function E(a){return wa(new va(new ra(a)))}
   z("Promise",function(a){function b(f){this.i=0;this.j=void 0;this.h=[];this.u=!1;var h=this.l();try{f(h.resolve,h.reject)}catch(k){h.reject(k)}}function c(){this.h=null}function d(f){return f instanceof b?f:new b(function(h){h(f)})}if(a)return a;c.prototype.i=function(f){if(null==this.h){this.h=[];var h=this;this.j(function(){h.m()})}this.h.push(f)};var e=y.setTimeout;c.prototype.j=function(f){e(f,0)};c.prototype.m=function(){for(;this.h&&this.h.length;){var f=this.h;this.h=[];for(var h=0;h<f.length;++h){var k=
   f[h];f[h]=null;try{k()}catch(l){this.l(l)}}}this.h=null};c.prototype.l=function(f){this.j(function(){throw f;})};b.prototype.l=function(){function f(l){return function(m){k||(k=!0,l.call(h,m))}}var h=this,k=!1;return{resolve:f(this.I),reject:f(this.m)}};b.prototype.I=function(f){if(f===this)this.m(new TypeError("A Promise cannot resolve to itself"));else if(f instanceof b)this.L(f);else{a:switch(typeof f){case "object":var h=null!=f;break a;case "function":h=!0;break a;default:h=!1}h?this.F(f):this.s(f)}};
   b.prototype.F=function(f){var h=void 0;try{h=f.then}catch(k){this.m(k);return}"function"==typeof h?this.M(h,f):this.s(f)};b.prototype.m=function(f){this.v(2,f)};b.prototype.s=function(f){this.v(1,f)};b.prototype.v=function(f,h){if(0!=this.i)throw Error("Cannot settle("+f+", "+h+"): Promise already settled in state"+this.i);this.i=f;this.j=h;2===this.i&&this.K();this.H()};b.prototype.K=function(){var f=this;e(function(){if(f.D()){var h=y.console;"undefined"!==typeof h&&h.error(f.j)}},1)};b.prototype.D=
   function(){if(this.u)return!1;var f=y.CustomEvent,h=y.Event,k=y.dispatchEvent;if("undefined"===typeof k)return!0;"function"===typeof f?f=new f("unhandledrejection",{cancelable:!0}):"function"===typeof h?f=new h("unhandledrejection",{cancelable:!0}):(f=y.document.createEvent("CustomEvent"),f.initCustomEvent("unhandledrejection",!1,!0,f));f.promise=this;f.reason=this.j;return k(f)};b.prototype.H=function(){if(null!=this.h){for(var f=0;f<this.h.length;++f)g.i(this.h[f]);this.h=null}};var g=new c;b.prototype.L=
   function(f){var h=this.l();f.T(h.resolve,h.reject)};b.prototype.M=function(f,h){var k=this.l();try{f.call(h,k.resolve,k.reject)}catch(l){k.reject(l)}};b.prototype.then=function(f,h){function k(p,n){return"function"==typeof p?function(q){try{l(p(q))}catch(t){m(t)}}:n}var l,m,r=new b(function(p,n){l=p;m=n});this.T(k(f,l),k(h,m));return r};b.prototype.catch=function(f){return this.then(void 0,f)};b.prototype.T=function(f,h){function k(){switch(l.i){case 1:f(l.j);break;case 2:h(l.j);break;default:throw Error("Unexpected state: "+
   l.i);}}var l=this;null==this.h?g.i(k):this.h.push(k);this.u=!0};b.resolve=d;b.reject=function(f){return new b(function(h,k){k(f)})};b.race=function(f){return new b(function(h,k){for(var l=A(f),m=l.next();!m.done;m=l.next())d(m.value).T(h,k)})};b.all=function(f){var h=A(f),k=h.next();return k.done?d([]):new b(function(l,m){function r(q){return function(t){p[q]=t;n--;0==n&&l(p)}}var p=[],n=0;do p.push(void 0),n++,d(k.value).T(r(p.length-1),m),k=h.next();while(!k.done)})};return b});
   function xa(a,b){a instanceof String&&(a+="");var c=0,d=!1,e={next:function(){if(!d&&c<a.length){var g=c++;return{value:b(g,a[g]),done:!1}}d=!0;return{done:!0,value:void 0}}};e[Symbol.iterator]=function(){return e};return e}z("Array.prototype.keys",function(a){return a?a:function(){return xa(this,function(b){return b})}});
   z("Array.prototype.fill",function(a){return a?a:function(b,c,d){var e=this.length||0;0>c&&(c=Math.max(0,e+c));if(null==d||d>e)d=e;d=Number(d);0>d&&(d=Math.max(0,e+d));for(c=Number(c||0);c<d;c++)this[c]=b;return this}});function F(a){return a?a:Array.prototype.fill}z("Int8Array.prototype.fill",F);z("Uint8Array.prototype.fill",F);z("Uint8ClampedArray.prototype.fill",F);z("Int16Array.prototype.fill",F);z("Uint16Array.prototype.fill",F);z("Int32Array.prototype.fill",F);
   z("Uint32Array.prototype.fill",F);z("Float32Array.prototype.fill",F);z("Float64Array.prototype.fill",F);z("Object.is",function(a){return a?a:function(b,c){return b===c?0!==b||1/b===1/c:b!==b&&c!==c}});z("Array.prototype.includes",function(a){return a?a:function(b,c){var d=this;d instanceof String&&(d=String(d));var e=d.length;c=c||0;for(0>c&&(c=Math.max(c+e,0));c<e;c++){var g=d[c];if(g===b||Object.is(g,b))return!0}return!1}});
   z("String.prototype.includes",function(a){return a?a:function(b,c){if(null==this)throw new TypeError("The 'this' value for String.prototype.includes must not be null or undefined");if(b instanceof RegExp)throw new TypeError("First argument to String.prototype.includes must not be a regular expression");return-1!==this.indexOf(b,c||0)}});var ya=this||self;
   function Aa(a,b){a=a.split(".");var c=ya;a[0]in c||"undefined"==typeof c.execScript||c.execScript("var "+a[0]);for(var d;a.length&&(d=a.shift());)a.length||void 0===b?c[d]&&c[d]!==Object.prototype[d]?c=c[d]:c=c[d]={}:c[d]=b};function Ba(a){var b;a:{if(b=ya.navigator)if(b=b.userAgent)break a;b=""}return-1!=b.indexOf(a)};var Ca=Array.prototype.map?function(a,b){return Array.prototype.map.call(a,b,void 0)}:function(a,b){for(var c=a.length,d=Array(c),e="string"===typeof a?a.split(""):a,g=0;g<c;g++)g in e&&(d[g]=b.call(void 0,e[g],g,a));return d};var Da={},Ea=null;function Fa(a){var b=a.length,c=3*b/4;c%3?c=Math.floor(c):-1!="=.".indexOf(a[b-1])&&(c=-1!="=.".indexOf(a[b-2])?c-2:c-1);var d=new Uint8Array(c),e=0;Ga(a,function(g){d[e++]=g});return e!==c?d.subarray(0,e):d}
   function Ga(a,b){function c(k){for(;d<a.length;){var l=a.charAt(d++),m=Ea[l];if(null!=m)return m;if(!/^[\s\xa0]*$/.test(l))throw Error("Unknown base64 encoding at char: "+l);}return k}Ha();for(var d=0;;){var e=c(-1),g=c(0),f=c(64),h=c(64);if(64===h&&-1===e)break;b(e<<2|g>>4);64!=f&&(b(g<<4&240|f>>2),64!=h&&b(f<<6&192|h))}}
   function Ha(){if(!Ea){Ea={};for(var a="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split(""),b=["+/=","+/","-_=","-_.","-_"],c=0;5>c;c++){var d=a.concat(b[c].split(""));Da[c]=d;for(var e=0;e<d.length;e++){var g=d[e];void 0===Ea[g]&&(Ea[g]=e)}}}};var Ia="undefined"!==typeof Uint8Array,Ja=!(Ba("Trident")||Ba("MSIE"))&&"function"===typeof ya.btoa;
   function Ka(a){if(!Ja){var b;void 0===b&&(b=0);Ha();b=Da[b];for(var c=Array(Math.floor(a.length/3)),d=b[64]||"",e=0,g=0;e<a.length-2;e+=3){var f=a[e],h=a[e+1],k=a[e+2],l=b[f>>2];f=b[(f&3)<<4|h>>4];h=b[(h&15)<<2|k>>6];k=b[k&63];c[g++]=l+f+h+k}l=0;k=d;switch(a.length-e){case 2:l=a[e+1],k=b[(l&15)<<2]||d;case 1:a=a[e],c[g]=b[a>>2]+b[(a&3)<<4|l>>4]+k+d}return c.join("")}for(b="";10240<a.length;)b+=String.fromCharCode.apply(null,a.subarray(0,10240)),a=a.subarray(10240);b+=String.fromCharCode.apply(null,
   a);return btoa(b)}var La=RegExp("[-_.]","g");function Ma(a){switch(a){case "-":return"+";case "_":return"/";case ".":return"=";default:return""}}function Na(a){if(!Ja)return Fa(a);La.test(a)&&(a=a.replace(La,Ma));a=atob(a);for(var b=new Uint8Array(a.length),c=0;c<a.length;c++)b[c]=a.charCodeAt(c);return b}var Oa;function Pa(){return Oa||(Oa=new Uint8Array(0))}var Qa={};var Ra="function"===typeof Uint8Array.prototype.slice,G=0,H=0;function Sa(a){var b=0>a;a=Math.abs(a);var c=a>>>0;a=Math.floor((a-c)/4294967296);b&&(c=A(Ta(c,a)),b=c.next().value,a=c.next().value,c=b);G=c>>>0;H=a>>>0}var Ua="function"===typeof BigInt;function Ta(a,b){b=~b;a?a=~a+1:b+=1;return[a,b]};function Va(a,b){this.i=a>>>0;this.h=b>>>0}
   function Wa(a){if(!a)return Xa||(Xa=new Va(0,0));if(!/^-?\d+$/.test(a))return null;if(16>a.length)Sa(Number(a));else if(Ua)a=BigInt(a),G=Number(a&BigInt(4294967295))>>>0,H=Number(a>>BigInt(32)&BigInt(4294967295));else{var b=+("-"===a[0]);H=G=0;for(var c=a.length,d=b,e=(c-b)%6+b;e<=c;d=e,e+=6)d=Number(a.slice(d,e)),H*=1E6,G=1E6*G+d,4294967296<=G&&(H+=G/4294967296|0,G%=4294967296);b&&(b=A(Ta(G,H)),a=b.next().value,b=b.next().value,G=a,H=b)}return new Va(G,H)}var Xa;function Ya(a,b){return Error("Invalid wire type: "+a+" (at position "+b+")")}function Za(){return Error("Failed to read varint, encoding is invalid.")}function $a(a,b){return Error("Tried to read past the end of the data "+b+" > "+a)};function K(){throw Error("Invalid UTF8");}function ab(a,b){b=String.fromCharCode.apply(null,b);return null==a?b:a+b}var bb=void 0,cb,db="undefined"!==typeof TextDecoder,eb,fb="undefined"!==typeof TextEncoder;var gb;function hb(a){if(a!==Qa)throw Error("illegal external caller");}function ib(a,b){hb(b);this.V=a;if(null!=a&&0===a.length)throw Error("ByteString should be constructed with non-empty values");}function jb(){return gb||(gb=new ib(null,Qa))}function kb(a){hb(Qa);var b=a.V;b=null==b||Ia&&null!=b&&b instanceof Uint8Array?b:"string"===typeof b?Na(b):null;return null==b?b:a.V=b};function lb(a){if("string"===typeof a)return{buffer:Na(a),C:!1};if(Array.isArray(a))return{buffer:new Uint8Array(a),C:!1};if(a.constructor===Uint8Array)return{buffer:a,C:!1};if(a.constructor===ArrayBuffer)return{buffer:new Uint8Array(a),C:!1};if(a.constructor===ib)return{buffer:kb(a)||Pa(),C:!0};if(a instanceof Uint8Array)return{buffer:new Uint8Array(a.buffer,a.byteOffset,a.byteLength),C:!1};throw Error("Type not convertible to a Uint8Array, expected a Uint8Array, an ArrayBuffer, a base64 encoded string, a ByteString or an Array of numbers");
   };function mb(a,b){this.i=null;this.m=!1;this.h=this.j=this.l=0;nb(this,a,b)}function nb(a,b,c){c=void 0===c?{}:c;a.S=void 0===c.S?!1:c.S;b&&(b=lb(b),a.i=b.buffer,a.m=b.C,a.l=0,a.j=a.i.length,a.h=a.l)}mb.prototype.reset=function(){this.h=this.l};function L(a,b){a.h=b;if(b>a.j)throw $a(a.j,b);}
   function ob(a){var b=a.i,c=a.h,d=b[c++],e=d&127;if(d&128&&(d=b[c++],e|=(d&127)<<7,d&128&&(d=b[c++],e|=(d&127)<<14,d&128&&(d=b[c++],e|=(d&127)<<21,d&128&&(d=b[c++],e|=d<<28,d&128&&b[c++]&128&&b[c++]&128&&b[c++]&128&&b[c++]&128&&b[c++]&128)))))throw Za();L(a,c);return e}function pb(a,b){if(0>b)throw Error("Tried to read a negative byte length: "+b);var c=a.h,d=c+b;if(d>a.j)throw $a(b,a.j-c);a.h=d;return c}var qb=[];function rb(){this.h=[]}rb.prototype.length=function(){return this.h.length};rb.prototype.end=function(){var a=this.h;this.h=[];return a};function sb(a,b,c){for(;0<c||127<b;)a.h.push(b&127|128),b=(b>>>7|c<<25)>>>0,c>>>=7;a.h.push(b)}function M(a,b){for(;127<b;)a.h.push(b&127|128),b>>>=7;a.h.push(b)};function tb(a,b){if(qb.length){var c=qb.pop();nb(c,a,b);a=c}else a=new mb(a,b);this.h=a;this.j=this.h.h;this.i=this.l=-1;this.setOptions(b)}tb.prototype.setOptions=function(a){a=void 0===a?{}:a;this.ca=void 0===a.ca?!1:a.ca};tb.prototype.reset=function(){this.h.reset();this.j=this.h.h;this.i=this.l=-1};
   function ub(a){var b=a.h;if(b.h==b.j)return!1;a.j=a.h.h;var c=ob(a.h)>>>0;b=c>>>3;c&=7;if(!(0<=c&&5>=c))throw Ya(c,a.j);if(1>b)throw Error("Invalid field number: "+b+" (at position "+a.j+")");a.l=b;a.i=c;return!0}
   function vb(a){switch(a.i){case 0:if(0!=a.i)vb(a);else a:{a=a.h;for(var b=a.h,c=b+10,d=a.i;b<c;)if(0===(d[b++]&128)){L(a,b);break a}throw Za();}break;case 1:a=a.h;L(a,a.h+8);break;case 2:2!=a.i?vb(a):(b=ob(a.h)>>>0,a=a.h,L(a,a.h+b));break;case 5:a=a.h;L(a,a.h+4);break;case 3:b=a.l;do{if(!ub(a))throw Error("Unmatched start-group tag: stream EOF");if(4==a.i){if(a.l!=b)throw Error("Unmatched end-group tag");break}vb(a)}while(1);break;default:throw Ya(a.i,a.j);}}var wb=[];function xb(){this.j=[];this.i=0;this.h=new rb}function N(a,b){0!==b.length&&(a.j.push(b),a.i+=b.length)}function yb(a,b){if(b=b.R){N(a,a.h.end());for(var c=0;c<b.length;c++)N(a,kb(b[c])||Pa())}};var O="function"===typeof Symbol&&"symbol"===typeof Symbol()?Symbol():void 0;function P(a,b){if(O)return a[O]|=b;if(void 0!==a.A)return a.A|=b;Object.defineProperties(a,{A:{value:b,configurable:!0,writable:!0,enumerable:!1}});return b}function zb(a,b){O?a[O]&&(a[O]&=~b):void 0!==a.A&&(a.A&=~b)}function Q(a){var b;O?b=a[O]:b=a.A;return null==b?0:b}function R(a,b){O?a[O]=b:void 0!==a.A?a.A=b:Object.defineProperties(a,{A:{value:b,configurable:!0,writable:!0,enumerable:!1}})}
   function Ab(a){P(a,1);return a}function Bb(a,b){R(b,(a|0)&-51)}function Cb(a,b){R(b,(a|18)&-41)};var Db={};function Eb(a){return null!==a&&"object"===typeof a&&!Array.isArray(a)&&a.constructor===Object}var Fb,Gb=[];R(Gb,23);Fb=Object.freeze(Gb);function Hb(a){if(Q(a.o)&2)throw Error("Cannot mutate an immutable Message");}function Ib(a){var b=a.length;(b=b?a[b-1]:void 0)&&Eb(b)?b.g=1:(b={},a.push((b.g=1,b)))};function Jb(a){var b=a.i+a.G;return a.B||(a.B=a.o[b]={})}function S(a,b){return-1===b?null:b>=a.i?a.B?a.B[b]:void 0:a.o[b+a.G]}function U(a,b,c,d){Hb(a);Kb(a,b,c,d)}function Kb(a,b,c,d){a.j&&(a.j=void 0);b>=a.i||d?Jb(a)[b]=c:(a.o[b+a.G]=c,(a=a.B)&&b in a&&delete a[b])}function Lb(a,b,c,d){var e=S(a,b);Array.isArray(e)||(e=Fb);var g=Q(e);g&1||Ab(e);if(d)g&2||P(e,2),c&1||Object.freeze(e);else{d=!(c&2);var f=g&2;c&1||!f?d&&g&16&&!f&&zb(e,16):(e=Ab(Array.prototype.slice.call(e)),Kb(a,b,e))}return e}
   function Mb(a,b){var c=S(a,b);var d=null==c?c:"number"===typeof c||"NaN"===c||"Infinity"===c||"-Infinity"===c?Number(c):void 0;null!=d&&d!==c&&Kb(a,b,d);return d}
   function Nb(a,b,c,d,e){a.h||(a.h={});var g=a.h[c],f=Lb(a,c,3,e);if(!g){var h=f;g=[];var k=!!(Q(a.o)&16);f=!!(Q(h)&2);var l=h;!e&&f&&(h=Array.prototype.slice.call(h));for(var m=f,r=0;r<h.length;r++){var p=h[r];var n=b,q=!1;q=void 0===q?!1:q;p=Array.isArray(p)?new n(p):q?new n:void 0;if(void 0!==p){n=p.o;var t=q=Q(n);f&&(t|=2);k&&(t|=16);t!=q&&R(n,t);n=t;m=m||!!(2&n);g.push(p)}}a.h[c]=g;k=Q(h);b=k|33;b=m?b&-9:b|8;k!=b&&(m=h,Object.isFrozen(m)&&(m=Array.prototype.slice.call(m)),R(m,b),h=m);l!==h&&Kb(a,
   c,h);(e||d&&f)&&P(g,2);d&&Object.freeze(g);return g}e||(e=Object.isFrozen(g),d&&!e?Object.freeze(g):!d&&e&&(g=Array.prototype.slice.call(g),a.h[c]=g));return g}function Ob(a,b,c){var d=!!(Q(a.o)&2);b=Nb(a,b,c,d,d);a=Lb(a,c,3,d);if(!(d||Q(a)&8)){for(d=0;d<b.length;d++){c=b[d];if(Q(c.o)&2){var e=Pb(c,!1);e.j=c}else e=c;c!==e&&(b[d]=e,a[d]=e.o)}P(a,8)}return b}
   function V(a,b,c){if(null!=c&&"number"!==typeof c)throw Error("Value of float/double field must be a number|null|undefined, found "+typeof c+": "+c);U(a,b,c)}function Qb(a,b,c,d,e){Hb(a);var g=Nb(a,c,b,!1,!1);c=null!=d?d:new c;a=Lb(a,b,2,!1);void 0!=e?(g.splice(e,0,c),a.splice(e,0,c.o)):(g.push(c),a.push(c.o));c.C()&&zb(a,8);return c}function Rb(a,b){return null==a?b:a}function W(a,b,c){c=void 0===c?0:c;return Rb(Mb(a,b),c)};var Sb;function Tb(a){switch(typeof a){case "number":return isFinite(a)?a:String(a);case "object":if(a)if(Array.isArray(a)){if(0!==(Q(a)&128))return a=Array.prototype.slice.call(a),Ib(a),a}else{if(Ia&&null!=a&&a instanceof Uint8Array)return Ka(a);if(a instanceof ib){var b=a.V;return null==b?"":"string"===typeof b?b:a.V=Ka(b)}}}return a};function Ub(a,b,c,d){if(null!=a){if(Array.isArray(a))a=Vb(a,b,c,void 0!==d);else if(Eb(a)){var e={},g;for(g in a)e[g]=Ub(a[g],b,c,d);a=e}else a=b(a,d);return a}}function Vb(a,b,c,d){var e=Q(a);d=d?!!(e&16):void 0;a=Array.prototype.slice.call(a);for(var g=0;g<a.length;g++)a[g]=Ub(a[g],b,c,d);c(e,a);return a}function Wb(a){return a.ja===Db?a.toJSON():Tb(a)}function Xb(a,b){a&128&&Ib(b)};function Yb(a,b,c){c=void 0===c?Cb:c;if(null!=a){if(Ia&&a instanceof Uint8Array)return a.length?new ib(new Uint8Array(a),Qa):jb();if(Array.isArray(a)){var d=Q(a);if(d&2)return a;if(b&&!(d&32)&&(d&16||0===d))return R(a,d|2),a;a=Vb(a,Yb,d&4?Cb:c,!0);b=Q(a);b&4&&b&2&&Object.freeze(a);return a}return a.ja===Db?Zb(a):a}}
   function $b(a,b,c,d,e,g,f){if(a=a.h&&a.h[c]){d=Q(a);d&2?d=a:(g=Ca(a,Zb),Cb(d,g),Object.freeze(g),d=g);Hb(b);f=null==d?Fb:Ab([]);if(null!=d){g=!!d.length;for(a=0;a<d.length;a++){var h=d[a];g=g&&!(Q(h.o)&2);f[a]=h.o}g=(g?8:0)|1;a=Q(f);(a&g)!==g&&(Object.isFrozen(f)&&(f=Array.prototype.slice.call(f)),R(f,a|g));b.h||(b.h={});b.h[c]=d}else b.h&&(b.h[c]=void 0);Kb(b,c,f,e)}else U(b,c,Yb(d,g,f),e)}function Zb(a){if(Q(a.o)&2)return a;a=Pb(a,!0);P(a.o,2);return a}
   function Pb(a,b){var c=a.o,d=[];P(d,16);var e=a.constructor.h;e&&d.push(e);e=a.B;if(e){d.length=c.length;d.fill(void 0,d.length,c.length);var g={};d[d.length-1]=g}0!==(Q(c)&128)&&Ib(d);b=b||a.C()?Cb:Bb;g=a.constructor;Sb=d;d=new g(d);Sb=void 0;a.R&&(d.R=a.R.slice());g=!!(Q(c)&16);for(var f=e?c.length-1:c.length,h=0;h<f;h++)$b(a,d,h-a.G,c[h],!1,g,b);if(e)for(var k in e)$b(a,d,+k,e[k],!0,g,b);return d};function X(a,b,c){null==a&&(a=Sb);Sb=void 0;var d=this.constructor.i||0,e=0<d,g=this.constructor.h,f=!1;if(null==a){a=g?[g]:[];var h=48;var k=!0;e&&(d=0,h|=128);R(a,h)}else{if(!Array.isArray(a))throw Error();if(g&&g!==a[0])throw Error();var l=h=P(a,0);if(k=0!==(16&l))(f=0!==(32&l))||(l|=32);if(e)if(128&l)d=0;else{if(0<a.length){var m=a[a.length-1];if(Eb(m)&&"g"in m){d=0;l|=128;delete m.g;var r=!0,p;for(p in m){r=!1;break}r&&a.pop()}}}else if(128&l)throw Error();h!==l&&R(a,l)}this.G=(g?0:-1)-d;this.h=
   void 0;this.o=a;a:{g=this.o.length;d=g-1;if(g&&(g=this.o[d],Eb(g))){this.B=g;this.i=d-this.G;break a}void 0!==b&&-1<b?(this.i=Math.max(b,d+1-this.G),this.B=void 0):this.i=Number.MAX_VALUE}if(!e&&this.B&&"g"in this.B)throw Error('Unexpected "g" flag in sparse object of message that is not a group type.');if(c){b=k&&!f&&!0;e=this.i;var n;for(k=0;k<c.length;k++)f=c[k],f<e?(f+=this.G,(d=a[f])?ac(d,b):a[f]=Fb):(n||(n=Jb(this)),(d=n[f])?ac(d,b):n[f]=Fb)}}
   X.prototype.toJSON=function(){return Vb(this.o,Wb,Xb)};X.prototype.C=function(){return!!(Q(this.o)&2)};function ac(a,b){if(Array.isArray(a)){var c=Q(a),d=1;!b||c&2||(d|=16);(c&d)!==d&&R(a,c|d)}}X.prototype.ja=Db;X.prototype.toString=function(){return this.o.toString()};function bc(a,b,c){if(c){var d={},e;for(e in c){var g=c[e],f=g.ra;f||(d.J=g.xa||g.oa.W,g.ia?(d.aa=cc(g.ia),f=function(h){return function(k,l,m){return h.J(k,l,m,h.aa)}}(d)):g.ka?(d.Z=dc(g.da.P,g.ka),f=function(h){return function(k,l,m){return h.J(k,l,m,h.Z)}}(d)):f=d.J,g.ra=f);f(b,a,g.da);d={J:d.J,aa:d.aa,Z:d.Z}}}yb(b,a)}var ec=Symbol();function fc(a,b,c){return a[ec]||(a[ec]=function(d,e){return b(d,e,c)})}
   function gc(a){var b=a[ec];if(!b){var c=hc(a);b=function(d,e){return ic(d,e,c)};a[ec]=b}return b}function jc(a){var b=a.ia;if(b)return gc(b);if(b=a.wa)return fc(a.da.P,b,a.ka)}function kc(a){var b=jc(a),c=a.da,d=a.oa.U;return b?function(e,g){return d(e,g,c,b)}:function(e,g){return d(e,g,c)}}function lc(a,b){var c=a[b];"function"==typeof c&&0===c.length&&(c=c(),a[b]=c);return Array.isArray(c)&&(mc in c||nc in c||0<c.length&&"function"==typeof c[0])?c:void 0}
   function oc(a,b,c,d,e,g){b.P=a[0];var f=1;if(a.length>f&&"number"!==typeof a[f]){var h=a[f++];c(b,h)}for(;f<a.length;){c=a[f++];for(var k=f+1;k<a.length&&"number"!==typeof a[k];)k++;h=a[f++];k-=f;switch(k){case 0:d(b,c,h);break;case 1:(k=lc(a,f))?(f++,e(b,c,h,k)):d(b,c,h,a[f++]);break;case 2:k=f++;k=lc(a,k);e(b,c,h,k,a[f++]);break;case 3:g(b,c,h,a[f++],a[f++],a[f++]);break;case 4:g(b,c,h,a[f++],a[f++],a[f++],a[f++]);break;default:throw Error("unexpected number of binary field arguments: "+k);}}return b}
   var pc=Symbol();function cc(a){var b=a[pc];if(!b){var c=qc(a);b=function(d,e){return rc(d,e,c)};a[pc]=b}return b}function dc(a,b){var c=a[pc];c||(c=function(d,e){return bc(d,e,b)},a[pc]=c);return c}var nc=Symbol();function sc(a,b){a.push(b)}function tc(a,b,c){a.push(b,c.W)}function uc(a,b,c,d){var e=cc(d),g=qc(d).P,f=c.W;a.push(b,function(h,k,l){return f(h,k,l,g,e)})}function vc(a,b,c,d,e,g){var f=dc(d,g),h=c.W;a.push(b,function(k,l,m){return h(k,l,m,d,f)})}
   function qc(a){var b=a[nc];if(b)return b;b=oc(a,a[nc]=[],sc,tc,uc,vc);mc in a&&nc in a&&(a.length=0);return b}var mc=Symbol();function wc(a,b){a[0]=b}function xc(a,b,c,d){var e=c.U;a[b]=d?function(g,f,h){return e(g,f,h,d)}:e}function yc(a,b,c,d,e){var g=c.U,f=gc(d),h=hc(d).P;a[b]=function(k,l,m){return g(k,l,m,h,f,e)}}function zc(a,b,c,d,e,g,f){var h=c.U,k=fc(d,e,g);a[b]=function(l,m,r){return h(l,m,r,d,k,f)}}
   function hc(a){var b=a[mc];if(b)return b;b=oc(a,a[mc]={},wc,xc,yc,zc);mc in a&&nc in a&&(a.length=0);return b}
   function ic(a,b,c){for(;ub(b)&&4!=b.i;){var d=b.l,e=c[d];if(!e){var g=c[0];g&&(g=g[d])&&(e=c[d]=kc(g))}if(!e||!e(b,a,d)){e=b;d=a;g=e.j;vb(e);var f=e;if(!f.ca){e=f.h.h-g;f.h.h=g;f=f.h;if(0==e)e=jb();else{g=pb(f,e);if(f.S&&f.m)e=f.i.subarray(g,g+e);else{f=f.i;var h=g;e=g+e;e=h===e?Pa():Ra?f.slice(h,e):new Uint8Array(f.subarray(h,e))}e=0==e.length?jb():new ib(e,Qa)}(g=d.R)?g.push(e):d.R=[e]}}}return a}
   function rc(a,b,c){for(var d=c.length,e=1==d%2,g=e?1:0;g<d;g+=2)(0,c[g+1])(b,a,c[g]);bc(a,b,e?c[0]:void 0)}function Ac(a,b){return{U:a,W:b}}
   var Y=Ac(function(a,b,c){if(5!==a.i)return!1;a=a.h;var d=a.i,e=a.h,g=d[e];var f=d[e+1];var h=d[e+2];d=d[e+3];L(a,a.h+4);f=(g<<0|f<<8|h<<16|d<<24)>>>0;a=2*(f>>31)+1;g=f>>>23&255;f&=8388607;U(b,c,255==g?f?NaN:Infinity*a:0==g?a*Math.pow(2,-149)*f:a*Math.pow(2,g-150)*(f+Math.pow(2,23)));return!0},function(a,b,c){b=Mb(b,c);if(null!=b){M(a.h,8*c+5);a=a.h;var d=+b;0===d?0<1/d?G=H=0:(H=0,G=2147483648):isNaN(d)?(H=0,G=2147483647):(d=(c=0>d?-2147483648:0)?-d:d,3.4028234663852886E38<d?(H=0,G=(c|2139095040)>>>
   0):1.1754943508222875E-38>d?(d=Math.round(d/Math.pow(2,-149)),H=0,G=(c|d)>>>0):(b=Math.floor(Math.log(d)/Math.LN2),d*=Math.pow(2,-b),d=Math.round(8388608*d),16777216<=d&&++b,H=0,G=(c|b+127<<23|d&8388607)>>>0));c=G;a.h.push(c>>>0&255);a.h.push(c>>>8&255);a.h.push(c>>>16&255);a.h.push(c>>>24&255)}}),Bc=Ac(function(a,b,c){if(0!==a.i)return!1;var d=a.h,e=0,g=a=0,f=d.i,h=d.h;do{var k=f[h++];e|=(k&127)<<g;g+=7}while(32>g&&k&128);32<g&&(a|=(k&127)>>4);for(g=3;32>g&&k&128;g+=7)k=f[h++],a|=(k&127)<<g;L(d,
   h);if(128>k){d=e>>>0;k=a>>>0;if(a=k&2147483648)d=~d+1>>>0,k=~k>>>0,0==d&&(k=k+1>>>0);d=4294967296*k+(d>>>0)}else throw Za();U(b,c,a?-d:d);return!0},function(a,b,c){b=S(b,c);null!=b&&("string"===typeof b&&Wa(b),null!=b&&(M(a.h,8*c),"number"===typeof b?(a=a.h,Sa(b),sb(a,G,H)):(c=Wa(b),sb(a.h,c.i,c.h))))}),Cc=Ac(function(a,b,c){if(0!==a.i)return!1;U(b,c,ob(a.h));return!0},function(a,b,c){b=S(b,c);if(null!=b&&null!=b)if(M(a.h,8*c),a=a.h,c=b,0<=c)M(a,c);else{for(b=0;9>b;b++)a.h.push(c&127|128),c>>=7;a.h.push(1)}}),
   Dc=Ac(function(a,b,c){if(2!==a.i)return!1;var d=ob(a.h)>>>0;a=a.h;var e=pb(a,d);a=a.i;if(db){var g=a,f;(f=cb)||(f=cb=new TextDecoder("utf-8",{fatal:!0}));a=e+d;g=0===e&&a===g.length?g:g.subarray(e,a);try{var h=f.decode(g)}catch(r){if(void 0===bb){try{f.decode(new Uint8Array([128]))}catch(p){}try{f.decode(new Uint8Array([97])),bb=!0}catch(p){bb=!1}}!bb&&(cb=void 0);throw r;}}else{h=e;d=h+d;e=[];for(var k=null,l,m;h<d;)l=a[h++],128>l?e.push(l):224>l?h>=d?K():(m=a[h++],194>l||128!==(m&192)?(h--,K()):
   e.push((l&31)<<6|m&63)):240>l?h>=d-1?K():(m=a[h++],128!==(m&192)||224===l&&160>m||237===l&&160<=m||128!==((g=a[h++])&192)?(h--,K()):e.push((l&15)<<12|(m&63)<<6|g&63)):244>=l?h>=d-2?K():(m=a[h++],128!==(m&192)||0!==(l<<28)+(m-144)>>30||128!==((g=a[h++])&192)||128!==((f=a[h++])&192)?(h--,K()):(l=(l&7)<<18|(m&63)<<12|(g&63)<<6|f&63,l-=65536,e.push((l>>10&1023)+55296,(l&1023)+56320))):K(),8192<=e.length&&(k=ab(k,e),e.length=0);h=ab(k,e)}U(b,c,h);return!0},function(a,b,c){b=S(b,c);if(null!=b){var d=!1;
   d=void 0===d?!1:d;if(fb){if(d&&/(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(b))throw Error("Found an unpaired surrogate");b=(eb||(eb=new TextEncoder)).encode(b)}else{for(var e=0,g=new Uint8Array(3*b.length),f=0;f<b.length;f++){var h=b.charCodeAt(f);if(128>h)g[e++]=h;else{if(2048>h)g[e++]=h>>6|192;else{if(55296<=h&&57343>=h){if(56319>=h&&f<b.length){var k=b.charCodeAt(++f);if(56320<=k&&57343>=k){h=1024*(h-55296)+k-56320+65536;g[e++]=h>>18|240;g[e++]=h>>12&63|128;
   g[e++]=h>>6&63|128;g[e++]=h&63|128;continue}else f--}if(d)throw Error("Found an unpaired surrogate");h=65533}g[e++]=h>>12|224;g[e++]=h>>6&63|128}g[e++]=h&63|128}}b=e===g.length?g:g.subarray(0,e)}M(a.h,8*c+2);M(a.h,b.length);N(a,a.h.end());N(a,b)}}),Ec=Ac(function(a,b,c,d,e){if(2!==a.i)return!1;b=Qb(b,c,d);c=a.h.j;d=ob(a.h)>>>0;var g=a.h.h+d,f=g-c;0>=f&&(a.h.j=g,e(b,a,void 0,void 0,void 0),f=g-a.h.h);if(f)throw Error("Message parsing ended unexpectedly. Expected to read "+(d+" bytes, instead read "+
   (d-f)+" bytes, either the data ended unexpectedly or the message misreported its own length"));a.h.h=g;a.h.j=c;return!0},function(a,b,c,d,e){b=Ob(b,d,c);if(null!=b)for(d=0;d<b.length;d++){var g=a;M(g.h,8*c+2);var f=g.h.end();N(g,f);f.push(g.i);g=f;e(b[d],a);f=a;var h=g.pop();for(h=f.i+f.h.length()-h;127<h;)g.push(h&127|128),h>>>=7,f.i++;g.push(h);f.i++}});function Fc(a){return function(b,c){a:{if(wb.length){var d=wb.pop();d.setOptions(c);nb(d.h,b,c);b=d}else b=new tb(b,c);try{var e=hc(a);var g=ic(new e.P,b,e);break a}finally{e=b.h,e.i=null,e.m=!1,e.l=0,e.j=0,e.h=0,e.S=!1,b.l=-1,b.i=-1,100>wb.length&&wb.push(b)}g=void 0}return g}}function Gc(a){return function(){var b=new xb;rc(this,b,qc(a));N(b,b.h.end());for(var c=new Uint8Array(b.i),d=b.j,e=d.length,g=0,f=0;f<e;f++){var h=d[f];c.set(h,g);g+=h.length}b.j=[c];return c}};function Z(a){X.call(this,a)}na(Z,X);var Hc=[Z,1,Cc,2,Y,3,Dc,4,Dc];Z.prototype.l=Gc(Hc);function Ic(a){X.call(this,a,-1,Jc)}na(Ic,X);Ic.prototype.addClassification=function(a,b){Qb(this,1,Z,a,b);return this};var Jc=[1],Kc=Fc([Ic,1,Ec,Hc]);function Lc(a){X.call(this,a)}na(Lc,X);var Mc=[Lc,1,Y,2,Y,3,Y,4,Y,5,Y];Lc.prototype.l=Gc(Mc);function Nc(a){X.call(this,a,-1,Oc)}na(Nc,X);var Oc=[1],Pc=Fc([Nc,1,Ec,Mc]);function Qc(a){X.call(this,a)}na(Qc,X);var Rc=[Qc,1,Y,2,Y,3,Y,4,Y,5,Y,6,Bc],Sc=Fc(Rc);Qc.prototype.l=Gc(Rc);function Tc(a,b,c){c=a.createShader(0===c?a.VERTEX_SHADER:a.FRAGMENT_SHADER);a.shaderSource(c,b);a.compileShader(c);if(!a.getShaderParameter(c,a.COMPILE_STATUS))throw Error("Could not compile WebGL shader.\n\n"+a.getShaderInfoLog(c));return c};function Uc(a){return Ob(a,Z,1).map(function(b){var c=S(b,1);return{index:null==c?0:c,qa:W(b,2),label:null!=S(b,3)?Rb(S(b,3),""):void 0,displayName:null!=S(b,4)?Rb(S(b,4),""):void 0}})};function Vc(a){return{x:W(a,1),y:W(a,2),z:W(a,3),visibility:null!=Mb(a,4)?W(a,4):void 0}};function Wc(a,b){this.i=a;this.h=b;this.m=0}
   function Xc(a,b,c){Yc(a,b);if("function"===typeof a.h.canvas.transferToImageBitmap)return Promise.resolve(a.h.canvas.transferToImageBitmap());if(c)return Promise.resolve(a.h.canvas);if("function"===typeof createImageBitmap)return createImageBitmap(a.h.canvas);void 0===a.j&&(a.j=document.createElement("canvas"));return new Promise(function(d){a.j.height=a.h.canvas.height;a.j.width=a.h.canvas.width;a.j.getContext("2d",{}).drawImage(a.h.canvas,0,0,a.h.canvas.width,a.h.canvas.height);d(a.j)})}
   function Yc(a,b){var c=a.h;if(void 0===a.s){var d=Tc(c,"\n  attribute vec2 aVertex;\n  attribute vec2 aTex;\n  varying vec2 vTex;\n  void main(void) {\n    gl_Position = vec4(aVertex, 0.0, 1.0);\n    vTex = aTex;\n  }",0),e=Tc(c,"\n  precision mediump float;\n  varying vec2 vTex;\n  uniform sampler2D sampler0;\n  void main(){\n    gl_FragColor = texture2D(sampler0, vTex);\n  }",1),g=c.createProgram();c.attachShader(g,d);c.attachShader(g,e);c.linkProgram(g);if(!c.getProgramParameter(g,c.LINK_STATUS))throw Error("Could not compile WebGL program.\n\n"+
   c.getProgramInfoLog(g));d=a.s=g;c.useProgram(d);e=c.getUniformLocation(d,"sampler0");a.l={O:c.getAttribLocation(d,"aVertex"),N:c.getAttribLocation(d,"aTex"),ya:e};a.v=c.createBuffer();c.bindBuffer(c.ARRAY_BUFFER,a.v);c.enableVertexAttribArray(a.l.O);c.vertexAttribPointer(a.l.O,2,c.FLOAT,!1,0,0);c.bufferData(c.ARRAY_BUFFER,new Float32Array([-1,-1,-1,1,1,1,1,-1]),c.STATIC_DRAW);c.bindBuffer(c.ARRAY_BUFFER,null);a.u=c.createBuffer();c.bindBuffer(c.ARRAY_BUFFER,a.u);c.enableVertexAttribArray(a.l.N);c.vertexAttribPointer(a.l.N,
   2,c.FLOAT,!1,0,0);c.bufferData(c.ARRAY_BUFFER,new Float32Array([0,1,0,0,1,0,1,1]),c.STATIC_DRAW);c.bindBuffer(c.ARRAY_BUFFER,null);c.uniform1i(e,0)}d=a.l;c.useProgram(a.s);c.canvas.width=b.width;c.canvas.height=b.height;c.viewport(0,0,b.width,b.height);c.activeTexture(c.TEXTURE0);a.i.bindTexture2d(b.glName);c.enableVertexAttribArray(d.O);c.bindBuffer(c.ARRAY_BUFFER,a.v);c.vertexAttribPointer(d.O,2,c.FLOAT,!1,0,0);c.enableVertexAttribArray(d.N);c.bindBuffer(c.ARRAY_BUFFER,a.u);c.vertexAttribPointer(d.N,
   2,c.FLOAT,!1,0,0);c.bindFramebuffer(c.DRAW_FRAMEBUFFER?c.DRAW_FRAMEBUFFER:c.FRAMEBUFFER,null);c.clearColor(0,0,0,0);c.clear(c.COLOR_BUFFER_BIT);c.colorMask(!0,!0,!0,!0);c.drawArrays(c.TRIANGLE_FAN,0,4);c.disableVertexAttribArray(d.O);c.disableVertexAttribArray(d.N);c.bindBuffer(c.ARRAY_BUFFER,null);a.i.bindTexture2d(0)}function Zc(a){this.h=a};var $c=new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,9,1,7,0,65,0,253,15,26,11]);function ad(a,b){return b+a}function bd(a,b){window[a]=b}function cd(a){var b=document.createElement("script");b.setAttribute("src",a);b.setAttribute("crossorigin","anonymous");return new Promise(function(c){b.addEventListener("load",function(){c()},!1);b.addEventListener("error",function(){c()},!1);document.body.appendChild(b)})}
   function dd(){return E(function(a){switch(a.h){case 1:return a.s=2,D(a,WebAssembly.instantiate($c),4);case 4:a.h=3;a.s=0;break;case 2:return a.s=0,a.l=null,a.return(!1);case 3:return a.return(!0)}})}
   function ed(a){this.h=a;this.listeners={};this.l={};this.L={};this.s={};this.v={};this.M=this.u=this.ga=!0;this.I=Promise.resolve();this.fa="";this.D={};this.locateFile=a&&a.locateFile||ad;if("object"===typeof window)var b=window.location.pathname.toString().substring(0,window.location.pathname.toString().lastIndexOf("/"))+"/";else if("undefined"!==typeof location)b=location.pathname.toString().substring(0,location.pathname.toString().lastIndexOf("/"))+"/";else throw Error("solutions can only be loaded on a web page or in a web worker");
   this.ha=b;if(a.options){b=A(Object.keys(a.options));for(var c=b.next();!c.done;c=b.next()){c=c.value;var d=a.options[c].default;void 0!==d&&(this.l[c]="function"===typeof d?d():d)}}}x=ed.prototype;x.close=function(){this.j&&this.j.delete();return Promise.resolve()};
   function fd(a){var b,c,d,e,g,f,h,k,l,m,r;return E(function(p){switch(p.h){case 1:if(!a.ga)return p.return();b=void 0===a.h.files?[]:"function"===typeof a.h.files?a.h.files(a.l):a.h.files;return D(p,dd(),2);case 2:c=p.i;if("object"===typeof window)return bd("createMediapipeSolutionsWasm",{locateFile:a.locateFile}),bd("createMediapipeSolutionsPackedAssets",{locateFile:a.locateFile}),f=b.filter(function(n){return void 0!==n.data}),h=b.filter(function(n){return void 0===n.data}),k=Promise.all(f.map(function(n){var q=
   gd(a,n.url);if(void 0!==n.path){var t=n.path;q=q.then(function(w){a.overrideFile(t,w);return Promise.resolve(w)})}return q})),l=Promise.all(h.map(function(n){return void 0===n.simd||n.simd&&c||!n.simd&&!c?cd(a.locateFile(n.url,a.ha)):Promise.resolve()})).then(function(){var n,q,t;return E(function(w){if(1==w.h)return n=window.createMediapipeSolutionsWasm,q=window.createMediapipeSolutionsPackedAssets,t=a,D(w,n(q),2);t.i=w.i;w.h=0})}),m=function(){return E(function(n){a.h.graph&&a.h.graph.url?n=D(n,
   gd(a,a.h.graph.url),0):(n.h=0,n=void 0);return n})}(),D(p,Promise.all([l,k,m]),7);if("function"!==typeof importScripts)throw Error("solutions can only be loaded on a web page or in a web worker");d=b.filter(function(n){return void 0===n.simd||n.simd&&c||!n.simd&&!c}).map(function(n){return a.locateFile(n.url,a.ha)});importScripts.apply(null,ea(d));e=a;return D(p,createMediapipeSolutionsWasm(Module),6);case 6:e.i=p.i;a.m=new OffscreenCanvas(1,1);a.i.canvas=a.m;g=a.i.GL.createContext(a.m,{antialias:!1,
   alpha:!1,va:"undefined"!==typeof WebGL2RenderingContext?2:1});a.i.GL.makeContextCurrent(g);p.h=4;break;case 7:a.m=document.createElement("canvas");r=a.m.getContext("webgl2",{});if(!r&&(r=a.m.getContext("webgl",{}),!r))return alert("Failed to create WebGL canvas context when passing video frame."),p.return();a.K=r;a.i.canvas=a.m;a.i.createContext(a.m,!0,!0,{});case 4:a.j=new a.i.SolutionWasm,a.ga=!1,p.h=0}})}
   function hd(a){var b,c,d,e,g,f,h,k;return E(function(l){if(1==l.h){if(a.h.graph&&a.h.graph.url&&a.fa===a.h.graph.url)return l.return();a.u=!0;if(!a.h.graph||!a.h.graph.url){l.h=2;return}a.fa=a.h.graph.url;return D(l,gd(a,a.h.graph.url),3)}2!=l.h&&(b=l.i,a.j.loadGraph(b));c=A(Object.keys(a.D));for(d=c.next();!d.done;d=c.next())e=d.value,a.j.overrideFile(e,a.D[e]);a.D={};if(a.h.listeners)for(g=A(a.h.listeners),f=g.next();!f.done;f=g.next())h=f.value,id(a,h);k=a.l;a.l={};a.setOptions(k);l.h=0})}
   x.reset=function(){var a=this;return E(function(b){a.j&&(a.j.reset(),a.s={},a.v={});b.h=0})};
   x.setOptions=function(a,b){var c=this;if(b=b||this.h.options){for(var d=[],e=[],g={},f=A(Object.keys(a)),h=f.next();!h.done;g={X:g.X,Y:g.Y},h=f.next())if(h=h.value,!(h in this.l&&this.l[h]===a[h])){this.l[h]=a[h];var k=b[h];void 0!==k&&(k.onChange&&(g.X=k.onChange,g.Y=a[h],d.push(function(l){return function(){var m;return E(function(r){if(1==r.h)return D(r,l.X(l.Y),2);m=r.i;!0===m&&(c.u=!0);r.h=0})}}(g))),k.graphOptionXref&&(h=Object.assign({},{calculatorName:"",calculatorIndex:0},k.graphOptionXref,
   {valueNumber:1===k.type?a[h]:0,valueBoolean:0===k.type?a[h]:!1,valueString:2===k.type?a[h]:""}),e.push(h)))}if(0!==d.length||0!==e.length)this.u=!0,this.H=(void 0===this.H?[]:this.H).concat(e),this.F=(void 0===this.F?[]:this.F).concat(d)}};
   function jd(a){var b,c,d,e,g,f,h;return E(function(k){switch(k.h){case 1:if(!a.u)return k.return();if(!a.F){k.h=2;break}b=A(a.F);c=b.next();case 3:if(c.done){k.h=5;break}d=c.value;return D(k,d(),4);case 4:c=b.next();k.h=3;break;case 5:a.F=void 0;case 2:if(a.H){e=new a.i.GraphOptionChangeRequestList;g=A(a.H);for(f=g.next();!f.done;f=g.next())h=f.value,e.push_back(h);a.j.changeOptions(e);e.delete();a.H=void 0}a.u=!1;k.h=0}})}
   x.initialize=function(){var a=this;return E(function(b){return 1==b.h?D(b,fd(a),2):3!=b.h?D(b,hd(a),3):D(b,jd(a),0)})};function gd(a,b){var c,d;return E(function(e){if(b in a.L)return e.return(a.L[b]);c=a.locateFile(b,"");d=fetch(c).then(function(g){return g.arrayBuffer()});a.L[b]=d;return e.return(d)})}x.overrideFile=function(a,b){this.j?this.j.overrideFile(a,b):this.D[a]=b};x.clearOverriddenFiles=function(){this.D={};this.j&&this.j.clearOverriddenFiles()};
   x.send=function(a,b){var c=this,d,e,g,f,h,k,l,m,r;return E(function(p){switch(p.h){case 1:if(!c.h.inputs)return p.return();d=1E3*(void 0===b||null===b?performance.now():b);return D(p,c.I,2);case 2:return D(p,c.initialize(),3);case 3:e=new c.i.PacketDataList;g=A(Object.keys(a));for(f=g.next();!f.done;f=g.next())if(h=f.value,k=c.h.inputs[h]){a:{var n=a[h];switch(k.type){case "video":var q=c.s[k.stream];q||(q=new Wc(c.i,c.K),c.s[k.stream]=q);0===q.m&&(q.m=q.i.createTexture());if("undefined"!==typeof HTMLVideoElement&&
   n instanceof HTMLVideoElement){var t=n.videoWidth;var w=n.videoHeight}else"undefined"!==typeof HTMLImageElement&&n instanceof HTMLImageElement?(t=n.naturalWidth,w=n.naturalHeight):(t=n.width,w=n.height);w={glName:q.m,width:t,height:w};t=q.h;t.canvas.width=w.width;t.canvas.height=w.height;t.activeTexture(t.TEXTURE0);q.i.bindTexture2d(q.m);t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,n);q.i.bindTexture2d(0);q=w;break a;case "detections":q=c.s[k.stream];q||(q=new Zc(c.i),c.s[k.stream]=q);
   q.data||(q.data=new q.h.DetectionListData);q.data.reset(n.length);for(w=0;w<n.length;++w){t=n[w];var v=q.data,B=v.setBoundingBox,J=w;var I=t.la;var u=new Qc;V(u,1,I.sa);V(u,2,I.ta);V(u,3,I.height);V(u,4,I.width);V(u,5,I.rotation);U(u,6,I.pa);I=u.l();B.call(v,J,I);if(t.ea)for(v=0;v<t.ea.length;++v){u=t.ea[v];B=q.data;J=B.addNormalizedLandmark;I=w;u=Object.assign({},u,{visibility:u.visibility?u.visibility:0});var C=new Lc;V(C,1,u.x);V(C,2,u.y);V(C,3,u.z);u.visibility&&V(C,4,u.visibility);u=C.l();J.call(B,
   I,u)}if(t.ba)for(v=0;v<t.ba.length;++v)B=q.data,J=B.addClassification,I=w,u=t.ba[v],C=new Z,V(C,2,u.qa),u.index&&U(C,1,u.index),u.label&&U(C,3,u.label),u.displayName&&U(C,4,u.displayName),u=C.l(),J.call(B,I,u)}q=q.data;break a;default:q={}}}l=q;m=k.stream;switch(k.type){case "video":e.pushTexture2d(Object.assign({},l,{stream:m,timestamp:d}));break;case "detections":r=l;r.stream=m;r.timestamp=d;e.pushDetectionList(r);break;default:throw Error("Unknown input config type: '"+k.type+"'");}}c.j.send(e);
   return D(p,c.I,4);case 4:e.delete(),p.h=0}})};
   function kd(a,b,c){var d,e,g,f,h,k,l,m,r,p,n,q,t,w;return E(function(v){switch(v.h){case 1:if(!c)return v.return(b);d={};e=0;g=A(Object.keys(c));for(f=g.next();!f.done;f=g.next())h=f.value,k=c[h],"string"!==typeof k&&"texture"===k.type&&void 0!==b[k.stream]&&++e;1<e&&(a.M=!1);l=A(Object.keys(c));f=l.next();case 2:if(f.done){v.h=4;break}m=f.value;r=c[m];if("string"===typeof r)return t=d,w=m,D(v,ld(a,m,b[r]),14);p=b[r.stream];if("detection_list"===r.type){if(p){var B=p.getRectList();for(var J=p.getLandmarksList(),
   I=p.getClassificationsList(),u=[],C=0;C<B.size();++C){var T=Sc(B.get(C)),od=W(T,1),pd=W(T,2),qd=W(T,3),rd=W(T,4),sd=W(T,5,0),za=void 0;za=void 0===za?0:za;T={la:{sa:od,ta:pd,height:qd,width:rd,rotation:sd,pa:Rb(S(T,6),za)},ea:Ob(Pc(J.get(C)),Lc,1).map(Vc),ba:Uc(Kc(I.get(C)))};u.push(T)}B=u}else B=[];d[m]=B;v.h=7;break}if("proto_list"===r.type){if(p){B=Array(p.size());for(J=0;J<p.size();J++)B[J]=p.get(J);p.delete()}else B=[];d[m]=B;v.h=7;break}if(void 0===p){v.h=3;break}if("float_list"===r.type){d[m]=
   p;v.h=7;break}if("proto"===r.type){d[m]=p;v.h=7;break}if("texture"!==r.type)throw Error("Unknown output config type: '"+r.type+"'");n=a.v[m];n||(n=new Wc(a.i,a.K),a.v[m]=n);return D(v,Xc(n,p,a.M),13);case 13:q=v.i,d[m]=q;case 7:r.transform&&d[m]&&(d[m]=r.transform(d[m]));v.h=3;break;case 14:t[w]=v.i;case 3:f=l.next();v.h=2;break;case 4:return v.return(d)}})}
   function ld(a,b,c){var d;return E(function(e){return"number"===typeof c||c instanceof Uint8Array||c instanceof a.i.Uint8BlobList?e.return(c):c instanceof a.i.Texture2dDataOut?(d=a.v[b],d||(d=new Wc(a.i,a.K),a.v[b]=d),e.return(Xc(d,c,a.M))):e.return(void 0)})}
   function id(a,b){for(var c=b.name||"$",d=[].concat(ea(b.wants)),e=new a.i.StringList,g=A(b.wants),f=g.next();!f.done;f=g.next())e.push_back(f.value);g=a.i.PacketListener.implement({onResults:function(h){for(var k={},l=0;l<b.wants.length;++l)k[d[l]]=h.get(l);var m=a.listeners[c];m&&(a.I=kd(a,k,b.outs).then(function(r){r=m(r);for(var p=0;p<b.wants.length;++p){var n=k[d[p]];"object"===typeof n&&n.hasOwnProperty&&n.hasOwnProperty("delete")&&n.delete()}r&&(a.I=r)}))}});a.j.attachMultiListener(e,g);e.delete()}
   x.onResults=function(a,b){this.listeners[b||"$"]=a};Aa("Solution",ed);Aa("OptionType",{BOOL:0,NUMBER:1,ua:2,0:"BOOL",1:"NUMBER",2:"STRING"});function md(a){void 0===a&&(a=0);switch(a){case 1:return"selfie_segmentation_landscape.tflite";default:return"selfie_segmentation.tflite"}}
   function nd(a){var b=this;a=a||{};this.h=new ed({locateFile:a.locateFile,files:function(c){return[{simd:!0,url:"selfie_segmentation_solution_simd_wasm_bin.js"},{simd:!1,url:"selfie_segmentation_solution_wasm_bin.js"},{data:!0,url:md(c.modelSelection)}]},graph:{url:"selfie_segmentation.binarypb"},listeners:[{wants:["segmentation_mask","image_transformed"],outs:{image:{type:"texture",stream:"image_transformed"},segmentationMask:{type:"texture",stream:"segmentation_mask"}}}],inputs:{image:{type:"video",
   stream:"input_frames_gpu"}},options:{useCpuInference:{type:0,graphOptionXref:{calculatorType:"InferenceCalculator",fieldName:"use_cpu_inference"},default:"object"!==typeof window||void 0===window.navigator?!1:"iPad Simulator;iPhone Simulator;iPod Simulator;iPad;iPhone;iPod".split(";").includes(navigator.platform)||navigator.userAgent.includes("Mac")&&"ontouchend"in document},selfieMode:{type:0,graphOptionXref:{calculatorType:"GlScalerCalculator",calculatorIndex:1,fieldName:"flip_horizontal"}},modelSelection:{type:1,
   graphOptionXref:{calculatorType:"ConstantSidePacketCalculator",calculatorName:"ConstantSidePacketCalculatorModelSelection",fieldName:"int_value"},onChange:function(c){var d,e,g;return E(function(f){if(1==f.h)return d=md(c),e="third_party/mediapipe/modules/selfie_segmentation/"+d,D(f,gd(b.h,d),2);g=f.i;b.h.overrideFile(e,g);return f.return(!0)})}}}})}x=nd.prototype;x.close=function(){this.h.close();return Promise.resolve()};x.onResults=function(a){this.h.onResults(a)};
   x.initialize=function(){var a=this;return E(function(b){return D(b,a.h.initialize(),0)})};x.reset=function(){this.h.reset()};x.send=function(a){var b=this;return E(function(c){return D(c,b.h.send(a),0)})};x.setOptions=function(a){this.h.setOptions(a)};Aa("SelfieSegmentation",nd);Aa("VERSION","0.1.1675465747");}).call(this);

   /**
 * Skipped minification because the original files appears to be already minified.
 * Original file: /npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
(function(){/*

    Copyright The Closure Library Authors.
    SPDX-License-Identifier: Apache-2.0
   */
   'use strict';function n(a){var b=0;return function(){return b<a.length?{done:!1,value:a[b++]}:{done:!0}}}var q="function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,e){if(a==Array.prototype||a==Object.prototype)return a;a[b]=e.value;return a};
   function t(a){a=["object"==typeof globalThis&&globalThis,a,"object"==typeof window&&window,"object"==typeof self&&self,"object"==typeof global&&global];for(var b=0;b<a.length;++b){var e=a[b];if(e&&e.Math==Math)return e}throw Error("Cannot find global object");}var u=t(this);function v(a,b){if(b)a:{var e=u;a=a.split(".");for(var f=0;f<a.length-1;f++){var h=a[f];if(!(h in e))break a;e=e[h]}a=a[a.length-1];f=e[a];b=b(f);b!=f&&null!=b&&q(e,a,{configurable:!0,writable:!0,value:b})}}
   v("Symbol",function(a){function b(l){if(this instanceof b)throw new TypeError("Symbol is not a constructor");return new e(f+(l||"")+"_"+h++,l)}function e(l,c){this.g=l;q(this,"description",{configurable:!0,writable:!0,value:c})}if(a)return a;e.prototype.toString=function(){return this.g};var f="jscomp_symbol_"+(1E9*Math.random()>>>0)+"_",h=0;return b});
   v("Symbol.iterator",function(a){if(a)return a;a=Symbol("Symbol.iterator");for(var b="Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "),e=0;e<b.length;e++){var f=u[b[e]];"function"===typeof f&&"function"!=typeof f.prototype[a]&&q(f.prototype,a,{configurable:!0,writable:!0,value:function(){return w(n(this))}})}return a});function w(a){a={next:a};a[Symbol.iterator]=function(){return this};return a}
   function x(a){var b="undefined"!=typeof Symbol&&Symbol.iterator&&a[Symbol.iterator];return b?b.call(a):{next:n(a)}}function y(){this.i=!1;this.g=null;this.o=void 0;this.j=1;this.m=0;this.h=null}function z(a){if(a.i)throw new TypeError("Generator is already running");a.i=!0}y.prototype.l=function(a){this.o=a};function A(a,b){a.h={F:b,G:!0};a.j=a.m}y.prototype.return=function(a){this.h={return:a};this.j=this.m};function B(a){this.g=new y;this.h=a}
   function C(a,b){z(a.g);var e=a.g.g;if(e)return D(a,"return"in e?e["return"]:function(f){return{value:f,done:!0}},b,a.g.return);a.g.return(b);return H(a)}function D(a,b,e,f){try{var h=b.call(a.g.g,e);if(!(h instanceof Object))throw new TypeError("Iterator result "+h+" is not an object");if(!h.done)return a.g.i=!1,h;var l=h.value}catch(c){return a.g.g=null,A(a.g,c),H(a)}a.g.g=null;f.call(a.g,l);return H(a)}
   function H(a){for(;a.g.j;)try{var b=a.h(a.g);if(b)return a.g.i=!1,{value:b.value,done:!1}}catch(e){a.g.o=void 0,A(a.g,e)}a.g.i=!1;if(a.g.h){b=a.g.h;a.g.h=null;if(b.G)throw b.F;return{value:b.return,done:!0}}return{value:void 0,done:!0}}
   function I(a){this.next=function(b){z(a.g);a.g.g?b=D(a,a.g.g.next,b,a.g.l):(a.g.l(b),b=H(a));return b};this.throw=function(b){z(a.g);a.g.g?b=D(a,a.g.g["throw"],b,a.g.l):(A(a.g,b),b=H(a));return b};this.return=function(b){return C(a,b)};this[Symbol.iterator]=function(){return this}}function J(a){function b(f){return a.next(f)}function e(f){return a.throw(f)}return new Promise(function(f,h){function l(c){c.done?f(c.value):Promise.resolve(c.value).then(b,e).then(l,h)}l(a.next())})}
   v("Promise",function(a){function b(c){this.h=0;this.i=void 0;this.g=[];this.o=!1;var d=this.j();try{c(d.resolve,d.reject)}catch(g){d.reject(g)}}function e(){this.g=null}function f(c){return c instanceof b?c:new b(function(d){d(c)})}if(a)return a;e.prototype.h=function(c){if(null==this.g){this.g=[];var d=this;this.i(function(){d.l()})}this.g.push(c)};var h=u.setTimeout;e.prototype.i=function(c){h(c,0)};e.prototype.l=function(){for(;this.g&&this.g.length;){var c=this.g;this.g=[];for(var d=0;d<c.length;++d){var g=
   c[d];c[d]=null;try{g()}catch(k){this.j(k)}}}this.g=null};e.prototype.j=function(c){this.i(function(){throw c;})};b.prototype.j=function(){function c(k){return function(m){g||(g=!0,k.call(d,m))}}var d=this,g=!1;return{resolve:c(this.A),reject:c(this.l)}};b.prototype.A=function(c){if(c===this)this.l(new TypeError("A Promise cannot resolve to itself"));else if(c instanceof b)this.C(c);else{a:switch(typeof c){case "object":var d=null!=c;break a;case "function":d=!0;break a;default:d=!1}d?this.v(c):this.m(c)}};
   b.prototype.v=function(c){var d=void 0;try{d=c.then}catch(g){this.l(g);return}"function"==typeof d?this.D(d,c):this.m(c)};b.prototype.l=function(c){this.u(2,c)};b.prototype.m=function(c){this.u(1,c)};b.prototype.u=function(c,d){if(0!=this.h)throw Error("Cannot settle("+c+", "+d+"): Promise already settled in state"+this.h);this.h=c;this.i=d;2===this.h&&this.B();this.H()};b.prototype.B=function(){var c=this;h(function(){if(c.I()){var d=u.console;"undefined"!==typeof d&&d.error(c.i)}},1)};b.prototype.I=
   function(){if(this.o)return!1;var c=u.CustomEvent,d=u.Event,g=u.dispatchEvent;if("undefined"===typeof g)return!0;"function"===typeof c?c=new c("unhandledrejection",{cancelable:!0}):"function"===typeof d?c=new d("unhandledrejection",{cancelable:!0}):(c=u.document.createEvent("CustomEvent"),c.initCustomEvent("unhandledrejection",!1,!0,c));c.promise=this;c.reason=this.i;return g(c)};b.prototype.H=function(){if(null!=this.g){for(var c=0;c<this.g.length;++c)l.h(this.g[c]);this.g=null}};var l=new e;b.prototype.C=
   function(c){var d=this.j();c.s(d.resolve,d.reject)};b.prototype.D=function(c,d){var g=this.j();try{c.call(d,g.resolve,g.reject)}catch(k){g.reject(k)}};b.prototype.then=function(c,d){function g(p,r){return"function"==typeof p?function(E){try{k(p(E))}catch(F){m(F)}}:r}var k,m,G=new b(function(p,r){k=p;m=r});this.s(g(c,k),g(d,m));return G};b.prototype.catch=function(c){return this.then(void 0,c)};b.prototype.s=function(c,d){function g(){switch(k.h){case 1:c(k.i);break;case 2:d(k.i);break;default:throw Error("Unexpected state: "+
   k.h);}}var k=this;null==this.g?l.h(g):this.g.push(g);this.o=!0};b.resolve=f;b.reject=function(c){return new b(function(d,g){g(c)})};b.race=function(c){return new b(function(d,g){for(var k=x(c),m=k.next();!m.done;m=k.next())f(m.value).s(d,g)})};b.all=function(c){var d=x(c),g=d.next();return g.done?f([]):new b(function(k,m){function G(E){return function(F){p[E]=F;r--;0==r&&k(p)}}var p=[],r=0;do p.push(void 0),r++,f(g.value).s(G(p.length-1),m),g=d.next();while(!g.done)})};return b});
   var K="function"==typeof Object.assign?Object.assign:function(a,b){for(var e=1;e<arguments.length;e++){var f=arguments[e];if(f)for(var h in f)Object.prototype.hasOwnProperty.call(f,h)&&(a[h]=f[h])}return a};v("Object.assign",function(a){return a||K});var L=this||self;var M={facingMode:"user",width:640,height:480};function N(a,b){this.video=a;this.i=0;this.h=Object.assign(Object.assign({},M),b)}N.prototype.stop=function(){var a=this,b,e,f,h;return J(new I(new B(function(l){if(a.g){b=a.g.getTracks();e=x(b);for(f=e.next();!f.done;f=e.next())h=f.value,h.stop();a.g=void 0}l.j=0})))};
   N.prototype.start=function(){var a=this,b;return J(new I(new B(function(e){navigator.mediaDevices&&navigator.mediaDevices.getUserMedia||alert("No navigator.mediaDevices.getUserMedia exists.");b=a.h;return e.return(navigator.mediaDevices.getUserMedia({video:{facingMode:b.facingMode,width:b.width,height:b.height}}).then(function(f){O(a,f)}).catch(function(f){var h="Failed to acquire camera feed: "+f;console.error(h);alert(h);throw f;}))})))};
   function P(a){window.requestAnimationFrame(function(){Q(a)})}function O(a,b){a.g=b;a.video.srcObject=b;a.video.onloadedmetadata=function(){a.video.play();P(a)}}function Q(a){var b=null;a.video.paused||a.video.currentTime===a.i||(a.i=a.video.currentTime,b=a.h.onFrame());b?b.then(function(){P(a)}):P(a)}var R=["Camera"],S=L;R[0]in S||"undefined"==typeof S.execScript||S.execScript("var "+R[0]);
   for(var T;R.length&&(T=R.shift());)R.length||void 0===N?S[T]&&S[T]!==Object.prototype[T]?S=S[T]:S=S[T]={}:S[T]=N;}).call(this);