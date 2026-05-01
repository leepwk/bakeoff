async function renderAllPicks() {
  const all = $("allPredictions");
  if (!all) return;

  all.innerHTML = `<p class="muted">Loading...</p>`;

  try {
    const predictionsRes = await state.supabase
      .from("predictions")
      .select(`id,players(name),weeks(week_number,title),technical:bakers!predictions_technical_winner_baker_id_fkey(name),star:bakers!predictions_star_baker_id_fkey(name),eliminated:bakers!predictions_eliminated_baker_id_fkey(name),handshake:bakers!predictions_handshake_baker_id_fkey(name)`)
      .order("created_at", { ascending: false });

    if (predictionsRes.error) throw predictionsRes.error;

    const picks = predictionsRes.data || [];
    all.innerHTML = picks.length
      ? `<table><thead><tr><th>Player</th><th>Week</th><th>Technical</th><th>Star baker</th><th>Eliminated</th><th>Handshake</th></tr></thead><tbody>${picks.map((p) => `<tr><td>${escapeHtml(p.players?.name || "")}</td><td>Week ${p.weeks?.week_number || ""} - ${escapeHtml(p.weeks?.title || "")}</td><td>${escapeHtml(p.technical?.name || "")}</td><td>${escapeHtml(p.star?.name || "")}</td><td>${escapeHtml(p.eliminated?.name || "")}</td><td>${escapeHtml(p.handshake?.name || "No guess")}</td></tr>`).join("")}</tbody></table>`
      : `<p class="muted">No picks entered yet.</p>`;
  } catch (err) {
    all.innerHTML = `<p class="status error">${escapeHtml(err.message || "Could not load all picks.")}</p>`;
  }
}

renderLeaderboard = async function () {
  const lb = $("leaderboard");
  if (!lb) return;

  lb.innerHTML = `<p class="muted">Loading...</p>`;

  try {
    const leaderboardRes = await state.supabase.from("leaderboard").select("player_name,total_points,avatar_path");
    if (leaderboardRes.error) throw leaderboardRes.error;

    const rows = leaderboardRes.data || [];
    lb.innerHTML = rows.length
      ? `<table><thead><tr><th>Position</th><th>Player</th><th>Points</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${avatarHtml(r.avatar_path, r.player_name)}${escapeHtml(r.player_name)}</td><td>${r.total_points}</td></tr>`).join("")}</tbody></table>`
      : `<p class="muted">No scores yet.</p>`;
  } catch (err) {
    lb.innerHTML = `<p class="status error">${escapeHtml(err.message || "Could not load leaderboard.")}</p>`;
  }
};
