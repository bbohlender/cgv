import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { BlurInput } from "../../../gui/blur-input"
import { useStore } from "../../../global"

export function GUIExtrudeStep({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const raw = value.children[0].type === "raw" ? value.children[0].value : undefined
    const store = useStore()
    return (
        <BlurInput
            value={raw ?? 0xff0000}
            type="number"
            className="mx-3 mb-3 w-auto form-control form-control-sm"
            onBlur={(e) =>
                store.getState().change(value, {
                    type: "operation",
                    identifier: "extrude",
                    children: [
                        {
                            type: "raw",
                            value: e.target.valueAsNumber,
                        },
                    ],
                })
            }
        />
    )
}
