import { filterNull, ParsedGrammarDefinition, ParsedSteps, replaceSymbolsGrammar, trimGrammar } from ".."

export function summarizer(grammarDefinitions: Array<ParsedGrammarDefinition>): ParsedGrammarDefinition {
    const symbolFreeGrammars = grammarDefinitions.map(replaceSymbolsGrammar).map(trimGrammar).filter(filterNull)

    const stepsList = symbolFreeGrammars.map((grammar) => Object.values(grammar)[0])

    const [resultSteps] = summarize(stepsList)

    return {
        [Object.keys(symbolFreeGrammars[0])[0]]: resultSteps,
    }
}

function summarize(stepsList: Array<ParsedSteps>): [steps: ParsedSteps, matchingScore: number] {
    return summarizeOptions(stepsList).reduce((max, current) => (current[1] > max[1] ? current : max))
}
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
