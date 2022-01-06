import { Operation, ParsedEvent, ParsedGrammarDefinition, ParsedValues } from "."

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
    const parallelProcessTracker = { value: 1 }
    const resolveEvent = async (prev: Array<T>, identifier: string): Promise<Array<T>> => {
        let entry = unresolvedEvents.get(identifier)
        if (entry == null) {
            entry = []
            unresolvedEvents.set(identifier, entry)
        }
        const e = entry
        return new Promise((resolve) => {
            e.push({ prev, resolve })
            ++unresolvedEventCount

            if (parallelProcessTracker.value === unresolvedEventCount) {
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
        prev.map((p) => () => Promise.resolve([p])),
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
    console.log("interpretion done")
    const results = await Promise.all(computeArrays.map((c) => c()))
    return results.reduce((v1, v2) => v1.concat(v2))
}

function deriveRec<T>(
    prev: Array<() => Promise<Array<T>>>,
    value: ParsedValues,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    clone: (value: T, index: string) => T,
    resolveEvent: (prev: Array<T>, identifier: string) => Promise<Array<T>>,
    parallelProcessTracker: { value: number }
): Array<() => Promise<Array<T>>> {
    let values: Array<ParsedValues>
    switch (value.type) {
        case "this":
            return prev
        case "event":
            //here we are waisting time
            return [
                async () => {
                    const eventInputs = await Promise.all(prev.map((c) => c()))
                    return resolveEvent(
                        eventInputs.reduce((v1, v2) => v1.concat(v2), []),
                        value.identifier
                    )
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

            return operation(...parameters)
        case "parallel":
            values = value.values

            const results = values.map((value, i) => {
                const result = deriveRec(
                    prev.map((compute, ii) => async () => {
                        if (i > 0) {
                            parallelProcessTracker.value++
                        }
                        //TODO: this will be executed multiple times (with the same result: here we need caching)
                        const prevResult = await compute()
                        if (i > 0) {
                            parallelProcessTracker.value--
                        }
                        return prevResult.map((v, iii) => clone(v, `${i},${ii},${iii}`))
                    }),
                    value,
                    grammar,
                    operations,
                    clone,
                    resolveEvent,
                    parallelProcessTracker
                )
                return result
            })

            return results.reduce((v1, v2) => v1.concat(v2), [])
        case "raw":
            return Array.isArray(value.value)
                ? value.value.map((v) => () => Promise.resolve([v]))
                : prev.map(() => () => Promise.resolve([value.value]))
        case "sequential":
            values = value.values
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
