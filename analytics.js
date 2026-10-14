/**
 * ===================================================================
 * NOVASPEAK ADVANCED ANALYTICS & TELEMETRY MODULE
 * -------------------------------------------------------------------
 * Seamless dual integration:
 * 1. Google Analytics 4 (GA4): Traffic, User Funnel & Drop-off Analysis
 * 2. Google Sheets Webhook: Real-time Candidate Results, Scores & CEFR
 * ===================================================================
 */

(function () {
  'use strict';

  // --- CONFIGURATION ---
  const ANALYTICS_CONFIG = {
    // 1. Google Analytics 4 (GA4) Measurement ID
    // Paste your Measurement ID here (e.g., 'G-XXXXXXXXXX')
    gaMeasurementId: 'G-XXXXXXXXXX',

    // 2. Google Sheets Webhook URL (from Google Apps Script deployment)
    googleSheetsWebhookUrl: 'https://script.google.com/macros/s/AKfycbxe-seBYqSH59qQ10iFE3uKt73KQdMqaqLHgSlBigrnoxRa5So9rnh8KKljPyIJTUIL/exec',

    // Local logging & debug mode
    debug: false
  };

  // Local storage cache keys
  const STORAGE_LOCAL_LOGS_KEY = 'novaspeak_analytics_logs';
  const STORAGE_PENDING_QUEUE_KEY = 'novaspeak_pending_sheet_queue';

  /**
   * Safe logger
   */
  function logDebug(...args) {
    if (ANALYTICS_CONFIG.debug || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('[NovaAnalytics]', ...args);
    }
  }

  /**
   * Initialize GA4 gtag dynamically
   */
  function initGA4() {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = window.gtag || gtag;
    gtag('js', new Date());

    const isPlaceholder = !ANALYTICS_CONFIG.gaMeasurementId || ANALYTICS_CONFIG.gaMeasurementId.includes('XXXXX');
    if (!isPlaceholder) {
      gtag('config', ANALYTICS_CONFIG.gaMeasurementId, {
        send_page_view: true,
        cookie_flags: 'SameSite=None;Secure'
      });

      // Inject official Google Tag Manager script tag
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_CONFIG.gaMeasurementId)}`;
      document.head.appendChild(script);
      logDebug('GA4 script injected with ID:', ANALYTICS_CONFIG.gaMeasurementId);
    } else {
      logDebug('GA4 measurement ID is placeholder. Events will be logged locally and queued for GA4 once ID is added.');
    }
  }

  /**
   * Dispatch an event to GA4 safely
   */
  function trackGA4Event(eventName, params = {}) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
        logDebug('GA4 Event Tracked:', eventName, params);
      }
    } catch (err) {
      console.warn('[NovaAnalytics] GA4 event dispatch error:', err);
    }
  }

  /**
   * Save entry to local offline analytics log
   */
  function saveToLocalHistory(entry) {
    try {
      const existingRaw = localStorage.getItem(STORAGE_LOCAL_LOGS_KEY);
      const logs = existingRaw ? JSON.parse(existingRaw) : [];
      logs.unshift({
        ...entry,
        loggedAt: new Date().toISOString()
      });
      // Cap at 200 recent records
      if (logs.length > 200) logs.length = 200;
      localStorage.setItem(STORAGE_LOCAL_LOGS_KEY, JSON.stringify(logs));
    } catch (e) {}
  }

  /**
   * Transmit data payload to Google Sheets Webhook
   */
  async function sendToGoogleSheets(payload) {
    const webhookUrl = ANALYTICS_CONFIG.googleSheetsWebhookUrl;
    if (!webhookUrl || webhookUrl.trim() === '') {
      logDebug('Google Sheets Webhook URL not configured. Record stored in local history.');
      return;
    }

    try {
      // mode: 'no-cors' allows sending to Google Apps Script without CORS redirect blockers
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      logDebug('Successfully transmitted payload to Google Sheets:', payload);
    } catch (err) {
      console.warn('[NovaAnalytics] Google Sheets transmission error (queued for retry):', err);
      enqueueForRetry(payload);
    }
  }

  /**
   * Enqueue failed payload for retry on next network opportunity
   */
  function enqueueForRetry(payload) {
    try {
      const queueRaw = localStorage.getItem(STORAGE_PENDING_QUEUE_KEY);
      const queue = queueRaw ? JSON.parse(queueRaw) : [];
      queue.push({ payload, queuedAt: Date.now() });
      localStorage.setItem(STORAGE_PENDING_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {}
  }

  /**
   * Process any pending queued sheet transmissions
   */
  async function flushPendingQueue() {
    const webhookUrl = ANALYTICS_CONFIG.googleSheetsWebhookUrl;
    if (!webhookUrl || !navigator.onLine) return;

    try {
      const queueRaw = localStorage.getItem(STORAGE_PENDING_QUEUE_KEY);
      if (!queueRaw) return;
      const queue = JSON.parse(queueRaw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      localStorage.removeItem(STORAGE_PENDING_QUEUE_KEY);
      for (const item of queue) {
        await sendToGoogleSheets(item.payload);
      }
    } catch (e) {}
  }

  window.addEventListener('online', flushPendingQueue);

  // --- PUBLIC API (NovaAnalytics) ---
  const NovaAnalytics = {
    config: ANALYTICS_CONFIG,

    /**
     * Update configuration at runtime
     */
    configure(options = {}) {
      Object.assign(ANALYTICS_CONFIG, options);
      if (options.gaMeasurementId && !options.gaMeasurementId.includes('XXXXX')) {
        initGA4();
      }
    },

    /**
     * 1. Track Page View
     */
    trackPageView(pageTitle = document.title, pagePath = window.location.pathname) {
      trackGA4Event('page_view', {
        page_title: pageTitle,
        page_location: window.location.href,
        page_path: pagePath
      });
    },

    /**
     * 2. Track Exam Start (Candidate clicks Begin Exam)
     */
    trackExamStart(details = {}) {
      const payload = {
        action: 'exam_started',
        candidateName: details.candidateName || 'Candidate',
        totalQuestions: details.totalQuestions || 30,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };

      trackGA4Event('exam_start', {
        candidate_name: payload.candidateName,
        total_questions: payload.totalQuestions
      });

      saveToLocalHistory(payload);
      sendToGoogleSheets(payload);
    },

    /**
     * 3. Track Exam Milestone (e.g., reaching Q10, Q20, Q30 spoken checkpoints)
     */
    trackMilestone(milestoneName, questionNumber) {
      trackGA4Event('exam_milestone', {
        milestone: milestoneName,
        question_number: questionNumber
      });
    },

    /**
     * 4. Track Exam Completion (Final Submission)
     */
    trackExamCompletion(results = {}) {
      const payload = {
        action: 'exam_completed',
        candidateName: results.candidateName || 'Candidate',
        cefrCode: results.cefrCode || 'B2',
        cefrLevel: results.cefrLevel || 'Upper-Intermediate',
        scoreText: results.scoreText || `${results.rawScore || 0} / ${results.total || 30}`,
        rawScore: results.rawScore || 0,
        total: results.total || 30,
        percentage: results.percentage !== undefined ? results.percentage : 0,
        speakingScore: results.speakingScore !== undefined ? results.speakingScore : 0,
        grammarScore: results.grammarScore !== undefined ? results.grammarScore : 0,
        vocabScore: results.vocabScore !== undefined ? results.vocabScore : 0,
        timeTaken: results.timeTaken || '00:00',
        certificateId: results.certificateId || 'CEFR-CERT',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };

      // Comprehensive GA4 conversion event
      trackGA4Event('exam_completed', {
        candidate_name: payload.candidateName,
        cefr_code: payload.cefrCode,
        percentage: payload.percentage,
        raw_score: payload.rawScore,
        speaking_score: payload.speakingScore,
        duration: payload.timeTaken,
        value: payload.percentage, // Numeric value for conversion reporting
        currency: 'PTS'
      });

      saveToLocalHistory(payload);
      sendToGoogleSheets(payload);
    },

    /**
     * 5. Track Certificate Interactions
     */
    trackCertificateAction(actionType, certData = {}) {
      trackGA4Event(actionType === 'download' ? 'certificate_download' : 'certificate_share', {
        candidate_name: certData.name || '',
        cefr_code: certData.code || '',
        cert_id: certData.id || ''
      });
    },

    /**
     * 6. Retrieve Local Analytics Log & Aggregated Stats
     */
    getLocalStats() {
      try {
        const raw = localStorage.getItem(STORAGE_LOCAL_LOGS_KEY);
        const logs = raw ? JSON.parse(raw) : [];
        const completed = logs.filter(l => l.action === 'exam_completed');
        const started = logs.filter(l => l.action === 'exam_started');

        const cefrCounts = {};
        let scoreSum = 0;

        completed.forEach(c => {
          cefrCounts[c.cefrCode] = (cefrCounts[c.cefrCode] || 0) + 1;
          scoreSum += (c.percentage || 0);
        });

        return {
          totalStarted: started.length,
          totalCompleted: completed.length,
          completionRate: started.length > 0 ? Math.round((completed.length / started.length) * 100) + '%' : '100%',
          averagePercentage: completed.length > 0 ? Math.round(scoreSum / completed.length) + '%' : '0%',
          cefrDistribution: cefrCounts,
          recentLogs: logs.slice(0, 50)
        };
      } catch (e) {
        return { totalStarted: 0, totalCompleted: 0, completionRate: '0%', averagePercentage: '0%', cefrDistribution: {}, recentLogs: [] };
      }
    }
  };

  // Initialize immediately on load
  initGA4();
  setTimeout(flushPendingQueue, 2000);

  // Expose globally
  window.NovaAnalytics = NovaAnalytics;
})();
