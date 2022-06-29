import { Pattern } from "cgv"
import { useBaseStore } from "../../global"
import { CloseIcon } from "../../icons/close"

//TODO: custom condition

export function SelectionPatternDialog({
    data: { patterns, title },
    fulfill,
}: {
    data: { patterns: Array<Pattern<any>>; title: string }
    fulfill: (value: Pattern<any>) => void
}) {
    const store = useBaseStore()
    return (
        <>
            <div className="d-flex flex-row align-items-center">
                <h5>{title}</h5>
                <div className="flex-grow-1" />
                <button
                    className="d-flex align-items-center ms-3 btn btn-sm btn-outline-secondary"
                    onClick={store.getState().cancelRequest}>
                    <CloseIcon />
                </button>
            </div>
            <div className="d-flex flex-column" style={{ overflowY: "auto" }}>
                {patterns.map((pattern, i) => (
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
