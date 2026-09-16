/* ============================================
   MEETING TRACKER — app.js (COMPLETE REWRITE)
   Part 1 of 4: Data, Helpers, Tabs, Brothers
   ============================================ */

// ===== DEFAULT ASSIGNMENT TYPES =====
var DEFAULT_TYPES = [
    { id: 1, name: 'Opening Prayer', eligible: ['elder','ms'] },
    { id: 2, name: 'OCLM Chairman', eligible: ['elder'] },
    { id: 3, name: '10-Minute Talk', eligible: ['elder','ms'] },
    { id: 4, name: 'Espiritual na Hiyas', eligible: ['elder','ms'] },
    { id: 5, name: 'Auxiliary Class Chairman', eligible: ['elder'] },
    { id: 6, name: 'Pamumuhay', eligible: ['elder','ms'] },
    { id: 7, name: 'CBS', eligible: ['elder'] },
    { id: 8, name: 'CBS Reader', eligible: ['ms','brother'] },
    { id: 9, name: 'Closing Prayer', eligible: ['elder','ms'] }
];

// ===== DATA STORE =====
var appData = {
    congregationName: 'Meeting Tracker',
    assignmentTypes: JSON.parse(JSON.stringify(DEFAULT_TYPES)),
    brothers: [],
    assignments: {},
    sundayAssignments: {},
    weekTypes: {}
};

// ===== STATE =====
var currentHomeWeek = getThisThursday();
var currentAssignWeek = getThisThursday();
var currentSundayWeek = getNextSunday(getThisThursday());
var editingBrotherId = null;
var activeFilter = 'all';
var confirmCallback = null;

// ===== LOCAL STORAGE =====
function saveData() {
    localStorage.setItem('meetingTrackerData', JSON.stringify(appData));
}

function loadData() {
    var saved = localStorage.getItem('meetingTrackerData');
    if (saved) {
        var parsed = JSON.parse(saved);
        appData = Object.assign({}, appData, parsed);
    }
}

// ===== DATE HELPERS =====
function getThisThursday() {
    var today = new Date();
    var day = today.getDay();
    var diff = (4 - day + 7) % 7;
    var thu = new Date(today);
    thu.setDate(today.getDate() + diff);
    return formatDate(thu);
}

function formatDate(date) {
    var d = new Date(date);
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
}

function displayDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function shortDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
}

function shiftWeek(dateStr, direction) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + (direction * 7));
    return formatDate(d);
}

function getNextSunday(thursdayStr) {
    var d = new Date(thursdayStr + 'T00:00:00');
    d.setDate(d.getDate() + 3);
    return formatDate(d);
}

function snapToThursday(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var day = d.getDay();
    var diff = (4 - day + 7) % 7;
    d.setDate(d.getDate() + diff);
    return formatDate(d);
}

function snapToSunday(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var day = d.getDay();
    var diff = (7 - day) % 7;
    d.setDate(d.getDate() + diff);
    return formatDate(d);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getVisibleTypes(weekType) {
    if (weekType === 'co_visit') {
        return appData.assignmentTypes.filter(function(t) {
            return t.name !== 'CBS' && t.name !== 'CBS Reader';
        });
    }
    return appData.assignmentTypes;
}

// ===== DATE PICKER =====
function showDatePicker(currentDate, callback) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:999;display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 'background:white;border-radius:16px;padding:24px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.15);min-width:260px;';

    var label = document.createElement('div');
    label.textContent = 'Select a date';
    label.style.cssText = 'font-size:0.9rem;font-weight:600;color:#555;margin-bottom:14px;';

    var input = document.createElement('input');
    input.type = 'date';
    input.value = currentDate;
    input.style.cssText = 'font-size:1rem;padding:10px 14px;border:1px solid #ddd;border-radius:10px;width:100%;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;margin-top:16px;';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'flex:1;padding:12px;border-radius:10px;border:1px solid #ddd;background:white;font-size:0.9rem;cursor:pointer;';

    var okBtn = document.createElement('button');
    okBtn.textContent = 'Go';
    okBtn.style.cssText = 'flex:1;padding:12px;border-radius:10px;border:none;background:#1e3a5f;color:white;font-size:0.9rem;font-weight:700;cursor:pointer;';

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(okBtn);
    box.appendChild(label);
    box.appendChild(input);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function cleanup() {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
    }

    okBtn.addEventListener('click', function() {
        if (input.value) callback(input.value);
        cleanup();
    });
    cancelBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) cleanup();
    });
}

// ===== CONFIRM DIALOG =====
function showConfirm(message, onConfirm) {
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmDialog').classList.remove('hidden');
    confirmCallback = onConfirm;
}

function closeConfirm() {
    document.getElementById('confirmDialog').classList.add('hidden');
    confirmCallback = null;
}

// ===== TAB SWITCHING =====
function switchTab(tabName) {
    document.querySelectorAll('.tab-page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.getElementById(tabName + 'Tab').classList.add('active');
    document.querySelector('.tab-btn[data-tab="' + tabName + '"]').classList.add('active');

    if (tabName === 'home') renderHome();
    if (tabName === 'assign') renderAssign();
    if (tabName === 'brothers') renderBrothers();
    if (tabName === 'stats') renderStats();
}

// ===== BROTHERS — RENDERING =====
function renderBrothers() {
    var list = document.getElementById('brotherList');
    var search = document.getElementById('brotherSearch').value.toLowerCase();

    var filtered = appData.brothers.filter(function(b) {
        if (activeFilter !== 'all' && b.category !== activeFilter) return false;
        if (search && !b.name.toLowerCase().includes(search)) return false;
        return true;
    });

    filtered.sort(function(a, b) { return a.name.localeCompare(b.name); });

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-text">' +
            (appData.brothers.length === 0 ? 'No brothers added yet. Tap "+ Add" to start.' : 'No results found.') +
            '</div></div>';
        return;
    }

    list.innerHTML = filtered.map(function(b) {
        var catClass = 'cat-' + b.category;
        var catLabel = b.category === 'elder' ? 'Elder' : b.category === 'ms' ? 'MS' : 'Brother';
        var unavail = b.available === false ? 'brother-card-unavailable' : '';
        return '<div class="brother-card ' + unavail + '" onclick="openBrotherPanel(\'' + b.id + '\')">' +
            '<span class="brother-card-name">' + b.name + '</span>' +
            '<span class="brother-card-category ' + catClass + '">' + catLabel + '</span></div>';
    }).join('');
}

// ===== BROTHERS — PANEL =====
function openBrotherPanel(brotherId) {
    editingBrotherId = brotherId || null;
    var panel = document.getElementById('brotherPanel');
    var overlay = document.getElementById('panelOverlay');
    var nameInput = document.getElementById('brotherNameInput');
    var catSelect = document.getElementById('brotherCategorySelect');
    var availToggle = document.getElementById('availabilityToggle');
    var notesInput = document.getElementById('brotherNotes');
    var deleteBtn = document.getElementById('deleteBrotherBtn');

    renderEligibilityChecks();

    if (brotherId) {
        var bro = appData.brothers.find(function(b) { return b.id === brotherId; });
        if (!bro) return;
        document.getElementById('panelTitle').textContent = 'Edit Brother';
        nameInput.value = bro.name;
        catSelect.value = bro.category;
        availToggle.checked = bro.available !== false;
        notesInput.value = bro.notes || '';
        deleteBtn.classList.remove('hidden');

        appData.assignmentTypes.forEach(function(t) {
            var cb = document.getElementById('elig_' + t.id);
            if (cb) cb.checked = bro.eligibleTypes ? bro.eligibleTypes.includes(t.id) : t.eligible.includes(bro.category);
        });
    } else {
        document.getElementById('panelTitle').textContent = 'Add Brother';
        nameInput.value = '';
        catSelect.value = 'elder';
        availToggle.checked = true;
        notesInput.value = '';
        deleteBtn.classList.add('hidden');
        updateDefaultEligibility();
    }

    panel.classList.add('open');
    overlay.classList.add('open');
}

function closeBrotherPanel() {
    document.getElementById('brotherPanel').classList.remove('open');
    document.getElementById('panelOverlay').classList.remove('open');
    editingBrotherId = null;
}

function renderEligibilityChecks() {
    var container = document.getElementById('eligibilityChecks');
    container.innerHTML = appData.assignmentTypes.map(function(t) {
        return '<label class="checkbox-item"><input type="checkbox" id="elig_' + t.id + '"><span>' + t.name + '</span></label>';
    }).join('');
}

function updateDefaultEligibility() {
    var cat = document.getElementById('brotherCategorySelect').value;
    appData.assignmentTypes.forEach(function(t) {
        var cb = document.getElementById('elig_' + t.id);
        if (cb) cb.checked = t.eligible.includes(cat);
    });
}

function saveBrother() {
    var name = document.getElementById('brotherNameInput').value.trim();
    if (!name) { alert('Please enter a name.'); return; }

    var category = document.getElementById('brotherCategorySelect').value;
    var available = document.getElementById('availabilityToggle').checked;
    var notes = document.getElementById('brotherNotes').value.trim();

    var eligibleTypes = [];
    appData.assignmentTypes.forEach(function(t) {
        var cb = document.getElementById('elig_' + t.id);
        if (cb && cb.checked) eligibleTypes.push(t.id);
    });

    if (editingBrotherId) {
        var bro = appData.brothers.find(function(b) { return b.id === editingBrotherId; });
        if (bro) {
            bro.name = name;
            bro.category = category;
            bro.available = available;
            bro.notes = notes;
            bro.eligibleTypes = eligibleTypes;
        }
    } else {
        appData.brothers.push({
            id: generateId(),
            name: name,
            category: category,
            available: available,
            notes: notes,
            eligibleTypes: eligibleTypes
        });
    }

    saveData();
    closeBrotherPanel();
    renderBrothers();
}

function deleteBrother() {
    if (!editingBrotherId) return;
    var bro = appData.brothers.find(function(b) { return b.id === editingBrotherId; });
    if (!bro) return;

    showConfirm('Delete ' + bro.name + '? All assignment history for this brother will also be removed.', function() {
        appData.brothers = appData.brothers.filter(function(b) { return b.id !== editingBrotherId; });
        Object.keys(appData.assignments).forEach(function(week) {
            var weekData = appData.assignments[week];
            Object.keys(weekData).forEach(function(typeId) {
                if (weekData[typeId] === editingBrotherId) delete weekData[typeId];
            });
        });
        Object.keys(appData.sundayAssignments).forEach(function(week) {
            appData.sundayAssignments[week] = appData.sundayAssignments[week].filter(function(id) { return id !== editingBrotherId; });
        });
        saveData();
        closeBrotherPanel();
        renderBrothers();
    });
}

/* ============================================
   MEETING TRACKER — app.js
   Part 2 of 4: Home Tab & Assign Tab
   ============================================ */

// ===== HOME TAB — RENDERING =====
function renderHome() {
    var weekStr = currentHomeWeek;
    var weekType = appData.weekTypes[weekStr] || 'normal';
    var sundayStr = getNextSunday(weekStr);

    document.getElementById('homeWeekBtn').textContent = displayDate(weekStr);

    var list = document.getElementById('homeAssignmentList');
    var sundaySection = document.getElementById('homeSundaySection');

    if (weekType === 'no_meeting') {
        list.innerHTML = '<div class="no-meeting-notice">Walang pulong sa linggong ito.</div>';
        sundaySection.innerHTML = '';
        return;
    }

    var visibleTypes = getVisibleTypes(weekType);
    var weekAssignments = appData.assignments[weekStr] || {};

    if (visibleTypes.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-text">No assignment types configured.</div></div>';
    } else {
        list.innerHTML = visibleTypes.map(function(t) {
            var brotherId = weekAssignments[t.id];
            var brother = brotherId ? appData.brothers.find(function(b) { return b.id === brotherId; }) : null;
            var nameHtml = brother
                ? '<span class="assignment-row-name">' + brother.name + '</span>'
                : '<span class="assignment-row-empty">&mdash;</span>';
            return '<div class="assignment-row">' +
                '<span class="assignment-row-type">' + t.name + '</span>' +
                nameHtml + '</div>';
        }).join('');
    }

    // Sunday section
    var sundayIds = appData.sundayAssignments[sundayStr] || [];
    if (sundayIds.length > 0) {
        var names = sundayIds.map(function(id) {
            var b = appData.brothers.find(function(br) { return br.id === id; });
            return b ? b.name : 'Unknown';
        });
        sundaySection.innerHTML = '<div class="assignment-list" style="margin-top:10px">' +
            names.map(function(n) {
                return '<div class="assignment-row">' +
                    '<span class="assignment-row-type">Sunday Assignment</span>' +
                    '<span class="assignment-row-name">' + n + '</span></div>';
            }).join('') + '</div>';
    } else {
        sundaySection.innerHTML = '<div class="empty-state" style="padding:16px"><div class="empty-state-text">No Sunday assignments marked.</div></div>';
    }
}

// ===== HOME TAB — NAVIGATION =====
function homeNavPrev() {
    currentHomeWeek = shiftWeek(currentHomeWeek, -1);
    renderHome();
}

function homeNavNext() {
    currentHomeWeek = shiftWeek(currentHomeWeek, 1);
    renderHome();
}

function homePickDate() {
    showDatePicker(currentHomeWeek, function(selected) {
        currentHomeWeek = snapToThursday(selected);
        renderHome();
    });
}

// ===== ASSIGN TAB — RENDERING =====
function renderAssign() {
    var weekStr = currentAssignWeek;
    var weekType = appData.weekTypes[weekStr] || 'normal';

    document.getElementById('assignWeekBtn').textContent = displayDate(weekStr);
    document.getElementById('meetingTypeSelect').value = weekType;

    var slotList = document.getElementById('assignSlotList');

    if (weekType === 'no_meeting') {
        slotList.innerHTML = '<div class="no-meeting-notice">Walang pulong sa linggong ito.</div>';
        return;
    }

    var visibleTypes = getVisibleTypes(weekType);
    var weekAssignments = appData.assignments[weekStr] || {};
    var sundayStr = getNextSunday(weekStr);
    var sundayIds = appData.sundayAssignments[sundayStr] || [];

    slotList.innerHTML = visibleTypes.map(function(t) {
        var options = buildAssignOptions(t, weekStr, weekAssignments, sundayIds);
        return '<div class="assign-slot-card">' +
            '<div class="assign-slot-label">' + t.name + '</div>' +
            '<select class="assign-slot-select" data-type-id="' + t.id + '" data-week="' + weekStr + '">' +
            '<option value="">— Select —</option>' +
            options + '</select></div>';
    }).join('');

    // Set current values and attach listeners
    var selects = slotList.querySelectorAll('.assign-slot-select');
    selects.forEach(function(sel) {
        var typeId = parseInt(sel.getAttribute('data-type-id'));
        if (weekAssignments[typeId]) {
            sel.value = weekAssignments[typeId];
        }
        sel.addEventListener('change', function() {
            assignBrother(sel.getAttribute('data-week'), typeId, sel.value);
        });
    });
}

function buildAssignOptions(assignType, weekStr, weekAssignments, sundayIds) {
    var brothers = appData.brothers.filter(function(b) { return b.available !== false; });

    // Count assignments for this type
    var typeCounts = {};
    brothers.forEach(function(b) { typeCounts[b.id] = 0; });
    Object.values(appData.assignments).forEach(function(weekData) {
        if (weekData[assignType.id]) {
            var bid = weekData[assignType.id];
            if (typeCounts[bid] !== undefined) typeCounts[bid]++;
        }
    });

    // Check who's already assigned this week
    var assignedThisWeek = {};
    Object.entries(weekAssignments).forEach(function(entry) {
        var typeId = entry[0];
        var brotherId = entry[1];
        if (parseInt(typeId) !== assignType.id && brotherId) {
            assignedThisWeek[brotherId] = true;
        }
    });

    var eligible = [];
    var notEligible = [];

    brothers.forEach(function(b) {
        var isEligible = b.eligibleTypes
            ? b.eligibleTypes.includes(assignType.id)
            : assignType.eligible.includes(b.category);

        var info = {
            id: b.id,
            name: b.name,
            count: typeCounts[b.id] || 0,
            hasSunday: sundayIds.includes(b.id),
            hasOtherAssignment: !!assignedThisWeek[b.id],
            isEligible: isEligible
        };

        if (isEligible) eligible.push(info);
        else notEligible.push(info);
    });

    eligible.sort(function(a, b) { return a.count - b.count; });
    notEligible.sort(function(a, b) { return a.name.localeCompare(b.name); });

    function buildOption(info) {
        var label = info.name + '  \u00b7  ' + info.count;
        if (info.hasSunday) label += '  \u00b7 Sun';
        if (info.hasOtherAssignment) label += '  \u00b7 assigned';
        var prefix = !info.isEligible ? '\u2298 ' : '';
        return '<option value="' + info.id + '">' + prefix + label + '</option>';
    }

    var html = '';
    eligible.forEach(function(info) { html += buildOption(info); });
    if (notEligible.length > 0) {
        html += '<option disabled>\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500</option>';
        notEligible.forEach(function(info) { html += buildOption(info); });
    }
    return html;
}

// ===== ASSIGN TAB — ACTIONS =====
function assignBrother(weekStr, typeId, brotherId) {
    if (!appData.assignments[weekStr]) appData.assignments[weekStr] = {};
    if (brotherId) {
        appData.assignments[weekStr][typeId] = brotherId;
    } else {
        delete appData.assignments[weekStr][typeId];
    }
    saveData();
    renderAssign();
}

function assignNavPrev() {
    currentAssignWeek = shiftWeek(currentAssignWeek, -1);
    renderAssign();
}

function assignNavNext() {
    currentAssignWeek = shiftWeek(currentAssignWeek, 1);
    renderAssign();
}

function assignPickDate() {
    showDatePicker(currentAssignWeek, function(selected) {
        currentAssignWeek = snapToThursday(selected);
        renderAssign();
    });
}

function changeMeetingType() {
    var weekStr = currentAssignWeek;
    var val = document.getElementById('meetingTypeSelect').value;
    if (val === 'normal') {
        delete appData.weekTypes[weekStr];
    } else {
        appData.weekTypes[weekStr] = val;
    }
    saveData();
    renderAssign();
}

// ===== AUTO-FILL =====
function autoFill() {
    var weekStr = currentAssignWeek;
    var weekType = appData.weekTypes[weekStr] || 'normal';
    if (weekType === 'no_meeting') return;

    var visibleTypes = getVisibleTypes(weekType);
    if (!appData.assignments[weekStr]) appData.assignments[weekStr] = {};
    var weekAssignments = appData.assignments[weekStr];
    var sundayStr = getNextSunday(weekStr);
    var sundayIds = appData.sundayAssignments[sundayStr] || [];

    var usedThisWeek = {};
    Object.values(weekAssignments).forEach(function(bid) { if (bid) usedThisWeek[bid] = true; });

    visibleTypes.forEach(function(t) {
        if (weekAssignments[t.id]) return;

        var candidates = appData.brothers.filter(function(b) {
            if (b.available === false) return false;
            if (usedThisWeek[b.id]) return false;
            var isEligible = b.eligibleTypes
                ? b.eligibleTypes.includes(t.id)
                : t.eligible.includes(b.category);
            return isEligible;
        });

        if (candidates.length === 0) return;

        var counts = {};
        candidates.forEach(function(c) { counts[c.id] = 0; });
        Object.values(appData.assignments).forEach(function(wd) {
            if (wd[t.id] && counts[wd[t.id]] !== undefined) {
                counts[wd[t.id]]++;
            }
        });

        // Group by count, shuffle within same count
        var lowestCount = Infinity;
        candidates.forEach(function(c) {
            var cnt = counts[c.id] || 0;
            if (cnt < lowestCount) lowestCount = cnt;
        });

        var lowestGroup = candidates.filter(function(c) {
            return (counts[c.id] || 0) === lowestCount;
        });

        // Shuffle
        for (var i = lowestGroup.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = lowestGroup[i];
            lowestGroup[i] = lowestGroup[j];
            lowestGroup[j] = temp;
        }

        // Prefer no Sunday conflict
        var pick = null;
        for (var k = 0; k < lowestGroup.length; k++) {
            if (!sundayIds.includes(lowestGroup[k].id)) { pick = lowestGroup[k]; break; }
        }
        if (!pick) pick = lowestGroup[0];

        weekAssignments[t.id] = pick.id;
        usedThisWeek[pick.id] = true;
    });

    saveData();
    renderAssign();
}

// ===== CLEAR WEEK =====
function clearWeekAssignments() {
    var weekStr = currentAssignWeek;
    var weekData = appData.assignments[weekStr];
    if (!weekData || Object.keys(weekData).length === 0) {
        alert('Wala namang assignments sa week na ito.');
        return;
    }
    showConfirm('Clear all assignments for this week?', function() {
        delete appData.assignments[weekStr];
        saveData();
        renderAssign();
    });
}

/* ============================================
   MEETING TRACKER — app.js
   Part 3 of 4: Stats Tab
   ============================================ */

// ===== STATS TAB — MAIN RENDER =====
function renderStats() {
    renderSundayChecklist();
    renderFairnessTable();
    renderHistory();
}

// ===== SUNDAY CHECKLIST =====
var showAllSundayFlag = false;

function renderSundayChecklist() {
    var container = document.getElementById('sundayCheckList');
    var sundayStr = currentSundayWeek;
    var sundayIds = appData.sundayAssignments[sundayStr] || [];
    var searchEl = document.getElementById('sundaySearch');
    var search = searchEl ? searchEl.value.toLowerCase() : '';

    document.getElementById('sundayWeekBtn').textContent = displayDate(sundayStr);

    var brothers = appData.brothers
        .filter(function(b) {
            if (b.available === false) return false;
            if (search && !b.name.toLowerCase().includes(search)) return false;
            return true;
        })
        .sort(function(a, b) {
            var aChecked = sundayIds.includes(a.id) ? 0 : 1;
            var bChecked = sundayIds.includes(b.id) ? 0 : 1;
            if (aChecked !== bChecked) return aChecked - bChecked;
            return a.name.localeCompare(b.name);
        });

    if (brothers.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No brothers found.</div></div>';
        return;
    }

    var isSearching = search.length > 0;
    var hasMore = !isSearching && !showAllSundayFlag && brothers.length > 5;
    var visible = (isSearching || showAllSundayFlag) ? brothers : brothers.slice(0, 5);

    var html = visible.map(function(b) {
        var checked = sundayIds.includes(b.id) ? 'checked' : '';
        return '<div class="sunday-check-row">' +
            '<span>' + b.name + '</span>' +
            '<input type="checkbox" ' + checked + ' onchange="toggleSunday(\'' + sundayStr + '\',\'' + b.id + '\', this.checked)">' +
            '</div>';
    }).join('');

    if (hasMore) {
        html += '<div class="sunday-check-row" style="justify-content:center;cursor:pointer;color:#1e3a5f;font-size:0.85rem;font-weight:600;" onclick="expandSundayList()">' +
            'Show all (' + brothers.length + ')</div>';
    }

    if (showAllSundayFlag && !isSearching && brothers.length > 5) {
        html += '<div class="sunday-check-row" style="justify-content:center;cursor:pointer;color:#1e3a5f;font-size:0.85rem;font-weight:600;" onclick="collapseSundayList()">' +
            'Show less</div>';
    }

    container.innerHTML = html;
}

function expandSundayList() {
    showAllSundayFlag = true;
    renderSundayChecklist();
}

function collapseSundayList() {
    showAllSundayFlag = false;
    renderSundayChecklist();
}

function toggleSunday(sundayStr, brotherId, isChecked) {
    if (!appData.sundayAssignments[sundayStr]) appData.sundayAssignments[sundayStr] = [];
    var list = appData.sundayAssignments[sundayStr];

    if (isChecked && !list.includes(brotherId)) {
        list.push(brotherId);
    } else if (!isChecked) {
        appData.sundayAssignments[sundayStr] = list.filter(function(id) { return id !== brotherId; });
    }
    saveData();
}

// ===== SUNDAY NAVIGATION =====
function sundayNavPrev() {
    var d = new Date(currentSundayWeek + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    currentSundayWeek = formatDate(d);
    showAllSundayFlag = false;
    renderSundayChecklist();
}

function sundayNavNext() {
    var d = new Date(currentSundayWeek + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    currentSundayWeek = formatDate(d);
    showAllSundayFlag = false;
    renderSundayChecklist();
}

function sundayPickDate() {
    showDatePicker(currentSundayWeek, function(selected) {
        currentSundayWeek = snapToSunday(selected);
        showAllSundayFlag = false;
        renderSundayChecklist();
    });
}

// ===== FAIRNESS TABLE =====
function renderFairnessTable() {
    var container = document.getElementById('fairnessTable');
    var range = document.getElementById('statsRangeSelect').value;
    var cutoffDate = getCutoffDate(range);

    var counts = {};
    var lastAssigned = {};
    appData.brothers.forEach(function(b) {
        counts[b.id] = 0;
        lastAssigned[b.id] = null;
    });

    var weekDates = Object.keys(appData.assignments).sort();

    weekDates.forEach(function(weekStr) {
        if (cutoffDate && weekStr < cutoffDate) return;
        var weekData = appData.assignments[weekStr];
        Object.values(weekData).forEach(function(brotherId) {
            if (counts[brotherId] !== undefined) {
                counts[brotherId]++;
                if (!lastAssigned[brotherId] || weekStr > lastAssigned[brotherId]) {
                    lastAssigned[brotherId] = weekStr;
                }
            }
        });
    });

    var rows = appData.brothers
        .filter(function(b) { return b.available !== false; })
        .map(function(b) {
            return {
                id: b.id,
                name: b.name,
                count: counts[b.id] || 0,
                lastDate: lastAssigned[b.id]
            };
        })
        .sort(function(a, b) {
            if (!a.lastDate && !b.lastDate) return a.name.localeCompare(b.name);
            if (!a.lastDate) return -1;
            if (!b.lastDate) return 1;
            return a.lastDate.localeCompare(b.lastDate);
        });

    if (rows.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No brothers available.</div></div>';
        return;
    }

    container.innerHTML =
        '<div class="stats-row" style="background:#f5f5f5;cursor:default;">' +
            '<span class="stats-row-name" style="font-size:0.75rem;color:#888;">Name</span>' +
            '<span class="stats-row-count" style="font-size:0.75rem;color:#888;">Total</span>' +
            '<span class="stats-row-date" style="font-size:0.75rem;color:#888;">Last Assigned</span>' +
        '</div>' +
        rows.map(function(r) {
            var dateDisplay = r.lastDate ? shortDate(r.lastDate) : 'Never';
            var highlight = !r.lastDate ? ' style="background:#fff7ed"' : '';
            return '<div class="stats-row"' + highlight + ' onclick="showBrotherStats(\'' + r.id + '\')">' +
                '<span class="stats-row-name">' + r.name + '</span>' +
                '<span class="stats-row-count">' + r.count + '</span>' +
                '<span class="stats-row-date">' + dateDisplay + '</span></div>';
        }).join('');
}

function getCutoffDate(range) {
    var now = new Date();
    switch (range) {
        case 'month': return formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        case '3months': return formatDate(new Date(now.getFullYear(), now.getMonth() - 3, 1));
        case 'year': return formatDate(new Date(now.getFullYear(), 0, 1));
        default: return null;
    }
}

// ===== BROTHER STATS DETAIL =====
function showBrotherStats(brotherId) {
    var brother = appData.brothers.find(function(b) { return b.id === brotherId; });
    if (!brother) return;

    var typeCounts = {};
    appData.assignmentTypes.forEach(function(t) { typeCounts[t.id] = 0; });

    var history = [];

    Object.entries(appData.assignments)
        .sort(function(a, b) { return b[0].localeCompare(a[0]); })
        .forEach(function(entry) {
            var weekStr = entry[0];
            var weekData = entry[1];
            Object.entries(weekData).forEach(function(wd) {
                var typeId = parseInt(wd[0]);
                var bid = wd[1];
                if (bid === brotherId) {
                    typeCounts[typeId]++;
                    var typeName = appData.assignmentTypes.find(function(t) { return t.id === typeId; });
                    history.push({ date: weekStr, type: typeName ? typeName.name : 'Unknown' });
                }
            });
        });

    var detail = brother.name + '\n';
    detail += 'Category: ' + (brother.category === 'elder' ? 'Elder' : brother.category === 'ms' ? 'MS' : 'Brother') + '\n\n';
    detail += 'Assignment Breakdown:\n';
    appData.assignmentTypes.forEach(function(t) {
        if (typeCounts[t.id] > 0) detail += '  ' + t.name + ': ' + typeCounts[t.id] + '\n';
    });
    detail += '\nRecent History:\n';
    history.slice(0, 10).forEach(function(h) {
        detail += '  ' + shortDate(h.date) + ' — ' + h.type + '\n';
    });

    alert(detail);
}

// ===== ASSIGNMENT HISTORY =====
function renderHistory() {
    var container = document.getElementById('historyList');
    var today = formatDate(new Date());

    var today = getThisThursday();
    // Current week + next 3 weeks (4 total, going forward)
    var upcomingWeeks = [];
    for (var i = 0; i < 4; i++) {
        upcomingWeeks.push(shiftWeek(today, i));
    }
    var weeks = upcomingWeeks.filter(function(w) {
        return appData.assignments[w] && Object.keys(appData.assignments[w]).length > 0;
    });

    if (weeks.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No assignment history yet.</div></div>';
        return;
    }

    var html = '';
    weeks.forEach(function(weekStr) {
        var weekData = appData.assignments[weekStr];
        var items = [];

        Object.entries(weekData).forEach(function(entry) {
            var typeId = parseInt(entry[0]);
            var brotherId = entry[1];
            var type = appData.assignmentTypes.find(function(t) { return t.id === typeId; });
            var brother = appData.brothers.find(function(b) { return b.id === brotherId; });
            items.push({
                typeName: type ? type.name : 'Unknown',
                broName: brother ? brother.name : 'Deleted'
            });
        });

        if (items.length > 0) {
            html += '<div class="history-card">' +
                '<div class="history-card-date">' + displayDate(weekStr) + '</div>' +
                items.map(function(item) {
                    return '<div class="history-card-item">' +
                        '<span>' + item.typeName + '</span>' +
                        '<span style="font-weight:600">' + item.broName + '</span></div>';
                }).join('') + '</div>';
        }
    });

    container.innerHTML = html || '<div class="empty-state"><div class="empty-state-text">No assignment history yet.</div></div>';
}

/* ============================================
   MEETING TRACKER — app.js
   Part 4 of 4: Settings, Export/Import, Init
   ============================================ */

// ===== SETTINGS MODAL =====
function openSettings() {
    renderSettingsTypes();
    document.getElementById('congNameInput').value = appData.congregationName || 'Meeting Tracker';
    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
    var name = document.getElementById('congNameInput').value.trim();
    if (name) {
        appData.congregationName = name;
        document.querySelector('.header-title').textContent = name;
    }
    document.getElementById('settingsModal').classList.add('hidden');
    saveData();
}

function renderSettingsTypes() {
    var container = document.getElementById('assignmentTypeList');
    container.innerHTML = appData.assignmentTypes.map(function(t) {
        var eligVal = t.eligible.slice().sort().join(',');
        return '<div class="settings-type-item">' +
            '<input type="text" value="' + t.name + '" onchange="renameType(' + t.id + ', this.value)">' +
            '<select onchange="updateTypeEligibility(' + t.id + ', this.value)" style="width:auto;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.8rem;">' +
                '<option value="elder"' + (eligVal === 'elder' ? ' selected' : '') + '>Elder only</option>' +
                '<option value="elder,ms"' + (eligVal === 'elder,ms' ? ' selected' : '') + '>Elder + MS</option>' +
                '<option value="brother,ms"' + (eligVal === 'brother,ms' ? ' selected' : '') + '>MS + Brother</option>' +
                '<option value="brother,elder,ms"' + (eligVal === 'brother,elder,ms' ? ' selected' : '') + '>All</option>' +
            '</select>' +
            '<button class="settings-type-delete" onclick="deleteType(' + t.id + ')">&#10005;</button>' +
        '</div>';
    }).join('');
}

function renameType(typeId, newName) {
    var t = appData.assignmentTypes.find(function(x) { return x.id === typeId; });
    if (t) t.name = newName.trim();
    saveData();
}

function updateTypeEligibility(typeId, value) {
    var t = appData.assignmentTypes.find(function(x) { return x.id === typeId; });
    if (t) t.eligible = value.split(',');
    saveData();
}

function addType() {
    var maxId = 0;
    appData.assignmentTypes.forEach(function(t) { if (t.id > maxId) maxId = t.id; });
    appData.assignmentTypes.push({
        id: maxId + 1,
        name: 'New Assignment',
        eligible: ['elder', 'ms']
    });
    saveData();
    renderSettingsTypes();
}

function deleteType(typeId) {
    if (appData.assignmentTypes.length <= 1) {
        alert('Kailangan ng kahit isang assignment type.');
        return;
    }
    showConfirm('Delete this assignment type? Existing assignments of this type will be removed.', function() {
        appData.assignmentTypes = appData.assignmentTypes.filter(function(t) { return t.id !== typeId; });
        Object.keys(appData.assignments).forEach(function(week) {
            delete appData.assignments[week][typeId];
        });
        saveData();
        renderSettingsTypes();
    });
}

// ===== EXPORT — JSON BACKUP =====
function exportJson() {
    var dataStr = JSON.stringify(appData, null, 2);
    var blob = new Blob([dataStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var date = new Date().toISOString().slice(0, 10);
    a.download = 'meeting-tracker-backup-' + date + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== IMPORT — JSON RESTORE =====
function importJson() {
    document.getElementById('importFileInput').click();
}

function handleImportFile(event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var imported = JSON.parse(e.target.result);
            if (!imported.brothers || !Array.isArray(imported.brothers)) {
                alert('Invalid file: missing brothers data.');
                return;
            }
            if (!imported.assignmentTypes || !Array.isArray(imported.assignmentTypes)) {
                alert('Invalid file: missing assignment types.');
                return;
            }

            showConfirm('Restore data from backup? This will replace all current data.', function() {
                appData = Object.assign({}, appData, imported);
                saveData();
                document.querySelector('.header-title').textContent = appData.congregationName || 'Meeting Tracker';
                var activeTab = document.querySelector('.tab-btn.active');
                if (activeTab) switchTab(activeTab.dataset.tab);
            });
        } catch (err) {
            alert('Error reading file. Make sure it is a valid JSON backup.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ===== EXPORT — PDF (Weekly Schedule) =====
function exportPdf() {
    var weekStr = currentHomeWeek;
    var weekType = appData.weekTypes[weekStr] || 'normal';

    if (weekType === 'no_meeting') {
        alert('Walang pulong sa linggong ito.');
        return;
    }

    var visibleTypes = getVisibleTypes(weekType);
    var weekAssignments = appData.assignments[weekStr] || {};
    var congName = appData.congregationName || 'Meeting Tracker';

    var rows = visibleTypes.map(function(t) {
        var brotherId = weekAssignments[t.id];
        var brother = brotherId ? appData.brothers.find(function(b) { return b.id === brotherId; }) : null;
        var name = brother ? brother.name : '\u2014';
        return '<tr><td style="padding:10px 16px;border-bottom:1px solid #eee;color:#555;font-size:14px;">' + t.name +
            '</td><td style="padding:10px 16px;border-bottom:1px solid #eee;font-weight:600;text-align:right;font-size:14px;">' + name + '</td></tr>';
    }).join('');

    // Sunday assignments
    var sundayStr = getNextSunday(weekStr);
    var sundayIds = appData.sundayAssignments[sundayStr] || [];
    var sundayHtml = '';
    if (sundayIds.length > 0) {
        var sundayNames = sundayIds.map(function(id) {
            var b = appData.brothers.find(function(br) { return br.id === id; });
            return b ? b.name : 'Unknown';
        });
        sundayHtml = '<h3 style="font-size:14px;color:#1e3a5f;margin-top:24px;">Sunday Assignments \u2014 ' + displayDate(sundayStr) + '</h3>' +
            '<table style="width:100%;border-collapse:collapse;">' +
            sundayNames.map(function(n) {
                return '<tr><td style="padding:8px 16px;border-bottom:1px solid #eee;color:#555;font-size:14px;">Sunday Assignment</td>' +
                    '<td style="padding:8px 16px;border-bottom:1px solid #eee;font-weight:600;text-align:right;font-size:14px;">' + n + '</td></tr>';
            }).join('') + '</table>';
    }

    var printHtml = '<html><head><title>' + congName + ' \u2014 ' + displayDate(weekStr) + '</title>' +
        '<style>body{font-family:-apple-system,sans-serif;padding:40px;max-width:520px;margin:0 auto;}' +
        'h1{font-size:18px;color:#1e3a5f;margin-bottom:2px;}' +
        'h2{font-size:14px;color:#888;font-weight:400;margin-bottom:20px;}' +
        'table{width:100%;border-collapse:collapse;}</style></head><body>' +
        '<h1>' + congName + '</h1>' +
        '<h2>Midweek Meeting \u2014 ' + displayDate(weekStr) + '</h2>' +
        '<table>' + rows + '</table>' +
        sundayHtml +
        '</body></html>';

    var printWin = window.open('', '_blank');
    printWin.document.write(printHtml);
    printWin.document.close();
    printWin.focus();
    setTimeout(function() { printWin.print(); }, 300);
}

// ===== EXPORT — CSV (History) =====
function exportExcel() {
    var weeks = Object.keys(appData.assignments).sort(function(a, b) { return b.localeCompare(a); });

    if (weeks.length === 0) {
        alert('No assignment history to export.');
        return;
    }

    var typeNames = appData.assignmentTypes.map(function(t) { return t.name; });
    var csv = 'Week,' + typeNames.join(',') + '\n';

    weeks.forEach(function(weekStr) {
        var weekData = appData.assignments[weekStr];
        var row = [displayDate(weekStr)];
        appData.assignmentTypes.forEach(function(t) {
            var brotherId = weekData[t.id];
            var brother = brotherId ? appData.brothers.find(function(b) { return b.id === brotherId; }) : null;
            row.push(brother ? '"' + brother.name + '"' : '');
        });
        csv += row.join(',') + '\n';
    });

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var date = new Date().toISOString().slice(0, 10);
    a.download = 'assignment-history-' + date + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== SETTINGS BUTTON IN HEADER =====
function addSettingsButton() {
    var header = document.querySelector('.app-header');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    var spacer = document.createElement('div');
    spacer.style.width = '32px';
    header.insertBefore(spacer, header.firstChild);

    var btn = document.createElement('button');
    btn.textContent = '\u2699';
    btn.style.cssText = 'background:none;border:none;color:white;font-size:1.3rem;cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;';
    btn.addEventListener('click', openSettings);
    header.appendChild(btn);
}

// ===== MASTER INIT — ONE SINGLE INIT =====
function initApp() {
    loadData();

    // Header
    addSettingsButton();
    if (appData.congregationName) {
        document.querySelector('.header-title').textContent = appData.congregationName;
    }

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
    });

    // Home nav
    document.getElementById('homePrev').addEventListener('click', homeNavPrev);
    document.getElementById('homeNext').addEventListener('click', homeNavNext);
    document.getElementById('homeWeekBtn').addEventListener('click', homePickDate);

    // Home sunday toggle
    document.getElementById('sundayToggle').addEventListener('click', function() {
        var section = document.getElementById('homeSundaySection');
        var arrow = document.getElementById('sundayArrow');
        section.classList.toggle('open');
        arrow.innerHTML = section.classList.contains('open') ? '&#9650;' : '&#9660;';
    });

    // Assign nav
    document.getElementById('assignPrev').addEventListener('click', assignNavPrev);
    document.getElementById('assignNext').addEventListener('click', assignNavNext);
    document.getElementById('assignWeekBtn').addEventListener('click', assignPickDate);
    document.getElementById('meetingTypeSelect').addEventListener('change', changeMeetingType);
    document.getElementById('autoFillBtn').addEventListener('click', autoFill);
    document.getElementById('clearWeekBtn').addEventListener('click', clearWeekAssignments);

    // Brothers
    document.getElementById('addBrotherBtn').addEventListener('click', function() { openBrotherPanel(null); });
    document.getElementById('panelCloseBtn').addEventListener('click', closeBrotherPanel);
    document.getElementById('panelOverlay').addEventListener('click', closeBrotherPanel);
    document.getElementById('saveBrotherBtn').addEventListener('click', saveBrother);
    document.getElementById('deleteBrotherBtn').addEventListener('click', deleteBrother);
    document.getElementById('brotherSearch').addEventListener('input', renderBrothers);
    document.getElementById('brotherCategorySelect').addEventListener('change', function() {
        if (!editingBrotherId) updateDefaultEligibility();
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            renderBrothers();
        });
    });

    // Confirm dialog
    document.getElementById('confirmYesBtn').addEventListener('click', function() {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    });
    document.getElementById('confirmNoBtn').addEventListener('click', closeConfirm);

    // Stats — Sunday nav
    document.getElementById('sundayPrev').addEventListener('click', sundayNavPrev);
    document.getElementById('sundayNext').addEventListener('click', sundayNavNext);
    document.getElementById('sundayWeekBtn').addEventListener('click', sundayPickDate);
    document.getElementById('sundaySearch').addEventListener('input', function() {
        showAllSundayFlag = false;
        renderSundayChecklist();
    });
    document.getElementById('statsRangeSelect').addEventListener('change', renderFairnessTable);

    // Settings
    document.getElementById('settingsCloseBtn').addEventListener('click', closeSettings);
    document.getElementById('addTypeBtn').addEventListener('click', addType);

    // Export / Import
    document.getElementById('exportPdfBtn').addEventListener('click', exportPdf);
    document.getElementById('exportExcelBtn').addEventListener('click', exportExcel);
    document.getElementById('exportJsonBtn').addEventListener('click', exportJson);
    document.getElementById('importJsonBtn').addEventListener('click', importJson);
    document.getElementById('importFileInput').addEventListener('change', handleImportFile);

    // Initial render
    renderHome();
    renderBrothers();
}

// ===== START =====
document.addEventListener('DOMContentLoaded', initApp);