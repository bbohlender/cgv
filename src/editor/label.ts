import { ParsedTransformation } from "../parser"
import { localizeNoun } from "../util"
import { SelectedSteps } from "./selection"

export function getStepLabel(step: ParsedTransformation, descriptionName: string): string {
    if (step.type === "symbol") {
        return localizeNoun(step.identifier, descriptionName)
    }
    if (step.type === "operation") {
        return step.identifier
    }
    if (step.type === "raw") {
        return step.value.toString()
    }
    return step.type
}

export const getNounLabel = localizeNoun

export function getSelectedLabel(selected: SelectedSteps, descriptionName: string): string {
    if (typeof selected === "string") {
        return getNounLabel(selected, descriptionName)
    }
    return getStepLabel(selected, descriptionName)
}
