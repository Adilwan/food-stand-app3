// Configuration
const socket = io();
let currentPeriod = 'today';
let currentDate = new Date().toISOString().split('T')[0];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    loadBilan();
    setupEventListeners();
});

// Configuration des événements
function setupEventListeners() {
    // Onglets de période
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const period = this.dataset.period;
            setActivePeriod(period);
            loadBilan();
        });
    });
    
    // Date personnalisée
    document.getElementById('custom-date').addEventListener('change', function() {
        currentDate = this.value;
        if (currentPeriod === 'custom') {
            loadBilan();
        }
    });
}

// Définir la période active
function setActivePeriod(period) {
    currentPeriod = period;
    
    // Mettre à jour les onglets
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-period="${period}"]`).classList.add('active');
    
    // Afficher/masquer le sélecteur de date
    const dateSelector = document.getElementById('date-selector');
    if (period === 'custom') {
        dateSelector.style.display = 'flex';
        document.getElementById('custom-date').value = currentDate;
    } else {
        dateSelector.style.display = 'none';
    }
}

// Charger le bilan
async function loadBilan() {
    try {
        let url = '/api/sales/summary';
        const params = new URLSearchParams();
        
        if (currentPeriod === 'custom') {
            params.append('date', currentDate);
        } else if (currentPeriod === 'today') {
            params.append('date', new Date().toISOString().split('T')[0]);
        } else {
            url = `/api/sales?period=${currentPeriod}`;
            const response = await fetch(url);
            const sales = await response.json();
            displayBilanFromSales(sales);
            return;
        }
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        const data = await response.json();
        displayBilan(data);
        
    } catch (error) {
        console.error('Erreur lors du chargement du bilan:', error);
        showError('Erreur lors du chargement du bilan');
    }
}

// Charger le bilan pour une date spécifique
function loadBilanForDate() {
    currentDate = document.getElementById('custom-date').value;
    loadBilan();
}

// Afficher le bilan
function displayBilan(data) {
    displayStats(data);
    displaySalesTable(data.sales);
    displayProductStats(data.productStats);
}

// Afficher le bilan à partir des ventes brutes
function displayBilanFromSales(sales) {
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
    
    const data = {
        totalSales,
        totalRevenue,
        averageOrderValue,
        productStats,
        sales: sales
    };
    
    displayBilan(data);
}

// Afficher les statistiques
function displayStats(data) {
    const statsGrid = document.getElementById('stats-grid');
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${data.totalSales}</div>
            <div class="stat-label">Commandes</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.totalRevenue.toFixed(2)}€</div>
            <div class="stat-label">Chiffre d'affaires</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.averageOrderValue.toFixed(2)}€</div>
            <div class="stat-label">Panier moyen</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${Object.keys(data.productStats).length}</div>
            <div class="stat-label">Produits vendus</div>
        </div>
    `;
}

// Afficher le tableau des ventes
function displaySalesTable(sales) {
    const content = document.getElementById('bilan-content');
    
    if (sales.length === 0) {
        content.innerHTML = `
            <div class="no-data">
                <h3>Aucune vente pour cette période</h3>
                <p>Les ventes apparaîtront ici une fois que vous aurez validé des commandes.</p>
            </div>
        `;
        return;
    }
    
    let tableHTML = `
        <h2>📋 Détail des Ventes</h2>
        <table class="bilan-table">
            <thead>
                <tr>
                    <th>Heure</th>
                    <th>Produits</th>
                    <th>Quantité</th>
                    <th>Montant</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sales.forEach(sale => {
        const time = new Date(sale.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const itemsList = sale.items.map(item => 
            `${getProductIcon(item.productName)} ${item.productName}`
        ).join(', ');
        
        const totalQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        
        tableHTML += `
            <tr>
                <td>${time}</td>
                <td>${itemsList}</td>
                <td>${totalQuantity}</td>
                <td class="revenue-positive">${sale.totalAmount.toFixed(2)}€</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    content.innerHTML = tableHTML;
}

// Afficher les statistiques par produit
function displayProductStats(productStats) {
    const content = document.getElementById('bilan-content');
    const existingContent = content.innerHTML;
    
    if (Object.keys(productStats).length === 0) {
        return;
    }
    
    // Trier les produits par chiffre d'affaires décroissant
    const sortedProducts = Object.entries(productStats)
        .sort(([,a], [,b]) => b.revenue - a.revenue);
    
    let tableHTML = `
        <h2>📊 Statistiques par Produit</h2>
        <table class="bilan-table">
            <thead>
                <tr>
                    <th>Produit</th>
                    <th>Quantité vendue</th>
                    <th>Chiffre d'affaires</th>
                    <th>Prix moyen</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sortedProducts.forEach(([productName, stats]) => {
        const averagePrice = stats.quantity > 0 ? stats.revenue / stats.quantity : 0;
        
        tableHTML += `
            <tr>
                <td>${getProductIcon(productName)} ${productName}</td>
                <td>${stats.quantity}</td>
                <td class="revenue-positive">${stats.revenue.toFixed(2)}€</td>
                <td>${averagePrice.toFixed(2)}€</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    content.innerHTML = existingContent + tableHTML;
}

// Obtenir l'icône d'un produit
function getProductIcon(productName) {
    const name = productName.toLowerCase();
    
    if (name.includes('hot-dog') || name.includes('hotdog')) return '🌭';
    if (name.includes('club') || name.includes('sandwich')) return '🥪';
    if (name.includes('coca')) return '🥤';
    if (name.includes('fanta')) return '🍊';
    if (name.includes('bière') || name.includes('biere')) return '🍺';
    if (name.includes('eau')) return '💧';
    if (name.includes('baguette')) return '🥖';
    if (name.includes('pain à hot-dog') || name.includes('pain a hot-dog')) return '🌭';
    if (name.includes('saucisse')) return '🌭';
    
    return '🍽️';
}

// Exporter le bilan
function exportBilan() {
    const periodText = {
        'today': 'Aujourd\'hui',
        'week': 'Cette semaine',
        'month': 'Ce mois',
        'custom': `Date: ${currentDate}`
    }[currentPeriod];
    
    const exportData = {
        period: periodText,
        exportDate: new Date().toISOString(),
        stats: {
            totalSales: document.querySelector('.stat-card:nth-child(1) .stat-value').textContent,
            totalRevenue: document.querySelector('.stat-card:nth-child(2) .stat-value').textContent,
            averageOrderValue: document.querySelector('.stat-card:nth-child(3) .stat-value').textContent,
            productsSold: document.querySelector('.stat-card:nth-child(4) .stat-value').textContent
        }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `bilan-ventes-${currentPeriod}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// Afficher une erreur
function showError(message) {
    const content = document.getElementById('bilan-content');
    content.innerHTML = `
        <div class="no-data">
            <h3>❌ Erreur</h3>
            <p>${message}</p>
        </div>
    `;
}

// Écouter les mises à jour en temps réel
socket.on('connect', () => {
    console.log('Connecté au serveur de bilan');
});

socket.on('disconnect', () => {
    console.log('Déconnecté du serveur de bilan');
}); 