# Architecture du projet Quiz Arena

## 1. Architecture complète
- Frontend : React + TypeScript + Vite
- UI : design e-sport responsive, mode sombre
- État local : React state pour les parcours solo et duel
- Prototype interactif : quiz complet sans backend requis

## 2. Structure des dossiers
- src/App.tsx : logique de navigation, quiz, scores, écrans
- src/App.css : styles globaux du gameplay
- src/index.css : thème de fond et base responsive
- docs/architecture.md : document de référence

## 3. Modèle de base de données
### Players
- id
- pseudo
- avatar
- session_id
- created_at

### Questions
- id
- question
- option_a
- option_b
- option_c
- option_d
- bonne_reponse
- categorie
- difficulte
- explication

### Games
- id
- code_equipe_a
- code_equipe_b
- nom_equipe_a
- nom_equipe_b
- score_a
- score_b
- categorie
- difficulte
- nombre_questions
- statut
- created_at

### Teams
- id
- game_id
- nom
- code
- score
- capitaine_id

### Team_players
- id
- team_id
- player_id
- role

### Answers
- id
- game_id
- player_id
- question_id
- reponse
- temps_reponse
- resultat
- points

## 4. Maquettes UI/UX
- Page d’accueil
- Création de duel
- Rejoindre une partie
- Salle d’attente
- Quiz principal
- Résultats

## 5. Étapes suivantes pour la version complète
- Ajout d’un backend Node.js/Express
- Intégration Socket.io en temps réel
- Persistance sur PostgreSQL + Prisma
- Authentification optionnelle, chat et historiques
