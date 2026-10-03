(function () {
  'use strict';

  var demo = document.querySelector('[data-art-demo]');
  var thumb = function (id) { return 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg'; };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ===== 상단 흐르는 썸네일 (끊김 없는 반복을 위해 2번 출력) ===== */
  var showcase = document.getElementById('showcase');
  if (showcase) {
    var one = SHOWCASE_VIDEOS.map(function (id) {
      return '<div class="ad-hero-showcase-item" style="background-image:url(' + thumb(id) + ')"></div>';
    }).join('');
    showcase.innerHTML = one + one;
  }

  /* ===== 포트폴리오 위젯: 한 장씩 / 자유 배치 ===== */
  var pf = document.getElementById('portfolio');
  if (pf) {
    var mosaic = SAMPLE_GROUPS.map(function (g, i) {
      return '<article class="pf-mosaic-item" data-open="' + i + '" tabindex="0">'
        + '<span class="pf-mosaic-num">0' + (i + 1) + '</span>'
        + '<img class="pf-mosaic-visual" src="https://img.youtube.com/vi/' + g.videos[0] + '/maxresdefault.jpg" data-vid="' + g.videos[0] + '" alt="' + esc(g.title) + '" loading="lazy">'
        + '<div class="pf-mosaic-overlay"><span class="pf-mosaic-cat">SAMPLE</span><span class="pf-mosaic-title">' + esc(g.title) + '</span></div>'
        + '</article>';
    }).join('');
    pf.innerHTML = '<div class="pf-mosaic" data-pf-mosaic>' + mosaic + '</div>';
    /* 고해상도 썸네일이 없는 영상은 기본 썸네일로 대체 */
    pf.querySelectorAll('.pf-mosaic-visual').forEach(function (img) {
      img.addEventListener('error', function () {
        if (img.dataset.fb) return;
        img.dataset.fb = '1';
        img.src = thumb(img.dataset.vid);
      });
      img.addEventListener('load', function () {
        if (img.naturalWidth <= 120) { img.dataset.fb = '1'; img.src = thumb(img.dataset.vid); }
      });
    });
    setTimeout(function () {
      pf.querySelectorAll('.pf-mosaic-item').forEach(function (it) { it.classList.add('is-in'); });
    }, 40);

    /* 카드 클릭 → 영상 모달 */
    var modal = document.getElementById('modal');
    var openModal = function (i) {
      var g = SAMPLE_GROUPS[i];
      document.getElementById('modal-title').textContent = g.title;
      document.getElementById('modal-videos').innerHTML = g.videos.map(function (id) {
        return '<iframe src="https://www.youtube.com/embed/' + id + '" title="' + esc(g.title) + '" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>';
      }).join('');
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    var closeModal = function () {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.getElementById('modal-videos').innerHTML = '';
      document.body.style.overflow = '';
    };
    pf.addEventListener('click', function (e) {
      var t = e.target.closest('[data-open]');
      if (t) openModal(parseInt(t.getAttribute('data-open'), 10));
    });
    pf.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var t = e.target.closest('[data-open]');
      if (t) openModal(parseInt(t.getAttribute('data-open'), 10));
    });
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    modal.querySelector('.ad-modal-close').addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  /* ===== 참고사항 아코디언 ===== */
  document.querySelectorAll('[data-demo-faq-item]').forEach(function (item) {
    var btn = item.querySelector('[data-demo-faq-toggle]');
    btn.addEventListener('click', function () {
      var open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ===== 등장 효과 / 커서 글로우 ===== */
  setTimeout(function () {
    demo.querySelectorAll('[data-ad-animate]').forEach(function (el) { el.classList.add('is-in'); });
  }, 80);
  var reveals = demo.querySelectorAll('[data-ad-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }
  var glow = demo.querySelector('.ad-cursor-glow');
  if (glow && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    demo.addEventListener('mousemove', function (e) {
      var r = demo.getBoundingClientRect();
      glow.style.left = (e.clientX - r.left) + 'px';
      glow.style.top = (e.clientY - r.top) + 'px';
      demo.classList.add('is-glowing');
    });
    demo.addEventListener('mouseleave', function () { demo.classList.remove('is-glowing'); });
  }

  /* ===== 아트머그 iframe 임베드용: 부모 페이지에 높이 전달 ===== */
  function sendHeight() {
    var h = Math.ceil(document.documentElement.scrollHeight);
    window.parent.postMessage({ type: 'iframeResize', height: h }, '*');
  }
  window.addEventListener('load', sendHeight);
  window.addEventListener('resize', sendHeight);
  if (window.ResizeObserver) new ResizeObserver(sendHeight).observe(document.body);
  setInterval(sendHeight, 700);
})();
