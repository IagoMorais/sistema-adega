# 🔧 Solução para Erro de iptables do Docker

## Problema Identificado

```
ERROR: add inter-network communication rule: (iptables failed: iptables --wait -t filter -A DOCKER-ISOLATION-STAGE-1 -i br-xxx ! -o br-xxx -j DOCKER-ISOLATION-STAGE-2: iptables v1.8.10 (nf_tables): Chain 'DOCKER-ISOLATION-STAGE-2' does not exist
```

Este é um problema conhecido do Docker onde as regras de iptables ficam corrompidas.

## Soluções (em ordem de preferência)

### Solução 1: Reiniciar Docker Completamente

```bash
# Parar todos os containers
docker stop $(docker ps -aq) 2>/dev/null

# Parar o serviço Docker
sudo systemctl stop docker

# Limpar regras do iptables relacionadas ao Docker
sudo iptables -t filter -F DOCKER
sudo iptables -t filter -F DOCKER-ISOLATION-STAGE-1
sudo iptables -t filter -F DOCKER-ISOLATION-STAGE-2
sudo iptables -t nat -F DOCKER

# Reiniciar Docker
sudo systemctl start docker

# Testar
./docker-manager.sh start
```

### Solução 2: Usar docker-compose sem network isolation

Já implementada! O arquivo docker-compose.yml foi ajustado para usar a rede padrão.

### Solução 3: Configurar Docker para usar iptables-legacy

```bash
# Instalar iptables-legacy
sudo apt-get update
sudo apt-get install -y iptables

# Alternar para iptables-legacy
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

# Reiniciar Docker
sudo systemctl restart docker

# Testar
./docker-manager.sh start
```

### Solução 4: Usar Host Network (TEMPORÁRIO)

Crie um arquivo `docker-compose.override.yml`:

```yaml
version: "3.9"

services:
  db:
    network_mode: "host"
    ports: []
    
  app:
    network_mode: "host"
    ports: []
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@localhost:5442/controlhepdv
```

Então:
```bash
docker-compose up -d
```

⚠️ **AVISO**: Esta solução remove o isolamento de rede e deve ser usada apenas temporariamente!

### Solução 5: Reiniciar o Sistema

Se nenhuma das soluções acima funcionar:

```bash
sudo reboot
```

Após o restart, execute:
```bash
cd /caminho/do/projeto
./docker-manager.sh start
```

## Comando Rápido para Testar

Execute este comando para tentar reiniciar o Docker e limpar iptables:

```bash
sudo systemctl stop docker && \
sudo iptables -t filter -F && \
sudo iptables -t nat -F && \
sudo systemctl start docker && \
sleep 5 && \
./docker-manager.sh start
```

## Verificar se Docker está funcionando

```bash
# Verificar status do Docker
sudo systemctl status docker

# Testar comando Docker básico
docker run --rm hello-world

# Ver regras de iptables do Docker
sudo iptables -t filter -L DOCKER -n
```

## Alternativa: Usar Docker sem iptables

Edite `/etc/docker/daemon.json`:

```json
{
  "iptables": false,
  "bridge": "none"
}
```

Reinicie Docker:
```bash
sudo systemctl restart docker
```

⚠️ **AVISO**: Isso desabilita gerenciamento de rede do Docker!

## Se Ainda Não Funcionar

Execute o sistema SEM Docker:

```bash
# Instalar dependências
npm install

# Iniciar PostgreSQL local (ou use o existente na porta 5442)

# Atualizar .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5442/controlhepdv

# Executar em modo desenvolvimento
npm run dev
```

## Mais Informações

Este é um problema conhecido do Docker relacionado a:
- Kernel Linux
- Versão do iptables
- Conflito entre iptables-legacy e nft
- Configuração do netfilter

Links úteis:
- https://github.com/docker/for-linux/issues/1424
- https://github.com/moby/moby/issues/42279
