/* ==========================================================
   الملف: js/features.js  (بيتحمّل قبل main.js)
   المميزات الإضافية: 1 تركيز بالشاي | 2 الجرسون | 3 سلسلة الأيام
                      4 تراجع بعد الحذف | 5 الوضع الليلي | 6 مستوى المجهود
   الدوال هنا بيتنادى عليها من main.js بعد ما الصفحة تحمّل
   ========================================================== */

const FOCUS_SECONDS = 25 * 60;          // مدة الكوباية الواحدة
const STATS_KEY = "ahwa-stats-v1";      // { last, streak, cups: {تاريخ: عدد} }
const THEME_KEY = "ahwa-theme";

const ymd = d => d.toLocaleDateString("en-CA");   // YYYY-MM-DD بتوقيت جهازك
const dayOffset = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };

function loadStats() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY)) || { last: "", streak: 0, cups: {} }; }
    catch (e) { return { last: "", streak: 0, cups: {} }; }
}
function saveStats(s) { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {} }


/* ---------- 3) سلسلة الأيام ---------- */
// بتتنادى أول ما مهمة تتشطب
function recordDone() {
    const s = loadStats(), today = dayOffset(0);
    if (s.last === today) return;                       // اتحسب النهارده قبل كده
    s.streak = s.last === dayOffset(-1) ? s.streak + 1 : 1;
    s.last = today;
    saveStats(s);
}
function dayWord(n) {
    return n === 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? n + " أيام" : n + " يوم";
}


/* ---------- 4) رسالة صغيرة (للتراجع ولكلام الجرسون) ---------- */
let toastTimer = null;
function showToast(msg, actionLabel, action, ms) {
    const box = document.getElementById("toast");
    box.innerHTML = "";
    box.appendChild(make("span", "", msg));
    if (action) {
        const b = make("button", "toast-act", actionLabel);
        b.type = "button";
        b.addEventListener("click", () => { action(); box.classList.remove("show"); });
        box.appendChild(b);
    }
    box.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove("show"), ms || 5000);
}


/* ---------- 1) التركيز بالشاي (25 دقيقة) ---------- */
let focus = null;                       // { id, end, timer }

function startFocus(id) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    stopFocus(true);
    focus = { id: id, end: Date.now() + FOCUS_SECONDS * 1000, timer: setInterval(tickFocus, 500) };
    tickFocus();
}

function stopFocus(silent) {
    if (focus) clearInterval(focus.timer);
    focus = null;
    if (!silent) renderExtras();
}

function tickFocus() {
    if (!focus) return;
    const left = Math.max(0, Math.round((focus.end - Date.now()) / 1000));
    if (left === 0) {                   // الكوباية خلصت
        const s = loadStats(), today = dayOffset(0);
        s.cups[today] = (s.cups[today] || 0) + 1;
        saveStats(s);
        stopFocus(true);
        showToast("خلصت كوباية تركيز. خد استراحة خمس دقايق.", null, null, 6000);
    }
    renderExtras();
}

function renderFocusPanel() {
    const panel = document.getElementById("focus");
    panel.classList.toggle("on", !!focus);
    if (!focus) return;
    const t = tasks.find(t => t.id === focus.id);
    const left = Math.max(0, Math.round((focus.end - Date.now()) / 1000));
    const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
    document.getElementById("focusTitle").textContent = t ? t.text : "";
    document.getElementById("focusTime").textContent = mm + ":" + ss;
    document.getElementById("focusFill").style.width = ((FOCUS_SECONDS - left) / FOCUS_SECONDS * 100) + "%";
}


/* ---------- 2) اطلب من الجرسون ---------- */
// بيختار مهمة: لو الوقت متأخر أو شربت 3 كوبايات يرشّح خفيفة، غير كده يرشّح اللي محتاجة تركيز
function askWaiter() {
    const pending = tasks.filter(t => !t.done);
    if (!pending.length) { showToast("مفيش حاجة مستنياك. اطلب شاي بس."); return; }

    const cups = loadStats().cups[dayOffset(0)] || 0;
    const tired = new Date().getHours() >= 21 || cups >= 3;
    const want = tired ? "light" : "deep";
    const best = pending.filter(t => (t.effort || "light") === want);
    const pool = best.length ? best : pending;
    const late = pending.filter(t => t.due && new Date(t.due) < new Date());   // اللي فات ميعادها الأول
    const pick = late.length ? late[0] : pool[Math.floor(Math.random() * pool.length)];

    activeFilter = ALL;
    render();
    const li = document.querySelector('.task[data-id="' + pick.id + '"]');
    if (li) {
        li.classList.add("picked");
        li.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => li.classList.remove("picked"), 2600);
    }
    showToast((late.length ? "دي فات ميعادها، ابدأ بيها: " : tired ? "شكلك تعبان، ابدأ بالخفيفة: " : "ابدأ بالأهم: ") + pick.text, null, null, 5000);
}


/* ---------- 6) مستوى المجهود (خفيفة / محتاجة تركيز) ---------- */
function renderEffortPicker() {
    const box = document.getElementById("effortPicker");
    box.innerHTML = "";
    [["light", "خفيفة", "fa-feather"], ["deep", "محتاجة تركيز", "fa-bolt"]].forEach(([id, label, ic]) => {
        const b = make("button", "chip" + (selectedEffort === id ? " on" : ""));
        b.type = "button";
        b.appendChild(icon(ic));
        b.appendChild(make("span", "", label));
        b.addEventListener("click", () => { selectedEffort = id; renderEffortPicker(); });
        box.appendChild(b);
    });
}


/* ---------- 5) الوضع الليلي ---------- */
// الوضع التلقائي: على حسب إعداد الجهاز أو الوقت (ليلي من 6 مساءً لـ 6 صباحًا)
function autoNight() {
    const h = new Date().getHours();
    return window.matchMedia("(prefers-color-scheme: dark)").matches || h >= 18 || h < 6;
}

function applyTheme(night, remember) {
    document.body.classList.toggle("night", night);
    document.getElementById("themeBtn").firstElementChild.className = "fa-solid " + (night ? "fa-sun" : "fa-moon");
    if (remember) { try { localStorage.setItem(THEME_KEY, night ? "night" : "day"); } catch (e) {} }   // بنحفظ بس لو اخترت بإيدك
}


/* ---------- عرض الشريط الصغير (السلسلة + الكوبايات) والتشغيل ---------- */
function renderExtras() {
    const s = loadStats();
    // لو فات يوم من غير شطب السلسلة بتتصفّر
    const alive = s.last === dayOffset(0) || s.last === dayOffset(-1);
    document.getElementById("streakTxt").textContent = alive && s.streak ? "بقالك " + dayWord(s.streak) : "ابدأ سلسلتك";
    document.getElementById("cupsTxt").textContent = (s.cups[dayOffset(0)] || 0) + " كوبايات";
    renderFocusPanel();
}

function initFeatures() {
    document.getElementById("waiterBtn").addEventListener("click", askWaiter);
    document.getElementById("themeBtn").addEventListener("click",
        () => applyTheme(!document.body.classList.contains("night"), true));
    document.getElementById("focusStop").addEventListener("click", () => stopFocus());
    renderEffortPicker();
    const saved = localStorage.getItem(THEME_KEY);
    applyTheme(saved ? saved === "night" : autoNight(), false);
}
