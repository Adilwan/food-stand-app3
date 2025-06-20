# Food Stand App

Application web pour la gestion d'un stand de nourriture.

## Fonctionnalités

- Gestion des produits (ajout, modification, suppression)
- Gestion des stocks
- Interface de point de vente (POS)
- Synchronisation en temps réel entre appareils

## Installation

```bash
npm install
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