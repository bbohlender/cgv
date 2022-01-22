import { connectable, Observable, OperatorFunction, ReplaySubject, switchMap } from "rxjs"

export type ComputeFunction<Input, Output> = (input: Input) => Observable<Output>

const cacheMap = new Map<ComputeFunction<any, any>, Array<[dependencies: Array<any>, output: Observable<any>]>>()

//TODO: clear the cache after certain amount of unused time (and unsubscribe connected observable)
//TODO: clone when caching

export function cache<Input, Output>(
    getDependencies: (input: Input) => Array<any>,
    compute: ComputeFunction<Input, Output>
): OperatorFunction<Input, Output> {
    let entries = cacheMap.get(compute)
    if (entries == null) {
        entries = []
        cacheMap.set(compute, entries)
    }
    const cacheEntries = entries
    return (input) =>
        input.pipe(
            switchMap((input) => {
                const dependencies = getDependencies(input)
                let cacheEntry = cacheEntries.find(([dep]) => shallowEqual(dep, dependencies))
                if (cacheEntry == null) {
                    const obs = connectable(compute(input), {
                        connector: () => new ReplaySubject(1),
                        resetOnDisconnect: false,
                    })
                    obs.connect()
                    cacheEntry = [dependencies, obs]
                    cacheEntries.push(cacheEntry)
                }
                return cacheEntry[1]
            })
        )
}

function shallowEqual(a1: Array<any>, a2: Array<any>): boolean {
    if (a1.length != a2.length) {
        return false
    }
    for (let i = 0; i < a1.length; i++) {
        if (a1[i] != a2[i]) {
            return false
        }
    }
    return true
}
