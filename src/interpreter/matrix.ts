import {
    buffer,
    debounceTime,
    finalize,
    groupBy,
    GroupedObservable,
    map,
    mapTo,
    merge,
    mergeMap,
    Observable,
    of,
    OperatorFunction,
    pairwise,
    ReplaySubject,
    scan,
    shareReplay,
    startWith,
    switchMap,
    tap,
} from "rxjs"

export type ArrayOrSingle<T> = T | ReadonlyArray<T>

export type Matrix<T> = T | (ReadonlyArray<Matrix<T>> & { size: number }) | undefined

export type ReadonlySizedArray<T> = ReadonlyArray<T> & { size: number }

export function switchAllMatrixChanges<T>(
    debounceTime: number
): OperatorFunction<MatrixChange<Observable<T>>, Array<MatrixChange<T>>> {
    return (matrix) =>
        matrix.pipe(
            groupBy(getMatrixChangeIndexKey, {
                connector: () => new ReplaySubject(1),
            }),
            mergeMap((group) =>
                group.pipe(
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

export function nestMatrix<T>(
    getIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>]
): OperatorFunction<Matrix<T>, MatrixChangeSet<Observable<Matrix<T>>>> {
    return (matrix) => {
        const keyMap = new Map<string, Array<number>>()
        return matrix.pipe(
            matrixToChanges(),
            mergeMap((changes) => {
                const changesGroupMap = new Map<string, { outer: Array<number>; changes: Array<MatrixChange<T>> }>()
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
            groupBy(({ outer }) => getIndexKey(outer), {
                connector: () => new ReplaySubject(Infinity, 100),
            }),
            map<
                GroupedObservable<string, { outer: Array<number>; changes: Array<MatrixChange<T>> }>,
                MatrixChangeSet<Observable<Matrix<T>>>
            >((group) => {
                const outerIndex = keyMap.get(group.key)!
                const innerMatrix = group.pipe(
                    scan<{ outer: Array<number>; changes: Array<MatrixChange<T>> }, Matrix<T>>(
                        (acc, { changes }) => applyChangesToMatrix(acc, changes),
                        undefined
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

export function mergeMatrixOperators<T, K = T>(
    operators: Array<OperatorFunction<T, Matrix<K>>>
): OperatorFunction<T, Matrix<K>> {
    return (observable) => {
        if(operators.length === 0) {
            return observable.pipe(mapTo(undefined))
        }
        const shared = observable.pipe(shareReplay({ refCount: true, bufferSize: 1 }))
        return merge(...operators.map((operator, i) => shared.pipe(operator, asChangeSet([i])))).pipe(
            changesToMatrix<Matrix<K>>()
        )
    }
}

export function mapMatrix<T, K = T>(fn: (index: number, val: T) => Matrix<K> | null, matrix: Matrix<T>): Matrix<K> {
    return multiMapNullMatrix(fn, 0, matrix) ?? undefined
}

/**
 * reproduces the structure of the main matrix while offering the value of the other matrices at the same position in their matrix (undefined if the position is not exisiting)
 */
export function multiMapMatrix<T, M extends Array<unknown>, K = T>(
    fn: (index: number, main: T, ...values: { [Key in keyof M]: Matrix<M[Key]> | null }) => Matrix<K> | null,
    mainMatrix: Matrix<T>,
    ...matrices: { [Key in keyof M]: Matrix<M[Key]> }
): Matrix<K> {
    return multiMapNullMatrix<T, M, K>(fn, 0, mainMatrix, ...matrices) ?? undefined
}

function multiMapNullMatrix<T, M extends Array<unknown>, K>(
    fn: (index: number, main: T, ...values: { [Key in keyof M]: Matrix<M[Key]> | null }) => Matrix<K> | null,
    index: number,
    mainMatrix: Matrix<T>,
    ...otherMatrices: { [Key in keyof M]: Matrix<M[Key]> | null }
): Matrix<K> | null {
    if (Array.isArray(mainMatrix)) {
        const array: Array<Matrix<K>> = []
        let size = 0
        for (let i = 0; i < mainMatrix.length; i++) {
            const mainElement = mainMatrix[i]
            const otherElements: any = otherMatrices.map((matrix) => (Array.isArray(matrix) ? matrix[i] : null))
            const mappedElement = multiMapNullMatrix<T, M, K>(fn, i, mainElement, ...otherElements)
            if (mappedElement !== null) {
                if (mappedElement !== undefined) {
                    ++size
                }
                array.push(mappedElement)
            }
        }
        return size > 0 ? createMatrixFromArray(array, size) : null
    }
    if (mainMatrix === undefined) {
        return undefined
    }
    return fn(index, mainMatrix, ...otherMatrices)
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

function computeChanges<T>(from: Matrix<T>, to: Matrix<T>, prefixIndex: Array<number> = []): Array<MatrixChange<T>> {
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

function applyChangesToMatrix<T>(to: Matrix<T>, changes: ArrayOrSingle<MatrixChange<T>>): Matrix<T> {
    if (!Array.isArray(changes)) {
        return applyChangeToMatrix(to, changes.index, changes)
    }
    for (const change of changes) {
        to = applyChangeToMatrix(to, change.index, change)
    }

    return to
}

export function createMatrixFromArray<T>(
    array: ReadonlyArray<T>,
    computeSize: ((entry: T) => number) | number
): ReadonlySizedArray<T> {
    const size =
        typeof computeSize === "number" ? computeSize : array.reduce((acc, value) => acc + computeSize(value), 0)
    return Object.assign(array, { size })
}

export function getMatrixSize<T>(matrix: Matrix<T>): number {
    return matrix == null ? 0 : Array.isArray(matrix) ? matrix.size : 1
}

function applyChangeToMatrix<T>(to: Matrix<T>, index: Array<number>, change: MatrixChange<T>): Matrix<T> {
    if (index.length === 0) {
        return change.type === ChangeType.SET ? change.value : undefined
    }

    const i = index[0]

    const toArray = Array.isArray(to) ? to : []

    const element = toArray[i]
    const prevElementSize = getMatrixSize(element)
    const prevSize = getMatrixSize(to)

    const newElement = applyChangeToMatrix(element, index.slice(1), change)
    const newElementSize = getMatrixSize(newElement)

    const newSize = prevSize + newElementSize - prevElementSize

    if (newSize === 0) {
        return undefined
    }

    const array = [...fill(toArray.slice(0, i), i), newElement, ...toArray.slice(i + 1)]

    return createMatrixFromArray(array, newSize)
}

function fill<T>(array: Array<T>, length: number): Array<T> {
    if (array.length < length) {
        return array.concat(new Array(length - array.length))
    }
    return array
}

export function getMatrixChangeIndexKey<T>(entry: MatrixChange<T>): string {
    return getIndexKey(entry.index)
}

export function matrixToChanges<T>(): OperatorFunction<Matrix<T>, Array<MatrixChange<T>>> {
    return (matrix) =>
        matrix.pipe(
            startWith<Matrix<T>>(undefined),
            pairwise(),
            map(([from, to]) => computeChanges(from, to))
        )
}

export function asChangeSet<T>(index: Array<number>): OperatorFunction<T, MatrixChangeSet<T>> {
    return map((value) => ({
        index,
        type: ChangeType.SET,
        value: value,
    }))
}

export function changesToMatrix<T>(): OperatorFunction<ArrayOrSingle<MatrixChange<T>>, Matrix<T>> {
    return scan<ArrayOrSingle<MatrixChange<T>>, Matrix<T>>(
        (acc, changes) => applyChangesToMatrix(acc, changes),
        undefined
    )
}

export type ArrayChange<T> = {
    index: number
    deleteAmount: number
} & (
    | { type: ChangeType.SET; value: T }
    | {
          type: ChangeType.UNSET
      }
)

export function changesToArrayChanges<T>(): OperatorFunction<
    ArrayOrSingle<MatrixChange<T>>,
    ArrayOrSingle<ArrayChange<T>>
> {
    return (changes) =>
        changes.pipe(
            scan<ArrayOrSingle<MatrixChange<T>>, [Matrix<T>, ArrayOrSingle<ArrayChange<T>>]>(
                (data, changes) => {
                    let arrayChanges: ArrayOrSingle<ArrayChange<T>>
                    if (Array.isArray(changes)) {
                        arrayChanges = changes.map((change) => {
                            const arrayChange = martrixChangeToArrayChange(data[0], change.index, change, 0)
                            data[0] = applyChangesToMatrix(data[0], change)
                            return arrayChange
                        })
                    } else {
                        arrayChanges = martrixChangeToArrayChange(data[0], changes.index, changes, 0)
                        data[0] = applyChangesToMatrix(data[0], changes)
                    }
                    data[1] = arrayChanges
                    return data
                },
                [undefined, []]
            ),
            map(([, changes]) => changes)
        )
}

function martrixChangeToArrayChange<T>(
    matrix: Matrix<T>,
    index: Array<number>,
    change: MatrixChange<T>,
    prefixIndex: number
): ArrayChange<T> {
    if (index.length === 0 || !Array.isArray(matrix)) {
        return {
            ...change,
            deleteAmount: getMatrixSize(matrix),
            index: prefixIndex,
        }
    }

    const nextMatrixIndex = index[0]
    for (let i = 0; i < nextMatrixIndex; i++) {
        prefixIndex += getMatrixSize(matrix[i])
    }

    return martrixChangeToArrayChange(matrix[nextMatrixIndex], index.slice(1), change, prefixIndex)
}

export function debounceBufferTime<T>(dueTime: number): OperatorFunction<T, Array<T>> {
    return (observable) => {
        const subject = new ReplaySubject<void>(1)
        return observable.pipe(
            tap(() => subject.next()),
            buffer(subject.pipe(debounceTime(dueTime))),
            finalize(() => subject.complete())
        )
    }
}

export function matrixToArray<T>(): OperatorFunction<Matrix<T>, Array<T>> {
    return map(flattenMatrix)
}

function flattenMatrix<T>(matrix: Matrix<T>): Array<T> {
    if (Array.isArray(matrix)) {
        return matrix.reduce<Array<T>>((v1, v2) => v1.concat(flattenMatrix(v2)), [])
    }
    return matrix == null ? [] : [matrix]
}
