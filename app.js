document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app');
    const addProductForm = document.querySelector('#add-product-form form');
    const STORAGE_KEY = 'food-stand-products';
    let products = [];

    // Load products from localStorage or fetch from the JSON file
    async function loadProducts() {
        const storedProducts = localStorage.getItem(STORAGE_KEY);
        if (storedProducts) {
            products = JSON.parse(storedProducts);
            renderProducts();
        } else {
            try {
                const response = await fetch('data/products.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                products = await response.json();
                // Save initial products to localStorage
                saveProducts();
                renderProducts();
            } catch (error) {
                console.error("Could not fetch products:", error);
                appContainer.innerHTML = '<p>Impossible de charger les produits. Vérifiez la console pour les erreurs.</p>';
            }
        }
    }

    // Save products to localStorage
    function saveProducts() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }

    // Render products to the DOM
    function renderProducts() {
        appContainer.innerHTML = ''; // Clear existing content
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.dataset.productId = product.id;

            productCard.innerHTML = `
                <h2>${product.name}</h2>
                <div class="product-details">
                    <p><strong>Prix:</strong> <span class="price-text">${product.price.toFixed(2)} €</span></p>
                    <p><strong>Stock:</strong> <span class="stock-text">${product.stock}</span></p>
                </div>
                <div class="product-actions">
                    <div>
                        <label for="price-${product.id}">Prix:</label>
                        <input type="number" class="price-input" value="${product.price.toFixed(2)}" step="0.10">
                    </div>
                    <div>
                        <label for="stock-${product.id}">Stock:</label>
                        <input type="number" class="stock-input" value="${product.stock}">
                    </div>
                </div>
                <div class="product-actions" style="justify-content: flex-end; margin-top: 10px;">
                     <button class="save-btn" data-product-id="${product.id}">Sauvegarder</button>
                     <button class="delete-btn" data-product-id="${product.id}">Supprimer</button>
                </div>
            `;
            appContainer.appendChild(productCard);
        });
    }

    // Handle Add Product Form Submission
    addProductForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent page reload

        const nameInput = document.getElementById('new-product-name');
        const priceInput = document.getElementById('new-product-price');
        const stockInput = document.getElementById('new-product-stock');

        const newProduct = {
            // Create a simple unique ID based on timestamp
            id: Date.now(), 
            name: nameInput.value,
            price: parseFloat(priceInput.value),
            stock: parseInt(stockInput.value, 10)
        };

        products.push(newProduct);
        saveProducts();
        renderProducts();

        // Clear the form fields
        addProductForm.reset();
    });

    // Handle Clicks on Save Buttons
    appContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('save-btn')) {
            const button = event.target;
            const productId = parseInt(button.dataset.productId, 10);
            const productCard = button.closest('.product-card');

            const priceInput = productCard.querySelector('.price-input');
            const stockInput = productCard.querySelector('.stock-input');

            const newPrice = parseFloat(priceInput.value);
            const newStock = parseInt(stockInput.value, 10);

            // Find the product in our array and update it
            const productToUpdate = products.find(p => p.id === productId);
            if (productToUpdate) {
                productToUpdate.price = newPrice;
                productToUpdate.stock = newStock;

                // Save updated products to localStorage
                saveProducts();

                // Update the display text immediately for feedback
                const priceText = productCard.querySelector('.price-text');
                const stockText = productCard.querySelector('.stock-text');
                priceText.textContent = `${newPrice.toFixed(2)} €`;
                stockText.textContent = newStock;
                
                console.log('Updated products array:', products);
                alert(`Produit "${productToUpdate.name}" mis à jour !`);
            }
        }

        if (event.target.classList.contains('delete-btn')) {
            const button = event.target;
            const productId = parseInt(button.dataset.productId, 10);
            
            // Find the product name for the confirmation message
            const productToDelete = products.find(p => p.id === productId);
            if (productToDelete && confirm(`Êtes-vous sûr de vouloir supprimer le produit "${productToDelete.name}" ?`)) {
                // Filter out the product to delete
                products = products.filter(p => p.id !== productId);
                
                // Save the new array
                saveProducts();
                
                // Re-render the list
                renderProducts();
            }
        }
    });

    // Initial load
    loadProducts();
}); 