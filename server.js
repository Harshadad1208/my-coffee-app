const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
///////////////////////////////////////////////////////////
// MIDDLEWARE
///////////////////////////////////////////////////////////

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

///////////////////////////////////////////////////////////
// MYSQL CONNECTION
///////////////////////////////////////////////////////////














const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false 
  }
});

// This function creates your tables automatically
const initDB = () => {
    const queries = [
        `CREATE TABLE IF NOT EXISTS cart_items (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, price DECIMAL(10,2) NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS orders (order_id INT AUTO_INCREMENT PRIMARY KEY, customer_name VARCHAR(255) NOT NULL, phone VARCHAR(20) NOT NULL, table_number VARCHAR(10), total_amount DECIMAL(10,2), order_status VARCHAR(50) DEFAULT 'received', order_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS order_items (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT, item_name VARCHAR(255), price DECIMAL(10,2), FOREIGN KEY (order_id) REFERENCES orders(order_id))`
    ];

    queries.forEach(query => {
        db.query(query, (err) => {
            if (err) console.error("❌ Table error:", err);
            else console.log("✅ Table checked/ready");
        });
    });
};

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ Connected to MySQL Database');
        initDB(); // This starts the table creation
    }
});



















///////////////////////////////////////////////////////////
// CART APIs
///////////////////////////////////////////////////////////

// Add item to cart
app.post("/cart", (req, res) => {
  const { name, price } = req.body;
  if (!name || !price) {
    return res.status(400).json({ message: "Name and price required" });
  }
  const sql = "INSERT INTO cart_items (name, price) VALUES (?, ?)";
  db.query(sql, [name, price], (err, result) => {
    if (err) {
      console.error("❌ Cart Insert Error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json({ success: true, id: result.insertId });
  });
});

// Get cart items
app.get("/cart", (req, res) => {
  const sql = "SELECT * FROM cart_items ORDER BY id DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Cart Fetch Error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(results);
  });
});

// Remove single cart item
app.delete("/cart/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM cart_items WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) {
      console.error("❌ Cart Delete Error:", err);
      return res.status(500).json({ message: "Delete error" });
    }
    res.json({ success: true });
  });
});

// Clear cart
app.delete("/cart", (req, res) => {
  const sql = "DELETE FROM cart_items";
  db.query(sql, (err) => {
    if (err) {
      console.error("❌ Cart Clear Error:", err);
      return res.status(500).json({ message: "Clear error" });
    }
    res.json({ success: true });
  });
});

///////////////////////////////////////////////////////////
// ORDER APIs
///////////////////////////////////////////////////////////

app.post("/place-order", (req, res) => {
  const { customer_name, phone, table_number } = req.body;

  if (!customer_name || !phone) {
    return res.status(400).json({ message: "Customer details required" });
  }

  const cartQuery = "SELECT * FROM cart_items";

  db.query(cartQuery, (err, cartItems) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error reading cart" });
    }

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let total = 0;
    cartItems.forEach(item => {
      total += Number(item.price);
    });

    const orderQuery = "INSERT INTO orders (customer_name, phone, table_number, total_amount, order_status) VALUES (?, ?, ?, ?, 'received')";

    db.query(orderQuery, [customer_name, phone, table_number, total], (err, orderResult) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error creating order" });
      }

      const orderId = orderResult.insertId;
      const itemQuery = "INSERT INTO order_items (order_id, item_name, price) VALUES ?";
      const values = cartItems.map(item => [orderId, item.name, item.price]);

      db.query(itemQuery, [values], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Error saving order items" });
        }

        db.query("DELETE FROM cart_items", () => {
          res.json({
            success: true,
            message: "✅ Order placed successfully",
            orderId: orderId
          });
        });
      });
    });
  });
});

///////////////////////////////////////////////////////////
// KITCHEN DASHBOARD APIs
///////////////////////////////////////////////////////////

// Get all orders (SEQUENCE FIXED: Oldest at Top, Newest at Bottom)
app.get("/orders", (req, res) => {
  const sql = `
  SELECT 
    orders.order_id,
    orders.customer_name,
    orders.phone,
    orders.table_number,
    orders.total_amount,
    orders.order_status,
    orders.order_time,
    GROUP_CONCAT(order_items.item_name SEPARATOR ', ') AS items
  FROM orders
  LEFT JOIN order_items ON orders.order_id = order_items.order_id
  GROUP BY orders.order_id
  ORDER BY orders.order_time ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Orders Fetch Error:", err);
      return res.status(500).json({ message: "Error fetching orders" });
    }
    res.json(results);
  });
});

// Update order status
app.put("/update-status/:id", (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  const sql = "UPDATE orders SET order_status=? WHERE order_id=?";
  db.query(sql, [status, orderId], (err) => {
    if (err) {
      console.error("❌ Status Update Error:", err);
      return res.status(500).json({ message: "Error updating status" });
    }
    res.json({ success: true });
  });
});

// DELETE ORDER (FIXED: Deletes items first to allow order deletion)
app.delete("/delete-order/:id", (req, res) => {
  const orderId = req.params.id;

  // Step 1: Delete from order_items table
  const sqlItems = "DELETE FROM order_items WHERE order_id=?";
  db.query(sqlItems, [orderId], (err) => {
    if (err) {
      console.error("❌ Order Items Delete Error:", err);
      return res.status(500).json({ message: "Delete error" });
    }

    // Step 2: Delete from orders table
    const sqlOrder = "DELETE FROM orders WHERE order_id=?";
    db.query(sqlOrder, [orderId], (err) => {
      if (err) {
        console.error("❌ Order Delete Error:", err);
        return res.status(500).json({ message: "Delete error" });
      }
      res.json({ success: true });
    });
  });
});

///////////////////////////////////////////////////////////
// PAGE ROUTES
///////////////////////////////////////////////////////////

app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "public", "index.html")); });
app.get("/food", (req, res) => { res.sendFile(path.join(__dirname, "public", "food.html")); });
app.get("/coffee-home", (req, res) => { res.sendFile(path.join(__dirname, "public", "coffee-home.html")); });
app.get("/ready-to-eat", (req, res) => { res.sendFile(path.join(__dirname, "public", "ready-to-eat.html")); });
app.get("/drinks", (req, res) => { res.sendFile(path.join(__dirname, "public", "drinks.html")); });
app.get("/bestseller", (req, res) => { res.sendFile(path.join(__dirname, "public", "bestseller.html")); });
app.get("/checkout", (req, res) => { res.sendFile(path.join(__dirname, "public", "checkout.html")); });
app.get("/cart-page", (req, res) => { res.sendFile(path.join(__dirname, "public", "cart.html")); });
app.get("/kitchen", (req, res) => { res.sendFile(path.join(__dirname, "public", "kitchen.html")); });
app.get("/learn", (req, res) => { res.sendFile(path.join(__dirname, "public", "learn.html")); });

app.use((req, res) => {
  res.status(404).send("❌ Page not found");
});



app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is officially live on port ${PORT}`);
});