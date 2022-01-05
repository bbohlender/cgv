import { Operation, ParsedEvent, ParsedGrammarDefinition, ParsedValues } from "."

export type Operations<T> = {
    [name in string]: Operation<T>
}

export function interprete<T>(
    prev: Array<T>,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    clone: (value: T, index: number) => T
): Array<T> {
    const rules = Object.values(grammar.rules)
    if (rules.length === 0) {
        return prev
    }
    const [value] = rules
    const unresolvedEvents = new Map<string, Array<{ prev: Array<T>; resolve: (result: Array<T>) => void }>>()
    const resolveEvent: (prev: Array<T>, identifier: string, resolve: (result: Array<T>) => void) => void = (
        prev,
        identifier,
        resolve
    ) => {
        let entry = unresolvedEvents.get(identifier)
        if (entry == null) {
            entry = []
            unresolvedEvents.set(identifier, entry)
        }
        entry.push({ prev, resolve })
    }
    let result: Array<T> | undefined = undefined
    deriveRec(prev, value, grammar, operations, clone, resolveEvent, (r) => (result = r))
    while (unresolvedEvents.size > 0) {
        const [[eventName, entries]] = unresolvedEvents.entries()
        unresolvedEvents.delete(eventName)
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
                throw new Error(`an event must resolve into an array of arrays with the same length as the input`)
            }
            resolve(results[i])
        }
    }
    if (result == null) {
        throw new Error(`bug detected, all events are resolved but no result was computed`)
    }
    return result
}

function deriveRec<T>(
    prev: Array<T>,
    value: ParsedValues,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    clone: (value: T, index: number) => T,
    resolveEvent: (prev: Array<T>, identifier: string, callback: (result: Array<T>) => void) => void,
    callback: (result: Array<T>) => void
): void {
    let values: Array<ParsedValues>
    switch (value.type) {
        case "this":
            callback(prev)
            break
        case "event":
            resolveEvent(prev, value.identifier, callback)
            break
        case "operation":
            const operation = operations[value.identifier]
            if (operation == null) {
                throw new Error(`unknown operation "${value.identifier}"`)
            }
            deriveRec(prev, value.parameters, grammar, operations, clone, resolveEvent, (parameters) =>
                callback(operation(...parameters))
            )
            break
        case "parallel":
            let i = 0
            let counter = 0
            values = value.values
            const results: Array<Array<T>> = []
            values.forEach((value, index) =>
                deriveRec(
                    prev.map((v) => clone(v, counter++)),
                    value,
                    grammar,
                    operations,
                    clone,
                    resolveEvent,
                    (result) => {
                        i++
                        results[index] = result
                        if (i === values.length) {
                            callback(results.reduce((v1, v2) => v1.concat(v2)))
                        }
                    }
                )
            )
            break
        case "raw":
            callback(Array.isArray(value.value) ? value.value : prev.map(() => value.value))
            break
        case "sequential":
            values = value.values
            function d(result: Array<T>, i: number) {
                if (i < values.length) {
                    deriveRec(result, values[i], grammar, operations, clone, resolveEvent, (result) => d(result, i + 1))
                } else {
                    callback(result)
                }
            }
            d(prev, 0)
            break
        case "symbol":
            const rule = grammar.rules[value.identifier]
            if (rule == null) {
                throw new Error(`unknown rule "${value.identifier}"`)
            }
            deriveRec(prev, rule, grammar, operations, clone, resolveEvent, callback)
            break
    }
}
