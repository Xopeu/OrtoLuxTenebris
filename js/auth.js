/* =========================================================
   Ordo Lux Tenebris — auth.js
   Никакого настоящего бэкенда. Всё захардкожено на клиенте,
   состояние живёт в localStorage — переживает переход между
   страницами и закрытие вкладки/браузера.

   ЧТО ХРАНИТСЯ:
   - tenebris_session              — логин текущего пользователя.
   - tenebris_lastseen_<username>  — дата последнего входа.
   - tenebris_pw_override_administrator — новый пароль админа
     после восстановления через admin/recovery.html (если есть,
     имеет приоритет над паролем по умолчанию из ACCOUNTS).

   КАК ДОБАВИТЬ НОВЫЙ АККАУНТ:
   Допиши запись в ACCOUNTS ниже, например:
     the_keeper: {
       password: 'что-то',
       hint: 'подсказка, которую увидит игрок',
       redirect: 'users/the_keeper/the_keeper.html'
     }
   redirect считается от pages/login.html.

   КАК СВЯЗАТЬ СТРАНИЦУ ПРОФИЛЯ С ЭТОЙ СИСТЕМОЙ:
   На странице профиля добавь <body data-account="anna_r">,
   оберни приватный контент в #private-messages (display:none)
   и оставь заглушку #messages-locked. Для даты последнего
   входа — id="last-seen-value" на нужном <dd>.
   ========================================================= */

(function () {
  var ACCOUNTS = {
    anna_r: {
      password: '1937',
      hint: 'my date of birth',
      redirect: 'users/anna_r/anna_r.html'
    },
    brother_ilan: {
      password: 'patiently',
      hint: 'the word he used for how it was reaching for him',
      redirect: 'users/brother_ilan/brother_ilan.html'
    },
    the_keeper: {
      password: 'expected',
      hint: 'what he calls anything that shouldn\'t be happening',
      redirect: 'users/the_keeper/the_keeper.html'
    },
    administrator: {
      password: 'changeme',
      hint: null, // спец-случай — см. forgot-password ниже
      redirect: 'users/administrator/administrator.html'
    }
    // ЗАГЛУШКА: сюда позже добавятся ещё пара логинов.
  };

  // Аккаунт(ы) с полным доступом ко всему сайту.
  var SUPERUSER_ACCOUNTS = ['administrator'];

  // Ключ восстановления для администратора и путь до формы
  // восстановления. Меняешь оба здесь при желании.
  var ADMIN_RECOVERY_KEY = 'RK-OLT-7734';
  var ADMIN_RECOVERY_PATH = 'admin/recovery.html';

  var SESSION_KEY = 'tenebris_session';
  var ADMIN_PW_OVERRIDE_KEY = 'tenebris_pw_override_administrator';

  function lastSeenKey(username) {
    return 'tenebris_lastseen_' + username;
  }

  function todayISO() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      /* localStorage недоступен — тихо игнорируем */
    }
  }

  function safeRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      /* ignore */
    }
  }

  function getSession() {
    return safeGet(SESSION_KEY);
  }

  function setSession(username) {
    safeSet(SESSION_KEY, username);
    safeSet(lastSeenKey(username), todayISO());
  }

  function clearSession() {
    safeRemove(SESSION_KEY);
  }

  function getLastSeen(username) {
    return safeGet(lastSeenKey(username));
  }

  function effectivePassword(username) {
    if (username === 'administrator') {
      var override = safeGet(ADMIN_PW_OVERRIDE_KEY);
      if (override) {
        return override;
      }
    }
    return ACCOUNTS[username] ? ACCOUNTS[username].password : null;
  }

  // Доступно из консоли/других скриптов при желании
  window.TenebrisAuth = {
    getSession: getSession,
    logout: function () {
      clearSession();
      window.location.reload();
    },
    getLastSeen: getLastSeen,
    isSuperuser: function (username) {
      return SUPERUSER_ACCOUNTS.indexOf(username) !== -1;
    },
    checkRecoveryKey: function (key) {
      return key.trim() === ADMIN_RECOVERY_KEY;
    },
    setAdminPassword: function (newPassword) {
      safeSet(ADMIN_PW_OVERRIDE_KEY, newPassword);
    }
  };

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = 'auth-message is-visible ' + (type ? 'is-' + type : '');
  }

  // ---------- LOGIN PAGE ----------
  var loginForm = document.getElementById('login-form');
  var loginMessage = document.getElementById('login-message');
  var loggedOutView = document.getElementById('logged-out-view');
  var loggedInView = document.getElementById('logged-in-view');
  var loggedInName = document.getElementById('logged-in-username');
  var logoutBtn = document.getElementById('logout-button');

  function refreshLoginPageUI() {
    if (!loggedOutView || !loggedInView) {
      return;
    }
    var session = getSession();
    if (session) {
      loggedOutView.style.display = 'none';
      loggedInView.style.display = '';
      if (loggedInName) {
        loggedInName.textContent = session.toUpperCase();
      }
    } else {
      loggedOutView.style.display = '';
      loggedInView.style.display = 'none';
    }
  }

  if (loggedOutView || loggedInView) {
    refreshLoginPageUI();
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      clearSession();
      refreshLoginPageUI();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var username = document.getElementById('login-username').value.trim().toLowerCase();
      var password = document.getElementById('login-password').value;

      var account = ACCOUNTS[username];
      var pw = effectivePassword(username);
      if (account && pw !== null && pw === password) {
        setSession(username);
        showMessage(loginMessage, 'Access granted. Redirecting…', 'hint');
        setTimeout(function () {
          window.location.href = account.redirect;
        }, 700);
      } else {
        showMessage(loginMessage, 'Invalid username or password.', 'error');
      }
    });
  }

  // ---------- SIGN UP (всегда "ломается") ----------
  var signupForm = document.getElementById('signup-form');
  var signupMessage = document.getElementById('signup-message');

  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      showMessage(
        signupMessage,
        'Error 500 — registration is temporarily unavailable. Please try again later.',
        'error'
      );
    });
  }

  // ---------- FORGOT PASSWORD ----------
  var forgotForm = document.getElementById('forgot-form');
  var forgotMessage = document.getElementById('forgot-message');

  function getScriptPrefix(marker) {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf(marker) !== -1) {
        return src.replace(marker, '');
      }
    }
    return '';
  }

  function downloadDiagnosticLog() {
    var prefix = getScriptPrefix('js/auth.js');
    var a = document.createElement('a');
    a.href = prefix + 'diagnostic_1993.log';
    a.download = 'diagnostic_1993.log';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var username = document.getElementById('forgot-username').value.trim().toLowerCase();
      var account = ACCOUNTS[username];

      if (username === 'administrator') {
        showMessage(
          forgotMessage,
          'Standard recovery unavailable for this account. Downloading diagnostic log...',
          'hint'
        );
        downloadDiagnosticLog();
        return;
      }

      if (account) {
        showMessage(forgotMessage, 'Hint: ' + account.hint, 'hint');
      } else {
        showMessage(forgotMessage, 'No account found with that username.', 'error');
      }
    });
  }

  // ---------- НАВИГАЦИЯ: пункт "Console" только для администратора ----------
  (function injectConsoleLink() {
    var navLinks = document.querySelector('.nav-links');
    if (!navLinks) {
      return;
    }
    if (getSession() !== 'administrator') {
      return;
    }
    if (navLinks.querySelector('.console-nav-link')) {
      return;
    }
    var prefix = getScriptPrefix('js/auth.js');
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = prefix + 'admin/console.html';
    a.className = 'link-green console-nav-link';
    a.textContent = 'Console';
    li.appendChild(a);
    navLinks.appendChild(li);
  })();

  // ---------- ПРОФИЛЬ / ЗАКРЫТЫЙ КОНТЕНТ: приватные сообщения + last seen ----------
  var accountOwner = document.body.getAttribute('data-account');
  var allowedAccountsAttr = document.body.getAttribute('data-allowed-accounts');

  if (accountOwner || allowedAccountsAttr) {
    var session2 = getSession();
    var privateMessages = document.getElementById('private-messages');
    var messagesLocked = document.getElementById('messages-locked');
    var lastSeenEl = document.getElementById('last-seen-value');

    var allowedList = allowedAccountsAttr
      ? allowedAccountsAttr.split(',').map(function (s) { return s.trim(); })
      : (accountOwner ? [accountOwner] : []);

    var isSuperuser = session2 && SUPERUSER_ACCOUNTS.indexOf(session2) !== -1;

    if (isSuperuser || (session2 && allowedList.indexOf(session2) !== -1)) {
      if (privateMessages) {
        privateMessages.style.display = '';
      }
      if (messagesLocked) {
        messagesLocked.style.display = 'none';
      }
    }

    if (lastSeenEl && accountOwner) {
      var override = getLastSeen(accountOwner);
      if (override) {
        lastSeenEl.textContent = override;
      }
    }
  }
})();
