import { AbstractParsedIf, AbstractParsedSwitch, FullValue, HierarchicalInfo, serializeStepString } from "cgv"
import { useBaseStore } from "../global"
import { DeleteIcon } from "../icons/delete"
import { BlurInput } from "./blur-input"
import { StartLabel } from "./label"
import { stringToConstant } from "./util"

export function GUIIfStep({
    step,
    values,
}: {
    step: AbstractParsedIf<HierarchicalInfo>
    values: Array<FullValue>
}) {
    const store = useBaseStore()
    return (
        <div className="d-flex flex-column mb-3 mx-3">
            <StartLabel
                onClick={(e) => store.getState().selectChildren(step, values, step.children[0])}
                value="Condition"
                className="pointer mb-3">
                <div className="flex-grow-1 text-end px-2">{serializeStepString(step.children[0])}</div>
            </StartLabel>
            
            <StartLabel
                onClick={(e) => store.getState().selectChildren(step, values, step.children[1])}
                value="Then"
                className="pointer mb-3">
                <div className="flex-grow-1 text-end px-2">{serializeStepString(step.children[1])}</div>
            </StartLabel>
            
            <StartLabel
                onClick={(e) => store.getState().selectChildren(step, values, step.children[2])}
                value="Else"
                className="pointer mb-3">
                <div className="flex-grow-1 text-end px-2">{serializeStepString(step.children[2])}</div>
            </StartLabel>
        </div>
    )
}
