
'use strict';
const $ = id => document.getElementById(id);
$('hideStudy').onclick = () => { $('study').hidden = true; $('attempt').hidden = false; $('recallText').focus() };
$('reveal').onclick = () => { if (!$('recallText').value.trim()) { $('recallText').focus(); $('recallText').placeholder = 'Try recalling at least one idea before comparing.'; return } $('answer').hidden = false; $('reveal').hidden = true };
$('actual').onchange = () => { if ($('actual').value === '') return; const predicted = Number($('confidence').value), actual = Number($('actual').value); $('calibration').textContent = actual < predicted ? 'You recalled fewer steps than predicted. That gap is useful feedback: practice the missing ideas, then test yourself later.' : actual > predicted ? 'You recalled more than predicted. Keep checking your confidence against what you can explain independently.' : 'Your prediction matched your self-assessment. Try again after a delay to check whether the ideas stay accessible.' };
$('retry').onclick = () => { $('study').hidden = false; $('attempt').hidden = true; $('answer').hidden = true; $('reveal').hidden = false; $('recallText').value = ''; $('actual').value = ''; $('calibration').textContent = '' };
const today = new Date(); const localISO = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); $('startDate').value = localISO(today);
$('plan').onclick = () => { const topic = $('topic').value.trim(), date = $('startDate').value; if (!topic) { $('topic').focus(); return } if (!date || !$('startDate').checkValidity()) { $('startDate').focus(); return } const start = new Date(date + 'T12:00:00'); if (Number.isNaN(start.getTime())) return; $('planTitle').textContent = 'Review: ' + topic; const list = document.createElement('ul'); list.className = 'schedule';[1, 3, 7, 14].forEach(days => { const d = new Date(start); d.setDate(d.getDate() + days); const li = document.createElement('li'), b = document.createElement('b'), span = document.createElement('span'); b.textContent = d.toLocaleDateString('en', { month: 'short', day: 'numeric' }); span.textContent = 'Day +' + days + ' · Recall → check → correct'; li.append(b, span); list.append(li) }); $('planResult').replaceChildren(list) };
let remaining = 1500, deadline = 0, interval = null;
function draw() { const mins = Math.floor(remaining / 60), secs = remaining % 60; $('clock').textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') }
function pause() { clearInterval(interval); interval = null; $('timerToggle').textContent = 'Resume'; $('mode').disabled = false }
function tick() { remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); draw(); if (!remaining) { pause(); $('timerToggle').textContent = 'Start again'; $('timerStatus').textContent = $('mode').value === '25' ? 'Session complete. Recall one thing you learned, then select a break.' : 'Break complete. Choose a small task for your next focus session.' } }
$('timerToggle').onclick = () => { if (interval) { tick(); pause(); $('timerStatus').textContent = 'Paused. Resume when ready.'; return } if (!remaining) remaining = Number($('mode').value) * 60; deadline = Date.now() + remaining * 1000; interval = setInterval(tick, 250); $('mode').disabled = true; $('timerToggle').textContent = 'Pause'; $('timerStatus').textContent = $('mode').value === '25' ? 'Focus session running. Work on your chosen task.' : 'Break running. Step away and return when ready.' };
function resetTimer() { pause(); remaining = Number($('mode').value) * 60; draw(); $('timerToggle').textContent = 'Start'; $('timerStatus').textContent = 'Ready when you are. Keep this page open.' } $('timerReset').onclick = resetTimer; $('mode').onchange = resetTimer;
const scenarios = [{ q: 'You have worked carefully on a bug for 30 minutes and keep repeating the same failed approach.', a: ['Keep repeating the same approach.', 'Take a brief walk, then return and inspect your assumptions.', 'Skip understanding the bug and memorize a patch.'], correct: 1, why: 'A break after focused effort may help you consider a different approach. Return to test that idea; a break alone does not solve the problem.' }, { q: 'You understand search algorithms separately. How could you practice choosing between them?', a: ['Mix tasks and explain which search method fits each one.', 'Repeat only the same labeled binary-search problem.', 'Read the solutions without attempting the tasks.'], correct: 0, why: 'Mixing related problem types practices strategy selection. First understand each method, then practice deciding when it applies.' }, { q: 'You can copy a recursive function but cannot explain its base case.', a: ['Copy it faster until it looks familiar.', 'Memorize the indentation.', 'Explain the base case and recursive step, then reconstruct a small example.'], correct: 2, why: 'A useful chunk connects meaning and procedure. Understanding, retrieval, and application help you move beyond copying.' }]; let current = 0;
function showScenario() { $('scenarioNum').textContent = current + 1; $('scenario').textContent = scenarios[current].q; $('strategyFeedback').textContent = ''; $('nextScenario').hidden = true; const buttons = scenarios[current].a.map((text, i) => { const b = document.createElement('button'); b.className = 'choice'; b.textContent = text; b.onclick = () => { Array.from($('choices').children).forEach(x => { x.disabled = true; x.setAttribute('aria-pressed', String(x === b)) }); $('strategyFeedback').textContent = (i === scenarios[current].correct ? 'Good choice. ' : 'Consider another approach. ') + scenarios[current].why; $('nextScenario').hidden = false; $('nextScenario').textContent = current === 2 ? 'Practice again ↻' : 'Next situation →' }; return b }); $('choices').replaceChildren(...buttons) } $('nextScenario').onclick = () => { current = (current + 1) % scenarios.length; showScenario() }; showScenario();

// Browser-local state. Storage failures never block the activities.
const STORAGE_KEY = 'mohammad-learning-lab-v2';
const blankState = () => ({ checkpoints: {}, plans: [], customCards: [], ratings: {}, reflection: '', sessions: 0, scenarios: [] });
let labState = blankState();
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved && typeof saved === 'object') {
    labState.checkpoints = Object.fromEntries(['recall', 'plan', 'strategy', 'reflection'].map(k => [k, saved.checkpoints?.[k] === true]));
    labState.reflection = typeof saved.reflection === 'string' ? saved.reflection.slice(0, 6000) : '';
    labState.sessions = Number.isSafeInteger(saved.sessions) && saved.sessions >= 0 ? saved.sessions : 0;
    labState.scenarios = Array.isArray(saved.scenarios) ? saved.scenarios.filter(n => [0, 1, 2].includes(n)) : [];
    labState.plans = Array.isArray(saved.plans) ? saved.plans.filter(p => typeof p.id === 'string' && typeof p.topic === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && !Number.isNaN(new Date(p.date + 'T12:00:00').getTime()) && Array.isArray(p.done)).slice(0, 10) : [];
    labState.customCards = Array.isArray(saved.customCards) ? saved.customCards.filter(c => typeof c.id === 'string' && typeof c.q === 'string' && typeof c.a === 'string').slice(0, 30) : [];
    labState.ratings = saved.ratings && typeof saved.ratings === 'object' ? saved.ratings : {};
  }
} catch { storageAvailable = false; }
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(labState)); }
  catch { storageAvailable = false; }
  if (!storageAvailable) $('storageStatus').textContent = 'Browser storage is unavailable. Activities still work for this visit. Download your notebook before leaving.';
}
const checkpointNames = { recall: 'Complete a recall self-assessment', plan: 'Generate a review schedule', strategy: 'Explore all three strategy situations', reflection: 'Save a personal reflection' };
function updateProgress() {
  const done = Object.values(labState.checkpoints).filter(Boolean).length;
  $('progressLabel').textContent = done + ' / 4 checkpoints';
  $('activityBar').style.width = done * 25 + '%';
  $('checkpoints').replaceChildren(...Object.entries(checkpointNames).map(([key, text]) => {
    const li = document.createElement('li'); li.textContent = text; li.classList.toggle('done', !!labState.checkpoints[key]); return li;
  }));
}
function complete(key) { labState.checkpoints[key] = true; persist(); updateProgress(); }
$('actual').addEventListener('change', () => { if ($('actual').value !== '') complete('recall'); });
$('choices').addEventListener('click', e => { if (!e.target.closest('button')) return; if (!labState.scenarios.includes(current)) labState.scenarios.push(current); persist(); if (labState.scenarios.length === 3) complete('strategy'); });

// Accessible mobile navigation and current-section highlighting.
$('menuToggle').onclick = () => { const open = $('menuToggle').getAttribute('aria-expanded') !== 'true'; $('menuToggle').setAttribute('aria-expanded', String(open)); $('navLinks').classList.toggle('open', open); $('menuToggle').textContent = open ? 'Close −' : 'Menu +'; };
$('navLinks').addEventListener('click', e => { if (e.target.closest('a')) { $('menuToggle').setAttribute('aria-expanded', 'false'); $('menuToggle').textContent = 'Menu +'; $('navLinks').classList.remove('open'); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('navLinks').classList.remove('open'); $('menuToggle').setAttribute('aria-expanded', 'false'); $('menuToggle').textContent = 'Menu +'; } });
const navLinks = Array.from($('navLinks').querySelectorAll('a'));
let scrollQueued = false;
function syncScroll() { const total = document.documentElement.scrollHeight - innerHeight; $('readingBar').style.width = (total > 0 ? scrollY / total * 100 : 0) + '%'; let active = null; navLinks.forEach(a => { const target = document.querySelector(a.getAttribute('href')); if (target && target.getBoundingClientRect().top <= 180) active = a; }); navLinks.forEach(a => { a.classList.toggle('active', a === active); if (a === active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); }); scrollQueued = false; }
addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(syncScroll); } }, { passive: true }); addEventListener('resize', syncScroll); syncScroll();

// Planner: safe DOM rendering, saved reviews, and calendar export.
let generatedPlan = null;
const uniqueID = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
$('plan').addEventListener('click', () => { const topic = $('topic').value.trim(), date = $('startDate').value; if (!topic || !date || !$('startDate').checkValidity() || Number.isNaN(new Date(date + 'T12:00:00').getTime())) return; generatedPlan = { id: uniqueID(), topic, date, done: [false, false, false, false] }; $('planActions').hidden = false; complete('plan'); });
function reviewDate(date, days) { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + days); return d; }
function renderPlans() {
  if (!labState.plans.length) { const p = document.createElement('p'); p.className = 'small'; p.textContent = 'No saved plans yet. Generate a schedule, then save it here.'; $('savedPlans').replaceChildren(p); return; }
  $('savedPlans').replaceChildren(...labState.plans.map(plan => {
    const card = document.createElement('article'); card.className = 'saved-plan'; const header = document.createElement('div'); header.className = 'saved-plan-header'; const title = document.createElement('h4'); title.textContent = plan.topic; const remove = document.createElement('button'); remove.className = 'secondary'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', 'Remove plan for ' + plan.topic); remove.onclick = () => { labState.plans = labState.plans.filter(p => p.id !== plan.id); persist(); renderPlans(); $('plannerStatus').textContent = 'Plan removed.'; }; header.append(title, remove); card.append(header);
    [1, 3, 7, 14].forEach((days, i) => { const label = document.createElement('label'); label.className = 'review-row'; const check = document.createElement('input'); check.type = 'checkbox'; check.checked = plan.done[i] === true; const span = document.createElement('span'); span.textContent = reviewDate(plan.date, days).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · Day +' + days + ' review'; check.onchange = () => { plan.done[i] = check.checked; persist(); $('plannerStatus').textContent = check.checked ? 'Review marked complete.' : 'Review marked incomplete.'; }; label.append(check, span); card.append(label); }); return card;
  }));
}
$('savePlan').onclick = () => { if (!generatedPlan) return; if (labState.plans.length >= 10) { $('plannerStatus').textContent = 'You have 10 plans. Remove a plan before adding another.'; return; } if (labState.plans.some(p => p.topic === generatedPlan.topic && p.date === generatedPlan.date)) { $('plannerStatus').textContent = 'That topic and date are already saved.'; return; } labState.plans.push({ ...generatedPlan, done: [false, false, false, false] }); persist(); renderPlans(); $('plannerStatus').textContent = storageAvailable ? 'Plan saved in this browser.' : 'Plan kept for this visit; browser storage is unavailable.'; };
function downloadFile(name, text, type) { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function icsEscape(value) { return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); }
$('exportCalendar').onclick = () => { if (!generatedPlan) return; const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Train Your Brain//Learning Lab//EN', 'CALSCALE:GREGORIAN'];[1, 3, 7, 14].forEach(days => { const d = reviewDate(generatedPlan.date, days), end = new Date(d); end.setDate(end.getDate() + 1); lines.push('BEGIN:VEVENT', 'UID:' + generatedPlan.id + '-' + days + '@trainyourbrain.local', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + localISO(d).replaceAll('-', ''), 'DTEND;VALUE=DATE:' + localISO(end).replaceAll('-', ''), 'SUMMARY:' + icsEscape('Review: ' + generatedPlan.topic), 'DESCRIPTION:Recall without notes. Check your attempt and correct the gaps.', 'END:VEVENT'); }); lines.push('END:VCALENDAR'); downloadFile('learning-review-plan.ics', lines.map(foldCalendarLine).join('\r\n') + '\r\n', 'text/calendar;charset=utf-8'); $('plannerStatus').textContent = 'Calendar downloaded. Import the .ics file into your calendar app.'; };

// Timer visual and completion count. Wall-clock deadline avoids accumulated drift.
const originalTick = tick;
tick = function () { const wasRunning = !!interval; originalTick(); $('timerOrbit').style.setProperty('--timer-progress', (1 - remaining / (Number($('mode').value) * 60)) * 100 + '%'); if (wasRunning && remaining === 0 && $('mode').value === '25') { labState.sessions++; $('sessionCount').textContent = labState.sessions; persist(); } };
$('timerReset').addEventListener('click', () => { $('timerOrbit').style.setProperty('--timer-progress', '0%'); });
$('mode').addEventListener('change', () => { $('timerOrbit').style.setProperty('--timer-progress', '0%'); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && interval) tick(); });
$('sessionCount').textContent = labState.sessions;

// Flashcards: explicit self-rating, custom prompts, difficult-card review.
const builtInCards = [
  { id: 'recall', topic: 'Recall', q: 'Why can rereading feel productive even when recall is weak?', a: 'Seeing an answer provides cues and familiarity. Try retrieving it without those cues, then check and repair your explanation.' },
  { id: 'space', topic: 'Spacing', q: 'How would you change a one-night study marathon?', a: 'Distribute practice over separate sessions. Retrieve before checking notes, and adjust future intervals based on what you can recall.' },
  { id: 'process', topic: 'Procrastination', q: 'Replace “finish the entire chapter” with a process goal.', a: 'For example: work on one problem for 25 minutes with the phone out of reach. Make starting specific and manageable.' },
  { id: 'chunk', topic: 'Chunking', q: 'What makes an algorithm a useful chunk rather than memorized code?', a: 'You understand its connected steps, can reconstruct the method, and know when it applies. Practice with meaning and context.' },
  { id: 'interleave', topic: 'Interleaving', q: 'After learning two methods separately, what should mixed practice require?', a: 'Choosing which method fits a problem and explaining why, as well as carrying out the method.' },
  { id: 'diffuse', topic: 'Learning modes', q: 'When might a break help with a difficult problem?', a: 'After engaging in focused work, step away briefly and return to reconsider your approach. A break may help, but it is not a guaranteed solution.' }
];
let deck = [], cardIndex = 0, cardFlipped = false, difficultOnly = false;
function allCards() { return [...builtInCards, ...labState.customCards.map(c => ({ ...c, topic: 'Your studies' }))]; }
function buildDeck() { deck = allCards().filter(c => !difficultOnly || labState.ratings[c.id] === 'again'); cardIndex = Math.min(cardIndex, Math.max(0, deck.length - 1)); renderCard(); }
function renderCard() { cardFlipped = false; const card = deck[cardIndex]; $('cardRating').hidden = true; $('flashcard').classList.remove('is-answer'); $('flashcard').setAttribute('aria-label', 'Reveal flashcard answer'); $('deleteCard').hidden = !card || !labState.customCards.some(c => c.id === card.id); $('flashcard').disabled = !card; $('prevCard').disabled = deck.length < 2; $('nextCard').disabled = deck.length < 2; $('cardCounter').textContent = card ? 'Card ' + (cardIndex + 1) + ' / ' + deck.length : 'No difficult cards'; $('cardTopic').textContent = card?.topic || 'All clear'; $('cardSide').textContent = 'Question'; $('cardContent').textContent = card?.q || 'Rate a card “Practice again” to add it here.'; $('flipHint').hidden = !card; $('flipHint').textContent = 'Think of your answer, then click to reveal ↻'; $('cardMastery').textContent = allCards().filter(c => labState.ratings[c.id] === 'know').length + ' / ' + allCards().length + ' self-rated recalled'; }
$('flashcard').onclick = () => { const card = deck[cardIndex]; if (!card) return; cardFlipped = !cardFlipped; $('flashcard').classList.toggle('is-answer', cardFlipped); $('cardSide').textContent = cardFlipped ? 'Answer' : 'Question'; $('cardContent').textContent = cardFlipped ? card.a : card.q; $('flipHint').textContent = cardFlipped ? 'Compare with your attempt. How did you do?' : 'Think of your answer, then click to reveal ↻'; $('flashcard').setAttribute('aria-label', cardFlipped ? 'Show flashcard question' : 'Reveal flashcard answer'); $('cardRating').hidden = !cardFlipped; };
function moveCard(delta) { cardIndex = (cardIndex + delta + deck.length) % deck.length; renderCard(); $('cardStatus').textContent = ''; }
$('prevCard').onclick = () => moveCard(-1); $('nextCard').onclick = () => moveCard(1);
function rateCard(rating) { const card = deck[cardIndex]; if (!card || !cardFlipped) return; labState.ratings[card.id] = rating; persist(); if (difficultOnly && rating === 'know') { buildDeck(); } else { moveCard(1); } $('cardStatus').textContent = rating === 'know' ? 'Marked recalled. Try it again after a delay.' : 'Added to difficult cards. Check the gap and return later.'; }
$('cardAgain').onclick = () => rateCard('again'); $('cardKnow').onclick = () => rateCard('know');
$('difficultCards').onclick = () => { difficultOnly = true; cardIndex = 0; buildDeck(); $('cardStatus').textContent = 'Showing cards you marked for more practice.'; }; $('allCards').onclick = () => { difficultOnly = false; cardIndex = 0; buildDeck(); $('cardStatus').textContent = 'Showing the full deck.'; };
$('addCard').onsubmit = e => { e.preventDefault(); const q = $('customQuestion').value.trim(), a = $('customAnswer').value.trim(); if (!q || !a) { $('addCardStatus').textContent = 'Write both a question and an answer.'; return; } if (labState.customCards.length >= 30) { $('addCardStatus').textContent = 'Maximum 30 custom cards. Delete one to add another.'; return; } labState.customCards.push({ id: 'custom-' + uniqueID(), q, a }); persist(); difficultOnly = false; cardIndex = allCards().length - 1; buildDeck(); $('addCard').reset(); $('addCardStatus').textContent = storageAvailable ? 'Your card is saved and ready to practice.' : 'Card added for this visit; browser storage is unavailable.'; };
$('deleteCard').onclick = () => { const card = deck[cardIndex]; if (!card) return; labState.customCards = labState.customCards.filter(c => c.id !== card.id); delete labState.ratings[card.id]; persist(); buildDeck(); $('cardStatus').textContent = 'Custom card deleted.'; };

// Reflection and downloadable record. Never render user text as HTML.
$('reflectionText').value = labState.reflection;
$('saveReflection').onclick = () => { const text = $('reflectionText').value.trim(); if (!text) { $('reflectionStatus').textContent = 'Write a reflection before saving.'; $('reflectionText').focus(); return; } labState.reflection = text; complete('reflection'); $('reflectionStatus').textContent = storageAvailable ? 'Reflection saved in this browser.' : 'Reflection kept for this visit. Download it before leaving.'; };
$('downloadReflection').onclick = () => { const text = $('reflectionText').value.trim(); const report = ['TRAIN YOUR BRAIN — LEARNING NOTEBOOK', 'Exported: ' + new Date().toLocaleString(), '', 'REFLECTION', text || '(No reflection written yet.)', '', 'CHECKPOINTS', ...Object.entries(checkpointNames).map(([k, v]) => (labState.checkpoints[k] ? '[x] ' : '[ ] ') + v), '', 'COMPLETED FOCUS SESSIONS: ' + labState.sessions, '', 'REVIEW PLANS', ...labState.plans.map(p => p.topic + ' · first studied ' + p.date + '\n' + [1, 3, 7, 14].map((d, i) => (p.done[i] ? '[x] ' : '[ ] ') + localISO(reviewDate(p.date, d))).join('\n')), '', 'CUSTOM FLASHCARDS', ...labState.customCards.map(c => 'Q: ' + c.q + '\nA: ' + c.a), '', 'Activity progress is self-reported and is not a course grade.']; downloadFile('my-learning-notebook.txt', report.join('\n'), 'text/plain;charset=utf-8'); $('reflectionStatus').textContent = 'Notebook downloaded, including the current reflection text.'; };
$('clearProgress').onclick = () => { $('resetConfirm').hidden = false; $('confirmReset').focus(); }; $('cancelReset').onclick = () => { $('resetConfirm').hidden = true; $('clearProgress').focus(); };
$('confirmReset').onclick = () => { labState = blankState(); persist(); $('reflectionText').value = ''; $('sessionCount').textContent = '0'; $('reflectionStatus').textContent = 'Saved lab data cleared.'; $('plannerStatus').textContent = ''; $('resetConfirm').hidden = true; generatedPlan = null; $('planActions').hidden = true; difficultOnly = false; cardIndex = 0; updateProgress(); renderPlans(); buildDeck(); $('clearProgress').focus(); };
updateProgress(); renderPlans(); buildDeck(); if (!storageAvailable) persist();

// RFC 5545 content-line folding without splitting UTF-8 code points.
function foldCalendarLine(line) {
  const encoder = new TextEncoder();
  let result = '', bytes = 0;
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) { result += '\r\n '; bytes = 1; }
    result += character; bytes += length;
  }
  return result;
}
