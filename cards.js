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

  cards.forEach(function (card) {
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
