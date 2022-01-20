import { mergeAll, mergeMap, MonoTypeOperatorFunction, Observable, Subject } from "rxjs"
import { ParsedEventDefintion, MatrixEntriesObservable, InterpretionValue, MatrixEntry, toArray } from "."

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

export function generateEventScheduler<T>(): (
    identifier: string,
    event: ParsedEventDefintion,
    input: MatrixEntriesObservable<InterpretionValue<T>>
) => MatrixEntriesObservable<InterpretionValue<T>> {
    //TODO: implement
    const map: Array<
        [
            event: ParsedEventDefintion,
            depth: number,
            subject: Subject<MatrixEntriesObservable<InterpretionValue<T>>>,
            result: MatrixEntriesObservable<InterpretionValue<T>>
        ]
    > = []
    return (identifier, event, input) => {
        let entry = map.get(identifier)
        if (entry == null) {
            const subject = new Subject<MatrixEntriesObservable<InterpretionValue<T>>>()
            entry = [subject, subject.pipe(mergeMap(changes => toArray(changes, 100))).pipe(values => event)]
        }
        return entry[1]
    }
}
