import { filterNull, ParsedGrammarDefinition, ParsedSteps, replaceSymbolsGrammar, trimGrammar, trimSteps } from ".."

export function summarize(...grammarDefinitions: Array<ParsedGrammarDefinition>): ParsedGrammarDefinition {
    const steps = grammarDefinitions.map(replaceSymbolsGrammar).map(([, steps]) => trimSteps(steps))

    const equalizedSteps = equalizeSteps(...steps)

    const similarizedSteps = similarizeSteps(...equalizedSteps)

    //TODO: group by equal root steps (if more then one group surround with random selection)
}

/**
 *
 */
export function similarizeSteps(...stepsList: Array<ParsedSteps>): Array<ParsedSteps> {}

/**
 * compares all steps from the provides grammars and removes duplicate so semantically equal steps are referring the exact same `ParsedStep` object
 * the references are also equal in the grammar itself (e.g. if one grammar uses the raw value "1" multiple times, it will reference the same ParsedValue object)
 */
export function equalizeSteps(...stepsList: Array<ParsedSteps>): Array<ParsedSteps> {}

/*function summarize(stepsList: Array<ParsedSteps>): [steps: ParsedSteps, matchingScore: number] {
    return summarizeOptions(stepsList).reduce((max, current) => (current[1] > max[1] ? current : max))
}*/

/*
function summarizeOptions(stepsList: Array<ParsedSteps>): Array<[steps: ParsedSteps, matchingScore: number]> {
    const typeGroups = group(stepsList, (step) => step.type)
    typeGroups.map(([type, stepsList]) => {
        switch (type) {
            case "sequential": {
                return
            }
            case "parallel": {
            }
            case "bracket": {
                const [steps, score] = summarize(stepsList.map((steps) => (steps as ParsedBracket).steps))
                return [
                    {
                        type: "bracket",
                        steps,
                    },
                    score,
                ]
            }
            case "operation":
                return summarizeOperation(stepsList)
            case "raw":
                return summarizeRaw(stepsList)
            case "symbol":
                throw new Error(`the summarizer does not yet support symbols`)
            case "this":
                return summarizeThis(stepsList)
        }
    })
}

function summarizeMultipleShifted() {
    //TODO: when we ditch the whole matrix+index part do the same as with sequential and just return null for the missing/unmatched part

    const parallelGroups = group(stepsList, (step) => (step as ParsedParallel).stepsList.length)

    return parallelGroups.map(([length, stepsList]) => {
        const [summarizedStepsList, score] = new Array(length).fill(null).reduce<[Array<ParsedSteps>, number]>(
            ([prevStepsList, prevScore], _, i) => {
                const [steps, score] = summarize(
                    (stepsList as Array<ParsedOperation>).map((steps) => steps.parameters[i])
                )
                return [[...prevStepsList, steps], prevScore + score]
            },
            [[], 0]
        )

        return [
            {
                type: "parallel",
                stepsList: summarizedStepsList,
            },
            score,
        ]
    })
}

function summarizeThis(stepsList: Array<ParsedSteps>): Array<[ParsedSteps, number]> {
    return [
        [
            {
                type: "this",
            },
            stepsList.length,
        ],
    ]
}

function summarizeOperation(stepsList: Array<ParsedSteps>): Array<[ParsedSteps, number]> {
    const operationGroups = group(
        stepsList,
        (step) => ({
            identifier: (step as ParsedOperation).identifier,
            parameterLength: (step as ParsedOperation).parameters.length,
        }),
        ({ identifier: i1, parameterLength: pl1 }, { identifier: i2, parameterLength: pl2 }) => i1 === i2 && pl1 === pl2
    )
    return operationGroups.map(([{ identifier, parameterLength }, stepsList]) => {
        const [parameters, score] = new Array(parameterLength).fill(null).reduce<[Array<ParsedSteps>, number]>(
            ([prevStepsList, prevScore], _, i) => {
                const [steps, score] = summarize(
                    (stepsList as Array<ParsedOperation>).map((steps) => steps.parameters[i])
                )
                return [[...prevStepsList, steps], prevScore + score]
            },
            [[], 0]
        )

        return [
            {
                type: "operation",
                identifier,
                parameters,
            },
            score,
        ]
    })
}

function summarizeRaw(stepsList: Array<ParsedSteps>): Array<[ParsedSteps, number]> {
    const valueGroups = group(stepsList, (step) => (step as ParsedRaw).value)
    return valueGroups.map(([value]) => [
        {
            type: "raw",
            value,
        },
        stepsList.length,
    ])
}

function wrapWithRandomSelector(stepList: Array<[steps: ParsedSteps, probability: number]>): ParsedSteps {
    //TODO
}

function group<T, K>(
    array: Array<T>,
    mapFn: (val: T) => K,
    equal: (v1: K, v2: K) => boolean = (v1, v2) => v1 === v2
): Array<[K, Array<T>]> {
    const map: Array<[K, Array<T>]> = []
    for (const item of array) {
        const key = mapFn(item)
        let entry = map.find(([k]) => equal(k, key))
        if (entry == null) {
            entry = [key, []]
            map.push(entry)
        }
        entry[1].push(item)
    }
    return map
}

*/
