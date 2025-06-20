document.addEventListener('DOMContentLoaded', () => {
    const productListContainer = document.getElementById('product-list');
    const orderItemsContainer = document.getElementById('order-items');
    const totalAmountElement = document.getElementById('total-amount');
    const validateOrderButton = document.getElementById('validate-order');
    const socket = io();

    let products = [];
    let currentOrder = {}; // { productId: quantity }

    // --- API Communication ---

    async function fetchProducts() {
        try {
            const response = await fetch('/api/products');
            products = await response.json();
            renderProductList();
        } catch (error) {
            console.error("Could not fetch products:", error);
            productListContainer.innerHTML = '<p>Impossible de charger les produits. Le serveur est-il bien lancé ?</p>';
        }
    }
    
    async function validateOrder() {
        await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: currentOrder }),
        });
        // Server will notify via sockets
    }

    // --- Rendering ---

    function renderProductList() {
        // Preserve input focus/cursor position if possible
        const activeElement = document.activeElement;
        const activeElementId = activeElement ? activeElement.dataset.productId : null;
        
        productListContainer.innerHTML = '';
        products
            .filter(product => product.isVisible !== false && product.stock > 0)
            .forEach(product => {
                const card = document.createElement('div');
                card.className = 'pos-product-card';
                card.innerHTML = `
                    <h3>${product.name}</h3>
                    <p class="price">${product.price.toFixed(2)} €</p>
                    <p class="stock">Stock: ${product.stock}</p>
                    <div class="quantity-selector">
                        <button class="quantity-btn" data-product-id="${product.id}" data-action="decrease">-</button>
                        <input type="number" value="${currentOrder[product.id] || 0}" min="0" data-product-id="${product.id}" class="quantity-input" readonly>
                        <button class="quantity-btn" data-product-id="${product.id}" data-action="increase">+</button>
                    </div>
                `;
                productListContainer.appendChild(card);
        });

        if (activeElementId) {
            const newActiveElement = productListContainer.querySelector(`.quantity-input[data-product-id="${activeElementId}"]`);
            if (newActiveElement) newActiveElement.focus();
        }
    }

    function renderOrderSummary() {
        orderItemsContainer.innerHTML = '';
        let total = 0;

        if (Object.keys(currentOrder).length === 0 || Object.values(currentOrder).every(q => q === 0)) {
            orderItemsContainer.innerHTML = '<p>Sélectionnez des produits...</p>';
            totalAmountElement.textContent = '0.00';
            return;
        }

        for (const productId in currentOrder) {
            const quantity = currentOrder[productId];
            if (quantity > 0) {
                const product = products.find(p => p.id == productId);
                if (!product) continue; // Product might have been removed
                const subtotal = product.price * quantity;
                total += subtotal;

                const itemElement = document.createElement('div');
                itemElement.className = 'item';
                itemElement.innerHTML = `
                    <span>${product.name} x ${quantity}</span>
                    <strong>${subtotal.toFixed(2)} €</strong>
                `;
                orderItemsContainer.appendChild(itemElement);
            }
        }

        totalAmountElement.textContent = total.toFixed(2);
    }
    
    // --- Event Handlers ---

    productListContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('quantity-btn')) {
            const button = event.target;
            const productId = button.dataset.productId;
            const action = button.dataset.action;
            const product = products.find(p => p.id == productId);
            if (!product) return;

            let currentQuantity = currentOrder[productId] || 0;

            if (action === 'increase' && currentQuantity < product.stock) {
                currentQuantity++;
            } else if (action === 'decrease' && currentQuantity > 0) {
                currentQuantity--;
            }

            if (currentQuantity === 0) {
                delete currentOrder[productId];
            } else {
                currentOrder[productId] = currentQuantity;
            }
            
            const inputField = button.parentElement.querySelector('.quantity-input');
            if (inputField) inputField.value = currentQuantity;

            renderOrderSummary();
        }
    });

    validateOrderButton.addEventListener('click', () => {
        if (Object.keys(currentOrder).length === 0) {
            alert('Votre commande est vide.');
            return;
        }

        validateOrder();
        
        alert('Commande validée ! Le stock va être mis à jour.');
        currentOrder = {};
        renderOrderSummary();
        // The socket listener will handle re-rendering the product list
    });

    // --- Socket.IO Listeners ---
    socket.on('products-updated', (updatedProducts) => {
        console.log('Products updated via socket!');
        products = updatedProducts;
        renderProductList();
        renderOrderSummary(); // Re-render summary in case prices changed
    });


    // --- Initial Load ---
    fetchProducts();
}); 