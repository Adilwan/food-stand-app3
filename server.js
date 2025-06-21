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
const SALES_FILE = path.join(__dirname, 'data', 'sales.json');
const isDevelopment = process.env.NODE_ENV !== 'production';

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

async function readSales() {
    try {
        const data = await fs.readFile(SALES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading sales file:", error);
        // If file doesn't exist or is corrupted, return empty array
        return [];
    }
}

async function writeSales(sales) {
    try {
        await fs.writeFile(SALES_FILE, JSON.stringify(sales, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error writing sales file:", error);
    }
}

// Fonction pour calculer le stock disponible d'un produit basé sur ses ingrédients
function calculateAvailableStock(product, allProducts) {
    if (!product.recipe) {
        return product.stock; // Pas de recette, retourne le stock direct
    }

    // Séparer les ingrédients obligatoires des options
    const requiredIngredients = {};
    const optionalIngredients = {};
    
    for (const [ingredientName, quantityNeeded] of Object.entries(product.recipe)) {
        // Si l'ingrédient contient "baguette" ou "pain à hot-dog", c'est une option
        if (ingredientName.toLowerCase().includes('baguette') || ingredientName.toLowerCase().includes('pain à hot-dog')) {
            optionalIngredients[ingredientName] = quantityNeeded;
        } else {
            requiredIngredients[ingredientName] = quantityNeeded;
        }
    }

    // Calculer le stock basé sur les ingrédients obligatoires
    let maxPossibleFromRequired = Infinity;
    for (const [ingredientName, quantityNeeded] of Object.entries(requiredIngredients)) {
        const ingredient = allProducts.find(p => p.name.toLowerCase().includes(ingredientName.toLowerCase()));
        if (!ingredient) {
            console.warn(`Ingrédient obligatoire non trouvé: ${ingredientName}`);
            return 0;
        }
        
        const availableForThisIngredient = Math.floor(ingredient.stock / quantityNeeded);
        maxPossibleFromRequired = Math.min(maxPossibleFromRequired, availableForThisIngredient);
    }

    // Si pas d'ingrédients optionnels, retourner le résultat
    if (Object.keys(optionalIngredients).length === 0) {
        return maxPossibleFromRequired === Infinity ? product.stock : maxPossibleFromRequired;
    }

    // Calculer le stock basé sur les ingrédients optionnels (prendre le maximum)
    let maxPossibleFromOptional = 0;
    for (const [ingredientName, quantityNeeded] of Object.entries(optionalIngredients)) {
        const ingredient = allProducts.find(p => p.name.toLowerCase().includes(ingredientName.toLowerCase()));
        if (ingredient) {
            const availableForThisIngredient = Math.floor(ingredient.stock / quantityNeeded);
            maxPossibleFromOptional = Math.max(maxPossibleFromOptional, availableForThisIngredient);
        }
    }

    // Le stock final est le minimum entre les ingrédients obligatoires et le maximum des options
    const finalStock = Math.min(maxPossibleFromRequired, maxPossibleFromOptional);
    return finalStock === Infinity ? product.stock : finalStock;
}

// Fonction pour obtenir les produits avec stock calculé
function getProductsWithCalculatedStock(products) {
    return products.map(product => {
        if (product.isIngredient) {
            return product; // Les ingrédients gardent leur stock direct
        }
        
        const calculatedStock = calculateAvailableStock(product, products);
        return {
            ...product,
            availableStock: calculatedStock,
            stock: calculatedStock // Pour la compatibilité avec l'existant
        };
    });
}

// --- Express Setup ---

// Serve static files from the root directory
app.use(express.static(__dirname));

// Add cache control headers for development
if (isDevelopment) {
    app.use((req, res, next) => {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        next();
    });
}

app.use(express.json()); // Middleware to parse JSON bodies

// --- API Routes ---
// API endpoint to get all products
app.get('/api/products', async (req, res) => {
    const products = await readProducts();
    const productsWithCalculatedStock = getProductsWithCalculatedStock(products);
    res.json(productsWithCalculatedStock);
});

// API endpoint to add a new product
app.post('/api/products', async (req, res) => {
    const newProduct = req.body;
    const products = await readProducts();
    products.push(newProduct);
    await writeProducts(products);
    
    // Notify all clients that a product was added
    const productsWithCalculatedStock = getProductsWithCalculatedStock(products);
    io.emit('products-updated', productsWithCalculatedStock);

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
    const productsWithCalculatedStock = getProductsWithCalculatedStock(products);
    io.emit('products-updated', productsWithCalculatedStock);

    res.json(products[productIndex]);
});

// API endpoint to delete a product
app.delete('/api/products/:id', async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    let products = await readProducts();

    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
        return res.status(404).json({ message: 'Product not found' });
    }

    // Remove the product
    const deletedProduct = products.splice(productIndex, 1)[0];
    await writeProducts(products);

    // Notify all clients that a product was deleted
    const productsWithCalculatedStock = getProductsWithCalculatedStock(products);
    io.emit('products-updated', productsWithCalculatedStock);
    
    // Notify about the deleted product for backup purposes
    io.emit('product-deleted', deletedProduct);

    res.json({ message: 'Product deleted successfully', deletedProduct });
});

// API endpoint to validate an order
app.post('/api/order', async (req, res) => {
    const order = req.body.order; // Expects an object like { productId: quantity, ... }
    let products = await readProducts();
    let sales = await readSales();

    // Créer un enregistrement de vente
    const saleRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        items: [],
        totalAmount: 0
    };

    for (const productId in order) {
        const quantity = order[productId];
        if (quantity > 0) {
            const productIndex = products.findIndex(p => p.id == productId);
            if (productIndex !== -1) {
                const product = products[productIndex];
                
                // Calculer le montant pour ce produit
                const productTotal = product.price * quantity;
                saleRecord.totalAmount += productTotal;
                
                // Ajouter l'item à la vente
                saleRecord.items.push({
                    productId: product.id,
                    productName: product.name,
                    quantity: quantity,
                    unitPrice: product.price,
                    totalPrice: productTotal
                });
                
                // Si le produit a une recette, consommer les ingrédients
                if (product.recipe) {
                    // Séparer les ingrédients obligatoires des options
                    const requiredIngredients = {};
                    const optionalIngredients = {};
                    
                    for (const [ingredientName, quantityNeeded] of Object.entries(product.recipe)) {
                        // Si l'ingrédient contient "baguette" ou "pain à hot-dog", c'est une option
                        if (ingredientName.toLowerCase().includes('baguette') || ingredientName.toLowerCase().includes('pain à hot-dog')) {
                            optionalIngredients[ingredientName] = quantityNeeded;
                        } else {
                            requiredIngredients[ingredientName] = quantityNeeded;
                        }
                    }

                    // Consommer les ingrédients obligatoires
                    for (const [ingredientName, quantityNeeded] of Object.entries(requiredIngredients)) {
                        const ingredientIndex = products.findIndex(p => p.name.toLowerCase().includes(ingredientName.toLowerCase()));
                        if (ingredientIndex !== -1) {
                            const totalNeeded = quantityNeeded * quantity;
                            products[ingredientIndex].stock -= totalNeeded;
                        }
                    }

                    // Pour les ingrédients optionnels, choisir celui qui a le plus de stock
                    if (Object.keys(optionalIngredients).length > 0) {
                        let bestOption = null;
                        let maxStock = -1;

                        for (const [ingredientName, quantityNeeded] of Object.entries(optionalIngredients)) {
                            const ingredientIndex = products.findIndex(p => p.name.toLowerCase().includes(ingredientName.toLowerCase()));
                            if (ingredientIndex !== -1) {
                                const ingredient = products[ingredientIndex];
                                if (ingredient.stock > maxStock) {
                                    maxStock = ingredient.stock;
                                    bestOption = { name: ingredientName, quantity: quantityNeeded, index: ingredientIndex };
                                }
                            }
                        }

                        // Consommer l'option choisie
                        if (bestOption) {
                            const totalNeeded = bestOption.quantity * quantity;
                            products[bestOption.index].stock -= totalNeeded;
                        }
                    }
                } else {
                    // Produit simple, consommer directement
                    products[productIndex].stock -= quantity;
                }
            }
        }
    }

    // Sauvegarder les ventes et les produits
    sales.push(saleRecord);
    await writeSales(sales);
    await writeProducts(products);

    // Notify all clients that stocks have changed
    const productsWithCalculatedStock = getProductsWithCalculatedStock(products);
    io.emit('products-updated', productsWithCalculatedStock);

    res.status(200).json({ 
        message: 'Order processed successfully',
        saleId: saleRecord.id,
        totalAmount: saleRecord.totalAmount
    });
});

// API endpoint to get sales reports
app.get('/api/sales', async (req, res) => {
    const { date, period } = req.query;
    let sales = await readSales();
    
    if (date) {
        // Filtrer par date spécifique
        sales = sales.filter(sale => sale.date === date);
    } else if (period === 'today') {
        // Filtrer pour aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        sales = sales.filter(sale => sale.date === today);
    } else if (period === 'week') {
        // Filtrer pour la semaine en cours
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        sales = sales.filter(sale => new Date(sale.timestamp) >= oneWeekAgo);
    } else if (period === 'month') {
        // Filtrer pour le mois en cours
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        sales = sales.filter(sale => new Date(sale.timestamp) >= oneMonthAgo);
    }
    
    res.json(sales);
});

// API endpoint to get daily summary
app.get('/api/sales/summary', async (req, res) => {
    const { date } = req.query;
    let sales = await readSales();
    
    if (date) {
        sales = sales.filter(sale => sale.date === date);
    }
    
    // Calculer les statistiques
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Compter les produits vendus
    const productStats = {};
    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!productStats[item.productName]) {
                productStats[item.productName] = {
                    quantity: 0,
                    revenue: 0
                };
            }
            productStats[item.productName].quantity += item.quantity;
            productStats[item.productName].revenue += item.totalPrice;
        });
    });
    
    res.json({
        totalSales,
        totalRevenue,
        averageOrderValue,
        productStats,
        sales: sales
    });
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
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Development mode: ${isDevelopment ? 'ON' : 'OFF'}`);
    console.log(`🔄 Hot reload: ${isDevelopment ? 'ENABLED' : 'DISABLED'}`);
    
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
            console.log(`🌐 Access from other devices: http://${address}:${PORT}`);
        }
    }
}); 