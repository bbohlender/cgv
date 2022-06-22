import { diffArrays } from "diff"
import { AbstractParsedNoun, Horizontal, Vertical } from ".."

export type Row<T> = { probability: number; horizontal: Array<T> }

export type Column<T> = { compatible: boolean; vertical: Array<T> }

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

export type NestedGroup<T> = Horizontal<
    Column<{
        probability: number
        group: NestedGroup<T> | T
    }>
>

export type NestVerticalGroups<T, K> = (
    config: NestGroupConfig<T, K>,
    xStart: number,
    xEnd: number,
    yList: Array<number>,
    probability: number
) => NestedGroup<K>

export type NestGroupConfig<T, K> = {
    /**
     * TODO: this could be done more generic (related to groups without reference to the "noun" concept)
     */
    createNoun: (identifier: string) => AbstractParsedNoun<unknown>
    rows: Array<Row<T>>
    isSameInGroup: (v1: T, v2: T) => boolean
    combineGroup: (
        config: NestGroupConfig<T, K>,
        vertical: Vertical<{
            value: T
            probability: number
        }>
    ) => K
    rowsCombineableMatrix: Array<Array<boolean>>
    filter: (val: T | K) => boolean
    customNestVerticalGroups: NestVerticalGroups<T, K>
    minRowSimilarity: number //0: very much random but unstructured, 1: no random but very structured, 0.5: half of the steps must be equal to be stochastically mixed
}

class SimilarityMatrix {
    private matrix: Array<Array<number>> = []

    set(x: number, y: number, similarity: number): void {
        if (y > x) {
            const temp = y
            y = x
            x = temp
        }
        let row = this.matrix[y]
        if (row == null) {
            row = []
            this.matrix[y] = row
        }
        row[x] = similarity
    }

    get(x: number, y: number): number {
        if (y > x) {
            const temp = y
            y = x
            x = temp
        }
        return this.matrix[y][x]
    }
}

export function nestGroups<T, K>(
    config: NestGroupConfig<T, K>,
    xStart = 0,
    xEnd = config.rows[0].horizontal.length,
    yList = new Array(config.rows.length).fill(undefined).map<number>((_, i) => i),
    probability = 1
): NestedGroup<K> {
    if (yList.length === 0) {
        throw new Error("unable to nest group with a height 0 zero (yList.length == 0)")
    }

    if (yList.length === 1) {
        return flattenVerticalSplits(
            config.customNestVerticalGroups(config, xStart, xEnd, yList, probability),
            config.filter
        )
    }

    //get lowest row similarity & index
    let lowestRowSimilarityIndex1: number | undefined
    let lowestRowSimilarityIndex2: number | undefined
    let lowestRowSimilarity: number | undefined
    const rowSimilarityMatrix = new SimilarityMatrix()
    for (const y1 of yList) {
        for (const y2 of yList) {
            if (y2 <= y1) {
                continue
            }
            const similarity = rowSimilarity(config, probability, xStart, xEnd, y1, y2) //making sure we split where rows are incompatible and unsimilar
            rowSimilarityMatrix.set(y1, y2, similarity)
            if (lowestRowSimilarity == null || similarity < lowestRowSimilarity) {
                lowestRowSimilarityIndex1 = y1
                lowestRowSimilarityIndex2 = y2
                lowestRowSimilarity = similarity
            }
        }
    }

    if (lowestRowSimilarity! < config.minRowSimilarity) {
        return [
            flattenHorizontalSplits(
                splitHorizontal(
                    config,
                    rowSimilarityMatrix,
                    lowestRowSimilarityIndex1!,
                    lowestRowSimilarityIndex2!,
                    lowestRowSimilarity! >= 0,
                    xStart,
                    xEnd,
                    yList,
                    probability
                )
            ),
        ]
    } else {
        return flattenVerticalSplits(
            config.customNestVerticalGroups(config, xStart, xEnd, yList, probability),
            config.filter
        )
    }
}

export function nestVerticalGroups<T, K>(
    config: NestGroupConfig<T, K>,
    xStart: number,
    xEnd: number,
    yList: Array<number>,
    probability: number
) {
    if (xEnd - xStart <= 0) {
        throw new Error("unable to nest vertical groups with with <= 0")
    }

    let leastGroupsInColumn = groupVertical(config, xStart, yList)
    let leastGroupsInColumnX = xStart
    for (let x = xStart + 1; x < xEnd; x++) {
        const groups = groupVertical(config, x, yList)
        if (groups.length < leastGroupsInColumn.length) {
            leastGroupsInColumn = groups
            leastGroupsInColumnX = x
        }
    }

    const result: NestedGroup<K> = []

    if (leastGroupsInColumnX - xStart > 0) {
        result.push(...nestGroups(config, xStart, leastGroupsInColumnX, yList, probability))
    }

    const column: Column<{
        probability: number
        group: NestedGroup<K> | K
    }> = {
        compatible: true,
        vertical: [],
    }
    result.push(column)
    for (const group of leastGroupsInColumn) {
        const probabilitySum = group.reduce((prev, y) => prev + config.rows[y].probability, 0)
        const parentProbability = probabilitySum * probability
        column.vertical.push({
            group: config.combineGroup(
                config,
                group.map((y) => ({
                    value: config.rows[y].horizontal[leastGroupsInColumnX],
                    probability: config.rows[y].probability / probabilitySum,
                }))
            ),
            probability: parentProbability,
        })
    }

    if (xEnd - (leastGroupsInColumnX + 1) > 0) {
        result.push(...nestGroups(config, leastGroupsInColumnX + 1, xEnd, yList, probability))
    }

    return result
}

function groupVertical<T>(config: NestGroupConfig<T, any>, x: number, yList: Array<number>): Array<Array<number>> {
    const groups: Array<Array<number>> = []
    for (const y of yList) {
        let group = groups.find((group) =>
            config.isSameInGroup(config.rows[group[0]].horizontal[x], config.rows[y].horizontal[x])
        )
        if (group == null) {
            group = []
            groups.push(group)
        }
        group.push(y)
    }
    return groups
}

function splitHorizontal<T, K>(
    config: NestGroupConfig<T, K>,
    rowSimilarityMatrix: SimilarityMatrix,
    y1: number,
    y2: number,
    compatible: boolean,
    xStart: number,
    xEnd: number,
    yList: Array<number>,
    probability: number
): Column<{
    probability: number
    group: NestedGroup<K>
}> {
    const yList1 = [y1]
    const yList2 = [y2]

    const workset = new Set(yList)
    workset.delete(y1)
    workset.delete(y2)

    let probabilitySum1 = config.rows[y1].probability
    let probabilitySum2 = config.rows[y2].probability

    //the following maximizes the similarity per group
    while (workset.size > 0) {
        const { similarity: s1, y: y1 } = getHighestAvgSimilarity(yList1, workset, rowSimilarityMatrix)
        const { similarity: s2, y: y2 } = getHighestAvgSimilarity(yList2, workset, rowSimilarityMatrix)

        if (s1 >= s2) {
            yList1.push(y1)
            workset.delete(y1)
            probabilitySum1 += config.rows[y1].probability
        } else {
            yList2.push(y2)
            workset.delete(y2)
            probabilitySum2 += config.rows[y2].probability
        }
    }
    yList1.sort()
    yList2.sort()

    const { child: childP1, parent: parentP1 } = calculateHierachicalProbability(probabilitySum1, probability)
    const { child: childP2, parent: parentP2 } = calculateHierachicalProbability(probabilitySum2, probability)

    return {
        compatible,
        vertical: [
            {
                group: nestGroups(config, xStart, xEnd, yList1, childP1),
                probability: parentP1,
            },
            {
                group: nestGroups(config, xStart, xEnd, yList2, childP2),
                probability: parentP2,
            },
        ],
    }
}

function getHighestAvgSimilarity(
    yList: Array<number>,
    searchSet: Set<number>,
    rowSimilarityMatrix: SimilarityMatrix
): { similarity: number; y: number } {
    let maxAvgSimilarity: number | undefined
    let maxAvgSimilarityY: number | undefined
    for (const y1 of searchSet) {
        let avgSimilarity = 0
        for (const y2 of yList) {
            avgSimilarity += rowSimilarityMatrix.get(y1, y2)
        }
        avgSimilarity /= yList.length
        if (maxAvgSimilarity == null || avgSimilarity > maxAvgSimilarity) {
            maxAvgSimilarity = avgSimilarity
            maxAvgSimilarityY = y1
        }
    }
    return {
        similarity: maxAvgSimilarity!,
        y: maxAvgSimilarityY!,
    }
}

function calculateHierachicalProbability(sum: number, probability: number): { parent: number; child: number } {
    if (probability * sum <= 1) {
        return {
            parent: sum * probability,
            child: 1 / sum,
        }
    }
    return {
        parent: 1,
        child: probability,
    }
}

/**
 * @returns value between 0 and 1 expressing the similarity
 */
export function rowSimilarity<T>(
    config: NestGroupConfig<T, any>,
    probability: number,
    xStart: number,
    xEnd: number,
    y1: number,
    y2: number
): number {
    let similarity = 0
    let length = 0
    for (let x = xStart; x < xEnd; x++) {
        const v1 = config.rows[y1].horizontal[x]
        const v2 = config.rows[y2].horizontal[x]
        if (!config.filter(v1) && !config.filter(v2)) {
            continue
        }
        ++length
        if (config.isSameInGroup(v1, v2)) {
            similarity++
        }
    }

    if (length === 0) {
        similarity = 1 //only "this" is very similar
    } else {
        similarity /= length
    }

    if (!config.rowsCombineableMatrix[y1][y2]) {
        similarity = -3 //similarity can now only be between -3 and -2 => which should be smaller then minRowSimilarity => leads to a horizontal split until no incompatibilities left
    } else if ((config.rows[y1].probability + config.rows[y2].probability) * probability > 1) {
        similarity = -1.5 //same for here only that the range is in between -1.5 and -0.5
    }

    return similarity
}

function flattenHorizontalSplits<T>(
    column: Column<{
        probability: number
        group: NestedGroup<T> | T
    }>,
    parentProbability = 1
): Column<{
    probability: number
    group: NestedGroup<T> | T
}> {
    return {
        vertical: column.vertical.reduce<
            Vertical<{
                probability: number
                group: NestedGroup<T> | T
            }>
        >((prev, { group, probability: groupProbability }) => {
            const probability = groupProbability * parentProbability
            if (Array.isArray(group) && group.length === 1 && group[0].compatible === column.compatible) {
                return prev.concat(flattenHorizontalSplits(group[0], probability).vertical)
            }
            return prev.concat({
                group,
                probability,
            })
        }, []),
        compatible: column.compatible,
    }
}

function flattenVerticalSplits<T>(
    group: NestedGroup<T>,
    filter: (value: T) => boolean,
    parentProbability = 1
): NestedGroup<T> {
    return group.reduce<NestedGroup<T>>((prev, column) => {
        if (column.vertical.length === 1) {
            const { group, probability: groupProbability } = column.vertical[0]
            if (Array.isArray(group)) {
                const probability = groupProbability * parentProbability
                const flattened = flattenVerticalSplits(group, filter, probability)
                return [...prev, ...flattened]
            } else if (!filter(group)) {
                return prev
            }
        }
        return [
            ...prev,
            {
                vertical: column.vertical.map(({ group, probability: groupProbability }) => ({
                    group,
                    probability: groupProbability * parentProbability,
                })),
                compatible: column.compatible,
            },
        ]
    }, [])
}
