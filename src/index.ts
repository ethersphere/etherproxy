#!/usr/bin/env node

import { Arrays, Objects } from 'cafe-utility'
import { IncomingMessage, ServerResponse, createServer } from 'http'
import fetch from 'node-fetch'
import { metrics } from './metrics'
import { Target, getHealthyTarget } from './target'
import { RequestContext, ResponseContext } from './types'
import { fetchWithTimeout, respondWithFetchPromise } from './utility'

const PORT_ENV = 'ETHERPROXY_PORT'
const EXPIRY_ENV = 'ETHERPROXY_EXPIRY'
const TARGET_ENV = 'ETHERPROXY_TARGET'
const DEFAULT_PORT = 9000
const DEFAULT_EXPIRY = 2000
const DEFAULT_TARGET = 'http://localhost:8545'

main()

function main() {
    const port = Arrays.getNumberArgument(process.argv, 'port', process.env, PORT_ENV) || DEFAULT_PORT
    const target = Arrays.getArgument(process.argv, 'target', process.env, TARGET_ENV) || DEFAULT_TARGET
    const expiry = Arrays.getNumberArgument(process.argv, 'expiry', process.env, EXPIRY_ENV) || DEFAULT_EXPIRY
    const fastIndex = Objects.createFastIndex()
    const targets: Target[] = target.split(',').map(x => ({
        url: x,
        lastErrorAt: 0
    }))
    const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
        request.on('error', error => {
            console.error(error)
        })
        response.on('error', error => {
            console.error(error)
        })
        if (request.url === '/health' || request.url === '/readiness') {
            for (let i = 0; i < targets.length; i++) {
                const target = getHealthyTarget(targets)
                try {
                    await fetch(target.url, { timeout: 10_000 })
                    response.statusCode = 200
                    response.end(`200 OK - ${metrics.requests} requests served`)
                    return
                } catch (error) {
                    target.lastErrorAt = Date.now()
                    console.error(error)
                }
            }
            response.statusCode = 503
            response.end('503 Service Unavailable')
            return
        }
        const chunks: Buffer[] = []
        request.on('data', (chunk: Buffer) => {
            chunks.push(chunk)
        })
        request.on('end', async () => {
            for (let i = 0; i < targets.length; i++) {
                const target = getHealthyTarget(targets)
                try {
                    const context: RequestContext = {
                        method: request.method || 'GET',
                        url: target.url,
                        headers: request.headers as Record<string, string>,
                        body: Buffer.concat(chunks).toString('utf-8')
                    }
                    const parsedBody = JSON.parse(context.body)
                    const id = parsedBody.id
                    delete parsedBody.id
                    metrics.requests++
                    const key = `${target.url}_${JSON.stringify(parsedBody)}`
                    const cachedPromise = Objects.getFromFastIndexWithExpiracy(
                        fastIndex,
                        key
                    ) as Promise<ResponseContext>
                    if (cachedPromise) {
                        process.stdout.write(`Cache hit: ${key}\n`)
                        const successful = await respondWithFetchPromise(id, response, cachedPromise)
                        if (successful) {
                            return
                        } else {
                            target.lastErrorAt = Date.now()
                            continue
                        }
                    }
                    process.stdout.write(`Key: ${key}\n`)
                    delete context.headers.host
                    delete context.headers['user-agent']
                    delete context.headers['content-length']
                    const responsePromise = fetchWithTimeout(context.url, {
                        method: context.method,
                        headers: context.headers,
                        body: context.body
                    })
                    Objects.pushToFastIndexWithExpiracy(fastIndex as any, key, responsePromise, expiry)
                    const successful = await respondWithFetchPromise(id, response, responsePromise)
                    if (successful) {
                        return
                    } else {
                        target.lastErrorAt = Date.now()
                        continue
                    }
                } catch (error) {
                    target.lastErrorAt = Date.now()
                    console.error(error)
                }
            }
            response.statusCode = 503
            response.end('503 Service Unavailable')
        })
    })
    server.listen(port)
    console.log(`Etherproxy is running on port ${port}`)
}
