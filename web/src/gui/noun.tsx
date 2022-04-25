import { BlurInput } from "./blur-input"
import { useBaseStore } from "../global"

export function GUINounStep({ value }: { value: string }) {
    const store = useBaseStore()
    return (
        <BlurInput
            value={value}
            className="mx-3 mb-3 w-auto form-control form-control-sm"
            onBlur={(e) => store.getState().renameNoun(e.target.value)}
        />
    )
}
