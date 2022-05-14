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
    -   followed by `-->`
    -   followed by **`Parallel Executions`**
-   **`Parallel Execution`** - similar to CGA ("Building --> comp(f){ front : FrontFacade **|** side : SideFacade **|** top: Roof}")
    -   seperates **`Sequential Executions`** using `|` (vertical bar)
-   **`Sequential Execution`** - like in CGA ("Lot --> **extrude(height) Building**")
    -   seperates **`Operations`**, **`Constants`** or **`Symbols`** using **`->`**
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
a --> { 90%: 1 | a 10%: 0 }
```

_Premature termination_

_the following example returns 10 since the execution is terminated before the current value is changed to 20_

```
a --> 10 return 20
```

_currently not working, cause the event operator is missing_

```
a --> 1 + 2 max | 4 max

max --> event("a => {
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
a --> face(point2(0, 100), point2(0, 0), point2(100, 0), point2(100, 100)) -> extrude(100)
```

`Streets`

```
a --> point2(0, 0) -> right -> (this | toPoints() -> select(1, 2) -> (right | left) -> (this | toPoints() -> select(1, 2) -> left -> (this | toPoints() -> select(1, 2) -> right -> (this | toPoints() -> select(1, 2) -> left))))

left --> rotate(0, 45, 0) -> extrude(30)

right --> rotate(0, -45, 0) -> extrude(30)

forward --> extrude(30)
```

`Recursion`

```
a --> mapbox() -> t
t --> translate(0, 10, 0) -> { 50%: t 50%: this }
```

`Forest`

```
Start --> face(point2(358.16, -152.34), point2(288.3, -30.32), point2(269.68, -117.46)) -> sample(10) -> load("/cgv/tree.gltf") -> scale(100, 100, 100)
```

`City 1` (currently not working - reimplementation of expand and sample)

```
City --> if(this.type == "road") then Road else Building

Road --> expand(20) (this | sample(30) load("/tree.gltf"))

Building --> expand(200)
```

`Task 1`

```
Start --> face(point2(26.09, 136.11), point2(29.84, 51.57), point2(110.36, 53.93), point2(107.5, 136.39)) -> Lot

Lot --> color("#333343") -> extrude(60) -> toFaces() -> if index() < 4 then { Wall } else { Roof }

Wall --> split("z", 20) -> Floor

Roof --> color("#881111") -> extrude(30) -> gableRoof()

Floor --> split("x", 20) -> WindowFrame

WindowFrame --> if size("x") >= 15 then { multiSplit("x", 5, 10) -> switch index() { case 0: this case 1: if id() == "0,0,1,1" then { multiSplit("z", 0, 18) } else { multiSplit("z", 5, 10) } -> switch index() { case 0: this case 1: Window case 2: this } case 2: this } } else { this }

Window --> if id() == "0,0,1,1,1" then { color("#964808") } else { color("#EEEEEE") }
```

`Task 2`

```
City --> color("#333343") extrude(random(400, 600)) toFaces() (select(0, 4) Wall | select(4, 5) Roof)

Wall --> splitZ(random(150, 250)) Floor

Roof --> color("#8881111")

Floor --> if (size("z") >= 140)
    then (
        splitX(random(150, 250)) WindowFrame
    )
    else this

WindowFrame --> if (size("x") >= 150)
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

Window --> color("#EEEEEE")
```

`Task 3`

```
City --> color(0x333343) if (this.blockId == 0) then LowBuilding else HighBuilding

HighBuilding --> extrude(random(800, 1200)) Building

LowBuilding --> extrude(random(200, 600)) Building

Building --> toFaces() (select(0, 4) Wall | select(4, 5) Roof)

Roof --> if (this.blockId == 0) then color(0x8881111) else color(0x111111)

Wall --> splitZ(random(190, 250)) Floor

Floor --> if (size("z") >= 190)
    then (
        splitX(200) if (this.blockId == 0) then SmallTile else BigTile
    )
    else this

BigTile --> if (size("x") >= 200)
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

SmallTile --> if (size("x") >= 180)
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

Window --> extrude(-20) toFaces() (select(0, 4) | select(4, 5) color(0xEEEEEE))
```

House

````
Start --> face(point2(-22.6, -88.57), point2(-22.53, -137.76), point2(62.55, -119.99), point2(71.6, -84.9)) -> Lot

Lot --> color("#333343") -> extrude(60) -> toFaces() -> if index() < 4 then { Wall } else { Roof }

Wall --> split("z", 20) -> Floor

Roof --> color("#881111") -> extrude(30) -> gableRoof(90)

Floor --> split("x", 20) -> WindowFrame

WindowFrame --> if size("x") >= 15 then { multiSplit("x", 5, 10) -> switch index() { case 0: this case 1: if id() == "0,0,1,1" then { multiSplit("z", 0, 18) } else { multiSplit("z", 5, 10) } -> switch index() { case 0: this case 1: Window case 2: this } case 2: this } } else { this }

Window --> if id() == "0,0,1,1,1" then { color("#964808") } else { color("#EEEEEE") }
```

Street

```
Start --> expandGraph(20, line(point2(205.09, -7.75), point2(97.35, -6.38)), line(point2(-1.91, -198.75), point2(-98.57, -98.43)), line(point2(-145.86, 23.73), point2(-100, -100)), line(point2(-100, -100), point2(97.62, -7.15))) -> (sample(2) -> load("/cgv/car.gltf") -> scale(6, 6, 6) -> rotate(0, 90, 0) | this -> color("#8f8f8f"))
```

Forest

```
Start --> face(point2(86.74, 19.26), point2(199.71, 16.55), point2(185.67, 147.77), point2(36.18, 131.63), point2(-119.68, 39.67), point2(-87.81, -66.99)) -> (sample(50) -> load("/cgv/tree.gltf") -> scale(80, 80, 80) | color("#63bf31"))
```
