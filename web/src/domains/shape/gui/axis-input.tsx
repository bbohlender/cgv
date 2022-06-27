import { HTMLProps } from "react"

export function AxisInput({ ...rest }: HTMLProps<HTMLSelectElement>) {
    return (
        <select {...rest}>
            <option value="x">X</option>
            <option value="y">Y</option>
            <option value="z">Z</option>
        </select>
    )
}
