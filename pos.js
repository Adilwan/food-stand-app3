document.addEventListener('DOMContentLoaded', () => {
    const productListContainer = document.getElementById('product-list');
    const orderItemsContainer = document.getElementById('order-items');
    const totalAmountElement = document.getElementById('total-amount');
    const validateOrderButton = document.getElementById('validate-order');
    const socket = io();

    // Éléments pour le calcul de monnaie
    const cashPaymentSection = document.getElementById('cash-payment-section');
    const amountGivenInput = document.getElementById('amount-given');
    const changeAmountElement = document.getElementById('change-amount');

    let products = [];
    let currentOrder = {}; // { productId: quantity }

    // --- Utility Functions ---

    // Fonction pour obtenir l'icône selon le nom du produit
    function getProductIcon(productName) {
        const name = productName.toLowerCase();
        if (name.includes('sandwich') || name.includes('club')) return '🥪';
        if (name.includes('hot-dog') || name.includes('hotdog')) return '🌭';
        if (name.includes('soda') || name.includes('coca') || name.includes('cola')) return '🥤';
        if (name.includes('bière') || name.includes('beer')) return '🍺';
        if (name.includes('eau') || name.includes('water')) return '💧';
        if (name.includes('frites') || name.includes('fries')) return '🍟';
        if (name.includes('burger') || name.includes('hamburger')) return '🍔';
        if (name.includes('pizza')) return '🍕';
        if (name.includes('salade') || name.includes('salad')) return '🥗';
        if (name.includes('glace') || name.includes('ice cream')) return '🍦';
        if (name.includes('gâteau') || name.includes('cake')) return '🍰';
        if (name.includes('café') || name.includes('coffee')) return '☕';
        if (name.includes('thé') || name.includes('tea')) return '🫖';
        if (name.includes('jus') || name.includes('juice')) return '🧃';
        if (name.includes('vin') || name.includes('wine')) return '🍷';
        if (name.includes('cocktail')) return '🍹';
        if (name.includes('chips') || name.includes('crisps')) return '🥔';
        if (name.includes('bonbon') || name.includes('candy')) return '🍬';
        if (name.includes('chocolat') || name.includes('chocolate')) return '🍫';
        
        // Icônes par défaut selon le type
        if (name.includes('boisson') || name.includes('drink')) return '🥤';
        if (name.includes('nourriture') || name.includes('food')) return '🍽️';
        if (name.includes('dessert') || name.includes('sweet')) return '🍰';
        
        return '📦'; // Icône par défaut
    }

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
                const productIcon = getProductIcon(product.name);
                
                card.innerHTML = `
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 1.5em; margin-right: 8px;">${productIcon}</span>
                        <h3 style="margin: 0;">${product.name}</h3>
                    </div>
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
            // Masquer la section de paiement en liquide si pas de commande
            if (cashPaymentSection) {
                cashPaymentSection.style.display = 'none';
            }
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
                const productIcon = getProductIcon(product.name);
                itemElement.innerHTML = `
                    <span>${productIcon} ${product.name} x ${quantity}</span>
                    <strong>${subtotal.toFixed(2)} €</strong>
                `;
                orderItemsContainer.appendChild(itemElement);
            }
        }

        totalAmountElement.textContent = total.toFixed(2);
        
        // Afficher la section de paiement en liquide si il y a une commande
        if (cashPaymentSection) {
            cashPaymentSection.style.display = 'block';
        }
        
        // Recalculer la monnaie si un montant a été saisi
        calculateChange();
    }

    // Fonction pour calculer la monnaie
    function calculateChange() {
        if (!totalAmountElement || !amountGivenInput || !changeAmountElement) return;
        
        const total = parseFloat(totalAmountElement.textContent) || 0;
        const amountGiven = parseFloat(amountGivenInput.value) || 0;
        
        if (amountGiven >= total) {
            const change = amountGiven - total;
            changeAmountElement.textContent = change.toFixed(2);
            changeAmountElement.style.color = change >= 0 ? '#28a745' : '#dc3545';

            // Nouveau : détail des billets/pièces à rendre
            const detailDivId = 'change-detail';
            let detailDiv = document.getElementById(detailDivId);
            if (!detailDiv) {
                detailDiv = document.createElement('div');
                detailDiv.id = detailDivId;
                detailDiv.style.marginTop = '10px';
                changeAmountElement.parentNode.appendChild(detailDiv);
            }
            detailDiv.innerHTML = renderChangeDetail(change);
        } else {
            changeAmountElement.textContent = '0.00';
            changeAmountElement.style.color = '#6c757d';
            // Efface le détail si pas assez d'argent
            const detailDiv = document.getElementById('change-detail');
            if (detailDiv) detailDiv.innerHTML = '';
        }
    }

    // Fonction utilitaire pour détailler la monnaie à rendre
    function renderChangeDetail(change) {
        // Liste des coupures courantes en euros
        const denominations = [50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01];
        let remaining = Math.round(change * 100); // en centimes pour éviter les erreurs flottantes
        let html = '<strong>Détail de la monnaie :</strong><ul style="margin: 5px 0 0 15px;">';
        denominations.forEach(denom => {
            const denomCents = Math.round(denom * 100);
            const count = Math.floor(remaining / denomCents);
            if (count > 0) {
                html += `<li>${count} × ${denom >= 1 ? denom + ' €' : (denom * 100) + ' cts'}</li>`;
                remaining -= count * denomCents;
            }
        });
        html += '</ul>';
        return html;
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

    // Event listener pour le calcul de monnaie
    if (amountGivenInput) {
        amountGivenInput.addEventListener('input', calculateChange);
    }

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