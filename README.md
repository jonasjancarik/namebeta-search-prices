# NameBeta Search Prices

A standalone userscript that shows the lowest listed registration price beneath available domains in [NameBeta](https://namebeta.com/) search results.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) in your browser.
2. [Install the userscript](https://raw.githubusercontent.com/jonasjancarik/namebeta-search-prices/main/namebeta-search-prices.user.js). Your userscript manager should show an installation prompt. If it shows plain text instead, import this URL or the downloaded file through the manager.
3. Reload NameBeta and search for a domain.

Use either this script or the NameBeta feature of the Domainr Prices browser extension; enabling both can duplicate requests. The script includes update URLs so your manager can check future versions on GitHub.

## What it shows

Available search results receive a `from PRICE / yr` label. The script compares every registrar in NameBeta’s public price table for that suffix, including offers not visible in the first six registrar cards. Hover over the label to see the registrar, any coupon and the time the table was fetched.

These are standard advertised prices. Premium names, taxes, minimum registration terms and offer conditions can change the final checkout price. Unknown, taken and for-sale results get no label. The selected NameBeta currency is preserved.

## Requests and caching

The script only runs on `https://namebeta.com/*`. It requests NameBeta’s public `/tlds/SUFFIX` price pages, with at most two requests at once. It sends the suffix, not the searched domain, in these additional requests. NameBeta’s own search still operates normally.

Prices are stored in your userscript manager for six hours per suffix and currency. Expired labels disappear if a refresh fails. A 403 or 429 response stops further price-table requests for that tab. No API keys, GitHub price feed or server are required.

The only userscript grants are `GM_getValue` and `GM_setValue`, used for that cache. The script does not load remote JavaScript.

## Verification

The standalone script was tested against live NameBeta in Chromium without the browser extension. The userscript-manager storage functions were emulated to verify price labels, persistence and cache reuse after a reload. Installation through an actual Tampermonkey or Violentmonkey manager has not been tested.
