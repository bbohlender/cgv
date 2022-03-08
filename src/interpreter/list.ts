import { OperatorFunction, scan, map, mergeMap, merge, mapTo, take, of } from "rxjs"
import { Matrix, applyChangeToMatrix, Value, getMatrixSize, ChangeType } from "."
import { MatrixChange } from "./matrix"

export function toList<T, List>(
    createEmptyList: () => List,
    copyList: ((list: List) => List) | undefined,
    addToListAt: (list: List, item: Value<T>, index: number) => void,
    removeFromListAt: (list: List, index: number) => void
): OperatorFunction<Value<T>, List> {
    return (observable) =>
        observable.pipe(
            valuesToChanges(),
            scan<MatrixChange<Value<T>>, [List, Array<Array<number>>, Matrix<Value<T>>]>(
                ([list, indexArray, matrix], change) => {
                    list = applyChangeToList(list, indexArray, matrix, change, copyList, addToListAt, removeFromListAt)
                    matrix = applyChangeToMatrix(matrix, change)
                    return [list, indexArray, matrix]
                },
                [createEmptyList(), [], undefined]
            ),
            map(([list]) => list)
        )
}

/**
 * requires a updated matrix
 * "applyChangeToMatrix" is required to happen after this execution
 */
function applyChangeToList<T, List>(
    list: List,
    indexArray: Array<Array<number>>,
    matrix: Matrix<Value<T>>,
    change: MatrixChange<Value<T>>,
    copyList: ((list: List) => List) | undefined,
    addToListAt: (list: List, item: Value<T>, index: number) => void,
    removeFromListAt: (list: List, index: number) => void
): List {
    const result = copyList == null ? list : copyList(list)
    const listIndex = changeToListIndex(matrix, change.index)
    const exisitingIndex: Array<number> | undefined = indexArray[listIndex]
    if (indexArray[listIndex] != null && shallowEqual(exisitingIndex, change.index)) {
        removeFromListAt(result, listIndex)
        indexArray.splice(listIndex, 1)
    }

    if (change.type === ChangeType.SET) {
        addToListAt(result, change.value, listIndex)
        indexArray.splice(listIndex, 0, change.index)
    }

    return result
}

function valuesToChanges<T>(): OperatorFunction<Value<T>, MatrixChange<Value<T>>> {
    return (value) =>
        value.pipe(
            mergeMap((value) =>
                merge(
                    of({
                        index: value.index,
                        type: ChangeType.SET,
                        value: value,
                    }),
                    value.invalid.pipe(
                        take(1),
                        mapTo<MatrixChange<Value<T>>>({
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

function shallowEqual<T>(a1: ReadonlyArray<T>, a2: ReadonlyArray<T>): boolean {
    if (a1.length != a2.length) {
        return false
    }
    for (let i = 0; i < a1.length; i++) {
        if (a1[i] != a2[i]) {
            return false
        }
    }
    return true
}
