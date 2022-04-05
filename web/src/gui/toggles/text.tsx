import { Dispatch, HTMLProps, SetStateAction } from "react"
import { TextIcon } from "../../icons/text"

export function TextEditorToggle({
    setValue,
    value,
    className,
    ...rest
}: Omit<HTMLProps<HTMLDivElement>, "value"> & { value: boolean; setValue: Dispatch<SetStateAction<boolean>> }) {
    return (
        <div
            {...rest}
            onClick={() => setValue((v) => !v)}
            className={`${className} d-flex align-items-center justify-content-center btn ${
                value ? "btn-primary" : "btn-secondary"
            } btn-sm `}>
            <TextIcon />
        </div>
    )
}
