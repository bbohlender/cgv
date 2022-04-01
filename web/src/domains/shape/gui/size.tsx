import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { useBaseStore } from "../../../global"
import { AxisInput } from "./axis-input"

export function GUISizeStep({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const selection = value.children[0].type === "raw" ? value.children[0].value : undefined
    const store = useBaseStore()
    return (
        <AxisInput
            onChange={(e) =>
                store.getState().change(value, {
                    type: "operation",
                    identifier: "size",
                    children: [
                        {
                            type: "raw",
                            value: e.currentTarget.value,
                        },
                    ],
                })
            }
            value={selection ?? "x"}
            className="form-select mx-3 mb-3 w-auto form-select-sm"
        />
    )
}
