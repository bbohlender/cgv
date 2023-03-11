import { ConfigAddition, Vertical, summarizeLinearization } from "."
import { ParsedTransformation } from "../parser"
import { shallowEqual } from "../util"
import { abstractNestVerticalGroups } from "./abstract-nest-vertical"
import { combine } from "./combine"
import { NestVerticalGroups, Row, NestedGroup, nestGroups } from "./group"
import { LinearizedStep, LinearizationResult, mapLinearizationResult, combineLinearizationResult } from "./linearize"
import { rowSimilarity } from "./row-similarity"
import { stepSimilarity } from "./step-similarity"
import { translateNestedGroup } from "./translate-nested"

export const nestVerticalGroups: NestVerticalGroups<LinearizedStep, ParsedTransformation, ConfigAddition> = (
    rows,
    rowsCombineableMatrix,
    config,
    xStart,
    xEnd,
    yList,
    probability
) => {
    //find first occurance in columns of filter / noun
    let xStartSubsection: number | undefined
    let firstStartStep:
        | { type: "filterStart"; children: [LinearizationResult]; values: Array<any> }
        | { type: "nounStart"; identifier: string }
        | undefined

    const openStart: Array<boolean> = new Array(yList.length).fill(false)
    const startEndRelations: Array<number> = new Array(yList.length).fill(0)
    for (let x = xStart; x < xEnd; x++) {
        for (let i = 0; i < yList.length; i++) {
            const y = yList[i]
            const step = rows[y].horizontal[x]
            if (step.type === "filterStart" || step.type === "nounStart") {
                xStartSubsection = x
                startEndRelations[i] = 1
                firstStartStep = step
                openStart[i] = true
            }
        }
        if (xStartSubsection != null) {
            break
        }
    }

    if (xStartSubsection == null || firstStartStep == null) {
        return abstractNestVerticalGroups(
            rows,
            rowsCombineableMatrix,
            combine,
            stepSimilarity,
            config.minValueSimilarity,
            config,
            xStart,
            xEnd,
            yList,
            probability
        )
    }

    const probabilitySum = yList.reduce((prev, y) => prev + rows[y].probability, 0)
    const parentProbability = probabilitySum * probability
    const childProbability = 1 / probabilitySum

    const newRows: Vertical<Row<LinearizedStep>> = rows.map((row) => ({
        horizontal: [...row.horizontal],
        probability: row.probability,
    }))

    const result: NestedGroup<ParsedTransformation> = []

    if (xStartSubsection - xStart > 0) {
        result.push(...nestGroups(rows, rowsCombineableMatrix, config, xStart, xStartSubsection, yList, probability))
    }

    //beginning from that index search for a place where every start has an end (counted per row)
    let xEndSubsection = xStartSubsection + 1
    let allZero = false
    while (!allZero && xEndSubsection < xEnd) {
        allZero = true
        for (let i = 0; i < yList.length; i++) {
            const y = yList[i]
            const step = rows[y].horizontal[xEndSubsection]
            if (step.type === "filterStart" || step.type === "nounStart") {
                startEndRelations[i]++
            } else if (step.type === "filterEnd" || step.type === "nounEnd") {
                startEndRelations[i]--
            }
            if (startEndRelations[i] === 0) {
                if (openStart[i]) {
                    openStart[i] = false
                    newRows[y].horizontal[xEndSubsection] = { type: "this" }
                }
            } else {
                allZero = false
            }
        }
        xEndSubsection++
    }

    let step: ParsedTransformation

    if (firstStartStep.type === "filterStart") {
        const valueGroups: Array<{ values: Array<any>; yList: Array<number> }> = []
        const nonFilterRowsIndices: Array<number> = []
        const conditions: Array<LinearizationResult> = []

        let booleanValues = true

        for (let i = 0; i < yList.length; i++) {
            const y = yList[i]
            const startStep = rows[y].horizontal[xStartSubsection]

            if (startStep.type !== "filterStart") {
                nonFilterRowsIndices.push(i)
                continue
            }

            conditions[i] = mapLinearizationResult(startStep.children[0], ({ horizontal }) => ({
                horizontal,
                probability: rows[y].probability * childProbability,
            }))

            if (startStep.values.length !== 1 || typeof startStep.values[0] !== "boolean") {
                booleanValues = false
            }

            let valueGroup = valueGroups.find(({ values }) => shallowEqual(values, startStep.values))
            if (valueGroup == null) {
                valueGroup = { values: startStep.values, yList: [] }
                valueGroups.push(valueGroup)
            }
            valueGroup.yList.push(y)
        }

        for (const y of yList) {
            const startStep = rows[y].horizontal[xStartSubsection]
            if (startStep.type === "filterStart") {
                newRows[y].probability *= valueGroups.length
            }
        }

        for (const i of nonFilterRowsIndices) {
            const y1 = yList[i]
            let maxAvgSimilarity: number | undefined
            let maxValueGroup: { values: Array<any>; yList: Array<number> } | undefined
            for (const group of valueGroups) {
                let avgSimilarity = 0
                for (const y2 of group.yList) {
                    avgSimilarity += rowSimilarity(
                        newRows,
                        rowsCombineableMatrix,
                        config,
                        probability,
                        xStartSubsection + 1,
                        xEndSubsection,
                        y1,
                        y2
                    )
                }
                avgSimilarity /= group.yList.length
                if (maxAvgSimilarity == null || avgSimilarity > maxAvgSimilarity) {
                    maxAvgSimilarity = avgSimilarity
                    maxValueGroup = group
                }
            }
            maxValueGroup!.yList.push(y1)
            conditions[i] = {
                vertical: [
                    {
                        horizontal: [{ type: "raw", value: maxValueGroup!.values[0] }],
                        probability: rows[y1].probability * childProbability,
                    },
                ],
                seperationMatrix: [[true]],
            }
        }

        const condition = summarizeLinearization(
            conditions.reduce((prev, cur) => combineLinearizationResult(prev, cur, true)),
            config.createNoun
        )

        if (booleanValues) {
            const thenYList = valueGroups.find(({ values }) => values[0] === true)?.yList
            const elseYList = valueGroups.find(({ values }) => values[0] === false)?.yList

            const thenStep: ParsedTransformation =
                thenYList == null
                    ? { type: "null" }
                    : translateNestedGroup(
                          nestGroups(
                              newRows,
                              rowsCombineableMatrix,
                              config,
                              xStartSubsection + 1,
                              xEndSubsection,
                              thenYList,
                              childProbability
                          )
                      )

            const elseStep: ParsedTransformation =
                elseYList == null
                    ? { type: "null" }
                    : translateNestedGroup(
                          nestGroups(
                              newRows,
                              rowsCombineableMatrix,
                              config,
                              xStartSubsection + 1,
                              xEndSubsection,
                              elseYList,
                              childProbability
                          )
                      )

            step = {
                type: "if",
                children: [condition, thenStep, elseStep],
            }
        } else {
            step = {
                type: "switch",
                cases: valueGroups.map(({ values }) => values),
                children: [
                    condition,
                    ...valueGroups.map(({ yList }) =>
                        translateNestedGroup(
                            nestGroups(
                                newRows,
                                rowsCombineableMatrix,
                                config,
                                xStartSubsection! + 1,
                                xEndSubsection,
                                yList,
                                childProbability
                            )
                        )
                    ),
                ],
            }
        }
    } else {
        const noun = config.createNoun(firstStartStep.identifier)
        noun.step = translateNestedGroup(
            nestGroups(
                newRows,
                rowsCombineableMatrix,
                config,
                xStartSubsection + 1,
                xEndSubsection,
                yList,
                childProbability
            )
        )
        step = {
            type: "symbol",
            identifier: noun.name,
        }
    }

    result.push({
        compatible: true,
        vertical: [
            {
                group: step,
                probability: parentProbability,
            },
        ],
    })

    if (xEnd - xEndSubsection > 0) {
        result.push(...nestGroups(rows, rowsCombineableMatrix, config, xEndSubsection, xEnd, yList, probability))
    }

    return result
}
