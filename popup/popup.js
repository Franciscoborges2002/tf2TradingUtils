(() => {
  const { version } = chrome.runtime.getManifest();
  const badge = document.getElementById("version-badge");
  if (badge) badge.textContent = `v${version}`;
})();

/*
 * To get the scripts loaded from a website
 */
document.addEventListener("DOMContentLoaded", async () => {
  const hostEl = document.getElementById("host"); //page hostname
  const scriptListEl = document.getElementById("scripts-list");
  scriptListEl.textContent = "Loading...";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab?.id) {
    scriptListEl.textContent = "No active tab.";
    return;
  }

  try {
    const resp = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_LOADED_SCRIPTS",
    });

    if (chrome.runtime.lastError) {
        container.textContent = "No content script detected on this page.";
        return;
      }

    if (!resp || !resp.scripts?.length) {
      scriptListEl.textContent = "No active scripts found.";
      return;
    }

    hostEl.innerHTML = `${resp.site}`;
    scriptListEl.innerHTML = "";

    resp.scripts.forEach((name) => {
      const sEl = document.createElement("div");
      sEl.textContent = `${name}`;
      scriptListEl.appendChild(sEl);
    });
  } catch (err) {
    scriptListEl.textContent =
      "No response from content script. Maybe not injected yet?";
    console.warn("[Popup]", err);
  }
});
