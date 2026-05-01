function moveAllPicksToOwnTab() {
  const tabs = document.querySelector(".tabs");
  const entryButton = document.querySelector('[data-tab="entry"]');
  const leaderboardTab = document.getElementById("leaderboardTab");
  const allPredictions = document.getElementById("allPredictions");
  if (!tabs || !entryButton || !leaderboardTab || !allPredictions || document.getElementById("allPicksTab")) return;

  const oldHeading = Array.from(document.querySelectorAll("#leaderboardTab h3"))
    .find((heading) => heading.textContent.trim().toLowerCase() === "all picks");
  oldHeading?.remove();

  const allPicksButton = document.createElement("button");
  allPicksButton.className = "tab";
  allPicksButton.dataset.tab = "allPicks";
  allPicksButton.type = "button";
  allPicksButton.textContent = "All picks";
  allPicksButton.addEventListener("click", () => switchTab("allPicks"));
  entryButton.insertAdjacentElement("afterend", allPicksButton);

  const allPicksTab = document.createElement("section");
  allPicksTab.id = "allPicksTab";
  allPicksTab.className = "tab-panel card hidden";
  allPicksTab.innerHTML = `<div class="section-title"><h2>All picks</h2><button id="refreshAllPicksButton" class="secondary" type="button">Refresh</button></div>`;
  allPicksTab.appendChild(allPredictions);
  leaderboardTab.insertAdjacentElement("afterend", allPicksTab);

  document.getElementById("refreshAllPicksButton")?.addEventListener("click", () => renderAllPicks?.());
}

const originalSwitchTabForAllPicks = switchTab;
switchTab = function (tabName) {
  const result = originalSwitchTabForAllPicks(tabName);
  if (tabName === "allPicks") renderAllPicks?.();
  return result;
};

document.addEventListener("DOMContentLoaded", moveAllPicksToOwnTab);
