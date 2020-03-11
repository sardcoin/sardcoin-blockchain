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



# Ingresso nella directory di lavoro
cd ~/sardcoin/smartcontract/implementation/src



# Installazione della business network card nei nodi della blockchain di Fabric
composer network install -c PeerAdmin@fabric-network -a $bna



# Avvio della nuova versione della blokchain business network
composer network upgrade -c PeerAdmin@fabric-network -n sardcoin -V $1
