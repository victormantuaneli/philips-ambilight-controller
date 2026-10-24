const halo = document.getElementById('ambilightHalo');
const activeModeDisplay = document.getElementById('activeModeDisplay');
const screenMeta = document.getElementById('screenMeta');
const terminalOutput = document.getElementById('terminalOutput');
const customCmdInput = document.getElementById('customCmdInput');
const btnSendCmd = document.getElementById('btnSendCmd');
const btnClearLogs = document.getElementById('btnClearLogs');
const btnCopyLogs = document.getElementById('btnCopyLogs');
const btnRefreshStatus = document.getElementById('btnRefreshStatus');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const deviceModel = document.getElementById('deviceModel');
const deviceIp = document.getElementById('deviceIp');

const GLOW_PRESETS = {
  'style': { color: 'rgba(99, 102, 241, 0.7)', label: 'Style Selector', meta: 'Quick Picker Active' },
  'osd': { color: 'rgba(56, 189, 248, 0.7)', label: 'Settings OSD', meta: 'Full OSD Menu' },
  'lounge': { color: 'linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(236, 72, 153, 0.8))', label: 'Lounge Light', meta: 'Ambient Mood (Standby)' },
  'off': { color: 'rgba(0, 0, 0, 0.1)', label: 'Ambilight Off', meta: 'Style: 1 (Off)' },
  'video': { color: 'rgba(59, 130, 246, 0.65)', label: 'Follow Video', meta: 'Style: 2' },
  'video-standard': { color: 'rgba(56, 189, 248, 0.7)', label: 'Follow Video', meta: 'Preset: Standard' },
  'video-natural': { color: 'rgba(74, 222, 128, 0.7)', label: 'Follow Video', meta: 'Preset: Natural' },
  'video-vivid': { color: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8), rgba(236, 72, 153, 0.8))', label: 'Follow Video', meta: 'Preset: Vivid' },
  'video-game': { color: 'rgba(245, 158, 11, 0.8)', label: 'Follow Video', meta: 'Preset: Game (Low Latency)' },
  'video-comfort': { color: 'rgba(249, 115, 22, 0.7)', label: 'Follow Video', meta: 'Preset: Comfort' },
  'video-relax': { color: 'rgba(45, 212, 191, 0.7)', label: 'Follow Video', meta: 'Preset: Relax' },
  'audio-colora': { color: 'rgba(234, 179, 8, 0.8)', label: 'Follow Audio', meta: 'Preset: Colora (101)' },
  'audio-lumina': { color: 'linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(236, 72, 153, 0.8))', label: 'Follow Audio', meta: 'Preset: Lumina (102)' },
  'audio-retro': { color: 'rgba(239, 68, 68, 0.8)', label: 'Follow Audio', meta: 'Preset: Retro (105)' },
  'audio-party': { color: 'linear-gradient(135deg, rgba(236, 72, 153, 0.9), rgba(168, 85, 247, 0.9))', label: 'Follow Audio', meta: 'Preset: Party Strobe (110)' },
  'mood-lava': { color: 'linear-gradient(135deg, rgba(239, 68, 68, 0.85), rgba(249, 115, 22, 0.85))', label: 'Lounge Mood', meta: 'Tone: Hot Lava (201)' },
  'mood-water': { color: 'linear-gradient(135deg, rgba(59, 130, 246, 0.85), rgba(6, 182, 212, 0.85))', label: 'Lounge Mood', meta: 'Tone: Deep Water (202)' },
  'mood-nature': { color: 'linear-gradient(135deg, rgba(16, 185, 129, 0.85), rgba(132, 204, 22, 0.85))', label: 'Lounge Mood', meta: 'Tone: Fresh Nature (203)' },
  'mood-sunset': { color: 'linear-gradient(135deg, rgba(245, 158, 11, 0.85), rgba(254, 240, 138, 0.85))', label: 'Lounge Mood', meta: 'Tone: Sunset / ISF (204/207)' }
};

function setVisualPreset(presetKey) {
  const p = GLOW_PRESETS[presetKey];
  if (!p) return;
  halo.style.background = p.color;
  activeModeDisplay.textContent = p.label;
  screenMeta.textContent = p.meta;
}

function getTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
}

function appendLog(cmd, output, elapsedMs, isError = false) {
  const entry = document.createElement('div');
  entry.className = `log-entry ${isError ? 'error' : ''}`;

  const header = document.createElement('div');
  header.className = 'log-header-row';

  const time = document.createElement('span');
  time.className = 'log-time';
  time.textContent = `[${getTimestamp()}]`;

  const cmdSpan = document.createElement('span');
  cmdSpan.className = 'log-cmd';
  cmdSpan.textContent = `$ ${cmd}`;

  const elapsed = document.createElement('span');
  elapsed.className = 'log-elapsed';
  elapsed.textContent = `${elapsedMs}ms`;

  header.appendChild(time);
  header.appendChild(cmdSpan);
  header.appendChild(elapsed);
  entry.appendChild(header);

  if (output && output.length > 0) {
    const outBox = document.createElement('div');
    outBox.className = 'log-output';
    outBox.textContent = output;
    entry.appendChild(outBox);
  } else if (!isError) {
    const outBox = document.createElement('div');
    outBox.className = 'log-output';
    outBox.textContent = '(command executed successfully: no output)';
    outBox.style.color = '#64748b';
    entry.appendChild(outBox);
  }

  terminalOutput.appendChild(entry);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

async function executeCommand(cmd, glowPreset = null) {
  if (!cmd) return;
  if (glowPreset) setVisualPreset(glowPreset);

  try {
    const res = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    });
    const data = await res.json();
    appendLog(cmd, data.output, data.elapsed_ms, !data.success);
  } catch (err) {
    appendLog(cmd, String(err), 0, true);
  }
}

async function fetchStatus() {
  statusText.textContent = 'Checking...';
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.connected) {
      statusIndicator.classList.add('connected');
      statusText.textContent = 'Online';
      deviceModel.textContent = data.model || 'Philips TA7';
      deviceIp.textContent = `${data.ip}:${data.port}`;
      if (data.style) {
        screenMeta.textContent = `Active Style ID: ${data.style}`;
      }
    } else {
      statusIndicator.classList.remove('connected');
      statusText.textContent = 'Offline';
    }
  } catch (err) {
    statusIndicator.classList.remove('connected');
    statusText.textContent = 'Server Disconnected';
  }
}

// Bind all action buttons
document.querySelectorAll('[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => {
    const cmd = btn.getAttribute('data-cmd');
    const glow = btn.getAttribute('data-glow');
    executeCommand(cmd, glow);
  });
});

// Custom command prompt
btnSendCmd.addEventListener('click', () => {
  const cmd = customCmdInput.value.trim();
  if (cmd) {
    executeCommand(cmd);
    customCmdInput.value = '';
  }
});

customCmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    btnSendCmd.click();
  }
});

btnClearLogs.addEventListener('click', () => {
  terminalOutput.innerHTML = '';
  const entry = document.createElement('div');
  entry.className = 'log-entry system';
  entry.innerHTML = `<span class="log-time">[${getTimestamp()}]</span><span class="log-msg">Logs cleared.</span>`;
  terminalOutput.appendChild(entry);
});

btnCopyLogs.addEventListener('click', () => {
  const text = terminalOutput.innerText;
  navigator.clipboard.writeText(text).then(() => {
    btnCopyLogs.textContent = 'Copied!';
    setTimeout(() => { btnCopyLogs.textContent = 'Copy'; }, 1500);
  });
});

btnRefreshStatus.addEventListener('click', fetchStatus);

// Initial status check
fetchStatus();
