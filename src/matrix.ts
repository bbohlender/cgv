import { map, merge, Observable, of, pairwise, scan, take, mergeMap, tap } from "rxjs"

export enum ChangeType {
    Set,
    Unset,
    //Move - unsure if that's efficient to implement
}

export type MatrixChange<T> = { index: Array<number> } & (
    | { type: ChangeType.Set; value: T }
    | {
          type: ChangeType.Unset
      }
)

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
                ...changes.map<Observable<MatrixChange<T>>>(
                    (change) =>
                        change.type === ChangeType.Unset
                            ? of(change)
                            : change.value.pipe(map((value) => ({ type: ChangeType.Set, index: change.index, value }))) //TODO: we do not unsubscribe here ...
                    //idea: there is no remove change but the value is complited when removed
                )
            )
        ),
        scan<MatrixChange<T>, Matrix<T>>(
            (prev, cur) => changeMatrixEntry(prev, cur.index, cur.type === ChangeType.Set ? cur.value : undefined),
            []
        )
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
    return of(getInitialChanges(matrix))
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
                type: ChangeType.Set,
                value: of(matrix),
            },
        ]
    }
}

export function toChanges<T>(array: Observable<Array<T>>): MatrixChangesObservable<T> {
    return merge<Array<[undefined | Array<T>, Array<T> | undefined]>>(
        array.pipe(
            take(1),
            map((array) => [undefined, array] as [undefined, Array<T>])
        ),
        array.pipe(pairwise())
    ).pipe(
        map(([prev, current]) => {
            if (prev == null) {
                if (current == null) {
                    return []
                }
                return current.map<MatrixChange<Observable<T>>>((value, index) => ({
                    type: ChangeType.Set,
                    value: of(value),
                    index: [index],
                }))
            } else if (current == null) {
                return prev.map<MatrixChange<Observable<T>>>((_, index) => ({ type: ChangeType.Unset, index: [index] }))
            } else {
                const changes: Array<MatrixChange<Observable<T>>> = []
                const length = Math.max(prev.length, current.length)
                for (let i = 0; i < length; i++) {
                    if (prev[i] != current[i]) {
                        if (current[i] != null) {
                            changes.push({ type: ChangeType.Set, value: of(current[i]), index: [i] })
                        } else {
                            changes.push({ type: ChangeType.Unset, index: [i] })
                        }
                    }
                }
                return changes
            }
        })
    )
}
