# Pulizia dello stato corrente e avvio di una nuova rete Fabric


# Pulizia composer
rm -R ~/sardcoin/.composer


# Ingresso nella directory di lavoro e pulizia file card
cd ~/sardcoin/smartcontract/implementation/src/cards
rm *.card


# Pulizia Fabric
cd ~/fabric-dev-servers
./stopFabric.sh
./teardownFabric.sh

docker container stop $(docker container ls -aq)
docker container rm $(docker container ls -aq)
