import { filter, map, merge, Observable, of, OperatorFunction, shareReplay } from "rxjs"
import {
    changesToMatrix,
    ChangeType,
    InterpretionValue,
    Matrix,
    MatrixChangeSet,
    asChangeSet,
    mergeMatrixOperators,
    operationInterpretion,
    Operation,
    Operations,
    mapMatrix,
    Parameters,
    thisParameter,
    operation,
    maxEventDepth,
    multiMapMatrix,
    ArrayOrSingle,
} from ".."

function basicOperation<T>(calculation: (v1: T, v2: T) => T): Operation<T> {
    return (parameters) => (matrix) =>
        matrix.pipe(
            operationInterpretion(
                ([op1, op2]) => of(calculation(op1, op2)),
                (values) => values,
                parameters
            )
        )
}

function unaryOperation<T>(calculation: (v1: T) => T): Operation<T> {
    return (parameters) => (changes) =>
        changes.pipe(
            operationInterpretion(
                ([op1]) => of(calculation(op1)),
                (values) => values,
                parameters
            )
        )
}

const indexOperation: OperatorFunction<Matrix<InterpretionValue<any>>, Matrix<InterpretionValue<number>>> = map(
    (matrix) =>
        mapMatrix(
            (i, value) => ({
                ...value,
                value: i,
            }),
            matrix
        )
)

const valueMatrixChangeGetValue = map<MatrixChangeSet<Array<Matrix<any>>>, Matrix<any>>(({ value: [value] }) => value)

function selectOperation<T>(
    parameters: Array<OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>>>,
    matrix: Observable<Matrix<InterpretionValue<T>>>
): Observable<Matrix<InterpretionValue<T>>> {
    const [min, max] = parameters as Array<
        OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<number>>>
    >
    const shared = matrix.pipe(
        map((matrix) => [matrix]),
        asChangeSet([]),
        shareReplay({ bufferSize: 1, refCount: true })
    )

    return merge(
        shared,
        shared.pipe(valueMatrixChangeGetValue, min, asChangeSet([1])),
        shared.pipe(valueMatrixChangeGetValue, max, asChangeSet([2]))
    ).pipe(
        changesToMatrix() as OperatorFunction<
            ArrayOrSingle<MatrixChangeSet<Matrix<InterpretionValue<any>>>>,
            Array<Matrix<InterpretionValue<any>>>
        >,
        filter((array) => array.reduce((acc, val) => (val ? acc + 1 : acc), 0) === 3),
        map(([valueMatrix, minMatrix, maxMatrix]) => matrixSelect(valueMatrix, minMatrix, maxMatrix))
    )
}

function matrixSelect<T>(
    valueMatrix: Matrix<T>,
    minMatrix: Matrix<InterpretionValue<number>>,
    maxMatrix: Matrix<InterpretionValue<number>>
): Matrix<T> {
    return multiMapMatrix(
        (i, value, minM, maxM) =>
            !Array.isArray(minM) &&
            !Array.isArray(maxM) &&
            minM != null &&
            maxM != null &&
            minM.value <= i &&
            i < maxM.value
                ? value
                : undefined,
        valueMatrix,
        minMatrix,
        maxMatrix
    )
}

function switchOperation<T>(
    parameters: Array<OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>>>,
    matrix: Observable<Matrix<InterpretionValue<T>>>
): Observable<Matrix<InterpretionValue<T>>> {
    const compare = parameters[0] as OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<any>>>

    const shared = matrix.pipe(
        map((matrix) => [matrix]),
        asChangeSet([]),
        shareReplay({ bufferSize: 1, refCount: true })
    )

    const sharedValueAndCompare = shared.pipe(
        valueMatrixChangeGetValue,
        compare,
        asChangeSet([1]),
        shareReplay({ bufferSize: 1, refCount: true })
    )

    return merge(
        ...new Array((parameters.length - 1) / 2).fill(null).map((_, i) =>
            merge(
                shared,
                sharedValueAndCompare,
                shared.pipe(valueMatrixChangeGetValue, parameters[i * 2 + 1], asChangeSet([2]))
            ).pipe(
                changesToMatrix() as OperatorFunction<
                    ArrayOrSingle<MatrixChangeSet<Matrix<InterpretionValue<any>>>>,
                    Array<Matrix<InterpretionValue<any>>>
                >,
                filter((array) => array.reduce((acc, val) => (val ? acc + 1 : acc), 0) === 3),
                map(([valueMatrix, compareMatrix, caseMatrix]) => matrixSwitch(valueMatrix, compareMatrix, caseMatrix)),
                parameters[i * 2 + 2],
                map<Matrix<InterpretionValue<T>>, Array<MatrixChangeSet<Matrix<InterpretionValue<T>>>>>((matrix) => [
                    {
                        index: [i],
                        type: ChangeType.SET,
                        value: matrix,
                    },
                ])
            )
        )
    ).pipe(changesToMatrix<Matrix<InterpretionValue<T>>>())
}

function matrixSwitch<T, K>(
    valueMatrix: Matrix<T>,
    compareMatrix: Matrix<InterpretionValue<K>>,
    caseMatrix: Matrix<InterpretionValue<K>>
): Matrix<T> {
    return multiMapMatrix(
        (i, value, compareMatrix, caseMatrix) =>
            !Array.isArray(compareMatrix) &&
            !Array.isArray(caseMatrix) &&
            compareMatrix != null &&
            caseMatrix != null &&
            compareMatrix.value === caseMatrix.value
                ? value
                : undefined,
        valueMatrix,
        compareMatrix,
        caseMatrix
    )
}

function ifOperation<T>(
    parameters: Array<OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>>>,
    matrix: Observable<Matrix<InterpretionValue<T>>>
): Observable<Matrix<InterpretionValue<T>>> {
    const condition = parameters[0] as OperatorFunction<
        Matrix<InterpretionValue<T>>,
        Matrix<InterpretionValue<boolean>>
    >
    const [, ifOperator, elseOperator] = parameters

    const shared = matrix.pipe(
        map((matrix) => [matrix]),
        asChangeSet([]),
        shareReplay({ bufferSize: 1, refCount: true })
    )

    return merge(shared, shared.pipe(valueMatrixChangeGetValue, condition, asChangeSet([1]))).pipe(
        changesToMatrix() as OperatorFunction<
            ArrayOrSingle<MatrixChangeSet<Matrix<InterpretionValue<any>>>>,
            Array<Matrix<InterpretionValue<any>>>
        >,
        filter((array) => array.reduce((acc, val) => (val ? acc + 1 : acc), 0) === 2),
        mergeMatrixOperators([
            (matrix) =>
                matrix.pipe(
                    map(([valueMatrix, conditionMatrix]) => matrixIf(valueMatrix, conditionMatrix, true)),
                    ifOperator
                ),
            (matrix) =>
                matrix.pipe(
                    map(([valueMatrix, conditionMatrix]) => matrixIf(valueMatrix, conditionMatrix, false)),
                    elseOperator
                ),
        ])
    )
}

function matrixIf<T>(
    valueMatrix: Matrix<T>,
    conditionMatrix: Matrix<InterpretionValue<boolean>>,
    ifValue: boolean
): Matrix<T> {
    return multiMapMatrix(
        (i, value, condition) =>
            !Array.isArray(condition) && condition != null && condition.value === ifValue ? value : undefined,
        valueMatrix,
        conditionMatrix
    )
}

const returnOperation = map<Matrix<InterpretionValue<any>>, Matrix<InterpretionValue<any>>>((matrix) =>
    mapMatrix((i, value) => ({ ...value, terminated: true }), matrix)
)

function computeGetVariable<T>(
    parameters: Array<OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>>>,
    matrix: Observable<Matrix<InterpretionValue<T>>>
) {
    return matrix.pipe(
        operation(
            (input) => {
                const eventDepthMap = maxEventDepth(input)
                const parameters: Parameters = input.reduce((prev, cur) => ({ ...prev, ...cur.parameters }), {})

                const [instance, parameterName] = input

                const observable = instance.parameters[parameterName.value as any] ?? of(undefined)

                return observable.pipe(
                    map((value) => ({
                        value,
                        eventDepthMap,
                        terminated: false,
                        parameters,
                    }))
                )
            },
            (values) => values,
            parameters
        )
    )
}

function computeSetVariable<T>(
    []: Array<OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>>>,
    matrix: Observable<Matrix<InterpretionValue<T>>>
) {
    //TODO: set parameter
    return matrix
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
    select: (parameters) => selectOperation.bind(null, parameters),
    index: () => indexOperation,
    return: () => returnOperation,
    getVariable: (parameters) => computeGetVariable.bind(null, [thisParameter, ...parameters]),
    setVariable: (parameters) => computeSetVariable.bind(null, [thisParameter, ...parameters]),
}
