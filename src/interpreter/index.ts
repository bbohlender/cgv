import {
    delay,
    EMPTY,
    filter,
    groupBy,
    map,
    merge,
    mergeMap,
    MonoTypeOperatorFunction,
    Observable,
    of,
    OperatorFunction,
    ReplaySubject,
    shareReplay,
    Subject,
    take,
    tap,
    throwError,
} from "rxjs"
import {
    ParsedBinaryOperator,
    ParsedBracket,
    ParsedGetVariable,
    ParsedGrammarDefinition,
    ParsedIf,
    ParsedOperation,
    ParsedParallel,
    ParsedRandom,
    ParsedRaw,
    ParsedSequantial,
    ParsedSetVariable,
    ParsedSteps,
    ParsedSwitch,
    ParsedSymbol,
    ParsedUnaryOperator,
} from "../parser"
import { toList } from "./list"

export type Operation<T> = {
    execute: (...parameters: Array<T>) => Observable<T>
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
            subject.next()
            invalid.value = true
        },
        complete: () => subject.complete(),
        observable: subject,
        value: false,
    }
    return invalid
}

export function combineInvalids(...invalids: Array<Invalid>): Invalid {
    return {
        observable: merge(...invalids.map(({ observable }) => observable)),
        value: anyInvalid(invalids),
    }
}

export type Value<T> = {
    raw: T
    invalid: Invalid
    index: Array<number>
    variables: {
        [Name in string]: Observable<any>
    }
}

export function interprete<T>(
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    delay?: number,
    maxSymbolDepth = 50
): MonoTypeOperatorFunction<Value<T>> {
    const rules = Object.values(grammar)
    if (rules.length === 0) {
        return (input) => input
    }
    return interpreteStep<T>(rules[0], { grammar, operations, delay, maxSymbolDepth }, noop(), {})
}

export type InterpretionContext<T> = Readonly<{
    grammar: ParsedGrammarDefinition
    operations: Operations<T>
    delay: number | undefined
    maxSymbolDepth: number
}>

function interpreteStep<T>(
    step: ParsedSteps,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    try {
        const execution = translateStep(step, context, next, symbolDepth)
        const filterInvalid = filter<Value<T>>(({ invalid }) => !invalid.value)
        const time = context.delay
        if (time == null) {
            return (input) => input.pipe(execution, filterInvalid)
        } else {
            return (input) => input.pipe(execution, filterInvalid, delay(time))
        }
    } catch (error) {
        return () => throwError(() => error)
    }
}

function translateStep<T>(
    step: ParsedSteps,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    switch (step.type) {
        case "operation":
            return interpreteOperation(step, context, next, symbolDepth)
        case "parallel":
            return interpreteParallel(step, context, next, symbolDepth)
        case "raw":
            return interpreteRaw(step, next)
        case "sequential":
            return interpreteSequential(step, context, next, symbolDepth)
        case "symbol":
            return interpreteSymbol(step, context, next, symbolDepth)
        case "this":
            return interpreteThis(next)
        case "bracket":
            return interpreteBracket(step, context, next, symbolDepth)
        case "invert":
        case "not":
            return interpreteUnaryOperator(step, context, next, symbolDepth)
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
            return interpreteBinaryOperator(step, context, next, symbolDepth)
        case "if":
            return interpreteIf(step, context, next, symbolDepth)
        case "switch":
            return interpreteSwitch(step, context, next, symbolDepth)
        case "getVariable":
            return interpreteGetVariable(step, next)
        case "setVariable":
            return interpreteSetVariable(step, context, next, symbolDepth)
        case "return":
            return interpreteReturn()
        case "random":
            return interpreteRandom(step, context, next, symbolDepth)
    }
}

function interpreteOperation<T>(
    step: ParsedOperation,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    const parameters = step.children
    const operation = context.operations[step.identifier]
    if (operation == null) {
        throw new Error(`unknown operation "${step.identifier}"`)
    }
    return (values) =>
        values.pipe(
            operatorsToArray(
                ...parameters.map((parameter) => interpreteStep<T>(parameter, context, noop(), symbolDepth))
            ),
            mergeMap((value) =>
                operation.execute(...value.raw).pipe(
                    map((raw) => ({
                        ...value,
                        raw,
                    }))
                )
            ),
            next
        )
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

function interpreteBracket<T>(
    step: ParsedBracket,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    return interpreteStep(step.children[0], context, next, symbolDepth)
}

const unaryOperations: { [Name in ParsedUnaryOperator["type"]]: (value: any) => any } = {
    invert: (value) => -value,
    not: (value) => !value,
}

function interpreteUnaryOperator<T>(
    step: ParsedUnaryOperator,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            interpreteStep(step.children[0], context, noop(), symbolDepth),
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

function interpreteBinaryOperator<T>(
    step: ParsedBinaryOperator,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            operatorsToArray(...step.children.map((child) => interpreteStep(child, context, noop(), symbolDepth))),
            map((value) => ({
                ...value,
                raw: binaryOperations[step.type](value.raw[0], value.raw[1]),
            })),
            next
        )
}

function interpreteIf<T>(
    step: ParsedIf,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            operatorsToArray(noop(), interpreteStep(step.children[0], context, noop(), symbolDepth)),
            groupBy(({ raw: [, switchValue] }) => switchValue),
            mergeMap((value) =>
                value.pipe(
                    map((value) => ({
                        ...value,
                        raw: value.raw[0],
                    })),
                    interpreteStep(value.key ? step.children[1] : step.children[2], context, next, symbolDepth)
                )
            )
        )
}

function interpreteSwitch<T>(
    step: ParsedSwitch,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            operatorsToArray(noop(), interpreteStep(step.children[0], context, noop(), symbolDepth)),
            groupBy(({ raw: [, switchValue] }) => switchValue),
            mergeMap((value) => {
                const i = step.cases.findIndex((caseValue) => caseValue === value.key)
                if (i === -1) {
                    return EMPTY
                }
                return value.pipe(
                    map((value) => ({
                        ...value,
                        raw: value.raw[0],
                    })),
                    interpreteStep(step.children[i + 1], context, next, symbolDepth)
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
    invalid: Invalid | undefined = undefined,
    index: Array<number> = [],
    variables: Value<T>["variables"] = {}
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
                    index,
                    invalid: invalid == null ? prevInvalid : combineInvalids(prevInvalid, invalid),
                    variables,
                }
            }),
            tap({
                complete: () => prevInvalid?.complete(),
            })
        )
    }
}

function interpreteReturn<T>(): MonoTypeOperatorFunction<Value<T>> {
    return noop()
}

function interpreteSetVariable<T>(
    step: ParsedSetVariable,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    return (input) => {
        const shared = input.pipe(
            shareReplay({
                refCount: true,
            }) //TODO: buffer size unlimited???
        )
        const variable = shared.pipe(interpreteStep(step.children[0], context, noop(), symbolDepth))
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

function interpreteThis<T>(next: MonoTypeOperatorFunction<Value<T>>): MonoTypeOperatorFunction<Value<T>> {
    return next
}

function interpreteRandom<T>(
    step: ParsedRandom,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            groupBy(() => {
                const rand = Math.random()
                let sum = 0
                for (let i = 0; i < step.probabilities.length; i++) {
                    sum += step.probabilities[i]
                    if (rand <= sum) {
                        return i
                    }
                }
                return step.probabilities.length - 1
            }),
            mergeMap((value) => value.pipe(interpreteStep(step.children[value.key], context, next, symbolDepth)))
        )
}

function interpreteParallel<T>(
    step: ParsedParallel,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    return parallel(...step.children.map((childStep) => interpreteStep<T>(childStep, context, next, symbolDepth)))
}

function interpreteSequential<T>(
    step: ParsedSequantial,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    return sequentialNext(0, step.children, context, next, symbolDepth)
}

function sequentialNext<T>(
    i: number,
    stepsList: Array<ParsedSteps>,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    return i >= stepsList.length
        ? next
        : interpreteStep(
              stepsList[i],
              context,
              sequentialNext(i + 1, stepsList, context, next, symbolDepth),
              symbolDepth
          )
}

function interpreteSymbol<T>(
    step: ParsedSymbol,
    context: InterpretionContext<T>,
    next: MonoTypeOperatorFunction<Value<T>>,
    symbolDepth: {
        [Name in string]: number
    }
): MonoTypeOperatorFunction<Value<T>> {
    if (symbolDepth[step.identifier] >= context.maxSymbolDepth) {
        throw new Error(`maximum symbol depth (${context.maxSymbolDepth}) reached for symbol "${step.identifier}"`)
    }
    const symbolStep = context.grammar[step.identifier]
    if (symbolStep == null) {
        throw new Error(`unknown symbol "${step.identifier}"`)
    }
    return (input) => {
        const shared = input.pipe(shareReplay({ refCount: true, bufferSize: 1 }))
        return shared.pipe(
            take(1),
            mergeMap(() =>
                shared.pipe(
                    interpreteStep(symbolStep, context, next, {
                        ...symbolDepth,
                        [step.identifier]: (symbolDepth[step.identifier] ?? 0) + 1,
                    })
                )
            )
        )
    }
}

function noop<T>(): MonoTypeOperatorFunction<T> {
    return (input) => input
}

function parallel<T>(
    ...operatorFunctions: Array<MonoTypeOperatorFunction<Value<T>>>
): MonoTypeOperatorFunction<Value<T>> {
    return (input) => {
        const shared = input.pipe(shareReplay({ refCount: true })) //TODO: buffer size unlimited???
        return merge(
            ...operatorFunctions.map((func, i) =>
                shared.pipe(
                    map((value) => ({ ...value, index: [...value.index, i] })),
                    func
                )
            )
        )
    }
}

/**
 * only emits when all results are present
 */
function operatorsToArray<T>(
    ...operatorFunctions: Array<MonoTypeOperatorFunction<Value<T>>>
): OperatorFunction<Value<T>, Value<ReadonlyArray<T>>> {
    return (input) =>
        input.pipe(
            parallel(noop(), ...operatorFunctions),
            toArray(),
            filter((value) => value.length === operatorFunctions.length + 1),
            outputsToValue()
        )
}

function outputsToValue<T>(): OperatorFunction<ReadonlyArray<Value<T>>, Value<ReadonlyArray<T>>> {
    return map((results) => {
        const [input, ...outputs] = results
        return {
            variables: input.variables,
            index: input.index.slice(0, -1),
            invalid: combineInvalids(...results.map(({ invalid }) => invalid)),
            raw: outputs.map(({ raw }) => raw),
        }
    })
}

export function toArray<T>(log = false): OperatorFunction<Value<T>, ReadonlyArray<Value<T>>> {
    return toList<T, Array<Value<T>>>(
        () => [],
        (array) => [...array],
        (list, item, index) => list.splice(index, 0, item),
        (list, index) => list.splice(index, 1),
        log
    )
}

export * from "./matrix"
export * from "./list"
