# 📊 دليل ربط تحليلات ونتائج الاختبار مع Google Sheets و Google Analytics 4

يقوم هذا النظام بربط اختبار اللغة الإنجليزية مباشرة مع:
1. **Google Analytics 4 (GA4):** لقياس عدد الزوار، الزيارات اليومية، ونسبة من بدأ وأنهى الاختبار (Funnel Analysis).
2. **Google Sheets:** لتسجيل كل طالب يبدأ أو ينهي الامتحان في جدول بيانات إكسل خاص بك فورياً (الاسم، المستوى، الدرجات، ونسبة النطق).

---

## الخطوة 1: إعداد Google Sheets و Apps Script (دقيقتان)

1. افتح صفحة [Google Sheets](https://sheets.new) وأنشئ شيت جديد باسم: `NovaSpeak Exam Results`.
2. من القائمة العلوية للشيت، اضغط على **الاضافات (Extensions)** ⬅️ ثم **Apps Script**.
3. احذف أي كود موجود في المحرر وضع بدلاً منه هذا الكود البرمجي بالكامل:

```javascript
/**
 * =======================================================
 * Google Apps Script Webhook for NovaSpeak CEFR Exam & Traffic
 * =======================================================
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // إنشاء عناوين الأعمدة وتنسيقها تلقائياً إذا كان الشيت فارغاً
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "التاريخ والوقت المحلي",
        "نوع الحدث (Event Type)",
        "اسم الزائر / الطالب",
        "حالة الإجابات (كم سؤال تم حله)",
        "الدرجة النهائية (Score)",
        "النسبة المئوية (%)",
        "مستوى CEFR",
        "درجة النطق والتحدث (%)",
        "درجة القواعد (%)",
        "درجة المفردات (%)",
        "الزمن المستغرق",
        "تفاصيل النشاط والإحصائيات",
        "نوع الجهاز",
        "رقم الشهادة (Cert ID)"
      ]);
      
      // تنسيق صف العناوين بألوان المنصة
      var headerRange = sheet.getRange(1, 1, 1, 14);
      headerRange.setBackground("#5B51DE");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    var now = new Date();
    var formattedDate = Utilities.formatDate(now, "GMT+2", "yyyy-MM-dd HH:mm:ss");

    sheet.appendRow([
      formattedDate,
      data.eventType || (data.action === "exam_completed" ? "🏆 أنهى الامتحان وسلم الإجابات" : (data.action === "exam_started" ? "📝 بدأ الامتحان" : "👀 زائر للموقع")),
      data.candidateName || "زائر للموقع",
      data.answeredSummary || (data.answeredCount !== undefined ? data.answeredCount + " من " + (data.total || 30) : "—"),
      data.scoreText || "—",
      data.percentage || "—",
      (data.cefrCode && data.cefrCode !== "—" ? data.cefrCode + " (" + (data.cefrLevel || "") + ")" : (data.cefrLevel || "—")),
      data.speakingScore || "—",
      data.grammarScore || "—",
      data.vocabScore || "—",
      data.timeTaken || "—",
      data.details || "—",
      data.deviceType || "—",
      data.certificateId || "—"
    ]);

    // تلوين وتنسيق الصف بحسب نوع الحدث
    var lastRow = sheet.getLastRow();
    var rowRange = sheet.getRange(lastRow, 1, 1, 14);
    var badgeRange = sheet.getRange(lastRow, 2);

    if (data.action === "exam_completed") {
      rowRange.setBackground("#F0FDF4"); // خلفية خضراء ناعمة جداً
      badgeRange.setBackground("#DCFCE7").setFontColor("#15803D").setFontWeight("bold");
    } else if (data.action === "exam_started") {
      rowRange.setBackground("#FFFBEB"); // خلفية صفراء ناعمة
      badgeRange.setBackground("#FEF3C7").setFontColor("#B45309").setFontWeight("bold");
    } else {
      rowRange.setBackground("#F8FAFC"); // خلفية رمادية هادئة للزيارات
      badgeRange.setBackground("#E2E8F0").setFontColor("#475569");
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", row: lastRow }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("NovaSpeak Analytics Webhook is active and running!")
    .setMimeType(ContentService.MimeType.TEXT);
}
```

4. اضغط على أيقونة **حفظ (Save)** 💾.
5. اضغط في الأعلى على الزر الأزرق **نشر (Deploy)** ⬅️ ثم اختر **نشر جديد (New deployment)**.
6. اضغط على علامة الترس بجانب "Select type" واختر **Web app**.
7. املأ الإعدادات كالتالي:
   - **Description:** `NovaSpeak Logger`
   - **Execute as:** `Me (حسابك الشخصي)`
   - **Who has access:** `Anyone` (**هام جداً: اختر Anyone لكي يستطيع الموقع إرسال الدرجات**).
8. اضغط **Deploy** ووافق على الصلاحيات (Authorize access ⬅️ Advanced ⬅️ Go to script).
9. انسخ رابط الويب المعطى لك **Web app URL** (ينتهي عادة بـ `/exec`).

---

## الخطوة 2: وضع الرابط في ملف `analytics.js`

افتح ملف `analytics.js` في مشروعك، وضعه في السطر رقم 19:

```javascript
  const ANALYTICS_CONFIG = {
    // 1. ضع كود GA4 الخاص بك هنا:
    gaMeasurementId: 'G-XXXXXXXXXX',

    // 2. ضع رابط الـ Web app الذي نسخته من الخطوة 1 هنا:
    googleSheetsWebhookUrl: 'https://script.google.com/macros/s/AKfycb.../exec',

    debug: false
  };
```

---

## الخطوة 3: ربط Google Analytics 4 (GA4)

1. ادخل على [Google Analytics](https://analytics.google.com/).
2. أنشئ حساب وموقع جديد (Data Stream من نوع Web) وضع رابط موقعك.
3. انسخ **Measurement ID** الذي يبدأ بـ `G-` (مثال: `G-ABC123XYZ4`).
4. ضعه في ملف `analytics.js` مكان `G-XXXXXXXXXX`.

---

## ما هي الأحداث التي تُسجل تلقائياً؟

| اسم الحدث (Event) | أين يظهر؟ | البيانات المرسلة معه |
| :--- | :--- | :--- |
| `page_view` | في GA4 | عدد زوار الموقع والصفحات الأكثر زيارة والدول والأجهزة. |
| `exam_start` | في GA4 و Google Sheets | اسم الطالب ووقت بدء الامتحان. |
| `exam_milestone` | في GA4 | وصول الطالب لمحطات التحدث (Q10, Q20, Q30). |
| `exam_completed` | في GA4 و Google Sheets | اسم الطالب، النتيجة (Score)، النسبة المئوية، مستوى CEFR، درجات النطق والقواعد، والزمن. |
| `certificate_download` | في GA4 | قياس كم طالب قام بتحميل شهادته PDF / PNG. |
| `certificate_share` | في GA4 | قياس كم طالب شارك شهادته على لينكد إن أو واتساب. |
