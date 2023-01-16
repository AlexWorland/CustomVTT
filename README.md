### CustomVTT

# Requirements

- NodeJS
- npm
- jq
- curl
- Using apt, satisfy requirements with: `chmod +x install.sh && ./install.sh`

# Running

- Running manually:
  - `node Application/resources/app/main.js --dataPath=./data/`
- Running with start script: `chmod +x start.sh && ./start.sh`

# Running with Docker

- `docker build . -t <name>`
- `docker run -it -p 30000:30000 <name>`
