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

-   `src` contains the source code for the core library including the domains in `src/domains`
-   `web` contains the frontend code in react (the pages for the respective editors)

## Language Design Decisions

\*The language expresses **procedural, conditional, stochastic grammars**, which are represented as a list of **`Rules`\***

The grammar is defined in [grammar.ne](./grammar.ne).

-   **`Rules`** - like in CGA ("**Lot --> Building**")
    -   begins with the name of the rule - called **`Symbol`**
    -   followed by `->` (simplified - "-->" in CGA)
    -   followed by **`Parallel Executions`**
-   **`Parallel Execution`** - similar to CGA ("Building --> comp(f){ front : FrontFacade **|** side : SideFacade **|** top: Roof}")
    -   seperates **`Sequential Executions`** using `|` (vertical bar)
-   **`Sequential Execution`** - like in CGA ("Lot --> **extrude(height) Building**")
    -   seperates **`Operations`**, **`Constants`** or **`Symbols`** using **`whitespace`**
-   **`Operations`** - like in CGA ("**color(wallColor)**")
    -   begins with the operation name (name is domain specific)
    -   followed by opening bracket `(`, the **`Parameters`** and a closing bracket `)`
-   **`Parameters`** - like in CGA ("s(**1,1,0.1**)")
    -   seperates **`Parallel Executions`** using commas `,`
-   **`Constants`** (_work in progress_)
    -   currently wrapped in quotation `"`
-   **`Variables`** (_work in progress_)

## Language Features ToDo

-   Domain Constants (e.g. `1` instead of `"1"`)
-   "Scoped" Variables (e.g. this.type)

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

_currently not working, cause the event operator is missing_

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

`Task 1`

```
City -> color("0x333343") extrude("600") faces() (select("0", "4") Wall | select("4", "5") Roof)

Wall -> splitZ("200") Floor

Roof -> color("0x8881111")

Floor -> splitX("200") WindowFrame

WindowFrame -> switchSizeX("200", this, multiSplitX("50", "100") switchIndex(this,  multiSplitZ("50", "100") switchIndex(this, Window, this), this))

Window -> color("0xEEEEEE")
```

`Task 2`

```
City -> color("0x333343") extrude(random("400", "600")) faces() (select("0", "4") Wall | select("4", "5") Roof)

Wall -> splitZ(random("150", "250")) Floor

Roof -> color("0x8881111")

Floor -> switchSizeZ("140", this, splitX(random("150", "250")) WindowFrame)

WindowFrame -> switchSizeX("150", this, multiSplitX("40", "100") switchIndex(this,  multiSplitZ("50", "100") switchIndex(this, Window, this), this))

Window -> color("0xEEEEEE")
```

`Task 3`

```
City -> color("0x333343") switchBlock(LowBuilding, HighBuilding)

HighBuilding -> extrude(random("800", "1200")) Building

LowBuilding -> extrude(random("200", "600")) Building

Building -> faces() (select("0", "4") Wall | select("4", "5") Roof)

Roof -> switchBlock(color("0x8881111"), color("0x111111"))

Wall -> splitZ(random("190", "250")) Floor

Floor -> switchSizeZ("190", this, splitX("200") switchBlock(SmallTile, BigTile))

BigTile -> switchSizeX("200", this, multiSplitX("10", "190") switchIndex(this,  multiSplitZ("40", "150") switchIndex(this, Window, this), this))

SmallTile -> switchSizeX("180", this, multiSplitX("50", "100") switchIndex(this,  multiSplitZ("50", "100") switchIndex(this, Window, this), this))

Window -> extrude("-20") faces() (select("0", "4") | select("4", "5") color("0xEEEEEE"))
```