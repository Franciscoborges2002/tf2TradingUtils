# Scripts

Developer tooling for this repo — not part of the extension itself (nothing here is referenced by `manifest.json` or loaded at runtime).

[changeLog](./CHANGELOG.md)

| Name | What it does | Link | Change log |
| ---- | ------------- | ---- | ---------- |
| package-extension | Packages the extension into a `.zip` ready for Chrome Web Store / Firefox Add-ons submission | [package-extension.sh](./package-extension.sh) | [changelog](./CHANGELOG.md) |

## package-extension.sh

```
./scripts/package-extension.sh
```

Copies every git-tracked file into a clean staging directory — except `CHANGELOG.md`/`README.md`/`INSTALL.md`, `.gitignore`, `public/promotional/` (store-listing screenshots, not used by the extension itself), `.github/` (CI workflows, issue templates), and `website/` (the project's landing page) — then zips it with `manifest.json` at the archive's root, as both stores require.

Output: `dist/tf2TradingUtils-v<version>.zip`, versioned straight from `manifest.json`. `dist/` is gitignored.

Only considers git-tracked files, so local scratch files and editor configs are excluded automatically — but it packages whatever's currently on disk for those tracked files, uncommitted edits included, not just what's in `HEAD`. The script warns (without stopping) if the working tree isn't clean.
