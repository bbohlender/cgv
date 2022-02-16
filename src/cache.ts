import { map, Observable, of, OperatorFunction, shareReplay, switchAll } from "rxjs"

const cacheMap = new Map<(input: any) => Observable<any>, Array<[dependencies: Array<any>, output: Observable<any>]>>()

//TODO: clear the cache after certain amount of unused time (and unsubscribe connected observable)

export function cache<Input, Output>(
    getDependencies: (input: Input) => Array<any>,
    compute: (input: Input | undefined) => Observable<Output>
): OperatorFunction<Input | undefined, Output | undefined> {
    let entries = cacheMap.get(compute)
    if (entries == null) {
        entries = []
        cacheMap.set(compute, entries)
    }
    const cacheEntries = entries
    return (input) =>
        input.pipe(
            map((input) => {
                if (input == null) {
                    return of(undefined)
                }
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
