// Exporta el conteo a PDF (carta) con la foto, el estado y las unidades de cada producto.
const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const pad = n => String(n).padStart(2, "0");
const rgb = h => /^#[0-9a-f]{6}$/i.test(h || "") ? [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)) : [142, 142, 147];
const CAT_TITLE = { cuadro: "Cuadros", silla: "Sillas", otro: "Otros" };

function loadJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = JSPDF_URL; s.onload = () => res(window.jspdf); s.onerror = () => rej(new Error("jspdf"));
    document.head.appendChild(s);
  });
}
async function dataURL(src) {
  if (!src) return null;
  if (src.startsWith("data:image/jpeg") || src.startsWith("data:image/png")) return src;
  const blob = await (await fetch(src)).blob();
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}
export function fechaLarga(f) {
  if (!f) return "";
  const [y, m, d] = f.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

// groups: [{ kind, title, size, mco, dyn, items: [{ key, n, name, color, img, product }] }]
export async function buildPDF({ groups, st, fecha, people }) {
  const { jsPDF } = await loadJsPDF();
  const all = groups.flatMap(g => g.items), TOTAL = all.length;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const W = 215.9, H = 279.4, M = 12, CW = W - 2 * M, BOTTOM = H - 13;
  const INK = [29, 29, 31], MUT = [110, 110, 115], LINE = [226, 226, 230], TRACK = [240, 240, 243], OK = [36, 138, 61], NO = [215, 0, 21];
  const imgs = {};
  await Promise.all(all.map(async i => { imgs[i.key] = await dataURL(i.img).catch(() => null); }));

  let y = M;
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...MUT);
  doc.text("VORTXSHOP · MERCADO LIBRE", M, y + 3, { charSpace: .5 });
  doc.setFontSize(28); doc.setTextColor(...INK); doc.text("Inventario", M, y + 15);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUT);
  doc.text("Fecha", W - M - 72, y + 6); doc.text("Contaron", W - M - 72, y + 13);
  doc.setFont("helvetica", "bold"); doc.setTextColor(...INK);
  doc.text(fechaLarga(fecha) || "—", W - M, y + 6, { align: "right" });
  doc.text(doc.splitTextToSize(people.join(", ") || "—", 56)[0], W - M, y + 13, { align: "right" });
  y += 21;

  let rev = 0, hay = 0, no = 0, uds = 0;
  all.forEach(i => { const s = st(i.key); if (s.s) rev++; if (s.s === "hay") hay++; if (s.s === "no") no++; uds += s.s === "no" ? 0 : (s.q || 0); });
  const boxes = [["Revisados", `${rev} de ${TOTAL}`, INK], ["Con stock", String(hay), OK], ["Sin stock", String(no), NO], ["Unidades", String(uds), INK]];
  const bw = (CW - 9) / 4;
  boxes.forEach(([l, v, c], k) => {
    const x = M + k * (bw + 3);
    doc.setFillColor(...TRACK); doc.roundedRect(x, y, bw, 17, 3, 3, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUT); doc.text(l, x + 4, y + 5.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(...c); doc.text(v, x + 4, y + 13.5);
  });
  y += 21;
  const gapS = TOTAL > 60 ? .4 : .8, sw = (CW - (TOTAL - 1) * gapS) / TOTAL;
  all.forEach((i, k) => {
    const s = st(i.key).s, x = M + k * (sw + gapS);
    if (s === "hay") { doc.setFillColor(...rgb(i.color)); doc.roundedRect(x, y, sw, 2.6, Math.min(1.3, sw / 2), 1.3, "F"); }
    else if (s === "no") { doc.setDrawColor(...NO); doc.setLineWidth(.35); doc.roundedRect(x + .2, y + .2, Math.max(.2, sw - .4), 2.2, Math.min(1.1, sw / 2), 1.1, "S"); }
    else { doc.setFillColor(...TRACK); doc.roundedRect(x, y, sw, 2.6, Math.min(1.3, sw / 2), 1.3, "F"); }
  });
  y += 8;

  const cw = (CW - 4 * 3) / 5, ch = 50, gap = 3;
  function card(x, y, i) {
    const s = st(i.key);
    doc.setDrawColor(...LINE); doc.setLineWidth(.25); doc.roundedRect(x, y, cw, ch, 2.5, 2.5, "S");
    if (s.s === "hay") { doc.setDrawColor(...rgb(i.color)); doc.setLineWidth(.7); doc.roundedRect(x, y, cw, ch, 2.5, 2.5, "S"); }
    const iw = cw - 4, im = imgs[i.key];
    if (im) doc.addImage(im, im.startsWith("data:image/png") ? "PNG" : "JPEG", x + 2, y + 2, iw, iw, "img" + i.key, "FAST");
    else { doc.setFillColor(...TRACK); doc.roundedRect(x + 2, y + 2, iw, iw, 2, 2, "F"); }
    if (s.s === "no") {
      doc.setGState(new doc.GState({ opacity: .6 })); doc.setFillColor(255, 255, 255); doc.rect(x + 2, y + 2, iw, iw, "F");
      doc.setGState(new doc.GState({ opacity: 1 }));
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5);
    const tag = i.n != null ? pad(i.n) : "NUEVO", tw = Math.max(7, doc.getTextWidth(tag) + 3);
    doc.setFillColor(...INK); doc.roundedRect(x + 3.5, y + 3.5, tw, 4.2, 2.1, 2.1, "F");
    doc.setTextColor(255, 255, 255); doc.text(tag, x + 3.5 + tw / 2, y + 6.4, { align: "center" });
    doc.setFillColor(...rgb(i.color)); doc.circle(x + cw - 5, y + 5.6, 1.4, "F");
    doc.setFontSize(7.4); doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(i.name, cw - 4).slice(0, 2), x + 2.2, y + iw + 5.8, { lineHeightFactor: 1.2 });
    const label = s.s === "hay" ? "Hay" : s.s === "no" ? "No hay" : "Sin revisar";
    doc.setFontSize(6.6);
    const pw = doc.getTextWidth(label) + 4.4, py = y + ch - 6.6;
    if (s.s) { doc.setFillColor(...(s.s === "hay" ? OK : NO)); doc.roundedRect(x + 2.2, py, pw, 4.6, 2.3, 2.3, "F"); doc.setTextColor(255, 255, 255); }
    else { doc.setDrawColor(...MUT); doc.setLineWidth(.25); doc.roundedRect(x + 2.2, py, pw, 4.6, 2.3, 2.3, "S"); doc.setTextColor(...MUT); }
    doc.text(label, x + 2.2 + pw / 2, py + 3.2, { align: "center" });
    const q = s.s === "no" ? 0 : (s.q || 0);
    doc.setFontSize(14); doc.setTextColor(...(q ? INK : MUT));
    doc.text(String(q), x + cw - 6.2, py + 4.2, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(...MUT);
    doc.text("uds", x + cw - 2.2, py + 4.2, { align: "right" });
  }

  // Grupos seguidos del mismo tipo que caben en una fila de 5 comparten banda.
  const bands = [];
  groups.forEach(g => {
    const last = bands[bands.length - 1], n = g.items.length;
    const used = last ? last.reduce((a, x) => a + x.items.length, 0) : 99;
    if (last && last[0].kind === g.kind && n <= 5 && used + n <= 5) last.push(g); else bands.push([g]);
  });
  let lastKind = null;
  for (const band of bands) {
    const kind = band[0].kind;
    if (kind !== lastKind) {
      if (lastKind) { doc.addPage(); y = M; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...INK);
      doc.text(CAT_TITLE[kind] || kind, M, y + 7);
      doc.setDrawColor(...LINE); doc.setLineWidth(.3); doc.line(M, y + 10, W - M, y + 10);
      y += 14; lastKind = kind;
    }
    let col = 0;
    const heads = band.map(g => {
      const list = g.items, span = Math.min(5, list.length);
      const sw = span * cw + (span - 1) * gap, x = M + col * (cw + gap);
      col += span;
      const tot = list.reduce((a, i) => a + (st(i.key).s === "no" ? 0 : st(i.key).q || 0), 0);
      const conStock = list.filter(i => st(i.key).s === "hay").length;
      doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      const meta = doc.splitTextToSize([g.size, g.mco && `MCO ${g.mco}`, g.dyn && "Agregados desde la app", `${conStock} de ${list.length} con stock`, `${tot} uds`].filter(Boolean).join(" · "), sw - 2);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10.5);
      const title = doc.splitTextToSize(g.title, sw - 2);
      return { list, x, title, meta, h: title.length * 4.4 + meta.length * 3.1 + 2.5 };
    });
    const hh = Math.max(...heads.map(h => h.h));
    const rows = Math.max(...heads.map(h => Math.ceil(h.list.length / 5)));
    if (y + hh + ch > BOTTOM) { doc.addPage(); y = M; }
    heads.forEach(h => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...INK);
      doc.text(h.title, h.x, y + 4, { lineHeightFactor: 1.2 });
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...MUT);
      doc.text(h.meta, h.x, y + 4 + h.title.length * 4.4, { lineHeightFactor: 1.25 });
    });
    y += hh;
    for (let r = 0; r < rows; r++) {
      if (y + ch > BOTTOM) { doc.addPage(); y = M; }
      heads.forEach(h => h.list.slice(r * 5, r * 5 + 5).forEach((i, c) => card(h.x + c * (cw + gap), y, i)));
      y += ch + gap;
    }
    y += 4;
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...MUT);
    doc.text(`VORTXSHOP · Inventario · ${fechaLarga(fecha)}`, M, H - 8);
    doc.text(`Página ${p} de ${pages}`, W - M, H - 8, { align: "right" });
  }
  return doc;
}
