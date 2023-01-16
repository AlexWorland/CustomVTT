#!/bin/bash
apt update
apt install -y sudo

sudo apt update
yes | sudo apt install git jq curl net-tools openssl procps sudo
curl -fsSL https://deb.nodesource.com/setup_19.x | sudo bash - 
sudo apt-get install -y nodejs
if ( cd Application/resources/app && npm install ) ; then
    echo "npm install successful"
else
    echo "npm install failed, retrying"
    cd /app/Application/resources/app
    npm install 
fi