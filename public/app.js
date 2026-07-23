const supSelect = document.getElementById("sup");
const bookingsList = document.getElementById("bookings");
const form = document.getElementById("bookingForm");
const messageBox = document.getElementById("message");
const submitButton = document.getElementById("submitButton");
const devicePreviewText =
  document.getElementById("devicePreviewText");

const fromSelect = document.getElementById("fromTime");
const toSelect = document.getElementById("toTime");
const dateInput = document.getElementById("date");

let messageTimer;
let allBookings = [];

// Alle möglichen Zeiten von 08:00 bis 22:00 Uhr
function getTimeSlots() {
  const timeSlots = [];

  for (let hour = 8; hour <= 22; hour++) {
    for (const minute of ["00", "30"]) {
      if (hour === 22 && minute === "30") {
        continue;
      }

      const time =
        `${String(hour).padStart(2, "0")}:${minute}`;

      timeSlots.push(time);
    }
  }

  return timeSlots;
}

function createTimeOption(value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;

  return option;
}

function addTimePlaceholder(selectElement) {
  selectElement.appendChild(
    createTimeOption("", "Zeit wählen")
  );
}

function timeToMinutes(time) {
  if (!time) {
    return null;
  }

  const [hours, minutes] = String(time)
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function isHalfHourTime(time) {
  if (!time) {
    return false;
  }

  const parts = String(time).split(":");
  const minutes = parts[1];

  return minutes === "00" || minutes === "30";
}

function getSortableDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  return String(dateValue).split("T")[0];
}

function getTodayValue() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const datePart = getSortableDate(dateValue);
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) {
    return String(dateValue);
  }

  return `${day}.${month}.${year}`;
}

function formatTime(timeValue) {
  if (!timeValue) {
    return "";
  }

  return String(timeValue).slice(0, 5);
}

function showMessage(message, type = "success") {
  clearTimeout(messageTimer);

  messageBox.textContent = message;
  messageBox.className = `message show ${type}`;

  messageTimer = setTimeout(() => {
    messageBox.className = "message";
    messageBox.textContent = "";
  }, 5000);
}

function getSelectedBookings() {
  const selectedSup = supSelect.value;
  const selectedDate = dateInput.value;

  if (!selectedSup || !selectedDate) {
    return [];
  }

  return allBookings.filter((booking) => {
    return (
      booking.sup === selectedSup &&
      getSortableDate(booking.datum) === selectedDate
    );
  });
}

function isTimeInsideBooking(time, bookings) {
  const timeMinutes = timeToMinutes(time);

  return bookings.some((booking) => {
    const bookingStart = timeToMinutes(booking.von);
    const bookingEnd = timeToMinutes(booking.bis);

    return (
      timeMinutes >= bookingStart &&
      timeMinutes < bookingEnd
    );
  });
}

function hasTimeConflict(startTime, endTime, bookings) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  return bookings.some((booking) => {
    const bookingStart = timeToMinutes(booking.von);
    const bookingEnd = timeToMinutes(booking.bis);

    return (
      startMinutes < bookingEnd &&
      endMinutes > bookingStart
    );
  });
}

function fillStartTimes() {
  const previousValue = fromSelect.value;
  const bookings = getSelectedBookings();
  const timeSlots = getTimeSlots();

  fromSelect.innerHTML = "";
  addTimePlaceholder(fromSelect);

  timeSlots.forEach((time, index) => {
    const isLastTime =
      index === timeSlots.length - 1;

    if (isLastTime) {
      return;
    }

    const isBooked =
      isTimeInsideBooking(time, bookings);

    if (!isBooked) {
      fromSelect.appendChild(
        createTimeOption(time, `${time} Uhr`)
      );
    }
  });

  const previousOptionExists = Array.from(
    fromSelect.options
  ).some((option) => option.value === previousValue);

  fromSelect.value = previousOptionExists
    ? previousValue
    : "";
}

function fillEndTimes() {
  const previousValue = toSelect.value;
  const selectedStart = fromSelect.value;
  const bookings = getSelectedBookings();
  const timeSlots = getTimeSlots();

  toSelect.innerHTML = "";
  addTimePlaceholder(toSelect);

  if (!selectedStart) {
    toSelect.value = "";
    return;
  }

  const startMinutes = timeToMinutes(selectedStart);

  timeSlots.forEach((time) => {
    const endMinutes = timeToMinutes(time);

    if (endMinutes <= startMinutes) {
      return;
    }

    const hasConflict = hasTimeConflict(
      selectedStart,
      time,
      bookings
    );

    if (!hasConflict) {
      toSelect.appendChild(
        createTimeOption(time, `${time} Uhr`)
      );
    }
  });

  const previousOptionExists = Array.from(
    toSelect.options
  ).some((option) => option.value === previousValue);

  toSelect.value = previousOptionExists
    ? previousValue
    : "";
}

function updateTimeAvailability() {
  fillStartTimes();
  fillEndTimes();
}

function setMinimumDate() {
  const todayValue = getTodayValue();

  dateInput.min = todayValue;

  if (!dateInput.value) {
    dateInput.value = todayValue;
  }
}

function updateDevicePreview() {
  if (!devicePreviewText) {
    return;
  }

  devicePreviewText.textContent =
    supSelect.value || "SUP oder Boot auswählen";
}

async function loadSUPs() {
  const response = await fetch("/api/sups");

  if (!response.ok) {
    throw new Error(
      "Die Geräteliste konnte nicht geladen werden."
    );
  }

  const sups = await response.json();

  supSelect.innerHTML = "";

  const placeholder =
    document.createElement("option");

  placeholder.value = "";
  placeholder.textContent =
    "SUP oder Boot wählen";

  placeholder.disabled = true;
  placeholder.selected = true;

  supSelect.appendChild(placeholder);

  sups.forEach((sup) => {
    const option =
      document.createElement("option");

    option.value = sup.name;
    option.textContent = sup.name;

    supSelect.appendChild(option);
  });

  updateDevicePreview();
}

function getDeviceClass(deviceName) {
  switch (deviceName) {
    case "SUP 1":
      return "booking-card--sup-1";

    case "SUP 2":
      return "booking-card--sup-2";

    case "SUP 3":
      return "booking-card--sup-3";

    default:
      return "booking-card--default";
  }
}

function createBookingCard(booking) {
  const card = document.createElement("article");

  card.classList.add(
    "booking-card",
    getDeviceClass(booking.sup)
  );

  const device = document.createElement("p");
  device.className = "booking-device";
  device.textContent = booking.sup;

  const time = document.createElement("p");
  time.className = "booking-time";
  time.textContent =
    `${formatTime(booking.von)}–` +
    `${formatTime(booking.bis)} Uhr`;

  card.appendChild(device);
  card.appendChild(time);

  return card;
}

function renderBookings(bookings) {
  bookingsList.innerHTML = "";

  if (
    !Array.isArray(bookings) ||
    bookings.length === 0
  ) {
    const emptyState =
      document.createElement("div");

    emptyState.className = "empty-state";
    emptyState.textContent =
      "Derzeit sind noch keine Buchungen vorhanden.";

    bookingsList.appendChild(emptyState);
    return;
  }

  const groupedBookings = bookings.reduce(
    (groups, booking) => {
      const dateKey =
        getSortableDate(booking.datum);

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(booking);

      return groups;
    },
    {}
  );

  const todayValue = getTodayValue();

  const sortedDates =
    Object.keys(groupedBookings).sort(
      (a, b) => {
        if (a === todayValue) {
          return -1;
        }

        if (b === todayValue) {
          return 1;
        }

        return a.localeCompare(b);
      }
    );

  sortedDates.forEach((dateKey) => {
    const group =
      document.createElement("section");

    group.className = "booking-day-group";

    const isToday = dateKey === todayValue;

    if (isToday) {
      group.classList.add(
        "booking-day-group--today"
      );
    }

    const heading =
      document.createElement("h3");

    heading.className = "booking-day-heading";

    heading.textContent = isToday
      ? `Heute · ${formatDate(dateKey)}`
      : formatDate(dateKey);

    const cards =
      document.createElement("div");

    cards.className = "booking-cards";

    groupedBookings[dateKey]
      .sort((a, b) =>
        String(a.von).localeCompare(
          String(b.von)
        )
      )
      .forEach((booking) => {
        cards.appendChild(
          createBookingCard(booking)
        );
      });

    group.appendChild(heading);
    group.appendChild(cards);
    bookingsList.appendChild(group);
  });
}

async function loadBookings() {
  const response = await fetch("/api/bookings");

  if (!response.ok) {
    throw new Error(
      "Die Buchungen konnten nicht geladen werden."
    );
  }

  const bookings = await response.json();

  allBookings = Array.isArray(bookings)
    ? bookings
    : [];

  renderBookings(allBookings);
  updateTimeAvailability();
}

form.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const nachname =
      document
        .getElementById("nachname")
        .value
        .trim();

    const appartement =
      document.getElementById("apartment").value;

    const sup = supSelect.value;
    const datum = dateInput.value;
    const von = fromSelect.value;
    const bis = toSelect.value;

    if (
      !nachname ||
      !appartement ||
      !sup ||
      !datum ||
      !von ||
      !bis
    ) {
      showMessage(
        "Bitte fülle alle Felder aus.",
        "error"
      );

      return;
    }

    if (
      !isHalfHourTime(von) ||
      !isHalfHourTime(bis)
    ) {
      showMessage(
        "Bitte wähle die Zeiten im Halbstundentakt aus.",
        "error"
      );

      return;
    }

    if (bis <= von) {
      showMessage(
        "Die Endzeit muss nach der Startzeit liegen.",
        "error"
      );

      return;
    }

    const payload = {
      nachname,
      appartement,
      sup,
      datum,
      von,
      bis,
    };

    submitButton.disabled = true;
    submitButton.textContent =
      "Buchung wird gespeichert …";

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
          result.error ||
          "Die Buchung konnte nicht gespeichert werden."
        );
      }

      await loadBookings();

      form.reset();
      supSelect.selectedIndex = 0;

      setMinimumDate();
      updateDevicePreview();
      updateTimeAvailability();

      showMessage(
        result.message ||
        "Buchung erfolgreich gespeichert.",
        "success"
      );
    } catch (error) {
      console.error(error);

      showMessage(
        error.message ||
        "Beim Speichern ist ein Fehler aufgetreten.",
        "error"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Jetzt buchen";
    }
  }
);

supSelect.addEventListener("change", () => {
  updateDevicePreview();
  updateTimeAvailability();
});

dateInput.addEventListener(
  "change",
  updateTimeAvailability
);

fromSelect.addEventListener(
  "change",
  fillEndTimes
);

async function initializeApp() {
  try {
    setMinimumDate();

    await loadSUPs();
    await loadBookings();

    updateTimeAvailability();
  } catch (error) {
    console.error(error);

    showMessage(
      error.message ||
      "Beim Laden ist ein Fehler aufgetreten.",
      "error"
    );
  }
}

initializeApp();