import {
    getDescriptionOfNoun,
    getGlobalDescription,
    localizeDescription,
    multilineStringWhitespace,
    ParsedGrammarDefinition,
    serializeString,
    shallowEqual,
    summarize,
} from "cgv"
import { useCallback, useMemo, useState } from "react"
import { UseBaseStore, useBaseStore } from "../../global"
import { CheckIcon } from "../../icons/check"
import { CloseIcon } from "../../icons/close"
import { EndLabel } from "../label"
import { CopyButton } from "../success-button"

export function SummarizeDialog({ data }: { data: Array<string> }) {
    const [summary, setSummary] = useState<ParsedGrammarDefinition | undefined>(undefined)
    if (summary == null) {
        return <CreateSummary descriptions={data} onSummary={setSummary} />
    } else {
        return <ShowSummary summary={summary} />
    }
}

function ShowSummary({ summary }: { summary: ParsedGrammarDefinition }) {
    const store = useBaseStore()
    return (
        <>
            <div className="d-flex flex-row mb-3">
                <div className="flex-grow-1" />
                <button
                    className="d-flex h-100 align-items-center ms-3 btn btn-sm btn-outline-secondary"
                    onClick={store.getState().cancelRequest}>
                    <CloseIcon />
                </button>
            </div>
            <span style={{ overflowY: "auto", whiteSpace: "pre-wrap" }} className="p-3 rounded mb-3 text-light bg-dark text-editor p-1">
                {serializeString(summary, undefined, multilineStringWhitespace)}
            </span>
            <CopyButton
                className="btn btn-sm btn-outline-primary"
                onCopy={() =>
                    JSON.stringify({ step: { type: "symbol", identifier: summary[0].name }, dependencies: summary })
                }>
                Copy
            </CopyButton>
        </>
    )
}

function CreateSummary({
    descriptions,
    onSummary,
}: {
    descriptions: Array<string>
    onSummary: (summary: ParsedGrammarDefinition | undefined) => void
}) {
    const store = useBaseStore()
    const [filter, setFilter] = useState("")
    const nounNames = store((state) => state.grammar.map(({ name }) => name), shallowEqual)
    const [selectedNounNames, setSelectedNounNames] = useState<Array<string>>([])
    const filteredNounNames = useMemo(
        () =>
            nounNames.filter(
                (name) =>
                    descriptions.includes(getDescriptionOfNoun(name)) &&
                    name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())
            ),
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
                    onClick={() => onSummary(summarizeNouns(store, selectedNounNames))}>
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

function summarizeNouns(store: UseBaseStore, nouns: Array<string>): ParsedGrammarDefinition | undefined {
    const state = store.getState()
    if (state.type !== "gui") {
        return undefined
    }
    const dependencyMap = state.dependencyMap
    const descriptions = nouns.map((name) =>
        localizeDescription(getGlobalDescription(name, state.grammar, dependencyMap), undefined)
    )
    return summarize(...descriptions)
}
