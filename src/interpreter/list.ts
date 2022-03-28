import {
    OperatorFunction,
    scan,
    map,
    mergeMap,
    merge,
    mapTo,
    take,
    of,
    tap,
    buffer,
    debounceTime,
    finalize,
    ReplaySubject,
    EMPTY,
    NEVER,
} from "rxjs"
import { Matrix, applyChangeToMatrix, Value, getMatrixSize, ChangeType } from "."
import { MatrixChange } from "./matrix"

export function toList<T, A, List>(
    createEmptyList: () => List,
    copyList: ((list: List) => List) | undefined,
    addToListAt: (list: List, item: Value<T, A>, index: number) => void,
    removeFromListAt: (list: List, index: number) => void
): OperatorFunction<Value<T, A>, List> {
    return (observable) =>
        observable.pipe(
            valuesToChanges(),
            debounceBufferTime(0),
            scan<Array<MatrixChange<Value<T, A>>>, [List, Array<Array<number>>, Matrix<Value<T, A>>]>(
                ([list, indexArray, matrix], changes) => {
                    for (const change of changes) {
                        list = applyChangeToList(
                            list,
                            indexArray,
                            matrix,
                            change,
                            copyList,
                            addToListAt,
                            removeFromListAt
                        )
                        matrix = applyChangeToMatrix(matrix, change)
                    }
                    return [list, indexArray, matrix]
                },
                [createEmptyList(), [], undefined]
            ),
            map(([list]) => list)
        )
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

/**
 * requires a updated matrix
 * "applyChangeToMatrix" is required to happen after this execution
 */
function applyChangeToList<T, A, List>(
    list: List,
    indexArray: Array<Array<number>>,
    matrix: Matrix<Value<T, A>>,
    change: MatrixChange<Value<T, A>>,
    copyList: ((list: List) => List) | undefined,
    addToListAt: (list: List, item: Value<T, A>, index: number) => void,
    removeFromListAt: (list: List, index: number) => void
): List {
    const result = copyList == null ? list : copyList(list)
    const listIndex = changeToListIndex(matrix, change.index)
    const exisitingIndex: Array<number> | undefined = indexArray[listIndex]
    if (indexArray[listIndex] != null && prefixEqual(exisitingIndex, change.index)) {
        removeFromListAt(result, listIndex)
        indexArray.splice(listIndex, 1)
    }

    if (change.type === ChangeType.SET) {
        addToListAt(result, change.value, listIndex)
        indexArray.splice(listIndex, 0, change.index)
    }

    return result
}

function valuesToChanges<T, A>(): OperatorFunction<Value<T, A>, MatrixChange<Value<T, A>>> {
    return (value) =>
        value.pipe(
            mergeMap((value) =>
                value.invalid.value
                    ? NEVER
                    : merge(
                          of({
                              index: value.index,
                              type: ChangeType.SET,
                              value: value,
                          }),
                          value.invalid.observable.pipe(
                              take(1),
                              mapTo<MatrixChange<Value<T, A>>>({
                                  index: value.index,
                                  type: ChangeType.UNSET,
                              })
                          )
                      )
            )
        )
}

function changeToListIndex<T>(matrix: Matrix<T>, index: Array<number>): number {
    if (index.length === 0) {
        return 0
    }
    if (!Array.isArray(matrix)) {
        return 0
    }
    const firstIndex = index[0]
    let baseIndex = 0
    for (let i = 0; i < firstIndex; i++) {
        baseIndex += getMatrixSize(matrix[i])
    }
    return baseIndex + changeToListIndex(matrix[firstIndex], index.slice(1))
}

function prefixEqual<T>(a1: ReadonlyArray<T>, a2: ReadonlyArray<T>): boolean {
    const length = Math.min(a1.length, a2.length)
    for (let i = 0; i < length; i++) {
        if (a1[i] != a2[i]) {
            return false
        }
    }
    return true
}
