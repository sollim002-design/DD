/* 신청 양식 섹션: 탭 전환 + 직접 입력/선택 + 입력한 내용만 복사 */
(function () {
  'use strict';
  var mount = document.getElementById('apply-forms');
  if (!mount || typeof APPLY_FORMS === 'undefined') return;

  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---- 원문 → 구조 ---- */
  function parseForm(raw) {
    var sections = [], cur = null;
    raw.split('\n').forEach(function (line) {
      var h = line.match(/^(\d+)\.\s+(.*)$/);
      if (h) { cur = { num: h[1], title: h[2], items: [] }; sections.push(cur); return; }
      if (!cur) return;
      var t = line.replace(/^\*\s*/, '').trim();
      if (!t) return;
      var colon = t.indexOf(':');
      if (t.indexOf(' / ') !== -1) {
        if (colon !== -1 && colon < t.length - 1) {
          cur.items.push({ type: 'chips', label: t.slice(0, colon).trim(), opts: t.slice(colon + 1).split(' / ').map(function (o) { return o.trim(); }) });
        } else {
          cur.items.push({ type: 'chips', label: '', opts: t.replace(/:$/, '').split(' / ').map(function (o) { return o.trim(); }) });
        }
      } else if (colon === t.length - 1) {
        cur.items.push({ type: 'field', label: t.slice(0, -1).trim(), hint: '' });
      } else if (colon !== -1 && /○/.test(t)) {
        cur.items.push({ type: 'field', label: t.slice(0, colon).trim(), hint: t.slice(colon + 1).trim() });
      } else {
        cur.items.push({ type: 'note', text: t });
      }
    });
    sections.forEach(function (s) {
      var interactive = s.items.filter(function (i) { return i.type !== 'note'; });
      /* 입력 요소가 하나도 없는 항목(요청 사항 등)은 자유 입력칸을 붙임 */
      if (!interactive.length) s.items.push({ type: 'area', label: '' });
      /* 신청 항목·준비 자료는 여러 개 선택 가능 */
      var multi = /신청 항목|준비 자료/.test(s.title);
      var first = true;
      s.items.forEach(function (i) {
        if (i.type === 'chips') {
          i.multi = multi && !i.label;
          if (!i.label) i.label = first ? s.title : i.opts.join(' / ');
        }
        if (i.type !== 'note') first = false;
      });
    });
    return sections;
  }

  function renderForm(sections) {
    return sections.map(function (s, si) {
      var body = s.items.map(function (it, ii) {
        var id = si + '-' + ii;
        if (it.type === 'note') return '<p class="ap-note">' + esc(it.text) + '</p>';
        if (it.type === 'field') {
          return '<label class="ap-row ap-field"><span class="ap-label">' + esc(it.label) + '</span>'
            + '<input type="text" class="ap-input" data-id="' + id + '" placeholder="' + esc(it.hint) + '"></label>';
        }
        if (it.type === 'area') {
          return '<div class="ap-row ap-areawrap"><textarea class="ap-input ap-area" rows="3" data-id="' + id + '" placeholder="내용을 적어주세요. 정해지지 않은 부분은 비워두셔도 됩니다."></textarea></div>';
        }
        var showLabel = s.items.filter(function (x) { return x.type !== 'note'; }).length > 1 && it.label && it.label !== s.title;
        return '<div class="ap-row">' + (showLabel && it.opts.join(' / ') !== it.label ? '<span class="ap-label">' + esc(it.label) + '</span>' : '')
          + '<span class="ap-chips" data-id="' + id + '" data-multi="' + (it.multi ? '1' : '0') + '">'
          + it.opts.map(function (o) { return '<button type="button" class="ap-chip" data-val="' + esc(o) + '">' + esc(o) + '</button>'; }).join('')
          + '</span></div>';
      }).join('');
      return '<div class="ap-block"><div class="ap-block-head"><span class="ap-block-num">' + esc(s.num) + '</span><span class="ap-block-title">' + esc(s.title) + '</span></div>' + body + '</div>';
    }).join('');
  }

  /* ---- 화면 구성 ---- */
  var parsed = APPLY_FORMS.map(function (f) { return parseForm(f.raw); });
  var tabs = APPLY_FORMS.map(function (f, i) {
    return '<button type="button" class="pf-mode' + (i === 0 ? ' on' : '') + '" data-ap-tab="' + i + '">' + esc(f.tab) + '</button>';
  }).join('');
  var panels = APPLY_FORMS.map(function (f, i) {
    return '<div class="ap-panel' + (i === 0 ? ' on' : '') + '" data-ap-panel="' + i + '">'
      + '<div class="ap-card"><div class="ap-card-head"><h3>' + esc(f.title) + '</h3>'
      + '<div class="ap-actions"><button type="button" class="ap-reset" data-ap-reset="' + i + '">초기화</button>'
      + '<button type="button" class="ap-copy" data-ap-copy="' + i + '">작성한 내용 복사하기</button></div></div>'
      + '<div class="ap-card-body">' + renderForm(parsed[i]) + '</div>'
      + '<div class="ap-hint">입력하지 않거나 선택하지 않은 항목은 복사할 때 자동으로 빠집니다.</div></div></div>';
  }).join('');
  mount.innerHTML = '<div class="pf-mode-tabs">' + tabs + '</div>' + panels;

  /* ---- 입력한 내용만 모아 텍스트로 ---- */
  function buildText(i) {
    var panel = mount.querySelector('[data-ap-panel="' + i + '"]');
    var lines = ['[' + APPLY_FORMS[i].title + ']'];
    parsed[i].forEach(function (s, si) {
      var out = [];
      s.items.forEach(function (it, ii) {
        var id = si + '-' + ii;
        if (it.type === 'field' || it.type === 'area') {
          var el = panel.querySelector('[data-id="' + id + '"]');
          var v = el ? el.value.trim() : '';
          if (v) out.push(it.type === 'area' ? v : it.label + ': ' + v);
        } else if (it.type === 'chips') {
          var sel = [].map.call(panel.querySelectorAll('[data-id="' + id + '"] .ap-chip.on'), function (b) { return b.getAttribute('data-val'); });
          if (sel.length) out.push(it.label + ': ' + sel.join(', '));
        }
      });
      if (out.length) lines.push('', s.num + '. ' + s.title, out.join('\n'));
    });
    if (lines.length === 1) lines.push('', '(작성한 항목이 없습니다)');
    return lines.join('\n');
  }

  /* ---- 이벤트 ---- */
  mount.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-ap-tab]');
    if (tab) {
      var n = tab.getAttribute('data-ap-tab');
      mount.querySelectorAll('[data-ap-tab]').forEach(function (b) { b.classList.toggle('on', b === tab); });
      mount.querySelectorAll('[data-ap-panel]').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-ap-panel') === n); });
      return;
    }
    var chip = e.target.closest('.ap-chip');
    if (chip) {
      var group = chip.parentNode;
      var wasOn = chip.classList.contains('on');
      if (group.getAttribute('data-multi') !== '1') {
        group.querySelectorAll('.ap-chip').forEach(function (c) { c.classList.remove('on'); });
        if (!wasOn) chip.classList.add('on');
      } else {
        chip.classList.toggle('on');
      }
      return;
    }
    var reset = e.target.closest('[data-ap-reset]');
    if (reset) {
      var panel = mount.querySelector('[data-ap-panel="' + reset.getAttribute('data-ap-reset') + '"]');
      panel.querySelectorAll('.ap-input').forEach(function (el) { el.value = ''; });
      panel.querySelectorAll('.ap-chip.on').forEach(function (c) { c.classList.remove('on'); });
      return;
    }
    var copy = e.target.closest('[data-ap-copy]');
    if (copy) {
      var text = buildText(parseInt(copy.getAttribute('data-ap-copy'), 10));
      var done = function () {
        var old = copy.textContent;
        copy.textContent = '복사되었습니다';
        copy.classList.add('done');
        setTimeout(function () { copy.textContent = old; copy.classList.remove('done'); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
      else {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (err) {}
        document.body.removeChild(ta); done();
      }
    }
  });
})();
