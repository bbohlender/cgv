# CGV

_Computer Generated Verse_

## Development

1. `npm install` to install the library dependencies
2. `npm run build` to build the cgv library
3. `cd web` to move into the frontend folder
4. `npm run install` to install the frontend dependencies
5. `npm run dev` to start the frontend

`now access http://localhost:3000/shape or http://localhost:3000/arithmetic to access the respective domain editor`

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
-   **`Constants`**
    -   constants can be numbers (`1`, `10.12`), strings (using quotation `""`) and booleans (true/false)
-   **`Variables`**
    -   using `this.<name>` the variable with the name `name` can be retriveved
    -   _WIP_ writing to a variable called `name` can be done using `this.<name> = 1`
-   **`Special Tokens`**
    -   `this` - _does nothing_ - used to represent the current value (similar to this in OOP)
    -   `return` - _returns out of the current symbol and back to where the symbol was called_ - terminates the execution of the current symbol prematurely (similar to most programming lanuages)
    -   `+ - * /` - arithemtic operators (similar to most programming languages)
    -   `> < == <= >=` - comparison operators (similar to most programming languages)
    -   `&& || !` - boolean operators (similar to most programming languages)
    -   `if then else switch case` - conditional operators (similar to most programming languages)

### Operator Precendence

Except for the parallel and sequential execution the precendence of all operators is implemented according to the operator precendence in c++ (https://en.cppreference.com/w/cpp/language/operator_precedence). Operator precedence is common and equal for most programming langugages.

## Glossary

-   grammar - a set of rules
-   rule - a sequence of steps
-   step - alters the current value done by a operator/constant/symbol
-   operators - identifies a function defined in the domain, which take the current value and the given parameters and returns the new current value
-   constant - identifies a constant
-   variable - memorized value bound to the current value/context and identified with a name
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

_Recursion_

```
a -> { 90%: 1 | a 10%: 0 }
```

_Premature termination_

_the following example returns 10 since the execution is terminated before the current value is changed to 20_

```
a -> 10 return 20
```

_currently not working, cause the event operator is missing_

```
a -> 1 + 2 max | 4 max

max -> event("a => {
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
}")
```

### Shape

`Building a Cube`

```
a -> face(
	point(0,0,100),
	point(0,0,0),
	point(100,0,00),
	point(100,0,100)
)

extrude(100)
```

`Streets`

```
a -> point(0,0,0) right
(this | toPoints() select(1,2) (right | left)
(this | toPoints() select(1,2) left
(this | toPoints() select(1,2) right
(this | toPoints() select(1,2) left))))

left -> rotate(0, 45, 0) extrude(300)

right -> rotate(0, -45, 0) extrude(300)

forward -> extrude(300)
```

`Recursion`

```
a -> translate(0, 10, 0) if (random(0,1) > 0.5) then a else this
```

`Forest` (currently not working - reimplementation of sample and load)

```
Forest -> sample2d(10) replace("/tree.gltf")
```

`City 1` (currently not working - reimplementation of expand and sample)

```
City -> if(this.type == "road") then Road else Building

Road -> expand(20) (this | sample(30) load("/tree.gltf"))

Building -> expand(200)
```

`Task 1`

```
Start -> face(
	point(10,0,90),
	point(-30,0,0),
	point(80,0,10),
	point(60,0,60)
) -> Lot

Lot -> color("#333343") -> extrude(60) -> toFaces() -> (select(0, 4) -> Wall | select(4, 5) -> Roof)

Wall -> split("z", 20) -> Floor

Roof -> color("#881111")

Floor -> split("x", 20) -> WindowFrame

WindowFrame -> if size("x") >= 20
	then {
		multiSplit("x", 5, 10) -> switch index() {
			case 0: this
			case 1:
				multiSplit("z", 5, 10) -> switch index() {
					case 0: this
					case 1: Window
					case 2: this
                }
			case 2: this
        }
    } else {
        this
    }

Window -> color("#EEEEEE")
```

`Task 2`

```
City -> color("#333343") extrude(random(400, 600)) toFaces() (select(0, 4) Wall | select(4, 5) Roof)

Wall -> splitZ(random(150, 250)) Floor

Roof -> color("#8881111")

Floor -> if (size("z") >= 140)
    then (
        splitX(random(150, 250)) WindowFrame
    )
    else this

WindowFrame -> if (size("x") >= 150)
	then (
		multiSplitX(40, 100) switch index()
			case 0: this
			case 1: (
				multiSplitZ(50, 100) switch index()
					case 0: this
					case 1: Window
					case 2: this
			)
			case 2: this
	)
	else this

Window -> color("#EEEEEE")
```

`Task 3`

```
City -> color(0x333343) if (this.blockId == 0) then LowBuilding else HighBuilding

HighBuilding -> extrude(random(800, 1200)) Building

LowBuilding -> extrude(random(200, 600)) Building

Building -> toFaces() (select(0, 4) Wall | select(4, 5) Roof)

Roof -> if (this.blockId == 0) then color(0x8881111) else color(0x111111)

Wall -> splitZ(random(190, 250)) Floor

Floor -> if (size("z") >= 190)
    then (
        splitX(200) if (this.blockId == 0) then SmallTile else BigTile
    )
    else this

BigTile -> if (size("x") >= 200)
    then (
        multiSplitX(10, 190) switch index()
            case 0: this
            case 1: (
                multiSplitZ(40, 150) switch index()
                    case 0: this
                    case 1: Window
                    case 2: this
            )
            case 2: this
    )
    else this

SmallTile -> if (size("x") >= 180)
    then (
        multiSplitX(50, 100) switch index()
            case 0: this
            case 1: (
                multiSplitZ(50, 100) switch index()
                    case 0: this
                    case 1: Window
                    case 2: this
            )
            case 2: this
    )
    else this

Window -> extrude(-20) toFaces() (select(0, 4) | select(4, 5) color(0xEEEEEE))
```

# TODO after 14.04:

- performance:
    - steps map (no more translation from path => steps, just look it up)
    - no steps in selections (go back to indices- & selectionMap)
    - bundle editIndex calls
    - improve viewer
- show outlines for intermediate results
- getOutline on primitive (store primitive)
- disable remove & replace when beforeIndex not found && selectedIndices.length != allIndices.length
- disable add (after/before/parallel) when afterIndex not found && selectedIndices.length != allIndices.length
- remove/replace/add based on before/after index
- fix interpretion tests
- parent selection through multiselect
- add grammars and show grammars (+ make sure that grammars can be clicked through in the gui + small (back) button to go to parent)
- roof
----
- more complex selection pattern recognition
- simplification after edit
- set-name (instead of add symbol) as button on gui
- search nouns in create-step-dialog (also from other grammars) instead of symbol => select noun
- summarize and concretize!