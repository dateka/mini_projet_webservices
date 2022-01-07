# Mini projet Document securite
## de : WANECQUE damien et NOUREDDINE Yosr

En terme de sécurité, il faut implémenter des jetons JWT afin de pouvoir controler qui peut faire et qui ne peut pas faire.

Toutes les requêtes qui peuvent mettre en péril l'API ou l'expérience d'utilisation de l'API doit être controlé avec des jetons JWT.

Il faut aussi pouvoir sécuriser nos tokens de tels manière a ce qu'il ne puisse pas être contourné. Pour ce faire, on peut leur donner un date d'expiration. On peut destituer le token lorsque l'utilisateur se déconnecte. On peut aussi vérifier que le champs alg du token n'est pas en none (car cela voudrait dire que le hacker produiré des tokens avec alg none et il contournerait la sécurité)

Il faut aussi limiter l'accès aux ressources au strict minimum. Car sinon les hackers pourront utiliser certains pour contourner l'API.

Il faut imposer une taille sur les ressources demandé à l'utilisateur. Cela éviterait des attaques DDOS et des attaques de hackage de type brute force.

Il faut aussi essayer de séparer au maximum les rangs des users avec roles afin de sécuriser au max l'API. Si les rangs sont flou, les hackers peuvent en tirer profit et obtenir des droits admins.

Il faut essayer aussi de controler au max ce que le client peut importer sur notre API (en terme de type de données), en faisant des controlles de champs avant l'envoie en base de données.

Il faut eviter les messages d'erreur avec des infos sensible ainsi que des ressources Cross origin permissif.

Il faut aussi eviter au max les injections de code, notamment en mettant toutes les données sous une forme canonique.

Il faut aussi avoir une documentation la plus claire et la plus mis à jour possible de tel manière à ne pas avoir de endpoints obsolètes.

Il faut aussi essayer d'instaurer un système de monitoring afin d'être prévenu le plus tot possible en cas d'attaque.
