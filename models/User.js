import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// Define User model
const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  profilePictureUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  aboutMe: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

export default User;
