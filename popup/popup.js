(() => {
  const { version } = chrome.runtime.getManifest();
  const badge = document.getElementById("version-badge");
  if (badge) badge.textContent = `v${version}`;
})();

document.addEventListener("DOMContentLoaded", async () => {
  const hostEl      = document.getElementById("host");
  const scriptListEl = document.getElementById("scripts-list");
  const statusBadge  = document.getElementById("status-badge");

  function setInactive(message) {
    // Badge
    statusBadge.textContent = "inactive";
    statusBadge.className   = "badge badge--inactive";

    // Body
    scriptListEl.innerHTML = `
      <div id="inactive-state">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>${message}</p>
      </div>`;
  }

  function setActive(site, scripts) {
    // Badge
    statusBadge.textContent = "active";
    statusBadge.className   = "badge badge--active";

    // Host label
    if (hostEl) hostEl.textContent = site;

    // Script rows
    scriptListEl.innerHTML = "";

    scripts.forEach((script) => {
      const [name, repoUrl] = script;

      const wrapper = document.createElement("div");
      wrapper.className = "script-item";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = name;

      const link = document.createElement("a");
      link.href   = repoUrl;
      link.target = "_blank";
      link.rel    = "noopener noreferrer";
      link.title  = "View on GitHub";

      const icon = document.createElement("img");
      icon.src       = "../public/logos/github.svg";
      icon.alt       = "GitHub";
      icon.className = "gh-icon";

      link.appendChild(icon);
      wrapper.appendChild(nameSpan);
      wrapper.appendChild(link);
      scriptListEl.appendChild(wrapper);
    });
  }

  // Loading state
  scriptListEl.innerHTML = `<div id="inactive-state"><p>Loading…</p></div>`;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setInactive("No active tab.");
    return;
  }

  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: "GET_LOADED_SCRIPTS" });

    if (chrome.runtime.lastError || !resp) {
      setInactive("Extension not active in this tab.");
      return;
    }

    if (!resp.scripts?.length) {
      setInactive("No active scripts on this page.");
      return;
    }

    setActive(resp.site, resp.scripts);

  } catch {
    setInactive("Extension not active in this tab.");
  }
});