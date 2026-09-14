# mobile-view

A small [Tampermonkey](https://www.tampermonkey.net/) userscript that forces the bettermarks
dev server into a phone or tablet viewport on a rotating schedule, so mobile layout bugs get
noticed during normal desktop development.

It runs only in your browser. Nothing is added to the app or the repo.

## What it does

- Rotates the view every week: **phone → tablet → desktop**, one week each (based on the ISO week number).
- On a phone or tablet week it renders the app inside a real device-sized frame, so actual CSS
  media queries and breakpoints fire (not just a narrow box).
- A small round button (bottom-left by default) lets you switch the view by hand. That override
  applies to the current week only, then it snaps back to the rotation next week.
- The button is draggable and remembers where you put it.

It gives you a real narrow viewport for layout and breakpoint testing. It does not emulate touch
or device pixel ratio. For those, use the browser DevTools device mode.

## Install

1. Install the **Tampermonkey** browser extension.
   - Chrome / Brave / Edge: from the Chrome Web Store.
   - On Brave/Chrome you also need to enable **Developer mode** in the extensions page
     (`brave://extensions` or `chrome://extensions`) so userscripts can run.
2. Open the raw script to install it in one click:
   [mobile-view.user.js](https://github.com/schneikai/mobile-view/raw/main/mobile-view.user.js).
   Tampermonkey shows an install page. Confirm.
3. Open any dev server URL. The script matches every Paseo worktree
   (`*bm-mifro*.localhost`), so it works across all of them without setup.

Updates: the script points its update URL at this repo, so Tampermonkey picks up new versions
automatically. To update by hand, open the raw link again.

## Use

- The round button shows the current view (phone, tablet, or desktop icon).
- Click it to open the menu and pick a view. The selected view is highlighted; hover is a
  lighter blue.
- Click the button again, or click anywhere outside the menu, to close it.
- Drag the button anywhere. Its position is remembered across reloads and across all worktrees.

A picked view is an override for the current week. Next week the rotation takes over again.

## How it works

- On phone/tablet weeks the script removes the app's entry scripts so the app never boots in the
  top window, then overlays a full-window iframe that holds a sandboxed, device-sized copy of the
  app. The tab keeps the real app URL, so a normal browser refresh just reloads and re-frames.
- The frame is sandboxed without top-navigation, so the app cannot redirect the whole tab out of
  the frame.
- Settings (the weekly override and the button position) live in the userscript's own storage
  (`GM_setValue`), which survives the changing per-worktree URLs.

## Configuration

Everything is at the top of `mobile-view.user.js`:

- `DEVICES` — the phone and tablet pixel sizes.
- `weekInfo()` — the rotation. It maps `ISO week mod 3` to `['phone', 'tablet', 'desktop']`.
  Change the order or the modulo if you want a different cadence.
- `@include` — the URL pattern. Adjust it if your dev URLs look different.
