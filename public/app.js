const supSelect = document.getElementById("sup");
const bookingsList = document.getElementById("bookings");
const form = document.getElementById("bookingForm");

function showError(msg) {
  alert(msg);
}

async function loadSUPs() {
  const res = await fetch("/api/sups");
  if (!res.ok) throw new Error("Konnte SUP-Liste nicht laden.");
  const sups = await res.json();

  // Dropdown leeren + füllen
  supSelect.innerHTML = "";
  sups.forEach((sup) => {
    const option = document.createElement("option");
    // Backend erwartet sup als NAME ("SUP 1"), nicht als ID
    option.value = sup.name;
    option.textContent = sup.name;
    supSelect.appendChild(option);
  });
}

async function loadBookings() {
  const res = await fetch("/api/bookings");
  if (!res.ok) throw new Error("Konnte Buchungen nicht laden.");
  const bookings = await res.json();

  bookingsList.innerHTML = "";
  bookings.forEach((b) => {
    const li = document.createElement("li");
    li.textContent = `${b.datum} ${b.von}–${b.bis} | ${b.sup} | ${b.appartement} | ${b.nachname}`;
    bookingsList.appendChild(li);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Werte aus dem Formular lesen (IDs müssen exakt so heißen wie in index.html)
  const nachname = document.getElementById("nachname").value.trim();
  const appartement = document.getElementById("apartment").value;
  const sup = supSelect.value;
  const datum = document.getElementById("date").value;
  const von = document.getElementById("fromTime").value;
  const bis = document.getElementById("toTime").value;

  // Client-side Validierung
  if (!nachname || !appartement || !sup || !datum || !von || !bis) {
    showError("Bitte alle Felder ausfüllen.");
    return;
  }
  if (von >= bis) {
    showError("Die 'Bis'-Zeit muss nach der 'Von'-Zeit liegen.");
    return;
  }

  const payload = { nachname, appartement, sup, datum, von, bis };

  // Debug (kannst du drin lassen, hilft beim Troubleshooting)
  console.log("Sende Buchung:", payload);

  const res = await fetch("/api/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    showError(result.message || result.error || "Fehler beim Speichern.");
    return;
  }

  alert(result.message || "Buchung erfolgreich!");

  form.reset();
  await loadBookings();
});

// Initial laden
(async () => {
  try {
    await loadSUPs();
    await loadBookings();
  } catch (err) {
    console.error(err);
    showError(err.message || "Unbekannter Fehler beim Laden.");
  }
})();