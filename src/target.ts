import { Dates } from 'cafe-utility'

export type Target = {
    url: string
    lastErrorAt: number
}

export function getHealthyTarget(targets: Target[]): Target {
    const healthyIfLastErrorIsBefore = Date.now() - Dates.hours(2)
    const healthyTargets = targets.filter(x => x.lastErrorAt < healthyIfLastErrorIsBefore)
    return healthyTargets[0] || targets[0]
}
