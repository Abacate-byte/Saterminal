(function () {
  var username    = localStorage.getItem('sat_username') || '';
  var isAdmin     = localStorage.getItem('root_granted') === 'true';
  var initialized = localStorage.getItem('system_initialized') === 'true';

  var bootScreen    = document.getElementById('boot-screen');
  var chkStorage    = document.getElementById('chk-storage');
  var chkRoot       = document.getElementById('chk-root');
  var bootBtn       = document.getElementById('boot-btn');
  var inputUsername = document.getElementById('input-username');
  var output        = document.getElementById('output');
  var cmdInput      = document.getElementById('cmd-input');
  var promptSymbol  = document.getElementById('prompt-symbol');

  var startTime = Date.now();

  if (initialized && username) {
    bootScreen.classList.add('hidden');
    applyAdminState();
    printWelcome();
  }

  bootBtn.addEventListener('click', function () {
    var uname = inputUsername.value.trim().toLowerCase().replace(/\s+/g, '_');

    if (!uname) {
      alert('BOOT HALTED\n\nYou must enter a username to continue.');
      inputUsername.focus();
      return;
    }
    if (!chkStorage.checked) {
      alert('BOOT HALTED\n\nStorage Access is required.\nCheck [1] Allow Storage Access to continue.');
      return;
    }

    username = uname;
    localStorage.setItem('sat_username', username);

    if (chkRoot.checked) {
      isAdmin = true;
      localStorage.setItem('root_granted', 'true');
    }

    localStorage.setItem('system_initialized', 'true');
    bootScreen.classList.add('hidden');
    applyAdminState();
    printWelcome();
    cmdInput.focus();
  });

  document.addEventListener('keydown', function (e) {
    if (!bootScreen.classList.contains('hidden')) {
      if (e.key === '1') chkStorage.checked = !chkStorage.checked;
      if (e.key === '2') chkRoot.checked    = !chkRoot.checked;
      if (e.key === 'Enter' && document.activeElement !== inputUsername) bootBtn.click();
    }
  });

  function getPrompt() {
    var user = isAdmin ? 'root' : username;
    return user + '@saterminal:~$ ';
  }

  function applyAdminState() {
    updatePrompt();
  }

  function updatePrompt() {
    promptSymbol.textContent = getPrompt();
  }

  function printWelcome() {
    [
      { text: '', cls: 'blank' },
      { text: '  +----------------------------------------------+', cls: 'dim' },
      { text: '  |  SATERMINAL // saturn-6.1.42-amd64           |', cls: 'output' },
      { text: '  +----------------------------------------------+', cls: 'dim' },
      { text: '', cls: 'blank' },
      { text: '  Welcome, ' + username + '.', cls: 'output' },
      { text: '  ' + new Date().toDateString(), cls: 'dim' },
      { text: '  Type "help" to list available commands.', cls: 'dim' },
      { text: '', cls: 'blank' },
    ].forEach(function (l) { appendLine(l.text, l.cls); });
  }

  cmdInput.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var raw = cmdInput.value.trim();
    cmdInput.value = '';
    if (raw === '') return;
    processInput(raw);
    scrollBottom();
  });

  function processInput(raw) {
    var isSudo = raw.toLowerCase().startsWith('sudo ') || raw.toLowerCase() === 'sudo';

    if (isSudo) {
      printCmd(raw);
      appendLine('', 'blank');
      appendLine('  Acess denied! You dont have power here!', 'inverse');
      appendLine('', 'blank');
      return;
    }

    printCmd(raw);
    runCommand(raw.trim(), isAdmin);
    appendLine('', 'blank');
  }

  function runCommand(cmd, effectiveAdmin) {
    var parts = cmd.split(/\s+/);
    var base  = parts[0].toLowerCase();

    if      (base === 'help')    cmdHelp();
    else if (base === 'clear')   output.innerHTML = '';
    else if (base === 'whoami')  appendLine('  ' + (effectiveAdmin ? 'root' : username) + '@saterminal', 'success');
    else if (base === 'sysinfo') cmdSysinfo();
    else if (base === 'date')    appendLine('  ' + new Date().toString(), 'output');
    else if (base === 'banner')  cmdBanner();
    else if (base === 'matrix')  cmdMatrix();
    else if (base === 'calc')    cmdCalc(parts);
    else if (base === 'adm')     cmdAdm();
    else if (base === 'reset')   cmdReset();
    else appendLine('  command not found: "' + cmd + '". type "help" for a list of commands.', 'error');
  }

  function cmdHelp() {
    var entries = [
      ['help',         'Show this reference list.'],
      ['clear',        'Wipe the terminal output.'],
      ['whoami',       'Print current session user.'],
      ['sysinfo',      'Display real hardware and browser info.'],
      ['date',         'Print current system date/time.'],
      ['banner',       'Render ASCII art header.'],
      ['matrix',       'Run Matrix protocol sequence.'],
      ['calc [n] [n]', 'Add two numbers.'],
      ['adm',          'Elevate to administrator.'],
      ['reset',        'Clear all data and return to setup screen.'],
    ];
    appendLine('', 'blank');
    appendLine('  COMMAND REFERENCE', 'success');
    appendLine('  ' + '─'.repeat(44), 'dim');
    entries.forEach(function (e) {
      var sp = ' '.repeat(Math.max(1, 18 - e[0].length));
      appendLine('  ' + e[0] + sp + e[1], 'output');
    });
    appendLine('  ' + '─'.repeat(44), 'dim');
  }

  function cmdSysinfo() {
    var nav = window.navigator;
    var scr = window.screen;
    var ua        = nav.userAgent;
    var platform  = nav.platform || 'unknown';
    var lang      = nav.language || 'unknown';
    var cores     = nav.hardwareConcurrency || 'unknown';
    var touch     = nav.maxTouchPoints > 0 ? 'yes (' + nav.maxTouchPoints + ' points)' : 'no';
    var online    = nav.onLine ? 'yes' : 'no';
    var cookieOk  = nav.cookieEnabled ? 'enabled' : 'disabled';
    var dpr       = window.devicePixelRatio || 1;
    var res       = scr.width + 'x' + scr.height;
    var viewport  = window.innerWidth + 'x' + window.innerHeight;
    var colorBits = scr.colorDepth || 'unknown';
    var tz        = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
    var renderer  = 'unavailable';
    var mem       = nav.deviceMemory ? nav.deviceMemory + ' GB (approx)' : 'unavailable';

    try {
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      }
    } catch (e) {}

    var elapsed  = Math.floor((Date.now() - startTime) / 1000);
    var uptime   = Math.floor(elapsed / 60) + 'm ' + (elapsed % 60) + 's (session)';

    var browser = (function () {
      if (/Edg\//.test(ua))     return 'Microsoft Edge';
      if (/OPR\//.test(ua))     return 'Opera';
      if (/Chrome\//.test(ua))  return 'Chromium-based';
      if (/Firefox\//.test(ua)) return 'Firefox';
      if (/Safari\//.test(ua))  return 'Safari';
      return 'Unknown';
    })();

    appendLine('', 'blank');
    appendLine('  SYSTEM INFORMATION', 'success');
    appendLine('  ' + '─'.repeat(44), 'dim');
    appendLine('  Platform     : ' + platform,                 'output');
    appendLine('  Browser      : ' + browser,                  'output');
    appendLine('  CPU cores    : ' + cores,                    'output');
    appendLine('  Device RAM   : ' + mem,                      'output');
    appendLine('  GPU          : ' + renderer,                 'output');
    appendLine('  Resolution   : ' + res + ' @ ' + dpr + 'x', 'output');
    appendLine('  Viewport     : ' + viewport,                 'output');
    appendLine('  Color depth  : ' + colorBits + '-bit',       'output');
    appendLine('  Language     : ' + lang,                     'output');
    appendLine('  Timezone     : ' + tz,                       'output');
    appendLine('  Cookies      : ' + cookieOk,                 'output');
    appendLine('  Touch        : ' + touch,                    'output');
    appendLine('  Online       : ' + online,                   'output');
    appendLine('  Uptime       : ' + uptime,                   'output');
    appendLine('  ' + '─'.repeat(44), 'dim');
    appendLine('  UA : ' + ua, 'dim');
  }

  function cmdBanner() {
    var art = [
      ' ___  _   _____ ___ ___ __  __ ___ _  _   _   _    ',
      '/ __|| | |_   _| __| _ \\  \\/  |_ _| \\| | /_\\ | |   ',
      '\\__ \\| |__ | | | _||   / |\\/| || || .` |/ _ \\| |__ ',
      '|___/|____||_| |___|_|_\\_|  |_|___|_|\\_/_/ \\_\\____|',
    ];
    appendLine('', 'blank');
    var wrapper = document.createElement('span');
    wrapper.className = 'line';
    var pre = document.createElement('pre');
    pre.textContent = art.join('\n');
    wrapper.appendChild(pre);
    output.appendChild(wrapper);
    appendLine('', 'blank');
    appendLine('  saturn-6.1.42-amd64 // saterminal shell', 'dim');
  }

  function cmdMatrix() {
    var seq = [
      'initializing matrix protocol v4.1...',
      'establishing quantum uplink............[OK]',
      'authenticating agent signature.........[OK]',
      'downloading reality layer: ############ 100%',
      'injecting bytecode into substrate......[OK]',
      '01001110 01100101 01100010 01110101 01101100 01100001',
      '',
      '> PAYLOAD VERIFIED — INTEGRITY NOMINAL',
      '> ENTERING THE MATRIX. FOLLOW THE WHITE RABBIT.',
      '',
      'wake up, neo.',
    ];
    appendLine('', 'blank');
    seq.forEach(function (s) { appendLine('  ' + s, 'matrix-line'); });
  }

  function cmdCalc(parts) {
    if (parts.length < 3) {
      appendLine('  usage: calc [number1] [number2]', 'warn');
      appendLine('  example: calc 12 30', 'dim');
      return;
    }
    var n1 = parseFloat(parts[1]);
    var n2 = parseFloat(parts[2]);
    if (isNaN(n1) || isNaN(n2)) {
      appendLine('  error: invalid operands.', 'error');
      return;
    }
    appendLine('  ' + n1 + ' + ' + n2 + ' = ' + (n1 + n2), 'success');
  }

  function cmdAdm() {
    if (isAdmin) { appendLine('  already running as administrator.', 'warn'); return; }
    isAdmin = true;
    localStorage.setItem('root_granted', 'true');
    updatePrompt();
    appendLine('  [OK] root privileges granted.', 'success');
    appendLine('       all actions are logged.', 'dim');
  }

  function cmdReset() {
    appendLine('  clearing session data...', 'warn');
    appendLine('  redirecting to setup screen...', 'dim');
    setTimeout(function () {
      localStorage.removeItem('system_initialized');
      localStorage.removeItem('root_granted');
      localStorage.removeItem('sat_username');
      location.reload();
    }, 900);
  }

  function printCmd(raw) {
    var line = document.createElement('span');
    line.className = 'line cmd';
    var ps = document.createElement('span');
    ps.style.fontWeight = '700';
    ps.textContent = getPrompt();
    line.appendChild(ps);
    line.appendChild(document.createTextNode(raw));
    output.appendChild(line);
  }

  function appendLine(text, cls) {
    var s = document.createElement('span');
    s.className   = 'line ' + (cls || 'output');
    s.textContent = text;
    output.appendChild(s);
  }

  function scrollBottom() { output.scrollTop = output.scrollHeight; }

  document.addEventListener('click', function () {
    if (bootScreen.classList.contains('hidden')) cmdInput.focus();
  });
})();
