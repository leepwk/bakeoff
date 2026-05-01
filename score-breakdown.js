async function renderScoreBreakdown() {
  const leaderboardEl = document.getElementById("leaderboard");
  if (!leaderboardEl || !window.state?.supabase) return;

  let el = document.getElementById("scoreBreakdown");
  if (!el) {
    el = document.createElement("div");
    el.id = "scoreBreakdown";
    leaderboardEl.insertAdjacentElement("afterend", el);
  }

  try {
    const [predictionsRes, resultsRes] = await Promise.all([
      state.supabase
        .from("predictions")
        .select("player_id, week_id, technical_winner_baker_id, star_baker_id, eliminated_baker_id, handshake_baker_id, players(name)"),
      state.supabase
        .from("results")
        .select("id, week_id, technical_winner_baker_id, star_baker_id, eliminated_baker_id"),
    ]);

    if (predictionsRes.error) throw predictionsRes.error;
    if (resultsRes.error) throw resultsRes.error;

    const results = resultsRes.data || [];
    if (!results.length) {
      el.innerHTML = "";
      return;
    }

    const resultIds = results.map((result) => result.id);
    const handshakesRes = await state.supabase
      .from("result_handshakes")
      .select("result_id, baker_id")
      .in("result_id", resultIds);
    if (handshakesRes.error) throw handshakesRes.error;

    const resultsByWeek = new Map(results.map((result) => [result.week_id, result]));
    const handshakesByResult = new Map();
    for (const handshake of handshakesRes.data || []) {
      const ids = handshakesByResult.get(handshake.result_id) || new Set();
      ids.add(handshake.baker_id);
      handshakesByResult.set(handshake.result_id, ids);
    }

    const totalsByPlayer = new Map();
    for (const prediction of predictionsRes.data || []) {
      const result = resultsByWeek.get(prediction.week_id);
      if (!result) continue;

      const playerName = prediction.players?.name || "Unknown player";
      const row = totalsByPlayer.get(prediction.player_id) || {
        playerName,
        technical: 0,
        star: 0,
        eliminated: 0,
        handshake: 0,
      };

      if (prediction.technical_winner_baker_id && prediction.technical_winner_baker_id === result.technical_winner_baker_id) row.technical += 2;
      if (prediction.star_baker_id && prediction.star_baker_id === result.star_baker_id) row.star += 2;
      if (prediction.eliminated_baker_id && prediction.eliminated_baker_id === result.eliminated_baker_id) row.eliminated += 2;

      const actualHandshakes = handshakesByResult.get(result.id) || new Set();
      if (prediction.handshake_baker_id && actualHandshakes.has(prediction.handshake_baker_id)) row.handshake += 5;

      totalsByPlayer.set(prediction.player_id, row);
    }

    const rows = Array.from(totalsByPlayer.values())
      .map((row) => ({ ...row, total: row.technical + row.star + row.eliminated + row.handshake }))
      .sort((a, b) => b.total - a.total || a.playerName.localeCompare(b.playerName));

    el.innerHTML = rows.length
      ? `<h3>Score breakdown</h3><table><thead><tr><th>Player</th><th>Technical</th><th>Star baker</th><th>Eliminated</th><th>Handshake</th><th>Total</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.playerName)}</td><td>${row.technical}</td><td>${row.star}</td><td>${row.eliminated}</td><td>${row.handshake}</td><td>${row.total}</td></tr>`).join("")}</tbody></table>`
      : "";
  } catch (err) {
    el.innerHTML = `<p class="status error">${escapeHtml(err.message || "Could not load score breakdown.")}</p>`;
  }
}

const scoreBreakdownRenderLeaderboard = renderLeaderboard;
renderLeaderboard = async function () {
  await scoreBreakdownRenderLeaderboard();
  await renderScoreBreakdown();
};
