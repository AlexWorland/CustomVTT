#!/bin/bash
apt update
yes | apt install git jq curl net-tools openssl procps
curl -fsSL https://deb.nodesource.com/setup_19.x | bash - 
apt-get install -y nodejs
echo "npm install failed, retrying"
cd /app/Application/resources/app
npm install