#!/bin/bash
sudo apt update
yes | sudo apt install git jq curl net-tools openssl
curl -fsSL https://deb.nodesource.com/setup_19.x | sudo bash - 
sudo apt-get install -y nodejs
cd Application/resources/app
npm install
