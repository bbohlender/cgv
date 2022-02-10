import { Observable, of, OperatorFunction } from "rxjs"
import { InterpretionValue, MatrixEntriesObservable, MatrixEntry, operation, Operation, Operations } from ".."
import { Instance } from "./shape"

function basicOperation<T>(calculation: (v1: T, v2: T) => T): Operation<T> {
    return (parameters) => (changes) =>
        changes.pipe(
            operation(
                ([op1, op2]) => of([calculation(op1, op2)]),
                (values) => values,
                parameters
            )
        )
}

function unaryOperation<T>(calculation: (v1: T) => T): Operation<T> {
    return (parameters) => (changes) =>
        changes.pipe(
            operation(
                ([op1]) => of([calculation(op1)]),
                (values) => values,
                parameters
            )
        )
}

export function switchOperation<T>(
    parameters: Array<
        OperatorFunction<
            Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>,
            Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>
        >
    >,
    changes: MatrixEntriesObservable<InterpretionValue<T>>
): MatrixEntriesObservable<InterpretionValue<T>> {
    return changes
}

export function ifOperation<T>(
    parameters: Array<
        OperatorFunction<
            Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>,
            Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>
        >
    >,
    changes: MatrixEntriesObservable<InterpretionValue<T>>
): MatrixEntriesObservable<InterpretionValue<T>> {
    //TODO: cache, distinctUntilChanged, toChanges?
    const condition = parameters[0]

    return changes
}

export const operations: Operations = {
    "+": basicOperation((v1, v2) => v1 + v2),
    "-": basicOperation((v1, v2) => v1 - v2),
    "/": basicOperation((v1, v2) => v1 / v2),
    "*": basicOperation((v1, v2) => v1 * v2),
    "%": basicOperation((v1, v2) => v1 % v2),
    "!-": unaryOperation((v1) => -v1),
    "!": unaryOperation((v1) => !v1),
    "&&": basicOperation((v1, v2) => v1 && v2),
    "||": basicOperation((v1, v2) => v1 || v2),
    "<": basicOperation((v1, v2) => v1 < v2),
    "<=": basicOperation((v1, v2) => v1 <= v2),
    "==": basicOperation((v1, v2) => v1 == v2),
    "!=": basicOperation((v1, v2) => v1 != v2),
    if: (parameters) => ifOperation.bind(null, parameters),
    switch: (parameters) => switchOperation.bind(null, parameters),
}
