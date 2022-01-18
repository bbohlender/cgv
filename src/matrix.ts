import { filterNull } from "co-3gen"
import {
    map,
    merge,
    Observable,
    scan,
    mergeMap,
    endWith,
    BehaviorSubject,
    filter,
    Subject,
    ReplaySubject,
    finalize,
} from "rxjs"
import { bufferDebounceTime, uncompleteOf } from "."

//TODO: move matrix entry and Interpretion Value together (+ information needed for premature termination)

export type MatrixEntry<T, I = Array<number>> = { index: I; value: T }

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

//TODO: remove undefined entries at the end & clear empty matrices
export function setMatrixEntry<T>(matrix: Matrix<T>, index: Array<number>, value: T | undefined): Matrix<T> {
    if (index.length <= 0) {
        if(Array.isArray(matrix)) {
            throw new Error(`can't overwrite nested matrix (${JSON.stringify(matrix)}) at index (${JSON.stringify(index)})`)
        }
        return value
    }

    if(matrix === undefined) {
        matrix = []
    }

    if (Array.isArray(matrix)) {
        matrix[index[0]] = setMatrixEntry(matrix[index[0]], index.slice(1), value)
        return matrix
    }

    throw new Error(`can't set index (${index}) on a non nested matrix`)
}

/*export function removeMatrixEntry<T>(matrix: Matrix<T | undefined>, index: Array<number>): Matrix<T | undefined> {
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
}*/

export type MatrixEntriesObservable<T> = Observable<Array<MatrixEntry<Observable<T>>>>

export function toArray<T>(changes: MatrixEntriesObservable<T>, debounceTime: number): Observable<Array<T>> {
    return toMatrix(changes, debounceTime).pipe(map((matrix) => matrixToArray(matrix).filter(filterNull)))
}

function compareIndex(i1: Array<number>, i2: Array<number>): boolean {
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
    changes: MatrixEntriesObservable<T>,
    getIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>],
    debounceTime: number
): MatrixEntriesObservable<Array<MatrixEntry<Observable<T>>>> {
    return changes.pipe(
        bufferDebounceTime(debounceTime),
        scan<
            Array<Array<MatrixEntry<Observable<T>>>>,
            [
                Matrix<{ innerValues: number; value: Subject<Array<MatrixEntry<Observable<T>>>> } | undefined>,
                Array<MatrixEntry<Observable<Array<MatrixEntry<Observable<T>>>>>>
            ]
        >(
            ([prev], cur) => {
                const changes = cur.reduce((v1, v2) => v1.concat(v2))
                const groupedChanges = changes.reduce<
                    Array<[index: Array<number>, changes: Array<MatrixEntry<Observable<T>, Array<number>>>]>
                >((prev, change) => {
                    const [outer, inner] = getIndex(change.index)
                    let entry = prev.find(([index]) => compareIndex(index, outer))
                    if (entry == null) {
                        entry = [outer, []]
                        prev.push(entry)
                    }
                    entry[1].push({
                        index: inner,
                        value: change.value,
                    })
                    return prev
                }, [])
                const outerChanges: Array<MatrixEntry<Observable<Array<MatrixEntry<Observable<T>>>>>> = []
                for (const [index, changes] of groupedChanges) {
                    let subject = getMatrixEntry(prev, index)
                    if (subject == null) {
                        subject = {
                            value: new ReplaySubject<Array<MatrixEntry<Observable<T>>>>(),
                            innerValues: 0,
                        }
                        prev = setMatrixEntry(prev, index, subject)
                        outerChanges.push({
                            index,
                            value: subject.value,
                        })
                    }
                    const s = subject
                    subject.innerValues += changes.length
                    subject.value.next(
                        changes.map((change) => ({
                            index: change.index,
                            value: change.value.pipe(
                                finalize(() => {
                                    --s.innerValues
                                    if (s.innerValues === 0) {
                                        s.value.complete()
                                        setMatrixEntry(prev, index, undefined)
                                    }
                                })
                            ),
                        }))
                    )
                }
                return [prev, outerChanges]
            },
            [undefined, []]
        ),
        map(([, changes]) => changes),
        filter((changes) => changes.length > 0)
    )
}

export function toMatrix<T>(
    changes: MatrixEntriesObservable<T>,
    debounceTime: number
): Observable<Matrix<T | undefined>> {
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
                cur.reduce((p, c) => setMatrixEntry(p, c.index, c.value), prev),
            undefined
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
    } else if (matrix == null) {
        return []
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
