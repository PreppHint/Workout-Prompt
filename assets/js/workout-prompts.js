/**
 * PreppHint — Character Reference Sheet Prompt Library Renderer
 * --------------------------------------------------------------------------------------
 * Renders window.workout_PROMPTS_DATA into #ph-workout-prompts.
 * Supports Search, Category filtering, Gender filters, Favorites, and Copy.
 */
(function () {
  'use strict';

  var ROOT_ID = 'ph-workout-prompts';
  var FAV_KEY = 'ph_workout_favs';
  var GENDER_FILTER_KEY = 'ph_workout_gender_filter';
  
  // Showcase media (local files, in the same folder as the page)
  var REF_IMAGE_URL = 'character reference sheet.png'; // input: the character reference sheet
  var RESULT_GIF_URL = 'result.gif';                   // output: example generated exercise video

  // Base turnaround prompt instruction displayed at the top section
  var BASE_TURNAROUND_INSTRUCTION = "Create a professional character reference sheet based strictly on the uploaded reference image. Use a clean, neutral plain background and present the sheet as a technical model turnaround while matching the exact realistic visual style of the reference. Arrange the composition into two horizontal rows. Top row: four full-body standing views – front, left profile, right profile, back. Bottom row: three close-up portraits – front, left profile, right profile. Maintain perfect identity consistency across every panel. Keep the subject in a relaxed A-pose with consistent scale and alignment, accurate anatomy, and clear silhouette. Lighting should be consistent across all panels. Output a crisp, ultra-realistic, print-ready reference sheet.";

  var state = {
    cat: null,
    gender: localStorage.getItem(GENDER_FILTER_KEY) || 'all', // 'all'|'male'|'female'
    q: '',
    favOnly: false
  };

  var DATA = null;
  var root = null;
  var els = {};
  var favs = loadList(FAV_KEY);

  /* ── Tiny Utilities ─────────────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  function loadList(key) {
    try {
      var arr = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveList(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {}
  }

  function inList(arr, id) { return arr.indexOf(id) !== -1; }

  function toggleIn(arr, id) {
    var i = arr.indexOf(id);
    if (i === -1) arr.push(id); else arr.splice(i, 1);
  }

  /* ── Search Matcher ─────────────────────────────────────────────────── */

  function matchesQuery(prompt, q) {
    if (!q) return true;
    // Search name / category / muscles / gender. character_prompt is intentionally
    // excluded: it's identical boilerplate on every prompt, so including it would
    // make generic words (e.g. "studio", "a-pose") match the entire library.
    var hay = ((prompt.name || '') + ' ' + (prompt.category || '') + ' ' +
               (prompt.muscles || '') + ' ' + (prompt.gender || '')).toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) {
      return hay.indexOf(w) !== -1;
    });
  }

  /* -- Prompt resolver ---------------------------------------------------- */

  // The prompt box shows only the prompt itself: an explicit full_prompt when
  // one is provided (e.g. Crunch), otherwise the character prompt. Workout
  // details (muscles / benefits / safety) are intentionally kept separate.
  function getFullPrompt(p) {
    if (p.full_prompt && String(p.full_prompt).trim()) return p.full_prompt;
    return p.character_prompt || '';
  }

  /* ── Clipboard Actions ──────────────────────────────────────────────── */

  // Checkmark icon used for the inline "Copied" button state.
  var CHECK_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  function copyTextToClipboard(text, btn) {
    function ok() { showToast('Copied to clipboard'); flashCopied(btn); }
    function fail(err) { console.error('Copy failed:', err); showToast('Press Ctrl+C to copy'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () {
        if (legacyCopy(text)) ok(); else fail(new Error('clipboard blocked'));
      });
    } else if (legacyCopy(text)) {
      ok();
    } else {
      fail(new Error('clipboard unavailable'));
    }
  }

  // Fallback copy for non-secure (http) contexts or older browsers where the
  // async Clipboard API isn't available.
  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      var okFlag = document.execCommand('copy');
      document.body.removeChild(ta);
      return okFlag;
    } catch (e) { return false; }
  }

  // Briefly flip a copy button to a green "Copied" state as inline confirmation.
  function flashCopied(btn) {
    if (!btn) return;
    if (!btn._copyFlashing) {
      btn._copyOriginalHtml = btn.innerHTML;
      btn._copyFlashing = true;
    } else {
      clearTimeout(btn._copyResetTimer);
    }
    btn.classList.add('copied');
    btn.innerHTML = CHECK_ICON + 'Copied';
    btn._copyResetTimer = setTimeout(function () {
      btn.classList.remove('copied');
      btn.innerHTML = btn._copyOriginalHtml;
      btn._copyFlashing = false;
      btn._copyResetTimer = null;
    }, 1600);
  }

  function showToast(message) {
    var toast = document.querySelector('.ph-workout-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'ph-workout-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><polyline points="20 6 9 17 4 12"></polyline></svg> ' + esc(message);
    toast.classList.add('show');
    setTimeout(function () {
      toast.classList.remove('show');
    }, 2000);
  }

  /* ── UI Rendering ───────────────────────────────────────────────────── */

  function renderCategories() {
    var container = els.categories;
    if (!container) return;

    var html = '<button class="ph-workout-cat-btn' + (state.cat === null ? ' active' : '') + '" data-cat="all">' +
               'All Workouts <span class="ph-workout-cat-count">' + DATA.prompts.length + '</span></button>';

    DATA.categories.forEach(function (cat) {
      var count = DATA.prompts.filter(function (p) { return p.category === cat.id; }).length;
      html += '<button class="ph-workout-cat-btn' + (state.cat === cat.id ? ' active' : '') + '" data-cat="' + esc(cat.id) + '">' +
              esc(cat.name) + ' <span class="ph-workout-cat-count">' + count + '</span></button>';
    });

    container.innerHTML = html;
  }

  function renderGrid() {
    var grid = els.grid;
    if (!grid) return;

    var filtered = DATA.prompts.filter(function (p) {
      if (state.favOnly && !inList(favs, p.id)) return false;
      if (state.cat && p.category !== state.cat) return false;
      if (state.gender !== 'all' && p.gender !== state.gender) return false;
      if (state.q && !matchesQuery(p, state.q)) return false;
      return true;
    });

    els.counter.innerHTML = 'Showing ' + filtered.length + ' of ' + DATA.prompts.length + ' prompts';

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="ph-workout-error">No matching prompts found.</div>';
      return;
    }

    var html = '';
    filtered.forEach(function (prompt) {
      var isFav = inList(favs, prompt.id);
      var categoryObj = DATA.categories.find(function (c) { return c.id === prompt.category; });
      var catName = categoryObj ? categoryObj.name : prompt.category;

      var genderLabel = prompt.gender === 'female' ? 'Female' : 'Male';
      var genderClass = prompt.gender === 'female' ? 'female' : 'male';
      var fullPrompt = getFullPrompt(prompt);

      html += '<div class="ph-workout-card" data-id="' + esc(prompt.id) + '">' +
                // Head
                '<div class="ph-workout-card-head">' +
                  '<div class="ph-workout-card-title-group">' +
                    '<h3 class="ph-workout-card-title">' + esc(prompt.name) + '</h3>' +
                    '<div class="ph-workout-card-badges">' +
                      '<span class="ph-workout-gender-badge ' + genderClass + '">' + genderLabel + '</span>' +
                      '<span class="ph-workout-card-cat">' + esc(catName) + '</span>' +
                    '</div>' +
                  '</div>' +
                  '<button class="ph-workout-card-fav' + (isFav ? ' active' : '') + '" data-id="' + esc(prompt.id) + '" title="Save prompt" aria-label="Save prompt">' +
                    '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="' + (isFav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
                      '<path d="M12 21l-8.2-7.6C1.8 11.2 1.5 8 3.5 6c2-2 5.2-1.7 7 1 1.8-2.7 5-3 7-1 2 2 1.7 5.2-2.3 7.4z"/>' +
                    '</svg>' +
                  '</button>' +
                '</div>' +

                // Single prompt box containing the full prompt
                '<div class="ph-workout-prompt-section">' +
                  '<div class="ph-workout-prompt-header">' +
                    '<span class="ph-workout-prompt-label">Prompt</span>' +
                    '<button class="ph-workout-prompt-copy-btn" data-id="' + esc(prompt.id) + '" title="Copy prompt">' +
                      '<svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                        '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
                        '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
                      '</svg>' +
                      'Copy' +
                    '</button>' +
                  '</div>' +
                  '<div class="ph-workout-prompt-box">' + esc(fullPrompt) + '</div>' +
                '</div>' +
              '</div>';
    });

    grid.innerHTML = html;
  }

  /* ── Routing & Hashes ───────────────────────────────────────────────── */

  function applyHash() {
    var h = window.location.hash || '';
    state.cat = null;
    state.q = '';
    state.favOnly = false;

    if (h.indexOf('#cat=') === 0) {
      state.cat = h.substring(5);
    } else if (h.indexOf('#q=') === 0) {
      try { state.q = decodeURIComponent(h.substring(3)); }
      catch (e) { state.q = h.substring(3); }
      if (els.search) els.search.value = state.q;
    } else if (h === '#fav') {
      state.favOnly = true;
    }

    renderCategories();
    if (els.search) els.search.value = state.q;
    if (els.searchClear) els.searchClear.style.display = state.q ? 'block' : 'none';
    
    if (els.favBtn) {
      if (state.favOnly) els.favBtn.classList.add('active');
      else els.favBtn.classList.remove('active');
    }

    var genderBtns = document.querySelectorAll('.ph-workout-gender-filter-btn');
    genderBtns.forEach(function (btn) {
      if (btn.getAttribute('data-filter') === state.gender) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    renderGrid();
  }

  function setHash(hash, replace) {
    if (window.history.pushState) {
      var url = hash ? hash : window.location.pathname + window.location.search;
      // replace = true for search-as-you-type so we don't spam the history stack.
      if (replace) window.history.replaceState(null, null, url);
      else window.history.pushState(null, null, url);
      applyHash();
    } else {
      window.location.hash = hash;
    }
  }

  /* ── Event Handlers ─────────────────────────────────────────────────── */

  function setupEvents() {
    // Search input
    if (els.search) {
      els.search.addEventListener('input', debounce(function (e) {
        var query = e.target.value.trim();
        state.q = query;
        if (els.searchClear) els.searchClear.style.display = query ? 'block' : 'none';
        setHash(query ? '#q=' + encodeURIComponent(query) : '', true);
      }, 200));
    }

    // Search clear
    if (els.searchClear) {
      els.searchClear.addEventListener('click', function () {
        if (els.search) els.search.value = '';
        state.q = '';
        els.searchClear.style.display = 'none';
        setHash('', true);
      });
    }

    // Favorites filter
    if (els.favBtn) {
      els.favBtn.addEventListener('click', function () {
        if (state.favOnly) setHash('');
        else setHash('#fav');
      });
    }

    // Category Buttons
    if (els.categories) {
      els.categories.addEventListener('click', function (e) {
        var btn = e.target.closest('.ph-workout-cat-btn');
        if (!btn) return;
        var catId = btn.getAttribute('data-cat');
        if (catId === 'all') setHash('');
        else setHash('#cat=' + catId);
      });
    }

    // Gender Filter Group
    var filterContainer = document.getElementById('ph-workout-gender-filter');
    if (filterContainer) {
      filterContainer.addEventListener('click', function (e) {
        var btn = e.target.closest('.ph-workout-gender-filter-btn');
        if (!btn) return;
        var filterVal = btn.getAttribute('data-filter');
        state.gender = filterVal;
        localStorage.setItem(GENDER_FILTER_KEY, filterVal);
        
        var btns = filterContainer.querySelectorAll('.ph-workout-gender-filter-btn');
        btns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        renderGrid();
      });
    }

    // Grid interaction
    if (els.grid) {
      els.grid.addEventListener('click', function (e) {
        var favBtn = e.target.closest('.ph-workout-card-fav');
        var copyBtn = e.target.closest('.ph-workout-prompt-copy-btn');

        // Toggle Favorite
        if (favBtn) {
          e.stopPropagation();
          var id = favBtn.getAttribute('data-id');
          toggleIn(favs, id);
          saveList(FAV_KEY, favs);
          favBtn.classList.toggle('active');
          var svg = favBtn.querySelector('svg');
          if (svg) svg.setAttribute('fill', inList(favs, id) ? 'currentColor' : 'none');
          if (state.favOnly) renderGrid();
          return;
        }

        // Copy the full prompt
        if (copyBtn) {
          e.stopPropagation();
          var promptId = copyBtn.getAttribute('data-id');
          var prompt = DATA.prompts.find(function (p) { return p.id === promptId; });
          if (prompt) copyTextToClipboard(getFullPrompt(prompt), copyBtn);
          return;
        }
      });
    }

    // Base prompt copy button (top section)
    var baseCopy = document.getElementById('ph-workout-base-copy');
    if (baseCopy) {
      baseCopy.addEventListener('click', function () {
        copyTextToClipboard(BASE_TURNAROUND_INSTRUCTION, baseCopy);
      });
    }
  }

  /* ── Structured Schema for SEO ──────────────────────────────────────── */

  function addStructuredData(prompts) {
    var existing = document.getElementById('ph-workout-ld');
    if (existing) existing.remove();

    var structuredData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Character Reference Sheet Prompts Library",
      "description": "Model turnaround sheet prompts for workout characters and fitness figures.",
      "itemListElement": []
    };

    prompts.forEach(function (prompt, idx) {
      structuredData.itemListElement.push({
        "@type": "CreativeWork",
        "position": idx + 1,
        "name": prompt.name + " (" + (prompt.gender === 'female' ? 'Female' : 'Male') + ") Turnaround Prompt",
        "description": "workout 2 prompt details for character turnaround reference sheet of " + prompt.name + " model.",
        "genre": "Model Turnaround, workout Character reference"
      });
    });

    var script = document.createElement('script');
    script.id = 'ph-workout-ld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }

  /* ── App Initialization ─────────────────────────────────────────────── */

  function buildAppSkeleton() {
    var activeGender = state.gender;
    root.innerHTML = 
      '<div class="ph-workout-app">' +
        
        // ── Top Header Section (Two Columns: Base Prompt box + Reference image) ──
        '<div class="ph-workout-header-grid">' +
          // Left: Base prompt shown in a visible box, like the cards
          '<div class="ph-workout-title-banner">' +
            '<h1 class="ph-workout-title-banner-text">Character Sheet Prompts</h1>' +
            '<p class="ph-workout-title-banner-sub">Use this prompt to generate a character sheet for consistent video generation</p>' +
            '<div class="ph-workout-prompt-section">' +
              '<div class="ph-workout-prompt-header">' +
                '<span class="ph-workout-prompt-label">Prompt</span>' +
                '<button class="ph-workout-prompt-copy-btn" id="ph-workout-base-copy" title="Copy base prompt">' +
                  '<svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                    '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
                    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
                  '</svg>' +
                  'Copy' +
                '</button>' +
              '</div>' +
              '<div class="ph-workout-prompt-box">' + esc(BASE_TURNAROUND_INSTRUCTION) + '</div>' +
            '</div>' +
          '</div>' +

          // Right Showcase Turnaround Template
          '<div class="ph-workout-ref-showcase">' +
            '<img src="https://cdn.jsdelivr.net/gh/PreppHint/Workout-Prompt@main/character%20reference%20sheet.png" alt="Character Reference Sheet Template" class="ph-workout-ref-image"/>' +
          '</div>' +
        '</div>' +

        // Example result — what the generated video looks like
        '<div class="ph-workout-result">' +
          '<div class="ph-workout-result-info">' +
            '<span class="ph-workout-prompt-label">Example result</span>' +
            '<h2 class="ph-workout-result-title">See what you\'ll create</h2>' +
            '<p class="ph-workout-result-sub">This is what your generated video looks like once you copy an exercise prompt below and run it in Omni Flash. Example shown: Push-up.</p>' +
          '</div>' +
          '<div class="ph-workout-result-media">' +
            '<img src="https://cdn.jsdelivr.net/gh/PreppHint/Workout-Prompt@main/result.gif" alt="Example generated exercise video (push-up)" class="ph-workout-result-gif"/>' +
          '</div>' +
        '</div>' +

        // Categories list
        '<div class="ph-workout-categories-wrapper">' +
          '<div class="ph-workout-categories" id="ph-workout-categories"></div>' +
        '</div>' +

        // Search, Gender filters & Action bar
        '<div class="ph-workout-controls">' +
          // Search Input
          '<div class="ph-workout-search-wrapper">' +
            '<svg aria-hidden="true" class="ph-workout-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.8-3.8"/></svg>' +
            '<input type="text" class="ph-workout-search-input" id="ph-workout-search" placeholder="Search models, workouts, muscles..." aria-label="Search prompts"/>' +
            '<button class="ph-workout-search-clear" id="ph-workout-search-clear" style="display:none;">&times;</button>' +
          '</div>' +
          
          // Gender Selector Group
          '<div class="ph-workout-gender-filter" id="ph-workout-gender-filter">' +
            '<button class="ph-workout-gender-filter-btn' + (activeGender === 'all' ? ' active' : '') + '" data-filter="all">All</button>' +
            '<button class="ph-workout-gender-filter-btn' + (activeGender === 'male' ? ' active' : '') + '" data-filter="male">Male</button>' +
            '<button class="ph-workout-gender-filter-btn' + (activeGender === 'female' ? ' active' : '') + '" data-filter="female">Female</button>' +
          '</div>' +
          
          // Saved Prompts Button
          '<button class="ph-workout-action-btn" id="ph-workout-fav-btn">' +
            '<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M12 21l-8.2-7.6C1.8 11.2 1.5 8 3.5 6c2-2 5.2-1.7 7 1 1.8-2.7 5-3 7-1 2 2 1.7 5.2-2.3 7.4z"/></svg>' +
            ' Saved' +
          '</button>' +
        '</div>' +

        // Counter & Status
        '<div class="ph-workout-status" id="ph-workout-counter">Showing 0 of 0 prompts</div>' +

        // Exercise Grid
        '<div class="ph-workout-grid" id="ph-workout-grid"></div>' +
      '</div>';

    els.categories = document.getElementById('ph-workout-categories');
    els.search = document.getElementById('ph-workout-search');
    els.searchClear = document.getElementById('ph-workout-search-clear');
    els.favBtn = document.getElementById('ph-workout-fav-btn');
    els.counter = document.getElementById('ph-workout-counter');
    els.grid = document.getElementById('ph-workout-grid');

    // Graceful fallback if a showcase image/clip can't be loaded (avoids a broken-image icon).
    attachImgFallback(root.querySelector('.ph-workout-ref-image'), 'Character reference sheet template');
    attachImgFallback(root.querySelector('.ph-workout-result-gif'), 'Example result video');
  }

  function attachImgFallback(img, text) {
    if (!img) return;
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      if (img.parentNode) {
        img.parentNode.innerHTML = '<div class="ph-workout-ref-fallback">' + esc(text) + '</div>';
      }
    });
  }

  function init() {
    root = document.getElementById(ROOT_ID);
    if (!root) return;

    if (window.workout_PROMPTS_DATA) {
      DATA = window.workout_PROMPTS_DATA;
      buildAppSkeleton();
      setupEvents();
      applyHash();
      addStructuredData(DATA.prompts); // once, for the full catalog (SEO)
      window.addEventListener('hashchange', applyHash);
    } else {
      root.innerHTML = '<div class="ph-workout-error">Failed to load dataset. Please check if script tags are loaded.</div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
