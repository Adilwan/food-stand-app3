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

    async function deleteProduct(id) {
        await fetch(`/api/products/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });
        // No need to fetch again, server will notify via sockets
    }

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
        
        // Icônes spécifiques pour les ingrédients
        if (name.includes('baguette')) return '🥖';
        if (name.includes('pain à hot-dog') || name.includes('pain a hot-dog')) return '🌭';
        if (name.includes('saucisse')) return '🌭';
        
        // Icônes par défaut selon le type
        if (name.includes('boisson') || name.includes('drink')) return '🥤';
        if (name.includes('nourriture') || name.includes('food')) return '🍽️';
        if (name.includes('dessert') || name.includes('sweet')) return '🍰';
        
        return '📦'; // Icône par défaut
    }

    // --- Rendering ---

    function renderProducts() {
        // Vider complètement le contenu
        appContainer.innerHTML = '';
        
        // Séparer les produits finis des ingrédients
        const finishedProducts = products.filter(p => !p.isIngredient);
        const ingredients = products.filter(p => p.isIngredient);
        
        // Afficher d'abord les ingrédients
        if (ingredients.length > 0) {
            const ingredientsSection = document.createElement('div');
            ingredientsSection.innerHTML = '<h2 style="margin: 20px 0 10px 0; color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 5px;">📦 Ingrédients</h2>';
            appContainer.appendChild(ingredientsSection);
            
            ingredients.forEach(product => {
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.style.borderLeft = '4px solid #28a745';
                if (product.isVisible === false) {
                    productCard.classList.add('is-hidden');
                }
                productCard.dataset.productId = product.id;

                const productIcon = getProductIcon(product.name);

                productCard.innerHTML = `
                    <div class="product-header" style="position: relative; display: flex; align-items: center; margin-bottom: 15px;">
                        <span style="font-size: 2em; margin-right: 10px;">${productIcon}</span>
                        <h2 style="margin: 0; flex-grow: 1;">${product.name}</h2>
                        <button class="delete-btn" data-product-id="${product.id}" style="position: absolute; top: -5px; right: -5px; background-color: #dc3545; color: white; border: none; width: 25px; height: 25px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">×</button>
                    </div>
                    <div class="product-details">
                        <p><strong>Stock actuel:</strong> <span class="stock-text">${product.stock}</span> ${product.unit || 'unités'}</p>
                        <p><em style="color: #6c757d;">Ingrédient de base</em></p>
                    </div>
                    <div class="product-actions">
                        <div>
                            <label>Stock actuel:</label>
                            <input type="number" class="stock-input" value="${product.stock}">
                        </div>
                        <div>
                            <label>Ajouter du stock:</label>
                            <input type="number" class="add-stock-input" value="0" min="0" placeholder="Quantité à ajouter">
                        </div>
                    </div>
                    <div class="product-actions" style="justify-content: space-between; margin-top: 10px;">
                         <button class="save-btn" data-product-id="${product.id}">Sauvegarder</button>
                         <button class="add-stock-btn" data-product-id="${product.id}" style="background-color: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Ajouter au stock</button>
                    </div>
                `;
                appContainer.appendChild(productCard);
            });
        }
        
        // Afficher ensuite les produits finis
        if (finishedProducts.length > 0) {
            const productsSection = document.createElement('div');
            productsSection.innerHTML = '<h2 style="margin: 20px 0 10px 0; color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 5px;">🍽️ Produits finis</h2>';
            appContainer.appendChild(productsSection);
            
            finishedProducts.forEach(product => {
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                if (product.isVisible === false) {
                    productCard.classList.add('is-hidden');
                }
                productCard.dataset.productId = product.id;

                const toggleButtonText = product.isVisible === false ? 'Afficher' : 'Masquer';
                const toggleButtonClass = product.isVisible === false ? 'unhide-btn' : 'hide-btn';
                const productIcon = getProductIcon(product.name);

                // Afficher la recette si elle existe (sauf pour le hot-dog)
                let recipeHtml = '';
                if (product.recipe && !product.name.toLowerCase().includes('hot-dog')) {
                    // Séparer les ingrédients obligatoires des options
                    const requiredIngredients = {};
                    const optionalIngredients = {};
                    
                    for (const [ingredient, quantity] of Object.entries(product.recipe)) {
                        if (ingredient.toLowerCase().includes('baguette') || ingredient.toLowerCase().includes('pain à hot-dog')) {
                            optionalIngredients[ingredient] = quantity;
                        } else {
                            requiredIngredients[ingredient] = quantity;
                        }
                    }

                    recipeHtml = '<div style="margin: 10px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px; border-left: 3px solid #007bff;"><strong>📋 Recette:</strong>';
                    
                    // Afficher les ingrédients obligatoires
                    if (Object.keys(requiredIngredients).length > 0) {
                        recipeHtml += '<div style="margin: 10px 0;"><strong style="color: #dc3545;">🔴 Ingrédients obligatoires:</strong><ul style="margin: 5px 0 0 15px;">';
                        for (const [ingredient, quantity] of Object.entries(requiredIngredients)) {
                            const ingredientProduct = ingredients.find(p => p.name.toLowerCase().includes(ingredient.toLowerCase()));
                            const unit = ingredientProduct ? ingredientProduct.unit : 'unités';
                            const ingredientIcon = ingredientProduct ? getProductIcon(ingredientProduct.name) : '📦';
                            const currentStock = ingredientProduct ? ingredientProduct.stock : 0;
                            const maxPossible = ingredientProduct ? Math.floor(currentStock / quantity) : 0;
                            const stockColor = maxPossible > 0 ? '#28a745' : '#dc3545';
                            
                            recipeHtml += `<li style="margin-bottom: 5px;">
                                <span style="font-size: 1.2em; margin-right: 5px;">${ingredientIcon}</span>
                                <strong>${quantity} ${unit}</strong> de <strong>${ingredient}</strong>
                                <span style="color: ${stockColor}; font-size: 0.9em; margin-left: 10px;">
                                    (Stock: ${currentStock} ${unit} → Max: ${maxPossible})
                                </span>
                            </li>`;
                        }
                        recipeHtml += '</ul></div>';
                    }

                    // Afficher les ingrédients optionnels
                    if (Object.keys(optionalIngredients).length > 0) {
                        recipeHtml += '<div style="margin: 10px 0;"><strong style="color: #28a745;">🟢 Options (choix automatique):</strong><ul style="margin: 5px 0 0 15px;">';
                        for (const [ingredient, quantity] of Object.entries(optionalIngredients)) {
                            const ingredientProduct = ingredients.find(p => p.name.toLowerCase().includes(ingredient.toLowerCase()));
                            const unit = ingredientProduct ? ingredientProduct.unit : 'unités';
                            const ingredientIcon = ingredientProduct ? getProductIcon(ingredientProduct.name) : '📦';
                            const currentStock = ingredientProduct ? ingredientProduct.stock : 0;
                            const maxPossible = ingredientProduct ? Math.floor(currentStock / quantity) : 0;
                            const stockColor = maxPossible > 0 ? '#28a745' : '#dc3545';
                            
                            recipeHtml += `<li style="margin-bottom: 5px;">
                                <span style="font-size: 1.2em; margin-right: 5px;">${ingredientIcon}</span>
                                <strong>${quantity} ${unit}</strong> de <strong>${ingredient}</strong>
                                <span style="color: ${stockColor}; font-size: 0.9em; margin-left: 10px;">
                                    (Stock: ${currentStock} ${unit} → Max: ${maxPossible})
                                </span>
                            </li>`;
                        }
                        recipeHtml += '</ul></div>';
                    }
                    
                    recipeHtml += '</div>';
                }

                productCard.innerHTML = `
                    <div class="product-header" style="position: relative; display: flex; align-items: center; margin-bottom: 15px;">
                        <span style="font-size: 2em; margin-right: 10px;">${productIcon}</span>
                        <h2 style="margin: 0; flex-grow: 1;">${product.name}</h2>
                        <button class="delete-btn" data-product-id="${product.id}" style="position: absolute; top: -5px; right: -5px; background-color: #dc3545; color: white; border: none; width: 25px; height: 25px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">×</button>
                    </div>
                    <div class="product-details">
                        <p><strong>Prix:</strong> <span class="price-text">${product.price.toFixed(2)} €</span></p>
                        <p><strong>Stock disponible:</strong> <span class="stock-text">${product.availableStock || product.stock}</span></p>
                        ${product.recipe ? '<p><em style="color: #007bff;">Stock calculé selon les ingrédients</em></p>' : ''}
                    </div>
                    ${recipeHtml}
                    <div class="product-actions">
                        <div>
                            <label>Prix:</label>
                            <input type="number" class="price-input" value="${product.price.toFixed(2)}" step="0.10">
                        </div>
                        <div>
                            <label>Stock:</label>
                            <input type="number" class="stock-input" value="${product.stock}" ${product.recipe ? 'readonly' : ''}>
                        </div>
                    </div>
                    <div class="product-actions" style="justify-content: space-between; margin-top: 10px;">
                         <button class="save-btn" data-product-id="${product.id}">Sauvegarder</button>
                         <button class="${toggleButtonClass}" data-product-id="${product.id}">${toggleButtonText}</button>
                    </div>
                `;
                appContainer.appendChild(productCard);
            });
        }
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
            
            // Gérer différemment les ingrédients et les produits finis
            if (productToUpdate.isIngredient) {
                // Pour les ingrédients, on ne sauvegarde que le stock
                const newStock = parseInt(productCard.querySelector('.stock-input').value, 10);
                updateProduct(productId, { stock: newStock });
                console.log(`Stock de "${productToUpdate.name}" mis à jour: ${newStock}`);
            } else {
                // Pour les produits finis, on sauvegarde prix et stock
                const newPrice = parseFloat(productCard.querySelector('.price-input').value);
                const newStock = parseInt(productCard.querySelector('.stock-input').value, 10);
                updateProduct(productId, { price: newPrice, stock: newStock });
                console.log(`Produit "${productToUpdate.name}" mis à jour: prix=${newPrice}, stock=${newStock}`);
            }
        }

        if (button.classList.contains('add-stock-btn')) {
            const productCard = button.closest('.product-card');
            const addStockInput = productCard.querySelector('.add-stock-input');
            const quantityToAdd = parseInt(addStockInput.value, 10);
            
            if (quantityToAdd > 0) {
                const newStock = productToUpdate.stock + quantityToAdd;
                updateProduct(productId, { stock: newStock });
                console.log(`${quantityToAdd} ${productToUpdate.unit || 'unités'} ajoutées au stock de "${productToUpdate.name}". Nouveau stock: ${newStock}`);
                
                // Réinitialiser le champ d'ajout
                addStockInput.value = 0;
            } else {
                alert('Veuillez entrer une quantité positive à ajouter.');
            }
        }

        if (button.classList.contains('hide-btn') || button.classList.contains('unhide-btn')) {
            const newVisibility = !(productToUpdate.isVisible !== false);
            updateProduct(productId, { isVisible: newVisibility });
        }

        if (button.classList.contains('delete-btn')) {
            // Demande de confirmation avant suppression
            const confirmMessage = `Êtes-vous sûr de vouloir supprimer le produit "${productToUpdate.name}" ?\n\nCette action est irréversible.`;
            
            if (confirm(confirmMessage)) {
                deleteProduct(productId);
                console.log(`Produit "${productToUpdate.name}" supprimé avec succès.`);
            } else {
                console.log('Suppression annulée par l\'utilisateur.');
            }
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
    
    // Forcer le rechargement initial avec un timestamp
    setTimeout(() => {
        renderProducts();
    }, 100);
}); 