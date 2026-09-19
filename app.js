// ===== DATABASE (localStorage) =====
var DB = {
_get: function(key) {
try { return JSON.parse(localStorage.getItem('mh_' + key)) || []; }
catch(e) { return []; }
},
_set: function(key, val) {
try { localStorage.setItem('mh_' + key, JSON.stringify(val)); } catch(e) {}
},
getAll: function(store) { return this._get(store); },
get: function(store, id) { return this._get(store).find(function(x) { return x.id === id; }) || null; },
put: function(store, item) {
var arr = this._get(store);
var idx = -1;
for (var i = 0; i < arr.length; i++) { if (arr[i].id === item.id) { idx = i; break; } }
if (idx >= 0) arr[idx] = item; else arr.push(item);
this._set(store, arr);
},
del: function(store, id) {
var arr = this._get(store).filter(function(x) { return x.id !== id; });
this._set(store, arr);
},
clear: function(store) { this._set(store, []); },
getSetting: function(key) {
try { var s = JSON.parse(localStorage.getItem('mh_settings')) || {}; return s[key] || 0; }
catch(e) { return 0; }
},
setSetting: function(key, val) {
try { var s = JSON.parse(localStorage.getItem('mh_settings')) || {}; s[key] = val; localStorage.setItem('mh_settings', JSON.stringify(s)); }
catch(e) {}
}
};
function gid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }
// ===== STATE =====
var currentPage = 'dashboard';
var viewMonth = new Date();
var contactFilter = 'all';
var selectedId = null;
var mapObj = null;
var mapMarkers = [];
var swInt = null;
var swOn = false;
var swSec = 0;
var logMode = 'monthly';
var settings = { goalHours: 0, goalStudies: 0 };
// ===== NAV =====
function showPage(p) {
currentPage = p;
document.querySelectorAll('.page').forEach(function(x) { x.classList.remove('active'); });
document.querySelectorAll('.nav-item').forEach(function(x) { x.classList.remove('active'); });
var pm = { dashboard:'pageDashboard', time:'pageTime', contacts:'pageContacts', detail:'pageDetail', map:'pageMap', reports:'pageReports', settings:'pageSettings' };
var el = document.getElementById(pm[p]); if (el) el.classList.add('active');
var ni = { dashboard:0, time:1, contacts:2, map:3, reports:4, settings:5 };
var idx = ni[p] !== undefined ? ni[p] : ni.contacts;
var navItems = document.querySelectorAll('.nav-item');
if (navItems[idx]) navItems[idx].classList.add('active');
var fab = document.getElementById('fabAdd');
if (p === 'contacts') fab.classList.remove('hidden');
else fab.classList.add('hidden');
document.querySelector('.page-container').scrollTop = 0;
if (p === 'dashboard') renderDashboard();
if (p === 'contacts') renderContacts();
if (p === 'map') setTimeout(function() { initMap(); }, 150);
if (p === 'reports') renderReports();
if (p === 'settings') loadSettingsUI();
}
function changeMonth(d) { viewMonth.setMonth(viewMonth.getMonth() + d); renderDashboard(); }
function getMK(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function fmtMonth(d) { return d.toLocaleString('en-US', { month:'long', year:'numeric' }); }
// ===== DASHBOARD =====
function renderDashboard() {
document.getElementById('dashMonthLabel').textContent = fmtMonth(viewMonth);
var mk = getMK(viewMonth);
var entries = DB.getAll('timeEntries');
var contacts = DB.getAll('contacts');
var visits = DB.getAll('visits');
var me = entries.filter(function(e) { return e.month === mk; });
var totalMins = me.reduce(function(s, e) { return s + (e.hours * 60 + e.minutes); }, 0);
var hrs = (totalMins / 60).toFixed(1);
var bsC = contacts.filter(function(c) { return c.type === 'bs'; }).length;
var rvC = contacts.filter(function(c) { return c.type === 'rv'; }).length;
var mv = visits.filter(function(v) { return v.date && v.date.startsWith(mk); });
document.getElementById('dashStats').innerHTML =
'<div class="stat-card featured"><div class="stat-icon"><i class="fas fa-clock"></i></div><div class="stat-value">' + hrs + '</div><div class="stat-label">Hours</div></div>' +
'<div class="stat-card"><div class="stat-icon"><i class="fas fa-book-reader"></i></div><div class="stat-value">' + bsC + '</div><div class="stat-label">Bible Studies</div></div>' +
'<div class="stat-card"><div class="stat-icon"><i class="fas fa-redo"></i></div><div class="stat-value">' + rvC + '</div><div class="stat-label">Return Visits</div></div>' +
'<div class="stat-card"><div class="stat-icon"><i class="fas fa-clipboard-check"></i></div><div class="stat-value">' + mv.length + '</div><div class="stat-label">Visits Made</div></div>';
if (settings.goalHours > 0) {
document.getElementById('goalSection').classList.remove('hidden');
var pct = Math.min(100, (parseFloat(hrs) / settings.goalHours) * 100);
var circumference = 2 * Math.PI * 52;
var offset = circumference - (pct / 100) * circumference;
document.getElementById('goalRing').style.strokeDashoffset = offset;
document.getElementById('goalPct').textContent = Math.round(pct) + '%';
document.getElementById('goalDetail').textContent = hrs + ' / ' + settings.goalHours + ' hrs';
} else {
document.getElementById('goalSection').classList.add('hidden');
}
renderCalendar();
var today = new Date().toISOString().split('T')[0];
var upcoming = contacts.filter(function(c) { return c.nextVisit && c.nextVisit >= today; })
.sort(function(a, b) { return a.nextVisit.localeCompare(b.nextVisit); }).slice(0, 5);
if (!upcoming.length) {
document.getElementById('upcomingList').innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No upcoming visits scheduled</p></div>';
} else {
document.getElementById('upcomingList').innerHTML = upcoming.map(function(c) {
var d = new Date(c.nextVisit + 'T00:00:00');
return '<div class="upcoming-item" onclick="viewContact(\'' + c.id + '\')">' +
'<div class="upcoming-date-box"><div class="upcoming-day">' + d.getDate() + '</div><div class="upcoming-month">' + d.toLocaleString('en-US',{month:'short'}) + '</div></div>' +
'<div class="upcoming-info"><div class="upcoming-name">' + c.name + '</div><div class="upcoming-detail">' + (c.type === 'bs' ? 'Bible Study' : 'Return Visit') + ' — ' + (c.address || 'No address') + '</div></div>' +
'<span class="badge ' + c.type + '">' + c.type.toUpperCase() + '</span></div>';
}).join('');
}
}
// ===== TIME TRACKER =====
function switchTimeTab(t, el) {
document.querySelectorAll('#timeTabs .tab').forEach(function(x) { x.classList.remove('active'); });
el.classList.add('active');
var sections = { entry: 'timeEntry', stopwatch: 'timeStopwatch', log: 'timeLog' };
Object.keys(sections).forEach(function(key) {
var el = document.getElementById(sections[key]);
if (key === t) el.classList.remove('hidden');
else el.classList.add('hidden');
});
if (t === 'log') renderTimeLog();
}
function saveTimeEntry() {
var date = document.getElementById('timeDate').value;
var h = parseInt(document.getElementById('timeHours').value) || 0;
var m = parseInt(document.getElementById('timeMins').value) || 0;
var notes = document.getElementById('timeNotes').value;
if (!date) { alert('Please select a date.'); return; }
if (h === 0 && m === 0) { alert('Please enter time.'); return; }
DB.put('timeEntries', { id: gid(), date: date, month: date.substring(0, 7), hours: h, minutes: m, notes: notes, created: new Date().toISOString() });
document.getElementById('timeHours').value = 0;
document.getElementById('timeMins').value = 0;
document.getElementById('timeNotes').value = '';
alert('Time entry saved!');
}
// Stopwatch
function toggleSW() {
if (swOn) {
clearInterval(swInt); swOn = false;
document.getElementById('swToggle').className = 'sw-btn start';
document.getElementById('swToggle').innerHTML = '<i class="fas fa-play"></i>';
document.getElementById('swSave').classList.remove('hidden');
} else {
swOn = true;
swInt = setInterval(function() { swSec++; updSW(); }, 1000);
document.getElementById('swToggle').className = 'sw-btn pause';
document.getElementById('swToggle').innerHTML = '<i class="fas fa-pause"></i>';
document.getElementById('swSave').classList.add('hidden');
}
}
function resetSW() {
clearInterval(swInt); swOn = false; swSec = 0; updSW();
document.getElementById('swToggle').className = 'sw-btn start';
document.getElementById('swToggle').innerHTML = '<i class="fas fa-play"></i>';
document.getElementById('swSave').classList.add('hidden');
}
function updSW() {
var h = Math.floor(swSec / 3600), m = Math.floor((swSec % 3600) / 60), s = swSec % 60;
document.getElementById('swDisplay').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
function saveSW() {
if (swSec < 60) { alert('Min 1 minute.'); return; }
var h = Math.floor(swSec / 3600), m = Math.floor((swSec % 3600) / 60);
var date = new Date().toISOString().split('T')[0];
DB.put('timeEntries', { id: gid(), date: date, month: date.substring(0, 7), hours: h, minutes: m, notes: 'Stopwatch', created: new Date().toISOString() });
alert('Saved! (' + h + 'h ' + m + 'm)');
resetSW();
}
// Time Log
function switchLogView(v, el) {
logMode = v;
document.querySelectorAll('#logTabs .tab').forEach(function(x) { x.classList.remove('active'); });
el.classList.add('active');
renderTimeLog();
}
function renderTimeLog() {
var entries = DB.getAll('timeEntries');
var c = document.getElementById('timeLogContent');
if (logMode === 'monthly') {
var mk = getMK(viewMonth);
var me = entries.filter(function(e) { return e.month === mk; }).sort(function(a, b) { return b.date.localeCompare(a.date); });
var tm = me.reduce(function(s, e) { return s + (e.hours * 60 + e.minutes); }, 0);
if (!me.length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i><p>No entries this month</p></div>'; return; }
c.innerHTML = '<div class="card log-summary"><div class="log-summary-label">' + fmtMonth(viewMonth) + '</div><div class="log-summary-value">' + (tm / 60).toFixed(1) + 'h</div></div>' +
me.map(function(e) { return '<div class="card log-entry"><div class="log-entry-main"><div class="log-entry-date">' + e.date + '</div><div class="log-entry-detail">' + (e.notes || 'Ministry hours') + '</div></div><div class="log-entry-right"><span class="log-entry-hours">' + e.hours + 'h ' + e.minutes + 'm</span><button class="log-del-btn" onclick="deleteTimeEntry(\'' + e.id + '\')"><i class="fas fa-trash"></i></button></div></div>'; }).join('');
} else {
var bm = {};
entries.forEach(function(e) { if (!bm[e.month]) bm[e.month] = 0; bm[e.month] += e.hours * 60 + e.minutes; });
var months = Object.keys(bm).sort();
var cum = 0;
if (!months.length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i><p>No entries yet</p></div>'; return; }
var total = entries.reduce(function(s, e) { return s + e.hours * 60 + e.minutes; }, 0);
c.innerHTML = '<div class="card log-summary"><div class="log-summary-label">CUMULATIVE TOTAL</div><div class="log-summary-value">' + (total / 60).toFixed(1) + 'h</div></div>' +
months.map(function(m) {
cum += bm[m]; var d = new Date(m + '-01');
return '<div class="card log-entry"><div class="log-entry-date">' + d.toLocaleString('en-US',{month:'long',year:'numeric'}) + '</div><div><span class="log-entry-hours">' + (bm[m] / 60).toFixed(1) + 'h</span><span class="log-entry-cum">cum: ' + (cum / 60).toFixed(1) + 'h</span></div></div>';
}).join('');
}
}
// ===== CONTACTS =====
function renderContacts() {
var contacts = DB.getAll('contacts');
var q = (document.getElementById('contactSearch').value || '').toLowerCase();
var f = contacts.filter(function(c) {
if (contactFilter !== 'all' && c.type !== contactFilter) return false;
if (q && c.name.toLowerCase().indexOf(q) < 0 && (c.address || '').toLowerCase().indexOf(q) < 0) return false;
return true;
}).sort(function(a, b) { return a.name.localeCompare(b.name); });
var list = document.getElementById('contactList');
if (!f.length) { list.innerHTML = '<div class="empty-state"><i class="fas fa-user-plus"></i><p>No contacts yet. Tap + to add!</p></div>'; return; }
list.innerHTML = f.map(function(c) {
return '<div class="contact-item" onclick="viewContact(\'' + c.id + '\')">' +
'<div class="contact-avatar ' + c.type + '">' + c.name.charAt(0).toUpperCase() + '</div>' +
'<div class="contact-info"><div class="contact-name">' + c.name + '</div><div class="contact-detail">' + (c.address || 'No address') + (c.nextVisit ? ' — Next: ' + c.nextVisit : '') + '</div></div>' +
'<span class="badge ' + c.type + '">' + c.type.toUpperCase() + '</span></div>';
}).join('');
}
function filterContacts(t, el) {
contactFilter = t;
document.querySelectorAll('.filter-row .chip').forEach(function(c) { c.classList.remove('active'); });
el.classList.add('active');
renderContacts();
}
function openAddContact() {
document.getElementById('contactModalTitle').textContent = 'Add Contact';
document.getElementById('editContactId').value = '';
document.getElementById('cName').value = '';
document.getElementById('cType').value = 'bs';
document.getElementById('cAddress').value = '';
document.getElementById('cNotes').value = '';
document.getElementById('cNextVisit').value = '';
document.getElementById('cLat').value = '';
document.getElementById('cLng').value = '';
destroyPickerMap();
openModal('contactModal');
}
function saveContact() {
var name = document.getElementById('cName').value.trim();
if (!name) { alert('Enter a name.'); return; }
var id = document.getElementById('editContactId').value || gid();
var existing = DB.get('contacts', id);
var contact = {
id: id, name: name, type: document.getElementById('cType').value,
address: document.getElementById('cAddress').value.trim(),
notes: document.getElementById('cNotes').value.trim(),
nextVisit: document.getElementById('cNextVisit').value,
lat: parseFloat(document.getElementById('cLat').value) || null,
lng: parseFloat(document.getElementById('cLng').value) || null,
created: existing ? existing.created : new Date().toISOString(),
updated: new Date().toISOString()
};
DB.put('contacts', contact);
closeModal('contactModal');
if (currentPage === 'detail') viewContact(id); else renderContacts();
}
function viewContact(id) {
selectedId = id;
var c = DB.get('contacts', id); if (!c) return;
document.getElementById('detailName').textContent = c.name;
document.getElementById('detailType').textContent = c.type === 'bs' ? 'Bible Study' : 'Return Visit';
document.getElementById('detailInfo').innerHTML = '<div class="info-grid">' +
'<div><span class="info-label">Address</span><div class="info-value">' + (c.address || '—') + '</div></div>' +
'<div><span class="info-label">Notes</span><div class="info-value">' + (c.notes || '—') + '</div></div>' +
'<div><span class="info-label">Next Visit</span><div class="info-value">' + (c.nextVisit || 'Not scheduled') + '</div></div>' +
(c.lat ? '<div><span class="info-label">Location</span><div class="info-value">' + c.lat.toFixed(5) + ', ' + c.lng.toFixed(5) + '</div></div>' : '') +
'</div>';
var visits = DB.getAll('visits').filter(function(v) { return v.contactId === id; }).sort(function(a, b) { return b.date.localeCompare(a.date); });
document.getElementById('detailVisits').innerHTML = !visits.length ?
'<div class="empty-state"><i class="fas fa-history"></i><p>No visit logs yet</p></div>' :
visits.map(function(v) { return '<div class="visit-item"><div class="visit-date">' + v.date + '</div><div class="visit-notes">' + (v.notes || 'No notes') + '</div></div>'; }).join('');
showPage('detail');
}
function editContact() {
var c = DB.get('contacts', selectedId); if (!c) return;
document.getElementById('contactModalTitle').textContent = 'Edit Contact';
document.getElementById('editContactId').value = c.id;
document.getElementById('cName').value = c.name;
document.getElementById('cType').value = c.type;
document.getElementById('cAddress').value = c.address || '';
document.getElementById('cNotes').value = c.notes || '';
document.getElementById('cNextVisit').value = c.nextVisit || '';
document.getElementById('cLat').value = c.lat || '';
document.getElementById('cLng').value = c.lng || '';
destroyPickerMap();
openModal('contactModal');
}
function deleteContact() {
if (!confirm('Delete this contact and all visit logs?')) return;
var v = DB.getAll('visits').filter(function(x) { return x.contactId === selectedId; });
v.forEach(function(x) { DB.del('visits', x.id); });
DB.del('contacts', selectedId);
showPage('contacts');
}
function addVisitLog() {
document.getElementById('vDate').value = new Date().toISOString().split('T')[0];
document.getElementById('vNotes').value = '';
document.getElementById('vNextVisit').value = '';
openModal('visitModal');
}
function saveVisitLog() {
var date = document.getElementById('vDate').value;
if (!date) { alert('Select a date.'); return; }
DB.put('visits', { id: gid(), contactId: selectedId, date: date, notes: document.getElementById('vNotes').value.trim(), created: new Date().toISOString() });
var nv = document.getElementById('vNextVisit').value;
if (nv) {
var c = DB.get('contacts', selectedId);
if (c) { c.nextVisit = nv; DB.put('contacts', c); }
}
closeModal('visitModal');
viewContact(selectedId);
}
// ===== MAP =====
function initMap() {
var contacts = DB.getAll('contacts');
var wl = contacts.filter(function(c) { return c.lat && c.lng; });
if (!mapObj) {
var center = wl.length > 0 ? [wl[0].lat, wl[0].lng] : [14.6091, 121.0223];
mapObj = L.map('mapContainer').setView(center, 13);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri', maxZoom: 19 }).addTo(mapObj);
}
mapMarkers.forEach(function(m) { mapObj.removeLayer(m); });
mapMarkers = [];
wl.forEach(function(c) {
var col = c.type === 'bs' ? '#6C5CE7' : '#00CEC9';
var icon = L.divIcon({
className: '',
html: '<div style="width:28px;height:28px;border-radius:50%;background:' + col + ';display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid white;">' + c.name.charAt(0) + '</div>',
iconSize: [28, 28], iconAnchor: [14, 14]
});
var mk = L.marker([c.lat, c.lng], { icon: icon }).addTo(mapObj);
mk.bindPopup('<b>' + c.name + '</b><br><em>' + (c.type === 'bs' ? 'Bible Study' : 'Return Visit') + '</em><br>' + (c.address || ''));
mapMarkers.push(mk);
});
if (wl.length > 1) mapObj.fitBounds(L.latLngBounds(wl.map(function(c) { return [c.lat, c.lng]; })), { padding: [40, 40] });
else if (wl.length === 1) mapObj.setView([wl[0].lat, wl[0].lng], 15);
setTimeout(function() { mapObj.invalidateSize(); }, 200);
document.getElementById('mapContactList').innerHTML = !wl.length ?
'<div class="empty-state"><i class="fas fa-map-pin"></i><p>No contacts with location data.<br>Add GPS when creating contacts.</p></div>' :
'<div class="section-title mt-16"><i class="fas fa-list"></i> Pinned Contacts</div>' +
wl.map(function(c) {
return '<div class="contact-item" onclick="mapObj.setView([' + c.lat + ',' + c.lng + '],16);">' +
'<div class="contact-avatar ' + c.type + '">' + c.name.charAt(0) + '</div>' +
'<div class="contact-info"><div class="contact-name">' + c.name + '</div><div class="contact-detail">' + (c.address || '') + '</div></div>' +
'<span class="badge ' + c.type + '">' + c.type.toUpperCase() + '</span></div>';
}).join('');
}
function getGPS() {
if (!navigator.geolocation) { alert('GPS not supported.'); return; }
navigator.geolocation.getCurrentPosition(
function(p) {
document.getElementById('cLat').value = p.coords.latitude.toFixed(6);
document.getElementById('cLng').value = p.coords.longitude.toFixed(6);
},
function(e) { alert('Could not get location: ' + e.message); },
{ enableHighAccuracy: true }
);
}
// ===== MAP PICKER (in Contact Modal) =====
var pickerMap = null;
var pickerMarker = null;
function destroyPickerMap() {
if (pickerMap) {
pickerMap.remove();
pickerMap = null;
pickerMarker = null;
}
document.getElementById('mapPickerContainer').classList.add('hidden');
}
function toggleMapPicker() {
var container = document.getElementById('mapPickerContainer');
if (container.classList.contains('hidden')) {
container.classList.remove('hidden');
initPickerMap();
} else {
destroyPickerMap();
}
}
function initPickerMap() {
var lat = parseFloat(document.getElementById('cLat').value) || 14.6091;
var lng = parseFloat(document.getElementById('cLng').value) || 121.0223;
pickerMap = L.map('mapPickerContainer').setView([lat, lng], 15);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
attribution: 'Tiles &copy; Esri', maxZoom: 19
}).addTo(pickerMap);
// Add hint overlay
var hint = document.createElement('div');
hint.className = 'map-picker-hint';
hint.textContent = 'Tap to set location pin';
document.getElementById('mapPickerContainer').appendChild(hint);
// If existing coords, place a marker
if (document.getElementById('cLat').value && document.getElementById('cLng').value) {
pickerMarker = L.marker([lat, lng]).addTo(pickerMap);
}
// Click handler
pickerMap.on('click', function(e) {
var latlng = e.latlng;
document.getElementById('cLat').value = latlng.lat.toFixed(6);
document.getElementById('cLng').value = latlng.lng.toFixed(6);
if (pickerMarker) pickerMap.removeLayer(pickerMarker);
pickerMarker = L.marker([latlng.lat, latlng.lng]).addTo(pickerMap);
// Remove hint after first tap
var h = document.querySelector('.map-picker-hint');
if (h) h.remove();
});
setTimeout(function() { pickerMap.invalidateSize(); }, 200);
}
// ===== REPORTS =====
var reportMonth = new Date();
function changeReportMonth(d) { reportMonth.setMonth(reportMonth.getMonth() + d); renderReports(); }
function renderReports() {
document.getElementById('reportMonthLabel').textContent = fmtMonth(reportMonth);
var entries = DB.getAll('timeEntries');
var contacts = DB.getAll('contacts');
var visits = DB.getAll('visits');
var mk = getMK(reportMonth);
var me = entries.filter(function(e) { return e.month === mk; });
var tm = me.reduce(function(s, e) { return s + (e.hours * 60 + e.minutes); }, 0);
var bsC = contacts.filter(function(c) { return c.type === 'bs'; }).length;
var rvC = contacts.filter(function(c) { return c.type === 'rv'; }).length;
var mv = visits.filter(function(v) { return v.date && v.date.startsWith(mk); });
// Report Card
document.getElementById('reportCard').innerHTML =
'<div class="report-card"><div class="report-month">' + fmtMonth(reportMonth) + '</div>' +
'<div class="report-title">Field Service Report</div><div class="report-grid">' +
'<div class="report-stat"><div class="report-stat-value">' + (tm / 60).toFixed(1) + '</div><div class="report-stat-label">Hours</div></div>' +
'<div class="report-stat"><div class="report-stat-value">' + bsC + '</div><div class="report-stat-label">Bible Studies</div></div>' +
'<div class="report-stat"><div class="report-stat-value">' + rvC + '</div><div class="report-stat-label">Return Visits</div></div>' +
'<div class="report-stat"><div class="report-stat-value">' + mv.length + '</div><div class="report-stat-label">Visits Made</div></div>' +
'</div></div>';
// Hours Trend (last 6 months)
var trendMonths = [];
for (var i = 5; i >= 0; i--) {
var d = new Date(reportMonth);
d.setMonth(d.getMonth() - i);
var m = getMK(d);
var mMins = entries.filter(function(e) { return e.month === m; }).reduce(function(s, e) { return s + (e.hours * 60 + e.minutes); }, 0);
trendMonths.push({ label: d.toLocaleString('en-US', { month: 'short' }), hrs: (mMins / 60), current: i === 0 });
}
var maxHrs = Math.max.apply(null, trendMonths.map(function(t) { return t.hrs; })) || 1;
document.getElementById('reportTrend').innerHTML =
'<div class="card"><div class="trend-row">' +
trendMonths.map(function(t) {
var h = Math.max(4, (t.hrs / maxHrs) * 100);
return '<div class="trend-bar-wrap"><div class="trend-value">' + t.hrs.toFixed(1) + '</div><div class="trend-bar' + (t.current ? ' current' : '') + '" style="height:' + h + '%"></div><div class="trend-label">' + t.label + '</div></div>';
}).join('') +
'</div></div>';
// Activity Summary
var totalContacts = contacts.length;
var avgHrsPerDay = me.length > 0 ? (tm / 60 / me.length).toFixed(1) : '0';
document.getElementById('reportActivity').innerHTML =
'<div class="activity-row"><div class="activity-icon hours"><i class="fas fa-clock"></i></div><div class="activity-info"><div class="activity-title">Total Hours</div><div class="activity-sub">' + me.length + ' entries this month</div></div><div class="activity-value">' + (tm / 60).toFixed(1) + 'h</div></div>' +
'<div class="activity-row"><div class="activity-icon studies"><i class="fas fa-book-reader"></i></div><div class="activity-info"><div class="activity-title">Bible Studies</div><div class="activity-sub">Active studies</div></div><div class="activity-value">' + bsC + '</div></div>' +
'<div class="activity-row"><div class="activity-icon visits"><i class="fas fa-redo"></i></div><div class="activity-info"><div class="activity-title">Visits Made</div><div class="activity-sub">This month</div></div><div class="activity-value">' + mv.length + '</div></div>' +
'<div class="activity-row"><div class="activity-icon contacts"><i class="fas fa-users"></i></div><div class="activity-info"><div class="activity-title">Total Contacts</div><div class="activity-sub">BS + RV combined</div></div><div class="activity-value">' + totalContacts + '</div></div>';
// Cumulative - service year (Sep-Aug)
var syY = reportMonth.getMonth() >= 8 ? reportMonth.getFullYear() : reportMonth.getFullYear() - 1;
var cumM = 0;
var syM = [];
for (var d2 = new Date(syY, 8, 1); d2 <= reportMonth; d2.setMonth(d2.getMonth() + 1)) {
var m2 = getMK(d2);
var mm = entries.filter(function(e) { return e.month === m2; }).reduce(function(s, e) { return s + (e.hours * 60 + e.minutes); }, 0);
cumM += mm;
syM.push({ label: new Date(d2).toLocaleString('en-US', { month: 'short', year: 'numeric' }), mins: mm, cum: cumM });
}
document.getElementById('reportCumulative').innerHTML =
'<div class="card cumulative-summary"><div class="cumulative-label">SERVICE YEAR TOTAL</div><div class="cumulative-value">' + (cumM / 60).toFixed(1) + 'h</div><div class="cumulative-since">Since ' + (syM[0] ? syM[0].label : '—') + '</div></div>' +
syM.map(function(m) {
return '<div class="card log-entry"><span class="log-entry-date">' + m.label + '</span><div><span class="log-entry-hours">' + (m.mins / 60).toFixed(1) + 'h</span><span class="log-entry-cum">&rarr; ' + (m.cum / 60).toFixed(1) + 'h</span></div></div>';
}).join('');
}
function deleteTimeEntry(id) {
  if (!confirm('Delete this time entry?')) return;
  DB.del('timeEntries', id);
  renderTimeLog();
  renderDashboard();
}

function planKey(year, month, day) {
  return year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function getPlanFor(dateStr) {
  var plans = DB.getAll('plans');
  for (var i = 0; i < plans.length; i++) { if (plans[i].id === dateStr) return plans[i]; }
  return null;
}

function renderCalendar() {
  var wrap = document.getElementById('calendarWrap');
  var container = document.getElementById('calendarSection');
  if (!wrap || !container) return;
  wrap.classList.remove('hidden');

  var mk = getMK(viewMonth);
  var year = viewMonth.getFullYear(), month = viewMonth.getMonth();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var firstDow = new Date(year, month, 1).getDay();

  // Actual logged minutes per day
  var entries = DB.getAll('timeEntries').filter(function(e) { return e.month === mk; });
  var byDay = {};
  entries.forEach(function(e) { var day = parseInt(e.date.substring(8, 10), 10); byDay[day] = (byDay[day] || 0) + (e.hours * 60 + e.minutes); });

  // Planned hours per day (from plans store, keyed by full date)
  var plans = DB.getAll('plans');
  var planByDay = {};
  plans.forEach(function(p) { if (p.id && p.id.substring(0, 7) === mk) { planByDay[parseInt(p.id.substring(8, 10), 10)] = p.hours; } });

  var totalPlanned = 0, totalLogged = 0;
  var d2;
  for (d2 = 1; d2 <= daysInMonth; d2++) { totalPlanned += (planByDay[d2] || 0); totalLogged += (byDay[d2] || 0) / 60; }

  var html = '<div class="cal-head">';
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function(d) { html += '<div class="cal-dow">' + d + '</div>'; });
  html += '</div><div class="cal-grid">';
  var i;
  for (i = 0; i < firstDow; i++) { html += '<div class="cal-cell empty"></div>'; }
  for (var day = 1; day <= daysInMonth; day++) {
    var mins = byDay[day] || 0;
    var loggedHrs = mins / 60;
    var planned = planByDay[day] || 0;
    var cls = 'cal-cell';
    if (planned > 0) { cls += ' planned'; }
    if (mins > 0) { cls += (planned > 0 && loggedHrs >= planned) ? ' met' : ' partial'; }
    var dateStr = planKey(year, month, day);
    var inner = '<span class="cal-day">' + day + '</span>';
    if (planned > 0) { inner += '<span class="cal-plan">' + planned + 'h</span>'; }
    if (mins > 0) { inner += '<span class="cal-hrs">' + loggedHrs.toFixed(1) + '</span>'; }
    html += '<div class="' + cls + '" onclick="openPlanModal(\'' + dateStr + '\')">' + inner + '</div>';
  }
  html += '</div>';

  // Legend
  html += '<div class="cal-legend"><span class="cal-legend-item"><span class="cal-legend-dot planned"></span>Planned</span>' +
    '<span class="cal-legend-item"><span class="cal-legend-dot met"></span>Goal met</span>' +
    '<span class="cal-legend-item"><span class="cal-legend-dot partial"></span>Partial</span></div>';

  // Planning summary
  html += '<div class="plan-summary">';
  html += '<div class="plan-summary-row"><span class="plan-summary-label"><i class="fas fa-calendar-check"></i> Planned this month</span><span class="plan-summary-val">' + totalPlanned.toFixed(1) + ' hrs</span></div>';
  html += '<div class="plan-summary-row"><span class="plan-summary-label"><i class="fas fa-clock"></i> Logged so far</span><span class="plan-summary-val">' + totalLogged.toFixed(1) + ' hrs</span></div>';
  if (settings.goalHours > 0) {
    var diff = totalPlanned - settings.goalHours;
    html += '<div class="plan-summary-row"><span class="plan-summary-label"><i class="fas fa-bullseye"></i> Monthly goal</span><span class="plan-summary-val">' + settings.goalHours + ' hrs</span></div>';
    html += '<div class="plan-summary-note ' + (diff >= 0 ? 'ok' : 'short') + '">';
    if (diff >= 0) {
      html += '<i class="fas fa-check-circle"></i> Your plan covers the goal (+' + diff.toFixed(1) + ' hrs buffer)';
    } else {
      html += '<i class="fas fa-exclamation-circle"></i> Plan is ' + Math.abs(diff).toFixed(1) + ' hrs short of your goal';
    }
    html += '</div>';
  }
  html += '</div>';

  container.innerHTML = html;
}

// ===== PLAN MODAL =====
var planDate = null;

function openPlanModal(dateStr) {
  planDate = dateStr;
  var plan = getPlanFor(dateStr);
  var d = new Date(dateStr + 'T00:00:00');
  document.getElementById('planModalDate').textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  document.getElementById('planHours').value = plan ? plan.hours : '';
  var actual = DB.getAll('timeEntries').filter(function(e) { return e.date === dateStr; }).reduce(function(s, e) { return s + (e.hours * 60 + e.minutes); }, 0) / 60;
  document.getElementById('planActual').textContent = actual > 0 ? ('Logged: ' + actual.toFixed(1) + ' hrs') : 'No hours logged yet';
  var delBtn = document.getElementById('planDeleteBtn');
  if (plan) delBtn.classList.remove('hidden'); else delBtn.classList.add('hidden');
  openModal('planModal');
}

function savePlan() {
  var hrs = parseFloat(document.getElementById('planHours').value) || 0;
  if (hrs <= 0) { alert('Please enter planned hours (greater than 0).'); return; }
  DB.put('plans', { id: planDate, hours: hrs });
  closeModal('planModal');
  renderCalendar();
}

function deletePlan() {
  if (!planDate) return;
  DB.del('plans', planDate);
  closeModal('planModal');
  renderCalendar();
}

// ===== SETTINGS =====
function loadSettings() {
settings.goalHours = DB.getSetting('goalHours');
settings.goalStudies = DB.getSetting('goalStudies');
}
function loadSettingsUI() {
document.getElementById('goalHours').value = settings.goalHours;
document.getElementById('goalStudies').value = settings.goalStudies;
}
function saveSettings() {
settings.goalHours = parseInt(document.getElementById('goalHours').value) || 0;
settings.goalStudies = parseInt(document.getElementById('goalStudies').value) || 0;
DB.setSetting('goalHours', settings.goalHours);
DB.setSetting('goalStudies', settings.goalStudies);
}
function exportData() {
var d = {
timeEntries: DB.getAll('timeEntries'),
contacts: DB.getAll('contacts'),
visits: DB.getAll('visits'),
plans: DB.getAll('plans'),
settings: { goalHours: settings.goalHours, goalStudies: settings.goalStudies },
exportDate: new Date().toISOString(),
version: '1.0'
};
var b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
var u = URL.createObjectURL(b);
var a = document.createElement('a');
a.href = u; a.download = 'ministry-helper-backup-' + new Date().toISOString().split('T')[0] + '.json';
a.click(); URL.revokeObjectURL(u);
}
function importData(ev) {
var f = ev.target.files[0]; if (!f) return;
var reader = new FileReader();
reader.onload = function(e) {
try {
var d = JSON.parse(e.target.result);
if (!confirm('Replace all current data?')) return;
DB.clear('timeEntries'); DB.clear('contacts'); DB.clear('visits'); DB.clear('plans');
(d.timeEntries || []).forEach(function(x) { DB.put('timeEntries', x); });
(d.plans || []).forEach(function(x) { DB.put('plans', x); });
(d.contacts || []).forEach(function(x) { DB.put('contacts', x); });
(d.visits || []).forEach(function(x) { DB.put('visits', x); });
if (d.settings) {
DB.setSetting('goalHours', d.settings.goalHours || 0);
DB.setSetting('goalStudies', d.settings.goalStudies || 0);
}
loadSettings();
alert('Data imported!');
showPage('dashboard');
} catch(err) { alert('Invalid file.'); }
};
reader.readAsText(f);
ev.target.value = '';
}
function clearAllData() {
if (!confirm('Delete ALL data? Cannot be undone.')) return;
if (!confirm('Really sure?')) return;
DB.clear('timeEntries'); DB.clear('contacts'); DB.clear('visits'); DB.clear('plans');
DB.setSetting('goalHours', 0); DB.setSetting('goalStudies', 0);
settings = { goalHours: 0, goalStudies: 0 };
showPage('dashboard');
alert('All data cleared.');
}
// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) {
document.getElementById(id).classList.remove('active');
if (id === 'contactModal') destroyPickerMap();
}
document.querySelectorAll('.modal-overlay').forEach(function(o) {
o.addEventListener('click', function(e) {
if (e.target === o) {
o.classList.remove('active');
destroyPickerMap();
}
});
});
// ===== INIT =====
function init() {
loadSettings();
document.getElementById('timeDate').value = new Date().toISOString().split('T')[0];
renderDashboard();
}
init();
// ===== SERVICE WORKER REGISTRATION =====
if ('serviceWorker' in navigator) {
navigator.serviceWorker.register('./sw.js')
.catch(function(err) { console.log('SW registration failed:', err); });
}
