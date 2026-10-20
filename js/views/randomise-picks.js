function randomisePickSelect(select, { includeBlank = false, excludeId = null } = {}) {
  if (!select) return false;

  const choices = Array.from(select.options).filter((option) =>
    (includeBlank || Boolean(option.value)) && option.value !== excludeId
  );
  if (!choices.length) return false;

  const choice = choices[Math.floor(Math.random() * choices.length)];
  select.value = choice.value;
  return true;
}

function randomisePredictionPicks() {
  const starSelect = document.getElementById("starBakerGuess");
  const eliminatedSelect = document.getElementById("eliminatedGuess");
  const eligibleBakers = starSelect
    ? Array.from(starSelect.options).filter((option) => Boolean(option.value))
    : [];

  if (eligibleBakers.length < 2) {
    const status = document.getElementById("predictionStatus");
    if (status) {
      status.textContent = "At least two active bakers are needed to randomise picks.";
      status.classList.add("error");
    }
    return;
  }

  const starSelected = randomisePickSelect(starSelect);
  const selectionsMade = [
    randomisePickSelect(document.getElementById("technicalGuess")),
    starSelected,
    starSelected && randomisePickSelect(eliminatedSelect, { excludeId: starSelect.value }),
    randomisePickSelect(document.getElementById("handshakeGuess"), { includeBlank: true }),
  ];

  const status = document.getElementById("predictionStatus");
  if (!status) return;

  const complete = selectionsMade.every(Boolean);
  status.textContent = complete
    ? "Picks randomised. Review them, then save when ready."
    : "Could not randomise picks because no bakers are available.";
  status.classList.toggle("error", !complete);
}

function setupRandomisePicks() {
  const form = document.getElementById("predictionForm");
  if (!form || document.getElementById("randomisePicksButton")) return;

  const saveButton = form.querySelector('button[type="submit"]');
  if (!saveButton) return;

  const button = document.createElement("button");
  button.id = "randomisePicksButton";
  button.type = "button";
  button.className = "secondary";
  button.textContent = "Randomise picks";
  button.addEventListener("click", randomisePredictionPicks);

  form.insertBefore(button, saveButton);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupRandomisePicks, { once: true });
} else {
  setupRandomisePicks();
}
