# CGV

_Computer Generated Verse_

## Glossary

-   grammar - a set of rules
-   rule - a sequence of steps
-   step - changes the current value (through mutation or a complete exchange) done by a operator/event/constant/symbol
-   operators - identifies a function defined in the domain, which take the current value and the given parameters and returns the new current value
-   constant - identifies a constant defined in the domain
-   symbol - executes the rule identified by the symbol and sets the result as the new current value
-   event - joines and schedules multiple derivation threads (not os threads) and enables to operate on all inputs, while handing back the result to the entrance points as their new current value

-   domain - set of operations and valid constants in a certain area of knowledge (e.g. shapes: extrude)

-   input - starting value (domain value)
-   parameters - values accessible throught the grammar interpretion to influence the outcome
-   attributes - define parameters (e.g. name, type, min, max, ...) to make them editable in a UI

-   parse - the grammar definition in text form is parsed into a interpretable object representation
-   interprete - executes the steps defined in the grammar on the input, respecting the inserted parameters and returning the result

-   sequential Step - the input value is mutated
-   parallel Step - the input is split/cloned into multiple values

-   premature Termination - the interpretion is cancelled before all possible steps are exhausted (reducing execution time but returning an unfinished/earlier result)

## Test Grammars

### Arithmetic

```
a -> sum("1" | "2") event(max) | "4" event(max)

max = "a => {
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
}"
```

### Shape

`Forest`

```
Forest -> sample2d(this | "1") load(this | "'/tree.gltf'")
```

`Building`

```
a -> extrude(this | 3) faces(this) (filter(this | horizontal) walls) | (filter(this | upwards) roof)

roof -> switch(this | attribute(enum | "roof1" | "roof2") | roof1 | roof2)

roof2 -> this
roof1 -> connectAll(center(this) translate(this | 0 | attribute(float | 0 | 3) | 0) | lines(this))

walls -> split2d(this | horizontal | 3) split2d(this | vertical | 3) window
window -> setback(this | 0.5) extrude(this | -0.1)
```
