apt update
yes | apt install git nodejs npm jq curl ifconfig
tmp=$(pwd)
cd Application/resources/app
npm install
cd tmp
