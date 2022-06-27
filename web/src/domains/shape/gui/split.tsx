import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { useBaseStore } from "../../../global"
import { BlurInput } from "../../../gui/blur-input"
import { DeleteIcon } from "../../../icons/delete"
import { EndLabel, StartLabel } from "../../../gui/label"
import { AxisInput } from "./axis-input"
import { useCallback } from "react"

export function GUISplitSteps({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const [axisChild, repetitionChild] = value.children
    const axis = axisChild.type === "raw" ? axisChild.value : undefined
    const repetitions: number | boolean = repetitionChild.type === "raw" ? repetitionChild.value : undefined
    const store = useBaseStore()
    const setRepitions = useCallback(
        (repetitions: number | boolean) => {
            store.getState().replace<"operation">((draft) => {
                draft.children[1] = { type: "raw", value: repetitions }
            }, value)
        },
        [store, value]
    )
    return (
        <div className="d-flex flex-column mx-3">
            <StartLabel value="Axis" className="mb-3 ">
                <AxisInput
                    value={axis}
                    onChange={(e) =>
                        store.getState().replace<"operation">((draft) => {
                            draft.children[0] = { type: "raw", value: e.currentTarget.value }
                        }, value)
                    }
                    className="flex-grow-1 w-auto form-select form-select-sm"
                />
            </StartLabel>
            <EndLabel value="Repeat" className="mb-3">
                <input
                    className="min-w-0 form-check-input"
                    type="checkbox"
                    checked={repetitions !== false}
                    onChange={(e) => setRepitions(e.target.checked ? true : false)}
                />
            </EndLabel>
            {repetitions !== false && (
                <>
                    <EndLabel value="Infinite" className="mb-3">
                        <input
                            className="min-w-0 form-check-input"
                            type="checkbox"
                            checked={repetitions === true}
                            onChange={(e) => setRepitions(e.target.checked ? true : 1)}
                        />
                    </EndLabel>
                    {typeof repetitions === "number" && (
                        <StartLabel value="Repitions" className="mb-3">
                            <BlurInput
                                className="min-w-0 form-control form-control-sm"
                                type="number"
                                value={repetitions}
                                onBlur={(e) => setRepitions(isNaN(e.target.valueAsNumber) ? 1 : e.target.valueAsNumber)}
                            />
                        </StartLabel>
                    )}
                </>
            )}

            {value.children.slice(2).map((child, i) => (
                <StartLabel value="Size" key={i} className="mb-3">
                    <BlurInput
                        className="min-w-0 form-control form-control-sm"
                        type="number"
                        value={(child.type === "raw" ? child.value : undefined) ?? 1}
                        onBlur={(e) =>
                            store.getState().replace<"operation">((draft) => {
                                draft.children[i + 2] = { type: "raw", value: e.target.valueAsNumber }
                            }, value)
                        }
                    />
                    <div
                        onClick={() =>
                            store.getState().replace<"operation">((draft) => {
                                draft.children.splice(i + 2, 1)
                            }, value)
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
                        draft.children.push({ type: "raw", value: 1 })
                    }, value)
                }>
                Add
            </div>
        </div>
    )
}
