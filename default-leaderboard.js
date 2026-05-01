function makeLeaderboardFirst() {
  const tabs = document.querySelector(".tabs");
  const leaderboardButton = document.querySelector('[data-tab="leaderboard"]');
  const entryButton = document.querySelector('[data-tab="entry"]');
  const appView = document.getElementById("appView");
  const leaderboardTab = document.getElementById("leaderboardTab");
  const entryTab = document.getElementById("entryTab");

  if (tabs && leaderboardButton && entryButton) {
    tabs.insertBefore(leaderboardButton, entryButton);
  }

  if (appView && leaderboardTab && entryTab) {
    appView.insertBefore(leaderboardTab, entryTab);
  }

  leaderboardButton?.classList.add("active");
  entryButton?.classList.remove("active");
  leaderboardTab?.classList.remove("hidden");
  entryTab?.classList.add("hidden");
}

const originalSwitchTabForDefaultTab = switchTab;
switchTab = function (tabName) {
  if (tabName === "entry" && state.currentUser && !document.body.dataset.defaultTabApplied) {
    document.body.dataset.defaultTabApplied = "true";
    return originalSwitchTabForDefaultTab("leaderboard");
  }
  return originalSwitchTabForDefaultTab(tabName);
};

document.addEventListener("DOMContentLoaded", makeLeaderboardFirst);
