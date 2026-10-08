        const ASSIGNMENT_TYPES = [
            'Opening Prayer',
            'OCLM Chairman',
            '10 mins talk',
            'Espiritual na Hiyas',
            'Pamumuhay',
            'CBS',
            'CBS Reader',
            'Closing prayer'
        ];

        // Names to highlight and show at the bottom of the assignments grid

        // Names with blue highlight in assignments grid

        // Names with green highlight in assignments grid (at the very bottom)

        const BROTHER_CATEGORIES = ['Elder', 'MS', 'Brother'];

        function normalizeBrotherName(name) {
            return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
        }

        function getBrotherCategory(brother) {
            if (!brother) return 'Elder';
            return brother.category || 'Elder';
        }

        function getBrotherRowClass(brother, rowIdx) {
            return ''; // v14: badge + group header na lang (walang kulay ang buong hilera)
        }

        let brothers = [];
        let people = []; // roster ng lahat ng kapatid (Masterlist) para sa student parts
        let assignments = [];
        let sundayAssignments = [];
        let brotherEligibility = {};
        let currentView = 'grid';
        let undoStack = [];
        let selectedDate = null;
        let selectedType = null;
        let autoAssignPreview = null;
        let autoAssignUnfilled = 0;
        let workbookPreview = null;
        let meetingEditorData = {}; // Stores editable fields for PDF editor
        let gridStartMonth = 1; // 1-12, the first month shown in the grid
        let gridStartYear = null; // v24: taon ng unang buwan sa grid (null = taon ng Select Month)
        const GRID_MONTH_COUNT = 6; // default number of months visible at once (v24: 3 / 6 / 12, naaalala)
        let gridSearchTerm = '';
        let expandedEligibilityId = null;

        function checkBackupReminder() {
            if (brothers.length === 0 && assignments.length === 0) return;
            const last = localStorage.getItem('nc_lastBackup');
            const days = last ? (Date.now() - new Date(last).getTime()) / 86400000 : Infinity;
            if (days >= 7) {
                const banner = document.getElementById('backupReminder');
                if (banner) banner.classList.remove('hidden');
            }
        }

        // Initialize
        function init() {
            loadData();
            loadMeetingEditorData();
            if (refreshBrotherCategories()) saveData(); // itugma ang Elder/MS/Brother sa Masterlist
            // Get current date in Philippine time (Asia/Manila)
            const manilaStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
            const phTime = new Date(manilaStr);
            const monthStr = `${phTime.getFullYear()}-${String(phTime.getMonth() + 1).padStart(2, '0')}`;
            document.getElementById('monthSelect').value = monthStr;
            document.getElementById('monthSelect').addEventListener('change', function() {
                updateGridStartMonth();
                render();
            });
            updateGridStartMonth();
            switchView('grid'); // Show grid view by default
                    checkBackupReminder();
        }

        // Set grid start month based on selected month (center it in the visible range)
        // ===== v24: grid na gumagalaw sa iba't ibang taon =====
        function getGridMonthCount() {
            const v = Number(localStorage.getItem('nc_gridMonths'));
            return [3, 6, 12].includes(v) ? v : GRID_MONTH_COUNT;
        }
        function gridSelectedYear() {
            const v = document.getElementById('monthSelect')?.value || manilaTodayISO().slice(0, 7);
            return Number(v.split('-')[0]) || Number(manilaTodayISO().slice(0, 4));
        }
        function gridStartKey() {
            const y = gridStartYear || gridSelectedYear();
            const m = Math.min(12, Math.max(1, Number(gridStartMonth) || 1));
            return `${y}-${String(m).padStart(2, '0')}`;
        }
        // Listahan ng mga buwang nakikita: [{ key: 'YYYY-MM', y, m }]
        function gridMonthList() {
            const start = gridStartKey(), out = [];
            for (let i = 0; i < getGridMonthCount(); i++) {
                const key = addMonthsKey(start, i);
                const [y, m] = key.split('-').map(Number);
                out.push({ key, y, m });
            }
            return out;
        }
        function gridMonthLabel(key, short) {
            const [y, m] = key.split('-').map(Number);
            const names = short ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            return `${names[m - 1]} ${y}`;
        }
        function setGridStartKey(key) {
            if (!/^\d{4}-\d{2}$/.test(key || '')) return;
            const [y, m] = key.split('-').map(Number);
            gridStartYear = y; gridStartMonth = m;
            renderMonthScrollPills();
            renderGrid();
        }
        // Kapag pinalitan ang Select Month: isang buwan bago nito ang simula, para kita rin ang nakaraang buwan
        function updateGridStartMonth() {
            const sel = document.getElementById('monthSelect')?.value;
            const key = /^\d{4}-\d{2}$/.test(sel || '') ? addMonthsKey(sel, -1) : addMonthsKey(manilaTodayISO().slice(0, 7), -1);
            const [y, m] = key.split('-').map(Number);
            gridStartYear = y; gridStartMonth = m;
            renderMonthScrollPills();
        }

        // Render the month pill buttons (v24: 6 buwan bago at pagkatapos ng nakikita, tumatawid ng taon)
        function renderMonthScrollPills() {
            const container = document.getElementById('monthScrollPills');
            const count = getGridMonthCount(), start = gridStartKey(), end = addMonthsKey(start, count - 1);
            const nowKey = manilaTodayISO().slice(0, 7);
            if (container) {
                let html = '';
                const first = addMonthsKey(start, -6), total = count + 12;
                for (let i = 0; i < total; i++) {
                    const k = addMonthsKey(first, i);
                    const [y, m] = k.split('-').map(Number);
                    const cls = 'month-pill' + (k === start ? ' active' : (k > start && k <= end) ? ' in-range' : '') + (k === nowKey ? ' now' : '');
                    if (i === 0 || m === 1) html += `<span class="pill-year">${y}</span>`;
                    html += `<button class="${cls}" title="${gridMonthLabel(k)}${k === nowKey ? ' (this month)' : ''}" onclick="setGridStartKey('${k}')">${gridMonthLabel(k, true).split(' ')[0]}</button>`;
                }
                container.innerHTML = html;
            }
            const ctl = document.getElementById('gridRangeControls');
            if (ctl) {
                ctl.innerHTML = `<span class="grid-range-label">${gridMonthLabel(start, true)} – ${gridMonthLabel(end, true)}</span>
                    <label class="grid-range-count">Show <select onchange="setGridMonthCount(this.value)">${[3, 6, 12].map(n => `<option value="${n}" ${n === count ? 'selected' : ''}>${n} months</option>`).join('')}</select></label>
                    <button class="btn-secondary text-sm" onclick="gridJumpToday()" title="Start from last month">📍 Today</button>`;
            }
        }

        // Set start month directly (luma: buwan lang, sa kasalukuyang taon ng grid)
        function setGridStartMonth(m) {
            setGridStartKey(`${gridStartYear || gridSelectedYear()}-${String(Math.min(12, Math.max(1, Number(m) || 1))).padStart(2, '0')}`);
        }

        // Shift month range by delta (-1 = left, +1 = right) — v24: walang hangganan, tumatawid ng taon
        function shiftMonthRange(delta) {
            setGridStartKey(addMonthsKey(gridStartKey(), Number(delta) || 0));
        }
        function gridPageBack() { shiftMonthRange(-getGridMonthCount()); }
        function gridPageForward() { shiftMonthRange(getGridMonthCount()); }
        function gridJumpToday() { setGridStartKey(addMonthsKey(manilaTodayISO().slice(0, 7), -1)); }
        function setGridMonthCount(n) {
            const v = Number(n);
            if (![3, 6, 12].includes(v)) return;
            localStorage.setItem('nc_gridMonths', String(v));
            renderMonthScrollPills();
            renderGrid();
        }

        // Local storage functions
        function saveData() {
            localStorage.setItem('nc_brothers', JSON.stringify(brothers));
            localStorage.setItem('nc_assignments', JSON.stringify(assignments));
            localStorage.setItem('nc_sundayAssignments', JSON.stringify(sundayAssignments));
            localStorage.setItem('nc_brotherEligibility', JSON.stringify(brotherEligibility));
            localStorage.setItem('nc_people', JSON.stringify(people));
        }

        function loadData() {
            const savedBrothers = localStorage.getItem('nc_brothers');
            const savedAssignments = localStorage.getItem('nc_assignments');
            const savedSunday = localStorage.getItem('nc_sundayAssignments');
            const savedEligibility = localStorage.getItem('nc_brotherEligibility');
            
            if (savedBrothers) brothers = JSON.parse(savedBrothers);
            if (savedAssignments) assignments = JSON.parse(savedAssignments);
            if (savedSunday) sundayAssignments = JSON.parse(savedSunday);
            if (savedEligibility) brotherEligibility = JSON.parse(savedEligibility);
            const savedPeople = localStorage.getItem('nc_people');
            if (savedPeople) people = JSON.parse(savedPeople);
            loadStudentSettings();
            loadMeetingSettings();
            
            
            // Auto-fix names: convert "Last, First" or "Last. First" to "First Last"
            // v23: huwag galawin kung tugma na sa isang tao sa Roster (hal. "Domingo Jr. Nasayao")
            let namesFixed = false;
            const rosterNames = new Set(people.map(p => normalizeBrotherName(`${p.first} ${p.last}`)));
            brothers.forEach(brother => {
                if (brother.name && !rosterNames.has(normalizeBrotherName(brother.name))) {
                    // Handle comma separator
                    if (brother.name.includes(',')) {
                        const parts = brother.name.split(',').map(p => p.trim());
                        if (parts.length >= 2) {
                            brother.name = `${parts[1]} ${parts[0]}`;
                            namesFixed = true;
                        }
                    }
                    // Handle period separator (e.g., "Castillo. JP")
                    else if (brother.name.includes('. ') || brother.name.match(/\.\s*\w/)) {
                        const parts = brother.name.split(/\.\s*/).map(p => p.trim());
                        if (parts.length >= 2 && parts[1]) {
                            brother.name = `${parts[1]} ${parts[0]}`;
                            namesFixed = true;
                        }
                    }
                }
            });
            if (namesFixed) {
                localStorage.setItem('nc_brothers', JSON.stringify(brothers));
            }
            
            // Initialize eligibility and selection state for brothers that don't have it yet
            brothers.forEach(brother => {
                if (brother.isSelectable === undefined) {
                    brother.isSelectable = true;
                }
                if (!brotherEligibility[brother.id]) {
                    brotherEligibility[brother.id] = {};
                    ASSIGNMENT_TYPES.forEach(type => {
                        brotherEligibility[brother.id][type] = true;
                    });
                }
            });
        }

        function snapshotAssignmentState() {
            return {
                assignments: JSON.parse(JSON.stringify(assignments)),
                sundayAssignments: JSON.parse(JSON.stringify(sundayAssignments))
            };
        }

        function pushAssignmentUndoState() {
            undoStack.push(snapshotAssignmentState());
            if (undoStack.length > 20) {
                undoStack.shift();
            }
        }

        function undoLastAssignmentChange() {
            if (!undoStack.length) {
                alert('No recent assignment change to undo.');
                return;
            }

            const previousState = undoStack.pop();
            assignments = previousState.assignments;
            sundayAssignments = previousState.sundayAssignments;
            saveData();
            closeAssignModal();
            render();
        }

        // Get Thursdays belonging to a month based on week-start (Monday).
        // A Thursday belongs to the month where its Monday (start of the week) falls.
        // E.g., if Thursday is July 2 but Monday is June 29, it belongs to June.
        function getThursdaysForMonthByWeekStart(year, month) {
            const thursdays = [];
            const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T12:00:00+08:00`);
            const nextMonth = month === 12 ? 1 : month + 1;
            const nextYear = month === 12 ? year + 1 : year;
            const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-04T12:00:00+08:00`);
            
            for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                if (d.getDay() === 4) { // Thursday
                    // Monday = Thursday - 3 days (using ms to avoid setDate month-rollover issues)
                    const monday = new Date(d.getTime() - 3 * 86400000);
                    if (monday.getMonth() === month - 1 && monday.getFullYear() === year) {
                        const ty = d.getFullYear();
                        const tm = d.getMonth() + 1;
                        const td = d.getDate();
                        thursdays.push(`${ty}-${String(tm).padStart(2, '0')}-${String(td).padStart(2, '0')}`);
                    }
                }
            }
            return thursdays;
        }

        // Get Thursdays in month (using week-start grouping)
        function getThursdaysInMonth() {
            const monthStr = document.getElementById('monthSelect').value;
            const [year, month] = monthStr.split('-').map(Number);
            return getThursdaysForMonthByWeekStart(year, month);
        }

        // Get Sunday for Thursday (next Sunday in Philippine time)
        function getSundayForThursday(thursdayDate) {
            const thursday = new Date(thursdayDate + 'T12:00:00+08:00'); // Philippine time
            const daysUntilSunday = (7 - thursday.getDay()) || 7;
            const sunday = new Date(thursday);
            sunday.setDate(thursday.getDate() + daysUntilSunday);
            
            const year = sunday.getFullYear();
            const month = String(sunday.getMonth() + 1).padStart(2, '0');
            const day = String(sunday.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Check if brother has Sunday assignment
        function hasSundayAssignment(brotherId, thursdayDate) {
            const sundayDate = getSundayForThursday(thursdayDate);
            return sundayAssignments.some(sa => sa.brotherId === brotherId && sa.date === sundayDate);
        }

        // Toggle Sunday assignment
        function toggleSundayAssignment(brotherId, thursdayDate) {
            pushAssignmentUndoState();
            const sundayDate = getSundayForThursday(thursdayDate);
            const index = sundayAssignments.findIndex(sa => sa.brotherId === brotherId && sa.date === sundayDate);
            
            if (index >= 0) {
                sundayAssignments.splice(index, 1);
            } else {
                sundayAssignments.push({
                    id: `sunday-${Date.now()}`,
                    brotherId,
                    date: sundayDate
                });
            }
            saveData();
            render();
        }

        // Check availability
        function checkAvailability(brotherId, date, assignmentType) {
            const [year, month] = date.split('-');
            const monthKey = `${year}-${month}`;
            
            const monthAssignments = assignments.filter(a => 
                a.brotherId === brotherId && a.date.startsWith(monthKey)
            );
            
            const hasSunday = hasSundayAssignment(brotherId, date);
            const warnings = [];
            
            if (hasSunday) {
                warnings.push('Has a Sunday assignment this week');
            }
            
            if (monthAssignments.length >= 1) {
                warnings.push('Already has 1 Thursday assignment this month');
            }
            
            if (monthAssignments.length >= 2) {
                warnings.push('⚠️ STRICT WARNING: already 2 Thursday assignments this month');
            }

            // New: enforce hard limit of 3 per month
            if (monthAssignments.length >= 3) {
                warnings.push('✋ MAX: already 3 Thursday assignments this month');
                return {
                    canAssign: false,
                    warnings,
                    status: 'blocked'
                };
            }
            
            return {
                canAssign: true, // Allow assignment unless blocked by limit
                warnings,
                status: monthAssignments.length === 0 && !hasSunday ? 'available' : 
                        monthAssignments.length === 1 || hasSunday ? 'warning' : 'warning'
            };
        }

        function isSelectableForAssignment(brother) {
            return !!brother && brother.isSelectable !== false;
        }

        // Add: compute smart suggestions for a date+type used by the Assign modal
        function getSuggestionsForSlot(date, type) {
            const suggestions = [];
            const stuMap = studentTabPartsByName();
            const [year, month] = date.split('-');
            const monthKey = `${year}-${month}`;

            // total assignments across all brothers for averaging
            const totalAssigned = assignments.length;
            const avgAssignments = totalAssigned / Math.max(1, brothers.length);

            // v15: karaniwang bilang ng ganitong bahagi sa mga puwedeng gumanap — batayan ng ★ quota
            const typePool = brothers.filter(b => isSelectableForAssignment(b) && brotherEligibility[b.id]?.[type] !== false &&
                !(requiresElder(date, type) && getBrotherCategory(b) !== 'Elder') && categoryAllowsType(b, type) && !(type === 'CBS Reader' && getBrotherCategory(b) === 'Elder'));
            const typeWeight = b => brotherLoad(b) * brotherPref(b, type);
            const typeUnit = typePool.length ? typePool.reduce((s, b) => s + assignments.filter(a => a.brotherId === b.id && a.type === type && a.date !== date).length, 0) / Math.max(1e-9, typePool.reduce((s, b) => s + typeWeight(b), 0)) : 0;

            brothers.forEach(brother => {
                if (!isSelectableForAssignment(brother)) return;

                // skip if marked ineligible for this type
                if (brotherEligibility[brother.id]?.[type] === false) return;

                // S-38 ¶16, ¶17, ¶25: elder lang ang Chairman, CBS konduktor, at Lokal na Pangangailangan
                if (requiresElder(date, type) && getBrotherCategory(brother) !== 'Elder') return;

                // v10: ang may tag na "Brother" (hindi Elder/MS) ay CBS Reader lang
                if (!categoryAllowsType(brother, type)) return;
                // v12: CBS Reader = MS at Brothers lang; MS sa 10-min talk = hanggang N bawat buwan
                if (roleRuleViolation(brother, date, type)) return;

                // skip if already reached monthly limit
                const monthAssignments = assignments.filter(a => a.brotherId === brother.id && a.date.startsWith(monthKey)).length;
                if (monthAssignments >= 3) return;

                const availability = checkAvailability(brother.id, date, type);
                // only show brothers that can be assigned (we still surface warnings)
                if (!availability.canAssign) return;

                // base score
                let score = 100;

                // penalties from availability warnings
                availability.warnings.forEach(warning => {
                    if (warning.toLowerCase().includes('sunday')) score -= 20;
                    if (warning.toLowerCase().includes('1 thursday')) score -= 15;
                    if (warning.toLowerCase().includes('strict warning')) score -= 35;
                });

                // per-type fairness: penalize by how many times this brother ALREADY has this type
                const sameTypeCount = assignments.filter(a => a.brotherId === brother.id && a.type === type).length;
                score -= sameTypeCount * 30;

                // still slightly discourage repeating the immediately-previous assignment type
                const allBrotherAssignments = assignments.filter(a => a.brotherId === brother.id).sort((a, b) => new Date(b.date) - new Date(a.date));
                if (allBrotherAssignments.length > 0 && allBrotherAssignments[0].type === type) {
                    score -= 10;
                }

                // bonus if never had this type
                const hasHadThisType = assignments.some(a => a.brotherId === brother.id && a.type === type);
                if (!hasHadThisType) score += 20;

                // fairness: prefer brothers with fewer total assignments
                const totalForBrother = assignments.filter(a => a.brotherId === brother.id).length;
                if (totalForBrother < avgAssignments) score += 15;
                else if (totalForBrother > avgAssignments * 1.5) score -= 15;

                // Pagitan (v6): iwasan ang magkasunod na linggo
                const sp = getSpacingInfo(brother.id, date, type, stuMap);
                score -= sp.penalty;

                // v15: Load (½, ⅓) — mas mabigat ang bilang ng bawat bahagi niya sa Assignments tab, kaya mas madalang siyang mapili.
                //      Preferred part (★×2, ×3) — sa uring iyon, mas magaan ang bilang ng bahagi niya, kaya mas madalas.
                const load = brotherLoad(brother), pref = brotherPref(brother, type);
                const typeCount = assignments.filter(a => a.brotherId === brother.id && a.type === type && a.date !== date).length;
                // ★ quota: kung kulang pa siya sa inaasahang dami (pref × karaniwan), uunahin; kapag naabot, normal na ulit
                const prefDue = pref > 1 && typeCount + 1 <= typeUnit * typeWeight(brother) + 1e-9;
                const effGrid = totalForBrother;
                const famRecent = assignments.filter(a => a.brotherId === brother.id && partFamily(a.type) === partFamily(type) && a.date !== date && weeksBetween(a.date, date) <= 13).length;
                const loadNotes = [];
                if (load < 1) loadNotes.push(`Light load ${loadLabel(load)}${brother.loadReason ? ` — ${brother.loadReason}` : ''}`);
                if (pref > 1) loadNotes.push(`★ Preferred for ${typeLabel(type)} ×${pref}${prefDue ? ' — due' : ' — already has his share for now'}`);

                suggestions.push({
                    brother,
                    score: Math.max(0, Math.min(100, Math.round(score))),
                    totalAssignments: totalForBrother,
                    // rank = atas sa Assignments tab (÷ load) + Students tab + parehong uri sa ±13 linggo (para iba-iba ang atas),
                    //        bawas ang MS preference sa Spiritual Gems at ang ★ preference
                    rank: effGrid / load + (stuMap[normalizeBrotherName(brother.name)] || []).length + MONTH_REPEAT_WEIGHT * sp.monthRep
                        + SAME_TYPE_WEIGHT * (pref > 1 ? 0 : famRecent)
                        - (type === 'Espiritual na Hiyas' && getBrotherCategory(brother) === 'MS' ? MS_GEMS_PREFERENCE : 0)
                        - (prefDue ? PREF_RANK_BONUS : 0),
                    tier: sp.tier,
                    monthRep: sp.monthRep,
                    warnings: [...sp.notes, ...loadNotes, ...availability.warnings]
                });
            });

            // Una: pagitan (tier 0 = walang bahagi sa katabing linggo, 1 = may ibang bahagi sa katabing linggo,
            // 2 = parehong atas sa magkasunod na linggo). Pagkatapos: pinakakaunting total, saka score.
            suggestions.sort((a, b) => {
                if (a.tier !== b.tier) return a.tier - b.tier;
                // v16: iwasan ang parehong bahagi sa magkasunod na buwan
                if (Math.abs(a.rank - b.rank) > 1e-9) return a.rank - b.rank; // = total, pero mas inuuna ang MS sa Spiritual Gems
                if (a.score !== b.score) return b.score - a.score;
                // v15: kapag pantay, random habang nag-a-auto-assign; kung hindi, alphabetical
                if (gridShuffleKey) return (gridShuffleKey[a.brother.id] ?? 0.5) - (gridShuffleKey[b.brother.id] ?? 0.5);
                return a.brother.name.localeCompare(b.brother.name);
            });

            return suggestions;
        }

        // Import brothers


        // Convert "LastName, FirstName" or "LastName. FirstName" to "FirstName LastName"
        function formatName(name) {
            if (name.includes(',')) {
                const parts = name.split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    return `${parts[1]} ${parts[0]}`;
                }
            }
            // Handle period separator (e.g., "Castillo. JP")
            if (name.includes('. ') || name.match(/\.\s*\w/)) {
                const parts = name.split(/\.\s*/).map(p => p.trim());
                if (parts.length >= 2 && parts[1]) {
                    return `${parts[1]} ${parts[0]}`;
                }
            }
            return name;
        }

        // Fix all existing names to "FirstName LastName" format


        // Remove brother
        function removeBrother(id) {
            if (!confirm('Are you sure you want to remove this brother? All assignments will be deleted.')) return;
            brothers = brothers.filter(b => b.id !== id);
            assignments = assignments.filter(a => a.brotherId !== id);
            sundayAssignments = sundayAssignments.filter(a => a.brotherId !== id);
            delete brotherEligibility[id];
            saveData();
            render();
        }
        
        // Toggle eligibility
        function toggleEligibilityPanel(brotherId) {
            expandedEligibilityId = expandedEligibilityId === brotherId ? null : brotherId;
            renderAssignmentSelectionModal();
        }

        function toggleEligibility(brotherId, assignmentType) {
            if (!brotherEligibility[brotherId]) {
                brotherEligibility[brotherId] = {};
            }
            brotherEligibility[brotherId][assignmentType] = !brotherEligibility[brotherId][assignmentType];
            saveData();
            render();
            renderAssignmentSelectionModal();
        }

        function showAssignmentSelectionModal() {
            renderAssignmentSelectionModal();
            document.getElementById('assignmentSelectionModal').classList.remove('hidden');
            document.body.classList.add('modal-open');
        }

        function closeAssignmentSelectionModal() {
            document.getElementById('assignmentSelectionModal').classList.add('hidden');
            document.body.classList.remove('modal-open');
        }

        function renderAssignmentSelectionModal() {
            const container = document.getElementById('assignmentSelectionContent');
            if (!container) return;

            if (brothers.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-8">No brothers yet. Add names to start managing assignment selection.</p>';
                return;
            }

            const sortedBrothers = [...brothers].sort((a, b) => a.name.localeCompare(b.name));
            let html = '<div class="space-y-3">';

            sortedBrothers.forEach(brother => {
                const selected = isSelectableForAssignment(brother);
                const elig = brotherEligibility[brother.id] || {};
                const eligibleCount = ASSIGNMENT_TYPES.filter(t => elig[t] !== false && !(requiresElder(null, t) && getBrotherCategory(brother) !== 'Elder') && categoryAllowsType(brother, t) && !(t === 'CBS Reader' && getBrotherCategory(brother) === 'Elder')).length;
                const isExpanded = expandedEligibilityId === brother.id;
                html += `<div class="rounded-xl border border-gray-200 p-3">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            ${editingBrotherId === brother.id ? `<div class="bro-edit">
                                <input id="editBrotherName" value="${escHtml(brother.name)}" onkeydown="if(event.key==='Enter')saveBrotherRename('${brother.id}');if(event.key==='Escape')cancelBrotherRename()">
                                <button class="btn-primary text-sm" onclick="saveBrotherRename('${brother.id}')">💾 Save</button>
                                <button class="btn-secondary text-sm" onclick="cancelBrotherRename()">Cancel</button></div>`
                            : `<div class="font-semibold text-gray-900">${escHtml(brother.name)}
                                <button class="stu-x" title="Rename" onclick="startBrotherRename('${brother.id}')">✏️</button>
                                ${findRosterPersonForBrother(brother) ? '' : `<span class="bro-unlinked" title="No one in the Students-tab Roster has this exact name, so his Students-tab parts (Bible reading, student parts) are not counted for spacing/fairness here. Rename to match the Roster.">⚠ not in Roster</span>`}</div>`}
                            <div class="text-xs text-gray-500">${selected ? 'Included in assignment picks' : 'Excluded from assignment picks'} • ${getBrotherCategory(brother)}${loadTags(brother)}</div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="toggleBrotherAssignmentSelection('${brother.id}')" class="px-3 py-2 rounded-lg text-sm font-semibold ${selected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}">
                                ${selected ? 'Included' : 'Excluded'}
                            </button>
                            <button onclick="removeBrother('${brother.id}')" class="px-3 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-700" title="Delete brother">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                    ${renderLoadControls(brother)}
                    <div class="flex items-center justify-between gap-3 mt-2">
                        <div class="text-xs text-gray-600">Eligible for ${eligibleCount}/${ASSIGNMENT_TYPES.length} types${Object.keys(brother.prefer || {}).length ? ` • ★ ${Object.entries(brother.prefer).map(([t, v]) => `${typeLabel(t)} ×${v}`).join(', ')}` : ''}</div>
                        <button onclick="toggleEligibilityPanel('${brother.id}')" class="px-3 py-1 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700">
                            ⚙️ Eligibility ${isExpanded ? '▲' : '▼'}
                        </button>
                    </div>
                    ${isExpanded ? `
                    <div class="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2">
                        ${ASSIGNMENT_TYPES.map(type => {
                            const broLock = !categoryAllowsType(brother, type);
                            const readerLock = !broLock && type === 'CBS Reader' && getBrotherCategory(brother) === 'Elder';
                            const locked = broLock || readerLock || (requiresElder(null, type) && getBrotherCategory(brother) !== 'Elder');
                            return locked ? `
                        <label class="flex items-center gap-2 p-2 rounded text-sm text-gray-400" title="${broLock ? 'Brothers (not Elder/MS): CBS Reader only' : readerLock ? 'CBS Reader goes to ministerial servants and brothers' : 'S-38: elder only'}">
                            <input type="checkbox" disabled class="w-4 h-4">
                            <span>${typeLabel(type)} <em>(${broLock ? 'not for Brothers' : readerLock ? 'MS & Brothers only' : 'elder only'})</em></span>
                        </label>` : `
                        <div class="flex items-center gap-2 p-2 rounded hover:bg-gray-100 text-sm">
                            <label class="flex items-center gap-2 cursor-pointer flex-1">
                            <input type="checkbox" ${elig[type] !== false ? 'checked' : ''} onchange="toggleEligibility('${brother.id}', '${type}')" class="w-4 h-4">
                            <span>${typeLabel(type)}</span></label>
                            <select class="pref-select" title="★ Preferred: gets this part more often" onchange="setBrotherPref('${brother.id}', '${type}', this.value)" ${elig[type] === false ? 'disabled' : ''}>
                                ${[1, 2, 3].map(v => `<option value="${v}" ${brotherPref(brother, type) === v ? 'selected' : ''}>${v === 1 ? '—' : '★ ×' + v}</option>`).join('')}
                            </select>
                        </div>`;
                        }).join('')}
                    </div>` : ''}
                </div>`;
            });

            html += '</div>';
            container.innerHTML = html;
        }

        function toggleBrotherAssignmentSelection(brotherId) {
            const brother = brothers.find(b => b.id === brotherId);
            if (!brother) return;

            brother.isSelectable = brother.isSelectable === false ? true : false;
            saveData();
            render();
            renderAssignmentSelectionModal();
        }

        function addNameToAssignmentSelection() {
            const input = document.getElementById('assignmentSelectionName');
            const categorySelect = document.getElementById('assignmentSelectionCategory');
            const name = (input?.value || '').trim();
            if (!name) return;

            const formattedName = formatName(name);
            const selectedCategory = categorySelect?.value || 'Elder';
            const existingBrother = brothers.find(b => b.name.toLowerCase() === formattedName.toLowerCase());

            if (existingBrother) {
                existingBrother.isSelectable = true;
                existingBrother.category = selectedCategory;
                saveData();
                render();
                renderAssignmentSelectionModal();
                input.value = '';
                return;
            }

            const newId = `brother-${Date.now()}-${Math.random()}`;
            brothers.push({
                id: newId,
                name: formattedName,
                isSelectable: true,
                category: selectedCategory
            });
            brotherEligibility[newId] = {};
            ASSIGNMENT_TYPES.forEach(type => {
                brotherEligibility[newId][type] = true;
            });

            saveData();
            render();
            renderAssignmentSelectionModal();
            input.value = '';
        }

        // Show assign modal (enhanced with ranked suggestions + search)
        function showAssignModal(date, type) {
            if (!date || !type) {
                console.error('Invalid date or type for assign modal');
                return;
            }

            selectedDate = date;
            selectedType = type;

            const dateObj = new Date(date + 'T00:00:00');
            document.getElementById('assignModalTitle').textContent = `Assign: ${typeLabel(type)}`;
            document.getElementById('assignModalDate').textContent = `${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;

            // Clear search and render suggestions
            const searchInput = document.getElementById('assignSearch');
            if (searchInput) searchInput.value = '';
            
            // Render suggestions (this will populate the modal)
            renderAssignModalSuggestions('');

            document.getElementById('assignModal').classList.remove('hidden');
            document.body.classList.add('modal-open');
            
            // Focus search input for immediate filtering
            setTimeout(() => searchInput && searchInput.focus(), 100);
        }

        // Render assign modal suggestions filtered by searchTerm
        function renderAssignModalSuggestions(searchTerm = '') {
            const date = selectedDate;
            const type = selectedType;
            if (!date || !type) return;

            const suggestions = getSuggestionsForSlot(date, type) || [];
            const q = (searchTerm || '').trim().toLowerCase();

            let html = '';
            let visibleCount = 0;

            if (suggestions.length === 0) {
                html = '<div class="text-center py-8"><p class="text-gray-500">No eligible brothers available for this assignment.</p></div>';
            } else {
                suggestions.forEach((sug, idx) => {
                    if (q && !sug.brother.name.toLowerCase().includes(q)) return;

                    const availability = checkAvailability(sug.brother.id, date, type);
                    const isRecommended = idx === 0 && sug.score >= 70 && sug.tier === 0 && !sug.monthRep;

                    const [year, month] = date.split('-');
                    const monthCount = assignments.filter(a => a.brotherId === sug.brother.id && a.date.startsWith(`${year}-${month}`)).length;
                    const capacityLeft = Math.max(0, 3 - monthCount);

                    if (sug.tier === 2) availability.status = 'blocked-ish';
                    const borderClass = availability.status === 'available' && sug.tier === 0 ? 'border-emerald-300' :
                                       availability.status === 'blocked-ish' ? 'border-red-300' :
                                       availability.status === 'warning' ? 'border-amber-300' : 'border-red-300';
                    const bgClass = availability.status === 'available' && sug.tier === 0 ? 'bg-emerald-50' :
                                   availability.status === 'blocked-ish' ? 'bg-red-50' :
                                   availability.status === 'warning' ? 'bg-amber-50' : 'bg-red-50';

                    html += `<div class="border rounded-md p-3 md:p-4 mb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${borderClass} ${bgClass}">
                        <div class="flex-1 min-w-0 text-sm">
                            <div class="flex items-center gap-2 mb-1">
                                <div class="font-bold text-gray-900 truncate">${sug.brother.name}</div>
                                ${isRecommended ? '<span class="badge-recommended flex-shrink-0">⭐ Recommended</span>' : ''}
                            </div>
                            <div class="text-xs text-gray-600 mb-2">
                                Capacity: <strong class="text-gray-800">${capacityLeft}/3</strong> • Total: <strong>${sug.totalAssignments}</strong>
                            </div>
                            ${sug.warnings.length ? `<div class="text-xs text-amber-700 space-y-1">${sug.warnings.map(w => '⚠️ '+w).join('<br>')}</div>` : ''}
                        </div>

                        <div class="flex items-center gap-2 flex-shrink-0">
                            <div class="text-center">
                                <div class="text-sm font-bold text-gray-700">${sug.score}%</div>
                                <div class="text-xs text-gray-500">Score</div>
                            </div>
                            <button onclick="assignBrother('${date}', '${type}', '${sug.brother.id}')" 
                                ${!availability.canAssign ? 'disabled' : ''} 
                                class="btn-primary text-sm px-3 py-2">
                                Assign
                            </button>
                        </div>
                    </div>`;
                    visibleCount++;
                });

                if (visibleCount === 0 && q) {
                    html = '<div class="text-center py-6"><p class="text-gray-500">No brothers match your search.</p></div>';
                }
            }

            document.getElementById('assignModalContent').innerHTML = html;
        }

        function closeAssignModal() {
            document.getElementById('assignModal').classList.add('hidden');
            selectedDate = null;
            selectedType = null;
            document.body.classList.remove('modal-open');
        }

        // Assign brother
        function assignBrother(date, type, brotherId) {
            pushAssignmentUndoState();

            // If removing assignment for single-slot: brotherId === null
            if (brotherId === null) {
                // remove existing assignment (single-slot) for that date & type
                assignments = assignments.filter(a => !(a.date === date && a.type === type));
                saveData();
                render();
                return;
            }

            // S-38: kumpirmahin kapag hindi elder sa Chairman/CBS
            if (!checkBrotherRule(brotherId, type)) return;
                if (!confirmElderOnly(brotherId, type, date)) return;
                if (!confirmRoleRule(brotherId, type, date)) return;
                if (!confirmSpecialWeek(date, type)) return;
                if (!confirmSpacing(brotherId, date, type)) return;

            // For adding: verify limit (3 per month) before pushing
            const [year, month] = date.split('-');
            const monthKey = `${year}-${month}`;
            const monthCount = assignments.filter(a => a.brotherId === brotherId && a.date.startsWith(monthKey)).length;

            if (monthCount >= 3) {
                alert('Cannot assign — this brother already has 3 assignments this month.');
                return;
            }

            // Special-case Pamumuhay: allow up to 2 brothers (append, don't overwrite)
            if (type === 'Pamumuhay') {
                // Prevent duplicate same brother for same slot
                const exists = assignments.some(a => a.date === date && a.type === type && a.brotherId === brotherId);
                if (!exists) {
                    assignments.push({
                        id: `assignment-${Date.now()}-${Math.random()}`,
                        date,
                        type,
                        brotherId
                    });
                }
            } else {
                // Regular single-slot assignment: replace existing assignment for that slot
                assignments = assignments.filter(a => !(a.date === date && a.type === type));
                if (brotherId) {
                    assignments.push({
                        id: `assignment-${Date.now()}-${Math.random()}`,
                        date,
                        type,
                        brotherId
                    });
                }
            }

            saveData();
            closeAssignModal();
            render();
        }

        // Remove a specific assignment by its id (used for Pamumuhay removal)
        function removeAssignmentById(id) {
            pushAssignmentUndoState();
            assignments = assignments.filter(a => a.id !== id);
            saveData();
            render();
        }

        // Improve view button toggling to use simple classes (keeps UI consistent)
        function switchView(view) {
            currentView = view;
            // Hide all views
            document.getElementById('gridView').classList.add('hidden');
            document.getElementById('pdfEditorView').classList.add('hidden');
            document.getElementById('sundayView').classList.add('hidden');
            document.getElementById('studentsView').classList.add('hidden');
            document.getElementById('fairnessView').classList.add('hidden');

            // Reset button styles
            document.getElementById('gridBtn').className = 'btn-secondary';
            document.getElementById('pdfEditorBtn').className = 'btn-secondary';
            document.getElementById('sundayBtn').className = 'btn-secondary';
            document.getElementById('studentsBtn').className = 'btn-secondary';
            document.getElementById('fairnessBtn').className = 'btn-secondary';

            // Show selected view and highlight button
            if (view === 'grid') {
                document.getElementById('gridView').classList.remove('hidden');
                document.getElementById('gridBtn').className = 'btn-primary';
                populateGridTypeDropdown();
                renderMonthScrollPills();
            } else if (view === 'pdfEditor') {
                document.getElementById('pdfEditorView').classList.remove('hidden');
                document.getElementById('pdfEditorBtn').className = 'btn-primary';
            } else if (view === 'sunday') {
                document.getElementById('sundayView').classList.remove('hidden');
                document.getElementById('sundayBtn').className = 'btn-primary';
            } else if (view === 'students') {
                document.getElementById('studentsView').classList.remove('hidden');
                document.getElementById('studentsBtn').className = 'btn-primary';
            } else if (view === 'fairness') {
                document.getElementById('fairnessView').classList.remove('hidden');
                document.getElementById('fairnessBtn').className = 'btn-primary';
            }
            render();
        }

        // Render
        function render() {
            if (currentView === 'grid') {
                renderGrid();
            } else if (currentView === 'pdfEditor') {
                renderPdfEditor();
            } else if (currentView === 'sunday') {
                renderSundayView();
            } else if (currentView === 'students') {
                renderStudentsView();
            } else if (currentView === 'fairness') {
                renderFairnessView();
            }
        }

        // Clear all assignments
        function clearAllAssignments() {
            if (!confirm('Are you sure you want to clear ALL assignments? This cannot be undone.')) return;
            pushAssignmentUndoState();
            assignments = [];
            saveData();
            render();
        }

        function startAutoAssign() {
            if (brothers.length === 0) { alert('No brothers yet. Import the Masterlist in the Students tab, or add them in Manage Selection.'); return; }
            const range = getAutoRange('grid');
            const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

            // Simulate by temporarily pushing accepted proposals into `assignments`
            // so the existing scoring engine accounts for prior picks (limits, fairness,
            // same-type penalty). We roll back before showing the preview — nothing saved.
            const originalAssignments = JSON.parse(JSON.stringify(assignments));
            const proposed = [];   // {date, type, brotherId, brotherName, score, monthLabel, dateLabel}
            const autoFrom = thursdayOfWeek(manilaTodayISO()); // v11: hindi pinupunan ang mga lumipas na linggo
            let unfilled = 0;
            gridShuffleKey = Object.fromEntries(brothers.map(b => [b.id, Math.random()])); // v15: bagong shuffle bawat takbo

            // v13: ang mga buwang pinili sa "Auto-assign from … to …"
            range.months.forEach(([selectedYear, month]) => {
                const thursdays = getThursdaysForMonthByWeekStart(selectedYear, month);
                thursdays.forEach(date => {
                    AUTO_FILL_ORDER.forEach(type => {
                        if (date < autoFrom) return; // lumipas na
                        if (!isSlotActive(date, type)) return; // walang pulong, o CBS kapag dalaw ng CO
                        // Skip if this slot already has an assignment (empty slots only)
                        const alreadyFilled = assignments.some(a => a.date === date && a.type === type);
                        if (alreadyFilled) return;

                        // Brothers already assigned/proposed on this SAME date (any type) — avoid double-booking in one week
                        const takenThisDate = new Set(assignments.filter(a => a.date === date).map(a => a.brotherId));

                        const suggestions = getSuggestionsForSlot(date, type) || [];
                        const pick = suggestions.find(s => !takenThisDate.has(s.brother.id));
                        if (!pick) { unfilled++; return; }

                        // Record proposal + temporarily commit for fairness in subsequent slots
                        assignments.push({ id: `tmp-${Date.now()}-${Math.random()}`, date, type, brotherId: pick.brother.id });
                        const dObj = new Date(date + 'T12:00:00+08:00');
                        proposed.push({
                            date, type,
                            brotherId: pick.brother.id,
                            brotherName: pick.brother.name,
                            score: pick.score,
                            monthLabel: `${monthNames[month]} ${selectedYear}`,
                            dateLabel: dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        });
                    });
                });
            });

            // Roll back temp assignments — nothing is saved until Apply
            assignments = originalAssignments;
            gridShuffleKey = null;

            autoAssignPreview = proposed;
            autoAssignUnfilled = unfilled;
            renderAutoAssignPreview();
            document.getElementById('autoAssignModal').classList.remove('hidden');
            document.body.classList.add('modal-open');
        }

        function renderAutoAssignPreview() {
            const container = document.getElementById('autoAssignContent');
            const summary = document.getElementById('autoAssignSummary');
            const applyBtn = document.getElementById('autoAssignApplyBtn');
            if (!container) return;

            const proposed = autoAssignPreview || [];
            if (proposed.length === 0) {
                container.innerHTML = '<div class="text-center py-8"><p class="text-gray-500">No empty slots to fill (or no eligible brothers).</p></div>';
                if (summary) summary.textContent = 'No proposals.';
                if (applyBtn) applyBtn.disabled = true;
                return;
            }
            if (applyBtn) applyBtn.disabled = false;
            if (summary) summary.textContent = `${getAutoRange('grid').label}: ${proposed.length} proposed assignment(s)` + (autoAssignUnfilled ? ` • ${autoAssignUnfilled} slot(s) with no eligible brother` : '') + ' • past weeks are never filled; brothers are kept out of back-to-back meetings where possible. When brothers are equally due, the pick is random — press 🔀 Shuffle Again for a different draw.';

            // Group by month, then by date
            const byMonth = {};
            proposed.forEach((p, idx) => {
                if (!byMonth[p.monthLabel]) byMonth[p.monthLabel] = {};
                if (!byMonth[p.monthLabel][p.dateLabel]) byMonth[p.monthLabel][p.dateLabel] = [];
                byMonth[p.monthLabel][p.dateLabel].push({ ...p, idx });
            });

            let html = '';
            Object.keys(byMonth).forEach(monthLabel => {
                html += `<div class="mb-4"><div class="font-bold text-gray-900 mb-2">${monthLabel}</div>`;
                Object.keys(byMonth[monthLabel]).forEach(dateLabel => {
                    html += `<div class="mb-2"><div class="text-xs font-semibold text-gray-600 mb-1">${dateLabel}</div>`;
                    byMonth[monthLabel][dateLabel].forEach(p => {
                        html += `<div class="flex items-center justify-between gap-2 border border-gray-200 rounded-lg p-2 mb-1 text-sm">
                            <div class="flex-1 min-w-0">
                                <span class="text-gray-600">${typeLabel(p.type)}:</span>
                                <span class="font-semibold text-gray-900">${p.brotherName}</span>
                                <span class="text-xs text-gray-500">(${p.score}%)</span>${loadTags(brothers.find(b => b.id === p.brotherId))}
                            </div>
                            <button onclick="removeAutoAssignItem(${p.idx})" class="remove-part-btn" title="Remove">✕</button>
                        </div>`;
                    });
                    html += `</div>`;
                });
                html += `</div>`;
            });
            container.innerHTML = html;
        }

        function removeAutoAssignItem(idx) {
            if (!autoAssignPreview) return;
            autoAssignPreview = autoAssignPreview.filter((_, i) => i !== idx);
            renderAutoAssignPreview();
        }

        function applyAutoAssign() {
            const proposed = autoAssignPreview || [];
            if (proposed.length === 0) { closeAutoAssignModal(); return; }
            pushAssignmentUndoState();
            proposed.forEach(p => {
                // Re-check the slot is still empty (safety) before assigning
                const stillEmpty = !assignments.some(a => a.date === p.date && a.type === p.type);
                if (stillEmpty) {
                    assignments.push({ id: `assignment-${Date.now()}-${Math.random()}`, date: p.date, type: p.type, brotherId: p.brotherId });
                }
            });
            saveData();
            autoAssignPreview = null;
            closeAutoAssignModal();
            render();
            alert(`Applied ${proposed.length} assignment(s). You can undo with ↩ Undo Last.`);
        }

        function closeAutoAssignModal() {
            document.getElementById('autoAssignModal').classList.add('hidden');
            document.body.classList.remove('modal-open');
        }

        function clearAssignmentsForSelectedMonth() {
            const monthStr = document.getElementById('monthSelect')?.value;
            if (!monthStr) {
                alert('Please select a month first.');
                return;
            }

            const [year, month] = monthStr.split('-').map(Number);
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;

            if (!confirm(`Clear all assignments for ${monthStr}?`)) return;

            pushAssignmentUndoState();

            const assignmentsBefore = assignments.length;
            const sundayAssignmentsBefore = sundayAssignments.length;
            assignments = assignments.filter(a => !a.date.startsWith(monthKey));
            sundayAssignments = sundayAssignments.filter(a => !a.date.startsWith(monthKey));

            saveData();
            render();

            const removedCount = (assignmentsBefore - assignments.length) + (sundayAssignmentsBefore - sundayAssignments.length);
            alert(`Cleared ${removedCount} assignment(s) for ${monthStr}.`);
        }

        // Populate assignment type dropdown for grid view
        function populateGridTypeDropdown() {
            const select = document.getElementById('gridAssignmentType');
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = '';
            ASSIGNMENT_TYPES.forEach((type, idx) => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = typeLabel(type);
                select.appendChild(option);
            });
            if (currentValue && ASSIGNMENT_TYPES.includes(currentValue)) {
                select.value = currentValue;
            }
        }

        // Get all Thursdays for the visible month range (grouped by week-start month)
        function getThursdaysForYear() {
            // v24: naka-key sa 'YYYY-MM', puwedeng tumawid ng taon
            const allThursdays = {};
            gridMonthList().forEach(({ key, y, m }) => { allThursdays[key] = getThursdaysForMonthByWeekStart(y, m); });
            return allThursdays;
        }

        // Render Assignments Grid View
        function updateGridSearch() {
            gridSearchTerm = (document.getElementById('gridSearchInput')?.value || '').toLowerCase().trim();
            renderGrid();
        }

        function renderGrid() {
            const arEl = document.getElementById('autoRangeGrid');
            if (arEl) arEl.innerHTML = renderAutoRangeControls();
            const container = document.getElementById('gridContainer');
            if (!container) return;

            const selectedType = document.getElementById('gridAssignmentType')?.value || ASSIGNMENT_TYPES[0];
            const thursdaysByMonth = getThursdaysForYear();
            const gridMonthsList = gridMonthList(); // v24

            if (brothers.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-8">No brothers yet. Import names in Brothers View first.</p>';
                return;
            }

            // Calculate max weeks per month for colspan
            let maxWeeks = {};
            for (const { key: m } of gridMonthsList) {
                maxWeeks[m] = thursdaysByMonth[m].length;
            }

            const legendEl = document.getElementById('gridLegend');
            if (legendEl) legendEl.innerHTML = renderGridLegend(selectedType);
            const thisThu = thursdayOfWeek(manilaTodayISO());
            const stuMap = studentTabPartsByName();
            let totalWeeks = 0;
            for (const { key: m } of gridMonthsList) totalWeeks += thursdaysByMonth[m].length;

            let html = renderS38ConflictBanner() + renderSpacingBanner() + '<table class="grid-table grid-v14">';
            
            // Header row 1: Month names
            html += '<thead><tr><th class="name-cell" rowspan="2">Name</th>';
            for (const { key: m } of gridMonthsList) {
                if (maxWeeks[m] > 0) {
                    html += `<th class="month-header${m.endsWith('-01') ? ' year-start' : ''}" colspan="${maxWeeks[m]}">${gridMonthLabel(m)}</th>`;
                }
            }
            html += '<th class="total-head" rowspan="2" title="All parts in the months shown (incl. Students tab)">Total</th></tr>';

            // Header row 2: Week numbers (dates)
            html += '<tr>';
            const selectedTypeIndex = ASSIGNMENT_TYPES.indexOf(selectedType);
            for (const { key: m } of gridMonthsList) {
                thursdaysByMonth[m].forEach((dateStr, idx) => {
                    const day = parseInt(dateStr.split('-')[2]);
                    // Check if this week has an assignment for the selected type
                    const hasAssignment = assignments.filter(a => a.date === dateStr && a.type === selectedType).length > 0;
                    const weekClass = (hasAssignment ? `week-type-${selectedTypeIndex}` : '') + (dateStr === thisThu ? ' now' : '') + (isNoMeetingWeek(dateStr) ? ' no-mtg' : '');
                    const headStyle = hasAssignment ? ` style="background:${gridTypeStyle(selectedType).head} !important"` : '';
                    html += `<th class="${weekClass}"${headStyle} title="${dateStr}${dateStr === thisThu ? ' (this week)' : ''}${hasAssignment ? ' ✓ ' + typeLabel(selectedType) + ' assigned' : ''}${isNoMeetingWeek(dateStr) ? ' — no meeting' : ''}">${day}</th>`;
                });
            }
            html += '</tr></thead>';

            // Collect all Thursdays in order for trail calculation and badge counts
            const allThursdaysList = [];
            for (const { key: m } of gridMonthsList) {
                thursdaysByMonth[m].forEach(d => allThursdaysList.push(d));
            }
            const visibleDatesSet = new Set(allThursdaysList);

            // Get current date for comparison
            const manilaStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
            const phTime = new Date(manilaStr);
            const todayStr = `${phTime.getFullYear()}-${String(phTime.getMonth() + 1).padStart(2, '0')}-${String(phTime.getDate()).padStart(2, '0')}`;

            // Body: one row per brother
            const sortedBrothers = [...brothers].sort((a, b) => {
                const aCategory = getBrotherCategory(a);
                const bCategory = getBrotherCategory(b);
                const aOrder = BROTHER_CATEGORIES.indexOf(aCategory);
                const bOrder = BROTHER_CATEGORIES.indexOf(bCategory);

                if (aOrder !== bOrder) return aOrder - bOrder;
                return a.name.localeCompare(b.name);
            });

            const filteredBrothers = gridSearchTerm
                ? sortedBrothers.filter(b => b.name.toLowerCase().includes(gridSearchTerm))
                : sortedBrothers;

            html += '<tbody>';
            const GROUP_LABEL = { Elder: 'ELDERS', MS: 'MINISTERIAL SERVANTS', Brother: 'BROTHERS — CBS Reader only' };
            const BADGE = { Elder: ['E', 'gb-e'], MS: ['MS', 'gb-ms'], Brother: ['B', 'gb-b'] };
            let lastGroup = null;
            filteredBrothers.forEach((brother, rowIdx) => {
                const rowClass = getBrotherRowClass(brother, rowIdx);
                const cat = getBrotherCategory(brother);
                if (cat !== lastGroup) {
                    lastGroup = cat;
                    const n = filteredBrothers.filter(b => getBrotherCategory(b) === cat).length;
                    html += `<tr class="grid-group"><td class="name-cell">${GROUP_LABEL[cat] || escHtml(cat || 'OTHER')} <span class="gg-n">${n}</span></td><td colspan="${totalWeeks + 1}"></td></tr>`;
                }
                const [bLbl, bCls] = BADGE[cat] || ['?', 'gb-b'];
                // Lahat ng petsang may bahagi (grid + Students tab) — para sa pulang singsing at Total
                const myGrid = assignments.filter(a => a.brotherId === brother.id && !isNoMeetingWeek(a.date));
                const myStu = stuMap[normalizeBrotherName(brother.name)] || [];
                const partDates = new Set(myGrid.map(a => a.date).concat(myStu.map(s => s.date)));
                const isB2B = d => partDates.has(d) && ((() => { const p = adjacentMeeting(d, -1), n = adjacentMeeting(d, 1); return (p && partDates.has(p)) || (n && partDates.has(n)); })());
                const visibleTotal = myGrid.filter(a => visibleDatesSet.has(a.date)).length + myStu.filter(s => visibleDatesSet.has(s.date)).length;
                
                // Find the LAST assignment date for this brother FOR THE SELECTED TYPE ONLY
                const brotherTypeAssignments = assignments.filter(a => 
                    a.brotherId === brother.id && a.type === selectedType
                );
                let lastTypeAssignmentDate = null;
                if (brotherTypeAssignments.length > 0) {
                    lastTypeAssignmentDate = brotherTypeAssignments
                        .map(a => a.date)
                        .sort()
                        .reverse()[0]; // Get the most recent date for this type
                }

                const visibleTypeAssignmentsCount = assignments.filter(a => 
                    a.brotherId === brother.id &&
                    a.type === selectedType &&
                    visibleDatesSet.has(a.date)
                ).length;
                const countBadge = visibleTypeAssignmentsCount > 0 ? `<span class="ml-2 inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-gray-700">${visibleTypeAssignmentsCount}</span>` : '';
                const broOnlyRow = !categoryAllowsType(brother, selectedType);
                const readerRow = !broOnlyRow && selectedType === 'CBS Reader' && getBrotherCategory(brother) === 'Elder';
                const elderOnlyRow = broOnlyRow || readerRow || (requiresElder(null, selectedType) && getBrotherCategory(brother) !== 'Elder');
                const lockTag = broOnlyRow ? 'CBS Reader only' : readerRow ? 'MS & Brothers only' : 'elder only';
                const lockTitle = broOnlyRow ? 'Brothers (not Elder/MS): CBS Reader only' : readerRow ? 'CBS Reader goes to ministerial servants and brothers' : 'S-38: elder only for this assignment';
                html += `<tr class="${elderOnlyRow ? 'row-elder-only' : ''}"><td class="name-cell ${rowClass}" ${elderOnlyRow ? `title="${lockTitle}"` : ''}><span class="gbadge ${bCls}">${bLbl}</span>${brother.name}${loadTags(brother)}${countBadge}${elderOnlyRow ? `<span class="elder-only-tag">${lockTag}</span>` : ''}</td>`;
                
                for (const { key: m } of gridMonthsList) {
                    thursdaysByMonth[m].forEach(dateStr => {
                        // Find ANY assignment for this brother on this date
                        const assignmentOnDate = assignments.find(a => 
                            a.date === dateStr && 
                            a.brotherId === brother.id
                        );
                        const allOnDate = assignments.filter(a => a.date === dateStr && a.brotherId === brother.id);
                        const stuOnDate = isNoMeetingWeek(dateStr) ? [] : myStu.filter(s => s.date === dateStr);
                        const ring = isB2B(dateStr) ? ' gchip-b2b' : '';
                        let chips = allOnDate.map(a => { const st = gridTypeStyle(a.type); const mr = !ring && monthRepeatOf(brother.id, a.date, a.type);
                                return gridChip(st.code, st.bg, st.fg, ring + (mr ? ' gchip-month' : ''), typeLabel(a.type) + (mr ? ` — ⚠ same part as his ${mr.date < a.date ? 'last' : 'next'} one (${shortDate(mr.date)})` : '')); }).join('') +
                            stuOnDate.map(s => gridChip(studentChipCode(s.label), GRID_STU_STYLE.bg, GRID_STU_STYLE.fg, 'gchip-stu' + ring, s.label + ' (Students tab)')).join('');
                        
                        let cellClass = '';
                        let trailInfo = '';
                        
                        // Check if brother has a Sunday assignment for this week
                        const hasSunday = hasSundayAssignment(brother.id, dateStr);
                        const sundayClass = hasSunday ? 'sunday-indicator' : '';
                        const sundayInfo = hasSunday ? ' - ☀️ Has Sunday Assignment' : '';
                        
                        if (assignmentOnDate || stuOnDate.length) {
                            // v14: puting cell + chip na may code (hindi na buong kulay ang cell)
                            cellClass = assignmentOnDate ? `type-${ASSIGNMENT_TYPES.indexOf(assignmentOnDate.type)} has-part` : 'has-part';
                        } else {
                            // Show trailing color FROM January 1 TO the latest assignment for this type
                            // Trail extends to future dates (for advance assignments)
                            // This helps identify who has the least assignments for this type:
                            // - Long trail = assigned far into future = low priority
                            // - Short trail = last assignment was early = needs assignment soon
                            // - No trail (white) = never assigned this type = HIGH priority
                            
                            if (lastTypeAssignmentDate !== null && dateStr <= lastTypeAssignmentDate) {
                                // Show trail FROM start UP TO the last assignment date (including future)
                                cellClass = `trail-type-${selectedTypeIndex}`;
                                trailInfo = ` (${typeLabel(selectedType)} trail → last: ${lastTypeAssignmentDate})`;
                            }
                            // Dates AFTER last assignment or never assigned = no trail (white) - easy to identify
                        }
                        
                        const trailStyle = cellClass.startsWith('trail-type') ? ` style="background:${gridTypeStyle(selectedType).trail}"` : '';
                        const what = allOnDate.map(a => typeLabel(a.type)).concat(stuOnDate.map(s => s.label)).join(', ');
                        html += `<td class="week-cell ${cellClass} ${sundayClass}${dateStr === thisThu ? ' now' : ''}${isNoMeetingWeek(dateStr) ? ' no-mtg' : ''}"${trailStyle} 
                            onclick="toggleGridAssignment('${dateStr}', '${selectedType}', '${brother.id}')" 
                            title="${brother.name} - ${dateStr}${what ? ' (' + what + ')' : trailInfo}${ring ? ' — ⚠ also has a part the meeting before/after' : ''}${sundayInfo}">${chips}</td>`;
                    });
                }
                html += `<td class="total-cell">${visibleTotal || ''}</td></tr>`;
            });
            html += '</tbody></table>';

            container.innerHTML = html;
        }

        // Toggle assignment from grid cell click
        function toggleGridAssignment(date, type, brotherId) {
            pushAssignmentUndoState();
            const existingIndex = assignments.findIndex(a => 
                a.date === date && a.type === type && a.brotherId === brotherId
            );

            if (existingIndex >= 0) {
                // Remove assignment
                assignments.splice(existingIndex, 1);
            } else {
                // S-38: kumpirmahin kapag hindi elder sa Chairman/CBS
                if (!checkBrotherRule(brotherId, type)) return;
                if (!confirmElderOnly(brotherId, type, date)) return;
                if (!confirmRoleRule(brotherId, type, date)) return;
                if (!confirmSpecialWeek(date, type)) return;
                if (!confirmSpacing(brotherId, date, type)) return;

                // Check monthly limit
                const [year, month] = date.split('-');
                const monthKey = `${year}-${month}`;
                const monthCount = assignments.filter(a => a.brotherId === brotherId && a.date.startsWith(monthKey)).length;

                if (monthCount >= 3) {
                    alert('Cannot assign - this brother already has 3 assignments this month.');
                    return;
                }

                // For non-Pamumuhay types, remove existing assignment for that slot first
                if (type !== 'Pamumuhay') {
                    const existingSlot = assignments.findIndex(a => a.date === date && a.type === type);
                    if (existingSlot >= 0) {
                        assignments.splice(existingSlot, 1);
                    }
                }

                // Add new assignment
                assignments.push({
                    id: `assignment-${Date.now()}-${Math.random()}`,
                    date,
                    type,
                    brotherId
                });
            }

            saveData();
            renderGrid();
        }


        function handleSundaySelect(event, thursday) {
            const brotherId = event.target.value;
            if (brotherId) {
                toggleSundayAssignment(brotherId, thursday);
                event.target.value = '';
            }
        }


        // Show brother details modal


        // Export data to JSON file
        // ==================== BACKUP FOLDER SAVE (File System Access API) ====================
        // Persists a chosen directory handle in IndexedDB so exports go straight to the
        // user's backups folder after a one-time pick. Falls back to a normal download
        // when the API is unavailable (file://, Firefox, Safari) or the user cancels.
        function idbOpen() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open('nc_fs', 1);
                req.onupgradeneeded = () => { req.result.createObjectStore('handles'); };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }
        async function idbGetHandle(key = 'backupDir') {
            try {
                const db = await idbOpen();
                return await new Promise((resolve) => {
                    const tx = db.transaction('handles', 'readonly');
                    const r = tx.objectStore('handles').get(key);
                    r.onsuccess = () => resolve(r.result || null);
                    r.onerror = () => resolve(null);
                });
            } catch (e) { return null; }
        }
        async function idbSetHandle(handle, key = 'backupDir') {
            try {
                const db = await idbOpen();
                const tx = db.transaction('handles', 'readwrite');
                if (handle) tx.objectStore('handles').put(handle, key); else tx.objectStore('handles').delete(key);
            } catch (e) { /* ignore */ }
        }

        function downloadBlobFallback(filename, blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // v27: pangkalahatang pag-save sa isang folder na pinili minsan (naaalala sa IndexedDB sa ilalim ng `key`)
        let lastSaveFolderName = '';
        async function saveToDir(key, pickerId, filename, blob, startInKey, subfolder) {
            lastSaveFolderName = '';
            // Fallback path when the API is not available (e.g. file://, unsupported browser)
            if (!window.showDirectoryPicker) {
                downloadBlobFallback(filename, blob);
                return 'download';
            }
            try {
                let dir = await idbGetHandle(key);
                // Verify/request permission on the stored handle
                if (dir) {
                    const perm = await dir.queryPermission({ mode: 'readwrite' });
                    if (perm !== 'granted') {
                        const req = await dir.requestPermission({ mode: 'readwrite' });
                        if (req !== 'granted') dir = null;
                    }
                }
                // First time (or permission lost): ask the user to pick the folder once
                if (!dir) {
                    const opts = { id: pickerId, mode: 'readwrite' };
                    const near = startInKey ? await idbGetHandle(startInKey) : null;
                    if (near) opts.startIn = near;
                    dir = await window.showDirectoryPicker(opts);
                    await idbSetHandle(dir, key);
                }
                // v31: isang subfolder sa loob ng piniling folder (hal. "backups") — ginagawa kung wala pa.
                // Kung ang mismong piniling folder ay may ganoong pangalan na, doon na mismo (hindi backups\backups).
                if (subfolder && String(dir.name || '').toLowerCase() !== subfolder.toLowerCase()) {
                    dir = await dir.getDirectoryHandle(subfolder, { create: true });
                }
                const fileHandle = await dir.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                lastSaveFolderName = dir.name || '';
                return 'folder';
            } catch (e) {
                // User cancelled the picker, or a write error — fall back to normal download
                downloadBlobFallback(filename, blob);
                return 'download';
            }
        }
        async function saveToBackups(filename, blob) {
            return saveToDir('backupDir', 'ncBackups', filename, blob);
        }
        // v31/v32: ang JSON backup at Excel export ay sa "backups" subfolder (hal. new-cong-files\backups), hindi na nakakalat sa labas
        const BACKUP_SUBFOLDER = 'backups';
        async function saveBackupJson(filename, blob) {
            return saveToDir('backupDir', 'ncBackups', filename, blob, null, BACKUP_SUBFOLDER);
        }
        // v27: S-140 PDF → folder na "schedule" (pipiliin minsan; nagsisimula malapit sa backups folder)
        async function saveToSchedule(filename, blob) {
            return saveToDir('scheduleDir', 'ncSchedule', filename, blob, 'backupDir');
        }
        async function changeScheduleFolder() {
            await idbSetHandle(null, 'scheduleDir');
            alert('Next time you export the S-140 or S-89 slips, the app will ask you to pick the folder again.\n\nPick: Coding\\new-cong-files\\schedule');
        }

        async function exportData() {
            const data = {
                exportDate: new Date().toISOString(),
                version: '1.1',
                brothers: brothers,
                assignments: assignments,
                sundayAssignments: sundayAssignments,
                brotherEligibility: brotherEligibility,
                people: people,
                meetingEditorData: meetingEditorData,
                studentSettings: studentSettings,
                meetingSettings: meetingSettings
            };
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const dateStr = new Date().toISOString().slice(0, 10);
            const where = await saveBackupJson(`new-cong-tracker-backup-${dateStr}.json`, blob);
            localStorage.setItem('nc_lastBackup', new Date().toISOString());
            const _br = document.getElementById('backupReminder'); if (_br) _br.classList.add('hidden');
            alert(where === 'folder' ? `Backup saved to the "${lastSaveFolderName || BACKUP_SUBFOLDER}" folder!\n(new-cong-tracker-backup-${dateStr}.json)` : 'Data exported successfully! The file has been downloaded.');
        }

        // Export to Excel with colored grids and separate sheets per category

        // ==================== v33: mga estudyante sa Excel export ====================
        // Tatlong sheet: "Student Parts" (lahat ng bahagi ayon sa petsa), "Students Grid" (bawat tao × linggo, BR/ST/AS),
        // "Students Summary" (ilang beses estudyante / assistant, huling bahagi, ilang linggo nang naghihintay).
        const XL_GOLD = 'BE8900', XL_GOLD_DARK = '92400E', XL_GOLD_PALE = 'FEF3C7', XL_NAVY = '1E3A5F';
        function xlCell(v, o = {}) {
            const isNum = typeof v === 'number';
            const c = { v: v ?? '', t: isNum ? 'n' : 's', s: {
                font: { color: { rgb: o.fg || '111827' }, bold: !!o.b, italic: !!o.i, sz: o.sz || 11 },
                alignment: { horizontal: o.al || 'left', vertical: 'center', wrapText: !!o.wrap },
                border: { top: { style: 'thin', color: { rgb: 'D1D5DB' } }, bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                          left: { style: 'thin', color: { rgb: 'D1D5DB' } }, right: { style: 'thin', color: { rgb: 'D1D5DB' } } } } };
            if (o.bg) c.s.fill = { fgColor: { rgb: o.bg } };
            return c;
        }
        function xlDate(d) { return new Date(d + 'T12:00:00+08:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
        function studentExcelWeeks() {
            return Object.keys(meetingEditorData).map(k => (k.match(/^week_(\d{4}-\d{2}-\d{2})$/) || [])[1]).filter(Boolean).sort()
                .filter(d => { const md = meetingEditorData[getMeetingEditorKey(d)] || {};
                    return isNoMeetingWeek(d) || md.bibleReadingName || md.bibleReading || (md.ministryParts || []).length; });
        }
        function buildStudentExcelSheets() {
            const res = { sheets: [], hasData: false, partCount: 0, personCount: 0 };
            if (typeof XLSX === 'undefined') return res;
            const weeks = studentExcelWeeks();
            const today = manilaTodayISO(), nowThu = thursdayOfWeek(today);
            const roleOf = p => (p ? (p.gender === 'Brother' || p.gender === 'Sister' ? p.gender : '') : '');
            const nameOf = (id, typed) => { const p = id ? getPerson(id) : null; return p ? personLabel(p) : (typed || '').trim(); };

            // ---- 1. Student Parts (talaan ayon sa petsa) ----
            const rows = [];
            rows.push([xlCell('Student Parts — Our Christian Life and Ministry', { bg: XL_GOLD, fg: 'FFFFFF', b: 1, sz: 13 })]);
            rows.push(['Thursday', '#', 'Part', 'Title (workbook)', 'Student', 'Assistant', 'Note'].map(h => xlCell(h, { bg: XL_NAVY, fg: 'FFFFFF', b: 1, al: 'center' })));
            const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
            let lastMonth = '';
            // lumipas na linggo na walang kahit isang pangalan (hal. test data bago ang kongregasyon) — hindi na isasama
            const anyName = md => !!((md.bibleReadingName || '').trim() || (md.ministryParts || []).some(p => (p.name || '').trim() || (p.assistant || '').trim()));
            weeks.filter(d => d >= nowThu || isNoMeetingWeek(d) || anyName(meetingEditorData[getMeetingEditorKey(d)] || {})).forEach(d => {
                const ym = d.slice(0, 7);
                if (ym !== lastMonth) {
                    lastMonth = ym;
                    const label = new Date(d + 'T12:00:00+08:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
                    rows.push([xlCell(label, { bg: XL_GOLD_PALE, fg: XL_GOLD_DARK, b: 1 }), ...Array(6).fill(0).map(() => xlCell('', { bg: XL_GOLD_PALE }))]);
                    merges.push({ s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 6 } });
                }
                const past = d < nowThu;
                const zebra = past ? 'F3F4F6' : 'FFFFFF', dim = past ? '6B7280' : '111827';
                const md = meetingEditorData[getMeetingEditorKey(d)] || {};
                if (isNoMeetingWeek(d)) {
                    rows.push([xlCell(xlDate(d), { bg: zebra, fg: dim, b: 1 }), xlCell('', { bg: zebra }), xlCell('No meeting', { bg: zebra, fg: dim, i: 1 }),
                        xlCell(String(weekTypeText(d) || ''), { bg: zebra, fg: dim, i: 1 }), xlCell('', { bg: zebra }), xlCell('', { bg: zebra }), xlCell('', { bg: zebra })]);
                    return;
                }
                const line = (no, part, title, stu, asst, note) => {
                    rows.push([xlCell(xlDate(d), { bg: zebra, fg: dim, b: 1 }), xlCell(no, { bg: zebra, fg: dim, al: 'center' }), xlCell(part, { bg: zebra, fg: dim }),
                        xlCell(title, { bg: zebra, fg: dim }), xlCell(stu || '—', { bg: stu ? zebra : 'FEF2F2', fg: stu ? dim : 'B91C1C', b: !!stu }),
                        xlCell(asst, { bg: zebra, fg: dim }), xlCell(note || (past ? 'past' : ''), { bg: zebra, fg: note ? 'B45309' : '9CA3AF', i: 1 })]);
                    if (stu) res.partCount++;
                };
                line(3, 'Bible Reading', ['Pagbabasa ng Bibliya', md.bibleReading].filter(Boolean).join(' — '), nameOf(md.bibleReadingId, md.bibleReadingName), '',
                    (md.bibleReadingName || '').trim() ? '' : (past ? '' : 'no name yet'));
                (md.ministryParts || []).forEach((p, i) => {
                    const kind = getPartKind(p), K = STUDENT_KINDS[kind] || STUDENT_KINDS.unknown;
                    const stu = nameOf(p.studentId, p.name);
                    const asst = K.assistant ? nameOf(p.assistantId, p.assistant) : '';
                    let note = '';
                    if (kind === 'discussion') note = 'Elder/MS (not a student part)';
                    else if (!stu && !past) note = 'no name yet';
                    else if (K.assistant && stu && !asst && !past) note = 'no assistant yet';
                    if (kind === 'discussion') {
                        rows.push([xlCell(xlDate(d), { bg: zebra, fg: dim, b: 1 }), xlCell(partNumberOf(p.title, 4 + i), { bg: zebra, fg: dim, al: 'center' }), xlCell('Discussion', { bg: zebra, fg: dim }),
                            xlCell(titleText(p.title), { bg: zebra, fg: dim }), xlCell(stu, { bg: zebra, fg: dim }), xlCell('', { bg: zebra }), xlCell(note, { bg: zebra, fg: '6B7280', i: 1 })]);
                        return;
                    }
                    line(partNumberOf(p.title, 4 + i), K.short, titleText(p.title), stu, asst, note);
                });
            });
            const ws1 = XLSX.utils.aoa_to_sheet(rows);
            ws1['!cols'] = [{ wch: 14 }, { wch: 4 }, { wch: 24 }, { wch: 52 }, { wch: 26 }, { wch: 26 }, { wch: 26 }];
            ws1['!merges'] = merges;
            ws1['!freeze'] = { xSplit: 0, ySplit: 2 };
            ws1['!views'] = [{ state: 'frozen', ySplit: 2 }];

            // ---- 2. Students Grid (tao × linggo) ----
            const hist = buildStudentHistory();
            const meetWeeks = weeks.filter(d => !isNoMeetingWeek(d) && (d >= nowThu || anyName(meetingEditorData[getMeetingEditorKey(d)] || {})));
            const inRotation = p => p.active !== false && p.gender && (p.atas !== 'Elder' || studentSettings.includeElders);
            const pool = people.filter(p => inRotation(p) || (hist[p.id] || []).length);
            const sortP = (a, b) => (a.gender === b.gender ? 0 : a.gender === 'Brother' ? -1 : 1) || personLabel(a).localeCompare(personLabel(b));
            pool.sort(sortP);
            res.personCount = pool.length;
            const g = [];
            g.push([xlCell('Students Grid — BR = Bible Reading · ST = Student · AS = Assistant', { bg: XL_GOLD, fg: 'FFFFFF', b: 1 })]);
            const monthRow = [xlCell('Name', { bg: XL_NAVY, fg: 'FFFFFF', b: 1 }), xlCell('', { bg: XL_NAVY })];
            const dayRow = [xlCell('', { bg: XL_NAVY }), xlCell('B/S', { bg: XL_NAVY, fg: 'FFFFFF', b: 1, al: 'center' })];
            let pm = '';
            meetWeeks.forEach(d => {
                const ym = d.slice(0, 7);
                monthRow.push(xlCell(ym !== pm ? new Date(d + 'T12:00:00+08:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '', { bg: '2563EB', fg: 'FFFFFF', b: 1, al: 'center' }));
                pm = ym;
                dayRow.push(xlCell(String(+d.slice(8)), { bg: d === nowThu ? '2563EB' : XL_NAVY, fg: 'FFFFFF', b: 1, al: 'center' }));
            });
            monthRow.push(xlCell('Student', { bg: XL_GOLD_DARK, fg: 'FFFFFF', b: 1, al: 'center' }), xlCell('Assistant', { bg: XL_GOLD_DARK, fg: 'FFFFFF', b: 1, al: 'center' }));
            dayRow.push(xlCell('', { bg: XL_GOLD_DARK }), xlCell('', { bg: XL_GOLD_DARK }));
            g.push(monthRow, dayRow);
            let prevG = null;
            pool.forEach((p, idx) => {
                if (p.gender !== prevG) {
                    prevG = p.gender;
                    g.push([xlCell(p.gender === 'Brother' ? 'BROTHERS' : p.gender === 'Sister' ? 'SISTERS' : 'NO BROTHER/SISTER SET', { bg: 'E5E7EB', fg: '374151', b: 1 })]);
                }
                const bg = idx % 2 ? 'F9FAFB' : 'FFFFFF';
                const ev = hist[p.id] || [];
                const row = [xlCell(personLabel(p) + (p.pioneer ? ' (RP)' : ''), { bg, b: 1 }), xlCell(p.gender === 'Brother' ? 'B' : p.gender === 'Sister' ? 'S' : '', { bg, al: 'center' })];
                meetWeeks.forEach(d => {
                    const e = ev.filter(x => x.date === d);
                    const code = e.map(x => x.role === 'Assistant' ? 'AS' : x.kind === 'bible' ? 'BR' : 'ST').join('/');
                    row.push(code ? xlCell(code, { bg: XL_GOLD_PALE, fg: XL_GOLD_DARK, b: 1, al: 'center' }) : xlCell('', { bg }));
                });
                row.push(xlCell(ev.filter(x => x.role === 'Estudyante').length, { bg: 'FFF7ED', fg: XL_GOLD_DARK, b: 1, al: 'center' }),
                    xlCell(ev.filter(x => x.role === 'Assistant').length, { bg: 'FFF7ED', fg: XL_GOLD_DARK, al: 'center' }));
                g.push(row);
            });
            const ws2 = XLSX.utils.aoa_to_sheet(g);
            ws2['!cols'] = [{ wch: 28 }, { wch: 5 }, ...meetWeeks.map(() => ({ wch: 5 })), { wch: 9 }, { wch: 10 }];
            ws2['!views'] = [{ state: 'frozen', xSplit: 2, ySplit: 3 }];

            // ---- 3. Students Summary ----
            const s = [];
            s.push([xlCell(`Students Summary — as of ${xlDate(today)}`, { bg: XL_GOLD, fg: 'FFFFFF', b: 1, sz: 13 })]);
            s.push(['Name', 'B/S', 'RP', 'Role', 'As student', 'As assistant', 'Bible readings', 'Last student part', 'Weeks since', 'Next part', 'Status']
                .map(h => xlCell(h, { bg: XL_NAVY, fg: 'FFFFFF', b: 1, al: 'center', wrap: true })));
            const rowsS = pool.map(p => {
                const ev = hist[p.id] || [];
                const past = ev.filter(e => e.date <= today);
                const lastStu = past.find(e => e.role === 'Estudyante') || null;
                const next = [...ev].reverse().find(e => e.date > today) || null;
                const wait = lastStu ? weeksBetween(lastStu.date, nowThu) : null;
                let status = '', sbg = 'FFFFFF', sfg = '111827';
                if (!inRotation(p)) { status = p.active === false ? 'inactive' : 'not in rotation'; sfg = '6B7280'; }
                else if (!lastStu && !next) { status = '🔴 never had a part'; sbg = 'FEE2E2'; sfg = 'B91C1C'; }
                else if (lastStu && !next && wait >= FAIR_WAIT_WEEKS) { status = `🟡 waiting ${wait} weeks`; sbg = 'FEF3C7'; sfg = '92400E'; }
                else if (next) { status = 'scheduled'; sfg = '15803D'; }
                return { p, ev, lastStu, next, wait, status, sbg, sfg };
            });
            rowsS.sort((a, b) => sortP(a.p, b.p));
            rowsS.forEach((r, idx) => {
                const bg = idx % 2 ? 'F9FAFB' : 'FFFFFF';
                const kindName = e => e ? (e.kind === 'bible' ? 'Bible Reading' : (STUDENT_KINDS[e.kind]?.short || 'Student part')) : '';
                s.push([xlCell(personLabel(r.p), { bg, b: 1 }), xlCell(roleOf(r.p), { bg, al: 'center' }), xlCell(r.p.pioneer ? 'RP' : '', { bg, al: 'center' }),
                    xlCell(r.p.atas || '', { bg, al: 'center' }),
                    xlCell(r.ev.filter(e => e.role === 'Estudyante').length, { bg, al: 'center', b: 1 }),
                    xlCell(r.ev.filter(e => e.role === 'Assistant').length, { bg, al: 'center' }),
                    xlCell(r.ev.filter(e => e.kind === 'bible').length, { bg, al: 'center' }),
                    xlCell(r.lastStu ? `${xlDate(r.lastStu.date)} · ${kindName(r.lastStu)}` : '—', { bg }),
                    xlCell(r.wait ?? '', { bg, al: 'center' }),
                    xlCell(r.next ? `${xlDate(r.next.date)} · ${r.next.role === 'Assistant' ? 'Assistant' : kindName(r.next)}` : '', { bg }),
                    xlCell(r.status, { bg: r.sbg, fg: r.sfg, b: 1 })]);
            });
            const ws3 = XLSX.utils.aoa_to_sheet(s);
            ws3['!cols'] = [{ wch: 28 }, { wch: 8 }, { wch: 5 }, { wch: 13 }, { wch: 10 }, { wch: 11 }, { wch: 10 }, { wch: 34 }, { wch: 9 }, { wch: 34 }, { wch: 22 }];
            ws3['!views'] = [{ state: 'frozen', ySplit: 2 }];

            res.hasData = res.partCount > 0 || people.length > 0;
            if (res.hasData) res.sheets = [{ name: 'Students Summary', ws: ws3 }, { name: 'Student Parts', ws: ws1 }, { name: 'Students Grid', ws: ws2 }];
            return res;
        }

        async function exportToExcel() {
            if (typeof XLSX === 'undefined') {
                alert('Excel library not loaded. Please check your internet connection and refresh the page.');
                return;
            }

            // Color mapping for each assignment type (Excel hex colors without #)
            // v14: kapareho ng kulay sa Assignments tab
            const typeColors = {};
            ASSIGNMENT_TYPES.forEach(t => { const st = gridTypeStyle(t); typeColors[t] = { bg: st.bg.slice(1), header: st.head.slice(1), fg: st.fg.slice(1) }; });

            // Get all weeks from assignments (sorted)
            const allWeeks = [...new Set(assignments.map(a => a.date))].sort();
            loadMeetingEditorData();
            const stuSheets = buildStudentExcelSheets();   // v33: mga estudyante (Students tab)
            if (allWeeks.length === 0 && !stuSheets.hasData) {
                alert('No assignments to export yet.');
                return;
            }

            // Group weeks by month for column headers
            const weeksByMonth = {};
            allWeeks.forEach(week => {
                const [year, month] = week.split('-');
                const monthKey = `${year}-${month}`;
                if (!weeksByMonth[monthKey]) weeksByMonth[monthKey] = [];
                weeksByMonth[monthKey].push(week);
            });

            // Create workbook
            const wb = XLSX.utils.book_new();

            // Helper: create cell with style
            function styledCell(value, bgColor, fontColor = '000000', bold = false) {
                return {
                    v: value,
                    t: 's',
                    s: {
                        fill: { fgColor: { rgb: bgColor } },
                        font: { color: { rgb: fontColor }, bold: bold },
                        alignment: { horizontal: 'center', vertical: 'center' },
                        border: {
                            top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                            bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                            left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                            right: { style: 'thin', color: { rgb: 'D1D5DB' } }
                        }
                    }
                };
            }

            // Create sheet for each assignment type
            ASSIGNMENT_TYPES.forEach(type => {
                const typeAssignments = assignments.filter(a => a.type === type);
                const colors = typeColors[type] || { bg: 'F3F4F6', header: '374151' };
                
                // Lighter trail colors per type (for cells before the last assignment)
                const trailColors = {};
                ASSIGNMENT_TYPES.forEach(t => { trailColors[t] = gridTypeStyle(t).trail.slice(1); });
                const trailBg = trailColors[type] || 'F9FAFB';


                let sheetBrothers = brothers.filter(b => isSelectableForAssignment(b) && brotherEligibility[b.id]?.[type] !== false &&
                    ((!(requiresElder(null, type) && getBrotherCategory(b) !== 'Elder') && categoryAllowsType(b, type) && !(type === 'CBS Reader' && getBrotherCategory(b) === 'Elder')) || typeAssignments.some(a => a.brotherId === b.id)));

                // Build data array
                const data = [];
                
                // Header row 1: Assignment Type Title
                data.push([styledCell(typeLabel(type), colors.header, 'FFFFFF', true)]);
                
                // Header row 2: Month headers spanning multiple columns
                const monthRow = [styledCell('Brother', '1E3A5F', 'FFFFFF', true)];
                Object.keys(weeksByMonth).sort().forEach(monthKey => {
                    const [year, month] = monthKey.split('-');
                    const monthName = new Date(year, parseInt(month) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
                    const weeks = weeksByMonth[monthKey];
                    // Add month name for first week, empty for rest
                    weeks.forEach((_, i) => {
                        monthRow.push(styledCell(i === 0 ? monthName : '', '2563EB', 'FFFFFF', true));
                    });
                });
                data.push(monthRow);
                
                // Header row 3: Week dates
                const weekRow = [styledCell('', '1E3A5F', 'FFFFFF', true)];
                allWeeks.forEach(week => {
                    const [, , day] = week.split('-');
                    weekRow.push(styledCell(day, '1E3A5F', 'FFFFFF', true));
                });
                data.push(weekRow);
                
                // Data rows: one per brother
                const sortedBrothers = [...sheetBrothers].sort((a, b) => a.name.localeCompare(b.name));
                sortedBrothers.forEach((brother, idx) => {
                    const row = [];
                    const rowBg = idx % 2 === 0 ? 'FFFFFF' : 'F9FAFB';
                    
                    // Brother name
                    row.push(styledCell(brother.name, rowBg, '111827', true));
                    
                    // Find last assignment date for this brother & type (for trail)
                    const brotherTypeAssignments = typeAssignments.filter(a => a.brotherId === brother.id);
                    let lastAssignmentDate = null;
                    if (brotherTypeAssignments.length > 0) {
                        lastAssignmentDate = brotherTypeAssignments.map(a => a.date).sort().reverse()[0];
                    }

                    // Check each week
                    allWeeks.forEach(week => {
                        const hasAssignment = brotherTypeAssignments.some(a => a.date === week);
                        
                        if (hasAssignment) {
                            row.push(styledCell(gridTypeStyle(type).code, colors.bg, colors.fg || '000000', true));
                        } else if (lastAssignmentDate && week <= lastAssignmentDate) {
                            // Trail: lighter color for weeks before the last assignment
                            row.push(styledCell('', trailBg, '000000', false));
                        } else {
                            row.push(styledCell('', rowBg, '000000', false));
                        }
                    });
                    
                    data.push(row);
                });
                
                // Create worksheet
                const ws = XLSX.utils.aoa_to_sheet(data);
                
                // Set column widths
                const colWidths = [{ wch: 25 }]; // Brother name column
                allWeeks.forEach(() => colWidths.push({ wch: 5 })); // Week columns
                ws['!cols'] = colWidths;
                
                // Add sheet to workbook (sheet name limited to 31 chars)
                const sheetName = typeLabel(type).substring(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            // Create Summary sheet
            const summaryData = [];
            summaryData.push([styledCell('Assignment Summary', '1E3A5F', 'FFFFFF', true)]);
            summaryData.push([styledCell('', 'FFFFFF')]);
            
            // Header
            const summaryHeader = [styledCell('Brother', '374151', 'FFFFFF', true)];
            ASSIGNMENT_TYPES.forEach(type => {
                const colors = typeColors[type] || { bg: 'F3F4F6', header: '374151' };
                summaryHeader.push(styledCell(typeLabel(type), colors.header, 'FFFFFF', true));
            });
            summaryHeader.push(styledCell('Total', '1E3A5F', 'FFFFFF', true));
            summaryData.push(summaryHeader);
            
            // Brother rows
            const sortedBrothers = [...brothers].sort((a, b) => a.name.localeCompare(b.name));
            sortedBrothers.forEach((brother, idx) => {
                const row = [];
                const rowBg = idx % 2 === 0 ? 'FFFFFF' : 'F9FAFB';
                row.push(styledCell(brother.name, rowBg, '111827', true));
                
                let total = 0;
                ASSIGNMENT_TYPES.forEach(type => {
                    const colors = typeColors[type] || { bg: 'F3F4F6', header: '374151' };
                    const count = assignments.filter(a => 
                        a.brotherId === brother.id && a.type === type
                    ).length;
                    total += count;
                    row.push(styledCell(count > 0 ? count.toString() : '', count > 0 ? colors.bg : rowBg, '000000', count > 0));
                });
                row.push(styledCell(total.toString(), 'E0E7FF', '1E3A5F', true));
                
                summaryData.push(row);
            });
            
            const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
            const summaryColWidths = [{ wch: 25 }];
            ASSIGNMENT_TYPES.forEach(() => summaryColWidths.push({ wch: 12 }));
            summaryColWidths.push({ wch: 8 });
            summaryWs['!cols'] = summaryColWidths;
            
            // Insert Summary as first sheet
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
            
            // Reorder sheets to put Summary first
            stuSheets.sheets.forEach(s => XLSX.utils.book_append_sheet(wb, s.ws, s.name));
            const sheetOrder = ['Summary', ...ASSIGNMENT_TYPES.map(t => typeLabel(t).substring(0, 31)), ...stuSheets.sheets.map(s => s.name)];
            wb.SheetNames = sheetOrder.filter(name => wb.SheetNames.includes(name));

            // Export
            const dateStr = new Date().toISOString().slice(0, 10);
            const wbArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
            const xlsxBlob = new Blob([wbArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const whereXlsx = await saveBackupJson(`new-cong-tracker-${dateStr}.xlsx`, xlsxBlob); // v32: kasama ng JSON sa "backups"
            
            const stuNote = stuSheets.hasData ? `\n\nIncludes the students: ${stuSheets.sheets.map(s => s.name).join(', ')} (${stuSheets.partCount} student part(s), ${stuSheets.personCount} people).` : '';
            alert((whereXlsx === 'folder' ? `Excel saved to the "${lastSaveFolderName || BACKUP_SUBFOLDER}" folder!\n(new-cong-tracker-${dateStr}.xlsx)` : 'Excel file exported successfully!') + stuNote);
        }

        // Import data from JSON file
        function importDataFromFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validate the imported data structure
                    if (!data.brothers || !Array.isArray(data.brothers)) {
                        throw new Error('Invalid file format: missing brothers data');
                    }
                    if (!data.assignments || !Array.isArray(data.assignments)) {
                        throw new Error('Invalid file format: missing assignments data');
                    }
                    
                    // Confirm before overwriting
                    const existingCount = brothers.length;
                    const importCount = data.brothers.length;
                    const assignmentCount = data.assignments.length;
                    
                    const confirmMsg = `This will replace all current data:\n\n` +
                        `Current: ${existingCount} brothers, ${assignments.length} assignments, ${people.length} in roster\n` +
                        `Import: ${importCount} brothers, ${assignmentCount} assignments` +
                        (Array.isArray(data.people) ? `, ${data.people.length} in roster` : '') + `\n\n` +
                        `Continue?`;
                    
                    if (!confirm(confirmMsg)) {
                        event.target.value = ''; // Reset file input
                        return;
                    }
                    
                    // Import the data
                    brothers = data.brothers || [];
                    assignments = data.assignments || [];
                    sundayAssignments = data.sundayAssignments || [];
                    brotherEligibility = data.brotherEligibility || {};
                    // v1.1+: roster, schedule/student parts, at settings (hindi gagalawin kung wala sa lumang backup)
                    if (Array.isArray(data.people)) people = data.people;
                    if (data.meetingEditorData && typeof data.meetingEditorData === 'object') {
                        meetingEditorData = data.meetingEditorData;
                        saveMeetingEditorData();
                    }
                    if (data.studentSettings) { studentSettings = { ...studentSettings, ...data.studentSettings }; saveStudentSettings(); }
                    if (data.meetingSettings) { meetingSettings = { ...meetingSettings, ...data.meetingSettings }; saveMeetingSettings(); }
                    
                    // Ensure eligibility is set for all brothers
                    brothers.forEach(brother => {
                        if (!brotherEligibility[brother.id]) {
                            brotherEligibility[brother.id] = {};
                            ASSIGNMENT_TYPES.forEach(type => {
                                brotherEligibility[brother.id][type] = true;
                            });
                        }
                    });
                    
                    saveData();
                    render();
                    
                    alert(`Import successful!\n\nImported ${importCount} brothers and ${assignmentCount} assignments.`);
                } catch (error) {
                    alert('Error importing data: ' + error.message);
                }
            };
            
            reader.onerror = function() {
                alert('Error reading file. Please try again.');
            };
            
            reader.readAsText(file);
            event.target.value = ''; // Reset file input for future imports
        }

        // ==================== SUNDAY VIEW ====================
        function renderSundayView() {
            const container = document.getElementById('sundayContent');
            if (!container) return;
            
            const monthStr = document.getElementById('monthSelect').value;
            const [year, month] = monthStr.split('-').map(Number);
            
            // Get Thursdays belonging to this month by week-start (Monday)
            const thursdays = getThursdaysForMonthByWeekStart(year, month);
            
            let html = '<div class="space-y-6">';
            thursdays.forEach((thursday, idx) => {
                const sundayDate = getSundayForThursday(thursday);
                const sundayFormatted = new Date(sundayDate + 'T12:00:00+08:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                
                // Get brothers with Sunday assignment for this week
                const sundayBrothers = sundayAssignments.filter(sa => sa.date === sundayDate);
                
                html += `<div class="border rounded-lg p-4">
                    <h3 class="font-bold text-lg mb-3">Week ${idx + 1} - Sunday: ${sundayFormatted}</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">`;
                
                brothers.sort((a, b) => a.name.localeCompare(b.name)).forEach(brother => {
                    const hasSunday = sundayBrothers.some(sb => sb.brotherId === brother.id);
                    html += `<label class="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${hasSunday ? 'bg-yellow-100' : ''}">
                        <input type="checkbox" ${hasSunday ? 'checked' : ''} 
                            onchange="toggleSundayAssignment('${brother.id}', '${thursday}')"
                            class="w-4 h-4">
                        <span class="text-sm">${brother.name}</span>
                    </label>`;
                });
                
                html += `</div></div>`;
            });
            html += '</div>';
            
            container.innerHTML = html;
        }

        // ==================== PDF EDITOR ====================
        function getAssignedBrother(date, type) {
            const assignment = assignments.find(a => a.date === date && a.type === type);
            if (assignment) {
                const brother = brothers.find(b => b.id === assignment.brotherId);
                return brother ? brother.name : '';
            }
            return '';
        }

        // Get all assigned brothers for a type (useful for Pamumuhay which can have 2)
        function getAssignedBrothers(date, type) {
            const typeAssignments = assignments.filter(a => a.date === date && a.type === type);
            return typeAssignments.map(a => {
                const brother = brothers.find(b => b.id === a.brotherId);
                return brother ? brother.name : '—';
            });
        }

        function getMeetingEditorKey(weekDate) {
            return `week_${weekDate}`;
        }

        function saveMeetingEditorData() {
            localStorage.setItem('nc_meetingEditorData', JSON.stringify(meetingEditorData));
        }

        function loadMeetingEditorData() {
            const saved = localStorage.getItem('nc_meetingEditorData');
            if (saved) {
                meetingEditorData = JSON.parse(saved);
                // v11: alisin ang mga sirang key (hal. "week_NaN-NaN-NaN") mula sa lumang bersyon
                Object.keys(meetingEditorData).forEach(k => { if (/^week_/.test(k) && !/^week_\d{4}-\d{2}-\d{2}$/.test(k)) delete meetingEditorData[k]; });
            }
        }

        function updateMeetingField(weekDate, field, value) {
            const key = getMeetingEditorKey(weekDate);
            if (!meetingEditorData[key]) meetingEditorData[key] = {};
            meetingEditorData[key][field] = value;
            if (field === 'bibleReadingName') meetingEditorData[key].bibleReadingId = ''; // manual na pangalan: tutugmain sa roster ayon sa pangalan
            saveMeetingEditorData();
        }

        function getMeetingField(weekDate, field, defaultValue = '') {
            const key = getMeetingEditorKey(weekDate);
            return meetingEditorData[key]?.[field] || defaultValue;
        }

        function addMinistryPart(weekDate) {
            const key = getMeetingEditorKey(weekDate);
            if (!meetingEditorData[key]) meetingEditorData[key] = {};
            if (!meetingEditorData[key].ministryParts) meetingEditorData[key].ministryParts = [];
            meetingEditorData[key].ministryParts.push({ title: '', name: '', assistant: '' });
            saveMeetingEditorData();
            renderPdfEditor();
        }

        function removeMinistryPart(weekDate, index) {
            const key = getMeetingEditorKey(weekDate);
            if (meetingEditorData[key]?.ministryParts) {
                meetingEditorData[key].ministryParts.splice(index, 1);
                saveMeetingEditorData();
                renderPdfEditor();
            }
        }

        function updateMinistryPart(weekDate, index, field, value) {
            const key = getMeetingEditorKey(weekDate);
            if (!meetingEditorData[key]) meetingEditorData[key] = {};
            if (!meetingEditorData[key].ministryParts) meetingEditorData[key].ministryParts = [];
            if (!meetingEditorData[key].ministryParts[index]) meetingEditorData[key].ministryParts[index] = {};
            meetingEditorData[key].ministryParts[index][field] = value;
            if (field === 'name') meetingEditorData[key].ministryParts[index].studentId = '';
            if (field === 'assistant') meetingEditorData[key].ministryParts[index].assistantId = '';
            saveMeetingEditorData();
        }

        function addLivingPart(weekDate) {
            const key = getMeetingEditorKey(weekDate);
            if (!meetingEditorData[key]) meetingEditorData[key] = {};
            if (!meetingEditorData[key].livingParts) meetingEditorData[key].livingParts = [];
            meetingEditorData[key].livingParts.push({ title: '', name: '' });
            saveMeetingEditorData();
            renderPdfEditor();
        }

        function removeLivingPart(weekDate, index) {
            const key = getMeetingEditorKey(weekDate);
            if (meetingEditorData[key]?.livingParts) {
                meetingEditorData[key].livingParts.splice(index, 1);
                saveMeetingEditorData();
                renderPdfEditor();
            }
        }

        function updateLivingPart(weekDate, index, field, value) {
            const key = getMeetingEditorKey(weekDate);
            if (!meetingEditorData[key]) meetingEditorData[key] = {};
            if (!meetingEditorData[key].livingParts) meetingEditorData[key].livingParts = [];
            if (!meetingEditorData[key].livingParts[index]) meetingEditorData[key].livingParts[index] = {};
            meetingEditorData[key].livingParts[index][field] = value;
            saveMeetingEditorData();
        }

        // Auto-resize textarea to fit content
        function autoResizeTextarea(el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }

        // Escape HTML for textarea content (newlines are kept as-is inside textarea)
        function escNewlines(str) {
            return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        function renderPdfEditor() {
            loadMeetingEditorData();

            const monthStr = document.getElementById('monthSelect').value;
            const [year, month] = monthStr.split('-').map(Number);
            const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthNamesShort = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            document.getElementById('pdfMonthYearLabel').textContent = `${monthNames[month]} ${year}`;
            const congHeader = document.getElementById('congNameHeader');
            if (congHeader) congHeader.textContent = meetingSettings.congName ? meetingSettings.congName.toUpperCase() : '[PANGALAN NG KONGREGASYON]';
            renderMeetingSettingsPanel();
            renderSpecialWeeksPanel();

            const thursdays = getThursdaysForMonthByWeekStart(year, month);
            const container = document.getElementById('meetingWeeksContainer');
            let html = '';

            // em-dash placeholder for unassigned names
            const EM = '<em style="color:#999;">—</em>';

            thursdays.forEach((thursday, weekIdx) => {
                const thursdayDate = new Date(thursday + 'T12:00:00+08:00');
                const weekStart = new Date(thursdayDate); weekStart.setDate(thursdayDate.getDate() - 3);
                const weekEnd = new Date(thursdayDate); weekEnd.setDate(thursdayDate.getDate() + 3);
                const startDay = weekStart.getDate(), endDay = weekEnd.getDate();
                const startMonth = weekStart.getMonth() + 1, endMonth = weekEnd.getMonth() + 1;
                const dateRange = startMonth === endMonth
                    ? `${monthNamesShort[startMonth]} ${startDay}-${endDay}`
                    : `${monthNamesShort[startMonth]} ${startDay} – ${monthNamesShort[endMonth]} ${endDay}`;

                const openingPrayer = getAssignedBrother(thursday, 'Opening Prayer');
                const chairman = getAssignedBrother(thursday, 'OCLM Chairman');
                const tenMinTalk = getAssignedBrother(thursday, '10 mins talk');
                const espirituwalHiyas = getAssignedBrother(thursday, 'Espiritual na Hiyas');
                const pamumuhayBrothers = getAssignedBrothers(thursday, 'Pamumuhay');
                const cbs = getAssignedBrother(thursday, 'CBS');
                const cbsReader = getAssignedBrother(thursday, 'CBS Reader');
                const closingPrayer = getAssignedBrother(thursday, 'Closing prayer');

                const key = getMeetingEditorKey(thursday);
                const ministryParts = meetingEditorData[key]?.ministryParts || [
                    { title: '', name: '', assistant: '' },
                    { title: '', name: '', assistant: '' },
                    { title: '', name: '', assistant: '' }
                ];
                const livingParts = meetingEditorData[key]?.livingParts || [];

                // small helper: name + optional assistant, joined with &
                function nameAmp(name, assistant) {
                    const n = name || EM;
                    return assistant ? `${n} <span class="amp">&</span> ${assistant}` : n;
                }

                // ---- LEFT COLUMN: Kayamanan + (Awit) + Pamumuhay ----
                let left = '';
                left += `<div class="meeting-colsection-header mc-treasures">KAYAMANAN MULA SA SALITA NG DIYOS</div>`;
                // Part 1 (10 min talk)
                left += `<div class="meeting-part">
                    <span class="meeting-part-number treasures">1.</span>
                    <span class="meeting-part-title treasures">
                        <textarea class="pdf-editor-input" style="width:90%;color:#0d9488;" rows="1" oninput="autoResizeTextarea(this)"
                            onchange="updateMeetingField('${thursday}', 'part1Title', this.value)"
                            placeholder="Part title (10 min.)">${escNewlines(getMeetingField(thursday, 'part1Title', ''))}</textarea>
                    </span>
                    <span class="meeting-part-name">${tenMinTalk || EM}</span>
                </div>`;
                // Part 2 Espiritwal
                left += `<div class="meeting-part">
                    <span class="meeting-part-number treasures">2.</span>
                    <span class="meeting-part-title treasures">Espirituwal na Hiyas <span class="meeting-part-minutes">(10 min.)</span></span>
                    <span class="meeting-part-name">${espirituwalHiyas || EM}</span>
                </div>`;
                // Part 3 Pagbabasa
                left += `<div class="meeting-part">
                    <span class="meeting-part-number treasures">3.</span>
                    <span class="meeting-part-title treasures">Pagbabasa ng Bibliya <span class="meeting-part-minutes">(4 min.)</span></span>
                    <span class="meeting-part-name"><input type="text" class="pdf-editor-name" value="${getMeetingField(thursday, 'bibleReadingName', '')}"
                        onchange="updateMeetingField('${thursday}', 'bibleReadingName', this.value)" placeholder="Name"></span>
                </div>`;
                // Awit (middle song) + PAMUMUHAY header
                left += `<div class="meeting-awit-inline">Awit: <input type="text" class="pdf-editor-input" style="width:36px;display:inline-block;"
                        value="${getMeetingField(thursday, 'middleSong', '')}" onchange="updateMeetingField('${thursday}', 'middleSong', this.value)"></div>`;
                left += `<div class="meeting-colsection-header mc-living">PAMUMUHAY BILANG KRISTIYANO</div>`;
                // Pamumuhay parts (assigned brothers), numbering continues after ministry
                const pamStart = 4 + ministryParts.length;
                if (pamumuhayBrothers.length > 0) {
                    pamumuhayBrothers.forEach((bn, i) => {
                        left += `<div class="meeting-part">
                            <span class="meeting-part-number living">${pamStart + i}.</span>
                            <span class="meeting-part-title">
                                <textarea class="pdf-editor-input" style="width:85%;" rows="1" oninput="autoResizeTextarea(this)"
                                    onchange="updateMeetingField('${thursday}', 'pamumuhayTitle${i}', this.value)"
                                    placeholder="Pamumuhay">${escNewlines(getMeetingField(thursday, 'pamumuhayTitle' + i, 'Pamumuhay'))}</textarea>
                            </span>
                            <span class="meeting-part-name">${bn || EM}</span>
                        </div>`;
                    });
                } else {
                    left += `<div class="meeting-part">
                        <span class="meeting-part-number living">${pamStart}.</span>
                        <span class="meeting-part-title">
                            <textarea class="pdf-editor-input" style="width:85%;" rows="1" oninput="autoResizeTextarea(this)"
                                onchange="updateMeetingField('${thursday}', 'pamumuhayTitle0', this.value)"
                                placeholder="Pamumuhay">${escNewlines(getMeetingField(thursday, 'pamumuhayTitle0', 'Pamumuhay'))}</textarea>
                        </span>
                        <span class="meeting-part-name"><em style="color:#999;">— (assign)</em></span>
                    </div>`;
                }
                // extra living parts
                const livingStart = pamStart + Math.max(pamumuhayBrothers.length, 1);
                livingParts.forEach((part, i) => {
                    left += `<div class="meeting-part">
                        <span class="meeting-part-number living">${livingStart + i}.</span>
                        <span class="meeting-part-title">
                            <textarea class="pdf-editor-input" style="width:85%;" rows="1" oninput="autoResizeTextarea(this)"
                                onchange="updateLivingPart('${thursday}', ${i}, 'title', this.value)"
                                placeholder="">${escNewlines(part.title || '')}</textarea>
                        </span>
                        <span class="meeting-part-name">
                            <input type="text" class="pdf-editor-name" value="${part.name || ''}"
                                onchange="updateLivingPart('${thursday}', ${i}, 'name', this.value)" placeholder="">
                            <span class="remove-part-btn" onclick="removeLivingPart('${thursday}', ${i})">✕</span>
                        </span>
                    </div>`;
                });
                left += `<div class="add-part-btn" onclick="addLivingPart('${thursday}')">+ Add Living Part</div>`;
                // CBS + Par. Reader
                const cbsNum = livingStart + livingParts.length;
                left += `<div class="meeting-part">
                    <span class="meeting-part-number living">${cbsNum}.</span>
                    <span class="meeting-part-title">Pag-aaral ng Kongregasyon sa Bibliya <span class="meeting-part-minutes">(30 min.)</span></span>
                    <span class="meeting-part-name">${cbs || EM}</span>
                </div>`;
                left += `<div class="meeting-part">
                    <span class="meeting-part-title"><strong>Par. Reader:</strong> ${cbsReader || EM}</span>
                </div>`;

                // ---- RIGHT COLUMN: Maging Mahusay ----
                let right = '';
                right += `<div class="meeting-colsection-header mc-ministry">MAGING MAHUSAY SA MINISTERYO</div>`;
                right += ministryParts.map((part, i) => `
                    <div class="meeting-part">
                        <span class="meeting-part-number ministry">${4 + i}.</span>
                        <span class="meeting-part-title">
                            <textarea class="pdf-editor-input" style="width:85%;" rows="1" oninput="autoResizeTextarea(this)"
                                onchange="updateMinistryPart('${thursday}', ${i}, 'title', this.value)"
                                placeholder="">${escNewlines(part.title || '')}</textarea>
                        </span>
                        <span class="meeting-part-name meeting-part-pair">
                            <input type="text" class="pdf-editor-name" style="min-width:70px;" value="${part.name || ''}"
                                onchange="updateMinistryPart('${thursday}', ${i}, 'name', this.value)" placeholder="Name">
                            <span class="amp">&</span>
                            <input type="text" class="pdf-editor-name" style="min-width:70px;" value="${part.assistant || ''}"
                                onchange="updateMinistryPart('${thursday}', ${i}, 'assistant', this.value)" placeholder="Assistant">
                            ${ministryParts.length > 1 ? `<span class="remove-part-btn" onclick="removeMinistryPart('${thursday}', ${i})">✕</span>` : ''}
                        </span>
                    </div>`).join('');
                right += `<div class="add-part-btn" onclick="addMinistryPart('${thursday}')">+ Add Ministry Part</div>`;

                // ---- ASSEMBLE WEEK ----
                html += `
                <div class="meeting-week meeting-schedule">
                    <div class="meeting-weekbar">
                        <span>${dateRange}</span>
                        <input type="text" class="pdf-editor-input scripture" style="width:150px;"
                            value="${getMeetingField(thursday, 'bibleReading', '')}"
                            onchange="updateMeetingField('${thursday}', 'bibleReading', this.value)" placeholder="JEREMIAS 45-46">
                    </div>
                    ${renderWeekTypeControls(thursday)}
                    <div class="meeting-chairman-row">
                        <span>Awit <input type="text" class="pdf-editor-input" style="width:34px;display:inline-block;"
                            value="${getMeetingField(thursday, 'openingSong', '')}" onchange="updateMeetingField('${thursday}', 'openingSong', this.value)"></span>
                        <span>Chairman: <strong>${chairman || EM}</strong></span>
                        <span>Panalangin: <strong>${openingPrayer || EM}</strong></span>
                    </div>
                    <div class="meeting-2col">
                        <div class="meeting-col">${left}</div>
                        <div class="meeting-col">${right}</div>
                    </div>
                    <div class="meeting-footer">
                        <span>Awit <input type="text" class="pdf-editor-input" style="width:34px;display:inline-block;"
                            value="${getMeetingField(thursday, 'closingSong', '')}" onchange="updateMeetingField('${thursday}', 'closingSong', this.value)">
                            &nbsp; Pangwakas na Komento ng Chairman <span class="meeting-part-minutes">(3 min.)</span></span>
                        <span>Panalangin: <strong>${closingPrayer || EM}</strong></span>
                    </div>
                    ${renderWeekTimingSummary(thursday)}
                </div>`;
            });

            container.innerHTML = html;
            container.querySelectorAll('textarea.pdf-editor-input').forEach(autoResizeTextarea);
        }
        // ==================== WORKBOOK IMPORT (EPUB) ====================
        const WB_MONTHS_TG = { 'ENERO':1,'PEBRERO':2,'MARSO':3,'ABRIL':4,'MAYO':5,'HUNYO':6,'HULYO':7,
            'AGOSTO':8,'SETYEMBRE':9,'SEPTYEMBRE':9,'OKTUBRE':10,'NOBYEMBRE':11,'DISYEMBRE':12 };

        function wbStripTags(s) { return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

        function wbCleanTitle(t) {
            return (t || '').replace(/^\d+\.\s*/, '').replace(/\s*\(\d+\s*min\.?\)\s*/i, '').trim();
        }

        function wbTitleWithMin(rawTitle, minutes) {
            const base = wbCleanTitle(rawTitle);
            return minutes ? `${base} (${minutes} min.)` : base;
        }

function wbWeekToThursday(label, ctx) {
            // v30: kailangan ang "BUWAN ARAW" sa simula (hal. "ENERO 4-10"); ang cover page ("…Enero-Pebrero 2027") ay nilalaktawan
            const up = (label || '').toUpperCase().trim();
            const m = up.match(/^([A-ZÑ]+)\s+(\d{1,2})(?!\d)/);
            if (!m) return null;
            const month = WB_MONTHS_TG[m[1]];
            const day = parseInt(m[2], 10);
            if (!month || day < 1 || day > 31) return null;
            let year;
            const ym = up.match(/(\d{4})/);
            if (ym) year = parseInt(ym[1], 10);                       // tahasang taon sa label (hal. "DISYEMBRE 28, 2026–ENERO 3, 2027")
            else if (ctx && ctx.year) {
                // taon ng workbook (mula sa cover / pangalan ng file); kung tumawid ng taon (Dis sa isyung Ene, o Ene sa isyung Nob)
                year = ctx.year;
                const diff = month - (ctx.month || month);
                if (diff > 6) year -= 1; else if (diff < -6) year += 1;
            } else {
                // walang ibang palatandaan: ang taon na pinakamalapit sa ngayon
                const [ty, tm] = manilaTodayISO().split('-').map(Number);
                year = ty;
                const diff = month - tm;
                if (diff > 6) year -= 1; else if (diff < -6) year += 1;
            }
            const mon = new Date(Date.UTC(year, month - 1, day));
            if (mon.getUTCMonth() !== month - 1 || mon.getUTCDate() !== day) return null;   // hal. PEBRERO 30
            const thu = new Date(mon.getTime() + 3 * 86400000);
            return `${thu.getUTCFullYear()}-${String(thu.getUTCMonth() + 1).padStart(2, '0')}-${String(thu.getUTCDate()).padStart(2, '0')}`;
        }
        // v30: taon at unang buwan ng workbook — mula sa cover page ("…Enero-Pebrero 2027"), sa .opf, o sa pangalan ng file (mwb_TG_202701)
        function wbIssueContext(fileName, coverText) {
            const fm = String(fileName || '').match(/(?:^|[^\d])(20\d{2})(0[1-9]|1[0-2])(?!\d)/);
            if (fm) return { year: +fm[1], month: +fm[2] };
            const up = String(coverText || '').toUpperCase();
            const y = up.match(/(20\d{2})/);
            if (!y) return null;
            const mm = Object.keys(WB_MONTHS_TG).map(k => ({ k, i: up.indexOf(k) })).filter(x => x.i >= 0).sort((a, b) => a.i - b.i)[0];
            return { year: +y[1], month: mm ? WB_MONTHS_TG[mm.k] : 0 };
        }
        // v30: ang Huwebes na maling nakuha ng lumang bersyon (laging 2026) — para malinis ang naiwang maling linggo
        function wbLegacyThursday(label) {
            const up = (label || '').toUpperCase();
            const m = up.match(/([A-ZÑ]+)\s+(\d+)/);
            if (!m || /\d{4}/.test(up)) return null;
            const month = WB_MONTHS_TG[m[1]], day = parseInt(m[2], 10);
            if (!month || day > 31) return null;
            const mon = new Date(Date.UTC(2026, month - 1, day));
            const thu = new Date(mon.getTime() + 3 * 86400000);
            return `${thu.getUTCFullYear()}-${String(thu.getUTCMonth() + 1).padStart(2, '0')}-${String(thu.getUTCDate()).padStart(2, '0')}`;
        }

        function wbParseWeek(html) {
            const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
            const weekLabel = h1 ? wbStripTags(h1[1]) : '';
            const h2 = html.match(/<h2[^>]*>.*?<strong><a[^>]*>(.*?)<\/a><\/strong>/s);
            const bible = h2 ? wbStripTags(h2[1]) : '';
            const songs = [...html.matchAll(/Awit Blg\.\s*(\d+)/g)].map(m => m[1]);
            const wheatI = html.indexOf('dc-icon--wheat');
            const sheepI = html.indexOf('dc-icon--sheep');
            const parts = [];
            for (const mm of html.matchAll(/<h3[^>]*data-pid="(\d+)"[^>]*>(.*?)<\/h3>/gs)) {
                const pos = mm.index;
                const title = wbStripTags(mm[2]);
                const after = html.slice(mm.index + mm[0].length, mm.index + mm[0].length + 300);
                const mIn = title.match(/\((\d+)\s*min\.?\)/);
                const mAf = after.match(/\((\d+)\s*min\.?\)/);
                const minutes = mIn ? mIn[1] : (mAf ? mAf[1] : '');
                const sec = pos < wheatI ? 'kayaman' : (pos < sheepI ? 'ministry' : 'living');
                parts.push({ title, minutes, sec, note: wbStripTags(after).slice(0, 60) });
            }
            return { weekLabel, bible, songs, parts };
        }

        async function handleWorkbookImport(event) {
            const file = event.target.files[0];
            if (!file) return;
            event.target.value = '';
            if (typeof JSZip === 'undefined') { alert('ZIP library not loaded. Refresh the page and try again.'); return; }
            try {
                const zip = await JSZip.loadAsync(file);
                const weekly = Object.keys(zip.files)
                    .filter(n => /OEBPS\/\d{9}\.xhtml$/.test(n) && !n.includes('extracted') && !n.endsWith('400.xhtml'))
                    .sort();
                const weeks = [];
                // v30: alamin ang taon ng workbook (hindi na laging 2026)
                let coverText = '';
                const opfName = Object.keys(zip.files).find(n => /\.opf$/i.test(n));
                if (opfName) { const o = await zip.files[opfName].async('string'); const t = o.match(/<dc:title[^>]*>([^<]*)/); if (t) coverText += t[1] + ' '; }
                const coverName = Object.keys(zip.files).find(n => /OEBPS\/\d{6}000\.xhtml$/.test(n));
                if (coverName) { const c = await zip.files[coverName].async('string'); const h = c.match(/<h1[^>]*>(.*?)<\/h1>/s); if (h) coverText += wbStripTags(h[1]); }
                const issue = wbIssueContext(file.name, coverText);
                for (const name of weekly) {
                    const content = await zip.files[name].async('string');
                    const d = wbParseWeek(content);
                    const thu = wbWeekToThursday(d.weekLabel, issue);
                    if (!thu) continue;
                    const kayaman = d.parts.filter(p => p.sec === 'kayaman');
                    const part1 = kayaman.find(p => /^1\./.test(p.title));
                    const ministry = d.parts.filter(p => p.sec === 'ministry');
                    const living = d.parts.filter(p => p.sec === 'living' && /^\d+\./.test(p.title) && !/Pag-aaral ng Kongregasyon/i.test(p.title));
                    weeks.push({
                        thursday: thu,
                        legacyThursday: wbLegacyThursday(d.weekLabel),
                        weekLabel: d.weekLabel,
                        bibleReading: d.bible,
                        openingSong: d.songs[0] || '',
                        middleSong: d.songs[1] || '',
                        closingSong: d.songs[2] || '',
                        part1Title: part1 ? wbTitleWithMin(part1.title, part1.minutes) : '',
                        ministryParts: ministry.map(p => ({ title: wbTitleWithMin(p.title, p.minutes), name: '', assistant: '', kind: detectPartKind(p.title, p.note) })),
                        pamumuhayTitles: living.map(p => wbTitleWithMin(p.title, p.minutes))
                    });
                }
                if (weeks.length === 0) { alert('No weekly schedules were found in this EPUB.'); return; }
                workbookPreview = weeks;
                renderWorkbookPreview();
                document.getElementById('workbookModal').classList.remove('hidden');
                document.body.classList.add('modal-open');
            } catch (e) {
                alert('Error reading workbook: ' + e.message);
            }
        }

        function renderWorkbookPreview() {
            const container = document.getElementById('workbookContent');
            const summary = document.getElementById('workbookSummary');
            const weeks = workbookPreview || [];
            const nice = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            if (summary) summary.textContent = `${weeks.length} week(s) found — Thursday ${nice(weeks[0].thursday)} to ${nice(weeks[weeks.length-1].thursday)}. Only empty fields will be filled (manual entries preserved).`;
            let html = '';
            weeks.forEach(w => {
                html += `<div class="mb-3 border border-gray-200 rounded-lg p-3">
                    <div class="font-bold text-gray-900">${w.weekLabel} <span class="text-xs text-gray-500">(Thu ${nice(w.thursday)})</span></div>
                    <div class="text-xs text-gray-600 mb-1">${w.bibleReading} &bull; Awit ${w.openingSong}/${w.middleSong}/${w.closingSong}</div>
                    <div class="text-sm text-gray-800">1. ${w.part1Title}</div>
                    ${w.ministryParts.map(p => `<div class="text-sm text-gray-700" style="padding-left:10px;">- ${p.title}</div>`).join('')}
                    ${w.pamumuhayTitles.map(t => `<div class="text-sm text-gray-700" style="padding-left:10px;">- ${t}</div>`).join('')}
                </div>`;
            });
            container.innerHTML = html;
        }

        function applyWorkbookImport() {
            const weeks = workbookPreview || [];
            if (weeks.length === 0) { closeWorkbookModal(); return; }
            loadMeetingEditorData();
            // v30: alisin ang mga linggong maling nailagay ng lumang bersyon sa 2026 (hal. Ene–Peb 2027 → Ene–Peb 2026),
            // pero kung galing lang sa workbook ang laman (walang pangalan, parehong pamagat)
            const movedOff = [];
            weeks.forEach(w => {
                if (!w.legacyThursday || w.legacyThursday === w.thursday) return;
                const lk = getMeetingEditorKey(w.legacyThursday);
                const old = meetingEditorData[lk];
                if (!old || !w.part1Title || old.part1Title !== w.part1Title) return;
                const hasName = Object.entries(old).some(([f, v]) => /(Name|Id|^chairman|^name|^assistant)$/i.test(f) && v) ||
                    (old.ministryParts || []).some(p => p && (p.name || p.assistant || p.studentId || p.assistantId));
                if (hasName) return;
                delete meetingEditorData[lk];
                movedOff.push(w.legacyThursday);
            });
            weeks.forEach(w => {
                const key = getMeetingEditorKey(w.thursday);
                if (!meetingEditorData[key]) meetingEditorData[key] = {};
                const md = meetingEditorData[key];
                const setIfEmpty = (field, val) => {
                    if (val && (md[field] === undefined || md[field] === '' || md[field] === null)) md[field] = val;
                };
                setIfEmpty('bibleReading', w.bibleReading);
                setIfEmpty('openingSong', w.openingSong);
                setIfEmpty('middleSong', w.middleSong);
                setIfEmpty('closingSong', w.closingSong);
                setIfEmpty('part1Title', w.part1Title);
                if ((!md.ministryParts || md.ministryParts.length === 0) && w.ministryParts.length > 0) {
                    md.ministryParts = w.ministryParts.map(p => ({ title: p.title, name: '', assistant: '', kind: p.kind }));
                }
                w.pamumuhayTitles.forEach((t, i) => {
                    const f = 'pamumuhayTitle' + i;
                    if (t && (md[f] === undefined || md[f] === '' || md[f] === 'Pamumuhay')) md[f] = t;
                });
            });
            saveMeetingEditorData();
            workbookPreview = null;
            closeWorkbookModal();
            if (currentView === 'pdfEditor') renderPdfEditor();
            if (currentView === 'students') renderStudentsView();
            const nice = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            alert(`Workbook imported! Filled in the empty fields for ${weeks.length} week(s): Thursday ${nice(weeks[0].thursday)} to ${nice(weeks[weeks.length - 1].thursday)}.\nNames still come from the Assignments and Students tabs.` +
                (movedOff.length ? `\n\nAlso cleaned ${movedOff.length} week(s) that an earlier import put in the wrong year (${nice(movedOff[0])} – ${nice(movedOff[movedOff.length - 1])}).` : ''));
        }

        function closeWorkbookModal() {
            document.getElementById('workbookModal').classList.add('hidden');
            document.body.classList.remove('modal-open');
        }

        // ==================== STUDENTS (Hakbang 2) ====================
        // Roster ng lahat ng kapatid (mula sa Masterlist) + pagbibigay ng student parts.
        // Ang student assignments ay naka-save sa meetingEditorData (iisang source of truth
        // kasama ng Schedule Editor). Ang history ay kinukuwenta mula roon, hindi hiwalay na kopya.

        const STUDENT_KINDS = {
            bible:       { label: 'Bible Reading', short: 'Bible Reading', brotherOnly: true,  assistant: false, student: true },
            initial:     { label: 'Starting a Conversation', short: 'Starting a Conversation', brotherOnly: false, assistant: true, student: true },
            returnVisit: { label: 'Following Up', short: 'Following Up', brotherOnly: false, assistant: true, student: true },
            study:       { label: 'Making Disciples', short: 'Making Disciples', brotherOnly: false, assistant: true, student: true },
            explainTalk: { label: 'Explaining Your Beliefs (Talk)', short: 'Explaining Beliefs (Talk)', brotherOnly: true, assistant: false, student: true },
            explainDemo: { label: 'Explaining Your Beliefs (Demonstration)', short: 'Explaining Beliefs (Demo)', brotherOnly: false, assistant: true, student: true },
            talk:        { label: 'Talk', short: 'Talk', brotherOnly: true, assistant: false, student: true },
            discussion:  { label: 'Discussion (Elder/MS — not a student part)', short: 'Discussion', brotherOnly: true, assistant: false, student: false },
            unknown:     { label: '⚠ Unrecognized — choose the part type', short: '?', brotherOnly: false, assistant: true, student: true }
        };
        const MINISTRY_KIND_OPTIONS = ['initial', 'returnVisit', 'study', 'explainDemo', 'explainTalk', 'talk', 'discussion', 'unknown'];
        const PERSON_ATAS = ['Elder', 'MS', 'Publisher', 'UB-Publisher'];
        const HISTORY_WINDOW_WEEKS = 26; // ~6 buwan para sa "pag-uulit" na bilang

        let studentSettings = { includeElders: false };
        let rosterFilter = { search: '', missingGenderOnly: false };
        let rosterOpen = false;

        function saveStudentSettings() { localStorage.setItem('nc_studentSettings', JSON.stringify(studentSettings)); }
        function loadStudentSettings() {
            try { const s = JSON.parse(localStorage.getItem('nc_studentSettings') || '{}'); studentSettings = { ...studentSettings, ...s }; } catch (e) {}
        }

        function escHtml(s) {
            return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
        function normName(s) { return (s || '').toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim(); }
        function personName(p) { return p ? `${p.first} ${p.last}`.trim() : ''; }
        function personLabel(p) { return p ? `${p.first} ${p.last}`.trim() : ''; } // v21: first name basis
        function getPerson(id) { return people.find(p => p.id === id) || null; }
        function findPersonByName(name) {
            const n = normName(name);
            if (!n) return null;
            return people.find(p => normName(`${p.first} ${p.last}`) === n || normName(`${p.last} ${p.first}`) === n) || null;
        }
        function normGender(v) {
            const s = (v || '').toString().trim().toLowerCase();
            if (!s) return '';
            if (/^(b|brother|lalaki|male|m)$/.test(s) || s.startsWith('bro')) return 'Brother';
            if (/^(s|sister|babae|female|f)$/.test(s) || s.startsWith('sis')) return 'Sister';
            return '';
        }

        // --- Uri ng bahagi mula sa pamagat (at sa unang salita ng paliwanag sa workbook) ---
        function detectPartKind(title, note) {
            const t = (title || '').toLowerCase();
            const n = (note || '').toLowerCase().replace(/^\s*\(\s*\d+\s*min\.?\s*\)\s*/, '').trim();
            if (/ano ang sasabihin mo/.test(t) || n.startsWith('pagtalakay')) return 'discussion';
            if (/pagpapasimula/.test(t)) return 'initial';
            if (/pakikipag-usap muli|pagdalaw-muli/.test(t)) return 'returnVisit';
            if (/paggawa ng mga alagad/.test(t)) return 'study';
            if (/ipaliwanag ang paniniwala/.test(t)) {
                if (n.startsWith('pahayag')) return 'explainTalk';
                if (n.startsWith('pagtatanghal')) return 'explainDemo';
                return 'unknown';
            }
            if (/\bpahayag\b/.test(t)) return 'talk';
            return 'unknown';
        }
        function getPartKind(part) {
            if (part && part.kind && STUDENT_KINDS[part.kind]) return part.kind;
            return detectPartKind(part?.title, '');
        }

        // --- History: lahat ng student parts mula sa meetingEditorData ---
        function buildStudentHistory() {
            const hist = {};
            const add = (pid, date, kind, role, partner) => {
                if (!pid) return;
                (hist[pid] = hist[pid] || []).push({ date, kind, role, partner: partner || '' });
            };
            Object.keys(meetingEditorData).forEach(key => {
                const m = key.match(/^week_(\d{4}-\d{2}-\d{2})$/);
                if (!m) return;
                const date = m[1];
                const md = meetingEditorData[key] || {};
                if (WEEK_TYPES[md.weekType]?.noMeeting) return; // walang pulong: hindi bilang sa history
                add(md.bibleReadingId || findPersonByName(md.bibleReadingName)?.id, date, 'bible', 'Estudyante');
                (md.ministryParts || []).forEach(part => {
                    const kind = getPartKind(part);
                    if (kind === 'discussion') return;
                    const sid = part.studentId || findPersonByName(part.name)?.id || '';
                    const aid = STUDENT_KINDS[kind]?.assistant ? (part.assistantId || findPersonByName(part.assistant)?.id || '') : '';
                    add(sid, date, kind, 'Estudyante', aid);
                    if (STUDENT_KINDS[kind]?.assistant) add(aid, date, kind, 'Assistant', sid);
                });
            });
            Object.values(hist).forEach(a => a.sort((x, y) => y.date.localeCompare(x.date)));
            return hist;
        }
        function weeksBetween(a, b) {
            return Math.round(Math.abs(new Date(b + 'T12:00:00+08:00') - new Date(a + 'T12:00:00+08:00')) / (7 * 86400000));
        }
        function shortDate(d) {
            return new Date(d + 'T12:00:00+08:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        // Buod ng isang tao kaugnay ng isang petsa (target)
        function personStats(hist, pid, target) {
            const all = hist[pid] || [];
            const prior = all.filter(e => e.date < target);
            const future = all.filter(e => e.date > target);
            const lastStudent = prior.find(e => e.role === 'Estudyante') || null;
            const lastAssist = prior.find(e => e.role === 'Assistant') || null;
            const lastAny = prior[0] || null;
            return { all, prior, future, lastStudent, lastAssist, lastAny };
        }
        function describeLast(e, target) {
            if (!e) return 'no parts yet';
            const w = weeksBetween(e.date, target);
            return `last: ${STUDENT_KINDS[e.kind]?.short || e.kind} (${roleLabel(e.role)}), ${w === 0 ? 'this week' : w + (w === 1 ? ' wk ago' : ' wks ago')}`;
        }

        // --- Sino ang may bahagi na sa linggong ito (para sa conflict check) ---
        function getWeekUsage(thursday) {
            const md = meetingEditorData[getMeetingEditorKey(thursday)] || {};
            const used = {}; // pid -> [slot labels]
            const mark = (pid, label) => { if (pid) (used[pid] = used[pid] || []).push(label); };
            mark(md.bibleReadingId || findPersonByName(md.bibleReadingName)?.id, 'Bible Reading');
            (md.ministryParts || []).forEach((part, i) => {
                const no = (part.title || '').match(/^(\d+)\./)?.[1] || (4 + i);
                mark(part.studentId || findPersonByName(part.name)?.id, `#${no}`);
                mark(part.assistantId || findPersonByName(part.assistant)?.id, `#${no} assistant`);
            });
            // Mga atas sa Assignments grid (brother parts) sa parehong Huwebes
            assignments.filter(a => a.date === thursday).forEach(a => {
                const b = brothers.find(x => x.id === a.brotherId);
                const p = b ? findPersonByName(b.name) : null;
                if (p) mark(p.id, a.type);
            });
            return used;
        }

        // --- Sino ang puwede sa isang slot ---
        function isEligibleForKind(p, kind) {
            if (!p || p.active === false || !p.gender) return false;
            const k = STUDENT_KINDS[kind] || STUDENT_KINDS.unknown;
            if (kind === 'discussion') return p.atas === 'Elder' || p.atas === 'MS';
            if (k.brotherOnly && p.gender !== 'Brother') return false;
            if (p.atas === 'Elder' && !studentSettings.includeElders) return false;
            return true;
        }

        // Ranked candidates para sa Estudyante
        // v13: (1) lahat ay dapat maging Estudyante — inuuna ang madalas na Assistant pero bihirang Estudyante;
        //      (2) iba-ibang uri ng bahagi — inuuna ang hindi pa nila nagagawa bilang Estudyante;
        //      (3) walang bahagi (Estudyante, Assistant, o atas sa Assignments tab) sa katabing pulong.
        function rankStudentCandidates(thursday, kind, currentId) {
            const hist = buildStudentHistory();
            const used = getWeekUsage(thursday);
            const ctx = studentAdjacencyContext(thursday);
            const list = people.filter(p => isEligibleForKind(p, kind) || p.id === currentId).map(p => {
                const s = personStats(hist, p.id, thursday);
                let score = 0;
                const notes = [];
                if (kind === 'discussion') {
                    score += s.lastAny ? Math.min(weeksBetween(s.lastAny.date, thursday), HISTORY_WINDOW_WEEKS) * 3 : 60;
                } else {
                    const mine = s.all.filter(e => e.date !== thursday);
                    const asStu = mine.filter(e => e.role === 'Estudyante');
                    const asAsst = mine.filter(e => e.role === 'Assistant').length;
                    if (!s.lastStudent) score += 100;
                    else score += Math.min(weeksBetween(s.lastStudent.date, thursday), HISTORY_WINDOW_WEEKS) * 3;
                    if (asAsst > asStu.length) {
                        score += Math.min(30, 10 * (asAsst - asStu.length));
                        notes.push(`assistant ${asAsst}×, student ${asStu.length}×`);
                    }
                    const sameKind = asStu.filter(e => e.kind === kind).length;
                    if (sameKind) { score -= 35 * sameKind; notes.push(`did ${STUDENT_KINDS[kind]?.short || kind} ${sameKind}× already`); }
                    else if (asStu.length) { score += 25; notes.push('new part type for them'); }
                }
                if (s.future.length) { score -= 40; notes.push(`already assigned on ${shortDate(s.future[s.future.length - 1].date)}`); }
                const adj = adjacentPartNote(p, thursday, hist, ctx);
                if (adj) { score -= 300; notes.unshift(`⚠ ${adj}`); }
                const conflict = (used[p.id] || []).length > 0 && p.id !== currentId;
                if (conflict) { score -= 1000; notes.unshift(`⚠ already has a part this week (${used[p.id].join(', ')})`); }
                return { p, score, info: describeLast(s.lastStudent || s.lastAny, thursday), notes, conflict };
            });
            list.sort((a, b) => b.score - a.score || studentTieBreak(a.p, b.p));
            return list;
        }

        // Ranked candidates para sa Assistant (kapareho ng kasarian ng estudyante)
        // v13: iwasan ang dating magkapartner; itabi ang hindi pa nagiging Estudyante para sa student part;
        //      walang bahagi sa katabing pulong. Bilang bahagi pa rin ang pagiging Assistant.
        function rankAssistantCandidates(thursday, student, currentId) {
            if (!student) return [];
            const hist = buildStudentHistory();
            const used = getWeekUsage(thursday);
            const ctx = studentAdjacencyContext(thursday);
            const list = people.filter(p => (p.id !== student.id && p.active !== false && p.gender === student.gender &&
                    (p.atas !== 'Elder' || studentSettings.includeElders)) || p.id === currentId).map(p => {
                const s = personStats(hist, p.id, thursday);
                let score = 0;
                const notes = [];
                score += s.lastAny ? Math.min(weeksBetween(s.lastAny.date, thursday), HISTORY_WINDOW_WEEKS) * 2 : 50;
                const paired = (hist[p.id] || []).filter(e => e.partner === student.id && e.date !== thursday);
                if (paired.length) {
                    score -= 80 * paired.length;
                    notes.unshift(`⚠ partnered with ${student.first} before (${paired.map(e => shortDate(e.date)).join(', ')})`);
                }
                if (!(hist[p.id] || []).some(e => e.role === 'Estudyante' && e.date !== thursday)) { score -= 25; notes.push('not a student yet'); }
                if (s.future.length) { score -= 40; notes.push(`already assigned on ${shortDate(s.future[s.future.length - 1].date)}`); }
                const adj = adjacentPartNote(p, thursday, hist, ctx);
                if (adj) { score -= 300; notes.unshift(`⚠ ${adj}`); }
                const conflict = (used[p.id] || []).length > 0 && p.id !== currentId;
                if (conflict) { score -= 1000; notes.unshift(`⚠ already has a part this week (${used[p.id].join(', ')})`); }
                return { p, score, info: describeLast(s.lastAny, thursday), notes, conflict };
            });
            list.sort((a, b) => b.score - a.score || studentTieBreak(a.p, b.p));
            return list;
        }

        function candidateOptions(ranked, currentId, placeholder) {
            let html = `<option value="">${escHtml(placeholder)}</option>`;
            ranked.forEach((c, idx) => {
                const star = !c.conflict && idx < 3 ? '★ ' : '';
                const extra = c.notes.length ? ' · ' + c.notes.join(' · ') : '';
                // v20: (RP) = Regular Pioneer, para makita agad sa dropdown
                html += `<option value="${escHtml(c.p.id)}" ${c.p.id === currentId ? 'selected' : ''}>${star}${escHtml(personLabel(c.p))}${c.p.pioneer ? ' (RP)' : ''} — ${escHtml(c.info + extra)}</option>`;
            });
            return html;
        }

        // --- Mga aksyon ---
        function getWeekData(thursday) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(thursday || '')) return {}; // v11: huwag mag-save ng di-wastong petsa
            const key = getMeetingEditorKey(thursday);
            if (!meetingEditorData[key]) meetingEditorData[key] = {};
            return meetingEditorData[key];
        }
        function assignStudent(thursday, slot, personId) {
            const md = getWeekData(thursday);
            const p = getPerson(personId);
            if (slot === 'bible') {
                md.bibleReadingId = p ? p.id : '';
                md.bibleReadingName = p ? personName(p) : '';
            } else {
                const part = (md.ministryParts || [])[slot];
                if (!part) return;
                part.studentId = p ? p.id : '';
                part.name = p ? personName(p) : '';
                // kapag nagbago ang kasarian ng estudyante, alisin ang hindi tugmang assistant
                const asst = getPerson(part.assistantId) || findPersonByName(part.assistant);
                if (asst && p && asst.gender !== p.gender) { part.assistantId = ''; part.assistant = ''; }
                if (!STUDENT_KINDS[getPartKind(part)]?.assistant) { part.assistantId = ''; part.assistant = ''; }
            }
            saveMeetingEditorData();
            renderStudentsView();
        }
        function assignAssistant(thursday, index, personId) {
            const md = getWeekData(thursday);
            const part = (md.ministryParts || [])[index];
            if (!part) return;
            const p = getPerson(personId);
            part.assistantId = p ? p.id : '';
            part.assistant = p ? personName(p) : '';
            saveMeetingEditorData();
            renderStudentsView();
        }
        function setPartKind(thursday, index, kind) {
            const md = getWeekData(thursday);
            const part = (md.ministryParts || [])[index];
            if (!part || !STUDENT_KINDS[kind]) return;
            part.kind = kind;
            const k = STUDENT_KINDS[kind];
            const stu = getPerson(part.studentId) || findPersonByName(part.name);
            const cleared = [];
            const genderOk = !k.brotherOnly || (stu && stu.gender === 'Brother');
            const discOk = kind !== 'discussion' || (stu && (stu.atas === 'Elder' || stu.atas === 'MS'));
            if (stu && !(genderOk && discOk)) {
                part.studentId = ''; part.name = ''; cleared.push('student');
            }
            if (!k.assistant && (part.assistant || part.assistantId)) { part.assistantId = ''; part.assistant = ''; cleared.push('assistant'); }
            saveMeetingEditorData();
            renderStudentsView();
            if (cleared.length) alert(`Removed the ${cleared.join(' and ')} because they no longer fit the new part type.`);
        }
        function toggleIncludeElders(checked) {
            studentSettings.includeElders = !!checked;
            saveStudentSettings();
            renderStudentsView();
        }

        // --- Roster actions ---
        function setPersonGender(id, value) {
            const p = getPerson(id); if (!p) return;
            p.gender = normGender(value);
            saveData();
            renderStudentsView();
        }
        function setPersonActive(id, checked) {
            const p = getPerson(id); if (!p) return;
            p.active = !!checked;
            saveData();
            renderStudentsView();
        }
        function toggleRoster() { rosterOpen = !rosterOpen; renderStudentsView(); }
        function updateRosterFilter(field, value) {
            rosterFilter[field] = value;
            renderStudentsView();
            if (field === 'search') {
                const el = document.getElementById('rosterSearch');
                if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
            }
        }
        function addPersonManually() {
            const last = (document.getElementById('newPersonLast')?.value || '').trim();
            const first = (document.getElementById('newPersonFirst')?.value || '').trim();
            const atas = document.getElementById('newPersonAtas')?.value || 'Publisher';
            let gender = normGender(document.getElementById('newPersonGender')?.value || '');
            const pioneer = !!document.getElementById('newPersonPioneer')?.checked;
            const notes = (document.getElementById('newPersonNotes')?.value || '').trim();
            if (!last || !first) { alert('Enter both the first name and the last name.'); return; }
            if (people.some(p => normName(p.last) === normName(last) && normName(p.first) === normName(first))) { alert('This name is already in the roster.'); return; }
            if (!gender && (atas === 'Elder' || atas === 'MS')) gender = 'Brother';
            people.push({ id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, last, first, atas, pioneer, gender, notes, active: true });
            syncBrothersFromPeople();
            refreshBrotherCategories();
            saveData();
            renderStudentsView();
        }

        // Elder/MS sa roster → idagdag/i-update sa brothers list ng Assignments grid
        function syncBrothersFromPeople() {
            let added = 0, updated = 0;
            people.filter(p => (p.atas === 'Elder' || p.atas === 'MS') && p.active !== false).forEach(p => {
                const name = personName(p);
                const existing = brothers.find(b => normalizeBrotherName(b.name) === normalizeBrotherName(name));
                if (existing) {
                    if (existing.category !== p.atas) { existing.category = p.atas; updated++; }
                } else {
                    const newId = `brother-${Date.now()}-${Math.random()}`;
                    brothers.push({ id: newId, name, isSelectable: true, category: p.atas });
                    brotherEligibility[newId] = {};
                    ASSIGNMENT_TYPES.forEach(type => { brotherEligibility[newId][type] = true; });
                    added++;
                }
            });
            return { added, updated };
        }

        // --- Masterlist (.xlsx) import ---
        function handleMasterlistImport(event) {
            const file = event.target.files[0];
            event.target.value = '';
            if (!file) return;
            if (typeof XLSX === 'undefined') { alert('The Excel library did not load. Please refresh the page.'); return; }
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                    const ws = wb.Sheets['Masterlist'] || wb.Sheets[wb.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                    const get = (r, ...keys) => {
                        for (const k of keys) {
                            const f = Object.keys(r).find(x => x.trim().toLowerCase() === k.toLowerCase());
                            if (f !== undefined && String(r[f]).trim()) return String(r[f]).trim();
                        }
                        return '';
                    };
                    const incoming = rows.map(r => {
                        const atasRaw = get(r, 'Atas', 'Role');
                        const atas = PERSON_ATAS.find(a => a.toLowerCase() === atasRaw.toLowerCase()) || 'Publisher';
                        let gender = normGender(get(r, 'Brother/Sister', 'Kasarian', 'Gender'));
                        if (!gender && (atas === 'Elder' || atas === 'MS')) gender = 'Brother';
                        return {
                            last: get(r, 'Apelyido', 'Last Name'),
                            first: get(r, 'Pangalan', 'First Name'),
                            atas,
                            pioneer: /rp|pioneer/i.test(get(r, 'Pioneer')),
                            gender,
                            notes: get(r, 'Notes')
                        };
                    }).filter(p => p.last && p.first);
                    if (incoming.length === 0) throw new Error('No names found. The file needs "Apelyido" (last name) and "Pangalan" (first name) columns.');

                    const keyOf = p => `${normName(p.last)}|${normName(p.first)}`;
                    const existingByKey = new Map(people.map(p => [keyOf(p), p]));
                    let toAdd = 0, toUpdate = 0;
                    incoming.forEach(p => { existingByKey.has(keyOf(p)) ? toUpdate++ : toAdd++; });
                    const incomingKeys = new Set(incoming.map(keyOf));
                    const notInFile = people.filter(p => !incomingKeys.has(keyOf(p))).length;
                    const noGender = incoming.filter(p => !p.gender).length;

                    const msg = `Masterlist: ${incoming.length} name(s)\n\n` +
                        `• New: ${toAdd}\n• To update (Role, Pioneer, Notes): ${toUpdate}\n` +
                        (notInFile ? `• In the app but not in the file: ${notInFile} (you can choose to remove them next)\n` : '') +
                        (noGender ? `\n⚠ ${noGender} have no Brother/Sister in the file. They won't appear in the student lists until it is filled in (you can also do it in the Roster here).\n` : '') +
                        `\nBrother/Sister values you already set in the app will NOT be overwritten by blanks.\nContinue?`;
                    if (!confirm(msg)) return;

                    incoming.forEach(p => {
                        const ex = existingByKey.get(keyOf(p));
                        if (ex) {
                            ex.atas = p.atas;
                            ex.pioneer = p.pioneer;
                            ex.notes = p.notes;
                            if (p.gender) ex.gender = p.gender;
                        } else {
                            people.push({ id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...p, active: true });
                        }
                    });
                    // v21: mga nasa app pero wala na sa Masterlist — puwedeng alisin (kasama ang pangalan nila sa mga susunod na bahagi)
                    const gone = people.filter(p => !incomingKeys.has(keyOf(p)));
                    let removedTxt = '';
                    if (gone.length && confirm(`${gone.length} name(s) are in the app but NOT in this Masterlist:\n\n` +
                        gone.map(p => `• ${personLabel(p)} (${p.atas})`).join('\n') +
                        `\n\nRemove them from the roster?\n` +
                        `Their names are cleared from upcoming Students-tab parts (from next week on) so you can pick someone else. ` +
                        `This week and past weeks keep the name.\n\nCancel = keep them.`)) {
                        const r = removePeopleFromRoster(gone.map(p => p.id));
                        removedTxt = `\n\nRemoved ${r.removed} name(s) from the roster.` +
                            (r.cleared.length ? `\nCleared from upcoming parts — pick a new name:\n` + r.cleared.map(c => `• ${c}`).join('\n') : '') +
                            (r.brothers.length ? `\n\nStill in the Assignments grid (remove in 🎯 Manage Selection if needed): ${r.brothers.join(', ')}` : '');
                    }
                    const sync = syncBrothersFromPeople();
                    refreshBrotherCategories();
                    saveData();
                    saveMeetingEditorData();
                    render();
                    alert(`Masterlist imported!\n\n${toAdd} new, ${toUpdate} updated. Roster now: ${people.length}.\nAssignments grid: ${sync.added} Elder/MS added, ${sync.updated} category update(s).` + removedTxt);
                } catch (err) {
                    alert('Error importing the Masterlist: ' + err.message);
                }
            };
            reader.onerror = () => alert('Could not read the file. Please try again.');
            reader.readAsArrayBuffer(file);
        }

        // --- Render ---
        function renderStudentsView() {
            studentShuffleKey = null;
            const container = document.getElementById('studentsContent');
            if (!container) return;
            const monthStr = document.getElementById('monthSelect').value;
            const [year, month] = monthStr.split('-').map(Number);
            const thursdays = getThursdaysForMonthByWeekStart(year, month);
            const missingGender = people.filter(p => p.active !== false && !p.gender).length;

            let html = '';
            html += `<div class="stu-toolbar">
                <button onclick="document.getElementById('masterlistFileInput').click()" class="btn-secondary">📥 Import Masterlist (.xlsx)</button>
                <button onclick="toggleRoster()" class="btn-secondary">👥 Roster (${people.length}) ${rosterOpen ? '▲' : '▼'}</button>
                <span class="stu-divider"></span>
                ${renderAutoRangeControls()}
                <button onclick="startStudentAutoAssign()" class="btn-primary" title="Fill the empty student slots in the chosen months fairly">✨ Auto-Assign</button>
                <button onclick="clearStudentPartsForMonth()" class="btn-secondary" title="Clear every student name for this month">🧹 Clear Month</button>
                <button onclick="exportS89Slips()" class="btn-secondary" title="Make S-89 assignment slips (4 per page) for this month's students">🧾 S-89 Slips</button>
                ${studentUndo ? `<button onclick="undoStudentAutoAssign()" class="btn-secondary" title="Remove the names added by the last auto-assign">↩ Undo Auto-Assign</button>` : ''}
                <label class="stu-check"><input type="checkbox" ${studentSettings.includeElders ? 'checked' : ''} onchange="toggleIncludeElders(this.checked)"> Include elders in student parts</label>
            </div>`;
            if (people.length === 0) {
                html += `<div class="stu-empty">The roster is empty. Click <b>📥 Import Masterlist</b> and choose <i>Publishers from Congregation.xlsx</i>.</div>`;
                container.innerHTML = html;
                return;
            }
            if (missingGender) {
                html += `<div class="stu-warn">⚠ ${missingGender} ${missingGender === 1 ? 'person has' : 'people have'} no Brother/Sister set, so they don't appear in the pick lists.
                    <a href="#" onclick="rosterOpen=true;rosterFilter.missingGenderOnly=true;renderStudentsView();return false;">Show them in the Roster</a></div>`;
            }
            if (rosterOpen) html += renderRosterPanel();
            html += renderStudentIssuesBanner();

            thursdays.forEach(thursday => { html += renderStudentWeek(thursday); });
            container.innerHTML = html;
        }

        function renderStudentWeek(thursday) {
            const md = meetingEditorData[getMeetingEditorKey(thursday)] || {};
            const parts = md.ministryParts || [];
            const dateLabel = new Date(thursday + 'T12:00:00+08:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const wt = getWeekType(thursday);
            let h = `<div class="stu-week"><div class="stu-weekbar"><span>${dateLabel}</span><span>${escHtml(md.bibleReading || '')}</span></div>`;
            if (WEEK_TYPES[wt].noMeeting) {
                return h + `<div class="stu-empty">🚫 No meeting — ${escHtml(weekTypeText(thursday))} (set in the Schedule Editor).</div></div>`;
            }
            if (wt === 'co') h += `<div class="stu-note">🧳 Circuit overseer visit — student parts follow the workbook as usual (S-38 ¶21).</div>`;

            // 3. Pagbabasa ng Bibliya
            h += renderStudentSlot(thursday, 'bible', { title: '3. Pagbabasa ng Bibliya (4 min.)' }, 'bible', md.bibleReadingId || findPersonByName(md.bibleReadingName)?.id || '', md.bibleReadingName);

            if (parts.length === 0) {
                h += `<div class="stu-empty">No ministry parts for this week yet. Import the workbook in the <b>Schedule Editor</b> first.</div>`;
            }
            parts.forEach((part, i) => {
                const kind = getPartKind(part);
                const sid = part.studentId || findPersonByName(part.name)?.id || '';
                h += renderStudentSlot(thursday, i, part, kind, sid, part.name);
            });
            h += `</div>`;
            return h;
        }

        function renderStudentSlot(thursday, slot, part, kind, studentId, typedName) {
            const k = STUDENT_KINDS[kind] || STUDENT_KINDS.unknown;
            const slotArg = slot === 'bible' ? `'bible'` : slot;
            const clearBtn = (which, title) => `<button class="stu-x" title="${title}" onclick="clearStudentSlot('${thursday}', ${slotArg}, '${which}')">✕</button>`;
            let h = `<div class="stu-slot ${kind === 'discussion' ? 'stu-slot-disc' : ''}">`;
            h += `<div class="stu-slot-title">${escHtml(part.title || '(no title)')}</div>`;
            if (slot === 'bible') {
                h += `<div class="stu-kind"><span class="stu-badge">Brothers only</span></div>`;
            } else {
                h += `<div class="stu-kind"><select onchange="setPartKind('${thursday}', ${slot}, this.value)">` +
                    MINISTRY_KIND_OPTIONS.map(o => `<option value="${o}" ${o === kind ? 'selected' : ''}>${escHtml(STUDENT_KINDS[o].label)}</option>`).join('') +
                    `</select>${k.brotherOnly && kind !== 'discussion' ? '<span class="stu-badge">Brothers only</span>' : ''}</div>`;
            }
            const ranked = rankStudentCandidates(thursday, kind, studentId);
            const who = kind === 'discussion' ? '— Elder/MS —' : '— Student —';
            h += `<div class="stu-picks"><select class="stu-select" onchange="assignStudent('${thursday}', ${slotArg}, this.value)">${candidateOptions(ranked, studentId, who)}</select>`;
            if (studentId || (typedName || '').trim()) h += clearBtn('student', k.assistant && slot !== 'bible' ? 'Clear this part (student and assistant)' : 'Clear this part');
            if (k.assistant && slot !== 'bible') {
                const student = getPerson(studentId);
                const aid = part.assistantId || findPersonByName(part.assistant)?.id || '';
                if (student) {
                    const rA = rankAssistantCandidates(thursday, student, aid);
                    h += `<span class="amp">&</span><select class="stu-select" onchange="assignAssistant('${thursday}', ${slot}, this.value)">${candidateOptions(rA, aid, `— Assistant (${student.gender}) —`)}</select>`;
                    if (aid || (part.assistant || '').trim()) h += clearBtn('assistant', 'Clear the assistant');
                } else {
                    h += `<span class="stu-hint">Choose a student first to pick an assistant.</span>`;
                }
            }
            h += `</div>`;
            if (typedName && !studentId) {
                h += `<div class="stu-hint">Typed in the Schedule Editor: "${escHtml(typedName)}" (not matched to the roster, so it won't count in history)</div>`;
            }
            h += `</div>`;
            return h;
        }

        function renderRosterPanel() {
            const hist = buildStudentHistory();
            const today = manilaTodayISO();
            const q = normName(rosterFilter.search);
            const rows = people
                .filter(p => !q || normName(`${p.last} ${p.first}`).includes(q) || normName(`${p.first} ${p.last}`).includes(q))
                .filter(p => !rosterFilter.missingGenderOnly || !p.gender)
                .sort((a, b) => PERSON_ATAS.indexOf(a.atas) - PERSON_ATAS.indexOf(b.atas) || personLabel(a).localeCompare(personLabel(b)));
            let h = `<div class="stu-roster">
                <div class="stu-roster-tools">
                    <input id="rosterSearch" type="text" placeholder="Search…" value="${escHtml(rosterFilter.search)}" oninput="updateRosterFilter('search', this.value)">
                    <label class="stu-check"><input type="checkbox" ${rosterFilter.missingGenderOnly ? 'checked' : ''} onchange="updateRosterFilter('missingGenderOnly', this.checked)"> Missing Brother/Sister only</label>
                </div>
                <div class="stu-roster-hint">Edits here are saved in the app. The next Masterlist import overwrites Role, RP and Notes with the file's values, so update the Masterlist file too.</div>
                <table class="stu-table"><thead><tr><th>First Name</th><th>Last Name</th><th>Role</th><th>RP</th><th>Brother/Sister</th><th>Active</th><th>Last part (as Student)</th><th>Last role</th><th></th></tr></thead><tbody>`;
            rows.forEach(p => {
                const all = (hist[p.id] || []).filter(e => e.date <= today);
                const ls = all.find(e => e.role === 'Estudyante');
                const la = all[0];
                const fmt = e => e ? `${escHtml(STUDENT_KINDS[e.kind]?.short || e.kind)} · ${shortDate(e.date)} (${weeksAgo(e.date, today)})` : '<span class="stu-muted">—</span>';
                if (editingPersonId === p.id) { h += renderPersonEditRow(p); return; }
                h += `<tr class="${p.active === false ? 'stu-inactive' : ''}">
                    <td>${escHtml(p.first)}${p.pioneer ? ' <span class="stu-badge">RP</span>' : ''}${p.notes ? `<div class="stu-note">${escHtml(p.notes)}</div>` : ''}</td><td>${escHtml(p.last)}</td>
                    <td><select onchange="setPersonAtas('${p.id}', this.value)">${PERSON_ATAS.map(a => `<option ${a === p.atas ? 'selected' : ''}>${a}</option>`).join('')}</select></td>
                    <td><input type="checkbox" title="Regular Pioneer" ${p.pioneer ? 'checked' : ''} onchange="setPersonPioneer('${p.id}', this.checked)"></td>
                    <td><select onchange="setPersonGender('${p.id}', this.value)" class="${p.gender ? '' : 'stu-missing'}">
                        <option value="" ${!p.gender ? 'selected' : ''}>—</option>
                        <option value="Brother" ${p.gender === 'Brother' ? 'selected' : ''}>Brother</option>
                        <option value="Sister" ${p.gender === 'Sister' ? 'selected' : ''}>Sister</option></select></td>
                    <td><input type="checkbox" ${p.active !== false ? 'checked' : ''} onchange="setPersonActive('${p.id}', this.checked)"></td>
                    <td>${fmt(ls)}</td>
                    <td>${la ? `${escHtml(roleLabel(la.role))} · ${escHtml(STUDENT_KINDS[la.kind]?.short || la.kind)}` : '<span class="stu-muted">—</span>'}</td>
                    <td class="stu-actions"><button class="stu-x" title="Edit name / notes" onclick="startPersonEdit('${p.id}')">✏️</button><button class="stu-x" title="Remove from roster" onclick="removePerson('${p.id}')">🗑</button></td></tr>`;
            });
            h += `</tbody></table>
                <div class="stu-add">
                    <input id="newPersonFirst" placeholder="First name"><input id="newPersonLast" placeholder="Last name">
                    <select id="newPersonAtas">${PERSON_ATAS.map(a => `<option ${a === 'Publisher' ? 'selected' : ''}>${a}</option>`).join('')}</select>
                    <select id="newPersonGender"><option value="">Brother/Sister</option><option>Brother</option><option>Sister</option></select>
                    <label class="stu-check"><input type="checkbox" id="newPersonPioneer"> RP</label>
                    <input id="newPersonNotes" placeholder="Notes (optional)">
                    <button class="btn-secondary" onclick="addPersonManually()">+ Add</button>
                </div></div>`;
            return h;
        }


        // ==================== S-140 WORD EXPORT + TIMING (Hakbang 3) ====================
        // Iisang output: S-140 .docx. Ang oras ay kinukuwenta mula sa minuto sa workbook + settings.
        // Batayan: S-38 (¶20 haba ng pulong; ¶17 at ¶25 elder ang CBS conductor at chairman;
        // ¶16 elder ang Lokal na Pangangailangan; ¶19 ~1 min payo pagkatapos ng student part;
        // ¶21 dalaw ng CO; ¶22–23 walang pulong).

        const ELDER_ONLY_TYPES = ['OCLM Chairman', 'CBS'];
        const TG_MONTHS = ['', 'ENERO', 'PEBRERO', 'MARSO', 'ABRIL', 'MAYO', 'HUNYO', 'HULYO', 'AGOSTO', 'SETYEMBRE', 'OKTUBRE', 'NOBYEMBRE', 'DISYEMBRE'];
        const MEETING_MAX_MIN = 105; // 1 oras at 45 minuto, kasama ang mga awit at panalangin
        const S140_GRID = [648, 5068, 1800, 3500]; // v26: mas malapad ang pamagat para hindi na tumiklop ang "Pag-aaral ng Kongregasyon sa Bibliya" // oras | bahagi | label | pangalan (kabuuang 11016)
        let meetingSettings = { congName: '', startTime: '18:45', openingMin: 5, middleMin: 4, closingMin: 5, counselMin: 1, msMayChair: false, anchorClosing: true, msTalkMax: 2 };
        let msPanelOpen = false;

        function saveMeetingSettings() { localStorage.setItem('nc_meetingSettings', JSON.stringify(meetingSettings)); }
        function loadMeetingSettings() {
            try { const s = JSON.parse(localStorage.getItem('nc_meetingSettings') || '{}'); meetingSettings = { ...meetingSettings, ...s }; } catch (e) {}
        }
        function updateMeetingSetting(field, value) {
            if (['openingMin', 'middleMin', 'closingMin', 'counselMin', 'msTalkMax'].includes(field)) {
                const n = parseInt(value, 10);
                meetingSettings[field] = isNaN(n) || n < 0 ? 0 : Math.min(n, 30);
            } else if (field === 'msMayChair' || field === 'anchorClosing') {
                meetingSettings[field] = !!value;
            } else if (field === 'startTime') {
                if (/^\d{1,2}:\d{2}$/.test(value || '')) meetingSettings.startTime = value;
            } else {
                meetingSettings[field] = String(value || '').trim();
            }
            saveMeetingSettings();
            render();
        }

        // --- Elder lang (S-38 ¶17, ¶25) ---
        function elderOnlyViolation(brother, type) {
            return ELDER_ONLY_TYPES.includes(type) && !!brother && getBrotherCategory(brother) !== 'Elder' && !meetingSettings.msMayChair;
        }
        // Lokal na Pangangailangan: ang Pamumuhay part ay itinatala ayon sa pagkakasunod (slot 0, 1, …),
        // kaya ang susunod na idaragdag ay pupunta sa slot = bilang ng naka-assign na.
        function isLocalNeedsTitle(title) { return /lokal na pangangailangan/i.test(title || ''); }
        function nextPamumuhaySlot(date) { return assignments.filter(a => a.date === date && a.type === 'Pamumuhay').length; }
        function isLocalNeedsSlot(date, slotIdx) {
            const md = meetingEditorData[getMeetingEditorKey(date)] || {};
            return isLocalNeedsTitle(md['pamumuhayTitle' + slotIdx]);
        }
        function requiresElder(date, type) {
            if (ELDER_ONLY_TYPES.includes(type)) return !meetingSettings.msMayChair;
            // S-38 ¶16: ang lokal na pangangailangan ay dapat gampanan ng elder (walang eksepsiyon para sa MS)
            if (type === 'Pamumuhay' && date) return isLocalNeedsSlot(date, nextPamumuhaySlot(date));
            return false;
        }
        function confirmElderOnly(brotherId, type, date) {
            const b = brothers.find(x => x.id === brotherId);
            if (!b || getBrotherCategory(b) === 'Elder' || !requiresElder(date, type)) return true;
            if (type === 'Pamumuhay') {
                return confirm(`According to the S-38, Local Needs (Lokal na Pangangailangan) must be handled by an elder.\n\n${b.name} is ${getBrotherCategory(b)}. Assign anyway?`);
            }
            const role = type === 'CBS' ? 'conductor of the Congregation Bible Study' : 'chairman of the meeting';
            return confirm(`According to the S-38, the ${role} should be an elder. A ministerial servant may be used only when the number of elders is limited.\n\n${b.name} is ${getBrotherCategory(b)}. Assign anyway?`);
        }
        function getAssignedBrotherObjs(date, type) {
            return assignments.filter(a => a.date === date && a.type === type)
                .map(a => brothers.find(b => b.id === a.brotherId)).filter(Boolean);
        }

        // --- Oras ---
        function parseStartMin(hhmm) {
            const m = (hhmm || '18:45').match(/^(\d{1,2}):(\d{2})$/);
            return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 18 * 60 + 45;
        }
        function fmtClock(totalMin) {
            let h = Math.floor(totalMin / 60) % 24;
            const m = totalMin % 60;
            h = h % 12 || 12;
            return `${h}:${String(m).padStart(2, '0')}`;
        }
        function fmtDuration(min) { return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`; }
        function titleMinutes(title) {
            const m = (title || '').match(/\((\d+)\s*min\.?\)/i);
            return m ? parseInt(m[1], 10) : null;
        }
        function titleText(title) {
            return (title || '').replace(/^\s*\d+\.\s*/, '').replace(/\s*\(\d+\s*min\.?\)\s*/i, ' ').replace(/\s+/g, ' ').trim();
        }
        function pairNames(a, b) {
            if (!a && !b) return '';
            return `${a || '—'} / ${b || '—'}`;
        }

        // --- Modelo ng isang linggo: mga hilera + oras + mga paalala ---
        function buildWeekModel(thursday) {
            const md = meetingEditorData[getMeetingEditorKey(thursday)] || {};
            const s = meetingSettings;
            const d = new Date(thursday + 'T12:00:00+08:00');
            const model = {
                thursday,
                dateLabel: s140WeekLabel(thursday), // v26: "NOBYEMBRE 2-8" gaya ng workbook
                bible: (md.bibleReading || '').toUpperCase(),
                type: getWeekType(thursday) || 'normal',
                noMeeting: isNoMeetingWeek(thursday),
                reasonTG: [WEEK_TYPES[getWeekType(thursday)].tg, md.noMeetingReason].filter(Boolean).join(' — '),
                reason: md.noMeetingReason || '',
                chairman: getAssignedBrother(thursday, 'OCLM Chairman'),
                rows: [], warnings: [],
                start: parseStartMin(s.startTime), end: null,
                ministryMin: 0, livingMin: 0, missingNames: 0, tbaLocalNeeds: 0
            };
            if (model.noMeeting) { model.end = model.start; return model; }

            let t = model.start;
            const push = (sec, row, minutes) => { row.sec = sec; row.time = fmtClock(t); model.rows.push(row); t += minutes; };
            const song = n => `Awit ${n || ''}`.trim();

            // Pambungad
            push('open', { text: song(md.openingSong), label: 'Panalangin:', names: getAssignedBrother(thursday, 'Opening Prayer') }, s.openingMin);
            push('open', { text: 'Pambungad na Komento', dispMin: 1 }, 1);

            // Kayamanan
            const p1m = titleMinutes(md.part1Title) ?? 10;
            push('kayaman', { num: 1, text: titleText(md.part1Title) || '[Pamagat]', dispMin: p1m, names: getAssignedBrother(thursday, '10 mins talk') }, p1m);
            push('kayaman', { num: 2, text: 'Espirituwal na Hiyas', dispMin: 10, names: getAssignedBrother(thursday, 'Espiritual na Hiyas') }, 10);
            push('kayaman', { num: 3, text: 'Pagbabasa ng Bibliya', dispMin: 4, label: 'Estudyante:', names: md.bibleReadingName || '' }, 4 + s.counselMin);

            // Maging Mahusay sa Ministeryo
            let num = 4;
            const mStart = t;
            (md.ministryParts || []).forEach(part => {
                const kind = getPartKind(part);
                const k = STUDENT_KINDS[kind] || STUDENT_KINDS.unknown;
                let m = titleMinutes(part.title);
                if (m === null) { model.warnings.push(`#${num}: no minutes in the title`); m = 0; }
                const label = kind === 'discussion' ? '' : (k.assistant ? 'Estudyante/Assistant:' : 'Estudyante:');
                const names = k.assistant ? pairNames(part.name, part.assistant) : (part.name || '');
                push('ministry', { num, text: titleText(part.title) || '[Pamagat]', dispMin: m || null, label, names, pair: k.assistant }, m + (k.student ? s.counselMin : 0));
                num++;
            });
            model.ministryMin = t - mStart;

            // Pamumuhay Bilang Kristiyano
            push('living', { text: song(md.middleSong) }, s.middleMin);
            const livBros = getAssignedBrotherObjs(thursday, 'Pamumuhay');
            let titleCount = 0;
            for (let i = 0; i < 6; i++) if (md['pamumuhayTitle' + i]) titleCount = i + 1;
            const living = [];
            for (let i = 0; i < Math.max(titleCount, livBros.length, 1); i++) {
                living.push({ title: md['pamumuhayTitle' + i] || '', name: livBros[i]?.name || '', bro: livBros[i] || null });
            }
            (md.livingParts || []).forEach(p => living.push({ title: p.title || '', name: p.name || '', bro: null }));
            const known = living.reduce((acc, p) => acc + (titleMinutes(p.title) || 0), 0);
            const unknown = living.filter(p => titleMinutes(p.title) === null).length;
            const lStart = t;
            living.forEach(p => {
                let m = titleMinutes(p.title);
                if (m === null) {
                    m = Math.max(0, Math.floor((15 - known) / unknown));
                    model.warnings.push(`#${num}: no minutes${titleText(p.title) && titleText(p.title) !== 'Pamumuhay' ? '' : ' or title'} (used ${m} min)`);
                }
                if (isLocalNeedsTitle(p.title) && p.bro && getBrotherCategory(p.bro) !== 'Elder') {
                    model.warnings.push(`#${num} Local Needs: ${p.bro.name} is ${getBrotherCategory(p.bro)} (S-38: elder only)`);
                }
                const txt = titleText(p.title);
                // v25: Lokal na Pangangailangan na wala pang gaganap → "TBA" (pinag-uusapan pa ng mga elder)
                const tba = isLocalNeedsTitle(p.title) && !String(p.name || '').trim();
                if (tba) model.tbaLocalNeeds++;
                push('living', { num, text: txt && txt !== 'Pamumuhay' ? txt : '[Pamagat]', dispMin: m, names: tba ? 'TBA' : p.name }, m);
                num++;
            });
            model.livingMin = t - lStart;

            const closingPrayer = getAssignedBrother(thursday, 'Closing prayer');
            // v8: ang natitirang minuto (hanggang 1:45) ay napupunta sa Pangwakas na Komento — para sa mga patalastas
            // at liham na babasahin (S-38 ¶18) — kaya ang panghuling Awit + Panalangin ay laging huling ${closingMin} minuto.
            const afterClosing = (model.type === 'co' ? 30 : 0) + s.closingMin;
            const beforeClosing = (t - model.start) + (model.type === 'co' ? 0 : 30);
            model.buffer = s.anchorClosing ? Math.max(0, MEETING_MAX_MIN - (beforeClosing + 3 + afterClosing)) : 0;
            if (model.type === 'co') {
                push('living', { text: 'Pangwakas na Komento', dispMin: 3 }, 3 + model.buffer);
                push('living', { num, text: 'Pahayag sa Paglilingkod', dispMin: 30, names: md.coName || 'Tagapangasiwa ng Sirkito' }, 30);
                push('living', { text: 'Awit (pipiliin ng tagapangasiwa ng sirkito)', label: 'Panalangin:', names: closingPrayer }, s.closingMin);
            } else {
                push('living', { num, text: 'Pag-aaral ng Kongregasyon sa Bibliya', dispMin: 30, label: 'Konduktor/Tagabasa:',
                    names: pairNames(getAssignedBrother(thursday, 'CBS'), getAssignedBrother(thursday, 'CBS Reader')), pair: true }, 30);
                push('living', { text: 'Pangwakas na Komento', dispMin: 3 }, 3 + model.buffer);
                push('living', { text: song(md.closingSong), label: 'Panalangin:', names: closingPrayer }, s.closingMin);
            }
            model.end = t;

            // Mga paalala
            const dur = model.end - model.start;
            if (dur > MEETING_MAX_MIN) model.warnings.push(`Runs over 1:45 — ${fmtDuration(dur)} (ends ${fmtClock(model.end)})`);
            if (model.ministryMin > 15) model.warnings.push(`Apply Yourself: ${model.ministryMin} min incl. counsel (S-38: 15 min)`);
            if (!unknown && model.livingMin !== 15) model.warnings.push(`Living as Christians: ${model.livingMin} min (S-38: 15 min)`);
            const ch = getAssignedBrotherObjs(thursday, 'OCLM Chairman')[0];
            if (ch && elderOnlyViolation(ch, 'OCLM Chairman')) model.warnings.push(`Chairman: ${ch.name} is ${getBrotherCategory(ch)} (S-38: elder)`);
            const cb = getAssignedBrotherObjs(thursday, 'CBS')[0];
            if (model.type !== 'co' && cb && elderOnlyViolation(cb, 'CBS')) model.warnings.push(`CBS conductor: ${cb.name} is ${getBrotherCategory(cb)} (S-38: elder)`);
            model.missingNames = (model.chairman ? 0 : 1) +
                model.rows.filter(r => 'names' in r && (!String(r.names || '').trim() || String(r.names).includes('—'))).length;
            return model;
        }

        // --- Schedule Editor: settings, uri ng linggo, at buod ng oras ---
        function renderMeetingSettingsPanel() {
            const el = document.getElementById('meetingSettingsPanel');
            if (!el) return;
            const s = meetingSettings;
            const num = (field, label) => `<label class="ms-field">${label}<input type="number" min="0" max="30" value="${s[field]}" onchange="updateMeetingSetting('${field}', this.value)"></label>`;
            el.innerHTML = `<details class="ms-panel" ${msPanelOpen ? 'open' : ''} ontoggle="msPanelOpen = this.open">
                <summary>⚙️ Meeting & S-140 settings</summary>
                <div class="ms-grid">
                    <label class="ms-field ms-wide">Congregation name<input type="text" value="${escHtml(s.congName)}" placeholder="(no name yet)" onchange="updateMeetingSetting('congName', this.value)"></label>
                    <label class="ms-field">Meeting start time<input type="time" value="${escHtml(s.startTime)}" onchange="updateMeetingSetting('startTime', this.value)"></label>
                    ${num('openingMin', 'Opening song + prayer (min)')}
                    ${num('middleMin', 'Middle song (min)')}
                    ${num('closingMin', 'Closing song + prayer (min)')}
                    ${num('counselMin', 'Counsel after each student part (min)')}
                    <label class="ms-check ms-wide"><input type="checkbox" ${s.anchorClosing ? 'checked' : ''} onchange="updateMeetingSetting('anchorClosing', this.checked)">
                        Keep the closing song + prayer for the last ${s.closingMin} minutes of the 1:45 — any spare minutes go to the closing comments (announcements, letters)</label>
                    ${num('msTalkMax', 'MS: max 10-min talks per month (whole congregation)')}
                    <label class="ms-check ms-wide"><input type="checkbox" ${s.msMayChair ? 'checked' : ''} onchange="updateMeetingSetting('msMayChair', this.checked)">
                        Limited number of elders: allow ministerial servants as Chairman and CBS conductor (S-38 ¶17, ¶25)</label>
                </div>
            </details>`;
        }
        function renderWeekTypeControls(thursday) {
            const t = getWeekType(thursday);
            const opts = Object.keys(WEEK_TYPES).map(v => `<option value="${v || 'normal'}" ${t === v ? 'selected' : ''}>${WEEK_TYPES[v].label}</option>`).join('');
            let h = `<div class="week-type-row ${t ? 'wt-special' : ''}"><label>Week type: <select onchange="setWeekType('${thursday}', this.value)">${opts}</select></label>`;
            if (t === 'co') {
                h += `<input type="text" class="pdf-editor-input" style="width:200px;" value="${escHtml(getMeetingField(thursday, 'coName', ''))}" onchange="updateMeetingField('${thursday}', 'coName', this.value); render();" placeholder="Circuit overseer's name">`;
            } else if (WEEK_TYPES[t].noMeeting) {
                h += `<input type="text" class="pdf-editor-input" style="width:240px;" value="${escHtml(getMeetingField(thursday, 'noMeetingReason', ''))}" onchange="updateMeetingField('${thursday}', 'noMeetingReason', this.value); render();" placeholder="Note (optional), e.g. venue">`;
            }
            return h + `</div>`;
        }
        function setWeekType(thursday, value) {
            applyWeekType(thursday, value === 'normal' ? '' : value, null);
        }
        function renderWeekTimingSummary(thursday) {
            const m = buildWeekModel(thursday);
            if (m.noMeeting) {
                return `<div class="week-timing">🚫 No meeting — ${escHtml(weekTypeText(thursday))}. The S-140 will show “WALANG PULONG${m.reasonTG ? ' — ' + escHtml(m.reasonTG.toUpperCase()) : ''}”.</div>`;
            }
            const dur = m.end - m.start;
            const ok = m.warnings.length === 0;
            let h = `<div class="week-timing ${ok ? 'ok' : 'warn'}">⏱ ${fmtClock(m.start)} → <b>${fmtClock(m.end)}</b> (${fmtDuration(dur)})` +
                ` · Apply Yourself ${m.ministryMin} min · Living as Christians ${m.livingMin} min${ok ? ' ✓' : ''}`;
            if (m.buffer) h += ` · Closing comments ${3 + m.buffer} min (3 + ${m.buffer} for announcements)`;
            if (m.type === 'co') h += ` · 🧳 CO visit`;
            if (m.missingNames) h += ` · <span class="wt-muted">${m.missingNames} still without a name</span>`;
            if (!ok) h += `<ul>${m.warnings.map(w => `<li>⚠ ${escHtml(w)}</li>`).join('')}</ul>`;
            return h + `</div>`;
        }

        // --- Word XML ---
        const S140_LANG = '<w:lang w:val="af-ZA"/>';
        function xmlEsc(s) {
            return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
        function wRun(text, o = {}) {
            if (text === '' || text === null || text === undefined) return '';
            let rpr = '';
            if (o.major) rpr += '<w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi"/>';
            if (o.b) rpr += '<w:b/>';
            if (o.color) rpr += `<w:color w:val="${o.color}"/>`;
            if (o.sz) rpr += `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>`;
            return `<w:r><w:rPr>${rpr}${S140_LANG}</w:rPr><w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r>`;
        }
        function wPara(runs, o = {}) {
            let ppr = '';
            if (o.spacing) ppr += o.spacing;
            if (o.jc) ppr += `<w:jc w:val="${o.jc}"/>`;
            return `<w:p><w:pPr>${ppr}<w:rPr>${S140_LANG}</w:rPr></w:pPr>${runs || ''}</w:p>`;
        }
        function wCell(width, content, o = {}) {
            let pr = `<w:tcW w:w="${width}" w:type="dxa"/>`;
            if (o.span > 1) pr += `<w:gridSpan w:val="${o.span}"/>`;
            if (o.borderBottom) pr += '<w:tcBorders><w:bottom w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="575A5D"/></w:tcBorders>';
            if (o.fill) pr += `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>`;
            pr += `<w:vAlign w:val="${o.valign || 'center'}"/>`;
            return `<w:tc><w:tcPr>${pr}</w:tcPr>${content || wPara('')}</w:tc>`;
        }
        function wRow(cells) { return `<w:tr><w:trPr><w:trHeight w:val="${S140_SP.row}"/></w:trPr>${cells}</w:tr>`; }
        function wTable(grid, rows, headerBorder) {
            const borders = headerBorder
                ? '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="A6A6A6"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>'
                : '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
            return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/>${borders}` +
                `<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>` +
                `<w:tblGrid>${grid.map(g => `<w:gridCol w:w="${g}"/>`).join('')}</w:tblGrid>${rows}</w:tbl>`;
        }
        function wSpacer(sz) {
            return `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:rPr><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${S140_LANG}</w:rPr></w:pPr></w:p>`;
        }
        function wPageBreak() {
            return `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/>${S140_LANG}</w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr><w:br w:type="page"/></w:r></w:p>`;
        }

        function s140PageHeader() {
            const name = meetingSettings.congName ? meetingSettings.congName.toUpperCase() : '[PANGALAN NG KONGREGASYON]';
            const sp = '<w:spacing w:after="60"/>';
            return wTable([3618, 7398], wRow(
                wCell(3618, wPara(wRun(name, { b: 1 }), { spacing: sp }), { borderBottom: 1, valign: 'bottom' }) +
                wCell(7398, wPara(wRun('Iskedyul ng Pulong sa Gitnang Sanlinggo', { major: 1, b: 1, sz: 36 }), { spacing: sp, jc: 'right' }), { borderBottom: 1, valign: 'bottom' })
            ), true);
        }
        function s140PartRow(r) {
            const [g0, g1, g2, g3] = S140_GRID;
            const time = wCell(g0, wPara(wRun(r.time, { b: 1, color: '575A5D', sz: 18 })));
            const titleRuns = wRun(`${r.num ? r.num + '. ' : ''}${r.text}`) + (r.dispMin ? wRun('\u2002', { sz: 24 }) + wRun(`(${r.dispMin} min.)`) : '');
            const hasNames = 'names' in r;
            const nameCell = hasNames ? wCell(g3, wPara(wRun(r.names || '', r.pair ? { sz: 20 } : {}))) : '';
            if (r.label) {
                return wRow(time + wCell(g1, wPara(titleRuns)) +
                    wCell(g2, wPara(wRun(r.label, { b: 1, color: '575A5D', sz: 16 }), { jc: 'right' })) + nameCell);
            }
            if (hasNames) return wRow(time + wCell(g1 + g2, wPara(titleRuns), { span: 2 }) + nameCell);
            return wRow(time + wCell(g1 + g2 + g3, wPara(titleRuns), { span: 3 }));
        }
        function s140SectionTable(title, fill, rows) {
            const [g0, g1, g2, g3] = S140_GRID;
            const header = wRow(
                wCell(g0 + g1, wPara(wRun(title, { b: 1, color: 'FFFFFF', sz: 20 }), { spacing: `<w:spacing w:before="${S140_SP.hdrPad}" w:after="${S140_SP.hdrPad}"/>` }), { span: 2, fill }) +
                wCell(g2 + g3, wPara(''), { span: 2 })
            );
            return wTable(S140_GRID, header + rows.map(s140PartRow).join(''));
        }
        function s140WeekXml(m) {
            const [g0, g1, g2, g3] = S140_GRID;
            const dateRuns = wRun(m.dateLabel, { b: 1 }) + (m.bible ? wRun(' | ', { b: 1 }) + wRun(m.bible, { b: 1 }) : '');
            if (m.noMeeting) {
                const top = wTable([g0 + g1, g2 + g3], wRow(wCell(g0 + g1, wPara(dateRuns), { valign: 'bottom' }) + wCell(g2 + g3, wPara(''))));
                const msg = `WALANG PULONG${m.reasonTG ? ' — ' + m.reasonTG.toUpperCase() : ''}`;
                const body = wTable([g0 + g1 + g2 + g3], wRow(wCell(g0 + g1 + g2 + g3, wPara(wRun(msg, { b: 1, color: '575A5D', sz: 20 }),
                    { spacing: '<w:spacing w:before="120" w:after="120"/>', jc: 'center' }), { fill: 'EDEDED' })));
                return top + wSpacer(12) + body;
            }
            const top = wTable([g0 + g1, g2, g3], wRow(
                wCell(g0 + g1, wPara(dateRuns + (m.type === 'co' ? wRun('  ·  DALAW NG TAGAPANGASIWA NG SIRKITO', { b: 1, color: '7E0024', sz: 16 }) : '')), { valign: 'bottom' }) +
                wCell(g2, wPara(wRun('Chairman:', { b: 1, color: '575A5D', sz: 16 }), { jc: 'right' })) +
                wCell(g3, wPara(wRun(m.chairman || '')))
            ));
            const sec = name => m.rows.filter(r => r.sec === name);
            const g = S140_SP.sec;
            return top + wSpacer(g) +
                wTable(S140_GRID, sec('open').map(s140PartRow).join('')) + wSpacer(g) +
                s140SectionTable('KAYAMANAN MULA SA SALITA NG DIYOS', '575A5D', sec('kayaman')) + wSpacer(g) +
                s140SectionTable('MAGING MAHUSAY SA MINISTERYO', 'BE8900', sec('ministry')) + wSpacer(g) +
                s140SectionTable('PAMUMUHAY BILANG KRISTIYANO', '7E0024', sec('living'));
        }
        function buildS140BodyXml(thursdays, spForce) {
            let xml = '';
            const models = thursdays.map(buildWeekModel);
            // v26: iisang luwag para sa buong buwan (pare-pareho ang itsura) — ang pinakamaluwag na kasya
            // pa rin ang 2 linggo sa bawat pahina
            const pages = [];
            for (let i = 0; i < models.length; i += 2) pages.push(models.slice(i, i + 2));
            const fits = pages.map(s140FitSpacing);
            S140_SP = spForce ? { ...spForce } : fits.reduce((a, b) => (b.row < a.row ? b : a), fits[0] || { ...S140_SP_MIN });
            for (let i = 0; i < models.length; i += 2) {
                const pageModels = models.slice(i, i + 2);
                if (i > 0) xml += wPageBreak();
                xml += s140PageHeader() + wSpacer(S140_SP.sec);
                pageModels.forEach((m, k) => {
                    if (k > 0) xml += wSpacer(S140_SP.week);
                    xml += s140WeekXml(m);
                });
            }
            S140_SP = { ...S140_SP_MIN };
            return xml + wSpacer(12);
        }

        // v26: linggo (Lunes–Linggo) sa anyo ng workbook: "NOBYEMBRE 2-8", "NOBYEMBRE 30–DISYEMBRE 6",
        //      "DISYEMBRE 28, 2026–ENERO 3, 2027"
        function s140WeekLabel(thursday) {
            const mon = new Date(new Date(thursday + 'T12:00:00+08:00').getTime() - 3 * 86400000);
            const sun = new Date(mon.getTime() + 6 * 86400000);
            const M = d => TG_MONTHS[d.getMonth() + 1];
            if (mon.getFullYear() !== sun.getFullYear())
                return `${M(mon)} ${mon.getDate()}, ${mon.getFullYear()}\u2013${M(sun)} ${sun.getDate()}, ${sun.getFullYear()}`;
            if (mon.getMonth() !== sun.getMonth()) return `${M(mon)} ${mon.getDate()}\u2013${M(sun)} ${sun.getDate()}`;
            return `${M(mon)} ${mon.getDate()}-${sun.getDate()}`;
        }

        // ==================== v26: S-140 spacing (luwag) ====================
        // MIN = dating sukat (masikip pero laging kasya). MAX = pinakamaluwag. Pinipili ang pinakamalapit sa MAX na kasya.
        const S140_SP_MIN = { row: 288, sec: 12, week: 36, hdrPad: 20 };
        const S140_SP_MAX = { row: 380, sec: 22, week: 60, hdrPad: 60 };
        // Letter 15840 − itaas 432 − footer ~964 = 14444 twips. Ang tantiya sa ibaba ay ~700–1000 mas mataas kaysa
        // sa sukat gamit ang tunay na font, kaya 14650 dito ≈ 13.7–13.9k talaga (may ~500 palugit).
        const S140_PAGE_BUDGET = 14650;
        let S140_SP = { ...S140_SP_MIN };
        function s140Lerp(s) {
            const o = {};
            Object.keys(S140_SP_MIN).forEach(k => { o[k] = Math.round(S140_SP_MIN[k] + (S140_SP_MAX[k] - S140_SP_MIN[k]) * s); });
            return o;
        }
        function s140LineH(sz) { return sz / 2 * 1.22 * 20; }
        function s140TextLines(text, sz, bold, width) {
            const w = String(text || '').length * (sz / 2) * 20 * 0.47 * (bold ? 1.08 : 1);
            return Math.max(1, Math.ceil(w / Math.max(200, width - 216)));
        }
        function s140RowH(r, sp) {
            const [g0, g1, g2, g3] = S140_GRID;
            const title = `${r.num ? r.num + '. ' : ''}${r.text || ''}${r.dispMin ? ` (${r.dispMin} min.)` : ''}`;
            const tW = r.label ? g1 : ('names' in r ? g1 + g2 : g1 + g2 + g3);
            let lines = s140TextLines(title, 22, false, tW);
            if ('names' in r) lines = Math.max(lines, s140TextLines(r.names, r.pair ? 20 : 22, false, g3));
            return Math.max(sp.row, lines * s140LineH(22));
        }
        function s140WeekHeight(m, sp) {
            const top = Math.max(sp.row, s140LineH(22));
            if (m.noMeeting) return top + s140LineH(12) + Math.max(sp.row, 240 + s140LineH(20));
            const hdr = Math.max(sp.row, 2 * sp.hdrPad + s140LineH(20));
            const rows = m.rows.reduce((a, r) => a + s140RowH(r, sp), 0);
            return top + 4 * s140LineH(sp.sec) + 3 * hdr + rows;
        }
        function s140PageHeight(models, sp) {
            const header = Math.max(sp.row, s140LineH(36) + 60);
            return header + s140LineH(sp.sec) + models.reduce((a, m) => a + s140WeekHeight(m, sp), 0) +
                (models.length > 1 ? s140LineH(sp.week) : 0) + s140LineH(12);
        }
        function s140FitSpacing(models) {
            for (let k = 20; k > 0; k--) { const s = k / 20;
                const sp = s140Lerp(s);
                if (s140PageHeight(models, sp) <= S140_PAGE_BUDGET) return sp;
            }
            return { ...S140_SP_MIN };
        }
        async function exportS140Pdf() {
            loadMeetingEditorData();
            const [year, month] = document.getElementById('monthSelect').value.split('-').map(Number);
            const thursdays = getThursdaysForMonthByWeekStart(year, month);
            if (thursdays.length === 0) { alert('There are no Thursdays in this month.'); return; }
            const issues = [];
            thursdays.map(buildWeekModel).forEach(m => {
                m.warnings.forEach(w => issues.push(`${shortDate(m.thursday)}: ${w}`));
                if (!m.noMeeting && m.missingNames) issues.push(`${shortDate(m.thursday)}: ${m.missingNames} part(s) still have no name`);
            });
            if (issues.length) {
                const list = issues.slice(0, 12).join('\n• ') + (issues.length > 12 ? `\n• …and ${issues.length - 12} more` : '');
                if (!confirm(`${issues.length} reminder(s) before exporting:\n\n• ${list}\n\nExport anyway?`)) return;
            }
            try {
                const bytes = await buildS140Pdf(year, month);
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const monthName = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month];
                const name = `S-140 ${monthName} ${year}.pdf`;
                const where = await saveToSchedule(name, blob);
                const tbaWeeks = thursdays.map(buildWeekModel).filter(m => !m.noMeeting && m.tbaLocalNeeds).map(m => shortDate(m.thursday));
                alert((where === 'folder' ? `Saved ${name} to the "${lastSaveFolderName || 'schedule'}" folder!` : `Downloaded ${name} (it went to your Downloads folder).`) +
                    (tbaWeeks.length ? `\n\nLocal Needs shown as "TBA" (no one assigned yet): ${tbaWeeks.join(', ')}.\nExport again once the elders decide.` : ''));
            } catch (e) {
                alert('Error exporting the S-140: ' + e.message);
            }
        }


        // ==================== v4: English UI helpers, special weeks, student auto-assign ====================
        const TYPE_LABELS = { 'Espiritual na Hiyas': 'Spiritual Gems', 'Pamumuhay': 'Living as Christians', 'CBS': 'CBS Conductor', 'Closing prayer': 'Closing Prayer' };
        function typeLabel(t) { return TYPE_LABELS[t] || t; }
        function roleLabel(r) { return r === 'Estudyante' ? 'Student' : r; }
        function weeksAgo(date, ref) {
            const w = weeksBetween(date, ref);
            if (w === 0) return 'this week';
            return date > ref ? `in ${w} wk${w === 1 ? '' : 's'}` : `${w} wk${w === 1 ? '' : 's'} ago`;
        }

        // --- Special weeks (S-38 ¶21–23) ---
        // Iisang source of truth: meetingEditorData[week].weekType ('' | co | assembly | convention | memorial | none)
        const WEEK_TYPES = {
            '':         { label: 'Normal meeting' },
            co:         { label: 'Circuit overseer visit' },
            assembly:   { label: 'Circuit assembly week', noMeeting: true, tg: 'Linggo ng Pansirkitong Asamblea' },
            convention: { label: 'Regional convention week', noMeeting: true, tg: 'Linggo ng Panrehiyong Kombensiyon' },
            memorial:   { label: 'Memorial on a weekday', noMeeting: true, tg: 'Linggo ng Memoryal' },
            none:       { label: 'Other — no meeting', noMeeting: true, tg: '' }
        };
        let swPanelOpen = false;
        function getWeekType(thursday) {
            const t = (meetingEditorData[getMeetingEditorKey(thursday)] || {}).weekType || '';
            return WEEK_TYPES[t] ? t : '';
        }
        function isNoMeetingWeek(thursday) { return !!WEEK_TYPES[getWeekType(thursday)].noMeeting; }
        function weekTypeText(thursday) {
            const t = getWeekType(thursday);
            const md = meetingEditorData[getMeetingEditorKey(thursday)] || {};
            const note = t === 'co' ? (md.coName || '') : (md.noMeetingReason || '');
            return `${WEEK_TYPES[t].label}${note ? ' — ' + note : ''}`;
        }
        // Puwede bang magkaroon ng atas ang slot na ito sa linggong ito?
        function isSlotActive(date, type) {
            if (isNoMeetingWeek(date)) return false;
            if (getWeekType(date) === 'co' && (type === 'CBS' || type === 'CBS Reader')) return false;
            return true;
        }
        function confirmSpecialWeek(date, type) {
            if (isSlotActive(date, type)) return true;
            const t = getWeekType(date);
            const why = WEEK_TYPES[t].noMeeting
                ? `${weekRangeLabel(date)} is marked as "${WEEK_TYPES[t].label}" — there is no midweek meeting.`
                : `${weekRangeLabel(date)} is a circuit overseer visit — his service talk replaces the Congregation Bible Study (S-38 ¶21).`;
            return confirm(`${why}\n\nAssign anyway?`);
        }
        function thursdayOfWeek(dateStr) {
            const d = new Date(dateStr + 'T12:00:00+08:00');
            const offset = (d.getDay() + 6) % 7; // Monday = 0 … Sunday = 6
            const thu = new Date(d.getTime() + (3 - offset) * 86400000);
            return `${thu.getFullYear()}-${String(thu.getMonth() + 1).padStart(2, '0')}-${String(thu.getDate()).padStart(2, '0')}`;
        }
        function weekRangeLabel(thursday) {
            const t = new Date(thursday + 'T12:00:00+08:00');
            const mon = new Date(t.getTime() - 3 * 86400000), sun = new Date(t.getTime() + 3 * 86400000);
            const f = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `Week of ${f(mon)} – ${f(sun)}, ${sun.getFullYear()}`;
        }
        function countStudentNames(thursday) {
            const md = meetingEditorData[getMeetingEditorKey(thursday)] || {};
            let n = (md.bibleReadingId || (md.bibleReadingName || '').trim()) ? 1 : 0;
            (md.ministryParts || []).forEach(p => {
                if (p.studentId || (p.name || '').trim()) n++;
                if (p.assistantId || (p.assistant || '').trim()) n++;
            });
            return n;
        }
        function clearStudentWeek(thursday) {
            const md = meetingEditorData[getMeetingEditorKey(thursday)];
            if (!md) return;
            md.bibleReadingId = ''; md.bibleReadingName = '';
            (md.ministryParts || []).forEach(p => { p.studentId = ''; p.name = ''; p.assistantId = ''; p.assistant = ''; });
        }
        function applyWeekType(thursday, type, note) {
            if (!WEEK_TYPES[type]) type = '';
            const md = getWeekData(thursday);
            md.weekType = type;
            if (note) { if (type === 'co') md.coName = note; else md.noMeetingReason = note; }
            saveMeetingEditorData();
            // Mga atas na hindi na matutuloy: buong linggo kapag walang pulong, o CBS kapag dalaw ng CO
            const gridGone = assignments.filter(a => a.date === thursday && !isSlotActive(thursday, a.type));
            const stuGone = WEEK_TYPES[type].noMeeting ? countStudentNames(thursday) : 0;
            if (gridGone.length + stuGone > 0) {
                const what = [gridGone.length ? `${gridGone.length} in the Assignments grid${type === 'co' ? ' (CBS conductor/reader)' : ''}` : '',
                              stuGone ? `${stuGone} student name(s)` : ''].filter(Boolean).join(' and ');
                if (confirm(`${weekRangeLabel(thursday)} already has ${what} that won't take place.\n\nRemove them so they don't count in anyone's history?`)) {
                    if (gridGone.length) {
                        pushAssignmentUndoState();
                        assignments = assignments.filter(a => !(a.date === thursday && !isSlotActive(thursday, a.type)));
                        saveData();
                    }
                    if (stuGone) { clearStudentWeek(thursday); saveMeetingEditorData(); }
                }
            }
            render();
        }
        function listSpecialWeeks() {
            return Object.keys(meetingEditorData)
                .map(k => (k.match(/^week_(\d{4}-\d{2}-\d{2})$/) || [])[1]).filter(Boolean)
                .filter(d => getWeekType(d)).sort();
        }
        function goToMonth(monthStr) {
            const el = document.getElementById('monthSelect');
            el.value = monthStr;
            updateGridStartMonth();
            render();
        }
        function renderSpecialWeeksPanel() {
            const el = document.getElementById('specialWeeksPanel');
            if (!el) return;
            const list = listSpecialWeeks();
            const today = manilaTodayISO();
            const upcoming = list.filter(d => d >= thursdayOfWeek(today)).length;
            const typeOpts = Object.keys(WEEK_TYPES).filter(v => v).map(v => `<option value="${v}">${WEEK_TYPES[v].label}</option>`).join('');
            const rows = list.map(d => {
                const t = getWeekType(d);
                const md = meetingEditorData[getMeetingEditorKey(d)] || {};
                const note = t === 'co' ? (md.coName || '') : (md.noMeetingReason || '');
                const monday = new Date(new Date(d + 'T12:00:00+08:00').getTime() - 3 * 86400000);
                const monthStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}`;
                return `<tr class="${d < thursdayOfWeek(today) ? 'sw-past' : ''}"><td>${escHtml(weekRangeLabel(d))}</td>
                    <td>${WEEK_TYPES[t].noMeeting ? '🚫' : '🧳'} ${escHtml(WEEK_TYPES[t].label)}</td>
                    <td>${note ? escHtml(note) : '<span class="stu-muted">—</span>'}</td>
                    <td class="sw-actions"><button class="btn-secondary text-sm" onclick="goToMonth('${monthStr}')">View</button>
                        <button class="stu-x" title="Set back to a normal meeting" onclick="removeSpecialWeek('${d}')">✕</button></td></tr>`;
            }).join('');
            el.innerHTML = `<details class="ms-panel" ${swPanelOpen ? 'open' : ''} ontoggle="swPanelOpen = this.open">
                <summary>📅 Special weeks — CO visit, assembly, convention, Memorial (${upcoming} upcoming)</summary>
                <div class="sw-body">
                    <div class="sw-add">
                        <label class="ms-field">Any date in that week<input type="date" id="swDate"></label>
                        <label class="ms-field">Type<select id="swType">${typeOpts}</select></label>
                        <label class="ms-field sw-note">Note (CO's name, venue…)<input type="text" id="swNote" placeholder="optional"></label>
                        <button class="btn-primary" onclick="addSpecialWeek()">+ Add</button>
                    </div>
                    <p class="sw-hint">Weeks run Monday to Sunday. An assembly or convention that weekend cancels the midweek meeting (S-38 ¶22), and so does a Memorial on Monday–Friday (S-38 ¶23). During a CO visit, his 30-minute service talk replaces the Congregation Bible Study (S-38 ¶21). Auto-assign skips these slots, and the S-140 is laid out to match.</p>
                    ${list.length ? `<table class="stu-table"><thead><tr><th>Week</th><th>Type</th><th>Note</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="stu-empty">No special weeks yet.</div>'}
                </div>
            </details>`;
        }
        function addSpecialWeek() {
            const date = document.getElementById('swDate')?.value || '';
            const type = document.getElementById('swType')?.value || '';
            const note = (document.getElementById('swNote')?.value || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { alert('Choose a date first.'); return; }
            if (!type || !WEEK_TYPES[type]) return;
            const thu = thursdayOfWeek(date);
            const existing = getWeekType(thu);
            if (existing && existing !== type &&
                !confirm(`${weekRangeLabel(thu)} is already marked as "${WEEK_TYPES[existing].label}". Replace it with "${WEEK_TYPES[type].label}"?`)) return;
            swPanelOpen = true;
            applyWeekType(thu, type, note);
        }
        function removeSpecialWeek(thursday) {
            if (!getWeekType(thursday)) return;
            if (!confirm(`Set ${weekRangeLabel(thursday)} back to a normal meeting?`)) return;
            applyWeekType(thursday, '', null);
        }

        // --- Student clear / remove ---
        function clearStudentSlot(thursday, slot, which) {
            const md = getWeekData(thursday);
            if (slot === 'bible') {
                md.bibleReadingId = ''; md.bibleReadingName = '';
            } else {
                const part = (md.ministryParts || [])[slot];
                if (!part) return;
                if (which === 'assistant') { part.assistantId = ''; part.assistant = ''; }
                else { part.studentId = ''; part.name = ''; part.assistantId = ''; part.assistant = ''; }
            }
            saveMeetingEditorData();
            renderStudentsView();
        }
        function clearStudentPartsForMonth() {
            loadMeetingEditorData();
            const [year, month] = document.getElementById('monthSelect').value.split('-').map(Number);
            const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const thursdays = getThursdaysForMonthByWeekStart(year, month);
            const n = thursdays.reduce((acc, t) => acc + countStudentNames(t), 0);
            if (!n) { alert(`There are no student names to clear for ${label}.`); return; }
            if (!confirm(`Clear all ${n} name(s) in the Bible Reading and Apply Yourself parts for ${label}?\n\nPart titles and the rest of the schedule stay.`)) return;
            thursdays.forEach(clearStudentWeek);
            saveMeetingEditorData();
            studentUndo = null;
            studentUndoSnapshots = [];
            renderStudentsView();
        }
        function removePerson(id) {
            const p = getPerson(id);
            if (!p) return;
            const isBro = p.atas === 'Elder' || p.atas === 'MS';
            if (!confirm(`Remove ${personLabel(p)} from the roster?\n\n` +
                `Their past and planned student parts keep the typed name, but no longer count in their history.` +
                (isBro ? `\nThey stay in the Assignments grid — remove them there separately if needed.` : '') +
                `\n\nTip: uncheck "Active" instead if they are only away for a while.`)) return;
            people = people.filter(x => x.id !== id);
            Object.values(meetingEditorData).forEach(md => {
                if (!md || typeof md !== 'object') return;
                if (md.bibleReadingId === id) md.bibleReadingId = '';
                (md.ministryParts || []).forEach(pt => {
                    if (pt.studentId === id) pt.studentId = '';
                    if (pt.assistantId === id) pt.assistantId = '';
                });
            });
            saveData();
            saveMeetingEditorData();
            renderStudentsView();
        }

        // --- Student auto-assign (empty slots only, preview first) ---
        let studentAutoPreview = null;
        // v7: kapag pantay ang score (hal. wala pang history), random ang mauuna sa auto-assign — hindi alphabetical.
        // Ang fairness (sino ang matagal nang walang bahagi) ay nananatiling pangunahing batayan.
        let studentShuffleKey = null;
        function studentTieBreak(a, b) {
            if (studentShuffleKey) return (studentShuffleKey[a.id] ?? 0.5) - (studentShuffleKey[b.id] ?? 0.5);
            return personLabel(a).localeCompare(personLabel(b)); // manual na dropdown: alphabetical para madaling hanapin
        }
        let studentUndo = null;
        // v13: buwan na pinipili (From–To), dalawang yugto: (1) lahat ng Estudyante muna, (2) saka ang mga Assistant.
        // opts.clears = [{thu, slot, role}] → "Fix": aalisin muna ang mga iyon (sa preview lang) at iyon lang ang pupunan.
        function startStudentAutoAssign(opts) {
            opts = opts || {};
            loadMeetingEditorData();
            if (people.length === 0) { alert('The roster is empty. Import the Masterlist first.'); return; }
            const range = getAutoRange('students');
            const fixMode = Array.isArray(opts.clears) && opts.clears.length > 0;
            const thursdays = fixMode ? [...new Set(opts.clears.map(c => c.thu))].sort()
                : range.months.flatMap(([y, m]) => getThursdaysForMonthByWeekStart(y, m));
            const original = JSON.stringify(meetingEditorData);
            studentShuffleKey = Object.fromEntries(people.map(p => [p.id, Math.random()])); // bagong shuffle bawat takbo
            const proposals = [];
            let unfilled = 0, skippedUnknown = 0, skippedWeeks = 0, noParts = 0, skippedPast = 0;
            const stuFrom = thursdayOfWeek(manilaTodayISO());
            const only = fixMode ? new Set() : null;
            const replaced = {};
            if (fixMode) {
                opts.clears.forEach(c => {
                    const md = getWeekData(c.thu);
                    if (c.slot === 'bible') {
                        replaced[`${c.thu}|bible|student`] = md.bibleReadingName || '';
                        md.bibleReadingId = ''; md.bibleReadingName = '';
                        only.add(`${c.thu}|bible|student`);
                        return;
                    }
                    const part = (md.ministryParts || [])[c.slot];
                    if (!part) return;
                    if (c.role === 'assistant') {
                        replaced[`${c.thu}|${c.slot}|assistant`] = part.assistant || '';
                        part.assistantId = ''; part.assistant = '';
                        only.add(`${c.thu}|${c.slot}|assistant`);
                    } else {
                        replaced[`${c.thu}|${c.slot}|student`] = part.name || '';
                        replaced[`${c.thu}|${c.slot}|assistant`] = part.assistant || '';
                        part.studentId = ''; part.name = ''; part.assistantId = ''; part.assistant = '';
                        only.add(`${c.thu}|${c.slot}|student`); only.add(`${c.thu}|${c.slot}|assistant`);
                    }
                });
            }
            const allowed = key => !only || only.has(key);
            const weeks = [];
            thursdays.forEach(thu => {
                if (isNoMeetingWeek(thu)) { skippedWeeks++; return; }
                if (thu < stuFrom) { skippedPast++; return; }
                if (!(getWeekData(thu).ministryParts || []).length) noParts++;
                weeks.push(thu);
            });
            const push = (thu, slot, role, pick, title) => {
                const k = `${thu}|${slot}|${role}`;
                proposals.push({ thu, slot, role, personId: pick.p.id, title, info: pick.info, replaced: replaced[k] || '' });
            };
            // Yugto 1: Estudyante (Bible reading + student parts)
            weeks.forEach(thu => {
                const md = getWeekData(thu);
                if (allowed(`${thu}|bible|student`) && !(md.bibleReadingId || (md.bibleReadingName || '').trim())) {
                    const pick = rankStudentCandidates(thu, 'bible', '').find(c => !c.conflict);
                    if (pick) { md.bibleReadingId = pick.p.id; md.bibleReadingName = personName(pick.p); push(thu, 'bible', 'student', pick, '3. Pagbabasa ng Bibliya (4 min.)'); }
                    else unfilled++;
                }
                (md.ministryParts || []).forEach((part, i) => {
                    const kind = getPartKind(part);
                    if (kind === 'discussion') return;
                    if (kind === 'unknown') { if (!(part.name || '').trim()) skippedUnknown++; return; }
                    if (!allowed(`${thu}|${i}|student`) || part.studentId || (part.name || '').trim()) return;
                    const pick = rankStudentCandidates(thu, kind, '').find(c => !c.conflict);
                    if (!pick) { unfilled++; return; }
                    part.studentId = pick.p.id; part.name = personName(pick.p);
                    push(thu, i, 'student', pick, part.title);
                });
            });
            // Yugto 2: Assistant
            weeks.forEach(thu => {
                const md = getWeekData(thu);
                (md.ministryParts || []).forEach((part, i) => {
                    const kind = getPartKind(part);
                    if (kind === 'discussion' || kind === 'unknown' || !STUDENT_KINDS[kind]?.assistant) return;
                    if (!allowed(`${thu}|${i}|assistant`) || part.assistantId || (part.assistant || '').trim()) return;
                    const student = getPerson(part.studentId) || findPersonByName(part.name);
                    if (!student) return;
                    const pickA = rankAssistantCandidates(thu, student, '').find(c => !c.conflict);
                    if (!pickA) { unfilled++; return; }
                    part.assistantId = pickA.p.id; part.assistant = personName(pickA.p);
                    push(thu, i, 'assistant', pickA, part.title);
                });
            });
            studentShuffleKey = null;
            meetingEditorData = JSON.parse(original); // walang na-save; preview lang
            const ord = s => s === 'bible' ? -1 : s;
            proposals.sort((a, b) => a.thu.localeCompare(b.thu) || ord(a.slot) - ord(b.slot) || (a.role === 'student' ? 0 : 1) - (b.role === 'student' ? 0 : 1));
            studentAutoPreview = { proposals, unfilled, skippedUnknown, skippedWeeks, noParts, skippedPast,
                rangeLabel: fixMode ? '' : range.label, clears: fixMode ? opts.clears.slice() : null, fixInfo: opts.fixInfo || '' };
            renderStudentAutoPreview();
            document.getElementById('studentAutoModal').classList.remove('hidden');
            document.body.classList.add('modal-open');
        }
        function renderStudentAutoPreview() {
            const pv = studentAutoPreview;
            if (!pv) return;
            const c = document.getElementById('studentAutoContent');
            const s = document.getElementById('studentAutoSummary');
            const extras = [];
            if (pv.unfilled) extras.push(`${pv.unfilled} slot(s) with no eligible person`);
            if (pv.skippedUnknown) extras.push(`${pv.skippedUnknown} part(s) skipped — set the part type first`);
            if (pv.skippedWeeks) extras.push(`${pv.skippedWeeks} no-meeting week(s) skipped`);
            if (pv.noParts) extras.push(`${pv.noParts} week(s) without workbook parts`);
            if (pv.skippedPast) extras.push(`${pv.skippedPast} past week(s) skipped`);
            const head = pv.clears ? `🔁 Fix: ${pv.fixInfo || 'repeated partners and back-to-back parts'} — ` : (pv.rangeLabel ? `${pv.rangeLabel}: ` : '');
            if (s) s.textContent = `${head}${pv.proposals.length} proposed name(s)` + (extras.length ? ' • ' + extras.join(' • ') : '') +
                (pv.clears ? '. Only the listed parts change.' : '. Discussion parts are left for you. Among people with equal priority the order is random — press 🔀 Shuffle Again for a different draw.');
            if (!c) return;
            if (!pv.proposals.length) {
                c.innerHTML = `<div class="stu-empty">${pv.clears ? 'No better choice was found for these parts — they would stay empty. Cancel to keep them as they are.' : 'Nothing to fill — every student slot in this range already has a name.'}</div>`;
                return;
            }
            let h = '', last = '';
            pv.proposals.forEach((pr, idx) => {
                if (pr.thu !== last) {
                    h += `<div class="sap-week">${new Date(pr.thu + 'T12:00:00+08:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>`;
                    last = pr.thu;
                }
                const p = getPerson(pr.personId);
                h += `<div class="sap-row"><span class="sap-title">${escHtml(pr.title)}</span>
                    <span class="sap-role ${pr.role === 'assistant' ? 'sap-asst' : ''}">${pr.role === 'assistant' ? 'Assistant' : 'Student'}</span>
                    <span class="sap-name">${escHtml(personLabel(p))}${p && p.pioneer ? ' <span class="stu-badge">RP</span>' : ''}${pr.replaced ? `<span class="sap-was">was: ${escHtml(pr.replaced)}</span>` : ''}</span><span class="sap-info">${escHtml(pr.info)}</span>
                    <button class="stu-x" title="Remove from this preview" onclick="removeStudentAutoItem(${idx})">✕</button></div>`;
            });
            c.innerHTML = h;
        }
        function removeStudentAutoItem(idx) {
            const pv = studentAutoPreview;
            const pr = pv?.proposals[idx];
            if (!pr) return;
            // kapag inalis ang estudyante, aalisin din ang assistant na pinili para sa kaniya
            pv.proposals = pv.proposals.filter((x, i) => i !== idx &&
                !(pr.role === 'student' && x.role === 'assistant' && x.thu === pr.thu && x.slot === pr.slot));
            renderStudentAutoPreview();
        }
        function closeStudentAutoModal() {
            studentAutoPreview = null;
            document.getElementById('studentAutoModal').classList.add('hidden');
            document.body.classList.remove('modal-open');
        }
        function applyStudentAutoAssign() {
            const pv = studentAutoPreview;
            if (!pv || (!pv.proposals.length && !pv.clears)) { closeStudentAutoModal(); return; }
            loadMeetingEditorData();
            const snapshots = [];
            if (pv.clears) {
                // Fix mode: alisin muna ang mga papalitan (may snapshot para sa ↩ Undo)
                pv.clears.forEach(c => {
                    const md = getWeekData(c.thu);
                    if (c.slot === 'bible') {
                        snapshots.push({ thu: c.thu, slot: 'bible', bibleReadingId: md.bibleReadingId || '', bibleReadingName: md.bibleReadingName || '' });
                        md.bibleReadingId = ''; md.bibleReadingName = '';
                        return;
                    }
                    const part = (md.ministryParts || [])[c.slot];
                    if (!part) return;
                    snapshots.push({ thu: c.thu, slot: c.slot, studentId: part.studentId || '', name: part.name || '', assistantId: part.assistantId || '', assistant: part.assistant || '' });
                    if (c.role !== 'assistant') { part.studentId = ''; part.name = ''; }
                    part.assistantId = ''; part.assistant = '';
                });
            }
            const applied = [];
            pv.proposals.forEach(pr => {
                const p = getPerson(pr.personId);
                if (!p) return;
                const md = getWeekData(pr.thu);
                if (pr.slot === 'bible') {
                    if (md.bibleReadingId || (md.bibleReadingName || '').trim()) return;
                    md.bibleReadingId = p.id; md.bibleReadingName = personName(p);
                    applied.push(pr); return;
                }
                const part = (md.ministryParts || [])[pr.slot];
                if (!part) return;
                if (pr.role === 'student') {
                    if (part.studentId || (part.name || '').trim()) return;
                    part.studentId = p.id; part.name = personName(p);
                } else {
                    const stu = getPerson(part.studentId) || findPersonByName(part.name);
                    if (!stu || stu.gender !== p.gender || part.assistantId || (part.assistant || '').trim()) return;
                    part.assistantId = p.id; part.assistant = personName(p);
                }
                applied.push(pr);
            });
            // Fix mode: kung walang nahanap na kapalit (o inalis mo sa preview), ibalik ang dati para hindi maiwang bakante
            snapshots.forEach(sn => {
                const md = getWeekData(sn.thu);
                if (sn.slot === 'bible') {
                    if (!md.bibleReadingId && !(md.bibleReadingName || '').trim() && sn.bibleReadingName) { md.bibleReadingId = sn.bibleReadingId; md.bibleReadingName = sn.bibleReadingName; }
                    return;
                }
                const part = (md.ministryParts || [])[sn.slot];
                if (!part) return;
                const noStu = !part.studentId && !(part.name || '').trim(), noAsst = !part.assistantId && !(part.assistant || '').trim();
                if (noStu && sn.name) {
                    part.studentId = sn.studentId; part.name = sn.name;
                    if (noAsst) { part.assistantId = sn.assistantId; part.assistant = sn.assistant; }
                } else if (noAsst && sn.assistant && (part.studentId === sn.studentId || part.name === sn.name)) {
                    part.assistantId = sn.assistantId; part.assistant = sn.assistant;
                }
            });
            saveMeetingEditorData();
            studentUndo = applied.length ? applied : null;
            studentUndoSnapshots = snapshots;
            if (!studentUndo && snapshots.length) studentUndo = [];
            const fix = !!pv.clears;
            closeStudentAutoModal();
            render();
            alert(`${fix ? 'Fixed' : 'Applied'} ${applied.length} student assignment(s). You can undo with ↩ Undo Auto-Assign.` +
                (fix ? '\n\nIf you already printed S-89 slips for these weeks, print the changed ones again.' : ''));
        }
        function undoStudentAutoAssign() {
            if (!studentUndo) return;
            if (!confirm(`Undo the last auto-assign${studentUndoSnapshots.length ? ' / fix' : ''}?\n\nNames you changed afterwards are kept.`)) return;
            loadMeetingEditorData();
            let n = 0;
            studentUndo.forEach(pr => {
                const md = meetingEditorData[getMeetingEditorKey(pr.thu)];
                if (!md) return;
                if (pr.slot === 'bible') {
                    if (md.bibleReadingId === pr.personId) { md.bibleReadingId = ''; md.bibleReadingName = ''; n++; }
                    return;
                }
                const part = (md.ministryParts || [])[pr.slot];
                if (!part) return;
                if (pr.role === 'student' && part.studentId === pr.personId) { part.studentId = ''; part.name = ''; n++; }
                if (pr.role === 'assistant' && part.assistantId === pr.personId) { part.assistantId = ''; part.assistant = ''; n++; }
            });
            let restored = 0;
            studentUndoSnapshots.forEach(sn => {
                const md = meetingEditorData[getMeetingEditorKey(sn.thu)];
                if (!md) return;
                if (sn.slot === 'bible') {
                    if (!md.bibleReadingId && !(md.bibleReadingName || '').trim() && sn.bibleReadingName) { md.bibleReadingId = sn.bibleReadingId; md.bibleReadingName = sn.bibleReadingName; restored++; }
                    return;
                }
                const part = (md.ministryParts || [])[sn.slot];
                if (!part) return;
                if (!part.studentId && !(part.name || '').trim() && sn.name) { part.studentId = sn.studentId; part.name = sn.name; restored++; }
                if (!part.assistantId && !(part.assistant || '').trim() && sn.assistant) { part.assistantId = sn.assistantId; part.assistant = sn.assistant; restored++; }
            });
            studentUndo = null;
            studentUndoSnapshots = [];
            saveMeetingEditorData();
            renderStudentsView();
            alert(`Removed ${n} name(s)` + (restored ? `, restored ${restored} earlier name(s).` : '.'));
        }


        // Petsa ngayon sa Manila bilang YYYY-MM-DD (hindi umaasa sa locale format ng browser)
        function manilaTodayISO() {
            const p = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
            return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}-${String(p.getDate()).padStart(2, '0')}`;
        }

        // ==================== S-38 elder-only: ayusin ang mga dating atas (v5) ====================
        // Ang mga patakaran ay pumipigil lang sa BAGONG atas. Ang mga atas na nagawa bago ang update
        // (hal. auto-assign noong Hakbang 2) ay nananatili hangga't hindi inaayos — dito sila hinahanap.

        // Itugma ang category sa grid sa Atas sa Masterlist (Elder / MS / Brother).
        // Mahalaga: ang brother na walang category ay itinuturing na "Elder" ng lumang code.
        function refreshBrotherCategories() {
            let n = 0;
            people.forEach(p => {
                const cat = p.atas === 'Elder' ? 'Elder' : p.atas === 'MS' ? 'MS' : (p.gender === 'Brother' ? 'Brother' : null);
                if (!cat) return;
                const b = brothers.find(x => normalizeBrotherName(x.name) === normalizeBrotherName(personName(p)));
                if (b && b.category !== cat) { b.category = cat; n++; }
            });
            return n;
        }

        function findS38Conflicts() {
            const today = manilaTodayISO();
            const fromThu = thursdayOfWeek(today);
            const out = [];
            const dates = [...new Set(assignments.map(a => a.date))].filter(d => d >= fromThu).sort();
            dates.forEach(date => {
                if (isNoMeetingWeek(date)) return;
                ELDER_ONLY_TYPES.forEach(type => {
                    if (!requiresElder(date, type)) return;
                    if (type === 'CBS' && getWeekType(date) === 'co') return;
                    assignments.filter(a => a.date === date && a.type === type).forEach(a => {
                        const b = brothers.find(x => x.id === a.brotherId);
                        if (b && getBrotherCategory(b) !== 'Elder') out.push({ id: a.id, date, type, label: typeLabel(type), brother: b });
                    });
                });
                assignments.filter(a => a.date === date && a.type === 'Pamumuhay').forEach((a, i) => {
                    if (!isLocalNeedsSlot(date, i)) return;
                    const b = brothers.find(x => x.id === a.brotherId);
                    if (b && getBrotherCategory(b) !== 'Elder') out.push({ id: a.id, date, type: 'Pamumuhay', label: 'Local Needs', brother: b });
                });
                // v10: ang may tag na "Brother" ay CBS Reader lang
                assignments.filter(a => a.date === date && isSlotActive(date, a.type)).forEach(a => {
                    if (out.some(o => o.id === a.id)) return;
                    const b = brothers.find(x => x.id === a.brotherId);
                    if (b && !categoryAllowsType(b, a.type)) out.push({ id: a.id, date, type: a.type, label: typeLabel(a.type), brother: b, rule: 'brother' });
                    else if (b && a.type === 'CBS Reader' && getBrotherCategory(b) === 'Elder') out.push({ id: a.id, date, type: a.type, label: typeLabel(a.type), brother: b, rule: 'reader' });
                });
            });
            // v12: MS sa 10-min talk — ang mga lampas sa N bawat buwan (binibilang pati ang mga naunang linggo ng buwan)
            const cap = msTalkCap(), byMonth = {};
            assignments.filter(a => a.type === '10 mins talk' && !isNoMeetingWeek(a.date)).sort((x, y) => x.date.localeCompare(y.date)).forEach(a => {
                const b = brothers.find(x => x.id === a.brotherId);
                if (b && getBrotherCategory(b) === 'MS') (byMonth[a.date.slice(0, 7)] = byMonth[a.date.slice(0, 7)] || []).push({ a, b });
            });
            Object.values(byMonth).forEach(list => list.forEach(({ a, b }, i) => {
                if (i >= cap && a.date >= fromThu && !out.some(o => o.id === a.id))
                    out.push({ id: a.id, date: a.date, type: a.type, label: typeLabel(a.type), brother: b, rule: 'mstalk' });
            }));
            return out.sort((x, y) => x.date.localeCompare(y.date));
        }

        function renderS38ConflictBanner() {
            const list = findS38Conflicts();
            if (!list.length) return '';
            const names = list.slice(0, 4).map(c => `${shortDate(c.date)} ${c.label}: ${escHtml(c.brother.name)} (${getBrotherCategory(c.brother)})`).join(' · ');
            const n = r => list.filter(c => (c.rule || 'elder') === r).length;
            const eldN = n('elder'), broN = n('brother'), rdN = n('reader'), mtN = n('mstalk');
            const rules = [eldN ? 'Chairman, CBS conductor and Local Needs are elder-only (S-38)' : '', broN ? 'brothers tagged "Brother" may only be CBS Reader' : '',
                rdN ? 'CBS Reader goes to ministerial servants and brothers' : '', mtN ? `ministerial servants give the 10-min talk at most ${msTalkCap()}× a month` : ''].filter(Boolean).join('; ');
            return `<div class="s38-banner">⚠ <b>${list.length} upcoming assignment${list.length === 1 ? '' : 's'}</b> ${list.length === 1 ? 'breaks' : 'break'} the assignment rules — ${rules}. They were made before the rule was added.
                <div class="s38-list">${names}${list.length > 4 ? ` · …and ${list.length - 4} more` : ''}</div>
                <button class="btn-primary text-sm" onclick="fixS38Conflicts()">🛠 ${eldN === list.length ? 'Replace with elders' : 'Fix these assignments'}</button></div>`;
        }

        // Papalitan ang bawat maling atas ng pinakamungkahing elder (parehong fairness engine),
        // nang hindi ginagalaw ang posisyon nito (mahalaga sa Local Needs na nakabatay sa pagkakasunod).
        function fixS38Conflicts() {
            const list = findS38Conflicts();
            if (!list.length) { alert('No conflicts — every upcoming Chairman, CBS conductor and Local Needs part is held by an elder, brothers tagged "Brother" and no elders are on CBS Reader, and ministerial servants are within the 10-min talk limit.'); return; }
            const original = JSON.parse(JSON.stringify(assignments));
            const plan = [];
            list.forEach(c => {
                const a = assignments.find(x => x.id === c.id);
                if (!a) return;
                const taken = new Set(assignments.filter(x => x.date === c.date && x.id !== c.id).map(x => x.brotherId));
                const pick = (getSuggestionsForSlot(c.date, c.type) || [])
                    .find(s => (c.rule || getBrotherCategory(s.brother) === 'Elder') && !taken.has(s.brother.id) && s.brother.id !== c.brother.id);
                plan.push({ ...c, to: pick ? pick.brother : null });
                if (pick) a.brotherId = pick.brother.id; // pansamantala, para mabilang sa susunod na pili
                else assignments = assignments.filter(x => x.id !== c.id);
            });
            assignments = original; // preview lang hanggang pumayag
            const lines = plan.map(p => `• ${shortDate(p.date)} ${p.label}: ${p.brother.name} (${getBrotherCategory(p.brother)}) → ${p.to ? p.to.name : '(left empty — no eligible brother)'}`);
            const shown = lines.slice(0, 15).join('\n') + (lines.length > 15 ? `\n…and ${lines.length - 15} more` : '');
            const onlyElder = plan.every(p => !p.rule);
            if (!confirm(`${onlyElder ? `Replace ${plan.length} assignment(s) with elders?` : `Fix ${plan.length} assignment(s)?`}\n\n${shown}\n\nYou can undo with ↩ Undo Last.`)) return;
            pushAssignmentUndoState();
            plan.forEach(p => {
                const a = assignments.find(x => x.id === p.id);
                if (!a) return;
                if (p.to) a.brotherId = p.to.id;
                else assignments = assignments.filter(x => x.id !== p.id);
            });
            saveData();
            render();
            const empty = plan.filter(p => !p.to).length;
            alert(`Replaced ${plan.length - empty} assignment(s).` + (empty ? `\n${empty} slot(s) left empty — assign them manually.` : ''));
        }


        // ==================== v6: pagitan ng mga atas (iwasan ang magkasunod na linggo) ====================
        // Dati, inuuna lang ng ranking ang pinakakaunting total; walang tingin sa nakaraang linggo.
        // Kaya kapag mababa ang total ng isang brother, puwede siyang mapili sa magkasunod na Huwebes.
        // ==================== v11: pagitan ng mga atas (mas mahigpit) ====================
        // (1) "Magkasunod" = magkasunod na PULONG (nilalaktawan ang linggong walang pulong).
        // (2) Parehong "pamilya" ng bahagi: Opening/Closing Prayer = panalangin; CBS conductor/reader = CBS.
        // (3) Kasama ang mga bahagi ng brother sa Students tab (Bible reading, Pagtalakay, iba pang student part).
        // Tier: 0 = walang bahagi sa katabing pulong · 1 = may IBANG bahagi sa katabing pulong
        //       2 = PAREHONG bahagi sa katabing pulong · 3 = may student part na sa MISMONG linggo
        function getSpacingInfo(brotherId, date, type, stuMap) {
            const b = brothers.find(x => x.id === brotherId);
            stuMap = stuMap || studentTabPartsByName();
            const prev = adjacentMeeting(date, -1), next = adjacentMeeting(date, 1);
            const prev2 = prev ? adjacentMeeting(prev, -1) : null, next2 = next ? adjacentMeeting(next, 1) : null;
            const mine = assignments.filter(a => a.brotherId === brotherId && a.date !== date && !isNoMeetingWeek(a.date));
            const stu = (b && stuMap[normalizeBrotherName(b.name)]) || [];
            const fam = partFamily(type);
            const near = d => d === prev || d === next;
            const when = d => `${d < date ? 'the meeting before' : 'the meeting after'} (${shortDate(d)})`;
            const sameAdj = mine.filter(a => near(a.date) && partFamily(a.type) === fam);
            const adjGrid = mine.filter(a => near(a.date));
            const adjStu = stu.filter(s => near(s.date));
            const sameWeekStu = stu.filter(s => s.date === date);
            const sameNear = mine.filter(a => (a.date === prev2 || a.date === next2) && partFamily(a.type) === fam);
            const notes = [];
            let tier = 0, penalty = 0;
            if (sameWeekStu.length) {
                tier = 3; penalty += 60;
                notes.push(`Already has a student part this week: ${sameWeekStu[0].label}`);
            }
            if (sameAdj.length) {
                tier = Math.max(tier, 2); penalty += 40;
                notes.push(`Back-to-back: already ${typeLabel(sameAdj[0].type)} ${when(sameAdj[0].date)}`);
            } else if (adjGrid.length || adjStu.length) {
                tier = Math.max(tier, 1); penalty += 15;
                if (adjGrid.length) notes.push(`Has a part ${when(adjGrid[0].date)}: ${typeLabel(adjGrid[0].type)}`);
                if (adjStu.length) notes.push(`Has a student part ${when(adjStu[0].date)}: ${adjStu[0].label}`); // v16: ipakita pareho
            }
            if (sameNear.length) { penalty += 15; notes.push(`${typeLabel(sameNear[0].type)} 2 meetings ${sameNear[0].date < date ? 'before' : 'after'} (${shortDate(sameNear[0].date)})`); }
            // v18: pareho ang huli/susunod niyang bahagi (≤ 8 linggo, walang ibang bahagi sa pagitan)
            const mr = monthRepeatOf(brotherId, date, type);
            if (mr) { penalty += 10; notes.push(`Same part as his ${mr.date < date ? 'last' : 'next'} one: ${typeLabel(mr.type)} (${shortDate(mr.date)}, ${weeksBetween(mr.date, date)} wks ${mr.date < date ? 'before' : 'after'})`); }
            return { tier, penalty, notes, monthRep: mr ? 1 : 0 };
        }
        function confirmSpacing(brotherId, date, type) {
            const sp = getSpacingInfo(brotherId, date, type);
            if (sp.tier < 2) return true;
            const b = brothers.find(x => x.id === brotherId);
            const q = sp.tier === 3 ? `Give him ${typeLabel(type)} the same week anyway?` : `Assign ${typeLabel(type)} in consecutive meetings anyway?`;
            return confirm(`${b ? b.name : 'This brother'} — ${sp.notes[0]}.\n\n${q}`);
        }

        // Mga dating atas na magkasunod na linggo, parehong atas (mula ngayong linggo pataas)
        // Lahat ng magkasunod na pulong (mula ngayong linggo) kung saan may bahagi ang iisang brother sa dalawa —
        // parehong bahagi ('same') o magkaibang bahagi ('adjacent'), kasama ang Students tab.
        function findSpacingIssues() {
            const fromThu = thursdayOfWeek(manilaTodayISO());
            const stuMap = studentTabPartsByName();
            const out = [];
            brothers.forEach(b => {
                const items = assignments.filter(a => a.brotherId === b.id && a.date >= fromThu && !isNoMeetingWeek(a.date))
                    .map(a => ({ date: a.date, src: 'grid', id: a.id, type: a.type, label: typeLabel(a.type) }))
                    .concat((stuMap[normalizeBrotherName(b.name)] || []).filter(s => s.date >= fromThu)
                        .map(s => ({ date: s.date, src: 'stu', label: s.label })));
                const dates = [...new Set(items.map(x => x.date))].sort();
                dates.forEach(d1 => {
                    const d2 = adjacentMeeting(d1, 1);
                    if (!d2 || !dates.includes(d2)) return;
                    const A = items.filter(x => x.date === d1), C = items.filter(x => x.date === d2);
                    const same = A.some(x => x.src === 'grid' && C.some(y => y.src === 'grid' && partFamily(y.type) === partFamily(x.type)));
                    out.push({ brother: b, d1, d2, kind: same ? 'same' : 'adjacent', first: A, second: C });
                });
            });
            return out.sort((x, y) => (x.kind === 'same' ? 0 : 1) - (y.kind === 'same' ? 0 : 1) || x.d1.localeCompare(y.d1));
        }
        function renderSpacingBanner() {
            const list = findSpacingIssues();
            const months = findMonthRepeats();
            if (!list.length && !months.length) return '';
            // v17: puwedeng isara; lalabas ulit kapag may bagong problema (ibang listahan)
            const sig = spacingSignature(list, months);
            if (localStorage.getItem('nc_spacingDismissed') === sig) {
                return `<div class="banner-collapsed">🔁 ${list.length + months.length} spacing note${list.length + months.length === 1 ? '' : 's'} hidden
                    <button class="banner-link" onclick="showSpacingBanner()">Show</button></div>`;
            }
            const same = list.filter(c => c.kind === 'same').length;
            const fmt = c => `${escHtml(c.brother.name)} — ${shortDate(c.d1)} ${c.first.map(x => escHtml(x.label)).join(' + ')} → ${shortDate(c.d2)} ${c.second.map(x => escHtml(x.label)).join(' + ')}`;
            const fmtM = m => `${escHtml(m.brother.name)} — ${escHtml(typeLabel(m.first.type))} ${shortDate(m.first.date)} → ${escHtml(typeLabel(m.second.type))} ${shortDate(m.second.date)}`;
            let h = '<div class="s38-banner banner-closable"><button class="banner-x" title="Close — it comes back only if a new problem appears" onclick="dismissSpacingBanner()">✕</button>';
            if (list.length) {
                h += `🔁 <b>${list.length} brother${list.length === 1 ? ' has parts' : 's have parts'} in consecutive meetings</b>` +
                    (same ? ` — ${same} with the <b>same</b> part` : '') + `. Includes Students-tab parts (Bible reading, discussions).
                    <div class="s38-list">${list.slice(0, 5).map(fmt).join(' · ')}${list.length > 5 ? ` · …and ${list.length - 5} more` : ''}</div>`;
            }
            if (months.length) {
                h += `<div${list.length ? ' style="margin-top:6px"' : ''}>📅 <b>${months.length} time${months.length === 1 ? '' : 's'} a brother gets the same part again as his previous one</b> within ${REPEAT_GAP_WEEKS} weeks (e.g. CBS Conductor, then CBS Conductor again). A different part in between is fine; ★ preferred parts are not counted.</div>
                    <div class="s38-list">${months.slice(0, 5).map(fmtM).join(' · ')}${months.length > 5 ? ` · …and ${months.length - 5} more` : ''}</div>`;
            }
            return h + `<button class="btn-primary text-sm" onclick="fixSpacingIssues()">🔁 Spread them out</button></div>`;
        }
        // Papalitan ang PANGALAWANG linggo ng pinakamungkahing brother na walang bahagi sa katabing linggo.
        // Sinusunod pa rin ang elder-only, eligibility, special weeks, at monthly limit (dahil getSuggestionsForSlot).
        // Papalitan ang isang atas sa Assignments tab sa bawat pares ng brother na walang bahagi sa katabing pulong.
        // Hindi ginagalaw: ang kasalukuyang linggo (naibigay na), at ang Students tab.
        // Sinusunod pa rin: elder-only, "Brother" = CBS Reader, eligibility, special weeks, at 3 bawat buwan.
        function fixSpacingIssues() {
            const list = findSpacingIssues();
            if (!list.length && !findMonthRepeats().length) { alert(`No brother has parts in consecutive meetings, or the same part again within ${REPEAT_GAP_WEEKS} weeks, from this week onward.`); return; }
            const thisThu = thursdayOfWeek(manilaTodayISO());
            const original = JSON.parse(JSON.stringify(assignments));
            const plan = [];
            const stillPaired = (bid, d1, d2) => {
                const b = brothers.find(x => x.id === bid), stuMap = studentTabPartsByName();
                const has = d => assignments.some(a => a.brotherId === bid && a.date === d) ||
                    (stuMap[normalizeBrotherName(b.name)] || []).some(s => s.date === d);
                return has(d1) && has(d2);
            };
            list.forEach(c => {
                if (!stillPaired(c.brother.id, c.d1, c.d2)) return; // naayos na ng naunang palit
                // mas gusto ang mas huling linggo; huwag galawin ang kasalukuyang linggo
                const targets = [...c.second, ...c.first].filter(x => x.src === 'grid' && x.date > thisThu);
                for (const t of targets) {
                    const a = assignments.find(x => x.id === t.id);
                    if (!a || a.brotherId !== c.brother.id) continue;
                    const pamIdx = a.type === 'Pamumuhay' ? assignments.filter(x => x.date === a.date && x.type === 'Pamumuhay').indexOf(a) : -1;
                    const needElder = a.type === 'Pamumuhay' ? isLocalNeedsSlot(a.date, pamIdx) : requiresElder(a.date, a.type);
                    const keep = a.brotherId;
                    a.brotherId = '__vacant__';
                    const taken = new Set(assignments.filter(x => x.date === a.date && x.id !== a.id).map(x => x.brotherId));
                    const okS = s => s.tier === 0 && !taken.has(s.brother.id) && s.brother.id !== keep &&
                        (!needElder || getBrotherCategory(s.brother) === 'Elder');
                    const sugg = getSuggestionsForSlot(a.date, a.type) || [];
                    const pick = sugg.find(s => okS(s) && !s.monthRep) || sugg.find(okS); // v16: iwasan ding gumawa ng bagong ulit-buwan
                    if (pick) {
                        a.brotherId = pick.brother.id;
                        plan.push({ id: a.id, date: a.date, label: typeLabel(a.type), from: c.brother, to: pick.brother, kind: c.kind });
                        return;
                    }
                    a.brotherId = keep;
                }
                plan.push({ kind: c.kind, from: c.brother, d1: c.d1, d2: c.d2, to: null });
            });
            // v16: parehong bahagi sa magkasunod na buwan (pagkatapos ayusin ang magkasunod na pulong)
            let monthStuck = [];
            for (let round = 0; round < 3; round++) {
            monthStuck = [];
            let fixedThisRound = 0;
            findMonthRepeats().forEach(m => {
                const cur = assignments.find(x => x.id === m.second.id);
                if (!cur || cur.brotherId !== m.brother.id || !monthRepeatOf(m.brother.id, cur.date, cur.type)) return; // naayos na
                const targets = [m.second, m.first].filter(x => x.date > thisThu);
                for (const t of targets) {
                    const a = assignments.find(x => x.id === t.id);
                    if (!a || a.brotherId !== m.brother.id) continue;
                    const pamIdx = a.type === 'Pamumuhay' ? assignments.filter(x => x.date === a.date && x.type === 'Pamumuhay').indexOf(a) : -1;
                    const needElder = a.type === 'Pamumuhay' ? isLocalNeedsSlot(a.date, pamIdx) : requiresElder(a.date, a.type);
                    const keep = a.brotherId;
                    a.brotherId = '__vacant__';
                    const taken = new Set(assignments.filter(x => x.date === a.date && x.id !== a.id).map(x => x.brotherId));
                    const pick = (getSuggestionsForSlot(a.date, a.type) || []).find(s =>
                        s.tier === 0 && !s.monthRep && !taken.has(s.brother.id) && s.brother.id !== keep &&
                        (!needElder || getBrotherCategory(s.brother) === 'Elder'));
                    if (pick) {
                        a.brotherId = pick.brother.id;
                        plan.push({ id: a.id, date: a.date, label: typeLabel(a.type), from: m.brother, to: pick.brother, kind: 'month' });
                        fixedThisRound++;
                        return;
                    }
                    a.brotherId = keep;
                }
                monthStuck.push(m);
            });
            if (!fixedThisRound) break;
            }
            assignments = original; // preview lang
            // kung dalawang beses napalitan ang iisang atas, ang huling palit ang masusunod
            const lastById = {};
            plan.filter(p => p.to).forEach(p => { lastById[p.id] = p; });
            const firstFrom = {};
            plan.filter(p => p.to).forEach(p => { if (!firstFrom[p.id]) firstFrom[p.id] = p.from; });
            const changes = Object.values(lastById).map(p => ({ ...p, from: firstFrom[p.id] })).filter(p => p.from.id !== p.to.id)
                .sort((x, y) => x.date.localeCompare(y.date));
            const stuck = plan.filter(p => !p.to);
            if (!changes.length) {
                alert(`No replacement found without creating new back-to-back parts.` +
                    (stuck.length ? `\n\n${stuck.length} pair(s) need a manual look (e.g. this week, or a Students-tab part).` : '') + mStuckTxt);
                return;
            }
            const lines = changes.map(p => `• ${shortDate(p.date)} ${p.label}: ${p.from.name} → ${p.to.name}${p.kind === 'same' ? '  (same part back-to-back)' : p.kind === 'month' ? '  (same part as his last one)' : ''}`);
            const shown = lines.slice(0, 18).join('\n') + (lines.length > 18 ? `\n…and ${lines.length - 18} more` : '');
            const stuckTxt = stuck.length ? `\n\n${stuck.length} pair(s) stay as they are — no suitable brother, or only this week's / a Students-tab part could change:\n` +
                stuck.slice(0, 6).map(p => `   ${p.from.name}: ${shortDate(p.d1)} & ${shortDate(p.d2)}`).join('\n') : '';
            const mStuckTxt = monthStuck.length ? `\n\n${monthStuck.length} repeated-part pair(s) stay — no other brother is free for that part without a new back-to-back:\n` +
                monthStuck.slice(0, 6).map(m => `   ${m.brother.name}: ${typeLabel(m.second.type)} ${shortDate(m.first.date)} & ${shortDate(m.second.date)}`).join('\n') : '';
            if (!confirm(`Spread out ${changes.length} assignment(s)? Each new brother has no part in the meetings before or after, and not the same part as his previous or next one.\nThis week's assignments are not changed.\n\n${shown}${stuckTxt}${mStuckTxt}\n\nYou can undo with ↩ Undo Last. Re-export the S-140 for any month that changed.`)) return;
            pushAssignmentUndoState();
            changes.forEach(p => { const a = assignments.find(x => x.id === p.id); if (a) a.brotherId = p.to.id; });
            saveData();
            render();
            alert(`Spread out ${changes.length} assignment(s).` + (stuck.length + monthStuck.length ? `\n${stuck.length + monthStuck.length} pair(s) left for you to adjust.` : ''));
        }

        // ==================== v9: S-89 assignment slips (PDF sa ibabaw ng S-89_E.pdf) ====================
        // Ang S-89_E.pdf ay naka-embed (lib/s89-base.js) at isinusulat ang mga pangalan sa ibabaw nito gamit ang pdf-lib.
        // 4 na slip bawat Letter page, may cut lines. Estudyante lang ang binibigyan ng slip (nakasulat ang assistant).
        const S89_W = 241, S89_H = 320;                       // laki ng S-89_E page (pt)
        const S89_FIELDS = {                                   // x = simula ng linya, y = baseline (mula sa ibaba), max = lapad
            name:      { x: 53, y: 267.8, max: 174 },
            assistant: { x: 73, y: 244.5, max: 154 },
            date:      { x: 47, y: 221.2, max: 180 },
            part:      { x: 67, y: 197.9, max: 160 }
        };
        const S89_MAIN_HALL = { x: 29.8, y: 148.0 };           // gitna ng checkbox ng "Main hall"
        const S89_LATE_DAYS = 21;                              // S-38: 3 linggo o higit pa bago ang pagganap

        function daysUntil(dateStr) {
            return Math.round((new Date(dateStr + 'T12:00:00+08:00') - new Date(manilaTodayISO() + 'T12:00:00+08:00')) / 86400000);
        }
        function partNumberOf(title, fallback) {
            const m = (title || '').match(/^\s*(\d+)\./);
            return m ? parseInt(m[1], 10) : fallback;
        }

        // Lahat ng slip para sa isang buwan (Bible reading + student parts na may pangalan, hindi kasama ang Pagtalakay)
        function collectS89Slips(year, month) {
            const fromThu = thursdayOfWeek(manilaTodayISO());
            const slips = [], missing = [];
            let pastWeeks = 0, noMeetingWeeks = 0;
            getThursdaysForMonthByWeekStart(year, month).forEach(thu => {
                if (isNoMeetingWeek(thu)) { noMeetingWeeks++; return; }
                if (thu < fromThu) { pastWeeks++; return; }
                const md = meetingEditorData[getMeetingEditorKey(thu)] || {};
                const add = (no, title, student, assistant) => slips.push({ thu, partNo: no, title, student, assistant, days: daysUntil(thu) });
                const bible = (md.bibleReadingName || '').trim();
                if (bible) add(3, 'Pagbabasa ng Bibliya', bible, '');
                else missing.push(`${shortDate(thu)} #3 Bible Reading`);
                (md.ministryParts || []).forEach((part, i) => {
                    const kind = getPartKind(part);
                    if (kind === 'discussion' || !STUDENT_KINDS[kind]?.student) return;
                    const no = partNumberOf(part.title, 4 + i);
                    const stu = (part.name || '').trim();
                    if (!stu) { missing.push(`${shortDate(thu)} #${no} ${STUDENT_KINDS[kind].short}`); return; }
                    const asst = STUDENT_KINDS[kind].assistant ? (part.assistant || '').trim() : '';
                    if (STUDENT_KINDS[kind].assistant && !asst) missing.push(`${shortDate(thu)} #${no} assistant`);
                    add(no, titleText(part.title) || STUDENT_KINDS[kind].label, stu, asst);
                });
            });
            slips.sort((a, b) => a.thu.localeCompare(b.thu) || a.partNo - b.partNo);
            return { slips, missing, pastWeeks, noMeetingWeeks };
        }

        function base64ToBytes(b64) {
            const bin = atob(b64);
            const out = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
            return out;
        }

        // Helvetica (WinAnsi) — alisin ang mga titik na hindi nito kaya para hindi pumalya ang export
        function s89SafeText(font, text) {
            const t = String(text || '').replace(/\s+/g, ' ').trim();
            try { font.encodeText(t); return t; } catch (e) {}
            const plain = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            try { font.encodeText(plain); return plain; } catch (e) {}
            return plain.replace(/[^\x20-\x7E]/g, '?');
        }
        function s89FitText(font, text, max, size = 10, min = 6.5) {
            let t = s89SafeText(font, text), s = size;
            while (s > min && font.widthOfTextAtSize(t, s) > max) s -= 0.5;
            if (font.widthOfTextAtSize(t, s) > max) {
                while (t.length > 1 && font.widthOfTextAtSize(t + '…', s) > max) t = t.slice(0, -1);
                t = t.trimEnd() + '…';
            }
            return { t, s };
        }

        async function buildS89Pdf(slips) {
            if (typeof PDFLib === 'undefined') throw new Error('The PDF library (lib/pdf-lib.min.js) did not load. Please refresh the page.');
            if (typeof S89_BASE_B64 === 'undefined') throw new Error('The S-89 template (lib/s89-base.js) did not load.');
            const { PDFDocument, StandardFonts, rgb } = PDFLib;
            const doc = await PDFDocument.create();
            doc.setTitle('S-89 Our Christian Life and Ministry Meeting Assignment');
            doc.setCreator('Assignment Tracker');
            const [form] = await doc.embedPdf(base64ToBytes(S89_BASE_B64), [0]);
            const font = await doc.embedFont(StandardFonts.Helvetica);
            const bold = await doc.embedFont(StandardFonts.HelveticaBold);
            const PW = 612, PH = 792;                                   // Letter
            const ox = (PW - 2 * S89_W) / 2, oy = (PH - 2 * S89_H) / 2;
            const ink = rgb(0.08, 0.08, 0.12), cut = rgb(0.72, 0.72, 0.72);
            let page = null;
            slips.forEach((sl, i) => {
                const pos = i % 4;
                if (pos === 0) page = doc.addPage([PW, PH]);
                const col = pos % 2, row = Math.floor(pos / 2);
                const x0 = ox + col * S89_W, y0 = oy + (1 - row) * S89_H;
                page.drawPage(form, { x: x0, y: y0, width: S89_W, height: S89_H });
                page.drawRectangle({ x: x0, y: y0, width: S89_W, height: S89_H, borderColor: cut, borderWidth: 0.5, borderDashArray: [3, 3] });
                const write = (field, text, f = font, size = 10) => {
                    if (!text) return;
                    const F = S89_FIELDS[field];
                    const { t, s } = s89FitText(f, text, F.max, size);
                    page.drawText(t, { x: x0 + F.x, y: y0 + F.y, size: s, font: f, color: ink });
                };
                write('name', sl.student, bold, 10.5);
                write('assistant', sl.assistant);
                write('date', new Date(sl.thu + 'T12:00:00+08:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
                write('part', `${sl.partNo} — ${sl.title}`);
                // ☒ Main hall (walang auxiliary class)
                const cx = x0 + S89_MAIN_HALL.x, cy = y0 + S89_MAIN_HALL.y, r = 3.2;
                page.drawLine({ start: { x: cx - r, y: cy - r }, end: { x: cx + r, y: cy + r }, thickness: 1.2, color: ink });
                page.drawLine({ start: { x: cx - r, y: cy + r }, end: { x: cx + r, y: cy - r }, thickness: 1.2, color: ink });
            });
            return await doc.save();
        }

        async function exportS89Slips() {
            loadMeetingEditorData();
            const [year, month] = document.getElementById('monthSelect').value.split('-').map(Number);
            const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const { slips, missing, pastWeeks, noMeetingWeeks } = collectS89Slips(year, month);
            if (!slips.length) {
                alert(`No S-89 slips to make for ${label}.` +
                    (pastWeeks ? `\n${pastWeeks} past week(s) were skipped.` : '') +
                    (missing.length ? `\n${missing.length} student slot(s) still have no name — assign them first.` : ''));
                return;
            }
            const late = slips.filter(s => s.days < S89_LATE_DAYS);
            const notes = [];
            if (late.length) {
                const byWeek = {};
                late.forEach(s => { byWeek[s.thu] = (byWeek[s.thu] || 0) + 1; });
                notes.push(`⏰ ${late.length} slip(s) are less than 3 weeks before the meeting (S-38) — hand these out first:\n   ` +
                    Object.entries(byWeek).map(([d, n]) => `${shortDate(d)} (${n}, in ${daysUntil(d)} day${daysUntil(d) === 1 ? '' : 's'})`).join(', '));
            }
            if (missing.length) notes.push(`⚠ ${missing.length} slot(s) without a name (no slip): ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}`);
            if (pastWeeks) notes.push(`${pastWeeks} past week(s) skipped.`);
            if (noMeetingWeeks) notes.push(`${noMeetingWeeks} no-meeting week(s) skipped.`);
            const pages = Math.ceil(slips.length / 4);
            if (!confirm(`Make ${slips.length} S-89 slip(s) for ${label} — ${pages} page(s), 4 per page?\n\n${notes.join('\n\n')}${notes.length ? '\n\n' : ''}Print at 100% (Actual size) on Letter paper, then cut on the dashed lines.`)) return;
            try {
                const bytes = await buildS89Pdf(slips);
                const name = `S-89 ${label}.pdf`;
                // v28: kasama ng S-140 sa "schedule" folder
                const where = await saveToSchedule(name, new Blob([bytes], { type: 'application/pdf' }));
                alert(where === 'folder' ? `Saved ${name} to the "${lastSaveFolderName || 'schedule'}" folder!` : `Downloaded ${name} (it went to your Downloads folder).`);
            } catch (e) {
                alert('Error making the S-89 slips: ' + e.message);
            }
        }

        // ==================== v9: Fairness dashboard ====================
        let fairState = { view: 'students', months: 6, includeFuture: true, gender: 'all', sort: 'waiting', brSort: 'total' };
        const FAIR_WAIT_WEEKS = 8;

        function setFair(field, value) {
            fairState[field] = field === 'months' ? parseInt(value, 10) : field === 'includeFuture' ? !!value : value;
            renderFairnessView();
        }
        function fairPeriod() {
            const today = manilaTodayISO();
            const d = new Date(today + 'T12:00:00+08:00');
            d.setMonth(d.getMonth() - fairState.months);
            const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return { today, from, to: fairState.includeFuture ? '9999-12-31' : today };
        }
        function fairCard(value, label, tone) {
            return `<div class="fair-card ${tone || ''}"><div class="fair-card-v">${value}</div><div class="fair-card-l">${label}</div></div>`;
        }
        function fairBar(value, max, tone) {
            const pct = max ? Math.max(4, Math.round(value / max * 100)) : 0;
            return `<div class="fair-bar"><span class="fair-bar-fill ${tone || ''}" style="width:${value ? pct : 0}%"></span><b>${value}</b></div>`;
        }

        function renderFairnessView() {
            const el = document.getElementById('fairnessContent');
            if (!el) return;
            const { today, from, to } = fairPeriod();
            const opt = (field, v, l) => `<option value="${v}" ${String(fairState[field]) === String(v) ? 'selected' : ''}>${l}</option>`;
            let h = `<div class="fair-toolbar">
                <div class="fair-tabs">
                    <button class="${fairState.view === 'students' ? 'btn-primary' : 'btn-secondary'}" onclick="setFair('view','students')">🎓 Students</button>
                    <button class="${fairState.view === 'brothers' ? 'btn-primary' : 'btn-secondary'}" onclick="setFair('view','brothers')">📋 Brothers' parts</button>
                </div>
                <label class="fair-field">Period <select onchange="setFair('months', this.value)">${opt('months', 3, 'Last 3 months')}${opt('months', 6, 'Last 6 months')}${opt('months', 12, 'Last 12 months')}</select></label>
                <label class="stu-check"><input type="checkbox" ${fairState.includeFuture ? 'checked' : ''} onchange="setFair('includeFuture', this.checked)"> Include scheduled (future) parts</label>
            </div>
            <p class="fair-hint">Counts run from ${shortDate(from)}, ${from.slice(0, 4)}${fairState.includeFuture ? ' through every scheduled week' : ` to today (${shortDate(today)})`}. No-meeting weeks are not counted.</p>`;
            h += fairState.view === 'students' ? renderFairStudents(today, from, to) : renderFairBrothers(today, from, to);
            el.innerHTML = h;
        }

        function renderFairStudents(today, from, to) {
            if (!people.length) return '<div class="stu-empty">The roster is empty. Import the Masterlist in the Students tab first.</div>';
            const hist = buildStudentHistory();
            const nowThu = thursdayOfWeek(today);
            const pool = people.filter(p => p.active !== false && p.gender && (p.atas !== 'Elder' || studentSettings.includeElders))
                .filter(p => fairState.gender === 'all' || p.gender === fairState.gender);
            const noGender = people.filter(p => p.active !== false && !p.gender).length;
            const rows = pool.map(p => {
                const all = hist[p.id] || [];
                const past = all.filter(e => e.date <= today);
                const lastStu = past.find(e => e.role === 'Estudyante') || null;
                const lastAny = past[0] || null;
                const next = [...all].reverse().find(e => e.date > today) || null;
                const inP = all.filter(e => e.date >= from && e.date <= to);
                const stuN = inP.filter(e => e.role === 'Estudyante').length;
                const asN = inP.filter(e => e.role === 'Assistant').length;
                const wait = lastStu ? weeksBetween(lastStu.date, nowThu) : null;
                return { p, lastStu, lastAny, next, stuN, asN, wait };
            });
            const never = rows.filter(r => !r.lastStu && !r.next).length;
            const longWait = rows.filter(r => r.lastStu && !r.next && r.wait >= FAIR_WAIT_WEEKS).length;
            const scheduled = rows.filter(r => r.next).length;
            const maxStu = Math.max(1, ...rows.map(r => r.stuN));
            const sorters = {
                waiting: (a, b) => (!!a.next - !!b.next) || ((b.wait ?? 9999) - (a.wait ?? 9999)) || personLabel(a.p).localeCompare(personLabel(b.p)),
                most: (a, b) => (b.stuN - a.stuN) || (b.asN - a.asN) || personLabel(a.p).localeCompare(personLabel(b.p)),
                name: (a, b) => personLabel(a.p).localeCompare(personLabel(b.p))
            };
            rows.sort(sorters[fairState.sort] || sorters.waiting);
            const gopt = (v, l) => `<option value="${v}" ${fairState.gender === v ? 'selected' : ''}>${l}</option>`;
            const sopt = (v, l) => `<option value="${v}" ${fairState.sort === v ? 'selected' : ''}>${l}</option>`;
            let h = `<div class="fair-cards">
                ${fairCard(pool.length, 'in the student rotation')}
                ${fairCard(never, 'never had a part (nothing scheduled)', never ? 'warn' : 'ok')}
                ${fairCard(longWait, `waiting ${FAIR_WAIT_WEEKS}+ weeks (nothing scheduled)`, longWait ? 'warn' : 'ok')}
                ${fairCard(scheduled, 'already scheduled ahead')}
            </div>`;
            if (noGender) h += `<div class="stu-warn">⚠ ${noGender} active ${noGender === 1 ? 'person has' : 'people have'} no Brother/Sister set and ${noGender === 1 ? 'is' : 'are'} left out of this list.</div>`;
            h += `<div class="fair-filters">
                <label class="fair-field">Show <select onchange="setFair('gender', this.value)">${gopt('all', 'Everyone')}${gopt('Brother', 'Brothers')}${gopt('Sister', 'Sisters')}</select></label>
                <label class="fair-field">Sort <select onchange="setFair('sort', this.value)">${sopt('waiting', 'Longest waiting first')}${sopt('most', 'Most parts first')}${sopt('name', 'Name')}</select></label>
            </div>
            <table class="stu-table fair-table"><thead><tr><th>Name</th><th>Role</th><th>Last part as Student</th><th>Waiting</th><th>As Student</th><th>As Assistant</th><th>Next scheduled</th></tr></thead><tbody>`;
            rows.forEach(r => {
                const tone = r.next ? '' : (!r.lastStu ? 'fair-never' : (r.wait >= FAIR_WAIT_WEEKS ? 'fair-long' : ''));
                const waitTxt = r.next ? '<span class="stu-muted">scheduled</span>' : (!r.lastStu ? '<b>never</b>' : `<b>${r.wait}</b> wk${r.wait === 1 ? '' : 's'}`);
                h += `<tr class="${tone}">
                    <td>${escHtml(personLabel(r.p))}${r.p.pioneer ? ' <span class="stu-badge">RP</span>' : ''} <span class="fair-g">${r.p.gender === 'Brother' ? '♂' : '♀'}</span></td>
                    <td>${escHtml(r.p.atas)}</td>
                    <td>${r.lastStu ? `${escHtml(STUDENT_KINDS[r.lastStu.kind]?.short || r.lastStu.kind)} · ${shortDate(r.lastStu.date)}` : '<span class="stu-muted">—</span>'}</td>
                    <td>${waitTxt}</td>
                    <td>${fairBar(r.stuN, maxStu)}</td>
                    <td class="fair-num">${r.asN || '<span class="stu-muted">0</span>'}</td>
                    <td>${r.next ? `${escHtml(STUDENT_KINDS[r.next.kind]?.short || r.next.kind)} (${escHtml(roleLabel(r.next.role))}) · ${shortDate(r.next.date)}` : '<span class="stu-muted">—</span>'}</td></tr>`;
            });
            return h + `</tbody></table>`;
        }

        function renderFairBrothers(today, from, to) {
            const pool = brothers.filter(b => isSelectableForAssignment(b));
            if (!pool.length) return '<div class="stu-empty">No brothers yet. Import the Masterlist in the Students tab first.</div>';
            const nowThu = thursdayOfWeek(today);
            const hist = buildStudentHistory();
            const counted = assignments.filter(a => !isNoMeetingWeek(a.date));
            const rows = pool.map(b => {
                const mine = counted.filter(a => a.brotherId === b.id);
                const inP = mine.filter(a => a.date >= from && a.date <= to);
                const byType = {};
                inP.forEach(a => { byType[a.type] = (byType[a.type] || 0) + 1; });
                const pastDates = mine.map(a => a.date).filter(d => d <= today).sort();
                const futureDates = mine.map(a => a.date).filter(d => d > today).sort();
                const person = findPersonByName(b.name);
                const stuN = person ? (hist[person.id] || []).filter(e => e.date >= from && e.date <= to).length : 0;
                const last = pastDates[pastDates.length - 1] || null;
                return { b, total: inP.length, byType, last, next: futureDates[0] || null, stuN, since: last ? weeksBetween(last, nowThu) : null };
            });
            const active = rows.filter(r => r.total > 0);
            const avg = active.length ? rows.reduce((s, r) => s + r.total, 0) / rows.length : 0;
            const max = Math.max(1, ...rows.map(r => r.total));
            // v15: ikumpara sa inaasahan — Light ½ ay inaasahang kalahati; ★ ay may kaunting dagdag
            const wSum = rows.reduce((s, r) => s + brotherExpectedWeight(r.b), 0) || 1;
            const unit = rows.reduce((s, r) => s + r.total, 0) / wSum;
            rows.forEach(r => {
                r.expected = unit * brotherExpectedWeight(r.b);
                r.heavy = avg > 0 && r.total > r.expected * 1.5 && r.total - r.expected >= 1.5;
                r.idle = !r.next && (r.since === null || r.since >= FAIR_WAIT_WEEKS / brotherLoad(r.b));
            });
            const sorters = {
                total: (a, b) => (b.total - a.total) || a.b.name.localeCompare(b.b.name),
                least: (a, b) => (a.total - b.total) || a.b.name.localeCompare(b.b.name),
                since: (a, b) => ((b.since ?? 9999) - (a.since ?? 9999)) || a.b.name.localeCompare(b.b.name),
                name: (a, b) => BROTHER_CATEGORIES.indexOf(getBrotherCategory(a.b)) - BROTHER_CATEGORIES.indexOf(getBrotherCategory(b.b)) || a.b.name.localeCompare(b.b.name)
            };
            rows.sort(sorters[fairState.brSort] || sorters.total);
            const heavy = rows.filter(r => r.heavy).length, idle = rows.filter(r => r.idle).length;
            const lo = rows.length ? Math.min(...rows.map(r => r.total)) : 0;
            const sopt = (v, l) => `<option value="${v}" ${fairState.brSort === v ? 'selected' : ''}>${l}</option>`;
            let h = `<div class="fair-cards">
                ${fairCard(`${lo}–${max === 1 && !rows.some(r => r.total) ? 0 : max}`, 'parts per brother (lowest–highest)')}
                ${fairCard(avg.toFixed(1), 'average per brother')}
                ${fairCard(heavy, 'carrying 1.5× their expected share 🔴', heavy ? 'warn' : 'ok')}
                ${fairCard(idle, `no part in ${FAIR_WAIT_WEEKS}+ weeks, nothing scheduled 🟡`, idle ? 'warn' : 'ok')}
            </div>
            <div class="fair-filters"><label class="fair-field">Sort <select onchange="setFair('brSort', this.value)">${sopt('total', 'Most parts first')}${sopt('least', 'Fewest parts first')}${sopt('since', 'Longest since last part')}${sopt('name', 'Elders, then MS, then name')}</select></label></div>
            <table class="stu-table fair-table"><thead><tr><th>Brother</th><th></th><th>Parts in period</th><th>By assignment</th><th>Student parts</th><th>Last</th><th>Next</th></tr></thead><tbody>`;
            rows.forEach(r => {
                const chips = ASSIGNMENT_TYPES.filter(t => r.byType[t]).map(t => `<span class="fair-chip">${escHtml(typeLabel(t))} ${r.byType[t]}</span>`).join('') || '<span class="stu-muted">—</span>';
                h += `<tr class="${r.heavy ? 'fair-heavy' : r.idle ? 'fair-long' : ''}">
                    <td>${escHtml(r.b.name)}${loadTags(r.b)} ${r.heavy ? '🔴' : r.idle ? '🟡' : ''}</td>
                    <td><span class="stu-badge">${escHtml(getBrotherCategory(r.b))}</span></td>
                    <td>${fairBar(r.total, max, r.heavy ? 'heavy' : '')}${Math.abs(r.expected - avg) > 0.25 ? `<div class="stu-muted" style="font-size:11px">expected ≈ ${r.expected.toFixed(1)}</div>` : ''}</td>
                    <td class="fair-chips">${chips}</td>
                    <td class="fair-num">${r.stuN || '<span class="stu-muted">0</span>'}</td>
                    <td>${r.last ? `${shortDate(r.last)} <span class="stu-muted">(${r.since} wk${r.since === 1 ? '' : 's'})</span>` : '<span class="stu-muted">—</span>'}</td>
                    <td>${r.next ? shortDate(r.next) : '<span class="stu-muted">—</span>'}</td></tr>`;
            });
            return h + `</tbody></table>`;
        }

        // ==================== v10: "Brother" tag → CBS Reader lang ====================
        // Patakaran ng overseer: ang brother na hindi Elder o MS ay puwede lang maging CBS Reader sa Assignments tab.
        // (Hindi nito ginagalaw ang student parts sa Students tab.)
        const BROTHER_TAG_TYPES = ['CBS Reader'];
        function categoryAllowsType(brother, type) {
            return !brother || getBrotherCategory(brother) !== 'Brother' || BROTHER_TAG_TYPES.includes(type);
        }
        function checkBrotherRule(brotherId, type) {
            const b = brothers.find(x => x.id === brotherId);
            if (categoryAllowsType(b, type)) return true;
            alert(`${b.name} is tagged "Brother" (not Elder or MS), so he can only be assigned CBS Reader.\n\nIf he has been appointed, update his role (Atas) in the Masterlist and import it again.`);
            return false;
        }

        // ==================== v11 helpers ====================
        const PART_FAMILY = { 'Opening Prayer': 'prayer', 'Closing prayer': 'prayer', 'CBS': 'cbs', 'CBS Reader': 'cbs' };
        function partFamily(type) { return PART_FAMILY[type] || type; }
        function addDaysISO(dateStr, n) {
            const d = new Date(new Date(dateStr + 'T12:00:00+08:00').getTime() + n * 86400000);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        // Susunod/naunang Huwebes na MAY pulong (hanggang 5 linggo)
        function adjacentMeeting(dateStr, dir) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return null;
            for (let k = 1; k <= 5; k++) {
                const t = addDaysISO(dateStr, 7 * k * dir);
                if (!isNoMeetingWeek(t)) return t;
            }
            return null;
        }
        // Mga bahagi sa Students tab bawat pangalan (Bible reading, student parts, assistant, at Pagtalakay)
        function studentTabPartsByName() {
            const map = {};
            const add = (name, date, label) => {
                const k = normalizeBrotherName(name || '');
                if (!k) return;
                (map[k] = map[k] || []).push({ date, label });
            };
            Object.keys(meetingEditorData).forEach(key => {
                const m = key.match(/^week_(\d{4}-\d{2}-\d{2})$/);
                if (!m || isNoMeetingWeek(m[1])) return;
                const md = meetingEditorData[key] || {};
                add(md.bibleReadingName, m[1], 'Bible Reading');
                (md.ministryParts || []).forEach(p => {
                    const kind = getPartKind(p);
                    const lbl = STUDENT_KINDS[kind]?.short || 'Student part';
                    add(p.name, m[1], lbl);
                    if (STUDENT_KINDS[kind]?.assistant) add(p.assistant, m[1], `${lbl} (assistant)`);
                });
            });
            return map;
        }
        // Mga atas sa Assignments tab ng isang tao (para sa Students tab ranking)
        function gridPartsOfPerson(p) {
            const n = normalizeBrotherName(personName(p));
            const b = brothers.find(x => normalizeBrotherName(x.name) === n);
            return b ? assignments.filter(a => a.brotherId === b.id && !isNoMeetingWeek(a.date)) : [];
        }

        // ==================== v12: CBS Reader, 10-min talk, Spiritual Gems ====================
        // Patakaran ng overseer (Okt 5 2026):
        //  • CBS Reader → MS at Brothers lang (hindi elder). Auto-assign: hindi isinasama; mano-mano: magtatanong muna.
        //  • 10-min talk (Kayamanan) → elder; MS hanggang N beses bawat buwan para sa buong kongregasyon (default 2).
        //  • Spiritual Gems → mas madalas sa MS (~70–85% sa test; puwede pa rin ang elder): binibilang ang MS na parang may 1 mas kaunting atas.
        const MS_GEMS_PREFERENCE = 1;
        const SAME_TYPE_WEIGHT = 1; // parehong uri ng atas sa ±13 linggo = parang 1 dagdag na atas
        // Auto-assign: unahin ang mga atas na may pinakamakitid na pagpipilian, para hindi maubos ang MS sa panalangin
        // bago umabot sa CBS Reader (MS/Brothers lang), at ang elders bago umabot sa Chairman/CBS.
        const AUTO_FILL_ORDER = ['CBS Reader', 'OCLM Chairman', 'CBS', 'Espiritual na Hiyas', '10 mins talk', 'Pamumuhay', 'Opening Prayer', 'Closing prayer'];
        function msTalkCap() {
            const n = parseInt(meetingSettings.msTalkMax, 10);
            return isNaN(n) ? 2 : Math.max(0, n);
        }
        function msTalkCount(date) {
            const m = (date || '').slice(0, 7);
            return assignments.filter(a => a.type === '10 mins talk' && a.date !== date && a.date.slice(0, 7) === m && !isNoMeetingWeek(a.date))
                .filter(a => getBrotherCategory(brothers.find(b => b.id === a.brotherId)) === 'MS').length;
        }
        function roleRuleViolation(brother, date, type) {
            if (!brother) return '';
            const cat = getBrotherCategory(brother);
            if (type === 'CBS Reader' && cat === 'Elder') return 'reader';
            if (type === '10 mins talk' && cat === 'MS' && date && msTalkCount(date) >= msTalkCap()) return 'mstalk';
            return '';
        }
        function confirmRoleRule(brotherId, type, date) {
            const b = brothers.find(x => x.id === brotherId);
            const v = roleRuleViolation(b, date, type);
            if (!v) return true;
            if (v === 'reader') return confirm(`CBS Reader goes to ministerial servants and brothers. ${b.name} is an elder.\n\nAssign anyway?`);
            const month = new Date(date + 'T12:00:00+08:00').toLocaleDateString('en-US', { month: 'long' });
            return confirm(`Ministerial servants give the 10-min talk at most ${msTalkCap()} time(s) a month — ${month} already has ${msTalkCount(date)}.\n\n${b.name} is MS. Assign anyway?`);
        }

        // ==================== v13: Students — partners, variety, back-to-back, Fix ====================
        let studentUndoSnapshots = [];
        function studentAdjacencyContext(thursday) {
            return { prev: adjacentMeeting(thursday, -1), next: adjacentMeeting(thursday, 1), stuMap: studentTabPartsByName() };
        }
        // May bahagi ba ang tao sa pulong bago o pagkatapos? (Estudyante/Assistant, Pagtalakay, o atas sa Assignments tab)
        function adjacentPartNote(p, thursday, hist, ctx) {
            const near = d => !!d && (d === ctx.prev || d === ctx.next);
            const rel = d => d < thursday ? 'the meeting before' : 'the meeting after';
            const h = (hist[p.id] || []).find(e => near(e.date));
            if (h) return `has a part ${rel(h.date)} (${STUDENT_KINDS[h.kind]?.short || h.kind}, ${roleLabel(h.role)})`;
            const g = gridPartsOfPerson(p).find(a => near(a.date));
            if (g) return `has ${typeLabel(g.type)} ${rel(g.date)}`;
            const st = (ctx.stuMap[normalizeBrotherName(personName(p))] || []).find(x => near(x.date));
            if (st) return `has ${st.label} ${rel(st.date)}`;
            return '';
        }

        // Mga problema sa Students tab mula sa susunod na linggo (hindi ginagalaw ang kasalukuyang linggo):
        //  'pair' = magkapartner na ulit; 'consecutive' = may bahagi ang tao sa magkasunod na pulong.
        function findStudentIssues() {
            const thisThu = thursdayOfWeek(manilaTodayISO());
            const weeks = Object.keys(meetingEditorData).map(k => (k.match(/^week_(\d{4}-\d{2}-\d{2})$/) || [])[1])
                .filter(Boolean).filter(d => !isNoMeetingWeek(d)).sort();
            const issues = [], taken = new Set(), firstPair = {};
            const keyOf = (a, b) => [a, b].sort().join('|');
            const items = {}; // pid -> [{date, slot, role, clearable}]
            const addItem = (pid, date, slot, role) => { if (pid) (items[pid] = items[pid] || []).push({ date, slot, role }); };
            weeks.forEach(thu => {
                const md = meetingEditorData[getMeetingEditorKey(thu)] || {};
                addItem(md.bibleReadingId || findPersonByName(md.bibleReadingName)?.id, thu, 'bible', 'student');
                (md.ministryParts || []).forEach((part, i) => {
                    const kind = getPartKind(part);
                    if (kind === 'discussion') return;
                    const sid = part.studentId || findPersonByName(part.name)?.id;
                    const aid = STUDENT_KINDS[kind]?.assistant ? (part.assistantId || findPersonByName(part.assistant)?.id) : null;
                    addItem(sid, thu, i, 'student');
                    addItem(aid, thu, i, 'assistant');
                    if (sid && aid) {
                        const k = keyOf(sid, aid);
                        if (firstPair[k] && thu > thisThu && !taken.has(`${thu}|${i}|assistant`)) {
                            issues.push({ kind: 'pair', thu, slot: i, role: 'assistant', d1: firstPair[k], names: [part.name, part.assistant] });
                            taken.add(`${thu}|${i}|assistant`);
                        }
                        if (!firstPair[k]) firstPair[k] = thu;
                    }
                });
            });
            Object.entries(items).forEach(([pid, list]) => {
                const p = getPerson(pid);
                if (!p) return;
                const grid = gridPartsOfPerson(p).map(a => ({ date: a.date, slot: null, role: 'grid', label: typeLabel(a.type) }));
                const all = list.concat(grid);
                const dates = [...new Set(all.map(x => x.date))].sort();
                dates.forEach(d1 => {
                    const d2 = adjacentMeeting(d1, 1);
                    if (!d2 || !dates.includes(d2)) return;
                    const pickAt = d => all.find(x => x.date === d && x.slot !== null && d > thisThu);
                    const c = pickAt(d2) || pickAt(d1);
                    if (!c) return; // Assignments tab lang — hawak ng 🔁 Spread them out
                    const key = `${c.date}|${c.slot}|${c.role}`;
                    if (taken.has(key) || (c.role === 'assistant' && taken.has(`${c.date}|${c.slot}|student`))) return;
                    taken.add(key);
                    issues.push({ kind: 'consecutive', thu: c.date, slot: c.slot, role: c.role, d1, d2, names: [personName(p)] });
                });
            });
            return issues.sort((a, b) => a.thu.localeCompare(b.thu));
        }
        function renderStudentIssuesBanner() {
            const list = findStudentIssues();
            if (!list.length) return '';
            const pairs = list.filter(x => x.kind === 'pair'), cons = list.filter(x => x.kind === 'consecutive');
            const ex = list.slice(0, 5).map(x => x.kind === 'pair'
                ? `${escHtml(x.names[0])} & ${escHtml(x.names[1])} again on ${shortDate(x.thu)} (first ${shortDate(x.d1)})`
                : `${escHtml(x.names[0])} — ${shortDate(x.d1)} & ${shortDate(x.d2)}`).join(' · ');
            return `<div class="s38-banner">🔁 <b>${[pairs.length ? `${pairs.length} repeated partner${pairs.length === 1 ? '' : 's'}` : '', cons.length ? `${cons.length} back-to-back part${cons.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ')}</b> from next week on.
                <div class="s38-list">${ex}${list.length > 5 ? ` · …and ${list.length - 5} more` : ''}</div>
                <button class="btn-primary text-sm" onclick="startStudentFix()">🔁 Fix these</button></div>`;
        }
        function startStudentFix() {
            const list = findStudentIssues();
            if (!list.length) { alert('No repeated partners or back-to-back student parts from next week on.'); return; }
            const pairs = list.filter(x => x.kind === 'pair').length, cons = list.length - pairs;
            startStudentAutoAssign({ clears: list.map(x => ({ thu: x.thu, slot: x.slot, role: x.role })),
                fixInfo: [pairs ? `${pairs} repeated partner(s)` : '', cons ? `${cons} back-to-back part(s)` : ''].filter(Boolean).join(', ') });
        }

        // ==================== v13: Auto-assign month range (Assignments + Students) ====================
        function addMonthsKey(key, n) {
            let [y, m] = key.split('-').map(Number);
            m += n;
            while (m > 12) { m -= 12; y++; }
            while (m < 1) { m += 12; y--; }
            return `${y}-${String(m).padStart(2, '0')}`;
        }
        function getAutoRange(which) {
            const now = manilaTodayISO().slice(0, 7);
            const ok = v => /^\d{4}-\d{2}$/.test(v || '');
            const from = ok(meetingSettings.autoFrom) ? meetingSettings.autoFrom : now;
            let to = ok(meetingSettings.autoTo) ? meetingSettings.autoTo : addMonthsKey(from, 2);
            if (to < from) to = from;
            const months = [];
            for (let k = from; k <= to && months.length < 12; k = addMonthsKey(k, 1)) months.push(k.split('-').map(Number));
            const fmt = k => new Date(k + '-15T12:00:00+08:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const last = `${months[months.length - 1][0]}-${String(months[months.length - 1][1]).padStart(2, '0')}`;
            return { from, to: last, months, label: from === last ? fmt(from) : `${fmt(from)} – ${fmt(last)}` };
        }
        function setAutoRange(field, value) {
            const r = getAutoRange();
            meetingSettings.autoFrom = r.from;
            meetingSettings.autoTo = r.to;
            if (!/^\d{4}-\d{2}$/.test(value || '')) return render();
            if (field === 'from') {
                meetingSettings.autoFrom = value;
                if (meetingSettings.autoTo < value) meetingSettings.autoTo = value;
                if (meetingSettings.autoTo > addMonthsKey(value, 11)) meetingSettings.autoTo = addMonthsKey(value, 11);
            } else {
                meetingSettings.autoTo = value < meetingSettings.autoFrom ? meetingSettings.autoFrom : value;
                if (meetingSettings.autoTo > addMonthsKey(meetingSettings.autoFrom, 11)) meetingSettings.autoTo = addMonthsKey(meetingSettings.autoFrom, 11);
            }
            saveMeetingSettings();
            render();
        }
        function renderAutoRangeControls() {
            const r = getAutoRange();
            return `<span class="auto-range" title="Auto-assign fills empty slots in these months only (up to 12). Past weeks are never filled.">
                <span class="auto-range-l">Auto-assign</span>
                <label>from <input type="month" value="${r.from}" onchange="setAutoRange('from', this.value)"></label>
                <label>to <input type="month" value="${r.to}" min="${r.from}" onchange="setAutoRange('to', this.value)"></label></span>`;
        }


        // ==================== v14: Assignments tab colors (S-140 sections) ====================
        // Gray = Kayamanan, Maroon = Pamumuhay, maputla = mga panalangin; ginto = bahagi sa Students tab.
        const GRID_TYPE_STYLE = {
            'Opening Prayer':      { code: 'OP', bg: '#E5E7EB', fg: '#374151', head: '#6B7280', trail: '#F4F5F7' },
            'OCLM Chairman':       { code: 'CH', bg: '#1F2937', fg: '#FFFFFF', head: '#1F2937', trail: '#E6E8EB' },
            '10 mins talk':        { code: '10', bg: '#575A5D', fg: '#FFFFFF', head: '#575A5D', trail: '#ECEDEE' },
            'Espiritual na Hiyas': { code: 'GM', bg: '#9CA3AF', fg: '#FFFFFF', head: '#6B7280', trail: '#F1F2F4' },
            'Pamumuhay':           { code: 'LC', bg: '#7E0024', fg: '#FFFFFF', head: '#7E0024', trail: '#F7E6EB' },
            'CBS':                 { code: 'CB', bg: '#BE123C', fg: '#FFFFFF', head: '#BE123C', trail: '#FDEBEF' },
            'CBS Reader':          { code: 'RD', bg: '#FBCFE8', fg: '#9F1239', head: '#DB2777', trail: '#FEF3F8' },
            'Closing prayer':      { code: 'CP', bg: '#E5E7EB', fg: '#374151', head: '#6B7280', trail: '#F4F5F7' }
        };
        const GRID_STU_STYLE = { bg: '#FEF3C7', fg: '#92400E' };
        function gridTypeStyle(type) { return GRID_TYPE_STYLE[type] || { code: '?', bg: '#F3F4F6', fg: '#374151', head: '#374151', trail: '#F9FAFB' }; }
        // Code ng bahagi sa Students tab para sa grid
        function studentChipCode(label) {
            const l = (label || '').toLowerCase();
            if (l.includes('bible reading')) return 'BR';
            if (l.includes('(assistant)')) return 'AS';
            if (l.includes('discussion')) return 'DS';
            return 'ST';
        }
        function gridChip(code, bg, fg, cls, title) {
            return `<span class="gchip ${cls || ''}" style="background:${bg};color:${fg}" title="${escHtml(title || '')}">${code}</span>`;
        }
        function renderGridLegend(selectedType) {
            let h = '';
            ASSIGNMENT_TYPES.forEach(t => {
                const st = gridTypeStyle(t);
                h += `<span class="gl-item${t === selectedType ? ' gl-sel' : ''}">${gridChip(st.code, st.bg, st.fg)}${escHtml(typeLabel(t))}</span>`;
            });
            [['BR', 'Bible Reading'], ['ST', 'Student part'], ['AS', 'Assistant'], ['DS', 'Discussion']].forEach(([c, l]) => {
                h += `<span class="gl-item">${gridChip(c, GRID_STU_STYLE.bg, GRID_STU_STYLE.fg, 'gchip-stu')}${l} <span class="gl-dim">(Students tab)</span></span>`;
            });
            const sel = gridTypeStyle(selectedType);
            h += `<span class="gl-item"><span class="gl-box" style="background:${sel.trail}"></span>Trail for ${escHtml(typeLabel(selectedType))} (→ last time)</span>`;
            h += `<span class="gl-item">${gridChip('&nbsp;&nbsp;', '#fff', '#111', 'gchip-b2b')}Also has a part the meeting before/after</span>`;
            h += `<span class="gl-item">${gridChip('&nbsp;&nbsp;', '#fff', '#111', 'gchip-month')}Same part as his previous/next one (≤ ${REPEAT_GAP_WEEKS} wks)</span>`;
            h += `<span class="gl-item"><span class="gl-box gl-now"></span>This week</span>`;
            h += `<span class="gl-item"><span class="gl-box">☀️</span>Sunday assignment</span>`;
            return h;
        }


        // ==================== v15: Load (½, ⅓) + ★ Preferred parts + shuffle (Assignments tab) ====================
        // Load: ½ = mga kalahati ng bahagi ng iba (hal. may ibang mabigat na atas gaya ng Watchtower conductor).
        // ★ ×2 / ×3: mas madalas sa uring iyon (hal. ang OCLM overseer bilang Chairman, S-38 ¶25).
        // Sa Assignments tab lang ito; hindi apektado ang Students tab.
        const LOAD_OPTIONS = [[1, 'Normal'], [0.5, 'Light ½'], [1 / 3, 'Very light ⅓']];
        const PREF_RANK_BONUS = 3;
        let gridShuffleKey = null;
        function brotherLoad(b) {
            const v = Number(b && b.load);
            return v > 0 && v < 1 ? v : 1;
        }
        function loadLabel(v) { return v >= 0.99 ? '1×' : v >= 0.45 ? '½' : '⅓'; }
        function brotherPref(b, type) {
            const v = Number(b && b.prefer && b.prefer[type]);
            return v >= 2 ? Math.min(3, Math.round(v)) : 1;
        }
        function setBrotherLoad(id, value) {
            const b = brothers.find(x => x.id === id);
            if (!b) return;
            const v = Number(value);
            if (v > 0 && v < 1) b.load = v; else delete b.load;
            saveData(); render(); renderAssignmentSelectionModal();
        }
        function setBrotherLoadReason(id, value) {
            const b = brothers.find(x => x.id === id);
            if (!b) return;
            const v = (value || '').trim().slice(0, 60);
            if (v) b.loadReason = v; else delete b.loadReason;
            saveData(); render();
        }
        function setBrotherPref(id, type, value) {
            const b = brothers.find(x => x.id === id);
            if (!b || !ASSIGNMENT_TYPES.includes(type)) return;
            const v = Number(value);
            b.prefer = b.prefer || {};
            if (v >= 2) b.prefer[type] = Math.min(3, Math.round(v)); else delete b.prefer[type];
            if (!Object.keys(b.prefer).length) delete b.prefer;
            saveData(); render(); renderAssignmentSelectionModal();
        }
        const PREF_SHORT = { 'Opening Prayer': 'OP', 'OCLM Chairman': 'CH', '10 mins talk': '10', 'Espiritual na Hiyas': 'GM', 'Pamumuhay': 'LC', 'CBS': 'CB', 'CBS Reader': 'RD', 'Closing prayer': 'CP' };
        function loadTags(b) {
            if (!b) return '';
            let h = '';
            const l = brotherLoad(b);
            if (l < 1) h += `<span class="load-tag" title="Light load${b.loadReason ? ': ' + escHtml(b.loadReason) : ''} — gets about ${loadLabel(l)} as many Assignments-tab parts">${loadLabel(l)}</span>`;
            Object.entries(b.prefer || {}).forEach(([t, v]) => {
                if (v >= 2) h += `<span class="pref-tag" title="★ Preferred for ${escHtml(typeLabel(t))} — about ${v}× as often">★${PREF_SHORT[t] || ''}${v > 2 ? '×' + v : ''}</span>`;
            });
            return h;
        }
        function renderLoadControls(b) {
            const l = brotherLoad(b);
            return `<div class="load-row"><label>Load
                <select onchange="setBrotherLoad('${b.id}', this.value)">${LOAD_OPTIONS.map(([v, lbl]) => `<option value="${v}" ${Math.abs(l - v) < 0.01 ? 'selected' : ''}>${lbl}</option>`).join('')}</select></label>
                ${l < 1 ? `<input type="text" class="load-reason" placeholder="Reason (e.g. Watchtower conductor)" value="${escHtml(b.loadReason || '')}" onchange="setBrotherLoadReason('${b.id}', this.value)">` : '<span class="load-hint">Light = fewer Assignments-tab parts. ★ in ⚙️ Eligibility = a part he gets more often.</span>'}
            </div>`;
        }
        // Inaasahang bahagi (para sa 📊 Fairness): load × (1 + dagdag para sa ★)
        function brotherExpectedWeight(b) {
            let w = 1;
            Object.values(b.prefer || {}).forEach(v => { if (v >= 2) w += (v - 1) / Math.max(1, ASSIGNMENT_TYPES.length - 1); });
            return brotherLoad(b) * w;
        }


        // ==================== v16→v18: same part again as his previous/next part (≤ 8 weeks) ====================
        const MONTH_REPEAT_WEIGHT = 3;
        const REPEAT_GAP_WEEKS = 8; // v18: babala lang kung pareho ang kasunod na bahagi sa loob ng 8 linggo
        // "Parehong bahagi" = parehong pamilya (Opening/Closing Prayer = panalangin; CBS Conductor/Reader = CBS).
        // Hindi binibilang ang ★ preferred part ng brother (hal. Chairman ng overseer).
        function monthKeyShift(dateStr, n) { return addMonthsKey(dateStr.slice(0, 7), n); }
function monthRepeatOf(brotherId, date, type) {
            // v18: ang KASUNOD na bahagi ng brother (bago o pagkatapos ng petsang ito) — hindi buwan sa kalendaryo.
            // Babala lang kung pareho ang bahagi (parehong pamilya) at ≤ REPEAT_GAP_WEEKS ang pagitan.
            // Kapag may ibang bahagi sa pagitan (hal. Gems → Prayer → Gems), walang babala.
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
            const b = brothers.find(x => x.id === brotherId);
            if (!b || brotherPref(b, type) > 1) return null;
            const fam = partFamily(type);
            const mine = assignments.filter(a => a.brotherId === brotherId && a.date !== date && !isNoMeetingWeek(a.date) && /^\d{4}-\d{2}-\d{2}$/.test(a.date));
            const before = mine.filter(a => a.date < date).sort((x, y) => y.date.localeCompare(x.date));
            const after = mine.filter(a => a.date > date).sort((x, y) => x.date.localeCompare(y.date));
            const near = [];
            if (before.length) { const d0 = before[0].date; before.filter(a => a.date === d0).forEach(a => near.push(a)); }
            if (after.length) { const d0 = after[0].date; after.filter(a => a.date === d0).forEach(a => near.push(a)); }
            const hits = near.filter(a => partFamily(a.type) === fam && weeksBetween(a.date, date) <= REPEAT_GAP_WEEKS);
            if (!hits.length) return null;
            hits.sort((x, y) => weeksBetween(x.date, date) - weeksBetween(y.date, date));
            return hits[0];
        }
        // Mga pares: {brother, first (buwan M), second (buwan M+1)} — kapag ang mas huli ay mula sa susunod na linggo pataas
function findMonthRepeats() {
            // v18: mga pares na magkasunod sa SARILING listahan ng bahagi ng brother, parehong bahagi, ≤ REPEAT_GAP_WEEKS.
            // Ang nasa magkasunod na pulong ay hawak na ng "consecutive meetings" kaya hindi na inuulit dito.
            const thisThu = thursdayOfWeek(manilaTodayISO());
            const out = [];
            brothers.forEach(b => {
                const mine = assignments.filter(a => a.brotherId === b.id && !isNoMeetingWeek(a.date) && /^\d{4}-\d{2}-\d{2}$/.test(a.date))
                    .sort((x, y) => x.date.localeCompare(y.date));
                const dates = [...new Set(mine.map(a => a.date))];
                for (let i = 1; i < dates.length; i++) {
                    const d1 = dates[i - 1], d2 = dates[i];
                    if (d2 <= thisThu || weeksBetween(d1, d2) > REPEAT_GAP_WEEKS || adjacentMeeting(d1, 1) === d2) continue;
                    const A = mine.filter(a => a.date === d1), B = mine.filter(a => a.date === d2);
                    B.forEach(a2 => {
                        if (brotherPref(b, a2.type) > 1) return;
                        const a1 = A.find(x => partFamily(x.type) === partFamily(a2.type));
                        if (a1) out.push({ brother: b, first: a1, second: a2 });
                    });
                }
            });
            return out.sort((x, y) => x.second.date.localeCompare(y.second.date));
        }


        // ==================== v17: close the Spread-them-out banner ====================
        function spacingSignature(list, months) {
            list = list || findSpacingIssues();
            months = months || findMonthRepeats();
            return list.map(c => `${c.brother.id}|${c.d1}|${c.d2}|${c.kind}`)
                .concat(months.map(m => `m|${m.brother.id}|${m.first.id}|${m.second.id}`)).sort().join(';');
        }
        function dismissSpacingBanner() {
            localStorage.setItem('nc_spacingDismissed', spacingSignature());
            renderGrid();
        }
        function showSpacingBanner() {
            localStorage.removeItem('nc_spacingDismissed');
            renderGrid();
        }


        // ==================== v21: remove people who left (from the Masterlist import) ====================
        // Aalisin sa roster; buburahin ang pangalan nila sa mga bahagi sa Students tab mula sa susunod na linggo.
        // Ang kasalukuyan at mga lumipas na linggo ay hindi ginagalaw (kasaysayan).
        function removePeopleFromRoster(ids) {
            const set = new Set(ids);
            const gonePeople = people.filter(p => set.has(p.id));
            const thisThu = thursdayOfWeek(manilaTodayISO());
            const isGone = (id, name) => (id && set.has(id)) || (!id && gonePeople.some(p => normName(personName(p)) === normName(name || '') && normName(name || '')));
            const cleared = [];
            Object.keys(meetingEditorData).forEach(key => {
                const m = key.match(/^week_(\d{4}-\d{2}-\d{2})$/);
                const md = meetingEditorData[key];
                if (!md || typeof md !== 'object') return;
                const upcoming = m && m[1] > thisThu;
                if (isGone(md.bibleReadingId, md.bibleReadingName)) {
                    if (upcoming) { cleared.push(`${shortDate(m[1])} Bible Reading (${md.bibleReadingName})`); md.bibleReadingName = ''; }
                    md.bibleReadingId = '';
                }
                (md.ministryParts || []).forEach((pt, i) => {
                    if (isGone(pt.studentId, pt.name)) {
                        if (upcoming) { cleared.push(`${shortDate(m[1])} ${pt.title || 'student part'} (${pt.name})`); pt.name = ''; }
                        pt.studentId = '';
                    }
                    if (isGone(pt.assistantId, pt.assistant)) {
                        if (upcoming) { cleared.push(`${shortDate(m[1])} ${pt.title || 'student part'} — assistant (${pt.assistant})`); pt.assistant = ''; }
                        pt.assistantId = '';
                    }
                });
            });
            const bros = gonePeople.filter(p => brothers.some(b => normalizeBrotherName(b.name) === normalizeBrotherName(personName(p)))).map(personLabel);
            people = people.filter(p => !set.has(p.id));
            return { removed: gonePeople.length, cleared, brothers: bros };
        }


        // ==================== v22: Roster editing (RP, Role, name, notes) ====================
        let editingPersonId = null;
        function setPersonPioneer(id, checked) {
            const p = getPerson(id); if (!p) return;
            p.pioneer = !!checked;
            saveData();
            renderStudentsView();
        }
        function setPersonAtas(id, value) {
            const p = getPerson(id); if (!p || !PERSON_ATAS.includes(value)) return;
            p.atas = value;
            if ((value === 'Elder' || value === 'MS') && !p.gender) p.gender = 'Brother';
            syncBrothersFromPeople();
            refreshBrotherCategories();
            saveData();
            render();
        }
        function startPersonEdit(id) { editingPersonId = id; renderStudentsView(); }
        function cancelPersonEdit() { editingPersonId = null; renderStudentsView(); }
        function renderPersonEditRow(p) {
            return `<tr class="stu-editing"><td colspan="9"><div class="stu-edit">
                <label>First name <input id="editPersonFirst" value="${escHtml(p.first)}"></label>
                <label>Last name <input id="editPersonLast" value="${escHtml(p.last)}"></label>
                <label>Notes <input id="editPersonNotes" value="${escHtml(p.notes || '')}" placeholder="e.g. Commuter, Infirmed"></label>
                <button class="btn-primary text-sm" onclick="savePersonEdit('${p.id}')">💾 Save</button>
                <button class="btn-secondary text-sm" onclick="cancelPersonEdit()">Cancel</button>
                <div class="stu-note">Role, RP, Brother/Sister and Active can be changed directly in the row. A new name also updates this person's names in the schedule${p.atas === 'Elder' || p.atas === 'MS' ? ' and in the Assignments grid' : ''}.</div>
            </div></td></tr>`;
        }
        function savePersonEdit(id) {
            const p = getPerson(id); if (!p) return;
            const first = (document.getElementById('editPersonFirst')?.value || '').trim();
            const last = (document.getElementById('editPersonLast')?.value || '').trim();
            const notes = (document.getElementById('editPersonNotes')?.value || '').trim();
            if (!first || !last) { alert('Enter both the first name and the last name.'); return; }
            if (people.some(x => x.id !== id && normName(x.first) === normName(first) && normName(x.last) === normName(last))) { alert('Another person in the roster already has this name.'); return; }
            const oldName = personName(p);
            const renamed = normName(first) !== normName(p.first) || normName(last) !== normName(p.last);
            p.notes = notes;
            let parts = 0, grid = '';
            if (renamed) ({ parts, grid } = applyPersonRename(p, first, last));
            editingPersonId = null;
            syncBrothersFromPeople();
            saveData();
            render();
            if (renamed) alert(`Renamed ${oldName} → ${personName(p)}.` +
                (parts ? `\n${parts} schedule name(s) updated.` : '') + (grid ? `\nAssignments grid updated too.` : '') +
                `\n\nUpdate the Masterlist file as well — otherwise the next import will see "${personName(p)}" as missing and "${oldName}" as new.` +
                `\nRe-export the S-140 / S-89 if this name was already printed.`);
        }
        // v23: pinagsamang pagpapalit ng pangalan (Roster ✏️ at Manage Selection ✏️)
        function applyPersonRename(p, first, last) {
            const id = p.id;
            const oldName = personName(p);
            p.first = first; p.last = last;
            let parts = 0, grid = '';
            {
                const newName = personName(p);
                // pangalan sa Students tab / S-140 (naka-link sa id; o sa lumang pangalan kung walang id)
                const same = (pid, nm) => pid === id || (!pid && normName(nm) === normName(oldName));
                Object.values(meetingEditorData).forEach(md => {
                    if (!md || typeof md !== 'object') return;
                    if (same(md.bibleReadingId, md.bibleReadingName) && (md.bibleReadingName || md.bibleReadingId)) { md.bibleReadingName = newName; md.bibleReadingId = id; parts++; }
                    (md.ministryParts || []).forEach(pt => {
                        if (same(pt.studentId, pt.name) && (pt.name || pt.studentId)) { pt.name = newName; pt.studentId = id; parts++; }
                        if (same(pt.assistantId, pt.assistant) && (pt.assistant || pt.assistantId)) { pt.assistant = newName; pt.assistantId = id; parts++; }
                    });
                });
                // Assignments grid: palitan din ang pangalan ng kaparehong brother para manatiling naka-link
                const b = brothers.find(x => normalizeBrotherName(x.name) === normalizeBrotherName(oldName));
                if (b && !brothers.some(x => x !== b && normalizeBrotherName(x.name) === normalizeBrotherName(newName))) { b.name = newName; grid = newName; }
                saveMeetingEditorData();
            }
            return { parts, grid };
        }


        // ==================== v23: rename a brother in 🎯 Manage Selection ====================
        let editingBrotherId = null;
        function findRosterPersonForBrother(b) {
            const n = normalizeBrotherName(b && b.name);
            return n ? people.find(p => normalizeBrotherName(personName(p)) === n) || null : null;
        }
        function startBrotherRename(id) { editingBrotherId = id; renderAssignmentSelectionModal(); setTimeout(() => { const el = document.getElementById('editBrotherName'); if (el && el.focus) { el.focus(); el.select && el.select(); } }, 0); }
        function cancelBrotherRename() { editingBrotherId = null; renderAssignmentSelectionModal(); }
        function saveBrotherRename(id) {
            const b = brothers.find(x => x.id === id); if (!b) return;
            const newName = (document.getElementById('editBrotherName')?.value || '').trim().replace(/\s+/g, ' ');
            if (!newName) { alert('Enter a name.'); return; }
            if (normalizeBrotherName(newName) === normalizeBrotherName(b.name)) { cancelBrotherRename(); return; }
            if (brothers.some(x => x.id !== id && normalizeBrotherName(x.name) === normalizeBrotherName(newName))) { alert('Another brother in the Assignments grid already has this name.'); return; }
            const oldName = b.name;
            const linked = findRosterPersonForBrother(b);
            const target = people.find(p => normalizeBrotherName(personName(p)) === normalizeBrotherName(newName));
            let msg;
            if (linked) {
                // naka-link sa Roster: palitan din doon para hindi madoble sa susunod na sync
                const words = newName.split(' ');
                const keepLast = normalizeBrotherName(newName).endsWith(' ' + normalizeBrotherName(linked.last));
                const last = keepLast ? newName.slice(newName.length - linked.last.length) : words[words.length - 1];
                const first = newName.slice(0, newName.length - last.length).trim();
                if (!first) { alert('Enter both a first name and a last name.'); return; }
                if (target && target.id !== linked.id) { alert(`"${newName}" is already someone else in the Roster.`); return; }
                if (!confirm(`Rename ${oldName} → ${newName}?\n\nHe is also in the Students-tab Roster, so it changes there too:\nFirst name: ${first}\nLast name: ${last}\n\nHis assignments stay. Update the Masterlist file as well.`)) return;
                const r = applyPersonRename(linked, first, last);
                if (!r.grid) b.name = newName;
                msg = `Renamed ${oldName} → ${newName} in the Assignments grid and the Roster.` + (r.parts ? `\n${r.parts} schedule name(s) updated.` : '') +
                    `\n\nUpdate the Masterlist file too, or the next import will treat him as a new person.`;
            } else {
                b.name = newName;
                msg = `Renamed ${oldName} → ${newName}. His assignments stay.` +
                    (target ? `\n\n✓ Now matches ${personLabel(target)} in the Roster — his Students-tab parts are counted for spacing and fairness.`
                            : `\n\n⚠ Still no one in the Roster with this name.`);
            }
            editingBrotherId = null;
            syncBrothersFromPeople();
            refreshBrotherCategories();
            saveData();
            render();
            renderAssignmentSelectionModal();
            alert(msg + `\nRe-export the S-140 if this name was already printed.`);
        }


        // ==================== v27: S-140 PDF (same layout as the Word S-140) ====================
        // Ginagawa muna ang parehong Word XML (iisang pinagmumulan ng layout), saka ito iginuguhit bilang PDF.
        // Mga font: Carlito (kapareho ng sukat ng Calibri) at Caladea Bold (kapareho ng Cambria) — naka-vendor sa lib/.
        const S140_PDF = { pageW: 612, pageH: 792, top: 21.6, marginL: 36, bodyBottom: 743.78, cellPad: 5.4, footerBase: 38.69 };
        const S140_PDF_LIBS = ['lib/fontkit.umd.min.js', 'lib/s140-fonts.js'];
        function loadScriptOnce(src) {
            return new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = src;
                s.onload = () => resolve();
                s.onerror = () => reject(new Error('Could not load ' + src + '. Please refresh the page.'));
                document.head.appendChild(s);
            });
        }
        async function ensureS140PdfLibs() {
            if (typeof PDFLib === 'undefined') throw new Error('The PDF library (lib/pdf-lib.min.js) did not load. Please refresh the page.');
            if (typeof fontkit === 'undefined') await loadScriptOnce(S140_PDF_LIBS[0]);
            if (typeof S140_FONT_REG === 'undefined') await loadScriptOnce(S140_PDF_LIBS[1]);
        }
        function s140XmlUnesc(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'); }
        // Maliit na parser para sa XML na ginawa mismo ng app (wTable/wRow/wCell/wPara/wRun/wSpacer/wPageBreak)
        function s140ParseBody(xml) {
            const attr = (a, n) => { const m = a.match(new RegExp('w:' + n + '="([^"]*)"')); return m ? m[1] : null; };
            const body = [];
            let tbl = null, tr = null, tc = null, p = null, r = null;
            let inPPr = false, inTcBorders = false, inTblBorders = false, inTcPr = false, inT = false;
            const re = /<(\/?)w:(\w+)([^>]*?)(\/?)>|([^<]+)/g;
            let m;
            while ((m = re.exec(xml))) {
                if (m[5] !== undefined) { if (inT && r) r.text += s140XmlUnesc(m[5]); continue; }
                const close = m[1] === '/', tag = m[2], a = m[3] || '', self = m[4] === '/';
                if (close) {
                    if (tag === 'tbl') { body.push(tbl); tbl = null; }
                    else if (tag === 'tr') { tbl.rows.push(tr); tr = null; }
                    else if (tag === 'tc') { tr.cells.push(tc); tc = null; }
                    else if (tag === 'p') { (tc ? tc.paras : body).push(p); p = null; }
                    else if (tag === 'r') { if (p && r) p.runs.push(r); r = null; }
                    else if (tag === 'pPr') inPPr = false;
                    else if (tag === 't') inT = false;
                    else if (tag === 'tcBorders') inTcBorders = false;
                    else if (tag === 'tblBorders') inTblBorders = false;
                    else if (tag === 'tcPr') inTcPr = false;
                    continue;
                }
                switch (tag) {
                    case 'tbl': tbl = { kind: 'tbl', grid: [], rows: [] }; break;
                    case 'tblBorders': inTblBorders = !self; break;
                    case 'gridCol': if (tbl) tbl.grid.push(+attr(a, 'w')); break;
                    case 'tr': tr = { minH: 0, cells: [] }; break;
                    case 'trHeight': if (tr) tr.minH = +attr(a, 'val'); break;
                    case 'tc': tc = { span: 1, fill: null, bottom: null, valign: 'top', paras: [] }; break;
                    case 'tcPr': inTcPr = !self; break;
                    case 'gridSpan': if (tc) tc.span = +attr(a, 'val'); break;
                    case 'tcBorders': inTcBorders = !self; break;
                    case 'bottom': {
                        const v = attr(a, 'val');
                        if (v && v !== 'nil' && inTcBorders && tc) tc.bottom = { val: v, sz: +(attr(a, 'sz') || 4), color: attr(a, 'color') || '000000' };
                        break;
                    }
                    case 'shd': if (tc && inTcPr) tc.fill = attr(a, 'fill'); break;
                    case 'vAlign': if (tc) tc.valign = attr(a, 'val') || 'top'; break;
                    case 'p': p = { kind: 'p', runs: [], before: 0, after: tc ? 0 : 200, line: tc ? 240 : 276, jc: 'left', markSz: 22, pageBreak: false }; break;
                    case 'pPr': inPPr = !self; break;
                    case 'spacing': if (p) {
                        const bf = attr(a, 'before'), af = attr(a, 'after'), ln = attr(a, 'line');
                        if (bf !== null) p.before = +bf; if (af !== null) p.after = +af; if (ln !== null) p.line = +ln;
                    } break;
                    case 'jc': if (p) p.jc = attr(a, 'val') || 'left'; break;
                    case 'sz': { const v = +attr(a, 'val'); if (r) r.sz = v; else if (p && inPPr) p.markSz = v; break; }
                    case 'b': if (r) r.b = true; break;
                    case 'color': if (r) r.color = attr(a, 'val'); break;
                    case 'rFonts': if (r && /major/.test(a)) r.major = true; break;
                    case 'r': r = { text: '', sz: 22, b: false, color: null, major: false }; break;
                    case 't': inT = !self; break;
                    case 'br': if (p && attr(a, 'type') === 'page') p.pageBreak = true; break;
                }
            }
            return body;
        }
        function s140Rgb(hex) {
            const n = parseInt(hex || '000000', 16);
            return PDFLib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
        }
        // Hatiin ang talata sa mga linya ayon sa lapad (pt)
        function s140LayoutPara(F, p, widthPt) {
            const toks = [];
            p.runs.forEach(r => {
                const size = r.sz / 2, font = r.major ? F.title : (r.b ? F.bold : F.reg);
                const lh = size * (r.major ? 1.15 : 1.222), asc = size * (r.major ? 0.90 : 0.953);
                r.text.split(/(\s+)/).forEach(w => {
                    if (!w) return;
                    const ws = /^\s+$/.test(w);
                    const width = ws ? [...w].reduce((s, ch) => s + (ch === '\u2002' ? size * 0.5 : font.widthOfTextAtSize(' ', size)), 0)
                        : font.widthOfTextAtSize(w, size);
                    toks.push({ w, ws, width, size, font, color: r.color, lh, asc });
                });
            });
            // v29: maayos na paghahati ng mahabang linya —
            // (a) laging magkasama ang "(10 min.)" at ang salitang nauuna rito (hal. "Nangyari (10 min.)"), kaya hindi "min.)" lang ang maiiwan;
            // (b) kapag 2+ linya, pantay-pantay ang haba ng mga linya (parehong bilang ng linya, kaya hindi nagbabago ang taas/espasyo).
            const nextWord = i => { for (let k = i + 1; k < toks.length; k++) if (!toks[k].ws) return toks[k].w; return ''; };
            toks.forEach((t, i) => { if (t.ws) { const nw = nextWord(i); t.glue = /^\(\d+$/.test(nw) || /^min\.\)$/.test(nw); } });
            const units = [];
            let u = null, gap = [];
            toks.forEach(t => {
                if (t.ws && !t.glue) { if (u) { units.push(u); u = null; } gap.push(t); return; }
                if (!u) { u = { toks: [], width: 0, gap }; gap = []; }
                u.toks.push(t); u.width += t.width;
            });
            if (u) units.push(u);
            const wrap = W => {
                const out = [];
                let cur = null;
                units.forEach(un => {
                    const gw = un.gap.reduce((s, g) => s + g.width, 0);
                    if (cur && cur.width + gw + un.width > W + 0.01) { out.push(cur); cur = null; }
                    if (!cur) cur = { toks: [...un.toks], width: un.width };
                    else { cur.toks.push(...un.gap, ...un.toks); cur.width += gw + un.width; }
                });
                if (cur) out.push(cur);
                return out;
            };
            let lines = wrap(widthPt);
            if (lines.length > 1) {
                const k = lines.length;
                let lo = Math.max(0, ...units.map(x => x.width)), hi = widthPt;
                for (let it = 0; it < 24 && hi - lo > 0.25; it++) {
                    const mid = (lo + hi) / 2;
                    if (wrap(mid).length <= k) hi = mid; else lo = mid;
                }
                const bal = wrap(hi);
                if (bal.length === k) lines = bal;
            }
            if (!lines.length) lines = [{ toks: [], width: 0 }];
            const mark = p.markSz / 2, factor = (p.line || 240) / 240;
            lines.forEach(l => {
                l.h = (l.toks.length ? Math.max(...l.toks.map(t => t.lh)) : mark * 1.222) * factor;
                l.asc = l.toks.length ? Math.max(...l.toks.map(t => t.asc)) : mark * 0.953;
            });
            return { lines, h: p.before / 20 + lines.reduce((s, l) => s + l.h, 0) + p.after / 20 };
        }
        function s140DrawPara(page, lay, p, x, w, top) {
            let y = top + p.before / 20;
            lay.lines.forEach(l => {
                let cx = p.jc === 'right' ? x + w - S140_PDF.cellPad - l.width : p.jc === 'center' ? x + (w - l.width) / 2 : x + S140_PDF.cellPad;
                const base = S140_PDF.pageH - (y + l.asc);
                // pagsamahin ang magkakasunod na salita (kasama ang espasyo) para tama ang copy/search ng teksto sa PDF
                let seg = null;
                const flush = () => {
                    if (seg && seg.text.trim()) page.drawText(seg.text, { x: seg.x, y: base, size: seg.size, font: seg.font, color: s140Rgb(seg.color || '000000') });
                    seg = null;
                };
                l.toks.forEach(t => {
                    const special = t.ws && /[^ ]/.test(t.w); // hal. en space — hindi iginuguhit, lapad lang
                    if (special) { flush(); cx += t.width; return; }
                    if (seg && (seg.font !== t.font || seg.size !== t.size || seg.color !== t.color)) flush();
                    if (!seg) { if (t.ws) { cx += t.width; return; } seg = { text: '', x: cx, size: t.size, font: t.font, color: t.color }; }
                    seg.text += t.w; cx += t.width;
                });
                flush();
                y += l.h;
            });
        }
        // Ilatag (at iguhit kung may doc) ang buong body. Ibinabalik ang taas ng bawat pahina.
        function s140RenderBody(F, body, doc) {
            const P = S140_PDF, used = [];
            let page = null, y = 0;
            const newPage = () => {
                if (page !== null || used.length) used.push(y - P.top);
                page = doc ? doc.addPage([P.pageW, P.pageH]) : false;
                if (doc) page.drawText('S-140-TG  11/23', { x: P.marginL, y: P.footerBase, size: 10, font: F.reg, color: s140Rgb('000000') });
                y = P.top;
            };
            newPage();
            const tableLeft = P.marginL - P.cellPad;
            body.forEach(el => {
                if (el.kind === 'p') {
                    if (el.pageBreak) { newPage(); return; }
                    y += s140LayoutPara(F, el, 540).h;
                    return;
                }
                const colX = [tableLeft]; el.grid.forEach(g => colX.push(colX[colX.length - 1] + g / 20));
                el.rows.forEach(row => {
                    let col = 0;
                    const cells = row.cells.map(c => {
                        const x = colX[col], w = colX[col + c.span] - colX[col]; col += c.span;
                        const lays = c.paras.map(p => s140LayoutPara(F, p, w - 2 * P.cellPad));
                        const borderW = c.bottom ? (c.bottom.val === 'thinThickSmallGap' ? 3.0 : c.bottom.sz / 8) : 0;
                        return { c, x, w, lays, h: lays.reduce((s, l) => s + l.h, 0), borderW };
                    });
                    const borderW = Math.max(0, ...cells.map(k => k.borderW));
                    const rowH = Math.max(row.minH / 20, ...cells.map(k => k.h)) + borderW;
                    if (y + rowH > P.bodyBottom + 0.01 && y > P.top + 1) newPage();
                    if (doc) cells.forEach(k => {
                        const bottomY = P.pageH - (y + rowH);
                        if (k.c.fill) page.drawRectangle({ x: k.x, y: bottomY + borderW, width: k.w, height: rowH - borderW, color: s140Rgb(k.c.fill) });
                        const inner = rowH - borderW;
                        let top = y + (k.c.valign === 'center' ? (inner - k.h) / 2 : k.c.valign === 'bottom' ? inner - k.h : 0);
                        k.c.paras.forEach((p, i) => { s140DrawPara(page, k.lays[i], p, k.x, k.w, top); top += k.lays[i].h; });
                        if (k.c.bottom) {
                            const col = s140Rgb(k.c.bottom.color);
                            if (k.c.bottom.val === 'thinThickSmallGap') {
                                page.drawRectangle({ x: k.x, y: bottomY + 2.25, width: k.w, height: 0.6, color: col });
                                page.drawRectangle({ x: k.x, y: bottomY, width: k.w, height: 1.5, color: col });
                            } else page.drawRectangle({ x: k.x, y: bottomY, width: k.w, height: Math.max(0.5, k.c.bottom.sz / 8), color: col });
                        }
                    });
                    y += rowH;
                });
            });
            used.push(y - P.top);
            return used;
        }
        // (buong font ang naka-embed — mas sigurado ang tamang pagpapakita sa lahat ng PDF viewer; ~650 KB bawat PDF)
        async function s140PdfFonts(doc) {
            doc.registerFontkit(fontkit);
            return {
                reg: await doc.embedFont(S140_FONT_REG, { subset: false, features: { liga: false, clig: false, dlig: false, calt: false } }),
                bold: await doc.embedFont(S140_FONT_BOLD, { subset: false, features: { liga: false, clig: false, dlig: false, calt: false } }),
                title: await doc.embedFont(S140_FONT_TITLE, { subset: false, features: { liga: false, clig: false, dlig: false, calt: false } })
            };
        }
        async function buildS140Pdf(year, month) {
            await ensureS140PdfLibs();
            const thursdays = getThursdaysForMonthByWeekStart(year, month);
            const doc = await PDFLib.PDFDocument.create();
            const F = await s140PdfFonts(doc);
            const avail = S140_PDF.bodyBottom - S140_PDF.top;
            // Parehong luwag ng Word; kung hindi kasya sa aktuwal na sukat ng font, unti-unting liliitan
            let xml = buildS140BodyXml(thursdays), body = s140ParseBody(xml);
            const fitsPages = b => { const u = s140RenderBody(F, b, null); return u.length === Math.ceil(thursdays.length / 2) && u.every(h => h <= avail); };
            if (!fitsPages(body)) {
                const firstRow = (xml.match(/w:trHeight w:val="(\d+)"/) || [])[1];
                for (let k = 20; k >= 0; k--) {
                    const sp = s140Lerp(k / 20);
                    if (firstRow && sp.row >= +firstRow) continue;
                    const b2 = s140ParseBody(buildS140BodyXml(thursdays, sp));
                    body = b2;
                    if (fitsPages(b2)) break;
                }
            }
            s140RenderBody(F, body, doc);
            const mName = TG_MONTHS[month];
            doc.setTitle(`S-140 ${mName} ${year} — Iskedyul ng Pulong sa Gitnang Sanlinggo`);
            doc.setCreator('Assignment Tracker');
            return await doc.save();
        }

        // Initialize on load
        init();
