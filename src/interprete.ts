import { defer, distinctUntilChanged, map, MonoTypeOperatorFunction, Observable, of, OperatorFunction } from "rxjs"
import {
    MatrixEntry,
    MatrixEntriesObservable,
    mergeMatrices,
    ParsedEventDefintion,
    ParsedGrammarDefinition,
    ParsedStep,
    generateEventScheduler,
    deepShareReplay,
} from "."

export type EventDepthMap = Readonly<{ [identifier in string]?: number }>

export type Parameters = Readonly<{ [identifier in string]?: Observable<any> }>

export type Operation<T> = (
    clone: (value: T, index: number) => T, //TODO: remove
    parameters: ArrayOrSingle<
        OperatorFunction<
            Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>,
            Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>
        >
    >
) => OperatorFunction<
    Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>,
    Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>
>

export type Operations<T> = {
    [name in string]: Operation<T>
}

export type InterpretionValue<T> = Readonly<{
    value: T
    eventDepthMap: EventDepthMap
    terminated: boolean
    parameters: Parameters
}>

export function interprete<T>(
    input: MatrixEntriesObservable<InterpretionValue<T>>,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    clone: (value: T, index: number) => T
): MatrixEntriesObservable<InterpretionValue<T>> {
    const rules = Object.values(grammar)
    if (rules.length === 0) {
        return input
    }
    const eventScheduler = generateEventScheduler<T>()
    return input.pipe(
        mergeMatrixOperatorsIV(clone, interpreteStep(rules[0], grammar, operations, clone, eventScheduler))
    )
}

export function mergeMatrixOperatorsIV<T, K = T>(
    clone: (value: T, index: number) => T,
    operators: ArrayOrSingle<
        OperatorFunction<
            Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>,
            Array<MatrixEntry<Observable<InterpretionValue<K> | undefined>>>
        >
    >
) {
    return mergeMatrixOperators<InterpretionValue<T>, InterpretionValue<K>>(
        (value, i) => ({
            ...value,
            value: clone(value.value, i),
        }),
        operators
    )
}

export function mergeMatrixOperators<T, K = T>(
    clone: (value: T, index: number) => T,
    operators: ArrayOrSingle<
        OperatorFunction<Array<MatrixEntry<Observable<T | undefined>>>, Array<MatrixEntry<Observable<K | undefined>>>>
    >
): OperatorFunction<Array<MatrixEntry<Observable<T | undefined>>>, Array<MatrixEntry<Observable<K | undefined>>>> {
    return (observable) => {
        if (Array.isArray(operators)) {
            const shared = observable.pipe(deepShareReplay({ refCount: true }))
            return mergeMatrices(
                operators.map((operator, i) =>
                    shared.pipe(
                        map((changes) =>
                            changes.map((change) => ({
                                index: change.index,
                                value: change.value.pipe(map((val) => (val != null ? clone(val, i) : undefined))),
                            }))
                        ),
                        operator
                    )
                )
            )
        }
        return observable.pipe(operators)
    }
}

//TODO: don't clone and DON'T mutate anything :) change things in co-3gen

export type ArrayOrSingle<T> = T | Array<T>

export function interpreteStep<T>(
    step: ParsedStep,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    clone: (value: T, index: number) => T,
    eventScheduler: (
        identifier: string,
        event: ParsedEventDefintion,
        input: MatrixEntriesObservable<InterpretionValue<T>>
    ) => MatrixEntriesObservable<InterpretionValue<T>>
): ArrayOrSingle<
    OperatorFunction<
        Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>,
        Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>
    >
> {
    switch (step.type) {
        case "operation":
            const operation = operations[step.identifier]
            if (operation == null) {
                throw new Error(`unknown operation "${step.identifier}"`)
            }
            return (input) =>
                input.pipe(
                    operation(clone, interpreteStep(step.parameters, grammar, operations, clone, eventScheduler))
                )
        case "parallel":
            return step.steps.map((stepOfSteps) =>
                mergeMatrixOperatorsIV(clone, interpreteStep(stepOfSteps, grammar, operations, clone, eventScheduler))
            )
        case "raw":
            return (input) =>
                input.pipe(
                    map((changes) =>
                        changes.map<MatrixEntry<Observable<InterpretionValue<T>>>>((change) => ({
                            ...change,
                            value: of({
                                eventDepthMap: {},
                                terminated: false,
                                value: step.value,
                                parameters: {},
                            }),
                        }))
                    )
                )
        case "sequential":
            //TODO: this can be improved?
            return (input) => {
                let current = input
                let terminated: Array<MatrixEntriesObservable<InterpretionValue<T> | undefined>> = []
                for (const stepOfSteps of step.steps) {
                    const sharedCurrent = current.pipe(
                        deepShareReplay({
                            //TODO: buffer Size unlimited (bad)
                            refCount: true,
                        })
                    )
                    terminated.push(sharedCurrent.pipe(useWhenTerminatedIs(true)))
                    current = sharedCurrent.pipe(
                        useWhenTerminatedIs(false),
                        mergeMatrixOperatorsIV(
                            clone,
                            interpreteStep(stepOfSteps, grammar, operations, clone, eventScheduler)
                        )
                    )
                    //TODO: think of ways to reduce the amount of "doubles" through splitting
                    //maybe implement sequential through a nextSteps parameters, which are then just cleared?
                }

                return mergeMatrices([current, ...terminated])
            }
        case "this":
            return (input) => input
        case "symbol":
            const rule = grammar[step.identifier]
            if (rule == null) {
                throw new Error(`unknown rule "${step.identifier}"`)
            }
            return (input) =>
                defer(() =>
                    input.pipe(
                        mergeMatrixOperatorsIV(clone, interpreteStep(rule, grammar, operations, clone, eventScheduler))
                    )
                )
    }
}

function useWhenTerminatedIs<T>(
    terminated: boolean
): MonoTypeOperatorFunction<Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>> {
    return map((changes) =>
        changes.map((change) => ({
            index: change.index,
            value: change.value.pipe(
                map((value) => (value?.terminated === terminated ? value : undefined)),
                distinctUntilChanged()
            ),
        }))
    )
}
