import {
    DependencyMap,
    globalizeDescription,
    localizeNoun,
    ParsedGrammarDefinition,
    shallowEqual,
    summarize,
} from "cgv"
import { useCallback, useMemo, useState } from "react"
import { useBaseStore } from "../../global"
import { CheckIcon } from "../../icons/check"
import { CloseIcon } from "../../icons/close"
import { EndLabel } from "../label"

export function SummarizeDialog({ fulfill }: { fulfill: (value: any) => void }) {
    const store = useBaseStore()
    const [filter, setFilter] = useState("")
    const nounNames = store((state) => state.grammar.map(({ name }) => name), shallowEqual)
    const [selectedNounNames, setSelectedNounNames] = useState<Array<string>>([])
    const filteredNounNames = useMemo(
        () => nounNames.filter((name) => name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())),
        [filter, nounNames]
    )
    const selectAll = useCallback(
        () =>
            setSelectedNounNames((selectedNounNames) => {
                const result = [...selectedNounNames]
                for (const filteredNounName of filteredNounNames) {
                    if (!result.includes(filteredNounName)) {
                        result.push(filteredNounName)
                    }
                }
                return result
            }),
        [filteredNounNames]
    )
    const unselectAll = useCallback(
        () =>
            setSelectedNounNames((selectedNounNames) =>
                selectedNounNames.filter((name) => !filteredNounNames.includes(name))
            ),
        [filteredNounNames]
    )

    return (
        <>
            <div className="d-flex flex-row mb-3">
                <input
                    onKeyDown={
                        (e) => e.key === "Enter" && selectedNounNames.length >= 1 && null //TODO: execute summarization
                    }
                    autoFocus
                    type="text"
                    className="form-control form-control-sm"
                    onChange={(e) => setFilter(e.target.value)}
                    value={filter}
                    placeholder="Search"
                />
                <button
                    className="d-flex h-100 align-items-center ms-3 btn btn-sm btn-outline-secondary"
                    onClick={() => {
                        const nounName = store.getState().addSummary(selectedNounNames)
                        if (nounName != null) {
                            fulfill(() => ({
                                type: "symbol",
                                identifier: nounName,
                            }))
                        }
                    }}>
                    <CheckIcon />
                </button>
                <button
                    className="d-flex h-100 align-items-center ms-3 btn btn-sm btn-outline-secondary"
                    onClick={store.getState().cancelRequest}>
                    <CloseIcon />
                </button>
            </div>
            <div className="d-flex flex-column" style={{ overflowY: "auto" }}>
                <div className="btn-group w-100 mb-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={selectAll}>
                        Select All
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={unselectAll}>
                        Unselect All
                    </button>
                </div>
                {filteredNounNames.map((nounName) => {
                    const checked = selectedNounNames.includes(nounName)
                    return (
                        <div key={nounName} className="m-2">
                            <EndLabel value={nounName}>
                                <input
                                    onChange={() =>
                                        setSelectedNounNames(
                                            checked
                                                ? selectedNounNames.filter((n) => n != nounName)
                                                : selectedNounNames.concat(nounName)
                                        )
                                    }
                                    type="checkbox"
                                    checked={checked}
                                />
                            </EndLabel>
                        </div>
                    )
                })}
            </div>
        </>
    )
}
