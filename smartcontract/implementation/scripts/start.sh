# Verifica sintassi versione bna
source ./checkVersion.sh
message=$(checkVersion $1)
if [ $? -eq 1 ]
  then
    echo $message
    exit 1
fi



# Determina nome bna
bna="sardcoin@$1.bna"



# Avvio nuova rete Fabric
cd ~/fabric-dev-servers
./downloadFabric.sh
./startFabric.sh



# Creazione delle nuove card Composer
cd ~/sardcoin/smartcontract/implementation/src/

composer card create -p connection.json -u PeerAdmin -c ~/fabric-dev-servers/fabric-scripts/hlfv11/composer/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem -k ~/fabric-dev-servers/fabric-scripts/hlfv11/composer/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/114aab0e76bf0c78308f89efc4b8c9423e31568da0c340ca187a9b17aa9a4457_sk -r PeerAdmin -r ChannelAdmin



# Import della business network card del Hyperledger Fabric administrator
composer card import -f PeerAdmin@fabric-network.card



# Installazione della business network card nei nodi della blockchain di Fabric
composer network install -c PeerAdmin@fabric-network -a $bna



# Avvio della blokchain business network
composer network start -n sardcoin -V $1 -A admin -S adminpw -c PeerAdmin@fabric-network



# Spostamento delle card
mv admin@sardcoin.card cards/
mv PeerAdmin@fabric-network.card cards/


# Import della card dell'organizzazione
composer card import -f cards/admin@sardcoin.card
