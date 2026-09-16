function randomisePickSelect(select, { includeBlank = false } = {}) {
  if (!select) return false;

  const choices = Array.from(select.options).filter((option) => includeBlank || Boolean(option.value));
  if (!choices.length) return false;

  const choice = choices[Math.floor(Math.random() * choices.length)];
  select.value = choice.value;
  return true;
}

function randomisePredictionPicks() {
  const selectionsMade = [
    randomisePickSelect(document.getElementById("technicalGuess")),
    randomisePickSelect(document.getElementById("starBakerGuess")),
    randomisePickSelect(document.getElementById("eliminatedGuess")),
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
