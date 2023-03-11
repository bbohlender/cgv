import { v3 } from "murmurhash"
import {
    delay,
    EMPTY,
    filter,
    groupBy,
    GroupedObservable,
    isObservable,
    map,
    merge,
    mergeMap,
    MonoTypeOperatorFunction,
    Observable,
    of,
    OperatorFunction,
    ReplaySubject,
    shareReplay,
    take,
    tap,
    throwError,
} from "rxjs"
import { getSelectedStepsJoinedPath } from "../editor"
import {
    ParsedDescription,
    ParsedStochasticSwitch,
    ParsedTransformation,
    ParsedBinaryOperator,
    ParsedGetVariable,
    ParsedDescription,
    ParsedIf,
    ParsedOperation,
    ParsedParallel,
    ParsedRaw,
    ParsedSequantial,
    ParsedSetVariable,
    ParsedTransformation,
    ParsedSwitch,
    ParsedNounReference,
    ParsedUnaryOperator,
} from "../parser"
import { getNounIndex, HierarchicalParsedSteps } from "../util"
import { toList } from "./list"

export type Operation<T> = {
    execute: (parameters: Value<ReadonlyArray<T>>) => Array<Value<T>>
    includeThis: boolean
    defaultParameters: Array<() => ParsedTransformation>
}

export function simpleExecution<T>(
    execute: (...parameters: ReadonlyArray<T>) => Array<T> | T
): (parameters: Value<ReadonlyArray<T>>) => Array<Value<T>> {
    return (parameters) => {
        const results = execute(...parameters.raw)
        if (Array.isArray(results)) {
            return results.map((result, i) => ({ ...parameters, raw: result, index: [...parameters.index, i] }))
        }
        return [
            {
                ...parameters,
                raw: results,
            },
        ]
    }
}

export type Operations<T> = {
    [Name in string]: Operation<T>
}

function anyInvalid(values: Array<Invalid>) {
    for (const entry of values) {
        if (entry.value) {
            return true
        }
    }
    return false
}

export type Invalid = {
    get observable(): Observable<void>
    get value(): boolean
}

export type Invalidator = Invalid & { invalidate: () => void; complete: () => void }

export function createInvalidator(): Invalidator {
    const subject = new ReplaySubject<void>(1)
    const invalid = {
        invalidate: () => {
            invalid.value = true
            subject.next()
        },
        complete: () => subject.complete(),
        observable: subject,
        value: false,
    }
    return invalid
}

export function combineInvalids(...invalids: Array<Invalid>): Invalid {
    return {
        observable: merge(...invalids.map(({ observable }) => observable)).pipe(
            shareReplay({ refCount: true, bufferSize: 1 })
        ),
        value: anyInvalid(invalids),
    }
}

export type Value<T> = {
    raw: T
    index: Array<number>
    variables: {
        [Name in string]: any
    }
}

export type InterpreterOptions<T, I> = Readonly<{
    seed?: number
    listeners?: {
        onBeforeStep?: (step: ParsedTransformation<I>, value: Value<T>) => void
        onAfterStep?: (step: ParsedTransformation<I>, value: Value<T>) => void
    }
}>

type InterpretionContext<T, I> = Readonly<
    {
        grammar: ParsedDescription
        operations: Operations<T>
    } & InterpreterOptions<T, I>
>

type InterpretationState<T> = Readonly<{
    finished: Set<Value<T>>
    running: Set<Value<T>>
}>

export function interprete<T, I>(
    value: Value<T>,
    grammar: ParsedDescription<I>,
    operations: Operations<T>,
    options: InterpreterOptions<T, I>
): Value<T> {
    if (grammar.length === 0) {
        return value
    }
    const context: InterpretionContext<T, I> = {
        grammar,
        operations,
        ...options,
    }
    const state: InterpretationState<T> = {
        finished: new Set(),
        running: new Set(),
    }
    const resultRef = interpreteStep(value, step, context)
}

function interpreteStep<T, I>(
    value: Value<T>,
    step: ParsedTransformation<I>,
    context: InterpretionContext<T, I>
): Value<T> {
    try {
        const { listeners } = context
        if (listeners?.onBeforeStep != null) {
            listeners.onBeforeStep(step, value)
        }

        const result = executeStep(value, step, context)
        result.isValid

        if (listeners?.onAfterStep != null) {
            listeners.onAfterStep(step, result)
        }
    } catch (error) {
        return () => throwError(() => error)
    }
}

function executeStep<T, I>(value: Value<T>, step: ParsedTransformation<I>, context: InterpretionContext<T, I>) {
    switch (step.type) {
        case "operation":
            return interpreteOperation(step, context, next)
        case "parallel":
            return interpreteParallel(step, context, next)
        case "raw":
            return interpreteRaw(step, next)
        case "sequential":
            return interpreteSequential(step, context, next)
        case "symbol":
            return interpreteSymbol(step, context, next)
        case "this":
            return interpreteThis(next)
        case "invert":
        case "not":
            return interpreteUnaryOperator(step, context, next)
        case "add":
        case "and":
        case "divide":
        case "equal":
        case "greater":
        case "greaterEqual":
        case "modulo":
        case "multiply":
        case "or":
        case "smaller":
        case "smallerEqual":
        case "subtract":
        case "unequal":
            return interpreteBinaryOperator(step, context, next)
        case "if":
            return interpreteIf(step, context, next)
        case "switch":
            return interpreteSwitch(step, context, next)
        case "getVariable":
            return interpreteGetVariable(step, next)
        case "setVariable":
            return interpreteSetVariable(step, context, next)
        case "return":
            return interpreteReturn()
        case "random":
            return interpreteRandom(step, context, next)
        case "null":
            return interpreteNull()
    }
}

function interpreteOperation<T, I>(
    value: Value<T>,
    step: ParsedOperation,
    context: InterpretionContext<T, I>
): Array<Value<T>> {
    const parameters = step.children
    const operation = context.operations[step.identifier]
    if (operation == null) {
        throw new Error(`unknown operation "${step.identifier}"`)
    }
    const parameterOperatorFunctions = parameters.map((parameter) => interpreteStep(value, parameter, context))
    if (operation.includeThis) {
        parameterOperatorFunctions.unshift(value)
    }
    return operation.execute(parameterOperatorFunctions)
}

function interpreteRaw<T>(
    step: ParsedRaw,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            map((value) => ({
                ...value,
                raw: step.value,
            })),
            next
        )
}

const unaryOperations: { [Name in ParsedUnaryOperator["type"]]: (value: any) => any } = {
    invert: (value) => -value,
    not: (value) => !value,
}

function interpreteUnaryOperator<T, I>(
    step: ParsedUnaryOperator,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const valueOperatorFunction = interpreteStep(step.children[0], context)
    return (input) =>
        input.pipe(
            valueOperatorFunction,
            map((value) => ({ ...value, raw: unaryOperations[step.type](value.raw) })),
            next
        )
}

const binaryOperations: { [Name in ParsedBinaryOperator["type"]]: (v1: any, v2: any) => any } = {
    add: (v1, v2) => v1 + v2,
    and: (v1, v2) => v1 && v2,
    divide: (v1, v2) => v1 / v2,
    equal: (v1, v2) => v1 == v2,
    greater: (v1, v2) => v1 > v2,
    greaterEqual: (v1, v2) => v1 >= v2,
    modulo: (v1, v2) => v1 % v2,
    multiply: (v1, v2) => v1 * v2,
    or: (v1, v2) => v1 || v2,
    smaller: (v1, v2) => v1 < v2,
    smallerEqual: (v1, v2) => v1 <= v2,
    subtract: (v1, v2) => v1 - v2,
    unequal: (v1, v2) => v1 != v2,
}

function interpreteBinaryOperator<T, I>(
    step: ParsedBinaryOperator,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const valuesOperatorFunction = step.children.map((child) => interpreteStep(child, context))
    return (input) =>
        input.pipe(
            operatorsToArray(...valuesOperatorFunction),
            map((value) => ({
                ...value,
                raw: binaryOperations[step.type](value.raw[0], value.raw[1]),
            })),
            next
        )
}

function interpreteIf<T, I>(
    step: ParsedIf,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const conditionOperatorFunction = interpreteStep(step.children[0], context)
    const [ifOperatorFunction, elseOperatorFunction] = step.children
        .slice(1)
        .map((child) => interpreteStep(child, context, next))
    return (input) =>
        input.pipe(
            operatorsToArray(noop(), conditionOperatorFunction),
            groupBy(({ raw: [, conditionValue] }) => conditionValue),
            mergeMap((value) =>
                value.pipe(
                    map((value) => ({
                        ...value,
                        raw: value.raw[0],
                    })),
                    value.key ? ifOperatorFunction : elseOperatorFunction
                )
            )
        )
}

function interpreteSwitch<T, I>(
    step: ParsedSwitch,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const valueOperatorFunction = interpreteStep(step.children[0], context)
    const casesOperatorFunctions = step.children.slice(1).map((child) => interpreteStep(child, context, next))
    return (input) =>
        input.pipe(
            operatorsToArray(noop(), valueOperatorFunction),
            groupBy(({ raw: [, switchValue] }) => switchValue),
            mergeMap((value) => {
                const i = step.cases.findIndex((caseValues) => caseValues.includes(value.key))
                if (i === -1) {
                    return EMPTY
                }
                return value.pipe(
                    map((value) => ({
                        ...value,
                        raw: value.raw[0],
                    })),
                    casesOperatorFunctions[i]
                )
            })
        )
}

function interpreteGetVariable<T>(
    step: ParsedGetVariable,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    return mergeMap((value) =>
        (value.variables[step.identifier] ?? of(undefined)).pipe(
            toValue(value.invalid, value.index, value.variables),
            next
        )
    )
}

export function toValue<T>(
    invalid?: Invalid,
    index?: Array<number>,
    variables?: Value<T>["variables"]
): OperatorFunction<T, Value<T>> {
    return (input) => {
        let prevInvalid: Invalidator | undefined
        return input.pipe(
            map((raw) => {
                if (prevInvalid != null) {
                    prevInvalid.invalidate()
                }
                prevInvalid = createInvalidator()
                return {
                    raw,
                    index: index ?? [],
                    invalid: invalid == null ? prevInvalid : combineInvalids(prevInvalid, invalid),
                    variables: variables ?? {},
                    symbolDepth: {},
                }
            }),
            tap({
                complete: () => prevInvalid?.complete(),
            })
        )
    }
}

function interpreteReturn<T, A>(): MonoTypeOperatorFunction<Value<T>> {
    return noop()
}

function interpreteNull<T, A>(): MonoTypeOperatorFunction<Value<T>> {
    return () => EMPTY
}

function interpreteSetVariable<T, I>(
    step: ParsedSetVariable,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const valueOperatorFunction = interpreteStep(step.children[0], context)
    return (input) => {
        const shared = input.pipe(
            shareReplay({
                refCount: true,
            }) //TODO: buffer size unlimited???
        )
        const variable = shared.pipe(valueOperatorFunction)
        return shared.pipe(
            map((value) => ({
                ...value,
                variables: {
                    ...value.variables,
                    [step.identifier]: variable,
                },
            })),
            next
        )
    }
}

function interpreteThis<T, A>(next: MonoTypeOperatorFunction<Value<T>>): MonoTypeOperatorFunction<Value<T>> {
    return next
}

const _32bit_max_int = Math.pow(2, 32)

function interpreteRandom<T, A, I>(
    step: ParsedStochasticSwitch<I>,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const options = step.children.map((child) => interpreteStep(child, context, next))

    let pipeToOut: OperatorFunction<GroupedObservable<number, Value<T>>, Value<T>>
    if (context.listeners?.onRandom != null) {
        const onRandom = context.listeners.onRandom
        pipeToOut = mergeMap((group) =>
            group.pipe(tap({ next: (value) => onRandom(step, value, group.key) }), options[group.key])
        )
    } else {
        pipeToOut = mergeMap((value) => value.pipe(options[value.key]))
    }

    return (input) =>
        input.pipe(
            groupBy((value) => {
                const rand =
                    v3(
                        /*value.index.join(",")*/ getSelectedStepsJoinedPath(step as any as HierarchicalParsedSteps),
                        context.seed
                    ) / _32bit_max_int
                //quick fix for limitting the per level randomization
                let sum = 0
                for (let i = 0; i < step.probabilities.length; i++) {
                    sum += step.probabilities[i]
                    if (rand <= sum) {
                        return i
                    }
                }
                return step.probabilities.length - 1
            }),
            pipeToOut
        )
}

function interpreteParallel<T, I>(
    step: ParsedParallel,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    return (input) => {
        const shared = input.pipe(shareReplay({ refCount: true })) //TODO: buffer size unlimited???
        return merge(
            ...step.children.map((childStep, i) =>
                shared.pipe(
                    map((value) => ({ ...value, index: [...value.index, i] })),
                    interpreteStep(childStep, context, next)
                )
            )
        )
    }
}

function interpreteSequential<T, I>(
    step: ParsedSequantial,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    return sequentialNext(0, step.children, context, next)
}

function sequentialNext<T, I>(
    i: number,
    stepsList: Array<ParsedTransformation>,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    return i >= stepsList.length
        ? next
        : interpreteStep(stepsList[i], context, sequentialNext(i + 1, stepsList, context, next))
}

function interpreteSymbol<T, I>(
    step: ParsedNounReference,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    if (getNounIndex(step.identifier, context.grammar) == null) {
        throw new Error(`unknown symbol "${step.identifier}"`)
    }
    return (input) => {
        const shared = input.pipe(shareReplay({ refCount: true, bufferSize: 1 }))
        return shared.pipe(
            take(1),
            mergeMap(() =>
                shared.pipe(
                    map((value) => {
                        const depth = value.symbolDepth[step.identifier] ?? 0
                        if (depth >= context.maxSymbolDepth) {
                            throw new Error(
                                `maximum symbol depth (${context.maxSymbolDepth}) reached for symbol "${step.identifier}"`
                            )
                        }
                        return {
                            ...value,
                            symbolDepth: {
                                ...value.symbolDepth,
                                [step.identifier]: depth + 1,
                            },
                        }
                    }),
                    context.compiledGrammar[step.identifier],
                    next
                )
            )
        )
    }
}

function noop<T>(): MonoTypeOperatorFunction<T> {
    return (input) => input
}

/**
 * only emits when all results are present
 */
function operatorsToArray<T>(
    ...operatorFunctions: Array<MonoTypeOperatorFunction<Value<T>>>
): OperatorFunction<Value<T>, Value<ReadonlyArray<T>>> {
    return (input) => {
        const shared = input.pipe(shareReplay({ refCount: true })) //TODO: buffer size unlimited???
        const functions: Array<MonoTypeOperatorFunction<Value<T>>> = [noop(), ...operatorFunctions]
        return merge(
            ...functions.map((func, i) =>
                shared.pipe(
                    func,
                    map((value) => ({ ...value, index: [...value.index, i] }))
                )
            )
        ).pipe(
            groupBy((value) => value.index.slice(0, -1).join(",")),
            mergeMap((value) =>
                value.pipe(
                    toArray(),
                    filter((value) => value.length === operatorFunctions.length + 1),
                    map((results) => {
                        const [input, ...outputs] = results
                        return {
                            variables: input.variables,
                            index: input.index.slice(0, -1),
                            invalid: combineInvalids(...results.map(({ invalid }) => invalid)),
                            raw: outputs.map(({ raw }) => raw),
                            symbolDepth: input.symbolDepth,
                        }
                    })
                )
            )
        )
    }
}

export function toArray<T>(): OperatorFunction<Value<T>, ReadonlyArray<Value<T>>> {
    return toList<T, Array<Value<T>>>(
        () => [],
        (array) => [...array],
        (list, item, index) => list.splice(index, 0, item),
        (list, index) => list.splice(index, 1)
    )
}

export * from "./matrix"
export * from "./list"
