import {
    createDefaultStep,
    Distributions,
    findDistributions,
    getAllStepDescriptors,
    getDescriptionOfNoun,
    globalizeDescription,
    globalizeStep,
    HierarchicalPath,
    Operations,
    ParsedGrammarDefinition,
    ParsedSteps,
    StepDescriptor,
    toHierarchical,
} from "cgv"
import { freeze } from "immer"
import { useCallback, useMemo, useState } from "react"
import { EditInfo } from "../../base-state"
import { useBaseGlobal, useBaseStore } from "../../global"
import { CloseIcon } from "../../icons/close"
import { PasteButton } from "../success-button"
import { SelectInstanceDialog } from "./select-instance"

type Options = Array<{
    label: string
    onSelect: () => void
}>

function getStepOptions(operations: Operations<any>, onSelectStep: (value: StepDescriptor) => void): Options {
    return getAllStepDescriptors(operations)
        .filter(({ type }) => type != "parallel" && type != "sequential")
        .map((descriptor) => ({
            label: descriptor.type === "operation" ? descriptor.identifier : descriptor.type,
            onSelect: onSelectStep.bind(null, descriptor),
        }))
}

export function CreateStepDialog({ fulfill, data }: { data: EditInfo; fulfill: (value: any) => void }) {
    const store = useBaseStore()
    const { operations } = useBaseGlobal()
    const [filter, setFilter] = useState("")
    const [selectInstanceDialogData, setSelectInstanceDialogData] = useState<
        | { dependencies: ParsedGrammarDefinition; info: EditInfo; step: ParsedSteps; distributions: Distributions }
        | undefined
    >(undefined)
    const stepOptions = useMemo(
        () =>
            getStepOptions(operations, (descriptor) => {
                store.getState().edit({
                    ...data,
                    stepGenerator: () => createDefaultStep(descriptor, operations),
                })
                fulfill(null)
            }),
        [fulfill, data, operations]
    )

    const onPaste = useCallback(
        async (randomize: boolean) => {
            const text = await navigator.clipboard.readText()
            try {
                const { step, dependencies } = JSON.parse(text)
                const info: EditInfo = {
                    ...data,
                    stepGenerator: (path: HierarchicalPath) =>
                        globalizeStep(JSON.parse(text).step, getDescriptionOfNoun(path[0]), ...path),
                    dependenciesGenerator: (descriptionName: string) => {
                        const parsed = JSON.parse(text)
                        if (parsed.dependencies == null) {
                            return undefined
                        }
                        return toHierarchical(globalizeDescription(freeze(parsed.dependencies), descriptionName))
                    },
                }
                const distributions = findDistributions(step, dependencies)
                if (distributions.length === 0) {
                    store.getState().edit(info, randomize)
                    fulfill(null)
                    return
                }
                setSelectInstanceDialogData({
                    info,
                    step,
                    dependencies,
                    distributions,
                })
            } catch (e) {
                //TODO: notify user
            }
        },
        [store]
    )

    const filteredOptions = useMemo(
        () => stepOptions.filter(({ label }) => label.toLocaleLowerCase().includes(filter.toLocaleLowerCase())),
        [filter, stepOptions]
    )

    if (selectInstanceDialogData != null) {
        return <SelectInstanceDialog fulfill={fulfill} {...selectInstanceDialogData} />
    }

    return (
        <>
            <div className="d-flex flex-row mb-2">
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
            <div className="d-flex flex-row">
                <PasteButton
                    className="mb-2 btn-btn-sm button-secondary btn-outline-secondary flex-grow-1"
                    onPaste={onPaste.bind(null, false)}>
                    Paste Unrandomized
                </PasteButton>
                <PasteButton
                    className="mb-2 btn-btn-sm button-secondary btn-outline-secondary ms-2 flex-grow-1"
                    onPaste={onPaste.bind(null, true)}>
                    Paste Randomized
                </PasteButton>
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
