import { AbstractParsedSymbol, HierarchicalInfo, localizeNoun } from "cgv"
import { useBaseStore } from "../global"
import { StartLabel } from "./label"

export function GUISymbolStep({ value }: { value: AbstractParsedSymbol<HierarchicalInfo> }) {
    const store = useBaseStore()
    const localNouns = store((state) =>
        state.type === "gui" && state.selectedDescription != null
            ? state.grammar.map((noun) => localizeNoun(noun.name, state.selectedDescription!))
            : undefined
    )
    if (localNouns == null) {
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
                {localNouns.map((localNoun) => (
                    <option key={localNoun} value={localNoun}>
                        {localNoun}
                    </option>
                ))}
            </select>
        </StartLabel>
    )
}
