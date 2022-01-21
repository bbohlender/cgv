import { buffer, debounceTime, OperatorFunction, shareReplay } from "rxjs"
import { EventDepthMap } from "."

export function maxEventDepth(...maps: Array<EventDepthMap>): EventDepthMap {
    const prev: EventDepthMap = {}
    for (const map of maps) {
        const entries = Object.entries(map)
        for (const entry of entries) {
            const [eventName, eventDepth] = entry
            if (eventDepth == null) {
                continue
            }
            const currentEventDepth = prev[eventName]
            if (currentEventDepth == null || eventDepth > currentEventDepth) {
                prev[entry[0]] = entry[1]
            }
        }
    }

    return prev
}

export function bufferDebounceTime<T>(dueTime: number): OperatorFunction<T, Array<T>> {
    return (obs) => {
        const shared = obs.pipe(shareReplay({ refCount: true, bufferSize: 1 }))
        return shared.pipe(buffer(shared.pipe(debounceTime(dueTime))))
    }
}
