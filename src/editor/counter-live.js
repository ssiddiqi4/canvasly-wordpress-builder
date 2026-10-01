function formatCounterNumber(n, sep) {
  n = Number(n);
  if (!isFinite(n)) n = 0;
  const neg = n < 0;
  n = Math.abs(n);
  const p = String(Math.round(n * 100) / 100).split(".");
  if (sep) p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (neg ? "-" : "") + p.join(".");
}
function applyCounterLive(node, s, key, v, format = formatCounterNumber) {
  if (!node) return;
  s = s || {};
  const host = (node.querySelector && node.querySelector(".lb-counter")) || node;
  const cssVar = (prop, raw) => {
    if (!host || !host.style) return;
    if (raw === "" || raw == null) {
      host.style.removeProperty(prop);
      return;
    }
    const x = String(raw);
    host.style.setProperty(prop, /[a-z%]/i.test(x) ? x : (parseFloat(x) || 0) + "px");
  };
  if (key === "number_size") {
    cssVar("--lb-counter-number-size", v);
    return;
  }
  if (key === "title_gap") {
    cssVar("--lb-counter-gap", v);
    return;
  }
  if (key === "prefix") {
    const el2 = node.querySelector && node.querySelector(".lb-counter-prefix");
    if (el2) el2.textContent = v == null ? "" : String(v);
    return;
  }
  if (key === "suffix") {
    const el2 = node.querySelector && node.querySelector(".lb-counter-suffix");
    if (el2) el2.textContent = v == null ? "" : String(v);
    return;
  }
  if (key === "title") {
    const el2 = node.querySelector && node.querySelector(".lb-counter-title");
    if (el2) el2.textContent = v == null ? "" : String(v);
    return;
  }
  const end = parseFloat(key === "number" ? v : s.number);
  const n = isFinite(end) ? end : 0;
  const sep = s.thousand_separator ? s.separator_char || "," : "";
  const text = format(n, sep);
  const el = node.querySelector && node.querySelector(".lb-counter-number");
  if (el) el.textContent = text;
  else {
    const strong = node.querySelector && node.querySelector(".lb-counter > strong");
    if (strong) strong.textContent = (s.prefix || "") + text + (s.suffix || "");
  }
}
function isCounterSliderKey(key) {
  return ["number", "start", "number_size", "title_gap"].includes(key);
}

export { formatCounterNumber, applyCounterLive, isCounterSliderKey };
