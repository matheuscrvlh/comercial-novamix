export const CORES_STATUS = {
    orange: { badge: 'bg-orange-base/10 text-orange-base', dot: 'bg-orange-base', label: 'Laranja' },
    green: { badge: 'bg-green-base/10 text-green-base', dot: 'bg-green-base', label: 'Verde' },
    red: { badge: 'bg-red-base/10 text-red-base', dot: 'bg-red-base', label: 'Vermelho' },
    blue: { badge: 'bg-blue-base/10 text-blue-base', dot: 'bg-blue-base', label: 'Azul' },
    gray: { badge: 'bg-gray-base/20 text-gray-dark dark:text-dark-text-muted', dot: 'bg-gray-base', label: 'Cinza' },
} as const

export type CorStatus = keyof typeof CORES_STATUS

export const CORES_STATUS_OPCOES = Object.keys(CORES_STATUS) as CorStatus[]

export function classeBadgeStatus(cor: string | null) {
    if (cor && cor in CORES_STATUS) return CORES_STATUS[cor as CorStatus].badge
    return CORES_STATUS.gray.badge
}
