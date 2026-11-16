// Token Radar's page: renders window.RADAR (written by main.ts) with no network.
// State lives in the hash, so a view is a link: #detail=<slug> opens a protocol,
// #cat=<category> filters to it, #scope=watchlist shows the watchlist alone.
(function () {
  var R = window.RADAR;
  if (!R || !Array.isArray(R.rows)) {
    document.body.innerHTML = '<p style="padding:40px">Token Radar: no data. Run main.ts first.</p>';
    return;
  }
  // The watchlist is the floor: rows flagged by the model carry it.
  var state = { view: 'board', q: '', cat: '', chain: '', scope: 'all', sort: 'rank', dir: 1, detail: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n === null || n === undefined) return '<span class="sub">n/a</span>';
    var cls = n > 0 ? 'up' : n < 0 ? 'down' : '';
    return '<span class="' + cls + '">' + (n > 0 ? '+' : '') + n.toFixed(1) + '%</span>';
  }
  function age(n) {
    if (n === null || n === undefined) return '<span class="sub">n/a</span>';
    if (n >= 365) return (n / 365).toFixed(1) + 'y';
    return n + 'd';
  }

  // ---- hash ---------------------------------------------------------------
  function readHash() {
    var h = (location.hash || '').replace(/^#/, '');
    var out = { view: 'board', q: '', cat: '', chain: '', scope: 'all', sort: 'rank', dir: 1, detail: null };
    h.split('&').forEach(function (part) {
      var kv = part.split('=');
      var k = decodeURIComponent(kv[0] || '');
      var v = decodeURIComponent(kv[1] || '');
      if (k === 'view' && (v === 'live' || v === 'model')) out.view = v;
      else if (k === 'q') out.q = v;
      else if (k === 'cat') out.cat = v;
      else if (k === 'chain') out.chain = v;
      else if (k === 'scope' && (v === 'watchlist' || v === 'early')) out.scope = v;
      else if (k === 'sort') out.sort = v;
      else if (k === 'dir') out.dir = v === '-1' ? -1 : 1;
      else if (k === 'detail') out.detail = v;
    });
    return out;
  }
  function writeHash() {
    var parts = [];
    if (state.view !== 'board') parts.push('view=' + state.view);
    if (state.q) parts.push('q=' + encodeURIComponent(state.q));
    if (state.cat) parts.push('cat=' + encodeURIComponent(state.cat));
    if (state.chain) parts.push('chain=' + encodeURIComponent(state.chain));
    if (state.scope !== 'all') parts.push('scope=' + state.scope);
    if (state.sort !== 'rank') parts.push('sort=' + state.sort);
    if (state.dir !== 1) parts.push('dir=-1');
    if (state.detail) parts.push('detail=' + encodeURIComponent(state.detail));
    var h = parts.length ? '#' + parts.join('&') : '#';
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  // ---- header and stats ----------------------------------------------------
  var maxImplied = R.rows.length ? R.rows[0].implied_value_usd : 1;
  $('topMeta').innerHTML =
    '<span>Snapshot <b>' + esc(R.as_of) + '</b></span>' +
    '<span>Model <b>' + esc(R.model_version) + '</b></span>' +
    '<span>Floor <b>' + money(R.floor_usd) + '</b></span>';
  $('stats').innerHTML =
    '<div class="stat"><b>' + R.board_size + '</b><span>pre-token protocols ranked</span></div>' +
    '<div class="stat"><b>' + R.watchlist_size + ' / ' + R.watchlist_size + '</b><span>watchlist covered</span></div>' +
    '<div class="stat"><b>' + R.early_size + '</b><span>early finds below the floor</span></div>' +
    '<div class="stat"><b>' + money(R.rows.length ? R.rows[0].implied_value_usd : 0) + '</b><span>top implied value</span></div>';

  // ---- filters --------------------------------------------------------------
  var cats = [];
  var chains = [];
  R.rows.forEach(function (r) {
    if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category);
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  cats.sort();
  chains.sort();
  function options(list, all) {
    return '<option value="">' + all + '</option>' + list.map(function (v) {
      return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
    }).join('');
  }
  $('cat').innerHTML = options(cats, 'All categories');
  $('chain').innerHTML = options(chains, 'All chains');

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return R.rows.filter(function (r) {
      if (state.scope === 'watchlist' && !r.watchlist) return false;
      if (state.scope === 'early' && r.watchlist) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0)) return false;
      return true;
    });
  }
  function sorted(rows) {
    var key = state.sort;
    var dir = state.dir;
    return rows.slice().sort(function (a, b) {
      var va = a[key];
      var vb = b[key];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      return (va - vb) * dir || (a.slug < b.slug ? -1 : 1);
    });
  }

  // ---- board ----------------------------------------------------------------
  function renderBoard() {
    var rows = sorted(filtered());
    $('count').textContent = rows.length + ' of ' + R.board_size + ' protocols';
    if (!rows.length) {
      $('rows').innerHTML = '<tr><td colspan="8"><div class="empty">Nothing matches these filters.</div></td></tr>';
      return;
    }
    $('rows').innerHTML = rows.map(function (r) {
      var w = Math.max(2, Math.round((r.implied_value_usd / maxImplied) * 100));
      return '<tr data-slug="' + esc(r.slug) + '" data-selected="' + (state.detail === r.slug) + '">' +
        '<td class="num">' + r.rank + '</td>' +
        '<td><div class="name"><b>' + esc(r.name) + '</b><span class="sub">' + esc(r.slug) + '</span></div></td>' +
        '<td>' + (r.category ? '<span class="tag-cat">' + esc(r.category) + '</span>' : '<span class="sub">n/a</span>') +
        (r.watchlist ? ' <span class="watch">WATCHLIST</span>' : '') + '</td>' +
        '<td class="sub">' + r.chains.slice(0, 3).map(esc).join(', ') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td><div class="implied"><span class="num">' + money(r.implied_value_usd) + '</span><span class="bar"><i style="width:' + w + '%"></i></span></div></td>' +
        '</tr>';
    }).join('');
    document.querySelectorAll('#board thead button').forEach(function (b) {
      var k = b.getAttribute('data-sort');
      b.innerHTML = esc(b.textContent.replace(/ [▲▼]$/, '')) + (state.sort === k ? ' <span class="arrow">' + (state.dir === 1 ? '▲' : '▼') + '</span>' : '');
    });
  }

  // ---- live -------------------------------------------------------------------
  $('liveRows').innerHTML = R.live.map(function (p) {
    return '<tr><td><div class="name"><b>' + esc(p.name) + '</b><span class="sub">' + esc(p.slug) + '</span></div></td>' +
      '<td>' + (p.category ? esc(p.category) : '<span class="sub">n/a</span>') + '</td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="num">' + (p.mcap_usd === null ? '<span class="sub">n/a</span>' : money(p.mcap_usd)) + '</td>' +
      '<td class="num">' + (p.mcap_tvl === null ? '<span class="sub">n/a</span>' : p.mcap_tvl.toFixed(3) + 'x') + '</td>' +
      '<td class="num">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  // ---- model ------------------------------------------------------------------
  var cal = R.calibration;
  $('modelBody').innerHTML =
    '<h2>How the value is fitted</h2>' +
    '<p class="lede">The multiple is not a guess. For each category, the model takes the median market-cap-to-TVL ratio of the protocols in that category whose token already trades, then shrinks it toward the whole market median (' + cal.global_median.toFixed(3) + 'x, fitted on ' + cal.live_count + ' live protocols) with a prior of 8 protocols, and clamps it to 0.02x–1.00x. A category with one or two live tokens cannot inherit an outlier.</p>' +
    '<div class="formula">implied = TVL x category multiple\n        x (1 + clamp(7d change, -60, 120)% x 0.5)\n        x (0.6 + min(age, 1095d) / 1095 x 0.4)\n        x (1 + 0.05 x min(chains - 1, 4))</div>' +
    '<h3 style="margin-top:20px">Category multiples fitted on this snapshot</h3>' +
    '<div class="table-wrap"><table><thead><tr><th>Category</th><th>Live protocols</th><th>Live median mcap/TVL</th><th>Multiple used</th></tr></thead><tbody>' +
    cal.categories.map(function (c) {
      return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.live_count + '</td><td class="num">' + c.live_median.toFixed(3) + 'x</td><td class="num">' + c.multiple.toFixed(3) + 'x</td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<p class="why">Categories with no live protocol take the global median. The board never special-cases a name: the same function scores every row.</p>';

  // ---- detail -------------------------------------------------------------------
  function renderDetail() {
    var d = $('detail');
    var row = null;
    if (state.detail) {
      for (var i = 0; i < R.rows.length; i++) if (R.rows[i].slug === state.detail) { row = R.rows[i]; break; }
    }
    if (!row) { d.hidden = true; d.innerHTML = ''; return; }
    var base = row.tvl_usd * row.category_multiple;
    d.innerHTML =
      '<div class="detail-head"><div><span class="sub">Rank #' + row.rank + ' · ' + (row.watchlist ? 'Watchlist' : 'Early find') + '</span><h2>' + esc(row.name) + '</h2><span class="sub">' + esc(row.slug) + ' · ' + (row.category ? esc(row.category) : 'no category') + ' · ' + row.chains.map(esc).join(', ') + '</span></div><button class="close" id="closeDetail">Close</button></div>' +
      '<div class="dgrid">' +
      '<div class="dcell"><span>Implied value</span><b>' + money(row.implied_value_usd) + '</b></div>' +
      '<div class="dcell"><span>TVL</span><b>' + money(row.tvl_usd) + '</b></div>' +
      '<div class="dcell"><span>7-day change</span><b>' + (row.change_7d === null ? 'n/a' : (row.change_7d > 0 ? '+' : '') + row.change_7d.toFixed(1) + '%') + '</b></div>' +
      '<div class="dcell"><span>Tracked since</span><b>' + (row.listed_at || 'n/a') + ' (' + age(row.age_days) + ')</b></div>' +
      '</div>' +
      '<div class="dsection"><h3>The model, step by step</h3><div class="equation">' +
      '<div><span>TVL x category multiple ' + row.category_multiple.toFixed(3) + 'x</span><b>' + money(base) + '</b></div>' +
      '<div><span>Growth multiplier</span><b>' + row.growth_multiplier.toFixed(2) + 'x</b></div>' +
      '<div><span>Maturity multiplier</span><b>' + row.maturity_multiplier.toFixed(2) + 'x</b></div>' +
      '<div><span>Chain breadth multiplier</span><b>' + row.breadth_multiplier.toFixed(2) + 'x</b></div>' +
      '<div><span>Implied value</span><b>' + money(row.implied_value_usd) + '</b></div>' +
      '</div><p class="why">The category multiple is fitted on this snapshot: the median market-cap-to-TVL ratio of live ' + (row.category ? esc(row.category) : '') + ' protocols, shrunk toward the market median. ' + esc(row.name) + ' records no token, so the board shows an implied value, never a market cap.</p></div>' +
      '<div class="dsection"><h3>How to farm it</h3><ol class="steps">' +
      row.farm_steps.map(function (s) {
        return '<li><b>' + esc(s.text) + '</b><span class="cost">Cost: ' + esc(s.cost) + ' · Time: ' + esc(s.time) + '</span></li>';
      }).join('') + '</ol></div>';
    d.hidden = false;
    $('closeDetail').addEventListener('click', function () { state.detail = null; writeHash(); renderAll(); });
  }

  // ---- views and events -------------------------------------------------------
  function renderAll() {
    document.querySelectorAll('.views button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === state.view));
    });
    $('view-board').hidden = state.view !== 'board';
    $('view-live').hidden = state.view !== 'live';
    $('view-model').hidden = state.view !== 'model';
    renderBoard();
    renderDetail();
  }
  document.querySelectorAll('.views button').forEach(function (b) {
    b.addEventListener('click', function () { state.view = b.getAttribute('data-view'); writeHash(); renderAll(); });
  });
  $('q').addEventListener('input', function (e) { state.q = e.target.value; writeHash(); renderBoard(); });
  $('cat').addEventListener('change', function (e) { state.cat = e.target.value; writeHash(); renderBoard(); });
  $('chain').addEventListener('change', function (e) { state.chain = e.target.value; writeHash(); renderBoard(); });
  $('scope').addEventListener('change', function (e) { state.scope = e.target.value; writeHash(); renderBoard(); });
  document.querySelectorAll('#board thead button').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-sort');
      if (state.sort === k) state.dir = -state.dir;
      else { state.sort = k; state.dir = k === 'rank' ? 1 : -1; }
      writeHash();
      renderBoard();
    });
  });
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (!tr) return;
    state.detail = tr.getAttribute('data-slug');
    state.view = 'board';
    writeHash();
    renderAll();
  });
  window.addEventListener('hashchange', function () {
    var s = readHash();
    state = s;
    $('q').value = s.q;
    $('cat').value = s.cat;
    $('chain').value = s.chain;
    $('scope').value = s.scope;
    renderAll();
  });

  // ---- boot ---------------------------------------------------------------------
  state = readHash();
  $('q').value = state.q;
  $('cat').value = state.cat;
  $('chain').value = state.chain;
  $('scope').value = state.scope;
  renderAll();
})();
