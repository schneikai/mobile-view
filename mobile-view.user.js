// ==UserScript==
// @name         mobile-view
// @namespace    https://github.com/schneikai/mobile-view
// @version      5.0.0
// @description  Rotate a web app through phone / tablet / desktop viewports, one week each, so mobile layout bugs get noticed. A draggable button overrides the current week.
// @author       Kai
// @homepageURL  https://github.com/schneikai/mobile-view
// @supportURL   https://github.com/schneikai/mobile-view/issues
// @downloadURL  https://github.com/schneikai/mobile-view/raw/main/mobile-view.user.js
// @updateURL    https://github.com/schneikai/mobile-view/raw/main/mobile-view.user.js
// @include      /^https?:\/\/[^/]*bm-mifro[^/]*\.localhost(:\d+)?\//
// @run-at       document-start
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

/*
 * Rotation: ISO week mod 3 => phone, tablet, desktop (one week each).
 *
 * Phone / tablet weeks: the app's entry scripts are removed so it never boots in
 * the top window; instead a full-window iframe overlay holds a device-sized,
 * sandboxed copy of the app (its own viewport, so real media queries fire). The
 * tab keeps the real URL, so a browser refresh reloads and re-frames.
 * Desktop weeks: the app runs normally.
 *
 * A small draggable button opens a menu to switch view. A pick overrides the
 * current week only (kept in GM storage); next week the rotation resumes.
 *
 * Real narrow viewport (layout/breakpoints), not touch or device-pixel-ratio.
 */
(function () {
  'use strict';

  var MODES = ['phone', 'tablet', 'desktop'];
  var LABELS = {phone: 'Phone', tablet: 'Tablet', desktop: 'Desktop'};
  var DEVICES = {
    phone: {w: 390, h: 844}, // iPhone 12/13/14
    tablet: {w: 820, h: 1180}, // iPad Air
  };
  var ICONS = {
    phone:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>',
    tablet:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>',
    desktop:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="1"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  };
  var OVERRIDE_MODE_KEY = 'overrideMode';
  var OVERRIDE_WEEK_KEY = 'overrideWeek';
  var POS_LEFT_KEY = 'posLeft';
  var POS_TOP_KEY = 'posTop';

  var week = weekInfo();
  var overrideId = GM_getValue(OVERRIDE_WEEK_KEY, -1);
  var mode = overrideId === week.id ? GM_getValue(OVERRIDE_MODE_KEY, week.mode) : week.mode;
  if (MODES.indexOf(mode) < 0) mode = week.mode;

  if (mode === 'desktop') {
    onReady(function () {
      buildControl(mode);
    });
  } else {
    openShell(mode);
  }

  // Save the override for this week and reload so the new mode takes effect.
  function setMode(m) {
    GM_setValue(OVERRIDE_MODE_KEY, m);
    GM_setValue(OVERRIDE_WEEK_KEY, week.id);
    location.reload();
  }

  // Show the device frame without navigating away, so the tab keeps the real app
  // URL (refresh works). Remove the app's entry scripts at parse time so it never
  // boots in the top window, then cover the tab with a blob-document iframe that
  // holds the sandboxed, device-sized app. A live iframe overlay paints reliably,
  // unlike rebuilding the document in place.
  function openShell(deviceMode) {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.tagName === 'SCRIPT' && (node.type === 'module' || /\/bundles\//.test(node.src || ''))) {
            node.remove();
          }
        });
      });
    });
    observer.observe(document.documentElement, {childList: true, subtree: true});

    onReady(function () {
      observer.disconnect();
      var appUrl = location.origin + location.pathname + location.search;
      var shellUrl = URL.createObjectURL(
        new Blob([shellHtml(appUrl, deviceMode)], {type: 'text/html'})
      );
      var wrap = document.createElement('iframe');
      wrap.id = 'bmvp-overlay';
      wrap.setAttribute(
        'style',
        'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483646;background:#1e1e24;'
      );
      wrap.src = shellUrl;
      document.body.appendChild(wrap);
      buildControl(deviceMode);
    });
  }

  function shellHtml(appUrl, deviceMode) {
    var dev = DEVICES[deviceMode];
    var app = JSON.stringify(appUrl);
    var css =
      'html,body{margin:0;height:100%;box-sizing:border-box;padding:16px;background:#1e1e24;' +
      'display:flex;align-items:center;justify-content:center;overflow:auto;}' +
      '#frame{background:#fff;border:0;border-radius:24px;box-shadow:0 12px 40px rgba(0,0,0,.5);}';
    // Cage the app: no 'allow-top-navigation', so its auth-error redirect can't
    // escape the frame.
    var sandbox =
      'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-storage-access-by-user-activation';
    return (
      '<!DOCTYPE html><html><head><meta charset="utf-8" />' +
      '<title>BM · ' + LABELS[deviceMode] + ' view</title><style>' + css + '</style></head>' +
      '<body><iframe id="frame" sandbox="' + sandbox + '" width="' + dev.w + '" height="' + dev.h + '" src=' + app + '></iframe></body></html>'
    );
  }

  // A draggable round button that opens a Phone/Tablet/Desktop menu. Used in both
  // the overlay and desktop views (it always lives in the top document).
  function buildControl(currentMode) {
    var style = document.createElement('style');
    style.textContent = [
      '#bmvp-fab{position:fixed;z-index:2147483647;width:44px;height:44px;border-radius:50%;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;}',
      '#bmvp-fab:hover{background:#3b82f6;}',
      '#bmvp-fab svg{width:22px;height:22px;pointer-events:none;}',
      '#bmvp-menu{position:fixed;z-index:2147483647;min-width:150px;background:#111;border-radius:10px;padding:4px;font:500 13px/1 system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;gap:2px;}',
      '#bmvp-menu[hidden]{display:none;}',
      '#bmvp-menu button{display:flex;align-items:center;gap:10px;background:transparent;color:#fff;border:0;border-radius:7px;padding:9px 14px 9px 11px;text-align:left;font:inherit;cursor:pointer;}',
      '#bmvp-menu button.active{background:#1d4ed8;}',
      '#bmvp-menu button:hover{background:#3b82f6;}',
      '#bmvp-menu svg{width:18px;height:18px;flex:0 0 auto;}',
    ].join('');
    document.head.appendChild(style);

    var fab = document.createElement('div');
    fab.id = 'bmvp-fab';
    fab.title = LABELS[currentMode] + ' view — click to change, drag to move';
    fab.innerHTML = ICONS[currentMode];

    var menu = document.createElement('div');
    menu.id = 'bmvp-menu';
    menu.hidden = true;
    MODES.forEach(function (m) {
      var b = document.createElement('button');
      if (m === currentMode) b.className = 'active';
      b.innerHTML = ICONS[m] + '<span>' + LABELS[m] + '</span>';
      b.onclick = function (e) {
        e.stopPropagation();
        setMode(m);
      };
      menu.appendChild(b);
    });

    document.body.append(fab, menu);
    placeFab(fab);

    var dragging = false;
    var moved = false;
    var startX = 0;
    var startY = 0;
    var offX = 0;
    var offY = 0;
    var shield = null;
    var backdrop = null;

    fab.addEventListener('mousedown', function (e) {
      e.preventDefault();
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      var r = fab.getBoundingClientRect();
      offX = e.clientX - r.left;
      offY = e.clientY - r.top;
      // A shield keeps mouse events from being swallowed by the app iframe.
      shield = document.createElement('div');
      shield.setAttribute('style', 'position:fixed;inset:0;z-index:2147483646;cursor:pointer;');
      document.body.appendChild(shield);
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      if (!moved && Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) < 4) return;
      moved = true;
      var left = Math.max(4, Math.min(window.innerWidth - 48, e.clientX - offX));
      var top = Math.max(4, Math.min(window.innerHeight - 48, e.clientY - offY));
      fab.style.left = left + 'px';
      fab.style.top = top + 'px';
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      if (shield) {
        shield.remove();
        shield = null;
      }
      if (moved) {
        closeMenu();
        var r = fab.getBoundingClientRect();
        GM_setValue(POS_LEFT_KEY, Math.round(r.left));
        GM_setValue(POS_TOP_KEY, Math.round(r.top));
      } else {
        toggleMenu();
      }
    });

    function closeMenu() {
      menu.hidden = true;
      if (backdrop) {
        backdrop.remove();
        backdrop = null;
      }
    }

    function toggleMenu() {
      if (!menu.hidden) {
        closeMenu();
        return;
      }
      menu.hidden = false; // unhide first so it can be measured
      var r = fab.getBoundingClientRect();
      var top = r.top - menu.offsetHeight - 8;
      if (top < 4) top = r.bottom + 8;
      var center = r.left + r.width / 2 - menu.offsetWidth / 2;
      var left = Math.max(4, Math.min(window.innerWidth - menu.offsetWidth - 4, center));
      menu.style.left = left + 'px';
      menu.style.top = top + 'px';
      // Catch outside clicks even over the app iframe, which wouldn't bubble here.
      backdrop = document.createElement('div');
      backdrop.setAttribute('style', 'position:fixed;inset:0;z-index:2147483646;');
      backdrop.addEventListener('click', closeMenu);
      document.body.appendChild(backdrop);
    }

    function placeFab(el) {
      var left = GM_getValue(POS_LEFT_KEY, null);
      var top = GM_getValue(POS_TOP_KEY, null);
      if (left !== null && top !== null) {
        el.style.left = Math.max(4, Math.min(window.innerWidth - 48, left)) + 'px';
        el.style.top = Math.max(4, Math.min(window.innerHeight - 48, top)) + 'px';
      } else {
        el.style.left = '16px';
        el.style.bottom = '16px';
      }
    }
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  // ISO week: returns a stable id (isoYear*100 + week) and the rotation mode.
  function weekInfo() {
    var d = new Date();
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
    return {id: t.getUTCFullYear() * 100 + weekNo, mode: MODES[weekNo % 3]};
  }
})();
