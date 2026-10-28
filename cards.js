/* Tarjetas de reel.
   - Antes del clic: bucle infinito, siempre en silencio (es la unica forma de que
     un navegador deje reproducir solo).
   - Al hacer clic: suena ESA, y se callan las demas. Nunca dos audios a la vez.
   - Los videos se descargan solo cuando entran en pantalla: 23 MB no se cargan de golpe. */
(function () {
  'use strict';

  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  if (!cards.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = null; // la tarjeta que tiene el sonido

  function videoOf(card) { return card.querySelector('.card-video'); }
  function hintOf(card) { return card.querySelector('.card-hint'); }

  function load(card) {
    var v = videoOf(card);
    if (!v || v.getAttribute('src')) return v;
    var src = v.getAttribute('data-src');
    if (src) v.setAttribute('src', src);
    return v;
  }

  function play(card) {
    var v = load(card);
    if (!v) return;
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* el navegador puede negarse; el poster queda */ });
  }

  function silence(card) {
    if (!card) return;
    var v = videoOf(card);
    if (v) v.muted = true;
    card.classList.remove('sound-on');
    card.setAttribute('aria-pressed', 'false');
    var h = hintOf(card);
    if (h) h.textContent = 'Click for sound';
    if (current === card) current = null;
  }

  function voice(card) {
    if (current && current !== card) silence(current);
    var v = load(card);
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    play(card);
    card.classList.add('sound-on');
    card.setAttribute('aria-pressed', 'true');
    var h = hintOf(card);
    if (h) h.textContent = 'Sound on — click to mute';
    current = card;
  }

  /* ---- El campo de puntos toma el color del reel que miras ----
     Se dibuja el fotograma actual en un lienzo de 24x24 y se promedia dando
     peso a lo saturado y con algo de luz: si no, el negro del fondo manda
     siempre y todo sale gris. Mismo origen, asi que el lienzo no se contamina. */
  var sampler = document.createElement('canvas');
  sampler.width = 24; sampler.height = 24;
  var sctx = sampler.getContext('2d', { willReadFrequently: true });
  var hovered = null;
  var tinting = false;

  function lighten(c, t) { return c + (1 - c) * t; }

  function palette(v) {
    if (!v || v.readyState < 2 || !v.videoWidth) return null;
    var d;
    try {
      sctx.drawImage(v, 0, 0, 24, 24);
      d = sctx.getImageData(0, 0, 24, 24).data;
    } catch (e) { return null; }
    var r = 0, g = 0, b = 0, w = 0;
    for (var i = 0; i < d.length; i += 4) {
      var R = d[i] / 255, G = d[i + 1] / 255, B = d[i + 2] / 255;
      var mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      var k = 0.08 + (mx - mn) * 2.2 * (mx > 0.10 ? 1 : 0.15);
      r += R * k; g += G * k; b += B * k; w += k;
    }
    if (!w) return null;
    r /= w; g /= w; b /= w;
    var peak = Math.max(r, g, b);
    if (peak < 0.02) return null;
    r /= peak; g /= peak; b /= peak; // sube el tono para que no quede apagado
    return {
      hot:  [lighten(r, .04), lighten(g, .04), lighten(b, .04)],
      base: [lighten(r, .26), lighten(g, .26), lighten(b, .26)]
    };
  }

  // El cursor manda; si no hay cursor encima (movil), manda la que suena.
  function source() { return hovered || current; }

  setInterval(function () {
    if (!window.fieldTint) return;
    var card = source();
    if (!card) {
      if (tinting) { window.fieldTint.reset(); tinting = false; }
      return;
    }
    var p = palette(videoOf(card));
    if (p) { window.fieldTint.set(p.base, p.hot); tinting = true; }
  }, 240);

  cards.forEach(function (card) {
    card.addEventListener('mouseenter', function () { hovered = card; });
    card.addEventListener('mouseleave', function () { if (hovered === card) hovered = null; });
    card.addEventListener('focus', function () { hovered = card; });
    card.addEventListener('blur', function () { if (hovered === card) hovered = null; });
    card.addEventListener('click', function () {
      if (card.classList.contains('sound-on')) silence(card);
      else voice(card);
    });
  });

  // Esc calla lo que este sonando
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current) silence(current);
  });

  // Solo reproduce lo que se ve. Lo que sale de pantalla se pausa y se calla.
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var card = entry.target;
        var v = videoOf(card);
        if (entry.isIntersecting) {
          play(card);
        } else if (v) {
          v.pause();
          if (card === current) silence(card);
        }
      });
    }, { threshold: 0.25, rootMargin: '150px 0px' });
    cards.forEach(function (card) { io.observe(card); });
  } else if (!reduced) {
    cards.forEach(play); // sin IntersectionObserver, al menos que se vean moviendose
  }
  // Con reduced-motion no se reproduce nada solo: queda el poster y suena al hacer clic.
})();
