# Etherproxy

Etherproxy is a robust and lightweight JSON-RPC reverse proxy tool designed for **optimising requests** and **providing failover support**.

## Usage

```
npx etherproxy --port 9000 --target https://go.getblock.io/YOUR_TOKEN --expiry 2000
```

The command above starts the JSON-RPC reverse proxy...

-   on port 9000 (`--port`)
-   forwarding all requests to GetBlock using your token and mainnet (`--target`)
-   grouping requests together within 2 seconds (`--expiry`)

Make sure to replace `YOUR_TOKEN` with your actual token.

Supply multiple JSON-RPC `--target` with a comma-separated string:

```
npx etherproxy --target https://go.getblock.io/YOUR_TOKEN,https://rpc.gnosischain.com
```

## Verify the tool is running

Execute the `curl` command shown below repeatedly and inspect the logs of Etherproxy.

```sh
curl http://localhost:9000 -H "Content-Type: application/json" -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

When the text `Cache hit` appears, it indicates that a request was saved and immediately returned:

```txt
Key: {"jsonrpc":"2.0","method":"eth_blockNumber","params":[]}
Cache hit: {"jsonrpc":"2.0","method":"eth_blockNumber","params":[]}
Cache hit: {"jsonrpc":"2.0","method":"eth_blockNumber","params":[]}
Cache hit: {"jsonrpc":"2.0","method":"eth_blockNumber","params":[]}
```

## Benefits

### Caching

Etherproxy provides several benefits in multi-node scenarios. For instance, requests such as `eth_blockNumber` and `eth_getLogs` are frequently called, sometimes generating many unnecessary requests. By using a reverse proxy, the same requests made within a small time period are grouped together and sent to your JSON-RPC endpoint only once.

As a result, all local nodes receive identical correct responses, and the number of actual requests sent is significantly reduced, which helps to **preserve your request quota** in case of a paid third-party, or **reduce the load** when you run your own Ethereum node.

### Failover

Failover is an essential aspect of maintaining high availability and reliability in network services. Etherproxy's seamless failover capability ensures that if one JSON-RPC endpoint becomes unreachable, the traffic is automatically redirected to another configured endpoint without interruption.

## Error handling

Whenever an error is thrown, Etherproxy responds with a `503 Service Unavailable` status.
