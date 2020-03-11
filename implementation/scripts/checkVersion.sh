# Testa se la stringa passata in input rispetta il formato della versione (esempio 0.0.1)

function checkVersion(){

	if [ $# -eq 0 ]
	  then
	    echo "Errore: inserire il numero di versione bna come primo argomento"
	    exit 1
	fi

	if [[ ! $1 =~ ([0-9]+\.){2}[0-9]+ ]]
	  then 
	    echo "Errore: il numero di versione bna deve rispettare il formato numero.numero.numero (esempio 0.0.1)"
	    exit 1
	fi
}

