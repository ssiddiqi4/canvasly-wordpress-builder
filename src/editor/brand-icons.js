import social_brand_icons_default from "../../assets/data/social-brand-icons.json";
function brandIconSvg(id) {
  const parts = social_brand_icons_default[id];
  if (!Array.isArray(parts) || !parts.length) return "";
  const inner = parts
    .map((p) => {
      if (p.text)
        return `<text x="${p.x ?? 12}" y="${p.y ?? 16}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${p.size ?? 10}" font-weight="700" fill="currentColor">${String(p.text)}</text>`;
      if (!p.d) return "";
      const cls = p.class ? ` class="${p.class}"` : "";
      const rule = p.rule ? ` fill-rule="${p.rule}"` : "";
      const tf = p.transform ? ` transform="${p.transform}"` : "";
      return `<path${cls} d="${p.d}" fill="${p.fill || "currentColor"}"${rule}${tf}></path>`;
    })
    .join("");
  if (!inner) return "";
  return `<svg class="lb-fa-icon lb-brand-icon" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inner}</svg>`;
}

export { brandIconSvg };
