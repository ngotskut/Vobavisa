NFT Mint Automator

Repository ini memantau mempool untuk NFT mint transactions, kemudian mencoba front-run dengan:
- retry otomatis (configurable)
- gas bump per retry
- Flashbots relay (opsional)
- WebSocket circuit breaker dan HTTP fallback
- Prometheus telemetry endpoint

Cara Install

git clone https://github.com/<username>/nft-mint-automator.git
cd nft-mint-automator
npm install

Cara Jalankan

npm start -- \
  --ws $WSRPC \
  --http $HTTPRPC \
  --pk $PRIVATEKEY \
  --target $TARGETCONTRACT \
  --retries 5 \
  --gasBumpPercent 10 \
  --useFlashbots

- --ws : WebSocket RPC URL  
- --http : HTTP RPC fallback URL  
- --pk : Private key wallet  
- --target : Alamat contract NFT  
- --retries : Max retry jika TX mint gagal  
- --gasBumpPercent : Persentase kenaikan gas tiap retry  
- --useFlashbots : Gunakan Flashbots relay (opsional)

Telemetry

Metrics tersedia di:  
http://localhost:9090/metrics
