export interface RequestContext {
    method: string
    url: string
    headers: { [key: string]: string }
    body: string
}

export interface ResponseContext {
    status: number
    headers: { [key: string]: string[] }
    json: any
}
