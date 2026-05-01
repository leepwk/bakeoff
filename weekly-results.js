async function renderActualResults() {
  const el = document.getElementById("actualResults");
  if (!el) return;

  try {
    const resultsRes = await state.supabase
      .from("results")
      .select("id, week_id, technical_winner_baker_id, star_baker_id, eliminated_baker_id");
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

    const bakerName = (id) => state.bakers.find((baker) => baker.id === id)?.name || "";
    const weekLabel = (id) => {
      const week = state.weeks.find((w) => w.id === id);
      return week ? `Week ${week.week_number} - ${week.title}` : "";
    };

    const handshakesByResult = new Map();
    for (const handshake of handshakesRes.data || []) {
      const names = handshakesByResult.get(handshake.result_id) || [];
      const name = bakerName(handshake.baker_id);
      if (name) names.push(name);
      handshakesByResult.set(handshake.result_id, names);
    }

    const rows = results
      .filter((result) =>
        result.technical_winner_baker_id ||
        result.star_baker_id ||
        result.eliminated_baker_id ||
        (handshakesByResult.get(result.id) || []).length
      )
      .sort((a, b) => {
        const weekA = state.weeks.find((week) => week.id === a.week_id)?.week_number || 0;
        const weekB = state.weeks.find((week) => week.id === b.week_id)?.week_number || 0;
        return weekA - weekB;
      });

    el.innerHTML = rows.length
      ? `<h3>Actual results</h3><table><thead><tr><th>Week</th><th>Technical</th><th>Star baker</th><th>Eliminated</th><th>Hollywood handshakes</th></tr></thead><tbody>${rows.map((result) => `<tr><td>${escapeHtml(weekLabel(result.week_id))}</td><td>${escapeHtml(bakerName(result.technical_winner_baker_id) || "Not set")}</td><td>${escapeHtml(bakerName(result.star_baker_id) || "Not set")}</td><td>${escapeHtml(bakerName(result.eliminated_baker_id) || "Not set")}</td><td>${escapeHtml((handshakesByResult.get(result.id) || []).join(", ") || "None")}</td></tr>`).join("")}</tbody></table>`
      : "";
  } catch (err) {
    el.innerHTML = `<p class="status error">${escapeHtml(err.message || "Could not load actual results.")}</p>`;
  }
}

const originalRenderLeaderboard = renderLeaderboard;
renderLeaderboard = async function () {
  await originalRenderLeaderboard();
  await renderActualResults();
};
