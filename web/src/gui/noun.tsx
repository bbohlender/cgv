import { BlurInput } from "./blur-input"
import { useBaseStore } from "../global"
import { localizeStepsSerializer } from "cgv"

export function GUINounStep({ value, descriptionName }: { descriptionName: string; value: string }) {
    const store = useBaseStore()
    return (
        <BlurInput
            value={localizeStepsSerializer(descriptionName, value)}
            className="mx-3 mb-3 w-auto form-control form-control-sm"
            onBlur={(e) => store.getState().renameNoun(e.target.value, descriptionName)}
        />
    )
}
