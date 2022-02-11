import {
    combineLatest,
    distinctUntilChanged,
    groupBy,
    GroupedObservable,
    isObservable,
    map,
    mergeMap,
    Observable,
    of,
    OperatorFunction,
    pairwise,
    scan,
    shareReplay,
    ShareReplayConfig,
    startWith,
    switchMap,
} from "rxjs"

export type Matrix<T> = T | Array<Matrix<T>>

export type AsyncMatrix<T> = Observable<Matrix<Observable<T>>>

const flatArrays = map((arrays: Array<Array<any>>) => arrays.reduce((v1, v2) => v1.concat(v2), []))

export function flattenMatrix<T>(): OperatorFunction<AsyncMatrix<T>, AsyncMatrix<T>> {
    return matrix => 
}

export function nestChanges<T>(
    getIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>]
): OperatorFunction<AsyncMatrix<T>, AsyncMatrix<T>> {
    return (matrix) => {
        const keyMap = new Map<string, Array<number>>()
        return matrix.pipe(
            startWith<AsyncMatrix<T> | undefined>(undefined),
            pairwise(),
            map(([from, to]) => computeChanges(from, to)),
            mergeMap((changes) => {
                const changesGroupMap = new Map<string, {outer: Array<number>, changes: Array<MatrixChange<T>> }>()
                for(const change of changes) {
                    const [outer, inner] = getIndex(change.index)
                    const key = getIndexKey(outer)
                    if (!keyMap.has(key)) {
                        keyMap.set(key, outer)
                    }
                    let entry = changesGroupMap.get(key)
                    if(entry == null) {
                        entry = {
                            outer,
                            changes: []
                        }
                        changesGroupMap.set(key, entry)
                    }
                    entry.changes.push({ ...change, index: inner })
                }
                return of(...Array.from(changesGroupMap.values()))
            }),
            groupBy(({ outer }) => getIndexKey(outer)),
            scan<GroupedObservable<string, { outer: Array<number>, changes: Array<MatrixChange<T>>}>, AsyncMatrix<T>>((outerMatrix, group) => {
                const outerIndex = keyMap.get(group.key)!
                const innerMatrix = group.pipe(scan<{ outer: Array<number>, changes: Array<MatrixChange<T>>}, Matrix<T>>((acc, {changes}) => applyChanges(acc, changes), []))
                //TODO set innerMatrix
                return outerMatrix
            }, [])
        )
    }
}

export function getIndexKey(index: Array<number>) {
    for (let i = index.length - 1; i >= 0; i--) {
        if (index[i] !== 0) {
            return index.slice(0, i + 1).join(",") //+1 since slice end is exclusive
        }
    }
    return ""
}

export const distinctUntilChangedMatrix = distinctUntilChanged<Matrix<any>>(matrixEqual)

export function matrixEqual<T>(m1: Matrix<T>, m2: Matrix<T>): boolean {
    if (m1 === m2) {
        return true
    }
    if (Array.isArray(m1) && Array.isArray(m2) && m1.length === m2.length) {
        for (let i = 0; i < m1.length; i++) {
            if (!matrixEqual(m1[i], m2[i])) {
                return false
            }
        }
        return true
    }
    return false
}

export function shareReplayMatrix<T>(config: ShareReplayConfig): OperatorFunction<AsyncMatrix<T>, AsyncMatrix<T>> {
    return (matrix) => _shareReplayMatrix(config, matrix) as Observable<AsyncMatrix<T>>
}

function _shareReplayMatrix<T>(config: ShareReplayConfig, matrix: AsyncMatrix<T>): AsyncMatrix<T> {
    if (Array.isArray(matrix)) {
        return matrix.map((entry) => _shareReplayMatrix(config, entry))
    }
    if (isObservable(matrix)) {
        return matrix.pipe(
            map((m) => _shareReplayMatrix(config, m)),
            shareReplay(config)
        )
    }
    return matrix
}

/*** INTERNAL CHANGE HANDLING ***/

enum MatrixChangeType {
    SET,
    REMOVE,
}

type MatrixChange<T> = {
    index: Array<number>
} & (
    | { type: MatrixChangeType.SET; value: T }
    | {
          type: MatrixChangeType.REMOVE
      }
)

const EMPTY_ARRAY: Array<any> = []

function computeChanges<T>(from: Matrix<T> | undefined, to: Matrix<T> | undefined, prefixIndex: Array<number> = []): Array<MatrixChange<T>> {
    if(to == null) {
        return [{
            index: [],
            type: MatrixChangeType.REMOVE
        }]
    }

    if(Array.isArray(to)) {
        const fromAsArray = Array.isArray(from) ? from : EMPTY_ARRAY
        const length = Math.max(fromAsArray.length, to.length)
        return new Array(length).fill(null).reduce((prev, _, i) => [...prev, computeChanges(fromAsArray[i], to[i], [...prefixIndex, i])], [] as Array<MatrixChange<T>>)
    }

    return [{
        index: [],
        type: MatrixChangeType.SET,
        value: to
    }]
}

function applyChanges<T>(to: Matrix<T>, changes: Array<MatrixChange<T>>): Matrix<T> {
    for (const change of changes) {
        //TODO
    }
    return to
}