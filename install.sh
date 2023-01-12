apt update
yes | apt install git nodejs npm jq curl net-tools
tmp=$(pwd)
cd Application/resources/app
npm install
cd tmp
