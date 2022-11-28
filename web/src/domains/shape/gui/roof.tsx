import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { BlurInput } from "../../../gui/blur-input"
import { useBaseStore } from "../../../global"
import { StartLabel } from "../../../gui/label"

export function GUIRoofStep({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const raw = value.children[0]?.type === "raw" ? value.children[0].value : undefined
    const store = useBaseStore()
    return (
        <StartLabel className="mx-3 mb-3" value="rotation">
            <BlurInput
                value={raw ?? 0}
                type="number"
                className="mx-3 mb-3 form-control form-control-sm"
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
        </StartLabel>
    )
}
