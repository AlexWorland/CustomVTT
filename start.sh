#!/bin/bash

port=30000

function ctrl_c() {
    ./discord.sh \
    --webhook-url='https://discord.com/api/webhooks/1063185357828526111/B-SPgtL4CwEhv-2foR1D-Nk8Q65LWPSXLRF2XP8Bi_A6xDCSsiBdH8kThRcKRQK5onlv' \
    --username "FoundryVTT Bot" \
    --text "FoundryVTT Shutting Down!"

    pkill node
}

trap ctrl_c INT

# ./discord.sh \
#     --webhook-url='https://discord.com/api/webhooks/1063185357828526111/B-SPgtL4CwEhv-2foR1D-Nk8Q65LWPSXLRF2XP8Bi_A6xDCSsiBdH8kThRcKRQK5onlv' \
#     --username "FoundryVTT Bot" \
#     --text "FoundryVTT Server is starting up!"

localip=`ifconfig | sed -En 's/127.0.0.1//;s/.*inet (addr:)?(([0-9]*\.){3}[0-9]*).*/\2/p' | head -1`
externalip=$(curl -s http://checkip.amazonaws.com)

# ./discord.sh \
#     --webhook-url='https://discord.com/api/webhooks/1063185357828526111/B-SPgtL4CwEhv-2foR1D-Nk8Q65LWPSXLRF2XP8Bi_A6xDCSsiBdH8kThRcKRQK5onlv' \
#     --username "FoundryVTT Bot" \
#     --text "Foundry Instance\\n\\tLocal IP: http://$localip:$port\\n\\tExternal IP: http://$externalip:$port"

node Application/resources/app/main.js --dataPath=./data/
