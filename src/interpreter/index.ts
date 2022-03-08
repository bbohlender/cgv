import {
    EMPTY,
    filter,
    groupBy,
    ignoreElements,
    map,
    mapTo,
    merge,
    mergeMap,
    MonoTypeOperatorFunction,
    NEVER,
    Observable,
    of,
    OperatorFunction,
    scan,
    shareReplay,
    Subject,
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

export type Value<T> = {
    raw: T
    invalid: Observable<any>
    index: Array<number>
    variables: {
        [Name in string]: Observable<any>
    }
}

export function interprete<T>(
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    const rules = Object.values(grammar)
    if (rules.length === 0) {
        return (input) => input
    }
    return interpreteStep<T>(rules[0], grammar, operations)
}

function interpreteStep<T>(
    step: ParsedSteps,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    switch (step.type) {
        case "operation":
            return interpreteOperation(step, grammar, operations)
        case "parallel":
            return interpreteParallel(step, grammar, operations)
        case "raw":
            return interpreteRaw(step)
        case "sequential":
            return interpreteSequential(step, grammar, operations)
        case "symbol":
            return interpreteSymbol(step, grammar, operations)
        case "this":
            return interpreteThis()
        case "bracket":
            return interpreteBracket(step, grammar, operations)
        case "invert":
        case "not":
            return interpreteUnaryOperator(step, grammar, operations)
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
            return interpreteBinaryOperator(step, grammar, operations)
        case "if":
            return interpreteIf(step, grammar, operations)
        case "switch":
            return interpreteSwitch(step, grammar, operations)
        case "getVariable":
            return interpreteGetVariable(step)
        case "setVariable":
            return interpreteSetVariable(step, grammar, operations)
        case "return":
            return interpreteReturn()
        case "random":
            return interpreteRandom(step, grammar, operations)
    }
}

function interpreteOperation<T>(
    step: ParsedOperation,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    const parameters = step.children
    const operation = operations[step.identifier]
    if (operation == null) {
        throw new Error(`unknown operation "${step.identifier}"`)
    }
    return (values) =>
        values.pipe(
            operatorsToArray(...parameters.map((parameter) => interpreteStep<T>(parameter, grammar, operations))),
            mergeMap((value) =>
                operation.execute(...value.raw).pipe(
                    map((raw) => ({
                        ...value,
                        raw,
                    }))
                )
            )
        )
}

function interpreteRaw<T>(step: ParsedRaw): MonoTypeOperatorFunction<Value<T>> {
    return map((value) => ({
        ...value,
        raw: step.value,
    }))
}

function interpreteBracket<T>(
    step: ParsedBracket,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    return interpreteStep(step, grammar, operations)
}

const unaryOperations: { [Name in ParsedUnaryOperator["type"]]: (value: any) => any } = {
    invert: (value) => -value,
    not: (value) => !value,
}

function interpreteUnaryOperator<T>(
    step: ParsedUnaryOperator,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            interpreteStep(step.children[0], grammar, operations),
            map((value) => ({ ...value, raw: unaryOperations[step.type](value.raw) }))
        )
}

const binaryOperations: { [Name in ParsedBinaryOperator["type"]]: (v1: any, v2: any) => any } = {
    add: (v1, v2) => v1 + v2,
    and: (v1, v2) => v1 + v2,
    divide: (v1, v2) => v1 + v2,
    equal: (v1, v2) => v1 + v2,
    greater: (v1, v2) => v1 + v2,
    greaterEqual: (v1, v2) => v1 + v2,
    modulo: (v1, v2) => v1 + v2,
    multiply: (v1, v2) => v1 + v2,
    or: (v1, v2) => v1 + v2,
    smaller: (v1, v2) => v1 + v2,
    smallerEqual: (v1, v2) => v1 + v2,
    subtract: (v1, v2) => v1 + v2,
    unequal: (v1, v2) => v1 + v2,
}

function interpreteBinaryOperator<T>(
    step: ParsedBinaryOperator,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            operatorsToArray(...step.children.map((child) => interpreteStep(child, grammar, operations))),
            map((value) => ({
                ...value,
                raw: binaryOperations[step.type](value.raw[0], value.raw[1]),
            }))
        )
}

function interpreteIf<T>(
    step: ParsedIf,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            operatorsToArray(noop(), interpreteStep(step.children[0], grammar, operations)),
            groupBy(({ raw: [, switchValue] }) => switchValue),
            mergeMap((value) =>
                value.pipe(
                    map((value) => ({
                        ...value,
                        raw: value.raw[0],
                    })),
                    interpreteStep(value.key ? step.children[1] : step.children[2], grammar, operations)
                )
            )
        )
}

function interpreteSwitch<T>(
    step: ParsedSwitch,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            operatorsToArray(noop(), interpreteStep(step.children[0], grammar, operations)),
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
                    interpreteStep(step.children[i + 1], grammar, operations)
                )
            })
        )
}

function interpreteGetVariable<T>(step: ParsedGetVariable): MonoTypeOperatorFunction<Value<T>> {
    return mergeMap((value) =>
        (value.variables[step.identifier] ?? of(undefined)).pipe(
            scan<T, Value<T> & { subject: Subject<void> }, undefined>((prev, raw) => {
                if (prev != null) {
                    prev.subject.next()
                }
                const subject = new Subject<void>()
                return {
                    raw,
                    subject,
                    index: value.index,
                    invalid: merge(value.invalid, subject),
                    variables: value.variables,
                }
            }, undefined)
        )
    )
}

function interpreteReturn<T>(): MonoTypeOperatorFunction<Value<T>> {
    //TODO: premature terminaton
    throw new Error("not implemented")
}

function interpreteSetVariable<T>(
    step: ParsedSetVariable,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    return (input) => {
        const shared = input.pipe(
            shareReplay({
                refCount: true,
            }) //TODO: buffer size unlimited???
        )
        const variable = shared.pipe(interpreteStep(step.children[0], grammar, operations))
        return shared.pipe(
            map((value) => ({
                ...value,
                variables: {
                    ...value.variables,
                    [step.identifier]: variable,
                },
            }))
        )
    }
}

function interpreteThis<T>(): MonoTypeOperatorFunction<Value<T>> {
    return noop()
}

function interpreteRandom<T>(
    step: ParsedRandom,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
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
            mergeMap((value) => value.pipe(interpreteStep(step.children[value.key], grammar, operations)))
        )
}

function interpreteParallel<T>(
    step: ParsedParallel,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    return parallel(...step.children.map((childStep) => interpreteStep<T>(childStep, grammar, operations)))
}

function interpreteSequential<T>(
    step: ParsedSequantial,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        step.children.reduce((input, childStep) => input.pipe(interpreteStep<T>(childStep, grammar, operations)), input)
}

function interpreteSymbol<T>(
    step: ParsedSymbol,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    const symbolStep = grammar[step.identifier]
    if (symbolStep == null) {
        throw new Error(`unknown symbol "${step.identifier}"`)
    }
    return interpreteStep(symbolStep, grammar, operations)
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
            scan<ReadonlyArray<Value<T>>, Value<ReadonlyArray<T>> & { invalid: Subject<void> }, undefined>(
                (prev, [input, ...outputs]) => {
                    if (prev != null) {
                        prev.invalid.next()
                    }
                    return {
                        ...input,
                        invalid: new Subject<void>(),
                        raw: outputs.map(({ raw }) => raw),
                    }
                },
                undefined
            ),
            filter((value) => value.raw.length != operatorFunctions.length)
        )
}

export function toValue<T>(): OperatorFunction<T, Value<T>> {
    return scan<T, Value<T> & { invalid: Subject<void> }, undefined>((prev, raw) => {
        if (prev != null) {
            prev.invalid.next()
        }
        return {
            raw,
            invalid: new Subject<void>(),
            index: [],
            variables: {},
        }
    }, undefined)
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
