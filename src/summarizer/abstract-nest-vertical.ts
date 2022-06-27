import { Vertical } from "."
import { Row, NestGroupConfig, NestedGroup, nestGroups, Column } from "./group"

export function abstractNestVerticalGroups<T, K, M>(
    rows: Array<Row<T>>,
    rowsCombineableMatrix: Array<Array<boolean>>,
    combineValues: (
        config: NestGroupConfig<T, K, M>,
        vertical: Vertical<{
            value: T
            probability: number
        }>
    ) => K,
    valueSimilarity: (v1: T, v2: T) => number,
    minValueSimilarity: number,
    config: NestGroupConfig<T, K, M>,
    xStart: number,
    xEnd: number,
    yList: Array<number>,
    probability: number
) {
    if (xEnd - xStart <= 0) {
        throw new Error("unable to nest vertical groups with with <= 0")
    }

    let leastGroupsInColumn = groupVertical(rows, valueSimilarity, minValueSimilarity, xStart, yList)
    let leastGroupsInColumnX = xStart
    for (let x = xStart + 1; x < xEnd; x++) {
        const groups = groupVertical(rows, valueSimilarity, minValueSimilarity, x, yList)
        if (groups.length < leastGroupsInColumn.length) {
            leastGroupsInColumn = groups
            leastGroupsInColumnX = x
        }
    }

    const result: NestedGroup<K> = []

    if (leastGroupsInColumnX - xStart > 0) {
        result.push(
            ...nestGroups(rows, rowsCombineableMatrix, config, xStart, leastGroupsInColumnX, yList, probability)
        )
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
        const probabilitySum = group.reduce((prev, y) => prev + rows[y].probability, 0)
        const parentProbability = probabilitySum * probability
        column.vertical.push({
            group: combineValues(
                config,
                group.map((y) => ({
                    value: rows[y].horizontal[leastGroupsInColumnX],
                    probability: rows[y].probability / probabilitySum,
                }))
            ),
            probability: parentProbability,
        })
    }

    if (xEnd - (leastGroupsInColumnX + 1) > 0) {
        result.push(
            ...nestGroups(rows, rowsCombineableMatrix, config, leastGroupsInColumnX + 1, xEnd, yList, probability)
        )
    }

    return result
}

function groupVertical<T>(
    rows: Array<Row<T>>,
    valueSimilarity: (v1: T, v2: T) => number,
    minValueSimilarity: number,
    x: number,
    yList: Array<number>
): Array<Array<number>> {
    const groups: Array<Array<number>> = []
    for (const y of yList) {
        let group = groups.find(
            (group) => valueSimilarity(rows[group[0]].horizontal[x], rows[y].horizontal[x]) >= minValueSimilarity
        )
        if (group == null) {
            group = []
            groups.push(group)
        }
        group.push(y)
    }
    return groups
}
