import {
    buffer,
    debounceTime,
    distinctUntilChanged,
    finalize,
    groupBy,
    GroupedObservable,
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
    Subject,
    switchMap,
    tap,
} from "rxjs"

export type Matrix<T> = T | Array<Matrix<T>>

export function switchAllMatrixChanges<T>(
    debounceTime: number
): OperatorFunction<Matrix<Observable<T>>, Array<MatrixChange<T>>> {
    return (matrix) =>
        matrix.pipe(
            tapMatrix(),
            matrixToChanges(),
            switchMap((changes) => of(...changes)),
            groupBy(getMatrixChangeIndexKey),
            mergeMap((group) =>
                group.pipe(
                    distinctUntilChanged(),
                    switchMap<MatrixChange<Observable<T>>, Observable<MatrixChange<T>>>((change) =>
                        change.type === ChangeType.UNSET
                            ? of(change)
                            : change.value.pipe(map((value) => ({ ...change, value })))
                    )
                )
            ),
            debounceBufferTime(debounceTime)
        )
}

export function switchAllMatrix<T>(debounceTime: number): OperatorFunction<Matrix<Observable<T>>, Matrix<T>> {
    return (matrix) => matrix.pipe(switchAllMatrixChanges(debounceTime), changesToMatrix())
}

export function switchAllArray<T>(debounceTime: number): OperatorFunction<Matrix<Observable<T>>, Array<T>> {
    return (matrix) =>
        matrix.pipe(
            switchAllArrayChanges(debounceTime),
            scan<Array<ArrayChange<T>>, Array<T>>((array, changes) => applyArrayChanges(array, changes), [])
        )
}

export function switchAllArrayChanges<T>(
    debounceTime: number
): OperatorFunction<Matrix<Observable<T>>, Array<ArrayChange<T>>> {
    return (matrix) => matrix.pipe(switchAllMatrixChanges(debounceTime), changesToArrayChanges())
}

export function nestMatrix<T>(
    getIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>]
): OperatorFunction<Matrix<Observable<T>>, MatrixChangeSet<Observable<Matrix<Observable<T>>>>> {
    return (matrix) => {
        const keyMap = new Map<string, Array<number>>()
        return matrix.pipe(
            matrixToChanges(),
            mergeMap((changes) => {
                const changesGroupMap = new Map<
                    string,
                    { outer: Array<number>; changes: Array<MatrixChange<Observable<T>>> }
                >()
                for (const change of changes) {
                    const [outer, inner] = getIndex(change.index)
                    const key = getIndexKey(outer)
                    if (!keyMap.has(key)) {
                        keyMap.set(key, outer)
                    }
                    let entry = changesGroupMap.get(key)
                    if (entry == null) {
                        entry = {
                            outer,
                            changes: [],
                        }
                        changesGroupMap.set(key, entry)
                    }
                    entry.changes.push({ ...change, index: inner })
                }
                return of(...Array.from(changesGroupMap.values()))
            }),
            groupBy(({ outer }) => getIndexKey(outer)),
            map<
                GroupedObservable<string, { outer: Array<number>; changes: Array<MatrixChange<Observable<T>>> }>,
                MatrixChangeSet<Observable<Matrix<Observable<T>>>>
            >((group) => {
                const outerIndex = keyMap.get(group.key)!
                const innerMatrix = group.pipe(
                    scan<{ outer: Array<number>; changes: Array<MatrixChange<Observable<T>>> }, Matrix<Observable<T>>>(
                        (acc, { changes }) => applyChanges(acc, changes),
                        []
                    )
                )
                return {
                    index: outerIndex,
                    type: ChangeType.SET,
                    value: innerMatrix,
                }
            })
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

export function shareReplayMatrix<T>(
    config: ShareReplayConfig
): OperatorFunction<Matrix<Observable<T>>, Matrix<Observable<T>>> {
    return (matrix) =>
        matrix.pipe(
            
            //TODO: optimice: only change what has changed
            map((matrix) => shareReplayMatrixElement(config, matrix)),
            shareReplay(config)
        )
}

function shareReplayMatrixElement<T>(config: ShareReplayConfig, matrix: Matrix<Observable<T>>): Matrix<Observable<T>> {
    if (Array.isArray(matrix)) {
        return matrix.map((entry) => shareReplayMatrixElement(config, entry))
    }
    return matrix.pipe(shareReplay(config))
}

export function mapMatrix<T, K = T>(matrix: Matrix<T>, fn: (val: T) => K): Matrix<K> {
    if (Array.isArray(matrix)) {
        return matrix.map((element) => mapMatrix(element, fn))
    }
    return fn(matrix)
}

export function tapMatrix<T>(): OperatorFunction<Matrix<Observable<T>>, Matrix<Observable<T>>> {
    return map((matrix) => mapMatrix(matrix, (val) => val.pipe(tap(console.log))))
}

/*** INTERNAL CHANGE HANDLING ***/

export enum ChangeType {
    SET,
    UNSET,
}

type MatrixChangeBase = {
    index: Array<number>
}

export type MatrixChangeSet<T> = MatrixChangeBase & { type: ChangeType.SET; value: T }
export type MatrixChangeUnset = MatrixChangeBase & { type: ChangeType.UNSET }

export type MatrixChange<T> = MatrixChangeSet<T> | MatrixChangeUnset

const EMPTY_ARRAY: Array<any> = []

function computeChanges<T>(
    from: Matrix<T> | undefined,
    to: Matrix<T> | undefined,
    prefixIndex: Array<number> = []
): Array<MatrixChange<T>> {
    if (to == null) {
        return [
            {
                index: prefixIndex,
                type: ChangeType.UNSET,
            },
        ]
    }

    if (Array.isArray(to)) {
        const fromAsArray = Array.isArray(from) ? from : EMPTY_ARRAY
        const length = Math.max(fromAsArray.length, to.length)
        return new Array(length)
            .fill(null)
            .reduce(
                (prev, _, i) => [...prev, ...computeChanges(fromAsArray[i], to[i], [...prefixIndex, i])],
                [] as Array<MatrixChange<T>>
            )
    }

    return [
        {
            index: prefixIndex,
            type: ChangeType.SET,
            value: to,
        },
    ]
}

function applyChanges<T>(to: Matrix<T>, changes: Array<MatrixChange<T>>): Matrix<T> {
    for (const change of changes) {
        to = applyChange(to, change.index, change)
    }
    return to
}

//TODO: clear empty arrays
function applyChange<T>(to: Matrix<T>, index: Array<number>, change: MatrixChange<T>): Matrix<T> {
    if (index.length === 0) {
        return change.type === ChangeType.SET ? change.value : []
    }

    if (!Array.isArray(to)) {
        to = []
    }

    const i = index[0]
    to[i] = applyChange(to[i], index.slice(1), change)

    return to
}

export function getMatrixChangeIndexKey<T>(entry: MatrixChange<T>): string {
    return getIndexKey(entry.index)
}

export function matrixToChanges<T>(): OperatorFunction<Matrix<T>, Array<MatrixChange<T>>> {
    return (matrix) =>
        matrix.pipe(
            startWith<Matrix<T> | undefined>(undefined),
            pairwise(),
            map(([from, to]) => computeChanges(from, to))
        )
}

export function changesToMatrix<T>(): OperatorFunction<Array<MatrixChange<T>>, Matrix<T>> {
    return scan<Array<MatrixChange<T>>, Matrix<T>>((acc, changes) => applyChanges(acc, changes), [])
}

export function debounceBufferTime<T>(dueTime: number): OperatorFunction<T, Array<T>> {
    return (observable) => {
        const subject = new Subject<void>()
        return observable.pipe(
            tap(() => subject.next()),
            buffer(subject.pipe(debounceTime(dueTime))),
            finalize(() => subject.complete())
        )
    }
}

/*** COUNTED MATRIX - INTERNAL IMPLEMENTATION FOR EFFICIENT MATRIX TO ARRAY/... ***/

/**
 */
export function changesToArrayChanges<T>(): OperatorFunction<Array<MatrixChange<T>>, Array<ArrayChange<T>>> {
    return (changes) =>
        changes.pipe(
            scan<Array<MatrixChange<T>>, [CountedMatrix<T>, Array<ArrayChange<T>>]>(
                (cache, changes) => {
                    cache[1] = []
                    cache[0] = computeArrayChanges(cache[0], changes, cache[1])
                    return cache
                },
                [{ amount: 0, value: [] }, []]
            ),
            map(([, array]) => array)
        )
}

type CountedMatrix<T> = { amount: number; value: T | Array<CountedMatrix<T>> }

export type ArrayChange<T> = {
    index: number
    deleteAmount: number
} & (
    | { type: ChangeType.SET; value: T }
    | {
          type: ChangeType.UNSET
      }
)

function computeArrayChanges<T>(
    matrix: CountedMatrix<T>,
    changes: Array<MatrixChange<T>>,
    arrayChanges: Array<ArrayChange<T>>
): CountedMatrix<T> {
    for (const change of changes) {
        matrix = computeArrayChange(matrix, arrayChanges, change.index, change, 0)
    }
    return matrix
}

//TODO: clear empty arrays
function computeArrayChange<T>(
    matrix: CountedMatrix<T>,
    arrayChanges: Array<ArrayChange<T>>,
    index: Array<number>,
    change: MatrixChange<T>,
    prefixIndex: number
): CountedMatrix<T> {
    if (index.length === 0) {
        if (change.type === ChangeType.SET) {
            arrayChanges.push({
                index: prefixIndex,
                type: ChangeType.SET,
                value: change.value,
                deleteAmount: matrix.amount,
            })
            return { amount: 1, value: change.value }
        } else {
            arrayChanges.push({
                index: prefixIndex,
                type: ChangeType.UNSET,
                deleteAmount: matrix.amount,
            })
            return { amount: 0, value: [] }
        }
    }

    if (!Array.isArray(matrix.value)) {
        matrix.amount = 0
        matrix.value = []
    }

    const firstIndex = index[0]
    let offset = 0
    for (let i = 0; i < firstIndex; i++) {
        offset += matrix.value[i]?.amount ?? 0
    }
    const prevSize = matrix.value[firstIndex]?.amount ?? 0
    matrix.value[firstIndex] = computeArrayChange(
        matrix.value[firstIndex] ?? { amount: 0, value: [] },
        arrayChanges,
        index.slice(1),
        change,
        prefixIndex + offset
    )
    matrix.amount += matrix.value[firstIndex].amount - prevSize

    return matrix
}

function applyArrayChanges<T>(array: Array<T>, changes: Array<ArrayChange<T>>): Array<T> {
    for (const change of changes) {
        if (change.type === ChangeType.UNSET) {
            array.splice(change.index, change.deleteAmount)
        } else {
            array.splice(change.index, change.deleteAmount, change.value)
        }
    }
    return array
}
