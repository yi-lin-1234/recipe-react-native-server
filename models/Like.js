import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Like = sequelize.define("Like", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
});

export default Like;
