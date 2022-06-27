import { AbstractParsedSwitch, FullValue, HierarchicalInfo, serializeStepString } from "cgv"
import { useBaseStore } from "../global"
import { ArrowLeftRightIcon } from "../icons/arrow-left-right"
import { DeleteIcon } from "../icons/delete"
import { BlurInput } from "./blur-input"
import { StartLabel } from "./label"
import { stringToConstant } from "./util"

export function GUISwitchStep({
    step,
    values,
}: {
    step: AbstractParsedSwitch<HierarchicalInfo>
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
            {step.children.slice(1).map((child, i) => (
                <div key={i} className="d-flex flex-row align-items-center border-bottom mb-3">
                    <BlurInput
                        className="form-control form-control-sm"
                        type="text"
                        value={step.cases[i]}
                        onBlur={(e) =>
                            store.getState().replace<"switch">((draft) => {
                                draft.cases[i] = [stringToConstant(e.target.value)]
                            }, step)
                        }
                    />
                    <div
                        className="flex-grow-1 ms-2 p-3 pointer"
                        onClick={(e) => store.getState().selectChildren(step, values, child)}>
                        {
                            serializeStepString(child) //TODO: dont use serialize here
                        }
                    </div>
                    <button
                        onClick={() => store.getState().replace(() => child, step)}
                        className="btn btn-sm btn-outline-primary ms-2">
                        <ArrowLeftRightIcon />
                    </button>
                    <div
                        onClick={() => {
                            store.getState().replace<"switch">((draft) => {
                                draft.children.splice(i, 1)
                                draft.cases.splice(i, 1)
                            }, step)
                        }}
                        className="d-flex align-items-center ms-2 btn btn-sm btn-outline-danger">
                        <DeleteIcon />
                    </div>
                </div>
            ))}
            <div
                onClick={() =>
                    store.getState().replace<"switch">((draft) => {
                        draft.children.push({ type: "this" })
                        draft.cases.push([0])
                    }, step)
                }
                className="btn btn-outline-success">
                Add Case
            </div>
        </div>
    )
}
