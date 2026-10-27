/* Quote Card — wrap() breaks lines by measured width in logical order; the browser shapes and orders RTL text via ctx.direction. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;
  var SIZES = { "1:1": [1080, 1080], "4:5": [1080, 1350], "9:16": [1080, 1920], "16:9": [1920, 1080] };
  var FONTS = [
    ["sans", "Sans (Inter)", 'Inter, "Segoe UI", Roboto, "Noto Sans Arabic", Tahoma, sans-serif'],
    ["serif", "Serif", 'Georgia, "Times New Roman", "Noto Naskh Arabic", "Traditional Arabic", serif'],
    ["rounded", "Rounded", '"Segoe UI Variable Display", "SF Pro Rounded", ui-rounded, "Nunito", "Segoe UI", "Noto Sans Arabic", sans-serif'],
    ["mono", "Typewriter", '"Courier New", Courier, ui-monospace, monospace'],
    ["naskh", "Arabic Naskh", '"Noto Naskh Arabic", "Traditional Arabic", "Simplified Arabic", "Times New Roman", serif'],
    ["kufi", "Arabic Sans", '"Noto Kufi Arabic", "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif'],
    ["impact", "Condensed", 'Impact, "Arial Narrow", "Roboto Condensed", "Noto Sans Arabic", sans-serif']
  ];
  var PRESETS = [
    ["Ocean", "#3dd6d0", "#3b5bdb", "#ffffff"], ["Sunset", "#ff9a6b", "#ff3d7f", "#ffffff"], ["Grape", "#7b6cf6", "#e45fd6", "#ffffff"],
    ["Night", "#141e30", "#243b55", "#f4f1e8"], ["Forest", "#134e3a", "#3fa66b", "#ffffff"], ["Peach", "#ffd59a", "#ff8a8a", "#2a1a12"],
    ["Paper", "#f6f1e7", "#efe6d2", "#2b2620"], ["Ink", "#0f1115", "#1d2129", "#eceef2"]
  ];
  var DEF = { text: "", author: "", handle: "", align: "center", marks: true, size: "1:1", font: "serif", weight: "600", fs: 0, lh: 1.3,
    ink: "#ffffff", accent: "#ffd166", bg: "gradient", c1: "#3dd6d0", c2: "#3b5bdb", ang: 135, dark: 45, blur: 0 };
  var st = Object.assign({}, DEF, S3.store("qc.settings") || {});
  var photo = null;
  var cv = $("#cv");

  // ---------- pure text logic (tested) ----------
  var RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-ﻼ]/, LTR_CHAR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/;
  function dirOf(s) { // direction of the first strong character
    for (var ch of String(s || "")) { if (RTL_CHAR.test(ch)) return "rtl"; if (LTR_CHAR.test(ch)) return "ltr"; }
    return "ltr";
  }
  // Greedy wrap in logical order. measure(str) -> width. Over-long words are split by characters.
  function wrap(text, maxW, measure) {
    var out = [];
    String(text).replace(/\r/g, "").split("\n").forEach(function (para) {
      var words = para.split(/[ \t]+/).filter(function (w) { return w !== ""; }), line = "";
      if (!words.length) { out.push(""); return; }
      words.forEach(function (w) {
        var tryLine = line ? line + " " + w : w;
        if (measure(tryLine) <= maxW) { line = tryLine; return; }
        if (line) { out.push(line); line = ""; }
        if (measure(w) <= maxW) { line = w; return; }
        var chunk = "";
        Array.from(w).forEach(function (ch) { if (chunk && measure(chunk + ch) > maxW) { out.push(chunk); chunk = ch; } else chunk += ch; });
        line = chunk;
      });
      out.push(line);
    });
    return out;
  }
  // Where a line is anchored for a given alignment and direction.
  function anchor(align, dir, W, pad) {
    if (align === "center") return { x: W / 2, textAlign: "center" };
    var left = (align === "start") === (dir === "ltr");
    return left ? { x: pad, textAlign: "left" } : { x: W - pad, textAlign: "right" };
  }

  // ---------- render ----------
  function fontStack(id) { return (FONTS.filter(function (f) { return f[0] === id; })[0] || FONTS[0])[2]; }
  function gradLine(W, H, deg) {
    var a = deg * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), len = Math.abs(W * dx) + Math.abs(H * dy);
    return [W / 2 - dx * len / 2, H / 2 - dy * len / 2, W / 2 + dx * len / 2, H / 2 + dy * len / 2];
  }
  function background(c, W, H, s, img) {
    if (s.bg === "photo" && img) {
      var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, k = Math.max(W / iw, H / ih), b = s.blur * W / 1080;
      c.save();
      if (b > 0) { c.filter = "blur(" + b + "px)"; k *= 1 + 4 * b / Math.min(W, H); } // overscan so the blur has no soft edge
      c.drawImage(img, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
      c.restore();
      c.fillStyle = "rgba(0,0,0," + s.dark / 100 + ")"; c.fillRect(0, 0, W, H);
      return;
    }
    if (s.bg === "solid") c.fillStyle = s.c1;
    else { var g = gradLine(W, H, s.ang), gr = c.createLinearGradient(g[0], g[1], g[2], g[3]); gr.addColorStop(0, s.c1); gr.addColorStop(1, s.c2); c.fillStyle = gr; }
    c.fillRect(0, 0, W, H);
  }
  function layoutText(c, s, W, H) {
    var text = s.text.trim() ? s.text : "Your words here.", dir = dirOf(text), fam = fontStack(s.font);
    var pad = Math.round(Math.min(W, H) * 0.09), boxW = W - 2 * pad;
    var reserveTop = s.marks ? Math.min(W, H) * 0.16 : 0, reserveBottom = (s.author ? Math.min(W, H) * 0.1 : 0) + (s.handle ? Math.min(W, H) * 0.07 : 0);
    var boxH = H - 2 * pad - reserveTop - reserveBottom;
    function measureAt(size) { c.font = s.weight + " " + size + "px " + fam; c.direction = dir; return function (t) { return c.measureText(t).width; }; }
    var size, lines, maxSize = Math.round(Math.min(W, H) * 0.12), minSize = Math.round(Math.min(W, H) * 0.022);
    if (s.fs > 0) { size = Math.round(minSize + (maxSize * 1.4 - minSize) * s.fs / 100); lines = wrap(text, boxW, measureAt(size)); }
    else {
      for (size = maxSize; size > minSize; size -= 2) { lines = wrap(text, boxW, measureAt(size)); if (lines.length * size * s.lh <= boxH) break; }
      if (size <= minSize) { size = minSize; lines = wrap(text, boxW, measureAt(size)); }
    }
    return { text: text, dir: dir, fam: fam, pad: pad, size: size, lines: lines, lineH: size * s.lh, reserveTop: reserveTop };
  }
  function render(canvas, s, img, scale) {
    var dims = SIZES[s.size] || SIZES["1:1"], W = Math.round(dims[0] * (scale || 1)), H = Math.round(dims[1] * (scale || 1));
    canvas.width = W; canvas.height = H;
    var c = canvas.getContext("2d");
    background(c, W, H, s, img);
    var L = layoutText(c, s, W, H), m = Math.min(W, H);
    var authorH = s.author ? m * 0.1 : 0, blockH = (s.marks ? m * 0.13 : 0) + L.lines.length * L.lineH + authorH;
    var y = Math.max(L.pad, (H - blockH - (s.handle ? m * 0.07 : 0)) / 2);
    var A = anchor(s.align, L.dir, W, L.pad);
    c.textBaseline = "alphabetic"; c.direction = L.dir;
    if (s.marks) {
      var qs = m * 0.2;
      c.font = "700 " + qs + "px Georgia, 'Times New Roman', serif"; c.fillStyle = s.accent; c.textAlign = A.textAlign;
      c.fillText(L.dir === "rtl" ? "”" : "“", A.x, y + qs * 0.72);
      y += m * 0.13;
    }
    c.font = s.weight + " " + L.size + "px " + L.fam; c.fillStyle = s.ink; c.textAlign = A.textAlign;
    if (s.bg === "photo") { c.shadowColor = "rgba(0,0,0,.35)"; c.shadowBlur = L.size * 0.25; }
    L.lines.forEach(function (line, i) { c.fillText(line, A.x, y + (i + 0.82) * L.lineH); });
    c.shadowBlur = 0; c.shadowColor = "transparent";
    y += L.lines.length * L.lineH;
    if (s.author) {
      var as = Math.max(14, m * 0.036), ad = dirOf(s.author);
      c.direction = ad; c.font = "600 " + as + "px " + fontStack("sans"); c.fillStyle = s.accent;
      var AA = anchor(s.align, L.dir, W, L.pad); c.textAlign = AA.textAlign;
      c.fillText("— " + s.author, AA.x, y + m * 0.07, W - 2 * L.pad);
    }
    if (s.handle) {
      var hs = Math.max(12, m * 0.026);
      c.direction = dirOf(s.handle); c.font = "600 " + hs + "px " + fontStack("sans"); c.fillStyle = s.ink; c.globalAlpha = 0.72; c.textAlign = "center";
      c.fillText(s.handle, W / 2, H - L.pad * 0.6, W - 2 * L.pad);
      c.globalAlpha = 1;
    }
    c.direction = "ltr";
    return { W: W, H: H, layout: L };
  }

  // ---------- UI ----------
  function persist() { S3.store("qc.settings", st); }
  var queued = false;
  function update() {
    persist();
    $("#fsLbl").textContent = st.fs ? st.fs : "auto"; $("#lhLbl").textContent = (+st.lh).toFixed(2);
    $("#angLbl").textContent = st.ang + "°"; $("#dkLbl").textContent = st.dark + "%"; $("#blLbl").textContent = st.blur;
    $("#colors").hidden = st.bg === "photo"; $("#presets").hidden = st.bg !== "gradient";
    $("#c2Wrap").hidden = st.bg !== "gradient"; $("#angWrap").hidden = st.bg !== "gradient";
    $("#photoOpts").hidden = st.bg !== "photo";
    $$(".qc-bg").forEach(function (b) { var p = PRESETS[+b.dataset.i]; b.setAttribute("aria-pressed", String(st.c1 === p[1] && st.c2 === p[2])); });
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      var d = SIZES[st.size], r = render(cv, st, photo, Math.min(1, 900 / Math.max(d[0], d[1])));
      $("#stage").style.setProperty("--ar", d[0] + "/" + d[1]);
      $("#meta").textContent = d[0] + " × " + d[1] + " px PNG · " + r.layout.lines.length + (r.layout.lines.length === 1 ? " line" : " lines") + (r.layout.dir === "rtl" ? " · right to left" : "");
    });
  }
  function seg(el, value, onPick) {
    $$("button", el).forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === String(value)));
      b.addEventListener("click", function () { $$("button", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); onPick(b.dataset.v); });
    });
  }
  FONTS.forEach(function (f) { $("#font").appendChild(S3.h("option", { value: f[0], text: f[1] })); });
  ["text", "author", "handle", "ink", "accent", "c1", "c2"].forEach(function (k) { $("#" + k).value = st[k]; $("#" + k).addEventListener("input", function () { st[k] = this.value; update(); }); });
  ["fs", "lh", "ang", "dark", "blur"].forEach(function (k) { $("#" + k).value = st[k]; $("#" + k).addEventListener("input", function () { st[k] = +this.value; update(); }); });
  ["font", "weight"].forEach(function (k) { $("#" + k).value = st[k]; $("#" + k).addEventListener("change", function () { st[k] = this.value; update(); }); });
  $("#marks").checked = st.marks; $("#marks").addEventListener("change", function () { st.marks = this.checked; update(); });
  seg($("#align"), st.align, function (v) { st.align = v; update(); });
  seg($("#size"), st.size, function (v) { st.size = v; update(); });
  seg($("#bg"), st.bg, function (v) { st.bg = v; update(); if (v === "photo" && !photo) S3.toast("Choose a photo below"); });
  PRESETS.forEach(function (p, i) {
    var b = S3.h("button", { "class": "qc-bg", type: "button", "data-i": i, title: p[0], "aria-label": p[0], style: "background:linear-gradient(135deg," + p[1] + "," + p[2] + ")" });
    b.addEventListener("click", function () { st.c1 = p[1]; st.c2 = p[2]; st.ink = p[3]; ["c1", "c2", "ink"].forEach(function (k) { $("#" + k).value = st[k]; }); update(); });
    $("#presets").appendChild(b);
  });
  function openFile(f) {
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () { photo = im; $("#dropLbl").textContent = f.name || "Photo"; st.bg = "photo"; $$("#bg button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === "photo")); }); update(); };
    im.onerror = function () { URL.revokeObjectURL(url); S3.toast("Couldn't read that image", "error"); };
    im.src = url;
  }
  S3.drop($("#drop"), function (fs) { openFile(fs[0]); }, { accept: "image/*", multiple: false });
  document.addEventListener("paste", function (e) {
    var it = Array.prototype.slice.call((e.clipboardData && e.clipboardData.items) || []).filter(function (x) { return x.type.indexOf("image/") === 0; })[0];
    if (it) { e.preventDefault(); var f = it.getAsFile(); if (f) openFile(f); }
  });

  var SAMPLES = {
    en: { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Proverb", font: "serif" },
    ar: { text: "اطلبوا العلم من المهد إلى اللحد، فالعلم نور يضيء دروب الحياة.", author: "حكمة", font: "naskh" }
  };
  function useSample(k) {
    var x = SAMPLES[k]; st.text = x.text; st.author = x.author; st.font = x.font;
    $("#text").value = st.text; $("#author").value = st.author; $("#font").value = st.font; update();
  }
  $("#sampleEn").addEventListener("click", function () { useSample("en"); });
  $("#sampleAr").addEventListener("click", function () { useSample("ar"); });

  function exportBlob() {
    var c = document.createElement("canvas"); render(c, st, photo, 1);
    return new Promise(function (res, rej) { c.toBlob(function (b) { if (b) res(b); else rej(new Error("Export failed")); }, "image/png"); });
  }
  function fname() { return "quote-" + st.size.replace(":", "x") + ".png"; }
  $("#dl").addEventListener("click", function () {
    if (!st.text.trim()) { S3.toast("Type your text first", "error"); $("#text").focus(); return; }
    exportBlob().then(function (b) { S3.download(b, fname()); S3.done(); }, function (e) { S3.toast(e.message, "error"); });
  });
  $("#copy").addEventListener("click", function () {
    if (!st.text.trim()) { S3.toast("Type your text first", "error"); return; }
    if (!navigator.clipboard || !window.ClipboardItem || !window.isSecureContext) { S3.toast("Your browser can't copy images here. Use Download instead.", "error"); return; }
    navigator.clipboard.write([new ClipboardItem({ "image/png": exportBlob() })])
      .then(function () { S3.toast("Image copied ✓"); S3.done(); }, function () { S3.toast("Copy was blocked by the browser. Use Download instead.", "error"); });
  });
  if (document.fonts && document.fonts.load) document.fonts.load("600 40px Inter").then(update, update);
  update();

  window.S3_DEMO = function () {
    Object.assign(st, { size: "1:1", bg: "gradient", c1: "#141e30", c2: "#243b55", ink: "#f4f1e8", accent: "#ffd166", ang: 135, align: "center", marks: true, handle: "@s3eidat", fs: 0, lh: 1.3, weight: "600" });
    ["c1", "c2", "ink", "accent", "handle", "ang", "fs", "lh", "weight"].forEach(function (k) { $("#" + k).value = st[k]; });
    $$("#bg button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === "gradient")); });
    $$("#align button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === "center")); });
    useSample("en");
  };

  window.S3_SELFTEST = function () {
    var len = function (s) { return Array.from(s).length * 10; };
    var en = wrap("the quick brown fox jumps", 100, len);
    var ar = wrap("السلام عليكم ورحمة الله وبركاته", 120, len);
    var long = wrap("abcdefghijkl", 50, len);
    var paras = wrap("a\n\nb  c", 100, len);
    var dirs = dirOf("Hello مرحبا") === "ltr" && dirOf("مرحبا hello") === "rtl" && dirOf("2026 «مرحبا»") === "rtl" && dirOf("123") === "ltr";
    var anc = anchor("start", "rtl", 1000, 90).x === 910 && anchor("start", "rtl", 1000, 90).textAlign === "right" &&
      anchor("start", "ltr", 1000, 90).x === 90 && anchor("end", "rtl", 1000, 90).textAlign === "left" && anchor("center", "rtl", 1000, 90).x === 500;
    // RTL drawing: start-aligned Arabic at the right edge must put ink on the right and none on the left.
    var c = document.createElement("canvas"); c.width = 400; c.height = 80;
    var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 400, 80);
    x.font = "40px " + fontStack("naskh"); x.fillStyle = "#000"; x.direction = "rtl"; x.textAlign = "start"; x.fillText("مرحبا", 390, 55);
    var d = x.getImageData(0, 0, 400, 80).data, inkL = 0, inkR = 0;
    for (var i = 0; i < d.length; i += 4) { if (d[i] < 128) { if ((i / 4) % 400 < 150) inkL++; else if ((i / 4) % 400 > 250) inkR++; } }
    // A full card: 4:5 is 1080 x 1350, and the Arabic sample lays out right to left in more than one line.
    var out = document.createElement("canvas"), r = render(out, Object.assign({}, DEF, { size: "4:5", text: SAMPLES.ar.text, author: "x", font: "naskh" }), null, 1);
    var story = render(document.createElement("canvas"), Object.assign({}, DEF, { size: "9:16", text: "Hi" }), null, 0.5);
    return en.join("|") === "the quick|brown fox|jumps" && ar.join("|") === "السلام عليكم|ورحمة الله|وبركاته" &&
      long.join("|") === "abcde|fghij|kl" && paras.join("|") === "a||b c" && dirs && anc && inkR > 50 && inkL === 0 &&
      out.width === 1080 && out.height === 1350 && r.layout.dir === "rtl" && r.layout.lines.length > 1 && story.W === 540 && story.H === 960;
  };
})();
