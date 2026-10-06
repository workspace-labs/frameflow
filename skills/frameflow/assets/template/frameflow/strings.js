/* frameflow: every word the page prints itself, in English and Arabic.
   Dates use fixed month names, never the computer's language, so the same file prints the same page anywhere. */
(function (root) {
  "use strict";

  var WORDS = {
    en: {
      appFlow: "App flow",
      story: "Story {n} of {m}",
      part: "Part {n} of {m}",
      preparedFor: "Prepared for",
      preparedBy: "Prepared by",
      kind: "Kind",
      kinds: { phone: "Phone app", tablet: "Tablet app", desktop: "Desktop app", website: "Website" },
      version: "Version",
      status: "Status",
      draft: "Draft for review",
      approved: "Approved",
      approvedOn: "Approved · {date}",
      date: "Date",
      stories: "The stories",
      page: "Page {n}",
      pageOf: "Page {n} of {m}",
      goesTo: "Goes to {n}",
      backTo: "Back to {n}",
      end: "End",
      endsHere: "Ends here",
      continues: "Continues on the next page",
      shotMissing: "Screenshot missing",
      madeWith: "Made with frameflow · by WorkSpace Labs",
      lang: "en",
      dir: "ltr",
      printHint: "To save as PDF: Print → Save as PDF · Paper A4 · Margins None · Background graphics on.",
      cantDraw: "frameflow can't draw this storyboard yet",
      fixThese: "Fix these in app-flow.md, copy it into this page again, and reload.",
      line: "Line {n}: ",
      notDrawn: "The page could not be drawn: ",
      fitHero: "The project's name or its about line does not fit on the cover. Shorten it.",
      fitCover: "The cover is too full: the name, the about line, the stories and the details do not all fit. Shorten the name or the about line.",
      fitStories: "The list of stories does not fit on the cover. Shorten the story titles.",
      fitMeta: "The cover's details do not fit. Shorten client or by.",
      fitTitle: 'The story title "{t}" does not fit. Shorten it.',
      fitSummary: 'The line under "{t}" does not fit. Shorten it.',
      fitCaption: 'Screen {n} in "{t}": the caption does not fit under the frame. Shorten it.',
      fitError: 'Screen {n} in "{t}": "{e}" does not fit beside its frame. Shorten its caption.',
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September",
        "October", "November", "December"]
    },
    ar: {
      appFlow: "تدفق التطبيق",
      story: "القصة {n} من {m}",
      part: "الجزء {n} من {m}",
      preparedFor: "أُعدّ لـ",
      preparedBy: "إعداد",
      kind: "النوع",
      kinds: { phone: "تطبيق جوال", tablet: "تطبيق للأجهزة اللوحية", desktop: "تطبيق سطح المكتب", website: "موقع إلكتروني" },
      version: "الإصدار",
      status: "الحالة",
      draft: "مسودة للمراجعة",
      approved: "معتمد",
      approvedOn: "معتمد · {date}",
      date: "التاريخ",
      stories: "القصص",
      page: "صفحة {n}",
      pageOf: "صفحة {n} من {m}",
      goesTo: "ينتقل إلى {n}",
      backTo: "العودة إلى {n}",
      end: "النهاية",
      endsHere: "تنتهي هنا",
      continues: "يتبع في الصفحة التالية",
      shotMissing: "لقطة الشاشة غير متوفرة",
      madeWith: "صُنع باستخدام frameflow · من WorkSpace Labs",
      lang: "ar",
      dir: "rtl",
      printHint: "للحفظ بصيغة PDF: طباعة ← حفظ بصيغة PDF · الورق A4 · الهوامش بلا · رسومات الخلفية مفعّلة.",
      cantDraw: "لا يستطيع frameflow رسم هذه اللوحة بعد",
      fixThese: "صحّح ما يلي في app-flow.md، ثم انسخه إلى هذه الصفحة مرة أخرى وأعد تحميلها.",
      line: "السطر {n}: ",
      notDrawn: "تعذّر رسم الصفحة: ",
      fitHero: "اسم المشروع أو سطر الوصف لا يتسع في الغلاف. اختصره.",
      fitCover: "الغلاف ممتلئ: الاسم وسطر الوصف والقصص والتفاصيل لا تتسع معًا. اختصر الاسم أو سطر الوصف.",
      fitStories: "قائمة القصص لا تتسع في الغلاف. اختصر عناوين القصص.",
      fitMeta: "تفاصيل الغلاف لا تتسع. اختصر client أو by.",
      fitTitle: "عنوان القصة «{t}» لا يتسع. اختصره.",
      fitSummary: "السطر تحت «{t}» لا يتسع. اختصره.",
      fitCaption: "الشاشة {n} في «{t}»: الوصف لا يتسع تحت الإطار. اختصره.",
      fitError: "الشاشة {n} في «{t}»: «{e}» لا يتسع بجانب إطاره. اختصر وصفه.",
      months: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر",
        "أكتوبر", "نوفمبر", "ديسمبر"]
    }
  };

  function words(language) { return WORDS[language] || WORDS.en; }

  function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, function (_, key) { return values[key] === undefined ? "" : values[key]; });
  }

  // "2026-10-06" → "6 October 2026" (or "6 أكتوبر 2026"). Built by hand, never from the computer's locale.
  function day(iso, language) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return "";
    return Number(m[3]) + " " + words(language).months[Number(m[2]) - 1] + " " + m[1];
  }

  // "{n} screens", with Arabic's own counting forms.
  function screens(n, language) {
    if (language === "ar") {
      if (n === 1) return "شاشة واحدة";
      if (n === 2) return "شاشتان";
      if (n >= 3 && n <= 10) return n + " شاشات";
      return n + " شاشة";
    }
    return n === 1 ? "1 screen" : n + " screens";
  }

  var api = { WORDS: WORDS, words: words, fill: fill, day: day, screens: screens };
  root.Frameflow = root.Frameflow || {};
  root.Frameflow.strings = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
