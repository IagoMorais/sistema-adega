import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupDefaultUsers } from "./setup-default-users";
import { setupSwagger } from "./swagger";

if (!process.env.SESSION_SECRET) {
  console.error("SESSION_SECRET must be defined before starting the server.");
  process.exit(1);
}

const app = express();

// Configurar Helmet com CSP apropriado para desenvolvimento
app.use(
  helmet({
    contentSecurityPolicy:
      app.get("env") === "development"
        ? false // Desabilitar CSP em desenvolvimento para permitir Vite HMR
        : undefined, // Usar padrão do Helmet em produção
  })
);

// Configuração do logger primeiro
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const duration = Date.now() - start;
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);

// Rota pública para criar admin antes de qualquer middleware
app.post("/api/setup-admin", async (req, res) => {
  try {
    log('Recebida requisição para criar admin');
    // Precisamos do body parser aqui
    express.json()(req, res, async () => {
      const { storage } = await import('./storage');
      const { hashPassword } = await import('./utils');

      const existingAdmin = await storage.getUserByUsername("admin");
      if (existingAdmin) {
        log('Admin já existe');
        return res.status(400).send("Admin já existe");
      }

      // Usar senha do .env ou padrão
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
      const hashedPassword = await hashPassword(defaultPassword);
      const adminUser = await storage.createUser({
        username: "admin",
        password: hashedPassword,
        role: "admin",
      });

      log('Admin criado com sucesso');
      res.status(201).json(adminUser);
    });
  } catch (error) {
    log('Erro ao criar admin: ' + error);
    console.error("Erro ao criar admin:", error);
    res.status(500).send("Erro ao criar admin");
  }
});

// Configuração dos middlewares gerais após as rotas públicas
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  try {
    // Configura usuários padrão
    await setupDefaultUsers();

    // Configurar Swagger ANTES das rotas e do Vite
    setupSwagger(app);

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      // Configurar Vite DEPOIS do Swagger para evitar conflitos
      await setupVite(app, server);
    } else {
      serveStatic(app);
      
      // Fallback SPA para produção
      app.use("*", (req, res) => {
        if (req.path.startsWith("/api")) {
          return res.status(404).json({ message: "Rota API não encontrada" });
        }
        const distPath = path.resolve(__dirname, "public");
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    }

    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    server.listen(PORT, '0.0.0.0', () => {
      log(`Servidor rodando em 0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao inicializar servidor:", error);
    process.exit(1);
  }
})();
