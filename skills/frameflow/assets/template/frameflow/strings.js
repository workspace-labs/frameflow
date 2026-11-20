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
      flow: {
        title: "User flow", mapPage: "Map {n} of {m}", check: "Path check",
        goal: "GOAL", starts: "STARTS", ends: "ENDS", start: "Start", end: "End",
        step: "Step", done: "Done", decision: "Decision", wrong: "If it goes wrong", oval: "Start / End",
        counts: "{steps} · {decisions} · {wrongWays}",
        stepCount: ["{n} step", "{n} steps"],
        decisionCount: ["{n} decision", "{n} decisions"],
        wrongCount: ["{n} wrong way", "{n} wrong ways"],
        continued: "{t} · continued",
        continuationKey: "Follow the matching number on the other map page.",
        questions: ["Can they reach the goal easily?", "No steps they do not need?",
          "Every decision leads somewhere?", "Can they recover from mistakes?"],
        fastest: "{story}: {count}",
        blocked: '"{story}" never reaches its end. Its route stays among screens {screens}.',
        unreachable: 'Screen {n} "{name}" in "{story}": nothing leads to it from the start.',
        sameEnd: '"{question}" sends both answers to the end.',
        sameScreen: '"{question}" sends both answers to screen {n}.',
        stops: '"{name}" stops the story (→ end). Add a way back.',
        allReached: "Every screen can be reached from the start of its story.",
        allDecisions: "Each decision has two different destinations.",
        allRecover: "Every error has a way back to a screen.",
        noDecisions: "No decisions in this flow.",
        noWrongWays: 'No "if it goes wrong" pages yet.',
        more: "Additional findings: {n}",
        mapTooLarge: 'The flow map for "{story}" does not fit. Split it into shorter stories.',
        mapRoute: 'The arrows in "{story}" do not fit around its boxes. Split it into shorter stories.',
        fitMapText: '"{t}" does not fit on the flow map. Shorten its text.',
        fitCheck: "The path check does not fit. Shorten the story, screen or decision names.",
        fitCards: "The goal, start or end text does not fit. Shorten goal, starts or ends."
      },
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
      flow: {
        title: "مسار المستخدم", mapPage: "الخريطة {n} من {m}", check: "فحص المسار",
        goal: "الهدف", starts: "نقطة البداية", ends: "نقطة النهاية", start: "البداية", end: "النهاية",
        step: "خطوة", done: "تمّ", decision: "قرار", wrong: "إذا حدث خطأ", oval: "البداية / النهاية",
        counts: "{steps} · {decisions} · {wrongWays}",
        stepCount: ["الخطوات {n}", "الخطوات {n}"],
        decisionCount: ["القرارات {n}", "القرارات {n}"],
        wrongCount: ["مسارات الخطأ {n}", "مسارات الخطأ {n}"],
        continued: "{t} · تابع",
        continuationKey: "تابع إلى الرقم المطابق في صفحة الخريطة الأخرى.",
        questions: ["هل يمكن الوصول إلى الهدف بسهولة؟", "هل يمكن الوصول إلى كل خطوة؟",
          "هل لكل قرار وجهتان مختلفتان؟", "هل يمكن المتابعة بعد حدوث خطأ؟"],
        fastest: "{story}: {count}",
        blocked: "لا تصل قصة «{story}» إلى نهايتها. يبقى مسارها بين الشاشات {screens}.",
        unreachable: "لا يمكن الوصول من البداية إلى الشاشة {n} «{name}» في قصة «{story}».",
        sameEnd: "يوصل كلا الجوابين عن «{question}» إلى النهاية.",
        sameScreen: "يوصل كلا الجوابين عن «{question}» إلى الشاشة {n}.",
        stops: "يُنهي الخطأ «{name}» القصة (→ end). أضف مسارًا للعودة.",
        allReached: "يمكن الوصول إلى كل شاشة من بداية قصتها.",
        allDecisions: "لكل قرار وجهتان مختلفتان.",
        allRecover: "لكل خطأ مسار للعودة إلى إحدى الشاشات.",
        noDecisions: "لا توجد قرارات في هذا المسار.",
        noWrongWays: "لا توجد صفحات للأخطاء بعد.",
        more: "نتائج إضافية: {n}",
        mapTooLarge: "خريطة قصة «{story}» لا تتسع. قسّمها إلى قصص أقصر.",
        mapRoute: "لا تتسع الأسهم حول عناصر قصة «{story}». قسّمها إلى قصص أقصر.",
        fitMapText: "النص «{t}» لا يتسع في خريطة المسار. اختصره.",
        fitCheck: "لا يتسع فحص المسار. اختصر أسماء القصص أو الشاشات أو القرارات.",
        fitCards: "نص الهدف أو البداية أو النهاية لا يتسع. اختصر goal أو starts أو ends."
      },
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
