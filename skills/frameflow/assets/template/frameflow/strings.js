/* frameflow: every word the page prints itself, in English and Arabic.
   Dates use fixed month names, never the computer's language, so the same file prints the same page anywhere. */
(function (root) {
  "use strict";

  var WORDS = {
    en: {
      appFlow: "App flow",
      storyLabel: "Story {n} · {t}",
      preparedFor: "Prepared for {t}",
      preparedBy: "by {t}",
      kinds: { phone: "Phone app", tablet: "Tablet app", desktop: "Desktop app", website: "Website" },
      draft: "Draft for review",
      approved: "Approved",
      approvedOn: "Approved · {date}",
      stories: "The stories",
      page: "page {n}",
      pageOf: "Page {n} of {m}",
      sees: "Sees",
      does: "Does",
      theStory: "The story",
      ifWrong: "If it goes wrong",
      after: "after {n}",
      goesTo: "Goes to {n} · {t}",
      backTo: "Back to {n} · {t}",
      backToShort: "back to",
      storyEnds: "The story ends here.",
      endsHere: "It ends here.",
      shotMissing: "Screenshot missing",
      madeWith: "Made with frameflow · by WorkSpace Labs",
      lang: "en",
      dir: "ltr",
      printHint: "To save as PDF: Print → Save as PDF · Paper A4 · Landscape · Margins None · Background graphics on.",
      cantDraw: "frameflow can't draw this storyboard yet",
      fixThese: "Fix these in app-flow.md, copy it into this page again, and reload.",
      line: "Line {n}: ",
      notDrawn: "The page could not be drawn: ",
      fitCover: "The cover is too full: the name, the about line and the stories do not all fit. Shorten the name or the about line.",
      fitMeta: "The cover's details do not fit. Shorten client or by.",
      fitCol: 'Screen {n} in "{t}": its name and caption do not fit beside the screen. Shorten the caption.',
      fitError: 'Screen {n} in "{t}": "{e}" does not fit beside its screen. Shorten its caption.',
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September",
        "October", "November", "December"]
    },
    ar: {
      appFlow: "تدفق التطبيق",
      storyLabel: "القصة {n} · {t}",
      preparedFor: "أُعدّ لـ {t}",
      preparedBy: "إعداد {t}",
      kinds: { phone: "تطبيق جوال", tablet: "تطبيق للأجهزة اللوحية", desktop: "تطبيق سطح المكتب", website: "موقع إلكتروني" },
      draft: "مسودة للمراجعة",
      approved: "معتمد",
      approvedOn: "معتمد · {date}",
      stories: "القصص",
      page: "صفحة {n}",
      pageOf: "صفحة {n} من {m}",
      sees: "يرى",
      does: "يفعل",
      theStory: "القصة",
      ifWrong: "إذا حدث خطأ",
      after: "بعد {n}",
      goesTo: "ينتقل إلى {n} · {t}",
      backTo: "العودة إلى {n} · {t}",
      backToShort: "العودة إلى",
      storyEnds: "تنتهي القصة هنا.",
      endsHere: "تنتهي هنا.",
      shotMissing: "لقطة الشاشة غير متوفرة",
      madeWith: "صُنع باستخدام frameflow · من WorkSpace Labs",
      lang: "ar",
      dir: "rtl",
      printHint: "للحفظ بصيغة PDF: طباعة ← حفظ بصيغة PDF · الورق A4 · أفقي · الهوامش بلا · رسومات الخلفية مفعّلة.",
      cantDraw: "لا يستطيع frameflow رسم هذه اللوحة بعد",
      fixThese: "صحّح ما يلي في app-flow.md، ثم انسخه إلى هذه الصفحة مرة أخرى وأعد تحميلها.",
      line: "السطر {n}: ",
      notDrawn: "تعذّر رسم الصفحة: ",
      fitCover: "الغلاف ممتلئ: الاسم وسطر الوصف والقصص لا تتسع معًا. اختصر الاسم أو سطر الوصف.",
      fitMeta: "تفاصيل الغلاف لا تتسع. اختصر client أو by.",
      fitCol: "الشاشة {n} في «{t}»: اسمها ووصفها لا يتسعان بجانب الشاشة. اختصر الوصف.",
      fitError: "الشاشة {n} في «{t}»: «{e}» لا يتسع بجانب شاشته. اختصر وصفه.",
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

  // Straight quote marks typed in the text copy are printed as curly ones in English: "Pay" → “Pay”, don't → don’t.
  function quotes(value, language) {
    if (!value || language === "ar") return value;
    return String(value).replace(/"([^"]*)"/g, "\u201C$1\u201D").replace(/(\w)'(\w)/g, "$1\u2019$2");
  }

  var api = { WORDS: WORDS, words: words, fill: fill, day: day, screens: screens, quotes: quotes };
  root.Frameflow = root.Frameflow || {};
  root.Frameflow.strings = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
