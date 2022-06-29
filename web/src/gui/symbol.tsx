import { AbstractParsedSymbol, HierarchicalInfo, localizeNoun } from "cgv"
import { UseBaseStore, useBaseStore } from "../global"
import { StartLabel } from "./label"

export function GUISymbolStep({
    step,
    description,
}: {
    description: string
    step: AbstractParsedSymbol<HierarchicalInfo>
}) {
    const store = useBaseStore()
    const selectedNoun = store((state) =>
        state.type === "gui" && state.selectedDescriptions != null
            ? localizeNoun(step.identifier, description)
            : undefined
    )
    const localNouns = store((state) =>
        state.type === "gui" && state.selectedDescriptions != null
            ? state.grammar.map((noun) => localizeNoun(noun.name, description))
            : undefined
    )
    if (localNouns == null) {
        return null
    }
    return (
        <>
            <StartLabel value="Noun" className="mb-3 mx-3">
                <select
                    value={selectedNoun}
                    onChange={(e) =>
                        store.getState().replace<"symbol">(
                            (draft) => {
                                draft.identifier = e.currentTarget.value
                            },
                            step
                        )
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
                    onClick={() => store.getState().pasteNoun(description, step, selectedNoun)}>
                    Paste to {description}
                </div>
            )}
        </>
    )
}
