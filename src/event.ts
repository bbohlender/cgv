import { MonoTypeOperatorFunction, Subject } from "rxjs"

function debounceParallel<T>(time: number, compare: (v1: T, v2: T) => boolean): MonoTypeOperatorFunction<T> {
    return (value) => {
        const entries: Array<[T, number]> = []
        const subject = new Subject<T>()
        const cleanup = () => entries.forEach(([, handle]) => clearTimeout(handle))
        value.subscribe({
            complete: () => {
                cleanup()
                subject.complete()
            },
            next: (value) => {
                let entry = entries.find(([e1]) => compare(e1, value))
                if (entry == null) {
                    entry = [value, -1]
                } else {
                    clearTimeout(entry[1])
                }
                entry[1] = setTimeout(() => subject.next(value), time) as any
            },
            error: (error) => {
                cleanup()
                subject.error(error)
            },
        })
        return subject
    }
}

/*export function scheduleEvents<T>(inputs: Observable<MatrixChangesObservable<T>>, 
    eventDebounceTime: number): Observable<any> {
    return inputs.pipe(
        mergeAll(),
        debounceParallel(eventDebounceTime, )
    )
}*/
