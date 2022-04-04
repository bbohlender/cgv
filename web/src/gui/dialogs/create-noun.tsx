import { useCallback, useMemo, useState } from "react"
import { Dialog } from "."
import { useBaseStore } from "../../global"
import { CheckIcon } from "../../icons/check"
import { CloseIcon } from "../../icons/close"

export function CreateNounDialog() {
    const store = useBaseStore()
    const fulfill = store((state) =>
        state.type == "gui" && state.requested?.type === "create-noun" ? state.requested.fulfill : undefined
    )
    const [value, setValue] = useState("")
    const valueValid = useMemo(() => {
        if (value.length === 0) {
            return false
        }
        const state = store.getState()
        return state.type != "gui" || Object.keys(state.grammar).includes(value)
    }, [value])
    const submit = useCallback(
        (value: string) => {
            if (fulfill == null) {
                return
            }
            store.getState().createNoun(value)
            fulfill(value)
        },
        [fulfill]
    )
    if (fulfill == null) {
        return null
    }
    return (
        <Dialog>
            <input
                onKeyDown={(e) => e.key === "Enter" && submit(value)}
                autoFocus
                type="text"
                className="form-control form-control-sm mb-3"
                onChange={(e) => setValue(e.target.value)}
                value={value}
                placeholder="Noun name"
            />
            <div className="d-flex flex-row align-items-center justify-content-end">
                <button
                    className="d-flex align-items-center ms-3 btn btn-sm btn-outline-secondary"
                    onClick={store.getState().cancelRequest}>
                    <CloseIcon />
                </button>

                <button
                    className="d-flex align-items-center ms-3 btn btn-sm btn-outline-secondary"
                    onClick={() => submit(value)}
                    disabled={valueValid}>
                    <CheckIcon />
                </button>
            </div>
        </Dialog>
    )
}
