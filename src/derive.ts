import { ParsedGrammarDefinition, ParsedValue } from "./parser"

export type Operations<T> = {
    [name in string]: (value: T /*...parameters*/) => Array<T>
}

export function derive<T>(
    value: T,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    maxIterations: number = 1000
): Array<T> {
    const ruleNames = Object.keys(grammar.rules)
    if (ruleNames.length === 0) {
        throw new Error("missing default (first) rule")
    }

    const values: Array<T> = []
    const unresolvedEvents: Map<string, Array<FlattendEvent<T>>> = new Map()
    let unresolvedSymbols: Array<Omit<FlattendSymbol<T>, "type">> = [
        {
            identifier: ruleNames[0],
            value,
            subsequentSteps: [],
        },
    ]

    let i = 0

    while (unresolvedSymbols.length > 0 || unresolvedEvents.size > 0) {
        if (i > maxIterations) {
            throw new Error(`max derivation iterations exceeded (probably an inifite loop)`)
        }
        let flattendResult: Array<FlattendResult<T>>
        if (unresolvedSymbols.length > 0) {
            //resolve symbols
            const symbolsToResolve = unresolvedSymbols
            unresolvedSymbols = []
            flattendResult = symbolsToResolve
                .map((symbol) => {
                    const steps = grammar.rules[symbol.identifier]
                    if (steps == null) {
                        throw new Error(`unknown symbol "${symbol.identifier}"`)
                    }
                    return deriveFlat(symbol.value, steps, operations)
                        .map((flattend) => {
                            //deriveFlat(value, symbol.subsequentSteps, operations)
                        })
                        .reduce((v1, v2) => v1.concat(v2), [])
                })
                .reduce((v1, v2) => v1.concat(v2), [])
        } else {
            //resolve events
            const [eventName] = unresolvedEvents.keys()
            const eventEntries = unresolvedEvents.get(eventName)!
            unresolvedEvents.delete(eventName)
            const fn = grammar.events[eventName]
            if (fn == null) {
                throw new Error(`unkown event "${eventName}"`)
            }
            const resultArrays = fn(eventEntries.map((entry) => entry.value))
            if (!Array.isArray(resultArrays)) {
                throw new Error(
                    `event function return value is not an array. event functions must map each event input to an array`
                )
            }
            if (resultArrays.length != eventEntries.length) {
                throw new Error(`result arrray of an event execution must have the same length as the input array`)
            }
            flattendResult = resultArrays
                .map((array, i) => {
                    if (!Array.isArray(array)) {
                        throw new Error(
                            `an entry in the event function return value is not an array. event functions must map each event input to an array`
                        )
                    }
                    return array
                        .map((value) => deriveFlat(value, eventEntries[i].subsequentSteps, operations))
                        .reduce((v1, v2) => v1.concat(v2))
                })
                .reduce((v1, v2) => v1.concat(v2), [])
        }
        flattendResult.forEach((result) => {
            switch (result.type) {
                case "event":
                    let entry = unresolvedEvents.get(result.identifier)
                    if (entry == null) {
                        entry = []
                        unresolvedEvents.set(result.identifier, entry)
                    }
                    entry.push(result)
                    break
                case "symbol":
                    unresolvedSymbols.push(result)
                    break
                case "value":
                    values.push(result.value)
                    break
            }
        })

        i++
    }
    return values
}

type FlattendResult<T> = FlattendValue<T> | FlattendSymbol<T> | FlattendEvent<T>

type FlattendValue<T> = { type: "value"; value: T; subsequentSteps: Array<ParsedValue> }
type FlattendSymbol<T> = {
    type: "symbol"
    identifier: string
    value: T
    subsequentSteps: Array<ParsedValue>
}
type FlattendEvent<T> = {
    type: "event"
    identifier: string
    value: T
    subsequentSteps: Array<ParsedValue>
}

function deriveFlat<T>(current: Array<FlattendResult<T>>, steps: Array<ParsedValue>, operations: Operations<T>): Array<FlattendResult<T>> {
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        switch (step.type) {
            case "event":
                return current.map<FlattendResult<T>>(({ value }) => ({
                    type: "event",
                    identifier: step.identifier,
                    subsequentSteps: steps.slice(i + 1),
                    value,
                }))
            case "operation":
                const operation = operations[step.identifier]
                current = current
                    .map(({ value }) =>
                        operation(value).map<FlattendResult<T>>((value) => ({
                            type: "value",
                            value,
                            subsequentSteps: []
                        }))
                    )
                    .reduce((v1, v2) => v1.concat(v2))
                break
            case "symbol":
                return current.map<FlattendResult<T>>(({ value }) => ({
                    identifier: step.identifier,
                    type: "symbol",
                    value,
                    subsequentSteps: steps.slice(i + 1),
                }))
            case "js":
                current = [
                    {
                        type: "value",
                        value: step.value,
                        subsequentSteps: []
                    },
                ]
                break
        }
    }
    return current
}
