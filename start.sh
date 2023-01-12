#!/bin/bash

port=30000
webhookUrl='https://discord.com/api/webhooks/1063235180501930054/V7RWDzYP5lo9OpTdxfIQ1p7tbQy05MWqRkRAg0VqY0YE-oqbShLqCpyovupsqpXoTH6S'


function ctrl_c() {
    ./discord.sh \
    --webhook-url=$webhookUrl \
    --username "FoundryVTT Bot" \
    --text "FoundryVTT Shutting Down!"

    pkill node
}

trap ctrl_c INT

# ./discord.sh \
#     --webhook-url=$webhookUrl \
#     --username "FoundryVTT Bot" \
#     --text "FoundryVTT Server is starting up!"

localip=`ifconfig | sed -En 's/127.0.0.1//;s/.*inet (addr:)?(([0-9]*\.){3}[0-9]*).*/\2/p' | head -1`
externalip=$(curl -s http://checkip.amazonaws.com)

# ./discord.sh \
#     --webhook-url=$webhookUrl \
#     --username "FoundryVTT Bot" \
#     --text "Foundry Instance\\n\\tLocal IP: http://$localip:$port\\n\\tExternal IP: http://$externalip:$port"

node Application/resources/app/main.js --dataPath=./data/
