# Temps réel sécurisé

## Canaux Socket.io

| Room | Données autorisées |
| --- | --- |
| `game:<gameId>` | question publiée, timer, scores validés, résultats de manche, présence des joueurs |
| `game:<gameId>:team:A` | chat A, brouillons A, choix de stratégie A |
| `game:<gameId>:team:B` | chat B, brouillons B, choix de stratégie B |

Le serveur associe le socket à une seule équipe au moment de `game:create` ou `game:join`, après contrôle du code d’équipe. Il ne fait jamais confiance à un champ `team` envoyé ensuite par le navigateur : `team:chat` et `answer:submit` utilisent uniquement cette session serveur.

## Règles de diffusion

- Les messages, brouillons, représentants et décisions de réplique utilisent exclusivement la room privée de l’équipe concernée.
- L’état public ne contient aucune donnée de discussion ou de réponse avant validation.
- Le serveur vérifie que l’équipe connectée possède le tour avant d’accepter une réponse.
- Une réponse ne doit devenir publique qu’après vérification de la réponse, du timer et du score par le moteur de partie serveur.

## Production

Les codes d’équipe sont des identifiants de session de prototype. En production, les remplacer par un jeton signé à durée limitée, rattacher le socket à une identité authentifiée, stocker les parties dans une base de données et appliquer un rate-limit sur les événements Socket.io.
