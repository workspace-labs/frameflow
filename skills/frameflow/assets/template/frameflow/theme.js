/* frameflow: the page's colours, worked out from the app's own two colours (its background and its main
   button colour), so every storyboard follows its app. Pure numbers: no page access, so Node's tests run it. */
(function (root) {
  "use strict";

  // With no colours given, the storyboard wears frameflow's own: a light page and its blue.
  var DEFAULT = { stage: "#f3f4f6", accent: "#3d5afe" };
  var HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  // The big number and the tap marker are drawn in the accent on the stage: below this they cannot be seen.
  var MIN_CONTRAST = 2;

  // "#abc" or "#AABBCC" → "#aabbcc"; anything else → "".
  function hex(value) {
    var m = HEX.exec(String(value || "").trim());
    if (!m) return "";
    var h = m[1].toLowerCase();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return "#" + h;
  }

  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }

  // How light a colour is, 0 (black) to 1 (white), the way the eye weighs red, green and blue (WCAG).
  function luminance(h) {
    var c = rgb(h).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  // `part` of colour a, the rest colour b.
  function mix(a, b, part) {
    var x = rgb(a), y = rgb(b);
    return "#" + x.map(function (v, i) {
      return ("0" + Math.round(v * part + y[i] * (1 - part)).toString(16)).slice(-2);
    }).join("");
  }

  function hue(colour) {
    var channels = rgb(colour);
    var r = channels[0], g = channels[1], b = channels[2];
    var high = Math.max(r, g, b);
    var span = high - Math.min(r, g, b);
    if (span === 0) return null;
    var sector;
    if (high === r) sector = (g - b) / span;
    else if (high === g) sector = 2 + (b - r) / span;
    else sector = 4 + (r - g) / span;
    return (sector * 60 + 360) % 360;
  }

  function nearRed(accent, red) {
    var accentHue = hue(accent);
    if (accentHue === null) return false;
    var distance = Math.abs(accentHue - hue(red));
    return Math.min(distance, 360 - distance) <= 40;
  }

  function mapColours(t) {
    var bg = t.bg, acc = t.acc, ink = t.ink, red = t.red, dark = t.dark;
    var first = dark ? "#4ade80" : mix("#15803d", ink, 0.7);
    var second = dark ? red : mix(red, ink, 0.7);
    var neutral = nearRed(acc, red);
    var neutralFill = mix(ink, bg, 0.08);
    var neutralLine = mix(ink, bg, 0.3);
    var panel = neutral ? neutralFill : mix(acc, bg, 0.05);
    var step = neutral ? neutralFill : mix(acc, bg, 0.14);
    var oval = neutral ? neutralFill : mix(acc, bg, 0.26);
    var wrong = mix(red, bg, 0.14);
    var decision = dark ? mix("#f5c542", bg, 0.3) : "#fde68a";
    var done = dark ? mix("#4ade80", bg, 0.22) : "#cdefd9";

    // Midtone stages can make the original document ink unreadable on some tints.
    // Adjust map text toward ink when it passes, otherwise toward the higher-contrast endpoint.
    function readable(text, fill) {
      if (contrast(text, fill) >= 4.5) return text;
      var endpoint = ink;
      if (contrast(ink, fill) < 4.5) {
        endpoint = contrast("#000000", fill) >= contrast("#ffffff", fill) ? "#000000" : "#ffffff";
      }
      for (var weight = 7; weight > 0; weight--) {
        var adjusted = mix(text, endpoint, weight / 10);
        if (contrast(adjusted, fill) >= 4.5) return adjusted;
      }
      return endpoint;
    }

    return {
      "step-fill": step, "step-line": neutral ? neutralLine : mix(acc, bg, 0.45), "step-text": readable(ink, step),
      "oval-fill": oval, "oval-line": neutral ? neutralLine : mix(acc, bg, 0.55), "oval-text": readable(ink, oval),
      "wrong-fill": wrong, "wrong-line": mix(red, bg, 0.5), "wrong-text": readable(second, wrong),
      "decision-fill": decision, "decision-line": dark ? "#f5c542" : "#e3be3e", "decision-text": readable(dark ? ink : "#5b4300", decision),
      "done-fill": done, "done-line": dark ? "#4ade80" : "#86cfa2", "done-text": readable(dark ? ink : "#14532d", done),
      first: readable(first, bg), second: readable(second, bg),
      ink: readable(ink, bg), muted: readable(t.mute, bg),
      panel: panel, "panel-line": neutral ? neutralLine : t.line, "panel-ink": readable(ink, panel), "panel-muted": readable(t.mute, panel),
      "panel-first": readable(first, panel), "panel-second": readable(second, panel)
    };
  }

  /* Every colour the page uses. stage and accent are 6-digit hex (or empty for frameflow's own). */
  function theme(stage, accent) {
    var bg = hex(stage) || DEFAULT.stage;
    var acc = hex(accent) || DEFAULT.accent;
    var dark = luminance(bg) < 0.4;
    var ink = dark ? "#eef1f3" : "#15171c";
    var red = dark ? "#ff6b5e" : "#d92d20";
    var colours = {
      dark: dark, bg: bg, ink: ink, acc: acc, red: red,
      mute: mix(ink, bg, 0.52),
      line: mix(ink, bg, 0.12),
      bezel: dark ? mix("#ffffff", bg, 0.09) : ink,
      bezelLine: dark ? mix("#ffffff", bg, 0.2) : ink,
      onAcc: luminance(acc) > 0.4 ? "#0b0d10" : "#ffffff",
      onRed: dark ? "#1a0503" : "#ffffff",
      glow: mix(acc, bg, 0.2),
      glowRed: mix(red, bg, 0.2),
      // "r, g, b" for the see-through rings around a tap marker.
      accRgb: rgb(acc).join(", "),
      redRgb: rgb(red).join(", ")
    };
    colours.map = mapColours(colours);
    return colours;
  }

  var api = { DEFAULT: DEFAULT, MIN_CONTRAST: MIN_CONTRAST, hex: hex, luminance: luminance, contrast: contrast, mix: mix, theme: theme };
  root.Frameflow = root.Frameflow || {};
  root.Frameflow.theme = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
