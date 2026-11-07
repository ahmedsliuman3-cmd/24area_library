(function () {
    "use strict";

    /* ========================================================================
       01. UTILITIES - أدوات مساعدة
       ======================================================================== */

    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    const formatCurrency = (n) => {
        const num = Number(n) || 0;
        return num.toLocaleString("ar-EG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }) + " ج.م";
    };

    const formatDate = (d) => {
        if (!d) return "-";
        const date = new Date(d);
        if (isNaN(date)) return d;
        return date.toLocaleDateString("ar-EG");
    };

    const formatTime = (d) => {
        if (!d) return "-";
        const date = new Date(d);
        if (isNaN(date)) return d;
        return date.toLocaleTimeString("ar-EG");
    };

    const todayISO = () => new Date().toISOString().split("T")[0];

    const uid = (prefix = "id") =>
        prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

    const showToast = (message, type = "info") => {
        let container = $("#toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.style.cssText =
                "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);" +
                "z-index:9999;display:flex;flex-direction:column;gap:8px;";
            document.body.appendChild(container);
        }
        const colors = {
            info:    "#0ea5e9",
            success: "#16a34a",
            error:   "#dc2626",
            warning: "#f59e0b",
        };
        const toast = document.createElement("div");
        toast.textContent = message;
        toast.style.cssText =
            background:${colors[type] || colors.info};color:#fff; +
            "padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.2);" +
            "font-family:inherit;font-size:14px;min-width:220px;text-align:center;" +
            "animation:toastIn .3s ease;";
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transition = "opacity .3s";
            setTimeout(() => toast.remove(), 300);
        }, 2600);
    };

    // إضافة animation للـ toast
    if (!document.getElementById("toast-anim-style")) {
        const style = document.createElement("style");
        style.id = "toast-anim-style";
        style.textContent =
            "@keyframes toastIn{from{opacity:0;transform:translateY(20px)}" +
            "to{opacity:1;transform:translateY(0)}}";
        document.head.appendChild(style);
    }
    /* ========================================================================
       02. STORAGE - إدارة التخزين المحلي
       ======================================================================== */

    const DB = {
        keys: {
            users:         "24area_users",
            students:      "24area_students",
            subscriptions: "24area_subscriptions",
            cafeProducts:  "24area_cafe_products",
            stationery:    "24area_stationery",
            sales:         "24area_sales",
            invoices:      "24area_invoices",
            settings:      "24area_settings",
            session:       "24area_session",
        },

        get(key, fallback = []) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch {
                return fallback;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                showToast("تعذر حفظ البيانات", "error");
                return false;
            }
        },

        remove(key) {
            localStorage.removeItem(key);
        },
    };

    // تهيئة البيانات الافتراضية
    const seedDefaults = () => {
        if (!localStorage.getItem(DB.keys.users)) {
            DB.set(DB.keys.users, [
                {
                    id: uid("user"),
                    username: "admin",
                    fullName: "مدير النظام",
                    password: "admin123",
                    role: "admin",
                    status: "active",
                    permissions: [
                        "dashboard", "students", "subscriptions", "cafe",
                        "stationery", "sales", "invoices", "reports",
                        "users", "settings",
                    ],
                },
            ]);
        }
        if (!localStorage.getItem(DB.keys.settings)) {
            DB.set(DB.keys.settings, { theme: "light", language: "ar" });
        }
    };

    /* ========================================================================
       03. THEME & LANGUAGE - الوضع واللغة
       ======================================================================== */

    const Theme = {
        apply(theme) {
            document.documentElement.setAttribute("data-theme", theme);
            const settings = DB.get(DB.keys.settings, {});
            settings.theme = theme;
            DB.set(DB.keys.settings, settings);
        },
        toggle() {
            const current = document.documentElement.getAttribute("data-theme") || "light";
            this.apply(current === "light" ? "dark" : "light");
        },
        init() {
            const settings = DB.get(DB.keys.settings, { theme: "light" });
            this.apply(settings.theme || "light");
        },
    };

    const Language = {
        apply(lang) {
            const html = document.documentElement;
            if (lang === "en") {
                html.setAttribute("lang", "en");
                html.setAttribute("dir", "ltr");
                html.setAttribute("data-lang", "en");
            } else {
                html.setAttribute("lang", "ar");
                html.setAttribute("dir", "rtl");
                html.setAttribute("data-lang", "ar");
            }
            const settings = DB.get(DB.keys.settings, {});
            settings.language = lang;
            DB.set(DB.keys.settings, settings);
        },
        init() {
            const settings = DB.get(DB.keys.settings, { language: "ar" });
            this.apply(settings.language || "ar");
        },
    };

    /* ========================================================================
       04. AUTH - تسجيل الدخول والخروج
       ======================================================================== */
       const Auth = {
        login(username, password) {
            const users = DB.get(DB.keys.users, []);
            const user = users.find(
                (u) => u.username === username && u.password === password && u.status === "active"
            );
            if (!user) return { success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" };
            const session = {
                userId: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                permissions: user.permissions || [],
                loginTime: new Date().toISOString(),
            };
            DB.set(DB.keys.session, session);
            return { success: true, user: session };
        },

        logout() {
            DB.remove(DB.keys.session);
            window.location.href = Auth.basePath() + "index.html";
        },

        current() {
            return DB.get(DB.keys.session, null);
        },

        isAuthenticated() {
            return !!Auth.current();
        },

        requireAuth() {
            if (!Auth.isAuthenticated()) {
                window.location.href = Auth.basePath() + "index.html";
                return false;
            }
            return true;
        },

        basePath() {
            // إذا كنا داخل مجلد pages/ نرجع خطوة للخلف
            return window.location.pathname.includes("/pages/") ? "../" : "";
        },

        updateUserName() {
            const user = Auth.current();
            if (!user) return;
            const nameEl = $("#current-user-name");
            if (nameEl) nameEl.textContent = "مرحبًا، " + user.fullName;
        },
    };

    /* ========================================================================
       05. SIDEBAR - القائمة الجانبية
       ======================================================================== */

    const Sidebar = {
        init() {
            const sidebar = $("#sidebar");
            if (!sidebar) return;

            // زر فتح/إغلاق للسايدبار (يُنشأ ديناميكيًا في Topbar إذا لم يوجد)
            const topbarLeft = $(".topbar-left");
            if (topbarLeft && !$("#sidebar-toggle")) {
                const btn = document.createElement("button");
                btn.id = "sidebar-toggle";
                btn.className = "btn btn-outline btn-sm";
                btn.textContent = "☰";
                btn.style.display = "none";
                btn.addEventListener("click", () => sidebar.classList.toggle("open"));
                topbarLeft.prepend(btn);
            }

            // إظهار الزر على الشاشات الصغيرة
            const media = window.matchMedia("(max-width: 768px)");
            const toggleBtn = $("#sidebar-toggle");
            const updateBtn = () => {
                if (toggleBtn) toggleBtn.style.display = media.matches ? "inline-flex" : "none";
            };
            media.addEventListener("change", updateBtn);
            updateBtn();

            // إغلاق عند النقر خارج السايدبار على الموبايل
            document.addEventListener("click", (e) => {
                if (media.matches && sidebar.classList.contains("open") &&
                    !sidebar.contains(e.target) && e.target !== toggleBtn) {
                    sidebar.classList.remove("open");
                }
            });
        },
    };

    /* ========================================================================
       06. LOGIN PAGE - صفحة الدخول
       ======================================================================== */

    const LoginPage = {
        init() {
            const form = $("#login-form");
            if (!form) return;

            // زر Show/Hide Password
            const toggleBtn = $("#toggle-password-btn");
            const passwordInput = $("#password");
        if (toggleBtn && passwordInput) {
                toggleBtn.addEventListener("click", () => {
                    const isPassword = passwordInput.type === "password";
                    passwordInput.type = isPassword ? "text" : "password";
                    toggleBtn.textContent = isPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور";
                });
            }

            // زر تغيير اللغة
            const langBtn = $("#lang-switch-btn");
            if (langBtn) {
                langBtn.addEventListener("click", () => {
                    const current = document.documentElement.getAttribute("data-lang") || "ar";
                    Language.apply(current === "ar" ? "en" : "ar");
                    langBtn.textContent =
                        current === "ar" ? "العربية / Arabic" : "English / الإنجليزية";
                });
            }

            // إرسال النموذج
            form.addEventListener("submit", (e) => {
                e.preventDefault();
                const username = $("#username").value.trim();
                const password = $("#password").value;
                const errorEl = $("#login-error-message");

                if (!username || !password) {
                    errorEl.textContent = "يرجى إدخال اسم المستخدم وكلمة المرور";
                    errorEl.hidden = false;
                    return;
                }

                const result = Auth.login(username, password);
                if (result.success) {
                    errorEl.hidden = true;
                    showToast("تم تسجيل الدخول بنجاح", "success");
                    setTimeout(() => {
                        window.location.href = "dashboard.html";
                    }, 500);
                } else {
                    errorEl.textContent = result.message;
                    errorEl.hidden = false;
                }
            });
        },
    };

    /* ========================================================================
       07. STUDENTS - إدارة الطلاب
       ======================================================================== */

    const Students = {
        render() {
            const tbody = $("#students-table tbody");
            if (!tbody) return;
            const students = DB.get(DB.keys.students, []);
            const subs = DB.get(DB.keys.subscriptions, []);

            const search = ($("#search-students")?.value || "").toLowerCase();
            const filterStatus = $("#filter-subscription-status")?.value || "";

            const filtered = students.filter((s) => {
                const matchesSearch =
                    !search ||
                    s.name.toLowerCase().includes(search) ||
                    (s.phone && s.phone.includes(search)) ||
                    (s.email && s.email.toLowerCase().includes(search));

                const studentSubs = subs.filter((sub) => sub.studentId === s.id);
                const hasActive = studentSubs.some((sub) => sub.status === "active");
                const status = hasActive ? "active" : (studentSubs.length ? "expired" : "none");
                const matchesStatus = !filterStatus || status === filterStatus;

                return matchesSearch && matchesStatus;
            });

            if (!filtered.length) {
                tbody.innerHTML = "";
                return;
            }

            tbody.innerHTML = filtered.map((s) => {
                const studentSubs = subs.filter((sub) => sub.studentId === s.id);
                const hasActive = studentSubs.some((sub) => sub.status === "active");
                const statusLabel = hasActive ? "نشط" : (studentSubs.length ? "منتهي" : "بدون اشتراك");
                const statusColor = hasActive ? "#16a34a" : (studentSubs.length ? "#f59e0b" : "#94a3b8");
   return 
                    <tr data-id="${s.id}">
                        <td>${s.id.slice(-6)}</td>
                        <td>${s.name}</td>
                        <td>${s.phone || "-"}</td>
                        <td>${s.email || "-"}</td>
                        <td>${formatDate(s.registrationDate)}</td>
                        <td><span style="color:${statusColor};font-weight:600">${statusLabel}</span></td>
                        <td><button class="btn btn-sm btn-warning" data-action="edit">تعديل</button></td>
                        <td><button class="btn btn-sm btn-danger" data-action="delete">حذف</button></td>
                    </tr>
                ;
            }).join("");
        },

        init() {
            const form = $("#add-student-form");
            if (form) {
                // تعيين تاريخ اليوم افتراضيًا
                const dateInput = $("#student-reg-date");
                if (dateInput && !dateInput.value) dateInput.value = todayISO();

                form.addEventListener("submit", (e) => {
                    e.preventDefault();
                    const name = $("#student-name").value.trim();
                    const phone = $("#student-phone").value.trim();
                    const email = $("#student-email").value.trim();
                    const regDate = $("#student-reg-date").value;

                    if (!name || !phone) {
                        showToast("يرجى ملء الحقول المطلوبة", "error");
                        return;
                    }

                    const students = DB.get(DB.keys.students, []);
                    students.push({
                        id: uid("stu"),
                        name, phone, email,
                        registrationDate: regDate || todayISO(),
                    });
                    DB.set(DB.keys.students, students);
                    form.reset();
                    if (dateInput) dateInput.value = todayISO();
                    Students.render();
                    showToast("تم إضافة الطالب بنجاح", "success");
                });
            }

            // البحث
            $("#search-students")?.addEventListener("input", Students.render);
            $("#filter-subscription-status")?.addEventListener("change", Students.render);

            // أزرار تعديل/حذف في الجدول
            const tbody = $("#students-table tbody");
            if (tbody) {
                tbody.addEventListener("click", (e) => {
                    const btn = e.target.closest("button[data-action]");
                    if (!btn) return;
                    const row = btn.closest("tr");
                    const id = row.dataset.id;
                    const action = btn.dataset.action;

                    if (action === "delete") {
                        if (!confirm("هل تريد حذف هذا الطالب؟")) return;
                        let students = DB.get(DB.keys.students, []);
                        students = students.filter((s) => s.id !== id);
                        DB.set(DB.keys.students, students);
                        Students.render();
                        showToast("تم حذف الطالب", "success");
                    } else if (action === "edit") {
                        const students = DB.get(DB.keys.students, []);
                        const s = students.find((x) => x.id === id);
                        if (!s) return;
                        const newName = prompt("اسم الطالب:", s.name);
                        if (newName === null) return;
                        const newPhone = prompt("رقم الهاتف:", s.phone);
                        if (newPhone === null) return;
                        s.name = newName.trim() || s.name;
                        s.phone = newPhone.trim() || s.phone;
                        DB.set(DB.keys.students, students);
                        Students.render();
                        showToast("تم تعديل الطالب", "success");
                    }
                });
            }

            Students.render();
        },
    };
           /* ========================================================================
       08. SUBSCRIPTIONS - إدارة الاشتراكات
       ======================================================================== */

    const Subscriptions = {
        fillStudentsSelect() {
            const sel = $("#subscription-student");
            if (!sel) return;
            const students = DB.get(DB.keys.students, []);
            const current = sel.value;
            sel.innerHTML =
                '<option value="">-- اختر الطالب --</option>' +
                students.map((s) => <option value="${s.id}">${s.name}</option>).join("");
            if (current) sel.value = current;
        },

        render() {
            const tbody = $("#subscriptions-table tbody");
            if (!tbody) return;
            const subs = DB.get(DB.keys.subscriptions, []);
            const students = DB.get(DB.keys.students, []);

            const typeMap = { day: "يوم", week: "أسبوع", month: "شهر" };
            const statusMap = { active: "نشط", expired: "منتهي", cancelled: "ملغي" };

            if (!subs.length) {
                tbody.innerHTML = "";
                return;
            }

            tbody.innerHTML = subs.map((s) => {
                const student = students.find((st) => st.id === s.studentId);
                const studentName = student ? student.name : "—";
                const statusColor =
                    s.status === "active" ? "#16a34a" :
                    s.status === "expired" ? "#f59e0b" : "#dc2626";
                return 
                    <tr data-id="${s.id}">
                        <td>${s.id.slice(-6)}</td>
                        <td>${studentName}</td>
                        <td>${typeMap[s.type] || s.type}</td>
                        <td>${formatDate(s.startDate)}</td>
                        <td>${formatDate(s.endDate)}</td>
                        <td>${formatCurrency(s.price)}</td>
                        <td><span style="color:${statusColor};font-weight:600">${statusMap[s.status] || s.status}</span></td>
                        <td><button class="btn btn-sm btn-warning" data-action="edit">تعديل</button></td>
                        <td><button class="btn btn-sm btn-danger" data-action="delete">حذف</button></td>
                    </tr>
                ;
            }).join("");
        },

        init() {
            const form = $("#add-subscription-form");
            if (!form) return;

            Subscriptions.fillStudentsSelect();

            // Auto-calc end date when type/start changes
            const updateEndDate = () => {
                const type = $("#subscription-type").value;
                const start = $("#subscription-start-date").value;
                if (!type || !start) return;
                const d = new Date(start);
                if (type === "day") d.setDate(d.getDate() + 1);
                if (type === "week") d.setDate(d.getDate() + 7);
                if (type === "month") d.setMonth(d.getMonth() + 1);
                $("#subscription-end-date").value = d.toISOString().split("T")[0];
            };
            $("#subscription-type")?.addEventListener("change", updateEndDate);
            $("#subscription-start-date")?.addEventListener("change", updateEndDate);

            // Set today's date
            const startInput = $("#subscription-start-date");
            if (startInput && !startInput.value) {
                startInput.value = todayISO();
                updateEndDate();
            }

            form.addEventListener("submit", (e) => {
                e.preventDefault();
                const sub = {
                    id: uid("sub"),
                    studentId: $("#subscription-student").value,
                    type: $("#subscription-type").value,
              startDate: $("#subscription-start-date").value,
                    endDate: $("#subscription-end-date").value,
                    price: Number($("#subscription-price").value) || 0,
                    status: $("#subscription-status").value,
                    createdAt: new Date().toISOString(),
                };
                if (!sub.studentId  !sub.type  !sub.startDate || !sub.endDate) {
                    showToast("يرجى ملء جميع الحقول المطلوبة", "error");
                    return;
                }
                const subs = DB.get(DB.keys.subscriptions, []);
                subs.push(sub);
                DB.set(DB.keys.subscriptions, subs);
                form.reset();
                Subscriptions.fillStudentsSelect();
                if (startInput) {
                    startInput.value = todayISO();
                    updateEndDate();
                }
                Subscriptions.render();
                showToast("تم إضافة الاشتراك بنجاح", "success");
            });

            // Table actions
            const tbody = $("#subscriptions-table tbody");
            tbody?.addEventListener("click", (e) => {
                const btn = e.target.closest("button[data-action]");
                if (!btn) return;
                const id = btn.closest("tr").dataset.id;
                const action = btn.dataset.action;

                if (action === "delete") {
                    if (!confirm("هل تريد حذف هذا الاشتراك؟")) return;
                    let subs = DB.get(DB.keys.subscriptions, []);
                    subs = subs.filter((s) => s.id !== id);
                    DB.set(DB.keys.subscriptions, subs);
                    Subscriptions.render();
                    showToast("تم حذف الاشتراك", "success");
                } else if (action === "edit") {
                    const subs = DB.get(DB.keys.subscriptions, []);
                    const s = subs.find((x) => x.id === id);
                    if (!s) return;
                    const newStatus = prompt(
                        "الحالة (active / expired / cancelled):",
                        s.status
                    );
                    if (newStatus === null) return;
                    if (["active", "expired", "cancelled"].includes(newStatus)) {
                        s.status = newStatus;
                        DB.set(DB.keys.subscriptions, subs);
                        Subscriptions.render();
                        showToast("تم تعديل الاشتراك", "success");
                    }
                }
            });

            Subscriptions.render();
        },
    };

    /* ========================================================================
       09. CAFE - إدارة البوفيه
       ======================================================================== */

    const Cafe = {
        renderCategory(category, tableId) {
            const tbody = $(#${tableId} tbody);
            if (!tbody) return;
            const products = DB.get(DB.keys.cafeProducts, [])
                .filter((p) => p.category === category);

            if (!products.length) {
                tbody.innerHTML = "";
                return;
            }

            tbody.innerHTML = products.map((p) => 
                <tr data-id="${p.id}">
                    <td>${p.name}</td>
                    <td>${p.category}</td>
                    <td>${formatCurrency(p.price)}</td>
                    <td>${p.stock}</td>
                    <td>${p.status === "available" ? "متوفر" : "غير متوفر"}</td>
                    <td><button class="btn btn-sm btn-warning" data-action="edit">تعديل</button></td>
                    <td><button class="btn btn-sm btn-danger" data-action="delete">حذف</button></td>
                </tr>
            ).join("");
        },

        render() {
            Cafe.renderCategory("food",         "cafe-food-table");
            Cafe.renderCategory("hot-drinks",   "cafe-hot-drinks-table");
            Cafe.renderCategory("cold-drinks",  "cafe-cold-drinks-table");
        },
          init() {
            const form = $("#add-cafe-product-form");
            if (!form) return;

            form.addEventListener("submit", (e) => {
                e.preventDefault();
                const product = {
                    id: uid("cafe"),
                    name: $("#cafe-product-name").value.trim(),
                    category: $("#cafe-product-category").value,
                    price: Number($("#cafe-product-price").value) || 0,
                    stock: Number($("#cafe-product-stock").value) || 0,
                    status: $("#cafe-product-status").value,
                };
                if (!product.name || !product.category) {
                    showToast("يرجى ملء الحقول المطلوبة", "error");
                    return;
                }
                const list = DB.get(DB.keys.cafeProducts, []);
                list.push(product);
                DB.set(DB.keys.cafeProducts, list);
                form.reset();
                Cafe.render();
                showToast("تم إضافة المنتج بنجاح", "success");
            });

            ["cafe-food-table", "cafe-hot-drinks-table", "cafe-cold-drinks-table"].forEach((tid) => {
                const tbody = $(#${tid} tbody);
                tbody?.addEventListener("click", (e) => {
                    const btn = e.target.closest("button[data-action]");
                    if (!btn) return;
                    const id = btn.closest("tr").dataset.id;
                    const action = btn.dataset.action;
                    let list = DB.get(DB.keys.cafeProducts, []);

                    if (action === "delete") {
                        if (!confirm("هل تريد حذف هذا المنتج؟")) return;
                        list = list.filter((p) => p.id !== id);
                        DB.set(DB.keys.cafeProducts, list);
                        Cafe.render();
                        showToast("تم حذف المنتج", "success");
                    } else if (action === "edit") {
                        const p = list.find((x) => x.id === id);
                        if (!p) return;
                        const newPrice = prompt("السعر:", p.price);
                        if (newPrice === null) return;
                        const newStock = prompt("المخزون:", p.stock);
                        if (newStock === null) return;
                        p.price = Number(newPrice) || p.price;
                        p.stock = Number(newStock) || 0;
                        p.status = p.stock > 0 ? "available" : "out-of-stock";
                        DB.set(DB.keys.cafeProducts, list);
                        Cafe.render();
                        showToast("تم تعديل المنتج", "success");
                    }
                });
            });

            Cafe.render();
        },
    };

    /* ========================================================================
       10. STATIONERY - إدارة القرطاسية
       ======================================================================== */

    const Stationery = {
        render() {
            const tbody = $("#stationery-table tbody");
            if (!tbody) return;
            const products = DB.get(DB.keys.stationery, []);

            if (!products.length) {
                tbody.innerHTML = "";
                return;
            }

            tbody.innerHTML = products.map((p) => 
                <tr data-id="${p.id}">
                    <td>${p.name}</td>
                    <td>${p.category}</td>
                    <td>${formatCurrency(p.price)}</td>
                    <td>${p.stock}</td>
                    <td>${p.status === "available" ? "متوفر" : "غير متوفر"}</td>
                    <td><button class="btn btn-sm btn-warning" data-action="edit">تعديل</button></td>
                    <td><button class="btn btn-sm btn-danger" data-action="delete">حذف</button></td>
                </tr>
            ).join("");
        },

        init() {
            const form = $("#add-stationery-product-form");
            if (!form) return;
              form.addEventListener("submit", (e) => {
                e.preventDefault();
                const product = {
                    id: uid("sta"),
                    name: $("#stationery-product-name").value.trim(),
                    category: $("#stationery-product-category").value.trim(),
                    price: Number($("#stationery-product-price").value) || 0,
                    stock: Number($("#stationery-product-stock").value) || 0,
                    status: $("#stationery-product-status").value,
                };
                if (!product.name || !product.category) {
                    showToast("يرجى ملء الحقول المطلوبة", "error");
                    return;
                }
                const list = DB.get(DB.keys.stationery, []);
                list.push(product);
                DB.set(DB.keys.stationery, list);
                form.reset();
                Stationery.render();
                showToast("تم إضافة المنتج بنجاح", "success");
            });

            const tbody = $("#stationery-table tbody");
            tbody?.addEventListener("click", (e) => {
                const btn = e.target.closest("button[data-action]");
                if (!btn) return;
                const id = btn.closest("tr").dataset.id;
                const action = btn.dataset.action;
                let list = DB.get(DB.keys.stationery, []);

                if (action === "delete") {
                    if (!confirm("هل تريد حذف هذا المنتج؟")) return;
                    list = list.filter((p) => p.id !== id);
                    DB.set(DB.keys.stationery, list);
                    Stationery.render();
                    showToast("تم حذف المنتج", "success");
                } else if (action === "edit") {
                    const p = list.find((x) => x.id === id);
                    if (!p) return;
                    const newPrice = prompt("السعر:", p.price);
                    if (newPrice === null) return;
                    const newStock = prompt("المخزون:", p.stock);
                    if (newStock === null) return;
                    p.price = Number(newPrice) || p.price;
                    p.stock = Number(newStock) || 0;
                    p.status = p.stock > 0 ? "available" : "out-of-stock";
                    DB.set(DB.keys.stationery, list);
                    Stationery.render();
                    showToast("تم تعديل المنتج", "success");
                }
            });

            Stationery.render();
        },
    };

    /* ========================================================================
       11. SALES - إنشاء المبيعات
       ======================================================================== */

    const Sales = {
        fillProducts(department) {
            const sel = $("#sale-product");
            if (!sel) return;
            sel.innerHTML = '<option value="">-- اختر المنتج --</option>';

            if (department === "cafe") {
                DB.get(DB.keys.cafeProducts, []).forEach((p) => {
                    sel.innerHTML += <option value="${p.id}" data-price="${p.price}">${p.name} — ${formatCurrency(p.price)}</option>;
                });
            } else if (department === "stationery") {
                DB.get(DB.keys.stationery, []).forEach((p) => {
                    sel.innerHTML += <option value="${p.id}" data-price="${p.price}">${p.name} — ${formatCurrency(p.price)}</option>;
                });
            } else if (department === "subscription") {
                DB.get(DB.keys.subscriptions, []).forEach((s) => {
                    sel.innerHTML += <option value="${s.id}" data-price="${s.price}">اشتراك ${s.type} — ${formatCurrency(s.price)}</option>;
                });
            }
        },

        recalc() {
        const qty = Number($("#sale-quantity")?.value) || 0;
            const unit = Number($("#sale-unit-price")?.value) || 0;
            const discount = Number($("#sale-discount")?.value) || 0;
            const total = qty * unit;
            const finalTotal = Math.max(0, total - discount);
            if ($("#sale-total")) $("#sale-total").value = total.toFixed(2);
            if ($("#sale-final-total")) $("#sale-final-total").value = finalTotal.toFixed(2);
        },

        init() {
            const form = $("#create-sale-form");
            if (!form) return;

            $("#sale-department")?.addEventListener("change", (e) => {
                Sales.fillProducts(e.target.value);
            });

            $("#sale-product")?.addEventListener("change", (e) => {
                const opt = e.target.selectedOptions[0];
                const price = opt?.dataset?.price || 0;
                if ($("#sale-unit-price")) $("#sale-unit-price").value = price;
                Sales.recalc();
            });

            ["#sale-quantity", "#sale-unit-price", "#sale-discount"].forEach((s) => {
                $(s)?.addEventListener("input", Sales.recalc);
            });

            form.addEventListener("submit", (e) => {
                e.preventDefault();
                const department = $("#sale-department").value;
                const productId = $("#sale-product").value;
                const quantity = Number($("#sale-quantity").value) || 0;
                const unitPrice = Number($("#sale-unit-price").value) || 0;
                const discount = Number($("#sale-discount").value) || 0;
                const paymentMethod = $("#sale-payment-method").value;
                const total = quantity * unitPrice;
                const finalTotal = Math.max(0, total - discount);

                if (!department  !productId  !quantity || !paymentMethod) {
                    showToast("يرجى ملء جميع الحقول المطلوبة", "error");
                    return;
                }

                const productName = $("#sale-product").selectedOptions[0]?.textContent || "";

                const sale = {
                    id: uid("sale"),
                    department, productId, productName,
                    quantity, unitPrice, total, discount, finalTotal,
                    paymentMethod,
                    user: Auth.current()?.fullName || "—",
                    date: new Date().toISOString(),
                };

                const sales = DB.get(DB.keys.sales, []);
                sales.unshift(sale);
                DB.set(DB.keys.sales, sales);

                // إنشاء فاتورة
                const invoices = DB.get(DB.keys.invoices, []);
                invoices.unshift({
                    id: uid("inv"),
                    number: "INV-" + String(invoices.length + 1).padStart(5, "0"),
                    saleId: sale.id,
                    date: sale.date,
                    department, productName,
                    user: sale.user,
                    total, discount, finalTotal,
                    paymentMethod,
                });
                DB.set(DB.keys.invoices, invoices);

                form.reset();
                Sales.recalc();
                showToast("تم إنشاء عملية البيع بنجاح", "success");
            });
        },
    };

    /* ========================================================================
       12. INVOICES - الفواتير
       ======================================================================== */

    const Invoices = {
        render() {
            const tbody = $("#invoices-table tbody");
            if (!tbody) return;
            let invoices = DB.get(DB.keys.invoices, []);

            const search = ($("#invoice-search-input")?.value || "").toLowerCase();
            const date = $("#invoice-date-filter")?.value;
            const dept = $("#invoice-department-filter")?.value;
                invoices = invoices.filter((inv) => {
                const mS = !search || inv.number.toLowerCase().includes(search);
                const mD = !date  (inv.date  "").startsWith(date);
                const mDept = !dept || inv.department === dept;
                return mS && mD && mDept;
            });

            if (!invoices.length) {
                tbody.innerHTML = "";
                return;
            }

            const deptMap = { cafe: "البوفيه", stationery: "القرطاسية", subscription: "الاشتراكات" };

            tbody.innerHTML = invoices.map((inv) => 
                <tr data-id="${inv.id}">
                    <td>${inv.number}</td>
                    <td>${formatDate(inv.date)}</td>
                    <td>${formatTime(inv.date)}</td>
                    <td>${deptMap[inv.department] || inv.department}</td>
                    <td>${inv.user}</td>
                    <td>${formatCurrency(inv.total)}</td>
                    <td>${formatCurrency(inv.discount)}</td>
                    <td>${formatCurrency(inv.finalTotal)}</td>
                    <td><button class="btn btn-sm btn-primary" data-action="view">عرض</button></td>
                    <td><button class="btn btn-sm btn-secondary" data-action="print">طباعة</button></td>
                </tr>
            ).join("");
        },

        view(id) {
            const inv = DB.get(DB.keys.invoices, []).find((x) => x.id === id);
            if (!inv) return;
            const deptMap = { cafe: "البوفيه", stationery: "القرطاسية", subscription: "الاشتراكات" };
            alert(
                رقم الفاتورة: ${inv.number}\n +
                التاريخ: ${formatDate(inv.date)} ${formatTime(inv.date)}\n +
                القسم: ${deptMap[inv.department] || inv.department}\n +
                المنتج: ${inv.productName}\n +
                المستخدم: ${inv.user}\n +
                الإجمالي: ${formatCurrency(inv.total)}\n +
                الخصم: ${formatCurrency(inv.discount)}\n +
                الإجمالي النهائي: ${formatCurrency(inv.finalTotal)}
            );
        },

        init() {
            $("#invoice-search-input")?.addEventListener("input", Invoices.render);
            $("#invoice-date-filter")?.addEventListener("change", Invoices.render);
            $("#invoice-department-filter")?.addEventListener("change", Invoices.render);

            const tbody = $("#invoices-table tbody");
            tbody?.addEventListener("click", (e) => {
                const btn = e.target.closest("button[data-action]");
                if (!btn) return;
                const id = btn.closest("tr").dataset.id;
                if (btn.dataset.action === "view") {
                    Invoices.view(id);
                } else if (btn.dataset.action === "print") {
                    window.print();
                }
            });

            Invoices.render();
        },
    };

    /* ========================================================================
       13. REPORTS - التقارير
       ======================================================================== */

    const Reports = {
        filterByPeriod(items, period, start, end, dateKey = "date") {
            const now = new Date();
            return items.filter((item) => {
                const d = new Date(item[dateKey]);
                if (isNaN(d)) return false;
                if (period === "daily") {
                    return d.toDateString() === now.toDateString();
                }
                if (period === "weekly") {
                    const weekAgo = new Date(now);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return d >= weekAgo && d <= now;
                }
                if (period === "monthly") {
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                         }
                if (period === "custom" && start && end) {
                    return d >= new Date(start) && d <= new Date(end + "T23:59:59");
                }
                return true;
            });
        },

        render() {
            const period = $("#report-period")?.value || "monthly";
            const start = $("#report-start-date")?.value;
            const end = $("#report-end-date")?.value;

            const sales = Reports.filterByPeriod(DB.get(DB.keys.sales, []), period, start, end);
            const subs = DB.get(DB.keys.subscriptions, []);
            const subsFiltered = Reports.filterByPeriod(subs, period, start, end, "startDate");

            const cafeSales = sales
                .filter((s) => s.department === "cafe")
                .reduce((sum, s) => sum + s.finalTotal, 0);
            const staSales = sales
                .filter((s) => s.department === "stationery")
                .reduce((sum, s) => sum + s.finalTotal, 0);
            const subSales = subsFiltered
                .filter((s) => s.status === "active")
                .reduce((sum, s) => sum + s.price, 0);

            const totalSales = cafeSales + staSales + subSales;
            // التكاليف = 60% من المبيعات كتقدير مبدئي (يُعدّل لاحقًا)
            const totalCosts = totalSales * 0.6;
            const netProfit = totalSales - totalCosts;

            const setVal = (id, val) => {
                const el = $(#${id} .stat-value);
                if (el) el.textContent = formatCurrency(val);
            };

            setVal("report-total-sales", totalSales);
            setVal("report-subscription-sales", subSales);
            setVal("report-cafe-sales", cafeSales);
            setVal("report-stationery-sales", staSales);
            setVal("report-total-costs", totalCosts);
            setVal("report-net-profit", netProfit);
        },

        init() {
            if (!$("#report-summary-section")) return;
            $("#report-filter-form")?.addEventListener("submit", (e) => {
                e.preventDefault();
                Reports.render();
            });
            $("#report-period")?.addEventListener("change", Reports.render);
            Reports.render();
        },
    };

    /* ========================================================================
       14. USERS - إدارة المستخدمين
       ======================================================================== */

    const Users = {
        render() {
            const tbody = $("#users-table tbody");
            if (!tbody) return;
            const users = DB.get(DB.keys.users, []);

            tbody.innerHTML = users.map((u) => {
                const roleMap = {
                    admin: "مدير النظام",
                    manager: "مدير",
                    cashier: "كاشير",
                    viewer: "مشاهد",
                };
                const statusColor = u.status === "active" ? "#16a34a" : "#dc2626";
                return 
                    <tr data-id="${u.id}">
                        <td>${u.id.slice(-6)}</td>
                        <td>${u.username}</td>
                        <td>${u.fullName}</td>
                        <td>${roleMap[u.role] || u.role}</td>
                        <td><span style="color:${statusColor};font-weight:600">${u.status === "active" ? "نشط" : "غير نشط"}</span></td>
                        <td><button class="btn btn-sm btn-warning" data-action="edit">تعديل</button></td>
                        <td><button class="btn btn-sm btn-danger" data-action="delete">حذف</button></td>
                        <td><button class="btn btn-sm btn-primary" data-action="password">تغيير</button></td>
                    </tr>
                ;
            }).join("");
        },

        init() {
            const form = $("#add-user-form");
            if (!form) return;
                   form.addEventListener("submit", (e) => {
                e.preventDefault();
                const username = $("#user-username").value.trim();
                const fullName = $("#user-fullname").value.trim();
                const role = $("#user-role").value;
                const status = $("#user-status").value;
                const password = $("#user-password").value;
                const confirm = $("#user-confirm-password").value;

                if (!username  !fullName  !role || !password) {
                    showToast("يرجى ملء جميع الحقول المطلوبة", "error");
                    return;
                }
                if (password !== confirm) {
                    showToast("كلمتا المرور غير متطابقتين", "error");
                    return;
                }

                const users = DB.get(DB.keys.users, []);
                if (users.some((u) => u.username === username)) {
                    showToast("اسم المستخدم مستخدم بالفعل", "error");
                    return;
                }

                const permissions = $$('input[name="permissions[]"]:checked')
                    .map((c) => c.value);

                users.push({
                    id: uid("user"),
                    username, fullName, role, status, password,
                    permissions,
                });
                DB.set(DB.keys.users, users);
                form.reset();
                Users.render();
                showToast("تم إضافة المستخدم بنجاح", "success");
            });

            const tbody = $("#users-table tbody");
            tbody?.addEventListener("click", (e) => {
                const btn = e.target.closest("button[data-action]");
                if (!btn) return;
                const id = btn.closest("tr").dataset.id;
                const action = btn.dataset.action;
                let users = DB.get(DB.keys.users, []);
                const u = users.find((x) => x.id === id);
                if (!u) return;

                if (action === "delete") {
                    if (u.username === "admin") {
                        showToast("لا يمكن حذف مدير النظام الأساسي", "error");
                        return;
                    }
                    if (!confirm("هل تريد حذف هذا المستخدم؟")) return;
                    users = users.filter((x) => x.id !== id);
                    DB.set(DB.keys.users, users);
                    Users.render();
                    showToast("تم حذف المستخدم", "success");
                } else if (action === "edit") {
                    const newName = prompt("الاسم الكامل:", u.fullName);
                    if (newName === null) return;
                    u.fullName = newName.trim() || u.fullName;
                    DB.set(DB.keys.users, users);
                    Users.render();
                    showToast("تم تعديل المستخدم", "success");
                } else if (action === "password") {
                    const newPass = prompt("كلمة المرور الجديدة:");
                    if (!newPass) return;
                    u.password = newPass;
                    DB.set(DB.keys.users, users);
                    showToast("تم تغيير كلمة المرور", "success");
                }
            });

            Users.render();
        },
    };

    /* ========================================================================
       15. SETTINGS - الإعدادات
       ======================================================================== */

    const Settings = {
        init() {
            // Language
            const langForm = $("#language-settings-form");
            if (langForm) {
                const settings = DB.get(DB.keys.settings, {});
                const sel = $("#language-select");
                if (sel) sel.value = settings.language || "ar";

                langForm.addEventListener("submit", (e) => {
                    e.preventDefault();
                    Language.apply($("#language-select").value);
                    showToast("تم حفظ اللغة", "success");
                });
            }
            // Appearance
            const themeForm = $("#appearance-settings-form");
            if (themeForm) {
                const settings = DB.get(DB.keys.settings, {});
                const sel = $("#theme-select");
                if (sel) sel.value = settings.theme || "light";

                themeForm.addEventListener("submit", (e) => {
                    e.preventDefault();
                    Theme.apply($("#theme-select").value);
                    showToast("تم حفظ المظهر", "success");
                });
            }

            // Profile
            const profileForm = $("#profile-settings-form");
            if (profileForm) {
                const user = Auth.current();
                if (user) {
                    $("#profile-fullname").value = user.fullName || "";
                    $("#profile-username").value = user.username || "";
                }
                profileForm.addEventListener("submit", (e) => {
                    e.preventDefault();
                    const newName = $("#profile-fullname").value.trim();
                    const users = DB.get(DB.keys.users, []);
                    const u = users.find((x) => x.id === user.userId);
                    if (u && newName) {
                        u.fullName = newName;
                        DB.set(DB.keys.users, users);
                        const session = Auth.current();
                        session.fullName = newName;
                        DB.set(DB.keys.session, session);
                        Auth.updateUserName();
                        showToast("تم حفظ الملف الشخصي", "success");
                    }
                });
            }

            // Change Password
            const passForm = $("#change-password-form");
            if (passForm) {
                passForm.addEventListener("submit", (e) => {
                    e.preventDefault();
                    const current = $("#current-password").value;
                    const newPass = $("#new-password").value;
                    const confirm = $("#confirm-new-password").value;
                    const session = Auth.current();

                    if (!session) return;
                    if (newPass !== confirm) {
                        showToast("كلمتا المرور غير متطابقتين", "error");
                        return;
                    }
                    const users = DB.get(DB.keys.users, []);
                    const u = users.find((x) => x.id === session.userId);
                    if (!u || u.password !== current) {
                        showToast("كلمة المرور الحالية غير صحيحة", "error");
                        return;
                    }
                    u.password = newPass;
                    DB.set(DB.keys.users, users);
                    passForm.reset();
                    showToast("تم تغيير كلمة المرور بنجاح", "success");
                });
            }
        },
    };

    /* ========================================================================
       16. DASHBOARD - لوحة التحكم
       ======================================================================== */

    const Dashboard = {
        init() {
            if (!document.getElementById("dashboard-content")) return;

            const students = DB.get(DB.keys.students, []);
            const subs = DB.get(DB.keys.subscriptions, []);
            const sales = DB.get(DB.keys.sales, []);

            const activeSubs = subs.filter((s) => s.status === "active");
            const cafeSales = sales
                .filter((s) => s.department === "cafe")
                .reduce((a, b) => a + b.finalTotal, 0);
            const staSales = sales
                .filter((s) => s.department === "stationery")
                .reduce((a, b) => a + b.finalTotal, 0);
            const totalSales = cafeSales + staSales +
                activeSubs.reduce((a, b) => a + b.price, 0);
            const totalCosts = totalSales * 0.6;
            const netProfit = totalSales - totalCosts;
            const setVal = (id, val) => {
                const el = $(#${id} .stat-value);
                if (el) el.textContent = formatCurrency(val);
            };
            const setNum = (id, val) => {
                const el = $(#${id} .stat-value);
                if (el) el.textContent = val;
            };

            setNum("stat-students", students.length);
            setNum("stat-active-subscriptions", activeSubs.length);
            setVal("stat-cafe-sales", cafeSales);
            setVal("stat-stationery-sales", staSales);
            setVal("stat-total-sales", totalSales);
            setVal("stat-total-costs", totalCosts);
            setVal("stat-net-profit", netProfit);
        },
    };

    /* ========================================================================
       17. INIT - التهيئة العامة
       ======================================================================== */

    const App = {
        init() {
            seedDefaults();
            Theme.init();
            Language.init();

            // زر الوضع الداكن السريع (إن وجد)
            const themeToggle = $("#theme-toggle-btn");
            if (themeToggle) {
                themeToggle.addEventListener("click", () => Theme.toggle());
            }

            // صفحة الدخول
            if (document.getElementById("login-page")) {
                LoginPage.init();
                return;
            }

            // باقي الصفحات تتطلب تسجيل دخول
            if (!Auth.requireAuth()) return;

            Auth.updateUserName();
            Sidebar.init();

            // Logout (كل الأزرار)
            $$("#logout-btn-sidebar, #logout-btn-topbar, #logout-btn-settings").forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    e.preventDefault();
                    if (confirm("هل تريد تسجيل الخروج؟")) {
                        Auth.logout();
                    }
                });
            });

            // تهيئة الصفحة حسب وجود عناصرها
            Dashboard.init();
            Students.init();
            Subscriptions.init();
            Cafe.init();
            Stationery.init();
            Sales.init();
            Invoices.init();
            Reports.init();
            Users.init();
            Settings.init();
        },
    };

    // تشغيل بعد تحميل DOM
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", App.init);
    } else {
        App.init();
    }
})();
