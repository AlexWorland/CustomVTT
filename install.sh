#!/bin/bash
# apt update
# yes | apt install git jq curl net-tools openssl
curl -fsSL https://deb.nodesource.com/setup_19.x | bash - &&\
apt-get install -y nodejs
tmp=$(pwd)
cd Application/resources/app
npm install
cd tmp
