# Como Iniciar o Sistema

## Problemas Corrigidos

✅ **Rate Limit IPv6**: Corrigido o erro de validação do express-rate-limit
✅ **Configuração do Banco**: Verificada e correta

## Para Iniciar o Sistema

### Opção 1: Usar Docker Completo (Recomendado)

```bash
# Iniciar todos os serviços (banco + aplicação)
docker-compose up -d

# Ver os logs
docker-compose logs -f

# Acessar o sistema
# http://localhost:5002
```

### Opção 2: Apenas Banco no Docker + Servidor Local

```bash
# 1. Iniciar apenas o PostgreSQL
docker-compose up -d db

# 2. Aguardar o banco ficar pronto (verifica o health check)
docker-compose ps

# 3. Quando o db estiver "healthy", iniciar o servidor
npm run dev
```

### Opção 3: Script de Gerenciamento

```bash
# Usar o script docker-manager.sh
./docker-manager.sh start

# Para ver status
./docker-manager.sh status

# Para parar
./docker-manager.sh stop
```

## Verificar se o PostgreSQL está Rodando

```bash
# Verificar containers ativos
docker-compose ps

# Deve mostrar:
# inventory-db ... Up (healthy)

# Testar conexão com o banco
docker-compose exec db psql -U postgres -d controlhepdv -c "SELECT version();"
```

## ✅ Solução Completa e Testada

Execute estes comandos na ordem:

```bash
# 1. Parar qualquer container antigo e limpar volumes
docker-compose down -v

# 2. Iniciar o banco de dados
docker-compose up -d db

# 3. Aguardar 10 segundos para o banco ficar pronto
sleep 10

# 4. Criar as tabelas no banco de dados
npm run db:push

# 5. Iniciar o servidor
npm run dev
```

O servidor estará disponível em: **http://localhost:5002**

### Usuários Padrão Criados

- **Admin**: 
  - Username: `admin`
  - Password: `admin`
  
- **Seller**: 
  - Username: `seller`
  - Password: `seller`

### Swagger API Documentation

Acesse a documentação interativa da API em: **http://localhost:5002/api-docs**

## Comandos Úteis

```bash
# Parar todos os serviços
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados!)
docker-compose down -v

# Ver logs do banco
docker-compose logs -f db

# Ver logs da aplicação
docker-compose logs -f app

# Reiniciar apenas o banco
docker-compose restart db

# Fazer backup do banco
docker-compose exec db pg_dump -U postgres controlhepdv > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

## Problemas Comuns

### Porta 5442 em uso
```bash
# Verificar o que está usando a porta
sudo lsof -i :5442

# Ou parar o container antigo
docker-compose down
```

### Banco não conecta
```bash
# Verificar se o container está rodando
docker-compose ps

# Ver logs de erro
docker-compose logs db

# Recriar o container
docker-compose down
docker-compose up -d db
```

### Resetar tudo
```bash
# Parar e limpar tudo
docker-compose down -v

# Remover imagens antigas (opcional)
docker system prune -a

# Iniciar do zero
docker-compose up -d
