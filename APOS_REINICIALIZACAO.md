# 📋 Instruções Após Reinicialização

## O que foi feito até agora

1. ✅ Limpamos as regras do iptables
2. ✅ Alternamos para iptables-legacy
3. ✅ Configuramos ip6tables-legacy
4. ✅ Verificamos que iptables está desabilitado no daemon.json
5. ✅ Limpamos networks antigas do Docker

## Após reiniciar o sistema

Execute os seguintes comandos:

```bash
cd /home/iago/Documentos/sistemavenda-adega01

# Verificar status do Docker
sudo systemctl status docker

# Iniciar os containers
./docker-manager.sh start
```

## Se ainda assim não funcionar

Execute o sistema sem Docker:

```bash
# Verificar se PostgreSQL já está rodando na porta 5442
docker ps | grep postgres

# Se não estiver, inicie apenas o banco:
docker-compose up -d db

# Aguarde o banco iniciar
sleep 10

# Instale as dependências (se ainda não tiver instalado)
npm install

# Execute em modo desenvolvimento
npm run dev
```

O sistema estará disponível em: http://localhost:5002

## Verificar iptables após reinicialização

```bash
# Verificar se está usando legacy
sudo update-alternatives --display iptables

# Ver regras do Docker
sudo iptables -t filter -L DOCKER -n
```

## Informações úteis

- **Porta do banco**: 5442
- **Porta da aplicação**: 5002
- **Usuário padrão**: admin / admin123

---

**Nota**: A reinicialização geralmente resolve problemas de iptables relacionados ao kernel Linux.
