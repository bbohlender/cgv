import { filter, map, merge, Observable, of, OperatorFunction, shareReplay, tap } from "rxjs"
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
} from ".."
import { Instance } from "./shape"

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
    (matrix) => matrixIndex(matrix)
)

function matrixIndex(matrix: Matrix<InterpretionValue<any>>, index = 0): Matrix<InterpretionValue<number>> {
    if (Array.isArray(matrix)) {
        return matrix.map(matrixIndex)
    }
    return {
        ...matrix,
        value: index,
    }
}

const valueMatrixChangeGetValue = map<Array<MatrixChangeSet<Array<Matrix<any>>>>, Matrix<any>>(
    ([
        {
            value: [value],
        },
    ]) => value
)

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
            Array<MatrixChangeSet<Matrix<InterpretionValue<any>>>>,
            Array<Matrix<InterpretionValue<any>>>
        >,
        filter((array) => array.reduce((acc, val) => (val ? acc + 1 : acc), 0) === 3),
        map(([valueMatrix, minMatrix, maxMatrix]) => matrixSelect(valueMatrix, minMatrix, maxMatrix))
    )
}

//TODO: improve
function matrixSelect<T>(
    valueMatrix: Matrix<T>,
    minMatrix: Matrix<InterpretionValue<number>>,
    maxMatrix: Matrix<InterpretionValue<number>>
): Matrix<T> {
    if (
        Array.isArray(minMatrix) &&
        Array.isArray(maxMatrix) &&
        Array.isArray(valueMatrix) &&
        valueMatrix.length === minMatrix.length &&
        valueMatrix.length === maxMatrix.length
    ) {
        return valueMatrix
            .map((valueElement, i) => {
                const minElement = minMatrix[i]
                const maxElement = maxMatrix[i]
                if (Array.isArray(valueElement) && Array.isArray(minElement) && Array.isArray(maxElement)) {
                    return matrixSelect(valueElement, minElement, maxElement)
                }
                return valueElement
            })
            .filter((_, i) => {
                const minElement = minMatrix[i]
                const maxElement = maxMatrix[i]
                if (!Array.isArray(minElement) && !Array.isArray(maxElement)) {
                    return minElement.value <= i && i < maxElement.value
                }
                return true
            })
    }
    if (!Array.isArray(minMatrix) && !Array.isArray(maxMatrix) && !Array.isArray(valueMatrix)) {
        if (minMatrix.value <= 0 && 0 < maxMatrix.value) {
            return valueMatrix
        }
    }
    return []
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
                    Array<MatrixChangeSet<Matrix<InterpretionValue<any>>>>,
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

//TODO: improve
function matrixSwitch<T, K>(
    valueMatrix: Matrix<T>,
    compareMatrix: Matrix<InterpretionValue<K>>,
    caseMatrix: Matrix<InterpretionValue<K>>
): Matrix<T> {
    if (
        Array.isArray(compareMatrix) &&
        Array.isArray(valueMatrix) &&
        Array.isArray(caseMatrix) &&
        compareMatrix.length === valueMatrix.length &&
        compareMatrix.length === caseMatrix.length
    ) {
        const result: Array<Matrix<T>> = []
        for (let i = 0; i < compareMatrix.length; i++) {
            const caseElement = caseMatrix[i]
            const compareElement = compareMatrix[i]

            if (
                Array.isArray(compareElement) ||
                Array.isArray(caseElement) ||
                compareElement.value === caseElement.value
            ) {
                const valueElement = valueMatrix[i]
                const caseElement = caseMatrix[i]

                let newElement: Matrix<T>

                if (Array.isArray(valueElement) && Array.isArray(caseElement)) {
                    newElement = matrixSwitch(valueElement, compareElement, caseElement)
                    if (Array.isArray(newElement) && newElement.length === 0) {
                        continue
                    }
                } else {
                    newElement = valueElement
                }
                result.push(newElement)
            }
        }
        return result
    }

    if (!Array.isArray(compareMatrix) && !Array.isArray(caseMatrix) && !Array.isArray(valueMatrix)) {
        if (compareMatrix.value === caseMatrix.value) {
            return valueMatrix
        }
    }
    return []
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
            Array<MatrixChangeSet<Matrix<InterpretionValue<any>>>>,
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

//TODO: improve
function matrixIf<T>(
    valueMatrix: Matrix<T>,
    conditionMatrix: Matrix<InterpretionValue<boolean>>,
    ifValue: boolean
): Matrix<T> {
    if (Array.isArray(conditionMatrix) && Array.isArray(valueMatrix) && conditionMatrix.length === valueMatrix.length) {
        const result: Array<Matrix<T>> = []
        for (let i = 0; i < valueMatrix.length; i++) {
            const conditionElement = conditionMatrix[i]
            if (Array.isArray(conditionElement) || conditionElement.value === ifValue) {
                const valueElement = valueMatrix[i]
                let newElement: Matrix<T>
                if (Array.isArray(valueElement)) {
                    newElement = matrixIf(valueElement, conditionElement, ifValue)
                    if (Array.isArray(newElement) && newElement.length === 0) {
                        continue
                    }
                } else {
                    newElement = valueElement
                }
                result.push(newElement)
            }
        }
        return result
    }
    if (!Array.isArray(conditionMatrix) && !Array.isArray(valueMatrix)) {
        if (conditionMatrix.value === ifValue) {
            return valueMatrix
        }
    }
    return []
}

const returnOperation = map<Matrix<InterpretionValue<any>>, Matrix<InterpretionValue<any>>>((matrix) =>
    mapMatrix(matrix, (value) => ({ ...value, terminated: true }))
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
