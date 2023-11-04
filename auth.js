// Importation de la bibliothèque dotenv pour la gestion des variables d'environnement
require("dotenv").config();

// Importation de la bibliothèque argon2 pour le hachage de mot de passe
const argon2 = require("argon2");

// Importation de la bibliothèque JWT pour la création de jetons d'authentification
const jwt = require("jsonwebtoken");

// Options de configuration pour le hachage de mot de passe
const hashingOptions = {
    type: argon2.argon2id, // Utilisation de l'algorithme argon2id
    memoryCost: 2 ** 16, // Coût en mémoire du hachage
    timeCost: 5, // Coût en temps du hachage
    parallelism: 1, // Parallélisme du hachage
};

// Middleware pour hacher le mot de passe de l'utilisateur
const hashPassword = (req, res, next) => {
    // Hachage du mot de passe avec argon2
    argon2
        .hash(req.body.password, hashingOptions)
        .then((hashedPassword) => {
            // Stockage du mot de passe haché dans le corps de la requête
            req.body.hashedPassword = hashedPassword;
            // Suppression du mot de passe en clair du corps de la requête
            delete req.body.password;

            // Passage au middleware suivant
            next();
        })
        .catch((err) => {
            // Gestion des erreurs de hachage
            console.error(err);
            res.sendStatus(500);
        })
};

// Fonction asynchrone pour vérifier le mot de passe de l'utilisateur
const verifyPassword = async (req, res) => {
    try {
        // argon2.verify compare le mot de passe en clair avec le mot de passe haché
        const isVerified = await argon2.verify(req.user.hashedPassword, req.body.password);
        if (isVerified) {
            // Si le mot de passe est valide, créer un payload pour le token JWT
            // Le payload contient l'ID de l'utilisateur
            const payload = { sub: req.user.id };

            // Création du token JWT en utilisant le payload et la clé secrète
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                // Le token expire après 1 heure
                expiresIn: "1h",
            });

            // Suppression du mot de passe haché de l'objet utilisateur
            delete req.user.hashedPassword;

            // Si le mot de passe est valide, envoyer une réponse positive
            res.send({ token, user: req.user });
        } else {
            // Si le mot de passe n'est pas valide, envoyer une réponse d'erreur
            res.sendStatus(401);
        }
    } catch (err) {
        // Gestion des erreurs de vérification
        console.error(err);
        res.sendStatus(500);
    }
}

// Fonction middleware pour vérifier le token JWT
const verifyToken = (req, res, next) => {
    try {
        // Récupération de l'en-tête "Authorization" de la requête
        const authorizationHeader = req.get("Authorization");

        // Si l'en-tête "Authorization" est absent, générer une erreur
        if (authorizationHeader == null) {
            throw new Error("Authorization header is missing");
        }

        // L'en-tête "Authorization" doit être de la forme "Bearer [token]"
        // Nous le divisons en deux parties : le type (qui doit être "Bearer") et le token
        const [type, token] = authorizationHeader.split(" ");

        // Si le type n'est pas "Bearer", générer une erreur
        if (type !== "Bearer") {
            throw new Error("Authorization header has not the 'Bearer' type");
        }

        // Vérification du token avec la clé secrète
        // Si le token est valide, jwt.verify renvoie le payload du token
        // On attache ce payload à l'objet req pour qu'il puisse être utilisé par les middlewares suivants
        req.payload = jwt.verify(token, process.env.JWT_SECRET);

        // Passage au middleware suivant
        next();
    } catch (err) {
        console.error(err);
        res.sendStatus(401);
    }
};


// Exportation des fonctions pour utilisation dans d'autres modules
module.exports = {
    hashPassword,
    verifyPassword,
    verifyToken,
};