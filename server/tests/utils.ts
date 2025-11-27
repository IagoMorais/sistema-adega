import express from "express";
import { registerRoutes } from "../routes";

export async function setupTestServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const server = await registerRoutes(app);

  return { app, server };
}
