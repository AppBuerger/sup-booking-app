function getDateValue(value) {
  return String(value || "").slice(0, 10);
}

function formatDateGerman(value) {
  const [year, month, day] = getDateValue(value).split("-");
  return `${day}.${month}.${year}`;
}

function formatDateForFilename(value) {
  const [year, month, day] = getDateValue(value).split("-");
  return `${day}-${month}-${year}`;
}

function createBillingFilename(appartement, datumVon, datumBis) {
  const apartmentPart = String(appartement)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    `${apartmentPart}_` +
    `${formatDateForFilename(datumVon)}_` +
    `${formatDateForFilename(datumBis)}.pdf`
  );
}

function formatEuro(value) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes === 0
    ? `${hours} Std.`
    : `${hours} Std. ${remainingMinutes} Min.`;
}

module.exports = {
  getDateValue,
  formatDateGerman,
  createBillingFilename,
  formatEuro,
  formatDuration,
};
