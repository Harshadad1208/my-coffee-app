const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

///////////////////////////////////////////////////////////
// 1. MIDDLEWARE CONFIGURATION
///////////////////////////////////////////////////////////

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

///////////////////////////////////////////////////////////
// 2. DATABASE CONNECTION (MySQL)
///////////////////////////////////////////////////////////




const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect((err) => {
  if (err) {
    console.error("❌ CRITICAL: MySQL Connection Failed!");
    console.error("Error Details:", err.message);
  } else {
    console.log("✅ SUCCESS: Connected to MySQL Database");
  }
});





///////////////////////////////////////////////////////////
// 3. DATABASE INITIALIZATION
///////////////////////////////////////////////////////////

const initDB = () => {

  const queries = [

    `CREATE TABLE IF NOT EXISTS cart_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS orders (
      order_id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      age INT,
      table_number VARCHAR(10),
      address TEXT,
      city VARCHAR(100),
      pincode VARCHAR(10),
      order_type VARCHAR(50) DEFAULT 'cafe',
      total_amount DECIMAL(10,2),
      order_status ENUM('received','preparing','ready','delivered') DEFAULT 'received',
      order_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS order_items (
      order_item_id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT,
      item_name VARCHAR(255),
      price DECIMAL(10,2),
      quantity INT DEFAULT 1,
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
    )`

  ];

  queries.forEach((query, index) => {

    db.query(query, (err) => {

      if (err) {
        console.error(`❌ Error creating table ${index + 1}:`, err.message);
      } else {
        console.log(`✅ Table ${index + 1} ready`);
      }

    });

  });

};

///////////////////////////////////////////////////////////
// 4. CART APIs
///////////////////////////////////////////////////////////

app.post("/cart", (req, res) => {

  const { name, price } = req.body;

  const sql = "INSERT INTO cart_items (name, price) VALUES (?, ?)";

  db.query(sql, [name, price], (err, result) => {

    if (err) {
      console.error("Add to cart failed", err);
      return res.status(500).json({ success:false });
    }

    res.json({ success:true, id:result.insertId });

  });

});

app.get("/cart", (req, res) => {

  db.query("SELECT * FROM cart_items ORDER BY id DESC", (err, results) => {

    if (err) {
      console.error("Fetch cart failed", err);
      return res.status(500).json([]);
    }

    res.json(results);

  });

});

app.delete("/cart/:id", (req, res) => {

  db.query("DELETE FROM cart_items WHERE id=?", [req.params.id], () => {

    res.json({ success:true });

  });

});

app.delete("/cart", (req, res) => {

  db.query("DELETE FROM cart_items", () => {

    res.json({ success:true });

  });

});

///////////////////////////////////////////////////////////
// 5. PLACE ORDER
///////////////////////////////////////////////////////////

app.post("/place-order", (req, res) => {

  const { customer_name, phone, age, table_number, address, city, pincode, order_type } = req.body;

  db.query("SELECT * FROM cart_items", (err, cartItems) => {

    if (cartItems.length === 0) {
      return res.json({ success:false, message:"Cart empty" });
    }

    let total = cartItems.reduce((sum, item) => sum + Number(item.price), 0);

    const orderSQL = `
    INSERT INTO orders
    (customer_name, phone, age, table_number, address, city, pincode, order_type, total_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(orderSQL, [
      customer_name,
      phone,
      age || null,
      table_number || null,
      address || null,
      city || null,
      pincode || null,
      order_type || "cafe",
      total
    ], (err, result) => {

      const orderId = result.insertId;

      const itemValues = cartItems.map(item => [orderId, item.name, item.price]);

      db.query(
        "INSERT INTO order_items (order_id,item_name,price) VALUES ?",
        [itemValues],
        () => {

          db.query("DELETE FROM cart_items");

          console.log(`📦 Order #${orderId} created`);

          res.json({ success:true, orderId });

        }
      );

    });

  });

});

///////////////////////////////////////////////////////////
// 6. KITCHEN DASHBOARD
///////////////////////////////////////////////////////////

app.get("/orders", (req, res) => {

  const sql = `
  SELECT o.*, GROUP_CONCAT(oi.item_name SEPARATOR ', ') AS items_list
  FROM orders o
  LEFT JOIN order_items oi ON o.order_id = oi.order_id
  GROUP BY o.order_id
  ORDER BY o.order_time DESC`;

  db.query(sql, (err, results) => {

    res.json(results);

  });

});

app.put("/update-status/:id", (req, res) => {

  const { status } = req.body;

  db.query(
    "UPDATE orders SET order_status=? WHERE order_id=?",
    [status, req.params.id],
    () => res.json({ success:true })
  );

});

app.delete("/delete-order/:id", (req, res) => {

  db.query(
    "DELETE FROM orders WHERE order_id=?",
    [req.params.id],
    () => res.json({ success:true })
  );

});

///////////////////////////////////////////////////////////
// 7. PAGE ROUTES
///////////////////////////////////////////////////////////

app.get("/", (req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

app.get("/bestseller",(req,res)=>res.sendFile(path.join(__dirname,"public","bestseller.html")));
app.get("/drinks",(req,res)=>res.sendFile(path.join(__dirname,"public","drinks.html")));
app.get("/food",(req,res)=>res.sendFile(path.join(__dirname,"public","food.html")));
app.get("/coffee-home",(req,res)=>res.sendFile(path.join(__dirname,"public","coffee-home.html")));
app.get("/ready-to-eat",(req,res)=>res.sendFile(path.join(__dirname,"public","ready-to-eat.html")));

app.get("/cart-page",(req,res)=>res.sendFile(path.join(__dirname,"public","cart.html")));

app.get("/cafe-checkout",(req,res)=>res.sendFile(path.join(__dirname,"public","cafe-checkout.html")));
app.get("/delivery-checkout",(req,res)=>res.sendFile(path.join(__dirname,"public","delivery-checkout.html")));

app.get("/payment",(req,res)=>res.sendFile(path.join(__dirname,"public","payment.html")));
app.get("/delivery-payment",(req,res)=>res.sendFile(path.join(__dirname,"public","delivery-payment.html")));

app.get("/order-success",(req,res)=>res.sendFile(path.join(__dirname,"public","order-success.html")));
app.get("/delivery-order-success",(req,res)=>res.sendFile(path.join(__dirname,"public","delivery-order-success.html")));

app.get("/kitchen",(req,res)=>res.sendFile(path.join(__dirname,"public","kitchen.html")));

///////////////////////////////////////////////////////////
// 8. 404 HANDLER (MUST BE LAST)
///////////////////////////////////////////////////////////

app.use((req,res)=>{
  res.status(404).send("<h1>404 - Coffee Corner Not Found</h1>");
});

///////////////////////////////////////////////////////////
// 9. SERVER START
///////////////////////////////////////////////////////////

app.listen(PORT,'0.0.0.0',()=>{
  console.log("------------------------------------------");
  console.log(`☕ Coffee Corner Server Active on Port ${PORT}`);
  console.log(`🏠 Home: http://localhost:${PORT}`);
  console.log(`🍳 Kitchen: http://localhost:${PORT}/kitchen`);
  console.log("------------------------------------------");
});