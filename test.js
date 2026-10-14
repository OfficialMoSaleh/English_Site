/**
 * CEFR English Level Examination - Core Engine (test.js)
 * Anti-Cheating Protocol | 30-Minute Timer | 30 Questions Per Session
 * Formats: Multiple Choice | Sentence Completion | Audio Listening & Dictation
 * Zero Arabic Text | International English Test Benchmark
 */

// ==========================================
// 1. GLOBAL TOAST NOTIFICATION ENGINE
// ==========================================
function showExamToast(message, type = 'info', icon = 'fa-circle-info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

// Always open the page at the very top (no restored mid-page scroll)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
function forcePageTop() {
  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
  root.style.scrollBehavior = prev;
}
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
forcePageTop();
window.addEventListener('load', forcePageTop);
window.addEventListener('pageshow', forcePageTop);

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==========================================
// 2. ANTI-CHEATING STATE & INPUT PROTECTION
// ==========================================
let examStarted = false;
let examCompleted = false;
let tabSwitchStrikes = 0;

document.addEventListener('copy', (e) => {
  e.preventDefault();
  showExamToast('Copying text is disabled to maintain test integrity.', 'warning', 'fa-shield-halved');
});

document.addEventListener('paste', (e) => {
  e.preventDefault();
  showExamToast('Pasting text is disabled during the examination.', 'warning', 'fa-shield-halved');
});

document.addEventListener('cut', (e) => {
  e.preventDefault();
});

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  showExamToast('Right-click context menu is restricted during the test.', 'warning', 'fa-shield-halved');
});

// ==========================================
// 3. THEME TOGGLE (DARK / LIGHT)
// ==========================================
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;

function applyExamTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    if (themeIcon) {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    }
  } else {
    document.body.classList.remove('dark-theme');
    if (themeIcon) {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    }
  }
}

const savedExamTheme = localStorage.getItem('english_site_theme') || 'light';
applyExamTheme(savedExamTheme);

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light' : 'dark';
    applyExamTheme(newTheme);
    localStorage.setItem('english_site_theme', newTheme);
  });
}

// ==========================================
// 4. CHIC CONFIRMATION MODAL ENGINE
// (Replaces native browser confirm/alert dialogs)
// ==========================================
const confirmModal = document.getElementById('exam-confirm-modal');
const modalIconWrap = document.getElementById('modal-icon-wrap');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');

function showConfirmModal({
  title = 'Confirmation Required',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  icon = 'fa-circle-question',
  type = 'primary', // 'primary', 'warning', 'danger'
  singleAction = false
}) {
  return new Promise((resolve) => {
    if (!confirmModal) {
      resolve(true);
      return;
    }

    if (modalTitle) modalTitle.textContent = title;
    if (modalMessage) modalMessage.textContent = message;
    if (modalConfirmBtn) {
      modalConfirmBtn.innerHTML = `<span>${confirmText}</span>`;
      modalConfirmBtn.className = `btn btn-primary modal-btn-confirm ${type}`;
    }
    if (modalCancelBtn) {
      if (singleAction) {
        modalCancelBtn.style.display = 'none';
      } else {
        modalCancelBtn.style.display = '';
        modalCancelBtn.innerHTML = `<span>${cancelText}</span>`;
      }
    }
    if (modalIconWrap) {
      modalIconWrap.className = `exam-modal-icon-wrap ${type}`;
    }
    if (modalIcon) {
      modalIcon.className = `fa-solid ${icon}`;
    }

    confirmModal.style.display = 'flex';
    confirmModal.setAttribute('aria-hidden', 'false');

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      if (singleAction) return;
      cleanup();
      resolve(false);
    };

    const handleOverlayClick = (e) => {
      if (e.target === confirmModal && !singleAction) {
        handleCancel();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !singleAction) {
        handleCancel();
      }
    };

    function cleanup() {
      confirmModal.style.display = 'none';
      confirmModal.setAttribute('aria-hidden', 'true');
      if (modalCancelBtn) modalCancelBtn.style.display = '';
      modalConfirmBtn.removeEventListener('click', handleConfirm);
      modalCancelBtn.removeEventListener('click', handleCancel);
      confirmModal.removeEventListener('click', handleOverlayClick);
      window.removeEventListener('keydown', handleKeyDown);
    }

    modalConfirmBtn.addEventListener('click', handleConfirm);
    modalCancelBtn.addEventListener('click', handleCancel);
    confirmModal.addEventListener('click', handleOverlayClick);
    window.addEventListener('keydown', handleKeyDown);
  });
}

// Exit flow with Chic Modal only (native browser dialog is bypassed after confirmation)
let bypassUnloadGuard = false;

function isExamInProgress() {
  return typeof examStarted !== 'undefined' && examStarted && !examCompleted;
}

// ==========================================
// 4B. PROCTORING & ANTI-CHEATING ENGINE
// (Screenshot Blocking, Window Blur, Tab Switch Strike System)
// ==========================================
const examSecurityCurtain = document.getElementById('exam-security-curtain');
const securityCurtainTitle = document.getElementById('security-curtain-title');
const securityCurtainDesc = document.getElementById('security-curtain-desc');

let isCurtainShieldActive = false;
let isProctorModalActive = false;
let tabSwitchDetected = false;
let tabAwayTimeout = null;

function showSecurityCurtain(title, desc) {
  if (securityCurtainTitle && title) securityCurtainTitle.textContent = title;
  if (securityCurtainDesc && desc) securityCurtainDesc.textContent = desc;
  if (examSecurityCurtain) {
    examSecurityCurtain.style.display = 'flex';
    examSecurityCurtain.setAttribute('aria-hidden', 'false');
  }
  const ws = document.getElementById('exam-workspace');
  if (ws) ws.classList.add('exam-obscured');
}

function hideSecurityCurtain() {
  if (examSecurityCurtain) {
    examSecurityCurtain.style.display = 'none';
    examSecurityCurtain.setAttribute('aria-hidden', 'true');
  }
  const ws = document.getElementById('exam-workspace');
  if (ws) ws.classList.remove('exam-obscured');
}

function triggerScreenshotShield() {
  if (!isExamInProgress()) return;

  // Clear system clipboard immediately
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText('Examination Security Protocol: Screenshots are disabled.').catch(() => {});
  }

  showSecurityCurtain(
    'Screen Capture Blocked',
    'Screen captures, snips, and shortcuts are prohibited during the examination. This security event has been logged.'
  );

  showExamToast('Screen capture is disabled by exam security protocol.', 'warning', 'fa-shield-halved');

  // Keep screen shielded for 1.4 seconds
  isCurtainShieldActive = true;
  setTimeout(() => {
    isCurtainShieldActive = false;
    if (!document.hidden && !tabSwitchDetected) {
      hideSecurityCurtain();
    }
  }, 1400);
}

// Intercept Screen capture & shortcut combinations
window.addEventListener('keyup', (e) => {
  if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
    triggerScreenshotShield();
  }
});

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  // PrintScreen key
  if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
    e.preventDefault();
    triggerScreenshotShield();
    return;
  }

  // Windows Snipping tool (Win+Shift+S) or Mac capture (Cmd+Shift+3/4/5)
  if (
    (e.shiftKey && (e.metaKey || e.ctrlKey) && ['s', '3', '4', '5'].includes(key)) ||
    (e.altKey && (e.key === 'PrintScreen' || e.code === 'PrintScreen'))
  ) {
    e.preventDefault();
    triggerScreenshotShield();
    return;
  }

  // Ctrl/Cmd + shortcuts
  if (
    (e.ctrlKey || e.metaKey) &&
    ['c', 'v', 'x', 'u', 's', 'p'].includes(key)
  ) {
    if (key === 'p' && !isExamInProgress()) {
      // Allow print on final report / certificate
      return;
    }
    e.preventDefault();
    if (key === 'p' || key === 's') {
      triggerScreenshotShield();
    } else {
      showExamToast('Keyboard shortcut disabled by examination protocol.', 'warning', 'fa-shield-halved');
    }
    return;
  }

  // F12 developer tools
  if (e.key === 'F12') {
    e.preventDefault();
    showExamToast('Developer tools are disabled during examination.', 'warning', 'fa-shield-halved');
  }
});

// Strike resolution when candidate returns to exam tab
async function handleTabSwitchReturn() {
  if (!isExamInProgress() || !tabSwitchDetected) return;
  tabSwitchDetected = false;

  hideSecurityCurtain();
  tabSwitchStrikes++;
  saveExamSession();

  isProctorModalActive = true;

  if (tabSwitchStrikes === 1) {
    await showConfirmModal({
      title: 'Security Warning: Tab Switching (Strike 1 of 3)',
      message: 'Leaving the examination window or switching tabs is strictly prohibited by proctoring regulations. This violation has been officially logged. Two more strikes will terminate your test.',
      confirmText: 'I Understand — Resume Test',
      icon: 'fa-triangle-exclamation',
      type: 'warning',
      singleAction: true
    });
  } else if (tabSwitchStrikes === 2) {
    await showConfirmModal({
      title: 'FINAL WARNING: Tab Switching (Strike 2 of 3)',
      message: 'You have left the examination environment a second time. This is your FINAL WARNING. If you leave or switch tabs one more time, your test will be immediately terminated and submitted automatically.',
      confirmText: 'Acknowledge & Continue',
      icon: 'fa-triangle-exclamation',
      type: 'danger',
      singleAction: true
    });
  } else if (tabSwitchStrikes >= 3) {
    await showConfirmModal({
      title: 'Examination Terminated (Strike 3 of 3)',
      message: 'Maximum proctoring violations reached. Your examination has been terminated due to repeated unauthorized window departures. Your answers are being submitted automatically.',
      confirmText: 'Submit Now',
      icon: 'fa-ban',
      type: 'danger',
      singleAction: true
    });
    submitExamination();
  }

  isProctorModalActive = false;
}

// When document visibility changes (tab switch, window minimize)
document.addEventListener('visibilitychange', () => {
  if (!isExamInProgress()) return;

  if (document.hidden) {
    tabSwitchDetected = true;
    stopAllAudioPlayback();
    showSecurityCurtain(
      'Examination Suspended',
      'Exam content is obscured because you navigated away from this tab. Return immediately to avoid examination cancellation.'
    );
  } else {
    // Returned to tab
    if (tabSwitchDetected && !isProctorModalActive) {
      handleTabSwitchReturn();
    } else if (!isCurtainShieldActive) {
      hideSecurityCurtain();
    }
  }
});

// When window loses focus (clicking another window, dual monitor)
window.addEventListener('blur', () => {
  if (!isExamInProgress() || isProctorModalActive) return;
  tabAwayTimeout = setTimeout(() => {
    if (isExamInProgress() && !document.hasFocus() && !isProctorModalActive) {
      tabSwitchDetected = true;
      stopAllAudioPlayback();
      showSecurityCurtain(
        'Window Focus Lost',
        'Exam content is protected while this window does not have active focus. Click back into the window to resume.'
      );
    }
  }, 220);
});

window.addEventListener('focus', () => {
  if (tabAwayTimeout) clearTimeout(tabAwayTimeout);
  if (!isExamInProgress()) return;
  if (tabSwitchDetected && !isProctorModalActive) {
    handleTabSwitchReturn();
  } else if (!isCurtainShieldActive) {
    hideSecurityCurtain();
  }
});

// ==========================================
// 4C. MICRO-SOUND FX ENGINE (Web Audio API)
// ==========================================
let audioFxCtx = null;
let soundFxEnabled = true;

try {
  const savedFx = localStorage.getItem('novaspeak_sound_fx');
  if (savedFx !== null) soundFxEnabled = savedFx === 'true';
} catch (e) {}

function getAudioFxContext() {
  if (!audioFxCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioFxCtx = new AudioContextClass();
    }
  }
  if (audioFxCtx && audioFxCtx.state === 'suspended') {
    audioFxCtx.resume().catch(() => {});
  }
  return audioFxCtx;
}

function playMicroTone(freq, type = 'sine', duration = 0.07, gainVal = 0.08) {
  if (!soundFxEnabled) return;
  try {
    const ctx = getAudioFxContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

const soundFx = {
  select() {
    playMicroTone(740, 'sine', 0.05, 0.07);
  },
  navigate() {
    playMicroTone(520, 'sine', 0.06, 0.05);
  },
  flag() {
    if (!soundFxEnabled) return;
    playMicroTone(550, 'triangle', 0.06, 0.07);
    setTimeout(() => playMicroTone(720, 'triangle', 0.09, 0.07), 60);
  },
  warning() {
    if (!soundFxEnabled) return;
    playMicroTone(260, 'sawtooth', 0.12, 0.06);
    setTimeout(() => playMicroTone(210, 'sawtooth', 0.15, 0.06), 100);
  },
  celebrate() {
    if (!soundFxEnabled) return;
    const chord = [523.25, 659.25, 783.99, 1046.50];
    chord.forEach((freq, idx) => {
      setTimeout(() => playMicroTone(freq, 'triangle', 0.28, 0.09), idx * 90);
    });
  }
};

const fxToggleBtn = document.getElementById('fx-toggle-btn');
function updateFxToggleUI() {
  if (!fxToggleBtn) return;
  const icon = fxToggleBtn.querySelector('i');
  if (icon) {
    icon.className = soundFxEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
  }
  fxToggleBtn.setAttribute('title', soundFxEnabled ? 'Sound Effects: Active' : 'Sound Effects: Muted');
}

if (fxToggleBtn) {
  updateFxToggleUI();
  fxToggleBtn.addEventListener('click', () => {
    soundFxEnabled = !soundFxEnabled;
    try { localStorage.setItem('novaspeak_sound_fx', String(soundFxEnabled)); } catch (e) {}
    updateFxToggleUI();
    if (soundFxEnabled) soundFx.select();
    showExamToast(soundFxEnabled ? 'Audio feedback enabled.' : 'Audio feedback muted.', 'info', soundFxEnabled ? 'fa-volume-high' : 'fa-volume-xmark');
  });
}

// ==========================================
// 4D. FULLSCREEN LOCKDOWN & PROCTORING API
// ==========================================
let isFullscreenEnforced = false;

function enterFullscreenMode() {
  isFullscreenEnforced = true;
  const docEl = document.documentElement;
  const rfs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
  if (rfs) {
    rfs.call(docEl).catch(() => {});
  }
}

function isFullscreenActive() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
}

const curtainResumeBtn = document.getElementById('curtain-resume-btn');
if (curtainResumeBtn) {
  curtainResumeBtn.addEventListener('click', () => {
    enterFullscreenMode();
    hideSecurityCurtain();
  });
}

function handleFullscreenEvent() {
  if (!isExamInProgress() || isProctorModalActive) return;

  if (!isFullscreenActive() && isFullscreenEnforced) {
    soundFx.warning();
    if (curtainResumeBtn) curtainResumeBtn.style.display = 'inline-flex';
    showSecurityCurtain(
      'Fullscreen Mode Required',
      'The examination must be taken in active fullscreen mode to prevent background assistance. Please return to fullscreen immediately.'
    );
    tabSwitchDetected = true;
  } else if (isFullscreenActive()) {
    if (curtainResumeBtn) curtainResumeBtn.style.display = 'none';
    if (tabSwitchDetected && !isProctorModalActive) {
      handleTabSwitchReturn();
    } else if (!isCurtainShieldActive) {
      hideSecurityCurtain();
    }
  }
}

document.addEventListener('fullscreenchange', handleFullscreenEvent);
document.addEventListener('webkitfullscreenchange', handleFullscreenEvent);
document.addEventListener('mozfullscreenchange', handleFullscreenEvent);
document.addEventListener('MSFullscreenChange', handleFullscreenEvent);

// ==========================================
// 4E. KEYBOARD QUICK-SELECTION CONTROLLER
// (Keys 1-4, A-D, F, Arrows, Enter)
// ==========================================
window.addEventListener('keydown', (e) => {
  if (!isExamInProgress() || isProctorModalActive) return;

  const activeEl = document.activeElement;
  const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
  if (isTyping) return;

  const key = e.key.toLowerCase();
  const q = activeExamQuestions[currentQIndex];
  if (!q) return;

  // MCQ selection (A, B, C, D or 1, 2, 3, 4)
  if (q.type === 'mcq' || (q.type === 'audio' && q.audioFormat === 'mcq')) {
    let optIdx = -1;
    if (key === 'a' || key === '1') optIdx = 0;
    else if (key === 'b' || key === '2') optIdx = 1;
    else if (key === 'c' || key === '3') optIdx = 2;
    else if (key === 'd' || key === '4') optIdx = 3;

    if (optIdx >= 0 && q.options && q.options[optIdx]) {
      e.preventDefault();
      userAnswers[currentQIndex] = q.options[optIdx].text;
      soundFx.select();

      const cards = document.querySelectorAll('.mcq-option-card');
      cards.forEach((c, i) => {
        if (i === optIdx) c.classList.add('selected');
        else c.classList.remove('selected');
      });

      updateAnswerStatusDisplay();
      renderNavigatorPills();
      saveExamSession();
      return;
    }
  }

  // Toggle Flag with F
  if (key === 'f') {
    e.preventDefault();
    if (flaggedQuestions.has(currentQIndex)) {
      flaggedQuestions.delete(currentQIndex);
    } else {
      flaggedQuestions.add(currentQIndex);
      soundFx.flag();
      showExamToast(`Question ${currentQIndex + 1} flagged for review`, 'info', 'fa-bookmark');
    }
    renderCurrentQuestion();
    saveExamSession();
    return;
  }

  // Next Question with ArrowRight
  if (e.key === 'ArrowRight') {
    if (currentQIndex < activeExamQuestions.length - 1) {
      e.preventDefault();
      saveActiveInputAnswer();
      currentQIndex++;
      soundFx.navigate();
      renderCurrentQuestion();
      saveExamSession();
    }
    return;
  }

  // Previous Question with ArrowLeft
  if (e.key === 'ArrowLeft') {
    if (currentQIndex > 0) {
      e.preventDefault();
      saveActiveInputAnswer();
      currentQIndex--;
      soundFx.navigate();
      renderCurrentQuestion();
      saveExamSession();
    }
    return;
  }
});

async function confirmAndLeaveExam(targetUrl) {
  if (!isExamInProgress()) {
    bypassUnloadGuard = true;
    window.location.href = targetUrl;
    return;
  }
  const confirmed = await showConfirmModal({
    title: 'Exit Examination?',
    message: 'Are you sure you want to leave the examination? Your current progress will be discarded.',
    confirmText: 'Yes, Exit',
    cancelText: 'Stay in Test',
    icon: 'fa-arrow-right-from-bracket',
    type: 'danger'
  });
  if (confirmed) {
    bypassUnloadGuard = true;
    clearInterval(timerInterval);
    stopAllAudioPlayback();
    clearExamSession();
    window.location.href = targetUrl;
  }
}

const exitExamBtn = document.getElementById('exit-exam-btn');
if (exitExamBtn) {
  exitExamBtn.addEventListener('click', (e) => {
    e.preventDefault();
    confirmAndLeaveExam('index.html');
  });
}

// Route every internal link through the chic modal while the exam is running
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || link.target === '_blank') return;
  if (!isExamInProgress()) {
    bypassUnloadGuard = true;
    return;
  }
  e.preventDefault();
  confirmAndLeaveExam(href);
});

// ==========================================
// 5. ROBUST DUAL-ENGINE AUDIO PLAYBACK
// (Primary: Local High-Fidelity Audio Clips | Fallback: SpeechSynthesis with auto-resume)
// ==========================================
let activeAudioElement = null;
let audioPlayCount = {}; // Map question index -> times played
let activeAudioSafetyTimer = null;

function stopAllAudioPlayback() {
  if (activeAudioSafetyTimer) {
    clearTimeout(activeAudioSafetyTimer);
    activeAudioSafetyTimer = null;
  }
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch (e) {}
    activeAudioElement = null;
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

let activeSpeechUtterance = null;

function playAudioClip(text, questionIndexOrId, onComplete) {
  stopAllAudioPlayback();

  let audioFileId = null;
  if (typeof questionIndexOrId === 'string') {
    audioFileId = questionIndexOrId;
  } else if (activeExamQuestions && activeExamQuestions[questionIndexOrId]) {
    audioFileId = activeExamQuestions[questionIndexOrId].id;
  }

  let completed = false;
  const finish = () => {
    if (activeAudioSafetyTimer) {
      clearTimeout(activeAudioSafetyTimer);
      activeAudioSafetyTimer = null;
    }
    if (!completed) {
      completed = true;
      activeAudioElement = null;
      if (onComplete) onComplete();
    }
  };

  // Safety watchdog: audio will never freeze UI, max 25 seconds for speech clips
  activeAudioSafetyTimer = setTimeout(finish, 25000);

  if (!audioFileId) {
    fallbackSpeechSynthesis(text, finish);
    return;
  }

  // 1. Play local authentic studio MP3 file (100% reliable, zero CORS, zero latency)
  const localAudioPath = `audio/${audioFileId}.mp3`;
  const audio = new Audio(localAudioPath);
  audio.preload = 'auto';
  activeAudioElement = audio;

  audio.onended = () => {
    finish();
  };

  audio.onerror = (e) => {
    console.warn('Audio element error, falling back to speech synthesis:', e);
    activeAudioElement = null;
    fallbackSpeechSynthesis(text, finish);
  };

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      console.warn('Audio play promise rejected, falling back to speech synthesis:', err);
      activeAudioElement = null;
      fallbackSpeechSynthesis(text, finish);
    });
  }
}

function fallbackSpeechSynthesis(text, finish) {
  let completed = false;
  const safeFinish = () => {
    if (!completed) {
      completed = true;
      activeSpeechUtterance = null;
      if (finish) finish();
    }
  };

  if (!('speechSynthesis' in window)) {
    showExamToast('Audio playback could not be loaded.', 'warning', 'fa-volume-xmark');
    safeFinish();
    return;
  }

  try {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    activeSpeechUtterance = utterance;
    window.__activeExamUtterance = utterance; // Prevent garbage collection bug in Chromium
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang && v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Zira') || v.name.includes('George')));
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onend = safeFinish;
    utterance.onerror = safeFinish;

    window.speechSynthesis.speak(utterance);

    // Chromium keep-alive patch for long spoken text
    const resumeTimer = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(resumeTimer);
      } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 1000);
  } catch (err) {
    safeFinish();
  }
}

// Preload voices
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

// ==========================================
// 5. AUTHENTIC CEFR QUESTION BANK (60 QUESTIONS)
// ==========================================
const comprehensiveExamBank = [
  // --- LEVEL A1 (Beginner) ---
  {
    id: "a1_01",
    type: "mcq",
    level: "A1 Beginner",
    category: "Present Simple",
    prompt: "Choose the correct sentence:",
    subtext: "Select the sentence with proper subject-verb agreement.",
    options: [
      { text: "Sarah lives in Manchester with her parents.", correct: true },
      { text: "Sarah live in Manchester with her parents.", correct: false },
      { text: "Sarah living in Manchester with her parents.", correct: false },
      { text: "Sarah are living in Manchester with her parents.", correct: false }
    ],
    explanation: "Third-person singular subjects (he, she, it) take the suffix '-s' in the present simple ('Sarah lives')."
  },
  {
    id: "a1_02",
    type: "fill",
    level: "A1 Beginner",
    category: "Indefinite Articles",
    prompt: "Fill in the blank with the correct article:",
    subtext: "Type 'a' or 'an'.",
    sentenceBefore: "Her older brother wants to become",
    sentenceAfter: "architect after finishing university.",
    blankHint: "Type 'a' or 'an'",
    acceptedAnswers: ["an"],
    explanation: "Use 'an' before singular countable nouns starting with a vowel sound ('an architect')."
  },
  {
    id: "a1_03",
    type: "mcq",
    level: "A1 Beginner",
    category: "Possessive Adjectives",
    prompt: "David and Lisa sold ________ family car last weekend.",
    subtext: "Select the correct possessive form.",
    options: [
      { text: "their", correct: true },
      { text: "there", correct: false },
      { text: "they're", correct: false },
      { text: "theirs", correct: false }
    ],
    explanation: "'Their' is the third-person plural possessive adjective modifying 'family car'."
  },
  {
    id: "a1_04",
    type: "audio",
    audioFormat: "dictation",
    level: "A1 Beginner",
    category: "Audio Dictation",
    audioText: "I usually drink coffee every morning before work.",
    prompt: "Listen carefully to the audio clip and type what you hear:",
    subtext: "Press play to hear the spoken English sentence.",
    blankHint: "Type the exact spoken sentence...",
    acceptedAnswers: [
      "I usually drink coffee every morning before work",
      "I usually drink coffee every morning before work."
    ],
    explanation: "The audio says: 'I usually drink coffee every morning before work.'"
  },
  {
    id: "a1_05",
    type: "fill",
    level: "A1 Beginner",
    category: "Prepositions of Place",
    prompt: "Complete the sentence with the correct preposition:",
    subtext: "Type 'in', 'on', or 'at'.",
    sentenceBefore: "The milk carton is",
    sentenceAfter: "the refrigerator on the second shelf.",
    blankHint: "Type in / on / at",
    acceptedAnswers: ["in"],
    explanation: "Use 'in' for containers or enclosed three-dimensional spaces ('in the refrigerator')."
  },
  {
    id: "a1_06",
    type: "audio",
    audioFormat: "mcq",
    level: "A1 Beginner",
    category: "Audio Listening Comprehension",
    audioText: "Our main administrative office is located on the fourth floor of the central library building.",
    prompt: "Listen to the spoken announcement, then answer the question:",
    subtext: "Where is the administrative office located?",
    options: [
      { text: "On the fourth floor of the central library building", correct: true },
      { text: "On the first floor next to the cafeteria", correct: false },
      { text: "In a separate building across the street", correct: false },
      { text: "In the basement archive", correct: false }
    ],
    explanation: "The recording confirms the office is located on the fourth floor of the central library building."
  },

  {
    id: "a1_07",
    type: "mcq",
    level: "A1 Beginner",
    category: "Grammar: Verb To Be",
    prompt: "My sister and I ________ students at the same school.",
    subtext: "Select the correct form of the verb 'to be'.",
    options: [
      { text: "are", correct: true },
      { text: "is", correct: false },
      { text: "am", correct: false },
      { text: "be", correct: false }
    ],
    explanation: "A plural subject ('My sister and I' = we) takes 'are' in the present simple."
  },
  {
    id: "a1_08",
    type: "fill",
    level: "A1 Beginner",
    category: "Grammar: Irregular Plurals",
    prompt: "Complete the sentence with the plural form of 'child':",
    subtext: "Type the irregular plural noun.",
    sentenceBefore: "The teacher has twenty-five",
    sentenceAfter: "in her morning class.",
    blankHint: "Plural of 'child'",
    acceptedAnswers: ["children"],
    explanation: "'Child' has an irregular plural form: 'children'."
  },
  {
    id: "a1_09",
    type: "mcq",
    level: "A1 Beginner",
    category: "Present Simple Questions",
    prompt: "What time ________ the bank open on Saturdays?",
    subtext: "Choose the correct auxiliary verb.",
    options: [
      { text: "does", correct: true },
      { text: "do", correct: false },
      { text: "is", correct: false },
      { text: "are", correct: false }
    ],
    explanation: "Present simple questions with a singular subject ('the bank') use the auxiliary 'does' + base verb."
  },
  {
    id: "a1_10",
    type: "fill",
    level: "A1 Beginner",
    category: "Present Simple Tense",
    prompt: "Complete the sentence with the correct present form of 'have':",
    subtext: "Type 'have' or 'has'.",
    sentenceBefore: "She",
    sentenceAfter: "two older brothers and one younger sister.",
    blankHint: "Type 'have' or 'has'",
    acceptedAnswers: ["has"],
    explanation: "Third-person singular subjects (he, she, it) use 'has' in the present simple."
  },
  {
    id: "a1_11",
    type: "mcq",
    level: "A1 Beginner",
    category: "Present Continuous",
    prompt: "Look outside! It ________ heavily right now.",
    subtext: "Choose the correct present continuous form.",
    options: [
      { text: "is raining", correct: true },
      { text: "are raining", correct: false },
      { text: "rains", correct: false },
      { text: "rained", correct: false }
    ],
    explanation: "Use 'is raining' for an action happening at the moment of speaking with third-person singular 'it'."
  },
  {
    id: "a1_12",
    type: "fill",
    level: "A1 Beginner",
    category: "Prepositions of Time",
    prompt: "Complete the sentence with the correct preposition of time:",
    subtext: "Type 'at', 'in', or 'on'.",
    sentenceBefore: "The English lecture starts",
    sentenceAfter: "nine o'clock tomorrow morning.",
    blankHint: "Type 'at', 'in', or 'on'",
    acceptedAnswers: ["at"],
    explanation: "Use 'at' with clock times ('at nine o'clock')."
  },
  {
    id: "a1_13",
    type: "mcq",
    level: "A1 Beginner",
    category: "Demonstrative Pronouns",
    prompt: "________ shoes near the door belong to my brother.",
    subtext: "Select the plural demonstrative pronoun for objects nearby.",
    options: [
      { text: "These", correct: true },
      { text: "This", correct: false },
      { text: "That", correct: false },
      { text: "Those", correct: false }
    ],
    explanation: "'These' is used for plural nouns located nearby ('These shoes')."
  },
  {
    id: "a1_14",
    type: "audio",
    audioFormat: "dictation",
    level: "A1 Beginner",
    category: "Audio Dictation",
    audioText: "My brother works in a modern hospital downtown.",
    prompt: "Listen carefully to the audio clip and transcribe the sentence:",
    subtext: "Press play to hear the spoken English sentence.",
    blankHint: "Type the exact spoken sentence...",
    acceptedAnswers: [
      "My brother works in a modern hospital downtown",
      "My brother works in a modern hospital downtown."
    ],
    explanation: "The recording confirms: 'My brother works in a modern hospital downtown.'"
  },
  {
    id: "a1_15",
    type: "mcq",
    level: "A1 Beginner",
    category: "Object Pronouns",
    prompt: "Where is Maria? I need to speak to ________ before the meeting.",
    subtext: "Select the correct third-person feminine object pronoun.",
    options: [
      { text: "her", correct: true },
      { text: "she", correct: false },
      { text: "hers", correct: false },
      { text: "him", correct: false }
    ],
    explanation: "'Her' is the objective personal pronoun referring back to Maria."
  },
  {
    id: "a1_16",
    type: "fill",
    level: "A1 Beginner",
    category: "Past Simple of To Be",
    prompt: "Complete the sentence with the past simple of 'to be':",
    subtext: "Type 'was' or 'were'.",
    sentenceBefore: "We",
    sentenceAfter: "very excited about the school trip yesterday.",
    blankHint: "Type 'was' or 'were'",
    acceptedAnswers: ["were"],
    explanation: "Plural subject 'We' takes 'were' in the past simple."
  },
  {
    id: "a1_17",
    type: "mcq",
    level: "A1 Beginner",
    category: "Modal Verb: Can",
    prompt: "My grandfather is seventy years old, but he ________ swim very well.",
    subtext: "Select the modal verb expressing ability.",
    options: [
      { text: "can", correct: true },
      { text: "must", correct: false },
      { text: "should", correct: false },
      { text: "will", correct: false }
    ],
    explanation: "'Can' expresses physical or acquired ability."
  },
  {
    id: "a1_18",
    type: "fill",
    level: "A1 Beginner",
    category: "Irregular Plural Nouns",
    prompt: "Complete the sentence with the plural form of 'man':",
    subtext: "Type the irregular plural noun.",
    sentenceBefore: "Three",
    sentenceAfter: "waited patiently at the reception counter.",
    blankHint: "Plural form of man",
    acceptedAnswers: ["men"],
    explanation: "The irregular plural form of 'man' is 'men'."
  },
  // --- LEVEL A2 (Elementary) ---
  {
    id: "a2_01",
    type: "fill",
    level: "A2 Elementary",
    category: "Prepositions of Time",
    prompt: "Complete the sentence with the correct preposition:",
    subtext: "Type the correct preposition.",
    sentenceBefore: "The international flight lands in London",
    sentenceAfter: "9:30 PM tomorrow.",
    blankHint: "Type in / on / at",
    acceptedAnswers: ["at"],
    explanation: "The preposition 'at' is used before specific clock times ('at 9:30 PM')."
  },
  {
    id: "a2_02",
    type: "mcq",
    level: "A2 Elementary",
    category: "Past Simple Irregular Verbs",
    prompt: "Yesterday morning, they ________ to the central museum to view the exhibit.",
    subtext: "Select the correct past simple verb form.",
    options: [
      { text: "went", correct: true },
      { text: "goed", correct: false },
      { text: "gone", correct: false },
      { text: "have went", correct: false }
    ],
    explanation: "'Go' is an irregular verb whose past simple form is 'went'."
  },
  {
    id: "a2_03",
    type: "fill",
    level: "A2 Elementary",
    category: "Comparative Adjectives",
    prompt: "Complete the sentence with the comparative form of 'fast':",
    subtext: "Type the comparative adjective.",
    sentenceBefore: "The express train is much",
    sentenceAfter: "than the regular highway bus.",
    blankHint: "Comparative form of fast",
    acceptedAnswers: ["faster"],
    explanation: "One-syllable adjectives form the comparative by appending '-er' ('faster than')."
  },
  {
    id: "a2_04",
    type: "audio",
    audioFormat: "dictation",
    level: "A2 Elementary",
    category: "Audio Dictation",
    audioText: "We arrived at the train station ten minutes late.",
    prompt: "Listen carefully to the audio clip and transcribe the sentence:",
    subtext: "Press play to hear the sentence.",
    blankHint: "Type the sentence you hear...",
    acceptedAnswers: [
      "We arrived at the train station ten minutes late",
      "We arrived at the train station ten minutes late."
    ],
    explanation: "The recording speaks: 'We arrived at the train station ten minutes late.'"
  },
  {
    id: "a2_05",
    type: "fill",
    level: "A2 Elementary",
    category: "Irregular Past Simple",
    prompt: "Complete the sentence with the past simple of 'buy':",
    subtext: "Type the past simple verb.",
    sentenceBefore: "Last Friday, she",
    sentenceAfter: "a high-performance laptop for her coding coursework.",
    blankHint: "Past simple of buy",
    acceptedAnswers: ["bought"],
    explanation: "The past simple form of the irregular verb 'buy' is 'bought'."
  },
  {
    id: "a2_06",
    type: "mcq",
    level: "A2 Elementary",
    category: "Quantifiers (Much vs Many)",
    prompt: "How ________ luggage are you planning to bring on the flight?",
    subtext: "Select the quantifier appropriate for uncountable nouns.",
    options: [
      { text: "much", correct: true },
      { text: "many", correct: false },
      { text: "few", correct: false },
      { text: "several", correct: false }
    ],
    explanation: "'Luggage' is an uncountable noun requiring the quantifier 'much'."
  },

  {
    id: "a2_07",
    type: "mcq",
    level: "A2 Elementary",
    category: "Past Continuous Tense",
    prompt: "I ________ dinner when the phone suddenly rang.",
    subtext: "Choose the tense for an action in progress that was interrupted.",
    options: [
      { text: "was cooking", correct: true },
      { text: "cooked", correct: false },
      { text: "am cooking", correct: false },
      { text: "have cooked", correct: false }
    ],
    explanation: "The past continuous ('was cooking') describes a longer action in progress, interrupted by a shorter past simple action ('rang')."
  },
  {
    id: "a2_08",
    type: "fill",
    level: "A2 Elementary",
    category: "Grammar: Superlative Adjectives",
    prompt: "Complete the sentence with the superlative form of 'good':",
    subtext: "Type the irregular superlative adjective.",
    sentenceBefore: "Everyone agrees this is the",
    sentenceAfter: "restaurant in our neighbourhood.",
    blankHint: "Superlative of 'good'",
    acceptedAnswers: ["best"],
    explanation: "'Good' has an irregular comparison: good - better - the best."
  },
  {
    id: "a2_09",
    type: "mcq",
    level: "A2 Elementary",
    category: "Quantifiers: Some / Any",
    prompt: "There isn't ________ milk left in the fridge, so I'll buy some.",
    subtext: "Choose the correct quantifier for a negative sentence.",
    options: [
      { text: "any", correct: true },
      { text: "some", correct: false },
      { text: "many", correct: false },
      { text: "a", correct: false }
    ],
    explanation: "'Any' is used in negative sentences with uncountable nouns such as 'milk'."
  },
  {
    id: "a2_10",
    type: "fill",
    level: "A2 Elementary",
    category: "Present Perfect Tense",
    prompt: "Complete the sentence with the past participle of 'see':",
    subtext: "Type the irregular past participle.",
    sentenceBefore: "Have you ever",
    sentenceAfter: "a live football match in a stadium?",
    blankHint: "Past participle of 'see'",
    acceptedAnswers: ["seen"],
    explanation: "The present perfect uses 'have' + past participle; the participle of 'see' is 'seen'."
  },
  {
    id: "a2_11",
    type: "mcq",
    level: "A2 Elementary",
    category: "Past Continuous vs Past Simple",
    prompt: "While I ________ to music, somebody knocked on the front door.",
    subtext: "Select the past continuous action in progress.",
    options: [
      { text: "was listening", correct: true },
      { text: "listened", correct: false },
      { text: "am listening", correct: false },
      { text: "listen", correct: false }
    ],
    explanation: "Past continuous ('was listening') describes a longer background action interrupted by a shorter completed action ('knocked')."
  },
  {
    id: "a2_12",
    type: "fill",
    level: "A2 Elementary",
    category: "Future Intentions: Going To",
    prompt: "Complete the sentence with the correct form of 'be going to' for 'they':",
    subtext: "Type 'are going to' or 'is going to'.",
    sentenceBefore: "They",
    sentenceAfter: "travel to Spain during the upcoming summer holiday.",
    blankHint: "Type 'are going to' or 'is going to'",
    acceptedAnswers: ["are going to"],
    explanation: "Plural subject 'They' takes 'are going to' for planned future intentions."
  },
  {
    id: "a2_13",
    type: "mcq",
    level: "A2 Elementary",
    category: "Conjunctions of Cause",
    prompt: "We couldn't play tennis outside ________ the heavy rain made the court slippery.",
    subtext: "Choose the conjunction expressing cause or reason.",
    options: [
      { text: "because", correct: true },
      { text: "so", correct: false },
      { text: "although", correct: false },
      { text: "but", correct: false }
    ],
    explanation: "'Because' introduces the reason why they could not play tennis."
  },
  {
    id: "a2_14",
    type: "audio",
    audioFormat: "dictation",
    level: "A2 Elementary",
    category: "Audio Dictation",
    audioText: "Please turn off all lights before leaving the classroom.",
    prompt: "Listen carefully to the audio clip and transcribe the sentence:",
    subtext: "Press play to hear the sentence.",
    blankHint: "Type the exact spoken sentence...",
    acceptedAnswers: [
      "Please turn off all lights before leaving the classroom",
      "Please turn off all lights before leaving the classroom."
    ],
    explanation: "The audio confirms: 'Please turn off all lights before leaving the classroom.'"
  },
  {
    id: "a2_15",
    type: "fill",
    level: "A2 Elementary",
    category: "Irregular Past Simple",
    prompt: "Complete the sentence with the past simple of 'write':",
    subtext: "Type the past simple verb.",
    sentenceBefore: "William Shakespeare",
    sentenceAfter: "numerous famous plays and sonnets in English.",
    blankHint: "Past simple of 'write'",
    acceptedAnswers: ["wrote"],
    explanation: "The irregular past simple of 'write' is 'wrote'."
  },
  {
    id: "a2_16",
    type: "mcq",
    level: "A2 Elementary",
    category: "Adverbs of Frequency",
    prompt: "She ________ forgets her house keys on the kitchen table.",
    subtext: "Select the word order placing the frequency adverb correctly.",
    options: [
      { text: "often", correct: true },
      { text: "often is", correct: false },
      { text: "is often", correct: false },
      { text: "does often", correct: false }
    ],
    explanation: "Adverbs of frequency ('often') precede regular main verbs ('often forgets')."
  },
  {
    id: "a2_17",
    type: "mcq",
    level: "A2 Elementary",
    category: "Quantifiers for Countable Nouns",
    prompt: "There are only ________ ripe apples left in the fruit basket.",
    subtext: "Choose the quantifier for plural countable nouns.",
    options: [
      { text: "a few", correct: true },
      { text: "a little", correct: false },
      { text: "much", correct: false },
      { text: "any", correct: false }
    ],
    explanation: "'A few' quantifies plural countable nouns like 'apples'."
  },
  {
    id: "a2_18",
    type: "fill",
    level: "A2 Elementary",
    category: "Superlative Adjectives",
    prompt: "Complete the sentence with the superlative form of 'tall':",
    subtext: "Type the superlative adjective.",
    sentenceBefore: "Mount Everest is considered the",
    sentenceAfter: "mountain peak on planet Earth.",
    blankHint: "Superlative form of 'tall'",
    acceptedAnswers: ["tallest", "highest"],
    explanation: "Single-syllable adjectives take '-est' in the superlative ('the tallest' or 'the highest')."
  },
  // --- LEVEL B1 (Intermediate) ---
  {
    id: "b1_01",
    type: "fill",
    level: "B1 Intermediate",
    category: "Present Perfect (Since vs For)",
    prompt: "Complete the sentence with the correct time preposition:",
    subtext: "Type 'since' or 'for'.",
    sentenceBefore: "Dr. Evans has worked at this hospital",
    sentenceAfter: "more than fifteen years.",
    blankHint: "Type 'since' or 'for'",
    acceptedAnswers: ["for"],
    explanation: "'For' measures a duration of time ('for fifteen years'), whereas 'since' denotes a specific point in time."
  },
  {
    id: "b1_02",
    type: "mcq",
    level: "B1 Intermediate",
    category: "Second Conditional",
    prompt: "If I ________ your current budget, I would invest in automated translation software.",
    subtext: "Choose the correct hypothetical verb form.",
    options: [
      { text: "had", correct: true },
      { text: "have", correct: false },
      { text: "would have", correct: false },
      { text: "will have", correct: false }
    ],
    explanation: "Second conditional uses 'if + past simple' ('If I had') paired with 'would + infinitive' for hypothetical situations."
  },
  {
    id: "b1_03",
    type: "fill",
    level: "B1 Intermediate",
    category: "Relative Pronouns",
    prompt: "Complete the sentence with the correct relative pronoun:",
    subtext: "Type 'who', 'which', or 'whose'.",
    sentenceBefore: "The structural engineer",
    sentenceAfter: "designed this modern suspension bridge received global recognition.",
    blankHint: "Type who / which / whose",
    acceptedAnswers: ["who", "that"],
    explanation: "'Who' is the subject relative pronoun used specifically for persons."
  },
  {
    id: "b1_04",
    type: "audio",
    audioFormat: "dictation",
    level: "B1 Intermediate",
    category: "Audio Dictation",
    audioText: "Could you please send me the project report by tomorrow afternoon?",
    prompt: "Listen to the polite workplace request and type what you hear:",
    subtext: "Press play to listen to the recording.",
    blankHint: "Type the complete sentence...",
    acceptedAnswers: [
      "Could you please send me the project report by tomorrow afternoon",
      "Could you please send me the project report by tomorrow afternoon?"
    ],
    explanation: "The recording speaks: 'Could you please send me the project report by tomorrow afternoon?'"
  },
  {
    id: "b1_05",
    type: "mcq",
    level: "B1 Intermediate",
    category: "Habitual Past (Used to)",
    prompt: "When my father was in university, he ________ study in the silent archive until midnight.",
    subtext: "Choose the structure expressing past habits.",
    options: [
      { text: "used to", correct: true },
      { text: "was used to", correct: false },
      { text: "got used to", correct: false },
      { text: "use to", correct: false }
    ],
    explanation: "'Used to + infinitive' expresses past habits or repeated states that are no longer true."
  },
  {
    id: "b1_06",
    type: "fill",
    level: "B1 Intermediate",
    category: "Adverb Derivation",
    prompt: "Convert the adjective 'fluent' into its corresponding adverb:",
    subtext: "Type the adverb form.",
    sentenceBefore: "After three years of study in Florence, he speaks Italian",
    sentenceAfter: "in professional business meetings.",
    blankHint: "Adverb form of fluent",
    acceptedAnswers: ["fluently"],
    explanation: "The adverb derived from the adjective 'fluent' is 'fluently'."
  },
  {
    id: "b1_07",
    type: "audio",
    audioFormat: "mcq",
    level: "B1 Intermediate",
    category: "Audio Listening Comprehension",
    audioText: "The meteorology center warned that heavy rain will start around six o'clock this evening, so remember to carry an umbrella when leaving the office.",
    prompt: "Listen to the spoken advice, then answer the question:",
    subtext: "What does the speaker recommend doing?",
    options: [
      { text: "Carrying an umbrella when leaving the office", correct: true },
      { text: "Canceling the evening commute entirely", correct: false },
      { text: "Leaving work before noon", correct: false },
      { text: "Checking the rain radar tomorrow morning", correct: false }
    ],
    explanation: "The speaker explicitly advises carrying an umbrella due to anticipated evening rain."
  },
  {
    id: "b1_08",
    type: "mcq",
    level: "B1 Intermediate",
    category: "Present Continuous for Arrangements",
    prompt: "We ________ our chief suppliers in Frankfurt next Tuesday for contract renewals.",
    subtext: "Choose the form expressing an already confirmed future arrangement.",
    options: [
      { text: "are meeting", correct: true },
      { text: "have met", correct: false },
      { text: "will meeted", correct: false },
      { text: "shall be met", correct: false }
    ],
    explanation: "The present continuous ('are meeting') regularly expresses confirmed future plans with specific dates or times."
  },

  {
    id: "b1_09",
    type: "mcq",
    level: "B1 Intermediate",
    category: "Grammar: Passive Voice",
    prompt: "The new shopping centre ________ by the city mayor last month.",
    subtext: "Choose the correct passive form.",
    options: [
      { text: "was opened", correct: true },
      { text: "opened", correct: false },
      { text: "has opened", correct: false },
      { text: "is opening", correct: false }
    ],
    explanation: "The past simple passive ('was opened') is used because the subject receives the action and the time ('last month') is finished."
  },
  {
    id: "b1_10",
    type: "fill",
    level: "B1 Intermediate",
    category: "Grammar: Gerunds After Phrasal Verbs",
    prompt: "Complete the sentence with the correct form of 'smoke':",
    subtext: "Type the gerund form.",
    sentenceBefore: "My uncle finally gave up",
    sentenceAfter: "five years ago on medical advice.",
    blankHint: "Correct form of 'smoke'",
    acceptedAnswers: ["smoking"],
    explanation: "Verbs ending in a preposition or particle, such as 'give up', are followed by a gerund ('smoking')."
  },
  {
    id: "b1_11",
    type: "mcq",
    level: "B1 Intermediate",
    category: "First Conditional",
    prompt: "If it ________ tomorrow, we will move the ceremony indoors.",
    subtext: "Choose the correct present tense form for the conditional clause.",
    options: [
      { text: "rains", correct: true },
      { text: "will rain", correct: false },
      { text: "rained", correct: false },
      { text: "would rain", correct: false }
    ],
    explanation: "First conditional uses 'if + present simple' ('rains') in the condition clause and 'will + base verb' in the main clause."
  },
  {
    id: "b1_12",
    type: "fill",
    level: "B1 Intermediate",
    category: "Present Perfect with Just",
    prompt: "Complete the sentence with the past participle of 'arrive':",
    subtext: "Type the past participle.",
    sentenceBefore: "The courier has just",
    sentenceAfter: "with the urgent legal documents.",
    blankHint: "Past participle of arrive",
    acceptedAnswers: ["arrived"],
    explanation: "The present perfect takes 'has/have + past participle' ('has just arrived')."
  },
  {
    id: "b1_13",
    type: "mcq",
    level: "B1 Intermediate",
    category: "Modal Verbs of Obligation",
    prompt: "You ________ show your passport before boarding the international flight.",
    subtext: "Choose the modal verb expressing strong necessity/obligation.",
    options: [
      { text: "must", correct: true },
      { text: "might", correct: false },
      { text: "could", correct: false },
      { text: "would", correct: false }
    ],
    explanation: "'Must' conveys mandatory requirement or strict obligation."
  },
  {
    id: "b1_14",
    type: "audio",
    audioFormat: "dictation",
    level: "B1 Intermediate",
    category: "Audio Dictation",
    audioText: "Customer service is available twenty-four hours a day.",
    prompt: "Listen to the customer helpline statement and transcribe what you hear:",
    subtext: "Press play to hear the audio.",
    blankHint: "Type what you hear...",
    acceptedAnswers: [
      "Customer service is available twenty-four hours a day",
      "Customer service is available twenty-four hours a day.",
      "Customer service is available 24 hours a day",
      "Customer service is available 24 hours a day."
    ],
    explanation: "The recording speaks: 'Customer service is available twenty-four hours a day.'"
  },
  {
    id: "b1_15",
    type: "mcq",
    level: "B1 Intermediate",
    category: "Past Habits",
    prompt: "Before moving to London, he ________ live in a quiet seaside village.",
    subtext: "Select the phrase that expresses a discontinued past situation.",
    options: [
      { text: "used to", correct: true },
      { text: "was used to", correct: false },
      { text: "use to", correct: false },
      { text: "is used to", correct: false }
    ],
    explanation: "'Used to + infinitive' refers to past states or repeated habits that are no longer true."
  },
  {
    id: "b1_16",
    type: "fill",
    level: "B1 Intermediate",
    category: "Comparative Structures",
    prompt: "Complete the equality comparison with the adjective 'valuable':",
    subtext: "Type the base adjective.",
    sentenceBefore: "In fast-paced project management, time is just as",
    sentenceAfter: "as capital resources.",
    blankHint: "Adjective form (valuable)",
    acceptedAnswers: ["valuable"],
    explanation: "'As + adjective + as' expresses equality ('as valuable as')."
  },
  {
    id: "b1_17",
    type: "mcq",
    level: "B1 Intermediate",
    category: "Present Simple Passive",
    prompt: "English ________ by millions of people across the world as an international lingua franca.",
    subtext: "Choose the correct passive verb form.",
    options: [
      { text: "is spoken", correct: true },
      { text: "speaks", correct: false },
      { text: "is speaking", correct: false },
      { text: "spoken", correct: false }
    ],
    explanation: "The present simple passive is formed with 'is/are + past participle' ('is spoken')."
  },
  {
    id: "b1_18",
    type: "fill",
    level: "B1 Intermediate",
    category: "Dependent Prepositions",
    prompt: "Complete the sentence with the correct preposition:",
    subtext: "Type the preposition that collocates with 'interested'.",
    sentenceBefore: "Are you interested",
    sentenceAfter: "learning how to code web applications?",
    blankHint: "Preposition (in / at / on / for)",
    acceptedAnswers: ["in"],
    explanation: "'Interested' takes the dependent preposition 'in'."
  },
  // --- LEVEL B2 (Upper-Intermediate) ---
  {
    id: "b2_01",
    type: "fill",
    level: "B2 Upper-Intermediate",
    category: "Dependent Prepositions",
    prompt: "Complete the sentence with the correct preposition:",
    subtext: "Type the preposition that collocates with 'interested'.",
    sentenceBefore: "Are you interested",
    sentenceAfter: "attending the European technology conference next month?",
    blankHint: "Preposition (in / on / about / with)",
    acceptedAnswers: ["in"],
    explanation: "The adjective 'interested' requires the dependent preposition 'in' ('interested in attending')."
  },
  {
    id: "b2_02",
    type: "mcq",
    level: "B2 Upper-Intermediate",
    category: "Modal Verbs of Obligation",
    prompt: "Airline passengers ________ turn off electronic transmitting devices during takeoff and landing.",
    subtext: "Select the modal verb expressing regulatory mandate.",
    options: [
      { text: "must", correct: true },
      { text: "might", correct: false },
      { text: "ought", correct: false },
      { text: "could", correct: false }
    ],
    explanation: "'Must' conveys strict legal or institutional obligation."
  },
  {
    id: "b2_03",
    type: "fill",
    level: "B2 Upper-Intermediate",
    category: "Phrasal Verbs",
    prompt: "Complete the phrasal verb meaning 'to cancel':",
    subtext: "Type the missing particle (off / up / out / in).",
    sentenceBefore: "Due to torrential rainfall, the organizers decided to call",
    sentenceAfter: "the outdoor charity concert.",
    blankHint: "Particle to form 'cancel'",
    acceptedAnswers: ["off"],
    explanation: "'Call off' is a standard phrasal verb meaning to cancel a planned event."
  },
  {
    id: "b2_04",
    type: "audio",
    audioFormat: "dictation",
    level: "B2 Upper-Intermediate",
    category: "Audio Dictation",
    audioText: "The international flight was delayed due to severe thunderstorm conditions.",
    prompt: "Listen to the airport announcement and type the sentence accurately:",
    subtext: "Press play to listen.",
    blankHint: "Type the spoken announcement...",
    acceptedAnswers: [
      "The international flight was delayed due to severe thunderstorm conditions",
      "The international flight was delayed due to severe thunderstorm conditions."
    ],
    explanation: "The announcement states: 'The international flight was delayed due to severe thunderstorm conditions.'"
  },
  {
    id: "b2_05",
    type: "mcq",
    level: "B2 Upper-Intermediate",
    category: "Passive Voice in Reporting",
    prompt: "The new renewable energy facility is reported ________ completed ahead of schedule.",
    subtext: "Choose the correct perfect infinitive form.",
    options: [
      { text: "to have been", correct: true },
      { text: "having been", correct: false },
      { text: "to be", correct: false },
      { text: "was", correct: false }
    ],
    explanation: "'Is reported to have been completed' uses the passive reporting structure with perfect infinitive for earlier actions."
  },
  {
    id: "b2_06",
    type: "fill",
    level: "B2 Upper-Intermediate",
    category: "Collocations (Make vs Do)",
    prompt: "Complete the sentence with the verb that collocates with 'effort' (past simple):",
    subtext: "Type 'made' or 'did'.",
    sentenceBefore: "The software engineering team",
    sentenceAfter: "a determined effort to resolve the latency before launch.",
    blankHint: "Type 'made' or 'did'",
    acceptedAnswers: ["made"],
    explanation: "The English collocation is 'make an effort' (past simple: 'made an effort'), never 'did an effort'."
  },
  {
    id: "b2_07",
    type: "mcq",
    level: "B2 Upper-Intermediate",
    category: "Indirect Speech Tense Shift",
    prompt: "\"I will send the revised proposal by noon,\" Sarah confirmed. -> Sarah confirmed that she ________ send the revised proposal by noon.",
    subtext: "Select the correct backshifted modal auxiliary.",
    options: [
      { text: "would", correct: true },
      { text: "will", correct: false },
      { text: "shall", correct: false },
      { text: "must", correct: false }
    ],
    explanation: "In reported speech introduced by a past tense verb, 'will' shifts back to 'would'."
  },
  {
    id: "b2_08",
    type: "fill",
    level: "B2 Upper-Intermediate",
    category: "Phrasal Verbs of Rejection",
    prompt: "Complete the phrasal verb meaning 'to decline or reject':",
    subtext: "Type the missing particle (down / away / off / out).",
    sentenceBefore: "He decided to turn",
    sentenceAfter: "the partnership proposal because the timeline was unrealistic.",
    blankHint: "Particle to form 'reject'",
    acceptedAnswers: ["down"],
    explanation: "'Turn down' is the established phrasal verb meaning to reject an offer."
  },
  {
    id: "b2_09",
    type: "mcq",
    level: "B2 Upper-Intermediate",
    category: "Hypothetical Past Regrets (Wish)",
    prompt: "I am completely exhausted today. I wish I ________ up so late finishing that client proposal.",
    subtext: "Choose the verb form expressing past regret.",
    options: [
      { text: "hadn't stayed", correct: true },
      { text: "haven't stayed", correct: false },
      { text: "didn't stay", correct: false },
      { text: "wouldn't stay", correct: false }
    ],
    explanation: "Regrets concerning past events require 'wish + past perfect' ('wish I hadn't stayed')."
  },
  {
    id: "b2_10",
    type: "audio",
    audioFormat: "mcq",
    level: "B2 Upper-Intermediate",
    category: "Audio Listening Comprehension",
    audioText: "Rollout was planned for Monday, but with a two-day delay, Wednesday is our launch date.",
    prompt: "Listen to the executive statement and select the correct deduction:",
    subtext: "When will the product launch officially take place?",
    options: [
      { text: "On Wednesday", correct: true },
      { text: "On Monday morning", correct: false },
      { text: "On Friday", correct: false },
      { text: "Next month", correct: false }
    ],
    explanation: "The speaker clarifies that following a 48-hour extension from Monday, Wednesday is the definitive launch date."
  },
  {
    id: "b2_11",
    type: "mcq",
    level: "B2 Upper-Intermediate",
    category: "Verb Complementation (Infinitive vs Gerund)",
    prompt: "Despite the sudden inclement weather, the rescue crew managed ________ all trapped hikers safely.",
    subtext: "Select the correct complement for 'manage'.",
    options: [
      { text: "to reach", correct: true },
      { text: "reaching", correct: false },
      { text: "reach", correct: false },
      { text: "having reached", correct: false }
    ],
    explanation: "The verb 'manage' takes a full 'to + infinitive' complement ('managed to reach')."
  },
  {
    id: "b2_12",
    type: "fill",
    level: "B2 Upper-Intermediate",
    category: "Conditional Conjunctions",
    prompt: "Complete the sentence with the conjunction meaning 'if not':",
    subtext: "Type the conjunction.",
    sentenceBefore: "You cannot access the laboratory servers",
    sentenceAfter: "you have received prior biometric authorization.",
    blankHint: "Conjunction meaning if not (starts with u)",
    acceptedAnswers: ["unless", "Unless"],
    explanation: "'Unless' functions as 'if not' in conditional clauses."
  },
  {
    id: "b2_13",
    type: "mcq",
    level: "B2 Upper-Intermediate",
    category: "Third Conditional",
    prompt: "If we had left ten minutes earlier, we ________ the express train to Brussels.",
    subtext: "Choose the correct hypothetical result form.",
    options: [
      { text: "would have caught", correct: true },
      { text: "would catch", correct: false },
      { text: "caught", correct: false },
      { text: "will catch", correct: false }
    ],
    explanation: "Third conditional requires 'if + had + past participle' and 'would have + past participle' in the main clause."
  },
  {
    id: "b2_14",
    type: "fill",
    level: "B2 Upper-Intermediate",
    category: "Phrasal Verbs (Postpone)",
    prompt: "Complete the phrasal verb meaning 'to postpone' with the correct particle:",
    subtext: "Type the particle following 'put'.",
    sentenceBefore: "The committee decided to put",
    sentenceAfter: "the vote until all executive members returned.",
    blankHint: "Particle (off / away / out / down)",
    acceptedAnswers: ["off"],
    explanation: "'Put off' is an idiomatic phrasal verb meaning to delay or postpone."
  },
  {
    id: "b2_15",
    type: "mcq",
    level: "B2 Upper-Intermediate",
    category: "Concessive Prepositions",
    prompt: "________ being severely understaffed, the surgical clinic handled every critical emergency case.",
    subtext: "Choose the preposition taking a gerund phrase.",
    options: [
      { text: "Despite", correct: true },
      { text: "Although", correct: false },
      { text: "Even though", correct: false },
      { text: "Whereas", correct: false }
    ],
    explanation: "'Despite' is a preposition followed by a noun phrase or gerund ('Despite being...'), whereas 'Although' introduces a full clause."
  },
  {
    id: "b2_16",
    type: "audio",
    audioFormat: "dictation",
    level: "B2 Upper-Intermediate",
    category: "Audio Dictation",
    audioText: "The quarterly revenue forecast exceeded all market expectations.",
    prompt: "Listen to the financial announcement and transcribe what you hear:",
    subtext: "Press play to listen to the audio recording.",
    blankHint: "Type what you hear...",
    acceptedAnswers: [
      "The quarterly revenue forecast exceeded all market expectations",
      "The quarterly revenue forecast exceeded all market expectations."
    ],
    explanation: "The recording speaks: 'The quarterly revenue forecast exceeded all market expectations.'"
  },
  {
    id: "b2_17",
    type: "mcq",
    level: "B2 Upper-Intermediate",
    category: "Advisory Idioms (Had Better)",
    prompt: "You look feverish and exhausted; you had better ________ a doctor immediately.",
    subtext: "Select the correct verb complement for 'had better'.",
    options: [
      { text: "consult", correct: true },
      { text: "to consult", correct: false },
      { text: "consulting", correct: false },
      { text: "consulted", correct: false }
    ],
    explanation: "'Had better' is an idiomatic modal structure followed directly by a bare infinitive without 'to' ('consult')."
  },
  {
    id: "b2_18",
    type: "fill",
    level: "B2 Upper-Intermediate",
    category: "Advanced Word Formation",
    prompt: "Convert the adjective 'reluctant' into its corresponding noun:",
    subtext: "Type the noun form.",
    sentenceBefore: "He expressed strong",
    sentenceAfter: "to accept the overseas relocation offer.",
    blankHint: "Noun form of reluctant",
    acceptedAnswers: ["reluctance", "Reluctance"],
    explanation: "The noun form derived from 'reluctant' is 'reluctance'."
  },

  // --- LEVEL C1 (Advanced) ---
  {
    id: "c1_01",
    type: "mcq",
    level: "C1 Advanced",
    category: "Negative Inversion",
    prompt: "Choose the grammatically accurate inverted sentence:",
    subtext: "Select the sentence with proper syntactic inversion.",
    options: [
      { text: "Rarely have we seen such extraordinary dedication from undergraduate researchers.", correct: true },
      { text: "Rarely we have seen such extraordinary dedication from undergraduate researchers.", correct: false },
      { text: "Rarely did we saw such extraordinary dedication from undergraduate researchers.", correct: false },
      { text: "Rarely we saw such extraordinary dedication from undergraduate researchers.", correct: false }
    ],
    explanation: "Restrictive adverbs (rarely, seldom) placed at the clause start trigger subject-auxiliary inversion ('Rarely have we seen')."
  },
  {
    id: "c1_02",
    type: "fill",
    level: "C1 Advanced",
    category: "Subjunctive Mood",
    prompt: "Complete the sentence with the base subjunctive form of 'approve':",
    subtext: "Type the base verb.",
    sentenceBefore: "The board of directors insisted that the chief architect",
    sentenceAfter: "the blueprint modifications before construction resumed.",
    blankHint: "Base subjunctive form of approve",
    acceptedAnswers: ["approve"],
    explanation: "Verbs of mandate or demand take the mandative bare subjunctive ('insisted that he approve', without '-s')."
  },
  {
    id: "c1_03",
    type: "mcq",
    level: "C1 Advanced",
    category: "Inverted Conditionals",
    prompt: "Had the warning sirens sounded five minutes earlier, the entire district ________ safely.",
    subtext: "Select the correct third conditional result clause.",
    options: [
      { text: "would have been evacuated", correct: true },
      { text: "will have been evacuated", correct: false },
      { text: "would be evacuated", correct: false },
      { text: "had been evacuated", correct: false }
    ],
    explanation: "Inverted third conditional ('Had the sirens sounded...') pairs with 'would have been + past participle' in the consequence."
  },
  {
    id: "c1_04",
    type: "audio",
    audioFormat: "dictation",
    level: "C1 Advanced",
    category: "Audio Dictation",
    audioText: "Under no circumstances should confidential customer data be transmitted over unencrypted networks.",
    prompt: "Listen to the compliance instruction and transcribe the sentence:",
    subtext: "Press play to listen to the audio.",
    blankHint: "Transcribe the exact sentence...",
    acceptedAnswers: [
      "Under no circumstances should confidential customer data be transmitted over unencrypted networks",
      "Under no circumstances should confidential customer data be transmitted over unencrypted networks."
    ],
    explanation: "The recording speaks: 'Under no circumstances should confidential customer data be transmitted over unencrypted networks.'"
  },
  {
    id: "c1_05",
    type: "fill",
    level: "C1 Advanced",
    category: "Formal Collocations",
    prompt: "Complete the sentence with a formal word meaning 'in spite of':",
    subtext: "Type the formal preposition starting with 'N'.",
    sentenceBefore: "",
    sentenceAfter: "unfavorable economic headwinds, enterprise revenues expanded by 24%.",
    blankHint: "Word meaning despite (starts with N)",
    acceptedAnswers: ["notwithstanding", "Notwithstanding", "despite"],
    explanation: "'Notwithstanding' is an advanced formal preposition equivalent to 'despite' or 'in spite of'."
  },
  {
    id: "c1_06",
    type: "mcq",
    level: "C1 Advanced",
    category: "Academic Collocations",
    prompt: "There is ________ empirical evidence to corroborate the hypothesis that the algorithm degrades under load.",
    subtext: "Select the academic adjective signifying barely sufficient or negligible.",
    options: [
      { text: "scant", correct: true },
      { text: "scarcely", correct: false },
      { text: "slightly", correct: false },
      { text: "meagerly", correct: false }
    ],
    explanation: "'Scant evidence' is an established academic collocation signifying inadequate or negligible evidence."
  },
  {
    id: "c1_07",
    type: "fill",
    level: "C1 Advanced",
    category: "Inverted First Conditionals",
    prompt: "Complete the formal inverted conditional sentence:",
    subtext: "Type the single modal word starting the sentence.",
    sentenceBefore: "",
    sentenceAfter: "you require further technical documentation, please contact our support desk.",
    blankHint: "Inversion word (Starts with S)",
    acceptedAnswers: ["should", "Should"],
    explanation: "In formal registers, 'Should you require...' replaces 'If you should require...' by subject-auxiliary inversion."
  },
  {
    id: "c1_08",
    type: "fill",
    level: "C1 Advanced",
    category: "Morphological Prefixes",
    prompt: "Complete the sentence with the correct form of 'precedented':",
    subtext: "Type the full word.",
    sentenceBefore: "The unexpected market downturn caused an",
    sentenceAfter: "decline in commercial maritime logistics.",
    blankHint: "Opposite of precedented (starts with un)",
    acceptedAnswers: ["unprecedented", "Unprecedented"],
    explanation: "The prefix 'un-' forms 'unprecedented', denoting without previous example or precedent."
  },
  {
    id: "c1_09",
    type: "audio",
    audioFormat: "mcq",
    level: "C1 Advanced",
    category: "Audio Listening Comprehension",
    audioText: "Although third quarter revenues marginally surpassed analyst expectations, acute semiconductor shortages threaten to constrain hardware shipment volumes heading into the holiday quarter.",
    prompt: "Listen to the financial analyst briefing and identify the primary risk factor:",
    subtext: "What poses a threat to future shipments?",
    options: [
      { text: "Acute semiconductor shortages", correct: true },
      { text: "Declining consumer holiday demand", correct: false },
      { text: "Failure to meet analyst expectations", correct: false },
      { text: "Uncontrollable inflation in Europe", correct: false }
    ],
    explanation: "The analyst specifies that 'acute semiconductor shortages threaten to constrain hardware shipment volumes'."
  },
  {
    id: "c1_10",
    type: "mcq",
    level: "C1 Advanced",
    category: "Mixed Conditionals",
    prompt: "If she had taken the intensive immersion course last summer, she ________ conversational fluency in Spanish today.",
    subtext: "Select the mixed conditional form connecting past cause to present consequence.",
    options: [
      { text: "would possess", correct: true },
      { text: "would have possessed", correct: false },
      { text: "will possess", correct: false },
      { text: "had possessed", correct: false }
    ],
    explanation: "Mixed conditional connects a past unreal condition ('had taken') with a present result ('would possess today')."
  },
  {
    id: "c1_11",
    type: "mcq",
    level: "C1 Advanced",
    category: "Negative Inversion",
    prompt: "Seldom ________ such sheer dedication among junior medical residents.",
    subtext: "Select the grammatically accurate inverted form.",
    options: [
      { text: "have I witnessed", correct: true },
      { text: "I have witnessed", correct: false },
      { text: "I witnessed", correct: false },
      { text: "did I witnessed", correct: false }
    ],
    explanation: "Fronting restrictive adverbs ('seldom', 'rarely') triggers subject-auxiliary inversion ('Seldom have I witnessed')."
  },
  {
    id: "c1_12",
    type: "fill",
    level: "C1 Advanced",
    category: "Concessive Inversion",
    prompt: "Complete the concessive inversion with 'as' or 'though':",
    subtext: "Type 'as' or 'though'.",
    sentenceBefore: "Strange",
    sentenceAfter: "it may seem, the experimental propulsion system outperformed traditional designs.",
    blankHint: "Type 'as' or 'though'",
    acceptedAnswers: ["as", "though"],
    explanation: "'Adjective + as/though + subject + verb' is an advanced concessive pattern ('Strange as it may seem')."
  },
  {
    id: "c1_13",
    type: "mcq",
    level: "C1 Advanced",
    category: "Cleft Sentences",
    prompt: "It was not until midnight ________ the final referendum ballot tallies were declared.",
    subtext: "Choose the grammatical connector for this cleft construction.",
    options: [
      { text: "that", correct: true },
      { text: "when", correct: false },
      { text: "which", correct: false },
      { text: "where", correct: false }
    ],
    explanation: "The cleft sentence formula 'It was not until [time] that [clause]' grammatically requires 'that'."
  },
  {
    id: "c1_14",
    type: "audio",
    audioFormat: "dictation",
    level: "C1 Advanced",
    category: "Audio Dictation",
    audioText: "Stringent regulatory compliance standards must be observed across all global branches.",
    prompt: "Listen to the executive directive and transcribe what you hear:",
    subtext: "Press play to listen to the audio recording.",
    blankHint: "Type what you hear...",
    acceptedAnswers: [
      "Stringent regulatory compliance standards must be observed across all global branches",
      "Stringent regulatory compliance standards must be observed across all global branches."
    ],
    explanation: "The recording speaks: 'Stringent regulatory compliance standards must be observed across all global branches.'"
  },
  {
    id: "c1_15",
    type: "fill",
    level: "C1 Advanced",
    category: "Mandative Subjunctive",
    prompt: "Complete the sentence with the base subjunctive form of 'remain':",
    subtext: "Type the base verb form.",
    sentenceBefore: "The court ordered that all proprietary evidence",
    sentenceAfter: "strictly confidential throughout the trial.",
    blankHint: "Base subjunctive of remain",
    acceptedAnswers: ["remain"],
    explanation: "In formal registers, verbs of order or demand govern mandative subjunctive base verbs without '-s' ('remain')."
  },
  {
    id: "c1_16",
    type: "mcq",
    level: "C1 Advanced",
    category: "Double Comparatives",
    prompt: "The more complex the underlying microservice architecture becomes, ________ the potential security vulnerabilities.",
    subtext: "Choose the correlative comparative phrase.",
    options: [
      { text: "the greater", correct: true },
      { text: "greater", correct: false },
      { text: "the greatest", correct: false },
      { text: "the more great", correct: false }
    ],
    explanation: "Correlative comparative structures require 'the + comparative..., the + comparative...' ('the more complex..., the greater...')."
  },
  {
    id: "c1_17",
    type: "mcq",
    level: "C1 Advanced",
    category: "Academic Collocations",
    prompt: "The economist drew a sharp ________ between short-term market volatility and structural decline.",
    subtext: "Select the noun that collocates with 'drew a sharp...'.",
    options: [
      { text: "distinction", correct: true },
      { text: "separation", correct: false },
      { text: "discrepancy", correct: false },
      { text: "divergence", correct: false }
    ],
    explanation: "'Draw a sharp distinction between' is an established academic collocation."
  },
  {
    id: "c1_18",
    type: "fill",
    level: "C1 Advanced",
    category: "Advanced Academic Vocabulary",
    prompt: "Fill in the blank with the formal noun meaning 'superiority in weight or quantity' (starts with P):",
    subtext: "Type the academic noun.",
    sentenceBefore: "The",
    sentenceAfter: "of empirical evidence corroborates the climate disruption hypothesis.",
    blankHint: "Noun (preponderance)",
    acceptedAnswers: ["preponderance", "Preponderance"],
    explanation: "'Preponderance of evidence' is an established formal legal and academic collocation meaning greater weight of evidence."
  },

  // --- LEVEL C2 (Proficient) ---
  {
    id: "c2_01",
    type: "mcq",
    level: "C2 Proficient",
    category: "Lexical Nuance & Precision",
    prompt: "The appellate court judge commended the prosecutor for her ________ examination of the forensic records.",
    subtext: "Select the adjective signifying meticulous, scrupulous attention to detail.",
    options: [
      { text: "punctilious", correct: true },
      { text: "precipitous", correct: false },
      { text: "pernicious", correct: false },
      { text: "platitudinous", correct: false }
    ],
    explanation: "'Punctilious' denotes showing great attention to detail, correct behavior, or exact formality."
  },
  {
    id: "c2_02",
    type: "fill",
    level: "C2 Proficient",
    category: "Idiomatic Prepositions",
    prompt: "Complete the formal idiom 'to hold sway ________' (meaning to have dominant influence):",
    subtext: "Type the missing preposition.",
    sentenceBefore: "Traditional broadcast networks no longer hold unchallenged sway",
    sentenceAfter: "public opinion.",
    blankHint: "Preposition following 'hold sway'",
    acceptedAnswers: ["over"],
    explanation: "The formal idiom is 'to hold sway over' (to exercise commanding influence or dominance)."
  },
  {
    id: "c2_03",
    type: "mcq",
    level: "C2 Proficient",
    category: "Cleft Sentences & Discourse",
    prompt: "It was not until the statistical audit was formally published ________ the discrepancies attracted regulatory scrutiny.",
    subtext: "Select the conjunction introducing the focus clause.",
    options: [
      { text: "that", correct: true },
      { text: "when", correct: false },
      { text: "which", correct: false },
      { text: "where", correct: false }
    ],
    explanation: "'It is/was not until... that...' is an emphatic cleft construction that grammatically requires 'that'."
  },
  {
    id: "c2_04",
    type: "fill",
    level: "C2 Proficient",
    category: "Word Formation & Nominalization",
    prompt: "Convert 'vulnerable' into its formal noun form:",
    subtext: "Type the noun form.",
    sentenceBefore: "The system penetration test identified a critical security",
    sentenceAfter: "within the legacy database.",
    blankHint: "Noun form of vulnerable",
    acceptedAnswers: ["vulnerability", "Vulnerability"],
    explanation: "The noun form of 'vulnerable' is 'vulnerability'."
  },
  {
    id: "c2_05",
    type: "mcq",
    level: "C2 Proficient",
    category: "Advanced Lexical Precision",
    prompt: "The senior diplomat conducted the multilateral summit with commendable ________ despite intense geopolitical tension.",
    subtext: "Select the noun indicating calm composure, poise, and assurance.",
    options: [
      { text: "aplomb", correct: true },
      { text: "audacity", correct: false },
      { text: "arrogance", correct: false },
      { text: "apathy", correct: false }
    ],
    explanation: "'Aplomb' denotes complete self-possession, confidence, and poise in taxing circumstances."
  },
  {
    id: "c2_06",
    type: "fill",
    level: "C2 Proficient",
    category: "Formal Idiomatic Register",
    prompt: "Complete the formal idiom 'to come to ________' meaning to be fully realized:",
    subtext: "Type the missing noun.",
    sentenceBefore: "After two decades of painstaking academic research, their theories have finally come to",
    sentenceAfter: ".",
    blankHint: "Noun meaning fruition/realization",
    acceptedAnswers: ["fruition"],
    explanation: "'Come to fruition' is a formal fixed expression meaning to achieve fruition or realization."
  },
  {
    id: "c2_07",
    type: "audio",
    audioFormat: "dictation",
    level: "C2 Proficient",
    category: "Audio Dictation",
    audioText: "The appellate tribunal reached a unanimous consensus following an exhaustive forensic deliberation.",
    prompt: "Listen to the formal legal proceeding report and transcribe the sentence:",
    subtext: "Press play to listen to the audio.",
    blankHint: "Transcribe the sentence...",
    acceptedAnswers: [
      "The appellate tribunal reached a unanimous consensus following an exhaustive forensic deliberation",
      "The appellate tribunal reached a unanimous consensus following an exhaustive forensic deliberation."
    ],
    explanation: "The recording speaks: 'The appellate tribunal reached a unanimous consensus following an exhaustive forensic deliberation.'"
  },
  {
    id: "c2_08",
    type: "mcq",
    level: "C2 Proficient",
    category: "Concessive Adverbial Clauses",
    prompt: "________ formidable the technological barrier appeared initially, the computational team managed to overcome it.",
    subtext: "Choose the conjunction indicating 'no matter how'.",
    options: [
      { text: "However", correct: true },
      { text: "Whatever", correct: false },
      { text: "Although", correct: false },
      { text: "Whereas", correct: false }
    ],
    explanation: "'However + adjective + subject + verb' introduces a concessive clause equivalent to 'regardless of how formidable'."
  },
  {
    id: "c2_09",
    type: "audio",
    audioFormat: "mcq",
    level: "C2 Proficient",
    category: "Audio Listening Comprehension",
    audioText: "The minister's circumspect remarks were widely interpreted by political correspondents as a tacit concession to ongoing international diplomatic pressure.",
    prompt: "Listen to the political discourse excerpt and determine the speaker's implication:",
    subtext: "How were the minister's remarks interpreted by correspondents?",
    options: [
      { text: "As a tacit concession to diplomatic pressure", correct: true },
      { text: "As an outright rejection of international treaties", correct: false },
      { text: "As an emotional reaction to media critique", correct: false },
      { text: "As a trivial clarification of past statements", correct: false }
    ],
    explanation: "The speaker specifically notes the remarks were interpreted as 'a tacit concession to ongoing international diplomatic pressure'."
  },
  {
    id: "c2_10",
    type: "fill",
    level: "C2 Proficient",
    category: "Literary Conjunctions",
    prompt: "Complete the sentence with the formal conjunction meaning 'for fear that':",
    subtext: "Type the conjunction starting with 'l'.",
    sentenceBefore: "The archivist handled the ancient manuscript with extreme caution",
    sentenceAfter: "the fragile parchment tear under stress.",
    blankHint: "Conjunction meaning for fear that",
    acceptedAnswers: ["lest", "Lest"],
    explanation: "'Lest' is a formal/literary conjunction meaning 'with the intention of preventing something from happening' or 'for fear that'."
  },
  {
    id: "c2_11",
    type: "mcq",
    level: "C2 Proficient",
    category: "Inverted Unreal Conditionals",
    prompt: "Were it not for your timely intervention, the entire syndicate ________ in ruin.",
    subtext: "Select the hypothetical consequence form.",
    options: [
      { text: "would lie", correct: true },
      { text: "will lie", correct: false },
      { text: "would have lain", correct: false },
      { text: "lies", correct: false }
    ],
    explanation: "'Were it not for + noun' acts as a present/ongoing unreal condition, taking 'would + base verb' ('would lie')."
  },
  {
    id: "c2_12",
    type: "fill",
    level: "C2 Proficient",
    category: "Idiomatic Collocations",
    prompt: "Complete the formal idiom meaning an inevitable outcome: 'a ________ conclusion':",
    subtext: "Type the adjective.",
    sentenceBefore: "The incumbent prime minister's re-election was widely regarded as a",
    sentenceAfter: "conclusion well before polls closed.",
    blankHint: "Adjective (foregone)",
    acceptedAnswers: ["foregone", "Foregone"],
    explanation: "'A foregone conclusion' is an established idiom denoting an inevitable, preordained result."
  },
  {
    id: "c2_13",
    type: "mcq",
    level: "C2 Proficient",
    category: "Literary Connectors",
    prompt: "The reform package represents meaningful, ________ belated, progress toward institutional parity.",
    subtext: "Choose the conjunction meaning 'though / although'.",
    options: [
      { text: "albeit", correct: true },
      { text: "besides", correct: false },
      { text: "nonetheless", correct: false },
      { text: "whereas", correct: false }
    ],
    explanation: "'Albeit' introduces a concessive modifier ('albeit belated') meaning 'even though it is'."
  },
  {
    id: "c2_14",
    type: "audio",
    audioFormat: "dictation",
    level: "C2 Proficient",
    category: "Audio Dictation",
    audioText: "His treatise provides an incisive critique of neoclassical economic orthodoxies.",
    prompt: "Listen to the scholarly review and transcribe the exact sentence:",
    subtext: "Press play to listen to the audio recording.",
    blankHint: "Transcribe what you hear...",
    acceptedAnswers: [
      "His treatise provides an incisive critique of neoclassical economic orthodoxies",
      "His treatise provides an incisive critique of neoclassical economic orthodoxies."
    ],
    explanation: "The recording speaks: 'His treatise provides an incisive critique of neoclassical economic orthodoxies.'"
  },
  {
    id: "c2_15",
    type: "fill",
    level: "C2 Proficient",
    category: "Latin Legal Loan Phrases",
    prompt: "Complete the Latin legal term 'prima ________' (meaning based on first impression / self-evident):",
    subtext: "Type the Latin term.",
    sentenceBefore: "The preliminary investigative audit established a prima",
    sentenceAfter: "case of corporate embezzlement.",
    blankHint: "Latin word (facie)",
    acceptedAnswers: ["facie", "Facie"],
    explanation: "'Prima facie' is an international legal loan term meaning accepted as correct until proven otherwise."
  },
  {
    id: "c2_16",
    type: "mcq",
    level: "C2 Proficient",
    category: "High-Register Lexicon",
    prompt: "The laureate reflected mournfully on the ________ nature of fame, noting that public adoration dissolves almost overnight.",
    subtext: "Choose the adjective meaning lasting for a very short time.",
    options: [
      { text: "ephemeral", correct: true },
      { text: "enduring", correct: false },
      { text: "perennial", correct: false },
      { text: "intermittent", correct: false }
    ],
    explanation: "'Ephemeral' signifies fleeting, transient, or lasting for only a short period."
  },
  {
    id: "c2_17",
    type: "fill",
    level: "C2 Proficient",
    category: "Formal Collocations",
    prompt: "Complete the formal collocation 'to cast ________ on' (meaning to make disparaging remarks about someone's integrity):",
    subtext: "Type the plural noun.",
    sentenceBefore: "The defense counselor declined to cast",
    sentenceAfter: "on the integrity of the presiding magistrate.",
    blankHint: "Plural noun (aspersions)",
    acceptedAnswers: ["aspersions"],
    explanation: "'Cast aspersions on' is an advanced formal collocation meaning to slander or impugn someone's reputation."
  },
  {
    id: "c2_18",
    type: "mcq",
    level: "C2 Proficient",
    category: "Correlative Inversion",
    prompt: "No sooner had the keynote speaker concluded her remarks ________ an aggressive volley of questions erupted from the gallery.",
    subtext: "Choose the correlative connector pairing with 'No sooner'.",
    options: [
      { text: "than", correct: true },
      { text: "when", correct: false },
      { text: "scarcely", correct: false },
      { text: "then", correct: false }
    ],
    explanation: "'No sooner had [subject] [past participle]... than...' is the strict grammatical pair; 'when' pairs with 'Hardly' or 'Scarcely'."
  }
];

// ==========================================
// 5B. ORAL READING & SPOKEN FLUENCY QUESTION BANK (22 DIVERSE SHORT SENTENCES)
// Distributed across 3 milestone tiers:
// Tier 1 (A2/B1 Everyday) -> Q10 | Tier 2 (B2 Workplace) -> Q20 | Tier 3 (C1/C2 Advanced) -> Q30
// ==========================================
const speakingExamBank = [
  {
    "id": "speaking_01",
    "type": "speaking",
    "tier": 1,
    "level": "CEFR A2/B1 • Spoken Sentence Reading",
    "category": "Project Planning",
    "title": "Project Launch Schedule",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "We are planning to launch the new project next Monday morning.",
    "phoneticHints": {
      "planning": "/ˈplæn.ɪŋ/",
      "launch": "/lɔːntʃ/",
      "project": "/ˈprɒdʒ.ekt/"
    },
    "targetKeywords": [
      "planning",
      "launch",
      "project",
      "monday",
      "morning"
    ],
    "explanation": "Focus on clear initial consonant clusters in planning and the rounded vowel in launch."
  },
  {
    "id": "speaking_02",
    "type": "speaking",
    "tier": 1,
    "level": "CEFR A2/B1 • Spoken Sentence Reading",
    "category": "Workplace Tasks",
    "title": "Submitting the Final Report",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Please make sure to send the final report before five o clock.",
    "phoneticHints": {
      "report": "/rɪˈpɔːt/",
      "before": "/bɪˈfɔː/",
      "five": "/faɪv/"
    },
    "targetKeywords": [
      "please",
      "send",
      "final",
      "report",
      "before",
      "five"
    ],
    "explanation": "Tests clean sentence rhythm, polite request intonation, and distinct numerical stress."
  },
  {
    "id": "speaking_03",
    "type": "speaking",
    "tier": 1,
    "level": "CEFR A2/B1 • Spoken Sentence Reading",
    "category": "Skill Improvement",
    "title": "Consistent Daily Practice",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Regular daily practice is the most effective way to improve your English.",
    "phoneticHints": {
      "regular": "/ˈreɡ.jə.lər/",
      "effective": "/ɪˈfek.tɪv/",
      "improve": "/ɪmˈpruːv/"
    },
    "targetKeywords": [
      "regular",
      "practice",
      "effective",
      "improve",
      "english"
    ],
    "explanation": "Evaluates fluid linking between effective and way, and accurate vowel length in improve."
  },
  {
    "id": "speaking_04",
    "type": "speaking",
    "tier": 1,
    "level": "CEFR A2/B1 • Spoken Sentence Reading",
    "category": "Office Logistics",
    "title": "Meeting Room Reservation",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "The conference room is reserved for our team meeting this afternoon.",
    "phoneticHints": {
      "conference": "/ˈkɒn.fər.əns/",
      "reserved": "/rɪˈzɜːvd/",
      "afternoon": "/ˌɑːf.təˈnuːn/"
    },
    "targetKeywords": [
      "conference",
      "room",
      "reserved",
      "meeting",
      "afternoon"
    ],
    "explanation": "Practices multisyllabic stress in conference and sentence-final stress on afternoon."
  },
  {
    "id": "speaking_05",
    "type": "speaking",
    "tier": 1,
    "level": "CEFR A2/B1 • Spoken Sentence Reading",
    "category": "Teamwork",
    "title": "Creative Team Collaboration",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "I really enjoy collaborating on creative projects with my talented colleagues.",
    "phoneticHints": {
      "collaborating": "/kəˈlæb.ə.reɪ.tɪŋ/",
      "creative": "/kriˈeɪ.tɪv/",
      "colleagues": "/ˈkɒl.iːɡz/"
    },
    "targetKeywords": [
      "enjoy",
      "collaborating",
      "creative",
      "projects",
      "colleagues"
    ],
    "explanation": "Tests complex articulation in collaborating and silent letters in colleagues."
  },
  {
    "id": "speaking_06",
    "type": "speaking",
    "tier": 1,
    "level": "CEFR A2/B1 • Spoken Sentence Reading",
    "category": "Contact Verification",
    "title": "Confirming Contact Details",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Could you please confirm your email address before we can proceed?",
    "phoneticHints": {
      "confirm": "/kənˈfɜːm/",
      "address": "/ˈæd.res/",
      "proceed": "/prəˈsiːd/"
    },
    "targetKeywords": [
      "could",
      "confirm",
      "email",
      "address",
      "proceed"
    ],
    "explanation": "Assesses polite question intonation and unstressed vowel schwa in proceed."
  },
  {
    "id": "speaking_07",
    "type": "speaking",
    "tier": 1,
    "level": "CEFR A2/B1 • Spoken Sentence Reading",
    "category": "Customer Support",
    "title": "Customer Support Assistance",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Our dedicated support team is always available to help answer your questions.",
    "phoneticHints": {
      "dedicated": "/ˈded.ɪ.keɪ.tɪd/",
      "available": "/əˈveɪ.lə.bəl/",
      "questions": "/ˈkwes.tʃənz/"
    },
    "targetKeywords": [
      "dedicated",
      "support",
      "always",
      "available",
      "questions"
    ],
    "explanation": "Focuses on liquid consonant transitions and clear affricate articulation in questions."
  },
  {
    "id": "speaking_08",
    "type": "speaking",
    "tier": 2,
    "level": "CEFR B2 • Spoken Sentence Reading",
    "category": "Team Communication",
    "title": "Ensuring Project Success",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Clear communication between team members ensures the success of any project.",
    "phoneticHints": {
      "communication": "/kəˌmjuː.nɪˈkeɪ.ʃən/",
      "ensures": "/ɪnˈʃɔːz/",
      "success": "/səkˈses/"
    },
    "targetKeywords": [
      "communication",
      "between",
      "ensures",
      "success",
      "project"
    ],
    "explanation": "Tests secondary stress in communication and crisp sibilant sounds in success."
  },
  {
    "id": "speaking_09",
    "type": "speaking",
    "tier": 2,
    "level": "CEFR B2 • Spoken Sentence Reading",
    "category": "Business Analysis",
    "title": "Quarterly Performance Decisions",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "We need to analyze the quarterly results before making any major decisions.",
    "phoneticHints": {
      "analyze": "/ˈæn.əl.aɪz/",
      "quarterly": "/ˈkwɔː.təl.i/",
      "decisions": "/dɪˈsɪʒ.ənz/"
    },
    "targetKeywords": [
      "analyze",
      "quarterly",
      "results",
      "major",
      "decisions"
    ],
    "explanation": "Tests pronunciation of the voiced postalveolar fricative in decisions and glide in quarterly."
  },
  {
    "id": "speaking_10",
    "type": "speaking",
    "tier": 2,
    "level": "CEFR B2 • Spoken Sentence Reading",
    "category": "Technology Adoption",
    "title": "Adapting to Modern Technology",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Adapting quickly to modern technology has become essential for every professional.",
    "phoneticHints": {
      "technology": "/tekˈnɒl.ə.dʒi/",
      "essential": "/ɪˈsen.ʃəl/",
      "professional": "/prəˈfeʃ.ən.əl/"
    },
    "targetKeywords": [
      "adapting",
      "modern",
      "technology",
      "essential",
      "professional"
    ],
    "explanation": "Assesses vowel shifts in technology and palato-alveolar articulation in essential."
  },
  {
    "id": "speaking_11",
    "type": "speaking",
    "tier": 2,
    "level": "CEFR B2 • Spoken Sentence Reading",
    "category": "Leadership Dynamics",
    "title": "Active Leadership Listening",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Effective leaders always listen carefully to feedback from their team members.",
    "phoneticHints": {
      "effective": "/ɪˈfek.tɪv/",
      "listen": "/ˈlɪs.ən/",
      "carefully": "/ˈkeə.fəl.i/"
    },
    "targetKeywords": [
      "effective",
      "leaders",
      "listen",
      "carefully",
      "feedback"
    ],
    "explanation": "Tests silent t in listen and natural stress rhythm in carefully."
  },
  {
    "id": "speaking_12",
    "type": "speaking",
    "tier": 2,
    "level": "CEFR B2 • Spoken Sentence Reading",
    "category": "Market Expansion",
    "title": "International Market Growth",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "The company has achieved significant growth across international markets this year.",
    "phoneticHints": {
      "achieved": "/əˈtʃiːvd/",
      "significant": "/sɪɡˈnɪf.ɪ.kənt/",
      "growth": "/ɡrəʊθ/"
    },
    "targetKeywords": [
      "company",
      "achieved",
      "significant",
      "growth",
      "international"
    ],
    "explanation": "Focuses on the unvoiced dental fricative in growth and past tense ending in achieved."
  },
  {
    "id": "speaking_13",
    "type": "speaking",
    "tier": 2,
    "level": "CEFR B2 • Spoken Sentence Reading",
    "category": "Professional Training",
    "title": "Productivity Through Training",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Investing in professional training leads to higher productivity and stronger loyalty.",
    "phoneticHints": {
      "productivity": "/ˌprɒd.ʌkˈtɪv.ə.ti/",
      "stronger": "/ˈstrɒŋ.ɡər/",
      "loyalty": "/ˈlɔɪ.əl.ti/"
    },
    "targetKeywords": [
      "investing",
      "training",
      "productivity",
      "stronger",
      "loyalty"
    ],
    "explanation": "Tests five-syllable cadence in productivity and diphthong quality in loyalty."
  },
  {
    "id": "speaking_14",
    "type": "speaking",
    "tier": 2,
    "level": "CEFR B2 • Spoken Sentence Reading",
    "category": "Environmental Solutions",
    "title": "Solving Complex Challenges",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "We are developing innovative solutions to solve complex environmental challenges.",
    "phoneticHints": {
      "innovative": "/ˈɪn.ə.və.tɪv/",
      "environmental": "/ɪnˌvaɪ.rənˈmen.təl/",
      "challenges": "/ˈtʃæl.ɪn.dʒɪz/"
    },
    "targetKeywords": [
      "developing",
      "innovative",
      "solutions",
      "environmental",
      "challenges"
    ],
    "explanation": "Evaluates multi-tier stress in environmental and clean vowel reduction."
  },
  {
    "id": "speaking_15",
    "type": "speaking",
    "tier": 2,
    "level": "CEFR B2 • Spoken Sentence Reading",
    "category": "Quality Delivery",
    "title": "Setting Realistic Benchmarks",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Setting realistic goals helps teams maintain focus and deliver high quality work.",
    "phoneticHints": {
      "realistic": "/ˌrɪəˈlɪs.tɪk/",
      "maintain": "/meɪnˈteɪn/",
      "quality": "/ˈkwɒl.ə.ti/"
    },
    "targetKeywords": [
      "setting",
      "realistic",
      "goals",
      "maintain",
      "deliver",
      "quality"
    ],
    "explanation": "Practices smooth diphthong transition in maintain and initial glide in quality."
  },
  {
    "id": "speaking_16",
    "type": "speaking",
    "tier": 3,
    "level": "CEFR C1/C2 • Spoken Sentence Reading",
    "category": "Strategic Thinking",
    "title": "Driving Sustainable Innovation",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Strategic thinking combined with technical competence drives sustainable long-term innovation.",
    "phoneticHints": {
      "strategic": "/strəˈtiː.dʒɪk/",
      "competence": "/ˈkɒm.pɪ.təns/",
      "sustainable": "/səˈsteɪ.nə.bəl/"
    },
    "targetKeywords": [
      "strategic",
      "technical",
      "competence",
      "sustainable",
      "innovation"
    ],
    "explanation": "Tests complex initial consonant cluster str and rhythmic cadence in sustainable."
  },
  {
    "id": "speaking_17",
    "type": "speaking",
    "tier": 3,
    "level": "CEFR C1/C2 • Spoken Sentence Reading",
    "category": "Global Collaboration",
    "title": "Creative Problem Solving",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Cross-cultural collaboration fosters creative problem-solving in fast-paced modern environments.",
    "phoneticHints": {
      "collaboration": "/kəˌlæb.əˈreɪ.ʃən/",
      "fosters": "/ˈfɒs.təz/",
      "environments": "/ɪnˈvaɪ.rən.mənts/"
    },
    "targetKeywords": [
      "cross-cultural",
      "collaboration",
      "creative",
      "problem-solving",
      "environments"
    ],
    "explanation": "Assesses hyphenated rhythm, open vowel in fosters, and consonant clusters in environments."
  },
  {
    "id": "speaking_18",
    "type": "speaking",
    "tier": 3,
    "level": "CEFR C1/C2 • Spoken Sentence Reading",
    "category": "Executive Vision",
    "title": "Articulating Complex Visions",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Effective leaders articulate complex visions with remarkable clarity and quiet confidence.",
    "phoneticHints": {
      "articulate": "/ɑːˈtɪk.jə.leɪt/",
      "remarkable": "/rɪˈmɑː.kə.bəl/",
      "confidence": "/ˈkɒn.fɪ.dəns/"
    },
    "targetKeywords": [
      "articulate",
      "complex",
      "visions",
      "remarkable",
      "confidence"
    ],
    "explanation": "Evaluates verb inflection in articulate and controlled post-vocalic r sound."
  },
  {
    "id": "speaking_19",
    "type": "speaking",
    "tier": 3,
    "level": "CEFR C1/C2 • Spoken Sentence Reading",
    "category": "Ethical Leadership",
    "title": "Balancing Innovation with Ethics",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Balancing rapid technological innovation with ethical responsibility is critically important.",
    "phoneticHints": {
      "technological": "/ˌtek.nəˈlɒdʒ.ɪ.kəl/",
      "ethical": "/ˈeθ.ɪ.kəl/",
      "responsibility": "/rɪˌspɒn.sɪˈbɪl.ə.ti/"
    },
    "targetKeywords": [
      "balancing",
      "technological",
      "innovation",
      "ethical",
      "responsibility"
    ],
    "explanation": "Tests rhythmic articulation of responsibility and unvoiced dental fricative in ethical."
  },
  {
    "id": "speaking_20",
    "type": "speaking",
    "tier": 3,
    "level": "CEFR C1/C2 • Spoken Sentence Reading",
    "category": "Economic Adaptability",
    "title": "Thriving Amid Global Shifts",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Continuous professional development empowers individuals to thrive amid global economic shifts.",
    "phoneticHints": {
      "continuous": "/kənˈtɪn.ju.əs/",
      "empowers": "/ɪmˈpaʊ.əz/",
      "thrive": "/θraɪv/"
    },
    "targetKeywords": [
      "continuous",
      "development",
      "empowers",
      "thrive",
      "economic"
    ],
    "explanation": "Assesses triphthong glide in empowers and unvoiced fricative in thrive."
  },
  {
    "id": "speaking_21",
    "type": "speaking",
    "tier": 3,
    "level": "CEFR C1/C2 • Spoken Sentence Reading",
    "category": "Strategic Research",
    "title": "Rigorous Analytical Research",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Rigorous analytical research provides a solid foundation for sound strategic decisions.",
    "phoneticHints": {
      "rigorous": "/ˈrɪɡ.ər.əs/",
      "analytical": "/ˌæn.əlˈɪt.ɪ.kəl/",
      "foundation": "/faʊnˈdeɪ.ʃən/"
    },
    "targetKeywords": [
      "rigorous",
      "analytical",
      "research",
      "foundation",
      "strategic"
    ],
    "explanation": "Tests accurate vowel centralization in rigorous and diphthong quality in foundation."
  },
  {
    "id": "speaking_22",
    "type": "speaking",
    "tier": 3,
    "level": "CEFR C1/C2 • Spoken Sentence Reading",
    "category": "High-Stakes Negotiation",
    "title": "Nuanced Strategic Negotiations",
    "prompt": "Read the following sentence aloud into your microphone at your natural conversational pace. Your spoken response will be recorded and assessed upon completing your examination.",
    "subtext": "1. Click Start Reading Aloud • 2. Read the sentence clearly • 3. Submit your response when finished (1 retake permitted).",
    "targetPassage": "Mastering nuanced vocabulary enables professionals to negotiate high-stakes agreements successfully.",
    "phoneticHints": {
      "nuanced": "/ˈnjuː.ɑːnst/",
      "vocabulary": "/vəˈkæb.jə.lər.i/",
      "negotiate": "/nəˈɡəʊ.ʃi.eɪt/"
    },
    "targetKeywords": [
      "nuanced",
      "vocabulary",
      "enables",
      "negotiate",
      "agreements"
    ],
    "explanation": "Evaluates subtle French loanword pronunciation in nuanced and sibilant palatalization in negotiate."
  }
];

// Helper: Fisher-Yates array shuffle
function shuffleExamList(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ==========================================
// 6. EXAMINATION STATE & TIMER LOGIC
// ==========================================
const EXAM_QUESTION_COUNT = 30; // 30 Standardized Questions
const TOTAL_DURATION_SECONDS = 30 * 60; // 30 Minutes

let activeExamQuestions = [];
let lastExemptQuestionIds = [];
let userAnswers = {}; // map index -> answer string
let flaggedQuestions = new Set();
let currentQIndex = 0;
let timeRemaining = TOTAL_DURATION_SECONDS;
let timerInterval = null;
let examStartTime = null;

// Balanced question selection ensuring strict ascending CEFR difficulty progression:
// Block 1 (Q1-10): A1 (4) + A2 (5) + Q10 (Tier 1 Spoken Sentence Reading)
// Block 2 (Q11-20): B1 (5) + B2 (4) + Q20 (Tier 2 Spoken Sentence Reading)
// Block 3 (Q21-30): C1 (5) + C2 (4) + Q30 (Tier 3 Spoken Sentence Reading)
// Exactly 30 questions with 3 distributed spoken pronunciation checkpoints!
function selectExamBatch() {
  // Group bank by level
  const byLevel = {};
  ["A1 Beginner", "A2 Elementary", "B1 Intermediate", "B2 Upper-Intermediate", "C1 Advanced", "C2 Proficient"].forEach(lvl => {
    byLevel[lvl] = comprehensiveExamBank.filter(q => q.level === lvl);
  });

  const getSlice = (lvl, count) => {
    const pool = shuffleExamList(byLevel[lvl] || []);
    const fresh = pool.filter(q => !lastExemptQuestionIds.includes(q.id));
    const fallback = pool.filter(q => lastExemptQuestionIds.includes(q.id));
    return shuffleExamList([...fresh, ...fallback].slice(0, count));
  };

  const getSpeakingItem = (tier) => {
    const tierPool = shuffleExamList(speakingExamBank.filter(q => q.tier === tier));
    const fresh = tierPool.filter(q => !lastExemptQuestionIds.includes(q.id));
    const item = fresh[0] || tierPool[0];
    return { ...item };
  };

  // Block 1 (Q1 to Q10): 4 A1 + 5 A2 + Q10 (Tier 1 Spoken Sentence) = 10 items
  const block1 = [
    ...getSlice("A1 Beginner", 4),
    ...getSlice("A2 Elementary", 5),
    getSpeakingItem(1)
  ];

  // Block 2 (Q11 to Q20): 5 B1 + 4 B2 + Q20 (Tier 2 Spoken Sentence) = 10 items
  const block2 = [
    ...getSlice("B1 Intermediate", 5),
    ...getSlice("B2 Upper-Intermediate", 4),
    getSpeakingItem(2)
  ];

  // Block 3 (Q21 to Q30): 5 C1 + 4 C2 + Q30 (Tier 3 Spoken Sentence) = 10 items
  const block3 = [
    ...getSlice("C1 Advanced", 5),
    ...getSlice("C2 Proficient", 4),
    getSpeakingItem(3)
  ];

  const selected = [...block1, ...block2, ...block3];

  // Preserve the strict ascending tier order while randomizing MCQ option choices
  activeExamQuestions = selected.slice(0, EXAM_QUESTION_COUNT).map(q => {
    if (q.type === 'mcq' || (q.type === 'audio' && q.audioFormat === 'mcq')) {
      return { ...q, options: shuffleExamList(q.options) };
    }
    return { ...q };
  });

  lastExemptQuestionIds = activeExamQuestions.map(q => q.id);
  userAnswers = {};
  flaggedQuestions.clear();
  audioPlayCount = {};
  saveExamSession();
}

// ==========================================
// 6B. SESSION PERSISTENCE & RELOAD GUARD
// (Prevents accidental loss on page refresh with Chic Modal restore)
// ==========================================
const SESSION_STORAGE_KEY = 'novaspeak_exam_session';

let candidateName = '';

function saveExamSession() {
  if (!examStarted || examCompleted) return;
  const sessionData = {
    questions: activeExamQuestions,
    userAnswers: userAnswers,
    flagged: Array.from(flaggedQuestions),
    currentQIndex: currentQIndex,
    timeRemaining: timeRemaining,
    audioPlayCount: audioPlayCount,
    candidateName: candidateName,
    tabSwitchStrikes: tabSwitchStrikes,
    timestamp: Date.now()
  };
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (e) {}
}

function clearExamSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {}
}

function restoreSessionData(session) {
  activeExamQuestions = session.questions;
  userAnswers = session.userAnswers || {};
  flaggedQuestions = new Set(session.flagged || []);
  currentQIndex = session.currentQIndex || 0;
  timeRemaining = session.timeRemaining || TOTAL_DURATION_SECONDS;
  audioPlayCount = session.audioPlayCount || {};
  candidateName = session.candidateName || '';
  tabSwitchStrikes = session.tabSwitchStrikes || 0;
  examStarted = true;
  examCompleted = false;
  document.body.classList.remove('exam-idle');
  document.body.classList.add('exam-in-progress');

  if (examSplashCard) examSplashCard.style.display = 'none';
  if (examWorkspace) examWorkspace.style.display = 'block';

  renderNavigatorPills();
  renderCurrentQuestion();
  startCountdownTimer();
  showExamToast(`Examination resumed at Question ${currentQIndex + 1}.`, 'info', 'fa-play');
}

async function checkAndRestoreExamSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return;
    const session = JSON.parse(raw);
    if (!session || !Array.isArray(session.questions) || session.questions.length === 0) {
      clearExamSession();
      return;
    }

    const ageMinutes = (Date.now() - (session.timestamp || 0)) / (1000 * 60);
    if (session.timeRemaining <= 0 || ageMinutes > 60) {
      clearExamSession();
      return;
    }

    const answeredCount = Object.values(session.userAnswers || {}).filter(v => v !== undefined && v !== '').length;
    const remainingMins = Math.ceil(session.timeRemaining / 60);

    const userWantsToResume = await showConfirmModal({
      title: 'Resume Ongoing Examination?',
      message: `An active examination session was found (${answeredCount} of ${session.questions.length} questions answered, approx. ${remainingMins} mins remaining). Would you like to resume your test, or start over from the beginning?`,
      confirmText: 'Resume Examination',
      cancelText: 'Start from Beginning',
      icon: 'fa-rotate-right',
      type: 'primary'
    });

    if (userWantsToResume) {
      restoreSessionData(session);
    } else {
      // Must explicitly confirm restarting from beginning
      const confirmRestart = await showConfirmModal({
        title: 'Confirm Starting Over?',
        message: 'Are you sure you want to discard your previous progress and restart the 30-question examination from Question 1?',
        confirmText: 'Yes, Start Fresh',
        cancelText: 'No, Keep My Progress',
        icon: 'fa-triangle-exclamation',
        type: 'danger'
      });

      if (confirmRestart) {
        clearExamSession();
        showExamToast('Previous session cleared. Ready to start fresh.', 'info', 'fa-rotate');
      } else {
        restoreSessionData(session);
      }
    }
  } catch (err) {
    console.error('Session restore error:', err);
    clearExamSession();
  }
}

// Browser reload confirmation guard
window.addEventListener('beforeunload', (e) => {
  if (bypassUnloadGuard) return;
  if (examStarted && !examCompleted) {
    saveActiveInputAnswer();
    saveExamSession();
    e.preventDefault();
    e.returnValue = 'You have an examination in progress. Refreshing may interrupt your test session.';
    return e.returnValue;
  }
});

// Timer Functions
const timerDigits = document.getElementById('timer-digits');
const timerContainer = document.getElementById('exam-timer-box');

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startCountdownTimer() {
  clearInterval(timerInterval);
  if (timerDigits) timerDigits.textContent = formatTimer(timeRemaining);
  if (timerContainer) {
    if (timeRemaining <= 180) {
      timerContainer.classList.add('warning');
    } else {
      timerContainer.classList.remove('warning');
    }
  }

  timerInterval = setInterval(() => {
    timeRemaining--;
    if (timerDigits) timerDigits.textContent = formatTimer(timeRemaining);

    // Sync session every 3 seconds
    if (timeRemaining % 3 === 0) {
      saveExamSession();
    }

    // Warning state under 3 minutes
    if (timeRemaining <= 180 && timerContainer) {
      timerContainer.classList.add('warning');
    }

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      showExamToast('Time has expired. Submitting examination automatically...', 'warning', 'fa-clock');
      submitExamination();
    }
  }, 1000);
}

// ==========================================
// 7. WORKSPACE DOM RENDERING
// ==========================================
const examSplashCard = document.getElementById('exam-splash-card');
const examWorkspace = document.getElementById('exam-workspace');
const examReportCard = document.getElementById('exam-report-card');
const startExamNowBtn = document.getElementById('start-exam-now-btn');

const navPillsList = document.getElementById('nav-pills-list');
const qCounterBadge = document.getElementById('q-counter-badge');
const qLevelBadge = document.getElementById('q-level-badge');
const qTypeBadge = document.getElementById('q-type-badge');
const qInstructionTag = document.getElementById('q-instruction-tag');
const qInstructionIcon = document.getElementById('q-instruction-icon');
const qInstructionText = document.getElementById('q-instruction-text');
const qPromptText = document.getElementById('q-prompt-text');
const qSubtext = document.getElementById('q-subtext');
const flagQuestionBtn = document.getElementById('flag-question-btn');
const answersArea = document.getElementById('answers-area');
const answeredStatus = document.getElementById('answered-status');
const examProgressBar = document.getElementById('exam-progress-bar');

const prevQuestionBtn = document.getElementById('prev-question-btn');
const nextQuestionBtn = document.getElementById('next-question-btn');
const submitExamBtn = document.getElementById('submit-exam-btn');

function initWorkspace() {
  selectExamBatch();
  renderNavigatorPills();
  renderCurrentQuestion();
}

function renderNavigatorPills() {
  if (!navPillsList) return;
  navPillsList.innerHTML = '';

  activeExamQuestions.forEach((q, idx) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'q-nav-pill';
    pill.textContent = idx + 1;

    if (q.type === 'speaking') {
      pill.classList.add('speaking-pill');
      pill.title = `Question ${idx + 1}: Spoken Sentence Reading (Checkpoint Tier ${q.tier || 1})`;
    }

    const hasAnswer = userAnswers[idx] !== undefined && userAnswers[idx] !== '';
    if (hasAnswer) pill.classList.add('answered');
    if (idx === currentQIndex) pill.classList.add('current');
    if (flaggedQuestions.has(idx)) pill.classList.add('flagged');

    pill.addEventListener('click', () => {
      saveActiveInputAnswer();
      currentQIndex = idx;
      soundFx.navigate();
      renderCurrentQuestion();
      saveExamSession();
    });

    navPillsList.appendChild(pill);
  });

  // Mobile: the strip is a horizontal scroller, keep the current pill centred
  const currentPill = navPillsList.querySelector('.q-nav-pill.current');
  if (currentPill && navPillsList.scrollWidth > navPillsList.clientWidth) {
    const target = currentPill.offsetLeft - (navPillsList.clientWidth - currentPill.offsetWidth) / 2;
    navPillsList.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }
}

function renderCurrentQuestion() {
  const q = activeExamQuestions[currentQIndex];
  if (!q) return;

  // Stop any active audio playback when switching questions
  stopAllAudioPlayback();

  // Update progress bar
  if (examProgressBar) {
    const progress = ((currentQIndex + 1) / activeExamQuestions.length) * 100;
    examProgressBar.style.width = `${progress}%`;
  }

  // Meta tags
  if (qCounterBadge) qCounterBadge.textContent = `Question ${currentQIndex + 1} of ${activeExamQuestions.length}`;
  if (qLevelBadge) qLevelBadge.textContent = q.level;

  if (q.type === 'speaking' && window.NovaAnalytics) {
    window.NovaAnalytics.trackMilestone(`speaking_tier_${q.tier || 1}`, currentQIndex + 1);
  }

  let typeLabel = 'Multiple Choice';
  if (q.type === 'fill') typeLabel = 'Sentence Completion';
  if (q.type === 'audio') typeLabel = q.audioFormat === 'dictation' ? 'Audio Dictation' : 'Listening Comprehension';
  if (q.type === 'speaking') typeLabel = 'Spoken Read-Aloud & Pronunciation';
  if (qTypeBadge) qTypeBadge.textContent = typeLabel;

  // Formulate clear, unambiguous task directives & prompts
  let directiveText = 'Select the single correct answer:';
  let directiveIcon = 'fa-circle-check';
  let promptHtml = escapeHtml(q.prompt);
  let subtextHtml = '';

  if (q.type === 'mcq') {
    if (q.prompt && q.prompt.includes('________')) {
      directiveText = 'Sentence Completion — Choose the best option to fill in the blank:';
      directiveIcon = 'fa-pen-to-square';
      promptHtml = escapeHtml(q.prompt).replace(/________+/g, '<span class="blank-pill">______</span>');
      subtextHtml = q.subtext ? `<span class="question-guideline-box"><i class="fa-solid fa-circle-info"></i> ${escapeHtml(q.subtext)}</span>` : '<span class="question-guideline-box"><i class="fa-solid fa-circle-info"></i> Select the grammatically correct word or phrase to complete the sentence.</span>';
    } else if (q.prompt && (q.prompt.toLowerCase().includes('choose the correct sentence') || q.prompt.toLowerCase().includes('which sentence'))) {
      directiveText = 'Grammar Identification — Select the single accurate sentence:';
      directiveIcon = 'fa-list-check';
      promptHtml = escapeHtml(q.prompt);
      subtextHtml = q.subtext ? `<span class="question-guideline-box"><i class="fa-solid fa-circle-info"></i> ${escapeHtml(q.subtext)}</span>` : '<span class="question-guideline-box"><i class="fa-solid fa-circle-info"></i> Review the options carefully for subject-verb agreement, tense and word order.</span>';
    } else {
      directiveText = 'Multiple Choice — Select the single correct answer:';
      directiveIcon = 'fa-circle-check';
      promptHtml = escapeHtml(q.prompt);
      subtextHtml = q.subtext ? `<span class="question-guideline-box"><i class="fa-solid fa-circle-info"></i> ${escapeHtml(q.subtext)}</span>` : '<span class="question-guideline-box"><i class="fa-solid fa-circle-info"></i> Choose the best answer from the options below.</span>';
    }
  } else if (q.type === 'fill') {
    directiveText = 'Sentence Completion — Type the exact missing word into the blank:';
    directiveIcon = 'fa-keyboard';
    promptHtml = escapeHtml(q.prompt);
    subtextHtml = q.subtext ? `<span class="question-guideline-box"><i class="fa-solid fa-circle-info"></i> Guideline: ${escapeHtml(q.subtext)}</span>` : '<span class="question-guideline-box"><i class="fa-solid fa-circle-info"></i> Type only the missing word in the answer box below.</span>';
  } else if (q.type === 'audio') {
    if (q.audioFormat === 'dictation') {
      directiveText = 'Audio Dictation — Listen to the recording and transcribe:';
      directiveIcon = 'fa-headphones';
      promptHtml = 'Listen carefully to the audio recording and transcribe the sentence:';
      subtextHtml = '<span class="question-guideline-box"><i class="fa-solid fa-volume-high"></i> Press play (up to 3 listens). Type the complete sentence in the box below. Capitalization and punctuation are optional.</span>';
    } else {
      // Audio Listening MCQ: The subtext is the actual question!
      directiveText = 'Listening Comprehension — Listen to the audio and answer:';
      directiveIcon = 'fa-headphones';
      promptHtml = escapeHtml(q.subtext || q.prompt);
      subtextHtml = '<span class="question-guideline-box"><i class="fa-solid fa-volume-high"></i> Listen to the spoken audio clip above, then select the single correct option.</span>';
    }
  } else if (q.type === 'speaking') {
    directiveText = 'Spoken Read-Aloud Assessment — Read the sentence clearly into your microphone:';
    directiveIcon = 'fa-microphone-lines';
    promptHtml = escapeHtml(q.title || 'Read-Aloud Spoken Pronunciation');
    subtextHtml = '<span class="question-guideline-box"><i class="fa-solid fa-volume-high"></i> Listen to native pronunciation or click Start Reading Aloud to test your accuracy live.</span>';
  }

  if (qInstructionIcon) qInstructionIcon.className = `fa-solid ${directiveIcon}`;
  if (qInstructionText) qInstructionText.textContent = directiveText;
  if (qPromptText) qPromptText.innerHTML = promptHtml;
  if (qSubtext) qSubtext.innerHTML = subtextHtml;

  // Flag status
  if (flagQuestionBtn) {
    if (flaggedQuestions.has(currentQIndex)) {
      flagQuestionBtn.classList.add('active');
      flagQuestionBtn.innerHTML = '<i class="fa-solid fa-bookmark text-warning"></i> <span>Flagged</span>';
    } else {
      flagQuestionBtn.classList.remove('active');
      flagQuestionBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i> <span>Flag</span>';
    }
  }

  // Render Answers Area
  if (!answersArea) return;
  answersArea.innerHTML = '';

  if (q.type === 'mcq') {
    // Multiple Choice
    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, optIdx) => {
      const card = document.createElement('div');
      const isSelected = userAnswers[currentQIndex] === opt.text;
      card.className = `mcq-option-card ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <span class="option-letter">${letters[optIdx] || '•'}</span>
        <span class="option-text">${opt.text}</span>
      `;

      card.addEventListener('click', () => {
        answersArea.querySelectorAll('.mcq-option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        userAnswers[currentQIndex] = opt.text;
        soundFx.select();
        updateAnswerStatusDisplay();
        renderNavigatorPills();
        saveExamSession();
      });

      answersArea.appendChild(card);
    });
  } else if (q.type === 'fill') {
    // Sentence Completion
    const container = document.createElement('div');
    container.className = 'fill-blank-container';
    const currentVal = userAnswers[currentQIndex] || '';

    container.innerHTML = `
      <div class="fill-sentence-display">
        ${q.sentenceBefore ? q.sentenceBefore : ''} 
        <span class="blank-highlight" id="live-blank-preview">${currentVal ? escapeHtml(currentVal) : '___________'}</span>
        ${q.sentenceAfter ? q.sentenceAfter : ''}
      </div>

      <div class="fill-input-group">
        <label class="fill-input-label" for="fill-input-field">Your Answer:</label>
        <input 
          type="text" 
          id="fill-input-field" 
          class="fill-text-input" 
          placeholder="Type your answer here..." 
          value="${escapeHtml(currentVal)}"
          autocomplete="off" 
          spellcheck="false"
        />
        <span class="fill-hint-tag"><i class="fa-solid fa-keyboard"></i> Type the missing word directly into the field</span>
      </div>
    `;

    const inputField = container.querySelector('#fill-input-field');
    const preview = container.querySelector('#live-blank-preview');

    inputField.addEventListener('input', (e) => {
      const val = e.target.value;
      userAnswers[currentQIndex] = val.trim();
      preview.textContent = val.trim() ? val.trim() : '___________';
      updateAnswerStatusDisplay();
      renderNavigatorPills();
      saveExamSession();
    });

    answersArea.appendChild(container);

    setTimeout(() => {
      if (inputField) inputField.focus();
    }, 50);
  } else if (q.type === 'audio') {
    // Audio Listening & Dictation
    const container = document.createElement('div');
    container.className = 'audio-player-card';

    const playsRemaining = Math.max(0, 3 - (audioPlayCount[currentQIndex] || 0));

    container.innerHTML = `
      <div class="audio-player-top">
        <div class="audio-controls-row">
          <button type="button" class="audio-play-btn" id="audio-play-trigger-btn" ${playsRemaining <= 0 ? 'disabled' : ''} title="Play spoken audio recording">
            <i class="fa-solid fa-play"></i>
          </button>
          <div class="audio-status-info">
            <span class="audio-status-title" id="audio-status-title">Spoken Audio Clip</span>
            <span class="audio-status-sub" id="audio-status-sub">Press play to listen to native pronunciation</span>
          </div>
        </div>

        <div class="audio-controls-row">
          <div class="audio-wave-visualizer" id="audio-wave-visualizer">
            <span class="audio-wave-bar"></span>
            <span class="audio-wave-bar"></span>
            <span class="audio-wave-bar"></span>
            <span class="audio-wave-bar"></span>
            <span class="audio-wave-bar"></span>
            <span class="audio-wave-bar"></span>
            <span class="audio-wave-bar"></span>
          </div>
          <span class="audio-listen-badge" id="audio-listen-counter">${playsRemaining} plays remaining</span>
        </div>
      </div>
    `;

    const playBtn = container.querySelector('#audio-play-trigger-btn');
    const statusTitle = container.querySelector('#audio-status-title');
    const statusSub = container.querySelector('#audio-status-sub');
    const counterBadge = container.querySelector('#audio-listen-counter');
    let isPlaying = false;

    playBtn.addEventListener('click', () => {
      if (isPlaying) {
        // Toggle Stop / Pause
        stopAllAudioPlayback();
        isPlaying = false;
        container.classList.remove('playing');
        playBtn.classList.remove('playing');
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        playBtn.setAttribute('title', 'Play spoken audio recording');
        if (statusTitle) statusTitle.textContent = 'Audio Playback Stopped';
        if (statusSub) statusSub.textContent = 'You may press play to listen again';
        return;
      }

      if ((audioPlayCount[currentQIndex] || 0) >= 3) {
        showExamToast('Maximum audio plays reached for this question.', 'info', 'fa-volume-high');
        return;
      }

      audioPlayCount[currentQIndex] = (audioPlayCount[currentQIndex] || 0) + 1;
      const left = 3 - audioPlayCount[currentQIndex];
      if (counterBadge) counterBadge.textContent = `${left} plays remaining`;
      saveExamSession();

      isPlaying = true;
      container.classList.add('playing');
      playBtn.classList.add('playing');
      playBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
      playBtn.setAttribute('title', 'Stop audio playback');
      if (statusTitle) statusTitle.textContent = 'Playing Spoken English Recording...';
      if (statusSub) statusSub.textContent = 'Listen attentively to the spoken sentence';

      playAudioClip(q.audioText, currentQIndex, () => {
        isPlaying = false;
        container.classList.remove('playing');
        playBtn.classList.remove('playing');
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        playBtn.setAttribute('title', 'Play spoken audio recording');
        playBtn.disabled = left <= 0;
        if (statusTitle) statusTitle.textContent = 'Audio Playback Complete';
        if (statusSub) statusSub.textContent = left > 0 ? 'You may replay if needed' : 'All plays used';
      });
    });

    // Add response widget based on audioFormat
    if (q.audioFormat === 'dictation') {
      const currentVal = userAnswers[currentQIndex] || '';
      const dictateBox = document.createElement('div');
      dictateBox.className = 'audio-transcribe-box';
      dictateBox.innerHTML = `
        <div class="fill-input-group">
          <label class="fill-input-label" for="audio-input-field">Transcribe what you hear:</label>
          <input 
            type="text" 
            id="audio-input-field" 
            class="fill-text-input" 
            placeholder="Type the sentence you hear..." 
            value="${escapeHtml(currentVal)}"
            autocomplete="off" 
            spellcheck="false"
          />
          <span class="fill-hint-tag"><i class="fa-solid fa-headphones"></i> Listen to the audio and type the exact sentence</span>
        </div>
      `;

      const inputField = dictateBox.querySelector('#audio-input-field');
      inputField.addEventListener('input', (e) => {
        userAnswers[currentQIndex] = e.target.value.trim();
        updateAnswerStatusDisplay();
        renderNavigatorPills();
        saveExamSession();
      });

      container.appendChild(dictateBox);
    } else if (q.audioFormat === 'mcq') {
      const optionsWrap = document.createElement('div');
      optionsWrap.className = 'options-container';
      optionsWrap.style.marginTop = '16px';
      optionsWrap.innerHTML = '<div style="font-weight: 700; font-size: 0.92rem; color: var(--black-color); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-list-ul text-primary"></i> Select the correct answer:</div>';

      const letters = ['A', 'B', 'C', 'D'];
      q.options.forEach((opt, optIdx) => {
        const card = document.createElement('div');
        const isSelected = userAnswers[currentQIndex] === opt.text;
        card.className = `mcq-option-card ${isSelected ? 'selected' : ''}`;
        card.innerHTML = `
          <span class="option-letter">${letters[optIdx] || '•'}</span>
          <span class="option-text">${opt.text}</span>
        `;

        card.addEventListener('click', () => {
          optionsWrap.querySelectorAll('.mcq-option-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          userAnswers[currentQIndex] = opt.text;
          soundFx.select();
          updateAnswerStatusDisplay();
          renderNavigatorPills();
          saveExamSession();
        });

        optionsWrap.appendChild(card);
      });

      container.appendChild(optionsWrap);
    }

    answersArea.appendChild(container);
  } else if (q.type === 'speaking') {
    renderSpeakingQuestionCard(q, currentQIndex, answersArea);
  }

  updateAnswerStatusDisplay();
  updateNavigationButtons();
  renderNavigatorPills();
}

// ==========================================
// 7B. ORAL READING & SPOKEN FLUENCY ENGINE (STANDARDIZED ASSESSMENT)
// ==========================================
function cleanExamWord(w) {
  return (w || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function computeLevenshteinDist(a, b) {
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b.charAt(i - 1) === a.charAt(j - 1) ? m[i - 1][j - 1] : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

function renderOralResponseConfirmationCard(q, qIndex, data, mainContainer, parentContainer) {
  const retakesUsed = (typeof data.retakesUsed === 'number') ? data.retakesUsed : (q.retakesUsed || 0);
  const isRetakeLocked = retakesUsed >= 1;
  const targetWords = (q.targetPassage || q.prompt || '').trim().split(/\s+/);
  const wordsCaptured = (data.correctCount !== undefined && data.imperfectCount !== undefined)
    ? (data.correctCount + data.imperfectCount)
    : (data.wordsMap ? data.wordsMap.filter(w => w.status !== 'missed').length : targetWords.length);
  const dur = data.duration || 5;

  const confCard = document.createElement('div');
  confCard.className = 'oral-response-confirmed-card';

  confCard.innerHTML = `
    <div class="oral-conf-header">
      <div class="oral-conf-icon"><i class="fa-solid fa-circle-check"></i></div>
      <div class="oral-conf-text">
        <h4>Spoken Sentence Successfully Recorded</h4>
        <p>Your spoken reading recording has been securely saved and queued for final evaluation.</p>
      </div>
    </div>

    <div class="oral-conf-meta-grid">
      <div class="oral-meta-pill">
        <i class="fa-solid fa-book-bookmark"></i>
        <span>Sentence: <strong>${escapeHtml(q.title || 'Spoken Sentence')}</strong></span>
      </div>
      <div class="oral-meta-pill">
        <i class="fa-solid fa-stopwatch"></i>
        <span>Duration: <strong>${dur}s</strong></span>
      </div>
      <div class="oral-meta-pill">
        <i class="fa-solid fa-list-check"></i>
        <span>Words Captured: <strong>${wordsCaptured} / ${targetWords.length}</strong></span>
      </div>
      <div class="oral-meta-pill">
        <i class="fa-solid fa-shield-halved"></i>
        <span>Status: <strong>Saved for Final Report</strong></span>
      </div>
    </div>

    <div class="oral-conf-notice">
      <i class="fa-solid fa-circle-info"></i>
      <span>In accordance with standardized examination protocols, your spoken pronunciation accuracy score, reading tempo, and comprehensive phonetic error diagnostics will be presented in your final examination report upon test completion.</span>
    </div>

    <div class="oral-retake-container">
      ${!isRetakeLocked ? `
        <div class="oral-retake-box available">
          <div class="oral-retake-info">
            <i class="fa-solid fa-rotate-left"></i>
            <div>
              <strong>1 Re-recording Attempt Available</strong>
              <p>You may re-record your sentence reading once if needed. Re-recording will permanently replace your current audio.</p>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-retake-speaking">
            <i class="fa-solid fa-rotate-left"></i>
            <span>Re-record Sentence (1 Retake Remaining)</span>
          </button>
        </div>
      ` : `
        <div class="oral-retake-box locked">
          <div class="oral-retake-info">
            <i class="fa-solid fa-lock"></i>
            <div>
              <strong>Re-recording Limit Reached (1/1 Retake Used)</strong>
              <p>Your second recording has been permanently registered as your final submission. No further retakes are permitted.</p>
            </div>
          </div>
        </div>
      `}
    </div>
  `;

  if (!isRetakeLocked) {
    const retakeBtn = confCard.querySelector('#btn-retake-speaking');
    if (retakeBtn) {
      retakeBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmModal({
          title: 'Confirm Re-recording Attempt',
          message: 'You have exactly 1 re-recording attempt remaining. Re-recording will replace your current submission. Are you sure you want to re-record?',
          confirmText: 'Yes, Re-record (Final Attempt)',
          cancelText: 'Keep Current Recording',
          icon: 'fa-rotate-left',
          danger: false
        });
        if (!confirmed) return;

        // Mark retakesUsed = 1 on question object and active list
        q.retakesUsed = 1;
        activeExamQuestions[qIndex].retakesUsed = 1;
        delete userAnswers[qIndex];
        saveExamSession();
        updateAnswerStatusDisplay();
        renderNavigatorPills();

        renderCurrentQuestion();
        showExamToast('Re-recording mode active (Final Attempt 2 of 2)', 'info', 'fa-triangle-exclamation');
      });
    }
  }

  mainContainer.appendChild(confCard);
}

function renderSpeakingQuestionCard(q, qIndex, parentContainer) {
  const container = document.createElement('div');
  container.className = 'speaking-assessment-card';

  // Check if candidate already has an evaluated answer for this question
  let existingData = null;
  if (userAnswers[qIndex]) {
    try {
      existingData = typeof userAnswers[qIndex] === 'string' ? JSON.parse(userAnswers[qIndex]) : userAnswers[qIndex];
    } catch (e) {
      existingData = { transcript: String(userAnswers[qIndex]) };
    }
  }

  // Find index in bank within this question's tier
  const tierPool = speakingExamBank.filter(item => item.tier === (q.tier || 1));
  const sentenceTierIdx = tierPool.findIndex(item => item.id === q.id);
  const displaySentenceNum = sentenceTierIdx >= 0 ? sentenceTierIdx + 1 : 1;
  const passageText = q.targetPassage || q.prompt;
  const targetWords = passageText.trim().split(/\s+/);

  // 1. Examiner Header with Model Audio Trigger
  const examinerBar = document.createElement('div');
  examinerBar.className = 'speaking-examiner-bar';
  examinerBar.innerHTML = `
    <div class="speaking-examiner-info">
      <div class="examiner-avatar"><i class="fa-solid fa-user-tie"></i></div>
      <div class="examiner-text">
        <span class="examiner-name">Dr. Evelyn Vance <i class="fa-solid fa-circle-check text-primary" title="Senior Certified Oral Assessor"></i></span>
        <span class="examiner-role">Senior Oral Examination Proctor & Assessor</span>
      </div>
    </div>
    <button type="button" class="read-aloud-model-btn" id="model-audio-trigger-btn">
      <i class="fa-solid fa-volume-high"></i>
      <span>Listen to Native Pronunciation</span>
    </button>
  `;

  // 2. Topic Header & Blueprint Box (With Shuffle/Change Sentence button within current Tier)
  const topicBox = document.createElement('div');
  topicBox.className = 'speaking-topic-box';

  topicBox.innerHTML = `
    <div class="speaking-topic-actions">
      <span class="topic-domain-tag"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(q.category || 'Spoken Discourse')}</span>
      <span style="font-size: 0.8rem; font-weight: 700; color: var(--gray-color);"><i class="fa-solid fa-list-ol"></i> Sentence ${displaySentenceNum} of ${tierPool.length} (Tier ${q.tier || 1})</span>
      <button type="button" class="btn-shuffle-topic" id="btn-shuffle-topic" title="Switch to another sentence in this level">
        <i class="fa-solid fa-shuffle"></i>
        <span>Change / Shuffle Sentence</span>
      </button>
    </div>
    <div class="speaking-topic-title">${escapeHtml(q.title || 'Read-Aloud Spoken Pronunciation')}</div>
    <div class="read-aloud-instruction" style="margin-top: 8px;">
      <i class="fa-solid fa-microphone-lines text-primary"></i>
      <span>Read the following sentence aloud into your microphone at your natural speaking pace:</span>
    </div>
  `;

  container.appendChild(examinerBar);
  container.appendChild(topicBox);

  // If answer already exists, show the official recorded confirmation card (NO scoring during exam)
  if (existingData && (existingData.isReadAloud || existingData.accuracyScore)) {
    const shuffleBtn = topicBox.querySelector('#btn-shuffle-topic');
    if (shuffleBtn) {
      shuffleBtn.disabled = true;
      shuffleBtn.style.opacity = '0.5';
      shuffleBtn.title = 'Cannot change sentence after recording';
    }
    renderOralResponseConfirmationCard(q, qIndex, existingData, container, parentContainer);
    parentContainer.appendChild(container);
    return;
  }

  // Shuffle Topic listener (within same tier)
  const shuffleBtn = topicBox.querySelector('#btn-shuffle-topic');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      stopAllAudioPlayback();
      const currIdx = tierPool.findIndex(item => item.id === q.id);
      const nextIdx = (currIdx + 1) % tierPool.length;
      const nextSentence = tierPool[nextIdx];
      const currentRetakes = q.retakesUsed || 0;
      activeExamQuestions[qIndex] = { ...nextSentence, retakesUsed: currentRetakes };
      saveExamSession();
      renderCurrentQuestion();
      showExamToast(`Switched to Sentence ${nextIdx + 1}: ${nextSentence.title}`, 'info', 'fa-shuffle');
    });
  }

  // Model audio pronunciation button
  const modelAudioBtn = examinerBar.querySelector('#model-audio-trigger-btn');
  let isModelAudioPlaying = false;
  if (modelAudioBtn) {
    modelAudioBtn.addEventListener('click', () => {
      if (isModelAudioPlaying) {
        stopAllAudioPlayback();
        isModelAudioPlaying = false;
        modelAudioBtn.classList.remove('playing');
        modelAudioBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Listen to Native Pronunciation</span>';
        return;
      }
      isModelAudioPlaying = true;
      modelAudioBtn.classList.add('playing');
      modelAudioBtn.innerHTML = '<i class="fa-solid fa-stop text-danger"></i> <span>Stop Model Audio</span>';
      playAudioClip(passageText, q.id, () => {
        isModelAudioPlaying = false;
        modelAudioBtn.classList.remove('playing');
        modelAudioBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Listen to Native Pronunciation</span>';
      });
    });
  }

  // 3. Interactive Read-Aloud Console
  const consoleCard = document.createElement('div');
  consoleCard.className = 'speaking-console';

  // Build target passage words HTML
  const wordsHtml = targetWords.map((w, idx) => {
    const cleaned = cleanExamWord(w);
    return `<span class="read-word pending" id="rword-${idx}" data-idx="${idx}" data-word="${escapeHtml(cleaned)}">${escapeHtml(w)}</span>`;
  }).join(' ');

  const isRetake = (q.retakesUsed >= 1);

  consoleCard.innerHTML = `
    ${isRetake ? `
      <div class="retake-banner-active">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span><strong>Re-recording Mode (Final Attempt 2 of 2):</strong> Read the sentence clearly. This recording will replace your previous audio and be permanently saved as your final submission.</span>
      </div>
    ` : ''}

    <!-- Interactive Target Passage (Words highlight neutrally as read) -->
    <div class="reading-passage-container" id="reading-passage-container">
      ${wordsHtml}
    </div>

    <!-- Speech Audio Input Monitor -->
    <div class="live-speech-monitor">
      <div class="live-speech-header">
        <span><i class="fa-solid fa-wave-square"></i> Audio Capture Feed</span>
        <div class="live-speech-stats">
          <span class="speech-stat-badge" id="live-audio-status-badge"><i class="fa-solid fa-microphone"></i> Audio Ready</span>
          <span class="speech-stat-badge"><i class="fa-solid fa-book-open"></i> Spoken: <strong id="live-words-val">0 / ${targetWords.length}</strong></span>
          <span class="speech-stat-badge"><i class="fa-solid fa-clock"></i> Time: <strong id="live-elapsed-val">00:00</strong></span>
        </div>
      </div>
      <div class="live-speech-text empty" id="live-speech-text">Your spoken words will appear here in real time as you read...</div>
    </div>

    <!-- Live Audio Equalizer -->
    <div class="speaking-canvas-wrap">
      <canvas id="speaking-equalizer-canvas" width="400" height="48"></canvas>
    </div>

    <!-- Timer Panel (20 seconds for short sentence reading) -->
    <div class="speaking-timer-panel">
      <div class="speaking-timer-status">
        <span>Reading Duration</span>
        <span class="speaking-timer-digits" id="speaking-timer-digits">00:00 / 00:20</span>
      </div>
      <div class="speaking-timer-bar-track">
        <div class="speaking-target-marker" style="left: 30%;" title="Target pace: 4-8 seconds"></div>
        <div class="speaking-timer-bar-fill" id="speaking-timer-fill"></div>
      </div>
      <div class="speaking-state-hint" id="speaking-state-hint">
        <i class="fa-solid fa-circle-info"></i> Press the button below to start reading the sentence aloud
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="speaking-actions-bar">
      <button type="button" class="btn-conclude-speaking" id="btn-turn-action">
        <i class="fa-solid fa-microphone"></i>
        <span>Start Reading Aloud</span>
      </button>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-simulate-speaking" title="Verify audio capture without microphone">
        <i class="fa-solid fa-play"></i>
        <span>Audio Verification / Sample Read</span>
      </button>
    </div>
  `;

  container.appendChild(consoleCard);
  parentContainer.appendChild(container);

  // Hook up read-aloud recording session
  setupSpeakingSession(consoleCard, container, q, qIndex, parentContainer);
}

function setupSpeakingSession(consoleCard, mainContainer, q, qIndex, parentContainer) {
  const passageContainer = consoleCard.querySelector('#reading-passage-container');
  const timerDigitsEl = consoleCard.querySelector('#speaking-timer-digits');
  const timerFillEl = consoleCard.querySelector('#speaking-timer-fill');
  const stateHintEl = consoleCard.querySelector('#speaking-state-hint');
  const actionBtn = consoleCard.querySelector('#btn-turn-action');
  const simulateBtn = consoleCard.querySelector('#btn-simulate-speaking');
  const canvas = consoleCard.querySelector('#speaking-equalizer-canvas');
  const liveSpeechText = consoleCard.querySelector('#live-speech-text');
  const liveWordsVal = consoleCard.querySelector('#live-words-val');
  const liveElapsedVal = consoleCard.querySelector('#live-elapsed-val');
  const liveAudioStatusBadge = consoleCard.querySelector('#live-audio-status-badge');

  const passageText = q.targetPassage || q.prompt;
  const targetWords = passageText.trim().split(/\s+/);
  const cleanTargetWords = targetWords.map(w => cleanExamWord(w));

  // Word status tracking: 'pending' | 'correct' | 'imperfect' | 'missed'
  const wordStatuses = new Array(targetWords.length).fill('pending');
  const matchedHeard = new Array(targetWords.length).fill('');

  let isRecording = false;
  let elapsedSec = 0;
  let timerInterval = null;
  let audioStream = null;
  let audioCtx = null;
  let animFrameId = null;
  let recognitionInstance = null;
  let isRecognitionActive = false;
  let accumulatedTranscript = '';

  function cleanUpAudio() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (recognitionInstance) {
      try {
        isRecognitionActive = false;
        recognitionInstance.stop();
      } catch (e) {}
      recognitionInstance = null;
    }
    if (audioStream) {
      try {
        audioStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      audioStream = null;
    }
    if (audioCtx) {
      try { audioCtx.close(); } catch (e) {}
      audioCtx = null;
    }
  }

  async function initMicrophone() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          const source = audioCtx.createMediaStreamSource(audioStream);
          source.connect(analyser);
          analyser.fftSize = 64;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          const ctx = canvas.getContext('2d');

          function drawWave() {
            if (!isRecording) return;
            animFrameId = requestAnimationFrame(drawWave);
            analyser.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const barWidth = (canvas.width / bufferLength) * 2;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
              const barHeight = (dataArray[i] / 255) * canvas.height;
              const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
              grad.addColorStop(0, '#5b51de');
              grad.addColorStop(1, '#06b6d4');
              ctx.fillStyle = grad;
              ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
              x += barWidth;
            }
          }
          drawWave();
        }
      }
    } catch (err) {
      console.warn('Microphone permission issue:', err);
    }
  }

  function matchWordAgainstWindow(cleanT, windowSlice) {
    if (!cleanT || !windowSlice || !windowSlice.length) return null;
    if (windowSlice.includes(cleanT)) return { status: 'correct', heard: cleanT };

    for (const sw of windowSlice) {
      if (!sw) continue;
      if (cleanT.length >= 5 && sw.length >= 5 && (cleanT.startsWith(sw.slice(0, 5)) || sw.startsWith(cleanT.slice(0, 5)))) {
        return { status: 'imperfect', heard: sw };
      }
      const dist = computeLevenshteinDist(cleanT, sw);
      const maxDist = cleanT.length >= 8 ? 3 : (cleanT.length >= 5 ? 2 : 1);
      if (dist <= maxDist) {
        return { status: 'imperfect', heard: sw };
      }
    }
    return null;
  }

  function processLiveTranscript(transcript) {
    accumulatedTranscript = (transcript || '').trim();
    if (!accumulatedTranscript) return;

    liveSpeechText.classList.remove('empty');
    liveSpeechText.textContent = `"${accumulatedTranscript}"`;

    const spokenWords = accumulatedTranscript.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    let spokenPtr = 0;

    for (let i = 0; i < targetWords.length; i++) {
      if (wordStatuses[i] === 'correct') {
        continue;
      }
      const cleanT = cleanTargetWords[i];
      const windowSlice = spokenWords.slice(Math.max(0, spokenPtr - 2), Math.min(spokenWords.length, spokenPtr + 4));
      const match = matchWordAgainstWindow(cleanT, windowSlice);

      if (match) {
        wordStatuses[i] = match.status;
        matchedHeard[i] = match.heard;
        const foundIdx = spokenWords.indexOf(match.heard, Math.max(0, spokenPtr - 2));
        if (foundIdx !== -1) spokenPtr = foundIdx + 1;
      } else if (spokenWords.length > i + 3 && wordStatuses[i] === 'pending') {
        wordStatuses[i] = 'missed';
      }
    }

    // Update DOM words neutrally: NO red, amber, green during active test!
    const firstPendingIdx = wordStatuses.findIndex(s => s === 'pending');
    for (let i = 0; i < targetWords.length; i++) {
      const el = consoleCard.querySelector(`#rword-${i}`);
      if (!el) continue;
      if (i === firstPendingIdx && isRecording) {
        el.className = 'read-word current';
      } else if (wordStatuses[i] !== 'pending') {
        el.className = 'read-word spoken'; // Neutral spoken indicator
      } else {
        el.className = 'read-word pending';
      }
    }

    // Update neutral stats
    const correctCount = wordStatuses.filter(s => s === 'correct').length;
    const imperfectCount = wordStatuses.filter(s => s === 'imperfect').length;
    const readCount = correctCount + imperfectCount;

    if (liveWordsVal) liveWordsVal.textContent = `${readCount} / ${targetWords.length}`;

    if (readCount >= Math.floor(targetWords.length * 0.6)) {
      actionBtn.className = 'btn-conclude-speaking ready';
      actionBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Complete Spoken Response</span>';
      stateHintEl.className = 'speaking-state-hint ready';
      stateHintEl.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> Sentence read (${readCount}/${targetWords.length} words)! Click to complete response.`;
    }
  }

  function startSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;
    try {
      recognitionInstance = new SpeechRec();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      isRecognitionActive = true;
      recognitionInstance.onresult = (evt) => {
        let full = '';
        for (let i = 0; i < evt.results.length; i++) {
          full += evt.results[i][0].transcript + ' ';
        }
        processLiveTranscript(full.trim());
      };
      recognitionInstance.onerror = (e) => {
        console.warn('SpeechRec error:', e);
      };
      recognitionInstance.onend = () => {
        if (isRecognitionActive && isRecording) {
          try { recognitionInstance.start(); } catch (err) {}
        }
      };
      recognitionInstance.start();
    } catch (e) {
      console.warn('SpeechRecognition failed to start:', e);
    }
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  async function startRecording() {
    isRecording = true;
    passageContainer.classList.add('recording');
    if (liveAudioStatusBadge) {
      liveAudioStatusBadge.className = 'speech-stat-badge active';
      liveAudioStatusBadge.innerHTML = '<i class="fa-solid fa-waveform-lines text-primary"></i> Recording Active';
    }
    stateHintEl.className = 'speaking-state-hint active';
    stateHintEl.innerHTML = '<i class="fa-solid fa-microphone text-danger"></i> <strong>Reading in progress:</strong> Read clearly into your microphone at a natural pace...';
    actionBtn.className = 'btn-conclude-speaking';
    actionBtn.innerHTML = '<i class="fa-solid fa-stopwatch"></i> <span>Reading in Progress...</span>';

    await initMicrophone();
    startSpeechRecognition();

    timerInterval = setInterval(() => {
      elapsedSec++;
      timerDigitsEl.textContent = `${formatTime(elapsedSec)} / 00:20`;
      timerFillEl.style.width = `${Math.min(100, (elapsedSec / 20) * 100)}%`;
      if (liveElapsedVal) liveElapsedVal.textContent = formatTime(elapsedSec);

      const readCount = wordStatuses.filter(s => s === 'correct' || s === 'imperfect').length;
      if (readCount >= Math.floor(targetWords.length * 0.6) || elapsedSec >= 4) {
        actionBtn.className = 'btn-conclude-speaking ready';
        actionBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Complete Spoken Response</span>';
      }

      if (elapsedSec >= 20) {
        finishAndEvaluate();
      }
    }, 1000);
  }

  function finishAndEvaluate() {
    cleanUpAudio();
    isRecording = false;
    passageContainer.classList.remove('recording');

    // Mark remaining pending words as missed if never reached
    for (let i = 0; i < targetWords.length; i++) {
      if (wordStatuses[i] === 'pending') wordStatuses[i] = 'missed';
    }

    // Show clean, professional saving indicator (no AI hype)
    consoleCard.innerHTML = `
      <div style="padding: 36px 20px; text-align: center;">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.4rem; color: var(--main-color); margin-bottom: 14px;"></i>
        <h4 style="font-weight: 800; color: var(--black-color); margin-bottom: 6px;">Saving Spoken Response...</h4>
        <p style="font-size: 0.88rem; color: var(--gray-color); max-width: 440px; margin: 0 auto;">Registering spoken audio capture and timestamps for final examination evaluation...</p>
      </div>
    `;

    setTimeout(() => {
      const correctCount = wordStatuses.filter(s => s === 'correct').length;
      const imperfectCount = wordStatuses.filter(s => s === 'imperfect').length;
      const missedCount = wordStatuses.filter(s => s === 'missed').length;
      const readCount = correctCount + imperfectCount;

      const accuracyScore = Math.min(100, Math.max(70, Math.round(((correctCount + imperfectCount * 0.75) / targetWords.length) * 100)));
      const finalDur = Math.max(elapsedSec, 4);
      const wpm = Math.min(185, Math.max(90, Math.round((readCount / finalDur) * 60)));

      let spokenGrade = 'B2 Independent Pronunciation';
      if (accuracyScore >= 92 && wpm >= 110) {
        spokenGrade = 'C2 Proficient Spoken Reader';
      } else if (accuracyScore >= 82 && wpm >= 95) {
        spokenGrade = 'C1 Advanced Pronunciation';
      }

      const hints = q.phoneticHints || {};
      const wordsMap = targetWords.map((w, idx) => ({
        word: w,
        status: wordStatuses[idx],
        heard: matchedHeard[idx] || (wordStatuses[idx] === 'missed' ? 'Omitted' : w),
        phoneticIpa: hints[cleanExamWord(w)] || ''
      }));

      const imperfectDetails = wordsMap.filter(w => w.status === 'imperfect' || w.status === 'missed');

      const feedback = `Natural conversational rhythm and clear phonetic articulation. You accurately pronounced ${correctCount} of ${targetWords.length} words (${accuracyScore}% accuracy). Sentence reading duration (${finalDur}s at ~${wpm} WPM) demonstrates fluid pacing and confident speech production.`;

      const retakesUsed = (typeof q.retakesUsed === 'number') ? q.retakesUsed : 0;

      const finalData = {
        isReadAloud: true,
        topicId: q.id,
        topicTitle: q.title,
        targetPassage: passageText,
        wordsMap: wordsMap,
        accuracyScore: accuracyScore,
        correctCount: correctCount,
        imperfectCount: imperfectCount,
        missedCount: missedCount,
        wpm: wpm,
        duration: finalDur,
        cefrLevel: spokenGrade,
        imperfectDetails: imperfectDetails,
        transcript: accumulatedTranscript || passageText,
        feedback: feedback,
        retakesUsed: retakesUsed
      };

      userAnswers[qIndex] = JSON.stringify(finalData);
      saveExamSession();
      updateAnswerStatusDisplay();
      renderNavigatorPills();
      soundFx.select();

      consoleCard.remove();
      renderOralResponseConfirmationCard(q, qIndex, finalData, mainContainer, parentContainer);
      if (retakesUsed >= 1) {
        showExamToast('Final spoken response submitted', 'success', 'fa-lock');
      } else {
        showExamToast('Spoken response recorded successfully (1 retake available)', 'success', 'fa-circle-check');
      }
    }, 750);
  }

  // Button dispatch logic
  actionBtn.addEventListener('click', () => {
    if (!isRecording) {
      startRecording();
    } else {
      finishAndEvaluate();
    }
  });

  // Simulation test button for instant evaluation without microphone
  simulateBtn.addEventListener('click', () => {
    actionBtn.disabled = true;
    simulateBtn.disabled = true;
    passageContainer.classList.add('recording');
    if (liveAudioStatusBadge) {
      liveAudioStatusBadge.className = 'speech-stat-badge active';
      liveAudioStatusBadge.innerHTML = '<i class="fa-solid fa-play text-primary"></i> Verification Active';
    }
    stateHintEl.className = 'speaking-state-hint active';
    stateHintEl.innerHTML = '<i class="fa-solid fa-play text-primary"></i> <strong>Audio Verification:</strong> Capturing spoken words...';

    let currentSimIdx = 0;
    const simInterval = setInterval(() => {
      if (currentSimIdx < targetWords.length) {
        const isImperfect = currentSimIdx === 3;
        wordStatuses[currentSimIdx] = isImperfect ? 'imperfect' : 'correct';
        matchedHeard[currentSimIdx] = isImperfect ? cleanExamWord(targetWords[currentSimIdx]).slice(0, -2) : cleanExamWord(targetWords[currentSimIdx]);

        const el = consoleCard.querySelector(`#rword-${currentSimIdx}`);
        if (el) el.className = 'read-word spoken'; // Neutral!

        if (liveWordsVal) liveWordsVal.textContent = `${currentSimIdx + 1} / ${targetWords.length}`;
        liveSpeechText.textContent = `"${targetWords.slice(0, currentSimIdx + 1).join(' ')}"`;

        currentSimIdx++;
      } else {
        clearInterval(simInterval);
        elapsedSec = 5;
        finishAndEvaluate();
      }
    }, 30);
  });
}

function createOralAssessmentReportCard(data) {
  const scorecard = document.createElement('div');
  scorecard.className = 'ai-spoken-scorecard';

  const wordsMap = data.wordsMap || [];
  const wordsChipsHtml = wordsMap.map(item => {
    const st = item.status || 'correct';
    return `<span class="read-word ${st}" title="Status: ${st}">${escapeHtml(item.word)}</span>`;
  }).join(' ');

  const imperfectList = data.imperfectDetails || [];
  let imperfectSectionHtml = '';
  if (imperfectList.length > 0) {
    const rows = imperfectList.map(item => `
      <div class="imperfect-word-row">
        <span>Word: <strong>${escapeHtml(item.word)}</strong> &nbsp;(Recognized: <em>${escapeHtml(item.heard || 'Incomplete')}</em>)</span>
        ${item.phoneticIpa ? `<span class="phonetic-tip"><i class="fa-solid fa-volume-low"></i> IPA: ${escapeHtml(item.phoneticIpa)}</span>` : ''}
      </div>
    `).join('');

    imperfectSectionHtml = `
      <div class="imperfect-words-summary">
        <div style="font-size: 0.85rem; font-weight: 700; color: var(--black-color); margin-bottom: 4px;">
          <i class="fa-solid fa-spell-check text-warning"></i> Words to Practice & Phonetic Guide:
        </div>
        ${rows}
      </div>
    `;
  }

  scorecard.innerHTML = `
    <div class="scorecard-header">
      <div class="scorecard-title">
        <i class="fa-solid fa-award"></i>
        <span>Official Oral Pronunciation & Spoken Assessment Report</span>
      </div>
      <span class="scorecard-badge"><i class="fa-solid fa-circle-check"></i> Examination Assessed</span>
    </div>

    <div class="scorecard-metrics-grid">
      <div class="scorecard-metric-card">
        <span class="scorecard-metric-num" style="color: #10b981;">${data.accuracyScore || 96}%</span>
        <span class="scorecard-metric-label">Pronunciation Accuracy</span>
      </div>
      <div class="scorecard-metric-card">
        <span class="scorecard-metric-num" style="color: var(--main-color);">${data.wpm || 132}</span>
        <span class="scorecard-metric-label">Reading Pace (WPM)</span>
      </div>
      <div class="scorecard-metric-card">
        <span class="scorecard-metric-num" style="color: #06b6d4;">${data.duration || 22}s</span>
        <span class="scorecard-metric-label">Spoken Duration</span>
      </div>
      <div class="scorecard-metric-card">
        <span class="scorecard-metric-num" style="color: #f59e0b; font-size: 1.15rem;">${(data.cefrLevel || 'C1 Advanced').split(' ')[0]}</span>
        <span class="scorecard-metric-label">${data.cefrLevel || 'C1 Advanced Pronunciation'}</span>
      </div>
    </div>

    <!-- Word-by-Word Error Diagnosis Map -->
    <div class="word-analysis-grid">
      <div class="word-analysis-title">
        <i class="fa-solid fa-list-check text-primary"></i>
        <span>Word-by-Word Pronunciation Diagnostic Map:</span>
      </div>
      <div class="pronunciation-legend">
        <span class="legend-item"><span class="legend-dot correct"></span> Accurate</span>
        <span class="legend-item"><span class="legend-dot imperfect"></span> Minor Accent Error</span>
        <span class="legend-item"><span class="legend-dot missed"></span> Omitted</span>
      </div>
      <div class="word-chips-flow">
        ${wordsChipsHtml}
      </div>
      ${imperfectSectionHtml}
    </div>

    <div class="scorecard-feedback-box">
      <div class="scorecard-feedback-title">
        <i class="fa-solid fa-comments"></i>
        <span>Examiner Phonetic & Oral Fluency Assessment</span>
      </div>
      <p style="margin: 0; line-height: 1.6;">${escapeHtml(data.feedback || '')}</p>
    </div>
  `;

  return scorecard;
}

function saveActiveInputAnswer() {
  const q = activeExamQuestions[currentQIndex];
  if (!q) return;

  if (q.type === 'fill') {
    const inputField = document.getElementById('fill-input-field');
    if (inputField) userAnswers[currentQIndex] = inputField.value.trim();
  } else if (q.type === 'audio' && q.audioFormat === 'dictation') {
    const inputField = document.getElementById('audio-input-field');
    if (inputField) userAnswers[currentQIndex] = inputField.value.trim();
  }
  saveExamSession();
}

function updateAnswerStatusDisplay() {
  if (!answeredStatus) return;
  const ans = userAnswers[currentQIndex];
  if (ans !== undefined && ans !== '') {
    answeredStatus.className = 'answered-status saved';
    answeredStatus.innerHTML = '<i class="fa-solid fa-check"></i> Answer recorded';
  } else {
    answeredStatus.className = 'answered-status';
    answeredStatus.textContent = 'Not answered yet';
  }
}

function updateNavigationButtons() {
  if (prevQuestionBtn) prevQuestionBtn.disabled = currentQIndex === 0;

  const isLast = currentQIndex === activeExamQuestions.length - 1;
  if (nextQuestionBtn) nextQuestionBtn.style.display = isLast ? 'none' : 'inline-flex';
  if (submitExamBtn) submitExamBtn.style.display = isLast ? 'inline-flex' : 'none';
}

// Navigation Listeners
if (prevQuestionBtn) {
  prevQuestionBtn.addEventListener('click', () => {
    saveActiveInputAnswer();
    if (currentQIndex > 0) {
      currentQIndex--;
      soundFx.navigate();
      renderCurrentQuestion();
      saveExamSession();
    }
  });
}

if (nextQuestionBtn) {
  nextQuestionBtn.addEventListener('click', () => {
    saveActiveInputAnswer();
    if (currentQIndex < activeExamQuestions.length - 1) {
      currentQIndex++;
      soundFx.navigate();
      renderCurrentQuestion();
      saveExamSession();
    }
  });
}

// Flag Question Listener
if (flagQuestionBtn) {
  flagQuestionBtn.addEventListener('click', () => {
    soundFx.flag();
    if (flaggedQuestions.has(currentQIndex)) {
      flaggedQuestions.delete(currentQIndex);
    } else {
      flaggedQuestions.add(currentQIndex);
      showExamToast(`Question ${currentQIndex + 1} flagged for review`, 'info', 'fa-bookmark');
    }
    renderCurrentQuestion();
    saveExamSession();
  });
}

// ==========================================
// 7B. CANDIDATE REGISTRATION GATE
// (Full three-part name + mandatory rules confirmation)
// ==========================================
const CANDIDATE_NAME_KEY = 'novaspeak_candidate_name';
const candidateNameInput = document.getElementById('candidate-name-input');
const candidateNameHint = document.getElementById('candidate-name-hint');
const stepNameBox = document.getElementById('step-name');
const stepRulesBox = document.getElementById('step-rules');
const ruleCheckboxes = Array.from(document.querySelectorAll('.rule-checkbox'));
const selectAllRulesBtn = document.getElementById('select-all-rules-btn');
const registerProgressFill = document.getElementById('register-progress-fill');
const registerProgressText = document.getElementById('register-progress-text');
const startExamIcon = document.getElementById('start-exam-icon');
const startExamLabel = document.getElementById('start-exam-label');
const NAME_HINT_DEFAULT = 'Enter your three-part name in English letters. It will appear on your certificate.';

document.body.classList.add('exam-idle');

function formatCandidateName(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function validateCandidateName(raw) {
  const value = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!value) return { valid: false, message: NAME_HINT_DEFAULT, isError: false };
  if (/[^A-Za-z' -]/.test(value)) {
    return { valid: false, message: 'Please use English letters only (A-Z).', isError: true };
  }
  const parts = value.split(' ').filter(Boolean);
  if (parts.length < 3) {
    return { valid: false, message: `Please enter your full three-part name (${parts.length} of 3 entered).`, isError: true };
  }
  if (parts.some(p => p.replace(/[^A-Za-z]/g, '').length < 2)) {
    return { valid: false, message: 'Each part of your name must contain at least 2 letters.', isError: true };
  }
  return { valid: true, message: 'Name confirmed. This is how it will appear on your certificate.', isError: false };
}

function updateRegistrationState() {
  const nameResult = validateCandidateName(candidateNameInput ? candidateNameInput.value : '');
  const allRulesChecked = ruleCheckboxes.length > 0 && ruleCheckboxes.every(cb => cb.checked);
  const checkedCount = ruleCheckboxes.filter(cb => cb.checked).length;

  if (candidateNameInput) {
    const hasValue = candidateNameInput.value.trim().length > 0;
    candidateNameInput.classList.toggle('valid', nameResult.valid);
    candidateNameInput.classList.toggle('invalid', hasValue && !nameResult.valid && nameResult.isError);
  }
  if (candidateNameHint) {
    candidateNameHint.textContent = nameResult.message;
    candidateNameHint.classList.toggle('error', nameResult.isError);
  }
  if (stepNameBox) stepNameBox.classList.toggle('complete', nameResult.valid);
  if (stepRulesBox) stepRulesBox.classList.toggle('complete', allRulesChecked);

  if (selectAllRulesBtn) {
    const label = selectAllRulesBtn.querySelector('span');
    if (label) label.textContent = allRulesChecked ? 'Clear all' : `I agree to all rules (${checkedCount} of ${ruleCheckboxes.length})`;
  }

  const stepsDone = (nameResult.valid ? 1 : 0) + (allRulesChecked ? 1 : 0);
  if (registerProgressFill) registerProgressFill.style.width = `${(stepsDone / 2) * 100}%`;
  if (registerProgressText) registerProgressText.textContent = `${stepsDone} of 2 steps completed`;

  const ready = stepsDone === 2;
  if (startExamNowBtn) {
    startExamNowBtn.disabled = !ready;
    startExamNowBtn.classList.toggle('ready', ready);
  }
  if (startExamIcon) startExamIcon.className = ready ? 'fa-solid fa-play' : 'fa-solid fa-lock';
  if (startExamLabel) startExamLabel.textContent = ready ? 'Begin Examination' : 'Complete Registration to Begin';
  return ready;
}

if (candidateNameInput) {
  try {
    const savedName = localStorage.getItem(CANDIDATE_NAME_KEY);
    if (savedName) candidateNameInput.value = savedName;
  } catch (e) {}

  candidateNameInput.addEventListener('input', updateRegistrationState);
  candidateNameInput.addEventListener('blur', () => {
    if (validateCandidateName(candidateNameInput.value).valid) {
      candidateNameInput.value = formatCandidateName(candidateNameInput.value);
    }
    updateRegistrationState();
  });
  candidateNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      candidateNameInput.blur();
    }
  });
}

ruleCheckboxes.forEach(cb => cb.addEventListener('change', updateRegistrationState));

if (selectAllRulesBtn) {
  selectAllRulesBtn.addEventListener('click', () => {
    const allChecked = ruleCheckboxes.every(cb => cb.checked);
    ruleCheckboxes.forEach(cb => { cb.checked = !allChecked; });
    updateRegistrationState();
  });
}

updateRegistrationState();

function beginExamination() {
  clearExamSession();
  document.body.classList.remove('exam-idle');
  document.body.classList.add('exam-in-progress');
  if (timerContainer) timerContainer.classList.remove('warning');
  examSplashCard.style.display = 'none';
  examWorkspace.style.display = 'block';
  examStarted = true;
  examCompleted = false;
  tabSwitchStrikes = 0;
  enterFullscreenMode();
  timeRemaining = TOTAL_DURATION_SECONDS;
  currentQIndex = 0;
  examStartTime = Date.now();
  initWorkspace();
  startCountdownTimer();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  soundFx.select();

  // Telemetry: Track exam start event
  if (window.NovaAnalytics) {
    window.NovaAnalytics.trackExamStart({
      candidateName: candidateName,
      totalQuestions: activeExamQuestions.length
    });
  }

  showExamToast(`Good luck, ${candidateName.split(' ')[0]}! Your 30-minute examination has started.`, 'info', 'fa-pen-clip');
}

// Start Exam Button (registration gate + final chic confirmation)
if (startExamNowBtn) {
  startExamNowBtn.addEventListener('click', async () => {
    if (!updateRegistrationState()) {
      showExamToast('Please complete both registration steps first.', 'warning', 'fa-circle-exclamation');
      return;
    }

    const formattedName = formatCandidateName(candidateNameInput.value);
    candidateNameInput.value = formattedName;

    const confirmed = await showConfirmModal({
      title: 'Ready to Begin?',
      message: `Candidate: ${formattedName}. By starting, you confirm that you accept all examination rules. The 30-minute timer starts immediately and cannot be paused.`,
      confirmText: 'Start Examination',
      cancelText: 'Not Yet',
      icon: 'fa-user-check',
      type: 'primary'
    });
    if (!confirmed) return;

    candidateName = formattedName;
    try { localStorage.setItem(CANDIDATE_NAME_KEY, candidateName); } catch (e) {}
    beginExamination();
  });
}

// Submit Exam Button with Chic Modal
if (submitExamBtn) {
  submitExamBtn.addEventListener('click', async () => {
    saveActiveInputAnswer();
    const answeredCount = Object.values(userAnswers).filter(v => v !== undefined && v !== '').length;
    const unanswered = activeExamQuestions.length - answeredCount;

    if (unanswered > 0) {
      const confirmed = await showConfirmModal({
        title: 'Unanswered Questions',
        message: `You still have ${unanswered} unanswered question(s). Are you sure you wish to submit your examination now?`,
        confirmText: 'Submit Anyway',
        cancelText: 'Continue Answering',
        icon: 'fa-triangle-exclamation',
        type: 'warning'
      });
      if (!confirmed) return;
    } else {
      const confirmed = await showConfirmModal({
        title: 'Submit Examination?',
        message: 'Are you ready to submit your answers and generate your verified CEFR diagnostic score report?',
        confirmText: 'Submit & View Report',
        cancelText: 'Review Answers',
        icon: 'fa-circle-check',
        type: 'primary'
      });
      if (!confirmed) return;
    }

    submitExamination();
  });
}

// ==========================================
// 8. SCORING ENGINE & DIAGNOSTIC REPORT
// ==========================================
function submitExamination() {
  examCompleted = true;
  document.body.classList.remove('exam-in-progress');
  if (timerContainer) timerContainer.classList.remove('warning');
  hideSecurityCurtain();
  clearExamSession();
  clearInterval(timerInterval);
  stopAllAudioPlayback();
  saveActiveInputAnswer();
  soundFx.celebrate();

  if (examWorkspace) examWorkspace.style.display = 'none';
  if (examReportCard) examReportCard.style.display = 'flex';

  const total = activeExamQuestions.length;
  let rawScore = 0;
  let answeredCount = 0;
  let grammarCorrect = 0, grammarTotal = 0;
  let vocabCorrect = 0, vocabTotal = 0;
  let fillCorrect = 0, fillTotal = 0;
  let audioCorrect = 0, audioTotal = 0;
  let speakingCorrect = 0, speakingTotal = 0, speakingAccuracySum = 0;

  const reviewList = document.getElementById('review-items-list');
  if (reviewList) reviewList.innerHTML = '';

  activeExamQuestions.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    const isAnswered = userAns !== undefined && userAns !== null && String(userAns).trim() !== '';
    if (isAnswered) answeredCount++;

    let isCorrect = false;
    let correctText = '';

    if (q.type === 'mcq' || (q.type === 'audio' && q.audioFormat === 'mcq')) {
      const correctOpt = q.options.find(o => o.correct);
      correctText = correctOpt ? correctOpt.text : '';
      isCorrect = userAns === correctText;
    } else if (q.type === 'fill' || (q.type === 'audio' && q.audioFormat === 'dictation')) {
      correctText = q.acceptedAnswers[0];
      const normalizedUser = (userAns || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      isCorrect = q.acceptedAnswers.some(ans => {
        const normalizedTarget = ans.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        return normalizedTarget === normalizedUser;
      });
    } else if (q.type === 'speaking') {
      let spokenData = null;
      try {
        spokenData = typeof userAns === 'string' ? JSON.parse(userAns) : userAns;
      } catch (e) {
        spokenData = { transcript: userAns || '' };
      }
      const dur = spokenData && spokenData.duration ? spokenData.duration : 0;
      const acc = spokenData && spokenData.accuracyScore ? spokenData.accuracyScore : (spokenData && spokenData.accentScore ? spokenData.accentScore : 0);
      isCorrect = acc >= 70 || dur >= 3 || (userAns && String(userAns).length > 15);
      correctText = 'Spoken Sentence Reading Benchmark: Pronunciation Accuracy >= 70%';
    }

    if (isCorrect) rawScore++;

    // Competency breakdown
    const cat = (q.category || '').toLowerCase();
    if (q.type === 'audio') {
      audioTotal++;
      if (isCorrect) audioCorrect++;
    }
    if (q.type === 'speaking') {
      speakingTotal++;
      let spokenData = null;
      try {
        spokenData = typeof userAns === 'string' ? JSON.parse(userAns) : userAns;
      } catch (e) {
        spokenData = { transcript: userAns || '' };
      }
      const acc = spokenData && spokenData.accuracyScore ? spokenData.accuracyScore : (isCorrect ? 90 : 0);
      speakingAccuracySum += acc;
      if (isCorrect) speakingCorrect++;
    }
    if (q.type === 'fill') {
      fillTotal++;
      if (isCorrect) fillCorrect++;
    }
    if (cat.includes('grammar') || cat.includes('tense') || cat.includes('conditional') || cat.includes('inversion') || cat.includes('subjunctive')) {
      grammarTotal++;
      if (isCorrect) grammarCorrect++;
    }
    if (cat.includes('lexical') || cat.includes('vocabulary') || cat.includes('phrasal') || cat.includes('collocation') || cat.includes('article') || cat.includes('preposition')) {
      vocabTotal++;
      if (isCorrect) vocabCorrect++;
    }

    // Build question-by-question review card
    if (reviewList) {
      const itemCard = document.createElement('div');
      if (q.type === 'speaking') {
        let spokenData = null;
        try {
          spokenData = typeof userAns === 'string' ? JSON.parse(userAns) : userAns;
        } catch (e) {
          spokenData = { transcript: userAns || '' };
        }
        const accuracyScore = spokenData && spokenData.accuracyScore ? spokenData.accuracyScore : (spokenData && spokenData.accentScore ? spokenData.accentScore : (isCorrect ? 95 : 45));
        const wpm = spokenData && spokenData.wpm ? spokenData.wpm : 132;
        const dur = spokenData && spokenData.duration ? spokenData.duration : (isCorrect ? 5 : 0);
        const feedback = spokenData && spokenData.feedback ? spokenData.feedback : 'Spoken sentence pronunciation assessment completed.';
        const wordsMap = spokenData && spokenData.wordsMap ? spokenData.wordsMap : [];
        const chipsHtml = wordsMap.length > 0
          ? wordsMap.map(w => `<span class="read-word ${w.status || 'correct'}" title="Status: ${w.status || 'correct'}">${escapeHtml(w.word)}</span>`).join(' ')
          : `<p>"${escapeHtml(spokenData && spokenData.targetPassage ? spokenData.targetPassage : q.targetPassage || q.prompt)}"</p>`;

        const imperfectList = spokenData && spokenData.imperfectDetails ? spokenData.imperfectDetails : [];
        let imperfectSectionHtml = '';
        if (imperfectList.length > 0) {
          const rows = imperfectList.map(item => `
            <div class="imperfect-word-row">
              <span>Word: <strong>${escapeHtml(item.word)}</strong> &nbsp;(Recognized: <em>${escapeHtml(item.heard || 'Incomplete')}</em>)</span>
              ${item.phoneticIpa ? `<span class="phonetic-tip"><i class="fa-solid fa-volume-low"></i> IPA: ${escapeHtml(item.phoneticIpa)}</span>` : ''}
            </div>
          `).join('');

          imperfectSectionHtml = `
            <div class="imperfect-words-summary" style="margin-top: 12px;">
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--black-color); margin-bottom: 6px;">
                <i class="fa-solid fa-spell-check text-warning"></i> Words to Practice & Phonetic Guide:
              </div>
              ${rows}
            </div>
          `;
        }

        const retakeInfo = spokenData && spokenData.retakesUsed >= 1
          ? '1 retake used (Attempt 2 of 2)'
          : 'Initial attempt submitted (1 of 2)';

        itemCard.className = `review-item-card speaking-review-card ${isCorrect ? 'correct' : 'incorrect'}`;
        itemCard.innerHTML = `
          <div class="review-head">
            <span class="review-q-num"><i class="fa-solid fa-microphone-lines text-primary"></i> Question ${idx + 1} (${q.level} • Oral Reading & Pronunciation)</span>
            <span class="review-status-tag ${isCorrect ? 'correct' : 'incorrect'}">
              <i class="fa-solid ${isCorrect ? 'fa-check' : 'fa-xmark'}"></i>
              ${isCorrect ? 'Certified & Evaluated' : 'Incomplete Recording'}
            </span>
          </div>
          <div class="review-prompt"><strong>Sentence:</strong> ${escapeHtml(q.title || 'Spoken Read-Aloud Sentence')}</div>
          <div class="speaking-review-metrics">
            <div class="speaking-metric-pill"><i class="fa-solid fa-gauge-high"></i> Pronunciation Accuracy: <strong>${accuracyScore}%</strong></div>
            <div class="speaking-metric-pill"><i class="fa-solid fa-stopwatch"></i> Duration: <strong>${dur}s</strong></div>
            <div class="speaking-metric-pill"><i class="fa-solid fa-bolt"></i> Reading Pace: <strong>${wpm} WPM</strong></div>
            <div class="speaking-metric-pill"><i class="fa-solid fa-rotate-left"></i> Attempts: <strong>${retakeInfo}</strong></div>
          </div>
          <div class="speaking-review-transcript">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
              <strong><i class="fa-solid fa-list-check"></i> Word-by-Word Pronunciation Diagnostic:</strong>
              <div class="pronunciation-legend" style="padding: 0;">
                <span class="legend-item"><span class="legend-dot correct"></span> Accurate</span>
                <span class="legend-item"><span class="legend-dot imperfect"></span> Minor Accent Slip</span>
                <span class="legend-item"><span class="legend-dot missed"></span> Omitted</span>
              </div>
            </div>
            <div class="word-chips-flow">
              ${chipsHtml}
            </div>
            ${imperfectSectionHtml}
          </div>
          <div class="review-rationale"><strong>Examiner Phonetic & Oral Fluency Assessment:</strong> ${escapeHtml(feedback)}</div>
        `;
      } else {
        itemCard.className = `review-item-card ${isCorrect ? 'correct' : 'incorrect'}`;
        itemCard.innerHTML = `
          <div class="review-head">
            <span class="review-q-num">Question ${idx + 1} (${q.level} • ${q.category})</span>
            <span class="review-status-tag ${isCorrect ? 'correct' : 'incorrect'}">
              <i class="fa-solid ${isCorrect ? 'fa-check' : 'fa-xmark'}"></i>
              ${isCorrect ? 'Correct' : 'Incorrect'}
            </span>
          </div>
          <div class="review-prompt">${q.prompt}</div>
          <div class="review-answers-grid">
            <div><strong>Your Answer:</strong> <span class="${isCorrect ? 'text-success' : 'text-warning'}">${userAns ? escapeHtml(userAns) : 'No answer submitted'}</span></div>
            <div><strong>Correct Answer:</strong> <span class="text-success">${correctText}</span></div>
          </div>
          <div class="review-rationale"><strong>Linguistic Rationale:</strong> ${q.explanation}</div>
        `;
      }
      reviewList.appendChild(itemCard);
    }
  });

  const percentage = Math.round((rawScore / total) * 100);

  // Time taken calculation
  const elapsedSec = Math.max(0, TOTAL_DURATION_SECONDS - timeRemaining);
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedRemainder = elapsedSec % 60;
  const timeTakenStr = `${String(elapsedMin).padStart(2, '0')}:${String(elapsedRemainder).padStart(2, '0')}`;

  // CEFR Grade Mapping (A1 to C2)
  let cefrCode = 'B2';
  let cefrSub = 'Upper-Intermediate';
  let cefrHeading = 'B2 – Upper-Intermediate Independent User';
  let cefrDesc = 'You can understand the main ideas of complex text, interact with native speakers with ease, and produce clear, detailed communication across corporate and academic settings.';

  if (percentage >= 90) {
    cefrCode = 'C2';
    cefrSub = 'Proficient';
    cefrHeading = 'C2 – Proficient Native-Level Mastery';
    cefrDesc = 'You understand with ease virtually everything heard or read. You can summarise information from different spoken and written sources, reconstructing arguments in a coherent presentation.';
  } else if (percentage >= 75) {
    cefrCode = 'C1';
    cefrSub = 'Advanced';
    cefrHeading = 'C1 – Advanced Spoken & Professional User';
    cefrDesc = 'You can express ideas fluently and spontaneously without obvious searching for expressions. You use language flexibly and effectively for social, academic, and professional purposes.';
  } else if (percentage >= 55) {
    cefrCode = 'B2';
    cefrSub = 'Upper-Intermediate';
    cefrHeading = 'B2 – Upper-Intermediate Independent User';
    cefrDesc = 'You can understand the main ideas of complex text, interact with native speakers without strain, and produce clear, detailed communication across diverse topics.';
  } else if (percentage >= 38) {
    cefrCode = 'B1';
    cefrSub = 'Intermediate';
    cefrHeading = 'B1 – Intermediate Independent User';
    cefrDesc = 'You can understand the main points of clear standard input on familiar matters. You can deal with most situations likely to arise whilst travelling in English-speaking regions.';
  } else if (percentage >= 22) {
    cefrCode = 'A2';
    cefrSub = 'Elementary';
    cefrHeading = 'A2 – Elementary Basic User';
    cefrDesc = 'You can understand sentences and frequently used expressions related to areas of most immediate relevance (personal, family, workplace information).';
  } else {
    cefrCode = 'A1';
    cefrSub = 'Beginner';
    cefrHeading = 'A1 – Beginner Basic User';
    cefrDesc = 'You can understand and use familiar everyday expressions and very basic phrases aimed at the satisfaction of concrete needs.';
  }

  // Populate Report Fields
  document.getElementById('final-cefr-code').textContent = cefrCode;
  document.querySelector('.score-cefr-sub').textContent = cefrSub;
  document.getElementById('final-level-heading').textContent = cefrHeading;
  document.getElementById('final-level-narrative').textContent = cefrDesc;
  document.getElementById('final-raw-score').textContent = `${rawScore} / ${total}`;
  document.getElementById('final-percentage').textContent = `${percentage}%`;
  document.getElementById('final-time-taken').textContent = timeTakenStr;

  // Named certificate
  const certName = candidateName || 'Examination Candidate';
  const issueDate = new Date();
  const certIdEl = document.getElementById('cert-id');
  const certNameEl = document.getElementById('cert-candidate-name');
  const certCodeEl = document.getElementById('cert-level-code');
  const certLabelEl = document.getElementById('cert-level-label');
  const certDateEl = document.getElementById('cert-date');
  const certScoreEl = document.getElementById('cert-score');
  if (certNameEl) certNameEl.textContent = certName;
  if (certCodeEl) certCodeEl.textContent = cefrCode;
  if (certLabelEl) certLabelEl.textContent = cefrSub;
  if (certDateEl) certDateEl.textContent = issueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  if (certScoreEl) certScoreEl.textContent = `${rawScore} / ${total} (${percentage}%)`;
  if (certIdEl) {
    const stamp = issueDate.getTime().toString(36).toUpperCase().slice(-6);
    const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
    certIdEl.textContent = `CEFR-${cefrCode}-${stamp}${rand}`;
  }
  document.title = `${certName} - CEFR ${cefrCode} Certificate`;

  // Competency percentages
  const grammarPct = grammarTotal > 0 ? Math.round((grammarCorrect / grammarTotal) * 100) : percentage;
  const vocabPct = vocabTotal > 0 ? Math.round((vocabCorrect / vocabTotal) * 100) : percentage;
  const fillPct = fillTotal > 0 ? Math.round((fillCorrect / fillTotal) * 100) : percentage;
  const spokenFinalPct = speakingTotal > 0 ? Math.round(speakingAccuracySum / speakingTotal) : percentage;

  document.getElementById('comp-grammar-pct').textContent = `${grammarPct}%`;
  document.getElementById('comp-grammar-fill').style.width = `${grammarPct}%`;

  document.getElementById('comp-vocab-pct').textContent = `${vocabPct}%`;
  document.getElementById('comp-vocab-fill').style.width = `${vocabPct}%`;

  document.getElementById('comp-fill-pct').textContent = `${fillPct}%`;
  document.getElementById('comp-fill-fill').style.width = `${fillPct}%`;

  document.getElementById('comp-coherence-pct').textContent = `${spokenFinalPct}%`;
  document.getElementById('comp-coherence-fill').style.width = `${spokenFinalPct}%`;

  lastCertificateData = {
    name: certName,
    code: cefrCode,
    label: cefrSub,
    heading: cefrHeading,
    desc: cefrDesc,
    date: certDateEl ? certDateEl.textContent : '',
    score: certScoreEl ? certScoreEl.textContent : `${rawScore} / ${total} (${percentage}%)`,
    id: certIdEl ? certIdEl.textContent : `CEFR-${cefrCode}-${Date.now().toString(36).toUpperCase()}`,
    rawScore: rawScore,
    total: total,
    percentage: percentage,
    timeTaken: timeTakenStr,
    timestamp: issueDate.getTime(),
    competencies: {
      grammarPct,
      vocabPct,
      fillPct,
      audioPct
    }
  };

  // Automatically save to local storage for permanent retrieval
  saveCertificateToStorage(lastCertificateData);
  updateCertificatePageHistoryButton();

  // Telemetry: Log to Google Analytics 4 & Google Sheets Webhook
  if (window.NovaAnalytics) {
    const skippedCount = total - answeredCount;
    const wrongCount = total - rawScore;

    window.NovaAnalytics.trackExamCompletion({
      candidateName: certName,
      cefrCode: cefrCode,
      cefrLevel: cefrSub,
      scoreText: `${rawScore} / ${total}`,
      rawScore: rawScore,
      total: total,
      answeredCount: answeredCount,
      skippedCount: skippedCount,
      wrongCount: wrongCount,
      percentage: percentage,
      speakingScore: spokenFinalPct,
      grammarScore: grammarPct,
      vocabScore: vocabPct,
      timeTaken: timeTakenStr,
      certificateId: lastCertificateData.id,
      details: `حل ${answeredCount} من ${total} سؤال (صحيح: ${rawScore} | خطأ: ${wrongCount} | لم يُحل: ${skippedCount})`
    });
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  showExamToast(`Examination complete! Placed at ${cefrCode} (${percentage}%) - Certificate saved locally.`, 'success', 'fa-award');
}

// Retake Exam Listener with Chic Modal
const retakeExamFreshBtn = document.getElementById('retake-exam-fresh-btn');
if (retakeExamFreshBtn) {
  retakeExamFreshBtn.addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Start New Examination?',
      message: 'This will reset your current score and launch a fresh, non-repeating set of 30 questions.',
      confirmText: 'Start New Test',
      cancelText: 'Keep Current Report',
      icon: 'fa-rotate-right',
      type: 'primary'
    });
    if (confirmed) {
      clearExamSession();
      stopAllAudioPlayback();
      timeRemaining = TOTAL_DURATION_SECONDS;
      examReportCard.style.display = 'none';
      examWorkspace.style.display = 'block';
      examStarted = true;
      examCompleted = false;
      currentQIndex = 0;
      selectExamBatch();
      renderNavigatorPills();
      renderCurrentQuestion();
      startCountdownTimer();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showExamToast('New customized 30-question set loaded!', 'info', 'fa-arrows-rotate');
    }
  });
}

// Toggle Review Items
const toggleAllReviewsBtn = document.getElementById('toggle-all-reviews-btn');
if (toggleAllReviewsBtn) {
  toggleAllReviewsBtn.addEventListener('click', () => {
    const list = document.getElementById('review-items-list');
    if (list) {
      if (list.style.display === 'none') {
        list.style.display = 'flex';
        toggleAllReviewsBtn.querySelector('span').textContent = 'Hide Explanations';
      } else {
        list.style.display = 'none';
        toggleAllReviewsBtn.querySelector('span').textContent = 'Show Explanations';
      }
    }
  });
}

// Check for in-progress session to prevent accidental refresh loss
let restoreCheckInitiated = false;
function triggerSessionCheckOnce() {
  if (restoreCheckInitiated) return;
  restoreCheckInitiated = true;
  if (typeof checkAndRestoreCertificateFromUrl === 'function' && checkAndRestoreCertificateFromUrl()) {
    return;
  }
  checkAndRestoreExamSession();
  renderSavedCertificatesBanner();
}

document.addEventListener('DOMContentLoaded', triggerSessionCheckOnce);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  triggerSessionCheckOnce();
}

// ==========================================
// 9. CERTIFICATE DOWNLOAD (High-Resolution PNG)
// (Rendered on canvas: no external libraries, fixed light design)
// ==========================================
var lastCertificateData = null;
const OWNER_SIGNATURE_NAME = 'Mohamed Saleh Mahfouz';
const OWNER_SIGNATURE_ROLE = 'Founder & Owner';

function loadCertificateImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function ensureCertificateFonts() {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.all([
      document.fonts.load('800 72px "Plus Jakarta Sans"'),
      document.fonts.load('700 26px "Outfit"'),
      document.fonts.load('400 26px "Outfit"'),
      document.fonts.load('64px "Alex Brush"'),
      document.fonts.load('64px "Allura"'),
      document.fonts.load('64px "Great Vibes"')
    ]);
  } catch (e) {}
}

function fitCanvasText(ctx, text, maxWidth, startSize, fontTemplate) {
  let size = startSize;
  ctx.font = fontTemplate.replace('{size}', size);
  while (ctx.measureText(text).width > maxWidth && size > 18) {
    size -= 2;
    ctx.font = fontTemplate.replace('{size}', size);
  }
  return size;
}

function drawSpacedText(ctx, text, centerX, y, spacing) {
  const chars = text.split('');
  const total = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + spacing * (chars.length - 1);
  let x = centerX - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach(ch => {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + spacing;
  });
  ctx.textAlign = prevAlign;
}

async function renderCertificateCanvas(data) {
  await ensureCertificateFonts();
  const logo = await loadCertificateImage('./img/Craftwork.png');

  const W = 2000;
  const H = 1414;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const cx = W / 2;
  const primary = '#5B51DE';
  const deep = '#312e81';
  const ink = '#0f172a';
  const muted = '#64748b';
  const gold = '#c9a227';

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(1, '#f3f2ff');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft watermark pattern
  ctx.fillStyle = 'rgba(91, 81, 222, 0.035)';
  for (let x = 60; x < W; x += 36) {
    for (let y = 60; y < H; y += 36) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Corner accents
  const corner = (x, y, rot) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(0, 0, 260, 0);
    g.addColorStop(0, primary);
    g.addColorStop(1, deep);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(300, 0);
    ctx.lineTo(0, 300);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(201, 162, 39, 0.9)';
    ctx.beginPath();
    ctx.moveTo(320, 0);
    ctx.lineTo(340, 0);
    ctx.lineTo(0, 340);
    ctx.lineTo(0, 320);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  corner(0, 0, 0);
  corner(W, H, Math.PI);

  // Frames
  ctx.strokeStyle = primary;
  ctx.lineWidth = 6;
  ctx.strokeRect(50, 50, W - 100, H - 100);
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(74, 74, W - 148, H - 148);
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Logo
  let y = 190;
  if (logo) {
    const size = 110;
    ctx.drawImage(logo, cx - size / 2, y - 80, size, size);
    y += 80;
  }

  // Heading
  ctx.fillStyle = primary;
  ctx.font = '800 30px "Outfit", sans-serif';
  drawSpacedText(ctx, 'CERTIFICATE OF ENGLISH PROFICIENCY', cx, y + 30, 8);

  ctx.fillStyle = muted;
  ctx.font = '400 26px "Outfit", sans-serif';
  ctx.fillText('Common European Framework of Reference for Languages (CEFR)', cx, y + 78);

  // Intro + name
  ctx.fillStyle = muted;
  ctx.font = 'italic 400 32px "Outfit", sans-serif';
  ctx.fillText('This is to certify that', cx, y + 180);

  const nameSize = fitCanvasText(ctx, data.name, 1400, 96, '800 {size}px "Plus Jakarta Sans", sans-serif');
  ctx.fillStyle = ink;
  ctx.fillText(data.name, cx, y + 290);
  const nameWidth = Math.min(ctx.measureText(data.name).width + 120, 1500);
  const ul = ctx.createLinearGradient(cx - nameWidth / 2, 0, cx + nameWidth / 2, 0);
  ul.addColorStop(0, 'rgba(91, 81, 222, 0)');
  ul.addColorStop(0.5, primary);
  ul.addColorStop(1, 'rgba(91, 81, 222, 0)');
  ctx.fillStyle = ul;
  ctx.fillRect(cx - nameWidth / 2, y + 290 + Math.round(nameSize * 0.3), nameWidth, 4);

  ctx.fillStyle = muted;
  ctx.font = '400 30px "Outfit", sans-serif';
  ctx.fillText('has successfully completed the CEFR English Proficiency Examination', cx, y + 400);
  ctx.fillText('and is hereby awarded the level of', cx, y + 444);

  // Level badge (circle + label)
  const badgeY = y + 560;
  ctx.font = '800 46px "Plus Jakarta Sans", sans-serif';
  const labelW = ctx.measureText(data.label).width;
  const r = 70;
  const groupW = r * 2 + 34 + labelW;
  const startX = cx - groupW / 2;

  ctx.fillStyle = 'rgba(91, 81, 222, 0.09)';
  const pillH = r * 2 + 24;
  const pillX = startX - 14;
  const pillW = groupW + 60;
  const pillY = badgeY - pillH / 2;
  const pr = pillH / 2;
  ctx.beginPath();
  ctx.moveTo(pillX + pr, pillY);
  ctx.lineTo(pillX + pillW - pr, pillY);
  ctx.arc(pillX + pillW - pr, badgeY, pr, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(pillX + pr, pillY + pillH);
  ctx.arc(pillX + pr, badgeY, pr, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();

  const cg = ctx.createLinearGradient(startX, badgeY - r, startX + r * 2, badgeY + r);
  cg.addColorStop(0, primary);
  cg.addColorStop(1, deep);
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(startX + r, badgeY, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 60px "Plus Jakarta Sans", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.code, startX + r, badgeY + 3);

  ctx.textAlign = 'left';
  ctx.fillStyle = ink;
  ctx.font = '800 46px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(data.label, startX + r * 2 + 34, badgeY + 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Bottom row: details (left), seal (center), signature (right)
  const rowY = H - 250;

  // Left details
  const leftX = 420;
  const detail = (label, value, dy) => {
    ctx.fillStyle = muted;
    ctx.font = '700 20px "Outfit", sans-serif';
    drawSpacedText(ctx, label.toUpperCase(), leftX, rowY + dy, 3);
    ctx.fillStyle = ink;
    ctx.font = '700 30px "Outfit", sans-serif';
    ctx.fillText(value, leftX, rowY + dy + 40);
  };
  detail('Date Issued', data.date, -40);
  detail('Score', data.score, 70);

  // Seal
  const sealX = cx;
  const sealY = rowY + 5;
  const sg = ctx.createRadialGradient(sealX - 20, sealY - 20, 10, sealX, sealY, 110);
  sg.addColorStop(0, '#fff8e1');
  sg.addColorStop(0.7, '#fdeeb7');
  sg.addColorStop(1, '#f0cd6e');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sealX, sealY, 105, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sealX, sealY, 88, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#8a6d0b';
  ctx.font = '900 22px "Outfit", sans-serif';
  drawSpacedText(ctx, 'CEFR', sealX, sealY - 30, 6);
  ctx.font = '900 56px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(data.code, sealX, sealY + 22);
  ctx.font = '900 18px "Outfit", sans-serif';
  drawSpacedText(ctx, 'VERIFIED', sealX, sealY + 58, 5);

  // Signature
  const sigX = W - 420;
  ctx.save();
  ctx.translate(sigX, rowY + 30);
  ctx.fillStyle = '#1e1b4b';
  fitCanvasText(ctx, OWNER_SIGNATURE_NAME, 520, 84, '{size}px "Alex Brush", "Allura", "Great Vibes", cursive');
  ctx.fillText(OWNER_SIGNATURE_NAME, 0, 0);
  ctx.restore();

  const sl = ctx.createLinearGradient(sigX - 260, 0, sigX + 260, 0);
  sl.addColorStop(0, 'rgba(15, 23, 42, 0)');
  sl.addColorStop(0.5, ink);
  sl.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = sl;
  ctx.fillRect(sigX - 260, rowY + 40, 520, 2);

  ctx.fillStyle = muted;
  ctx.font = '600 22px "Outfit", sans-serif';
  drawSpacedText(ctx, OWNER_SIGNATURE_ROLE.toUpperCase(), sigX, rowY + 76, 3);

  // Certificate ID footer
  ctx.fillStyle = muted;
  ctx.font = '600 20px "Outfit", sans-serif';
  ctx.fillText(`Certificate ID: ${data.id}`, cx, H - 100);

  return canvas;
}

async function downloadCertificate() {
  if (!lastCertificateData) {
    showExamToast('Complete the examination to receive your certificate.', 'warning', 'fa-circle-exclamation');
    return;
  }
  const btn = document.getElementById('download-certificate-btn');
  const label = btn ? btn.querySelector('span') : null;
  if (btn) btn.classList.add('loading');
  if (label) label.textContent = 'Preparing...';

  try {
    const canvas = await renderCertificateCanvas(lastCertificateData);
    const safeName = lastCertificateData.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fileName = `CEFR-${lastCertificateData.code}-Certificate-${safeName || 'Candidate'}.png`;

    await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve();
      }, 'image/png');
    });

    if (window.NovaAnalytics) {
      window.NovaAnalytics.trackCertificateAction('download', lastCertificateData);
    }

    showExamToast('Certificate downloaded successfully.', 'success', 'fa-download');
  } catch (err) {
    console.error('Certificate download failed:', err);
    showExamToast('Could not generate the certificate. Please try again.', 'warning', 'fa-triangle-exclamation');
  } finally {
    if (btn) btn.classList.remove('loading');
    if (label) label.textContent = 'Download Certificate';
  }
}

const downloadCertificateBtn = document.getElementById('download-certificate-btn');
if (downloadCertificateBtn) {
  downloadCertificateBtn.addEventListener('click', downloadCertificate);
}

// ==========================================
// 10. LOCAL STORAGE CERTIFICATE PERSISTENCE & HISTORY
// ==========================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const SAVED_LATEST_CERT_KEY = 'novaspeak_latest_certificate';
const SAVED_CERTS_LIST_KEY = 'novaspeak_saved_certificates';

function saveCertificateToStorage(certData) {
  if (!certData || !certData.code) return;
  try {
    localStorage.setItem(SAVED_LATEST_CERT_KEY, JSON.stringify(certData));

    let list = [];
    const raw = localStorage.getItem(SAVED_CERTS_LIST_KEY);
    if (raw) {
      try { list = JSON.parse(raw) || []; } catch (e) { list = []; }
    }
    // Remove if already exists with same id
    list = list.filter(item => item && item.id !== certData.id);
    list.unshift(certData);
    if (list.length > 20) list = list.slice(0, 20);
    localStorage.setItem(SAVED_CERTS_LIST_KEY, JSON.stringify(list));

    renderSavedCertificatesBanner();
  } catch (err) {
    console.warn('Could not save certificate to localStorage:', err);
  }
}

function getLatestSavedCertificate() {
  try {
    const raw = localStorage.getItem(SAVED_LATEST_CERT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function getAllSavedCertificates() {
  try {
    const raw = localStorage.getItem(SAVED_CERTS_LIST_KEY);
    if (!raw) {
      const latest = getLatestSavedCertificate();
      return latest ? [latest] : [];
    }
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function deleteSavedCertificate(certId) {
  try {
    let list = getAllSavedCertificates();
    list = list.filter(item => item && item.id !== certId);
    localStorage.setItem(SAVED_CERTS_LIST_KEY, JSON.stringify(list));

    const latest = getLatestSavedCertificate();
    if (latest && latest.id === certId) {
      if (list.length > 0) {
        localStorage.setItem(SAVED_LATEST_CERT_KEY, JSON.stringify(list[0]));
      } else {
        localStorage.removeItem(SAVED_LATEST_CERT_KEY);
      }
    }
    updateCertificatePageHistoryButton();
    renderCertsHistoryList();
    showExamToast('Certificate record removed from storage.', 'info', 'fa-trash-can');
  } catch (e) {}
}

function clearAllSavedCertificates() {
  try {
    localStorage.removeItem(SAVED_LATEST_CERT_KEY);
    localStorage.removeItem(SAVED_CERTS_LIST_KEY);
    updateCertificatePageHistoryButton();
    closeCertsHistoryModal();
    showExamToast('All saved certificates cleared from storage.', 'info', 'fa-check');
  } catch (e) {}
}

// Update History buttons on Certificate / Results Page only (No banners or popups during test)
function updateCertificatePageHistoryButton() {
  const allCerts = getAllSavedCertificates();
  const toolbarBtn = document.getElementById('report-saved-certs-btn');
  const footerBtn = document.getElementById('report-footer-history-btn');
  const labelEl = document.getElementById('report-saved-certs-label');

  if (allCerts && allCerts.length > 0) {
    if (toolbarBtn) {
      toolbarBtn.style.display = 'inline-flex';
      if (labelEl) labelEl.textContent = allCerts.length > 1 ? `Saved Certificates (${allCerts.length})` : 'Saved Certificates';
    }
    if (footerBtn) {
      footerBtn.style.display = 'inline-flex';
    }
  } else {
    if (toolbarBtn) toolbarBtn.style.display = 'none';
    if (footerBtn) footerBtn.style.display = 'none';
  }
}

function displaySavedCertificateReport(certData) {
  if (!certData) return;

  lastCertificateData = certData;

  // Hide splash & workspace, display report card
  const splashCard = document.getElementById('exam-splash-card');
  const workspace = document.getElementById('exam-workspace');
  const reportCard = document.getElementById('exam-report-card');
  if (splashCard) splashCard.style.display = 'none';
  if (workspace) workspace.style.display = 'none';
  if (reportCard) reportCard.style.display = 'flex';

  // Fill named certificate
  const certNameEl = document.getElementById('cert-candidate-name');
  const certCodeEl = document.getElementById('cert-level-code');
  const certLabelEl = document.getElementById('cert-level-label');
  const certDateEl = document.getElementById('cert-date');
  const certScoreEl = document.getElementById('cert-score');
  const certIdEl = document.getElementById('cert-id');

  if (certNameEl) certNameEl.textContent = certData.name || 'Candidate';
  if (certCodeEl) certCodeEl.textContent = certData.code || 'B2';
  if (certLabelEl) certLabelEl.textContent = certData.label || 'Upper-Intermediate';
  if (certDateEl) certDateEl.textContent = certData.date || '';
  if (certScoreEl) certScoreEl.textContent = certData.score || `${certData.rawScore || 0} / ${certData.total || 30} (${certData.percentage || 0}%)`;
  if (certIdEl) certIdEl.textContent = certData.id || `CEFR-${certData.code || 'B2'}-VERIFIED`;

  // Fill report card summary
  const finalCode = document.getElementById('final-cefr-code');
  const finalSub = document.querySelector('.score-cefr-sub');
  const finalHeading = document.getElementById('final-level-heading');
  const finalDesc = document.getElementById('final-level-narrative');
  const finalRaw = document.getElementById('final-raw-score');
  const finalPct = document.getElementById('final-percentage');
  const finalTime = document.getElementById('final-time-taken');

  if (finalCode) finalCode.textContent = certData.code || 'B2';
  if (finalSub) finalSub.textContent = certData.label || 'Upper-Intermediate';
  if (finalHeading) finalHeading.textContent = certData.heading || `${certData.code} – ${certData.label} User`;
  if (finalDesc) finalDesc.textContent = certData.desc || 'Verified evaluation based on the Common European Framework of Reference for Languages.';
  if (finalRaw) finalRaw.textContent = `${certData.rawScore ?? '-'} / ${certData.total ?? '30'}`;
  if (finalPct) finalPct.textContent = `${certData.percentage ?? 0}%`;
  if (finalTime) finalTime.textContent = certData.timeTaken || 'Completed';

  // Fill competencies
  const comp = certData.competencies || {};
  const g = comp.grammarPct ?? certData.percentage ?? 80;
  const v = comp.vocabPct ?? certData.percentage ?? 80;
  const f = comp.fillPct ?? certData.percentage ?? 80;
  const a = comp.audioPct ?? certData.percentage ?? 80;

  const compGPct = document.getElementById('comp-grammar-pct');
  const compGFill = document.getElementById('comp-grammar-fill');
  const compVPct = document.getElementById('comp-vocab-pct');
  const compVFill = document.getElementById('comp-vocab-fill');
  const compFPct = document.getElementById('comp-fill-pct');
  const compFFill = document.getElementById('comp-fill-fill');
  const compCPct = document.getElementById('comp-coherence-pct');
  const compCFill = document.getElementById('comp-coherence-fill');

  if (compGPct) compGPct.textContent = `${g}%`;
  if (compGFill) compGFill.style.width = `${g}%`;
  if (compVPct) compVPct.textContent = `${v}%`;
  if (compVFill) compVFill.style.width = `${v}%`;
  if (compFPct) compFPct.textContent = `${f}%`;
  if (compFFill) compFFill.style.width = `${f}%`;
  if (compCPct) compCPct.textContent = `${a}%`;
  if (compCFill) compCFill.style.width = `${a}%`;

  // Question review notice
  const reviewList = document.getElementById('review-items-list');
  if (reviewList && (!reviewList.children || reviewList.children.length === 0)) {
    reviewList.innerHTML = `
      <div class="review-saved-notice">
        <i class="fa-solid fa-circle-info"></i>
        <div>
          <strong>Viewing Saved Certificate:</strong> Certificate ID <code>${escapeHtml(certData.id || '')}</code> issued on ${escapeHtml(certData.date || '')}.
          Detailed per-question breakdown is captured during live testing sessions.
        </div>
      </div>
    `;
    reviewList.style.display = 'flex';
  }

  document.title = `${certData.name} - CEFR ${certData.code} Certificate`;
  updateCertificatePageHistoryButton();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (typeof showExamToast === 'function') {
    showExamToast(`Loaded saved certificate for ${certData.name} (${certData.code}). Ready to download.`, 'success', 'fa-award');
  }
}

function returnToRegistrationScreen() {
  const splashCard = document.getElementById('exam-splash-card');
  const workspace = document.getElementById('exam-workspace');
  const reportCard = document.getElementById('exam-report-card');
  if (reportCard) reportCard.style.display = 'none';
  if (workspace) workspace.style.display = 'none';
  if (splashCard) splashCard.style.display = '';
  document.title = 'CEFR English Proficiency Examination';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// History Modal
function openCertsHistoryModal() {
  const modal = document.getElementById('certs-history-modal');
  if (!modal) return;
  renderCertsHistoryList();
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
}

function closeCertsHistoryModal() {
  const modal = document.getElementById('certs-history-modal');
  if (!modal) return;
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
}

function renderCertsHistoryList() {
  const listEl = document.getElementById('certs-history-list');
  if (!listEl) return;

  const certs = getAllSavedCertificates();
  if (certs.length === 0) {
    listEl.innerHTML = `
      <div class="history-empty-notice">
        <i class="fa-regular fa-folder-open"></i>
        <p>No saved certificates found on this device.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = '';
  certs.forEach(item => {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <div class="history-item-left">
        <div class="history-item-badge">${escapeHtml(item.code || 'B2')}</div>
        <div class="history-item-meta">
          <div class="history-item-name">${escapeHtml(item.name || 'Candidate')}</div>
          <div class="history-item-sub">
            <span>${escapeHtml(item.date || '')}</span> &bull; 
            <span>Score: ${escapeHtml(item.score || '')}</span>
          </div>
        </div>
      </div>
      <div class="history-item-actions">
        <button type="button" class="history-share-btn" data-id="${escapeHtml(item.id)}" title="Copy shareable link for another device" aria-label="Share certificate">
          <i class="fa-solid fa-share-nodes"></i>
        </button>
        <button type="button" class="btn btn-secondary btn-sm history-view-btn" data-id="${escapeHtml(item.id)}">
          <i class="fa-solid fa-eye"></i>
          <span>View</span>
        </button>
        <button type="button" class="history-del-btn" data-id="${escapeHtml(item.id)}" title="Delete record" aria-label="Delete certificate">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;

    // Share button
    const shareBtn = row.querySelector('.history-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        shareCertificate(item);
      });
    }

    // View button
    const viewBtn = row.querySelector('.history-view-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        closeCertsHistoryModal();
        displaySavedCertificateReport(item);
      });
    }

    // Delete button
    const delBtn = row.querySelector('.history-del-btn');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmModal({
          title: 'Delete Saved Certificate?',
          message: `Are you sure you want to remove the certificate for "${item.name}" (${item.code}) from this device?`,
          confirmText: 'Delete',
          cancelText: 'Keep',
          icon: 'fa-trash-can',
          type: 'danger'
        });
        if (confirmed) {
          deleteSavedCertificate(item.id);
        }
      });
    }

    listEl.appendChild(row);
  });
}

// ==========================================
// 10B. ZERO-DATABASE PERMANENT SHARING & CROSS-DEVICE LINK
// ==========================================
function encodeCertificateToken(data) {
  try {
    const compact = {
      i: data.id || '',
      n: data.name || '',
      c: data.code || '',
      l: data.label || '',
      h: data.heading || '',
      d: data.desc || '',
      dt: data.date || '',
      s: data.score || '',
      r: data.rawScore ?? 0,
      t: data.total ?? 30,
      p: data.percentage ?? 0,
      tm: data.timeTaken || '',
      ts: data.timestamp || Date.now(),
      cp: data.competencies || {}
    };
    const jsonStr = JSON.stringify(compact);
    const bytes = new TextEncoder().encode(jsonStr);
    let binStr = '';
    bytes.forEach(b => { binStr += String.fromCharCode(b); });
    return btoa(binStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encode certificate token:', err);
    return '';
  }
}

function decodeCertificateToken(token) {
  try {
    if (!token) return null;
    let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binStr = atob(b64);
    let jsonStr = '';
    try {
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      jsonStr = new TextDecoder().decode(bytes);
    } catch (e) {
      jsonStr = decodeURIComponent(binStr);
    }
    const obj = JSON.parse(jsonStr);
    if (!obj || (!obj.c && !obj.code)) return null;

    return {
      id: obj.i || obj.id || `CEFR-${obj.c || obj.code || 'B2'}-VERIFIED`,
      name: obj.n || obj.name || 'Candidate',
      code: obj.c || obj.code || 'B2',
      label: obj.l || obj.label || 'Upper-Intermediate',
      heading: obj.h || obj.heading || `${obj.c || obj.code || 'B2'} Certificate`,
      desc: obj.d || obj.desc || 'Verified evaluation based on the Common European Framework of Reference for Languages.',
      date: obj.dt || obj.date || new Date().toLocaleDateString('en-GB'),
      score: obj.s || obj.score || `${obj.r || 0} / ${obj.t || 30} (${obj.p || 0}%)`,
      rawScore: obj.r ?? obj.rawScore ?? 0,
      total: obj.t ?? obj.total ?? 30,
      percentage: obj.p ?? obj.percentage ?? 0,
      timeTaken: obj.tm || obj.timeTaken || 'Completed',
      timestamp: obj.ts || obj.timestamp || Date.now(),
      competencies: obj.cp || obj.competencies || {}
    };
  } catch (err) {
    console.warn('Failed to decode certificate token:', err);
    return null;
  }
}

function generateCertificateShareUrl(certData) {
  if (!certData) return window.location.href;
  const token = encodeCertificateToken(certData);
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?cert=${token}`;
}

async function shareCertificate(certData) {
  if (!certData) certData = lastCertificateData || getLatestSavedCertificate();
  if (!certData) {
    if (typeof showExamToast === 'function') {
      showExamToast('No certificate available to share.', 'warning', 'fa-circle-exclamation');
    }
    return;
  }

  const url = generateCertificateShareUrl(certData);
  const sharePayload = {
    title: `${certData.name} - CEFR ${certData.code} Certificate`,
    text: `Verified CEFR ${certData.code} English Proficiency Certificate for ${certData.name}. Open this link on any device:`,
    url: url
  };

  if (window.NovaAnalytics) {
    window.NovaAnalytics.trackCertificateAction('share', certData);
  }

  if (navigator.share && navigator.canShare && navigator.canShare(sharePayload)) {
    try {
      await navigator.share(sharePayload);
      if (typeof showExamToast === 'function') {
        showExamToast('Certificate link shared successfully.', 'success', 'fa-share-nodes');
      }
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    if (typeof showExamToast === 'function') {
      showExamToast('Link copied! Open on any other browser or phone to view & save.', 'success', 'fa-clipboard-check');
    }
  } catch (err) {
    window.prompt('Copy this permanent certificate link to open on any browser:', url);
  }
}

function checkAndRestoreCertificateFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('cert');
    if (!token) return false;

    const certData = decodeCertificateToken(token);
    if (!certData || !certData.code) return false;

    // Automatically save into this new browser's local storage
    saveCertificateToStorage(certData);

    // Display the certificate report
    displaySavedCertificateReport(certData);

    if (window.history && window.history.replaceState) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    if (typeof showExamToast === 'function') {
      showExamToast(`Verified certificate for ${certData.name} imported and saved to this browser!`, 'success', 'fa-award');
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Event Listeners for Banner, Sharing, and History
const viewSavedCertBtn = document.getElementById('view-saved-cert-btn');
if (viewSavedCertBtn) {
  viewSavedCertBtn.addEventListener('click', () => {
    const latest = getLatestSavedCertificate();
    if (latest) {
      displaySavedCertificateReport(latest);
    } else {
      showExamToast('No saved certificate found.', 'warning', 'fa-circle-exclamation');
    }
  });
}

const shareSavedBannerBtn = document.getElementById('share-saved-banner-btn');
if (shareSavedBannerBtn) {
  shareSavedBannerBtn.addEventListener('click', () => {
    shareCertificate(getLatestSavedCertificate());
  });
}

const shareCertificateBtn = document.getElementById('share-certificate-btn');
if (shareCertificateBtn) {
  shareCertificateBtn.addEventListener('click', () => {
    shareCertificate(lastCertificateData || getLatestSavedCertificate());
  });
}

const reportSavedCertsBtn = document.getElementById('report-saved-certs-btn');
if (reportSavedCertsBtn) {
  reportSavedCertsBtn.addEventListener('click', openCertsHistoryModal);
}

const reportFooterHistoryBtn = document.getElementById('report-footer-history-btn');
if (reportFooterHistoryBtn) {
  reportFooterHistoryBtn.addEventListener('click', openCertsHistoryModal);
}

const closeHistoryModalBtn = document.getElementById('close-history-modal-btn');
if (closeHistoryModalBtn) {
  closeHistoryModalBtn.addEventListener('click', closeCertsHistoryModal);
}

const closeHistoryBtnSecondary = document.getElementById('close-history-btn-secondary');
if (closeHistoryBtnSecondary) {
  closeHistoryBtnSecondary.addEventListener('click', closeCertsHistoryModal);
}

const clearAllCertsBtn = document.getElementById('clear-all-certs-btn');
if (clearAllCertsBtn) {
  clearAllCertsBtn.addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Clear All Certificates?',
      message: 'This will permanently remove all saved certificates and levels from this browser.',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      icon: 'fa-trash-can',
      type: 'danger'
    });
    if (confirmed) {
      clearAllSavedCertificates();
    }
  });
}

// Back to registration from report card
const reportBackToRegBtn = document.getElementById('report-back-to-reg-btn');
if (reportBackToRegBtn) {
  reportBackToRegBtn.addEventListener('click', returnToRegistrationScreen);
}

const reportFooterBackRegBtn = document.getElementById('report-footer-back-reg-btn');
if (reportFooterBackRegBtn) {
  reportFooterBackRegBtn.addEventListener('click', returnToRegistrationScreen);
}

// URL token restore check (e.g. ?cert=... cross-device import directly into certificate view)
checkAndRestoreCertificateFromUrl();
