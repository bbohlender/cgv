import { distinctUntilChanged, map, Observable, OperatorFunction, shareReplay, switchAll, tap } from "rxjs"

const cacheMap = new Map<(input: any) => Observable<any>, Array<[dependencies: Array<any>, output: Observable<any>]>>()

//TODO: clear the cache after certain amount of unused time (and unsubscribe connected observable)

export function cache<Input, Output>(
    getDependencies: (input: Input) => Array<any>,
    compute: (input: Input) => Observable<Output>
): OperatorFunction<Input, Output> {
    let entries = cacheMap.get(compute)
    if (entries == null) {
        entries = []
        cacheMap.set(compute, entries)
    }
    const cacheEntries = entries
    return (input) =>
        input.pipe(
            map((input) => {
                const dependencies = getDependencies(input)
                let cacheEntry = cacheEntries.find(([dep]) => shallowEqual(dep, dependencies))
                if (cacheEntry == null) {
                    const obs = compute(input).pipe(
                        shareReplay({
                            refCount: false,
                            bufferSize: 1,
                        })
                    )
                    cacheEntry = [dependencies, obs]
                    cacheEntries.push(cacheEntry)
                }
                return cacheEntry[1]
            }),
            distinctUntilChanged(),
            switchAll()
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
