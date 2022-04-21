import { AbstractParsedSymbol, HierarchicalInfo } from "cgv"
import { useBaseStore } from "../global"
import { StartLabel } from "./label"

export function GUISymbolStep({ value }: { value: AbstractParsedSymbol<HierarchicalInfo> }) {
    const store = useBaseStore()
    const nouns = store((state) => (state.type === "gui" ? Object.keys(state.grammar) : undefined))
    if (nouns == null) {
        return null
    }
    return (
        <StartLabel value="Noun" className="mb-3 mx-3">
            <select
                value={value.identifier}
                onChange={(e) =>
                    store.getState().replace<"symbol">((draft) => {
                        draft.identifier = e.currentTarget.value
                    }, value)
                }
                className="flex-grow-1 w-auto form-select form-select-sm">
                {nouns.map((noun) => (
                    <option key={noun} value={noun}>
                        {noun}
                    </option>
                ))}
            </select>
        </StartLabel>
    )
}
