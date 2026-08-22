const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
        super(message)
        this.status = status
    }
}

export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${API_URL}${path}`)

    if (params) {
        Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
    }

    const res = await fetch(url, { credentials: 'include' })
    return handleResponse<T>(res)
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    return handleResponse<T>(res)
}

export async function apiDelete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'DELETE',
        credentials: 'include',
    })
    return handleResponse<T>(res)
}

async function handleResponse<T>(res: Response): Promise<T> {
    if (res.status === 401) {
        window.location.href = 'https://hub.lojanovamix.com.br'
        throw new ApiError(401, 'Não autorizado')
    }

    const data = await res.json()

    if (!res.ok) {
        throw new ApiError(res.status, data.error ?? 'Erro ao buscar dados')
    }

    return data as T
}
