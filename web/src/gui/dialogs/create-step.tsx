import { createDefaultStep, getAllStepDescriptors, Operations, ParsedSteps, ParsedSymbol, StepDescriptor } from "cgv"
import { useCallback, useMemo, useState } from "react"
import { useBaseGlobal, useBaseStore } from "../../global"
import { CloseIcon } from "../../icons/close"

function getLabel(descriptor: StepDescriptor | { type: "symbol" }) {
    if (descriptor.type === "operation") {
        return descriptor.identifier
    }
    return descriptor.type
}

function getStepDescriptors(operations: Operations<any, any>) {
    return getAllStepDescriptors(operations)
        .filter(({ type }) => type != "parallel" && type != "sequential")
        .map<{ label: string; descriptor: StepDescriptor | { type: "symbol" } }>((descriptor) => ({
            descriptor,
            label: getLabel(descriptor),
        }))
        .concat({
            label: "symbol",
            descriptor: {
                type: "symbol",
            },
        })
}

export function CreateStepDialog({ fulfill }: { fulfill: (value: any) => void }) {
    const store = useBaseStore()
    const { operations } = useBaseGlobal()
    const [filter, setFilter] = useState("")
    const stepDescriptors = useMemo(() => getStepDescriptors(operations), [operations])
    const filteredDescriptors = useMemo(
        () => stepDescriptors.filter(({ label }) => label.toLocaleLowerCase().startsWith(filter.toLocaleLowerCase())),
        [filter]
    )
    const submit = useCallback(
        (descriptor: StepDescriptor | { type: "symbol" }) => {
            if (fulfill == null) {
                return
            }
            createStep(descriptor, store.getState().request, fulfill, operations)
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
                {filteredDescriptors.map(({ label, descriptor }, i) => (
                    <div className="rounded pointer p-3 border-bottom" onClick={() => submit(descriptor)} key={label}>
                        {label}
                    </div>
                ))}
            </div>
        </>
    )
}

function createStep(
    descriptor: StepDescriptor | { type: "symbol" },
    request: (type: string, fulfill: (value: any) => void) => void,
    response: (stepGenerator: () => ParsedSteps) => void,
    operations: Operations<any, any>
) {
    if (descriptor.type === "symbol") {
        request("select-noun", (noun) => {
            response(() => ({ type: "symbol", identifier: noun }))
        })
    } else {
        response(() => createDefaultStep(descriptor, operations))
    }
}
