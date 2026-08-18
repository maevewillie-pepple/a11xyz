(function () {
  var form = document.querySelector('[data-contact-form]');
  if (!form) return;

  var errorEl = document.getElementById('form-error');
  var thanks = document.getElementById('form-thanks');
  var submit = form.querySelector('button[type="submit"]');
  var slot = document.getElementById('turnstile-slot');
  var widgetId = null;
  var mailKey = '';

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

  function mailBody(payload) {
    var lines = [
      'Type: ' + payload.type,
      'Name: ' + payload.name,
      'Email: ' + payload.email,
    ];
    if (payload.organisation) lines.push('Organisation: ' + payload.organisation);
    if (payload.url) lines.push('Website: ' + payload.url);
    if (payload.need) lines.push('Need: ' + payload.need);
    lines.push('', payload.message);
    return lines.join('\n');
  }

  fetch('/contact/config')
    .then(function (res) { return res.ok ? res.json() : {}; })
    .then(function (cfg) {
      mailKey = (cfg && cfg.web3formsAccessKey) || '';
      mountTurnstile(cfg && cfg.turnstileSiteKey);
    })
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
    if (!mailKey) {
      showError('Email is not set up on this server. Email maevepepple@gmail.com instead.');
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
      website_fax: form.website_fax ? (form.website_fax.value || '').trim() : '',
      turnstileToken: turnstileToken(),
    };

    var subject = payload.type === 'audit'
      ? 'Audit request from ' + name
      : 'Product idea from ' + name;

    submit.disabled = true;
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: mailKey,
        subject: subject,
        from_name: name,
        name: name,
        email: email,
        replyto: email,
        message: mailBody(payload),
        botcheck: payload.website_fax,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data || !data.success) {
            throw new Error((data && data.message) || 'Could not send. Email maevepepple@gmail.com instead.');
          }
        });
      })
      .then(function () {
        fetch('/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(function () {});
        form.hidden = true;
        thanks.hidden = false;
        thanks.setAttribute('tabindex', '-1');
        thanks.focus();
      })
      .catch(function (err) {
        var msg = (err && err.message) || '';
        if (!msg || msg === 'Failed to fetch' || /NetworkError|Load failed|JSON|Unexpected token/i.test(msg)) {
          msg = 'Could not send. Email maevepepple@gmail.com instead.';
        }
        showError(msg);
        resetCaptcha();
      })
      .finally(function () {
        submit.disabled = false;
      });
  });
})();
