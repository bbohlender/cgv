import { map, merge, Observable, scan, mergeMap, endWith, BehaviorSubject, filter, tap } from "rxjs"

//TODO: index could be an observable to move values in a matrix

export type MatrixChange<T> = { index: Array<number>; value: T }

export type MatrixChangesObservable<T> = Observable<Array<MatrixChange<Observable<T>>>>

export type Matrix<T> = T | Array<Matrix<T>>

function matrixToArray<T>(matrix: Matrix<T>): Array<T> {
    if (Array.isArray(matrix)) {
        return matrix.reduce<Array<T>>((prev, cur) => prev.concat(matrixToArray(cur)), [])
    } else {
        return [matrix]
    }
}

export function toArray<T>(changes: MatrixChangesObservable<T>): Observable<Array<T>> {
    return toMatrix(changes).pipe(map((matrix) => matrixToArray(matrix)))
}

//TODO: improve & remove empty arrays
function changeMatrixEntry<T>(matrix: Matrix<T>, index: Array<number>, value: T | undefined): Matrix<T> {
    if (index.length <= 0) {
        if (value != null) {
            return value
        } else {
            throw new Error(`can't set matrix to undefined`)
        }
    }
    if (!Array.isArray(matrix)) {
        throw new Error(`can't set matrix value (${matrix}) at index (${index})`)
    }
    const firstIndex = index[0]
    if (index.length > 1) {
        let subMatrix = matrix[firstIndex]
        if (subMatrix == null) {
            subMatrix = []
        }
        matrix[firstIndex] = changeMatrixEntry(subMatrix, index.slice(1), value)
    } else {
        if (value == null) {
            matrix.splice(firstIndex, 1)
        } else {
            matrix[firstIndex] = value
        }
    }
    return matrix
}

export function toMatrix<T>(changes: MatrixChangesObservable<T>): Observable<Matrix<T>> {
    return changes.pipe(
        mergeMap((changes) =>
            merge(
                ...changes.map<Observable<MatrixChange<T | undefined>>>((change) =>
                    change.value.pipe(
                        map((value) => ({ index: change.index, value })),
                        endWith({ index: change.index, value: undefined })
                    )
                )
            )
        ),
        tap(console.log),
        scan<MatrixChange<T | undefined>, Matrix<T>>((prev, cur) => changeMatrixEntry(prev, cur.index, cur.value), [])
    )
}

export function mergeMatrices<T>(changesObservables: Array<MatrixChangesObservable<T>>): MatrixChangesObservable<T> {
    return merge(
        ...changesObservables.map((changesObservable, i) =>
            changesObservable.pipe(
                map((changes) =>
                    changes.map<MatrixChange<Observable<T>>>((change) => ({
                        ...change,
                        index: [i, ...change.index],
                    }))
                )
            )
        )
    )
}

export function staticMatrix<T>(matrix: Matrix<T>): MatrixChangesObservable<T> {
    return uncompleteOf(getInitialChanges(matrix))
}

export function uncompleteOf<T>(value: T): Observable<T> {
    return new Observable((subscriber) => subscriber.next(value))
}

function getInitialChanges<T>(matrix: Matrix<T>, index: Array<number> = []): Array<MatrixChange<Observable<T>>> {
    if (Array.isArray(matrix)) {
        return matrix.reduce<Array<MatrixChange<Observable<T>>>>(
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

export function toChanges<T>(array: Observable<Array<T>>): MatrixChangesObservable<T> {
    return array.pipe(
        scan<Array<T>, [array: Array<BehaviorSubject<T>>, added: Array<MatrixChange<Observable<T>>>]>(
            ([prev], current) => {
                const length = Math.max(prev.length, current.length)
                const added: Array<MatrixChange<Observable<T>>> = []
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
