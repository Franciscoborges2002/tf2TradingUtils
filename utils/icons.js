/**
 * Fetches a bundled SVG icon's markup (public/icons/<name>.svg) and
 * caches it — every caller that needs the same icon shares one fetch
 * instead of each re-requesting it. Returns raw markup text, meant for
 * `element.innerHTML`, not an `<img src>` — inlined this way, an icon's
 * own `stroke="currentColor"` still inherits the caller's CSS `color`
 * (and can be swapped by a class like `.done { color: ... }`), which a
 * referenced image never could.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 *
 * @param {string} name - icon file name, no ".svg" extension (e.g. "copy", "check")
 * @returns {Promise<string>}
 */
const iconSvgPromises = new Map();
export function loadIconSvg(name) {
  if (!iconSvgPromises.has(name)) {
    iconSvgPromises.set(
      name,
      fetch(chrome.runtime.getURL(`public/icons/${name}.svg`)).then((res) => res.text())
    );
  }
  return iconSvgPromises.get(name);
}
