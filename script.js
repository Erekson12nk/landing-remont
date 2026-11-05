/* «Квадрат» — интерактив лендинга (vanilla JS, без зависимостей) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var formatter = new Intl.NumberFormat('ru-RU');
  var rub = function (n) { return formatter.format(Math.round(n)) + ' ₽'; };

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initNav();
    initReveal();
    initCalculator();
    initBeforeAfter();
    initFaq();
    initLeadForm();
    var year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  });

  /* ---------- Header shadow on scroll ---------- */
  function initHeader() {
    var header = document.querySelector('.header');
    if (!header) return;
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Mobile navigation ---------- */
  function initNav() {
    var burger = document.querySelector('.burger');
    var nav = document.getElementById('nav');
    if (!burger || !nav) return;

    var setOpen = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      nav.classList.toggle('is-open', open);
    };

    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        burger.focus();
      }
    });
    window.matchMedia('(min-width: 960px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    // Небольшая ступенчатая задержка для элементов в одной сетке
    document.querySelectorAll('.services, .timeline, .works, .plans').forEach(function (group) {
      group.querySelectorAll('.reveal').forEach(function (el, i) {
        el.style.setProperty('--delay', (i % 4) * 0.08 + 's');
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Calculator ---------- */
  var calcState = { total: 0, summary: '' };

  function initCalculator() {
    var form = document.getElementById('calc-form');
    if (!form) return;

    var range = document.getElementById('area-range');
    var number = document.getElementById('area-input');
    var totalEl = document.getElementById('calc-total');
    var baseEl = document.getElementById('calc-base');
    var extrasEl = document.getElementById('calc-extras');
    var termEl = document.getElementById('calc-term');

    var TYPES = {
      cosmetic: { name: 'косметический', rate: 6500, weeks: 2, perWeek: 30 },
      capital: { name: 'капитальный', rate: 12000, weeks: 4, perWeek: 15 },
      design: { name: 'дизайнерский', rate: 19000, weeks: 6, perWeek: 12 }
    };
    var EXTRAS = {
      demolition: { name: 'демонтаж', perM2: 900 },
      floor: { name: 'тёплый пол', fixed: 48000 },
      project: { name: 'дизайн-проект', perM2: 1500 },
      materials: { name: 'закупка чистовых материалов', percent: 0.07 },
      cleaning: { name: 'клининг', perM2: 180 }
    };
    var MIN = 20, MAX = 200;
    var shown = 0, raf = null;

    var clamp = function (v) { return Math.min(MAX, Math.max(MIN, v)); };

    var setFill = function (v) {
      range.style.setProperty('--fill', ((v - MIN) / (MAX - MIN)) * 100 + '%');
    };

    var animateTotal = function (to) {
      if (raf) cancelAnimationFrame(raf);
      if (reduceMotion.matches) { shown = to; totalEl.textContent = rub(to); return; }
      var from = shown, start = null, dur = 450;
      var step = function (t) {
        if (!start) start = t;
        var p = Math.min(1, (t - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        shown = from + (to - from) * eased;
        totalEl.textContent = rub(Math.round(shown / 100) * 100);
        if (p < 1) raf = requestAnimationFrame(step);
        else { shown = to; totalEl.textContent = rub(to); }
      };
      raf = requestAnimationFrame(step);
    };

    var weeksWord = function (n) {
      var m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return 'неделя';
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'недели';
      return 'недель';
    };

    var calculate = function () {
      var area = clamp(parseInt(range.value, 10) || MIN);
      var typeKey = (form.querySelector('input[name="type"]:checked') || {}).value || 'capital';
      var type = TYPES[typeKey];
      var base = area * type.rate;
      var extras = 0;
      var chosen = [];

      form.querySelectorAll('input[name="extra"]:checked').forEach(function (cb) {
        var ex = EXTRAS[cb.value];
        if (!ex) return;
        if (ex.perM2) extras += ex.perM2 * area;
        if (ex.fixed) extras += ex.fixed;
        if (ex.percent) extras += base * ex.percent;
        chosen.push(ex.name);
      });

      var total = Math.round((base + extras) / 1000) * 1000;
      var weeks = Math.round(type.weeks + area / type.perWeek);

      baseEl.textContent = rub(base);
      extrasEl.textContent = extras ? rub(extras) : '—';
      termEl.textContent = '≈ ' + weeks + ' ' + weeksWord(weeks);
      animateTotal(total);

      calcState.total = total;
      calcState.summary = 'Расчёт: ' + area + ' м², ' + type.name + ' ремонт' +
        (chosen.length ? ' + ' + chosen.join(', ') : '') +
        ' — около ' + rub(total).replace(' ', ' ') + ', срок ≈ ' + weeks + ' ' + weeksWord(weeks) + '.';
    };

    range.addEventListener('input', function () {
      number.value = range.value;
      setFill(+range.value);
      calculate();
    });
    number.addEventListener('input', function () {
      var v = parseInt(number.value, 10);
      if (isNaN(v)) return;
      range.value = clamp(v);
      setFill(+range.value);
      calculate();
    });
    number.addEventListener('blur', function () {
      var v = clamp(parseInt(number.value, 10) || MIN);
      number.value = v;
      range.value = v;
      setFill(v);
      calculate();
    });
    form.addEventListener('change', calculate);
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    var sendBtn = document.getElementById('calc-send');
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        var comment = document.getElementById('f-comment');
        if (comment) comment.value = calcState.summary;
        goToLead();
      });
    }

    setFill(+range.value);
    calculate();
  }

  function goToLead() {
    var lead = document.getElementById('lead');
    var name = document.getElementById('f-name');
    if (!lead) return;
    lead.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    if (name) setTimeout(function () { name.focus({ preventScroll: true }); }, reduceMotion.matches ? 0 : 600);
  }

  /* ---------- Before / after sliders ---------- */
  function initBeforeAfter() {
    document.querySelectorAll('.ba').forEach(function (ba) {
      var input = ba.querySelector('.ba__range');
      if (!input) return;
      var update = function () { ba.style.setProperty('--pos', input.value + '%'); };
      input.addEventListener('input', update);
      update();
    });

    // Пакеты: подставляем выбранный тариф в комментарий
    document.querySelectorAll('[data-plan]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var comment = document.getElementById('f-comment');
        if (comment && !comment.value.trim()) {
          comment.value = 'Интересует пакет «' + link.getAttribute('data-plan') + '».';
        }
        goToLead();
      });
    });
  }

  /* ---------- FAQ accordion ---------- */
  function initFaq() {
    var buttons = document.querySelectorAll('.faq__q button');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq__item');
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        item.classList.toggle('is-open', open);
      });
    });
  }

  /* ---------- Lead form: phone mask, validation, toast ---------- */
  function initLeadForm() {
    var form = document.getElementById('lead-form');
    if (!form) return;

    var name = document.getElementById('f-name');
    var phone = document.getElementById('f-phone');
    var agree = document.getElementById('f-agree');
    var comment = document.getElementById('f-comment');

    var digitsOf = function (value) {
      var d = value.replace(/\D/g, '');
      if (d.charAt(0) === '8' || d.charAt(0) === '7') d = d.slice(1);
      return d.slice(0, 10);
    };

    var formatPhone = function (d) {
      if (!d) return '';
      var out = '+7 (' + d.slice(0, 3);
      if (d.length >= 3) out += ') ' + d.slice(3, 6);
      if (d.length >= 6) out += '-' + d.slice(6, 8);
      if (d.length >= 8) out += '-' + d.slice(8, 10);
      return out;
    };

    phone.addEventListener('focus', function () {
      if (!phone.value) phone.value = '+7 (';
    });
    phone.addEventListener('blur', function () {
      if (!digitsOf(phone.value)) phone.value = '';
    });
    phone.addEventListener('input', function (e) {
      // При удалении символа-разделителя не мешаем пользователю
      if (e.inputType && e.inputType.indexOf('delete') === 0) {
        var d = digitsOf(phone.value);
        phone.value = d ? formatPhone(d) : '';
        if (phone.value.slice(-1) === ' ' || phone.value.slice(-1) === '-' || phone.value.slice(-1) === ')') {
          phone.value = phone.value.replace(/[\s\-)]+$/, '');
        }
      } else {
        phone.value = formatPhone(digitsOf(phone.value));
      }
      if (phone.getAttribute('aria-invalid') === 'true') validatePhone();
    });

    var setError = function (input, message) {
      var err = document.getElementById(input.id + '-err');
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (err) err.textContent = message || '';
      return !message;
    };

    var validateName = function () {
      var v = name.value.trim();
      if (!v) return setError(name, 'Пожалуйста, укажите имя.');
      if (v.length < 2 || !/^[A-Za-zА-Яа-яЁё\s\-']+$/.test(v)) return setError(name, 'Имя должно содержать минимум 2 буквы.');
      return setError(name, '');
    };
    var validatePhone = function () {
      var d = digitsOf(phone.value);
      if (!d) return setError(phone, 'Укажите номер телефона.');
      if (d.length < 10) return setError(phone, 'Номер должен содержать 10 цифр после +7.');
      return setError(phone, '');
    };
    var validateAgree = function () {
      return setError(agree, agree.checked ? '' : 'Нужно согласие на обработку данных.');
    };

    name.addEventListener('blur', function () { if (name.value) validateName(); });
    name.addEventListener('input', function () { if (name.getAttribute('aria-invalid') === 'true') validateName(); });
    phone.addEventListener('change', validatePhone);
    agree.addEventListener('change', validateAgree);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = [validateName(), validatePhone(), validateAgree()];
      var firstInvalid = [name, phone, agree][ok.indexOf(false)];
      if (firstInvalid) { firstInvalid.focus(); return; }

      // Демо: данные никуда не отправляются
      var firstName = name.value.trim().split(/\s+/)[0];
      showToast(firstName + ', спасибо! Это демо-форма — в реальном проекте менеджер перезвонил бы на ' + phone.value + '.');
      form.reset();
      [name, phone, agree].forEach(function (el) { el.removeAttribute('aria-invalid'); });
      if (comment) comment.value = '';
    });
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function showToast(text) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.querySelector('.toast__text').textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 6000);
    var close = toast.querySelector('.toast__close');
    close.onclick = hideToast;
  }
  function hideToast() {
    var toast = document.getElementById('toast');
    if (toast) toast.classList.remove('is-visible');
  }
})();
