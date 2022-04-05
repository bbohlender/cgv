import { useState } from "react"
import { useBaseStore } from "../../global"
import { CheckIcon } from "../../icons/check"
import { CloseIcon } from "../../icons/close"
import { StartLabel } from "../label"

export function SelectNounDialog({ fulfill }: { fulfill: (value: any) => void }) {
    const store = useBaseStore()
    const [value, setValue] = useState<string | undefined>(undefined)
    const nouns = store((state) => (state.type === "gui" ? Object.keys(state.grammar) : undefined))
    if (nouns == null) {
        return null
    }
    return (
        <>
            <StartLabel className="mb-3" value="Noun">
                <select value={value} onChange={(e) => setValue(e.target.value)} className="form-select form-select-sm">
                    {nouns.map((noun) => (
                        <option value={noun}>{noun}</option>
                    ))}
                </select>
            </StartLabel>

            <div className="d-flex flex-row align-items-center">
                <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() =>
                        store.getState().request("create-noun", (name) => {
                            //TODO: add noun
                            fulfill(name)
                        })
                    }>
                    Add Noun
                </button>
                <div className="flex-grow-1" />
                <button
                    className="d-flex align-items-center ms-3 btn btn-sm btn-outline-secondary"
                    onClick={store.getState().cancelRequest}>
                    <CloseIcon />
                </button>

                <button
                    className="d-flex align-items-center ms-3 btn btn-sm btn-outline-secondary"
                    onClick={() => fulfill(value)}>
                    <CheckIcon />
                </button>
            </div>
        </>
    )
}
