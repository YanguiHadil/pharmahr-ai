# 💊 PharmaHR AI v2.0

**Assistant Intelligent RH pour Pharmacies - Powered by Groq LLM + Agent Décisionnel**

![Version](https://img.shields.io/badge/version-2.0-blue)
![Status](https://img.shields.io/badge/status-production-green)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 🎯 Vue d'ensemble

**PharmaHR AI** est une application web intelligente de gestion RH spécialisée pour les pharmacies. Elle combine :

- **🤖 Agent Décisionnel IA** basé sur Groq (LLaMA-3.1-8B-Instant)
- **📅 Planification Intelligente** avec optimisation automatique
- **👥 Gestion des Congés** avec analyse contextuelle
- **📊 Analyse de Surcharge** en temps réel
- **⚖️ Audit de Conformité** réglementaire
- **💬 Communication RH-Équipe** avec IA
- **🎨 Design Médical/Pharmaceutique** professionnel

---

## ✨ Fonctionnalités Principales

### 1. **Agent Décisionnel Proactif** 🧠
- Analyse automatique au démarrage
- Recommendations intelligentes basées sur Groq
- Décisions justifiées avec données chiffrées
- Anticipation des risques réglementaires

### 2. **Gestion du Planning** 📅
- Génération automatique multi-semaines
- Optimisation pour niveaux d'activité
- Respect contraintes : 8h/jour, pharmacien/shift
- Validation conformité en temps réel

### 3. **Demandes de Congé** 📝
- Interface simple et intuitive
- Délai minimum 14 jours
- Décision IA contextuelle avec justification
- Auto-gestion des absences

### 4. **Signalement d'Absences** 🚫
- Enregistrement au jour
- Alertes pharmacien en temps réel
- Vérification continuité de service

### 5. **Analyse Surcharge** 📊
- Calcul ratio ordonnances/employé
- Classification automatique (Normal/Attention/Critique)
- Recommandations décisionnelles IA

### 6. **Conformité Légale** ⚖️
- Audit multi-critères
- Score conformité %
- Alertes non-conformité
- Justification légale française

### 7. **Communication Intelligente** 💬
- Chat RH ↔ Équipe
- Réponses IA contextuelles
- Historique persistant
- Annonces dirigées

---

## 🛠️ Stack Technique

```
Frontend:      Vanilla JavaScript (ES6+) / HTML5 / CSS3
Backend:       Python HTTP Server (développement)
API IA:        Groq (LLaMA-3.1-8B-Instant)
Persistance:   LocalStorage (client)
Design:        Thème médical/pharmaceutique professionnel
```

---

## 📦 Installation

### Prérequis
- Python 3.7+
- Navigateur moderne (Chrome, Firefox, Safari, Edge)
- Clé API Groq (obtenir sur https://console.groq.com/)

### Étapes

1. **Cloner le repository**
```bash
git clone https://github.com/your-repo/pharmahr-ai.git
cd pharmahr-ai
```

2. **Configurer la clé Groq**
```bash
copy .env.example .env
```

Puis renseigner `GROQ_API_KEY` dans le fichier `.env`.

3. **Démarrer le serveur**
```bash
npm install
npm start
```

4. **Accéder à l'application**
```
http://localhost:3000
```

---

## 🎨 Design & UX

- **Thème Médical** : Palette bleu/vert pharmaceutique
- **Responsive** : Desktop-optimisé
- **Accessibilité** : Contraste élevé, navigation claire
- **Interactions** : Animations fluides, feedback utilisateur

### Couleurs principales
- 🔵 Bleu Médical : `#006BA6`
- 🟢 Vert Pharmacie : `#00A651`
- 🔷 Turquoise : `#00A9CE`

---

## 📋 Architecture

```
PharmaHR_AI/
├── index.html              # Interface principale
├── app.js                  # Logique applicative + IA
├── styles.css              # Thème médical
├── decisionAgent.js        # (Optionnel) Module agent séparé
└── README.md              # Cette documentation
```

---

## 🔒 Sécurité & Conformité

✅ **Protections activées :**
- ❌ Impossible de sélectionner dates passées
- ✅ Validation délai congés (14 jours)
- ✅ Respect heures max/jour (8h)
- ✅ Conformité pharmacien/shift
- ✅ Audit réglementaire français

---

## 🚀 Utilisation Rapide

### Exemple 1 : Demande Congé par Chat
```
RH: "Demande congé 20 mars 2026"
Agent: [Sélection employé] → [Analyse Groq] → [Décision justifiée]
```

### Exemple 2 : Génération Planning
```
Planning → Sélectionner semaine → Niveau d'activité → Générer
[Agent analyse] → [Planning validé] → [Affichage]
```

### Exemple 3 : Analyse Surcharge
```
Analyser Surcharge → Entrer ordonnances (ex: 200) 
→ [Groq: "Surcharge critique! Actions recommandées..."]
```

---

## 🧪 Variables de Test

### Employés Prédéfinis
- **Pharmaciens** : Dr. Sophie Martin, Dr. Pierre Dubois, Dr. Marie Laurent, Dr. Jean Moreau
- **Préparateurs** : Alice Bernard, Thomas Petit, Clara Roux, Lucas Garcia, Emma Leroy  
- **Admin** : Julie Bonnet, Marc Simon, Sarah Blanc

### Dates de Test
- ✅ Aujourd'hui : `2026-02-28`
- ✅ Dans 14 jours : `2026-03-14`
- ❌ Passée : `2026-02-20` (sera rejetée)

---

## 📊 Persistence

Les données sont automatiquement sauvegardées dans `localStorage` sous la clé `pharmahr_state_v1` :
- Absences
- Demandes de congé
- Planning généré
- Conversations
- Annonces

**Données persistées entre sessions** ✅

---

## 🔧 Configuration Groq

```bash
copy .env.example .env
# puis renseigner GROQ_API_KEY dans .env
```

**Modèle utilisé** : `llama-3.1-8b-instant`
**Tokens max** : 600 (personnalisable par appel)
**Timeout** : 10 secondes

---

## 🐛 Dépannage

### Le bouton ne répond pas
→ Vérifier la console (F12) pour les erreurs

### Pas de réponse IA
→ Vérifier la clé Groq et la connexion Internet

### Dates passées acceptées
→ Actualiser la page (Ctrl+R)

### Conversations non persistées
→ Vérifier que localStorage n'est pas désactivé

---

## 📝 License

MIT License - Libre d'utilisation avec mention d'attribution

---

## 🤝 Contribution

Les contributions sont bienvenues ! Créez une issue ou un PR pour proposer des améliorations.

---

## 📞 Support

Pour toute question ou problème :
- Ouvrir une GitHub Issue
- Consulter la documentation complète

---

**Développé avec ❤️ pour optimiser la gestion RH en pharmacie**

*Version : 2.0 | Statut : Production | Dernière mise à jour : Février 2026*
