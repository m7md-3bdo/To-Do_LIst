/* ==========================================================
   الملف: js/extras.js  (بيتحمّل بعد features.js وقبل main.js)
   4 الحساب  | 5 المهام الفرعية | 6 إحصائيات الأسبوع
   8 صوت الشطب | 10 نسخة احتياطية | 11 السحب والإفلات
   ========================================================== */

const SOUND_KEY = "ahwa-sound";
let soundOn = localStorage.getItem(SOUND_KEY) !== "off";
let addingSubFor = null;        // id المهمة اللي بنضيف لها خطوة دلوقتي

const dayStart = ts => new Date(new Date(ts).setHours(0, 0, 0, 0)).getTime();
const doneOn = day => tasks.filter(t => t.done && t.doneAt && ymd(new Date(t.doneAt)) === day);

// بترجع اسم أكتر تصنيف ظهر في مجموعة مهام
function topCat(list) {
    const c = {};
    list.forEach(t => c[t.cat] = (c[t.cat] || 0) + 1);
    const best = Object.keys(c).sort((a, b) => c[b] - c[a])[0];
    return best ? getCat(best).label : "-";
}


/* ---------- 8) صوت الشطب: رنة كوباية بتتعمل بالكود (مفيش ملف صوت) ---------- */
let audioCtx = null;
function playClink() {
    if (!soundOn) return;
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        [1568, 2349].forEach((f, i) => {
            const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime + i * 0.07;
            o.type = "sine"; o.frequency.value = f;
            g.gain.setValueAtTime(0.18, t0);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);   // الرنة بتخفت بسرعة
            o.connect(g); g.connect(audioCtx.destination);
            o.start(t0); o.stop(t0 + 0.5);
        });
    } catch (e) {}
}


/* ---------- 5) المهام الفرعية ---------- */
// بتبني بلوك الخطوات تحت المهمة (شريط تقدم صغير + الخطوات + Input الإضافة)
function buildSubs(t) {
    const subs = t.subs || [];
    if (!subs.length && addingSubFor !== t.id) return null;
    const box = make("div", "subs");

    if (subs.length) {
        const dn = subs.filter(s => s.d).length;
        const bar = make("div", "bar mini"), fill = make("i");
        fill.style.width = Math.round(dn / subs.length * 100) + "%";
        bar.appendChild(fill);
        box.appendChild(bar);
        subs.forEach((s, i) => {
            const row = make("div", "sub" + (s.d ? " d" : ""));
            row.dataset.i = i;
            const c = make("button", "sub-check"); c.type = "button"; c.appendChild(icon("fa-check"));
            const x = make("button", "sub-del icon-btn"); x.type = "button"; x.appendChild(icon("fa-xmark"));
            row.append(c, make("span", "sub-t", s.t), x);
            box.appendChild(row);
        });
    }
    if (addingSubFor === t.id) {
        const inp = make("input", "sub-input");
        inp.placeholder = "اكتب الخطوة واضغط Enter"; inp.maxLength = 60;
        inp.addEventListener("keydown", e => {
            if (e.key === "Enter" && inp.value.trim()) {
                (t.subs = t.subs || []).push({ t: inp.value.trim(), d: false });
                inp.onblur = null; saveTasks(); render();   // addingSubFor بيفضل عشان تضيف تاني
            }
            if (e.key === "Escape") { inp.onblur = null; addingSubFor = null; render(); }
        });
        inp.onblur = () => { addingSubFor = null; setTimeout(render, 120); };   // لو خرجت من الخانة بتتقفل
        box.appendChild(inp);
        setTimeout(() => inp.focus(), 0);
    }
    return box;
}

// بيتنادى من main.js في أول الـ click: بيرجّع true لو الضغطة تخص الخطوات
function handleSubClick(e, id) {
    const t = tasks.find(t => t.id === id);
    if (!t) return false;
    if (e.target.closest(".sub-add")) { addingSubFor = id; render(); return true; }
    const row = e.target.closest(".sub");
    if (!row) return false;
    const i = Number(row.dataset.i);
    if (e.target.closest(".sub-del")) t.subs.splice(i, 1);
    else t.subs[i].d = !t.subs[i].d;
    saveTasks(); render();
    return true;
}


/* ---------- 11) السحب والإفلات لترتيب المهام ---------- */
function initDnD() {
    const list = document.getElementById("taskList");
    let dragId = null;
    list.addEventListener("dragstart", e => {
        const li = e.target.closest(".task"); if (!li) return;
        dragId = Number(li.dataset.id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(dragId));
        li.classList.add("dragging");
    });
    list.addEventListener("dragover", e => {
        const li = e.target.closest(".task"); if (!li || dragId === null) return;
        e.preventDefault();
        list.querySelectorAll(".over").forEach(x => x.classList.remove("over"));
        li.classList.add("over");
    });
    list.addEventListener("drop", e => {
        const li = e.target.closest(".task"); if (!li || dragId === null) return;
        e.preventDefault();
        const from = tasks.findIndex(t => t.id === dragId);
        const item = tasks.splice(from, 1)[0];
        const to = tasks.findIndex(t => t.id === Number(li.dataset.id));
        tasks.splice(to < 0 ? tasks.length : to, 0, item);   // بنحطها مكان المهمة اللي نزلنا عليها
        dragId = null; saveTasks(); render();
    });
    list.addEventListener("dragend", () => { dragId = null; render(); });
}


/* ---------- 4 + 6) لوحة الحساب وإحصائيات الأسبوع ---------- */
function openPanel(kind) {
    const p = document.getElementById("report");
    const body = document.getElementById("reportBody");
    if (p.dataset.kind === kind && p.classList.contains("on")) { p.classList.remove("on"); return; }
    p.dataset.kind = kind; p.classList.add("on");
    body.innerHTML = "";
    (kind === "bill" ? renderBill : renderWeek)(body);
}

// نص الفاتورة (بيتستخدم للنسخ وللصورة)
function billLines() {
    const today = doneOn(ymd(new Date()));
    const cups = loadStats().cups[ymd(new Date())] || 0;
    const lines = ["حساب النهارده", new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" }), "-----"];
    today.forEach(t => lines.push(t.text + "  (" + getCat(t.cat).label + ")"));
    if (!today.length) lines.push("لسه مفيش حاجة اتشطبت");
    lines.push("-----", "الإجمالي: " + today.length + " مهمة", "أكتر تصنيف: " + topCat(today), "كوبايات التركيز: " + cups);
    return lines;
}

function renderBill(body) {
    const sheet = make("pre", "bill-sheet", billLines().join("\n"));
    const row = make("div", "d-flex gap-2 flex-wrap");
    const copy = make("button", "chip", "انسخ"), img = make("button", "chip", "احفظ صورة");
    copy.type = img.type = "button";
    copy.prepend(icon("fa-copy")); img.prepend(icon("fa-image"));
    copy.onclick = () => {
        const txt = billLines().join("\n");
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).catch(() => {
            const ta = make("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select();
            document.execCommand("copy"); ta.remove();
        }).finally(() => showToast("اتنسخ الحساب"));
    };
    img.onclick = saveBillImage;
    row.append(copy, img);
    body.append(sheet, row);
}

// رسم الفاتورة على canvas وتنزيلها صورة
function saveBillImage() {
    const lines = billLines(), W = 520, H = 120 + lines.length * 38;
    const cv = make("canvas"); cv.width = W; cv.height = H;
    const x = cv.getContext("2d");
    x.fillStyle = "#fbfaf6"; x.fillRect(0, 0, W, H);
    x.direction = "rtl"; x.textAlign = "right"; x.fillStyle = "#12303a";
    lines.forEach((l, i) => {
        x.font = i === 0 ? '700 34px "Aref Ruqaa"' : '500 21px "Marhey"';
        x.fillText(l, W - 36, 70 + i * 38);
    });
    cv.toBlob(b => download(b, "ahwa-bill-" + ymd(new Date()) + ".png"));
}

function renderWeek(body) {
    const days = [...Array(7)].map((_, i) => dayOffset(i - 6));
    const stats = loadStats();
    const counts = days.map(d => doneOn(d).length), max = Math.max(1, ...counts);
    const chart = make("div", "week");
    days.forEach((d, i) => {
        const col = make("div", "w-col");
        const bar = make("div", "w-bar"); bar.style.height = (counts[i] / max * 100) + "%";
        bar.appendChild(make("span", "", String(counts[i])));
        const cups = (stats.cups[d] || 0);
        col.append(bar, make("small", "", new Date(d + "T12:00").toLocaleDateString("ar-EG", { weekday: "short" })),
                   make("small", "w-cups", cups ? cups + " ☕" : ""));
        chart.appendChild(col);
    });
    const weekTasks = days.flatMap(doneOn);
    body.append(chart, make("p", "w-sum",
        "الأسبوع ده: " + weekTasks.length + " مهمة اتشطبت، وأكتر تصنيف: " + topCat(weekTasks)));
}


/* ---------- 10) نسخة احتياطية: تصدير واستيراد JSON ---------- */
function download(blob, name) {
    const a = make("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportData() {
    const data = JSON.stringify({ app: "ahwa-todo", tasks: tasks, stats: loadStats() }, null, 2);
    download(new Blob([data], { type: "application/json" }), "ahwa-backup-" + ymd(new Date()) + ".json");
}

function importData(file) {
    const r = new FileReader();
    r.onload = () => {
        try {
            const d = JSON.parse(r.result);
            if (!Array.isArray(d.tasks)) throw new Error("bad");
            const before = tasks;
            tasks = d.tasks.filter(t => t && t.text).map(t => ({
                id: Number(t.id) || Date.now() + Math.random(), text: String(t.text).slice(0, 100),
                cat: getCat(t.cat).id, effort: t.effort === "deep" ? "deep" : "light",
                done: !!t.done, doneAt: t.doneAt || null,
                subs: Array.isArray(t.subs) ? t.subs.map(s => ({ t: String(s.t), d: !!s.d })) : []
            }));
            if (d.stats) saveStats(d.stats);
            saveTasks(); render();
            showToast("اتستوردت " + tasks.length + " مهمة", "تراجع", () => { tasks = before; saveTasks(); render(); }, 6000);
        } catch (e) { showToast("الملف ده مش نسخة احتياطية صالحة"); }
    };
    r.readAsText(file);
}


/* ---------- التشغيل ---------- */
function initExtras() {
    const $b = id => document.getElementById(id);

    // قائمة الإعدادات: بتتفتح بالترس وتتقفل بالضغط بره أو Esc أو بعد اختيار حاجة
    const menu = $b("menu"), menuBtn = $b("menuBtn");
    const setMenu = open => { menu.hidden = !open; menuBtn.setAttribute("aria-expanded", open); };
    menuBtn.onclick = () => setMenu(menu.hidden);
    menu.addEventListener("click", e => { if (e.target.closest(".menu-item")) setMenu(false); });
    document.addEventListener("click", e => { if (!e.target.closest(".menu-wrap")) setMenu(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

    $b("billBtn").onclick = () => openPanel("bill");
    $b("weekBtn").onclick = () => openPanel("week");
    $b("reportClose").onclick = () => $b("report").classList.remove("on");
    $b("exportBtn").onclick = exportData;
    $b("importBtn").onclick = () => $b("importFile").click();
    $b("importFile").onchange = e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ""; };
    const snd = $b("soundBtn");
    const paint = () => snd.firstElementChild.className = "fa-solid " + (soundOn ? "fa-volume-high" : "fa-volume-xmark");
    snd.onclick = () => { soundOn = !soundOn; localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off"); paint(); playClink(); };
    paint();
    initDnD();
}
