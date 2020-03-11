# Verifica sintassi versione bna
source ./checkVersion.sh
message=$(checkVersion $1)
if [ $? -eq 1 ]
  then
    echo $message
    exit 1
fi



# Ingresso nella directory di lavoro
cd ~/sardcoin/smartcontract/implementation/src



# Aggiornamento del numero di versione nel package
original="\"version\": \"[0-9]\+\.[0-9]\+\.[0-9]\+\""
replace="\"version\": \"$1\""
sed -i "s|$original|$replace|g" package.json



# Rimozione della vecchia business network archive (bna) e creazione della nuova
rm *.bna
composer archive create -t dir -n .
