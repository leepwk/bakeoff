const originalStartAppForDefaultTab = startApp;
startApp = async function () {
  await originalStartAppForDefaultTab();
  switchTab("leaderboard");
};
