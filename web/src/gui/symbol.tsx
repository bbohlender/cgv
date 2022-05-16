import { AbstractParsedSymbol, HierarchicalInfo, isNounOfDescription, localizeNoun } from "cgv"
import { useBaseStore } from "../global"
import { StartLabel } from "./label"

export function GUISymbolStep({ step }: { step: AbstractParsedSymbol<HierarchicalInfo> }) {
    const store = useBaseStore()
    const selectedDescription = store((state) => (state.type === "gui" ? state.selectedDescription : undefined))
    const selectedNoun = store((state) =>
        state.type === "gui" && state.selectedDescription != null
            ? localizeNoun(step.identifier, state.selectedDescription)
            : undefined
    )
    const localNouns = store((state) =>
        state.type === "gui" && state.selectedDescription != null
            ? state.grammar.map((noun) => localizeNoun(noun.name, state.selectedDescription!))
            : undefined
    )
    if (localNouns == null || selectedDescription == null) {
        return null
    }
    return (
        <>
            <StartLabel value="Noun" className="mb-3 mx-3">
                <select
                    value={selectedNoun}
                    onChange={(e) =>
                        store.getState().replace<"symbol">((draft) => {
                            draft.identifier = e.currentTarget.value
                        }, step)
                    }
                    className="flex-grow-1 form-select form-select-sm">
                    {localNouns.map((localNoun) => (
                        <option key={localNoun} value={localNoun}>
                            {localNoun}
                        </option>
                    ))}
                </select>
            </StartLabel>
            {selectedNoun != null && selectedNoun.includes("@") && (
                <div
                    className="mb-3 mx-3 btn btn-outline-secondary"
                    onClick={() => store.getState().copyNoun(step, selectedNoun)}>
                    Copy to {selectedDescription}
                </div>
            )}
        </>
    )
}
