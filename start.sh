#!/bin/bash

port=30000

ENCRYPTED_WEBHOOK='U2FsdGVkX19L6NSNUCkm5VNz+ylD7c/xPqFf3a3reeXg78oBfgRcruoS0TRnYRmW
itSZphyDHDyFlUg8cRetY02MUpcNXUzTFUaE7vl7tspf68qSno+Uj60TcR6pVTF3
0E6KVeeywCjx266ApLC9zIAvBoBh6XsEtqmhbmh9JMQjWhDBwpCSmeBEyIvCIrrN'

# get webhook
WEBHOOK_URL=`echo $ENCRYPTED_WEBHOOK | openssl aes-256-cbc -d -a -salt -pass pass:somepassword`

function ctrl_c() {
    ./discord.sh \
    --webhook-url=$WEBHOOK_URL \
    --username "FoundryVTT Bot" \
    --text "FoundryVTT Shutting Down!"

    pkill node
}

trap ctrl_c INT

./discord.sh \
    --webhook-url=$WEBHOOK_URL \
    --username "FoundryVTT Bot" \
    --text "FoundryVTT Server is starting up!"

localip=`ifconfig | sed -En 's/127.0.0.1//;s/.*inet (addr:)?(([0-9]*\.){3}[0-9]*).*/\2/p' | head -1`
externalip=$(curl -s http://checkip.amazonaws.com)

./discord.sh \
    --webhook-url=$WEBHOOK_URL \
    --username "FoundryVTT Bot" \
    --text "Foundry Instance\\n\\tLocal IP: http://$localip:$port\\n\\tExternal IP: http://$externalip:$port"

pwd

node Application/resources/app/main.js --dataPath=./data/
