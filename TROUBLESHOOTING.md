# 🔧 Guia de Solução de Problemas - Sistema de Gestão ControlhePDV

Este guia ajuda a resolver problemas comuns encontrados durante instalação, configuração e uso do sistema.

---

## 📋 Índice

1. [Problemas de Instalação](#problemas-de-instalação)
2. [Problemas com Banco de Dados](#problemas-com-banco-de-dados)
3. [Problemas com Docker](#problemas-com-docker)
4. [Problemas de Porta/Rede](#problemas-de-portarede)
5. [Problemas de Autenticação](#problemas-de-autenticação)
6. [Problemas de Build](#problemas-de-build)
7. [Problemas de Performance](#problemas-de-performance)
8. [Problemas com File Watchers](#problemas-com-file-watchers)
9. [Problemas Diversos](#problemas-diversos)

---

## 🔴 Problemas de Instalação

### Erro: "comando não encontrado: ./start.sh"

**Sintoma:**
```bash
$ ./start.sh
bash: ./start.sh: Permissão negada
```

**Causa:** Arquivo não tem permissão de execução

**Solução:**
```bash
chmod +x start.sh
./start.sh
```

---

### Erro: "Node.js não está instalado"

**Sintoma:**
```
❌ node não está instalado
```

**Causa:** Node.js não instalado ou não está no PATH

**Solução 1:** Instalar Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node@20

# Verificar
node --version
```

**Solução 2:** Adicionar ao PATH (se já instalado)
```bash
# Linux/macOS
export PATH="/usr/local/bin:$PATH"
source ~/.bashrc  # ou ~/.zshrc
```

---

### Erro: "npm install falhou"

**Sintoma:**
```
npm ERR! code EACCES
npm ERR! syscall access
```

**Causa:** Permissões incorretas na pasta npm

**Solução:**
```bash
# Corrigir permissões
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Tentar novamente
npm install
```

---

## 💾 Problemas com Banco de Dados

### Erro: "DATABASE_URL não configurado"

**Sintoma:**
```
❌ DATABASE_URL não configurado
```

**Causa:** Variável de ambiente não está definida

**Solução:**
```bash
# 1. Verificar se .env existe
ls -la .env

# 2. Se não existir, criar
cp .env.example .env

# 3. Editar e configurar DATABASE_URL
nano .env

# 4. Exemplo de DATABASE_URL válida
DATABASE_URL=postgres://postgres:postgres@localhost:5432/controlhepdv
```

---

### Erro: "Falha ao conectar ao PostgreSQL"

**Sintoma:**
```
❌ Falha ao conectar ao PostgreSQL
```

**Causa:** PostgreSQL não está rodando ou configuração incorreta

**Solução 1:** Verificar se PostgreSQL está rodando
```bash
# Linux
sudo systemctl status postgresql

# Se não estiver rodando
sudo systemctl start postgresql

# macOS
brew services list | grep postgresql

# Se não estiver rodando
brew services start postgresql@16
```

**Solução 2:** Verificar configuração
```bash
# Testar conexão manualmente
psql "postgres://postgres:postgres@localhost:5432/controlhepdv"

# Se falhar, verificar:
# 1. Usuário e senha corretos?
# 2. Banco existe?
# 3. Porta 5432 correta?
```

**Solução 3:** Criar banco manualmente
```bash
# Linux
sudo -u postgres createdb controlhepdv

# macOS
createdb controlhepdv
```

---

### Erro: "ECONNREFUSED 127.0.0.1:5432"

**Sintoma:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Causa:** PostgreSQL não está escutando na porta 5432

**Solução 1:** Verificar porta PostgreSQL
```bash
# Ver qual porta o PostgreSQL está usando
sudo -u postgres psql -c "SHOW port;"

# Se for diferente de 5432, atualizar .env
DATABASE_URL=postgres://postgres:postgres@localhost:PORTA/controlhepdv
```

**Solução 2:** Reiniciar PostgreSQL
```bash
# Linux
sudo systemctl restart postgresql

# macOS
brew services restart postgresql@16
```

---

## 🐳 Problemas com Docker

### Erro: "Docker não está rodando"

**Sintoma:**
```
Cannot connect to the Docker daemon
```

**Causa:** Docker não está em execução

**Solução:**
```bash
# Linux
sudo systemctl start docker

# Verificar status
sudo systemctl status docker

# Habilitar para iniciar automaticamente
sudo systemctl enable docker
```

**macOS/Windows:** Abra o Docker Desktop

---

### Erro: "Container já existe"

**Sintoma:**
```
Error response from daemon: Conflict. The container name "/db" is already in use
```

**Causa:** Container com mesmo nome já existe

**Solução:**
```bash
# Parar e remover container antigo
docker stop sistema-gestao-controlhepdv_db_1 || true
docker rm sistema-gestao-controlhepdv_db_1 || true

# OU remover por nome
docker ps -a | grep db
docker rm -f <CONTAINER_ID>

# Iniciar novamente
./start.sh dev
```

---

### Erro: "permission denied" no Docker (Linux)

**Sintoma:**
```
Got permission denied while trying to connect to the Docker daemon socket
```

**Causa:** Usuário não tem permissão para acessar Docker

**Solução:**
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Relogar ou executar
newgrp docker

# Verificar
docker ps
```

---

## 🌐 Problemas de Porta/Rede

### Erro: "Porta 3001 já em uso"

**Sintoma:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Causa:** Outro processo está usando a porta 3001

**Solução 1:** Matar o processo
```bash
# Linux/macOS
lsof -ti:3001 | xargs kill -9

# Verificar se liberou
lsof -i:3001
```

**Solução 2:** Usar outra porta
```bash
# Editar .env
nano .env

# Alterar
PORT=3002

# Reiniciar
./start.sh dev
```

---

### Erro: "Cannot GET /"

**Sintoma:** Página em branco ou erro 404 ao acessar http://localhost:3001

**Causa:** Servidor não iniciou corretamente ou rota não configurada

**Solução 1:** Verificar logs
```bash
./start.sh logs

# OU ver logs em tempo real
tail -f server.log
```

**Solução 2:** Reiniciar servidor
```bash
# Ctrl+C para parar
# Depois:
./start.sh dev
```

---

## 🔐 Problemas de Autenticação

### Erro: "Credenciais inválidas"

**Sintoma:** Login falha com usuário/senha corretos

**Causa 1:** Usuário admin não foi criado

**Solução:**
```bash
# Criar usuário admin manualmente
curl -X POST http://localhost:3001/api/setup-admin
```

**Causa 2:** Senha errada

**Solução:** Usar credenciais padrão corretas
- **Usuário:** admin
- **Senha:** admin123 (conforme .env.example)

---

### Erro: "SESSION_SECRET não foi alterado"

**Sintoma:**
```
❌ SESSION_SECRET não foi alterado!
```

**Causa:** Tentando rodar em produção com SESSION_SECRET padrão

**Solução:**
```bash
# Gerar nova secret
openssl rand -base64 32

# Editar .env
nano .env

# Substituir
SESSION_SECRET=<nova-secret-gerada>
```

---

## 🏗️ Problemas de Build

### Erro: "Build failed"

**Sintoma:**
```
npm run build
# Erros de TypeScript
```

**Causa:** Erros de tipo ou dependências faltando

**Solução 1:** Limpar e reinstalar
```bash
./start.sh clean
# Confirmar com 's'
./start.sh install
npm run build
```

**Solução 2:** Verificar erros de tipo
```bash
npm run check

# Corrigir erros mostrados
```

---

### Erro: "Module not found"

**Sintoma:**
```
Error: Cannot find module 'express'
```

**Causa:** Dependências não instaladas

**Solução:**
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

---

## ⚡ Problemas de Performance

### Sistema lento/travando

**Sintoma:** Interface responde devagar

**Causa 1:** Banco de dados sem índices

**Solução:**
```bash
# Criar índices para melhorar performance
psql $DATABASE_URL -f scripts/add-indexes.sql
```

**Causa 2:** Muitos watchers de arquivo

**Solução:** Habilitar polling
```bash
# Editar .env
DEV_USE_POLLING=1
DEV_POLLING_INTERVAL=200
```

---

### Hot reload não funciona

**Sintoma:** Alterações no código não são refletidas automaticamente

**Causa:** Watchers não funcionam no seu sistema

**Solução:**
```bash
# Habilitar polling no .env
DEV_USE_POLLING=1
DEV_POLLING_INTERVAL=150

# Reiniciar
./start.sh dev
```

---

## 📁 Problemas com File Watchers

### Erro: "ENOSPC: System limit for number of file watchers reached"

**Sintoma:**
```
Error: ENOSPC: System limit for number of file watchers reached
```

**Causa:** Limite de watchers do sistema foi atingido

**Solução 1:** Aumentar limite (Linux)
```bash
# Temporário (até reiniciar)
echo 524288 | sudo tee /proc/sys/fs/inotify/max_user_watches

# Permanente
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Solução 2:** Usar polling
```bash
# Editar .env
DEV_USE_POLLING=1
DEV_POLLING_INTERVAL=150
```

---

## 🔀 Problemas Diversos

### Erro: "CORS blocked"

**Sintoma:** Erro de CORS no console do navegador

**Causa:** Frontend tentando acessar API de origem diferente

**Solução:** Verificar se está acessando pela mesma URL
- ✅ Certo: http://localhost:3001
- ❌ Errado: http://127.0.0.1:3001 (diferente origem)

---

### Backup não funciona ao pressionar Ctrl+C

**Sintoma:** Backup não é criado ao encerrar

**Causa:** `pg_dump` não está instalado

**Solução:**
```bash
# Linux
sudo apt-get install postgresql-client

# macOS
brew install postgresql@16

# Verificar
which pg_dump
```

---

### Erro: "Cannot read property of undefined"

**Sintoma:** Erro no navegador ao acessar página

**Causa:** Build do frontend desatualizado

**Solução:**
```bash
# Limpar e rebuildar
./start.sh clean
npm install
npm run build

# Se em desenvolvimento
./start.sh dev
```

---

## 📊 Diagnóstico Completo

Se nenhuma solução acima funcionou, execute o diagnóstico completo:

```bash
# 1. Verificar sistema
./start.sh verify

# 2. Ver logs detalhados
./start.sh logs

# 3. Testar conexões
curl http://localhost:3001/api/health

# 4. Verificar processos
ps aux | grep node
ps aux | grep postgres

# 5. Verificar portas
netstat -tuln | grep 3001
netstat -tuln | grep 5432

# 6. Ver variáveis de ambiente
cat .env
```

---

## 🆘 Ainda com Problemas?

### Antes de Abrir uma Issue:

1. ✅ Executei `./start.sh verify`?
2. ✅ Li este guia completamente?
3. ✅ Tentei limpar e reinstalar (`./start.sh clean`)?
4. ✅ Reiniciei o computador?
5. ✅ Verifiquei os logs (`./start.sh logs`)?

### Como Reportar um Problema:

Ao abrir uma issue, inclua:

```markdown
**Descrição do Problema:**
[Descreva o que está acontecendo]

**Passos para Reproduzir:**
1. Executei ./start.sh dev
2. Acessei http://localhost:3001
3. Erro apareceu

**Ambiente:**
- SO: Linux Ubuntu 22.04
- Node.js: v20.10.0
- npm: 10.2.3
- Docker: 24.0.7

**Logs:**
```
[Cole aqui os logs do terminal ou de server.log]
```

**O que já tentei:**
- Reinstalei dependências
- Verifiquei .env
- etc...
```

### Contatos:

- **Issues GitHub:** https://github.com/seu-projeto/issues
- **Documentação:** [README.md](README.md)
- **Instalação:** [INSTALL.md](INSTALL.md)

---

## 💡 Dicas de Prevenção

### Para Evitar Problemas Futuros:

1. **Sempre use `./start.sh verify` antes de começar**
2. **Mantenha backups regulares** (automático ao fazer Ctrl+C)
3. **Use Docker** para isolar o PostgreSQL
4. **Leia os logs** quando algo der errado
5. **Mantenha as dependências atualizadas** (com cuidado)

### Comandos Úteis para Manutenção:

```bash
# Verificação rápida
./start.sh verify

# Ver versão
./start.sh version

# Backup manual
./start.sh backup

# Limpar tudo e recomeçar
./start.sh clean
./start.sh install
./start.sh dev
```

---

**Última atualização:** 31/10/2025  
**Versão do sistema:** 2.0.0
