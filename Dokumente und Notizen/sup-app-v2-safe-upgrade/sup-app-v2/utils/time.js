function isHalfHourTime(time) {
  return /^\d{2}:(00|30)(:\d{2})?$/.test(String(time || ""));
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

function validateBookingTimes(von, bis) {
  if (!isHalfHourTime(von) || !isHalfHourTime(bis)) {
    return "Buchungen sind nur im Halbstundentakt möglich.";
  }

  const startMinutes = timeToMinutes(von);
  const endMinutes = timeToMinutes(bis);
  const durationMinutes = endMinutes - startMinutes;

  if (durationMinutes <= 0) {
    return "Die Endzeit muss nach der Startzeit liegen.";
  }

  if (durationMinutes < 60) {
    return "Die Mindestbuchungsdauer beträgt eine Stunde.";
  }

  if (durationMinutes % 30 !== 0) {
    return "Die Buchungsdauer muss in 30-Minuten-Schritten erfolgen.";
  }

  return null;
}

module.exports = {
  isHalfHourTime,
  timeToMinutes,
  validateBookingTimes,
};
