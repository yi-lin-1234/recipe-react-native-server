import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// Define Recipe model
const Recipe = sequelize.define("Recipe", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cuisine: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ingredients: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  recipePictureUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  totalPrepTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  difficultyLevel: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  likes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  reviews: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

export default Recipe;
