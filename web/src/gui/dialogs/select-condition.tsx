import { ParsedSteps, serializeStepString } from "cgv"
import { useBaseStore } from "../../global"
import { CloseIcon } from "../../icons/close"

//TODO: custom condition

export function SelectionConditionDialog({
    data,
    fulfill,
}: {
    data: Array<ParsedSteps>
    fulfill: (value: ParsedSteps | undefined) => void
}) {
    const store = useBaseStore()
    return (
        <>
            <div className="d-flex flex-row align-items-center justify-content-end">
                <button
                    className="d-flex align-items-center ms-3 btn btn-sm btn-outline-secondary"
                    onClick={store.getState().cancelRequest}>
                    <CloseIcon />
                </button>
            </div>
            <div className="d-flex flex-column" style={{ overflowY: "auto" }}>
                <button onClick={fulfill.bind(null, undefined)} className="mt-3 btn btn-outline-primary w-100">
                    All
                </button>
                {data.map((step, i) => (
                    <button onClick={fulfill.bind(null, step)} className="mt-3 btn btn-outline-primary w-100" key={i}>
                        {serializeStepString(step)}
                    </button>
                ))}
            </div>
        </>
    )
}
