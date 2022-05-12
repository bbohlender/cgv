import {
    createDefaultStep,
    getAllStepDescriptors,
    localizeNoun,
    Operations,
    ParsedSteps,
    shallowEqual,
    StepDescriptor,
} from "cgv"
import { useCallback, useMemo, useState } from "react"
import { useBaseGlobal, useBaseStore } from "../../global"
import { CloseIcon } from "../../icons/close"

type Options = Array<{
    label: string
    onSelect: () => void
}>

function getStepOptions(operations: Operations<any, any>, onSelectStep: (value: StepDescriptor) => void): Options {
    return getAllStepDescriptors(operations)
        .filter(({ type }) => type != "parallel" && type != "sequential")
        .map((descriptor) => ({
            label: descriptor.type === "operation" ? descriptor.identifier : descriptor.type,
            onSelect: onSelectStep.bind(null, descriptor),
        }))
}

export function CreateStepDialog({ fulfill }: { fulfill: (value: any) => void }) {
    const store = useBaseStore()
    const { operations } = useBaseGlobal()
    const [filter, setFilter] = useState("")
    const stepOptions = useMemo(
        () => getStepOptions(operations, (descriptor) => fulfill(() => createDefaultStep(descriptor, operations))),
        [fulfill, operations]
    )
    const nouns = store(
        (state) =>
            state.selectedDescription == null
                ? []
                : state.grammar.map(({ name }) => ({
                      globalName: name,
                      localName: localizeNoun(name, state.selectedDescription!),
                  })),
        shallowEqual
    )
    const filteredOptions = useMemo(
        () =>
            stepOptions
                .concat(
                    nouns.map(({ globalName, localName }) => ({
                        label: localName,
                        onSelect: () => fulfill(() => ({ type: "symbol", identifier: globalName })),
                    }))
                )
                .concat({
                    label: "summarize",
                    onSelect: () => store.getState().request("summarize", fulfill),
                })
                .filter(({ label }) => label.toLocaleLowerCase().includes(filter.toLocaleLowerCase())),
        [filter, stepOptions, nouns, fulfill]
    )
    return (
        <>
            <div className="d-flex flex-row mb-3">
                <input
                    onKeyDown={(e) =>
                        e.key === "Enter" && filteredOptions.length === 1 && filteredOptions[0].onSelect()
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
                    onClick={store.getState().cancelRequest}>
                    <CloseIcon />
                </button>
            </div>
            <div className="d-flex flex-column" style={{ overflowY: "auto" }}>
                {filteredOptions.map(({ label, onSelect }) => (
                    <div className="rounded pointer p-3 border-bottom" onClick={onSelect} key={label}>
                        {label}
                    </div>
                ))}
            </div>
        </>
    )
}
