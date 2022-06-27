import { ParsedSteps, ParsedRandom } from "../parser"
import { almostTheSame } from "../util"
import { NestedGroup } from "./group"

export function translateNestedGroup(group: NestedGroup<ParsedSteps> | ParsedSteps): ParsedSteps {
    if (!Array.isArray(group)) {
        return group
    }
    const sequentialSteps = group.map<ParsedSteps>((column) => {
        const parallelSteps: Array<ParsedSteps> = []

        const workset = new Set(column.vertical)

        let currentRandom: ParsedRandom | undefined
        let currentProbability: number | undefined

        while (workset.size > 0) {
            const [first] = workset

            let row:
                | {
                      probability: number
                      group: ParsedSteps | NestedGroup<ParsedSteps>
                  }
                | undefined

            if (
                column.compatible &&
                currentRandom != null &&
                currentProbability != null &&
                (row = findBestFittingRow(workset, currentProbability)) != null
            ) {
                workset.delete(row)
                currentRandom.children.push(translateNestedGroup(row.group))
                currentRandom.probabilities.push(row.probability)
                currentProbability += row.probability
                continue
            }

            workset.delete(first)
            const step = translateNestedGroup(first.group)

            if (!column.compatible) {
                parallelSteps.push(
                    almostTheSame(first.probability, 1)
                        ? step
                        : { type: "random", children: [step], probabilities: [first.probability] }
                )
                currentRandom = undefined
                currentProbability = undefined
                continue
            }

            if (almostTheSame(first.probability, 1)) {
                parallelSteps.push(step)
                currentRandom = undefined
                currentProbability = undefined
                continue
            }

            currentRandom = {
                type: "random",
                children: [step],
                probabilities: [first.probability],
            }
            currentProbability = first.probability
            parallelSteps.push(currentRandom)
        }

        if (parallelSteps.length === 1) {
            return parallelSteps[0]
        }

        return {
            type: "parallel",
            children: parallelSteps,
        }
    })

    if (sequentialSteps.length === 0) {
        return { type: "this" }
    }

    if (sequentialSteps.length === 1) {
        return sequentialSteps[0]
    }

    return {
        type: "sequential",
        children: sequentialSteps,
    }
}

function findBestFittingRow(
    set: Set<{
        probability: number
        group: ParsedSteps | NestedGroup<ParsedSteps>
    }>,
    probability: number
):
    | {
          probability: number
          group: ParsedSteps | NestedGroup<ParsedSteps>
      }
    | undefined {
    if (almostTheSame(probability, 1)) {
        return undefined //short cut so we don't have to loop
    }
    const searchFor = 1 - probability
    let best:
        | {
              probability: number
              group: ParsedSteps | NestedGroup<ParsedSteps>
          }
        | undefined
    let highestFittingProbability: number | undefined = undefined
    for (const entry of set) {
        if (entry.probability > searchFor) {
            continue
        }
        if (highestFittingProbability == null || entry.probability > highestFittingProbability) {
            highestFittingProbability = entry.probability
            best = entry
        }
    }
    return best
}
