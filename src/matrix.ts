import { map, merge, Observable, scan, mergeMap, endWith, BehaviorSubject, filter, Subject, ReplaySubject } from "rxjs"
import { bufferDebounceTime, uncompleteOf } from "."

//TODO: index should be an observable to move values in a matrix

export type MatrixEntry<T> = { index: Array<number>; value: T }

export type MatrixEntriesObservable<T> = Observable<Array<MatrixEntry<Observable<T>>>>

export type Matrix<T> = T | Array<Matrix<T>>

function matrixToArray<T>(matrix: Matrix<T>): Array<T> {
    if (Array.isArray(matrix)) {
        return matrix.reduce<Array<T>>((prev, cur) => prev.concat(matrixToArray(cur)), [])
    } else {
        return [matrix]
    }
}

export function toArray<T>(changes: MatrixEntriesObservable<T>, debounceTime: number): Observable<Array<T>> {
    return toMatrix(changes, debounceTime).pipe(map((matrix) => matrixToArray(matrix)))
}

function getMatrixEntry<T>(matrix: Matrix<T>, index: Array<number>): T | undefined {
    if (index.length <= 0) {
        return Array.isArray(matrix) ? undefined : matrix
    }

    if (Array.isArray(matrix)) {
        return getMatrixEntry(matrix[index[0]], index.slice(1))
    }

    return undefined
}

function setMatrixEntry<T>(matrix: Matrix<T>, index: Array<number>, value: T): Matrix<T> {
    if (index.length <= 0) {
        return value
    }

    if (Array.isArray(matrix)) {
        matrix[index[0]] = setMatrixEntry(matrix[index[0]], index.slice(1), value)
        return matrix
    }

    throw new Error(`can't set index (${index}) on a non nested matrix`)
}

function removeMatrixEntry<T>(matrix: Matrix<T>, index: Array<number>): Matrix<T> {
    if (index.length <= 0 || !Array.isArray(matrix)) {
        throw new Error(`can't remove the whole matrix`)
    }

    if (index.length > 1) {
        const firstIndex = index[0]
        const nestedMatrix = matrix[firstIndex]

        if (!Array.isArray(nestedMatrix)) {
            throw new Error(`can't remove at index (${index}) in a non nested matrix`)
        }

        removeMatrixEntry(nestedMatrix, index.slice(1))

        if (nestedMatrix.length === 0) {
            matrix.splice(firstIndex, 1)
        }
    } else {
        matrix.splice(index[0], 1)
    }

    return matrix
}

export function nestChanges<T>(
    changes: MatrixEntriesObservable<T>,
    getIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>],
    debounceTime: number
): MatrixEntriesObservable<Array<MatrixEntry<Observable<T>>>> {
    return changes.pipe(
        bufferDebounceTime(debounceTime),
        scan<
            Array<Array<MatrixEntry<Observable<T>>>>,
            [
                Matrix<Subject<Array<MatrixEntry<Observable<T>>>>>,
                Array<MatrixEntry<Observable<Array<MatrixEntry<Observable<T>>>>>>
            ]
        >(
            ([prev], cur) => {
                //TODO: group by outer index
                const changes = cur.reduce((v1, v2) => v1.concat(v2))
                const outerChanges: Array<MatrixEntry<Observable<Array<MatrixEntry<Observable<T>>>>>> = []
                for (const change of changes) {
                    const [outer, inner] = getIndex(change.index)
                    let subject = getMatrixEntry(prev, outer)
                    if (subject == null) {
                        subject = new ReplaySubject<Array<MatrixEntry<Observable<T>>>>()
                        prev = setMatrixEntry(prev, outer, subject)
                        outerChanges.push({
                            index: outer,
                            value: subject,
                        })
                        //TODO: subject.complete() when all inner values are complete & removeMatrixEntry from prev
                    }
                    subject.next([
                        {
                            index: inner,
                            value: change.value,
                        },
                    ])
                }
                return [prev, outerChanges]
            },
            [[], []]
        ),
        map(([, changes]) => changes),
        filter((changes) => changes.length > 0)
    )
}

export function toMatrix<T>(changes: MatrixEntriesObservable<T>, debounceTime: number): Observable<Matrix<T>> {
    return changes.pipe(
        mergeMap((changes) =>
            merge(
                ...changes.map<Observable<MatrixEntry<T | undefined>>>((change) =>
                    change.value.pipe(
                        map((value) => ({ index: change.index, value })),
                        endWith({ index: change.index, value: undefined })
                    )
                )
            )
        ),
        bufferDebounceTime(debounceTime),
        scan<Array<MatrixEntry<T | undefined>>, Matrix<T>>(
            (prev, cur) =>
                cur.reduce(
                    (p, c) => (c.value == null ? removeMatrixEntry(p, c.index) : setMatrixEntry(p, c.index, c.value)),
                    prev
                ),
            []
        )
    )
}

export function mergeMatrices<T>(changesObservables: Array<MatrixEntriesObservable<T>>): MatrixEntriesObservable<T> {
    return merge(
        ...changesObservables.map((changesObservable, i) =>
            changesObservable.pipe(
                map((changes) =>
                    changes.map<MatrixEntry<Observable<T>>>((change) => ({
                        ...change,
                        index: [i, ...change.index],
                    }))
                )
            )
        )
    )
}

export function staticMatrix<T>(matrix: Matrix<T>): MatrixEntriesObservable<T> {
    return uncompleteOf(getInitialChanges(matrix))
}

function getInitialChanges<T>(matrix: Matrix<T>, index: Array<number> = []): Array<MatrixEntry<Observable<T>>> {
    if (Array.isArray(matrix)) {
        return matrix.reduce<Array<MatrixEntry<Observable<T>>>>(
            (prev, cur, i) => prev.concat(getInitialChanges(cur, [i, ...index])),
            []
        )
    } else {
        return [
            {
                index,
                value: uncompleteOf(matrix),
            },
        ]
    }
}

export function toChanges<T>(array: Observable<Array<T>>): MatrixEntriesObservable<T> {
    return array.pipe(
        scan<Array<T>, [array: Array<BehaviorSubject<T>>, added: Array<MatrixEntry<Observable<T>>>]>(
            ([prev], current) => {
                const length = Math.max(prev.length, current.length)
                const added: Array<MatrixEntry<Observable<T>>> = []
                for (let i = 0; i < length; i++) {
                    if (prev[i]?.value != current[i]) {
                        if (current[i] != null && prev[i] != null) {
                            prev[i].next(current[i])
                        } else if (current[i] != null) {
                            prev[i] = new BehaviorSubject(current[i])
                            added.push({
                                index: [i],
                                value: prev[i],
                            })
                        } else {
                            prev[i].complete()
                            prev.splice(i, 1)
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
}
