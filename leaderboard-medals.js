function applyLeaderboardMedals() {
  const leaderboard = document.getElementById("leaderboard");
  const rows = leaderboard?.querySelectorAll("tbody tr") || [];
  const medals = ["🥇", "🥈", "🥉"];

  rows.forEach((row, index) => {
    const positionCell = row.querySelector("td:first-child");
    if (!positionCell) return;
    positionCell.textContent = medals[index] || String(index + 1);
  });
}

const originalRenderLeaderboardForMedals = renderLeaderboard;
renderLeaderboard = async function () {
  await originalRenderLeaderboardForMedals();
  applyLeaderboardMedals();
};

document.addEventListener("DOMContentLoaded", applyLeaderboardMedals);
