/* ==========================================================
   الملف: js/main.js
   الترتيب: 0 إعدادات -> 1 الداتا -> 2 الإضافة -> 3 الشطب
            -> 4 التعديل والحذف -> 5 العرض -> 6 الفلترة -> 7 العداد
   ========================================================== */


/* ==========================================================
   0) الإعدادات: التصنيفات (أي تصنيف جديد بيتضاف من هنا بس)
   كل تصنيف: id للتخزين، اسم للعرض، أيقونة Font Awesome، ولون
   ========================================================== */
const STORAGE_KEY = "ahwa-todo-v2";

const CATEGORIES = [
    { id: "work",   label: "شغل",    icon: "fa-briefcase",      color: "#2f5d8a" },
    { id: "study",  label: "مذاكرة", icon: "fa-graduation-cap", color: "#7b4fa3" },
    { id: "home",   label: "البيت",  icon: "fa-house",          color: "#d9822b" },
    { id: "health", label: "صحة",    icon: "fa-heart-pulse",    color: "#d6455d" },
    { id: "shop",   label: "مشتريات", icon: "fa-cart-shopping", color: "#2f8f6b" },
    { id: "ideas",  label: "أفكار",  icon: "fa-lightbulb",      color: "#b88a00" }
];
const ALL = "all";   // قيمة تاب "الكل"


/* ==========================================================
   1) الداتا: الـ Array + الـ LocalStorage
   كل مهمة = { id, text, cat, done }
   ========================================================== */
let tasks = loadTasks();          // الـ Array الأساسي
let activeFilter = ALL;           // التاب المختار دلوقتي
let selectedCat = CATEGORIES[0].id; // التصنيف المختار في فورم الإضافة
let selectedEffort = "light";      // مستوى مجهود المهمة الجديدة (light / deep)
let editingId = null;             // id المهمة اللي بتتعدل (لو في)

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch (e) {
        return [];                // لو الداتا باظت نبدأ من الأول
    }
}

function saveTasks() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (e) {}
}

// بترجع بيانات التصنيف من الـ id بتاعه
function getCat(id) {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[0];
}

// اختصار لجلب عنصر بالـ id
const $ = id => document.getElementById(id);

// بتعمل عنصر HTML بسرعة (tag + class + نص)
function make(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
}

// بتعمل أيقونة Font Awesome
function icon(name) {
    const i = make("i", "fa-solid " + name);
    i.setAttribute("aria-hidden", "true");
    return i;
}


/* ==========================================================
   2) إضافة مهمة (جزء 1): الـ Input + زرار Add + الـ Array
   ========================================================== */
const input = $("taskInput");
const errBox = $("err");

function addTask() {
    const text = input.value.trim();

    // لو الخانة فاضية منضيفش ونطلع رسالة
    if (!text) {
        errBox.textContent = "اكتب المهمة الأول وبعدين دوس إضافة.";
        input.focus();
        return;
    }
    errBox.textContent = "";

    // المهمة الجديدة بتتحط في أول الـ Array
    tasks.unshift({ id: Date.now(), text: text, cat: selectedCat, effort: selectedEffort, done: false, doneAt: null, subs: [] });

    input.value = "";
    input.focus();
    selectedEffort = "light";
    renderEffortPicker();
    saveTasks();
    render();
}

$("addBtn").addEventListener("click", addTask);
input.addEventListener("keydown", e => { if (e.key === "Enter") addTask(); });


/* ==========================================================
   3) شطب المهمة (جزء 3): بنقلب حالة done وبعدين نرسم من جديد
   ========================================================== */
function toggleTask(id) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;   // وقت الشطب (للحساب والإحصائيات)
    if (t.done) { recordDone(); playClink(); }   // السلسلة + رنة الكوباية
    saveTasks();
    render();
}


/* ==========================================================
   4) التعديل والحذف (جزء 4)
   ========================================================== */
function deleteTask(id, li) {
    li.classList.add("out");                       // حركة الخروج الأول
    setTimeout(() => {
        const idx = tasks.findIndex(t => t.id === id);
        const gone = tasks[idx];                   // بنحتفظ بالمهمة عشان التراجع
        tasks = tasks.filter(t => t.id !== id);    // نشيلها من الـ Array
        saveTasks();                               // نحفظ
        render();                                  // ونمسحها من الشاشة
        showToast("اتمسحت المهمة", "رجّعها", () => {   // تراجع لمدة 5 ثواني
            tasks.splice(idx, 0, gone);
            saveTasks();
            render();
        }, 5000);
    }, 230);
}

function saveEdit(id, value) {
    const text = value.trim();
    const t = tasks.find(t => t.id === id);
    if (t && text) t.text = text;    // لو النص فاضي بنسيب القديم
    editingId = null;                // لازم يتصفّر قبل render (عشان الـ blur)
    saveTasks();
    render();
}

// Event Delegation: ليسنر واحد على القائمة كلها بدل ليسنر لكل مهمة
$("taskList").addEventListener("click", e => {
    const li = e.target.closest(".task");
    if (!li) return;
    const id = Number(li.dataset.id);
    if (handleSubClick(e, id)) return;   // خطوات المهمة (extras.js)

    if (e.target.closest(".check") || e.target.closest(".t-body")) toggleTask(id);
    else if (e.target.closest(".edit")) { editingId = id; render(); }
    else if (e.target.closest(".focus-btn")) startFocus(id);   // تركيز 25 دقيقة
    else if (e.target.closest(".del")) deleteTask(id, li);
});


/* ==========================================================
   5) عرض المهام على الشاشة (جزء 2)
   بناخد الـ Array ونحوّله لعناصر
   ========================================================== */
function renderTasks() {
    const list = $("taskList");
    list.innerHTML = "";

    // بنعرض بس المهام اللي تخص التاب المختار
    const visible = tasks.filter(t => activeFilter === ALL || t.cat === activeFilter);

    if (visible.length === 0) {
        const empty = make("li", "empty");
        empty.appendChild(icon("fa-mug-hot"));
        empty.appendChild(make("span", "",
            tasks.length === 0 ? "مفيش مهام لسه. اكتب أول واحدة وابدأ يومك."
                               : "مفيش مهام في التصنيف ده."));
        list.appendChild(empty);
        return;
    }

    visible.forEach(t => {
        const cat = getCat(t.cat);

        const li = make("li", "task" + (t.done ? " done" : ""));
        li.dataset.id = t.id;
        li.style.setProperty("--c", cat.color);   // لون التصنيف للكارت

        // دايرة الشطب
        const chk = make("button", "check");
        chk.type = "button";
        chk.appendChild(icon("fa-check"));
        chk.setAttribute("aria-label", t.done ? "رجّع المهمة" : "علّم إنها خلصت");
        li.appendChild(chk);

        // لو المهمة في وضع التعديل بنعرض Input بدل النص
        if (t.id === editingId) {
            const ei = make("input", "edit-input");
            ei.value = t.text;
            ei.maxLength = 100;
            ei.addEventListener("keydown", e => {
                if (e.key === "Enter") saveEdit(t.id, ei.value);
                if (e.key === "Escape") { editingId = null; render(); }
            });
            ei.addEventListener("blur", () => { if (editingId === t.id) saveEdit(t.id, ei.value); });
            li.appendChild(ei);
            list.appendChild(li);
            setTimeout(() => { ei.focus(); ei.select(); }, 0);
            return;
        }

        // نص المهمة + تاج التصنيف تحته
        const body = make("div", "t-body");
        body.appendChild(make("span", "t-title", t.text));   // textContent = آمن من الـ HTML
        const tag = make("div", "t-tag");
        tag.appendChild(icon(cat.icon));
        tag.appendChild(make("span", "", cat.label));
        // مستوى المجهود: خفيفة أو محتاجة تركيز
        const eff = make("span", "t-eff");
        eff.appendChild(icon(t.effort === "deep" ? "fa-bolt" : "fa-feather"));
        eff.appendChild(make("span", "", t.effort === "deep" ? "تركيز" : "خفيفة"));
        tag.appendChild(eff);
        body.appendChild(tag);
        li.appendChild(body);

        // زرار التعديل وزرار الحذف
        (t.done ? [] : [["focus-btn", "fa-stopwatch", "ركّز 25 دقيقة على المهمة"],
                         ["sub-add", "fa-list-ul", "أضف خطوة فرعية"]])
            .concat([["edit", "fa-pen", "تعديل"], ["del", "fa-trash", "حذف"]]).forEach(([cls, ic, label]) => {
            const b = make("button", "icon-btn " + cls);
            b.type = "button";
            b.title = label;
            b.setAttribute("aria-label", label);
            b.appendChild(icon(ic));
            li.appendChild(b);
        });

        li.draggable = true;                      // سحب وإفلات للترتيب (extras.js)
        const subsBox = buildSubs(t);             // الخطوات الفرعية
        if (subsBox) li.appendChild(subsBox);
        list.appendChild(li);
    });
}


/* ==========================================================
   6) التصنيفات والفلترة (جزء 6)
   - اختيار تصنيف المهمة الجديدة
   - تابات الفلترة وعدد المهام المتبقية في كل تصنيف
   ========================================================== */
function makeChip(cat, isOn, count) {
    const b = make("button", "chip" + (isOn ? " on" : ""));
    b.type = "button";
    b.style.setProperty("--c", cat.color);
    b.appendChild(icon(cat.icon));
    b.appendChild(make("span", "lbl", cat.label));
    if (count) b.appendChild(make("span", "n", String(count)));
    b.title = cat.label;
    b.setAttribute("aria-label", cat.label + (count ? " (" + count + ")" : ""));
    return b;
}

// اختيار تصنيف المهمة الجديدة (قايمة منسدلة بتتملي مرة واحدة)
function renderPicker() {
    const sel = $("catSelect");
    if (!sel.options.length) {
        CATEGORIES.forEach(cat => sel.add(new Option(cat.label, cat.id)));
        sel.addEventListener("change", () => { selectedCat = sel.value; renderPicker(); });
    }
    sel.value = selectedCat;
    sel.style.setProperty("--c", getCat(selectedCat).color);
}

// خيارات الإضافة بتفتح لما تركّز على الخانة وتقفل لما تسيبها
const adder = $("adder");
const closeAdder = () => setTimeout(() => {
    if (!adder.contains(document.activeElement) && !adder.matches(":hover")) adder.classList.remove("open");
}, 0);
adder.addEventListener("focusin", () => adder.classList.add("open"));
adder.addEventListener("focusout", closeAdder);
adder.addEventListener("mouseleave", closeAdder);

// تابات الفلترة (الكل + كل تصنيف) والرقم = المهام اللي لسه ما خلصتش
function renderTabs() {
    const box = $("tabs");
    box.innerHTML = "";

    const pendingOf = id => tasks.filter(t => !t.done && (id === ALL || t.cat === id)).length;

    const allCat = { id: ALL, label: "الكل", icon: "fa-layer-group", color: "#12303a" };
    [allCat, ...CATEGORIES].forEach(cat => {
        const b = makeChip(cat, cat.id === activeFilter, pendingOf(cat.id));
        b.addEventListener("click", () => {
            activeFilter = cat.id;
            if (cat.id !== ALL) { selectedCat = cat.id; renderPicker(); }   // نفس تصنيف الفلتر
            render();
        });
        box.appendChild(b);
    });
}


/* ==========================================================
   7) العداد ونسبة الإنجاز (جزء 5)
   بيحسب المتبقي والمنجز ويحرّك الشريط والكوباية
   ========================================================== */
function leftText(n) {
    if (n === 1) return "فاضل مهمة واحدة";
    if (n === 2) return "فاضل مهمتين";
    if (n >= 3 && n <= 10) return "فاضل " + n + " مهام";
    return "فاضل " + n + " مهمة";
}

function renderStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const left = total - done;
    const pct = total ? Math.round(done / total * 100) : 0;
    const full = total > 0 && left === 0;

    $("count").textContent = !total ? "الفاتورة فاضية" : full ? "خلصت كله" : leftText(left);
    $("barFill").style.width = pct + "%";
    $("bar").setAttribute("aria-valuenow", pct);
    $("slip").classList.toggle("full", full);
    $("note").textContent = full ? "كله خلص. الشاي عليك المرة دي." : "";

    // الكوباية: الشاي بيعلى من تحت (y=92) لحد فوق (y=28) حسب النسبة
    const h = 64 * pct / 100;
    [["liquid", h], ["liquidTop", Math.min(h + 6, 64)]].forEach(([id, hh]) => {
        const h2 = pct ? hh : 0;
        $(id).setAttribute("height", h2);
        $(id).setAttribute("y", 92 - h2);
    });
}


/* ==========================================================
   8) التاريخ في الهيدر + التشغيل
   ========================================================== */
function renderDate() {
    const hour = new Date().getHours();
    const greet = hour < 12 ? "صباح الفل" : hour < 18 ? "نهارك سعيد" : "مساء الخير";
    const day = new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
    $("dateLine").textContent = greet + "، النهارده " + day;
}

// بترسم كل حاجة من جديد بعد أي تغيير
function render() {
    renderTabs();
    renderTasks();
    renderStats();
    renderExtras();                 // السلسلة والكوبايات وبانل التركيز (features.js)
}

renderDate();
renderPicker();
initFeatures();
initExtras();                     // الوضع الليلي ومستوى المجهود وأزرار المميزات
render();
