"use strict";

/* =========================================================
   Shared helpers for every page: language, words, small tools.
   (You don't need to edit this file.)
   ========================================================= */
const LANGS = ["en", "th", "ru"];
const STORE_KEY = "rc-lang";

function pickLang() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch (e) { /* storage blocked */ }
  const nav = (navigator.language || "en").slice(0, 2);
  return LANGS.includes(nav) ? nav : "en";
}

const ui = { lang: pickLang() };

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
  o[keys[keys.length - 1]] = value;
}
function t(path, vars, lang = ui.lang) {
  let v = getPath(I18N[lang], path);
  if (v == null) v = getPath(I18N.en, path);
  if (v == null) return path;
  if (typeof v === "string" && vars) v = v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ""));
  return v;
}
const lab = (group, key, lang) => t(`labels.${group}.${key}`, null, lang);
const tr = (obj, field, lang = ui.lang) => obj[`${field}_${lang}`] || obj[field];
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const money = (n) => CONFIG.currency + n;
const igLink = () => "https://ig.me/m/" + CONFIG.instagram;

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok ? Promise.resolve() : Promise.reject(new Error("copy failed"));
}

/* Fill every element that has data-i18n="path.to.words" */
function applyStaticText() {
  document.documentElement.lang = ui.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  document.querySelectorAll("[data-lang]").forEach((b) => {
    const on = b.dataset.lang === ui.lang;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on);
  });
}

/* Any English text that has no entry in i18n.js is looked up in i18n-extra.js (PHRASES) and swapped automatically,
   so pressing TH or RU translates the whole page. The English original is remembered, so EN restores it. */
const ATTRS = ["placeholder", "alt", "title", "aria-label"];
function phrase(s) {
  const P = typeof PHRASES !== "undefined" ? PHRASES[ui.lang] : null;
  if (!P) return null;
  const key = s.trim();
  if (!key) return null;
  if (P[key]) return P[key];
  const i = key.lastIndexOf(", ");
  if (i > 0) {
    const head = key.slice(0, i), tail = key.slice(i + 2);
    if (P[head] || P[tail]) return (P[head] || head) + ", " + (P[tail] || tail);
  }
  return null;
}
function swapText(cur, en) {
  if (ui.lang === "en") return en;
  const p = phrase(en);
  return p == null ? en : en.replace(en.trim(), p);
}
function translateTree(root) {
  if (!root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const pe = n.parentElement;
    if (!pe || pe.tagName === "SCRIPT" || pe.tagName === "STYLE" || pe.tagName === "TEXTAREA") continue;
    const cur = n.nodeValue;
    const en = n._en !== undefined && cur === n._out ? n._en : cur;
    const out = swapText(cur, en);
    if (out !== cur) { n._en = en; n._out = out; n.nodeValue = out; }
    else if (n._en !== undefined && cur === n._out) { n._en = undefined; }
  }
  const els = root.querySelectorAll ? root.querySelectorAll("[placeholder],[alt],[title],[aria-label],[data-en-placeholder],[data-en-alt],[data-en-title],[data-en-aria-label]") : [];
  els.forEach((el) => ATTRS.forEach((a) => {
    const stored = el.getAttribute("data-en-" + a);
    const cur = el.getAttribute(a);
    if (cur == null) return;
    const en = stored != null && cur === el.getAttribute("data-out-" + a) ? stored : cur;
    const out = swapText(cur, en);
    if (out !== cur) { el.setAttribute("data-en-" + a, en); el.setAttribute("data-out-" + a, out); el.setAttribute(a, out); }
  }));
  if (root === document.body) {
    if (document._titleEn === undefined || document.title !== document._titleOut) document._titleEn = document.title;
    const tt = swapText(document.title, document._titleEn);
    if (tt !== document.title) { document._titleOut = tt; document.title = tt; }
  }
}
let trTimer = 0;
function scheduleTranslate() { clearTimeout(trTimer); trTimer = setTimeout(() => translateTree(document.body), 60); }
if (document.body) {
  new MutationObserver(scheduleTranslate).observe(document.body, { childList: true, subtree: true, characterData: true });
  scheduleTranslate();
}

/* Language buttons + a list of things to re-draw when the language changes */
const langListeners = [applyStaticText];
function onLangChange(fn) { langListeners.push(fn); }
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang]");
  if (!b) return;
  ui.lang = b.dataset.lang;
  try { localStorage.setItem(STORE_KEY, ui.lang); } catch (err) { /* storage blocked */ }
  langListeners.forEach((fn) => fn());
  scheduleTranslate();
});

/* Mobile menu */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-menu]");
  if (!b) return;
  const open = document.body.classList.toggle("menu-open");
  b.setAttribute("aria-expanded", open);
});

/* =========================================================
   Cart: several pieces in one order. Kept on this device; the order is sent as one Instagram message.
   ========================================================= */
const CART_KEY = "rc-cart";
function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { return []; } }
function setCart(list) { try { localStorage.setItem(CART_KEY, JSON.stringify(list)); } catch (e) { return false; } renderCart(); return true; }
function addToCart(item) { const l = getCart(); l.push(Object.assign({ id: Date.now() + Math.random().toString(36).slice(2, 6) }, item)); return setCart(l); }
function cartOrderText() {
  const l = getCart();
  const out = [hello("order", l.length), ""];
  l.forEach((it, i) => { out.push(`#${i + 1} ${it.title}`, it.text, ""); });
  return out.join("\n");
}
function renderCart() {
  const n = getCart().length;
  const btn = document.getElementById("cart-btn");
  if (btn) { btn.querySelector(".cart-n").textContent = n; btn.classList.toggle("has", n > 0); }
  const dr = document.getElementById("cart-drawer");
  if (!dr) return;
  const l = getCart();
  dr.querySelector(".cart-list").innerHTML = l.length ? l.map((it) => `<li><span class="cart-thumb">${it.thumb || ""}</span><span class="cart-info"><strong>${esc(it.title)}</strong><small>${esc(it.sub || "")}</small></span><button type="button" class="cart-x" data-cart-del="${it.id}" aria-label="Remove">✕</button></li>`).join("") : `<li class="cart-empty">Your cart is empty. Design a piece and tap Add to cart.</li>`;
  dr.querySelector(".cart-actions").hidden = !l.length;
  if (document.body) translateTree(dr);
}
document.addEventListener("click", (e) => {
  const open = e.target.closest("#cart-btn");
  const dr = document.getElementById("cart-drawer");
  if (open && dr) { renderCart(); dr.classList.add("open"); return; }
  if (e.target.closest("[data-cart-close]") && dr) { dr.classList.remove("open"); return; }
  const del = e.target.closest("[data-cart-del]");
  if (del) { setCart(getCart().filter((x) => x.id !== del.dataset.cartDel)); return; }
  if (e.target.closest("[data-cart-copy]")) { copyText(cartOrderText()).catch(() => {}); e.target.closest("[data-cart-copy]").textContent = ui.lang === "en" ? "Copied ✓" : (phrase("Copied ✓") || "Copied ✓"); return; }
  if (e.target.closest("[data-cart-dm]")) { if (dr) dr.classList.remove("open"); openSend(cartOrderText()); return; }
  if (e.target.closest("[data-cart-clear]")) { setCart([]); }
});

/* =========================================================
   Header and footer, shared by every page
   ========================================================= */
function renderChrome() {
  const N = (k) => t("nav." + k);
  const page = document.body.dataset.page;
  const link = (href, key, id) => `<a href="${href}" class="${page === id ? "here" : ""}">${N(key)}</a>`;
  const header = document.getElementById("site-header");
  if (header) {
    header.innerHTML = `
      <p class="announce">${N("announce")}</p>
      <div class="nav-row">
        <button type="button" class="menu-btn" data-menu aria-expanded="false" aria-controls="nav-links"><span class="bars" aria-hidden="true"></span><span class="sr">${N("menu")}</span></button>
        <a class="wordmark" href="index.html">${CONFIG.shopName}</a>
        <nav class="nav-links" id="nav-links" aria-label="Main">
          <a href="index.html#shop" class="nav-cta nav-shop">${N("shop")}</a>
          <a href="design.html?start=1" class="nav-cta nav-design">${N("design")}</a>
          <div class="dd">
            <button type="button" class="dd-btn nav-cta nav-sec" aria-haspopup="true">${N("sections")} <span aria-hidden="true">▾</span></button>
            <div class="dd-menu">${[["design.html?cat=keychains", "Keychains"], ["design.html?cat=accessories", "Accessories"], ["design.html?cat=statues", "Games & decor"], ["design.html?cat=kitchen", "Dining & restaurant"], ["design.html?cat=cutting", "Wooden cutting boards"], ["design.html?cat=paint", "Any size canvas"], ["canvas.html?kind=photo", "Custom gifts"], ["idea.html", "Send us a photo"]].map(([href, nm]) => `<a href="${href}">${nm}</a>`).join("")}</div>
          </div>
          <a href="idea.html" class="nav-cta${page === "idea" ? " here" : ""}">${N("idea")}</a>
          <a href="index.html#faq" class="nav-cta">${N("faq")}</a>
        </nav>
        <div class="nav-end">
          <button type="button" id="cart-btn" class="cart-btn" aria-label="Cart"><span aria-hidden="true">🛒</span> <span>Cart</span> <span class="cart-n">0</span></button>
          <div class="langs" role="group" aria-label="Language">
            <button type="button" data-lang="en">EN</button><button type="button" data-lang="th">TH</button><button type="button" data-lang="ru">RU</button>
          </div>
        </div>
      </div>`;
  }
  if (header && !document.getElementById("cart-drawer")) {
    const dr = document.createElement("aside");
    dr.id = "cart-drawer"; dr.className = "cart-drawer";
    dr.innerHTML = `<div class="cart-back" data-cart-close></div><div class="cart-panel"><div class="cart-head"><h2>Your cart</h2><button type="button" data-cart-close aria-label="Close">✕</button></div><ul class="cart-list"></ul>
      <div class="cart-actions" hidden><button type="button" class="btn btn-ink wide" data-cart-dm>Send the order to Anna</button><button type="button" class="btn btn-line wide" data-cart-copy>Copy the order text</button><button type="button" class="btn btn-line small" data-cart-clear>Empty the cart</button></div></div>`;
    document.body.appendChild(dr);
  }
  renderCart();
  const footer = document.getElementById("site-footer");
  if (footer) {
    const H = (k, v) => t("home." + k, v);
    footer.innerHTML = `
      <div class="foot-inner">
        <div class="foot-brand">
          <a class="wordmark light" href="index.html">${CONFIG.shopName}</a>
          <p>${H("footerTag")}</p>
        </div>
        <nav class="foot-col" aria-label="Shop">
          <a href="index.html#shop">${N("shop")}</a>
          <a href="index.html#sec-keychains">${N("sections")}</a>
          <a href="idea.html">${N("idea")}</a>
          <a href="design.html?saves=1">${t("ui.myDraftsBtn")}</a>
          <a href="index.html#faq">${N("faq")}</a>
        </nav>
        <div class="foot-col">
          <span class="foot-label">${H("follow")}</span>
          <a href="https://www.instagram.com/${CONFIG.instagram}/" target="_blank" rel="noopener">Instagram</a>
          ${CONFIG.facebook ? `<a href="${esc(CONFIG.facebook)}" target="_blank" rel="noopener">Facebook</a>` : ""}
          ${waDigits() ? `<a href="https://wa.me/${waDigits()}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
          <a href="${igLink()}" target="_blank" rel="noopener">${H("contact")}</a>
        </div>
      </div>
      <p class="foot-small">© ${new Date().getFullYear()} ${CONFIG.shopName}. Handmade in Phuket.</p>`;
  }
  applyStaticText();
}
langListeners.unshift(renderChrome);

/* =========================================================
   Sea atmosphere: bubbles, floating shells, reveal on scroll, bubble pop on tap
   ========================================================= */
function seaAtmosphere() {
  if (document.querySelector(".bubbles")) return;
  const wrap = document.createElement("div");
  wrap.className = "bubbles";
  for (let i = 0; i < 14; i++) {
    const b = document.createElement("i"), s = 8 + Math.random() * 26;
    b.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-duration:${14 + Math.random() * 18}s;animation-delay:${-Math.random() * 30}s`;
    wrap.appendChild(b);
  }
  document.body.prepend(wrap);
  const hero = document.querySelector(".hero");
  if (hero) {
    [["starfish-drawn.svg", "4%", "30%", 120, "-14deg"], ["starfish-drawn.svg", "88%", "12%", 80, "18deg"]].forEach(([f, x, y, w, r], i) => {
      const im = document.createElement("img");
      im.className = "deco-shell"; im.src = `images/sea/${f}`; im.alt = "";
      im.style.cssText = `left:${x};top:${y};width:${w}px;--r:${r};animation-delay:${-i * 1.7}s`;
      hero.appendChild(im);
    });
  }
}
function revealScan() {
  if (!("IntersectionObserver" in window)) return;
  const io = revealScan.io || (revealScan.io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: 0.08 }));
  document.querySelectorAll(".section-head, .make, .product, .gallery figure, .style-card, .way, .how-steps li, .story-grid > *").forEach((el) => {
    if (el.dataset.rv) return;
    el.dataset.rv = "1"; el.classList.add("reveal");
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight) el.classList.add("in"); else io.observe(el);
  });
}
function burst(x, y, n, spread) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    p.className = "pop-bubble";
    const an = Math.random() * Math.PI * 2, d = spread * (0.4 + Math.random() * 0.8), s = 8 + Math.random() * 16;
    p.style.cssText = `left:${x - s / 2}px;top:${y - s / 2}px;--dx:${Math.cos(an) * d}px;--dy:${Math.sin(an) * d - 30}px;width:${s}px;height:${s}px;animation-duration:${0.9 + Math.random() * 0.7}s`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1700);
  }
}
document.addEventListener("pointerdown", (e) => {
  const b = e.target.closest(".btn-ink, .nav-design");
  if (b) burst(e.clientX, e.clientY, 12, 70);
});
window.addEventListener("load", () => { seaAtmosphere(); revealScan(); });
new MutationObserver(() => { clearTimeout(revealScan.t); revealScan.t = setTimeout(revealScan, 120); }).observe(document.documentElement, { childList: true, subtree: true });

/* Preload every picture in the background so nothing pops in or flickers while you design or scroll */
(function preloadAll() {
  if (typeof CONFIG === "undefined" || document.body.dataset.page !== "design") return;   // the home page only loads what you scroll to
  const urls = new Set();
  const add = (u) => { if (u && typeof u === "string") urls.add(u); };
  (CONFIG.addins || []).forEach((a) => add(a.img));
  (CONFIG.glitters || []).forEach((g) => add(`images/glitter/${g.id}.png`));
  (CONFIG.tassels || []).forEach((t) => add(`images/tassels/${t.id}.png`));
  ["metal"].forEach(() => {});
  ["gold", "yellow", "copper", "silver", "chrome", "black"].forEach((m) => add(`images/letters/${m}.jpg`));
  ["images/real/swirl-gray.jpg", "images/sea/starfish-drawn.svg"].forEach(add);
  const list = [...urls];
  const run = () => { let i = 0; const next = () => { if (i >= list.length) return; const im = new Image(); im.decoding = "async"; im.onload = im.onerror = next; im.src = list[i++]; }; next(); next(); next(); };
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 6000 }); else setTimeout(run, 3000);
})();

/* Load pictures only when they come near the screen */
(function lazyImages() {
  const mark = () => document.querySelectorAll("img:not([data-lz])").forEach((im) => {
    im.dataset.lz = "1";
    if (im.closest(".hero, .site-header, .ph-box")) { im.decoding = "async"; return; }
    if (!im.hasAttribute("loading")) im.loading = "lazy";
    im.decoding = "async";
  });
  new MutationObserver(mark).observe(document.documentElement, { childList: true, subtree: true });
  mark();
})();

/* =========================================================
   "Send to Anna": one popup used by every order and feedback button.
   It copies the message, opens the chat app the customer picks, and tells them to paste.
   WhatsApp and LINE only appear when their numbers are filled in config.js.
   ========================================================= */
const SEND_T = {
  en: { title: "Send your order to Anna", fbTitle: "Send your message to Anna", sub: "Pick where to send it. Anna replies to confirm the price and the date.", s1: "We copy your message for you.", s2: "The chat opens.", s3: "Tap the message box, choose Paste, then Send.", s3wa: "On WhatsApp the message is already typed in. Just tap Send.", see: "See the message", copy: "Copy the message", copied: "Copied ✓ Now paste it in the chat.", close: "Close" },
  th: { title: "ส่งคำสั่งซื้อถึงแอนนา", fbTitle: "ส่งข้อความถึงแอนนา", sub: "เลือกช่องทางที่จะส่ง แอนนาจะตอบกลับเพื่อยืนยันราคาและวันที่", s1: "เราคัดลอกข้อความให้คุณแล้ว", s2: "แชทจะเปิดขึ้น", s3: "แตะที่ช่องพิมพ์ข้อความ เลือก วาง แล้วกดส่ง", s3wa: "ใน WhatsApp ข้อความถูกพิมพ์ไว้ให้แล้ว แค่กดส่ง", see: "ดูข้อความ", copy: "คัดลอกข้อความ", copied: "คัดลอกแล้ว ✓ วางในแชทได้เลย", close: "ปิด" },
  ru: { title: "Отправить заказ Анне", fbTitle: "Отправить сообщение Анне", sub: "Выбери, куда отправить. Анна ответит и подтвердит цену и дату.", s1: "Мы копируем твоё сообщение.", s2: "Открывается чат.", s3: "Нажми на поле ввода, выбери «Вставить» и отправь.", s3wa: "В WhatsApp сообщение уже набрано. Просто нажми «Отправить».", see: "Показать сообщение", copy: "Скопировать сообщение", copied: "Скопировано ✓ Теперь вставь в чат.", close: "Закрыть" },
};
const ST = (k) => (SEND_T[ui.lang] || SEND_T.en)[k];

/* The first line of every message is in the customer's language; the details stay in English so Anna reads every order the same way. */
const HELLO = {
  order: { en: (n) => `Hi Anna! I'd like to order ${n} ${n === 1 ? "piece" : "pieces"} 💛`, th: (n) => `สวัสดีค่ะ แอนนา! อยากสั่ง ${n} ชิ้นค่ะ 💛`, ru: (n) => `Здравствуйте, Анна! Хочу заказать ${n} шт. 💛` },
  keychain: { en: () => "Hi Anna! I designed a keychain on your website 💛", th: () => "สวัสดีค่ะ แอนนา! ออกแบบพวงกุญแจบนเว็บไซต์มาแล้วค่ะ 💛", ru: () => "Здравствуйте, Анна! Я придумал(а) брелок на вашем сайте 💛" },
  canvas: { en: () => "Hi Anna! I'd like a canvas.", th: () => "สวัสดีค่ะ แอนนา! อยากสั่งแคนวาสค่ะ", ru: () => "Здравствуйте, Анна! Хочу заказать холст." },
  photo: { en: () => "Hi Anna! I'd like a photo canvas 💛", th: () => "สวัสดีค่ะ แอนนา! อยากสั่งแคนวาสรูปถ่ายค่ะ 💛", ru: () => "Здравствуйте, Анна! Хочу холст с фотографиями 💛" },
  idea: { en: () => "Hi Anna! I have an idea for a custom piece.", th: () => "สวัสดีค่ะ แอนนา! มีไอเดียอยากให้ทำค่ะ", ru: () => "Здравствуйте, Анна! У меня есть идея для заказа." },
  feedback: { en: () => "Feedback for Resincraftcode 💛", th: () => "ความคิดเห็นถึง Resincraftcode 💛", ru: () => "Отзыв для Resincraftcode 💛" },
};
function hello(kind, n) { const h = HELLO[kind]; return (h[ui.lang] || h.en)(n); }

const waDigits = () => String(CONFIG.whatsapp || "").replace(/\D/g, "");
function sendChannels(text) {
  const list = [{ id: "ig", label: "Instagram", href: igLink() }];
  if (waDigits()) list.push({ id: "wa", label: "WhatsApp", href: `https://wa.me/${waDigits()}?text=${encodeURIComponent(text)}` });
  const line = String(CONFIG.line || "").trim();
  if (line) list.push({ id: "line", label: "LINE", href: line.startsWith("@") ? `https://line.me/R/oaMessage/${encodeURIComponent(line)}/?${encodeURIComponent(text)}` : `https://line.me/ti/p/~${encodeURIComponent(line)}` });
  return list;
}
let sendBox = null;
function closeSend() {
  if (!sendBox) return;
  document.removeEventListener("keydown", sendBox._key);
  const back = sendBox._from; sendBox.remove(); sendBox = null;
  if (back && back.focus) back.focus();
}
function openSend(text, opts = {}) {
  closeSend();
  const chans = sendChannels(text);
  sendBox = document.createElement("div");
  sendBox.className = "send-dlg";
  sendBox._from = document.activeElement;
  sendBox.innerHTML = `<div class="send-back" data-send-close></div>
    <div class="send-panel" role="dialog" aria-modal="true" aria-labelledby="send-h">
      <button type="button" class="send-x" data-send-close aria-label="${esc(ST("close"))}">✕</button>
      <h2 id="send-h">${esc(opts.feedback ? ST("fbTitle") : ST("title"))}</h2>
      <p class="send-sub">${esc(ST("sub"))}</p>
      <div class="send-ch">${chans.map((c, i) => `<a class="btn ${i ? "btn-line" : "btn-ink"} wide ch-${c.id}" href="${esc(c.href)}" target="_blank" rel="noopener" data-send-ch="${c.id}">${c.label}</a>`).join("")}</div>
      <ol class="send-steps"><li>${esc(ST("s1"))}</li><li>${esc(ST("s2"))}</li><li>${esc(ST("s3"))}</li></ol>
      ${waDigits() ? `<p class="small-note">${esc(ST("s3wa"))}</p>` : ""}
      <p class="send-done" role="status" aria-live="polite"></p>
      <details class="send-msg"><summary>${esc(ST("see"))}</summary><textarea readonly rows="8">${esc(text)}</textarea></details>
      <button type="button" class="btn btn-line small" data-send-copy>${esc(ST("copy"))}</button>
    </div>`;
  document.body.appendChild(sendBox);
  const done = sendBox.querySelector(".send-done");
  const copyNow = () => copyText(text).then(() => { done.textContent = ST("copied"); }).catch(() => { sendBox && (sendBox.querySelector(".send-msg").open = true); });
  sendBox.addEventListener("click", (e) => {
    if (e.target.closest("[data-send-close]")) return closeSend();
    if (e.target.closest("[data-send-ch]")) { copyNow(); if (opts.onSent) opts.onSent(); return; }
    if (e.target.closest("[data-send-copy]")) copyNow();
  });
  sendBox._key = (e) => {
    if (e.key === "Escape") closeSend();
    if (e.key === "Tab") {   // keep focus inside the popup
      const f = [...sendBox.querySelectorAll("a, button, summary, textarea")].filter((x) => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener("keydown", sendBox._key);
  sendBox.querySelector("[data-send-ch]").focus();
  copyText(text).catch(() => {});   // copy straight away too, in case they switch apps themselves
}
