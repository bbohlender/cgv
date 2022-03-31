import { BlurInput } from "./blur-input"
import { useStore } from "../global"

export function GUINounStep({ value }: { value: string }) {
    const store = useStore()
    return (
        <BlurInput
            value={value}
            className="mx-3 mb-3 w-auto form-control form-control-sm"
            onBlur={(e) => store.getState().rename(e.target.value)}
        />
    )
}
