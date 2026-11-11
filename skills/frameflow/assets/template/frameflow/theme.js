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

  /* Every colour the page uses. stage and accent are 6-digit hex (or empty for frameflow's own). */
  function theme(stage, accent) {
    var bg = hex(stage) || DEFAULT.stage;
    var acc = hex(accent) || DEFAULT.accent;
    var dark = luminance(bg) < 0.4;
    var ink = dark ? "#eef1f3" : "#15171c";
    var red = dark ? "#ff6b5e" : "#d92d20";
    return {
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
  }

  var api = { DEFAULT: DEFAULT, MIN_CONTRAST: MIN_CONTRAST, hex: hex, luminance: luminance, contrast: contrast, mix: mix, theme: theme };
  root.Frameflow = root.Frameflow || {};
  root.Frameflow.theme = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
