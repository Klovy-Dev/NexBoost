<div align="center">
  <h1>NexBoost</h1>
  <p>Optimiseur de performances PC pour gamers — léger, rapide, natif</p>

  ![Version](https://img.shields.io/badge/version-0.1.6-blue)
  ![Platform](https://img.shields.io/badge/platform-Windows-0078d4)
  ![License](https://img.shields.io/badge/license-MIT-green)
</div>

---

## Présentation

NexBoost est une application desktop Windows conçue pour les gamers souhaitant tirer le maximum de leurs performances. Elle regroupe en un seul endroit les outils d'optimisation système les plus utiles : nettoyage, gestion des processus, réglages de performance et bien plus.

## Fonctionnalités

- **Nettoyage système** — suppression des fichiers temporaires, cache et résidus inutiles
- **Gestionnaire de processus** — visualisation et contrôle des processus actifs
- **Optimisation performance** — réglages système ciblés pour le gaming
- **Système Free / Pro** — accès de base gratuit, fonctionnalités avancées en Pro
- **Mises à jour automatiques** — mise à jour intégrée via le système Tauri updater

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend natif | Rust (Tauri v2) |
| Base de données | Turso (libSQL) |
| Build | Vite |

## Installation

Télécharge le dernier installeur `.exe` depuis la page [Releases](https://github.com/Klovy-Dev/nexboost/releases).

## Développement local

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run tauri dev

# Build de production
npm run tauri build
```

> Prérequis : [Node.js](https://nodejs.org/) 18+, [Rust](https://rustup.rs/) stable, [Tauri CLI](https://tauri.app/fr/start/prerequisites/)

## Licence

MIT © [Klovy-Dev](https://github.com/Klovy-Dev)
