# Quiz Arena — Culture Générale

## Vision
Une plateforme web moderne de quiz orientée gaming, pensée pour le solo et les duels en équipe sans création de compte.

## Architecture complète
- Frontend React + TypeScript + Vite
- UI moderne inspirée de l’e-sport avec mode sombre
- Logique de quiz locale pour le prototype interactif
- Structure prête pour une évolution vers Node.js + Socket.io + PostgreSQL/Prisma

## Structure des dossiers frontend/backend
- src/App.tsx : écrans principaux, logique de quiz et navigation
- src/App.css : design système et styles du jeu
- src/index.css : thème global et base responsive
- docs/architecture.md : schéma fonctionnel complet et modèle de données
- server/index.ts : gateway Socket.io avec contrôle de room côté serveur

## Lancer le temps réel

```bash
npm run dev
npm run server
```

Le serveur sépare `game:<id>` (état public), `game:<id>:team:A` et `game:<id>:team:B`. Les messages d’équipe sont émis exclusivement dans la room privée du joueur autorisé : aucun chat, brouillon de réponse ou choix stratégique ne doit être envoyé à la room publique.

## Modèle de base de données
- Players : pseudo, avatar, session_id, created_at
- Questions : question, options, bonne réponse, catégorie, difficulté, explication
- Games : codes d’équipe, noms, scores, catégorie, niveau, nombre de questions, statut
- Teams : game_id, nom, code, score, capitaine_id
- Team_players : team_id, player_id, role
- Answers : game_id, player_id, question_id, réponse, temps, résultat, points

## Maquettes UI/UX
- Page d’accueil avec trois parcours principaux
- Formulaires de configuration solo et duel
- Salle d’attente avec codes privés et liste des joueurs
- Interface de quiz avec timer, scores et réponses
- Page de résultats détaillée

## Étapes de développement prévues
1. Architecture complète du projet
2. Structure frontend/backend
3. Modèle de base de données
4. Maquettes UI/UX
5. Développement frontend React TypeScript
6. Développement backend Node.js
7. Implémentation Socket.io temps réel
8. Tests du mode solo et duel
9. Optimisation et déploiement
