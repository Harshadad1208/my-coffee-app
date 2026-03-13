document.addEventListener("DOMContentLoaded", () => {

  const cartCount = document.getElementById("cart-count");
  const notification = document.getElementById("notification");

  function showNotification(message, type = "success") {

    if (!notification) return;

    notification.textContent = message;

    notification.style.background =
      type === "success" ? "#00754A" : "#e53935";

    notification.style.display = "block";

    setTimeout(() => {
      notification.style.display = "none";
    }, 2500);

  }

  function updateCartCount() {

    fetch("/cart")
      .then(res => res.json())
      .then(data => {
        if (cartCount) {
          cartCount.textContent = data.length;
        }
      })
      .catch(err => console.error(err));

  }

  const buttons = document.querySelectorAll(".add-to-cart");

  buttons.forEach(button => {

    button.addEventListener("click", () => {

      const card = button.closest(".menu-card");

      const name = card.dataset.name;
      const price = card.dataset.price;

      fetch("/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name,
          price: price
        })
      })
      .then(res => res.json())
      .then(() => {

        showNotification(name + " added to cart ☕");

        updateCartCount();

      })
      .catch(() => {

        showNotification("Failed to add item", "error");

      });

    });

  });

  updateCartCount();

});