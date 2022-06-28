import {
    createDefaultStep,
    getAllStepDescriptors,
    getDescriptionOfNoun,
    globalizeDescription,
    globalizeStep,
    HierarchicalPath,
    Operations,
    StepDescriptor,
    toHierarchical,
} from "cgv"
import { freeze } from "immer"
import { useCallback, useMemo, useState } from "react"
import { useBaseGlobal, useBaseStore } from "../../global"
import { CloseIcon } from "../../icons/close"
import { PasteButton } from "../success-button"

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
        () =>
            getStepOptions(operations, (descriptor) =>
                fulfill({ step: () => createDefaultStep(descriptor, operations) })
            ),
        [fulfill, operations]
    )

    const onPaste = useCallback(async () => {
        const text = await navigator.clipboard.readText()
        try {
            fulfill({
                step: (path: HierarchicalPath) =>
                    globalizeStep(JSON.parse(text).step, getDescriptionOfNoun(path[0]), ...path),
                dependencies: (descriptionName: string) => {
                    const parsed = JSON.parse(text)
                    if (parsed.dependencies == null) {
                        return undefined
                    }
                    return toHierarchical(globalizeDescription(freeze(parsed.dependencies), descriptionName))
                },
            })
        } catch (e) {
            //TODO: notify user
        }
    }, [store])

    const filteredOptions = useMemo(
        () => stepOptions.filter(({ label }) => label.toLocaleLowerCase().includes(filter.toLocaleLowerCase())),
        [filter, stepOptions]
    )
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
            <PasteButton className="mb-2 btn-btn-sm button-secondary btn-outline-secondary" onPaste={onPaste}>
                Paste
            </PasteButton>
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
