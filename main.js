/**
 * English Site - Core Interactive Logic (Restored Original Layout with Professional Touches)
 * Zero Emojis - Vector Icons Only
 * 24-Question Placement Test with Non-Repeating Randomizer on Retake
 */

// ==========================================
// 1. GLOBAL TOAST NOTIFICATION ENGINE
// ==========================================
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

function showToast(message, type = 'info', icon = 'fa-circle-info') {
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

// ==========================================
// 2. THEME ENGINE (DARK / LIGHT MODE)
// ==========================================
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;

function applyTheme(theme) {
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

const savedTheme = localStorage.getItem('english_site_theme') || 'light';
applyTheme(savedTheme);

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('english_site_theme', newTheme);
    showToast(
      newTheme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled',
      'info',
      newTheme === 'dark' ? 'fa-moon' : 'fa-sun'
    );
  });
}

// ==========================================
// 3. NAVIGATION & SCROLL TRACKING
// ==========================================
// Mobile navigation drawer & backdrop controls
const menuBtn = document.getElementById('menu-btn');
const navbar = document.getElementById('navbar');
const navOverlay = document.getElementById('nav-overlay');
const scrollProgressBar = document.getElementById('scroll-progress');
const backToTopBtn = document.getElementById('back-to-top');

function openMobileMenu() {
  if (navbar) navbar.classList.add('active');
  if (navOverlay) navOverlay.classList.add('active');
  if (menuBtn) {
    menuBtn.classList.remove('fa-bars');
    menuBtn.classList.add('fa-xmark');
    menuBtn.setAttribute('aria-expanded', 'true');
  }
  document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
  if (navbar) navbar.classList.remove('active');
  if (navOverlay) navOverlay.classList.remove('active');
  if (menuBtn) {
    menuBtn.classList.remove('fa-xmark');
    menuBtn.classList.add('fa-bars');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  document.body.style.overflow = '';
}

if (menuBtn) {
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (navbar && navbar.classList.contains('active')) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });
}

if (navOverlay) {
  navOverlay.addEventListener('click', () => {
    closeMobileMenu();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navbar && navbar.classList.contains('active')) {
    closeMobileMenu();
  }
});

// ==========================================
// SCROLL-SPY & ACTIVE LINK MANAGEMENT
// ==========================================
const navHashLinks = document.querySelectorAll('.header .navbar .nav-item[href^="#"]');
const trackedSections = [];

navHashLinks.forEach((link) => {
  const hash = link.getAttribute('href');
  if (hash && hash.startsWith('#')) {
    const sectionEl = document.querySelector(hash);
    if (sectionEl) {
      trackedSections.push({
        id: hash.slice(1),
        el: sectionEl,
        link: link
      });
    }
  }
});

let isManualNavClick = false;
let navClickTimeout = null;

function setActiveNavLink(targetLink) {
  navHashLinks.forEach((item) => item.classList.remove('active'));
  if (targetLink) {
    targetLink.classList.add('active');
  }
}

// Click listener on all navbar links
document.querySelectorAll('.navbar .nav-item').forEach((link) => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        setActiveNavLink(link);
        link.blur();

        isManualNavClick = true;
        clearTimeout(navClickTimeout);
        navClickTimeout = setTimeout(() => {
          isManualNavClick = false;
          updateScrollSpy();
        }, 950);

        const headerOffset = 74;
        const targetTop = target.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - headerOffset;
        window.scrollTo({
          top: targetTop,
          behavior: 'smooth'
        });
      }
    }
    closeMobileMenu();
  });
});

function updateScrollSpy() {
  if (isManualNavClick) return;
  if (!trackedSections.length) return;

  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  const viewportHeight = window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;

  // At the very top, activate first link (Home)
  if (scrollY < 80) {
    setActiveNavLink(trackedSections[0].link);
    return;
  }

  // If scrolled to the bottom of the page, activate the last section (faq)
  if (scrollY + viewportHeight >= docHeight - 40) {
    setActiveNavLink(trackedSections[trackedSections.length - 1].link);
    return;
  }

  // Find the section that intersects the probe line (140px below top)
  const probe = 140;
  let matchingSection = null;

  for (let i = 0; i < trackedSections.length; i++) {
    const sec = trackedSections[i];
    const rect = sec.el.getBoundingClientRect();
    if (rect.top <= probe && rect.bottom > probe) {
      matchingSection = sec;
      break;
    }
  }

  // Fallback: if past probe, find closest passed section
  if (!matchingSection) {
    for (let i = trackedSections.length - 1; i >= 0; i--) {
      const sec = trackedSections[i];
      const rect = sec.el.getBoundingClientRect();
      if (rect.top <= probe) {
        matchingSection = sec;
        break;
      }
    }
  }

  if (matchingSection) {
    setActiveNavLink(matchingSection.link);
  }
}

window.addEventListener('scroll', () => {
  // Scroll progress bar
  const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollTotal > 0 && scrollProgressBar) {
    const progress = (window.scrollY / scrollTotal) * 100;
    scrollProgressBar.style.width = `${progress}%`;
  }

  // Back to top button
  if (backToTopBtn) {
    if (window.scrollY > 400) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  }

  // Active navigation link highlighting
  updateScrollSpy();
}, { passive: true });

if (backToTopBtn) {
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ==========================================
// 4. TYPED.JS INITIALIZATION (ZERO CLS)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const autoTypeElement = document.querySelector('.auto-type');
  if (autoTypeElement && typeof Typed !== 'undefined') {
    new Typed('.auto-type', {
      strings: [
        'all skill levels',
        'grammar & syntax',
        'lexical precision',
        'everyday fluency',
        'CEFR benchmarks (A1-C2)'
      ],
      typeSpeed: 45,
      backSpeed: 30,
      backDelay: 2200,
      loop: true,
      showCursor: true,
      cursorChar: '|'
    });
  }

  initCounterAnimation();
});

// ==========================================
// 5. STATS ANIMATED COUNTERS
// ==========================================
let animatedCounters = false;

function initCounterAnimation() {
  const statsSection = document.getElementById('stats');
  if (!statsSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animatedCounters) {
        animatedCounters = true;
        const counters = document.querySelectorAll('.stats .counter');
        counters.forEach(counter => {
          const target = parseFloat(counter.getAttribute('data-target'));
          const isDecimal = target % 1 !== 0;
          let count = 0;
          const speed = 40;
          const increment = target / speed;

          const updateCounter = () => {
            count += increment;
            if (count < target) {
              counter.textContent = isDecimal ? count.toFixed(1) : Math.ceil(count);
              setTimeout(updateCounter, 25);
            } else {
              counter.textContent = isDecimal ? target.toFixed(1) : target.toLocaleString();
            }
          };
          updateCounter();
        });
      }
    });
  }, { threshold: 0.3 });

  observer.observe(statsSection);
}

// ==========================================
// 6. CEFR EXAMINATION REDIRECT & SHOWCASE
// (All 30 questions, audio listening, and timed anti-cheating run on test.html)
// ==========================================
// ==========================================
// 7. FAQ ACCORDION
// ==========================================
const faqItems = document.querySelectorAll('#faq-list .faq-item');
faqItems.forEach(item => {
  const question = item.querySelector('.faq-question');
  if (question) {
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  }
});

// ==========================================
// 8. MODALS & GLOBAL APPLICATION INTERFACE
// ==========================================
const videoModal = document.getElementById('video-modal');
const closeVideoModalBtn = document.getElementById('close-video-modal');
const watchVideoBtn = document.getElementById('watch-video-btn');

if (watchVideoBtn) {
  watchVideoBtn.addEventListener('click', () => {
    window.EnglishApp.openVideoModal();
  });
}

if (closeVideoModalBtn) {
  closeVideoModalBtn.addEventListener('click', () => {
    window.EnglishApp.closeVideoModal();
  });
}

window.addEventListener('click', (e) => {
  if (e.target === videoModal) window.EnglishApp.closeVideoModal();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.EnglishApp.closeVideoModal();
  }
});

// Global API
window.EnglishApp = {
  copyScoreReport: () => {
    const title = document.getElementById('report-cefr-title') ? document.getElementById('report-cefr-title').textContent : 'B2 - Upper Intermediate';
    const desc = document.getElementById('report-cefr-desc') ? document.getElementById('report-cefr-desc').textContent : '';
    const textToCopy = `English Proficiency Assessment Result: ${title}\n${desc}\nEvaluated on English Site (CEFR Benchmarks).`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Assessment result copied to clipboard!', 'success', 'fa-copy');
      }).catch(() => {
        showToast('Score evaluated successfully!', 'info', 'fa-award');
      });
    } else {
      showToast('Score evaluated successfully!', 'info', 'fa-award');
    }
  },

  openVideoModal: () => {
    if (videoModal) {
      videoModal.classList.add('active');
      videoModal.setAttribute('aria-hidden', 'false');
    }
  },

  closeVideoModal: () => {
    if (videoModal) {
      videoModal.classList.remove('active');
      videoModal.setAttribute('aria-hidden', 'true');
    }
  },

  handleUpgradeForm: () => {
    const input = document.getElementById('upgrade-email-input');
    if (!input || !input.value) return;
    showToast(`Thank you! Learning roadmap sent to ${input.value}.`, 'success', 'fa-circle-check');
    input.value = '';
  }
};


