import {
    combineLatest,
    EMPTY,
    finalize,
    isObservable,
    map,
    merge,
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
    [name in string]: Operation<InterpretionValue<T>>
}

type InterpretionValue<T> = {
    value: T
    eventDepthMap: { [identifier in string]?: number }
}

type DeepObservable<T> = Array<DeepObservable<T>> | Observable<DeepObservable<T>> | T

export function flatten<T>(deep: DeepObservable<T>): Observable<Array<T>> {
    if (Array.isArray(deep)) {
        return deep.length === 0
            ? of([])
            : combineLatest(deep.map((value) => flatten(value))).pipe(
                  map((results) => results.reduce((v1, v2) => v1.concat(v2), []))
              )
    } else if (isObservable(deep)) {
        return deep.pipe(switchMap((result) => flatten(result)))
    } else {
        return of([deep])
    }
}

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

//TODO: caching, premature termination, clone parallel

export function listenFlat<T>(deep: DeepObservable<T>): Observable<{ type: "add" | "remove"; item: T }> {
    //TODO: make it more efficient by comparing old and new
    const changeSubject = new Subject<{ type: "add" | "remove"; item: T }>()
    return merge(listenFlatRec(deep, changeSubject), changeSubject).pipe(finalize(() => changeSubject.complete()))
}

function listenFlatRec<T>(
    deep: DeepObservable<T>,
    changeSubject: Subject<{ type: "add" | "remove"; item: T }>
): Observable<never> {
    if (Array.isArray(deep)) {
        return deep.length === 0 ? EMPTY : merge(...deep.map((value) => listenFlatRec(value, changeSubject)))
    } else if (isObservable(deep)) {
        return deep.pipe(switchMap((result) => listenFlatRec(result, changeSubject)))
    } else {
        return new Observable(() => {
            changeSubject.next({ type: "add", item: deep })
            return () => changeSubject.next({ type: "remove", item: deep })
        })
    }
}

export function interprete<T>(
    input: Observable<Array<T>>,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    eventDebounceTime: number = 100
): Observable<Array<T>> {
    const [firstRule] = Object.values(grammar.rules)
    const eventList: Array<
        [
            identifier: string,
            event: ParsedEventDefintion,
            depth: number,
            inputs: Array<Array<InterpretionValue<T>>>,
            subscribers: Array<Subscriber<Array<InterpretionValue<T>>>>
        ]
    > = []
    const eventScheduler = new Subject<[string, ParsedEventDefintion, number]>()
    eventScheduler
        .pipe(
            debounceParallel(eventDebounceTime, ([e1, d1], [e2, d2]) => e1 === e2 && d1 === d2),
            tap(([identifier, event, depth]) => {
                const entries = eventList.find(([i, e, d]) => i === identifier && e === event && d === depth)
                if (entries != null && entries[3].length > 0) {
                    const results = event(entries[3].map((inputs) => inputs.map(({ value }) => value)))
                    if (!Array.isArray(results) || results.length !== entries.length) {
                        throw new Error(
                            `the return value of an event must be an array with the same length as the input array`
                        )
                    }
                    results.forEach((result, index) => {
                        if (!Array.isArray(result)) {
                            throw new Error(`each item in the array returned by the event must be a array be itself`)
                        }
                        entries[4][index].next(
                            result.map((value) => ({
                                value,
                                eventDepthMap: {
                                    [identifier]: depth + 1,
                                },
                            }))
                        )
                    })
                }
            })
        )
        .subscribe()
    return flatten(
        interpreteStep(
            input.pipe(
                map((value) =>
                    value.map<InterpretionValue<T>>((v) => ({
                        value: v,
                        eventDepthMap: {},
                    }))
                )
            ),
            firstRule,
            grammar,
            operations,
            (identifier, event, input) => {
                new Observable((subscriber) => {
                    listenFlat(input).subscribe({
                        next: ({ type, item }) => {
                            const depth = item.eventDepthMap[identifier] ?? 0
                            let entry = eventList.find(
                                ([i, e, d]) =>
                                    i === identifier && e === event && d === depth
                            )
                            if(entry == null) {
                                entry = [identifier, event, depth, [], []]
                                eventList.push(entry)
                            }
                            if (type === "add") {
                                //add
                                entry[3].push() //add input
                                entry[4].push() //add subscriber
                            } else {
                                //remove subscriber & input
                            }
                            eventScheduler.next([identifier, event, item.eventDepthMap[identifier] ?? 0])
                        },
                    })
                    let entry = eventList.get(event)
                    const newEntryEntry: [Array<InterpretionValue<T>>, Subscriber<Array<InterpretionValue<T>>>] = [
                        input,
                        subscriber,
                    ]
                    if (entry == null) {
                        entry = [newEntryEntry]
                        eventList.set(event, entry)
                    } else {
                        entry.push(newEntryEntry)
                    }
                    const e = entry
                    return () => {
                        const index = e.findIndex((entryEntry) => entryEntry === newEntryEntry)
                        if (index !== -1) {
                            e.splice(index, 1)
                            if (e.length === 0) {
                                eventList.delete(event)
                            }
                        }
                    }
                })
            }
        )
    ).pipe(
        map((interpretionResults) => interpretionResults.map(({ value }) => value)),
        finalize(() => eventScheduler.complete())
    )
}

export function interpreteStep<T>(
    input: DeepObservable<InterpretionValue<T>>,
    step: ParsedStep,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    scheduleEvent: (
        identifier: string,
        event: ParsedEventDefintion,
        input: DeepObservable<InterpretionValue<T>>
    ) => DeepObservable<InterpretionValue<T>>
): DeepObservable<InterpretionValue<T>> {
    switch (step.type) {
        case "event":
            const event = grammar.events[step.identifier]
            if (event == null) {
                throw new Error(`unknown event "${step.identifier}"`)
            }
            return scheduleEvent(step.identifier, event, input)
        case "operation":
            const operation = operations[step.identifier]
            if (operation == null) {
                throw new Error(`unknown operation "${step.identifier}"`)
            }
            return operation(interpreteStep(input, step.parameters, grammar, operations, scheduleEvent))
        case "parallel":
            return step.steps.map(
                //TODO: clone
                (stepOfSteps) => interpreteStep(input, stepOfSteps, grammar, operations, scheduleEvent)
            )
        case "raw":
            return step.value
        case "sequential":
            let current = input
            for (const stepOfSteps of step.steps) {
                //TODO: premature termination
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
