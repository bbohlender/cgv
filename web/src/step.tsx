import {
    ParsedBinaryOperator,
    ParsedBracket,
    ParsedGetVariable,
    ParsedGrammarDefinition,
    ParsedIf,
    ParsedOperation,
    ParsedParallel,
    ParsedRandom,
    ParsedRaw,
    ParsedReturn,
    ParsedSequantial,
    ParsedSetVariable,
    ParsedSteps,
    ParsedSwitch,
    ParsedSymbol,
    ParsedThis,
    ParsedUnaryOperator,
} from "cgv"

export function Steps({ value }: { value: ParsedSteps }) {
    return <span></span>
}

export function renderSteps(step: ParsedSteps): JSX.Element {
    switch (step.type) {
        case "operation":
            return renderOperation(step)
        case "parallel":
            return renderParallel(step)
        case "raw":
            return renderRaw(step)
        case "sequential":
            return renderSequential(step)
        case "symbol":
            return renderSymbol(step)
        case "this":
            return renderThis(step)
        case "bracket":
            return renderBracket(step)
        case "invert":
        case "not":
            return renderUnaryOperator(step)
        case "add":
        case "and":
        case "divide":
        case "equal":
        case "greater":
        case "greaterEqual":
        case "modulo":
        case "multiply":
        case "or":
        case "smaller":
        case "smallerEqual":
        case "subtract":
        case "unequal":
            return renderBinaryOperator(step)
        case "if":
            return renderIf(step)
        case "switch":
            return renderSwitch(step)
        case "getVariable":
            return renderGetVariable(step)
        case "setVariable":
            return renderSetVariable(step)
        case "return":
            return renderReturn(step)
        case "random":
            return renderRandom(step)
    }
}

function renderRandom(step: ParsedRandom): JSX.Element {
    if (step.children.length != step.probabilities.length) {
        throw new Error(`random step must have the same amount of childrens as the amount of probabilities`)
    }
    return (
        <>
            {"{"}
            {step.children
                .map((child, i) => `${toFixedMax(step.probabilities[i] * 100, 2)}%: ${renderSteps(child)}`)
                .join(" ")}
            {"}"}
        </>
    )
}

function toFixedMax(value: number, max: number): string {
    const multiplier = Math.pow(10, max)
    return (Math.round(value * multiplier) / multiplier).toString()
}

function renderBracket(step: ParsedBracket): JSX.Element {
    return <>({renderSteps(step.children[0])})</>
}

function renderUnaryOperator(unaryOperatorStep: ParsedUnaryOperator): JSX.Element {
    const op1 = renderSteps(unaryOperatorStep.children[0])
    switch (unaryOperatorStep.type) {
        case "invert":
            return <>-{op1}</>
        case "not":
            return <>!{op1}</>
    }
}

function renderBinaryOperator(binaryOperatorStep: ParsedBinaryOperator): JSX.Element {
    const op1 = renderSteps(binaryOperatorStep.children[0])
    const op2 = renderSteps(binaryOperatorStep.children[1])

    switch (binaryOperatorStep.type) {
        case "add":
            return (
                <>
                    {op1} + {op2}
                </>
            )
        case "and":
            return `${op1} && ${op2}`
        case "divide":
            return `${op1} / ${op2}`
        case "equal":
            return `${op1} == ${op2}`
        case "greater":
            return `${op1} > ${op2}`
        case "greaterEqual":
            return `${op1} >= ${op2}`
        case "modulo":
            return `${op1} % ${op2}`
        case "multiply":
            return `${op1} * ${op2}`
        case "or":
            return `${op1} || ${op2}`
        case "smaller":
            return `${op1} < ${op2}`
        case "smallerEqual":
            return `${op1} <= ${op2}`
        case "subtract":
            return `${op1} - ${op2}`
        case "unequal":
            return `${op1} != ${op2}`
    }
}

function renderReturn(returnStep: ParsedReturn): JSX.Element {
    return "return"
}

function renderGetVariable(getVariableStep: ParsedGetVariable): JSX.Element {
    return `this.${getVariableStep.identifier}`
}

function renderSetVariable(setVariableStep: ParsedSetVariable): JSX.Element {
    return `this.${setVariableStep.identifier} = ${renderSteps(setVariableStep.children[0])}`
}

function renderOperation(operationStep: ParsedOperation): JSX.Element {
    return `${operationStep.identifier}(${operationStep.children
        .map((parameter) => renderSteps(parameter))
        .join(", ")})`
}

function renderIf(step: ParsedIf): JSX.Element {
    return `if ${renderSteps(step.children[0])} then ${renderSteps(step.children[1])} else ${renderSteps(
        step.children[2]
    )}`
}

function renderSwitch(step: ParsedSwitch): JSX.Element {
    return `switch ${renderSteps(step.children[0])} ${step.cases
        .map((caseValue, i) => `case ${serializeConstant(caseValue)}: ${renderSteps(step.children[i + 1])}`)
        .join(" ")}`
}

function renderParallel(parallelStep: ParsedParallel): JSX.Element {
    return parallelStep.children.map(renderSteps).join(" | ")
}

function renderRaw(rawStep: ParsedRaw): JSX.Element {
    return serializeConstant(rawStep.value)
}

function serializeConstant(constant: any): JSX.Element {
    const type = typeof constant
    switch (type) {
        case "string":
            return `"${constant}"`
        case "number":
        case "boolean":
            return constant.toString()
        default:
            throw new Error(`constant "${constant}" of unknown type "${type}"`)
    }
}

function renderSequential(sequentialStep: ParsedSequantial): JSX.Element {
    return sequentialStep.children.map(renderSteps).join(" ")
}

function renderSymbol(symbolStep: ParsedSymbol): JSX.Element {
    return symbolStep.identifier
}

function renderThis(thisStep: ParsedThis): JSX.Element {
    return "this"
}

export function Gramamr({ value }: { value: ParsedGrammarDefinition }) {
    return (
        <div className="d-flex flex-column">
            {Object.entries(value).map(([name, steps]) => (
                <div>
                    {name}
                    <span></span>
                    <Steps value={steps} />
                </div>
            ))}
        </div>
    )
}
