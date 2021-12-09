import { ParsedGrammarResult, ParsedRuleStepResult } from "./parser"

export type Operations<T> = {
    [name in string]: (value: T /*...parameters*/) => Array<T>
}

export function derive<T>(
    value: T,
    grammar: ParsedGrammarResult,
    operations: Operations<T>,
    maxIterations: number = 1000
): Array<T> {
    const ruleNames = Object.keys(grammar.rules)
    if (ruleNames.length === 0) {
        throw new Error("missing default (first) rule")
    }

    const values: Array<T> = []
    const unresolvedEvents: Map<string, Array<Omit<FlattendEvent<T>, "type">>> = new Map()
    let unresolvedSymbols: Array<Omit<FlattendSymbol<T>, "type">> = [
        {
            identifier: ruleNames[0],
            value,
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
            const results = fn(eventEntries.map((entry) => entry.value))
            if (results.length != eventEntries.length) {
                throw new Error(`result arrray of an event execution must have the same length as the input array`)
            }
            flattendResult = results
                .map((result, i) => deriveFlat(result, eventEntries[i].subsequentSteps, operations))
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

type FlattendValue<T> = { type: "value"; value: T }
type FlattendSymbol<T> = {
    type: "symbol"
    identifier: string
    value: T
}
type FlattendEvent<T> = {
    type: "event"
    identifier: string
    value: T
    subsequentSteps: Array<ParsedRuleStepResult>
}

function deriveFlat<T>(
    value: T,
    steps: Array<ParsedRuleStepResult>,
    operations: Operations<T>
): Array<FlattendResult<T>> {
    let current: Array<T> = [value]
    const results: Array<FlattendResult<T>> = []
    for (let i = 0; i < steps.length && current.length > 0; i++) {
        const step = steps[i]
        switch (step.type) {
            case "event":
                results.push(
                    ...current.map<FlattendResult<T>>((value) => ({
                        type: "event",
                        identifier: step.identifier,
                        subsequentSteps: steps.slice(i + 1),
                        value,
                    }))
                )
                return results
            case "operation":
                current = current.map((value) => operations[step.identifier](value)).reduce((v1, v2) => v1.concat(v2))
                break
            case "symbol":
                results.push(
                    ...current.map<FlattendResult<T>>((value) => ({
                        identifier: step.identifier,
                        type: "symbol",
                        value,
                    }))
                )
                break
        }
    }
    results.push(
        ...current.map<FlattendValue<T>>((value) => ({
            type: "value",
            value,
        }))
    )
    return results
}
