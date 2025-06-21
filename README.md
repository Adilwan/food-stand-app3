# Food Stand App

Application web pour la gestion d'un stand de nourriture.

## Fonctionnalités

- Gestion des produits (ajout, modification, suppression)
- Gestion des stocks
- Interface de point de vente (POS)
- Synchronisation en temps réel entre appareils
- Hot reload en mode développement
- Tests automatisés
- Calcul détaillé de la monnaie à rendre

## Installation

```bash
npm install
```

## Développement

### Démarrage rapide

**Windows :**
```bash
.\start-dev.bat
```

**Tous systèmes :**
```bash
npm run dev
```

Le serveur redémarrera automatiquement quand vous modifiez les fichiers.

### Tests

Pour vérifier que tout fonctionne :
```bash
npm test
```

### URLs de développement

- **Caisse (POS)**: http://localhost:3000
- **Gestion**: http://localhost:3000/gestion.html
- **Bilan**: http://localhost:3000/bilan.html
- **API Produits**: http://localhost:3000/api/products
- **API Ventes**: http://localhost:3000/api/sales

## Production

Pour lancer l'application en mode production :

```bash
npm start
```

## Déploiement

Cette application peut être déployée sur :
- Vercel
- Railway
- Heroku

## Structure

- `server.js` - Serveur Node.js avec Express et Socket.IO
- `app.js` - Logique côté client pour la gestion
- `pos.js` - Interface point de vente
- `gestion.js` - Interface de gestion
- `data/products.json` - Données des produits
- `nodemon.json` - Configuration du hot reload
- `test-dev.js` - Script de test de l'application
- `start-dev.bat` - Script de démarrage rapide (Windows)

## Fonctionnalités de développement

- ✅ Hot reload automatique
- ✅ Tests automatisés
- ✅ Configuration séparée dev/prod
- ✅ Logs détaillés en mode développement
- ✅ Cache désactivé en développement
- ✅ Scripts de démarrage rapide
- ✅ Calcul détaillé de la monnaie

## Commandes utiles

```bash
# Développement avec hot reload
npm run dev

# Tests rapides
npm test

# Production
npm start

# Installation des dépendances
npm install
``` 