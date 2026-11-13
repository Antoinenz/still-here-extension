# Hosting the test page on the web LXC (114)

The test page is static (`testpage/index.html` + `app.js`) and `testpage/server.mjs` serves it with
no dependencies. Same pattern as the other apps on LXC 114: own user, own port, systemd unit,
Cloudflare tunnel route.

Steps (need approval: new user/port on the guest and a tunnel route + DNS name):

1. In LXC 114: `adduser --disabled-password stillhere`, then as that user
   `git clone https://github.com/Antoinenz/still-here-extension` (needs `node` 18+).
2. `cp deploy/still-here-test.service /etc/systemd/system/`, `systemctl enable --now still-here-test`.
3. Check `curl -I http://127.0.0.1:43130/`.
4. Add a public hostname in the AKL_104 tunnel (e.g. `stillhere.tachyon-studios.com` -> `http://192.168.1.114:43130`).
5. Update: `sudo -u stillhere git -C ~stillhere/still-here-extension pull` (no restart needed, files are read per request).

Run it anywhere else with `npm run serve:testpage`.
