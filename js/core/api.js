window.bakeoffApi = {
  async getWeeks() {
    const res = await state.supabase
      .from("weeks")
      .select("id, week_number, title, is_current, is_locked")
      .order("week_number");
    if (res.error) throw res.error;
    return res.data || [];
  },

  async getBakers() {
    const res = await state.supabase
      .from("bakers")
      .select("id, name, information, avatar_path, is_active, eliminated_week_id")
      .order("name");
    if (res.error) throw res.error;
    return res.data || [];
  },

  async getPlayers() {
    const res = await state.supabase
      .from("players")
      .select("id, name, avatar_path")
      .order("name");
    if (res.error) throw res.error;
    return res.data || [];
  },

  async createPlayer(name) {
    const res = await state.supabase
      .from("players")
      .insert({ name })
      .select("id, name, avatar_path")
      .single();
    if (res.error) throw res.error;
    return res.data;
  },

  async savePrediction(payload) {
    const res = await state.supabase
      .from("predictions")
      .upsert(payload, { onConflict: "player_id,week_id" });
    if (res.error) throw res.error;
  },

  async getPrediction(playerId, weekId) {
    const res = await state.supabase
      .from("predictions")
      .select("technical_winner_baker_id, star_baker_id, eliminated_baker_id, handshake_baker_id")
      .eq("player_id", playerId)
      .eq("week_id", weekId)
      .maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  },

  async saveResult(payload) {
    const res = await state.supabase
      .from("results")
      .upsert(payload, { onConflict: "week_id" })
      .select("id")
      .single();
    if (res.error) throw res.error;
    return res.data;
  },

  async replaceResultHandshakes(resultId, bakerIds) {
    const del = await state.supabase
      .from("result_handshakes")
      .delete()
      .eq("result_id", resultId);
    if (del.error) throw del.error;

    if (!bakerIds.length) return;

    const insert = await state.supabase
      .from("result_handshakes")
      .insert(bakerIds.map((baker_id) => ({ result_id: resultId, baker_id })));
    if (insert.error) throw insert.error;
  },

  async markBakerEliminated(bakerId, weekId) {
    const res = await state.supabase
      .from("bakers")
      .update({ is_active: false, eliminated_week_id: weekId })
      .eq("id", bakerId);
    if (res.error) throw res.error;
  },

  async addBaker(payload) {
    const baker = typeof payload === "string" ? { name: payload } : payload;
    const res = await state.supabase
      .from("bakers")
      .insert({
        name: baker.name,
        information: baker.information || null,
        avatar_path: baker.avatar_path || null,
        is_active: true,
      })
      .select("id, name, information, avatar_path, is_active, eliminated_week_id")
      .single();
    if (res.error) throw res.error;
    return res.data;
  },

  async updateBaker(bakerId, payload) {
    const res = await state.supabase.from("bakers").update(payload).eq("id", bakerId);
    if (res.error) throw res.error;
  },

  async setCurrentWeek(weekId) {
    const clear = await state.supabase.from("weeks").update({ is_current: false }).neq("id", weekId);
    if (clear.error) throw clear.error;

    const set = await state.supabase.from("weeks").update({ is_current: true }).eq("id", weekId);
    if (set.error) throw set.error;
  },

  async setWeekLocked(weekId, isLocked) {
    const res = await state.supabase.from("weeks").update({ is_locked: isLocked }).eq("id", weekId);
    if (res.error) throw res.error;
  },

  async getLeaderboard() {
    const res = await state.supabase.from("leaderboard").select("player_name,total_points,position,avatar_path");
    if (res.error) throw res.error;
    return res.data || [];
  },

  async getAllPredictions() {
    const res = await state.supabase
      .from("predictions")
      .select(`id,players(name),weeks(week_number,title),technical:bakers!predictions_technical_winner_baker_id_fkey(name),star:bakers!predictions_star_baker_id_fkey(name),eliminated:bakers!predictions_eliminated_baker_id_fkey(name),handshake:bakers!predictions_handshake_baker_id_fkey(name)`)
      .order("created_at", { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  },

  async getResult(weekId) {
    const res = await state.supabase
      .from("results")
      .select("id, technical_winner_baker_id, star_baker_id, eliminated_baker_id")
      .eq("week_id", weekId)
      .maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  },

  async getResultHandshakeIds(resultId) {
    const res = await state.supabase
      .from("result_handshakes")
      .select("baker_id")
      .eq("result_id", resultId);
    if (res.error) throw res.error;
    return (res.data || []).map((item) => item.baker_id);
  },

  async updatePlayerAvatar(playerId, avatarPath) {
    const res = await state.supabase.from("players").update({ avatar_path: avatarPath }).eq("id", playerId);
    if (res.error) throw res.error;
  },

  async getPlayerSmsSettings(playerId) {
    const res = await state.supabase
      .from("player_sms_settings")
      .select("player_id, phone_number, sms_reminders_enabled")
      .eq("player_id", playerId)
      .maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  },

  async savePlayerSmsSettings(playerId, payload) {
    const res = await state.supabase
      .from("player_sms_settings")
      .upsert(
        {
          player_id: playerId,
          phone_number: payload.phone_number,
          sms_reminders_enabled: payload.sms_reminders_enabled,
        },
        { onConflict: "player_id" }
      )
      .select("player_id, phone_number, sms_reminders_enabled")
      .single();
    if (res.error) throw res.error;
    return res.data;
  },

  async getPlayerSmsHistory(playerId) {
    const res = await state.supabase
      .from("sms_messages")
      .select("id, week_id, phone_number, message_type, message_text, status, provider, error_message, attempted_at, sent_at, created_at, weeks(week_number,title)")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  },
};
