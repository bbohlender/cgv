import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { BlurInput } from "../../../gui/blur-input"
import { useBaseStore } from "../../../global"

export function GUIExtrudeStep({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const raw = value.children[0].type === "raw" ? value.children[0].value : undefined
    const store = useBaseStore()
    return (
        <BlurInput
            value={raw ?? 0xff0000}
            type="number"
            className="mx-3 mb-3 w-auto form-control form-control-sm"
            onBlur={(e) =>
                store.getState().edit<"operation">({
                    mode: "replace",
                    stepGenerator: (path, draft) => {
                        draft.children[0] = {
                            type: "raw",
                            value: e.target.valueAsNumber,
                        }
                    },
                    steps: value,
                })
            }
        />
    )
}
