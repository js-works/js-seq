# js-seq
Lazy sequences in JavaScript.
Allows to use sequence methods like "map", "filter", "reduce" etc. in a non-strict/lazy way.


## Installation

npm install --save js-seq

## Example usages

Printing out the first 50 fibonacci numbers (1, 1, 2, 3, 5, 8, 13 ...)

```javascript
import { Seq } from 'js-seq'

Seq.iterate([1, 1], (a, b) => a + b)
  .take(50)
  .forEach(console.log)
```

Creating a seq of some values

```javascript
Seq.of(1, 2, 3)
// Result: <1, 2, 3>
```

Creating a seq from an array

```javascript
Seq.from([1, 2, 3])
// Result: <1, 2, 3>
```

Mapping the values of a seq

```javascript
Seq.of(1, 2, 3)
  .map(n => n * n)
// Result: <1, 4, 9>
```

Filtering values of a seq

```javascript
Seq.of(1, 2, 3, 4, 5, 6)
  .filter(n => n % 2 === 0)
// Result <2, 4, 6>
```

Reducing a seq to a single value

```javascript
Seq.of(1, 2, 3)
  .reduce((a, b) => a + b)
// Result: 6
```

For the full API of class Seq see the [API docs](https://unpkg.com/js-seq@0.0.6/dist/docs/api/classes/seq.html).


## License

"js-seq" is licensed under LGPLv3.

## Project status

"js-seq" is currently in beta status.
