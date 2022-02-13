import { Observable, of, OperatorFunction } from "rxjs"
import { InterpretionValue, Matrix, operation, Operation, Operations } from ".."

function basicOperation<T>(calculation: (v1: T, v2: T) => T): Operation<T> {
    return (parameters) => (matrix) =>
        matrix.pipe(
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
        OperatorFunction<Matrix<Observable<InterpretionValue<T>>>, Matrix<Observable<InterpretionValue<T>>>>
    >,
    changes: Observable<Matrix<Observable<InterpretionValue<T>>>>
): Observable<Matrix<Observable<InterpretionValue<T>>>> {
    return changes
}

export function ifOperation<T>(
    parameters: Array<
        OperatorFunction<Matrix<Observable<InterpretionValue<T>>>, Matrix<Observable<InterpretionValue<T>>>>
    >,
    changes: Observable<Matrix<Observable<InterpretionValue<T>>>>
): Observable<Matrix<Observable<InterpretionValue<T>>>> {
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
