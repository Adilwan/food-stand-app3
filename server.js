const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');

// --- Data Management ---

async function readProducts() {
    try {
        const data = await fs.readFile(PRODUCTS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading products file:", error);
        // If file doesn't exist or is corrupted, return empty array
        return [];
    }
}

async function writeProducts(products) {
    try {
        await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error writing products file:", error);
    }
}

// --- Express Setup ---

// Serve static files from the root directory
app.use(express.static(__dirname));
app.use(express.json()); // Middleware to parse JSON bodies

// API endpoint to get all products
app.get('/api/products', async (req, res) => {
    const products = await readProducts();
    res.json(products);
});

// API endpoint to add a new product
app.post('/api/products', async (req, res) => {
    const newProduct = req.body;
    const products = await readProducts();
    products.push(newProduct);
    await writeProducts(products);
    
    // Notify all clients that a product was added
    io.emit('products-updated', products);

    res.status(201).json(newProduct);
});

// API endpoint to update a product
app.put('/api/products/:id', async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const updatedProductData = req.body;
    let products = await readProducts();

    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
        return res.status(404).json({ message: 'Product not found' });
    }

    // Update the product
    products[productIndex] = { ...products[productIndex], ...updatedProductData };
    await writeProducts(products);

    // Notify all clients that a product was updated
    io.emit('products-updated', products);

    res.json(products[productIndex]);
});

// API endpoint to validate an order
app.post('/api/order', async (req, res) => {
    const order = req.body.order; // Expects an object like { productId: quantity, ... }
    let products = await readProducts();

    for (const productId in order) {
        const quantity = order[productId];
        if (quantity > 0) {
            const productIndex = products.findIndex(p => p.id == productId);
            if (productIndex !== -1) {
                products[productIndex].stock -= quantity;
            }
        }
    }

    await writeProducts(products);

    // Notify all clients that stocks have changed
    io.emit('products-updated', products);

    res.status(200).json({ message: 'Order processed successfully' });
});


// --- Socket.IO Setup ---
io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


// --- Server Start ---
server.listen(PORT, HOST, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Server accessible from other devices on your network`);
    
    // Get local IP address for network access
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = {};

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }
    
    // Display available network addresses
    for (const name of Object.keys(results)) {
        for (const address of results[name]) {
            console.log(`Access from other devices: http://${address}:${PORT}`);
        }
    }
}); 