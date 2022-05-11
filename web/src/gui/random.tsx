import { AbstractParsedRandom, FullValue, HierarchicalInfo, serializeStepString } from "cgv"
import { useBaseStore } from "../global"
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
                            store.getState().replace<"random">((draft) => {
                                draft.probabilities[i] = toProbability(e.target.value)
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
                    <div
                        onClick={() =>
                            store.getState().replace<"random">((draft) => {
                                draft.children.splice(i, 1)
                                draft.probabilities.splice(i, 1)
                            }, step)
                        }
                        className="d-flex align-items-center ms-2 btn btn-sm btn-outline-danger">
                        <DeleteIcon />
                    </div>
                </div>
            ))}
            <div
                onClick={() =>
                    store.getState().replace<"random">((draft) => {
                        draft.children.push({ type: "this" })
                        draft.probabilities.push(0)
                    }, step)
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
