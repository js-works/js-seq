/**
 * Class as representation of a lazy sequence.
 * 
 * This implementation does not use ES2015 generators/iterators,
 * because the ES2015 feature "for (const item of seq)" has a really
 * poor performance.
 * 
 * See: https://jsfiddle.net/vavkuoLp/
 *
 * License: Public Domain
 */
export default class Seq<T> implements Iterable<T> {
    /**
     * @ignore
     */
    private constructor() {
        throw new Error(
            '[Seq.constructor] Constructor is not callable '
                + '- use static factory methods instead');
    }

    toString(): String {
        return 'Seq/instance';
    }

    [Symbol.iterator](): Iterator<T> {
        return null;
    }

    /**
     * Maps each value of the seq
     *
     * @method Seq.map
     * @param {function} f Mapping function
     * @return {Seq} Seq of the mapped values
     */
    map<R>(f: (item: T, index: number) => R): Seq<R> {
        if (typeof f !== 'function') {
            throw new TypeError('[Seq.map] Alleged mapping function is not really a function')
        }

        return createSeq<R>(() => {
            const [generate, finalize] = iterate(this);
          
            let idx = -1;
          
            const next = () => {
                let item = generate();
              
                return item === endOfSeq
                    ? endOfSeq
                    : f(item, ++idx);
            };
            
            return [next, finalize];
        });
    }

    /**
     * Filters items of a sequence by a given predicate.
     * 
     * @param {function} pred The predicate function
     * @return {Seq} Sequence of the filtered items
     * 
     * @example
     *   let items = Seq.of(1, 2, 4, 8, 16, 32);
     *   let result = items.filter(x => x < 10);
     *   // 1, 2, 4, 8
     */ 
    filter(pred: (item: T, index: number) => boolean): Seq<T> {
        if (typeof pred !== 'function') {
            throw new TypeError('[Seq.filter] Alleged predicate is not really a function')
        }

        return createSeq<T>(() => {
            const [generate, finalize] = iterate(this);
          
            let idx = -1;
          
            const next = () => {
                let item = generate();

                while (item !== endOfSeq && !pred(item, ++idx)) {
                    item = generate();
                }

                return item;
            };

            return [next, finalize];
        });
    }

    flatMap<R>(f: (item: T) => Seq<R>): Seq<R> {
        return Seq.flatten(this.map(f));
    }

    takeWhile(pred: (item: T, index: number) => boolean): Seq<T>  {
        if (typeof pred !== 'function') {
            throw new TypeError('[Seq.filter] Alleged predicate is not really a function')
        }

        return createSeq<T>(() => {
            const [generate, finalize] = iterate(this);

            let idx = -1;

            const next = () => {
                const item = generate();

                return item === endOfSeq || pred(item, ++idx) 
                    ? item
                    : endOfSeq;
            };

            return  [next, finalize];
        });
    }

    skipWhile(pred: (item: T, index: number) => boolean): Seq<T>  {
        if (typeof pred !== 'function') {
            throw new TypeError('[Seq.filter] Alleged predicate is not really a function')
        }

        return createSeq<T>(() => {
            const [generate, finalize] = iterate(this);

            let
                idx = -1,
                hasStarted = false;

            const next = () => {
                let ret;

                let item = generate();

                if (!hasStarted) {
                    while (item !== endOfSeq && pred(item, ++idx)) {
                        item = generate();
                    }

                    hasStarted = item !== endOfSeq;
                }

                return item;
            };

            return  [next, finalize];
        });
    }

    take(n: number): Seq<T> {
        return this.takeWhile((x, index) => index < n);
    }

    skip(n: number): Seq<T> {
        return this.skipWhile((x, index) => index < n);
    }

    reduce(f: (a: T, b: T) => T, seed?: T): T {
        if (typeof f !== 'function') {
            throw new TypeError('[Seq.filter] Alleged function is not really a function')
        }

        const dummy = {};
        let ret: any = dummy;

        this.forEach((value, index) => {
            if (index == 0) {
                if (seed === undefined) {
                    ret = value;
                } else {
                    ret = f(seed, value);
                }
            } else {
                ret = f(ret, value);
            }
        });

        if (ret === dummy) {
            if (seed !== undefined) {
                ret = seed;
            } else {
                new TypeError(); // TODO
            }
        }

        return <T>ret;
    }

    count(): number {
        let ret = 0;
    
        this.forEach(() => ++ret);

        return ret;
    }

    forEach(action: (item: T, index: number) => void) {
        if (typeof action !== 'function') {
            throw new TypeError('[Seq.forEach] Alleged action is not really a function')
        }

        let idx = 0;

        const [next, finalize] = iterate(this);

        try {
            let item;

            do {
                item = next();

                if (item !== endOfSeq) {
                    action(item, idx++)
                }
            } while (item !== endOfSeq);
        } finally {
            finalize();
        }
    }

    toArray(): T[] {
        const ret: T[] = [];

        this.forEach(item => ret.push(item));

        return ret;
    }

    force(): Seq<T> {
        return Seq.from(this.toArray());
    }

    static toString(): String {
        return 'Seq/class';
    }

    static empty(): Seq<any> {
        return emptySeq;
    }

    static of<T>(...items: T[]): Seq<T> {
        return Seq.from(items);
    }

    static from<T>(items: Iterable<T> | (() => any)): Seq<T> {
        let ret: Seq<T>;

        if (items instanceof Seq) {
            ret = <Seq<T>>items;
        } else if (typeof items === 'string' || items instanceof Array) {
            ret = createSeq<T>(() => {
                let index = 0;

                return () => index < items.length ? items[index++] : endOfSeq;
            });
        } else if (items && typeof (<any>items)[iteratorSymbol] === 'function') {
            ret = Seq.from<T>(() => (<any>items)[iteratorSymbol]());
        } else if (typeof items === 'function') {
            ret = createSeq<T>(() => {
                const
                    result = items(),
                    typeofResult = typeof result,
                    
                    resultIsObject =
                        result !== null && typeofResult === 'object',

                    isEcmaScriptIterator = resultIsObject
                        && typeof result.next === 'function',

                    isSimpleIterator = typeof result === 'function',

                    isAdvancedIterator =
                        resultIsObject
                            && !isEcmaScriptIterator
                            && typeof result.generate === 'function';

                let
                    itemQueue: any[] = null,
                    generate: () => any = null,
                    finalize = null;

                if (isEcmaScriptIterator) {
                    generate = () => result.next();
                } else if (isSimpleIterator) {
                    generate = result;
                } else if (isAdvancedIterator) {
                    generate = result.generate;

                    if (typeof result.finalize === 'function') {
                        finalize = result.finalize;
                    }
                }

                function next() {
                    let item;

                    if (isEcmaScriptIterator) {
                        const token = generate();

                        item = token.done ? endOfSeq : token.value;
                    } else if (!isSimpleIterator && !isAdvancedIterator) {
                        item = endOfSeq;
                    } else {
                        if (itemQueue !== null) {
                            item = itemQueue.shift();

                            if (itemQueue.length === 0) {
                                itemQueue = null;
                            }
                        } else {
                            do {
                                itemQueue = generate();
                            } while (itemQueue instanceof Array
                                && itemQueue.length === 0);

                            if (!(itemQueue instanceof Array)) {
                                itemQueue = null;
                                item = endOfSeq;
                            } else {
                                if (itemQueue.length === 1) {
                                    item = itemQueue[0];
                                    itemQueue = null;
                                } else {
                                    item = itemQueue.shift();
                                }
                            }
                        }
                    }

                    return item;
                };

                return [next, finalize];
            });
        } else {
            ret = emptySeq;
        }

        return ret;
    }

    static concat<T>(...seqs: Iterable<T>[]): Seq<T> {
        return Seq.flatten(Seq.from(seqs));
    }

    static flatten<T>(seqOfSeqs: Iterable<Iterable<T>>): Seq<T> {
        return createSeq<T>(() => {
            const [outerGenerate, outerFinalize] =
                iterate(Seq.from(seqOfSeqs));

            let
                innerGenerate: () => any = null,
                innerFinalize: () => void = null;

            function next() {
                let innerResult = endOfSeq;

                while (innerResult === endOfSeq) {
                    if (innerGenerate === null) {
                        let outerResult = outerGenerate();
                        
                        if (outerResult === endOfSeq) {
                            return endOfSeq;
                        }

                        [innerGenerate, innerFinalize] =
                            iterate(Seq.from(outerResult));
                    }

                    innerResult = innerGenerate();

                    if (innerResult === endOfSeq) {
                        innerFinalize();

                        innerGenerate = null;
                        innerFinalize = null;
                    }
                }

                return innerResult;
            };

            function finalize() {
                if (innerFinalize) {
                    innerFinalize();
                }

                if (outerFinalize) {
                    outerFinalize();
                }
            }

            return [next, finalize];
        });
    }

    static iterate<T>(initialValues: T[], f: (...args: T[]) => T): Seq<T> {
        const initVals: T[] = initialValues.slice();

        return createSeq<T>(() => {
            const values: any[] = initVals.slice();

            return () => {
                values.push(f.apply(null, values));
                return values.shift();
            }
        });
    }

    static repeat<T>(value: T, n: number = Infinity): Seq<T> {
        return Seq.iterate([value], value => value).take(n);
    }

    /**
     * Creates a seq of numeric values from a start value (including) to
     * an end value (excluding).
     *
     * @example
     *     Seq.range(1, 10)      // 1, 2, 3, 4, 5, 6, 7, 8, 9
     *     Seq.range(0, -8, -2)  // 0, -2, -4, -6
     *
     * @method Seq.range
     * @param {Number} start Start value
     * @param {Number} end End value
     * @return {Seq} Seq of iterated values
     */
    static range(start: number, end: number = null, step: number = 1): Seq<number> {
        let ret =  Seq.iterate([start], value => value += step);

        if (end !== undefined && end !== null) {
           const pred = step < 0 ? ((n: number) => n > end) : ((n: number) => n < end);

            ret = ret.takeWhile(<any>pred);
        }

        return ret;
    }

    static isSeqable(obj: any): boolean {
        return !!obj && typeof obj[iteratorSymbol] === 'function';
    }

    static isSeqableObject(obj: any): boolean {
        return !!obj
            && typeof obj === 'object'
            && typeof obj[iteratorSymbol] === 'function';
    }
}

// --- locals -------------------------------------------------------

const
    endOfSeq = Object.freeze({}),
    doNothing: () => void = () => {},
    endSequencing: () => any = () => endOfSeq,

    iteratorSymbol = typeof Symbol === 'function' && Symbol.iterator
        ? Symbol.iterator
        : '@@iterator',
    
    emptySeq: Seq<any> = createSeq(() => [endSequencing, doNothing]);

(<any>Seq).prototype[iteratorSymbol] = function () {
    const [generate, finalize] = iterate(this);

    let done = false;

    return {
        // TODO - what about first argument of function 'next'?!?
        next() {
            if (done) {
                return { value: undefined, done: true};
            }

            let item;

            try {
                item = generate();
            } catch(e) {
                done = true;
                finalize();
                throw e;
            }

            if (item === endOfSeq) {
                done = true;
                finalize();
            }
            
            return item === endOfSeq
                ? { value: undefined, done: true }
                : { value: item, done: false };
        },
        /* TODO - implement functions 'throw' and 'return
        throw(e) {
            // TODO
        },
        return(value) {
            // TODO
        }
        */
    };
};

function createSeq<T>(generator: () => ((() => any) | [() => any, () => void])): Seq<T> {
    const ret = Object.create(Seq.prototype);
    ret.__generator = generator;
    return ret;
}

function iterate(seq: Seq<any>): [() => any, () => void] {
    let ret;

    const result = (<any>seq).__generator();
    
    if (result instanceof Array) {
        const
            next = result[0] || endSequencing,
            finalize = result[1] || doNothing;

        ret = [next, finalize];
    } else if (typeof result === 'function') {
        ret = [result, doNothing];
    } else {
        ret = [endSequencing, doNothing];
    }

    return <any>ret;
}
