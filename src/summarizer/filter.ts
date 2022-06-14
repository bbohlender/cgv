import { Horizontal, Vertical } from "."
import { ParsedSteps } from "../parser"
import { LinearizedStep } from "./linearize"

export function filterMap(matrix: Vertical<Horizontal<LinearizedStep>>): Vertical<Horizontal<number>> {
    throw new Error("method not implemented")
    /*const width = matrix[0].length
    const height = matrix.length

    const result: Vertical<Horizontal<ParsedSteps>> = new Array(height)
        .fill(undefined)
        .map(() => new Array(width).fill(undefined))

    for (let x = 0; x < width; x++) {
        const conditionalGroups: Array<{
            valueType: string
            group: Array<GroupEntry<{ value: any; condition: ParsedSteps }>>
        }> = []
        const randomGroup: Array<GroupEntry<number>> = []
        for (let y = 0; y < height; y++) {
            const step = matrix[y][x]
            if (step.type === "filter-conditional") {
                let group = conditionalGroups.find((group) => group.valueType === typeof step.value)?.group
                if (group == null) {
                    group = []
                    conditionalGroups.push({ group, valueType: typeof step.value })
                }
                group.push({ value: { value: step.value, condition: step.condition }, index: y })
            } else if (step.type === "filter-random") {
                randomGroup.push({ value: step.probability, index: y })
            } else {
                result[y][x] = step
            }
        }
        if (randomGroup.length > 0) {
            const randomStep: ParsedSteps = { type: "random", children: [], probabilities: [] }
            for (const probability of randomGroup) {
                randomStep.children.push()
                randomStep.probabilities.push(probability)
            }
        }
    }
    return result*/
}
