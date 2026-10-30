import { GROUPS, ITEMS, SIZE_PRESETS } from "./catalog.js";
import { firebaseConfig } from "./firebase-config.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
const DEMO = new URLSearchParams(location.search).has("demo");

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const pad = n => String(n).padStart(2, "0");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const today = () => new Date().toLocaleDateString("en-CA");
const first = s => String(s || "").trim().split(/\s+/)[0];
const tsDate = t => t && t.toDate ? t.toDate() : t instanceof Date ? t : null;
const tsMs = t => tsDate(t)?.getTime() || 0;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const ICON = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>',
  chevL: '<svg viewBox="0 0 24 24"><path d="M14.5 6l-6 6 6 6"/></svg>',
  chevR: '<svg class="chev" viewBox="0 0 24 24"><path d="M9.5 6l6 6-6 6"/></svg>',
  chevRb: '<svg viewBox="0 0 24 24"><path d="M9.5 6l6 6-6 6"/></svg>',
  cloudOk: '<svg viewBox="0 0 24 24"><path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z"/><path d="M9.5 13.5l2 2 3.5-3.5"/></svg>',
  cloudUp: '<svg viewBox="0 0 24 24"><path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z"/><path d="M12 16v-5M9.8 13l2.2-2.2 2.2 2.2"/></svg>',
  cloudOff: '<svg viewBox="0 0 24 24"><path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z"/><path d="M4 4l16 16"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M8 11H6.5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><rect x="3.5" y="6.5" width="17" height="13" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 6.5l1.2-2h4.6l1.2 2"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/></svg>',
};

const KINDS = {
  cuadro: { cat: "Cuadros", group: "Cuadros agregados", one: "Cuadro" },
  silla: { cat: "Sillas", group: "Sillas agregadas", one: "Silla" },
  otro: { cat: "Otros", group: "Otros productos", one: "Otro" },
};

const S = {
  user: null, me: null, items: {}, products: [], meta: {}, members: [],
  filter: "todos", query: "", pending: false, tab: "conteo", keep: new Set(), sheetKey: null,
};
const st = k => S.items[k] || { s: null, q: 0 };
const isAdmin = () => S.me?.role === "admin";

/* ───────────── Catálogo: productos publicados + productos agregados desde la app ───────────── */

const STATIC_GROUPS = GROUPS.map(g => ({ id: g.id, kind: g.kind, title: g.title, size: g.size, mco: g.mco, dyn: false, items: [] }));
ITEMS.forEach(i => {
  const g = STATIC_GROUPS.find(x => x.id === i.g.id);
  g.items.push({ key: String(i.n), n: i.n, name: i.name, color: i.color, img: i.img, g });
});
let CAT = [], ALL = [], BY_KEY = new Map();

function buildCatalog() {
  // Los productos agregados se agrupan por medida para que se vea cuál es cuál.
  const sizeRank = sz => { const i = SIZE_PRESETS.findIndex(x => x.size === sz); return i < 0 ? SIZE_PRESETS.length : i; };
  const dyn = Object.keys(KINDS).flatMap(kind => {
    const mine = S.products.filter(p => p.kind === kind);
    const sizes = [...new Set(mine.map(p => p.size || ""))]
      .sort((a, b) => (a ? 0 : 1) - (b ? 0 : 1) || sizeRank(a) - sizeRank(b) || a.localeCompare(b, "es"));
    return sizes.map((size, n) => {
      const g = { id: `nuevo-${kind}-${n}`, kind, title: KINDS[kind].group, size, mco: "", dyn: true, items: [] };
      g.items = mine.filter(p => (p.size || "") === size).map(p => ({
        key: p.id, n: null, name: p.name, desc: p.desc || "", size: p.size || "", color: p.color || "#8E8E93", img: p.photo || "", g, product: p,
      }));
      return g;
    });
  }).filter(g => g.items.length);
  CAT = Object.keys(KINDS).flatMap(kind => [...STATIC_GROUPS.filter(g => g.kind === kind), ...dyn.filter(g => g.kind === kind)]);
  ALL = CAT.flatMap(g => g.items);
  BY_KEY = new Map(ALL.map(i => [i.key, i]));
}

/* ───────────── Backend: Firebase (o datos de ejemplo con ?demo) ───────────── */

async function firebaseBackend() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  auth.languageCode = "es";
  let db;
  try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
  catch (e) { db = F.getFirestore(app); }
  const d = (...p) => F.doc(db, ...p);
  const col = p => F.collection(db, p);
  const who = () => ({ by: S.user.name, byEmail: S.user.email, at: F.serverTimestamp() });
  const est = { serverTimestamps: "estimate" };
  return {
    onAuth(cb) {
      A.getRedirectResult(auth).catch(loginError);
      return A.onAuthStateChanged(auth, u => cb(u && {
        name: u.displayName || (u.email || "").split("@")[0], email: (u.email || "").toLowerCase(), photo: u.photoURL || "",
      }));
    },
    async signIn() {
      const p = new A.GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      try { await A.signInWithPopup(auth, p); }
      catch (e) {
        if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") return A.signInWithRedirect(auth, p);
        throw e;
      }
    },
    signOut: () => A.signOut(auth),
    watchMember: (email, cb, err) => F.onSnapshot(d("members", email), s => cb(s.exists() ? s.data() : null), err),
    watchItems: (cb, err) => F.onSnapshot(col("items"), { includeMetadataChanges: true }, snap => {
      const o = {}; snap.forEach(x => { o[x.id] = x.data(est); }); cb(o, snap.metadata.hasPendingWrites);
    }, err),
    watchProducts: (cb, err) => F.onSnapshot(col("products"), snap => cb(snap.docs.map(x => ({ id: x.id, ...x.data(est) }))), err),
    watchMeta: (cb, err) => F.onSnapshot(d("meta", "conteo"), s => cb(s.exists() ? s.data() : {}), err),
    watchMembers: (cb, err) => F.onSnapshot(col("members"), snap => cb(snap.docs.map(x => ({ email: x.id, ...x.data() }))), err),
    setItem: (k, patch) => F.setDoc(d("items", k), { ...patch, ...who() }, { merge: true }),
    bumpItem: (k, delta) => F.setDoc(d("items", k), { q: F.increment(delta), ...(delta > 0 ? { s: "hay" } : {}), ...who() }, { merge: true }),
    newId: () => F.doc(col("products")).id,
    saveProduct: (id, data, isNew) => F.setDoc(d("products", id), {
      ...data, ...who(), ...(isNew ? { createdBy: S.user.name, createdByEmail: S.user.email, createdAt: F.serverTimestamp() } : {}),
    }, { merge: true }),
    deleteProduct: id => F.deleteDoc(d("products", id)),
    setMeta: m => F.setDoc(d("meta", "conteo"), m, { merge: true }),
    invite: (email, role) => F.setDoc(d("members", email), { role, addedBy: S.user.name, addedAt: F.serverTimestamp() }),
    setRole: (email, role) => F.updateDoc(d("members", email), { role }),
    removeMember: email => F.deleteDoc(d("members", email)),
    touchMe: () => F.updateDoc(d("members", S.user.email), { name: S.user.name, photo: S.user.photo, lastSeen: F.serverTimestamp() }),
    reset() {
      const b = F.writeBatch(db);
      Object.keys(S.items).forEach(id => b.delete(d("items", id)));
      b.set(d("meta", "conteo"), { fecha: today(), resetBy: S.user.name, resetAt: F.serverTimestamp() });
      return b.commit();
    },
  };
}

function demoBackend() {
  const now = (m = 0) => new Date(Date.now() - m * 60000);
  const data = {
    items: { 1: { s: "hay", q: 3, by: "Laura Gómez", at: now(4) }, 2: { s: "hay", q: 1, by: "Laura Gómez", at: now(6) }, 3: { s: "no", q: 0, by: "Samuel", at: now(9) },
      5: { s: "hay", q: 2, by: "Samuel", at: now(12) }, 11: { s: "hay", q: 4, by: "Laura Gómez", at: now(20) }, 12: { s: "hay", q: 1, by: "Samuel", at: now(22) },
      15: { s: "no", q: 0, by: "Samuel", at: now(30) }, 25: { s: "hay", q: 5, by: "Laura Gómez", at: now(40) }, 28: { s: "hay", q: 2, by: "Samuel", at: now(41) },
      demo1: { s: "hay", q: 2, by: "Laura Gómez", at: now(15) } },
    products: [{ id: "demo1", name: "Cuadro abstracto rojo y negro", desc: "Lienzo con marco negro, encontrado en la bodega 2.", size: "60 × 40 cm", kind: "cuadro",
      photo: "img/c10.jpg", color: "#6C2B29", published: false, createdBy: "Laura Gómez", createdByEmail: "laura@vortxshop.co", createdAt: now(15), by: "Laura Gómez", at: now(15) }],
    meta: { fecha: today() },
    members: [{ email: "demo@vortxshop.co", role: "admin", name: "Samuel" }, { email: "laura@vortxshop.co", role: "editor", name: "Laura Gómez" }],
  };
  const L = {};
  const emit = k => setTimeout(() => (L[k] || []).forEach(cb => k === "items" ? cb(structuredClone(data.items), false) : cb(structuredClone(data[k]))), 0);
  const on = (k, cb) => { (L[k] ||= []).push(cb); emit(k); return () => { L[k] = L[k].filter(f => f !== cb); }; };
  const who = () => ({ by: S.user.name, at: new Date() });
  const ok = () => Promise.resolve();
  let n = 0;
  return {
    onAuth: cb => setTimeout(() => cb({ name: "Samuel", email: "demo@vortxshop.co", photo: "" }), 150),
    signIn: ok, signOut: ok,
    watchMember: (e, cb) => { setTimeout(() => cb(data.members[0]), 0); return () => {}; },
    watchItems: cb => on("items", cb), watchProducts: cb => on("products", cb), watchMeta: cb => on("meta", cb), watchMembers: cb => on("members", cb),
    setItem(k, p) { data.items[k] = { ...(data.items[k] || { q: 0 }), ...p, ...who() }; emit("items"); return ok(); },
    bumpItem(k, dl) { const c = data.items[k] || { q: 0 }; data.items[k] = { ...c, q: (c.q || 0) + dl, ...(dl > 0 ? { s: "hay" } : {}), ...who() }; emit("items"); return ok(); },
    newId: () => "p" + Date.now() + (n++),
    saveProduct(id, x, isNew) {
      const c = data.products.find(p => p.id === id);
      if (c) Object.assign(c, x, who()); else data.products.push({ id, ...x, ...who(), createdBy: S.user.name, createdByEmail: S.user.email, createdAt: new Date() });
      emit("products"); return ok();
    },
    deleteProduct(id) { data.products = data.products.filter(p => p.id !== id); emit("products"); return ok(); },
    setMeta(m) { Object.assign(data.meta, m); emit("meta"); return ok(); },
    invite(email, role) { data.members.push({ email, role }); emit("members"); return ok(); },
    setRole(email, role) { data.members.find(m => m.email === email).role = role; emit("members"); return ok(); },
    removeMember(email) { data.members = data.members.filter(m => m.email !== email); emit("members"); return ok(); },
    touchMe: ok,
    reset() { data.items = {}; data.meta = { fecha: today() }; emit("items"); emit("meta"); return ok(); },
  };
}

let backend;

/* ───────────── Pantallas y sesión ───────────── */

function show(name) {
  ["loading", "login", "noaccess"].forEach(s => { $("#screen-" + s).hidden = s !== name; });
  $("#main").hidden = name !== "main";
  if (name !== "main") { closeSheet(); closeAction(); }
  else onScroll();
}

let unsubs = [], memberUnsub = null, dataStarted = false;
function stopData() { unsubs.forEach(f => f && f()); unsubs = []; dataStarted = false; }

function onUser(user) {
  stopData(); memberUnsub?.(); memberUnsub = null;
  S.user = user; S.me = null;
  if (!user) {
    // Al cerrar sesión no queda nada del usuario anterior en pantalla.
    S.items = {}; S.products = []; S.members = []; S.meta = {};
    renderCatalog(); paintItems(); paintMembers();
    return show("login");
  }
  show("loading");
  const denied = () => { stopData(); S.me = null; $("#noaccess-email").textContent = user.email; show("noaccess"); };
  memberUnsub = backend.watchMember(user.email, m => {
    if (!m) return denied();
    const firstTime = !S.me;
    S.me = m;
    if (!dataStarted) startData();
    if (firstTime) { show("main"); backend.touchMe().catch(() => {}); }
    paintMe(); applyRole();
  }, denied);
}

function startData() {
  dataStarted = true;
  const warn = e => console.warn(e);
  unsubs.push(backend.watchItems((o, pending) => { S.items = o; S.pending = pending; paintItems(); }, warn));
  unsubs.push(backend.watchProducts(list => {
    S.products = list.sort((a, b) => tsMs(a.createdAt) - tsMs(b.createdAt));
    renderCatalog(); paintItems(); paintProducts();
  }, warn));
  unsubs.push(backend.watchMeta(m => { S.meta = m; paintMeta(); }, warn));
  unsubs.push(backend.watchMembers(list => { S.members = list; paintMembers(); }, warn));
}

function loginError(e) {
  if (!e || ["auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/user-cancelled"].includes(e.code)) return;
  const msg = {
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase.",
    "auth/network-request-failed": "Sin conexión a internet.",
    "auth/operation-not-allowed": "El inicio con Google no está activado en Firebase.",
    "auth/internal-error": "Error de Google. Intenta de nuevo.",
  }[e.code] || "No se pudo iniciar sesión.";
  hud(msg, "err");
  console.warn(e);
}

$("#btn-login").addEventListener("click", async () => {
  const b = $("#btn-login");
  if (!backend) return hud("No se pudo conectar. Revisa internet y recarga.", "err");
  b.disabled = true;
  try { await backend.signIn(); } catch (e) { loginError(e); } finally { b.disabled = false; }
});
$("#btn-other").addEventListener("click", () => backend?.signOut());
$("#btn-retry").addEventListener("click", () => location.reload());
$("#btn-logout").addEventListener("click", () => actionSheet({
  title: "¿Cerrar sesión?", message: "Podrás volver a entrar con tu cuenta de Google.",
  actions: [{ label: "Cerrar sesión", destructive: true, fn: () => backend.signOut() }],
}));

function save(p) {
  return Promise.resolve(p).catch(e => {
    console.warn(e);
    hud(e?.code === "permission-denied" ? "No tienes permiso para este cambio." : "No se pudo guardar. Intenta de nuevo.", "err");
  });
}

/* ───────────── Pestañas, navegación y scroll ───────────── */

const TABS = ["conteo", "resumen", "productos", "cuenta"];
const scrollPos = {};
function setTab(t) {
  if (t === S.tab) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  scrollPos[S.tab] = window.scrollY;
  $("#view-" + S.tab).hidden = true;
  S.tab = t;
  $("#view-" + t).hidden = false;
  $("#tabbar").style.setProperty("--t", TABS.indexOf(t));
  $$("#tabbar button").forEach(b => { if (b.dataset.tab === t) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  window.scrollTo(0, scrollPos[t] || 0);
  onScroll();
}
$("#tabbar").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) setTab(b.dataset.tab); });

function onScroll() {
  const nav = $("#view-" + S.tab + " .nav");
  if (nav) nav.classList.toggle("scrolled", window.scrollY > 34);
  if (openLi) closeSwipe(openLi);
}
window.addEventListener("scroll", onScroll, { passive: true });

/* ───────────── Conteo ───────────── */

let ROWS = new Map();
const rowEl = k => ROWS.get(k);
const thumbHTML = (i, cls = "thumb") => i.img
  ? `<span class="${cls}"><img src="${esc(i.img)}" alt="" loading="lazy" width="56" height="56">${i.n != null ? `<span class="n">${pad(i.n)}</span>` : ""}</span>`
  : `<span class="${cls} ph">${ICON.camera}</span>`;

function renderCatalog() {
  buildCatalog();
  if (openLi) openLi = null;
  let h = "";
  Object.keys(KINDS).forEach(kind => {
    const groups = CAT.filter(g => g.kind === kind);
    if (!groups.length) return;
    h += `<h2 class="cat-title" data-kind="${kind}">${KINDS[kind].cat}</h2>`;
    groups.forEach(g => {
      h += `<section class="grp" id="g-${g.id}"><div class="grp-head"><b>${esc(g.title)}</b><span id="gt-${g.id}">0 uds</span>${g.size ? `<small class="grp-size">${esc(g.size)}</small>` : ""}</div><ul class="list catalog-list">`;
      g.items.forEach(i => {
        h += `<li data-k="${esc(i.key)}" data-s="">
          <div class="swipe-act lead" aria-hidden="true"><button type="button" data-act="hay" tabindex="-1">${ICON.check}<span>Hay</span></button></div>
          <div class="swipe-act trail" aria-hidden="true"><button type="button" data-act="no" tabindex="-1">${ICON.x}<span>No hay</span></button></div>
          <div class="cell-body" role="button" tabindex="0" aria-label="${esc(i.name)}, ${esc(g.title)}">
            ${thumbHTML(i)}
            <div class="cell-text"><div class="t1">${esc(i.name)}</div><div class="t2"><span class="status">Sin revisar</span></div></div>
            <div class="stepper qty-stepper"><button type="button" data-act="dec" aria-label="Restar una unidad">${ICON.minus}</button><span class="qty zero" aria-label="Unidades">0</span><button type="button" data-act="inc" aria-label="Sumar una unidad">${ICON.plus}</button></div>
          </div></li>`;
      });
      h += `</ul></section>`;
    });
  });
  $("#catalog").innerHTML = h;
  ROWS = new Map($$("#catalog li[data-k]").map(li => [li.dataset.k, li]));
  ROWS.forEach(attachSwipe);
}

function paintRow(i) {
  const li = rowEl(i.key); if (!li) return;
  const s = st(i.key), q = s.s === "no" ? 0 : (s.q || 0);
  li.dataset.s = s.s || "";
  li.querySelector(".status").textContent = s.s === "hay" ? `Hay${s.by ? " · " + first(s.by) : ""}` : s.s === "no" ? `No hay${s.by ? " · " + first(s.by) : ""}` : "Sin revisar";
  const qe = li.querySelector(".qty");
  qe.textContent = q; qe.classList.toggle("zero", !q);
  li.querySelector('[data-act="dec"]').disabled = !q;
  li.querySelector(".lead span").textContent = s.s === "hay" ? "Desmarcar" : "Hay";
  li.querySelector(".trail span").textContent = s.s === "no" ? "Desmarcar" : "No hay";
}

function totals() {
  let rev = 0, hay = 0, no = 0, uds = 0;
  ALL.forEach(i => { const s = st(i.key); if (s.s) rev++; if (s.s === "hay") hay++; if (s.s === "no") no++; uds += s.s === "no" ? 0 : (s.q || 0); });
  return { rev, hay, no, uds, pend: ALL.length - rev, total: ALL.length };
}
const unitsOf = g => g.items.reduce((a, i) => a + (st(i.key).s === "no" ? 0 : st(i.key).q || 0), 0);
function setRing(el, p) { const C = 2 * Math.PI * el.r.baseVal.value; el.style.strokeDasharray = C; el.style.strokeDashoffset = C * (1 - (p || 0)); }

function paintItems() {
  ALL.forEach(paintRow);
  const t = totals();
  $("#prog-title").textContent = `${t.rev} de ${t.total} revisados`;
  $("#prog-sub").textContent = `${plural(t.uds, "ud", "uds")} · ${plural(t.pend, "pendiente", "pendientes")}`;
  setRing($("#ring-mini"), t.total ? t.rev / t.total : 0);
  CAT.forEach(g => { const el = $("#gt-" + g.id); if (el) el.textContent = plural(unitsOf(g), "ud", "uds"); });
  paintSync(); applyFilter(); paintResumen(); paintProducts();
  if (S.sheetKey != null) paintItemSheet();
}

function paintSync() {
  const el = $("#sync");
  const off = !navigator.onLine;
  el.className = "sync " + (off ? "off" : S.pending ? "" : "ok");
  el.innerHTML = off ? `${ICON.cloudOff}<span>Sin conexión</span>` : S.pending ? `${ICON.cloudUp}<span>Guardando</span>` : `${ICON.cloudOk}<span>Guardado</span>`;
}
addEventListener("online", paintSync); addEventListener("offline", paintSync);

function applyFilter() {
  const q = norm(S.query.trim());
  let any = false;
  ALL.forEach(i => {
    const li = rowEl(i.key); if (!li) return;
    const s = st(i.key).s;
    const okF = S.filter === "todos" || S.keep.has(i.key) || (S.filter === "pend" ? !s : S.filter === s);
    const okQ = !q || norm(`${i.name} ${i.g.title} ${i.n != null ? pad(i.n) : ""} ${i.g.mco} ${i.g.size || ""} ${i.desc || ""}`).includes(q);
    li.hidden = !(okF && okQ);
    any ||= okF && okQ;
  });
  CAT.forEach(g => { const el = $("#g-" + g.id); if (el) el.hidden = !g.items.some(i => !rowEl(i.key)?.hidden); });
  $$(".cat-title").forEach(h => { h.hidden = !CAT.some(g => g.kind === h.dataset.kind && !$("#g-" + g.id)?.hidden); });
  $("#catalog-empty").hidden = any;
}

function setFilter(f) {
  S.filter = f; S.keep.clear();
  const btns = $$("#filters button");
  btns.forEach(x => x.setAttribute("aria-selected", x.dataset.f === f));
  $("#filters").style.setProperty("--i", btns.findIndex(x => x.dataset.f === f));
  applyFilter();
}
$("#filters").addEventListener("click", e => { const b = e.target.closest("button[data-f]"); if (b) setFilter(b.dataset.f); });
$("#search").addEventListener("input", e => { S.query = e.target.value; S.keep.clear(); $("#search-clear").hidden = !S.query; applyFilter(); });
$("#search").addEventListener("keydown", e => { if (e.key === "Enter") e.target.blur(); });
$("#search-clear").addEventListener("click", () => { $("#search").value = ""; S.query = ""; $("#search-clear").hidden = true; applyFilter(); });
$("#btn-jump").addEventListener("click", () => {
  const i = ALL.find(i => !st(i.key).s && !rowEl(i.key)?.hidden) || ALL.find(i => !st(i.key).s);
  if (!i) return hud("No quedan pendientes.", "ok");
  if (rowEl(i.key).hidden) { S.query = ""; $("#search").value = ""; $("#search-clear").hidden = true; setFilter("todos"); }
  scrollToEl(rowEl(i.key));
  const b = rowEl(i.key).querySelector(".cell-body");
  b.style.background = "var(--cell-press)"; setTimeout(() => { b.style.background = ""; }, 900);
});
function scrollToEl(el) {
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 120;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}

function act(k, a) {
  const s = st(k);
  S.keep.add(k);
  if (a === "inc") return save(backend.bumpItem(k, 1));
  if (a === "dec") return (s.q || 0) > 0 && save(backend.bumpItem(k, -1));
  if (a === "hay") return save(backend.setItem(k, { s: s.s === "hay" ? null : "hay" }));
  if (a === "no") return save(backend.setItem(k, s.s === "no" ? { s: null } : { s: "no", q: 0 }));
}

$("#catalog").addEventListener("click", e => {
  const li = e.target.closest("li[data-k]"); if (!li) return;
  const k = li.dataset.k;
  const b = e.target.closest("button[data-act]");
  if (b) { act(k, b.dataset.act); if (b.closest(".swipe-act")) closeSwipe(li); return; }
  if (li._moved) return;
  if (li._off) return closeSwipe(li);
  openItem(k);
});
$("#catalog").addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches(".cell-body")) { e.preventDefault(); openItem(e.target.closest("li").dataset.k); }
});

/* Deslizar una fila: hacia la derecha marca "Hay", hacia la izquierda "No hay". */
let openLi = null;
const ACT_W = 96;
function setOff(li, x, anim) {
  const b = li.querySelector(".cell-body");
  b.classList.toggle("settle", !!anim); b.classList.toggle("sliding", !anim);
  b.style.transform = x ? `translateX(${x}px)` : "";
  li._off = x;
  if (x) li.dataset.dir = x > 0 ? "lead" : "trail";
  else if (anim) setTimeout(() => { if (!li._off) delete li.dataset.dir; }, 400);
  else delete li.dataset.dir;
}
function closeSwipe(li) { setOff(li, 0, true); if (openLi === li) openLi = null; }
function attachSwipe(li) {
  const body = li.querySelector(".cell-body");
  let x0 = 0, y0 = 0, base = 0, lock = null, dx = 0, id = null;
  body.addEventListener("pointerdown", e => {
    if ((e.pointerType === "mouse" && e.button !== 0) || e.target.closest(".stepper")) return;
    if (openLi && openLi !== li) closeSwipe(openLi);
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY; base = li._off || 0; dx = base; lock = null; li._moved = false;
  });
  body.addEventListener("pointermove", e => {
    if (e.pointerId !== id) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!lock) {
      if (Math.hypot(mx, my) < 8) return;
      lock = Math.abs(mx) > Math.abs(my) * 1.2 ? "x" : "y";
      if (lock === "x") { try { body.setPointerCapture(id); } catch (_) {} li._moved = true; }
    }
    if (lock !== "x") return;
    const lim = li.offsetWidth * .92;
    dx = Math.max(-lim, Math.min(lim, base + mx));
    setOff(li, dx, false);
  });
  const end = e => {
    if (e.pointerId !== id) return;
    id = null;
    if (lock !== "x") return;
    const W = li.offsetWidth, k = li.dataset.k;
    if (dx > W * .5) { act(k, "hay"); closeSwipe(li); }
    else if (dx < -W * .5) { act(k, "no"); closeSwipe(li); }
    else if (dx > 48) { setOff(li, ACT_W, true); openLi = li; }
    else if (dx < -48) { setOff(li, -ACT_W, true); openLi = li; }
    else closeSwipe(li);
  };
  body.addEventListener("pointerup", end);
  body.addEventListener("pointercancel", e => { if (e.pointerId === id) { id = null; if (lock === "x") closeSwipe(li); } });
}

/* ───────────── Hoja de un producto (conteo) ───────────── */

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
function ago(t) {
  const d = tsDate(t); if (!d) return "";
  const s = (d.getTime() - Date.now()) / 1000, a = Math.abs(s);
  if (a < 45) return "justo ahora";
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

function visibleOrder() {
  const v = ALL.filter(i => rowEl(i.key) && !rowEl(i.key).hidden);
  return v.some(i => i.key === S.sheetKey) ? v : ALL;
}

function openItem(k) {
  if (!BY_KEY.get(k)) return;
  S.sheetKey = k;
  openSheet({
    title: "", left: false, confirm: () => closeSheet(),
    html: `
      <div class="photo" id="is-photo"></div>
      <h3 class="item-title" id="is-name"></h3>
      <p class="item-meta" id="is-meta"></p>
      <p class="item-desc" id="is-desc" hidden></p>
      <div class="segmented none" id="is-seg" style="--n:2"><span class="seg-thumb"></span>
        <button type="button" class="seg-hay" data-v="hay" aria-selected="false">Hay</button>
        <button type="button" class="seg-no" data-v="no" aria-selected="false">No hay</button></div>
      <ul class="list"><li class="cell static qty-cell">
        <div class="cell-text"><div class="t1">Unidades</div></div>
        <input class="qty-input" id="is-q" type="number" inputmode="numeric" pattern="[0-9]*" min="0" placeholder="0" aria-label="Unidades">
        <div class="stepper lg"><button type="button" data-act="dec" aria-label="Restar una unidad">${ICON.minus}</button><i></i><button type="button" data-act="inc" aria-label="Sumar una unidad">${ICON.plus}</button></div>
      </li></ul>
      <p class="edited" id="is-edited"></p>
      <button type="button" class="text-btn" id="is-editp" hidden>Editar producto</button>
      <div class="sheet-nav">
        <button type="button" class="pill-btn" id="is-prev">${ICON.chevL}Anterior</button>
        <button type="button" class="pill-btn" id="is-next">Siguiente${ICON.chevRb}</button></div>`,
    onOpen(body) {
      body.querySelector("#is-seg").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (b) act(S.sheetKey, b.dataset.v); });
      body.querySelector(".stepper").addEventListener("click", e => { const b = e.target.closest("button[data-act]"); if (b) act(S.sheetKey, b.dataset.act); });
      let t;
      const qi = body.querySelector("#is-q");
      const commit = () => {
        clearTimeout(t);
        if (qi.value === "") return;
        const q = Math.max(0, parseInt(qi.value, 10) || 0), k = S.sheetKey, cur = st(k);
        if (q === (cur.s === "no" ? 0 : cur.q || 0)) return;
        S.keep.add(k);
        save(backend.setItem(k, q > 0 ? { q, s: "hay" } : { q }));
      };
      qi.addEventListener("input", () => { clearTimeout(t); t = setTimeout(commit, 600); });
      qi.addEventListener("keydown", e => { if (e.key === "Enter") qi.blur(); });
      qi.addEventListener("blur", () => { commit(); paintItemSheet(); });
      const go = d => {
        commit();
        const v = visibleOrder(), k = v.findIndex(x => x.key === S.sheetKey), nx = v[k + d];
        if (nx) { S.sheetKey = nx.key; paintItemSheet(true); $("#sheet-body").scrollTop = 0; }
      };
      body.querySelector("#is-prev").addEventListener("click", () => go(-1));
      body.querySelector("#is-next").addEventListener("click", () => go(1));
      body.querySelector("#is-editp").addEventListener("click", () => {
        const p = BY_KEY.get(S.sheetKey)?.product; if (!p) return;
        closeSheet(); setTimeout(() => openProduct(p), 380);
      });
      paintItemSheet(true);
    },
    onClose() { S.sheetKey = null; },
  });
}

function paintItemSheet(changed) {
  const k = S.sheetKey; if (k == null) return;
  const i = BY_KEY.get(k);
  if (!i) { closeSheet(); return; }
  const s = st(k), q = s.s === "no" ? 0 : (s.q || 0), body = $("#sheet-body");
  if (!body.querySelector("#is-photo")) return;
  if (changed === true || body.querySelector("#is-photo").dataset.k !== k) {
    const ph = body.querySelector("#is-photo");
    ph.dataset.k = k;
    ph.classList.toggle("ph", !i.img);
    ph.innerHTML = i.img ? `<img src="${esc(i.img)}" alt="">${i.n != null ? `<span class="n">${pad(i.n)}</span>` : ""}` : ICON.camera;
    body.querySelector("#is-name").textContent = i.name;
    body.querySelector("#is-meta").textContent = i.g.dyn
      ? [KINDS[i.g.kind].one, i.size, i.product?.published ? "Publicado en Mercado Libre" : "Sin publicar en Mercado Libre"].filter(Boolean).join(" · ")
      : [i.g.size, `MCO ${i.g.mco}`].filter(Boolean).join(" · ");
    const dsc = body.querySelector("#is-desc");
    dsc.hidden = !i.desc; dsc.textContent = i.desc || "";
    body.querySelector("#is-editp").hidden = !i.g.dyn;
    $("#sheet-title").textContent = i.g.title;
    const v = visibleOrder(), idx = v.findIndex(x => x.key === k);
    body.querySelector("#is-prev").disabled = idx <= 0;
    body.querySelector("#is-next").disabled = idx < 0 || idx >= v.length - 1;
  }
  body.querySelector("#is-photo").classList.toggle("no", s.s === "no");
  const seg = body.querySelector("#is-seg");
  seg.classList.toggle("none", !s.s);
  seg.style.setProperty("--i", s.s === "no" ? 1 : 0);
  seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", b.dataset.v === s.s));
  const inp = body.querySelector("#is-q");
  if (document.activeElement !== inp) inp.value = q || "";
  body.querySelector('.stepper [data-act="dec"]').disabled = !q;
  body.querySelector("#is-edited").textContent = s.by ? `Editado por ${s.by} · ${ago(s.at)}` : "Sin revisar todavía";
}

/* ───────────── Resumen ───────────── */

function people() {
  const set = new Set();
  Object.entries(S.items).forEach(([k, x]) => { if (x.by && BY_KEY.has(k)) set.add(x.by); });
  return [...set];
}

function paintResumen() {
  const t = totals();
  $("#r-rev").innerHTML = `${t.rev}<small>/${t.total}</small>`;
  $("#r-pct").textContent = `${t.total ? Math.round(t.rev / t.total * 100) : 0} %`;
  $("#r-left").textContent = t.pend ? `Faltan ${plural(t.pend, "producto", "productos")}` : "Conteo completo";
  setRing($("#ring-big"), t.total ? t.rev / t.total : 0);
  $("#r-hay").textContent = t.hay; $("#r-no").textContent = t.no; $("#r-uds").textContent = t.uds; $("#r-pend").textContent = t.pend;
  const p = people();
  $("#r-people").textContent = p.length ? p.join(", ") : "Nadie todavía";
  $("#r-groups").innerHTML = CAT.map(g => {
    const list = g.items, hay = list.filter(i => st(i.key).s === "hay").length, rev = list.filter(i => st(i.key).s).length, u = unitsOf(g);
    return `<li><button type="button" class="cell action" data-g="${g.id}">
      <div class="cell-text"><div class="t1">${esc(g.title)}${g.dyn && g.size ? ` · ${esc(g.size)}` : ""}</div><div class="t2">${hay} de ${list.length} con stock${rev < list.length ? ` · ${plural(list.length - rev, "pendiente", "pendientes")}` : ""}</div>
      <div class="mini-bar"><i style="width:${list.length ? hay / list.length * 100 : 0}%"></i></div></div>
      <span class="r-units">${plural(u, "ud", "uds")}</span>${ICON.chevR}</button></li>`;
  }).join("");
}
$("#r-groups").addEventListener("click", e => {
  const b = e.target.closest("button[data-g]"); if (!b) return;
  S.query = ""; $("#search").value = ""; $("#search-clear").hidden = true;
  setFilter("todos");
  setTab("conteo");
  requestAnimationFrame(() => scrollToEl($("#g-" + b.dataset.g)));
});

function paintMeta() {
  const f = $("#f-fecha");
  if (document.activeElement !== f) f.value = S.meta.fecha || today();
}
$("#f-fecha").addEventListener("change", e => { if (e.target.value) save(backend.setMeta({ fecha: e.target.value })); });

let exporting = false;
async function exportPDF() {
  if (exporting) return;
  exporting = true;
  const btns = [$("#btn-export"), $("#btn-export-nav")];
  btns.forEach(b => { b.disabled = true; });
  hud("Preparando PDF…");
  try {
    const { buildPDF } = await import("./pdf.js");
    const fecha = S.meta.fecha || today();
    const doc = await buildPDF({ groups: CAT, st, fecha, people: people() });
    const name = `inventario-vortxshop-${fecha}.pdf`;
    const file = new File([doc.output("blob")], name, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia("(pointer: coarse)").matches) {
      hideHud();
      await navigator.share({ files: [file], title: "Inventario VORTXSHOP" }).catch(e => { if (e.name !== "AbortError") throw e; });
    } else { doc.save(name); hud("PDF descargado", "ok"); }
  } catch (e) {
    console.warn(e); hud("No se pudo crear el PDF.", "err");
  } finally { exporting = false; btns.forEach(b => { b.disabled = false; }); }
}
$("#btn-export").addEventListener("click", exportPDF);
$("#btn-export-nav").addEventListener("click", exportPDF);

$("#btn-reset").addEventListener("click", () => actionSheet({
  title: "¿Reiniciar el conteo?", message: "Se borran las marcas y las unidades para todas las personas. Los productos agregados se conservan. Exporta el PDF antes si quieres guardar una copia.",
  actions: [{ label: "Reiniciar conteo", destructive: true, fn: () => save(backend.reset().then(() => hud("Conteo reiniciado", "ok"))) }],
}));

/* ───────────── Productos agregados ───────────── */

function paintProducts() {
  const list = S.products;
  $("#products").hidden = !list.length;
  $("#products-empty").hidden = !!list.length;
  $("#products").classList.add("prod-list");
  $("#products").innerHTML = list.map(p => {
    const s = st(p.id), q = s.s === "no" ? 0 : (s.q || 0);
    const status = s.s === "hay" ? `<span class="dot-hay">Hay · ${plural(q, "unidad", "unidades")}</span>` : s.s === "no" ? `<span class="dot-no">No hay</span>` : "Sin revisar";
    return `<li><button type="button" class="cell action" data-id="${esc(p.id)}">
      ${thumbHTML({ img: p.photo, n: null })}
      <div class="cell-text"><div class="t1">${esc(p.name)}</div><div class="t2">${p.size || KINDS[p.kind]?.one || "Otro"} · ${status}</div></div>
      ${ICON.chevR}</button></li>`;
  }).join("");
}
$("#products").addEventListener("click", e => { const b = e.target.closest("button[data-id]"); if (b) openProduct(S.products.find(p => p.id === b.dataset.id)); });
$("#btn-add-product").addEventListener("click", () => openProduct(null));
$("#btn-add-empty").addEventListener("click", () => openProduct(null));
$("#btn-add-quick").addEventListener("click", () => openProduct(null));

async function processPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    const w = img.naturalWidth, h = img.naturalHeight, s = Math.min(w, h), size = Math.min(720, s);
    const c = document.createElement("canvas"); c.width = c.height = size;
    const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, size, size);
    x.imageSmoothingQuality = "high";
    x.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, size, size);
    let q = .82, data = c.toDataURL("image/jpeg", q);
    while (data.length > 380000 && q > .4) { q -= .1; data = c.toDataURL("image/jpeg", q); }
    const p = document.createElement("canvas"); p.width = p.height = 1;
    const px = p.getContext("2d"); px.drawImage(c, 0, 0, 1, 1);
    const [r, g, b] = px.getImageData(0, 0, 1, 1).data;
    return { photo: data, color: "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("") };
  } finally { URL.revokeObjectURL(url); }
}

function openProduct(p) {
  const cur = p ? st(p.id) : { s: null, q: 0 };
  const f = { photo: p?.photo || "", color: p?.color || "", photoChanged: false, kind: p?.kind || "cuadro", s: cur.s, q: cur.s === "no" ? 0 : (cur.q || 0), busy: false };
  const canDelete = p && (isAdmin() || p.createdByEmail === S.user?.email);
  const kinds = Object.keys(KINDS);
  openSheet({
    title: p ? "Editar producto" : "Nuevo producto",
    html: `
      <label class="photo-pick" id="p-pick">
        <input type="file" accept="image/*" id="p-file" hidden>
        <div class="pp-empty" id="p-empty">${ICON.camera}<span>Agregar foto</span><small>Toma una foto o elige una de tu galería</small></div>
        <img id="p-img" alt="" hidden><span class="pp-edit" id="p-edit" hidden>Cambiar foto</span>
      </label>
      <ul class="list">
        <li class="cell static field-cell"><input id="p-name" placeholder="Nombre" maxlength="120" autocomplete="off" enterkeyhint="next"></li>
        <li class="cell static field-cell"><textarea id="p-desc" placeholder="Descripción básica: colores, material, estado…" maxlength="400" rows="3"></textarea></li>
      </ul>
      <h3 class="sec-head small">Tamaño</h3>
      <div class="size-chips" id="p-sizes" role="group" aria-label="Tamaño del producto">
        ${SIZE_PRESETS.map(x => `<button type="button" data-size="${esc(x.size)}"><b>${x.label}</b><span>${esc(x.size)}</span></button>`).join("")}
        <button type="button" data-custom="1" class="wide"><b>Personalizado</b><span>Escribe otra medida</span></button></div>
      <ul class="list" id="p-size-wrap" hidden>
        <li class="cell static field-cell"><input id="p-size" placeholder="Medida, ej. 60 × 40 cm" maxlength="40" autocomplete="off" enterkeyhint="done"></li>
      </ul>
      <h3 class="sec-head small">Categoría</h3>
      <div class="segmented" id="p-kind" style="--n:3"><span class="seg-thumb"></span>
        ${kinds.map(k => `<button type="button" data-v="${k}" aria-selected="false">${KINDS[k].one}</button>`).join("")}</div>
      <h3 class="sec-head small">Disponibilidad</h3>
      <div class="segmented none" id="p-av" style="--n:2"><span class="seg-thumb"></span>
        <button type="button" class="seg-hay" data-v="hay" aria-selected="false">Hay</button>
        <button type="button" class="seg-no" data-v="no" aria-selected="false">No hay</button></div>
      <ul class="list"><li class="cell static qty-cell"><div class="cell-text"><div class="t1">Unidades</div></div>
        <input class="qty-input" id="p-q" type="number" inputmode="numeric" pattern="[0-9]*" min="0" placeholder="0" aria-label="Unidades">
        <div class="stepper lg"><button type="button" data-d="-1" aria-label="Restar una unidad">${ICON.minus}</button><i></i><button type="button" data-d="1" aria-label="Sumar una unidad">${ICON.plus}</button></div></li></ul>
      <ul class="list spaced"><li class="cell static"><div class="cell-text"><div class="t1">Publicado en Mercado Libre</div></div>
        <input type="checkbox" class="switch" id="p-pub" role="switch" aria-label="Publicado en Mercado Libre"></li></ul>
      ${p ? `<p class="sec-foot">Agregado por ${esc(p.createdBy || "—")}${p.createdAt ? " · " + esc(ago(p.createdAt)) : ""}</p>` : ""}
      ${canDelete ? `<button type="button" class="pill-btn danger" id="p-del">Eliminar producto</button>` : ""}`,
    confirm() {
      if (f.busy) return false;
      const name = $("#p-name").value.trim();
      if (!name) { hud("Escribe el nombre del producto.", "err"); $("#p-name").focus(); return false; }
      const id = p ? p.id : backend.newId();
      const data = { name, desc: $("#p-desc").value.trim(), size: $("#p-size").value.trim(), kind: f.kind, published: $("#p-pub").checked };
      if (f.photoChanged) { data.photo = f.photo; data.color = f.color; }
      save(backend.saveProduct(id, data, !p));
      const q = Math.max(0, parseInt($("#p-q").value, 10) || 0);
      const s = f.s || (q > 0 ? "hay" : null);
      const before = p ? st(p.id) : { s: null, q: 0 };
      if (s !== (before.s || null) || q !== (before.s === "no" ? 0 : before.q || 0)) save(backend.setItem(id, s === "no" ? { s: "no", q: 0 } : { s, q }));
      hud(p ? "Producto actualizado" : "Producto agregado", "ok");
      closeSheet();
    },
    onOpen(body) {
      const paintPhoto = () => {
        body.querySelector("#p-pick").classList.toggle("has", !!f.photo);
        body.querySelector("#p-empty").hidden = !!f.photo;
        const im = body.querySelector("#p-img"); im.hidden = !f.photo; if (f.photo) im.src = f.photo;
        body.querySelector("#p-edit").hidden = !f.photo;
      };
      const paintKind = () => {
        const seg = body.querySelector("#p-kind");
        seg.style.setProperty("--i", kinds.indexOf(f.kind));
        seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", b.dataset.v === f.kind));
      };
      const paintAv = () => {
        const seg = body.querySelector("#p-av");
        seg.classList.toggle("none", !f.s);
        seg.style.setProperty("--i", f.s === "no" ? 1 : 0);
        seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", b.dataset.v === f.s));
        const qi = body.querySelector("#p-q");
        qi.disabled = f.s === "no";
        if (f.s === "no") qi.value = "";
        body.querySelector('[data-d="-1"]').disabled = f.s === "no" || !(parseInt(qi.value, 10) > 0);
        body.querySelector('[data-d="1"]').disabled = f.s === "no";
      };
      body.querySelector("#p-name").value = p?.name || "";
      body.querySelector("#p-desc").value = p?.desc || "";
      body.querySelector("#p-size").value = p?.size || "";
      const sizeIn = body.querySelector("#p-size"), isPreset = v => SIZE_PRESETS.some(x => x.size === v);
      let customOn = !!p?.size && !isPreset(p.size);
      const paintSizes = () => {
        body.querySelectorAll("#p-sizes button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.custom ? customOn : !customOn && b.dataset.size === sizeIn.value.trim())));
        body.querySelector("#p-size-wrap").hidden = !customOn;
      };
      body.querySelector("#p-sizes").addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.custom) {
          customOn = !customOn;
          if (customOn) { if (isPreset(sizeIn.value.trim())) sizeIn.value = ""; paintSizes(); sizeIn.focus(); }
          else { sizeIn.value = ""; paintSizes(); }
          return;
        }
        customOn = false; sizeIn.value = sizeIn.value.trim() === b.dataset.size ? "" : b.dataset.size; paintSizes();
      });
      paintSizes();
      body.querySelector("#p-pub").checked = !!p?.published;
      body.querySelector("#p-q").value = f.q || "";
      paintPhoto(); paintKind(); paintAv();

      body.querySelector("#p-file").addEventListener("change", async e => {
        const file = e.target.files?.[0]; e.target.value = "";
        if (!file) return;
        const pick = body.querySelector("#p-pick");
        f.busy = true; pick.classList.add("busy"); $("#sheet-right").disabled = true;
        try { Object.assign(f, await processPhoto(file), { photoChanged: true }); paintPhoto(); }
        catch (err) { console.warn(err); hud("No se pudo leer la foto. Prueba con otra.", "err"); }
        finally { f.busy = false; pick.classList.remove("busy"); $("#sheet-right").disabled = false; }
      });
      body.querySelector("#p-kind").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (b) { f.kind = b.dataset.v; paintKind(); } });
      body.querySelector("#p-av").addEventListener("click", e => {
        const b = e.target.closest("button[data-v]"); if (!b) return;
        f.s = f.s === b.dataset.v ? null : b.dataset.v; paintAv();
      });
      body.querySelector("#p-q").addEventListener("input", e => {
        const q = parseInt(e.target.value, 10) || 0;
        if (q > 0 && f.s !== "hay") f.s = "hay";
        paintAv();
      });
      body.querySelector(".stepper").addEventListener("click", e => {
        const b = e.target.closest("button[data-d]"); if (!b) return;
        const qi = body.querySelector("#p-q");
        const q = Math.max(0, (parseInt(qi.value, 10) || 0) + +b.dataset.d);
        qi.value = q || "";
        if (q > 0) f.s = "hay";
        paintAv();
      });
      body.querySelector("#p-del")?.addEventListener("click", () => actionSheet({
        title: "¿Eliminar este producto?", message: "Se quita de la lista y del conteo para todas las personas.",
        actions: [{ label: "Eliminar producto", destructive: true, fn: () => { save(backend.deleteProduct(p.id).then(() => hud("Producto eliminado", "ok"))); closeSheet(); } }],
      }));
    },
  });
}

/* ───────────── Cuenta y personas ───────────── */

function avatarHTML(name, photo, cls = "", id = "") {
  const ini = String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
  return `<span class="avatar ${cls}"${id ? ` id="${id}"` : ""}>${photo ? `<img src="${esc(photo)}" alt="" referrerpolicy="no-referrer">` : esc(ini)}</span>`;
}
function paintMe() {
  if (!S.user) return;
  $("#me-avatar").outerHTML = avatarHTML(S.user.name, S.user.photo, "xxl", "me-avatar");
  $("#me-name").textContent = S.user.name;
  $("#me-email").textContent = S.user.email;
  const r = $("#me-role");
  r.textContent = isAdmin() ? "Administrador" : "Editor";
  r.classList.toggle("admin", isAdmin());
}
function applyRole() { $$(".admin-only").forEach(el => { el.hidden = !isAdmin(); }); paintMembers(); }

function paintMembers() {
  const rank = m => (m.email === S.user?.email ? 0 : m.role === "admin" ? 1 : 2);
  const list = [...S.members].sort((a, b) => rank(a) - rank(b) || String(a.name || a.email).localeCompare(String(b.name || b.email)));
  $("#members").innerHTML = list.map(m => {
    const me = m.email === S.user?.email, tap = isAdmin() && !me;
    return `<li><div class="cell member-cell${tap ? " tap" : ""}" ${tap ? `role="button" tabindex="0" data-email="${esc(m.email)}"` : ""}>
      ${avatarHTML(m.name || m.email, m.photo)}
      <div class="cell-text"><div class="t1">${esc(m.name || m.email)}${me ? ' <span class="you">(tú)</span>' : ""}</div><div class="t2">${m.name ? esc(m.email) : "Invitado · aún no ha entrado"}</div></div>
      <span class="badge${m.role === "admin" ? " admin" : ""}">${m.role === "admin" ? "Admin" : "Editor"}</span></div></li>`;
  }).join("") + (isAdmin() ? `<li><button class="cell action" id="btn-invite" type="button"><span class="a-ico blue"><svg viewBox="0 0 24 24"><circle cx="10" cy="8.5" r="3.5"/><path d="M3.5 19.5c.9-3.3 3.4-5 6.5-5 1.6 0 3 .4 4.1 1.3M18 13.5v6M15 16.5h6"/></svg></span><span class="a-label blue-text">Invitar persona</span></button></li>` : "");
}
function memberMenu(email) {
  const m = S.members.find(x => x.email === email); if (!m) return;
  const toAdmin = m.role !== "admin";
  actionSheet({
    title: m.name || m.email, message: m.name ? m.email : "",
    actions: [
      { label: toAdmin ? "Hacer administrador" : "Cambiar a editor", fn: () => save(backend.setRole(email, toAdmin ? "admin" : "editor").then(() => hud("Permiso actualizado", "ok"))) },
      { label: "Quitar acceso", destructive: true, fn: () => save(backend.removeMember(email).then(() => hud("Acceso quitado", "ok"))) },
    ],
  });
}
$("#members").addEventListener("click", e => {
  if (e.target.closest("#btn-invite")) return openInvite();
  const c = e.target.closest("[data-email]"); if (c) memberMenu(c.dataset.email);
});
$("#members").addEventListener("keydown", e => { const c = e.target.closest("[data-email]"); if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); memberMenu(c.dataset.email); } });

function openInvite() {
  let role = "editor";
  openSheet({
    title: "Invitar persona",
    html: `
      <ul class="list"><li class="cell static field-cell"><input id="inv-email" type="email" inputmode="email" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="correo@gmail.com"></li></ul>
      <p class="sec-foot">Debe ser el correo de la cuenta de Google con la que va a entrar.</p>
      <h3 class="sec-head small">Permiso</h3>
      <div class="segmented" id="inv-role" style="--n:2"><span class="seg-thumb"></span>
        <button type="button" data-r="editor" aria-selected="true">Editor</button><button type="button" data-r="admin" aria-selected="false">Administrador</button></div>
      <p class="sec-foot" id="inv-help">Puede contar, agregar productos y exportar el PDF.</p>
      <p class="sec-foot">No se envía ningún correo: compártele el enlace de la app.</p>`,
    confirm() {
      const email = $("#inv-email").value.trim().toLowerCase();
      if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) { hud("Escribe un correo válido.", "err"); return false; }
      if (S.members.some(m => m.email === email)) { hud("Esa persona ya tiene acceso.", "err"); return false; }
      save(backend.invite(email, role).then(() => hud("Persona agregada", "ok")));
      closeSheet();
    },
    onOpen(body) {
      const ok = () => { $("#sheet-right").disabled = !$("#inv-email").value.trim(); };
      body.querySelector("#inv-email").addEventListener("input", ok); ok();
      body.querySelector("#inv-email").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); sheetCfg?.confirm?.(); } });
      body.querySelector("#inv-role").addEventListener("click", e => {
        const b = e.target.closest("button[data-r]"); if (!b) return;
        role = b.dataset.r;
        body.querySelectorAll("#inv-role button").forEach(x => x.setAttribute("aria-selected", x === b));
        body.querySelector("#inv-role").style.setProperty("--i", role === "admin" ? 1 : 0);
        body.querySelector("#inv-help").textContent = role === "admin"
          ? "Además puede invitar personas, cambiar permisos y reiniciar el conteo."
          : "Puede contar, agregar productos y exportar el PDF.";
      });
    },
  });
}

$("#btn-install").addEventListener("click", () => openSheet({
  title: "Pantalla de inicio",
  html: `
    <ol class="list steps">
      <li><span class="num">1</span><span>Abre esta página en <b>Safari</b>.</span></li>
      <li><span class="num">2</span><span>Toca <span class="share-ico">${ICON.share}</span> <b>Compartir</b> (o ··· y luego Compartir).</span></li>
      <li><span class="num">3</span><span>Elige <b>Agregar a inicio</b> y toca <b>Agregar</b>.</span></li>
      <li><span class="num">4</span><span>Abre <b>Inventario</b> desde el ícono, como cualquier app.</span></li>
    </ol>
    <p class="sec-foot">Al abrirla desde el ícono es posible que tengas que iniciar sesión con Google una vez más.</p>`,
}));

/* ───────────── Hojas, hojas de acciones y avisos ───────────── */

let sheetCfg = null, sheetTimer;
function openSheet(cfg) {
  clearTimeout(sheetTimer);
  if (sheetCfg) sheetCfg.onClose?.();
  sheetCfg = cfg;
  $("#sheet-title").textContent = cfg.title || "";
  $("#sheet-left").style.visibility = cfg.left === false ? "hidden" : "";
  const r = $("#sheet-right");
  r.hidden = !cfg.confirm; r.disabled = false;
  const body = $("#sheet-body");
  body.innerHTML = cfg.html; body.scrollTop = 0;
  const w = $("#sheet-wrap");
  w.hidden = false; w.style.setProperty("--drag", "0px");
  document.documentElement.style.overflow = "hidden";
  requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add("open")));
  cfg.onOpen?.(body);
}
function closeSheet() {
  if (!sheetCfg) return;
  const cfg = sheetCfg; sheetCfg = null;
  const w = $("#sheet-wrap");
  if (document.activeElement && w.contains(document.activeElement)) document.activeElement.blur();
  w.classList.remove("open");
  document.documentElement.style.overflow = "";
  sheetTimer = setTimeout(() => { w.hidden = true; $("#sheet-body").innerHTML = ""; }, 480);
  cfg.onClose?.();
  if (S.keep.size && S.filter !== "todos") { S.keep.clear(); applyFilter(); }
}
$("#sheet-left").addEventListener("click", closeSheet);
$("#sheet-backdrop").addEventListener("click", closeSheet);
$("#sheet-right").addEventListener("click", () => { sheetCfg?.confirm?.(); });
addEventListener("keydown", e => { if (e.key === "Escape") { if (!$("#action-wrap").hidden) closeAction(); else closeSheet(); } });

(() => {
  const grab = $("#sheet-grab"), sheet = $("#sheet"), w = $("#sheet-wrap");
  let y0 = 0, id = null, dy = 0;
  grab.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; id = e.pointerId; y0 = e.clientY; dy = 0; try { grab.setPointerCapture(id); } catch (_) {} sheet.classList.add("dragging"); });
  grab.addEventListener("pointermove", e => { if (e.pointerId !== id) return; dy = Math.max(0, e.clientY - y0); w.style.setProperty("--drag", dy + "px"); });
  const end = e => { if (e.pointerId !== id) return; id = null; sheet.classList.remove("dragging"); w.style.setProperty("--drag", "0px"); if (dy > 110) closeSheet(); };
  grab.addEventListener("pointerup", end); grab.addEventListener("pointercancel", end);
})();

let actionTimer;
function actionSheet({ title, message, actions }) {
  clearTimeout(actionTimer);
  const g = $("#action-group"), w = $("#action-wrap");
  g.innerHTML = (title || message ? `<div class="a-head">${title ? `<b>${esc(title)}</b>` : ""}${message ? esc(message) : ""}</div>` : "")
    + actions.map((a, k) => `<button type="button" data-k="${k}" class="${a.destructive ? "destructive" : ""}">${esc(a.label)}</button>`).join("");
  g.onclick = e => { const b = e.target.closest("button[data-k]"); if (!b) return; closeAction(); actions[+b.dataset.k].fn(); };
  w.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add("open")));
}
function closeAction() {
  const w = $("#action-wrap");
  if (w.hidden) return;
  w.classList.remove("open");
  actionTimer = setTimeout(() => { w.hidden = true; }, 450);
}
$("#action-cancel").addEventListener("click", closeAction);
$("#action-backdrop").addEventListener("click", closeAction);

let hudTimer;
function hud(text, kind) {
  $("#hud-text").textContent = text;
  const ico = $("#hud-ico");
  ico.className = kind || ""; ico.innerHTML = kind === "ok" ? ICON.check : kind === "err" ? ICON.x : "";
  $("#hud").classList.add("on");
  clearTimeout(hudTimer); hudTimer = setTimeout(hideHud, 2800);
}
function hideHud() { $("#hud").classList.remove("on"); }

/* ───────────── Arranque ───────────── */

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
renderCatalog();
paintItems(); paintMeta();

(async () => {
  try { backend = DEMO ? demoBackend() : await firebaseBackend(); }
  catch (e) { console.error(e); show("login"); hud("No se pudo conectar. Revisa internet y recarga.", "err"); return; }
  backend.onAuth(onUser);
})();

if ("serviceWorker" in navigator && !DEMO && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
