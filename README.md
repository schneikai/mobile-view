# mobile-view

A [Tampermonkey](https://www.tampermonkey.net/) userscript that rotates a web app between
phone, tablet, and desktop viewports, one week each, so mobile layout bugs get noticed during
desktop work.

It renders the app in a real device-sized frame, so actual CSS media queries fire. It does not
emulate touch or device pixel ratio (use DevTools for that).

## Install

1. Install the Tampermonkey extension. On Chrome/Brave, also enable **Developer mode** in the
   extensions page.
2. Open [mobile-view.user.js](https://github.com/schneikai/mobile-view/raw/main/mobile-view.user.js)
   and confirm the install. Updates are pulled automatically.
3. Edit the `@include` line at the top of the script to match your dev server URL.

## Use

- A round button (bottom-left) shows the current view. Click it to pick another; drag to move it.
- A pick overrides the current week only; next week the rotation resumes.

## Config

At the top of the script: `DEVICES` (sizes), `weekInfo()` (the rotation), `@include` (URL match).
