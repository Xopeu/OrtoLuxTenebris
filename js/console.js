/* =========================================================
   Ordo Lux Tenebris — console.js
   Движок терминала для admin/console.html. Ванильный JS,
   без библиотек. Работает как настоящая консоль: одна
   страница, один инпут, команды меняют состояние (cwd) и
   печатают вывод — а не ведут на отдельные страницы.

   Доступ только под сессией "administrator" (см. auth.js).
   ========================================================= */

(function () {
  var terminal = document.getElementById('terminal');
  if (!terminal) {
    return;
  }

  // ---------- ДОСТУП ----------
  var session = window.TenebrisAuth ? window.TenebrisAuth.getSession() : null;
  if (session !== 'administrator') {
    terminal.innerHTML =
      '<div class="line err">ACCESS DENIED</div>' +
      '<div class="line">This console is restricted to administrator accounts.</div>' +
      '<div class="line">&nbsp;</div>' +
      '<div class="line"><a href="../pages/login.html">Return to login</a></div>';
    return;
  }

  // ---------- ВИРТУАЛЬНАЯ ФАЙЛОВАЯ СИСТЕМА ----------
  var FS = {
    '/': { type: 'dir', children: ['archive', 'users', 'forum', 'mail', 'system', 'readme.txt'] },

    '/archive': {
      type: 'dir',
      children: [
        'echo-01.rec', 'echo-02.rec', 'echo-03.rec', 'echo-04.rec', 'echo-05.rec',
        'echo-06.rec', 'echo-07.rec', 'echo-08.rec', 'echo-09.rec', 'echo-10.rec'
      ]
    },
    '/archive/echo-01.rec': { type: 'file', content:
      'From: BROTHER_ILAN\nDate: 1993-11-03\n\nThe Vessel did not resist when it was time. What they call\nbeaten, we call opened. What they call blood, we are\nlearning to call signal.' },
    '/archive/echo-02.rec': { type: 'file', content:
      'From: SISTER_MARGUERITE\nDate: 1993-11-03\n\nBroken is only a word for those who have not yet been\nopened. The form dissolves. This is not death, they tell\nme, this is the correct configuration.' },
    '/archive/echo-03.rec': { type: 'file', content:
      'From: K.HOLLOWAY\nDate: 1993-12-05\n\nA light which calls a ship toward it and a light which\nwarns a ship away look identical from a distance. Ours\ndoes not warn. Ours calls.' },
    '/archive/echo-04.rec': { type: 'file', content:
      'From: VESSEL_09\nDate: 1993-07-30\n\nSacrifice is the wrong word for what we do. A sacrifice\nimplies loss. What we perform is a transfer, and transfers\nrequire a protocol.' },
    '/archive/echo-05.rec': { type: 'file', content:
      'From: R.WELLS\nDate: 1993-05-10\n\nFaith is a lamp we carry, not a fire we chase. Some weeks\nthe light feels close. Other weeks I am just carrying the\nlamp and trusting that is enough.' },
    '/archive/echo-06.rec': { type: 'file', content:
      'From: THE_KEEPER\nDate: 1993-14-45 [unparseable]\n\nThe calendar stopped meaning anything to the archive a\nlong time before it stopped meaning anything to us.' },
    '/archive/echo-07.rec': { type: 'file', content:
      'From: M.STRAND\nDate: 1993-12-06\n\nEvery ship believes the light on the shore exists for its\nbenefit. I used to sing a hymn about a lighthouse as a\nchild. I sing something else now.' },
    '/archive/echo-08.rec': { type: 'file', content:
      'From: BROTHER_ILAN\nDate: 1993-12-08\n\nWe are not waiting for the light to arrive from somewhere\nelse. We are the conditions under which it arrives, and a\ncondition does not wait.' },
    '/archive/echo-09.rec': { type: 'file', content:
      'From: UNKNOWN\nDate: ____-__-__\n\nMy name used to be at the top of this post. I can see the\nshape where it used to sit, like a stain on a wall where a\npicture hung for years.' },
    '/archive/echo-10.rec': { type: 'file', content:
      'From: THE_KEEPER\nDate: 1993-11-03\n\nInto thy hands, He said, and we have been saying it back\nto something ever since. What flowed out that day was not\nlost. It was recorded.' },

    '/users': {
      type: 'dir',
      children: [
        'anna_r', 'brother_ilan', 'the_keeper', 'administrator', 'pastor_dunn',
        'sister_marguerite', 'k_holloway', 'vessel_09', 'm_strand', 'r_wells',
        'm_parks', 'jonas_koskinen', 'mia_koskinen'
      ]
    },

    '/forum': { type: 'dir', children: ['general', 'community', 'prayer', 'marketplace', 'technical'] },
    '/mail': { type: 'dir', children: ['inbox'] },
    '/system': { type: 'dir', children: ['motd.txt', 'passwd', 'cron.log'] },

    '/system/motd.txt': { type: 'file', content:
      'Welcome to the OLT internal maintenance system.\nUnauthorized access is prohibited and logged.\nFor support, contact the system administrator.' },
    '/system/passwd': { type: 'file', content:
      'anna_r:x:1001:members\nbrother_ilan:x:1002:members\nthe_keeper:x:1003:staff\nadministrator:x:0:root\npastor_dunn:x:1004:members\n(entries truncated — use "users" for full listing)' },
    '/system/cron.log': { type: 'file', content:
      'Dec 10 02:00:01 oltweb cron[204]: (root) CMD (/usr/local/bin/backup_archive.sh)\nDec 10 02:00:04 oltweb backup_archive.sh: backup completed, 214 records\nDec 10 03:00:01 oltweb cron[211]: (root) CMD (/usr/local/bin/mail_digest.sh)\nDec 10 03:00:02 oltweb mail_digest.sh: digest sent to 1 recipient' },

    '/readme.txt': { type: 'file', content:
      'OLT Internal Maintenance Console\n\nThis system is for authorized maintenance use only.\nUse "help" to list available commands.' }
  };

  // ---------- СОСТОЯНИЕ ----------
  var cwd = '/';

  function normalizePath(path) {
    if (!path) return cwd;
    var target;
    if (path.charAt(0) === '/') {
      target = path;
    } else if (path === '.') {
      target = cwd;
    } else if (path === '..') {
      var parts = cwd.split('/').filter(Boolean);
      parts.pop();
      target = '/' + parts.join('/');
    } else {
      target = (cwd === '/' ? '' : cwd) + '/' + path;
    }
    // схлопываем двойные слэши
    target = target.replace(/\/+/g, '/');
    if (target.length > 1 && target.endsWith('/')) {
      target = target.slice(0, -1);
    }
    return target || '/';
  }

  function resolve(path) {
    var full = normalizePath(path);
    return FS[full] ? { path: full, node: FS[full] } : null;
  }

  // ---------- ВЫВОД ----------
  function printLine(text, cls) {
    var div = document.createElement('div');
    div.className = 'line' + (cls ? ' ' + cls : '');
    div.textContent = text === '' ? '\u00A0' : text;
    terminal.appendChild(div);
  }

  function printHTML(html, cls) {
    var div = document.createElement('div');
    div.className = 'line' + (cls ? ' ' + cls : '');
    div.innerHTML = html;
    terminal.appendChild(div);
  }

  function printBlock(text, cls) {
    text.split('\n').forEach(function (line) {
      printLine(line, cls);
    });
  }

  function scrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
  }

  // ---------- КОМАНДЫ ----------
  var USERS_TABLE = [
    ['anna_r', 'inactive', '1993-12-10'],
    ['brother_ilan', 'active', '1993-12-10'],
    ['the_keeper', 'active', '1993-12-10'],
    ['administrator', 'active', '1993-12-10'],
    ['pastor_dunn', 'active', '1993-12-10'],
    ['sister_marguerite', 'active', '1993-12-10'],
    ['k_holloway', 'active', '1993-12-10'],
    ['vessel_09', 'active', '1993-12-10'],
    ['m_strand', 'active', '1993-12-10'],
    ['r_wells', 'inactive', '1993-12-10'],
    ['m_parks', 'inactive', '1993-12-10'],
    ['jonas_koskinen', 'active', '1993-12-10'],
    ['mia_koskinen', 'active', '1993-12-10']
  ];

  var COMMANDS = {
    help: function () {
      printLine('Available commands:');
      printLine('');
      [
        ['help', 'show this list'],
        ['ls [dir]', 'list directory contents'],
        ['cd <dir>', 'change current directory'],
        ['pwd', 'print working directory'],
        ['whoami', 'print current user'],
        ['cat <file>', 'print file contents'],
        ['users', 'list registered users'],
        ['mail', 'check internal system mail'],
        ['archive', 'list archived records'],
        ['restore', 'system restore tools'],
        ['forum', 'open internal staff forum'],
        ['date', 'show system date'],
        ['clear', 'clear the screen'],
        ['logout', 'end administrator session']
      ].forEach(function (row) {
        printLine('  ' + row[0].padEnd(14, ' ') + row[1]);
      });
    },

    pwd: function () {
      printLine(cwd);
    },

    whoami: function () {
      printLine('administrator');
    },

    date: function () {
      printLine('Fri Dec 10 03:14:22 1993');
    },

    clear: function () {
      terminal.innerHTML = '';
    },

    logout: function () {
      printLine('Ending session...');
      setTimeout(function () {
        if (window.TenebrisAuth) {
          window.TenebrisAuth.logout();
        }
      }, 400);
    },

    ls: function (args) {
      var target = args[0] ? resolve(args[0]) : { path: cwd, node: FS[cwd] };
      if (!target || !target.node) {
        printLine('ls: cannot access \'' + args[0] + '\': No such file or directory', 'err');
        return;
      }
      if (target.node.type !== 'dir') {
        printLine(args[0]);
        return;
      }
      target.node.children.forEach(function (name) {
        var childPath = (target.path === '/' ? '' : target.path) + '/' + name;
        var isDir = FS[childPath] && FS[childPath].type === 'dir';
        printLine(isDir ? name + '/' : name, isDir ? 'hint' : '');
      });
    },

    cd: function (args) {
      if (!args[0]) {
        cwd = '/';
        return;
      }
      var target = resolve(args[0]);
      if (!target || target.node.type !== 'dir') {
        printLine('cd: no such directory: ' + args[0], 'err');
        return;
      }
      cwd = target.path;
    },

    cat: function (args) {
      if (!args[0]) {
        printLine('usage: cat <file>', 'err');
        return;
      }
      var target = resolve(args[0]);
      if (!target) {
        printLine('cat: ' + args[0] + ': No such file or directory', 'err');
        return;
      }
      if (target.node.type === 'dir') {
        printLine('cat: ' + args[0] + ': Is a directory', 'err');
        return;
      }
      printBlock(target.node.content);
    },

    users: function () {
      printLine('USERNAME             STATUS     LAST LOGIN');
      USERS_TABLE.forEach(function (row) {
        printLine(
          row[0].padEnd(21, ' ') + row[1].padEnd(11, ' ') + row[2]
        );
      });
    },

    mail: function () {
      printLine('OLT Mail System — 4 messages');
      printLine('');
      printLine('  1  cron@oltweb           backup completed          Dec 10');
      printLine('  2  mailer-daemon@oltweb  delivery failure (2)      Dec 09');
      printLine('  3  httpd@oltweb          disk usage warning        Dec 08');
      printLine('  4  named@oltweb          zone transfer notice      Dec 03');
      printLine('');
      printLine('(message reader not available in this console version)', 'dim');
    },

    archive: function () {
      printLine('Archived records (/archive):');
      printLine('');
      [
        ['echo-01.rec', 'BROTHER_ILAN', '1993-11-03'],
        ['echo-02.rec', 'SISTER_MARGUERITE', '1993-11-03'],
        ['echo-03.rec', 'K.HOLLOWAY', '1993-12-05'],
        ['echo-04.rec', 'VESSEL_09', '1993-07-30'],
        ['echo-05.rec', 'R.WELLS', '1993-05-10'],
        ['echo-06.rec', 'THE_KEEPER', '1993-14-45'],
        ['echo-07.rec', 'M.STRAND', '1993-12-06'],
        ['echo-08.rec', 'BROTHER_ILAN', '1993-12-08'],
        ['echo-09.rec', 'UNKNOWN', '____-__-__'],
        ['echo-10.rec', 'THE_KEEPER', '1993-11-03']
      ].forEach(function (row) {
        printLine('  ' + row[0].padEnd(14, ' ') + row[1].padEnd(20, ' ') + row[2]);
      });
      printLine('');
      printLine('Use "cat archive/<file>" to read a record.', 'dim');
    },

    restore: function () {
      printLine('OLT System Restore Tools');
      printLine('');
      printLine('Available restore points:');
      printLine('  1993-12-09 02:00  full archive snapshot');
      printLine('  1993-12-02 02:00  full archive snapshot');
      printLine('  1993-11-25 02:00  full archive snapshot');
      printLine('');
      printLine('This operation requires confirmation from a second', 'err');
      printLine('administrator account. None is currently registered.', 'err');
    },

    forum: function () {
      enterForumMode();
    }
  };

  // ---------- ВНУТРЕННИЙ ФОРУМ (ASCII, только клавиатура) ----------
  // ЗАГЛУШКА: категории и треды ниже — заготовка механики.
  // Реальный контент (названия тредов, сообщения) допишем
  // отдельно — сейчас это только рабочий каркас.
  var INTERNAL_FORUM = [
    {
      name: 'STAFF',
      threads: [
        {
          title: 'Welcome to the internal board',
          messages: [
            { from: 'ADMINISTRATOR', date: '1993-12-10', text: '[ placeholder \u2014 text to be added later ]' }
          ]
        }
      ]
    },
    {
      name: 'MAINTENANCE',
      threads: [
        {
          title: 'Untitled thread',
          messages: [
            { from: 'ADMINISTRATOR', date: '1993-12-10', text: '[ placeholder \u2014 text to be added later ]' }
          ]
        }
      ]
    },
    {
      name: 'ARCHIVE NOTES',
      threads: [
        {
          title: 'Untitled thread',
          messages: [
            { from: 'ADMINISTRATOR', date: '1993-12-10', text: '[ placeholder \u2014 text to be added later ]' }
          ]
        }
      ]
    }
  ];

  var BOX_WIDTH = 60;
  var forumState = { view: 'categories', catIdx: 0, threadIdx: 0 };

  function border() {
    return '+' + new Array(BOX_WIDTH - 1).join('-') + '+';
  }

  function padLine(text) {
    var inner = BOX_WIDTH - 4;
    if (text.length > inner) {
      text = text.slice(0, inner);
    }
    return '| ' + text + new Array(inner - text.length + 1).join(' ') + ' |';
  }

  function wrapText(text, width) {
    var words = text.split(' ');
    var lines = [];
    var current = '';
    words.forEach(function (w) {
      var trial = (current + ' ' + w).trim();
      if (trial.length > width) {
        if (current) {
          lines.push(current);
        }
        current = w;
      } else {
        current = trial;
      }
    });
    if (current) {
      lines.push(current);
    }
    return lines;
  }

  function renderForum() {
    terminal.innerHTML = '';
    var lines = [];

    if (forumState.view === 'categories') {
      lines.push(border());
      lines.push(padLine('OLT INTERNAL FORUM'));
      lines.push(border());
      INTERNAL_FORUM.forEach(function (cat, i) {
        var marker = i === forumState.catIdx ? '> ' : '  ';
        lines.push(padLine(marker + cat.name));
      });
      lines.push(border());
      lines.push('');
      lines.push('[UP/DOWN] navigate   [ENTER] open   [ESC] exit');
    } else if (forumState.view === 'threads') {
      var cat = INTERNAL_FORUM[forumState.catIdx];
      lines.push(border());
      lines.push(padLine(cat.name));
      lines.push(border());
      cat.threads.forEach(function (t, i) {
        var marker = i === forumState.threadIdx ? '> ' : '  ';
        var tag = '(' + t.messages.length + (t.messages.length === 1 ? ' msg)' : ' msgs)');
        lines.push(padLine(marker + t.title + '  ' + tag));
      });
      lines.push(border());
      lines.push('');
      lines.push('[UP/DOWN] navigate   [ENTER] open   [ESC] back');
    } else if (forumState.view === 'thread') {
      var cat2 = INTERNAL_FORUM[forumState.catIdx];
      var thread = cat2.threads[forumState.threadIdx];
      lines.push(border());
      lines.push(padLine(thread.title));
      lines.push(border());
      thread.messages.forEach(function (m, idx) {
        lines.push(padLine(m.from + '  ' + m.date));
        wrapText(m.text, BOX_WIDTH - 4).forEach(function (wl) {
          lines.push(padLine(wl));
        });
        if (idx < thread.messages.length - 1) {
          lines.push(padLine(''));
        }
      });
      lines.push(border());
      lines.push('');
      lines.push('[ESC] back');
    }

    lines.forEach(function (l) {
      var div = document.createElement('div');
      div.className = 'line';
      div.textContent = l;
      terminal.appendChild(div);
    });
  }

  function forumKeyHandler(e) {
    if (forumState.view === 'categories') {
      if (e.key === 'ArrowUp') {
        forumState.catIdx = (forumState.catIdx - 1 + INTERNAL_FORUM.length) % INTERNAL_FORUM.length;
        renderForum();
      } else if (e.key === 'ArrowDown') {
        forumState.catIdx = (forumState.catIdx + 1) % INTERNAL_FORUM.length;
        renderForum();
      } else if (e.key === 'Enter') {
        forumState.view = 'threads';
        forumState.threadIdx = 0;
        renderForum();
      } else if (e.key === 'Escape') {
        exitForumMode();
      }
    } else if (forumState.view === 'threads') {
      var cat = INTERNAL_FORUM[forumState.catIdx];
      if (e.key === 'ArrowUp') {
        forumState.threadIdx = (forumState.threadIdx - 1 + cat.threads.length) % cat.threads.length;
        renderForum();
      } else if (e.key === 'ArrowDown') {
        forumState.threadIdx = (forumState.threadIdx + 1) % cat.threads.length;
        renderForum();
      } else if (e.key === 'Enter') {
        forumState.view = 'thread';
        renderForum();
      } else if (e.key === 'Escape') {
        forumState.view = 'categories';
        renderForum();
      }
    } else if (forumState.view === 'thread') {
      if (e.key === 'Escape') {
        forumState.view = 'threads';
        renderForum();
      }
    }
    e.preventDefault();
  }

  function enterForumMode() {
    var existingPrompt = terminal.querySelector('.prompt-row');
    if (existingPrompt) {
      existingPrompt.remove();
    }
    forumState = { view: 'categories', catIdx: 0, threadIdx: 0 };
    renderForum();
    document.addEventListener('keydown', forumKeyHandler);
  }

  function exitForumMode() {
    document.removeEventListener('keydown', forumKeyHandler);
    terminal.innerHTML = '';
    printLine('Returning to console...');
    printLine('');
    showPrompt();
  }

  // ---------- BOOT-ПОСЛЕДОВАТЕЛЬНОСТЬ ----------
  var BOOT_LINES = [
    'Initializing kernel modules...',
    'Mounting filesystems... OK',
    'Checking archive integrity... OK',
    'Starting mail daemon (sendmail 5.65)... OK',
    'Loading user database... OK (13 records)',
    'Checking cron table... OK',
    'Establishing internal connection... OK',
    'Verifying session token... OK',
    ''
  ];

  var boot_i = 0;

  function typeLine(text, done) {
    var div = document.createElement('div');
    div.className = 'line dim';
    terminal.appendChild(div);
    var i = 0;
    function step() {
      if (i <= text.length) {
        div.textContent = text.slice(0, i);
        i++;
        setTimeout(step, 8);
      } else if (done) {
        done();
      }
    }
    step();
  }

  function runBoot() {
    if (boot_i >= BOOT_LINES.length) {
      showBanner();
      return;
    }
    var line = BOOT_LINES[boot_i];
    boot_i++;
    if (line === '') {
      printLine('');
      setTimeout(runBoot, 120);
    } else {
      typeLine(line, function () {
        setTimeout(runBoot, 90 + Math.random() * 120);
      });
    }
  }

  function showBanner() {
    printLine('OLT Internal Maintenance Console');
    printLine('Version 1.4');
    printLine('');
    printLine('Type "help" for available commands.');
    printLine('');
    showPrompt();
  }

  // ---------- ПРИГЛАШЕНИЕ / ВВОД ----------
  function showPrompt() {
    var row = document.createElement('div');
    row.className = 'prompt-row';

    var label = document.createElement('span');
    label.className = 'prompt-label';
    label.textContent = '> ';

    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'console-input';
    input.autocomplete = 'off';
    input.spellcheck = false;

    row.appendChild(label);
    row.appendChild(input);
    terminal.appendChild(row);
    input.focus();
    scrollToBottom();

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        handleSubmit(row, input);
      }
    });

    terminal.addEventListener('click', function () {
      input.focus();
    });
  }

  var history = [];
  var historyIndex = -1;

  function handleSubmit(row, input) {
    var raw = input.value;
    input.remove();
    var frozen = document.createElement('span');
    frozen.textContent = raw;
    row.appendChild(frozen);

    if (raw.trim()) {
      history.push(raw);
    }
    historyIndex = history.length;

    var parts = raw.trim().split(/\s+/).filter(Boolean);
    var cmd = parts[0];
    var args = parts.slice(1);

    if (cmd) {
      if (COMMANDS[cmd]) {
        COMMANDS[cmd](args);
      } else {
        printLine('Unknown command: \'' + cmd + '\'. Type \'help\' for available commands.', 'err');
      }
    }

    showPrompt();
  }

  document.addEventListener('keydown', function (e) {
    var input = document.getElementById('console-input');
    if (!input || document.activeElement !== input) return;
    if (e.key === 'ArrowUp') {
      if (historyIndex > 0) {
        historyIndex--;
        input.value = history[historyIndex];
      }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        input.value = history[historyIndex];
      } else {
        historyIndex = history.length;
        input.value = '';
      }
      e.preventDefault();
    }
  });

  runBoot();
})();
