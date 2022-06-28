import { ConfigAddition } from "."
import { ParsedSteps } from "../parser"
import { EPSILON, shallowEqual } from "../util"
import { Row, NestGroupConfig } from "./group"
import { LinearizedStep } from "./linearize"
import { stepSimilarity } from "./step-similarity"

/**
 * @returns value between 0 and 1 expressing the similarity
 */
export function rowSimilarity(
    rows: Array<Row<LinearizedStep>>,
    rowsCombineableMatrix: Array<Array<boolean>>,
    config: NestGroupConfig<LinearizedStep, ParsedSteps, ConfigAddition>,
    probability: number,
    xStart: number,
    xEnd: number,
    y1: number,
    y2: number
): number {
    let similarity = 0
    let length = 0
    for (let x = xStart; x < xEnd; x++) {
        const v1 = rows[y1].horizontal[x]
        const v2 = rows[y2].horizontal[x]

        if (
            (v1.type === "filterEnd" && v2.type === "filterEnd") ||
            (v1.type === "nounEnd" && v2.type === "nounEnd") ||
            (v1.type === "this" && v2.type === "this")
        ) {
            continue
        }
        ++length

        if (stepSimilarity(v1, v2) < config.minValueSimilarity) {
            continue
        }

        similarity++

        //skipping over the differences of two filters that might have different contents
        if (v1.type === "filterStart" && v2.type === "filterStart" && !shallowEqual(v1.values, v2.values)) {
            let opened1 = 1
            let opened2 = 1
            while (opened1 > 0 && opened2 > 0 && x < xEnd) {
                x++
                const s1 = rows[y1].horizontal[x]
                const s2 = rows[y2].horizontal[x]
                if (s1.type === "filterStart") {
                    opened1++
                } else if (s1.type === "filterEnd") {
                    opened1--
                }
                if (s2.type === "filterStart") {
                    opened2++
                } else if (s2.type === "filterEnd") {
                    opened2--
                }
            }
        }
    }

    if (length === 0) {
        similarity = 1 //only "this" is very similar
    } else {
        similarity /= length
    }

    if (!rowsCombineableMatrix[y1][y2]) {
        similarity = -3 //similarity can now only be between -3 and -2 => which should be smaller then minRowSimilarity => leads to a horizontal split until no incompatibilities left
    } else if ((rows[y1].probability + rows[y2].probability) * probability > 1 + EPSILON) {
        similarity = -1.5 //same for here only that the range is in between -1.5 and -0.5
    }

    return similarity
}
