import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  DB_HOST: process.env.DB_HOST!,
  DB_PORT: Number(process.env.DB_PORT || 1521),
  DB_SID: process.env.DB_SID!,
  DB_USER: process.env.DB_USER!,
  DB_PASSWORD: process.env.DB_PASSWORD!,
};
