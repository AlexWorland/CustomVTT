#!/bin/bash

port=30000
bot_username="FoundryVTT Bot"

# if "local" is in arguments
if [[ " $@ " =~ "--local" ]]; then
    ENCRYPTED_WEBHOOK='U2FsdGVkX1/udDJgrNaqWg2DU9GyORMMtdUeFOMHm8VmCeQiTI4CIbnqoQTE2v0P3zySaQ4oNhrx62k5lTszSQcITl9SOq+BKqJWwfa84m+TAvDiF5d3LptfrbCwD3lEO405GNI5pQwA+f38FQpi2PrXNi9K4+mY2XyasdNaU+XUZxEI2FY5xk2G7yLRDNrf'
else 
    ENCRYPTED_WEBHOOK='U2FsdGVkX18Lg2GxDjdNfS4wmBTtBPba9QrM+QgDC2wqXnWuVpEvitv6JkzEibxGJ5/abuLTU1R+LSkXfRN/7eaNYaW5Nfz2NzsK48leHYVuYDByJXGpwztTNSxse52AS4VDRJ0Of8UNZ7CRf6Gh5VUYN1EoNeUSjCZfqU8wpCGSFcyEYiA9nJZQGw5NvZD0'
fi

# get webhook
WEBHOOK_URL=`echo $ENCRYPTED_WEBHOOK | openssl aes-256-cbc -d -a -salt -pass pass:somepassword`

loopTerminator=1

function ctrl_c() {
    ./discord.sh \
    --webhook-url=$WEBHOOK_URL \
    --username "$bot_username" \
    --text "FoundryVTT Shutting Down!"

    loopTerminator=0
    pkill node
    pkill bash
    pkill sleep
    pkill $0
}

function ip_check() {
    localip=`ifconfig | sed -En 's/127.0.0.1//;s/.*inet (addr:)?(([0-9]*\.){3}[0-9]*).*/\2/p' | head -1`
    externalip=$(curl -s http://checkip.amazonaws.com)
    currentIp=""
    while [ $loopTerminator -eq 1 ]; do
        echo "Checking IP..."
        if [ "$currentIp" != "$externalip" ]; then
            externalip=$(curl -s http://checkip.amazonaws.com)
            currentIp=$externalip
            ./discord.sh \
            --webhook-url=$WEBHOOK_URL \
            --username "$bot_username" \
            --text "Foundry Instance\\n\\tLocal IP: http://$localip:$port\\n\\tExternal IP: http://$externalip:$port"
        fi
        echo "local IP: $currentIp, external IP: $externalip"
        sleep 60
    done
}

trap ctrl_c INT

./discord.sh \
    --webhook-url=$WEBHOOK_URL \
    --username "$bot_username" \
    --text "FoundryVTT Server is starting up!"

node Application/resources/app/main.js --dataPath=./data/ &

ip_check
