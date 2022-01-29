# CGV

_Computer Generated Verse_

## Development

1. `npm install` to install the library dependencies
2. `npm run build` to build the cgv library
3. `cd web` to move into the frontend path
4. `npm run install` to install the frontend dependencies
5. `npm run dev` to start the frontend

`no access http://localhost:3000/shape or http://localhost:3000/arithmetic to access the respective domain editor`

### Folder Structure

* `src` contains the source code for the core library including the domains in `src/domains`
* `web` contains the frontend code in react (the pages for the respective editors)

## Language Design Decisions

*The language expresses **procedural, conditional, stochastic grammars**, which are represented as a list of **`Rules`***

The grammar is defined in [grammar.ne](./grammar.ne).

* **`Rules`** - like in CGA ("**Lot --> Building**")
   * begins with the name of the rule - called **`Symbol`**
   * followed by `->` (simplified - "-->" in CGA)
   * followed by **`Parallel Executions`**
* **`Parallel Execution`** - similar to CGA ("Building --> comp(f){ front : FrontFacade **|** side : SideFacade **|** top: Roof}")
   * seperates **`Sequential Executions`** using `|` (vertical bar)
* **`Sequential Execution`** - like in CGA ("Lot --> **extrude(height) Building**")
   * seperates **`Operations`**, **`Constants`** or **`Symbols`** using **`whitespace`**
* **`Operations`** - like in CGA ("**color(wallColor)**")
   * begins with the operation name (name is domain specific)
   * followed by opening bracket `(`, the **`Parameters`** and a closing bracket `)`
* **`Parameters`** - like in CGA ("s(**1,1,0.1**)")
   * seperates **`Parallel Executions`** using commas `,`
* **`Constants`** (*work in progress*)
   * currently wrapped in quotation `"`
* **`Variables`** (*work in progress*)

## Language Features ToDo

* Domain Constants (e.g. `1` instead of `"1"`)
* "Scoped" Variables (e.g. this.type)

## Glossary

-   grammar - a set of rules
-   rule - a sequence of steps
-   step - alters the current value done by a operator/constant/symbol
-   operators - identifies a function defined in the domain, which take the current value and the given parameters and returns the new current value
-   constant - identifies a constant defined in the domain
-   symbol - executes the rule identified by the symbol and sets the result as the new current value

-   domain - set of operations and valid constants in a certain area of knowledge (e.g. 3d objects / shapes with operators like extrude)

-   input - starting value (domain value)
-   parameters - values accessible throughout the grammar interpretion to influence the outcome
-   attributes - define parameters (e.g. name, type, min, max, ...) to make them editable in a UI

-   parse - the grammar definition in text form is parsed into a interpretable object representation
-   interprete - executes the steps defined in the grammar on the input, respecting the inserted parameters and returning the result

-   sequential step - the input value is mutated
-   parallel step - the input is split/cloned into multiple values

-   premature termination - the interpretion is cancelled before all possible steps are exhausted (reducing execution time but returning an unfinished/earlier result)

## Test Grammars

### Arithmetic

*currently not working, cause the event operator is missing*

```
a -> sum("1", "2") max | "4" max

max -> event("'a => {
   let max = 0
   let maxI = 0
   let maxII = 0;
   a.forEach((b, i) => b.forEach((c, ii) => {
      if(c > max) {
          max = c
          maxI = i
          maxII = ii
      }
   }))
   return a.map((b, i) => maxI === i ? b.filter((c,ii) => maxII === ii) : [])
}"')
```

### Shape

`Recursion`

```
a -> translate("0", "100", "0") terminateRandomly() a
```

`Forest`

```
Forest -> sample2d("10") replace("'/tree.gltf'")
```

`City 1`

```
City -> switchType(Road, Building)

Road -> expand2d("20") (this | sample2d("30") replace("'/tree.gltf'"))

Building -> translate("0", "100", "0") | lines() connect(translate("0", "100", "0"), this)
```

`City 2`

*not working - incomplete*

```
a -> extrude(this | 3) faces(this) (filter(this | horizontal) walls) | (filter(this | upwards) roof)

roof -> switch(this | attribute(enum | "roof1" | "roof2") | roof1 | roof2)

roof2 -> this
roof1 -> connectAll(center(this) translate(this | 0 | attribute(float | 0 | 3) | 0) | lines(this))

walls -> split2d(this | horizontal | 3) split2d(this | vertical | 3) window
window -> setback(this | 0.5) extrude(this | -0.1)
```
