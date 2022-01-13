import {
    buffer,
    connect,
    connectable,
    debounceTime,
    finalize,
    OperatorFunction,
    refCount,
    share,
    shareReplay,
    Subject,
    Subscriber,
    takeUntil,
    tap,
} from "rxjs"
import { EventDepthMap } from "."

export function maxEventDepth(target: EventDepthMap, map: EventDepthMap): void {
    const entries = Object.entries(map)
    for (const entry of entries) {
        const [eventName, eventDepth] = entry
        if (eventDepth == null) {
            continue
        }
        const currentEventDepth = target[eventName]
        if (currentEventDepth == null || eventDepth > currentEventDepth) {
            target[entry[0]] = entry[1]
        }
    }
}

export function bufferDebounceTime<T>(dueTime: number): OperatorFunction<T, Array<T>> {
    return (obs) => {
        const shared = obs.pipe(shareReplay({ refCount: true, bufferSize: 1 }))
        return shared.pipe(buffer(shared.pipe(debounceTime(dueTime))))
    }
}
