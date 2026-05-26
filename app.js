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
    dishLibrary: [], // Array of { id, title, type, url, notes, sundayOnly }
    shoppingList: [], // Array of { id, text, checked, dateKey }
    sidebarTab: 'share', // 'share' or 'shopping'
    theme: 'light'
};

// Firebase global synchronization variables
let firebaseApp = null;
let firebaseDb = null;
let isFirebaseSyncing = false;

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
    initFirebase();
    
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
            state.dishLibrary = parsed.dishLibrary || [];
            
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
        dishLibrary: state.dishLibrary,
        currentYear: state.currentYear,
        currentMonth: state.currentMonth
    };
    localStorage.setItem('family_menu_planner_data', JSON.stringify(dataToSave));
    syncLocalStateToFirebase();
}

// 5. THEME TOGGLE
function initTheme() {
    // Always default to light mode; only switch to dark if explicitly saved
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
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
    const tabLibrary = document.getElementById('tab-library');
    
    tabYear.addEventListener('click', () => switchViewMode('year'));
    tabMonth.addEventListener('click', () => switchViewMode('month'));
    tabLibrary.addEventListener('click', () => switchViewMode('library'));
    
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
    
    // Auto-Gen Buttons in Navigation Bar
    document.getElementById('nav-generate-month').addEventListener('click', generateOneMonthMenusClick);
    document.getElementById('nav-generate-year').addEventListener('click', generateOneYearMenusClick);
    
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
    formTitleInput.addEventListener('focus', (e) => {
        if (e.target.value === '') showSuggestions('');
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
    document.getElementById('btn-generate-year').addEventListener('click', generateOneYearMenusClick);
    document.getElementById('btn-generate-month').addEventListener('click', generateOneMonthMenusClick);
    
    // Library dish modal
    document.getElementById('lib-add-dish-btn').addEventListener('click', () => openLibModal(null));
    document.getElementById('lib-modal-close-btn').addEventListener('click', closeLibModal);
    document.getElementById('btn-cancel-lib').addEventListener('click', closeLibModal);
    document.getElementById('btn-delete-lib').addEventListener('click', deleteCurrentLibDish);
    document.getElementById('lib-form').addEventListener('submit', saveLibForm);
    
    document.getElementById('lib-form-title').addEventListener('input', (e) => {
        if (e.target.value.includes('ハンバーグ')) {
            const sundayRadio = document.querySelector('input[name="lib-day-limit"][value="sunday"]');
            if (sundayRadio) sundayRadio.checked = true;
        }
    });
    
    // Firebase Cloud Sync Controls
    document.getElementById('btn-save-firebase').addEventListener('click', saveFirebaseSettings);
    document.getElementById('btn-disable-firebase').addEventListener('click', disableFirebaseSettings);
    
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
    const tabLibrary = document.getElementById('tab-library');
    const secYear = document.getElementById('year-view');
    const secMonth = document.getElementById('month-view');
    const secLibrary = document.getElementById('library-view');
    
    // Reset all
    [tabYear, tabMonth, tabLibrary].forEach(t => t.classList.remove('active'));
    [secYear, secMonth, secLibrary].forEach(s => s.classList.remove('active'));
    
    if (mode === 'year') {
        tabYear.classList.add('active');
        secYear.classList.add('active');
        renderYearView();
    } else if (mode === 'month') {
        tabMonth.classList.add('active');
        secMonth.classList.add('active');
        renderMonthView();
    } else if (mode === 'library') {
        tabLibrary.classList.add('active');
        secLibrary.classList.add('active');
        renderLibraryView();
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
    const genYearDisp = document.getElementById('generate-year-display');
    if (genYearDisp) genYearDisp.textContent = state.currentYear;
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
    document.body.classList.add('modal-open');
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
    document.body.classList.remove('modal-open');
    document.getElementById('menu-modal').classList.remove('active');
}

// Show suggestions from dish library + recent menus
function showSuggestions(query) {
    const suggestionsBox = document.getElementById('title-suggestions');
    
    // Build candidate list: library dishes first, then recent menus
    const candidates = [];
    
    // 1. From dish library
    state.dishLibrary.forEach(dish => {
        if (!candidates.some(c => c.title === dish.title)) {
            candidates.push({ title: dish.title, type: dish.type, url: dish.url, notes: dish.notes, fromLibrary: true });
        }
    });
    
    // 2. From existing menus (recent ones)
    const recentMenuTitles = Object.values(state.menus)
        .map(m => m.title)
        .filter((t, i, arr) => arr.indexOf(t) === i) // unique
        .slice(-20); // last 20 unique titles
    recentMenuTitles.forEach(title => {
        if (!candidates.some(c => c.title === title)) {
            const sample = Object.values(state.menus).find(m => m.title === title);
            candidates.push({ title, type: sample?.type || 'dinner', url: sample?.url || '', notes: sample?.notes || '', fromLibrary: false });
        }
    });
    
    const filtered = query
        ? candidates.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
        : candidates.slice(0, 8);
    
    if (filtered.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }
    
    suggestionsBox.innerHTML = '';
    filtered.slice(0, 8).forEach(dish => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        
        const icon = dish.fromLibrary ? '📚' : '📅';
        const badge = dish.fromLibrary
            ? `<span class="suggestion-badge lib">料理リスト</span>`
            : `<span class="suggestion-badge recent">最近</span>`;
        
        item.innerHTML = `
            <span class="suggestion-icon">${icon}</span>
            <span class="suggestion-title">${dish.title}</span>
            ${badge}
        `;
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.getElementById('form-title').value = dish.title;
            if (dish.url) document.getElementById('form-url').value = dish.url;
            if (dish.notes) document.getElementById('form-notes').value = dish.notes;
            const radio = document.querySelector(`input[name="meal-type"][value="${dish.type}"]`);
            if (radio) radio.checked = true;
            const testBtn = document.getElementById('btn-test-url');
            if (dish.url && dish.url.trim()) testBtn.removeAttribute('disabled');
            suggestionsBox.style.display = 'none';
            triggerValidation();
        });
        suggestionsBox.appendChild(item);
    });
    
    suggestionsBox.style.display = 'block';
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
    document.body.classList.add('modal-open');
    document.getElementById('data-modal').classList.add('active');
}

// Close and sync when shutting modal
function closeDataModal() {
    document.body.classList.remove('modal-open');
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
    
    // Save to localStorage only (prevents infinite Firebase write-listen loops during real-time sync)
    const dataToSave = {
        menus: state.menus,
        shoppingList: state.shoppingList,
        dishLibrary: state.dishLibrary,
        currentYear: state.currentYear,
        currentMonth: state.currentMonth
    };
    localStorage.setItem('family_menu_planner_data', JSON.stringify(dataToSave));
    
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

// ==========================================================================
// 17.5 DISH LIBRARY MANAGEMENT
// ==========================================================================

function renderLibraryView() {
    const grid = document.getElementById('library-dishes-grid');
    grid.innerHTML = '';
    
    if (state.dishLibrary.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'library-empty-state';
        empty.innerHTML = `
            <div class="empty-icon">🍳</div>
            <h3>料理リストはまだ空です</h3>
            <p>「新しい料理を追加」ボタンからよく作るお隰〜お得意料理を登録してください。登録した料理は自動予測やカレンダー追加時に優先的に使われます。</p>
        `;
        grid.appendChild(empty);
        return;
    }
    
    state.dishLibrary.forEach(dish => {
        const card = document.createElement('div');
        card.className = 'library-dish-card animate-fade-in';
        
        const mealLabel = getMealLabel(dish.type);
        const mealClass = dish.type;
        const isSundayOnly = dish.sundayOnly;
        
        card.innerHTML = `
            <div class="lib-card-header">
                <div class="lib-card-badges">
                    <span class="meal-badge ${mealClass}">${mealLabel}</span>
                    ${isSundayOnly ? '<span class="meal-badge sunday-only">日曜限定</span>' : ''}
                </div>
                <div class="lib-card-actions">
                    <button class="lib-quick-add-btn" title="カレンダーに追加" data-id="${dish.id}">
                        <i data-lucide="calendar-plus"></i>
                    </button>
                    <button class="lib-edit-btn" title="編集" data-id="${dish.id}">
                        <i data-lucide="edit-3"></i>
                    </button>
                </div>
            </div>
            <div class="lib-card-title">${dish.title}</div>
            ${dish.url ? `<a href="${dish.url}" target="_blank" class="lib-card-url" onclick="event.stopPropagation()">
                <i data-lucide="external-link"></i> レシピを見る
            </a>` : '<div class="lib-card-url-empty">レシピURLなし</div>'}
            ${dish.notes ? `<div class="lib-card-notes">${dish.notes.substring(0, 60)}${dish.notes.length > 60 ? '…' : ''}</div>` : ''}
        `;
        
        // Edit button
        card.querySelector('.lib-edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openLibModal(dish.id);
        });
        
        // Quick add to calendar button
        card.querySelector('.lib-quick-add-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            quickAddLibDishToCalendar(dish);
        });
        
        grid.appendChild(card);
    });
    
    lucide.createIcons();
}

function openLibModal(dishId) {
    document.body.classList.add('modal-open');
    const modal = document.getElementById('lib-modal');
    document.getElementById('lib-form-id').value = dishId || '';
    
    if (dishId) {
        const dish = state.dishLibrary.find(d => d.id === dishId);
        if (!dish) return;
        document.getElementById('lib-modal-title').textContent = '料理を編集';
        document.getElementById('lib-form-title').value = dish.title;
        document.getElementById('lib-form-url').value = dish.url || '';
        document.getElementById('lib-form-notes').value = dish.notes || '';
        const radio = document.querySelector(`input[name="lib-meal-type"][value="${dish.type}"]`);
        if (radio) radio.checked = true;
        
        const dayLimitRadio = document.querySelector(`input[name="lib-day-limit"][value="${dish.sundayOnly ? 'sunday' : 'none'}"]`);
        if (dayLimitRadio) dayLimitRadio.checked = true;
        
        document.getElementById('btn-delete-lib').style.display = 'flex';
    } else {
        document.getElementById('lib-modal-title').textContent = '料理リストに登録';
        document.getElementById('lib-form-title').value = '';
        document.getElementById('lib-form-url').value = '';
        document.getElementById('lib-form-notes').value = '';
        document.querySelector('input[name="lib-meal-type"][value="dinner"]').checked = true;
        document.querySelector('input[name="lib-day-limit"][value="none"]').checked = true;
        document.getElementById('btn-delete-lib').style.display = 'none';
    }
    
    modal.classList.add('active');
    document.getElementById('lib-form-title').focus();
    lucide.createIcons();
}

function closeLibModal() {
    document.body.classList.remove('modal-open');
    document.getElementById('lib-modal').classList.remove('active');
}

function saveLibForm() {
    const id = document.getElementById('lib-form-id').value;
    const title = document.getElementById('lib-form-title').value.trim();
    const url = document.getElementById('lib-form-url').value.trim();
    const notes = document.getElementById('lib-form-notes').value.trim();
    const type = document.querySelector('input[name="lib-meal-type"]:checked').value;
    const sundayOnly = document.querySelector('input[name="lib-day-limit"]:checked').value === 'sunday';
    
    if (!title) return;
    
    if (id) {
        // Update existing
        const idx = state.dishLibrary.findIndex(d => d.id === id);
        if (idx !== -1) {
            state.dishLibrary[idx] = { ...state.dishLibrary[idx], title, type, url, notes, sundayOnly };
        }
    } else {
        // Add new
        const newDish = {
            id: `lib-${Date.now()}`,
            title, type, url, notes,
            sundayOnly
        };
        state.dishLibrary.push(newDish);
    }
    
    saveStateToStorage();
    closeLibModal();
    renderLibraryView();
    showToastNotification(`「${title}」を料理リストに登録しました！`);
}

function deleteCurrentLibDish() {
    const id = document.getElementById('lib-form-id').value;
    if (!id) return;
    const dish = state.dishLibrary.find(d => d.id === id);
    if (!dish) return;
    if (confirm(`「${dish.title}」を料理リストから削除しますか？`)) {
        state.dishLibrary = state.dishLibrary.filter(d => d.id !== id);
        saveStateToStorage();
        closeLibModal();
        renderLibraryView();
        showToastNotification('料理をリストから削除しました。');
    }
}

function quickAddLibDishToCalendar(dish) {
    // Switch to month view and open modal pre-filled with dish info
    switchViewMode('month');
    
    // Find next available date in current month
    const today = new Date();
    let targetDate;
    if (today.getFullYear() === state.currentYear && today.getMonth() === state.currentMonth) {
        targetDate = today;
    } else {
        targetDate = new Date(state.currentYear, state.currentMonth, 1);
    }
    
    // Find next day without a menu entry
    const totalDays = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    for (let d = targetDate.getDate(); d <= totalDays; d++) {
        const checkDate = new Date(state.currentYear, state.currentMonth, d);
        const dateKey = getDateKey(checkDate);
        if (!state.menus[dateKey]) {
            // If dish is hamburger-only-Sunday and today is not Sunday, skip to next Sunday
            if (dish.title.includes('ハンバーグ') && checkDate.getDay() !== 0) {
                continue;
            }
            openMenuModal(dateKey);
            // Pre-fill form after modal is open
            setTimeout(() => {
                document.getElementById('form-title').value = dish.title;
                document.getElementById('form-url').value = dish.url || '';
                document.getElementById('form-notes').value = dish.notes || '';
                const radio = document.querySelector(`input[name="meal-type"][value="${dish.type}"]`);
                if (radio) radio.checked = true;
                const testBtn = document.getElementById('btn-test-url');
                if (dish.url) testBtn.removeAttribute('disabled');
                triggerValidation();
                lucide.createIcons();
            }, 50);
            return;
        }
    }
    
    // If no available date, just open the modal for the first day
    const firstKey = getDateKey(new Date(state.currentYear, state.currentMonth, 1));
    openMenuModal(firstKey);
    setTimeout(() => {
        document.getElementById('form-title').value = dish.title;
        document.getElementById('form-url').value = dish.url || '';
        document.getElementById('form-notes').value = dish.notes || '';
        const radio = document.querySelector(`input[name="meal-type"][value="${dish.type}"]`);
        if (radio) radio.checked = true;
        triggerValidation();
    }, 50);
}

// ==========================================================================
// 17.6 1-MONTH AUTO-GENERATOR
// ==========================================================================

function generateOneMonthMenusClick() {
    const year = state.currentYear;
    const month = state.currentMonth;
    const monthLabel = `${year}年${month + 1}月`;
    
    if (confirm(`${monthLabel}の一ザ月分の献立を自動生成しますか？\n\n　ハンバーグは日曜日限定\n　同一メニューは最低7日間隔\n　お気に入り料理リストの料理を優先使用\n\n※${monthLabel}の既存データは上書きされます。`)) {
        generateOneMonthMenus(year, month);
        closeDataModal();
    }
}

function generateOneMonthMenus(year, month) {
    const totalDays = new Date(year, month + 1, 0).getDate();
    const monthMenus = {};
    const recentHistory = []; // track last 7 dishes
    
    // Build dish pool: library dishes take priority
    const libPool = state.dishLibrary.filter(d => !d.title.includes('ハンバーグ'));
    const libHamburgers = state.dishLibrary.filter(d => d.title.includes('ハンバーグ'));
    
    // Merge with default pools (library first)
    const weekdayPool = [
        ...libPool,
        ...WEEKDAY_DISHES.filter(d => !libPool.some(l => l.title === d.title))
    ];
    const hamburgerPool = [
        ...libHamburgers,
        ...SUNDAY_HAMBURGERS.filter(d => !libHamburgers.some(l => l.title === d.title))
    ];
    const sundayPool = [
        ...SUNDAY_SPECIALS
    ];
    
    let burgerIdx = 0;
    let specialIdx = 0;
    
    for (let d = 1; d <= totalDays; d++) {
        const currentDate = new Date(year, month, d);
        const dateKey = getDateKey(currentDate);
        const dayOfWeek = currentDate.getDay();
        
        let chosenDish = null;
        
        if (dayOfWeek === 0) {
            // Sunday: alternate hamburger and special
            const isBurgerSunday = (Math.floor((d + 6) / 7) % 2 === 0);
            if (isBurgerSunday && hamburgerPool.length > 0) {
                for (let i = 0; i < hamburgerPool.length; i++) {
                    const idx = (burgerIdx + i) % hamburgerPool.length;
                    const dish = hamburgerPool[idx];
                    if (!recentHistory.includes(dish.title)) {
                        chosenDish = dish;
                        burgerIdx = (idx + 1) % hamburgerPool.length;
                        break;
                    }
                }
            }
            if (!chosenDish) {
                for (let i = 0; i < sundayPool.length; i++) {
                    const idx = (specialIdx + i) % sundayPool.length;
                    const dish = sundayPool[idx];
                    if (!recentHistory.includes(dish.title)) {
                        chosenDish = dish;
                        specialIdx = (idx + 1) % sundayPool.length;
                        break;
                    }
                }
            }
        }
        
        if (!chosenDish) {
            const startOffset = Math.floor(Math.random() * weekdayPool.length);
            for (let i = 0; i < weekdayPool.length; i++) {
                const idx = (startOffset + i) % weekdayPool.length;
                const dish = weekdayPool[idx];
                if (!recentHistory.includes(dish.title)) {
                    chosenDish = dish;
                    break;
                }
            }
            if (!chosenDish) chosenDish = weekdayPool[0] || WEEKDAY_DISHES[0];
        }
        
        monthMenus[dateKey] = {
            title: chosenDish.title,
            type: chosenDish.type,
            url: chosenDish.url || '',
            notes: chosenDish.notes || ''
        };
        
        recentHistory.push(chosenDish.title);
        if (recentHistory.length > 7) recentHistory.shift();
    }
    
    // Clear existing month data
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    for (const key of Object.keys(state.menus)) {
        if (key.startsWith(monthPrefix)) delete state.menus[key];
    }
    
    state.menus = { ...state.menus, ...monthMenus };
    state.shoppingList = [];
    saveStateToStorage();
    updateRegisteredCount();
    
    if (state.viewMode === 'year') renderYearView();
    else renderMonthView();
    
    generateShareText();
    generateShoppingList();
    
    const monthLabel = `${year}年${month + 1}月`;
    showToastNotification(`${monthLabel}（${totalDays}日分）の献立を自動生成しました！🥗`);
}

// ==========================================================================
// 17. 1-YEAR AUTO-GENERATOR CONSTRAINT SOLVER
// ==========================================================================

const SUNDAY_HAMBURGERS = [
    { title: 'こだわりデミグラスハンバーグ', type: 'dinner', url: 'https://cookpad.com/recipe/123456', notes: '- 合挽き肉 300g\n- 玉ねぎ 1個\n- 卵 1個\n- パン粉\n※日曜日の特別ディナー！' },
    { title: '和風おろしハンバーグ', type: 'dinner', url: 'https://www.kurashiru.com/recipes/b94a821e-cde9-4828-963d-4c3e8be8eeaa', notes: '- 合挽き肉 300g\n- 大根 1/4本\n- 大葉 4枚\n- ポン酢\n※さっぱり和風の特製ハンバーグ！' },
    { title: 'とろけるチーズインハンバーグ', type: 'dinner', url: 'https://www.kurashiru.com/recipes/1be7cfb1-97b7-4cbe-b4f0-ec7b4f535398', notes: '- 合挽き肉 300g\n- とろけるチーズ 4枚\n- 玉ねぎ 1個\n- 卵 1個\n※中から溢れ出す濃厚チーズ！' },
    { title: '本格デミ煮込みハンバーグ', type: 'dinner', url: 'https://www.kurashiru.com/recipes/797a7cb1-97b7-4cbe-b4f0-ec7b4f535398', notes: '- 合挽き肉 300g\n- 玉ねぎ 1個\n- しめじ 1/2パック\n- デミグラスソース缶\n※コトコト煮込んだジューシー仕上げ！' }
];

const SUNDAY_SPECIALS = [
    { title: 'お家で贅沢すき焼き丼', type: 'dinner', url: 'https://www.kurashiru.com/recipes/a6c6e036-7ee6-4e5b-b9d9-bb59146fde8c', notes: '- 牛薄切り肉 250g\n- 白ねぎ 1本\n- 焼き豆腐 1/2丁\n- しらたき\n- 卵\n※休日の団らんすき焼き！' },
    { title: '特製海鮮ちらし寿司', type: 'dinner', url: 'https://www.kurashiru.com/recipes/ff3fcdb2-8ad6-407e-9081-39fae61bd680', notes: '- 寿司飯 2合\n- マグロ、サーモン 刺身\n- いくら\n- 錦糸卵\n※彩り豊かな手作りちらし！' },
    { title: '鉄板プレートお好み焼き', type: 'dinner', url: 'https://www.kurashiru.com/recipes/76a6b571-0818-4bf8-befc-fccae5e69e47', notes: '- お好み焼き粉\n- キャベツ 1/2個\n- 豚バラ肉 150g\n- 天かす\n- 紅生姜' },
    { title: '本格おうち手作りピザ', type: 'dinner', url: 'https://www.kurashiru.com/recipes/5021e102-39c2-4809-a1b1-28565a0b731e', notes: '- ピザクラスト 2枚\n- ピザソース\n- ベーコン 4枚\n- ミニトマト 4個\n- ピーマン 1個\n- チーズ' }
];

const WEEKDAY_DISHES = [
    { title: '豚の生姜焼き定食', type: 'dinner', url: 'https://park.ajinomoto.co.jp/recipe/card/703125/', notes: '- 豚薄切り肉 200g\n- 玉ねぎ 1/2個\n- キャベツ\n- 生姜' },
    { title: 'ジューシーとり唐揚げ', type: 'dinner', url: 'https://www.kurashiru.com/recipes/d68bfb84-6019-4824-814d-fa7d53ce5270', notes: '- 鶏もも肉 2枚\n- 片栗粉\n- レモン\n- キャベツ' },
    { title: 'ぶりの照り焼き', type: 'dinner', url: 'https://www.kurashiru.com/recipes/cc612a44-dfa0-47de-8bde-7d9be7bd65f2', notes: '- ぶり切れ身 2枚\n- ししとう 4本\n- 生姜' },
    { title: 'ふっくらサバの塩焼き', type: 'dinner', url: 'https://park.ajinomoto.co.jp/recipe/card/706592/', notes: '- サバ切り身 2枚\n- 大根 1/4本\n- 味噌汁の具' },
    { title: 'ふわふわ卵のオムライス', type: 'lunch', url: 'https://www.kagome.co.jp/products/recipe/M10385/', notes: '- 鶏もも肉 100g\n- 玉ねぎ 1/2個\n- 卵 4個\n- ケチャップ' },
    { title: '特製チキンカレー', type: 'dinner', url: 'https://www.sbfoods.co.jp/recipe/detail/01460.html', notes: '- 鶏もも肉 300g\n- 玉ねぎ 2個\n- じゃがいも 2個\n- カレールー' },
    { title: '和風おろしきのこパスタ', type: 'dinner', url: 'https://recipe.rakuten.co.jp/recipe/1860006764/', notes: '- スパゲティ 200g\n- しめじ 1パック\n- エリンギ 1袋\n- 大根おろし' },
    { title: '具だくさん豚汁定食', type: 'dinner', url: 'https://www.kurashiru.com/recipes/797a7cb1-97b7-4cbe-b4f0-ec7b4f535398', notes: '- 豚バラ肉 150g\n- 大根 1/4本\n- 人参 1/2本\n- ごぼう 1/2本' },
    { title: 'とろ〜り親子丼', type: 'dinner', url: 'https://www.mizkan.co.jp/recipe/detail/?menu_id=14972', notes: '- 鶏もも肉 200g\n- 卵 3個\n- 三つ葉\n- 玉ねぎ 1/2個' },
    { title: '本格麻婆豆腐定食', type: 'dinner', url: 'https://www.kurashiru.com/recipes/ff3fcdb2-8ad6-407e-9081-39fae61bd670', notes: '- 木綿豆腐 1丁\n- 豚ひき肉 150g\n- 長ねぎ 1/2本\n- 豆板醤' },
    { title: '回鍋肉（ホイコーロー）', type: 'dinner', url: 'https://park.ajinomoto.co.jp/recipe/card/701103/', notes: '- 豚バラ薄切り肉 200g\n- キャベツ 1/4個\n- ピーマン 2個\n- 甜麺醤' },
    { title: '鮭のバターホイル焼き', type: 'dinner', url: 'https://www.kurashiru.com/recipes/76a6b571-0818-4bf8-befc-fccae5e69e46', notes: '- 生鮭切れ身 2枚\n- しめじ 1/2パック\n- 玉ねぎ 1/4個\n- バターン 20g' },
    { title: '手作り焼き餃子定食', type: 'dinner', url: 'https://www.kurashiru.com/recipes/5021e102-39c2-4809-a1b1-28565a0b731d', notes: '- 豚ひき肉 200g\n- キャベツ 2枚\n- ニラ 1/2袋\n- 餃子の皮 30枚' },
    { title: 'さっぱり冷やし中華', type: 'lunch', url: 'https://www.mizkan.co.jp/recipe/detail/?menu_id=10202', notes: '- 冷やし中華麺 2食\n- きゅうり 1/2本\n- ハム 4枚\n- 錦糸卵' },
    { title: 'あつあつエビグラタン', type: 'dinner', url: 'https://www.kurashiru.com/recipes/cfb86ea6-2187-43ca-a386-3507fa759080', notes: '- むきエビ 100g\n- マカロニ 80g\n- 玉ねぎ 1/2個\n- ホワイトソース缶' },
    { title: 'とろけるハヤシライス', type: 'dinner', url: 'https://www.sbfoods.co.jp/recipe/detail/02396.html', notes: '- 牛薄切り肉 200g\n- 玉ねぎ 1個\n- マッシュルーム 1パック\n- ハヤシルー' },
    { title: '牛肉スタミナ炒め定食', type: 'dinner', url: 'https://www.kurashiru.com/recipes/cc4e410b-eead-4cf5-8025-a131804f35e9', notes: '- 牛こま切れ肉 200g\n- ニラ 1袋\n- もやし 1袋\n- ニンニク' },
    { title: '白身魚のサクサクフライ', type: 'dinner', url: 'https://www.kurashiru.com/recipes/85055b85-5b4d-4cb0-bc78-75c1d35508a8', notes: '- 白身魚切り身 2切れ\n- 小麦粉、パン粉\n- タルタルソース\n- キャベツ' },
    { title: '本格チンジャオロース', type: 'dinner', url: 'https://park.ajinomoto.co.jp/recipe/card/701099/', notes: '- 豚肩ロース肉 200g\n- ピーマン 4個\n- たけのこ水煮 100g\n- オイスターソース' },
    { title: '鶏肉とカシューナッツ炒め', type: 'dinner', url: 'https://www.kurashiru.com/recipes/20a6e036-7ee6-4e5b-b9d9-bb59146fde8c', notes: '- 鶏もも肉 200g\n- カシューナッツ 50g\n- ピーマン 2個\n- 玉ねぎ 1/2個' },
    { title: 'おうちビビンバ丼', type: 'dinner', url: 'https://www.kurashiru.com/recipes/10f76985-7036-4fc6-b7ff-378873eb8b22', notes: '- 牛ひき肉 150g\n- ほうれん草 1/2袋\n- もやし 1/2袋\n- キムチ\n- コチュジャン' },
    { title: 'ぷりぷりエビチリ定食', type: 'dinner', url: 'https://park.ajinomoto.co.jp/recipe/card/700810/', notes: '- むきエビ 180g\n- 白ねぎ 1/2本\n- 生姜、ニンニク\n- チリソース' },
    { title: '和風ポークソテー', type: 'dinner', url: 'https://www.kurashiru.com/recipes/ff3bc3b3-85bb-4c28-98e6-1216aeb7ef5c', notes: '- 豚ロース厚切り肉 2枚\n- しめじ 1/2パック\n- ポン酢' },
    { title: '彩りタコライス', type: 'lunch', url: 'https://www.kurashiru.com/recipes/b0e5ee05-64ad-4c5e-aa78-0cf7df57cf89', notes: '- 合挽き肉 150g\n- レタス 2枚\n- トマト 1/2個\n- チーズ\n- チリパウダー' },
    { title: 'あっさり冷やしきつねうどん', type: 'lunch', url: 'https://www.kurashiru.com/recipes/d0e5ee05-64ad-4c5e-aa78-0cf7df57cf89', notes: '- うどん生麺 2玉\n- 油揚げ 2枚\n- かまぼこ 4切れ\n- ねぎ' }
];

function generateOneYearMenusClick() {
    if (confirm(`${state.currentYear}年の365日分の献立を自動生成しますか？\n\n【ルール】\n・ハンバーグは日曜日限定\n・同一メニューは最低1週間（7日間）空ける\n・すべての献立にレシピURLとお買い物用の食材リストがセットされます。\n\n※現在登録されている${state.currentYear}年の既存データはすべて上書きされます。よろしければOKを押してください。`)) {
        generateOneYearMenus(state.currentYear);
    }
}

function generateOneYearMenus(year) {
    const yearMenus = {};
    const recentHistory = []; // Keeps track of last 7 unique dish titles
    
    // Total days in that year
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const totalDays = isLeap ? 366 : 365;
    
    // Build priority pools from dish library
    const libPool = state.dishLibrary.filter(d => !d.title.includes('ハンバーグ'));
    const libHamburgers = state.dishLibrary.filter(d => d.title.includes('ハンバーグ'));
    
    const weekdayPool = [
        ...libPool,
        ...WEEKDAY_DISHES.filter(d => !libPool.some(l => l.title === d.title))
    ];
    const hamburgerPool = [
        ...libHamburgers,
        ...SUNDAY_HAMBURGERS.filter(d => !libHamburgers.some(l => l.title === d.title))
    ];
    
    let burgerIndex = 0;
    let specialIndex = 0;
    
    for (let d = 1; d <= totalDays; d++) {
        const currentDate = new Date(year, 0, d);
        const dateKey = getDateKey(currentDate);
        const dayOfWeek = currentDate.getDay(); // 0 is Sunday
        
        let chosenDish = null;
        
        if (dayOfWeek === 0) {
            // Sunday
            // Alternate Sunday Hamburgers and Sunday Specials to give dynamic variety
            const isBurgerSunday = (Math.floor(d / 7) % 2 === 0);
            
            if (isBurgerSunday) {
                // Find a Hamburger variant not used in last 7 days
                for (let i = 0; i < hamburgerPool.length; i++) {
                    const idx = (burgerIndex + i) % hamburgerPool.length;
                    const dish = hamburgerPool[idx];
                    if (!recentHistory.includes(dish.title)) {
                        chosenDish = dish;
                        burgerIndex = (idx + 1) % hamburgerPool.length;
                        break;
                    }
                }
            }
            
            // Fallback or non-burger Sunday
            if (!chosenDish) {
                for (let i = 0; i < SUNDAY_SPECIALS.length; i++) {
                    const idx = (specialIndex + i) % SUNDAY_SPECIALS.length;
                    const dish = SUNDAY_SPECIALS[idx];
                    if (!recentHistory.includes(dish.title)) {
                        chosenDish = dish;
                        specialIndex = (idx + 1) % SUNDAY_SPECIALS.length;
                        break;
                    }
                }
            }
        }
        
        // Weekday or Fallback
        if (!chosenDish) {
            const startOffset = Math.floor(Math.random() * weekdayPool.length);
            for (let i = 0; i < weekdayPool.length; i++) {
                const idx = (startOffset + i) % weekdayPool.length;
                const dish = weekdayPool[idx];
                if (!recentHistory.includes(dish.title)) {
                    chosenDish = dish;
                    break;
                }
            }
            
            // Ultimate fallback (safety first)
            if (!chosenDish) {
                chosenDish = weekdayPool[0] || WEEKDAY_DISHES[0];
            }
        }
        
        // Assign to menus object
        yearMenus[dateKey] = {
            title: chosenDish.title,
            type: chosenDish.type,
            url: chosenDish.url || '',
            notes: chosenDish.notes || ''
        };
        
        // Maintain history (max 7 items to enforce 7-day separation)
        recentHistory.push(chosenDish.title);
        if (recentHistory.length > 7) {
            recentHistory.shift(); // Remove oldest
        }
    }
    
    // Clear out current year's keys first from state.menus
    for (const key of Object.keys(state.menus)) {
        if (key.startsWith(`${year}-`)) {
            delete state.menus[key];
        }
    }
    
    // Merge new menus
    state.menus = { ...state.menus, ...yearMenus };
    state.shoppingList = []; // Clear shopping list to re-extract
    
    saveStateToStorage();
    updateRegisteredCount();
    
    // Re-render current view
    if (state.viewMode === 'year') {
        renderYearView();
    } else {
        renderMonthView();
    }
    
    generateShareText();
    generateShoppingList();
    closeDataModal();
    
    showToastNotification(`${year}年（${totalDays}日分）の献立を全自動生成しました！🥗`);
}

// ==========================================================================
// 18. FIREBASE CLOUD REAL-TIME SYNCHRONIZATION
// ==========================================================================

// Helper to write highly persistent cookie (expires in 10 years)
function setFirebaseCookie(settings) {
    try {
        const text = JSON.stringify(settings);
        const date = new Date();
        date.setTime(date.getTime() + (10 * 365 * 24 * 60 * 60 * 1000));
        const expires = "; expires=" + date.toUTCString();
        document.cookie = "family_menu_planner_firebase_settings=" + encodeURIComponent(text) + expires + "; path=/; SameSite=Lax";
    } catch (e) {
        console.error("Failed to write cookie:", e);
    }
}

// Helper to read cookie
function getFirebaseCookie() {
    try {
        const nameEQ = "family_menu_planner_firebase_settings=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
        }
    } catch (e) {
        console.error("Failed to read cookie:", e);
    }
    return null;
}

function initFirebase() {
    if (!window.firebase) {
        console.warn("Firebase SDK is not loaded.");
        updateFirebaseUI(false);
        return;
    }
    
    // Dual check: Load from localStorage first, fallback to highly persistent cookie
    let saved = localStorage.getItem('family_menu_planner_firebase_settings');
    if (!saved) {
        saved = getFirebaseCookie();
        if (saved) {
            // Restore to localStorage to keep them in sync
            localStorage.setItem('family_menu_planner_firebase_settings', saved);
        }
    }
    
    if (!saved) {
        updateFirebaseUI(false);
        return;
    }
    
    try {
        const settings = JSON.parse(saved);
        if (!settings.config || !settings.familyId) {
            updateFirebaseUI(false);
            return;
        }
        
        // Initialize firebase app if not already initialized
        if (firebase.apps.length === 0) {
            firebaseApp = firebase.initializeApp(settings.config);
        } else {
            firebaseApp = firebase.app();
        }
        firebaseDb = firebase.database();
        
        updateFirebaseUI(true, settings.familyId, settings.configText);
        
        // Set up cloud listeners
        const familyRef = firebaseDb.ref('families/' + settings.familyId);
        
        // Initial load and listen for real-time changes
        familyRef.on('value', (snapshot) => {
            if (isFirebaseSyncing) return; // ignore updates triggered by ourselves
            
            const data = snapshot.val();
            if (data) {
                isFirebaseSyncing = true;
                let needsCloudPush = false;
                
                // Deep merge or overwrite state defensively (prevent old schemas from wiping newer local nodes)
                if (data.menus !== undefined) {
                    state.menus = data.menus || {};
                }
                
                // CRITICAL: Protect local dishLibrary from being wiped by older cloud schemas
                if (data.dishLibrary !== undefined) {
                    state.dishLibrary = data.dishLibrary || [];
                } else if (state.dishLibrary && state.dishLibrary.length > 0) {
                    // Cloud has no library node, but local does! Keep local and prepare to upload
                    needsCloudPush = true;
                }
                
                if (data.shoppingList !== undefined) {
                    state.shoppingList = data.shoppingList || [];
                }
                
                // Save locally too as backup
                const dataToSave = {
                    menus: state.menus,
                    shoppingList: state.shoppingList,
                    dishLibrary: state.dishLibrary,
                    currentYear: state.currentYear,
                    currentMonth: state.currentMonth
                };
                localStorage.setItem('family_menu_planner_data', JSON.stringify(dataToSave));
                
                // Re-render current active view
                if (state.viewMode === 'year') renderYearView();
                else if (state.viewMode === 'month') renderMonthView();
                else if (state.viewMode === 'library') renderLibraryView();
                
                updateRegisteredCount();
                generateShareText();
                generateShoppingList();
                
                isFirebaseSyncing = false;
                console.log("Real-time data synced from Firebase cloud!");
                
                if (needsCloudPush) {
                    console.log("Preserving local dishLibrary and uploading schema to Firebase cloud...");
                    setTimeout(() => {
                        syncLocalStateToFirebase();
                    }, 800);
                }
            } else {
                // Database is empty, push our current local state to cloud first!
                syncLocalStateToFirebase();
            }
        });
        
    } catch (e) {
        console.error("Firebase init failed:", e);
        const statusMsg = document.getElementById('firebase-status-msg');
        if (statusMsg) statusMsg.innerHTML = `<span style="color:var(--color-danger);">⚠️ 接続失敗: 設定エラー</span>`;
    }
}

function syncLocalStateToFirebase() {
    if (!firebaseDb) return;
    
    const saved = localStorage.getItem('family_menu_planner_firebase_settings');
    if (!saved) return;
    
    try {
        const settings = JSON.parse(saved);
        const familyId = settings.familyId;
        
        isFirebaseSyncing = true;
        
        firebaseDb.ref('families/' + familyId).set({
            menus: state.menus,
            dishLibrary: state.dishLibrary,
            shoppingList: state.shoppingList
        }).then(() => {
            isFirebaseSyncing = false;
            console.log("Local state successfully pushed to Firebase cloud.");
        }).catch(err => {
            isFirebaseSyncing = false;
            console.error("Failed to push to Firebase:", err);
        });
    } catch (e) {
        isFirebaseSyncing = false;
        console.error(e);
    }
}

function saveFirebaseSettings() {
    let configText = document.getElementById('firebase-config-input').value.trim();
    const familyId = document.getElementById('firebase-family-id').value.trim();
    
    if (!configText || !familyId) {
        alert("Firebase構成情報と家族グループIDの両方を入力してください。");
        return;
    }
    
    try {
        // Smart cleanup: if they copied the whole "const firebaseConfig = { ... };" block, extract just the { ... }
        if (configText.includes('{')) {
            const startIdx = configText.indexOf('{');
            const endIdx = configText.lastIndexOf('}');
            if (endIdx > startIdx) {
                configText = configText.substring(startIdx, endIdx + 1);
            }
        }
        
        // Bulletproof JS object parser (handles single quotes, unquoted keys, trailing commas)
        const config = new Function("return " + configText)();
        
        if (!config || typeof config !== 'object' || !config.databaseURL) {
            throw new Error("Invalid config object or missing databaseURL");
        }
        
        const settings = {
            config: config,
            configText: JSON.stringify(config, null, 2), // store normalized JSON
            familyId: familyId
        };
        
        localStorage.setItem('family_menu_planner_firebase_settings', JSON.stringify(settings));
        setFirebaseCookie(settings); // Save to highly persistent cookie too
        showToastNotification("Firebaseの設定を保存しました。接続します...");
        
        initFirebase();
        
        // Immediately trigger sync
        setTimeout(() => {
            syncLocalStateToFirebase();
        }, 1000);
        
    } catch (e) {
        alert("Firebase構成情報の解析に失敗しました。コピー＆ペーストした内容が正しいかご確認ください。\n\nコピーする部分：\nconst firebaseConfig = { ... } の「{」から「}」までの部分です。");
    }
}

function disableFirebaseSettings() {
    if (confirm("クラウド自動同期を停止しますか？\n（停止してもこれまでのデータはローカルに保存されたまま残ります）")) {
        localStorage.removeItem('family_menu_planner_firebase_settings');
        // Clear highly persistent cookie
        document.cookie = "family_menu_planner_firebase_settings=; Max-Age=-99999999; path=/; SameSite=Lax";
        showToastNotification("クラウド自動同期を停止しました。");
        
        // Reload page to clean connection
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

function updateFirebaseUI(enabled, familyId = '', configText = '') {
    const statusMsg = document.getElementById('firebase-status-msg');
    const saveBtnText = document.querySelector('#btn-save-firebase span');
    const disableBtn = document.getElementById('btn-disable-firebase');
    const configInput = document.getElementById('firebase-config-input');
    const familyIdInput = document.getElementById('firebase-family-id');
    
    if (enabled) {
        if (statusMsg) statusMsg.innerHTML = `<span style="color:var(--color-secondary);">🟢 接続中: ${familyId} グループで同期中</span>`;
        if (saveBtnText) saveBtnText.textContent = "設定を更新する";
        if (disableBtn) disableBtn.style.display = "block";
        if (configInput) configInput.value = configText;
        if (familyIdInput) familyIdInput.value = familyId;
    } else {
        if (statusMsg) statusMsg.innerHTML = `ステータス: 未接続 (ローカル保存中)`;
        if (saveBtnText) saveBtnText.textContent = "クラウド同期を有効化する";
        if (disableBtn) disableBtn.style.display = "none";
        if (configInput) configInput.value = "";
        if (familyIdInput) familyIdInput.value = "";
    }
}
