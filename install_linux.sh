#!/bin/bash
echo "Installing dependencies"
sudo apt update
yes | sudo apt install git jq curl net-tools openssl procps sudo
curl -fsSL https://deb.nodesource.com/setup_19.x | sudo bash - 
sudo apt-get install -y nodejs
echo "npm install"
CUR_DIR=$(pwd)
cd Application/resources/app/
npm install
cd $CUR_DIR