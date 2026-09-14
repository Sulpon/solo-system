## Bundled Node.js runtime

`node.exe` in this directory is the official Node.js runtime (v24.18.0, Windows x64), bundled with Atlas Desktop so the app never depends on the end user's machine having Node.js installed or on `PATH`.

- Source: https://nodejs.org/ — official Windows x64 binary.
- License: MIT (Node.js Foundation / Joyent). Full license text: https://github.com/nodejs/node/blob/main/LICENSE
- Used exclusively to run Atlas's own bundled Next.js standalone server (`.next/standalone/server.js`) — see `src-tauri/src/lib.rs`'s `spawn_atlas_server`. Not exposed to the user, not used to run arbitrary scripts.

To update this binary (e.g. for a new Node LTS release), replace `node.exe` with the `node.exe` extracted from the official `node-vX.Y.Z-win-x64.zip` release archive and update the version above.
