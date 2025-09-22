/* Belot Score Calculator v0.1.0 */
(function() {
  const el = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const state = {
    rounds: [], // each: { taker:'A'|'B', trump:'hearts'|'diamonds'|'clubs'|'spades'|'none', A:{tricks, announce, belote, capot}, B:{...}, multiplier, totals:{A,B}, notes }
    teamAName: 'Team A',
    teamBName: 'Team B',
    options: {
      belote: 20,
      rounding: 'none', // 'none'|'nearest10'|'floor10'
      capot: 90,
      failMode: 'all', // 'bags'|'all'
    }
  };

  function save() {
    const data = JSON.stringify({
      rounds: state.rounds,
      teamAName: state.teamAName,
      teamBName: state.teamBName,
      options: state.options,
    });
    localStorage.setItem('belot_calc_v1', data);
  }
  function load() {
    const raw = localStorage.getItem('belot_calc_v1');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      state.rounds = data.rounds || [];
      state.teamAName = data.teamAName || 'Team A';
      state.teamBName = data.teamBName || 'Team B';
      state.options = Object.assign(state.options, data.options || {});
    } catch {}
  }

  function roundPoints(v, rounding) {
    if (rounding === 'none') return v;
    if (rounding === 'nearest10') return Math.round(v / 10) * 10;
    if (rounding === 'floor10') return Math.floor(v / 10) * 10;
    return v;
  }

  function computeRound({taker, trump, A, B, multiplier}, opts) {
    // Basic validations
    const sumTricks = (A.tricks|0) + (B.tricks|0);
    if (sumTricks !== 162 && !(A.capot || B.capot)) {
      throw new Error('Trick points must sum to 162');
    }
    if (A.capot && B.capot) throw new Error('Both teams cannot be capot');

    // Compute raw points
    const beloteA = A.belote ? opts.belote : 0;
    const beloteB = B.belote ? opts.belote : 0;

    const baseA = (A.capot ? 162 : (A.tricks|0)) + (A.announce|0) + beloteA;
    const baseB = (B.capot ? 162 : (B.tricks|0)) + (B.announce|0) + beloteB;

    // Determine winner on tricks (bags)
    const takerTeam = taker;
    const defTeam = taker === 'A' ? 'B' : 'A';
    const tricksWin = (A.capot || A.tricks > B.tricks) ? 'A' : (B.capot || B.tricks > A.tricks) ? 'B' : 'tie';

    let scoreA = baseA;
    let scoreB = baseB;
    let notes = [];

    // Capot bonus (optional rule)
    if (A.capot) { scoreA += opts.capot; notes.push('Capot A'); }
    if (B.capot) { scoreB += opts.capot; notes.push('Capot B'); }

    // If taker failed to win more tricks than defense (or didn't take all when opponent capot), apply fail rule
    let takerFailed = false;
    if (tricksWin !== 'tie' && tricksWin !== takerTeam) {
      takerFailed = true;
    }

    if (takerFailed) {
      if (opts.failMode === 'all') {
        // All points (tricks+announces+belote) go to defenders
        if (takerTeam === 'A') { scoreB += scoreA; scoreA = 0; notes.push('Fail A'); }
        else { scoreA += scoreB; scoreB = 0; notes.push('Fail B'); }
      } else {
        // Only trick points to defenders; announcements and belote remain
        if (takerTeam === 'A') { scoreB += (A.capot ? 162 : (A.tricks|0)); scoreA -= (A.capot ? 162 : (A.tricks|0)); notes.push('Fail A (bags)'); }
        else { scoreA += (B.capot ? 162 : (B.tricks|0)); scoreB -= (B.capot ? 162 : (B.tricks|0)); notes.push('Fail B (bags)'); }
      }
    }

    // Apply multiplier
    scoreA *= multiplier;
    scoreB *= multiplier;

    // Apply rounding at end
    scoreA = roundPoints(scoreA, opts.rounding);
    scoreB = roundPoints(scoreB, opts.rounding);

    return { A: scoreA, B: scoreB, notes: notes.join(', ') };
  }

  function recalcTotals() {
    const totals = { A: 0, B: 0 };
    state.rounds.forEach(r => { totals.A += r.totals.A; totals.B += r.totals.B; });
    el('totalA').textContent = totals.A.toString();
    el('totalB').textContent = totals.B.toString();
  }

  function renderHistory() {
    const tbody = document.querySelector('#historyTable tbody');
    tbody.innerHTML = '';
    state.rounds.forEach((r, idx) => {
      const tr = document.createElement('tr');
      const tdIdx = document.createElement('td'); tdIdx.textContent = String(idx + 1);
      const tdTaker = document.createElement('td'); tdTaker.textContent = r.taker;
      const tdTrump = document.createElement('td'); tdTrump.textContent = r.trump;
      const tdA = document.createElement('td'); tdA.textContent = r.totals.A;
      const tdB = document.createElement('td'); tdB.textContent = r.totals.B;
      const tdNotes = document.createElement('td'); tdNotes.textContent = r.notes || '';
      tr.append(tdIdx, tdTaker, tdTrump, tdA, tdB, tdNotes);
      tbody.appendChild(tr);
    });
  }

  function syncTeamNamesIntoUI() {
    el('teamAName').value = state.teamAName;
    el('teamBName').value = state.teamBName;
    $$('.team-name[data-team="A"]').forEach(n => n.textContent = state.teamAName);
    $$('.team-name[data-team="B"]').forEach(n => n.textContent = state.teamBName);
    el('labelA').textContent = state.teamAName;
    el('labelB').textContent = state.teamBName;
  }

  function syncOptionsIntoUI() {
    el('optBelote').value = state.options.belote;
    el('optRounding').value = state.options.rounding;
    el('optCapot').value = state.options.capot;
    el('optFail').value = state.options.failMode;
  }

  function readRoundFromForm() {
    const taker = document.querySelector('input[name="taker"]:checked').value;
    const trump = el('trump').value;
    const A = {
      tricks: parseInt(el('tricksA').value || '0', 10),
      announce: parseInt(el('announceA').value || '0', 10),
      belote: el('beloteA').checked,
      capot: el('capotA').checked,
    };
    const B = {
      tricks: parseInt(el('tricksB').value || '0', 10),
      announce: parseInt(el('announceB').value || '0', 10),
      belote: el('beloteB').checked,
      capot: el('capotB').checked,
    };
    const multiplier = parseInt(el('multiplier').value, 10);
    return { taker, trump, A, B, multiplier };
  }

  function onSubmitRound(evt) {
    evt.preventDefault();
    // Basic UI validation
    try {
      const round = readRoundFromForm();
      const totals = computeRound(round, state.options);
      const record = Object.assign({}, round, { totals, notes: totals.notes });
      state.rounds.push(record);
      save();
      renderHistory();
      recalcTotals();
      // reset per-round fields
      ['tricksA','tricksB','announceA','announceB'].forEach(id => el(id).value = '');
      ['beloteA','beloteB','capotA','capotB'].forEach(id => el(id).checked = false);
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  function undo() {
    state.rounds.pop();
    save();
    renderHistory();
    recalcTotals();
  }

  function resetAll() {
    if (!confirm('Reset the whole game? This clears history.')) return;
    state.rounds = [];
    save();
    renderHistory();
    recalcTotals();
  }

  function wireEvents() {
    el('roundForm').addEventListener('submit', onSubmitRound);
    el('undoBtn').addEventListener('click', undo);
    el('resetBtn').addEventListener('click', resetAll);

    el('teamAName').addEventListener('input', (e) => {
      state.teamAName = e.target.value || 'Team A';
      syncTeamNamesIntoUI();
      save();
    });
    el('teamBName').addEventListener('input', (e) => {
      state.teamBName = e.target.value || 'Team B';
      syncTeamNamesIntoUI();
      save();
    });

    el('optBelote').addEventListener('change', (e) => { state.options.belote = parseInt(e.target.value||'20',10); save(); });
    el('optRounding').addEventListener('change', (e) => { state.options.rounding = e.target.value; save(); recalcTotals(); renderHistory(); });
    el('optCapot').addEventListener('change', (e) => { state.options.capot = parseInt(e.target.value||'90',10); save(); });
    el('optFail').addEventListener('change', (e) => { state.options.failMode = e.target.value; save(); });
  }

  function boot() {
    load();
    syncTeamNamesIntoUI();
    syncOptionsIntoUI();
    renderHistory();
    recalcTotals();
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireEvents();
    boot();
  });
})();
