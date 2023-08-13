import express from "express";
import cors from "cors";
import morgan from "morgan";
import sequelize from "./config/db.js";
import { Op } from "sequelize";

import User from "./models/User.js";
import Recipe from "./models/Recipe.js";
import Like from "./models/Like.js";
import Review from "./models/Review.js";

const app = express();

// middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

Recipe.belongsTo(User);
User.hasMany(Recipe);

User.belongsToMany(Recipe, { through: Like });
Recipe.belongsToMany(User, { through: Like });

Like.belongsTo(User);
User.hasMany(Like);

Like.belongsTo(Recipe);
Recipe.hasMany(Like);

// A User can have many Comments, and acl Comment belongs to one User
User.hasMany(Review);
Review.belongsTo(User);

// A Recipe can have many Comments, and a Comment belongs to one Recipe
Recipe.hasMany(Review);
Review.belongsTo(Recipe);

sequelize
  .sync()
  .then(() => {
    console.log("user and recipe table created successfully!");
  })
  .catch((error) => {
    console.error("unable to create table : ", error);
  });

//=====================( middleware )===========================
function authenticateToken(req, res, next) {
  // Assigning user id to req object can be useful for downstream middleware/routes.
  req.userId = "be961ebe-6b6b-4921-89f3-11ca97410da6";
  next();
}

// 🟢 🟢 🟢 🟢 🟢 🟢 POST 🟢 🟢 🟢 🟢 🟢 🟢

//===================( create new recipe )===========================

app.post("/recipe", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      cuisine,
      ingredients,
      instructions,
      recipePictureUrl,
      totalPrepTime,
      difficultyLevel,
      notes,
    } = req.body;

    // Check if all fields are present
    if (
      !name ||
      !cuisine ||
      !ingredients ||
      !instructions ||
      !recipePictureUrl ||
      !totalPrepTime ||
      !difficultyLevel ||
      !notes
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Create a new recipe
    const recipe = await Recipe.create({
      name,
      cuisine,
      ingredients,
      instructions,
      recipePictureUrl,
      totalPrepTime,
      difficultyLevel,
      notes,
      UserId: req.userId,
    });

    res.status(201).json({
      message: "Recipe created successfully",
      recipe: recipe,
    });
  } catch (error) {
    console.error("Error creating recipe", error);
    res.status(500).json({ message: "Error creating recipe" });
  }
});

//===================( like a recipe )===========================

app.post("/like/:id", authenticateToken, async (req, res) => {
  const userId = req.userId;
  const recipeId = req.params.id;

  if (!userId || !recipeId) {
    return res
      .status(400)
      .json({ message: "User ID and Recipe ID are required" });
  }

  try {
    await sequelize.transaction(async (t) => {
      // Check if the like already exists
      const existingLike = await Like.findOne({
        where: { UserId: userId, RecipeId: recipeId },
        transaction: t,
      });

      if (existingLike) {
        return res
          .status(400)
          .json({ message: "You have already liked this recipe" });
      }

      // Create a new like
      await Like.create(
        {
          UserId: userId,
          RecipeId: recipeId,
        },
        { transaction: t }
      );

      // Optionally, increment the like count in the Recipe model
      const recipe = await Recipe.findByPk(recipeId, { transaction: t });
      recipe.likes += 1;
      await recipe.save({ transaction: t });
    });

    res.status(200).json({ message: "Successfully liked the recipe" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//===================( create a new review to a recipe )===========================

app.post("/review/:id", authenticateToken, async (req, res) => {
  const recipeId = req.params.id;
  const userId = req.userId;
  const content = req.body.content;

  // Validate recipeId and content
  if (!recipeId || !content) {
    return res
      .status(400)
      .json({ message: "Recipe ID and content are required" });
  }

  try {
    await sequelize.transaction(async (t) => {
      // Create a new review
      await Review.create(
        {
          UserId: userId,
          RecipeId: recipeId,
          content: content,
        },
        { transaction: t }
      );

      // Increment the reviews count in the Recipe model
      const recipe = await Recipe.findByPk(recipeId, { transaction: t });
      recipe.reviews += 1;
      await recipe.save({ transaction: t });
    });

    res.status(200).json({ message: "Successfully added the review" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//===================( ai chatbot )===========================

app.post("/chatbot", authenticateToken, async (req, res) => {
  const { input } = req.body;

  try {
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: input,
      max_tokens: 100,
      temperature: 0.5,
    });
    res.status(200).json({ message: response.data.choices[0].text.trim() });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 🔵 🔵 🔵 🔵 🔵 🔵 GET 🔵 🔵 🔵 🔵 🔵 🔵

//===================( get all recipes )===========================

app.get("/all-recipes", authenticateToken, async (req, res) => {
  try {
    // Retrieve all recipes
    const recipes = await Recipe.findAll();

    // If no recipes found, return appropriate message
    if (!recipes) {
      return res.status(404).json({ message: "No recipes found" });
    }

    res.status(200).json({
      message: "Recipes fetched successfully",
      recipes: recipes,
    });
  } catch (error) {
    console.error("Error fetching recipes", error);
    res.status(500).json({ message: "Error fetching recipes" });
  }
});

//===================( get a recipe )===========================

app.get("/recipe/:id", authenticateToken, async (req, res) => {
  try {
    // Retrieve the recipe id from the request parameters
    const recipeId = req.params.id;

    // Find the recipe
    const recipe = await Recipe.findByPk(recipeId, {
      include: [
        {
          model: User,
          attributes: ["id", "username", "profilePictureUrl"],
        },
      ],
    });

    // If no recipe found, return appropriate message
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    res.status(200).json({
      message: "Recipe fetched successfully",
      recipe: recipe,
    });
  } catch (error) {
    console.error("Error fetching recipe", error);
    res.status(500).json({ message: "Error fetching recipe" });
  }
});

//===================( get a user by id )===========================

app.get("/user/:id", authenticateToken, async (req, res) => {
  try {
    // Retrieve the user id from the request parameters
    const userId = req.params.id;

    // Find the user and include their recipes
    const user = await User.findByPk(userId, {
      attributes: ["id", "username", "email", "profilePictureUrl", "aboutMe"],
    });

    // If no user found, return appropriate message
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User fetched successfully",
      user: user,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user" });
  }
});

//===================( get recipes by user id )===========================

app.get("/user-recipes/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const userExists = await User.findByPk(userId);
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Retrieve all recipes created by the authenticated user
    const recipes = await Recipe.findAll({ where: { UserId: userId } });

    // If no recipes found, return appropriate message
    if (!recipes || recipes.length === 0) {
      return res.status(404).json({ message: "No recipes found" });
    }

    res.status(200).json({
      message: "Recipes fetched successfully",
      recipes: recipes,
    });
  } catch (error) {
    console.error("Error fetching recipes", error);
    res.status(500).json({ message: "Error fetching recipes" });
  }
});

//===================( search recipes by various fields )===========================

app.get("/search-recipes", authenticateToken, async (req, res) => {
  try {
    const { field, query, sortField, sortOrder } = req.query;

    // Build the query
    let whereClause = {
      [field]: {
        [Op.iLike]: "%" + query + "%",
      },
    };

    // Execute the query
    const recipes = await Recipe.findAll({
      where: whereClause,
      order: [[sortField, sortOrder]], // Order by sortField (default: createdAt) in sortOrder (default: DESC)
    });

    // If no recipes found, return appropriate message
    if (!recipes || recipes.length === 0) {
      return res
        .status(404)
        .json({ message: `No recipes found with ${field}: ${query}` });
    }

    res.status(200).json({
      message: "Recipes fetched successfully",
      recipes: recipes,
    });
  } catch (error) {
    console.error("Error fetching recipes", error);
    res.status(500).json({ message: "Error fetching recipes" });
  }
});

// ===================( get all reviews for a recipe )=============================

app.get("/reviews/:id", authenticateToken, async (req, res) => {
  try {
    // Retrieve the recipe id from the request parameters
    const recipeId = req.params.id;

    // Find all reviews for this recipe
    const reviews = await Review.findAll({
      where: { RecipeId: recipeId },
      include: [
        {
          model: User,
          attributes: ["username", "profilePictureUrl"], // Only fetch necessary user attributes
        },
      ],
      order: [["createdAt", "DESC"]], // Order reviews by creation date
    });

    // If no reviews found, return a 404 status and a message
    if (!reviews || reviews.length === 0) {
      return res
        .status(404)
        .json({ message: "No reviews found for this recipe" });
    }

    res.status(200).json({
      message: "Reviews fetched successfully",
      reviews: reviews,
    });
  } catch (error) {
    console.error("Error fetching reviews", error);
    res.status(500).json({ message: "Error fetching reviews" });
  }
});

//===================( check if recipe is liked or not )===========================

app.get("/is-liked/:id", authenticateToken, async (req, res) => {
  const userId = req.userId;
  const recipeId = req.params.id;

  if (!userId || !recipeId) {
    return res
      .status(400)
      .json({ message: "User ID and Recipe ID are required" });
  }

  try {
    const existingLike = await Like.findOne({
      where: { UserId: userId, RecipeId: recipeId },
    });

    if (existingLike) {
      return res.status(200).json({ isLiked: true });
    } else {
      return res.status(200).json({ isLiked: false });
    }
  } catch (error) {
    console.error(
      "An error occurred while checking if a recipe is liked",
      error
    );
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ===================( get all liked recipes for a user )============================

app.get("/liked-recipes", authenticateToken, async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Find all likes for this user
    const likedRecipes = await Like.findAll({
      where: { UserId: userId },
      include: [
        {
          model: Recipe,
          attributes: ["id", "name", "cuisine", "recipePictureUrl"], // Only fetch necessary recipe attributes
        },
      ],
    });

    // If no likes found, return a 404 status and a message
    if (!likedRecipes || likedRecipes.length === 0) {
      return res
        .status(404)
        .json({ message: "No liked recipes found for this user" });
    }

    // Return the recipes user has liked
    const recipes = likedRecipes.map((like) => like.Recipe);

    res.status(200).json({
      message: "Liked recipes fetched successfully",
      recipes: recipes,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching liked recipes" });
  }
});

// ===================( group recipes by cuisine )============================

app.get("/recipes-count-by-cuisine", authenticateToken, async (req, res) => {
  try {
    const data = await Recipe.findAll({
      group: ["cuisine"],
      attributes: [
        "cuisine",
        [
          sequelize.cast(
            sequelize.fn("COUNT", sequelize.col("cuisine")),
            "integer"
          ),
          "count",
        ],
      ],
      order: [[sequelize.literal('"count"'), "DESC"]],
    });

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "No recipes found" });
    }
    res.status(200).json({ message: "data fetched successfully", data: data });
  } catch (error) {
    res.status(500).json({ message: "Error getting recipe count by cuisine" });
  }
});

// ===================( group recipes by difficultyLevel )======================

app.get("/recipes-count-by-difficulty", async (req, res) => {
  try {
    const data = await Recipe.findAll({
      group: ["difficultyLevel"],
      attributes: [
        "difficultyLevel",
        [
          sequelize.cast(
            sequelize.fn("COUNT", sequelize.col("difficultyLevel")),
            "integer"
          ),
          "count",
        ],
      ],
      order: [[sequelize.literal('"count"'), "DESC"]],
    });

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "No recipes found" });
    }

    res.status(200).json({ message: "Data fetched successfully", data: data });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error getting recipe count by difficulty level" });
  }
});

// 🔴 🔴 🔴 🔴 🔴 🔴 DELETE 🔴 🔴 🔴 🔴 🔴 🔴

//===================( delete a recipe by id )===========================

app.delete("/recipe/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Recipe ID is required." });
    }

    // Find the recipe by id
    const recipe = await Recipe.findByPk(id);

    // If no recipe found, return appropriate message
    if (!recipe) {
      return res
        .status(404)
        .json({ message: `No recipe found with id: ${id}` });
    }

    // Check if the user is the owner of the recipe
    if (recipe.UserId !== req.userId) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    // Delete the recipe
    await recipe.destroy();

    res.status(200).json({ message: "Recipe deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting recipe" });
  }
});

//===================( unlike a recipe )===========================

app.delete("/unlike/:id", authenticateToken, async (req, res) => {
  const userId = req.userId;
  const recipeId = req.params.id;

  if (!userId || !recipeId) {
    return res
      .status(400)
      .json({ message: "User ID and Recipe ID are required" });
  }

  try {
    await sequelize.transaction(async (t) => {
      // Check if the like exists
      const existingLike = await Like.findOne({
        where: { UserId: userId, RecipeId: recipeId },
        transaction: t,
      });

      // If there's no like, the user hasn't liked the recipe yet
      if (!existingLike) {
        return res
          .status(400)
          .json({ message: "You have not liked this recipe yet" });
      }

      // Delete the like
      await Like.destroy({
        where: {
          UserId: userId,
          RecipeId: recipeId,
        },
        transaction: t,
      });

      // Decrement the like count in the Recipe model
      const recipe = await Recipe.findByPk(recipeId, { transaction: t });
      if (recipe.likes > 0) {
        recipe.likes -= 1;
      }
      await recipe.save({ transaction: t });
    });

    res.status(200).json({ message: "Successfully unliked the recipe" });
  } catch (error) {
    console.error("An error occurred while unliking a recipe", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//===================( delete a review by id )===========================

app.delete("/review/:id", authenticateToken, async (req, res) => {
  const userId = req.userId;
  const reviewId = req.params.id;

  if (!userId || !reviewId) {
    return res
      .status(400)
      .json({ message: "User ID and Review ID are required" });
  }

  try {
    await sequelize.transaction(async (t) => {
      // Check if the review exists
      const existingReview = await Review.findByPk(reviewId, {
        transaction: t,
      });

      if (!existingReview) {
        return res.status(400).json({ message: "The review does not exist" });
      }

      // Check if the review belongs to the user
      if (existingReview.UserId !== userId) {
        return res
          .status(403)
          .json({ message: "You are not the owner of this review" });
      }

      const recipeId = existingReview.RecipeId;

      // Delete the review
      await Review.destroy({
        where: { id: reviewId },
        transaction: t,
      });

      // Decrement the reviews count in the Recipe model
      const recipe = await Recipe.findByPk(recipeId, { transaction: t });
      if (recipe.reviews > 0) {
        recipe.reviews -= 1;
      }
      await recipe.save({ transaction: t });
    });

    res.status(200).json({ message: "Successfully deleted the review" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 🟡 🟡 🟡 🟡 🟡 🟡 PUT 🟡 🟡 🟡 🟡 🟡 🟡

// ===================( update user )============================

app.put("/update-user", authenticateToken, async (req, res) => {
  try {
    const { username, profilePictureUrl, aboutMe } = req.body;

    // Retrieve the user id from the JWT token
    const userId = req.userId;

    // Find the user
    const user = await User.findByPk(userId);

    // Check if the new username already exists, excluding the current user
    if (username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(409).json({ message: "Username already in use" });
      }
    }

    // Directly update the user details
    user.username = username;
    user.profilePictureUrl = profilePictureUrl;
    user.aboutMe = aboutMe;

    // Save the updated user details
    await user.save();

    // Return the updated user details
    res.status(200).json({
      message: "User updated successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating user" });
  }
});

//===================( update a recipe )===========================

app.put("/recipe/:id", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      cuisine,
      ingredients,
      instructions,
      recipePictureUrl,
      totalPrepTime,
      difficultyLevel,
      notes,
    } = req.body;

    // Retrieve the recipe id from the request parameters
    const recipeId = req.params.id;

    // Find the recipe
    const recipe = await Recipe.findByPk(recipeId);

    // If no recipe found, return appropriate message
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Check if the user is the owner of the recipe
    if (recipe.UserId !== req.userId) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    // Update the recipe
    await recipe.update({
      name,
      cuisine,
      ingredients,
      instructions,
      recipePictureUrl,
      totalPrepTime,
      difficultyLevel,
      notes,
    });

    res.status(200).json({
      message: "Recipe updated successfully",
    });
  } catch (error) {
    console.error("Error updating recipe", error);
    res.status(500).json({ message: "Error updating recipe" });
  }
});

//===================( update a review )===========================

app.put("/review/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Review ID is required." });
    }

    if (!content) {
      return res.status(400).json({ message: "Content is required." });
    }

    const review = await Review.findByPk(id);

    if (!review) {
      return res
        .status(404)
        .json({ message: `No review found with id: ${id}` });
    }

    if (review.UserId !== req.userId) {
      return res
        .status(403)
        .json({ message: "User is not authorized to edit this review." });
    }

    review.content = content;
    await review.save();

    res.status(200).json({ message: "Review updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating review" });
  }
});

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
