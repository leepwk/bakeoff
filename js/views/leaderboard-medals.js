function applyLeaderboardMedals() {
  const leaderboard = document.getElementById("leaderboard");
  const rows = leaderboard?.querySelectorAll("tbody tr") || [];
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

  rows.forEach((row) => {
    const positionCell = row.querySelector("td:first-child");
    if (!positionCell) return;
    const position = Number(positionCell.textContent);
    const medal = medals[position];
    positionCell.innerHTML = medal
      ? `<span class="position-medal" aria-label="Position ${position}">${medal}</span>`
      : String(position);
  });
}

document.addEventListener("DOMContentLoaded", applyLeaderboardMedals);
