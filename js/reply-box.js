/* =========================================================
   Ordo Lux Tenebris — reply-box.js
   Добавляет форму ответа внутрь .archive-post — но только
   если пользователь залогинен (см. auth.js / TenebrisAuth).
   Если не залогинен — показывает "log in to reply".

   При отправке:
   - обычно (85%) сообщение добавляется в тред от имени
     залогиненного аккаунта и остаётся там (хранится в
     localStorage, переживает перезагрузку страницы);
   - изредка (15%) вместо этого показывается ошибка сервера —
     подходит по духу сайту, где ничего не работает стабильно.

   Подключать этот файл ТОЛЬКО на страницах, где реально нужна
   форма ответа (треды форума, диалоги в личных сообщениях) —
   не на архивных echo-страницах.
   ========================================================= */

(function () {
  var post = document.querySelector('.archive-post');
  if (!post) {
    return;
  }

  var accountOwner = document.body.getAttribute('data-account');
  var allowedAccountsAttr = document.body.getAttribute('data-allowed-accounts');
  var session = window.TenebrisAuth ? window.TenebrisAuth.getSession() : null;

  var allowedList = allowedAccountsAttr
    ? allowedAccountsAttr.split(',').map(function (s) { return s.trim(); })
    : (accountOwner ? [accountOwner] : null);

  var isSuperuser = session && window.TenebrisAuth && window.TenebrisAuth.isSuperuser
    ? window.TenebrisAuth.isSuperuser(session)
    : false;

  // Если пост привязан к конкретному аккаунту (или списку аккаунтов —
  // личные сообщения, закрытые треды) и текущий пользователь не входит
  // в список (и не суперюзер) — вообще ничего не показываем, форма
  // ответа не должна светиться поверх "access restricted".
  if (allowedList && !isSuperuser && (!session || allowedList.indexOf(session) === -1)) {
    return;
  }

  // Если на странице есть блок приватных сообщений — форма ответа
  // должна жить внутри него (и прятаться/появляться вместе с ним).
  // Иначе (обычный тред форума) — просто в конец .archive-post.
  var target = document.getElementById('private-messages') || post;

  // Определяем префикс до корня по собственному <script src="...">
  var thisScript = document.currentScript;
  var prefix = '';
  if (thisScript) {
    prefix = thisScript.getAttribute('src').replace('js/reply-box.js', '');
  }

  function todayISO() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function storageKey() {
    return 'tenebris_replies_' + window.location.pathname;
  }

  function loadReplies() {
    try {
      var raw = window.localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function saveReplies(list) {
    try {
      window.localStorage.setItem(storageKey(), JSON.stringify(list));
    } catch (err) {
      /* ignore */
    }
  }

  function renderReply(author, date, text) {
    var block = document.createElement('div');
    block.className = 'thread-post';

    var meta = document.createElement('div');
    meta.className = 'thread-post-meta';
    meta.textContent = author + ' — ' + date;

    var p = document.createElement('p');
    p.textContent = text;

    block.appendChild(meta);
    block.appendChild(p);
    return block;
  }

  var wrapper = document.createElement('div');
  wrapper.className = 'thread-post';
  wrapper.style.borderBottom = 'none';

  // Сначала добавляем сам wrapper (форму/подсказку) в конец поста,
  // а уже отправленные ранее ответы будем вставлять ПЕРЕД ним —
  // так порядок всегда: старые посты -> прошлые ответы -> форма.
  target.appendChild(wrapper);

  var existing = loadReplies();
  existing.forEach(function (r) {
    target.insertBefore(renderReply(r.author, r.date, r.text), wrapper);
  });

  if (session) {
    var form = document.createElement('form');
    form.className = 'auth-form';
    form.style.marginTop = '20px';

    var label = document.createElement('label');
    label.textContent = 'Reply as ' + session.toUpperCase();

    var textarea = document.createElement('textarea');
    textarea.rows = 3;
    textarea.style.cssText =
      'background: rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.3); color:#fff; font-family: var(--font-mono); font-size:15px; padding:8px 10px; resize:vertical;';

    var button = document.createElement('button');
    button.type = 'submit';
    button.textContent = 'Post Reply';

    var message = document.createElement('p');
    message.className = 'auth-message';

    form.appendChild(label);
    form.appendChild(textarea);
    form.appendChild(button);

    wrapper.appendChild(form);
    wrapper.appendChild(message);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = textarea.value.trim();
      if (!text) {
        return;
      }

      var failed = Math.random() < 0.15;

      if (failed) {
        message.textContent = 'Error — could not reach the server. Please try again.';
        message.className = 'auth-message is-visible is-error';
        return;
      }

      var date = todayISO();
      target.insertBefore(renderReply(session.toUpperCase(), date, text), wrapper);

      var list = loadReplies();
      list.push({ author: session.toUpperCase(), date: date, text: text });
      saveReplies(list);

      textarea.value = '';
      message.textContent = 'Posted.';
      message.className = 'auth-message is-visible is-hint';
    });
  } else {
    var note = document.createElement('p');
    note.className = 'post-footer';
    note.innerHTML =
      '<a href="' + prefix + 'pages/login.html" class="profile-link">Log in</a> to reply to this thread.';
    wrapper.appendChild(note);
  }
})();
