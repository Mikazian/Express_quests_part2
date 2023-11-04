const database = require("./database");

const getUsers = (req, res) => {
  // Initialisation de la requête SQL pour sélectionner tous les utilisateurs
  const initialSql = "select * from users";

  // Initialisation d'un tableau vide pour stocker les conditions de la requête
  const where = [];

  // Si la requête contient un paramètre 'city', ajouter une condition à la requête
  if (req.query.city != null) {
    where.push({
      column: "city", // Colonne à comparer
      value: req.query.city, // Valeur à comparer
      operator: "=", // Opérateur de comparaison
    });
  }
  // Si la requête contient un paramètre 'language', ajouter une condition à la requête
  if (req.query.language != null) {
    where.push({
      column: "language", // Colonne à comparer
      value: req.query.language, // Valeur à comparer
      operator: "=", // Opérateur de comparaison
    });
  }

  database
    .query(
      // Utilisation de la méthode 'reduce' pour construire la requête SQL en fonction des conditions
      where.reduce(
        // Si c'est la première condition, ajouter 'where', sinon ajouter 'and'
        (sql, { column, operator }, index) =>
          `${sql} ${index === 0 ? "where" : "and"} ${column} ${operator} ?`,
        initialSql
      ),
      // Utilisation de la méthode 'map' pour extraire les valeurs des conditions
      where.map(({ value }) => value)
    )
    .then(([users]) => {
      // Boucle sur tous les users retournés par la requête
      const usersWithoutPassword = users.map((user) => {

        // Destructurer l'objet utilisateur pour séparer le mot de passe haché du reste des propriétés de l'objet user
        const { hashedPassword, ...userWithoutPassword } = user;

        // Renvoyer l'objet user sans la propriété du mot de passe haché
        return userWithoutPassword;
      });
      // Envoi de la réponse au client avec les utilisateurs sans leur mot de passe
      res.json(usersWithoutPassword);
    })
    .catch((err) => {
      // En cas d'erreur lors de l'exécution de la requête, afficher l'erreur et envoyer une réponse d'erreur au client
      console.error(err);
      res.status(500).send("Error retrieving data from database");
    });
};

const getUserById = (req, res) => {
  // Récupération de l'ID de l'utilisateur à partir des paramètres de la requête et conversion en nombre entier
  const id = parseInt(req.params.id);

  database
    .query("select * from users where id = ?", [id])
    .then(([users]) => {
      // Si un utilisateur a été trouvé
      if (users[0] != null) {
        // Destructurer l'objet utilisateur pour séparer le mot de passe haché du reste des propriétés de l'utilisateur
        const { hashedPassword, ...userWithoutPassword } = users[0];

        // Renvoyer l'objet utilisateur sans la propriété du mot de passe haché
        res.json(userWithoutPassword);
      } else {
        // Si aucun utilisateur n'a été trouvé, renvoyer une erreur 404
        res.status(404).send("Not Found");
      }
    })
    .catch((err) => {
      // En cas d'erreur lors de l'exécution de la requête, afficher l'erreur et envoyer une réponse d'erreur au client
      console.error(err);
      res.status(500).send("Error retrieving data from database");
    });
};

const postUser = (req, res) => {
  // Récupération des données de l'utilisateur à partir du corps de la requête
  const { firstname, lastname, email, city, language, hashedPassword } =
    req.body;

  database
    .query(
      // La requête SQL pour insérer un nouvel utilisateur dans la table 'users'
      "INSERT INTO users(firstname, lastname, email, city, language, hashedPassword) VALUES (?, ?, ?, ?, ?, ?)",
      // Les valeurs à insérer dans la requête SQL
      [firstname, lastname, email, city, language, hashedPassword]
    )
    .then(([result]) => {
      // Si l'utilisateur a été créé avec succès, renvoyer un statut 201 et définir l'emplacement de l'utilisateur dans l'en-tête 'Location'
      res.location(`/api/users/${result.insertId}`).sendStatus(201);
    })
    .catch((err) => {
      // En cas d'erreur lors de l'exécution de la requête, afficher l'erreur et envoyer une réponse d'erreur au client
      console.error(err);
      res.status(500).send("Error saving the user");
    });
};

const updateUser = (req, res) => {
  // Récupération de l'ID de l'utilisateur à partir des paramètres de la requête et conversion en nombre entier
  const id = parseInt(req.params.id);

  // Récupération de l'ID de l'utilisateur à partir du payload du token JWT
  const userIdFromToken = req.payload.sub;

  // Récupération des données de l'utilisateur à partir du corps de la requête
  const { firstname, lastname, email, city, language } = req.body;

  // L'ID de l'utilisateur dans le token JWT doit correspondre à l'ID de l'utilisateur dans les paramètres de la requête
  if (id !== userIdFromToken) {
    return res.status(403).send("Forbidden");
  }

  database
    .query(
      // La requête SQL pour mettre à jour un utilisateur dans la table 'users'
      "update users set firstname = ?, lastname = ?, email = ?, city = ?, language = ? where id = ?",
      // Les valeurs à insérer dans la requête SQL
      [firstname, lastname, email, city, language, id]
    )
    .then(([result]) => {
      // Si aucun utilisateur n'a été mis à jour (c'est-à-dire si l'ID n'existe pas), renvoyer une erreur 404
      if (result.affectedRows === 0) {
        // Si l'utilisateur a été mis à jour avec succès, renvoyer un statut 204
        res.status(404).send("Not Found");
      } else {
        res.sendStatus(204);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error editing the user");
    });
};

const deleteUser = (req, res) => {
  // Si l'utilisateur a été mis à jour avec succès, renvoyer un statut 204
  const id = parseInt(req.params.id);

  // Récupération de l'ID de l'utilisateur à partir du payload du token JWT
  const userIdFromToken = req.payload.sub;

  // L'ID de l'utilisateur dans le token JWT doit correspondre à l'ID de l'utilisateur dans les paramètres de la requête
  if (id !== userIdFromToken) {
    return res.status(403).send("Forbidden");
  }

  database
    .query("delete from users where id = ?", [id])
    .then(([result]) => {
      // Si aucun utilisateur n'a été supprimé (c'est-à-dire si l'ID n'existe pas), renvoyer une erreur 404
      if (result.affectedRows === 0) {
        res.status(404).send("Not Found");
      } else {
        // Si l'utilisateur a été supprimé avec succès, renvoyer un statut 204
        res.sendStatus(204);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error deleting the user");
    });
};

// Définition de la fonction getUserByEmailWithPasswordAndPassToNext qui gère les requêtes pour obtenir un utilisateur par son email
const getUserByEmailWithPasswordAndPassToNext = (req, res, next) => {
  // Si l'utilisateur a été supprimé avec succès, renvoyer un statut 204
  const { email } = req.body;

  database
    .query("SELECT * FROM users WHERE email = ?", [email])
    // Si un utilisateur a été trouvé
    .then(([users]) => {
      if (users[0] != null) {
        // Ajout de l'utilisateur à l'objet de requête pour utilisation dans le middleware suivant
        req.user = users[0];

        // Appel de la fonction next pour passer au middleware suivant
        next();
      } else {
        // Si aucun utilisateur n'a été trouvé, renvoyer une erreur 401
        res.sendStatus(401);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error retrieving data from database");
    })
}

module.exports = {
  getUsers,
  getUserById,
  postUser,
  updateUser,
  deleteUser,
  getUserByEmailWithPasswordAndPassToNext,
};
