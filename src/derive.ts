import { ParsedGrammarDefinition, ParsedValues, setNext } from "./parser"

export type Operations<T> = {
    [name in string]: (value: T, ...parameters: Array<T>) => Array<T>
}

type UnresolvedEvent<T> = {
    type: "unresolved-event"
    value: T
    identifier: string
    next?: ParsedValues
    depth: number
}

type UnresolvedValue<T> = {
    type: "unresolved-value"
    value: T
    next: ParsedValues
    depth: number
}
type ResolvedValue<T> = {
    type: "resolved-value"
    value: T
    depth: number
}

//TODO: step by step for debugging

export function derive<T>(
    prev: T,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    maxDepth: number = 1000,
    maxNodeAmount: number = 1000
): Array<T> {
    const ruleNames = Object.keys(grammar.rules)
    const rule = grammar.rules[ruleNames[0]]
    if (rule == null) {
        return [prev]
    }
    return deriveRec(
        [
            {
                type: "unresolved-value",
                next: rule,
                value: prev,
                depth: 0,
            },
        ],
        grammar,
        operations,
        maxDepth,
        maxNodeAmount
    )
}

function deriveRec<T>(
    unresolved: Array<UnresolvedEvent<T> | UnresolvedValue<T> | ResolvedValue<T>>,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    maxDepth: number,
    maxNodeAmount: number
): Array<T> {
    if(unresolved.length > maxNodeAmount) {
        throw new Error(`node amount exceeded max node amount of ${maxNodeAmount}`)
    }
    const valuesResolved = unresolved
        .map((value) =>
            value.type === "unresolved-value"
                ? deriveValue(value.value, value.next, grammar, operations, value.depth, maxDepth)
                : [value]
        )
        .reduce((v1, v2) => v1.concat(v2), [])
    const eventResolved = deriveEvent(valuesResolved, grammar, operations, maxDepth)
    if (allResolved(eventResolved)) {
        return eventResolved.map((resolved) => resolved.value)
    }
    return deriveRec(eventResolved, grammar, operations, maxDepth, maxNodeAmount)
}

function allResolved<T>(
    values: Array<UnresolvedEvent<T> | UnresolvedValue<T> | ResolvedValue<T>>
): values is Array<ResolvedValue<T>> {
    for (const value of values) {
        if (value.type !== "resolved-value") {
            return false
        }
    }
    return true
}

function deriveEvent<T>(
    values: Array<UnresolvedEvent<T> | ResolvedValue<T>>,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    maxDepth: number
): Array<UnresolvedEvent<T> | UnresolvedValue<T> | ResolvedValue<T>> {
    let eventName: string | undefined
    const events: Array<UnresolvedEvent<T>> = []
    values.forEach((value) => {
        if (value.type === "unresolved-event") {
            if (eventName == null) {
                eventName = value.identifier
            }
            if (value.identifier === eventName) {
                events.push(value)
            }
        }
    })
    if (eventName == null) {
        return values
    }
    const eventResolver = grammar.events[eventName]
    if (eventResolver == null) {
        throw new Error(`unknown event "${eventName}"`)
    }
    const resolvedValues = eventResolver(events.map((event) => event.value))
    if (!Array.isArray(resolvedValues) || resolvedValues.length != events.length) {
        throw new Error("event must return an array for each input item")
    }
    let i = -1
    return values
        .map((value) => {
            if (value.type === "unresolved-event" && value.identifier === eventName) {
                i++
                const eventNext = events[i].next
                if (eventNext == null) {
                    const result = resolvedValues[i]
                    if (!Array.isArray(result)) {
                        throw new Error("event must return an array for each input item")
                    }
                    return result.map<ResolvedValue<T>>((v) => ({
                        type: "resolved-value",
                        value: v,
                        depth: events[i].depth,
                    }))
                }
                return resolvedValues[i]
                    .map((v) => deriveValue<T>(v, eventNext, grammar, operations, value.depth, maxDepth))
                    .reduce((v1, v2) => v1.concat(v2), [])
            }
            return [value]
        })
        .reduce((v1, v2) => v1.concat(v2), [])
}

function deriveValue<T>(
    value: T,
    next: ParsedValues,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    depth: number,
    maxDepth: number
): Array<UnresolvedEvent<T> | ResolvedValue<T>> {
    if (depth > maxDepth) {
        throw new Error(`depth exceeded max depth of ${maxDepth}`)
    }
    return next
        .map<Array<UnresolvedEvent<T> | ResolvedValue<T>>>((next) => {
            let values: Array<UnresolvedEvent<T> | ResolvedValue<T>>
            switch (next.value.type) {
                case "event":
                    return [
                        {
                            type: "unresolved-event",
                            identifier: next.value.identifier,
                            next: next.next,
                            value,
                            depth: depth + 1,
                        },
                    ]
                case "symbol":
                    const rule = grammar.rules[next.value.identifier]
                    if (rule == null) {
                        throw new Error(`unknown rule "${next.value.identifier}"`)
                    }
                    values = deriveValue(value, rule, grammar, operations, depth + 1, maxDepth)
                    break
                case "raw":
                    values = [
                        {
                            type: "resolved-value",
                            value: next.value.value,
                            depth: depth + 1,
                        },
                    ]
                    break
                case "operation":
                    const operation = operations[next.value.identifier]
                    if (operation == null) {
                        throw new Error(`unknown operation "${next.value.identifier}"`)
                    }
                    const result = operation(value)
                    if (!Array.isArray(result)) {
                        throw new Error("operation must return an array")
                    }
                    values = result.map<ResolvedValue<T>>((v) => ({
                        type: "resolved-value",
                        value: v,
                        depth: depth + 1,
                    }))
                    break
                default:
                    throw new Error(`unknown value type "${(value as any).type}"`)
            }
            const nextNext = next.next
            if (nextNext == null) {
                return values
            }
            return values
                .map<Array<UnresolvedEvent<T> | ResolvedValue<T>>>((value) =>
                    value.type === "resolved-value"
                        ? deriveValue(value.value, nextNext, grammar, operations, value.depth, maxDepth)
                        : [
                              {
                                  ...value,
                                  next: value.next == null ? nextNext : setNext(value.next, nextNext),
                              },
                          ]
                )
                .reduce((v1, v2) => v1.concat(v2), [])
        })
        .reduce((v1, v2) => v1.concat(v2), [])
}
