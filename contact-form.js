(function () {
  var form = document.querySelector('[data-contact-form]');
  if (!form) return;

  var errorEl = document.getElementById('form-error');
  var thanks = document.getElementById('form-thanks');
  var submit = form.querySelector('button[type="submit"]');
  var slot = document.getElementById('turnstile-slot');
  var widgetId = null;

  function showError(msg) {
    errorEl.hidden = false;
    errorEl.textContent = msg;
  }

  function turnstileToken() {
    if (widgetId == null || !window.turnstile) return '';
    return window.turnstile.getResponse(widgetId) || '';
  }

  function resetCaptcha() {
    if (widgetId != null && window.turnstile) window.turnstile.reset(widgetId);
  }

  function mountTurnstile(siteKey) {
    if (!siteKey || !slot) return;
    var script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = function () {
      widgetId = window.turnstile.render(slot, {
        sitekey: siteKey,
        appearance: 'interaction-only',
        theme: 'light',
      });
    };
    document.head.appendChild(script);
  }

  fetch('/contact/config')
    .then(function (res) { return res.ok ? res.json() : {}; })
    .then(function (cfg) { mountTurnstile(cfg && cfg.turnstileSiteKey); })
    .catch(function () {});

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.hidden = true;

    var name = (form.name.value || '').trim();
    var email = (form.email.value || '').trim();
    var message = (form.message.value || '').trim();
    if (!name || !email || !message) {
      showError('Name, email, and a message are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('Enter a valid email address.');
      return;
    }

    var payload = {
      type: form.type.value,
      name: name,
      email: email,
      message: message,
      organisation: form.organisation ? (form.organisation.value || '').trim() : '',
      url: form.url ? (form.url.value || '').trim() : '',
      need: (form.querySelector('input[name="need"]:checked') || {}).value || '',
      company_url: form.company_url ? (form.company_url.value || '').trim() : '',
      turnstileToken: turnstileToken(),
    };

    submit.disabled = true;
    fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var data = {};
          try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
          if (!res.ok) {
            throw new Error(data.error || 'Could not send. Email maevepepple@gmail.com instead.');
          }
        });
      })
      .then(function () {
        form.hidden = true;
        thanks.hidden = false;
        thanks.setAttribute('tabindex', '-1');
        thanks.focus();
      })
      .catch(function (err) {
        var msg = (err && err.message) || '';
        if (!msg || msg === 'Failed to fetch' || /NetworkError|Load failed|JSON|Unexpected token/i.test(msg)) {
          msg = 'Could not reach the server. Stop and start npm run dev, then try again, or email maevepepple@gmail.com.';
        }
        showError(msg);
        resetCaptcha();
      })
      .finally(function () {
        submit.disabled = false;
      });
  });
})();
