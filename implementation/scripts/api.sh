# Avvia il server composer rest con la chiave passata in input
if [ $# -eq 0 ]
  then
    echo "Errore: inserire la chiave per avviare il server rest"
    exit 1
fi

composer-rest-server -c admin@sardcoin -n never -y $1 -w true
