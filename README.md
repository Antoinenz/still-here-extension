# Still Here

Chrome extension (MV3) that makes pages think you never left: it spoofs tab focus and
visibility, window resize, fullscreen and other annoying browser detectors.

Status: early development. Implemented so far: focus / visibility spoofing.

## Develop

```sh
npm run build        # writes extension/main.js
```

Open `chrome://extensions`, enable Developer mode, "Load unpacked" and pick the `extension/`
folder. Open `test/detector-page.html` (allow file access for the extension, or serve it with
`python3 -m http.server`) and switch tabs: no `LEAK` lines should appear.

## Limits

Server-side signals and OS-level proctoring software cannot be spoofed by a page script.
Chrome's own background throttling still happens; we only hide it from page scripts. Meant for
removing annoyances and for privacy, not for cheating on proctored exams.
