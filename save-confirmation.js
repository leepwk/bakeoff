document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("predictionForm");
  const playerInput = document.getElementById("playerName");
  if (!form || !playerInput) return;

  let confirmedSubmit = false;

  form.addEventListener("submit", (event) => {
    if (confirmedSubmit) {
      confirmedSubmit = false;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const playerName = normaliseName(playerInput.value);
    if (!playerName) {
      form.requestSubmit();
      return;
    }

    const ok = window.confirm(`Save picks for ${playerName}? This will create the player if they do not already exist, or update their picks if they do.`);
    if (!ok) return;

    confirmedSubmit = true;
    form.requestSubmit();
  }, true);
});
