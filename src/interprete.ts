import {
    combineLatest,
    finalize,
    isObservable,
    map,
    MonoTypeOperatorFunction,
    Observable,
    of,
    Subject,
    Subscriber,
    switchMap,
    tap,
} from "rxjs"
import { ParsedEventDefintion, ParsedGrammarDefinition, ParsedStep } from "."

export type Operation<T> = (values: DeepObservable<T>) => DeepObservable<T>

export type Operations<T> = {
    [name in string]: Operation<T>
}

type DeepObservable<T> = Observable<Array<T | DeepObservable<T>>>

export function flatten<T>(deep: DeepObservable<T>): Observable<Array<T>> {
    return deep.pipe(
        switchMap((values) =>
            values.length === 0
                ? of([])
                : combineLatest(values.map((value) => (isObservable(value) ? flatten(value) : of([value]))))
        ),
        map((results) => results.reduce((v1, v2) => v1.concat(v2), []))
    )
}

function debounceParallel<T>(time: number): MonoTypeOperatorFunction<T> {
    return (value) => {
        const map = new Map<T, number>()
        const subject = new Subject<T>()
        const cleanup = () => map.forEach((handle) => clearTimeout(handle))
        value.subscribe({
            complete: () => {
                cleanup()
                subject.complete()
            },
            next: (value) => {
                let entry = map.get(value)
                if (entry != null) {
                    clearTimeout(entry)
                }
                map.set(value, setTimeout(() => subject.next(value), time) as any)
            },
            error: (error) => {
                cleanup()
                subject.error(error)
            },
        })
        return subject
    }
}

export function interprete<T>(
    input: Observable<Array<T>>,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    eventDebounceTime: number = 100,
): Observable<Array<T>> {
    const [firstRule] = Object.values(grammar.rules)
    const eventMap = new Map<ParsedEventDefintion, Array<[inputs: Array<T>, subscriber: Subscriber<T[]>]>>()
    const eventScheduler = new Subject<ParsedEventDefintion>()
    eventScheduler
        .pipe(
            debounceParallel(eventDebounceTime),
            tap((event) => {
                const entries = eventMap.get(event)
                if (entries != null && entries.length > 0) {
                    const results = event(entries.map(([values]) => values))
                    console.log("event processed", entries.length, results.length)
                    if (!Array.isArray(results) || results.length !== entries.length) {
                        throw new Error(
                            `the return value of an event must be an array with the same length as the input array`
                        )
                    }
                    results.forEach((result, index) => {
                        if (!Array.isArray(result)) {
                            throw new Error(`each item in the array returned by the event must be a array be itself`)
                        }
                        entries[index][1].next(result)
                    })
                }
            })
        )
        .subscribe()
    return flatten(
        interpreteStep(
            input,
            firstRule,
            grammar,
            operations,
            (identifier, input) =>
                new Observable((subscriber) => {
                    const event = grammar.events[identifier]
                    if (event == null) {
                        subscriber.error(new Error(`unknown event "${identifier}"`))
                        return
                    }
                    let entry = eventMap.get(event)
                    const newEntryEntry: [Array<T>, Subscriber<Array<T>>] = [input, subscriber]
                    if (entry == null) {
                        entry = [newEntryEntry]
                        eventMap.set(event, entry)
                    } else {
                        entry.push(newEntryEntry)
                    }
                    eventScheduler.next(event)
                    console.log("scheduled " + identifier, entry.length)
                    const e = entry
                    return () => {
                        const index = e.findIndex((entryEntry) => entryEntry === newEntryEntry)
                        if (index !== -1) {
                            e.splice(index, 1)
                            if (e.length === 0) {
                                eventMap.delete(event)
                            }
                        }
                    }
                })
        )
    ).pipe(finalize(() => eventScheduler.complete()))
}

export function interpreteStep<T>(
    input: DeepObservable<T>,
    step: ParsedStep,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    scheduleEvent: (identifier: string, input: Array<T>) => Observable<Array<T>>
): DeepObservable<T> {
    switch (step.type) {
        case "event":
            return flatten(input).pipe(switchMap((input) => scheduleEvent(step.identifier, input)))
        case "operation":
            const operation = operations[step.identifier]
            if (operation == null) {
                throw new Error(`unknown operation "${step.identifier}"`)
            }
            return operation(interpreteStep(input, step.parameters, grammar, operations, scheduleEvent))
        case "parallel":
            return of(
                step.steps.map(
                    //TODO: clone
                    (stepOfSteps) => interpreteStep(input, stepOfSteps, grammar, operations, scheduleEvent)
                )
            )
        case "raw":
            return of(Array.isArray(step.value) ? step.value : [step.value])
        case "sequential":
            let current = input
            for (const stepOfSteps of step.steps) {
                current = interpreteStep(current, stepOfSteps, grammar, operations, scheduleEvent)
            }
            return current
        case "this":
            return input
        case "symbol":
            const rule = grammar.rules[step.identifier]
            if (rule == null) {
                throw new Error(`unknown rule "${step.identifier}"`)
            }
            return interpreteStep(input, rule, grammar, operations, scheduleEvent)
    }
}
