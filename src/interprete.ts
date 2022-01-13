import { finalize, map, Observable, of, share, shareReplay, tap } from "rxjs"
import {
    MatrixChange,
    MatrixChangesObservable,
    mergeMatrices,
    ParsedEventDefintion,
    ParsedGrammarDefinition,
    ParsedStep,
    staticMatrix,
    toArray,
    toChanges,
    uncompleteOf,
} from "."

export type EventDepthMap = { [identifier in string]?: number }

export function maxEventDepth(target: EventDepthMap, map: EventDepthMap): void {
    const entries = Object.entries(map)
    for (const entry of entries) {
        const [eventName, eventDepth] = entry
        if (eventDepth == null) {
            continue
        }
        const currentEventDepth = target[eventName]
        if (currentEventDepth == null || eventDepth > currentEventDepth) {
            target[entry[0]] = entry[1]
        }
    }
}

export type Operation<T> = (
    values: MatrixChangesObservable<InterpretionValue<T>>
) => MatrixChangesObservable<InterpretionValue<T>>

export type Operations<T> = {
    [name in string]: Operation<T>
}

export type InterpretionValue<T> = {
    value: T
    eventDepthMap: EventDepthMap
}

export function interprete<T>(
    input: Observable<Array<T>>,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    eventDebounceTime: number = 100
): Observable<Array<T>> {
    const rules = Object.values(grammar.rules)
    if (rules.length === 0) {
        return input
    }
    return toArray(
        interpreteStep(
            toChanges(
                input.pipe(map((inputs) => inputs.map<InterpretionValue<T>>((value) => ({ value, eventDepthMap: {} }))))
            ),
            rules[0],
            grammar,
            operations,
            (identifier, event, input) => {
                //TODO event scheduling
                throw new Error("not implemented")
            }
        )
    ).pipe(map((interpretionResults) => interpretionResults.map(({ value }) => value)))
}

export function interpreteStep<T>(
    input: MatrixChangesObservable<InterpretionValue<T>>,
    step: ParsedStep,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    scheduleEvent: (
        identifier: string,
        event: ParsedEventDefintion,
        input: MatrixChangesObservable<InterpretionValue<T>>
    ) => MatrixChangesObservable<InterpretionValue<T>>
): MatrixChangesObservable<InterpretionValue<T>> {
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
            const sharedInput = input.pipe(shareReplay(1))
            return mergeMatrices(
                step.steps.map(
                    //TODO: clone
                    (stepOfSteps, i) =>
                        interpreteStep(sharedInput.pipe(), stepOfSteps, grammar, operations, scheduleEvent)
                )
            )

        case "raw":
            return input.pipe(
                map((changes) =>
                    changes.map<MatrixChange<Observable<InterpretionValue<T>>>>((change) => ({
                        ...change,
                        value: uncompleteOf({
                            eventDepthMap: {},
                            value: step.value,
                        }),
                    }))
                )
            )
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
