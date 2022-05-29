import { Pattern } from "cgv"
import { useBaseStore } from "../../global"
import { CloseIcon } from "../../icons/close"

//TODO: custom condition

export function SelectionPatternDialog({
    data,
    fulfill,
}: {
    data: Array<Pattern<any, any>>
    fulfill: (value: Pattern<any, any>) => void
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
                {data.map((pattern, i) => (
                    <button
                        onClick={fulfill.bind(null, pattern)}
                        className="mt-3 btn btn-outline-primary w-100"
                        key={i}>
                        {pattern.description}
                    </button>
                ))}
            </div>
        </>
    )
}
