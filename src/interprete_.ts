/*import { Operation, ParsedEvent, ParsedGrammarDefinition, ParsedStep } from "."

export type Operations<T> = {
    [name in string]: Operation<T>
}

//TODO: implement a cache map (that enables to continue at any point, and also InstancedMeshes)
//the cache map should also contain loading requests (so requestes are not doubled)

//TODO: cancellation token
export async function interprete<T>(
    prev: Array<T>,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    clone: (value: T, index: string) => T
): Promise<Array<T>> {
    const rules = Object.values(grammar.rules)
    if (rules.length === 0) {
        return Promise.resolve(prev)
    }
    const [value] = rules
    const unresolvedEvents = new Map<string, Array<{ prev: Array<T>; resolve: (result: Array<T>) => void }>>()
    let unresolvedEventCount = 0
    const parallelProcessTracker = { current: 1 }
    const resolveEvent = async (prev: Array<T>, identifier: string): Promise<Array<T>> => {
        return new Promise((resolve) => {
            let entry = unresolvedEvents.get(identifier)
            if (entry == null) {
                entry = []
                unresolvedEvents.set(identifier, entry)
            }
            entry.push({ prev, resolve })
            ++unresolvedEventCount

            console.log(parallelProcessTracker.current, unresolvedEvents)

            if (parallelProcessTracker.current === unresolvedEventCount) {
                const [[eventName, entries]] = unresolvedEvents.entries()
                unresolvedEvents.delete(eventName)
                unresolvedEventCount -= entries.length
                const event = grammar.events[eventName]
                if (event == null) {
                    throw new Error(`unknown event "${eventName}"`)
                }
                const results = event(entries.map(({ prev }) => prev))
                if (!Array.isArray(results) || results.length != entries.length) {
                    throw new Error(`an event must resolve into an array of arrays with the same length as the input`)
                }
                for (let i = 0; i < entries.length; i++) {
                    const { resolve } = entries[i]
                    if (!Array.isArray(results[i])) {
                        throw new Error(
                            `an event must resolve into an array of arrays with the same length as the input`
                        )
                    }
                    resolve(results[i])
                }
            }
        })
    }
    const computeArrays = deriveRec(
        [() => Promise.resolve(prev)],
        value,
        grammar,
        operations,
        clone,
        resolveEvent,
        parallelProcessTracker
    )
    if (unresolvedEventCount != 0) {
        throw new Error(`not all events have been resolved`)
    }
    const results = await Promise.all(computeArrays.map((c) => c()))
    return results.reduce((v1, v2) => v1.concat(v2), [])
}

function trackParallel<T>(array: Array<() => Promise<Array<T>>>, parallelProcessTracker: { current: number }) {
    return array.map((compute, i) => async () => {
        if (i > 0) {
            ++parallelProcessTracker.current
            console.log("parallel process started", i)
        }
        const results = await compute()
        if (i > 0) {
            --parallelProcessTracker.current
            console.log("parallel process ended", i)
        }
        return results
    })
}

function deriveRec<T>(
    prev: Array<() => Promise<Array<T>>>,
    value: ParsedStep,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    clone: (value: T, index: string) => T,
    resolveEvent: (prev: Array<T>, identifier: string) => Promise<Array<T>>,
    parallelProcessTracker: { current: number }
): Array<() => Promise<Array<T>>> {
    let values: Array<ParsedStep>
    switch (value.type) {
        case "this":
            return prev
        case "event":
            return [
                async () => {
                    console.log("event parameters start")
                    const eventInputs = await Promise.all(prev.map((c) => c()))
                    console.log("event parameters end")
                    const eventResult = await resolveEvent(
                        eventInputs.reduce((v1, v2) => v1.concat(v2), []),
                        value.identifier
                    )
                    return eventResult
                },
            ]
        case "operation":
            const operation = operations[value.identifier]
            if (operation == null) {
                throw new Error(`unknown operation "${value.identifier}"`)
            }

            const parameters = deriveRec(
                prev,
                value.parameters,
                grammar,
                operations,
                clone,
                resolveEvent,
                parallelProcessTracker
            )

            return trackParallel(operation(...parameters), parallelProcessTracker)
        case "parallel":
            values = value.steps

            const results = values.map((value, i) =>
                deriveRec<T>(
                    [
                        async () => {

                            //TODO: this will be executed multiple times (with the same result: here we need caching)
                            const prevResults = await Promise.all(prev.map((c) => c()))

                            return prevResults
                                .reduce((v1, v2) => v1.concat(v2), [])
                                .map((v, ii) => clone(v, `${i},${ii}`))
                        },
                    ],
                    value,
                    grammar,
                    operations,
                    clone,
                    resolveEvent,
                    parallelProcessTracker
                )
            )

            return trackParallel(
                results.reduce((v1, v2) => v1.concat(v2), []),
                parallelProcessTracker
            )
        case "raw":
            return trackParallel(
                Array.isArray(value.value)
                    ? value.value.map((v) => () => Promise.resolve([v]))
                    : prev.map(() => () => Promise.resolve([value.value])),
                parallelProcessTracker
            )
        case "sequential":
            values = value.steps
            let current = prev
            for (const value of values) {
                current = deriveRec(current, value, grammar, operations, clone, resolveEvent, parallelProcessTracker)
            }

            return current
        case "symbol":
            const rule = grammar.rules[value.identifier]
            if (rule == null) {
                throw new Error(`unknown rule "${value.identifier}"`)
            }
            return deriveRec(prev, rule, grammar, operations, clone, resolveEvent, parallelProcessTracker)
    }
}
*/