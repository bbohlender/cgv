import { mergeMap, Subject } from "rxjs"
import { ParsedEventDefintion, MatrixEntriesObservable, InterpretionValue, toArray } from "."


/*export function generateEventScheduler<T>(): (
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
            entry = [subject, subject.pipe(mergeMap((changes) => toArray(changes, 10))).pipe((values) => event)]
        }
        return entry[1]
    }
}*/
