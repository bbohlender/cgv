import { AbstractParsedOperation, createDefaultStep, HierarchicalInfo } from "cgv"
import { useBaseStore } from "../../../global"
import { BlurInput } from "../../../gui/blur-input"
import { DeleteIcon } from "../../../icons/delete"
import { EndLabel, StartLabel } from "../../../gui/label"
import { AxisInput } from "./axis-input"
import { operations } from "cgv/domains/shape"

export function GUIMultiSplitSteps({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const [child1] = value.children
    const axis = child1.type === "raw" ? child1.value : undefined
    const store = useBaseStore()
    return (
        <div className="d-flex flex-column mx-3">
            <EndLabel value="Multiple" className="mb-3">
                <input
                    className="min-w-0 form-check-input"
                    type="checkbox"
                    checked={true}
                    onChange={() =>
                        store
                            .getState()
                            .replace(() => createDefaultStep({ type: "operation", identifier: "split" }, operations))
                    }
                />
            </EndLabel>
            <StartLabel value="Axis" className="mb-3 ">
                <AxisInput
                    value={axis}
                    onChange={(e) =>
                        store.getState().replace<"operation">((draft) => {
                            draft.children[0] = { type: "raw", value: e.currentTarget.value }
                        })
                    }
                    className="flex-grow-1 w-auto form-select form-select-sm"
                />
            </StartLabel>
            {value.children.slice(1).map((child, i) => (
                <StartLabel value="Size" className="mb-3">
                    <BlurInput
                        className="min-w-0 form-control form-control-sm"
                        type="number"
                        value={(child.type === "raw" ? child.value : undefined) ?? 10}
                        onBlur={(e) =>
                            store.getState().replace<"operation">((draft) => {
                                draft.children[i + 1] = { type: "raw", value: e.target.valueAsNumber }
                            })
                        }
                    />
                    <div
                        onClick={() =>
                            store.getState().replace<"operation">((draft) => {
                                draft.children.splice(i + 1, 1)
                            })
                        }
                        className="d-flex align-items-center btn-sm ms-2 btn btn-outline-danger">
                        <DeleteIcon />
                    </div>
                </StartLabel>
            ))}
            <div
                className="btn btn-outline-success mb-3"
                onClick={() =>
                    store.getState().replace<"operation">((draft) => {
                        draft.children.push({ type: "raw", value: 10 })
                    })
                }>
                Add
            </div>
        </div>
    )
}
