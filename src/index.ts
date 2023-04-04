#!/usr/bin/env node

import { Objects } from 'cafe-utility'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import fetch, { RequestInit } from 'node-fetch'

interface RequestContext {
    method: string
    url: string
    headers: { [key: string]: string }
    body: string
}

interface ResponseContext {
    status: number
    headers: { [key: string]: string[] }
    json: any
}

runJsonRpcCacheProxy(parseInt(process.argv[2], 10), process.argv[3])

function runJsonRpcCacheProxy(port: number, target: string) {
    const fastIndex = Objects.createFastIndex()
    const server = createServer((request: IncomingMessage, response: ServerResponse) => {
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
                process.stdout.write(`[~] Key: ${key}\n`)
                const cachedPromise = Objects.getFromFastIndexWithExpiracy(fastIndex, key) as Promise<ResponseContext>
                if (cachedPromise) {
                    process.stdout.write('[~] Cache hit\n')
                    await respondWithFetchPromise(id, response, cachedPromise)
                    return
                }
                delete context.headers.host
                delete context.headers['user-agent']
                delete context.headers['content-length']
                const responsePromise = fetchWithTimeout(context.url, {
                    method: context.method,
                    headers: context.headers,
                    body: context.body
                })
                Objects.pushToFastIndexWithExpiracy(fastIndex as any, key, responsePromise, 2000)
                await respondWithFetchPromise(id, response, responsePromise)
            } catch (error) {
                console.error(error)
                response.statusCode = 503
                response.end('503 Service Unavailable')
            }
        })
    })
    server.listen(port)
}

async function respondWithFetchPromise(id: number, response: ServerResponse, promise: Promise<ResponseContext | null>) {
    const context = await promise
    if (!context) {
        response.statusCode = 503
        response.end('503 Service Unavailable')
        return
    }
    for (const [key, value] of Object.entries(context.headers)) {
        const lowerCaseKey = key.toLowerCase()
        if (lowerCaseKey === 'content-length' || lowerCaseKey === 'content-encoding') {
            continue
        }
        response.setHeader(key, value)
    }
    response.statusCode = context.status
    context.json.id = id
    response.end(JSON.stringify(context.json))
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<ResponseContext | null> {
    const response = fetch(url, { ...options, timeout: 10_000 })
        .then(async x => ({
            status: x.status,
            headers: x.headers.raw(),
            json: await x.json()
        }))
        .catch(error => {
            console.error(error)
            return null
        })
    return response
}
