# Etherproxy

## Usage

To launch a JSON-RPC reverse proxy on port 9000 and forward all requests to GetBlock using your token and mainnet, run:

```
npx etherproxy 9000 https://gno.getblock.io/YOUR_TOKEN/mainnet/
```

Make sure to replace `YOUR_TOKEN` with your actual token.

## Benefits

The JSON-RPC reverse proxy provides several benefits, particularly in multi-node scenarios. For instance, requests such as `eth_blockNumber` and `eth_getLogs` are frequently called, and in such scenarios, it's easy to quickly exhaust your request quota.

However, by using the reverse proxy, the same requests made within 2 seconds are grouped together and sent to your third-party service only once. As a result, all local nodes receive the same response, which can significantly reduce the number of requests made and help preserve your quota.
