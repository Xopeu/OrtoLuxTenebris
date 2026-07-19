/* =========================================================
   Ordo Lux Tenebris — auth.js
   Никакого настоящего бэкенда. Всё захардкожено на клиенте,
   состояние живёт в localStorage — переживает переход между
   страницами и закрытие вкладки/браузера.

   ЧТО ХРАНИТСЯ:
   - tenebris_session       — логин текущего пользователя,
                               или ничего, если разлогинен.
   - tenebris_lastseen_<username> — дата последнего успешного
                               входа под этим логином. Не
                               стирается при разлогине и не
                               трогается при входе под ДРУГИМ
                               аккаунтом — это отдельная,
                               постоянная запись.

   КАК ДОБАВИТЬ НОВЫЙ АККАУНТ:
   Допиши запись в ACCOUNTS ниже, например:
     the_keeper: {
       password: 'что-то',
       hint: 'подсказка, которую увидит игрок',
       redirect: 'users/the_keeper/the_keeper.html'
     }
   redirect считается от pages/login.html (лежит в pages/,
   так что путь к другому файлу в pages/ — без "../", а
   наружу из pages/ — с одним "../").

   КАК СВЯЗАТЬ СТРАНИЦУ ПРОФИЛЯ С ЭТОЙ СИСТЕМОЙ:
   На странице профиля (например anna_r.html) добавь:
     <body data-account="anna_r">
   Для приватных сообщений — оберни их в:
     <div id="private-messages" style="display:none">...</div>
   и оставь блок-заглушку с id="messages-locked":
     <div id="messages-locked" class="profile-locked">
       [ private messages: access restricted ]
     </div>
   Для даты последнего входа — добавь id на <dd>:
     <dd id="last-seen-value">1994-03-01</dd>
   Дальше всё подхватится само при подключении auth.js.
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
      hint: 'placeholder — set your own password and hint here',
      redirect: 'users/administrator/administrator.html'
    }
    // ЗАГЛУШКА: сюда позже добавятся ещё пара логинов —
    // чтобы игрок мог попасть в разные аккаунты и оттуда
    // идти глубже.
  };

  // Аккаунт(ы) с полным доступом ко всему сайту — видят любые
  // приватные сообщения и закрытые треды, независимо от того,
  // что указано в data-account / data-allowed-accounts на странице.
  var SUPERUSER_ACCOUNTS = ['administrator'];

  var SESSION_KEY = 'tenebris_session';

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
      if (account && account.password === password) {
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

  if (forgotForm) {
    forgotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var username = document.getElementById('forgot-username').value.trim().toLowerCase();
      var account = ACCOUNTS[username];

      if (account) {
        showMessage(forgotMessage, 'Hint: ' + account.hint, 'hint');
      } else {
        showMessage(forgotMessage, 'No account found with that username.', 'error');
      }
    });
  }

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
