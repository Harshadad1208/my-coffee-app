document.addEventListener("DOMContentLoaded", () => {

  const buttons = document.querySelectorAll(".btn");

  buttons.forEach(button => {

    button.addEventListener("click", () => {

      // If it is an Add to Cart button
      if(button.classList.contains("add-cart")){

        const item = button.getAttribute("data-item");

        addToCart(item);

        return;
      }

      // Allow navigation if it is a link
      if (button.tagName === "A" && button.getAttribute("href")) {
        return;
      }

      // Default message
      alert("☕ Feature coming soon!");

    });

  });

});



function addToCart(item){

let cart = JSON.parse(localStorage.getItem("cart")) || [];

cart.push(item);

localStorage.setItem("cart", JSON.stringify(cart));

showToast(item + " added to cart");

}



function showToast(message){

let toast = document.getElementById("toast");

if(!toast){
toast = document.createElement("div");
toast.id = "toast";
toast.className = "toast";
document.body.appendChild(toast);
}

toast.innerText = message;

toast.classList.add("show");

setTimeout(()=>{
toast.classList.remove("show");
},3000);

}