import { BlurInput } from "./blur-input"
import { UseBaseStore, useBaseStore } from "../global"
import { getDescriptionOfNoun, globalizeNoun, localizeNoun } from "cgv"
import { CopyButton } from "./success-button"

export function GUINounStep({ value, descriptionName }: { descriptionName: string; value: string }) {
    const store = useBaseStore()
    const realDescriptionName = getDescriptionOfNoun(value)
    return (
        <div className="d-flex flex-column">
            <div className="d-flex flex-row align-items-center mx-3 mb-2 w-auto">
                <BlurInput
                    value={localizeNoun(value, realDescriptionName)}
                    className="flex-grow-1 form-control form-control-sm"
                    onBlur={(e) => store.getState().renameNoun(globalizeNoun(e.target.value, realDescriptionName))}
                />
                {realDescriptionName !== descriptionName && <span className="ms-1">@{descriptionName}</span>}
            </div>
            <CopyButton
                className="mb-3 mx-3 btn btn-sm btn-outline-secondary"
                onCopy={() => copyReference(store, value)}>
                Copy Reference
            </CopyButton>
        </div>
    )
}

function copyReference(store: UseBaseStore, identifier: string): string {
    const state = store.getState()
    if (state.type !== "gui") {
        return ""
    }
    return JSON.stringify({
        step: { type: "symbol", identifier },
    })
}
