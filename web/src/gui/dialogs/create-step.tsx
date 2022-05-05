import { createDefaultStep, getAllStepDescriptors, Operations, ParsedSteps, shallowEqual, StepDescriptor } from "cgv"
import { useCallback, useMemo, useState } from "react"
import { useBaseGlobal, useBaseStore } from "../../global"
import { CloseIcon } from "../../icons/close"

function getLabel(descriptor: StepDescriptor) {
    if (descriptor.type === "operation") {
        return descriptor.identifier
    }
    return descriptor.type
}

type DescriptorOptions = Array<{
    label: string
    descriptor: StepDescriptor | { type: "symbol"; identifier: string }
}>

function getStepDescriptors(operations: Operations<any, any>): DescriptorOptions {
    return getAllStepDescriptors(operations)
        .filter(({ type }) => type != "parallel" && type != "sequential")
        .map<{ label: string; descriptor: StepDescriptor }>((descriptor) => ({
            descriptor,
            label: getLabel(descriptor),
        }))
}

export function CreateStepDialog({ fulfill }: { fulfill: (value: any) => void }) {
    const store = useBaseStore()
    const { operations } = useBaseGlobal()
    const [filter, setFilter] = useState("")
    const stepDescriptors = useMemo(() => getStepDescriptors(operations), [operations])
    const nouns = store((state) => state.grammar.map(({ name }) => name), shallowEqual)
    const filteredDescriptors = useMemo(
        () =>
            stepDescriptors
                .concat(nouns.map((name) => ({ label: name, descriptor: { type: "symbol", identifier: name } })))
                .filter(({ label }) => label.toLocaleLowerCase().startsWith(filter.toLocaleLowerCase())),
        [filter, stepDescriptors, nouns]
    )
    const submit = useCallback(
        (descriptor: StepDescriptor | { type: "symbol"; identifier: string }) => {
            if (fulfill == null) {
                return
            }
            if (descriptor.type === "symbol") {
                fulfill(() => ({ type: "symbol", identifier: descriptor.identifier }))
                return
            }
            fulfill(() => createDefaultStep(descriptor, operations))
        },
        [fulfill]
    )
    return (
        <>
            <div className="d-flex flex-row mb-3">
                <input
                    onKeyDown={(e) =>
                        e.key === "Enter" &&
                        filteredDescriptors.length === 1 &&
                        submit(filteredDescriptors[0].descriptor)
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
                {filteredDescriptors.map(({ label, descriptor }) => (
                    <div className="rounded pointer p-3 border-bottom" onClick={() => submit(descriptor)} key={label}>
                        {label}
                    </div>
                ))}
            </div>
        </>
    )
}
