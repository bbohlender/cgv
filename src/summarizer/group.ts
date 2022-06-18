import { diffArrays } from "diff"
import { Horizontal, Vertical } from "."

export type Row<T> = { probability: number; horizontal: Horizontal<T> }

export function align<T>(
    rows: Array<Row<T>>,
    generateFiller: () => T,
    isSimilar: (v1: T, v2: T) => boolean
): Vertical<Row<T>> {
    const firstRow = rows[0]
    const merged: Horizontal<T> = [...firstRow.horizontal]
    const aligned: Vertical<Row<T>> = [{ horizontal: [...firstRow.horizontal], probability: firstRow.probability }]
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        const alignedList = [...row.horizontal]

        const changes = diffArrays<T, T>(merged, alignedList, {
            comparator: isSimilar,
        })

        let ii = 0
        for (const change of changes) {
            const length = change.value.length

            if (change.added) {
                merged.splice(ii, 0, ...change.value)
                for (const prevAlignedLinearization of aligned) {
                    prevAlignedLinearization.horizontal.splice(
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

        aligned.push({ horizontal: alignedList, probability: row.probability })
    }
    return aligned
}

export type NestedGroup<T> =
    | Horizontal<
          Vertical<{
              probability: number
              group: NestedGroup<T>
          }>
      >
    | T

export function nestGroups<T, K>(
    rows: Array<Row<T>>,
    isSameInGroup: (v1: T, v2: T) => boolean,
    rowsCombineableMatrix: Array<Array<boolean>>,
    combineGroup: (values: Vertical<{ probability: number; value: T }>) => K,
    filter: (val: K) => boolean,
    generateNeutral: () => K,
    xStart = 0,
    xEnd = rows[0].horizontal.length,
    yList = new Array(rows.length).fill(undefined).map<number>((_, i) => i),
    probability = 1
): NestedGroup<K> {
    const sumProbability = yList.reduce<number>((prev, y) => prev + rows[y].probability, 0) * probability

    if (sumProbability > 1 && yList.length > 1) {
        return [
            splitHorizontal(
                rows,
                isSameInGroup,
                rowsCombineableMatrix,
                combineGroup,
                filter,
                generateNeutral,
                xStart,
                xEnd,
                yList,
                probability
            ),
        ]
    }

    const horizontal: NestedGroup<K> = []
    let mismatchStart: number | undefined
    for (let x = xStart; x < xEnd; x++) {
        const currentInGroup: boolean = isColumnInGroup(rows, isSameInGroup, x, yList)
        if (currentInGroup) {
            if (mismatchStart != null) {
                horizontal.push(
                    splitHorizontal(
                        rows,
                        isSameInGroup,
                        rowsCombineableMatrix,
                        combineGroup,
                        filter,
                        generateNeutral,
                        mismatchStart,
                        xEnd,
                        yList,
                        probability
                    )
                )
            }
            horizontal.push([
                {
                    group: combineGroup(
                        yList.map((y) => ({
                            value: rows[y].horizontal[x],
                            probability: rows[y].probability / sumProbability,
                        }))
                    ),
                    probability: sumProbability,
                },
            ])
            mismatchStart = undefined
        } else if (mismatchStart == null) {
            mismatchStart = x
        }
    }
    if (mismatchStart != null) {
        horizontal.push(
            splitHorizontal(
                rows,
                isSameInGroup,
                rowsCombineableMatrix,
                combineGroup,
                filter,
                generateNeutral,
                mismatchStart,
                xEnd,
                yList,
                probability
            )
        )
    }
    const flattened = flattenVerticalSplits(horizontal, filter)
    if (flattened.length === 0) {
        const neutral = generateNeutral()
        return probability === 1 ? neutral : [[{ group: neutral, probability: sumProbability }]]
    }
    return flattened
}

function isColumnInGroup<T>(
    rows: Array<Row<T>>,
    isSameInGroup: (v1: T, v2: T) => boolean,
    x: number,
    yList: Array<number>
): boolean {
    let prev: T | undefined
    for (const y of yList) {
        const value = rows[y].horizontal[x]
        if (prev != null && !isSameInGroup(prev, value)) {
            return false
        }
        prev = value
    }
    return true
}

function splitHorizontal<T, K>(
    rows: Array<Row<T>>,
    isSameInGroup: (v1: T, v2: T) => boolean,
    rowsCombineableMatrix: Array<Array<boolean>>,
    combineGroup: (values: Vertical<{ probability: number; value: T }>) => K,
    filter: (val: K) => boolean,
    generateNeutral: () => K,
    xStart: number,
    xEnd: number,
    yList: Array<number>,
    probability: number
): Vertical<{
    probability: number
    group: NestedGroup<K>
}> {
    //find best horizontal split (find 2 rows w. biggest distance => group based on the two rows) => horizontal split => repeat
    let currentY1 = yList[0]
    let currentY2 = yList[1]
    let highestDistance = 0
    for (const y1 of yList) {
        for (const y2 of yList) {
            if (y2 >= y1) {
                continue
            }
            const distance = rowDistance(rows, isSameInGroup, rowsCombineableMatrix, xStart, xEnd, y1, y2)
            if (distance > highestDistance) {
                currentY1 = y1
                currentY2 = y2
                highestDistance = distance
            }
        }
    }

    const yList1 = [currentY1]
    const yList2 = [currentY2]

    let probabilitySum1 = rows[currentY1].probability
    let probabilitySum2 = rows[currentY2].probability

    for (const y of yList) {
        if (y === currentY1 || y === currentY2) {
            continue
        }
        const probability = rows[y].probability
        const d1 = rowDistance(rows, isSameInGroup, rowsCombineableMatrix, xStart, xEnd, currentY1, y)
        const d2 = rowDistance(rows, isSameInGroup, rowsCombineableMatrix, xStart, xEnd, currentY2, y)

        if (d1 < d2) {
            yList1.push(y)
            probabilitySum1 += probability
        } else {
            yList2.push(y)
            probabilitySum2 += probability
        }
    }

    let childP1 = probability
    let childP2 = probability

    let parentP1 = 1
    let parentP2 = 1

    if (probability * (probabilitySum1 + probabilitySum2) <= 1) {
        childP1 = 1 / (probabilitySum1 * probability)
        childP2 = 1 / (probabilitySum2 * probability)

        parentP1 = probabilitySum1 * probability
        parentP2 = probabilitySum2 * probability
    }

    return flattenHorizontalSplits([
        {
            group: nestGroups(
                rows,
                isSameInGroup,
                rowsCombineableMatrix,
                combineGroup,
                filter,
                generateNeutral,
                xStart,
                xEnd,
                yList1,
                childP1
            ),
            probability: parentP1,
        },
        {
            group: nestGroups(
                rows,
                isSameInGroup,
                rowsCombineableMatrix,
                combineGroup,
                filter,
                generateNeutral,
                xStart,
                xEnd,
                yList2,
                childP2
            ),
            probability: parentP2,
        },
    ])
}

function rowDistance<T>(
    rows: Array<Row<T>>,
    isSameInGroup: (v1: T, v2: T) => boolean,
    rowsCombineableMatrix: Array<Array<boolean>>,
    xStart: number,
    xEnd: number,
    y1: number,
    y2: number
): number {
    if (!rowsCombineableMatrix[y1][y2]) {
        return xEnd - xStart //max length
    }
    const sumProbability = rows[y1].probability + rows[y2].probability
    if (sumProbability > 1) {
        return xEnd - xStart //max length
    }
    let different = 0
    for (let x = xStart; x < xEnd; x++) {
        if (!isSameInGroup(rows[y1].horizontal[x], rows[y2].horizontal[x])) {
            ++different
        }
    }
    return different
}

function flattenHorizontalSplits<T>(
    vertical: Vertical<{
        probability: number
        group: NestedGroup<T>
    }>,
    parentProbability = 1
): Vertical<{
    probability: number
    group: NestedGroup<T>
}> {
    return vertical.reduce<
        Vertical<{
            probability: number
            group: NestedGroup<T>
        }>
    >((prev, { group, probability: groupProbability }) => {
        const probability = groupProbability * parentProbability
        if (Array.isArray(group) && group.length === 1) {
            return prev.concat(flattenHorizontalSplits(group[0], probability))
        }
        return prev.concat({
            group,
            probability,
        })
    }, [])
}

function flattenVerticalSplits<T>(
    group: Horizontal<
        Vertical<{
            probability: number
            group: NestedGroup<T>
        }>
    >,
    filter: (value: T) => boolean,
    parentProbability = 1
): Horizontal<
    Vertical<{
        probability: number
        group: NestedGroup<T>
    }>
> {
    return group.reduce<
        Horizontal<
            Vertical<{
                probability: number
                group: NestedGroup<T>
            }>
        >
    >((prev, vertical) => {
        if (vertical.length === 1) {
            const { group, probability: groupProbability } = vertical[0]
            if (Array.isArray(group)) {
                const probability = groupProbability * parentProbability
                return [...prev, ...flattenVerticalSplits(group, filter, probability)]
            }
            if (!filter(group)) {
                return prev
            }
        }
        return [
            ...prev,
            vertical.map(({ group, probability: groupProbability }) => ({
                group,
                probability: groupProbability * parentProbability,
            })),
        ]
    }, [])
}
