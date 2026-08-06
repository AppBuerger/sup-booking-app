const drinkForm =
  document.getElementById("drinkForm");

const drinkMessage =
  document.getElementById("drinkMessage");

function showDrinkMessage(text, type) {
  drinkMessage.textContent = text;
  drinkMessage.className =
    `message show ${type}`;
}

drinkForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    const apartment =
      document.getElementById(
        "drinkApartment"
      ).value;

    const drink =
      document.getElementById(
        "drinkSelect"
      ).value;

    const quantity =
      document.getElementById(
        "drinkQuantity"
      ).value;

    if (!apartment || !drink || !quantity) {
      showDrinkMessage(
        guideTranslate("drinksMissingFields"),
        "error"
      );

      return;
    }

    showDrinkMessage(
      guideTranslate("drinksDemoSuccess"),
      "success"
    );
  }
);