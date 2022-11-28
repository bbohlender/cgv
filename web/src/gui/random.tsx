import { AbstractParsedRandom, FullValue, HierarchicalInfo, serializeStepString } from "cgv"
import Tooltip from "rc-tooltip"
import { useBaseStore } from "../global"
import { ArrowLeftRightIcon } from "../icons/arrow-left-right"
import { DeleteIcon } from "../icons/delete"
import { BlurInput } from "./blur-input"

export function GUIRandomStep({
    step,
    values,
}: {
    step: AbstractParsedRandom<HierarchicalInfo>
    values: Array<FullValue>
}) {
    const store = useBaseStore()
    return (
        <div className="d-flex flex-column mx-3 mb-3">
            {step.children.map((child, i) => (
                <div key={i} className="d-flex flex-row align-items-center border-bottom">
                    <BlurInput
                        className="form-control form-control-sm"
                        type="text"
                        value={step.probabilities[i] * 100}
                        onBlur={(e) =>
                            store.getState().edit<"random">({
                                mode: "replace",
                                stepGenerator: (path, draft) => {
                                    draft.probabilities[i] = toProbability(e.target.value)
                                },
                                steps: step,
                            })
                        }
                    />
                    <div
                        className="flex-grow-1 ms-2 p-3 pointer"
                        onClick={(e) => store.getState().selectChildren(step, values, child)}>
                        {
                            serializeStepString(child) //TODO: dont use serialize here
                        }
                    </div>
                    <Tooltip placement="left" overlay="Replace with this">
                        <button
                            onClick={() =>
                                store.getState().edit({
                                    mode: "replace",
                                    stepGenerator: () => child,
                                    steps: step,
                                })
                            }
                            className="btn ms-2 btn-sm btn-outline-primary">
                            <ArrowLeftRightIcon />
                        </button>
                    </Tooltip>
                    <Tooltip placement="left" overlay="Delete">
                        <div
                            onClick={() =>
                                store.getState().edit<"random">({
                                    mode: "replace",
                                    stepGenerator: (path, draft) => {
                                        draft.children.splice(i, 1)
                                        draft.probabilities.splice(i, 1)
                                    },
                                    steps: step,
                                })
                            }
                            className="d-flex align-items-center ms-2 btn btn-sm btn-outline-danger">
                            <DeleteIcon />
                        </div>
                    </Tooltip>
                </div>
            ))}
            <div
                onClick={() =>
                    store.getState().edit<"random">({
                        mode: "replace",
                        stepGenerator: (path, draft) => {
                            draft.children.push({ type: "this" })
                            draft.probabilities.push(0)
                        },
                        steps: step,
                    })
                }
                className="btn btn-outline-success">
                Add
            </div>
        </div>
    )
}

function toProbability(value: string) {
    return parseFloat(value) / 100
}
