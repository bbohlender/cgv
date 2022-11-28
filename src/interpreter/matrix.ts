export type Matrix<T> = T | (ReadonlyArray<Matrix<T>> & { size: number }) | undefined

export enum ChangeType {
    SET,
    UNSET,
}

export type MatrixChange<T> = { index: Array<number> } & (
    | { type: ChangeType.SET; value: T }
    | { type: ChangeType.UNSET }
)

export function applyChangeToMatrix<T>(
    to: Matrix<T>,
    change: MatrixChange<T>,
    index: Array<number> = change.index
): Matrix<T> {
    if (index.length === 0) {
        return change.type === ChangeType.SET ? change.value : undefined
    }

    const updateIndex = index[0]

    const toArray = Array.isArray(to) ? to : []

    const element = toArray[updateIndex]

    const newElement = applyChangeToMatrix(element, change, index.slice(1))

    const array: Array<T | undefined> = []

    const length = Math.max(toArray.length, updateIndex + 1)

    let size = 0
    let end = 0
    for (let i = 0; i < length; i++) {
        const item = i === updateIndex ? newElement : toArray[i]
        array[i] = item
        if (item !== undefined) {
            size += getMatrixSize(item)
            end = i + 1
        }
    }

    if (size === 0) {
        return undefined
    }

    array.splice(end)

    return Object.assign(array, { size })
}

export function getMatrixSize<T>(matrix: Matrix<T>): number {
    return matrix == null ? 0 : Array.isArray(matrix) && "size" in matrix ? (matrix.size as number) : 1
}
