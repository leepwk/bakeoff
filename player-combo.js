function comboNormaliseName(name) {
  return (name || "").trim().replace(/\s+/g, " ");
}

async function loadPlayerNameOptions() {
  const list = document.getElementById("playerNameOptions");
  if (!list || !window.supabase || !window.BAKEOFF_SUPABASE_URL || !window.BAKEOFF_SUPABASE_ANON_KEY) return;

  const client = window.supabase.createClient(window.BAKEOFF_SUPABASE_URL, window.BAKEOFF_SUPABASE_ANON_KEY);
  const { data, error } = await client.from("players").select("name").order("name");
  if (error) return;

  const seen = new Set();
  list.innerHTML = "";
  for (const player of data || []) {
    const name = comboNormaliseName(player.name);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);

    const option = document.createElement("option");
    option.value = name;
    list.appendChild(option);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadPlayerNameOptions();
  document.getElementById("predictionForm")?.addEventListener("submit", () => {
    setTimeout(loadPlayerNameOptions, 1000);
  });
});
