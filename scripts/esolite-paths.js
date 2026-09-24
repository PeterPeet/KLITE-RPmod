// Where the Esolite host lives. RPmod targets the current Esobold (Jaxxks' esolithe/esobold,
// branch remoteManagement), used from a local clone:
//   ESOBOLD_DIR  the Esobold clone             (default: ../esobold next to this repo)
//   ESOLITE_DIR  the built Esolite site we run  (default: ~/.cache/klite-rpmod/esolite)
// The built site is a copy of the clone, made by `npm run build:host` exactly like Esobold's
// updateHTML workflow (docs/ + embd_res/* -> static/, klite.embd -> index.html), so it
// contains whatever branch the clone has checked out, including unmerged changes. It is
// kept outside the repo and iCloud (about 250 MB).
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ESOBOLD_DIR = path.resolve(process.env.ESOBOLD_DIR || path.join(ROOT, '..', 'esobold'));
const ESOLITE_DIR = path.resolve(process.env.ESOLITE_DIR || path.join(os.homedir(), '.cache', 'klite-rpmod', 'esolite'));

module.exports = { ROOT, ESOBOLD_DIR, ESOLITE_DIR };
