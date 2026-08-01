const { timeToMinutes } = require("./time");

function calculateBookingPrice(booking) {
  const startMinutes = timeToMinutes(booking.von);
  const endMinutes = timeToMinutes(booking.bis);
  const durationMinutes = endMinutes - startMinutes;

  if (durationMinutes < 60) {
    return 0;
  }

  const firstHourPrice = Number(booking.first_hour_price);
  const additionalHalfHourPrice = Number(
    booking.additional_half_hour_price
  );

  if (
    !Number.isFinite(firstHourPrice) ||
    !Number.isFinite(additionalHalfHourPrice)
  ) {
    throw new Error(
      `Für ${booking.device_name || booking.sup || "das Gerät"} ` +
      "sind keine gültigen Preise hinterlegt."
    );
  }

  const additionalMinutes = Math.max(0, durationMinutes - 60);
  const additionalHalfHours = Math.ceil(additionalMinutes / 30);

  return (
    firstHourPrice +
    additionalHalfHours * additionalHalfHourPrice
  );
}

module.exports = {
  calculateBookingPrice,
};
