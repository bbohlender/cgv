import {
    map,
    merge,
    Observable,
    scan,
    mergeMap,
    BehaviorSubject,
    filter,
    of,
    OperatorFunction,
    debounceTime,
    groupBy,
    bufferTime,
} from "rxjs"

export type MatrixEntry<T> = { index: Array<number>; value: T }

export type Matrix<T> = undefined | T | Array<Matrix<T>>

export function matrixToArray<T>(matrix: Matrix<T>): Array<T> {
    if (Array.isArray(matrix)) {
        return matrix.reduce<Array<T>>((prev, cur) => prev.concat(matrixToArray(cur)), [])
    } else if (matrix == null) {
        return []
    } else {
        return [matrix]
    }
}

export function getMatrixEntry<T>(matrix: Matrix<T>, index: Array<number>): T | undefined {
    if (index.length <= 0) {
        return Array.isArray(matrix) ? undefined : matrix
    }

    if (Array.isArray(matrix)) {
        return getMatrixEntry(matrix[index[0]], index.slice(1))
    }

    return undefined
}

export function setMatrixEntry<T>(matrix: Matrix<T>, index: Array<number>, value: T | undefined): Matrix<T> {
    if (index.length <= 0) {
        if (Array.isArray(matrix)) {
            throw new Error(
                `can't overwrite nested matrix (${JSON.stringify(matrix)}) at index (${JSON.stringify(index)})`
            )
        }
        return value
    }

    if (matrix === undefined) {
        matrix = []
    }

    if (Array.isArray(matrix)) {
        matrix[index[0]] = setMatrixEntry(matrix[index[0]], index.slice(1), value)
        if (value === undefined) {
            //clear empty end of matrix
            let endIndex = matrix.length
            while (endIndex > 0 && matrixEmpty(matrix[endIndex - 1])) {
                --endIndex
            }
            matrix.splice(endIndex, matrix.length - endIndex)
        }
        return matrix
    }

    throw new Error(`can't set index (${index}) on a non nested matrix`)
}

function matrixEmpty<T>(matrix: Matrix<T>): boolean {
    return matrix === undefined || (Array.isArray(matrix) && matrix.length === 0)
}

export type MatrixEntriesObservable<T> = Observable<Array<MatrixEntry<Observable<T | undefined>>>>

/**
 * @returns a negative value if i1 is smaller to i2 and a positive value of i1 is bigger then i2 (0 when they are equal)
 */
export function compareIndices(i1: Array<number>, i2: Array<number>): number {
    const length = Math.min(i1.length, i2.length)
    for (let i = 0; i < length; i++) {
        if (i1[i] != i2[i]) {
            return i1[i] - i2[i]
        }
    }
    return 0
}

export function indexEqual(i1: Array<number>, i2: Array<number>): boolean {
    if (i1.length != i2.length) {
        return false
    }
    for (let i = 0; i < i1.length; i++) {
        if (i1[i] != i2[i]) {
            return false
        }
    }
    return true
}

export function nestChanges<T>(
    getIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>],
    bufferTimeSpan: number
): OperatorFunction<
    Array<MatrixEntry<Observable<T | undefined>>>,
    Array<MatrixEntry<Observable<Array<MatrixEntry<Observable<T | undefined>>> | undefined>>>
> {
    return (changes) =>
        changes.pipe(
            mergeMap((changes) =>
                of(
                    ...changes.map((change) => {
                        const [outer, inner] = getIndex(change.index)
                        return { value: change.value, index: inner, outer }
                    })
                )
            ),
            groupBy(({ outer }) => outer.join(",")),
            map((group) => ({
                index: group.key.split(",").map(Number.parseInt),
                value: group.pipe(bufferTime(bufferTimeSpan)),
            })),
            bufferTime(bufferTimeSpan)
        )
}

export function toOuterArray<T>(
    dueTime: number
): OperatorFunction<Array<MatrixEntry<T | undefined>> | undefined, Array<T>> {
    return (changes) =>
        changes.pipe(
            toOuterMatrix(),
            debounceTime(dueTime),
            map((matrix) => matrixToArray(matrix))
        )
}

export function toOuterMatrix<T>(): OperatorFunction<Array<MatrixEntry<T | undefined>> | undefined, Matrix<T>> {
    return (changes) =>
        changes.pipe(
            scan<Array<MatrixEntry<T | undefined>> | undefined, Matrix<T>>(
                (prev, cur) =>
                    cur == null
                        ? undefined
                        : cur.reduce((p, entry) => setMatrixEntry(p, entry.index, entry.value), prev),
                undefined
            )
        )
}

export function toArray<T>(
    dueTime: number
): OperatorFunction<Array<MatrixEntry<Observable<T | undefined>>> | undefined, Array<T>> {
    return (changes) =>
        changes.pipe(
            toMatrix(),
            debounceTime(dueTime),
            map((matrix) => matrixToArray(matrix))
        )
}

export function toMatrix<T>(): OperatorFunction<Array<MatrixEntry<Observable<T | undefined>>> | undefined, Matrix<T>> {
    return (changes) =>
        changes.pipe(
            mergeMap((changes) =>
                changes == null
                    ? of(undefined)
                    : merge(
                          ...changes.map<Observable<Array<MatrixEntry<T | undefined>>>>((change) =>
                              change.value.pipe(map((value) => [{ index: change.index, value }]))
                          )
                      )
            ),
            toOuterMatrix()
        )
}

export function mergeMatrices<T>(changesObservables: Array<MatrixEntriesObservable<T>>): MatrixEntriesObservable<T> {
    return merge(
        ...changesObservables.map((changesObservable, i) =>
            changesObservable.pipe(
                map((changes) =>
                    changes.map<MatrixEntry<Observable<T | undefined>>>((change) => ({
                        ...change,
                        index: [i, ...change.index],
                    }))
                )
            )
        )
    )
}

export function staticMatrix<T>(
    matrix: Matrix<T>,
    index: Array<number> = []
): Array<MatrixEntry<Observable<T | undefined>>> {
    if (Array.isArray(matrix)) {
        return matrix.reduce<Array<MatrixEntry<Observable<T | undefined>>>>(
            (prev, cur, i) => prev.concat(staticMatrix(cur, [i, ...index])),
            []
        )
    } else if (matrix == null) {
        return []
    } else {
        return [
            {
                index,
                value: of(matrix),
            },
        ]
    }
}

/*export function toChanges<T>(): OperatorFunction<Array<T>, Array<MatrixEntry<Observable<T | undefined>>>> {
    return (array) =>
        array.pipe(
            scan<Array<T>, [array: Array<BehaviorSubject<T>>, added: Array<MatrixEntry<Observable<T>>>]>(
                ([prev], current) => {
                    const length = Math.max(prev.length, current.length)
                    const added: Array<MatrixEntry<Observable<T>>> = []
                    for (let i = 0; i < length; i++) {
                        if (prev[i]?.value != current[i]) {
                            if (prev[i] != null) {
                                prev[i].next(current[i])
                            } else {
                                prev[i] = new BehaviorSubject(current[i])
                                added.push({
                                    index: [i],
                                    value: prev[i],
                                })
                            }
                        }
                    }
                    return [prev, added]
                },
                [[], []]
            ),
            map(([, added]) => added),
            filter((added) => added.length > 0)
        )
}*/
