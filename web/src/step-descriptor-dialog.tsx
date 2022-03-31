import { getAllStepDescriptors, getLabel, StepDescriptor } from "cgv"
import { operations } from "cgv/domains/shape"
import { useMemo, useState } from "react"
import { CloseIcon } from "./icons/close"

const stepDescriptors = getAllStepDescriptors(operations)
    .filter(({ type }) => type != "parallel" && type != "sequential")
    .map((descriptor) => ({
        descriptor,
        label: getLabel(descriptor),
    }))

export function StepDescriptorDialog({ onSelected }: { onSelected: (descriptor: StepDescriptor | undefined) => void }) {
    const [filter, setFilter] = useState("")
    const filteredDescriptors = useMemo(
        () => stepDescriptors.filter(({ label }) => label.toLocaleLowerCase().startsWith(filter.toLocaleLowerCase())),
        [filter]
    )
    return (
        <div
            className="position-absolute d-flex flex-column align-items-center overflow-hidden"
            style={{ inset: 0, zIndex: 2, background: "rgba(0,0,0,0.3)" }}>
            <div
                style={{ maxWidth: "40rem", margin: "0 auto" }}
                className="rounded overflow-hidden shadow d-flex flex-column m-3 p-3 w-100 bg-light">
                <div className="d-flex flex-row mb-3">
                    <input
                        onKeyDown={(e) =>
                            e.key === "Enter" &&
                            filteredDescriptors.length === 1 &&
                            onSelected(filteredDescriptors[0].descriptor)
                        }
                        autoFocus
                        type="text"
                        className="form-control form-control-sm"
                        onChange={(e) => setFilter(e.target.value)}
                        value={filter}
                        placeholder="Search"
                    />
                    <button
                        className="d-flex align-items-center ms-3 btn btn-sm btn-outline-secondary"
                        onClick={onSelected.bind(null, undefined)}>
                        <CloseIcon />
                    </button>
                </div>
                <div className="d-flex flex-column" style={{ overflowY: "auto" }}>
                    {filteredDescriptors.map(({ label, descriptor }, i) => (
                        <div
                            className="rounded pointer p-3 border-bottom"
                            onClick={onSelected.bind(null, descriptor)}
                            key={label}>
                            {label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
