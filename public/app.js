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
const apartmentSelect = document.getElementById("apartment");
const languageButtons = document.querySelectorAll(
  "[data-language]"
);

function getInitialLanguage() {
  const params = new URLSearchParams(
    window.location.search
  );

  const languageFromUrl = params.get("lang");

  if (
    languageFromUrl === "de" ||
    languageFromUrl === "en"
  ) {
    return languageFromUrl;
  }

  return "de";
}

let currentLanguage = getInitialLanguage();

function translate(key) {
  return (
    translations[currentLanguage]?.[key] ||
    translations.de[key] ||
    key
  );
}

function translateDeviceName(deviceName) {
  if (currentLanguage === "en") {
    switch (deviceName) {
      case "Ruderboot":
        return "Rowing boat";

      case "Paddelboot":
        return "Paddle boat";

      default:
        return deviceName;
    }
  }

  return deviceName;
}

function applyTranslations() {
  document.documentElement.lang =
    currentLanguage;

  document.title =
    translate("pageTitle");

  document
    .querySelectorAll("[data-i18n]")
    .forEach((element) => {
      const key =
        element.dataset.i18n;

      element.textContent =
        translate(key);
    });
}

function applyLanguageSelection() {
  languageButtons.forEach((button) => {
    const isActive =
      button.dataset.language === currentLanguage;

    button.classList.toggle(
      "active",
      isActive
    );

    button.setAttribute(
      "aria-pressed",
      String(isActive)
    );
  });

  localStorage.setItem(
    "bookingLanguage",
    currentLanguage
  );

  const url = new URL(
    window.location.href
  );

  url.searchParams.set(
    "lang",
    currentLanguage
  );

  window.history.replaceState(
    {},
    "",
    url
  );
}

let messageTimer;
let allBookings = [];
let allDevices = [];

function getTimeSlots() {
  const timeSlots = [];

  for (let hour = 6; hour <= 22; hour++) {
    for (const minute of ["00", "30"]) {
      if (hour === 22 && minute === "30") {
        continue;
      }

      timeSlots.push(
        `${String(hour).padStart(2, "0")}:${minute}`
      );
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
    createTimeOption("", translate("selectTime"))
  );
}

function timeToMinutes(time) {
  if (!time) return null;

  const [hours, minutes] = String(time)
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function isHalfHourTime(time) {
  if (!time) return false;

  const minutes = String(time).split(":")[1];
  return minutes === "00" || minutes === "30";
}

function getSortableDate(dateValue) {
  return dateValue ? String(dateValue).split("T")[0] : "";
}

function getTodayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateValue) {
  const datePart = getSortableDate(dateValue);
  if (!datePart) return "";

  const [year, month, day] = datePart.split("-");
  return year && month && day
    ? `${day}.${month}.${year}`
    : String(dateValue);
}

function formatTime(timeValue) {
  return timeValue ? String(timeValue).slice(0, 5) : "";
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
  const selectedDeviceId = Number(supSelect.value);
  const selectedDate = dateInput.value;

  if (!selectedDeviceId || !selectedDate) {
    return [];
  }

  return allBookings.filter((booking) => {
    return (
      Number(booking.device_id) === selectedDeviceId &&
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

function getValidEndTimes(startTime, bookings) {
  const minimumEndMinutes = timeToMinutes(startTime) + 60;

  return getTimeSlots().filter((time) => {
    const endMinutes = timeToMinutes(time);

    return (
      endMinutes >= minimumEndMinutes &&
      !hasTimeConflict(startTime, time, bookings)
    );
  });
}

function fillStartTimes() {
  const previousValue = fromSelect.value;
  const bookings = getSelectedBookings();

  fromSelect.innerHTML = "";
  addTimePlaceholder(fromSelect);

  getTimeSlots().forEach((time) => {
    const isBooked = isTimeInsideBooking(time, bookings);
    const hasValidEndTime =
      getValidEndTimes(time, bookings).length > 0;

    if (!isBooked && hasValidEndTime) {
      fromSelect.appendChild(
        createTimeOption(time, `${time} Uhr`)
      );
    }
  });

  const exists = Array.from(fromSelect.options)
    .some((option) => option.value === previousValue);

  fromSelect.value = exists ? previousValue : "";
}

function fillEndTimes() {
  const previousValue = toSelect.value;
  const selectedStart = fromSelect.value;
  const bookings = getSelectedBookings();

  toSelect.innerHTML = "";
  addTimePlaceholder(toSelect);

  if (!selectedStart) return;

  getValidEndTimes(selectedStart, bookings)
    .forEach((time) => {
      toSelect.appendChild(
        createTimeOption(time, `${time} Uhr`)
      );
    });

  const exists = Array.from(toSelect.options)
    .some((option) => option.value === previousValue);

  toSelect.value = exists ? previousValue : "";
}

function updateTimeAvailability() {
  fillStartTimes();
  fillEndTimes();
}

function setMinimumDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  dateInput.min = `${year}-${month}-${day}`;

  if (!dateInput.value) {
    dateInput.value = getTodayValue();
  }
}

function getSelectedDevice() {
  return allDevices.find(
    (device) => Number(device.id) === Number(supSelect.value)
  );
}

function updateDevicePreview() {
  if (!devicePreviewText) return;

  const selectedDevice = getSelectedDevice();

  devicePreviewText.textContent =
  selectedDevice
    ? translateDeviceName(selectedDevice.name)
    : translate("selectDevicePreview");
}

async function loadSUPs() {
  const response = await fetch("/api/sups");

  if (!response.ok) {
    throw new Error(
      translate("loadingDevicesError")
    );
  }

  const devices = await response.json();
  allDevices = Array.isArray(devices) ? devices : [];

  supSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = translate("selectDevice");
  placeholder.disabled = true;
  placeholder.selected = true;
  supSelect.appendChild(placeholder);

  allDevices.forEach((device) => {
    const option = document.createElement("option");
    option.value = device.id;
    option.textContent = translateDeviceName(device.name);
    option.dataset.imageFilename = device.image_filename || "";
    supSelect.appendChild(option);
  });

  updateDevicePreview();
}

function getDeviceClass(deviceId) {
  const classNumber = Number(deviceId) % 4;

  return [
    "booking-card--default",
    "booking-card--sup-1",
    "booking-card--sup-2",
    "booking-card--sup-3",
  ][classNumber];
}

function createBookingCard(booking) {
  const card = document.createElement("article");

  card.classList.add(
    "booking-card",
    getDeviceClass(booking.device_id)
  );

  const device = document.createElement("p");
  device.className = "booking-device";
  device.textContent =
    booking.device_name || booking.sup || translate("device");

  const time = document.createElement("p");
  time.className = "booking-time";
  time.textContent =
    `${formatTime(booking.von)}–${formatTime(booking.bis)} Uhr`;

  card.appendChild(device);
  card.appendChild(time);

  return card;
}

function renderBookings(bookings) {
  bookingsList.innerHTML = "";

  if (!Array.isArray(bookings) || bookings.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent =
      translate("noBookings");
    bookingsList.appendChild(emptyState);
    return;
  }

  const groupedBookings = bookings.reduce((groups, booking) => {
    const dateKey = getSortableDate(booking.datum);
    groups[dateKey] ||= [];
    groups[dateKey].push(booking);
    return groups;
  }, {});

  const todayValue = getTodayValue();

  Object.keys(groupedBookings)
    .sort((a, b) => {
      if (a === todayValue) return -1;
      if (b === todayValue) return 1;
      return a.localeCompare(b);
    })
    .forEach((dateKey) => {
      const group = document.createElement("section");
      group.className = "booking-day-group";

      const isToday = dateKey === todayValue;

      if (isToday) {
        group.classList.add("booking-day-group--today");
      }

      const heading = document.createElement("h3");
      heading.className = "booking-day-heading";
      heading.textContent = isToday
        ? `${translate("today")} · ${formatDate(dateKey)}`
        : formatDate(dateKey);

      const cards = document.createElement("div");
      cards.className = "booking-cards";

      groupedBookings[dateKey]
        .sort((a, b) =>
          String(a.von).localeCompare(String(b.von))
        )
        .forEach((booking) => {
          cards.appendChild(createBookingCard(booking));
        });

      group.appendChild(heading);
      group.appendChild(cards);
      bookingsList.appendChild(group);
    });
}

async function loadBookings() {
  const response = await fetch("/api/bookings/upcoming");

  if (!response.ok) {
    throw new Error(
      translate("loadingBookingsError")
    );
  }

  const bookings = await response.json();
  allBookings = Array.isArray(bookings) ? bookings : [];

  renderBookings(allBookings);
  updateTimeAvailability();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const appartement = apartmentSelect.value;
  const deviceId = Number(supSelect.value);
  const datum = dateInput.value;
  const von = fromSelect.value;
  const bis = toSelect.value;

  if (!appartement || !deviceId || !datum || !von || !bis) {
    showMessage(
      translate("fillAllFields"),
      "error"
    );
    return;
  }

  if (!isHalfHourTime(von) || !isHalfHourTime(bis)) {
    showMessage(
      translate("halfHourOnly"),
      "error"
    );
    return;
  }

  const durationMinutes =
    timeToMinutes(bis) - timeToMinutes(von);

  if (durationMinutes <= 0) {
    showMessage(
      translate("endAfterStart"),
      "error"
    );
    return;
  }

  if (durationMinutes < 60) {
    showMessage(
      translate("minimumOneHour"),
      "error"
    );
    return;
  }

  if (durationMinutes % 30 !== 0) {
    showMessage(
      translate("halfHourSteps"),
      "error"
    );
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = translate("savingBooking");

  try {
    const response = await fetch("/api/book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appartement,
        device_id: deviceId,
        datum,
        von,
        bis,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.message ||
        result.error ||
        translate("savingError")
      );
    }

    const selectedApartment = apartmentSelect.value;
    const selectedDate = dateInput.value;

    form.reset();
    apartmentSelect.value = selectedApartment;
    dateInput.value = selectedDate;
    supSelect.selectedIndex = 0;

    setMinimumDate();
    updateDevicePreview();
    updateTimeAvailability();

    showMessage(
      result.message || translate("bookingSaved"),
      "success"
    );

    await loadBookings();
  } catch (error) {
    console.error(error);

    showMessage(
      error.message ||
      translate("generalSavingError"),
      "error"
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = translate("bookNow");
  }
});

supSelect.addEventListener("change", () => {
  updateDevicePreview();
  updateTimeAvailability();
});

dateInput.addEventListener("change", updateTimeAvailability);
fromSelect.addEventListener("change", fillEndTimes);

async function initializeApp() {
  try {
    applyLanguageSelection();
    applyTranslations();

    loadSUPs();
    renderBookings(allBookings);
    updateTimeAvailability();
    updateDevicePreview();

    setMinimumDate();
    await loadSUPs();
    await loadBookings();
    updateTimeAvailability();
  } catch (error) {
    console.error(error);

    showMessage(
      error.message || translate("generalLoadingError"),
      "error"
    );
  }
}

languageButtons.forEach((button) => {
  button.addEventListener(
    "click",
    async() => {
      currentLanguage =
        button.dataset.language;

      applyLanguageSelection();
      applyTranslations();

      await loadSUPs();

      renderBookings(allBookings);
      
      updateDevicePreview();
      updateTimeAvailability();
    }
  );
});

initializeApp();
