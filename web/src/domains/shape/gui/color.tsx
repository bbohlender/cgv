import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { useBaseStore } from "../../../global"

export function GUIColorStep({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const raw = value.children[0].type === "raw" ? value.children[0].value : undefined
    const store = useBaseStore()
    return (
        <input
            value={raw ?? 0xff0000}
            type="color"
            className="mx-3 mb-3 w-auto form-control form-control-sm"
            onChange={(e) =>
                store.getState().replace<"operation">((draft) => {
                    draft.children[0] = {
                        type: "raw",
                        value: e.target.value,
                    }
                }, value)
            }
        />
    )
}
