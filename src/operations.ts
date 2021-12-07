import { Attribute, Instance } from "."

export function addAttribute<T>(instance: Instance<T>, name: string, attribute: Attribute): Instance<T> {
    return new Instance(
        instance.id,
        instance.symbol,
        instance.value,
        { [name]: attribute, ...instance.attributes },
        instance.parameters
    )
}
