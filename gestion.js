document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app');
    const addProductForm = document.querySelector('#add-product-form form');
    let products = [];
    const socket = io();

    // --- API Communication ---

    async function fetchProducts() {
        try {
            const response = await fetch('/api/products');
            products = await response.json();
            renderProducts();
        } catch (error) {
            console.error("Could not fetch products:", error);
            appContainer.innerHTML = '<p>Impossible de charger les produits. Le serveur est-il bien lancé ?</p>';
        }
    }

    async function addProduct(product) {
        await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product),
        });
        // No need to fetch again, server will notify via sockets
    }

    async function updateProduct(id, data) {
        await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        // No need to fetch again, server will notify via sockets
    }

    // --- Rendering ---

    function renderProducts() {
        appContainer.innerHTML = ''; // Clear existing content
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            if (product.isVisible === false) {
                productCard.classList.add('is-hidden');
            }
            productCard.dataset.productId = product.id;

            const toggleButtonText = product.isVisible === false ? 'Afficher' : 'Masquer';
            const toggleButtonClass = product.isVisible === false ? 'unhide-btn' : 'hide-btn';

            productCard.innerHTML = `
                <h2>${product.name}</h2>
                <div class="product-details">
                    <p><strong>Prix:</strong> <span class="price-text">${product.price.toFixed(2)} €</span></p>
                    <p><strong>Stock:</strong> <span class="stock-text">${product.stock}</span></p>
                </div>
                <div class="product-actions">
                    <div>
                        <label>Prix:</label>
                        <input type="number" class="price-input" value="${product.price.toFixed(2)}" step="0.10">
                    </div>
                    <div>
                        <label>Stock:</label>
                        <input type="number" class="stock-input" value="${product.stock}">
                    </div>
                </div>
                <div class="product-actions" style="justify-content: flex-end; margin-top: 10px;">
                     <button class="save-btn" data-product-id="${product.id}">Sauvegarder</button>
                     <button class="${toggleButtonClass}" data-product-id="${product.id}">${toggleButtonText}</button>
                </div>
            `;
            appContainer.appendChild(productCard);
        });
    }

    // --- Event Handlers ---

    addProductForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const newProduct = {
            id: Date.now(),
            name: document.getElementById('new-product-name').value,
            price: parseFloat(document.getElementById('new-product-price').value),
            stock: parseInt(document.getElementById('new-product-stock').value, 10),
            isVisible: true
        };

        addProduct(newProduct);
        addProductForm.reset();
    });

    appContainer.addEventListener('click', (event) => {
        const button = event.target;
        const productId = parseInt(button.closest('.product-card')?.dataset.productId, 10);
        if (!productId) return;

        const productToUpdate = products.find(p => p.id === productId);
        if (!productToUpdate) return;
        
        if (button.classList.contains('save-btn')) {
            const productCard = button.closest('.product-card');
            const newPrice = parseFloat(productCard.querySelector('.price-input').value);
            const newStock = parseInt(productCard.querySelector('.stock-input').value, 10);
            
            updateProduct(productId, { price: newPrice, stock: newStock });
        }

        if (button.classList.contains('hide-btn') || button.classList.contains('unhide-btn')) {
            const newVisibility = !(productToUpdate.isVisible !== false);
            updateProduct(productId, { isVisible: newVisibility });
        }
    });

    // --- Socket.IO Listeners ---
    socket.on('products-updated', (updatedProducts) => {
        console.log('Products updated via socket!');
        products = updatedProducts;
        renderProducts();
    });


    // Initial Load
    fetchProducts();
}); 