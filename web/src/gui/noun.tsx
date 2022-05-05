import { BlurInput } from "./blur-input"
import { useBaseStore } from "../global"
import { getDescriptionOfNoun, globalizeNoun, localizeNoun } from "cgv"

export function GUINounStep({ value, descriptionName }: { descriptionName: string; value: string }) {
    const store = useBaseStore()
    const realDescriptionName = getDescriptionOfNoun(value)
    return (
        <div className="d-flex flex-row align-items-center mx-3 mb-3 w-auto">
            <BlurInput
                value={localizeNoun(value, realDescriptionName)}
                className="flex-grow-1 form-control form-control-sm"
                onBlur={(e) => store.getState().renameNoun(globalizeNoun(e.target.value, realDescriptionName))}
            />
            {realDescriptionName !== descriptionName && <span className="ms-1">@{descriptionName}</span>}
        </div>
    )
}
