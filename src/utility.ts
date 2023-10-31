import { ServerResponse } from 'http'
import fetch, { RequestInit } from 'node-fetch'
import { ResponseContext } from './types'

export async function respondWithFetchPromise(
    id: number,
    response: ServerResponse,
    promise: Promise<ResponseContext | null>
): Promise<boolean> {
    const context = await promise
    if (!context) {
        return false
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
    return true
}

export async function fetchWithTimeout(url: string, options: RequestInit): Promise<ResponseContext | null> {
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
