/* Campo de puntos 3D que reacciona al cursor.
   WebGL plano, sin librerias: nada que descargar, nada que se caiga.
   Tecnica estandar de creative coding: nube de puntos con proyeccion en
   perspectiva hecha en el vertex shader y una fuerza radial en el cursor. */
(function () {
  'use strict';

  var canvas = document.getElementById('field');
  if (!canvas) return;

  var gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: false })
        || canvas.getContext('experimental-webgl', { alpha: true, antialias: true, depth: false });
  if (!gl) return; // sin WebGL la pagina sigue perfecta, solo sin fondo

  var VERT = [
    'attribute vec3 aPos;',
    'attribute float aSeed;',
    'uniform float uTime;',
    'uniform vec2  uMouse;',
    'uniform float uAspect;',
    'uniform float uDpr;',
    'varying float vDepth;',
    'varying float vGlow;',
    'void main(){',
    '  vec3 p = aPos;',
    // deriva propia de cada punto, para que nada lata al unisono
    '  p.x += cos(uTime*0.18 + aSeed*6.2831)*0.08;',
    '  p.y += sin(uTime*0.22 + aSeed*3.1416)*0.08;',
    // rotacion lenta alrededor del eje Y
    '  float a = uTime*0.045;',
    '  float c = cos(a), s = sin(a);',
    '  p = vec3(p.x*c + p.z*s, p.y, -p.x*s + p.z*c);',
    // proyeccion en perspectiva a mano (sin matrices)
    '  float zc = p.z + 4.6;',
    '  vec2 clip = vec2((p.x*3.4)/(zc*uAspect), (p.y*3.4)/zc);',
    // parallaje: lo cercano se desplaza mas que lo lejano, que es lo que lee como 3D
    '  clip -= uMouse * (0.35/zc);',
    // el cursor empuja hacia fuera y enciende lo que tiene cerca
    '  vec2 d = clip - uMouse;',
    '  float dist = length(vec2(d.x*uAspect, d.y));',
    '  float infl = exp(-dist*dist*3.2);',
    '  clip += normalize(d + vec2(0.0001)) * infl * 0.14;',
    '  vGlow = infl;',
    '  vDepth = clamp(1.0 - (zc - 2.0)/5.2, 0.0, 1.0);',
    '  gl_Position = vec4(clip, 0.0, 1.0);',
    '  gl_PointSize = max(1.0, (11.0/zc) * uDpr * (1.0 + infl*1.7));',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'varying float vDepth;',
    'varying float vGlow;',
    'void main(){',
    '  vec2 uv = gl_PointCoord - vec2(0.5);',
    '  float r = length(uv);',
    '  if (r > 0.5) discard;',
    '  float soft = smoothstep(0.5, 0.06, r);',
    '  vec3 base = vec3(0.58, 0.65, 0.74);',
    '  vec3 hot  = vec3(0.62, 0.91, 1.00);',
    '  vec3 col  = mix(base, hot, clamp(vGlow*1.4, 0.0, 1.0));',
    '  float a = soft * (0.12 + vDepth*0.40 + vGlow*0.95);',
    '  gl_FragColor = vec4(col, a);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('shader:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('link:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  // --- geometria: nube de puntos ---
  var isSmall = window.innerWidth < 760;
  var COUNT = isSmall ? 1400 : 2800;

  var pos = new Float32Array(COUNT * 3);
  var seed = new Float32Array(COUNT);
  for (var i = 0; i < COUNT; i++) {
    pos[i * 3 + 0] = (Math.random() * 2 - 1) * 2.6;
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * 1.7;
    pos[i * 3 + 2] = (Math.random() * 2 - 1) * 2.6;
    seed[i] = Math.random();
  }

  var posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

  var seedBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
  gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);
  var aSeed = gl.getAttribLocation(prog, 'aSeed');
  gl.enableVertexAttribArray(aSeed);
  gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 0, 0);

  var uTime   = gl.getUniformLocation(prog, 'uTime');
  var uMouse  = gl.getUniformLocation(prog, 'uMouse');
  var uAspect = gl.getUniformLocation(prog, 'uAspect');
  var uDpr    = gl.getUniformLocation(prog, 'uDpr');

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // aditivo: los puntos se suman como luz

  var dpr = 1, aspect = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    aspect = w / h;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  // --- cursor ---
  var tx = 0, ty = 0, mx = 0, my = 0; // centro: con parallaje, arrancar fuera de pantalla daria un salto

  function point(cx, cy) {
    tx = (cx / window.innerWidth) * 2 - 1;
    ty = -((cy / window.innerHeight) * 2 - 1);
  }
  window.addEventListener('mousemove', function (e) { point(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches[0]) point(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('mouseleave', function () { tx = 0; ty = 0; }); // al salir, el campo vuelve al reposo

  // --- bucle ---
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var start = performance.now();
  var running = true;

  function draw(t) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mx, my);
    gl.uniform1f(uAspect, aspect);
    gl.uniform1f(uDpr, dpr);
    gl.drawArrays(gl.POINTS, 0, COUNT);
  }

  if (reduced) {
    draw(0); // un fotograma quieto y nada mas
    window.addEventListener('resize', function () { draw(0); });
    return;
  }

  function frame(now) {
    if (!running) return;
    mx += (tx - mx) * 0.06; // el cursor arrastra con inercia
    my += (ty - my) * 0.06;
    draw((now - start) / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  var pausedAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      running = false;
      pausedAt = performance.now();
    } else if (!running) {
      running = true;
      start += performance.now() - pausedAt; // retoma donde lo dejo, sin tirones
      requestAnimationFrame(frame);
    }
  });
})();
