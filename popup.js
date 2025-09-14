async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function main() {
  const statusEl = document.getElementById("status");
  const hostEl = document.getElementById("host");
  const activeEl = document.getElementById("active");
  const listEl = document.getElementById("features");

  const tab = await getActiveTab();
  if (!tab?.id) {
    statusEl.textContent = "No active tab.";
    return;
  }

  // Ask the content script on this tab for its status
  chrome.tabs.sendMessage(tab.id, { type: "tf2utils:getStatus" }, (resp) => {
    if (chrome.runtime.lastError) {
      statusEl.textContent = "Extension not active on this page.";
      return;
    }

    hostEl.textContent = resp.hostname || "";
    listEl.innerHTML = "";

    if (resp.active) {
      statusEl.textContent = "This page is using:";
      activeEl.style.display = "inline-block";
      (resp.features || []).forEach((f) => {
        const li = document.createElement("li");
        li.textContent = f;
        listEl.appendChild(li);
      });
    } else {
      activeEl.style.display = "none";
      statusEl.textContent = "Loaded, but no scripts registered.";
    }
  });
}

main();