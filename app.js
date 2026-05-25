/**
 * おうちの献立カレンダー - Application Logic (app.js)
 * Implements: Year/Month calendar, LocalStorage sync, Validation rules,
 *             Auto-suggestions, Text Sharing, Shopping List, Export/Import, Cozy Aesthetics
 */

// 1. APPLICATION STATE
let state = {
    currentYear: 2026,
    currentMonth: 4, // 0-indexed: 4 = May
    currentDateKey: '',
    viewMode: 'year', // 'year' or 'month'
    menus: {}, // Key: 'YYYY-MM-DD', Value: { title, type, url, notes }
    shoppingList: [], // Array of { id, text, checked, dateKey }
    sidebarTab: 'share', // 'share' or 'shopping'
    theme: 'light'
};

// Japanese day-of-week helper
const JP_WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTH_NAMES_EN = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// 2. DEMO DATA GENERATOR
function getDemoData() {
    return {
        '2026-05-24': {
            title: 'こだわりデミグラスハンバーグ',
            type: 'dinner',
            url: 'https://cookpad.com/recipe/123456',
            notes: '- 合挽き肉 300g\n- 玉ねぎ 1個\n- 卵 1個\n- パン粉\n※日曜日の特別ディナー！'
        },
        '2026-05-25': {
            title: 'ふっくらサバの塩焼き',
            type: 'dinner',
            url: 'https://park.ajinomoto.co.jp/recipe/card/706592/',
            notes: '- サバの切り身 2枚\n- 大根 1/4本\n- 味噌汁の具（ワカメ、豆腐）'
        },
        '2026-05-26': {
            title: '具だくさん豚汁とおにぎり',
            type: 'dinner',
            url: 'https://www.kurashiru.com/recipes/797a7cb1-97b7-4cbe-b4f0-ec7b4f535398',
            notes: '- 豚バラ肉 150g\n- 大根 1/4本\n- 人参 1/2本\n- こんにゃく\n- ごぼう 1/2本'
        },
        '2026-05-27': {
            title: '和風おろしキノコスパゲティ',
            type: 'dinner',
            url: 'https://recipe.rakuten.co.jp/recipe/1860006764/',
            notes: '- パスタ 200g\n- しめじ 1パック\n- エリンギ 1袋\n- 大根（おろし用）'
        },
        '2026-05-28': {
            title: '我が家の特製チキンカレー',
            type: 'dinner',
            url: 'https://www.sbfoods.co.jp/recipe/detail/01460.html',
            notes: '- 鶏もも肉 300g\n- 玉ねぎ 2個\n- 人参 1本\n- じゃがいも 2個\n- カレールー'
        },
        '2026-05-29': {
            title: 'キャベツと豚肉の回鍋肉炒め',
            type: 'dinner',
            url: 'https://www.mizkan.co.jp/recipe/detail/?menu_id=14972',
            notes: '- 豚こま肉 200g\n- キャベツ 1/4個\n- ピーマン 2個\n- 中華調味料'
        },
        '2026-05-30': {
            title: 'ふわふわ卵のオムライス',
            type: 'lunch',
            url: 'https://www.kagome.co.jp/products/recipe/M10385/',
            notes: '- 卵 4個\n- 鶏もも肉 100g\n- ご飯 2合\n- ケチャップ\n- 玉ねぎ 1/2個'
        }
    };
}

// 3. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadStateFromStorage();
    initEventListeners();
    
    // If no menus exist, load a few demo menus for a beautiful first look
    if (Object.keys(state.menus).length === 0) {
        state.menus = getDemoData();
        saveStateToStorage();
    }
    
    // Set initial display
    updateYearDisplay();
    renderYearView();
    renderMonthView();
    updateRegisteredCount();
    
    // Refresh sidebar text & shopping list based on May 2026 demo data
    generateShareText();
    generateShoppingList();
    
    // Trigger Lucide Icons
    lucide.createIcons();
});

// 4. STORAGE LOGIC
function loadStateFromStorage() {
    const saved = localStorage.getItem('family_menu_planner_data');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.menus = parsed.menus || {};
            state.shoppingList = parsed.shoppingList || [];
            
            // Default to current calendar year/month
            const now = new Date();
            state.currentYear = parsed.currentYear || now.getFullYear();
            state.currentMonth = parsed.currentMonth !== undefined ? parsed.currentMonth : now.getMonth();
        } catch (e) {
            console.error('データの読み込みに失敗しました。', e);
        }
    }
}

function saveStateToStorage() {
    const dataToSave = {
        menus: state.menus,
        shoppingList: state.shoppingList,
        currentYear: state.currentYear,
        currentMonth: state.currentMonth
    };
    localStorage.setItem('family_menu_planner_data', JSON.stringify(dataToSave));
}

// 5. THEME TOGGLE
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        state.theme = 'dark';
        document.documentElement.setAttribute('data-theme', 'dark');
        document.querySelector('.theme-icon-dark').style.display = 'none';
        document.querySelector('.theme-icon-light').style.display = 'block';
    } else {
        state.theme = 'light';
        document.documentElement.setAttribute('data-theme', 'light');
        document.querySelector('.theme-icon-dark').style.display = 'block';
        document.querySelector('.theme-icon-light').style.display = 'none';
    }
}

function toggleTheme() {
    if (state.theme === 'light') {
        state.theme = 'dark';
        document.documentElement.setAttribute('data-theme', 'dark');
        document.querySelector('.theme-icon-dark').style.display = 'none';
        document.querySelector('.theme-icon-light').style.display = 'block';
    } else {
        state.theme = 'light';
        document.documentElement.setAttribute('data-theme', 'light');
        document.querySelector('.theme-icon-dark').style.display = 'block';
        document.querySelector('.theme-icon-light').style.display = 'none';
    }
    localStorage.setItem('theme', state.theme);
}

// 6. EVENT LISTENERS
function initEventListeners() {
    // Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // View Switch Tabs
    const tabYear = document.getElementById('tab-year');
    const tabMonth = document.getElementById('tab-month');
    
    tabYear.addEventListener('click', () => switchViewMode('year'));
    tabMonth.addEventListener('click', () => switchViewMode('month'));
    
    // Year Selector Navigation
    document.getElementById('prev-year').addEventListener('click', () => navigateYear(-1));
    document.getElementById('next-year').addEventListener('click', () => navigateYear(1));
    
    // Month View Navigation
    document.getElementById('month-prev').addEventListener('click', () => navigateMonth(-1));
    document.getElementById('month-next').addEventListener('click', () => navigateMonth(1));
    
    // Quick Add Button
    document.getElementById('quick-add-btn').addEventListener('click', () => {
        // Default to today or first day of current selected month
        const today = new Date();
        let targetDate = today;
        if (today.getFullYear() !== state.currentYear || today.getMonth() !== state.currentMonth) {
            targetDate = new Date(state.currentYear, state.currentMonth, 1);
        }
        openMenuModal(getDateKey(targetDate));
    });
    
    // Modal controls
    document.getElementById('modal-close-btn').addEventListener('click', closeMenuModal);
    document.getElementById('btn-cancel-modal').addEventListener('click', closeMenuModal);
    document.getElementById('btn-delete-menu').addEventListener('click', deleteCurrentMenu);
    document.getElementById('menu-form').addEventListener('submit', saveMenuForm);
    
    // Title input auto-suggestion & validation triggers
    const formTitleInput = document.getElementById('form-title');
    formTitleInput.addEventListener('input', (e) => {
        showSuggestions(e.target.value);
        triggerValidation();
    });
    
    // Close suggestions dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#form-title') && !e.target.closest('#title-suggestions')) {
            document.getElementById('title-suggestions').style.display = 'none';
        }
    });
    
    // URL change tracking for Test URL button
    const formUrlInput = document.getElementById('form-url');
    formUrlInput.addEventListener('input', (e) => {
        const testBtn = document.getElementById('btn-test-url');
        if (e.target.value.trim() && e.target.validity.valid) {
            testBtn.removeAttribute('disabled');
        } else {
            testBtn.setAttribute('disabled', 'true');
        }
    });
    
    document.getElementById('btn-test-url').addEventListener('click', () => {
        const url = formUrlInput.value.trim();
        if (url) window.open(url, '_blank');
    });
    
    // Radio meal types validation trigger
    const mealRadios = document.querySelectorAll('input[name="meal-type"]');
    mealRadios.forEach(radio => {
        radio.addEventListener('change', triggerValidation);
    });
    
    // Sidebar Tabs
    const sideTabShare = document.getElementById('sidebar-tab-share');
    const sideTabShop = document.getElementById('sidebar-tab-shopping');
    
    sideTabShare.addEventListener('click', () => switchSidebarTab('share'));
    sideTabShop.addEventListener('click', () => switchSidebarTab('shopping'));
    
    // Share Range dropdown changes
    document.getElementById('share-range').addEventListener('change', generateShareText);
    document.getElementById('copy-share-btn').addEventListener('click', copyShareText);
    
    // Shopping Range dropdown changes
    document.getElementById('shopping-range').addEventListener('change', generateShoppingList);
    
    // Shopping manual item add
    document.getElementById('shopping-add-item-btn').addEventListener('click', () => {
        const inputRow = document.getElementById('quick-shopping-input-row');
        inputRow.style.display = inputRow.style.display === 'none' ? 'flex' : 'none';
        if (inputRow.style.display === 'flex') {
            document.getElementById('new-shopping-item').focus();
        }
    });
    
    document.getElementById('save-shopping-item-btn').addEventListener('click', addManualShoppingItem);
    document.getElementById('new-shopping-item').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addManualShoppingItem();
    });
    
    // Search function
    document.getElementById('menu-search').addEventListener('input', handleGlobalSearch);
    
    // Data backup trigger
    document.getElementById('data-management-trigger').addEventListener('click', openDataModal);
    document.getElementById('data-modal-close-btn').addEventListener('click', closeDataModal);
    document.getElementById('btn-export-data').addEventListener('click', exportDataJson);
    document.getElementById('btn-load-demo').addEventListener('click', loadDemoDataClick);
    
    // Import file handle
    const fileInput = document.getElementById('import-file-input');
    const fileNameDisplay = document.getElementById('import-file-name');
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
            importDataJson(file);
        } else {
            fileNameDisplay.textContent = '選択されたファイルはありません';
        }
    });
}

// 7. NAVIGATION LOGIC
function switchViewMode(mode) {
    state.viewMode = mode;
    
    const tabYear = document.getElementById('tab-year');
    const tabMonth = document.getElementById('tab-month');
    const secYear = document.getElementById('year-view');
    const secMonth = document.getElementById('month-view');
    
    if (mode === 'year') {
        tabYear.classList.add('active');
        tabMonth.classList.remove('active');
        secYear.classList.add('active');
        secMonth.classList.remove('active');
        renderYearView();
    } else {
        tabYear.classList.remove('active');
        tabMonth.classList.add('active');
        secYear.classList.remove('active');
        secMonth.classList.add('active');
        renderMonthView();
    }
}

function navigateYear(dir) {
    state.currentYear += dir;
    updateYearDisplay();
    if (state.viewMode === 'year') {
        renderYearView();
    } else {
        renderMonthView();
    }
    saveStateToStorage();
}

function navigateMonth(dir) {
    state.currentMonth += dir;
    if (state.currentMonth < 0) {
        state.currentMonth = 11;
        state.currentYear--;
    } else if (state.currentMonth > 11) {
        state.currentMonth = 0;
        state.currentYear++;
    }
    updateYearDisplay();
    renderMonthView();
    generateShareText();
    generateShoppingList();
    saveStateToStorage();
}

function updateYearDisplay() {
    document.getElementById('current-year').textContent = state.currentYear;
    document.getElementById('month-title-display').textContent = `${state.currentYear}年 ${state.currentMonth + 1}月`;
}

function updateRegisteredCount() {
    const count = Object.keys(state.menus).length;
    document.getElementById('registered-count-val').textContent = count;
}

// 8. YEARLY VIEW RENDERER (12 MINI CALENDARS)
function renderYearView() {
    const monthsGrid = document.querySelector('.months-grid');
    monthsGrid.innerHTML = '';
    
    for (let m = 0; m < 12; m++) {
        const card = document.createElement('div');
        card.className = 'month-card animate-fade-in';
        card.style.animationDelay = `${m * 0.03}s`;
        
        // Month Card Header
        const header = document.createElement('div');
        header.className = 'month-card-header';
        
        const title = document.createElement('span');
        title.className = 'month-card-title';
        title.textContent = `${m + 1}月`;
        
        const sub = document.createElement('span');
        sub.className = 'month-card-sub';
        sub.textContent = MONTH_NAMES_EN[m].substring(0, 3);
        
        header.appendChild(title);
        header.appendChild(sub);
        card.appendChild(header);
        
        // Mini Calendar structure
        const miniCal = document.createElement('div');
        miniCal.className = 'mini-calendar';
        
        // Weekdays Header
        const weekdaysRow = document.createElement('div');
        weekdaysRow.className = 'mini-weekdays';
        ['日', '月', '火', '水', '木', '金', '土'].forEach((day, idx) => {
            const span = document.createElement('span');
            span.className = 'mini-weekday';
            if (idx === 0) span.classList.add('sun');
            if (idx === 6) span.classList.add('sat');
            span.textContent = day;
            weekdaysRow.appendChild(span);
        });
        miniCal.appendChild(weekdaysRow);
        
        // Month days math
        const firstDayIdx = new Date(state.currentYear, m, 1).getDay();
        const totalDays = new Date(state.currentYear, m + 1, 0).getDate();
        
        const daysRow = document.createElement('div');
        daysRow.className = 'mini-days';
        
        // Padding from previous month
        for (let p = 0; p < firstDayIdx; p++) {
            const span = document.createElement('span');
            span.className = 'mini-day other-month';
            daysRow.appendChild(span);
        }
        
        // Days
        for (let d = 1; d <= totalDays; d++) {
            const span = document.createElement('span');
            span.className = 'mini-day';
            span.textContent = d;
            
            const dateStr = getDateKey(new Date(state.currentYear, m, d));
            const dayOfWeek = (firstDayIdx + d - 1) % 7;
            
            if (dayOfWeek === 0) span.classList.add('sun');
            if (dayOfWeek === 6) span.classList.add('sat');
            
            // Check if day has meal
            if (state.menus[dateStr]) {
                span.classList.add('has-meal');
            }
            
            daysRow.appendChild(span);
        }
        
        miniCal.appendChild(daysRow);
        card.appendChild(miniCal);
        
        // Double-click or click card to jump to Monthly View
        card.addEventListener('click', () => {
            state.currentMonth = m;
            updateYearDisplay();
            switchViewMode('month');
        });
        
        monthsGrid.appendChild(card);
    }
}

// 9. MONTHLY VIEW RENDERER (LARGE GRID)
function renderMonthView() {
    const daysGrid = document.getElementById('month-days-grid');
    daysGrid.innerHTML = '';
    
    const firstDayIdx = new Date(state.currentYear, state.currentMonth, 1).getDay();
    const totalDays = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    const prevMonthTotal = new Date(state.currentYear, state.currentMonth, 0).getDate();
    
    const today = new Date();
    const todayStr = getDateKey(today);
    
    // 1. Previous Month Padding Cells
    for (let p = firstDayIdx - 1; p >= 0; p--) {
        const dayNum = prevMonthTotal - p;
        const prevMonthDate = new Date(state.currentYear, state.currentMonth - 1, dayNum);
        const cell = createDayCell(prevMonthDate, false, dayNum);
        daysGrid.appendChild(cell);
    }
    
    // 2. Current Month Days Cells
    for (let d = 1; d <= totalDays; d++) {
        const currentDate = new Date(state.currentYear, state.currentMonth, d);
        const cell = createDayCell(currentDate, true, d);
        
        const dateStr = getDateKey(currentDate);
        if (dateStr === todayStr) {
            cell.classList.add('today');
        }
        
        daysGrid.appendChild(cell);
    }
    
    // 3. Next Month Padding Cells
    const totalRendered = firstDayIdx + totalDays;
    const remainingCells = 7 - (totalRendered % 7);
    if (remainingCells < 7) {
        for (let n = 1; n <= remainingCells; n++) {
            const nextMonthDate = new Date(state.currentYear, state.currentMonth + 1, n);
            const cell = createDayCell(nextMonthDate, false, n);
            daysGrid.appendChild(cell);
        }
    }
    
    lucide.createIcons();
}

function createDayCell(date, isCurrentMonth, dayNum) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    
    const dateStr = getDateKey(date);
    cell.dataset.date = dateStr;
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0) cell.classList.add('sun');
    if (dayOfWeek === 6) cell.classList.add('sat');
    if (!isCurrentMonth) cell.classList.add('other-month');
    
    // Day Header
    const header = document.createElement('div');
    header.className = 'day-header';
    
    const numSpan = document.createElement('span');
    numSpan.className = 'day-number';
    numSpan.textContent = dayNum;
    header.appendChild(numSpan);
    
    // Quick Add Button (only visible on hover on current month cells)
    if (isCurrentMonth) {
        const quickAdd = document.createElement('button');
        quickAdd.className = 'day-quick-add';
        quickAdd.innerHTML = '<i data-lucide="plus"></i>';
        quickAdd.title = '献立を追加';
        quickAdd.addEventListener('click', (e) => {
            e.stopPropagation();
            openMenuModal(dateStr);
        });
        header.appendChild(quickAdd);
    }
    cell.appendChild(header);
    
    // Meal Display logic
    const meal = state.menus[dateStr];
    if (meal) {
        cell.classList.add('has-meal');
        
        const content = document.createElement('div');
        content.className = 'day-meal-content';
        
        // Meal Badge & Title Container
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.flexDirection = 'column';
        topRow.style.gap = '4px';
        
        const badge = document.createElement('span');
        badge.className = `meal-badge ${meal.type}`;
        badge.textContent = getMealLabel(meal.type);
        topRow.appendChild(badge);
        
        const title = document.createElement('div');
        title.className = 'meal-title-row';
        title.textContent = meal.title;
        title.title = meal.title;
        topRow.appendChild(title);
        
        content.appendChild(topRow);
        
        // Footer (Recipe link and Edit/Delete action buttons)
        const footer = document.createElement('div');
        footer.className = 'day-cell-footer';
        
        // Recipe external URL Link
        if (meal.url && meal.url.trim()) {
            const link = document.createElement('a');
            link.href = meal.url;
            link.target = '_blank';
            link.className = 'day-recipe-link';
            link.title = 'レシピリンクを開く';
            link.innerHTML = '<i data-lucide="external-link"></i>';
            link.addEventListener('click', (e) => e.stopPropagation()); // prevent opening modal
            footer.appendChild(link);
        } else {
            // spacer
            const spacer = document.createElement('div');
            footer.appendChild(spacer);
        }
        
        // Edit & Delete icons
        const actions = document.createElement('div');
        actions.className = 'day-cell-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'day-action-btn';
        editBtn.innerHTML = '<i data-lucide="edit-3"></i>';
        editBtn.title = '編集する';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openMenuModal(dateStr);
        });
        actions.appendChild(editBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'day-action-btn delete-btn';
        deleteBtn.innerHTML = '<i data-lucide="trash-2"></i>';
        deleteBtn.title = '削除する';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`${formatDateJapanese(dateStr)} の「${meal.title}」を削除してもよろしいですか？`)) {
                deleteMenu(dateStr);
            }
        });
        actions.appendChild(deleteBtn);
        
        footer.appendChild(actions);
        content.appendChild(footer);
        cell.appendChild(content);
        
        // Mobile fallback click event to open modal
        cell.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                openMenuModal(dateStr);
            }
        });
    } else {
        // If empty cell, double click (or tap on mobile) opens the modal
        cell.addEventListener('click', () => {
            if (isCurrentMonth) openMenuModal(dateStr);
        });
    }
    
    return cell;
}

// 10. MODAL HANDLING & VALIDATION
function openMenuModal(dateKey) {
    state.currentDateKey = dateKey;
    
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    document.getElementById('form-date-key').value = dateKey;
    document.getElementById('modal-date-display').textContent = `${year}年${month}月${day}日 (${JP_WEEKDAYS[dayOfWeek]})`;
    
    // Clear previous warnings & inputs
    document.getElementById('form-validation-alerts').style.display = 'none';
    document.getElementById('form-validation-alerts').innerHTML = '';
    document.getElementById('title-suggestions').style.display = 'none';
    
    const meal = state.menus[dateKey];
    const testBtn = document.getElementById('btn-test-url');
    
    if (meal) {
        document.getElementById('modal-title').textContent = '献立を編集';
        document.getElementById('form-title').value = meal.title;
        document.getElementById('form-url').value = meal.url || '';
        document.getElementById('form-notes').value = meal.notes || '';
        
        const radio = document.querySelector(`input[name="meal-type"][value="${meal.type}"]`);
        if (radio) radio.checked = true;
        
        document.getElementById('btn-delete-menu').style.display = 'block';
        
        if (meal.url && meal.url.trim()) {
            testBtn.removeAttribute('disabled');
        } else {
            testBtn.setAttribute('disabled', 'true');
        }
    } else {
        document.getElementById('modal-title').textContent = '献立を登録';
        document.getElementById('form-title').value = '';
        document.getElementById('form-url').value = '';
        document.getElementById('form-notes').value = '';
        
        document.querySelector('input[name="meal-type"][value="dinner"]').checked = true;
        document.getElementById('btn-delete-menu').style.display = 'none';
        testBtn.setAttribute('disabled', 'true');
    }
    
    document.getElementById('menu-modal').classList.add('active');
    document.getElementById('form-title').focus();
    
    triggerValidation();
    lucide.createIcons();
}

function closeMenuModal() {
    document.getElementById('menu-modal').classList.remove('active');
}

// Validation logic adhering to the specific user rules
function validateMenu(dateKey, title) {
    const errors = [];
    if (!title || !title.trim()) return errors;
    
    const cleanTitle = title.trim();
    
    // Rule 1: Hamburgers are Sunday-only!
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 is Sunday
    
    if (cleanTitle.includes('ハンバーグ')) {
        if (dayOfWeek !== 0) {
            errors.push({
                type: 'error',
                message: '🍔 <strong>ハンバーグは日曜日限定です！</strong><br>日曜以外の曜日に登録することはできません（本日: ' + JP_WEEKDAYS[dayOfWeek] + '曜日）。'
            });
        }
    }
    
    // Rule 2: Minimum 1-week interval between the same dish
    for (const [key, menu] of Object.entries(state.menus)) {
        if (key === dateKey) continue; // Skip editing day itself
        
        if (menu.title.trim().toLowerCase() === cleanTitle.toLowerCase()) {
            const diffDays = getDayDifference(dateKey, key);
            if (diffDays < 7) {
                const formattedDate = formatDateJapanese(key);
                errors.push({
                    type: 'error',
                    message: `⚠️ <strong>同一メニューの重複（最低1週間空けてください）</strong><br>「${menu.title}」は過去または未来の1週間以内である <strong>${formattedDate}</strong>（間隔: ${diffDays}日間）にすでに登録されています。メニューの間隔を7日以上あけてください。`
                });
            }
        }
    }
    
    return errors;
}

function triggerValidation() {
    const title = document.getElementById('form-title').value;
    const dateKey = document.getElementById('form-date-key').value;
    const alertBox = document.getElementById('form-validation-alerts');
    const saveBtn = document.getElementById('btn-save-menu');
    
    const errors = validateMenu(dateKey, title);
    
    if (errors.length > 0) {
        alertBox.innerHTML = '';
        errors.forEach(err => {
            const div = document.createElement('div');
            div.className = 'validation-alert-item';
            div.innerHTML = `<i data-lucide="alert-triangle"></i><span>${err.message}</span>`;
            alertBox.appendChild(div);
        });
        alertBox.style.display = 'flex';
        saveBtn.setAttribute('disabled', 'true');
        saveBtn.style.opacity = '0.5';
        saveBtn.style.pointerEvents = 'none';
        lucide.createIcons();
    } else {
        alertBox.style.display = 'none';
        alertBox.innerHTML = '';
        saveBtn.removeAttribute('disabled');
        saveBtn.style.opacity = '1';
        saveBtn.style.pointerEvents = 'auto';
    }
}

// 11. DATA MODAL & BACKUP HANDLERS
function openDataModal() {
    document.getElementById('data-modal').classList.add('active');
}

function closeDataModal() {
    document.getElementById('data-modal').classList.remove('active');
}

function loadDemoDataClick() {
    if (confirm('カレンダーに美味しいデモデータを読み込みますか？※現在のデータはリセットされます。')) {
        state.menus = getDemoData();
        state.shoppingList = [];
        saveStateToStorage();
        updateRegisteredCount();
        renderYearView();
        renderMonthView();
        generateShareText();
        generateShoppingList();
        closeDataModal();
        alert('美味しい1週間分のデモデータを登録しました！日曜日の「こだわりデミグラスハンバーグ」など、家族でお試しください。');
    }
}

function exportDataJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href",     dataStr);
    downloadAnchor.setAttribute("download", `family-menu-data-${state.currentYear}-${state.currentMonth + 1}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importDataJson(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.menus) {
                state.menus = parsed.menus;
                state.shoppingList = parsed.shoppingList || [];
                if (parsed.currentYear) state.currentYear = parsed.currentYear;
                if (parsed.currentMonth !== undefined) state.currentMonth = parsed.currentMonth;
                
                saveStateToStorage();
                updateYearDisplay();
                renderYearView();
                renderMonthView();
                updateRegisteredCount();
                generateShareText();
                generateShoppingList();
                closeDataModal();
                alert('データを正常にインポートしました！');
            } else {
                alert('無効なデータ形式です。おうちの献立カレンダーのバックアップJSONを選択してください。');
            }
        } catch (err) {
            alert('JSONファイルの読み込み中にエラーが発生しました。ファイルが壊れている可能性があります。');
        }
    };
    reader.readAsText(file);
}

// 12. CRUD LOGIC
function saveMenuForm() {
    const dateKey = document.getElementById('form-date-key').value;
    const title = document.getElementById('form-title').value.trim();
    const url = document.getElementById('form-url').value.trim();
    const notes = document.getElementById('form-notes').value.trim();
    const type = document.querySelector('input[name="meal-type"]:checked').value;
    
    // Check validation once again to prevent backend/bypass save
    const errors = validateMenu(dateKey, title);
    if (errors.length > 0) return;
    
    if (!title) return;
    
    // Save to state
    state.menus[dateKey] = { title, type, url, notes };
    
    saveStateToStorage();
    closeMenuModal();
    
    // Re-render
    if (state.viewMode === 'year') {
        renderYearView();
    } else {
        renderMonthView();
    }
    
    updateRegisteredCount();
    generateShareText();
    generateShoppingList();
    
    // Mini visual toast alert
    showToastNotification(`${formatDateJapanese(dateKey)} の献立を保存しました！`);
}

function deleteCurrentMenu() {
    const dateKey = document.getElementById('form-date-key').value;
    const meal = state.menus[dateKey];
    if (meal) {
        if (confirm(`${formatDateJapanese(dateKey)} の「${meal.title}」を削除してもよろしいですか？`)) {
            deleteMenu(dateKey);
            closeMenuModal();
        }
    }
}

function deleteMenu(dateKey) {
    if (state.menus[dateKey]) {
        delete state.menus[dateKey];
        saveStateToStorage();
        
        if (state.viewMode === 'year') {
            renderYearView();
        } else {
            renderMonthView();
        }
        
        updateRegisteredCount();
        generateShareText();
        generateShoppingList();
        showToastNotification(`献立を削除しました。`);
    }
}

// 13. WIDGET LOGIC - FAMILY TEXT SHARING
function switchSidebarTab(tab) {
    state.sidebarTab = tab;
    
    const tabShare = document.getElementById('sidebar-tab-share');
    const tabShop = document.getElementById('sidebar-tab-shopping');
    const panShare = document.getElementById('panel-share');
    const panShop = document.getElementById('panel-shopping');
    
    if (tab === 'share') {
        tabShare.classList.add('active');
        tabShop.classList.remove('active');
        panShare.classList.add('active');
        panShop.classList.remove('active');
        generateShareText();
    } else {
        tabShare.classList.remove('active');
        tabShop.classList.add('active');
        panShare.classList.remove('active');
        panShop.classList.add('active');
        generateShoppingList();
    }
}

function getWeekDates(currentDate) {
    // Finds Monday and Sunday of the current week centered around state.currentYear/state.currentMonth/1st day of month or today
    const day = currentDate.getDay();
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(currentDate.setDate(diff));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d);
    }
    return dates;
}

function generateShareText() {
    const range = document.getElementById('share-range').value;
    const txtOutput = document.getElementById('share-text-output');
    
    let dates = [];
    let headerText = '';
    
    if (range === 'current-week') {
        // Center around the 15th of current selected month or today if we are in today's month
        const today = new Date();
        let centerDate = today;
        if (today.getFullYear() !== state.currentYear || today.getMonth() !== state.currentMonth) {
            centerDate = new Date(state.currentYear, state.currentMonth, 15);
        }
        dates = getWeekDates(centerDate);
        const m1 = dates[0].getMonth() + 1;
        const d1 = dates[0].getDate();
        const m2 = dates[6].getMonth() + 1;
        const d2 = dates[6].getDate();
        headerText = `🏠 今週の献立表 (${m1}/${d1}〜${m2}/${d2})`;
    } else {
        // Full Month
        const totalDays = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
        for (let d = 1; d <= totalDays; d++) {
            dates.push(new Date(state.currentYear, state.currentMonth, d));
        }
        headerText = `🏠 ${state.currentYear}年 ${state.currentMonth + 1}月の献立表`;
    }
    
    let text = `${headerText}\n-------------------------\n`;
    let hasMeals = false;
    
    dates.forEach(d => {
        const dateStr = getDateKey(d);
        const meal = state.menus[dateStr];
        const m = d.getMonth() + 1;
        const dateNum = d.getDate();
        const dayLabel = JP_WEEKDAYS[d.getDay()];
        
        const datePrefix = `${m}/${dateNum}(${dayLabel})`;
        
        if (meal) {
            hasMeals = true;
            let mealText = `${datePrefix} ${getMealLabel(meal.type)}: ${meal.title}`;
            if (meal.title.includes('ハンバーグ')) {
                mealText += ' 🍔 (日曜限定！)';
            }
            if (meal.url) {
                mealText += `\n   🔗 レシピ: ${meal.url}`;
            }
            text += `${mealText}\n`;
        } else {
            // Keep it empty or skip
            if (range === 'current-week') {
                text += `${datePrefix} (未定)\n`;
            }
        }
    });
    
    if (!hasMeals) {
        text += `期間内の献立がまだ登録されていません。\nカレンダーの「＋」から追加してください。`;
    } else {
        text += `\n今週も美味しく食べましょう！✨`;
    }
    
    txtOutput.value = text;
}

function copyShareText() {
    const txtOutput = document.getElementById('share-text-output');
    txtOutput.select();
    txtOutput.setSelectionRange(0, 99999); // for mobile devices
    
    try {
        navigator.clipboard.writeText(txtOutput.value);
        showToastNotification('クリップボードに献立をコピーしました！LINE等に貼り付けて家族とシェアしてください。');
    } catch (err) {
        // fallback
        alert('テキストをコピーできませんでした。恐れ入りますが、手動でコピーしてください。');
    }
}

// 14. WIDGET LOGIC - AUTO SHOPPING LIST
function generateShoppingList() {
    const range = document.getElementById('shopping-range').value;
    const listContainer = document.getElementById('shopping-list-items');
    
    let dates = [];
    if (range === 'current-week') {
        const today = new Date();
        let centerDate = today;
        if (today.getFullYear() !== state.currentYear || today.getMonth() !== state.currentMonth) {
            centerDate = new Date(state.currentYear, state.currentMonth, 15);
        }
        dates = getWeekDates(centerDate);
    } else {
        const totalDays = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
        for (let d = 1; d <= totalDays; d++) {
            dates.push(new Date(state.currentYear, state.currentMonth, d));
        }
    }
    
    // Clear auto-extracted items from previous state, preserving custom items
    // Custom items are those that have custom: true OR are manually added
    let customItems = state.shoppingList.filter(item => item.custom);
    
    // Extract items from notes
    const extractedItems = [];
    dates.forEach(d => {
        const dateStr = getDateKey(d);
        const meal = state.menus[dateStr];
        
        if (meal && meal.notes) {
            const lines = meal.notes.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                // Match items starting with "-" or "*"
                if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                    const text = trimmed.substring(1).trim();
                    if (text) {
                        // Check if item is already added or checked
                        const id = `auto-${dateStr}-${text}`;
                        
                        // Check if this auto item already exists in saved list to preserve checked state
                        const savedItem = state.shoppingList.find(item => item.id === id);
                        extractedItems.push({
                            id: id,
                            text: text,
                            checked: savedItem ? savedItem.checked : false,
                            dateKey: dateStr,
                            custom: false
                        });
                    }
                }
            });
        }
    });
    
    // Combine custom and extracted items
    // Filter out duplicates
    const combined = [...customItems];
    extractedItems.forEach(extracted => {
        if (!combined.some(c => c.id === extracted.id)) {
            combined.push(extracted);
        }
    });
    
    state.shoppingList = combined;
    saveStateToStorage();
    
    // Render list
    listContainer.innerHTML = '';
    
    if (state.shoppingList.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'empty-shopping-state';
        emptyLi.innerHTML = `献立のメモに「- 牛肉 200g」や「- キャベツ」のように入力すると、ここに自動で抽出されます！右上の「＋」から手動で追加することもできます。`;
        listContainer.appendChild(emptyLi);
        return;
    }
    
    state.shoppingList.forEach(item => {
        const li = document.createElement('li');
        li.className = `shopping-item animate-fade-in ${item.checked ? 'checked' : ''}`;
        
        const left = document.createElement('div');
        left.className = 'shopping-item-left';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'shopping-checkbox';
        checkbox.checked = item.checked;
        checkbox.addEventListener('change', () => toggleShoppingItem(item.id));
        
        const span = document.createElement('span');
        span.className = 'shopping-item-text';
        
        // Show meal association details if auto-extracted
        if (item.custom) {
            span.textContent = item.text;
        } else {
            const [y, m, d] = item.dateKey.split('-');
            span.innerHTML = `${item.text} <small style="color:var(--text-muted); font-size:0.65rem;">(${m}/${d} ${state.menus[item.dateKey] ? state.menus[item.dateKey].title : ''})</small>`;
        }
        
        left.appendChild(checkbox);
        left.appendChild(span);
        
        // Wrap click label
        left.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                toggleShoppingItem(item.id);
            }
        });
        
        li.appendChild(left);
        
        // Delete button (mainly for custom items, but can be done for all)
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-shop-btn';
        delBtn.innerHTML = '<i data-lucide="trash-2"></i>';
        delBtn.title = '削除';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteShoppingItem(item.id);
        });
        
        li.appendChild(delBtn);
        listContainer.appendChild(li);
    });
    
    lucide.createIcons();
}

function toggleShoppingItem(id) {
    const item = state.shoppingList.find(i => i.id === id);
    if (item) {
        item.checked = !item.checked;
        saveStateToStorage();
        generateShoppingList();
    }
}

function addManualShoppingItem() {
    const input = document.getElementById('new-shopping-item');
    const text = input.value.trim();
    if (!text) return;
    
    const newItem = {
        id: `custom-${Date.now()}-${text}`,
        text: text,
        checked: false,
        custom: true
    };
    
    state.shoppingList.push(newItem);
    saveStateToStorage();
    input.value = '';
    
    // Hide row
    document.getElementById('quick-shopping-input-row').style.display = 'none';
    
    generateShoppingList();
    showToastNotification('買い物リストにアイテムを追加しました。');
}

function deleteShoppingItem(id) {
    state.shoppingList = state.shoppingList.filter(item => item.id !== id);
    saveStateToStorage();
    generateShoppingList();
}

// 15. GLOBAL SEARCH ENGINE
function handleGlobalSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    
    // If query is empty, restore standard views
    if (!query) {
        renderYearView();
        renderMonthView();
        return;
    }
    
    // Switch to Month view automatically to show search results if not already there
    if (state.viewMode !== 'month') {
        switchViewMode('month');
    }
    
    const cells = document.querySelectorAll('.day-cell');
    cells.forEach(cell => {
        const dateKey = cell.dataset.date;
        if (!dateKey) return;
        
        const meal = state.menus[dateKey];
        let match = false;
        
        if (meal) {
            const titleMatch = meal.title.toLowerCase().includes(query);
            const notesMatch = meal.notes && meal.notes.toLowerCase().includes(query);
            if (titleMatch || notesMatch) {
                match = true;
            }
        }
        
        if (match) {
            cell.style.opacity = '1';
            cell.style.boxShadow = '0 0 12px var(--color-primary)';
            cell.style.backgroundColor = 'var(--color-primary-light)';
        } else {
            cell.style.opacity = '0.35';
            cell.style.boxShadow = 'none';
            cell.style.backgroundColor = 'var(--bg-card-solid)';
        }
    });
}

// 16. UTILITY HELPERS
function getDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getMealLabel(type) {
    switch (type) {
        case 'breakfast': return '朝食';
        case 'lunch': return '昼食';
        case 'dinner': return '夕食';
        case 'snack': return 'おやつ';
        default: return '夕食';
    }
}

function formatDateJapanese(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${m}月${d}日(${JP_WEEKDAYS[date.getDay()]})`;
}

function getDayDifference(dateStr1, dateStr2) {
    const [y1, m1, d1] = dateStr1.split('-').map(Number);
    const [y2, m2, d2] = dateStr2.split('-').map(Number);
    const date1 = new Date(y1, m1 - 1, d1);
    const date2 = new Date(y2, m2 - 1, d2);
    const timeDiff = Math.abs(date2 - date1);
    return Math.round(timeDiff / (1000 * 60 * 60 * 24));
}

// Toast notification toaster creator
function showToastNotification(message) {
    const toast = document.createElement('div');
    toast.className = 'glass animate-slide-up';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.padding = '14px 24px';
    toast.style.zIndex = '2000';
    toast.style.border = '1px solid var(--color-primary)';
    toast.style.borderLeft = '6px solid var(--color-primary)';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = 'var(--shadow-lg)';
    toast.style.color = 'var(--text-primary)';
    toast.style.fontWeight = '600';
    toast.style.fontSize = '0.85rem';
    
    toast.innerHTML = `<span style="display:flex; align-items:center; gap:8px;">🥗 ${message}</span>`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 3200);
}
