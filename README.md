# 🍽️ Sistema de Gestão ControlhePDV

Sistema completo de gestão de comandas para restaurantes e bares. Controle pedidos, estoque, pagamentos e estações de preparo (cozinha/bar) de forma integrada e eficiente.

## ✨ Características

- ✅ **Multi-estação**: Cozinha e Bar separados
- ✅ **Controle de Estoque**: Alertas automáticos de baixo estoque
- ✅ **Múltiplos Papéis**: Admin, Garçom, Caixa, Cozinha, Bar
- ✅ **Tempo Real**: Atualizações instantâneas de pedidos
- ✅ **API Documentada**: Swagger/OpenAPI integrado
- ✅ **Responsivo**: Interface adaptável para mobile/tablet/desktop

## 🚀 Início Rápido

```bash
# Clone o repositório
git clone <seu-repositorio>
cd sistema-gestao-controlhepdv

# Instale e configure
./start.sh install

# Inicie o sistema
./start.sh dev
```

**Pronto!** Acesse: http://localhost:3001

**Login padrão:**
- Usuário: `admin`
- Senha: `admin123`

## 📖 Documentação Completa

- **[INSTALL.md](INSTALL.md)** - Guia completo de instalação
- **[QUICK_START.md](QUICK_START.md)** - Guia de início rápido
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Solução de problemas
- **[ANALISE_SISTEMA.md](ANALISE_SISTEMA.md)** - Análise técnica do sistema

## 🛠️ Tecnologias

### Backend

- **Express.js** + TypeScript + Drizzle ORM
- **PostgreSQL** 16 (via Docker ou local)
- **Passport.js** (autenticação local)
- **Swagger/OpenAPI** (documentação automática)

### Frontend
- **React 18** + Vite
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** (gerenciamento de estado)
- **Wouter** (roteamento)

### Banco de Dados
- **Drizzle ORM** (schemas tipados compartilhados)
- **PostgreSQL** (sessões + dados)

## 📋 Comandos Disponíveis

### Script Unificado (Recomendado)

```bash
./start.sh dev          # Desenvolvimento
./start.sh prod         # Produção
./start.sh test         # Executar testes
./start.sh verify       # Verificar sistema
./start.sh backup       # Backup manual
./start.sh clean        # Limpar temporários
./start.sh logs         # Ver logs
./start.sh install      # Instalação inicial
./start.sh help         # Ajuda completa
```

### NPM Scripts

```bash
npm run dev             # Desenvolvimento
npm run build           # Build produção
npm start               # Iniciar produção
npm test                # Testes
npm run check           # Verificar tipos
npm run db:push         # Atualizar schema DB
```

## 👥 Papéis e Permissões

| Papel | Descrição | Acesso |
|-------|-----------|--------|
| **Admin** | Administrador do sistema | Tudo: usuários, produtos, relatórios, configurações |
| **Waiter** | Garçom | Criar pedidos, visualizar mesas |
| **Cashier** | Caixa | Finalizar pedidos, processar pagamentos |
| **Kitchen** | Cozinha | Fila de preparo (cozinha) |
| **Bar** | Bar | Fila de preparo (bar) |

**Usuários padrão criados automaticamente:**
- admin / admin123
- waiter / waiter123  
- cashier / cashier123
- kitchen / kitchen123
- bar / bar123

⚠️ **IMPORTANTE:** Altere essas senhas em produção!

## 🔄 Fluxo de Trabalho

```
1. Garçom cria pedido
   ↓
2. Sistema separa itens por estação (cozinha/bar)
   ↓
3. Estações preparam itens
   ↓
4. Itens marcados como prontos
   ↓
5. Caixa finaliza pedido e processa pagamento
```

## 🏗️ Arquitetura do Projeto

```
sistema-gestao-controlhepdv/
├── client/              # Frontend React
│   ├── src/
│   │   ├── components/  # Componentes UI
│   │   ├── pages/       # Páginas da aplicação
│   │   ├── hooks/       # React hooks customizados
│   │   └── lib/         # Utilitários
├── server/              # Backend Express
│   ├── routes.ts        # Rotas da API
│   ├── auth.ts          # Autenticação
│   ├── db.ts            # Conexão banco de dados
│   ├── storage.ts       # Camada de dados
│   └── services/        # Serviços externos
├── shared/              # Código compartilhado
│   └── schema.ts        # Schemas Drizzle + Zod
├── scripts/             # Scripts utilitários
└── start.sh            # Script unificado ⭐
```

## 🔒 Segurança

- ✅ Senhas hasheadas com bcrypt
- ✅ Sessões seguras (PostgreSQL)
- ✅ Rate limiting em rotas de autenticação
- ✅ Helmet.js para headers de segurança
- ✅ CSP (Content Security Policy)
- ✅ CORS configurado

## 📊 API Endpoints

Documentação completa disponível em: http://localhost:3001/api-docs

Principais endpoints:
- `POST /api/login` - Autenticação
- `GET /api/products` - Listar produtos
- `POST /api/orders` - Criar pedido
- `GET /api/station/items` - Fila da estação
- `POST /api/orders/:id/checkout` - Finalizar pedido

## 🧪 Testes

```bash
# Testes unitários
./start.sh test

# Testes de integração
./start.sh test --integration

# Verificação completa
./start.sh verify
```

## 📦 Variáveis de Ambiente

Arquivo `.env` (copie de `.env.example`):

```env
# Obrigatórios
DATABASE_URL=postgres://user:pass@host:port/db
SESSION_SECRET=<chave-aleatoria-segura>

# Opcionais
PORT=3001
NODE_ENV=development
DEV_USE_POLLING=1
DEV_POLLING_INTERVAL=150

# Integrações (opcionais)
OPENAI_API_KEY=sk-...
GOOGLE_SHEETS_PRIVATE_KEY=...
```

## 🚀 Deploy em Produção

1. Configure variáveis de ambiente
2. Gere SESSION_SECRET seguro: `openssl rand -base64 32`
3. Build da aplicação: `./start.sh prod`
4. Use reverse proxy (nginx/traefik) com HTTPS
5. Configure backups automáticos do banco

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -am 'Adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📝 Roadmap

- [x] Sistema completo de comandas
- [x] Multi-estação (cozinha/bar)
- [x] Controle de estoque
- [x] API documentada
- [ ] Testes automatizados completos
- [ ] Relatórios avançados
- [ ] Integração com impressoras
- [ ] App mobile nativo
- [ ] Multi-tenant (múltiplos restaurantes)

## 📞 Suporte

- **Documentação**: [INSTALL.md](INSTALL.md), [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Issues**: [GitHub Issues](https://github.com/seu-projeto/issues)
- **Análise Técnica**: [ANALISE_SISTEMA.md](ANALISE_SISTEMA.md)

## 📄 Licença

MIT © 2025

---

**Desenvolvido com ❤️ para a comunidade de restaurantes e bares**

🌟 Se este projeto foi útil, considere dar uma estrela no GitHub!
