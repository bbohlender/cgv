import { Operation } from ".";

export type Operations<T> = {
    [name in string]: Operation<T>
}

/*export function derive<T>(): Array<{}> {

}*/