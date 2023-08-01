#!/usr/bin/env node

import { Arrays, Objects } from 'cafe-utility'
import { IncomingMessage, ServerResponse, createServer } from 'http'
import fetch from 'node-fetch'
import { RequestContext, ResponseContext } from './types'
import { fetchWithTimeout, respondWithFetchPromise } from './utility'

main()

function main() {
    const port = Arrays.requireNumberArgument(process.argv, 'port')
    const target = Arrays.requireStringArgument(process.argv, 'target')
    const expiry = Arrays.requireNumberArgument(process.argv, 'expiry')

    const fastIndex = Objects.createFastIndex()
    const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
        if (request.url === '/health' || request.url === '/readiness') {
            try {
                await fetch(target, { timeout: 10_000 })
                response.statusCode = 200
                response.end('200 OK')
            } catch (error) {
                console.error(error)
                response.statusCode = 503
                response.end('503 Service Unavailable')
            }
            return
        }
        const chunks: Buffer[] = []
        request.on('data', (chunk: Buffer) => {
            chunks.push(chunk)
        })
        request.on('end', async () => {
            try {
                const context: RequestContext = {
                    method: request.method || 'GET',
                    url: target,
                    headers: request.headers as Record<string, string>,
                    body: Buffer.concat(chunks).toString('utf-8')
                }
                const parsedBody = JSON.parse(context.body)
                const id = parsedBody.id
                delete parsedBody.id
                const key = JSON.stringify(parsedBody)
                const cachedPromise = Objects.getFromFastIndexWithExpiracy(fastIndex, key) as Promise<ResponseContext>
                if (cachedPromise) {
                    process.stdout.write(`[~] Cache hit: ${key}\n`)
                    await respondWithFetchPromise(id, response, cachedPromise)
                    return
                }
                process.stdout.write(`[~] Key: ${key}\n`)
                delete context.headers.host
                delete context.headers['user-agent']
                delete context.headers['content-length']
                const responsePromise = fetchWithTimeout(context.url, {
                    method: context.method,
                    headers: context.headers,
                    body: context.body
                })
                Objects.pushToFastIndexWithExpiracy(fastIndex as any, key, responsePromise, expiry)
                await respondWithFetchPromise(id, response, responsePromise)
            } catch (error) {
                console.error(error)
                response.statusCode = 503
                response.end('503 Service Unavailable')
            }
        })
    })
    server.listen(port)
    console.log(`[~] Etherproxy is running on port ${port}`)
}
