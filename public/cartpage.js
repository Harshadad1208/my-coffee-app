document.addEventListener("DOMContentLoaded", function () {

  const container = document.getElementById("cart-items");

  // Load cart items
  function loadCart() {

    fetch("/cart")
      .then(function (response) {
        return response.json();
      })
      .then(function (items) {

        container.innerHTML = "";

        if (items.length === 0) {
          container.innerHTML = "<p>Your cart is empty ☕</p>";
          return;
        }

        let total = 0;

        items.forEach(function (item) {

          total += Number(item.price);

          const div = document.createElement("div");
          div.className = "cart-item";

          div.innerHTML =
            "<p>" + item.name + " - ₹" + item.price + "</p>" +
            "<button onclick='removeItem(" + item.id + ")'>Remove</button>";

          container.appendChild(div);

        });

        const totalDiv = document.createElement("div");
        totalDiv.innerHTML = "<h3>Total: ₹" + total + "</h3>";

        container.appendChild(totalDiv);

      })
      .catch(function (error) {
        console.error("Error loading cart:", error);
      });

  }

  // Remove item from cart
  window.removeItem = function (id) {

    fetch("/cart/" + id, {
      method: "DELETE"
    })
      .then(function (response) {
        return response.json();
      })
      .then(function () {
        loadCart();
      })
      .catch(function (error) {
        console.error("Error removing item:", error);
      });

  };

  // Load cart when page opens
  loadCart();

});