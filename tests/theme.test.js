const test = require("node:test");
const assert = require("node:assert/strict");
const { contrast, mix, theme } = require("../skills/frameflow/assets/template/frameflow/theme.js");

const LIGHT = ["#f3f4f6", "#f2541b"];
const DARK = ["#101726", "#ffc24a"];
const SHAPES = ["step", "oval", "wrong", "decision", "done"];

test("the flow map preserves the existing light and dark storyboard colours", () => {
  const { map: lightMap, ...light } = theme(...LIGHT);
  assert.deepEqual(light, {
    dark: false, bg: "#f3f4f6", ink: "#15171c", acc: "#f2541b", red: "#d92d20",
    mute: "#808185", line: "#d8d9dc", bezel: "#15171c", bezelLine: "#15171c", onAcc: "#ffffff",
    onRed: "#ffffff", glow: "#f3d4ca", glowRed: "#eecccb", accRgb: "242, 84, 27", redRgb: "217, 45, 32"
  });
  const { map: darkMap, ...dark } = theme(...DARK);
  assert.deepEqual(dark, {
    dark: true, bg: "#101726", ink: "#eef1f3", acc: "#ffc24a", red: "#ff6b5e",
    mute: "#838891", line: "#2b313f", bezel: "#262c3a", bezelLine: "#404551", onAcc: "#0b0d10",
    onRed: "#1a0503", glow: "#40392d", glowRed: "#402831", accRgb: "255, 194, 74", redRgb: "255, 107, 94"
  });
});

test("the light map uses the approved shape colours and revised red and green text", () => {
  const { map, acc, bg, ink, red } = theme(LIGHT[0], "#0f766e");
  const redText = mix(red, ink, 0.7);
  assert.deepEqual(SHAPES.map((shape) => [map[shape + "-fill"], map[shape + "-line"], map[shape + "-text"]]), [
    [mix(acc, bg, 0.14), mix(acc, bg, 0.45), ink],
    [mix(acc, bg, 0.26), mix(acc, bg, 0.55), ink],
    [mix(red, bg, 0.14), mix(red, bg, 0.5), redText],
    ["#fde68a", "#e3be3e", "#5b4300"],
    ["#cdefd9", "#86cfa2", "#14532d"]
  ]);
  assert.equal(map.first, mix("#15803d", ink, 0.7));
  assert.equal(map.second, redText);
});

test("the dark map keeps the approved error, decision and done colours with a neutral yellow-accent tint", () => {
  const { map, bg, ink, red } = theme(...DARK);
  assert.deepEqual(SHAPES.map((shape) => [map[shape + "-fill"], map[shape + "-line"], map[shape + "-text"]]), [
    [mix(ink, bg, 0.08), mix(ink, bg, 0.3), ink],
    [mix(ink, bg, 0.08), mix(ink, bg, 0.3), ink],
    [mix(red, bg, 0.14), mix(red, bg, 0.5), red],
    [mix("#f5c542", bg, 0.3), "#f5c542", ink],
    [mix("#4ade80", bg, 0.22), "#4ade80", ink]
  ]);
  assert.equal(map.first, "#4ade80");
  assert.equal(map.second, red);
});

test("orange and rose accents use neutral fills and borders for steps, goal cards, ovals and the panel", () => {
  for (const accent of ["#f2541b", "#e11d48"]) {
    const { bg, ink, map } = theme(LIGHT[0], accent);
    const fill = mix(ink, bg, 0.08);
    const border = mix(ink, bg, 0.3);
    assert.equal(map["step-fill"], fill, accent);
    assert.equal(map["step-line"], border, accent);
    assert.equal(map["oval-fill"], fill, accent);
    assert.equal(map["oval-line"], border, accent);
    assert.equal(map.panel, fill, accent);
    assert.equal(map["panel-line"], border, accent);
    for (const role of ["step-text", "oval-text", "panel-ink"]) assert.equal(map[role], ink, accent);
  }
});

test("teal and indigo accents keep the map's accent tints", () => {
  for (const accent of ["#0f766e", "#5b5bd6"]) {
    const { bg, line, map } = theme(LIGHT[0], accent);
    assert.equal(map["step-fill"], mix(accent, bg, 0.14), accent);
    assert.equal(map["step-line"], mix(accent, bg, 0.45), accent);
    assert.equal(map["oval-fill"], mix(accent, bg, 0.26), accent);
    assert.equal(map["oval-line"], mix(accent, bg, 0.55), accent);
    assert.equal(map.panel, mix(accent, bg, 0.05), accent);
    assert.equal(map["panel-line"], line, accent);
  }
});

test("every shape and label meets 4.5:1 contrast on light, dark, and midtone maps", () => {
  for (const colors of [LIGHT, DARK, [LIGHT[0], "#e11d48"], [LIGHT[0], "#0f766e"], [LIGHT[0], "#5b5bd6"],
    ["#a5a5a5", "#000000"], ["#a5a5a5", "#a60000"], ["#9c9c9c", "#ffffff"], ["#aaaaaa", "#000000"]]) {
    const { bg, map } = theme(...colors);
    for (const shape of SHAPES) {
      assert.ok(contrast(map[shape + "-text"], map[shape + "-fill"]) >= 4.5, shape + " on " + bg);
    }
    for (const label of ["ink", "muted", "first", "second"]) {
      assert.ok(contrast(map[label], bg) >= 4.5, label + " on " + bg);
      assert.ok(contrast(map["panel-" + label], map.panel) >= 4.5, label + " on the " + bg + " panel");
    }
  }
});
