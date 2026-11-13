# Still Here

Chrome extension (MV3) that makes pages think you never left. It spoofs the things sites use to
watch you: tab focus and visibility, window resize and DevTools size checks, fullscreen, mouse
leaving the page, copy/paste/right-click blocks, "leave site?" prompts, idle and multi-screen APIs.

Each detector can be switched per site from the toolbar popup. A badge shows how many detections
were defeated on the tab.

| Detector | Setting | What it does |
|---|---|---|
| Tab focus and visibility | on/off | `hidden`, `visibilityState`, `hasFocus()` always say visible and focused; blur/focus/visibilitychange events are swallowed |
| Mouse leaving the page | on/off | hides `mouseout`/`mouseleave` to outside the window (exit-intent popups) |
| Window size and DevTools | off / normalise / freeze | normalise makes outer size look like a normal window; freeze pins sizes and drops resize events |
| Fullscreen | off / hide / fake | hide reports not fullscreen; fake pretends `requestFullscreen()` worked without going fullscreen |
| Copy/paste/select blocks | on/off | stops page handlers for copy, cut, contextmenu, selectstart, dragstart, paste into plain inputs; forces text selection |
| "Leave site?" prompts | on/off | suppresses `beforeunload` |
| Idle and multi-screen | on/off | `IdleDetector` denied, `screen.isExtended` false, `getScreenDetails()` denied |

Defaults: focus, mouse and misc on; the rest off (they can change how sites behave).

## Develop

```sh
npm run build   # generates extension/main.js, bridge.js, defaults.js (fresh random channel token)
npm test        # build + logic test against stubbed DOM classes
npm run pack    # still-here.zip of extension/
```

Open `chrome://extensions`, enable Developer mode, "Load unpacked", pick `extension/`.
Note: branded Chrome 137+ ignores `--load-extension` on the command line, so load it from the page.

## Test page

`testpage/` is a static page with a section per detector, ground-truth readouts next to what the
page can see, and stealth probes (does the patched API still look native?). Run it locally with
`npm run serve:testpage` (port 43130). `deploy/README.md` covers hosting it on the web LXC.

With the extension off you should see DETECTED; with it on and the matching setting enabled,
HIDDEN / PASS.

## How it works

A MAIN-world content script runs at `document_start` in every frame and patches prototype getters
and methods (descriptor shape kept, `toString` masked, error stacks cleaned). An isolated-world
bridge reads settings from `chrome.storage.local` and sends them to the page script over a
`CustomEvent` whose name contains a per-build random token; hit counts return the same way to the
service worker, which drives the badge.

## Limits

- Server-side signals and OS-level proctoring software cannot be spoofed by a page script.
- Chrome's own background throttling still happens; we only hide it from page scripts.
- Cross-realm `toString` probes (`iframe.contentWindow.Function.prototype.toString.call(getter)`)
  can still reveal a patched getter.
- The bridge token is fixed for a build, so a build someone else made is not secret to a page that
  has read its source.
- Meant for removing annoyances and for privacy, not for cheating on proctored exams.
