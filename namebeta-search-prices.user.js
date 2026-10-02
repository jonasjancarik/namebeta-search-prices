// ==UserScript==
// @name         NameBeta Search Prices
// @namespace    https://github.com/jonasjancarik/namebeta-search-prices
// @version      1.0.1
// @description  Show the lowest listed registration price beneath available NameBeta search results.
// @homepageURL  https://github.com/jonasjancarik/namebeta-search-prices
// @downloadURL  https://raw.githubusercontent.com/jonasjancarik/namebeta-search-prices/main/namebeta-search-prices.user.js
// @updateURL    https://raw.githubusercontent.com/jonasjancarik/namebeta-search-prices/main/namebeta-search-prices.user.js
// @match        https://namebeta.com/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

// Generated from extension/namebeta.js and extension/namebeta.css.
// Regenerate with: node scripts/build-userscript.cjs
(() => { const style = document.createElement('style'); style.textContent = "#query-list .nbp-price { display: block; margin-top: 3px; font: 12px/1.4 system-ui, sans-serif; color: inherit; opacity: .72; white-space: nowrap; }\n"; document.head.append(style); })();
(function (root) {
  'use strict';
  const TTL = 6 * 60 * 60 * 1000;
  function suffix(domain) {
    const labels = domain.toLowerCase().split('.');
    return labels.length > 1 && labels.every(l => /^[a-z0-9-]+$/.test(l)) ? labels.slice(1).join('.') : null;
  }
  function cheapest(rows) {
    const valid = rows.filter(r => Number.isFinite(r.amount) && r.amount > 0 && r.amount < 1000000 && r.name && r.display);
    return valid.reduce((best, row) => !best || row.amount < best.amount ? row : best, null);
  }
  if (typeof module !== 'undefined') { module.exports = { suffix, cheapest }; return; }
  (async () => {
    let cache = await GM_getValue('namebetaTldPrices', {});
    const pending = new Set();
    const failed = new Set();
    const queue = [];
    let active = 0;
    let blocked = false;
    let timer;
    function parse(html, currency) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (doc.querySelector('#select-currency')?.value !== currency) throw new Error('Currency mismatch');
      const rows = [...doc.querySelectorAll('table tbody tr')].map(row => {
        const cell = row.cells[1];
        const amount = Number(cell?.getAttribute('data-sort'));
        const display = Number.isFinite(amount) ? new Intl.NumberFormat(doc.documentElement.lang || 'en', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(amount) : '';
        return { amount, display,
          name: row.querySelector('a[href^="/registrars/"]')?.textContent.trim(),
          coupon: row.querySelector('.coupon')?.textContent.trim() || '' };
      });
      const best = cheapest(rows);
      if (!best) throw new Error('No valid prices');
      return best;
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(render, 100); }
    async function pump() {
      if (blocked || active >= 2 || !queue.length) return;
      const { key, tld, currency } = queue.shift(); active++;
      try {
        // Request only the public suffix price table, never the searched domain.
        const response = await fetch(`/tlds/${encodeURIComponent(tld)}`, { credentials: 'same-origin', signal: AbortSignal.timeout(15000) });
        if ([403, 429].includes(response.status)) blocked = true;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        if (html.length > 2000000) throw new Error('Price table too large');
        const best = parse(html, currency);
        cache[key] = { ...best, fetchedAt: Date.now() };
        cache = Object.fromEntries(Object.entries(cache).sort((a, b) => b[1].fetchedAt - a[1].fetchedAt).slice(0, 200));
        await GM_setValue('namebetaTldPrices', cache);
      } catch { failed.add(key); }
      finally { pending.delete(key); active--; schedule(); pump(); }
    }
    function render() {
      observer.disconnect();
      const currency = document.querySelector('#select-currency')?.value;
      for (const row of document.querySelectorAll('#query-list dd')) {
        const anchor = row.querySelector('a.text-trim');
        if (!anchor) continue;
        const domain = [...anchor.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
        const tld = suffix(domain);
        const key = `${currency}:${tld}`;
        const price = cache[key];
        let badge = anchor.querySelector('.nbp-price');
        const age = Date.now() - price?.fetchedAt;
        const fresh = price && Number.isFinite(age) && age >= 0 && age < TTL;
        if (!row.classList.contains('available') || !tld || !currency || !fresh) badge?.remove();
        if (!row.classList.contains('available') || !tld || !currency) continue;
        if (fresh) {
          if (!badge) { badge = document.createElement('small'); badge.className = 'nbp-price'; anchor.append(badge); }
          badge.textContent = `from ${price.display} / yr`;
          badge.title = `Lowest listed standard .${tld} first-year price: ${price.name}${price.coupon ? ` · Coupon: ${price.coupon}` : ''}. Premium names, taxes and offer conditions may cost more. Source: NameBeta public price table. Fetched ${new Date(price.fetchedAt).toLocaleString()}.`;
        } else if (!pending.has(key) && !failed.has(key) && !blocked) {
          pending.add(key); queue.push({ key, tld, currency });
        }
      }
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      pump(); pump();
    }
    const observer = new MutationObserver(schedule);
    render();
    document.querySelector('#select-currency')?.addEventListener('change', schedule);
    setInterval(schedule, 60000);
  })().catch(error => console.warn('NameBeta Prices:', error.message));
})(globalThis);
