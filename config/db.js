import { Sequelize } from "sequelize";

//prod

const sequelize = new Sequelize(
  "postgresql://postgres:HYcphR4wGzEYIgSFYaQU@containers-us-west-110.railway.app:7514/railway"
);

//dev

// const sequelize = new Sequelize("recipeApp", "postgres", "1111", {
//   host: "localhost",
//   dialect: "postgres",
//   logging: false, // Disabling logging for cleaner output, set to 'true' if you want to see SQL queries.
// });

try {
  await sequelize.authenticate();
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

export default sequelize;
