document.addEventListener("DOMContentLoaded", () => {

  const cartCount = document.getElementById("cart-count");
  const cartIcon = document.getElementById("cart-icon");
  const notification = document.getElementById("notification");
  const checkoutBtn = document.getElementById("checkoutBtn"); // NEW

  /* -----------------------------
     Show Notification
  ----------------------------- */
  function showNotification(message, type = "success") {

    if (!notification) return;

    notification.textContent = message;

    notification.style.background =
      type === "success" ? "#4CAF50" : "#f44336";

    notification.style.display = "block";

    setTimeout(() => {
      notification.style.display = "none";
    }, 2000);
  }

  /* -----------------------------
     Update Cart Count
  ----------------------------- */
  function updateCartCount() {

    fetch("/cart")
      .then(res => res.json())
      .then(data => {

        if (cartCount) {
          cartCount.textContent = data.length;
        }

        /* -----------------------------
           Disable Checkout If Cart Empty
        ----------------------------- */

        if (checkoutBtn) {

          if (data.length === 0) {

            checkoutBtn.disabled = true;

          } else {

            checkoutBtn.disabled = false;

          }

        }

      })
      .catch(err => console.error("Cart fetch error:", err));
  }

  /* -----------------------------
     Add Item To Cart
  ----------------------------- */

  const buttons = document.querySelectorAll(".add-to-cart");

  buttons.forEach(button => {

    button.addEventListener("click", () => {

      const card = button.closest(".menu-card");

      if (!card) return;

      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price);

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
      .then(data => {

        showNotification(name + " added to cart ☕", "success");

        updateCartCount();

      })
      .catch(err => {

        console.error(err);

        showNotification("Error adding item", "error");

      });

    });

  });

  /* -----------------------------
     Cart Icon Navigation
  ----------------------------- */

  if (cartIcon) {

    cartIcon.addEventListener("click", () => {

      window.location.href = "cart.html";

    });

  }

  /* -----------------------------
     Load Cart Count On Page Load
  ----------------------------- */

  updateCartCount();

});