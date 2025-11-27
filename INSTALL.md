# 📦 Guia de Instalação - Sistema de Gestão ControlhePDV

Este guia detalha o processo completo de instalação do sistema, desde os requisitos até a primeira execução.

---

## 📋 Requisitos do Sistema

### Obrigatórios
- **Node.js** v18 ou superior
- **npm** v8 ou superior (incluído com Node.js)
- **PostgreSQL** v16 ou superior (local ou Docker)

### Recomendados
- **Git** (para controle de versão)
- **Docker** + **Docker Compose** (para facilitar desenvolvimento)
- **psql** (cliente PostgreSQL, para backups)

### Opcionais
- **OpenAI API Key** (se usar processamento via IA)
- **Google Sheets Credentials** (se usar integração com planilhas)

---

## 🚀 Instalação Rápida (3 Passos)

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd sistema-gestao-controlhepdv

# 2. Execute a instalação automática
./start.sh install

# 3. Inicie o sistema
./start.sh dev
```

✅ Pronto! Acesse http://localhost:3001

---

## 📝 Instalação Detalhada

### Passo 1: Instalar Node.js

#### Linux (Ubuntu/Debian)
```bash
# Via NodeSource (recomendado)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version  # deve ser v18 ou superior
npm --version
```

#### macOS
```bash
# Via Homebrew
brew install node@20

# Verificar instalação
node --version
npm --version
```

#### Windows
1. Baixe o instalador: https://nodejs.org/
2. Execute o instalador
3. Reinicie o terminal
4. Verifique: `node --version`

### Passo 2: Instalar PostgreSQL

#### Opção A: Usar Docker (Recomendado)

```bash
# Instalar Docker
# Linux: https://docs.docker.com/engine/install/
# macOS: https://docs.docker.com/desktop/install/mac-install/
# Windows: https://docs.docker.com/desktop/install/windows-install/

# Verificar instalação
docker --version
docker compose version

# O sistema iniciará o PostgreSQL automaticamente
# quando você executar ./start.sh dev
```

#### Opção B: PostgreSQL Local

**Linux:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Iniciar serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Criar banco de dados
sudo -u postgres createdb controlhepdv
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE controlhepdv TO postgres;"
```

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16

# Criar banco
createdb controlhepdv
```

**Windows:**
1. Baixe o instalador: https://www.postgresql.org/download/windows/
2. Execute e siga o assistente
3. Use pgAdmin para criar o banco `controlhepdv`

### Passo 3: Clonar o Repositório

```bash
# Via HTTPS
git clone https://github.com/seu-usuario/sistema-gestao-controlhepdv.git
cd sistema-gestao-controlhepdv

# Via SSH
git clone git@github.com:seu-usuario/sistema-gestao-controlhepdv.git
cd sistema-gestao-controlhepdv
```

### Passo 4: Configurar Ambiente

```bash
# Execute o comando de instalação
./start.sh install
```

Isso irá:
1. ✅ Verificar Node.js e npm
2. ✅ Criar arquivo `.env` a partir do `.env.example`
3. ✅ Gerar `SESSION_SECRET` aleatório automaticamente
4. ✅ Instalar todas as dependências npm

### Passo 5: Configurar Variáveis de Ambiente

Edite o arquivo `.env` criado:

```bash
nano .env  # ou use seu editor preferido
```

**Configurações Mínimas:**
```env
# Banco de dados - ALTERE SE NECESSÁRIO
DATABASE_URL=postgres://postgres:postgres@localhost:5432/controlhepdv

# Segurança - JÁ GERADO AUTOMATICAMENTE, mas você pode trocar
SESSION_SECRET=<chave-gerada-automaticamente>

# Credenciais admin padrão - ALTERE EM PRODUÇÃO
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
```

**Para Produção, adicione também:**
```env
NODE_ENV=production
PORT=3001
```

### Passo 6: Verificar Sistema

```bash
./start.sh verify
```

Este comando verifica:
- ✅ Node.js e npm instalados
- ✅ Docker disponível (opcional)
- ✅ Arquivos necessários presentes
- ✅ Conexão com banco de dados
- ✅ Dependências instaladas

Se tudo estiver OK, você verá:
```
✅ Sistema verificado com sucesso! ✨
ℹ️  Execute: ./start.sh dev
```

### Passo 7: Iniciar o Sistema

```bash
./start.sh dev
```

Aguarde alguns segundos e você verá:
```
✅ Sistema pronto!
ℹ️  URL: http://localhost:3001
ℹ️  API Docs: http://localhost:3001/api-docs
ℹ️  Pressione Ctrl+C para encerrar (backup automático)
```

### Passo 8: Acessar o Sistema

1. Abra o navegador em: http://localhost:3001
2. Faça login com:
   - **Usuário:** admin
   - **Senha:** admin123
3. ⚠️ **IMPORTANTE:** Altere a senha no primeiro acesso!

---

## 🔧 Configurações Avançadas

### Usar PostgreSQL Local (sem Docker)

```bash
./start.sh dev --no-docker
```

### Personalizar Porta

Edite `.env`:
```env
PORT=8080
```

### Habilitar Integrações Opcionais

#### OpenAI

```env
OPENAI_API_KEY=sk-seu-token-aqui
```

#### Google Sheets

```env
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_SPREADSHEET_ID=seu-spreadsheet-id
```

### Configurar Watchers (para muitos arquivos)

```env
DEV_USE_POLLING=1
DEV_POLLING_INTERVAL=150
```

### Logs em Arquivo

```env
LOG_TO_FILE=true
```

---

## 🐛 Solução de Problemas Comuns

### Erro: "comando não encontrado: ./start.sh"

**Solução:**
```bash
chmod +x start.sh
./start.sh
```

### Erro: "Node.js não está instalado"

**Solução:** Instale o Node.js seguindo o Passo 1 acima.

### Erro: "DATABASE_URL não configurado"

**Solução:**
1. Verifique se o arquivo `.env` existe
2. Certifique-se que `DATABASE_URL` está configurado
3. Execute: `./start.sh verify`

### Erro: "Porta 3001 já em uso"

**Solução 1:** Mate o processo que está usando a porta:
```bash
# Linux/macOS
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Solução 2:** Use outra porta editando `.env`:
```env
PORT=3002
```

### Erro: "ENOSPC: System limit for number of file watchers reached"

**Solução:** Habilite polling no `.env`:
```env
DEV_USE_POLLING=1
DEV_POLLING_INTERVAL=150
```

### Erro: "Docker não está rodando"

**Solução 1:** Inicie o Docker:
```bash
# Linux
sudo systemctl start docker

# macOS/Windows
# Abra o Docker Desktop
```

**Solução 2:** Use PostgreSQL local:
```bash
./start.sh dev --no-docker
```

### Mais problemas?

Consulte: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 🎯 Próximos Passos

Após a instalação bem-sucedida:

1. **Explore o sistema**
   - Dashboard: http://localhost:3001
   - API Docs: http://localhost:3001/api-docs

2. **Crie usuários**
   - Acesse: Configurações → Usuários
   - Crie contas para: garçom, caixa, cozinha, bar

3. **Adicione produtos**
   - Acesse: Produtos
   - Cadastre itens do menu

4. **Configure estações**
   - Defina quais produtos vão para cozinha
   - Defina quais produtos vão para bar

5. **Leia a documentação**
   - [README.md](README.md) - Visão geral
   - [QUICK_START.md](QUICK_START.md) - Guia rápido
   - [ANALISE_SISTEMA.md](ANALISE_SISTEMA.md) - Análise técnica

---

## 📞 Suporte

**Problemas de Instalação:**
- Consulte: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Crie um issue: https://github.com/seu-projeto/issues

**Dúvidas sobre o Sistema:**
- Leia: [README.md](README.md)
- Documentação da API: http://localhost:3001/api-docs

**Contribuindo:**
- Veja: [CONTRIBUTING.md](CONTRIBUTING.md) (se existir)

---

## ✅ Checklist de Instalação

Use esta lista para garantir que tudo foi instalado corretamente:

- [ ] Node.js v18+ instalado
- [ ] npm instalado
- [ ] PostgreSQL disponível (Docker ou local)
- [ ] Repositório clonado
- [ ] `./start.sh install` executado com sucesso
- [ ] Arquivo `.env` configurado
- [ ] `./start.sh verify` passou sem erros
- [ ] Sistema iniciado com `./start.sh dev`
- [ ] Acesso ao sistema em http://localhost:3001
- [ ] Login com credenciais padrão funcionou
- [ ] Senha padrão alterada

Se todos os itens estiverem marcados, sua instalação está completa! 🎉

---

**Última atualização:** 31/10/2025  
**Versão do sistema:** 2.0.0
