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

  /* Get the current tab to get theloaded scripts */
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab?.id) {
    scriptListEl.textContent = "No active tab.";
    return;
  }

  try {
    /* Get the loaded scripts from the page content.js */
    const resp = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_LOADED_SCRIPTS",
    });

    /*No script was found */
    if (chrome.runtime.lastError) {
      container.textContent = "No content script detected on this page.";
      return;
    }

    /* Nothing was loaded */
    if (!resp || !resp.scripts?.length) {
      scriptListEl.textContent = "No active scripts found.";
      return;
    }

    hostEl.textContent = resp.site;
    scriptListEl.innerHTML = "";

    console.log(resp.scripts);

    resp.scripts.forEach((script) => {
      console.log("script", script); // will log the array

      // unpack [name, url]
      const [name, repoUrl] = script;

      const wrapper = document.createElement("div");
      wrapper.className = "script-item";

      // Script name
      const nameSpan = document.createElement("span");
      nameSpan.textContent = name;

      // GitHub link
      const link = document.createElement("a");
      link.href = repoUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = "View script on GitHub";

      // GitHub icon (store this file in your extension, e.g. public/logos/github.svg)
      const icon = document.createElement("img");
      icon.src = "../public/logos/github.svg"; // path must be correct relative to popup.html
      icon.alt = "GitHub";
      icon.className = "gh-icon";

      link.appendChild(icon);

      wrapper.appendChild(nameSpan);
      wrapper.appendChild(link);
      scriptListEl.appendChild(wrapper);
    });
  } catch (err) {
    scriptListEl.textContent =
      "No response from content script. Maybe not injected yet?";
    console.warn("[Popup]", err);
  }
});
