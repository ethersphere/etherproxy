import { Dates } from 'cafe-utility'

export type Target = {
    url: string
    lastErrorAt: number
}

export function getHealthyTarget(targets: Target[]): Target {
    const healthyIfLastErrorIsAfter = Date.now() - Dates.hours(2)
    const healthyTargets = targets.filter(x => x.lastErrorAt < healthyIfLastErrorIsAfter)
    return healthyTargets[0] || targets[0]
}
