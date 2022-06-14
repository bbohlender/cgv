import { diffArrays } from "diff"
import { Horizontal, Vertical } from "."

export function align<T>(
    matrix: Vertical<Horizontal<T>>,
    generateFiller: () => T,
    isSimilar: (v1: T, v2: T) => boolean
): {
    aligned: Vertical<Horizontal<T>>
    merged: Horizontal<T>
} {
    const merged: Horizontal<T> = [...matrix[0]]
    const aligned: Vertical<Horizontal<T>> = [[...matrix[0]]]
    for (let i = 1; i < matrix.length; i++) {
        const alignedList = [...matrix[i]]

        const changes = diffArrays<T, T>(merged, alignedList, {
            comparator: isSimilar,
        })

        let ii = 0
        for (const change of changes) {
            const length = change.value.length

            if (change.added) {
                merged.splice(ii, 0, ...change.value)
                for (const prevAlignedLinearization of aligned) {
                    prevAlignedLinearization.splice(
                        ii,
                        0,
                        ...new Array(length).fill(undefined).map<T>(() => generateFiller())
                    )
                }
            } else if (change.removed) {
                alignedList.splice(ii, 0, ...new Array(length).fill(undefined).map<T>(() => generateFiller()))
            }
            ii += length
        }

        aligned.push(alignedList)
    }
    return {
        aligned,
        merged,
    }
}

export type NestedGroup<T> = {
    height: number
    value: Array<Vertical<NestedGroup<T>>> | T
}

export function nestGroups<T, K>(
    matrix: Vertical<Horizontal<T>>,
    isSameInGroup: (v1: T, x1: number, y1: number, v2: T, x2: number, y2: number) => boolean,
    combineGroup: (values: Horizontal<Vertical<T>>) => K,
    xStart = 0,
    xEnd = matrix[0].length,
    yList = new Array(matrix.length).fill(undefined).map<number>((_, i) => i)
): NestedGroup<K> {
    let value: K | Horizontal<Vertical<NestedGroup<K>>> = multiSplitVer(
        matrix,
        isSameInGroup,
        combineGroup,
        xStart,
        xEnd,
        yList
    )
    if (value.length === 1 && value[0].length === 1) {
        value = value[0][0].value
    }
    return {
        height: yList.length,
        value,
    }
}

/**
 * @param xStart inclusive
 * @param yStart inclusive
 * @param xEnd exclusive
 * @param yEnd exclusive
 */
function multiSplitVer<T, K>(
    matrix: Vertical<Horizontal<T>>,
    isSameInGroup: (v1: T, x1: number, y1: number, v2: T, x2: number, y2: number) => boolean,
    combineGroup: (values: Horizontal<Vertical<T>>) => K,
    xStart: number,
    xEnd: number,
    yList: Array<number>
): Horizontal<Vertical<NestedGroup<K>>> {
    outer: for (let x = xStart; x < xEnd - 1; x++) {
        for (const y of yList) {
            if (isSameInGroup(matrix[y][x], x, y, matrix[y][x + 1], x + 1, y)) {
                continue outer
            }
        }
        return [
            multiSplitHor(matrix, isSameInGroup, combineGroup, xStart, x + 1, yList),
            ...multiSplitVer(matrix, isSameInGroup, combineGroup, x + 1, xEnd, yList),
        ]
    }
    return [multiSplitHor(matrix, isSameInGroup, combineGroup, xStart, xEnd, yList)]
}

function multiSplitHor<T, K>(
    matrix: Vertical<Horizontal<T>>,
    isSameInGroup: (v1: T, x1: number, y1: number, v2: T, x2: number, y2: number) => boolean,
    combineGroup: (values: Horizontal<Vertical<T>>) => K,
    xStart: number,
    xEnd: number,
    yList: Array<number>
): Vertical<NestedGroup<K>> {
    const partialMatchingGroups: Array<Array<number>> = []
    let allInSameGroup = true

    for (const y of yList) {
        let group = partialMatchingGroups.find((group) => {
            const y2 = group[0]
            let partialMatchingGroup = false
            for (let x = xStart; x < xEnd; x++) {
                //we loop through everything to check if allInSameGroup is false
                if (isSameInGroup(matrix[y][x], x, y, matrix[y2][x], x, y2)) {
                    partialMatchingGroup = true
                } else {
                    allInSameGroup = false
                }
                //if not all in same group and partial matching group is the case, then nothing case change and we can return true
                if (!allInSameGroup && partialMatchingGroup) {
                    return true
                }
            }
            return partialMatchingGroup
        })
        if (group == null) {
            group = []
            partialMatchingGroups.push(group)
        }
        group.push(y)
    }
    if (allInSameGroup) {
        return [{ height: yList.length, value: combineGroup(yList.map((y) => matrix[y].slice(xStart, xEnd))) }]
    }
    if (partialMatchingGroups.length === 1) {
        const midPoint = Math.floor(yList.length / 2)
        return [
            nestGroups(matrix, isSameInGroup, combineGroup, xStart, xEnd, yList.slice(0, midPoint)),
            nestGroups(matrix, isSameInGroup, combineGroup, xStart, xEnd, yList.slice(midPoint)),
        ]
    }

    return partialMatchingGroups.map((yList) => nestGroups(matrix, isSameInGroup, combineGroup, xStart, xEnd, yList))
}
