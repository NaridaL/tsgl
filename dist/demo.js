var demo = (function (exports,chroma) {
'use strict';

chroma = chroma && chroma.hasOwnProperty('default') ? chroma['default'] : chroma;

/**
 * Java style map.
 */
class JavaMap {
    constructor() {
        this[Symbol.toStringTag] = 'Map';
        this._map = new Map();
        this._size = 0;
    }
    toString() {
        return '{' + Array.from(this.entries2()).map(({ key, value }) => key + ':' + value).join(', ') + '}';
    }
    forEach(callbackfn, thisArg) {
        for (const bucket of this._map.values()) {
            for (const { key, value } of bucket) {
                callbackfn.call(thisArg, value, key, this);
            }
        }
    }
    *keys() {
        for (const bucket of this._map.values()) {
            for (const { key } of bucket) {
                yield key;
            }
        }
    }
    *values() {
        for (const bucket of this._map.values()) {
            for (const { value } of bucket) {
                yield value;
            }
        }
    }
    [Symbol.iterator]() {
        return this.entries();
    }
    set(key, value) {
        this.set2(key, value);
        return this;
    }
    /**
     * Like {@link #set} except it returns true if key was new and false if the value was only updated.
     *
     */
    set2(key, val) {
        const hashCode = key.hashCode(), bucket = this._map.get(hashCode);
        //assert(hashCode === (hashCode | 0))
        if (bucket) {
            const pairIndex = bucket.findIndex(pair => pair.key.equals(key));
            if (-1 == pairIndex) {
                bucket.push({ key: key, value: val });
            }
            else {
                bucket[pairIndex].value = val;
                return false;
            }
        }
        else {
            this._map.set(hashCode, [{ key: key, value: val }]);
        }
        this._size++;
        return true;
    }
    has(key) {
        const hashCode = key.hashCode(), bucket = this._map.get(hashCode);
        //assert(hashCode === (hashCode | 0))
        return undefined !== bucket && bucket.some(pair => pair.key.equals(key));
    }
    get(key) {
        const hashCode = key.hashCode(), bucket = this._map.get(hashCode), pair = bucket && bucket.find(pair => pair.key.equals(key));
        return pair && pair.value;
    }
    getLike(key) {
        for (const hashCode of key.hashCodes()) {
            const bucket = this._map.get(hashCode);
            const canonVal = bucket && bucket.find(x => x.key.like(key));
            if (canonVal)
                return canonVal;
        }
    }
    setLike(key, val) {
        return !this.getLike(key) && this.set(key, val);
    }
    'delete'(key) {
        const hashCode = key.hashCode(), bucket = this._map.get(hashCode);
        if (bucket) {
            const index = bucket.findIndex(x => x.key.equals(key));
            if (-1 != index) {
                if (1 == bucket.length) {
                    this._map.delete(hashCode);
                }
                else {
                    bucket.splice(index, 1);
                }
                this._size--;
                return true;
            }
        }
        return false;
    }
    deleteLike(key) {
        for (const hashCode of key.hashCodes()) {
            const bucket = this._map.get(hashCode);
            if (bucket) {
                const index = bucket.findIndex(x => x.key.like(key));
                if (-1 != index) {
                    const deleted = bucket[index];
                    if (1 == bucket.length) {
                        this._map.delete(hashCode);
                    }
                    else {
                        bucket.splice(index, 1);
                    }
                    this._size--;
                    return deleted;
                }
            }
        }
    }
    *entries2() {
        for (const bucket of this._map.values()) {
            yield* bucket;
        }
    }
    *entries() {
        for (const bucket of this._map.values()) {
            for (const { key, value } of bucket) {
                yield [key, value];
            }
        }
    }
    clear() {
        this._map.clear();
        this._size = 0;
    }
    get size() {
        return this._size;
    }
}

class Vector {
    constructor(v) {
        this.v = v;
        assertInst(Float64Array, v);
    }
    static fromFunction(dims, f) {
        assertNumbers(dims);
        const e = new Float64Array(dims);
        let i = dims;
        while (i--) {
            e[i] = f(i);
        }
        return new Vector(e);
    }
    static random(dims) {
        return Vector.fromFunction(dims, (i) => Math.random());
    }
    static from(...args) {
        assert(args[0] instanceof Float64Array || args.every(a => 'number' == typeof a), 'args[0] instanceof Float64Array || args.every(a => "number" == typeof a)');
        return new Vector(args[0] instanceof Float64Array ? args[0] : Float64Array.from(args));
    }
    static Zero(dims) {
        assertNumbers(dims);
        let i = 0;
        const n = new Float64Array(dims);
        while (i--) {
            n[i] = 0;
        }
        return new Vector(n);
    }
    static Unit(dims, dir) {
        assertNumbers(dims, dir);
        let i = 0;
        const n = new Float64Array(dims);
        while (i--) {
            n[i] = +(i == dir); // +true === 1, +false === 0
        }
        return new Vector(n);
    }
    [Symbol.iterator]() {
        return this.v[Symbol.iterator]();
    }
    dim() {
        return this.v.length;
    }
    e(index) {
        if (0 > index || index >= this.v.length) {
            throw new Error('array index out of bounds');
        }
        return this.v[index];
    }
    plus(vector) {
        const u = this.v, v = vector.v;
        const n = new Float64Array(u.length);
        let i = u.length;
        while (i--) {
            n[i] = u[i] + v[i];
        }
        return new Vector(n);
    }
    minus(vector) {
        const u = this.v, v = vector.v;
        const n = new Float64Array(u.length);
        let i = u.length;
        while (i--) {
            n[i] = u[i] - v[i];
        }
        return new Vector(n);
    }
    times(factor) {
        const u = this.v;
        const n = new Float64Array(u.length);
        let i = u.length;
        while (i--) {
            n[i] = u[i] * factor;
        }
        return new Vector(n);
    }
    div(val) {
        const u = this.v;
        const n = new Float64Array(u.length);
        let i = u.length;
        while (i--) {
            n[i] = u[i] / val;
        }
        return new Vector(n);
    }
    dot(vector) {
        assert(this.dim == vector.dim, 'passed vector must have the same dim');
        let result = 0;
        const u = this.v, v = vector.v;
        let i = u.length;
        while (i--) {
            result += u[i] * v[i];
        }
        return result;
    }
    cross(vector) {
        assertInst(Vector, vector);
        const n = new Float64Array(3);
        n[0] = this.v[1] * vector.v[2] - this.v[2] * vector.v[1];
        n[1] = this.v[2] * vector.v[0] - this.v[0] * vector.v[2];
        n[2] = this.v[0] * vector.v[1] - this.v[1] * vector.v[0];
        return new Vector(n);
    }
    schur(vector) {
        assertInst(Vector, vector);
        const u = this.v, v = vector.v;
        const n = new Float64Array(u.length);
        let i = u.length;
        while (i--) {
            n[i] = u[i] * v[i];
        }
        return new Vector(n);
    }
    equals(obj) {
        if (obj === this)
            return true;
        if (obj.constructor !== Vector)
            return false;
        if (this.v.length != obj.v.length)
            return false;
        let i = this.v.length;
        while (i--) {
            if (!eq(this.v[i], obj.v[i]))
                return false;
        }
        return true;
    }
    map(f) {
        return new Vector(this.v.map(f));
    }
    toString(roundFunction) {
        roundFunction = roundFunction || ((v) => +v.toFixed(6));
        return 'Vector(' + this.v.map(roundFunction).join(', ') + ')';
    }
    /*
     get x() {
     return this.v[0]
     },
     get y() {
     return this.v[1]
     },
     get z() {
     return this.v[2]
     },
     get w() {
     return this.v[3]
     },
     */
    angleTo(vector) {
        assertInst(Vector, vector);
        assert(!this.isZero(), '!this.likeO()');
        assert(!vector.isZero(), '!vector.likeO()');
        return Math.acos(this.dot(vector) / this.length() / vector.length());
    }
    /**
     Returns true iff this is parallel to vector, using equals
     Throw a DebugError
     if vector is not a Vector or
     if this has a length of 0 or
     if vector has a length of 0
     */
    isParallelTo(vector) {
        assertInst(Vector, vector);
        assert(!this.isZero(), '!this.likeO()');
        assert(!vector.isZero(), '!vector.likeO()');
        // a . b takes on values of +|a|*|b| (vectors same direction) to -|a|*|b| (opposite direction)
        // in both cases the vectors are paralle, so check if abs(a . b) == |a|*|b|
        return eq(Math.sqrt(this.lengthSquared() * vector.lengthSquared()), Math.abs(this.dot(vector)));
    }
    isPerpendicularTo(vector) {
        assertInst(Vector, vector);
        assert(!this.isZero(), '!this.likeO()');
        assert(!vector.isZero(), '!vector.likeO()');
        return eq0(this.dot(vector));
    }
    /**
     Returns true iff the length of this vector is 0, as returned by NLA.isZero.
     Definition: Vector.prototype.isZero = () => NLA.isZero(this.length())
     */
    isZero() {
        return eq0(this.length());
    }
    // Returns a new unit Vector (.length() === 1) with the same direction as this vector. Throws a
    /*/ Returns the length of this Vector, i.e. the euclidian norm.*/
    length() {
        return Math.hypot.apply(undefined, this.v);
        //return Math.sqrt(this.lengthSquared())
    }
    lengthSquared() {
        let result = 0;
        const u = this.v;
        let i = u.length;
        while (i--) {
            result += u[i] * u[i];
        }
        return result;
    }
    // NLA_DEBUGError if this has a length of 0.
    normalized() {
        const length = this.length();
        if (eq0(length)) {
            throw new Error('cannot normalize zero vector');
        }
        return this.div(this.length());
    }
    asRowMatrix() {
        return new Matrix(this.v.length, 1, this.v);
    }
    asColMatrix() {
        return new Matrix(1, this.v.length, this.v);
    }
    /**
     Returns a new Vector which is the projection of this vector onto the passed vector.
     Examples
     NLA.V(3, 4).projectedOn(NLA.V(1, 0)) // returns NLA.V(3, 0)
     NLA.V(3, 4).projectedOn(NLA.V(2, 0)) // returns NLA.V(3, 0)
     NLA.V(3, 4).projectedOn(NLA.V(-1, 0)) // returns NLA.V(-3, 0)
     NLA.V(3, 4).projectedOn(NLA.V(0, 1)) // returns NLA.V(0, 4)
     NLA.V(3, 4).projectedOn(NLA.V(1, 1)) // returns
     */
    projectedOn(b) {
        assertInst(Vector, b);
        // https://en.wikipedia.org/wiki/Vector_projection#Vector_projection_2
        return b.times(this.dot(b) / b.dot(b));
    }
    rejectedOn(b) {
        assertInst(Vector, b);
        // https://en.wikipedia.org/wiki/Vector_projection#Vector_projection_2
        return this.minus(b.times(this.dot(b) / b.dot(b)));
    }
    /**
     Returns true iff the length() of this vector is equal to 'length', using equals
     E.g. NLA.V(3, 4).hasLength(5) === true
     NLA.V(1, 1).hasLength(1) === false
     */
    hasLength(length) {
        assertNumbers(length);
        return eq(length, this.length());
    }
    V3() {
        //assert(this.dim() == 3)
        return new V3(this.v[0], this.v[1], this.v[2]);
    }
}

class Matrix {
    constructor(width, height, m) {
        assert(width * height == m.length, 'width * height == m.length', width, height, m.length);
        this.m = m;
        this.width = width;
        this.height = height;
    }
    static random(width, height) {
        assertNumbers(width, height);
        return Matrix.fromFunction(width, height, (i, j) => Math.random());
    }
    static fromFunction(width, height, f) {
        assertNumbers(width, height);
        const m = new Float64Array(height * width);
        let elIndex = height * width;
        while (elIndex--) {
            m[elIndex] = f(Math.floor(elIndex / width), elIndex % width, elIndex);
        }
        return new Matrix(width, height, m);
    }
    static identityN(dim) {
        assertNumbers(dim);
        const m = new Float64Array(dim * dim);
        // Float64Arrays are init to 0
        let elIndex = dim * (dim + 1);
        while (elIndex) {
            elIndex -= (dim + 1);
            m[elIndex] = 1;
        }
        return new Matrix(dim, dim, m);
    }
    static permutation(dim, i, k) {
        assertNumbers(dim, i, k);
        const m = new Float64Array(dim * dim);
        // Float64Array are init to 0
        let elIndex = dim * (dim + 1);
        while (elIndex) {
            elIndex -= (dim + 1);
            m[elIndex] = 1;
        }
        m[i * dim + i] = 0;
        m[k * dim + k] = 0;
        m[i * dim + k] = 1;
        m[k * dim + i] = 1;
        return new Matrix(dim, dim, m);
    }
    static fromRowArrays(...args) {
        return Matrix.fromRowArrays2(args);
    }
    static fromRowArrays2(arrays) {
        if (0 == arrays.length) {
            throw new Error('cannot have 0 vector');
        }
        const height = arrays.length;
        const width = arrays[0].length;
        const m = new Float64Array(height * width);
        arrayCopy(arrays[0], 0, m, 0, width);
        for (let rowIndex = 1; rowIndex < height; rowIndex++) {
            if (arrays[rowIndex].length != width) {
                throw new Error('all row arrays must be the same length');
            }
            arrayCopy(arrays[rowIndex], 0, m, rowIndex * width, width);
        }
        return new Matrix(width, height, m);
    }
    static fromColVectors(colVectors) {
        return Matrix.fromColArrays(colVectors.map((v) => v.v));
    }
    static forWidthHeight(width, height) {
        return new Matrix(width, height, new Float64Array(width * height));
    }
    static fromColArrays(colArrays) {
        if (0 == colArrays.length) {
            throw new Error('cannot have 0 vector');
        }
        const width = colArrays.length;
        const height = colArrays[0].length;
        const m = new Float64Array(height * width);
        arrayCopyStep(colArrays[0], 0, 1, m, 0, width, height);
        for (let colIndex = 1; colIndex < width; colIndex++) {
            if (colArrays[colIndex].length != height) {
                throw new Error('all col arrays must be the same length');
            }
            arrayCopyStep(colArrays[colIndex], 0, 1, m, colIndex, width, height);
        }
        return new Matrix(width, height, m);
    }
    /**
     * Numerically calculate all the partial derivatives of f at x0.
     *
     *
     * @param f
     * @param x0
     * @param fx0 f(x0), pass it if you have it already
     * @param EPSILON
     */
    static jacobi(f, x0, fx0 = f(x0), EPSILON = 1e-6) {
        const jacobi = Matrix.forWidthHeight(x0.length, fx0.length);
        for (let colIndex = 0; colIndex < x0.length; colIndex++) {
            x0[colIndex] += EPSILON;
            const fx = f(x0);
            for (let rowIndex = 0; rowIndex < fx0.length; rowIndex++) {
                const value = (fx[rowIndex] - fx0[rowIndex]) / EPSILON;
                jacobi.setEl(rowIndex, colIndex, value);
            }
            x0[colIndex] -= EPSILON;
        }
        return jacobi;
    }
    e(rowIndex, colIndex) {
        assertNumbers(rowIndex, colIndex);
        if (NLA_DEBUG && (rowIndex >= this.height || colIndex >= this.width)) {
            throw new Error('index ' + rowIndex + ', ' + colIndex + ' is out of bounds (' + this.width + ' x ' + this.height + ')');
        }
        return this.m[rowIndex * this.width + colIndex];
    }
    setEl(rowIndex, colIndex, val) {
        assertNumbers(rowIndex, colIndex, val);
        assert(0 <= rowIndex && rowIndex < this.height, 'rowIndex out of bounds ' + rowIndex);
        assert(0 <= colIndex && colIndex < this.width, 'colIndex out of bounds ' + colIndex);
        this.m[rowIndex * this.width + colIndex] = val;
    }
    plus(m) {
        assert(this.width == m.width);
        assert(this.height == m.height);
        const r = this.new();
        let i = this.m.length;
        while (i--)
            r.m[i] = this.m[i] + m.m[i];
        return r;
    }
    minus(m) {
        assert(this.width == m.width);
        assert(this.height == m.height);
        const r = this.new();
        let i = this.m.length;
        while (i--)
            r.m[i] = this.m[i] - m.m[i];
        return r;
    }
    mulScalar(factor) {
        const r = this.new();
        let i = this.m.length;
        while (i--)
            r.m[i] = this.m[i] * factor;
        return r;
    }
    divScalar(scalar) {
        const r = this.new();
        let i = this.m.length;
        while (i--)
            r.m[i] = this.m[i] / scalar;
        return r;
    }
    new() {
        return new Matrix(this.width, this.height, new Float64Array(this.width * this.height));
    }
    toString(f, colNames, rowNames) {
        f = f || ((v) => v.toFixed(6));
        assert(typeof f(0) == 'string', '' + typeof f(0));
        assert(!colNames || colNames.length == this.width);
        assert(!rowNames || rowNames.length == this.height);
        const rounded = Array.from(this.m).map(f);
        const rows = arrayFromFunction(this.height, (rowIndex) => rounded.slice(rowIndex * this.width, (rowIndex + 1) * this.width)); // select matrix row
        if (colNames) {
            rows.unshift(Array.from(colNames));
        }
        if (rowNames) {
            rows.forEach((row, rowIndex) => row.unshift(rowNames[rowIndex - (colNames ? 1 : 0)] || ''));
        }
        const colWidths = arrayFromFunction(this.width, (colIndex) => rows.map(row => row[colIndex].length).max());
        return rows.map((row, rowIndex) => row.map((x, colIndex) => {
            // pad numbers with spaces to col width
            const padder = rowIndex == 0 && colNames || colIndex == 0 && rowNames
                ? String.prototype.padEnd
                : String.prototype.padStart;
            return padder.call(x, colWidths[colIndex]);
        }).join('  ')).map(x => x + '\n').join(''); // join rows
    }
    row(rowIndex) {
        const v = new Float64Array(this.width);
        arrayCopy(this.m, rowIndex * this.width, v, 0, this.width);
        return new Vector(v);
    }
    col(colIndex) {
        const v = new Float64Array(this.height);
        arrayCopyStep(this.m, colIndex, this.width, v, 0, 1, this.height);
        return new Vector(v);
    }
    dim() {
        return { width: this.width, height: this.height };
    }
    dimString() {
        return this.width + 'x' + this.height;
    }
    equals(obj) {
        if (obj.constructor != this.constructor)
            return false;
        if (this.width != obj.width || this.height != obj.height)
            return false;
        let elIndex = this.m.length;
        while (elIndex--) {
            if (this.m[elIndex] != obj.m[elIndex])
                return false;
        }
        return true;
    }
    equalsMatrix(matrix, precision) {
        precision = precision || NLA_PRECISION;
        if (!(matrix instanceof Matrix))
            throw new Error('not a matrix');
        if (this.width != matrix.width || this.height != matrix.height)
            return false;
        let elIndex = this.m.length;
        while (elIndex--) {
            if (Math.abs(this.m[elIndex] - matrix.m[elIndex]) >= precision)
                return false;
        }
        return true;
    }
    hashCode() {
        let result = 0;
        let elIndex = this.m.length;
        while (elIndex--) {
            result = result * 31 + floatHashCode(this.m[elIndex]);
        }
        return result;
    }
    // todo rename
    isZero() {
        let elIndex = this.m.length;
        while (elIndex--) {
            if (!eq0(this.m[elIndex])) {
                return false;
            }
        }
        return true;
    }
    isOrthogonal() {
        return this.isSquare() && this.transposed().times(this).equalsMatrix(Matrix.identityN(this.width));
    }
    /**
     * Returns L, U, P such that L * U == P * this
     */
    luDecomposition() {
        assertf(() => this.isSquare(), this.dim().toSource());
        const dim = this.width;
        const uRowArrays = this.asRowArrays(Float64Array);
        const lRowArrays = arrayFromFunction(dim, (row) => new Float64Array(dim));
        const pRowArrays = Matrix.identityN(dim).asRowArrays(Float64Array);
        let currentRowIndex = 0;
        for (let colIndex = 0; colIndex < dim; colIndex++) {
            // find largest value in colIndex
            let maxAbsValue = 0, pivotRowIndex = -1, numberOfNonZeroRows = 0;
            for (let rowIndex = currentRowIndex; rowIndex < dim; rowIndex++) {
                const el = uRowArrays[rowIndex][colIndex];
                numberOfNonZeroRows += +(0 != el);
                if (Math.abs(el) > maxAbsValue) {
                    maxAbsValue = Math.abs(el);
                    pivotRowIndex = rowIndex;
                }
            }
            // TODO: check with isZero
            if (0 == maxAbsValue) {
                // column contains only zeros
                continue;
            }
            assert(-1 !== pivotRowIndex);
            // swap rows
            arraySwap(uRowArrays, currentRowIndex, pivotRowIndex);
            arraySwap(lRowArrays, currentRowIndex, pivotRowIndex);
            arraySwap(pRowArrays, currentRowIndex, pivotRowIndex);
            lRowArrays[colIndex][colIndex] = 1;
            if (1 < numberOfNonZeroRows) {
                // subtract pivot (now current) row from all below it
                for (let rowIndex = currentRowIndex + 1; rowIndex < dim; rowIndex++) {
                    const l = uRowArrays[rowIndex][colIndex] / uRowArrays[currentRowIndex][colIndex];
                    lRowArrays[rowIndex][colIndex] = l;
                    // subtract pivot row * l from row 'rowIndex'
                    for (let colIndex2 = colIndex; colIndex2 < dim; colIndex2++) {
                        uRowArrays[rowIndex][colIndex2] -= l * uRowArrays[currentRowIndex][colIndex2];
                    }
                }
            }
            currentRowIndex++; // this doesn't increase if pivot was zero
        }
        return {
            L: Matrix.fromRowArrays2(lRowArrays),
            U: Matrix.fromRowArrays2(uRowArrays),
            P: Matrix.fromRowArrays2(pRowArrays),
        };
    }
    gauss() {
        const width = this.width, height = this.height;
        const uRowArrays = this.asRowArrays(Float64Array);
        const lRowArrays = arrayFromFunction(height, (row) => new Float64Array(width));
        const pRowArrays = Matrix.identityN(height).asRowArrays(Float64Array);
        let currentRowIndex = 0;
        for (let colIndex = 0; colIndex < width; colIndex++) {
            // console.log('currentRowIndex', currentRowIndex)	// find largest value in colIndex
            let maxAbsValue = 0, pivotRowIndex = -1, numberOfNonZeroRows = 0;
            for (let rowIndex = currentRowIndex; rowIndex < height; rowIndex++) {
                const el = uRowArrays[rowIndex][colIndex];
                numberOfNonZeroRows += +(0 != el);
                if (Math.abs(el) > maxAbsValue) {
                    maxAbsValue = Math.abs(el);
                    pivotRowIndex = rowIndex;
                }
            }
            // TODO: check with isZero
            if (0 == maxAbsValue) {
                // column contains only zeros
                continue;
            }
            assert(-1 !== pivotRowIndex);
            // swap rows
            arraySwap(uRowArrays, currentRowIndex, pivotRowIndex);
            arraySwap(lRowArrays, currentRowIndex, pivotRowIndex);
            arraySwap(pRowArrays, currentRowIndex, pivotRowIndex);
            lRowArrays[currentRowIndex][colIndex] = 1;
            if (1 < numberOfNonZeroRows) {
                // subtract pivot (now current) row from all below it
                for (let rowIndex = currentRowIndex + 1; rowIndex < height; rowIndex++) {
                    const l = uRowArrays[rowIndex][colIndex] / uRowArrays[currentRowIndex][colIndex];
                    lRowArrays[rowIndex][colIndex] = l;
                    // subtract pivot row * l from row 'rowIndex'
                    for (let colIndex2 = colIndex; colIndex2 < width; colIndex2++) {
                        uRowArrays[rowIndex][colIndex2] -= l * uRowArrays[currentRowIndex][colIndex2];
                    }
                }
            }
            currentRowIndex++; // this doesn't increase if pivot was zero
        }
        return {
            L: Matrix.fromRowArrays2(lRowArrays),
            U: Matrix.fromRowArrays2(uRowArrays),
            P: Matrix.fromRowArrays2(pRowArrays),
        };
    }
    qrDecompositionGivensRotation() {
        function matrixForCS(dim, i, k, c, s) {
            const m = Matrix.identityN(dim);
            m.setEl(i, i, c);
            m.setEl(k, k, c);
            m.setEl(i, k, s);
            m.setEl(k, i, -s);
            return m;
        }
        let qTransposed = Matrix.identityN(this.height);
        for (let colIndex = 0; colIndex < this.width; colIndex++) {
            // find largest value in colIndex
            for (let rowIndex = colIndex + 1; rowIndex < this.height; rowIndex++) {
                //console.log('row ', rowIndex, 'col ', colIndex)
                const xi = this.e(colIndex, colIndex);
                const xk = this.e(rowIndex, colIndex);
                if (xk == 0) {
                    continue;
                }
                const r = Math.sqrt(xi * xi + xk * xk);
                const c = xi / r;
                const s = xk / r;
                // apply transformation on every column:
                for (let col2 = colIndex; col2 < this.width; col2++) {
                    const x1 = this.e(colIndex, col2) * c + this.e(rowIndex, col2) * s;
                    const x2 = this.e(rowIndex, col2) * c - this.e(colIndex, col2) * s;
                    this.setEl(colIndex, col2, x1);
                    this.setEl(rowIndex, col2, x2);
                }
                //console.log('r ', r, 'c ', c, 's ', s, 'sigma', sigma(c, s))
                //console.log(this.toString(),'cs\n', matrixForCS(this.height, colIndex, rowIndex, c, s).toString())
                qTransposed = matrixForCS(this.height, colIndex, rowIndex, c, s).times(qTransposed);
            }
        }
        //console.log(qTransposed.transposed().toString(), this.toString(),
        // qTransposed.transposed().times(this).toString())
        return { Q: qTransposed.transposed(), R: this };
    }
    isPermutation() {
        if (!this.isSquare())
            return false;
        if (this.m.some((value) => !eq0(value) && !eq(1, value)))
            return false;
        const rows = this.asRowArrays(Array);
        if (rows.some((row) => row.filter((value) => eq(1, value)).length != 1))
            return false;
        const cols = this.asColArrays(Array);
        if (cols.some((col) => col.filter((value) => eq(1, value)).length != 1))
            return false;
        return true;
    }
    isDiagonal(precision) {
        let i = this.m.length;
        while (i--) {
            if (0 !== i % (this.width + 1) && !eq0(this.m[i]))
                return false;
        }
        return true;
    }
    isIdentity(precision) {
        return this.isLowerUnitriangular(precision) && this.isUpperTriangular(precision);
    }
    isUpperTriangular(precision) {
        precision = 'number' == typeof precision ? precision : NLA_PRECISION;
        if (!this.isSquare())
            return false;
        for (let rowIndex = 1; rowIndex < this.height; rowIndex++) {
            for (let colIndex = 0; colIndex < rowIndex; colIndex++) {
                if (!eq0(this.m[rowIndex * this.width + colIndex], precision)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Returns x, so that this * x = b
     * More efficient than calculating the inverse for few (~ <= this.height) values
     */
    solveLinearSystem(b) {
        const lup = this.luDecomposition();
        // console.log(lup.L.toString())
        // console.log(lup.U.toString())
        // console.log(lup.P.toString())
        const y = lup.L.solveForwards(lup.P.timesVector(b));
        const x = lup.U.solveBackwards(y);
        return x;
    }
    isLowerUnitriangular(precision) {
        precision = 'number' == typeof precision ? precision : NLA_PRECISION;
        if (!this.isSquare())
            return false;
        for (let rowIndex = 0; rowIndex < this.height - 1; rowIndex++) {
            for (let colIndex = rowIndex; colIndex < this.width; colIndex++) {
                const el = this.m[rowIndex * this.width + colIndex];
                if (rowIndex == colIndex ? !eq(1, el, precision) : !eq0(el, precision)) {
                    return false;
                }
            }
        }
        return true;
    }
    isLowerTriangular() {
        if (!this.isSquare())
            return false;
        for (let rowIndex = 0; rowIndex < this.height - 1; rowIndex++) {
            for (let colIndex = rowIndex + 1; colIndex < this.width; colIndex++) {
                if (!eq0(this.m[rowIndex * this.width + colIndex])) {
                    return false;
                }
            }
        }
        return true;
    }
    solveBackwards(x) {
        assertVectors(x);
        assert(this.height == x.dim(), 'this.height == x.dim()');
        assert(this.isUpperTriangular(), 'this.isUpperTriangular()\n' + this.str);
        const v = new Float64Array(this.width);
        let rowIndex = this.height;
        while (rowIndex--) {
            let temp = x.v[rowIndex];
            for (let colIndex = rowIndex + 1; colIndex < this.width; colIndex++) {
                temp -= v[colIndex] * this.e(rowIndex, colIndex);
            }
            v[rowIndex] = temp / this.e(rowIndex, rowIndex);
        }
        return new Vector(v);
    }
    solveBackwardsMatrix(matrix) {
        const colVectors = new Array(matrix.width);
        let i = matrix.width;
        while (i--) {
            colVectors[i] = this.solveBackwards(matrix.col(i));
        }
        return Matrix.fromColVectors(colVectors);
    }
    solveForwardsMatrix(matrix) {
        const colVectors = new Array(matrix.width);
        let i = matrix.width;
        while (i--) {
            colVectors[i] = this.solveForwards(matrix.col(i));
        }
        return Matrix.fromColVectors(colVectors);
    }
    solveForwards(x) {
        assertVectors(x);
        assert(this.height == x.dim(), 'this.height == x.dim()');
        assertf(() => this.isLowerTriangular(), this.toString());
        const v = new Float64Array(this.width);
        for (let rowIndex = 0; rowIndex < this.height; rowIndex++) {
            let temp = x.v[rowIndex];
            for (let colIndex = 0; colIndex < rowIndex; colIndex++) {
                temp -= v[colIndex] * this.e(rowIndex, colIndex);
            }
            v[rowIndex] = temp / this.e(rowIndex, rowIndex);
        }
        return new Vector(v);
    }
    /**
     * Calculates rank of matrix.
     * Number of linearly independant row/column vectors.
     * Is equal to the unmber of dimensions the image of the affine transformation represented this matrix has.
     */
    rank() {
        const U = this.gauss().U;
        //console.log(R.toString())
        let rowIndex = this.height;
        while (rowIndex-- && U.row(rowIndex).isZero()) {
            console.log('RANK' + U.row(rowIndex).toString() + U.row(rowIndex).isZero());
        }
        return rowIndex + 1;
    }
    rowsIndependent() {
        return this.height == this.rank();
    }
    colsIndependent() {
        return this.width == this.rank();
    }
    asRowArrays(arrayConstructor) {
        arrayConstructor = arrayConstructor || Float64Array;
        let rowIndex = this.height;
        const result = new Array(this.height);
        while (rowIndex--) {
            result[rowIndex] = this.rowArray(rowIndex, arrayConstructor);
        }
        return result;
    }
    asColArrays(arrayConstructor) {
        arrayConstructor = arrayConstructor || Float64Array;
        let colIndex = this.width;
        const result = new Array(this.width);
        while (colIndex--) {
            result[colIndex] = this.colArray(colIndex, arrayConstructor);
        }
        return result;
    }
    rowArray(rowIndex, arrayConstructor) {
        arrayConstructor = arrayConstructor || Float64Array;
        const result = new arrayConstructor(this.width);
        arrayCopy(this.m, rowIndex * this.width, result, 0, this.width);
        return result;
    }
    colArray(colIndex, arrayConstructor) {
        arrayConstructor = arrayConstructor || Float64Array;
        const result = new arrayConstructor(this.width);
        arrayCopyStep(this.m, colIndex, this.height, result, 0, 1, this.height);
        return result;
    }
    subMatrix(firstColIndex, subWidth, firstRowIndex, subHeight) {
        assert(firstColIndex + subWidth > this.width || firstRowIndex + subHeight > this.height);
        const m = new Float64Array(this.height);
        arrayCopyBlocks(this.m, firstColIndex, this.width, m, 0, subWidth, subHeight, subWidth);
        return new Matrix(subWidth, subHeight, m);
    }
    map(fn) {
        return new Matrix(this.width, this.height, this.m.map(fn));
    }
    dimEquals(matrix) {
        assertInst(Matrix, matrix);
        return this.width == matrix.width && this.height == matrix.height;
    }
    inversed() {
        const lup = this.luDecomposition();
        const y = lup.L.solveForwardsMatrix(lup.P);
        console.log(y);
        const inverse = lup.U.solveBackwardsMatrix(y);
        return inverse;
    }
    inversed3() {
        assertf(() => 3 == this.width && 3 == this.height);
        const result = Matrix.forWidthHeight(3, 3), m = this.m, r = result.m;
        r[0] = m[4] * m[8] - m[5] * m[7];
        r[1] = -m[1] * m[8] + m[2] * m[7];
        r[2] = m[1] * m[5] - m[2] * m[4];
        r[3] = -m[3] * m[8] + m[5] * m[6];
        r[4] = m[0] * m[8] - m[2] * m[6];
        r[5] = -m[0] * m[5] + m[2] * m[3];
        r[6] = m[3] * m[7] - m[4] * m[6];
        r[7] = -m[0] * m[7] + m[1] * m[6];
        r[8] = m[0] * m[4] - m[1] * m[3];
        const det = m[0] * r[0] + m[1] * r[3] + m[2] * r[6];
        let i = 9;
        while (i--) {
            r[i] /= det;
        }
        return result;
    }
    inversed2() {
        assertf(() => 2 == this.width && 2 == this.height);
        const result = Matrix.forWidthHeight(2, 2), m = this.m, r = result.m;
        const det = m[0] * m[3] - m[1] * r[2];
        r[0] = m[3] / det;
        r[1] = -m[2] / det;
        r[2] = -m[1] / det;
        r[3] = m[0] / det;
        return result;
    }
    canMultiply(matrix) {
        assertInst(Matrix, matrix);
        return this.width == matrix.height;
    }
    times(matrix) {
        assertInst(Matrix, matrix);
        assert(this.canMultiply(matrix), `Cannot multiply this {this.dimString()} by matrix {matrix.dimString()}`);
        const nWidth = matrix.width, nHeight = this.height, n = this.width;
        const nM = new Float64Array(nWidth * nHeight);
        let nRowIndex = nHeight;
        while (nRowIndex--) {
            let nColIndex = nWidth;
            while (nColIndex--) {
                let result = 0;
                let i = n;
                while (i--) {
                    result += this.m[nRowIndex * n + i] * matrix.m[i * nWidth + nColIndex];
                }
                nM[nRowIndex * nWidth + nColIndex] = result;
            }
        }
        return new Matrix(nWidth, nHeight, nM);
    }
    timesVector(v) {
        assertVectors(v);
        assert(this.width == v.dim());
        const nHeight = this.height, n = this.width;
        const nM = new Float64Array(nHeight);
        let nRowIndex = nHeight;
        while (nRowIndex--) {
            let result = 0;
            let i = n;
            while (i--) {
                result += this.m[nRowIndex * n + i] * v.v[i];
            }
            nM[nRowIndex] = result;
        }
        return new Vector(nM);
    }
    transposed() {
        const tWidth = this.height, tHeight = this.width;
        const tM = new Float64Array(tWidth * tHeight);
        let tRowIndex = tHeight;
        while (tRowIndex--) {
            let tColIndex = tWidth;
            while (tColIndex--) {
                tM[tRowIndex * tWidth + tColIndex] = this.m[tColIndex * tHeight + tRowIndex];
            }
        }
        return new Matrix(tWidth, tHeight, tM);
    }
    /**
     * In-place transpose.
     */
    transpose() {
        const h = this.height, w = this.width, tM = this.m;
        let tRowIndex = h;
        while (tRowIndex--) {
            let tColIndex = Math.min(tRowIndex, w);
            while (tColIndex--) {
                console.log('col', tColIndex, 'row', tRowIndex);
                const temp = tM[tRowIndex * w + tColIndex];
                tM[tRowIndex * w + tColIndex] = tM[tColIndex * h + tRowIndex];
                tM[tColIndex * h + tRowIndex] = temp;
            }
        }
        this.width = h;
        this.height = w;
    }
    isSquare() {
        return this.height == this.width;
    }
    diagonal() {
        if (!this.isSquare()) {
            throw new Error('!!');
        }
        const v = new Float64Array(this.width);
        let elIndex = this.width * (this.width + 1);
        let vIndex = this.width;
        while (vIndex--) {
            elIndex -= this.width + 1;
            v[vIndex] = this.m[elIndex];
        }
        return new Vector(v);
    }
    maxEl() {
        return Math.max.apply(undefined, this.m);
    }
    minEl() {
        return Math.min.apply(undefined, this.m);
    }
    maxAbsColSum() {
        let result = 0;
        let colIndex = this.width;
        while (colIndex--) {
            let absSum = 0;
            let rowIndex = this.height;
            while (rowIndex--) {
                absSum += Math.abs(this.m[rowIndex * this.width + colIndex]);
            }
            result = Math.max(result, absSum);
        }
        return result;
    }
    maxAbsRowSum() {
        let result = 0;
        let rowIndex = this.height;
        while (rowIndex--) {
            let absSum = 0;
            let colIndex = this.width;
            while (colIndex--) {
                absSum += Math.abs(this.m[rowIndex * this.width + colIndex]);
            }
            result = Math.max(result, absSum);
        }
        return result;
    }
    getTriangularDeterminant() {
        assert(this.isUpperTriangular() || this.isLowerTriangular(), 'not a triangular matrix');
        let product = 1;
        let elIndex = this.width * (this.width + 1);
        while (elIndex) {
            elIndex -= this.width + 1;
            product *= this.m[elIndex];
        }
        return product;
    }
    /**
     * Calculates the determinant by first calculating the LU decomposition. If you already have that, use
     * U.getTriangularDeterminant()
     */
    getDeterminant() {
        // PA = LU
        // det(A) * det(B) = det(A * B)
        // det(P) == 1 (permutation matrix)
        // det(L) == 1 (main diagonal is 1s
        // =>  det(A) == det(U)
        return this.luDecomposition().U.getTriangularDeterminant();
    }
    hasFullRank() {
        return Math.min(this.width, this.height) == this.rank();
    }
    permutationAsIndexMap() {
        assertf(() => this.isPermutation());
        const result = new Array(this.height);
        let i = this.height;
        while (i--) {
            const searchIndexStart = i * this.width;
            let searchIndex = searchIndexStart;
            while (this.m[searchIndex] < 0.5)
                searchIndex++;
            result[i] = searchIndex - searchIndexStart;
        }
        return result;
    }
    getDependentRowIndexes(gauss = this.gauss()) {
        const { L, U, P } = gauss;
        // rows which end up as zero vectors in U are not linearly independent
        const dependents = new Array(this.height);
        let uRowIndex = this.height;
        while (uRowIndex--) {
            const uRow = U.row(uRowIndex);
            if (uRow.length() < NLA_PRECISION) {
                dependents[uRowIndex] = true;
            }
            else {
                break;
            }
        }
        // figure out from which other rows the rows which end up as zero vectors are created by
        let lRowIndex = this.height;
        while (lRowIndex--) {
            if (dependents[lRowIndex]) {
                let lColIndex = Math.min(lRowIndex, this.width);
                while (lColIndex--) {
                    if (0 !== L.e(lRowIndex, lColIndex)) {
                        dependents[lColIndex] = true;
                    }
                }
            }
        }
        console.log('m\n', this.toString(x => '' + x));
        console.log('L\n', L.toString(x => '' + x));
        console.log('U\n', U.toString(x => '' + x));
        console.log('P\n', P.toString(x => '' + x));
        // gauss algorithm permutes the order of the rows, so map our results back to the original indices
        const indexMap = P.permutationAsIndexMap();
        const dependentRowIndexes = dependents.map((b, index) => b && indexMap[index]).filter(x => x != undefined);
        return dependentRowIndexes;
    }
}

const { abs, PI, sign } = Math;
const TAU = 2 * PI;
/** @define {boolean} */
const NLA_DEBUG = true;
const NLA_PRECISION = 1 / (1 << 26);
console.log('NLA_PRECISION', NLA_PRECISION);
console.log('NLA_DEBUG', NLA_DEBUG);
function assertVectors(...vectors) {
    if (NLA_DEBUG) {
        for (let i = 0; i < arguments.length; i++) {
            if (!(arguments[i] instanceof V3 || arguments[i] instanceof Vector)) {
                throw new Error('assertVectors arguments[' + (i) + '] is not a vector. ' + typeof arguments[i] + ' == typeof ' + arguments[i]);
            }
        }
    }
    return true;
}
function assertInst(what, ...objs) {
    if (NLA_DEBUG) {
        for (let i = 0; i < objs.length; i++) {
            if (!(objs[i] instanceof what)) {
                throw new Error('assertInst objs[' + (i) + '] is not a ' + what.prototype.name + '. ' + objs[i].constructor.name + objs[i]);
            }
        }
    }
    return true;
}
function assertNumbers(...numbers) {
    if (NLA_DEBUG) {
        for (let i = 0; i < numbers.length; i++) {
            if ('number' !== typeof numbers[i]) {
                throw new Error('assertNumbers arguments[' + (i) + '] is not a number. ' + typeof numbers[i] + ' == typeof ' + numbers[i]);
            }
        }
    }
    return true;
}
function assert(value, ...messages) {
    if (NLA_DEBUG && !value) {
        throw new Error('assert failed: '
            + messages.map(message => ('function' === typeof message ? message() : message || '')).join('\n'));
    }
    return true;
}
function assertf(f, ...messages) {
    if (!f()) {
        throw new Error('assertf failed: ' + f.toString()
            + messages.map(message => ('function' === typeof message ? message() : message || '')).join('\n'));
    }
}
function lerp(a, b, t) {
    return a * (1 - t) + b * t;
}
const originalNumberToString = Number.prototype.toString;
Number.prototype.toString = function (radix) {
    if (PI == this) {
        return 'PI';
    }
    return originalNumberToString.call(this, radix);
};
const eq0 = (x, EPS = NLA_PRECISION) => Math.abs(x) <= EPS;
const eq = (x, y, EPS = NLA_PRECISION) => Math.abs(x - y) <= EPS;
const lt = (x, y, EPS = NLA_PRECISION) => x - y < -EPS;
/** @deprecated */ const eq2 = eq;
/**
 * Decimal adjustment of a number.
 *
 * @param f  The type of adjustment.
 * @param value The number.
 * @param exp The exponent (the 10 logarithm of the adjustment base).
 * @returns The adjusted value.
 */
function decimalAdjust(f, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
        return f(value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
        return NaN;
    }
    // Shift
    let vs = value.toString().split('e');
    value = f(+(vs[0] + 'e' + (vs[1] ? (+vs[1] - exp) : -exp)));
    // Shift back
    vs = value.toString().split('e');
    return +(vs[0] + 'e' + (vs[1] ? (+vs[1] + exp) : exp));
}
const round10 = decimalAdjust.bind(undefined, Math.round);
const floor10 = decimalAdjust.bind(undefined, Math.floor);
const ceil10 = decimalAdjust.bind(undefined, Math.ceil);
function repeatString(count, str) {
    if (count == 0) {
        return '';
    }
    count *= str.length;
    const halfCharLength = count / 2;
    let result = str;
    // double the input until it is long enough.
    while (result.length <= halfCharLength) {
        result += result;
    }
    // use substring to hit the precise length target without
    // using extra memory
    return result + result.substring(0, count - result.length);
}
function arraySwap(arr, i, j) {
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}
function arrayCopy(src, sstart, dst, dstart, length) {
    dstart += length;
    length += sstart;
    while (length-- > sstart) {
        dst[--dstart] = src[length];
    }
}
function clamp(val, min, max) {
    assertNumbers(val, min, max);
    return Math.max(min, Math.min(max, val));
}
function arrayCopyStep(src, sstart, sstep, dst, dstart, dstep, count) {
    let srcIndex = sstart + count * sstep;
    let dIndex = dstart + count * dstep;
    while (srcIndex > sstart) {
        dst[dIndex -= dstep] = src[srcIndex -= sstep];
    }
}
function arrayCopyBlocks(src, sstart, sstep, dst, dstart, dstep, blockSize, blockCount) {
    for (let i = 0; i < blockCount; i++) {
        arrayCopy(src, sstart + sstep * i, dst, dstart + dstep * i, blockSize);
    }
}
function arrayFromFunction(length, f) {
    assertNumbers(length);
    assert('function' == typeof f);
    const a = new Array(length);
    let elIndex = length;
    while (elIndex--) {
        a[elIndex] = f(elIndex);
    }
    return a;
}
function addOwnProperties(target, props, ...exclude) {
    Object.getOwnPropertyNames(props).forEach(key => {
        //console.log(props, key)
        if (!exclude.includes(key)) {
            if (target.hasOwnProperty(key)) {
                console.warn('target ', target, ' already has property ', key, target[key]);
            }
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(props, key));
        }
    });
}
//function defineClass(name, parent, constructor, props, statics) {
//	assertf(() => 'function' == typeof constructor, 'function' == typeof constructor)
//	constructor.prototype = defineObject(parent && parent.prototype, props)
//	constructor.prototype.constructor = constructor
//	Object.defineProperty(constructor.prototype, 'name', {value: name})
//	statics && addOwnProperties(constructor, statics)
//	return constructor
//}
let defaultRoundFunction = (x) => x; // Math.round10(x, -4)
const MINUS = (a, b) => a - b;
function floatHashCode(f) {
    return ~~(f * (1 << 28));
}
const DEG = .017453292519943295;
function time(f) {
    const start = performance.now();
    f();
    return performance.now() - start;
}
Object.map = function (o, f, context = undefined) {
    const result = {};
    for (const key in o) {
        result[key] = f.call(context, o[key], key, o);
    }
    return result;
};
Array.prototype.emod = function (i) {
    return this[i % this.length];
};
Array.prototype.sliceStep = function (start, end, step, chunkSize = 1) {
    assertNumbers(start, step);
    start < 0 && (start = this.length + start);
    end <= 0 && (end = this.length + end);
    const resultLength = Math.ceil((end - start) / step);
    const result = new Array(resultLength); // '- start' so that chunk in the last row
    // will also be selected, even if the row is
    // not complete
    let index = 0;
    for (let i = start; i < end; i += step) {
        for (let j = i; j < Math.min(i + chunkSize, end); j++) {
            result[index++] = this[j];
        }
    }
    assert(resultLength == index);
    return result;
};
Array.prototype.equals = function (obj) {
    if (this === obj)
        return true;
    if (Object.getPrototypeOf(obj) !== Array.prototype)
        return false;
    if (this.length !== obj.length)
        return false;
    for (let i = 0; i < this.length; i++) {
        if (!this[i].equals(obj[i]))
            return false;
    }
    return true;
};
Array.prototype.hashCode = function () {
    let hashCode = 0;
    for (let i = 0; i < this.length; i++) {
        hashCode = hashCode * 31 + this[i].hashCode() | 0;
    }
    return hashCode | 0;
};
Array.prototype.mapFilter = function (f) {
    const length = this.length, result = [];
    for (let i = 0; i < length; i++) {
        if (i in this) {
            const val = f(this[i], i, this);
            if (val) {
                result.push(val);
            }
        }
    }
    return result;
};
Array.prototype.flatMap = function (f) {
    return Array.prototype.concat.apply([], this.map(f));
};
Array.prototype.clear = function (...newItems) {
    return this.splice(0, this.length, ...newItems);
};
/**
 *
 * @returns Array.prototype.concat.apply([], this)
 */
Array.prototype.concatenated = function () {
    return Array.prototype.concat.apply([], this);
};
Array.prototype.min = function () {
    let i = this.length, max = Infinity;
    while (i--) {
        const val = this[i];
        if (max > val)
            max = val;
    }
    return max;
};
Array.prototype.max = function () {
    // faster and no limit on array size, see https://jsperf.com/math-max-apply-vs-loop/2
    let i = this.length, max = -Infinity;
    while (i--) {
        const val = this[i];
        if (max < val)
            max = val;
    }
    return max;
};
Array.prototype.indexWithMax = function (f) {
    if (this.length == 0) {
        return -1;
    }
    let i = this.length, result = -1, maxVal = -Infinity;
    while (i--) {
        const val = f(this[i], i, this);
        if (val > maxVal) {
            maxVal = val;
            result = i;
        }
    }
    return result;
};
Array.prototype.withMax = function (f) {
    let i = this.length, result = undefined, maxVal = -Infinity;
    while (i--) {
        const el = this[i], val = f(el, i, this);
        if (val > maxVal) {
            maxVal = val;
            result = el;
        }
    }
    return result;
};
/**
 Returns the sum of the absolute values of the components of this vector.
 E.g. V(1, -2, 3) === abs(1) + abs(-2) + abs(3) === 1 + 2 + 3 === 6
 */
Array.prototype.absSum = function () {
    let i = this.length;
    let result = 0;
    while (i--) {
        result += Math.abs(this[i]);
    }
    return result;
};
Array.prototype.sum = function () {
    let i = this.length;
    let result = 0;
    while (i--) {
        result += this[i];
    }
    return result;
};
Array.prototype.sumInPlaceTree = function () {
    if (0 == this.length)
        return 0;
    let l = this.length;
    while (l != 1) {
        const lHalfFloor = Math.floor(l / 2);
        const lHalfCeil = Math.ceil(l / 2);
        for (let i = 0; i < lHalfFloor; i++) {
            this[i] += this[i + lHalfCeil];
        }
        l = lHalfCeil;
    }
    return this[0];
};
Array.prototype.isEmpty = function () {
    return 0 == this.length;
};
Array.prototype.unique = function () {
    const uniqueSet = new Set(this);
    return Array.from(uniqueSet);
};
Array.prototype.remove = function (o) {
    const index = this.indexOf(o);
    if (index != -1) {
        this.splice(index, 1);
        return true;
    }
    return false;
};
Array.prototype.removeIndex = function (i) {
    const result = this[i];
    this.splice(i, 1);
    return result;
};
Array.prototype.bagRemoveIndex = function (i) {
    const result = this[i];
    if (i == this.length - 1) {
        this.pop();
    }
    else {
        this[i] = this.pop();
    }
    return result;
};
Array.prototype.removeMatch = function (matcher) {
    const index = this.findIndex(matcher);
    if (-1 != index) {
        return this.removeIndex(index);
    }
};
Array.prototype.removeAll = function (o) {
    let i = o.length;
    while (i--) {
        this.remove(o[i]);
    }
};
Array.prototype.toggle = function (o) {
    const index = this.indexOf(o);
    if (index != -1) {
        this.splice(index, 1);
        return false;
    }
    else {
        this.push(o);
        return true;
    }
};
Array.prototype.bagToggle = function (o) {
    const index = this.indexOf(o);
    if (index != -1) {
        this.bagRemoveIndex(index);
        return false;
    }
    else {
        this.push(o);
        return true;
    }
};
Array.prototype.binaryIndexOf = function (searchElement, cmp = (a, b) => a - b) {
    let minIndex = 0;
    let maxIndex = this.length - 1;
    let currentIndex;
    let currentElement;
    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = this[currentIndex];
        if (cmp(currentElement, searchElement) < 0) {
            minIndex = currentIndex + 1;
        }
        else if (cmp(currentElement, searchElement) > 0) {
            maxIndex = currentIndex - 1;
        }
        else {
            return currentIndex;
        }
    }
    return -minIndex - 1;
};
Array.prototype.binaryInsert = function (el, cmp = MINUS) {
    let minIndex = 0;
    let maxIndex = this.length;
    let currentIndex;
    let currentElement;
    while (minIndex < maxIndex) {
        currentIndex = ~~((minIndex + maxIndex) / 2);
        currentElement = this[currentIndex];
        if (cmp(currentElement, el) < 0) {
            minIndex = currentIndex + 1;
        }
        else {
            maxIndex = currentIndex;
        }
    }
    this.splice(minIndex, 0, el);
};
Object.defineProperty(Array.prototype, 'last', {
    get() {
        return this[this.length - 1];
    },
    set(val) {
        this[this.length - 1] = val;
    },
});
String.prototype.capitalizeFirstLetter = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
String.prototype.equals = function (x) {
    return this == x;
};
function SCE(o) {
    switch (typeof o) {
        case 'undefined':
            return 'undefined';
        case 'function':
            return o.toString();
        case 'number':
            return '' + o;
        case 'string':
            return JSON.stringify(o);
        case 'object':
            if (null == o) {
                return 'null';
            }
            else {
                return o.sce;
            }
        default:
            throw new Error();
    }
}
Object.defineProperty(Object.prototype, 'sce', { get: function () { return this.toSource(); } });
Object.defineProperty(Object.prototype, 'str', { get: function () { return this.toString(); } });
/**
 * solves x² + px + q = 0
 */
function pqFormula(p, q) {
    // 4 times the discriminant:in
    const discriminantX4 = p * p / 4 - q;
    if (discriminantX4 < -NLA_PRECISION) {
        return [];
    }
    else if (discriminantX4 <= NLA_PRECISION) {
        return [-p / 2];
    }
    else {
        const root = Math.sqrt(discriminantX4);
        return [-p / 2 - root, -p / 2 + root];
    }
}
/**
 * from pomax' library
 * solves ax³ + bx² + cx + d = 0
 * This function from pomax' utils
 * @returns 0-3 roots
 */
function solveCubicReal2(a, b, c, d) {
    if (eq0(a)) {
        if (eq0(b)) {
            return [-d / c];
        }
        else {
            return pqFormula(c / b, d / b);
        }
    }
    const divisor = a;
    a = b / divisor;
    b = c / divisor;
    c = d / divisor;
    const p = (3 * b - a * a) / 3, pDiv3 = p / 3, pDiv3Pow3 = pDiv3 * pDiv3 * pDiv3, q = (2 * a * a * a - 9 * a * b + 27 * c) / 27, qDiv2 = q / 2, discriminant = qDiv2 * qDiv2 + pDiv3Pow3;
    // 18abcd - 4b³d + b²c² - 4ac³ - 27a²d²
    if (discriminant < -NLA_PRECISION / 8) {
        const r = Math.sqrt(-pDiv3Pow3), t = -q / (2 * r), cosphi = t < -1 ? -1 : t > 1 ? 1 : t, // clamp t to [-1;1]
        phi = Math.acos(cosphi), t1 = 2 * Math.cbrt(r);
        const x1 = t1 * Math.cos(phi / 3) - a / 3;
        const x2 = t1 * Math.cos((phi + 2 * Math.PI) / 3) - a / 3;
        const x3 = t1 * Math.cos((phi + 4 * Math.PI) / 3) - a / 3;
        return [x1, x2, x3];
    }
    else if (discriminant <= NLA_PRECISION / 8) {
        if (0 == qDiv2) {
            // TODO: compare with likeO?
            return [-a / 3];
        }
        const u1 = qDiv2 < 0 ? Math.cbrt(-qDiv2) : -Math.cbrt(qDiv2);
        const x1 = 2 * u1 - a / 3;
        const x2 = -u1 - a / 3;
        return [x1, x2];
    }
    else {
        const sd = Math.sqrt(discriminant);
        const u1 = Math.cbrt(-qDiv2 + sd);
        const v1 = Math.cbrt(qDiv2 + sd);
        return [u1 - v1 - a / 3];
    }
}
function callsce(name, ...params) {
    return name + '(' + params.map(SCE).join(',') + ')';
}

/**
 * Immutable 3d-vector/point.
 */
class V3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        assertNumbers(x, y, z);
    }
    get [0]() {
        return this.x;
    }
    get [1]() {
        return this.y;
    }
    get [2]() {
        return this.z;
    }
    static random() {
        return new V3(Math.random(), Math.random(), Math.random());
    }
    static parallel(a, b) {
        return a.dot(b) - a.length() * b.length();
    }
    /**
     * See http://math.stackexchange.com/questions/44689/how-to-find-a-random-axis-or-unit-vector-in-3d
     * @returns A random point on the unit sphere with uniform distribution across the surface.
     */
    static randomUnit() {
        const zRotation = Math.random() * 2 * Math.PI;
        const z = Math.random() * 2 - 1;
        const zRadius = Math.sqrt(1 - Math.pow(z, 2));
        return new V3(zRadius * Math.cos(zRotation), zRadius * Math.sin(zRotation), z);
    }
    //noinspection JSUnusedLocalSymbols
    /**
     * Documentation stub. You want {@see V3#sphere}
     */
    static fromAngles(theta, phi) {
        throw new Error();
    }
    static fromFunction(f) {
        return new V3(f(0), f(1), f(2));
    }
    static min(a, b) {
        return new V3(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
    }
    static max(a, b) {
        return new V3(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
    }
    static lerp(a, b, fraction) {
        return b.minus(a).times(fraction).plus(a);
    }
    static fromArray(a) {
        return new V3(a[0], a[1], a[2]);
    }
    static angleBetween(a, b) {
        return a.angleTo(b);
    }
    static zip(f, ...args) {
        assert(f instanceof Function);
        return new V3(f.apply(undefined, args.map(x => x.x)), f.apply(undefined, args.map(x => x.y)), f.apply(undefined, args.map(x => x.z)));
    }
    static normalOnPoints(a, b, c) {
        assertVectors(a, b, c);
        return a.to(b).cross(a.to(c));
    }
    static add(...vs) {
        assertVectors.apply(undefined, vs);
        let x = 0, y = 0, z = 0;
        let i = vs.length;
        while (i--) {
            x += vs[i].x;
            y += vs[i].y;
            z += vs[i].z;
        }
        return new V3(x, y, z);
    }
    static sub(...vs) {
        assertVectors.apply(undefined, vs);
        let x = vs[0].x, y = vs[0].y, z = vs[0].z;
        let i = vs.length;
        while (i--) {
            x -= vs[i].x;
            y -= vs[i].y;
            z -= vs[i].z;
        }
        return new V3(x, y, z);
    }
    /**
     * Pack an array of V3s into an array of numbers (Float32Array by default).
     *
     * @param v3arr source array
     * @param dest destination array. If provided, must be large enough to fit v3count items.
     * @param srcStart starting index in source array
     * @param destStart starting index in destination array
     * @param v3count Number of V3s to copy.
     * @returns Packed array.
     */
    static pack(v3arr, dest, srcStart = 0, destStart = 0, v3count = v3arr.length - srcStart) {
        //assert (v3arr.every(v3 => v3 instanceof V3), 'v3arr.every(v3 => v3 instanceof V3)')
        const result = dest || new Float32Array(3 * v3count); // TODO
        assert(result.length - destStart >= v3count * 3, 'dest.length - destStart >= v3count * 3', result.length, destStart, v3count * 3);
        let i = v3count, srcIndex = srcStart, destIndex = destStart;
        while (i--) {
            const v = v3arr[srcIndex++];
            result[destIndex++] = v.x;
            result[destIndex++] = v.y;
            result[destIndex++] = v.z;
        }
        return result;
    }
    static unpack(packedArray, dest, srcStart = 0, destStart = 0, v3count = (packedArray.length - srcStart) / 3) {
        //assert (v3arr.every(v3 => v3 instanceof V3), 'v3arr.every(v3 => v3 instanceof V3)')
        const result = dest || new Array(v3count);
        assert(result.length - destStart >= v3count, 'dest.length - destStart >= v3count');
        let i = v3count, srcIndex = srcStart, destIndex = destStart;
        while (i--) {
            result[destIndex++] = new V3(packedArray[srcIndex++], packedArray[srcIndex++], packedArray[srcIndex++]);
        }
        return result;
    }
    static packXY(v3arr, dest, srcStart = 0, destStart = 0, v3count = v3arr.length - srcStart) {
        //assert (v3arr.every(v3 => v3 instanceof V3), 'v3arr.every(v3 => v3 instanceof V3)')
        const result = dest || new Float32Array(2 * v3count);
        assert(result.length - destStart >= v3count, 'dest.length - destStart >= v3count');
        let i = v3count, srcIndex = srcStart, destIndex = destStart;
        while (i--) {
            const v = v3arr[srcIndex++];
            result[destIndex++] = v.x;
            result[destIndex++] = v.y;
        }
        return result;
    }
    static unpackXY(src, dest, srcStart = 0, destStart = 0, v3count = Math.min(src.length / 2, dest && dest.length || Infinity) - destStart) {
        //assert (v3arr.every(v3 => v3 instanceof V3), 'v3arr.every(v3 => v3 instanceof V3)')
        dest = dest || new Array(v3count);
        assert(dest.length - destStart >= v3count, 'dest.length - destStart >= v3count');
        assert(src.length - srcStart >= v3count * 2, 'dest.length - destStart >= v3count');
        let i = v3count, srcIndex = srcStart, destIndex = destStart;
        while (i--) {
            dest[destIndex++] = new V3(src[srcIndex++], src[srcIndex++], 0);
        }
        return dest;
    }
    static perturbed(v, delta) {
        return v.perturbed(delta);
    }
    static polar(radius, phi, z = 0) {
        return new V3(radius * Math.cos(phi), radius * Math.sin(phi), z);
    }
    /**
     *
     * @param longitude angle in XY plane
     * @param latitude "height"/z dir angle
     */
    static sphere(longitude, latitude, length = 1) {
        return new V3(length * Math.cos(latitude) * Math.cos(longitude), length * Math.cos(latitude) * Math.sin(longitude), length * Math.sin(latitude));
    }
    static inverseLerp(a, b, x) {
        const ab = a.to(b);
        return a.to(x).dot(ab) / ab.squared();
    }
    perturbed(delta = NLA_PRECISION * 0.8) {
        return this.map(x => x + (Math.random() - 0.5) * delta);
    }
    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
        yield this.z;
    }
    e(index) {
        assert(index >= 0 && index < 3);
        return 0 == index ? this.x : (1 == index ? this.y : this.z);
    }
    negated() {
        return new V3(-this.x, -this.y, -this.z);
    }
    abs() {
        return new V3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
    }
    plus(a) {
        assertVectors(a);
        return new V3(this.x + a.x, this.y + a.y, this.z + a.z);
    }
    /**
     * Hadarmard product (or Schur product)
     * Element-wise multiplication of two vectors.
     * @see https://en.wikipedia.org/wiki/Hadamard_product_(matrices)
     *
     */
    schur(a) {
        return new V3(this.x * a.x, this.y * a.y, this.z * a.z);
    }
    /**
     * Element-wise division.
     */
    divv(a) {
        return new V3(this.x / a.x, this.y / a.y, this.z / a.z);
    }
    /**
     * See also {@link to} which is a.minus(this)
     */
    minus(a) {
        assertVectors(a);
        return new V3(this.x - a.x, this.y - a.y, this.z - a.z);
    }
    to(a) {
        assertVectors(a);
        return a.minus(this);
    }
    times(factor) {
        assertNumbers(factor);
        return new V3(this.x * factor, this.y * factor, this.z * factor);
    }
    div(a) {
        assertNumbers(a);
        return new V3(this.x / a, this.y / a, this.z / a);
    }
    /**
     * Dot product.
     * @see https://en.wikipedia.org/wiki/Dot_product
     */
    dot(a) {
        assertInst(V3, a);
        return this.x * a.x + this.y * a.y + this.z * a.z;
    }
    /**
     * Linearly interpolate
     */
    lerp(b, t) {
        assertVectors(b);
        assertNumbers(t);
        return this.plus(b.minus(this).times(t));
    }
    squared() {
        return this.dot(this);
    }
    distanceTo(a) {
        assertVectors(a);
        //return this.minus(a).length()
        return Math.hypot(this.x - a.x, this.y - a.y, this.z - a.z);
    }
    distanceToSquared(a) {
        assertVectors(a);
        return this.minus(a).squared();
    }
    ///**
    // * See also {@see #setTo} for the individual
    // *
    // * @param v
    // */
    //assign(v) {
    //	assertVectors(v)
    //	this.x = v.x
    //	this.y = v.y
    //	this.z = v.z
    //}
    //
    ///**
    // * See also {@see #assign} for the V3 version
    // *
    // * @param x
    // * @param y
    // * @param z
    // */
    //setTo(x, y, z = 0) {
    //	this.x = x
    //	this.y = y
    //	this.z = z
    //}
    toSource() {
        return V3.NAMEMAP.get(this) || this.toString();
    }
    nonParallelVector() {
        const abs = this.abs();
        if ((abs.x <= abs.y) && (abs.x <= abs.z)) {
            return V3.X;
        }
        else if ((abs.y <= abs.x) && (abs.y <= abs.z)) {
            return V3.Y;
        }
        else {
            return V3.Z;
        }
    }
    slerp(b, t) {
        assertVectors(b);
        assertNumbers(t);
        const sin = Math.sin;
        const omega = this.angleTo(b);
        return this.times(sin((1 - t) * omega) / sin(omega)).plus(b.times(sin(t * omega) / sin(omega)));
    }
    min(b) {
        return new V3(Math.min(this.x, b.x), Math.min(this.y, b.y), Math.min(this.z, b.z));
    }
    max(b) {
        return new V3(Math.max(this.x, b.x), Math.max(this.y, b.y), Math.max(this.z, b.z));
    }
    equals(v) {
        return this == v || this.x == v.x && this.y == v.y && this.z == v.z;
    }
    /**
     *
     * The cross product is defined as:
     * a x b = |a| * |b| * sin(phi) * n
     * where |.| is the euclidean norm, phi is the angle between the vectors
     * and n is a unit vector perpendicular to both a and b.
     *
     * The cross product is zero for parallel vectors.
     * @see https://en.wikipedia.org/wiki/Cross_product
     */
    cross(v) {
        return new V3(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x);
    }
    //noinspection JSMethodCanBeStatic
    /**
     * Documentation stub. You want {@link unit}
     */
    normalized() { throw new Error('documentation stub. use .unit()'); }
    minElement() {
        return Math.min(this.x, this.y, this.z);
    }
    maxElement() {
        return Math.max(this.x, this.y, this.z);
    }
    toArray(n = 3) {
        return [this.x, this.y, this.z].slice(0, n);
    }
    /**
     * Get a perpendicular vector.
     * For vectors in the XY-Plane, returns vector rotated 90° CCW.
     */
    getPerpendicular() {
        if (eq0(this.x) && eq0(this.y)) {
            if (eq0(this.z)) {
                throw new Error('zero vector');
            }
            // v is Vector(0, 0, v.z)
            return V3.Y;
        }
        return new V3(-this.y, this.x, 0);
    }
    //noinspection JSMethodCanBeStatic
    dim() {
        return 3;
    }
    els() {
        return [this.x, this.y, this.z];
    }
    angleXY() {
        return Math.atan2(this.y, this.x);
    }
    lengthXY() {
        return Math.hypot(this.x, this.y);
        //return Math.sqrt(this.x * this.x + this.y * this.y)
    }
    squaredXY() {
        return this.x * this.x + this.y * this.y;
    }
    xy() {
        return new V3(this.x, this.y, 0);
    }
    /**
     * Transform this vector element-wise by way of function f. Returns V3(f(x), f(y), f(z))
     * @param f function to apply to elements (number -> number)
     */
    map(f) {
        return new V3(f(this.x, 'x'), f(this.y, 'y'), f(this.z, 'z'));
    }
    toString(roundFunction) {
        roundFunction = roundFunction || defaultRoundFunction;
        return V3.NAMEMAP.get(this) ||
            'V(' + [this.x, this.y, this.z].map(roundFunction).join(', ') + ')'; //+ this.id
    }
    angleTo(b) {
        assert(1 == arguments.length);
        assertVectors(b);
        assert(!this.likeO());
        assert(!b.likeO());
        return Math.acos(Math.min(1, this.dot(b) / this.length() / b.length()));
    }
    /**
     *
     * phi = angle between A and B
     * alpha = angle between n and normal1
     *
     * A . B = ||A|| * ||B|| * cos(phi)
     * A x B = ||A|| * ||B|| * sin(phi) * n (n = unit vector perpendicular)
     * (A x B) . normal1 = ||A|| * ||B|| * sin(phi) * cos(alpha)
     */
    angleRelativeNormal(vector, normal1) {
        assert(2 == arguments.length);
        assertVectors(vector, normal1);
        assertf(() => normal1.hasLength(1));
        //assert(vector.isPerpendicularTo(normal1), 'vector.isPerpendicularTo(normal1)' + vector.sce + normal1.sce)
        //assert(this.isPerpendicularTo(normal1), 'this.isPerpendicularTo(normal1)' + this.dot(vector)) //
        // -0.000053600770598683675
        return Math.atan2(this.cross(vector).dot(normal1), this.dot(vector));
    }
    /**
     Returns true iff this is parallel to vector, i.e. this * s == vector, where s is a pos or neg number, using equals
     Throw a DebugError
     if vector is not a Vector or
     if this has a length of 0 or
     if vector has a length of 0
     */
    isParallelTo(vector) {
        assertVectors(vector);
        assert(!this.likeO());
        assert(!vector.likeO());
        // a . b takes on values of +|a|*|b| (vectors same direction) to -|a|*|b| (opposite direction)
        // in both cases the vectors are parallel, so check if abs(a . b) == |a|*|b|
        const dot = this.dot(vector);
        return eq(this.squared() * vector.squared(), dot * dot);
    }
    isPerpendicularTo(vector) {
        assertVectors(vector);
        assert(!this.likeO(), '!this.likeO()');
        assert(!vector.likeO(), '!vector.likeO()');
        return eq0(this.dot(vector));
    }
    isReverseDirTo(other) {
        assertVectors(other);
        assert(!this.likeO());
        assert(!other.likeO());
        // a . b takes on values of +|a|*|b| (vectors same direction) to -|a|*|b| (opposite direction)
        // in both cases the vectors are parallel, so check if abs(a . b) == |a|*|b|
        const dot = this.dot(other);
        return eq(Math.sqrt(this.squared() * other.squared()), dot);
    }
    /**
     * Returns the length of this Vector, i.e. the euclidean norm.
     *
     * Note that the partial derivatives of the euclidean norm at point x are equal to the
     * components of the unit vector x.
     */
    length() {
        return Math.hypot(this.x, this.y, this.z);
        //return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
    }
    /**
     * Definition: V3.likeO == V3.like(V3.O)
     */
    likeO() {
        return this.like(V3.O);
    }
    like(obj) {
        if (obj === this)
            return true;
        if (!(obj instanceof V3))
            return false;
        return eq(this.x, obj.x) && eq(this.y, obj.y) && eq(this.z, obj.z);
    }
    /**
     * equivalent to this.like(v) || this.negated().like(v)
     */
    likeOrReversed(v) {
        return eq(Math.abs(this.dot(v)), Math.sqrt(this.squared() * v.squared()));
    }
    /**
     * Returns a new unit Vector (.length() === 1) with the same direction as this vector. Throws a
     * DebugError if this has a length of 0.
     */
    unit() {
        assert(!this.likeO(), 'cannot normalize zero vector');
        return this.div(this.length());
    }
    /**
     * Returns a new V3 equal to this scaled so that its length is equal to newLength.
     *
     * Passing a negative newLength will flip the vector.
     */
    toLength(newLength) {
        assertNumbers(newLength);
        return this.times(newLength / this.length());
    }
    /**
     Returns a new Vector which is the projection of this vector onto the passed vector.
     Examples
     V(3, 4).projectedOn(V(1, 0)) // returns V(3, 0)
     V(3, 4).projectedOn(V(2, 0)) // returns V(3, 0)
     V(3, 4).projectedOn(V(-1, 0)) // returns V(-3, 0)
     V(3, 4).projectedOn(V(0, 1)) // returns V(0, 4)
     V(3, 4).projectedOn(V(1, 1)) // returns
     */
    projectedOn(b) {
        assertVectors(b);
        // https://en.wikipedia.org/wiki/Vector_projection#Vector_projection_2
        return b.times(this.dot(b) / b.dot(b));
    }
    rejectedFrom(b) {
        assertVectors(b);
        // https://en.wikipedia.org/wiki/Vector_projection#Vector_projection_2
        return this.minus(b.times(this.dot(b) / b.dot(b)));
    }
    rejectedFrom1(b1) {
        assertVectors(b1);
        assert(b1.hasLength(1));
        // https://en.wikipedia.org/wiki/Vector_projection#Vector_projection_2
        return this.minus(b1.times(this.dot(b1)));
    }
    /**
     * Returns the length of this vector rejected from the unit vector b.
     *
     *       /|
     * this / |    ^
     *     /__|    | b
     *      r
     *  Returns length of r (r === this.rejectedFrom(b))
     */
    rejectedLength(b) {
        assertVectors(b);
        return Math.sqrt(this.dot(this) - Math.pow(this.dot(b), 2) / b.dot(b));
    }
    /**
     * Returns the length of this vector rejected from the unit vector b1.
     *
     *       /|
     * this / |    ^
     *     /__|    | b1
     *      r
     *  Returns length of r (r === this.rejectedFrom(b1))
     */
    rejected1Length(b1) {
        assertVectors(b1);
        assert(b1.hasLength(1));
        return Math.sqrt(this.dot(this) - Math.pow(this.dot(b1), 2));
    }
    /**
     Returns true iff the length() of this vector is equal to 'length', using eq
     E.g. V(3, 4).hasLength(5) === true
     V(1, 1).hasLength(1) === false
     */
    hasLength(length) {
        assertNumbers(length);
        return eq(length, this.length());
    }
    /**
     Returns the sum of the absolute values of the components of this vector.
     E.g. V(1, -2, 3) === abs(1) + abs(-2) + abs(3) === 1 + 2 + 3 === 6
     */
    absSum() {
        return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
    }
    /**
     * returns max(|x|, |y|, |z|)
     */
    maxAbsElement() {
        return Math.max(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
    }
    /**
     * returns min(|x|, |y|, |z|)
     */
    minAbsElement() {
        return Math.min(Math.abs(this.x), Math.abs(this.y), Math.min(this.z));
    }
    maxAbsDim() {
        const xAbs = Math.abs(this.x), yAbs = Math.abs(this.y), zAbs = Math.abs(this.z);
        return xAbs >= yAbs ? (xAbs >= zAbs ? 0 : 2) : (yAbs >= zAbs ? 1 : 2);
    }
    minAbsDim() {
        const xAbs = Math.abs(this.x), yAbs = Math.abs(this.y), zAbs = Math.abs(this.z);
        return xAbs < yAbs ? (xAbs < zAbs ? 0 : 2) : (yAbs < zAbs ? 1 : 2);
    }
    withElement(dim, el) {
        assert(['x', 'y', 'z'].includes(dim), '' + dim);
        assertNumbers(el);
        if ('x' == dim) {
            return new V3(el, this.y, this.z);
        }
        if ('y' == dim) {
            return new V3(this.x, el, this.z);
        }
        return new V3(this.x, this.y, el);
    }
    hashCode() {
        function floatHashCode$$1(f) {
            return ~~(f * (1 << 28));
        }
        return ~~((floatHashCode$$1(this.x) * 31 + floatHashCode$$1(this.y)) * 31 + floatHashCode$$1(this.z));
    }
    hashCodes() {
        //function floatHashCode(f) {
        //	return ~~(f * (1 << 28))
        //}
        // compare hashCode.floatHashCode
        // the following ops are equivalent to
        // floatHashCode((el - NLA_PRECISION) % (2 * NLA_PRECISION))
        // this results in the hashCode for the (out of 8 possible) cube with the lowest hashCode
        // the other 7 can be calculated by adding constants
        const xHC = ~~(this.x * (1 << 28) - 0.5), yHC = ~~(this.y * (1 << 28) - 0.5), zHC = ~~(this.z * (1 << 28) - 0.5), hc = ~~((xHC * 31 + yHC) * 31 + zHC);
        return [
            ~~(hc),
            ~~(hc + 961),
            ~~(hc + 31),
            ~~(hc + 31 + 961),
            ~~(hc + 1),
            ~~(hc + 1 + 961),
            ~~(hc + 1 + 31),
            ~~(hc + 1 + 31 + 961),
        ];
    }
    //static areDisjoint(it: Iterable<V3>): boolean {
    //	const vSet = new CustomSet
    //	for (const v of it) {
    //		if (!v.equals(vSet.canonicalizeLike(v))) {
    //			// like value already in set
    //			return false
    //		}
    //	}
    //	return true
    //}
    compareTo(other) {
        if (this.x != other.x) {
            return this.x - other.x;
        }
        else if (this.y != other.y) {
            return this.y - other.y;
        }
        else {
            return this.z - other.z;
        }
    }
    compareTo2(other, eps = NLA_PRECISION) {
        if (!eq2(this.x, other.x, eps)) {
            return this.x - other.x;
        }
        else if (!eq2(this.y, other.y, eps)) {
            return this.y - other.y;
        }
        else if (!eq2(this.z, other.z, eps)) {
            return this.z - other.z;
        }
        else {
            return 0;
        }
    }
    toAngles() {
        return {
            theta: Math.atan2(this.y, this.x),
            phi: Math.asin(this.z / this.length()),
        };
    }
}
V3.O = new V3(0, 0, 0);
V3.X = new V3(1, 0, 0);
V3.Y = new V3(0, 1, 0);
V3.Z = new V3(0, 0, 1);
V3.XY = new V3(1, 1, 0);
V3.XYZ = new V3(1, 1, 1);
V3.INF = new V3(Infinity, Infinity, Infinity);
V3.UNITS = [V3.X, V3.Y, V3.Z];
V3.NAMEMAP = new JavaMap()
    .set(V3.O, 'V3.O')
    .set(V3.X, 'V3.X')
    .set(V3.Y, 'V3.Y')
    .set(V3.Z, 'V3.Z')
    .set(V3.XYZ, 'V3.XYZ')
    .set(V3.INF, 'V3.INF');
function V(a, b, c) {
    if (arguments.length == 3) {
        return new V3(parseFloat(a), parseFloat(b), parseFloat(c));
    }
    else if (arguments.length == 2) {
        return new V3(parseFloat(a), parseFloat(b), 0);
    }
    else if (arguments.length == 1) {
        if (typeof (a) == 'object') {
            if (a instanceof V3) {
                // immutable, so
                return a;
            }
            else if (a instanceof Array || a instanceof Float32Array || a instanceof Float64Array) {
                if (2 == a.length) {
                    return new V3(parseFloat(a[0]), parseFloat(a[1]), 0);
                }
                else if (3 == a.length) {
                    return new V3(parseFloat(a[0]), parseFloat(a[1]), parseFloat(a[2]));
                }
            }
            else if (('x' in a) && ('y' in a)) {
                return new V3(parseFloat(a.x), parseFloat(a.y), 'z' in a ? parseFloat(a.z) : 0);
            }
        }
    }
    throw new Error('invalid arguments' + arguments);
}

const P3YZ = { normal1: V3.X, w: 0 };
const P3ZX = { normal1: V3.Y, w: 0 };
const P3XY = { normal1: V3.Z, w: 0 };
class Transformable {
    mirror(plane) {
        return this.transform(M4.mirror(plane));
    }
    mirroredX() {
        return this.mirror(P3YZ);
    }
    mirrorY() {
        return this.mirror(P3ZX);
    }
    mirrorZ() {
        return this.mirror(P3XY);
    }
    project(plane) {
        return this.transform(M4.project(plane));
    }
    projectXY() {
        return this.transform(M4.project(P3XY));
    }
    projectYZ() {
        return this.transform(M4.project(P3YZ));
    }
    projectZX() {
        return this.transform(M4.project(P3ZX));
    }
    translate(...args) {
        return this.transform(M4.translate.apply(undefined, args), callsce.call(undefined, '.translate', ...args));
    }
    scale(...args) {
        return this.transform(M4.scale.apply(undefined, args), callsce.call(undefined, '.scale', ...args));
    }
    rotateX(radians) {
        return this.transform(M4.rotateX(radians), `.rotateX(${radians})`);
    }
    rotateY(radians) {
        return this.transform(M4.rotateY(radians), `.rotateY(${radians})`);
    }
    rotateZ(radians) {
        return this.transform(M4.rotateZ(radians), `.rotateZ(${radians})`);
    }
    rotate(rotationCenter, rotationAxis, radians) {
        return this.transform(M4.rotateLine(rotationCenter, rotationAxis, radians), callsce('.rotate', rotationCenter, rotationAxis, radians));
    }
    rotateAB(from, to) {
        return this.transform(M4.rotateAB(from, to), callsce('.rotateAB', from, to));
    }
    eulerZXZ(alpha, beta, gamma) {
        throw new Error();
        //return this.transform(M4.eulerZXZ(alpha, beta, gamma))
    }
    shearX(y, z) {
        return this.transform(new M4([
            1, y, z, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]));
    }
    foo() {
        return this.transform(M4.FOO);
    }
    bar() {
        return this.transform(M4.BAR);
    }
    visit(visitor, ...args) {
        let proto = Object.getPrototypeOf(this);
        // walk up the prototype chain until we find a defined function in o
        while (!visitor.hasOwnProperty(proto.constructor.name) && proto !== Transformable.prototype) {
            proto = Object.getPrototypeOf(proto);
        }
        if (visitor.hasOwnProperty(proto.constructor.name)) {
            return visitor[proto.constructor.name].apply(this, args);
        }
        else {
            throw new Error('No implementation for ' + this.constructor.name);
        }
    }
}

const { PI: PI$1, abs: abs$1 } = Math;
class M4 extends Matrix {
    /**
     * Takes 16 arguments in row-major order, which can be passed individually, as a list, or even as
     * four lists, one for each row. If the arguments are omitted then the identity matrix is constructed instead.
     */
    constructor(...var_args) {
        let m;
        if (0 == arguments.length) {
            m = new Float64Array(16);
        }
        else {
            const flattened = Array.prototype.concat.apply([], arguments);
            assert(flattened.length == 16, 'flattened.length == 16' + flattened.length);
            m = new Float64Array(flattened);
        }
        super(4, 4, m);
    }
    get X() {
        return this.transformVector(V3.X);
    }
    get Y() {
        return this.transformVector(V3.Y);
    }
    get Z() {
        return this.transformVector(V3.Z);
    }
    get O() {
        return this.getTranslation();
    }
    /**
     * Returns the matrix that when multiplied with `matrix` results in the
     * identity matrix. You can optionally pass an existing matrix in `result`
     * to avoid allocating a new matrix. This implementation is from the Mesa
     * OpenGL function `__gluInvertMatrixd()` found in `project.c`.
     */
    static inverse(matrix, result) {
        assertInst(M4, matrix);
        !result || assertInst(M4, result);
        assert(matrix != result, 'matrix != result');
        result = result || new M4();
        const m = matrix.m, r = result.m;
        // first compute transposed cofactor matrix:
        // cofactor of an element is the determinant of the 3x3 matrix gained by removing the column and row belonging
        // to the element
        r[0] = m[5] * m[10] * m[15] - m[5] * m[14] * m[11] - m[6] * m[9] * m[15] + m[6] * m[13] * m[11] + m[7] * m[9] * m[14] - m[7] * m[13] * m[10];
        r[1] = -m[1] * m[10] * m[15] + m[1] * m[14] * m[11] + m[2] * m[9] * m[15] - m[2] * m[13] * m[11] - m[3] * m[9] * m[14] + m[3] * m[13] * m[10];
        r[2] = m[1] * m[6] * m[15] - m[1] * m[14] * m[7] - m[2] * m[5] * m[15] + m[2] * m[13] * m[7] + m[3] * m[5] * m[14] - m[3] * m[13] * m[6];
        r[3] = -m[1] * m[6] * m[11] + m[1] * m[10] * m[7] + m[2] * m[5] * m[11] - m[2] * m[9] * m[7] - m[3] * m[5] * m[10] + m[3] * m[9] * m[6];
        r[4] = -m[4] * m[10] * m[15] + m[4] * m[14] * m[11] + m[6] * m[8] * m[15] - m[6] * m[12] * m[11] - m[7] * m[8] * m[14] + m[7] * m[12] * m[10];
        r[5] = m[0] * m[10] * m[15] - m[0] * m[14] * m[11] - m[2] * m[8] * m[15] + m[2] * m[12] * m[11] + m[3] * m[8] * m[14] - m[3] * m[12] * m[10];
        r[6] = -m[0] * m[6] * m[15] + m[0] * m[14] * m[7] + m[2] * m[4] * m[15] - m[2] * m[12] * m[7] - m[3] * m[4] * m[14] + m[3] * m[12] * m[6];
        r[7] = m[0] * m[6] * m[11] - m[0] * m[10] * m[7] - m[2] * m[4] * m[11] + m[2] * m[8] * m[7] + m[3] * m[4] * m[10] - m[3] * m[8] * m[6];
        r[8] = m[4] * m[9] * m[15] - m[4] * m[13] * m[11] - m[5] * m[8] * m[15] + m[5] * m[12] * m[11] + m[7] * m[8] * m[13] - m[7] * m[12] * m[9];
        r[9] = -m[0] * m[9] * m[15] + m[0] * m[13] * m[11] + m[1] * m[8] * m[15] - m[1] * m[12] * m[11] - m[3] * m[8] * m[13] + m[3] * m[12] * m[9];
        r[10] = m[0] * m[5] * m[15] - m[0] * m[13] * m[7] - m[1] * m[4] * m[15] + m[1] * m[12] * m[7] + m[3] * m[4] * m[13] - m[3] * m[12] * m[5];
        r[11] = -m[0] * m[5] * m[11] + m[0] * m[9] * m[7] + m[1] * m[4] * m[11] - m[1] * m[8] * m[7] - m[3] * m[4] * m[9] + m[3] * m[8] * m[5];
        r[12] = -m[4] * m[9] * m[14] + m[4] * m[13] * m[10] + m[5] * m[8] * m[14] - m[5] * m[12] * m[10] - m[6] * m[8] * m[13] + m[6] * m[12] * m[9];
        r[13] = m[0] * m[9] * m[14] - m[0] * m[13] * m[10] - m[1] * m[8] * m[14] + m[1] * m[12] * m[10] + m[2] * m[8] * m[13] - m[2] * m[12] * m[9];
        r[14] = -m[0] * m[5] * m[14] + m[0] * m[13] * m[6] + m[1] * m[4] * m[14] - m[1] * m[12] * m[6] - m[2] * m[4] * m[13] + m[2] * m[12] * m[5];
        r[15] = m[0] * m[5] * m[10] - m[0] * m[9] * m[6] - m[1] * m[4] * m[10] + m[1] * m[8] * m[6] + m[2] * m[4] * m[9] - m[2] * m[8] * m[5];
        // calculate determinant using laplace expansion (cf https://en.wikipedia.org/wiki/Laplace_expansion),
        // as we already have the cofactors. We multiply a column by a row as the cofactor matrix is transposed.
        const det = m[0] * r[0] + m[1] * r[4] + m[2] * r[8] + m[3] * r[12];
        // assert(!isZero(det), 'det may not be zero, i.e. the matrix is not invertible')
        let i = 16;
        while (i--) {
            r[i] /= det;
        }
        return result;
    }
    /**
     * Returns `matrix`, exchanging columns for rows. You can optionally pass an
     * existing matrix in `result` to avoid allocating a new matrix.
     */
    static transpose(matrix, result) {
        assertInst(M4, matrix);
        !result || assertInst(M4, result);
        assert(matrix != result, 'matrix != result');
        result = result || new M4();
        const m = matrix.m, r = result.m;
        r[0] = m[0];
        r[1] = m[4];
        r[2] = m[8];
        r[3] = m[12];
        r[4] = m[1];
        r[5] = m[5];
        r[6] = m[9];
        r[7] = m[13];
        r[8] = m[2];
        r[9] = m[6];
        r[10] = m[10];
        r[11] = m[14];
        r[12] = m[3];
        r[13] = m[7];
        r[14] = m[11];
        r[15] = m[15];
        return result;
    }
    /**
     * Returns the concatenation of the transforms for `left` and `right`.
     */
    static multiply(left, right, result) {
        assertInst(M4, left, right);
        !result || assertInst(M4, result);
        assert(left != result, 'left != result');
        assert(right != result, 'right != result');
        result = result || new M4();
        const a = left.m, b = right.m, r = result.m;
        r[0] = a[0] * b[0] + a[1] * b[4] + (a[2] * b[8] + a[3] * b[12]);
        r[1] = a[0] * b[1] + a[1] * b[5] + (a[2] * b[9] + a[3] * b[13]);
        r[2] = a[0] * b[2] + a[1] * b[6] + (a[2] * b[10] + a[3] * b[14]);
        r[3] = a[0] * b[3] + a[1] * b[7] + (a[2] * b[11] + a[3] * b[15]);
        r[4] = a[4] * b[0] + a[5] * b[4] + (a[6] * b[8] + a[7] * b[12]);
        r[5] = a[4] * b[1] + a[5] * b[5] + (a[6] * b[9] + a[7] * b[13]);
        r[6] = a[4] * b[2] + a[5] * b[6] + (a[6] * b[10] + a[7] * b[14]);
        r[7] = a[4] * b[3] + a[5] * b[7] + (a[6] * b[11] + a[7] * b[15]);
        r[8] = a[8] * b[0] + a[9] * b[4] + (a[10] * b[8] + a[11] * b[12]);
        r[9] = a[8] * b[1] + a[9] * b[5] + (a[10] * b[9] + a[11] * b[13]);
        r[10] = a[8] * b[2] + a[9] * b[6] + (a[10] * b[10] + a[11] * b[14]);
        r[11] = a[8] * b[3] + a[9] * b[7] + (a[10] * b[11] + a[11] * b[15]);
        r[12] = a[12] * b[0] + a[13] * b[4] + (a[14] * b[8] + a[15] * b[12]);
        r[13] = a[12] * b[1] + a[13] * b[5] + (a[14] * b[9] + a[15] * b[13]);
        r[14] = a[12] * b[2] + a[13] * b[6] + (a[14] * b[10] + a[15] * b[14]);
        r[15] = a[12] * b[3] + a[13] * b[7] + (a[14] * b[11] + a[15] * b[15]);
        return result;
    }
    static copy(src, result = new M4()) {
        assertInst(M4, src, result);
        assert(result != src, 'result != src');
        const s = src.m, d = result.m;
        let i = 16;
        while (i--) {
            d[i] = s[i];
        }
        return result;
    }
    static forSys(e0, e1, e2 = e0.cross(e1), origin = V3.O) {
        assertVectors(e0, e1, e2, origin);
        return new M4(e0.x, e1.x, e2.x, origin.x, e0.y, e1.y, e2.y, origin.y, e0.z, e1.z, e2.z, origin.z, 0, 0, 0, 1);
    }
    static forRows(n0, n1, n2, n3 = V3.O) {
        assertVectors(n0, n1, n2, n3);
        return new M4(n0.x, n0.y, n0.z, 0, n1.x, n1.y, n1.z, 0, n2.x, n2.y, n2.z, 0, n3.x, n3.y, n3.z, 1);
    }
    /**
     * Returns an identity matrix. You can optionally pass an existing matrix in `result` to avoid allocating a new
     * matrix. This emulates the OpenGL function `glLoadIdentity()`
     *
     * Unless initializing a matrix to be modified, use M4.IDENTITY
     */
    static identity(result = new M4()) {
        assertInst(M4, result);
        const m = result.m;
        m[0] = m[5] = m[10] = m[15] = 1;
        m[1] = m[2] = m[3] = m[4] = m[6] = m[7] = m[8] = m[9] = m[11] = m[12] = m[13] = m[14] = 0;
        return result;
    }
    /**
     * Creates a new M4 initialized by a user defined callback function
     *
     * @param f signature: (elRow, elCol, elIndex) =>
     *     el, where elIndex is the row-major index, i.e. eLindex == elRow * 4 + elCol
     * @param result
     */
    static fromFunction4(f, result = new M4()) {
        assert(typeof f == 'function');
        assertInst(M4, result);
        const m = result.m;
        let i = 16;
        while (i--) {
            m[i] = f(Math.floor(i / 4), i % 4, i);
        }
        return result;
    }
    /**
     ### GL.Matrix.perspective(fov, aspect, near, far[, result])

     */
    /**
     * ## hjghfhg jhg hjg jhkg jhg jkh jhg jh gjh {@see V3.O}
     * {@see perspectiveRad}
     * perspectiveRad
     * ```
     *  test ```
     * @param fovDegrees in degrees
     * @param aspect aspect ratio = width/height of viewport
     */
    static perspective(fovDegrees, aspect, near, far, result = new M4()) {
        return M4.perspectiveRad(fovDegrees * DEG, aspect, near, far, result);
    }
    static perspectiveRad(fov, aspect, near, far, result = new M4()) {
        assertInst(M4, result);
        assertNumbers(fov, aspect, near, far);
        const y = Math.tan(fov / 2) * near;
        const x = y * aspect;
        return M4.frustum(-x, x, -y, y, near, far, result);
    }
    // the OpenGL function `glFrustum()`.
    static frustum(left, right, bottom, top, near, far, result) {
        assertNumbers(left, right, bottom, top, near, far);
        assert(0 < near, '0 < near');
        assert(near < far, 'near < far');
        !result || assertInst(M4, result);
        result = result || new M4();
        const m = result.m;
        m[0] = 2 * near / (right - left);
        m[1] = 0;
        m[2] = (right + left) / (right - left);
        m[3] = 0;
        m[4] = 0;
        m[5] = 2 * near / (top - bottom);
        m[6] = (top + bottom) / (top - bottom);
        m[7] = 0;
        m[8] = 0;
        m[9] = 0;
        m[10] = -(far + near) / (far - near);
        m[11] = -2 * far * near / (far - near);
        m[12] = 0;
        m[13] = 0;
        m[14] = -1;
        m[15] = 0;
        return result;
    }
    /**
     * Returns a new M4 representing the a projection through/towards a point onto a plane.
     */
    static projectPlanePoint(p, plane, result = new M4()) {
        assertVectors(p, plane.normal1);
        assertInst(M4, result);
        const m = result.m;
        const n = plane.normal1, w = plane.w;
        const np = n.dot(p);
        m[0] = p.x * n.x + w - np;
        m[1] = p.x * n.y;
        m[2] = p.x * n.z;
        m[3] = -w * p.x;
        m[4] = p.y * n.x;
        m[5] = p.y * n.y + w - np;
        m[6] = p.y * n.z;
        m[7] = -w * p.y;
        m[8] = p.z * n.x;
        m[9] = p.z * n.y;
        m[10] = p.z * n.z + w - np;
        m[11] = -w * p.z;
        m[12] = n.x;
        m[13] = n.y;
        m[14] = n.z;
        m[15] = -np;
        return result;
    }
    /**
     * Orthographic/orthogonal projection. Transforms the cuboid with the dimensions X: [left right] Y: [bottom, top]
     * Z: [near far] to the cuboid X: [-1 1] Y [-1 1] Z [-1, 1]
     */
    static ortho(left, right, bottom, top, near, far, result = new M4()) {
        assertNumbers(left, right, bottom, top, near, far);
        assertInst(M4, result);
        const m = result.m;
        m[0] = 2 / (right - left);
        m[1] = 0;
        m[2] = 0;
        m[3] = -(right + left) / (right - left);
        m[4] = 0;
        m[5] = 2 / (top - bottom);
        m[6] = 0;
        m[7] = -(top + bottom) / (top - bottom);
        m[8] = 0;
        m[9] = 0;
        m[10] = -2 / (far - near);
        m[11] = -(far + near) / (far - near);
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return result;
    }
    static scale(...args) {
        let x, y, z, result;
        if (args[0] instanceof V3) {
            assert(args.length <= 2);
            ({ x, y, z } = args[0]);
            result = args[1];
        }
        else if ('number' != typeof args[1]) {
            x = y = z = args[0];
            result = args[1];
        }
        else {
            assert(args.length <= 4);
            x = args[0];
            y = args[1];
            z = undefined != args[2] ? args[2] : 1;
            result = args[3];
        }
        undefined == result && (result = new M4());
        assertInst(M4, result);
        assertNumbers(x, y, z);
        const m = result.m;
        m[0] = x;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;
        m[4] = 0;
        m[5] = y;
        m[6] = 0;
        m[7] = 0;
        m[8] = 0;
        m[9] = 0;
        m[10] = z;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return result;
    }
    static translate(...args) {
        let x, y, z, result;
        if (args[0] instanceof V3) {
            assert(args.length <= 2);
            ({ x, y, z } = args[0]);
            result = args[1];
        }
        else {
            assert(args.length <= 4);
            x = args[0];
            y = undefined != args[1] ? args[1] : 0;
            z = undefined != args[2] ? args[2] : 0;
            result = args[3];
        }
        undefined == result && (result = new M4());
        assertInst(M4, result);
        assertNumbers(x, y, z);
        const m = result.m;
        m[0] = 1;
        m[1] = 0;
        m[2] = 0;
        m[3] = x;
        m[4] = 0;
        m[5] = 1;
        m[6] = 0;
        m[7] = y;
        m[8] = 0;
        m[9] = 0;
        m[10] = 1;
        m[11] = z;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return result;
    }
    /**
     * Returns a matrix that rotates by `a` degrees around the vector (x, y, z). You can optionally pass an existing
     * matrix in `result` to avoid allocating a new matrix. This emulates the OpenGL function `glRotate()`.
     */
    //static rotation(radians: raddd, x: number, y: number, z: number, result?: M4): M4
    static rotate(radians, v, result) {
        undefined == result && (result = new M4());
        assertInst(M4, result);
        let { x, y, z } = v;
        assert(!new V3(x, y, z).likeO(), '!V(x, y, z).likeO()');
        const m = result.m;
        const d = Math.sqrt(x * x + y * y + z * z);
        x /= d;
        y /= d;
        z /= d;
        const cos = Math.cos(radians), sin = Math.sin(radians), t = 1 - cos;
        m[0] = x * x * t + cos;
        m[1] = x * y * t - z * sin;
        m[2] = x * z * t + y * sin;
        m[3] = 0;
        m[4] = y * x * t + z * sin;
        m[5] = y * y * t + cos;
        m[6] = y * z * t - x * sin;
        m[7] = 0;
        m[8] = z * x * t - y * sin;
        m[9] = z * y * t + x * sin;
        m[10] = z * z * t + cos;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return result;
    }
    /**
     * Returns a matrix that puts the camera at the eye point `ex, ey, ez` looking
     * toward the center point `cx, cy, cz` with an up direction of `ux, uy, uz`.
     * You can optionally pass an existing matrix in `result` to avoid allocating
     * a new matrix. This emulates the OpenGL function `gluLookAt()`.
     */
    static lookAt(eye, focus, up, result) {
        assert(3 == arguments.length || 4 == arguments.length, '3 == arguments.length || 4 == arguments.length');
        assertVectors(eye, focus, up);
        !result || assertInst(M4, result);
        result = result || new M4();
        const m = result.m;
        const f = eye.minus(focus).unit();
        const s = up.cross(f).unit();
        const t = f.cross(s).unit();
        m[0] = s.x;
        m[1] = s.y;
        m[2] = s.z;
        m[3] = -s.dot(eye);
        m[4] = t.x;
        m[5] = t.y;
        m[6] = t.z;
        m[7] = -t.dot(eye);
        m[8] = f.x;
        m[9] = f.y;
        m[10] = f.z;
        m[11] = -f.dot(eye);
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return result;
    }
    /**
     * Create a rotation matrix for rotating around the X axis
     */
    static rotateX(radians) {
        assertNumbers(radians);
        const sin = Math.sin(radians), cos = Math.cos(radians);
        const els = [
            1, 0, 0, 0, 0, cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1,
        ];
        return new M4(els);
    }
    /**
     * Create a rotation matrix for rotating around the Y axis
     */
    static rotateY(radians) {
        const sin = Math.sin(radians), cos = Math.cos(radians);
        const els = [
            cos, 0, sin, 0, 0, 1, 0, 0, -sin, 0, cos, 0, 0, 0, 0, 1,
        ];
        return new M4(els);
    }
    /**
     * Create a rotation matrix for rotating around the Z axis
     */
    static rotateZ(radians) {
        const sin = Math.sin(radians), cos = Math.cos(radians);
        const els = [
            cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        ];
        return new M4(els);
    }
    /**
     * New rotation matrix such that result.transformVector(a).isParallelTo(b) through smallest rotation.
     * Performs no scaling.
     */
    static rotateAB(a, b, result) {
        // see http://inside.mines.edu/fs_home/gmurray/ArbitraryAxisRotation/
        assertVectors(a, b);
        !result || assertInst(M4, result);
        const rotationAxis = a.cross(b), rotationAxisLength = rotationAxis.length();
        if (eq0(rotationAxisLength)) {
            return M4.identity(result);
        }
        const radians = Math.atan2(rotationAxisLength, a.dot(b));
        return M4.rotateLine(V3.O, rotationAxis, radians, result);
    }
    /**
     * Matrix for rotation about arbitrary line defined by an anchor point and direction.
     * rotationAxis does not need to be unit
     */
    static rotateLine(rotationAnchor, rotationAxis, radians, result) {
        // see http://inside.mines.edu/fs_home/gmurray/ArbitraryAxisRotation/
        assertVectors(rotationAnchor, rotationAxis);
        assertNumbers(radians);
        !result || assertInst(M4, result);
        result = result || new M4();
        rotationAxis = rotationAxis.unit();
        const ax = rotationAnchor.x, ay = rotationAnchor.y, az = rotationAnchor.z, dx = rotationAxis.x, dy = rotationAxis.y, dz = rotationAxis.z;
        const m = result.m, cos = Math.cos(radians), sin = Math.sin(radians);
        m[0] = dx * dx + (dy * dy + dz * dz) * cos;
        m[1] = dx * dy * (1 - cos) - dz * sin;
        m[2] = dx * dz * (1 - cos) + dy * sin;
        m[3] = (ax * (dy * dy + dz * dz) - dx * (ay * dy + az * dz)) * (1 - cos) + (ay * dz - az * dy) * sin;
        m[4] = dx * dy * (1 - cos) + dz * sin;
        m[5] = dy * dy + (dx * dx + dz * dz) * cos;
        m[6] = dy * dz * (1 - cos) - dx * sin;
        m[7] = (ay * (dx * dx + dz * dz) - dy * (ax * dx + az * dz)) * (1 - cos) + (az * dx - ax * dz) * sin;
        m[8] = dx * dz * (1 - cos) - dy * sin;
        m[9] = dy * dz * (1 - cos) + dx * sin;
        m[10] = dz * dz + (dx * dx + dy * dy) * cos;
        m[11] = (az * (dx * dx + dy * dy) - dz * (ax * dx + ay * dy)) * (1 - cos) + (ax * dy - ay * dx) * sin;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return result;
    }
    /**
     * Create an affine matrix for mirroring into an arbitrary plane:
     */
    static mirror(plane, result = new M4()) {
        assertVectors(plane.normal1);
        assertInst(M4, result);
        const [nx, ny, nz] = plane.normal1;
        const w = plane.w;
        const m = result.m;
        m[0] = 1.0 - 2.0 * nx * nx;
        m[1] = -2.0 * ny * nx;
        m[2] = -2.0 * nz * nx;
        m[3] = 2.0 * nx * w;
        m[4] = -2.0 * nx * ny;
        m[5] = 1.0 - 2.0 * ny * ny;
        m[6] = -2.0 * nz * ny;
        m[7] = 2.0 * ny * w;
        m[8] = -2.0 * nx * nz;
        m[9] = -2.0 * ny * nz;
        m[10] = 1.0 - 2.0 * nz * nz;
        m[11] = 2.0 * nz * w;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return result;
    }
    /**
     *
     * @param plane
     * @param dir Projection direction. Optional, if not specified plane normal1 will be used.
     * @param result {@see M4}
     */
    static project(plane, dir = plane.normal1, result = new M4()) {
        // TODO: doc
        /**
         * plane.normal1 DOT (p + lambda * dir) = w (1)
         * extract lambda:
         * plane.normal1 DOT p + lambda * plane.normal1 DOT dir = w
         * lambda = (w - plane.normal1 DOT p) / plane.normal1 DOT dir
         * result = p + lambda * dir
         * result = p + dir * (w - plane.normal1 DOT p) / plane.normal1 DOT dir
         * result =  w * dir / (plane.normal1 DOT dir) + p - plane.normal1 DOT p * dir / (plane.normal1 DOT dir) *
         *

         a + d * (w - n . a) / (nd)
         a + dw - d * na
         */
        assertVectors(dir, plane.normal1);
        assertInst(M4, result);
        const w = plane.w;
        const m = result.m;
        const nd = plane.normal1.dot(dir);
        const { x: nx, y: ny, z: nz } = plane.normal1;
        const { x: dx, y: dy, z: dz } = dir.div(nd);
        /*
         rejectedFrom: return this.minus(b.times(this.dot(b) / b.dot(b)))
         return M4.forSys(
         V3.X.rejectedFrom(plane.normal1),
         V3.Y.rejectedFrom(plane.normal1),
         V3.Z.rejectedFrom(plane.normal1),
         plane.anchor,
         result
         )
         */
        m[0] = 1.0 - nx * dx;
        m[1] = -ny * dx;
        m[2] = -nz * dx;
        m[3] = dx * w;
        m[4] = -nx * dy;
        m[5] = 1.0 - ny * dy;
        m[6] = -nz * dy;
        m[7] = dy * w;
        m[8] = -nx * dz;
        m[9] = -ny * dz;
        m[10] = 1.0 - nz * dz;
        m[11] = dz * w;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return result;
    }
    static lineProjection(line, result = new M4()) {
        assertVectors(line.anchor, line.dir1);
        assertInst(M4, result);
        const ax = line.anchor.x, ay = line.anchor.y, az = line.anchor.z;
        const dx = line.dir1.x, dy = line.dir1.y, dz = line.dir1.z;
        const m = result.m;
        /*
         projectedOn: return b.times(this.dot(b) / b.dot(b))
         */
        m[0] = dx * dx;
        m[1] = dx * dy;
        m[2] = dx * dz;
        m[3] = ax;
        m[4] = dy * dx;
        m[5] = dy * dy;
        m[6] = dy * dz;
        m[7] = ay;
        m[8] = dz * dx;
        m[9] = dz * dy;
        m[10] = dz * dz;
        m[11] = az;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return result;
    }
    /**
     Returns a perspective transform matrix, which makes far away objects appear smaller than nearby objects. The `aspect` argument should be the width divided by the height of your viewport and `fov` is the top-to-bottom angle of the field of view in degrees. You can optionally pass an existing matrix in `result` to avoid allocating a new matrix. This emulates the OpenGL function `gluPerspective()`.
     */
    static multiplyMultiple(...m4s) {
        if (0 == m4s.length)
            return M4.identity();
        let temp = M4.identity(), result = m4s[0].copy();
        for (let i = 1; i < m4s.length; i++) {
            M4.multiply(result, m4s[i], temp);
            {
                [temp, result] = [result, temp];
            }
        }
        return result;
    }
    static pointInversion(p, result = new M4()) {
        assertVectors(p);
        assertInst(M4, result);
        const m = result.m;
        m[0] = -1;
        m[1] = 0;
        m[2] = 0;
        m[3] = 2 * p.x;
        m[4] = 0;
        m[5] = -1;
        m[6] = 0;
        m[7] = 2 * p.y;
        m[8] = 0;
        m[9] = 0;
        m[10] = -1;
        m[11] = 2 * p.z;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return result;
    }
    // ### GL.Matrix.frustum(left, right, bottom, top, near, far[, result])
    //
    // Sets up a viewing frustum, which is shaped like a truncated pyramid with the
    // camera where the point of the pyramid would be. You can optionally pass an
    // existing matrix in `result` to avoid allocating a new matrix. This emulates
    /**
     * Returns a new M4 which is equal to the inverse of this.
     */
    inversed() {
        return M4.inverse(this);
    }
    /**
     * Matrix trace is defined as the sum of the elements of the main diagonal.
     */
    trace() {
        return this.m[0] + this.m[5] + this.m[10] + this.m[15];
    }
    as3x3() {
        const result = M4.copy(this), m = result.m;
        m[3] = m[7] = m[11] = m[12] = m[13] = m[14] = 0;
        m[15] = 1;
        return result;
    }
    transform(m4) {
        return m4.times(this);
    }
    realEigenValues3() {
        const m = this.m;
        assert(0 == m[12] && 0 == m[13] && 0 == m[14]);
        // determinant of (this - λI):
        // | a-λ  b   c  |
        // |  d  e-λ  f  | = -λ^3 + λ^2 (a+e+i) + λ (-a e-a i+b d+c g-e i+f h) + a(ei - fh) - b(di - fg) + c(dh - eg)
        // |  g   h  i-λ |
        const [a, b, c, , d, e, f, , g, h, i] = m;
        // det(this - λI) = -λ^3 +λ^2 (a+e+i) + λ (-a e-a i-b d+c g-e i+f h)+ (a e i-a f h-b d i+b f g+c d h-c e g)
        const s = -1;
        const t = a + e + i; // equivalent to trace of matrix
        const u = -a * e - a * i + b * d + c * g - e * i + f * h; // equivalent to 1/2 (trace(this²) - trace²(A))
        const w = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g); // equivalent to matrix determinant
        console.log(s, t, u, w);
        return solveCubicReal2(s, t, u, w);
    }
    realEigenVectors3() {
        const eigenValues = this.realEigenValues3();
        const this3x3 = this.times(M4.IDENTITY3);
        console.log(this.toString());
        console.log(this3x3.toString());
        let mats = eigenValues.map(ev => M4.IDENTITY3.scale(-ev).plus(this3x3));
        console.log(mats.map(m => m.determinant3()));
        console.log(mats.map(m => '' + m.toString(v => '' + v)).join('\n\n'));
        console.log(mats.map(m => '' + m.gauss().U.toString(v => '' + v)).join('\n\n'));
        console.log('mats.map(m=>m.rank())', mats.map(m => m.rank()));
        if (1 == eigenValues.length) {
            console.log(mats[0].toString());
            assertf(() => 0 == mats[0].rank());
            // col vectors
            return arrayFromFunction(3, col => new V3(this.m[col], this.m[4 + col], this.m[8 + col]));
        }
        if (2 == eigenValues.length) {
            // one matrix should have rank 1, the other rank 2
            if (1 == mats[0].rank()) {
                mats = [mats[1], mats[0]];
            }
            assertf(() => 2 == mats[0].rank());
            assertf(() => 1 == mats[1].rank());
            // mat[0] has rank 2, mat[1] has rank 1
            const gauss0 = mats[0].gauss().U;
            const eigenVector0 = gauss0.row(0).cross(gauss0.row(1)).V3().unit();
            const planeNormal = mats[1].gauss().U.row(0).V3();
            const eigenVector1 = planeNormal.getPerpendicular().unit();
            const eigenVector2 = eigenVector0.cross(eigenVector1).rejectedFrom(planeNormal);
            return [eigenVector0, eigenVector1, eigenVector2];
        }
        if (3 == eigenValues.length) {
            mats.forEach((mat, i) => assert(2 == mat.rank(), i + ': ' + mat.rank()));
            // the (A - lambda I) matrices map to a plane. This means, that there is an entire line in R³ which maps to
            // the point V3.O
            return mats.map(mat => {
                const gauss = mat.gauss().U;
                return gauss.row(0).cross(gauss.row(1)).V3().unit();
            });
        }
        throw new Error('there cannot be more than 3 eigen values');
    }
    /**
     * U * SIGMA * VSTAR = this
     * U and VSTAR are orthogonal matrices
     * SIGMA is a diagonal matrix
     */
    svd3() {
        function matrixForCS(i, k, c, s) {
            const m = M4.identity();
            m.setEl(i, i, c);
            m.setEl(k, k, c);
            m.setEl(i, k, s);
            m.setEl(k, i, -s);
            return m;
        }
        const A = this.as3x3();
        let S = A.transposed().times(A), V$$1 = M4.identity();
        console.log(S.str);
        for (let it = 0; it < 16; it++) {
            console.log('blahg\n', V$$1.times(S).times(V$$1.transposed()).str);
            assert(V$$1.times(S).times(V$$1.transposed()).likeM4(A.transposed().times(A)), V$$1.times(S).times(V$$1.transposed()).str, A.transposed().times(A).str);
            let maxOffDiagonal = 0, maxOffDiagonalIndex = 1, j = 10;
            while (j--) {
                const val = Math.abs(S.m[j]);
                if (j % 4 != Math.floor(j / 4) && val > maxOffDiagonal) {
                    maxOffDiagonal = val;
                    maxOffDiagonalIndex = j;
                }
            }
            const i = Math.floor(maxOffDiagonalIndex / 4), k = maxOffDiagonalIndex % 4;
            const a_ii = S.m[5 * i], a_kk = S.m[5 * k], a_ik = S.m[maxOffDiagonalIndex];
            const phi = a_ii === a_kk ? PI$1 / 4 : Math.atan(2 * a_ik / (a_ii - a_kk)) / 2;
            console.log(maxOffDiagonalIndex, i, k, 'phi', phi);
            const cos = Math.cos(phi), sin = Math.sin(phi);
            const givensRotation = matrixForCS(i, k, cos, -sin);
            assert(givensRotation.transposed().times(givensRotation).likeIdentity());
            console.log(givensRotation.str);
            V$$1 = V$$1.times(givensRotation);
            S = M4.multiplyMultiple(givensRotation.transposed(), S, givensRotation);
            console.log(S.str);
        }
        const sigma = S.map((el, elIndex) => elIndex % 5 == 0 ? Math.sqrt(el) : 0);
        return {
            U: M4.multiplyMultiple(A, V$$1, sigma.map((el, elIndex) => elIndex % 5 == 0 ? 1 / el : 0)),
            SIGMA: sigma,
            VSTAR: V$$1.transposed(),
        };
    }
    map(fn) {
        return M4.fromFunction4((x, y, i) => fn(this.m[i], i, this.m));
    }
    likeM4(m4) {
        assertInst(M4, m4);
        return this.m.every((el, index) => eq(el, m4.m[index]));
    }
    /**
     * Returns a new M4 equal to the transpose of this.
     */
    transposed() {
        return M4.transpose(this);
    }
    /**
     * Returns a new M4 which equal to (this * matrix) (in that order)
     */
    times(matrix) {
        return M4.multiply(this, matrix);
    }
    /**
     * Transforms the vector as a point with a w coordinate of 1. This means translations will have an effect, for
     * example.
     */
    transformPoint(v) {
        assertVectors(v);
        const m = this.m;
        const vx = v.x, vy = v.y, vz = v.z, vw = 1;
        const x = vx * m[0] + vy * m[1] + vz * m[2] + vw * m[3];
        const y = vx * m[4] + vy * m[5] + vz * m[6] + vw * m[7];
        const z = vx * m[8] + vy * m[9] + vz * m[10] + vw * m[11];
        const w = vx * m[12] + vy * m[13] + vz * m[14] + vw * m[15];
        // scale such that fourth element becomes 1:
        return new V3(x / w, y / w, z / w);
    }
    /**
     * Transforms the vector as a vector with a w coordinate of 0. This means translations will have no effect, for
     * example. Will throw an exception if the calculated w component != 0. This occurs for example when attempting
     * to transform a vector with a perspective matrix.
     */
    transformVector(v) {
        assertVectors(v);
        const m = this.m;
        const w = v.x * m[12] + v.y * m[13] + v.z * m[14];
        assert(w === 0, () => 'w === 0 needs to be true for this to make sense (w =' + w + this.str);
        return new V3(m[0] * v.x + m[1] * v.y + m[2] * v.z, m[4] * v.x + m[5] * v.y + m[6] * v.z, m[8] * v.x + m[9] * v.y + m[10] * v.z);
    }
    transformedPoints(vs) {
        return vs.map(v => this.transformPoint(v));
    }
    transformedVectors(vs) {
        return vs.map(v => this.transformVector(v));
    }
    new() {
        return new M4();
    }
    copy() {
        return M4.copy(this);
    }
    isRegular() {
        return !eq0(this.determinant());
    }
    isAxisAligned() {
        const m = this.m;
        return (1 >= +!eq0(m[0]) + +!eq0(m[1]) + +!eq0(m[2]))
            && (1 >= +!eq0(m[4]) + +!eq0(m[5]) + +!eq0(m[6]))
            && (1 >= +!eq0(m[8]) + +!eq0(m[9]) + +!eq0(m[10]));
    }
    /**
     * A matrix M is orthogonal iff M * M^T = I
     * I being the identity matrix.
     *
     * @returns If this matrix is orthogonal or very close to it. Comparison of the identity matrix and
     * this * this^T is done with {@link #likeM4}
     */
    isOrthogonal() {
        // return this.transposed().times(this).likeM4(M4.IDENTITY)
        M4.transpose(this, M4.temp0);
        M4.multiply(this, M4.temp0, M4.temp1);
        return M4.IDENTITY.likeM4(M4.temp1);
    }
    /**
     * A matrix M is symmetric iff M == M^T
     * I being the identity matrix.
     *
     * @returns If this matrix is symmetric or very close to it. Comparison of the identity matrix and
     * this * this^T is done with {@link #likeM4}
     */
    isSymmetric() {
        M4.transpose(this, M4.temp0);
        return this.likeM4(M4.temp0);
    }
    /**
     * A matrix M is normal1 iff M * M^-T == M^T * M TODO: ^-T?
     * I being the identity matrix.
     *
     * @returns If this matrix is symmetric or very close to it. Comparison of the identity matrix and
     * this * this^T is done with {@link #likeM4}
     */
    isNormal() {
        M4.transpose(this, M4.temp0); // temp0 = this^-T
        M4.multiply(this, M4.temp0, M4.temp1); // temp1 = this * this^-T
        M4.multiply(M4.temp0, this, M4.temp2); // temp2 = this^-T * this
        return M4.temp1.likeM4(M4.temp2);
    }
    /**
     * Determinant of matrix.
     *
     * Notes:
     *      For matrices A and B
     *      det(A * B) = det(A) * det(B)
     *      det(A^-1) = 1 / det(A)
     */
    determinant() {
        /*
         | a b c d |
         | e f g h |
         | i j k l |
         | m n o p |
         */
        const $ = this.m, a = $[0], b = $[1], c = $[2], d = $[3], e = $[4], f = $[5], g = $[6], h = $[7], i = $[8], j = $[9], k = $[10], l = $[11], m = $[12], n = $[13], o = $[14], p = $[15], klop = k * p - l * o, jlnp = j * p - l * n, jkno = j * o - k * n, ilmp = i * p - l * m, ikmo = i * o - k * m, ijmn = i * n - j * m;
        return (a * (f * klop - g * jlnp + h * jkno)
            - b * (e * klop - g * ilmp + h * ikmo)
            + c * (e * jlnp - f * ilmp + h * ijmn)
            - d * (e * jkno - f * ikmo + g * ijmn));
    }
    determinant3() {
        const [a, b, c, , d, e, f, , g, h, i] = this.m;
        const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
        return det;
    }
    /**
     * determine whether this matrix is a mirroring transformation
     */
    isMirroring() {
        /*
         var u = V(this.m[0], this.m[4], this.m[8])
         var v = V(this.m[1], this.m[5], this.m[9])
         var w = V(this.m[2], this.m[6], this.m[10])

         // for a true orthogonal, non-mirrored base, u.cross(v) == w
         // If they have an opposite direction then we are mirroring
         var mirrorvalue = u.cross(v).dot(w)
         var ismirror = (mirrorvalue < 0)
         return ismirror
         */
        return this.determinant() < 0; // TODO: also valid for 4x4?
    }
    /**
     * Get the translation part of this matrix, i.e. the result of this.transformPoint(V3.O)
     */
    getTranslation() {
        const m = this.m, w = m[15];
        return new V3(m[3] / w, m[7] / w, m[11] / w);
    }
    /**
     * Returns this matrix scaled so that the determinant is 1.
     * det(c * A) = (c ** n) * det(A) for n x n matrices,
     * so we need to divide by the 4th root of the determinant
     */
    normalized() {
        const detAbs = abs$1(this.determinant());
        return 1 == detAbs ? this : this.divScalar(Math.pow(detAbs, 0.25));
    }
    /**
     * Returns this matrix scaled so that the determinant is 1.
     * det(c * A) = (c ** n) * det(A) for n x n matrices,
     * so we need to divide by the 4th root of the determinant
     */
    normalized2() {
        const div = this.m[15];
        return 1 == div ? this : this.divScalar(Math.pow(div, 0.25));
    }
    /**
     * Returns if the matrix has the following form (within NLA_PRECISION):
     * a b c 0
     * c d e 0
     * f g h 0
     * 0 0 0 1
     */
    like3x3() {
        const m = this.m;
        return eq(1, m[15])
            && eq0(m[12]) && eq0(m[13]) && eq0(m[14])
            && eq0(m[3]) && eq0(m[7]) && eq0(m[11]);
    }
    isNoProj() {
        const m = this.m;
        return 0 == m[12] && 0 == m[13] && 0 == m[14] && 1 == m[15];
    }
    likeIdentity() {
        return this.m.every((val, i) => (i / 4 | 0) == (i % 4) ? eq(1, val) : eq0(val));
    }
    isIdentity() {
        return this.m.every((val, i) => (i / 4 | 0) == (i % 4) ? 1 == val : 0 == val);
    }
    toString(f) {
        f = f || ((v) => v.toFixed(6).replace(/([0.])(?=0*$)/g, ' ').toString());
        assert(typeof f(0) == 'string', '' + typeof f(0));
        // slice this.m to convert it to an Array (from TypeArray)
        const rounded = Array.prototype.slice.call(this.m).map(f);
        const colWidths = [0, 1, 2, 3].map((colIndex) => rounded.sliceStep(colIndex, 0, 4).map((x) => x.length).max());
        return [0, 1, 2, 3].map((rowIndex) => rounded
            .slice(rowIndex * 4, rowIndex * 4 + 4) // select matrix row
            .map((x, colIndex) => repeatString(colWidths[colIndex] - x.length, ' ') + x) // pad numbers with
            .join(' ')).join('\n'); // join rows
    }
    isTranslation() {
        // 2: any value, otherwise same value
        const mask = [
            1, 0, 0, 2,
            0, 1, 0, 2,
            0, 0, 1, 2,
            0, 0, 0, 1
        ];
        return mask.every((expected, index) => expected == 2 || expected == this.m[index]);
    }
    isScaling() {
        const mask = [
            2, 0, 0, 0,
            0, 2, 0, 0,
            0, 0, 2, 0,
            0, 0, 0, 1
        ];
        return mask.every((expected, index) => expected == 2 || expected == this.m[index]);
    }
    toSource() {
        if (this.isIdentity()) {
            return 'M4.IDENTITY';
        }
        else if (this.isTranslation()) {
            return callsce('M4.translate', this.O);
        }
        else if (this.isScaling()) {
            return callsce('M4.scale', this.m[0], this.m[5], this.m[10]);
        }
        else if (this.isNoProj()) {
            return !this.O.equals(V3.O)
                ? callsce('M4.forSys', this.X, this.Y, this.Z, this.O)
                : callsce('M4.forSys', this.X, this.Y, this.Z);
        }
        throw new Error();
    }
    xyAreaFactor() {
        return this.transformVector(V3.X).cross(this.transformVector(V3.Y)).length();
    }
}
/**
 * A simple (consists of integers), regular, non-orthogonal matrix, useful mainly for testing.
 * M4.BAR = M4.FOO.inverse()
 */
M4.FOO = new M4(0, 1, 1, 2, 0.3, 0.4, 0.8, 13, 2.1, 3.4, 5.5, 8.9, 0, 0, 0, 1);
M4.BAR = M4.FOO.inversed();
M4.IDENTITY = M4.identity();
M4.YZX = M4.forSys(V3.Y, V3.Z, V3.X);
M4.ZXY = M4.forSys(V3.Z, V3.X, V3.Y);
M4.IDENTITY3 = new M4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0);
M4.temp0 = new M4();
M4.temp1 = new M4();
M4.temp2 = new M4();
M4.NAMEMAP = new JavaMap()
    .set(M4.IDENTITY3, 'M4.IDENTITY3')
    .set(M4.FOO, 'M4.FOO')
    .set(M4.BAR, 'M4.BAR')
    .set(M4.IDENTITY, 'M4.IDENTITY')
    .set(M4.ZXY, 'M4.ZXY')
    .set(M4.YZX, 'M4.YZX');
M4.prototype.height = 4;
M4.prototype.width = 4;
addOwnProperties(M4.prototype, Transformable.prototype, 'constructor');

const KEYWORD_REGEXP = new RegExp('^(' +
    'abstract|boolean|break|byte|case|catch|char|class|const|continue|debugger|' +
    'default|delete|do|double|else|enum|export|extends|false|final|finally|' +
    'float|for|function|goto|if|implements|import|in|instanceof|int|interface|' +
    'long|native|new|null|package|private|protected|public|return|short|static|' +
    'super|switch|synchronized|this|throw|throws|transient|true|try|typeof|' +
    'undefined|var|void|volatile|while|with' +
    ')$');
function stringIsLegalKey(key) {
    return /^[a-z_$][0-9a-z_$]*$/gi.test(key) && !KEYWORD_REGEXP.test(key);
}
const seen = [];
function toSource(o, indent = 0) {
    if (undefined === o)
        return 'undefined';
    if (null === o)
        return 'null';
    return o.toSource();
}
function addToSourceMethodToPrototype(clazz, method) {
    if (!clazz.prototype.toSource) {
        Object.defineProperty(clazz.prototype, 'toSource', { value: method, writable: true, configurable: true, enumerable: false });
    }
}
addToSourceMethodToPrototype(Boolean, Boolean.prototype.toString);
addToSourceMethodToPrototype(Function, Function.prototype.toString);
addToSourceMethodToPrototype(Number, Number.prototype.toString);
addToSourceMethodToPrototype(RegExp, RegExp.prototype.toString);
addToSourceMethodToPrototype(Date, function () {
    return 'new Date(' + this.getTime() + ')';
});
addToSourceMethodToPrototype(String, function () {
    return JSON.stringify(this);
});
addToSourceMethodToPrototype(Array, function () {
    if (seen.includes(this)) {
        return 'CIRCULAR_REFERENCE';
    }
    seen.push(this);
    let result = '[';
    for (let i = 0; i < this.length; i++) {
        result += '\n\t' + toSource(this[i]).replace(/\r\n|\n|\r/g, '$&\t');
        if (i !== this.length - 1) {
            result += ',';
        }
    }
    result += (0 === this.length) ? ']' : '\n]';
    seen.pop();
    return result;
});
addToSourceMethodToPrototype(Object, function () {
    if (seen.includes(this)) {
        return 'CIRCULAR_REFERENCE';
    }
    seen.push(this);
    let result = '{';
    const keys = Object.keys(this).sort();
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        result += '\n\t' + (stringIsLegalKey(k) ? k : JSON.stringify(k)) + ': ' + toSource(this[k]).replace(/\r\n|\n|\r/g, '$&\t');
        if (i !== keys.length - 1) {
            result += ',';
        }
    }
    result += (0 === keys.length) ? '}' : '\n}';
    seen.pop();
    return result;
});

class AABB extends Transformable {
    constructor(min = V3.INF, max = V3.INF.negated()) {
        super();
        this.min = min;
        this.max = max;
        assertVectors(min, max);
    }
    static forXYZ(x, y, z) {
        return new AABB(V3.O, new V3(x, y, z));
    }
    static forAABBs(aabbs) {
        const result = new AABB();
        for (const aabb of aabbs) {
            result.addAABB(aabb);
        }
        return result;
    }
    addPoint(p) {
        assertVectors(p);
        this.min = this.min.min(p);
        this.max = this.max.max(p);
        return this;
    }
    addPoints(ps) {
        ps.forEach(p => this.addPoint(p));
        return this;
    }
    addAABB(aabb) {
        assertInst(AABB, aabb);
        this.addPoint(aabb.min);
        this.addPoint(aabb.max);
        return this;
    }
    /**
     * Returns the largest AABB contained in this which doesn't overlap with aabb
     * @param aabb
     */
    withoutAABB(aabb) {
        assertInst(AABB, aabb);
        let min, max;
        const volume = this.volume(), size = this.size();
        let remainingVolume = -Infinity;
        for (let i = 0; i < 3; i++) {
            const dim = ['x', 'y', 'z'][i];
            const cond = aabb.min[dim] - this.min[dim] > this.max[dim] - aabb.max[dim];
            const dimMin = cond ? this.min[dim] : Math.max(this.min[dim], aabb.max[dim]);
            const dimMax = !cond ? this.max[dim] : Math.min(this.max[dim], aabb.min[dim]);
            const newRemainingVolume = (dimMax - dimMin) * volume / size[dim];
            if (newRemainingVolume > remainingVolume) {
                remainingVolume = newRemainingVolume;
                min = this.min.withElement(dim, dimMin);
                max = this.max.withElement(dim, dimMax);
            }
        }
        return new AABB(min, max);
    }
    getIntersectionAABB(aabb) {
        assertInst(AABB, aabb);
        return new AABB(this.min.max(aabb.min), this.max.min(aabb.max));
    }
    touchesAABB(aabb) {
        assertInst(AABB, aabb);
        return !(this.min.x > aabb.max.x || this.max.x < aabb.min.x
            || this.min.y > aabb.max.y || this.max.y < aabb.min.y
            || this.min.z > aabb.max.z || this.max.z < aabb.min.z);
    }
    fuzzyTouchesAABB(aabb) {
        assertInst(AABB, aabb);
        return !(lt(aabb.max.x, this.min.x) || lt(this.max.x, aabb.min.x)
            || lt(aabb.max.y, this.min.y) || lt(this.max.y, aabb.min.y)
            || lt(aabb.max.z, this.min.z) || lt(this.max.z, aabb.min.z));
    }
    intersectsAABB(aabb) {
        assertInst(AABB, aabb);
        return !(this.min.x >= aabb.max.x || this.max.x <= aabb.min.x
            || this.min.y >= aabb.max.y || this.max.y <= aabb.min.y
            || this.min.z >= aabb.max.z || this.max.z <= aabb.min.z);
    }
    intersectsAABB2d(aabb) {
        assertInst(AABB, aabb);
        return !(this.min.x >= aabb.max.x || this.max.x <= aabb.min.x
            || this.min.y >= aabb.max.y || this.max.y <= aabb.min.y);
    }
    containsPoint(p) {
        assertVectors(p);
        return this.min.x <= p.x && this.min.y <= p.y && this.min.z <= p.z
            && this.max.x >= p.x && this.max.y >= p.y && this.max.z >= p.z;
    }
    containsSphere(center, radius) {
        assertVectors(center);
        assertNumbers(radius);
        return this.distanceToPoint(center) > radius;
    }
    intersectsSphere(center, radius) {
        assertVectors(center);
        assertNumbers(radius);
        return this.distanceToPoint(center) <= radius;
    }
    distanceToPoint(p) {
        assertVectors(p);
        const x = p.x, y = p.y, z = p.z;
        const min = this.min, max = this.max;
        if (this.containsPoint(p)) {
            return Math.max(min.x - x, x - max.x, min.y - y, y - max.y, min.z - z, z - max.z);
        }
        return p.distanceTo(new V3(clamp(x, min.x, max.x), clamp(y, min.y, max.y), clamp(z, min.z, max.z)));
    }
    containsAABB(aabb) {
        assertInst(AABB, aabb);
        return this.containsPoint(aabb.min) && this.containsPoint(aabb.max);
    }
    likeAABB(aabb) {
        assertInst(AABB, aabb);
        return this.min.like(aabb.min) && this.max.like(aabb.max);
    }
    intersectsLine(line) {
        assertVectors(line.anchor, line.dir1);
        const dir = line.dir1.map(el => el || Number.MIN_VALUE);
        const minTs = (this.min.minus(line.anchor)).divv(dir);
        const maxTs = (this.max.minus(line.anchor)).divv(dir);
        const tMin = minTs.min(maxTs).maxElement(), tMax = minTs.max(maxTs).minElement();
        return tMin <= tMax && !(tMax < line.tMin || line.tMax < tMin);
    }
    hasVolume() {
        return this.min.x <= this.max.x && this.min.y <= this.max.y && this.min.z <= this.max.z;
    }
    volume() {
        if (!this.hasVolume()) {
            return -1;
        }
        const v = this.max.minus(this.min);
        return v.x * v.y * v.z;
    }
    size() {
        return this.max.minus(this.min);
    }
    getCenter() {
        return this.min.plus(this.max).div(2);
    }
    transform(m4) {
        assertInst(M4, m4);
        assert(m4.isAxisAligned());
        const aabb = new AABB();
        aabb.addPoint(m4.transformPoint(this.min));
        aabb.addPoint(m4.transformPoint(this.max));
        return aabb;
    }
    ofTransformed(m4) {
        assertInst(M4, m4);
        const aabb = new AABB();
        aabb.addPoints(m4.transformedPoints(this.corners()));
        return aabb;
    }
    corners() {
        const min = this.min, max = this.max;
        return [
            min,
            new V3(min.x, min.y, max.z),
            new V3(min.x, max.y, min.z),
            new V3(min.x, max.y, max.z),
            new V3(max.x, min.y, min.z),
            new V3(max.x, min.y, max.z),
            new V3(max.x, max.y, min.z),
            max,
        ];
    }
    toString() {
        return callsce('new AABB', this.min, this.max);
    }
    toSource() {
        return this.toString();
    }
}

const WGL = WebGLRenderingContext;
class Buffer {
    /**
     * Provides a simple method of uploading data to a GPU buffer. Example usage:
     *
     *     const vertices = new Buffer(WGL.ARRAY_BUFFER, Float32Array)
     *     vertices.data = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]]
     *     vertices.compile()
     *
     *     const indices = new Buffer(WGL.ELEMENT_ARRAY_BUFFER, Uint16Array)
     *     indices.data = [[0, 1, 2], [2, 1, 3]]
     *     indices.compile()
     *
     * Specifies the target to which the buffer object is bound.
     * The symbolic constant must be GL_ARRAY_BUFFER or GL_ELEMENT_ARRAY_BUFFER.
     */
    constructor(target, type) {
        this.target = target;
        this.type = type;
        assert(target == WGL.ARRAY_BUFFER || target == WGL.ELEMENT_ARRAY_BUFFER, 'target == WGL.ARRAY_BUFFER || target == WGL.ELEMENT_ARRAY_BUFFER');
        assert(type == Float32Array || type == Uint16Array, 'type == Float32Array || type == Uint16Array');
        this.buffer = undefined;
        this.type = type;
        this.data = [];
        this.count = 0;
        this.spacing = 1;
        this.hasBeenCompiled = false;
    }
    /**
     * Upload the contents of `data` to the GPU in preparation for rendering. The data must be a list of lists
     * where each inner list has the same length. For example, each element of data for vertex normals would be a
     * list of length three. This will remember the data length and element length for later use by shaders.
     *
     * This could have used `[].concat.apply([], this.data)` to flatten the array but Google
     * Chrome has a maximum number of arguments so the concatenations are chunked to avoid that limit.
     *
     * @param usage Either `WGL.STATIC_DRAW` or `WGL.DYNAMIC_DRAW`. Defaults to `WGL.STATIC_DRAW`
     */
    compile(usage = WGL.STATIC_DRAW, gl = currentGL()) {
        assert(WGL.STATIC_DRAW == usage || WGL.DYNAMIC_DRAW == usage, 'WGL.STATIC_DRAW == type || WGL.DYNAMIC_DRAW == type');
        this.buffer = this.buffer || gl.createBuffer();
        let buffer;
        if (this.data.length == 0) {
            console.warn('empty buffer ' + this.name);
            //console.trace()
        }
        if (this.data.length == 0 || this.data[0] instanceof V3) {
            assert(!(this.data[0] instanceof V3) || this.type == Float32Array);
            V3.pack(this.data, buffer = new this.type(this.data.length * 3)); // asserts that all
            // elements are V3s
            this.spacing = 3;
            this.count = this.data.length;
            this.maxValue = 0;
        }
        else {
            //assert(Array != this.data[0].constructor, this.name + this.data[0])
            if (Array.isArray(this.data[0])) {
                const bufferLength = this.data.length * this.data[0].length;
                buffer = new this.type(bufferLength);
                let i = this.data.length, destPtr = bufferLength;
                while (i--) {
                    const subArray = this.data[i];
                    let j = subArray.length;
                    while (j--) {
                        buffer[--destPtr] = subArray[j];
                    }
                }
                assert(0 == destPtr);
            }
            else {
                buffer = new this.type(this.data);
            }
            const spacing = this.data.length ? buffer.length / this.data.length : 0;
            assert(spacing % 1 == 0, `buffer ${this.name} elements not of consistent size, average size is ` + spacing);
            if (NLA_DEBUG) {
                if (10000 <= buffer.length) {
                    this.maxValue = 0;
                }
                else {
                    this.maxValue = Math.max.apply(undefined, buffer);
                }
            }
            assert([1, 2, 3, 4].includes(spacing));
            this.spacing = spacing;
            this.count = this.data.length;
        }
        gl.bindBuffer(this.target, this.buffer);
        gl.bufferData(this.target, buffer, usage);
        this.hasBeenCompiled = true;
    }
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */













function __awaiter$1(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

const { cos, sin, PI: PI$2, min, max } = Math;
const WGL$1 = WebGLRenderingContext;
/**
 * @example new Mesh()
 *        .addIndexBuffer('TRIANGLES')
 *        .addIndexBuffer('LINES')
 *        .addVertexBuffer('normals', 'ts_Normal')
 */
class Mesh extends Transformable {
    constructor() {
        super();
        this.hasBeenCompiled = false;
        this.vertexBuffers = {};
        this.indexBuffers = {};
        this.addVertexBuffer('vertices', 'ts_Vertex');
    }
    calcVolume() {
        let totalVolume = 0, totalCentroid = V3.O, totalAreaX2 = 0;
        const triangles = this.TRIANGLES;
        const vertices = this.vertices;
        for (let i = 0; i < triangles.length; i += 3) {
            const i0 = triangles[i + 0], i1 = triangles[i + 1], i2 = triangles[i + 2];
            const v0 = vertices[i0], v1 = vertices[i1], v2 = vertices[i2];
            const v01 = v1.minus(v0), v02 = v2.minus(v0);
            const normal = v01.cross(v02);
            //const centroidZ = (v0.z + v1.z + v2.z) / 3
            //totalVolume += centroidZ * (area === v01.cross(v02).length() / 2) * v01.cross(v02).unit().z
            const faceCentroid = v0.plus(v1.plus(v2)).div(3);
            totalVolume += faceCentroid.z * normal.z / 2;
            const faceAreaX2 = normal.length();
            totalAreaX2 += faceAreaX2;
            totalCentroid = totalCentroid.plus(new V3(faceCentroid.x, faceCentroid.y, faceCentroid.z / 2).times(faceCentroid.z * normal.z / 2));
        }
        // sumInPlaceTree adds negligible additional accuracy for XY sphere
        return { volume: totalVolume, centroid: totalCentroid.div(triangles.length / 3), area: totalAreaX2 / 2 };
    }
    /**
     * Add a new vertex buffer with a list as a property called `name` on this object and map it to
     * the attribute called `attribute` in all shaders that draw this mesh.
     * @example new Mesh().addVertexBuffer('coords', 'ts_TexCoord')
     */
    addVertexBuffer(name, attribute) {
        assert(!this.vertexBuffers[attribute], 'Buffer ' + attribute + ' already exists.');
        //assert(!this[name])
        this.hasBeenCompiled = false;
        assert('string' == typeof name);
        assert('string' == typeof attribute);
        const buffer = this.vertexBuffers[attribute] = new Buffer(WGL$1.ARRAY_BUFFER, Float32Array);
        buffer.name = name;
        this[name] = [];
        return this;
    }
    /**
     * Add a new index buffer.
     * @example new Mesh().addIndexBuffer('TRIANGLES')
     * @example new Mesh().addIndexBuffer('LINES')
     */
    addIndexBuffer(name) {
        this.hasBeenCompiled = false;
        const buffer = this.indexBuffers[name] = new Buffer(WGL$1.ELEMENT_ARRAY_BUFFER, Uint16Array);
        buffer.name = name;
        this[name] = [];
        return this;
    }
    concat(...others) {
        const mesh = new Mesh();
        [this].concat(others).forEach((oldMesh) => {
            const startIndex = mesh.vertices ? mesh.vertices.length : 0;
            Object.getOwnPropertyNames(oldMesh.vertexBuffers).forEach(attribute => {
                const bufferName = this.vertexBuffers[attribute].name;
                if (!mesh.vertexBuffers[attribute]) {
                    mesh.addVertexBuffer(bufferName, attribute);
                }
                mesh[bufferName].push(...oldMesh[bufferName]);
            });
            Object.getOwnPropertyNames(oldMesh.indexBuffers).forEach(name => {
                if (!mesh.indexBuffers[name]) {
                    mesh.addIndexBuffer(name);
                }
                mesh[name].push(...oldMesh[name].map(index => index + startIndex));
            });
        });
        return mesh;
    }
    /**
     * Upload all attached buffers to the GPU in preparation for rendering. This doesn't need to be called every
     * frame, only needs to be done when the data changes.
     *
     * Sets `this.hasBeenCompiled` to true.
     */
    compile(gl = currentGL()) {
        // figure out shortest vertex buffer to make sure indexBuffers are in bounds
        let minVertexBufferLength = Infinity; // TODO, _minBufferName
        Object.getOwnPropertyNames(this.vertexBuffers).forEach(attribute => {
            const buffer = this.vertexBuffers[attribute];
            buffer.data = this[buffer.name];
            buffer.compile(undefined, gl);
            if (this[buffer.name].length < minVertexBufferLength) {
                // _minBufferName = attribute
                minVertexBufferLength = this[buffer.name].length;
            }
        });
        for (const name in this.indexBuffers) {
            const buffer = this.indexBuffers[name];
            buffer.data = this[buffer.name];
            buffer.compile(undefined, gl);
            // if (NLA_DEBUG && buffer.maxValue >= minVertexBufferLength) {
            // 	throw new Error(`max index value for buffer ${name}
            // 	is too large ${buffer.maxValue} min Vbuffer size: ${minVertexBufferLength} ${minBufferName}`)
            // }
        }
        this.hasBeenCompiled = true;
        return this;
    }
    static fromBinarySTL(stl) {
        return __awaiter$1(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const mesh = new Mesh()
                    .addVertexBuffer('normals', 'ts_Normal');
                const fileReader = new FileReader();
                fileReader.onerror = reject;
                fileReader.onload = function (_progressEvent) {
                    const dataView = new DataView(this.result);
                    const HEADER_BYTE_SIZE = 80;
                    const triangleCount = dataView.getUint32(HEADER_BYTE_SIZE, true);
                    mesh.normals.length = triangleCount * 3;
                    mesh.vertices.length = triangleCount * 3;
                    let i = triangleCount * 3, bufferPtr = HEADER_BYTE_SIZE + 4;
                    function readV3() {
                        const x = dataView.getFloat32(bufferPtr, true);
                        bufferPtr += 4;
                        const y = dataView.getFloat32(bufferPtr, true);
                        bufferPtr += 4;
                        const z = dataView.getFloat32(bufferPtr, true);
                        bufferPtr += 4;
                        return new V3(x, y, z);
                    }
                    while (i) {
                        i -= 3;
                        const normal = readV3();
                        mesh.normals[i + 0] = normal;
                        mesh.normals[i + 1] = normal;
                        mesh.normals[i + 2] = normal;
                        mesh.vertices[i + 0] = readV3();
                        mesh.vertices[i + 1] = readV3();
                        mesh.vertices[i + 2] = readV3();
                        bufferPtr += 2;
                    }
                    resolve(mesh);
                };
                fileReader.readAsArrayBuffer(stl);
            });
        });
    }
    toBinarySTL() {
        if (!this.TRIANGLES)
            throw new Error('TRIANGLES must be defined.');
        const HEADER_BYTE_SIZE = 80, FLOAT_BYTE_SIZE = 4;
        const triangles = this.TRIANGLES;
        const triangleCount = triangles.length / 3;
        const buffer = new ArrayBuffer(HEADER_BYTE_SIZE + 4 + triangleCount * (4 * 3 * FLOAT_BYTE_SIZE + 2));
        const dataView = new DataView(buffer);
        dataView.setUint32(HEADER_BYTE_SIZE, triangleCount, true);
        let bufferPtr = HEADER_BYTE_SIZE + 4;
        let i = triangles.length;
        while (i) {
            i -= 3;
            const a = this.vertices[triangles[i]], b = this.vertices[triangles[i + 1]], c = this.vertices[triangles[i + 2]];
            const normal = V3.normalOnPoints(a, b, c);
            [normal, a, b, c].forEach(v => {
                dataView.setFloat32(bufferPtr, v.x, true);
                bufferPtr += 4;
                dataView.setFloat32(bufferPtr, v.y, true);
                bufferPtr += 4;
                dataView.setFloat32(bufferPtr, v.z, true);
                bufferPtr += 4;
            });
            // skip 2 bytes, already initalized to zero
            bufferPtr += 2;
        }
        assert(bufferPtr == buffer.byteLength, bufferPtr + ' ' + buffer.byteLength);
        return new Blob([buffer], { type: 'application/octet-stream' });
    }
    /**
     * Transform all vertices by `matrix` and all normals by the inverse transpose of `matrix`.
     *
     * Index buffer data is referenced.
     */
    transform(m4) {
        const mesh = new Mesh();
        mesh.vertices = m4.transformedPoints(this.vertices);
        if (this.normals) {
            mesh.addVertexBuffer('normals', 'ts_Normal');
            const invTrans = m4.as3x3().inversed().transposed().normalized();
            mesh.normals = this.normals.map(n => invTrans.transformVector(n).unit());
            // mesh.normals.forEach(n => assert(n.hasLength(1)))
        }
        for (const name in this.indexBuffers) {
            mesh.addIndexBuffer(name);
            mesh[name] = this[name];
        }
        for (const attribute in this.vertexBuffers) {
            if ('ts_Vertex' !== attribute && 'ts_Normal' !== attribute) {
                const name = this.vertexBuffers[attribute].name;
                mesh.addVertexBuffer(name, attribute);
                mesh[name] = this[name];
            }
        }
        mesh.compile();
        return mesh;
    }
    /**
     * Computes a new normal1 for each vertex from the average normal1 of the neighboring triangles. This means
     * adjacent triangles must share vertices for the resulting normals to be smooth.
     */
    computeNormalsFromFlatTriangles() {
        if (!this.normals)
            this.addVertexBuffer('normals', 'ts_Normal');
        // tslint:disable:no-string-literal
        //this.vertexBuffers['ts_Normal'].data = arrayFromFunction(this.vertices.length, i => V3.O)
        const TRIANGLES = this.TRIANGLES, vertices = this.vertices, normals = this.normals;
        normals.length = vertices.length;
        for (let i = 0; i < TRIANGLES.length; i += 3) {
            const ai = TRIANGLES[i], bi = TRIANGLES[i + 1], ci = TRIANGLES[i + 2];
            const a = vertices[ai];
            const b = vertices[bi];
            const c = vertices[ci];
            const normal = b.minus(a).cross(c.minus(a)).unit();
            normals[ai] = normals[ai].plus(normal);
            normals[bi] = normals[bi].plus(normal);
            normals[ci] = normals[ci].plus(normal);
        }
        for (let i = 0; i < vertices.length; i++) {
            normals[i] = normals[i].unit();
        }
        this.hasBeenCompiled = false;
        return this;
    }
    computeWireframeFromFlatTriangles(indexBufferName = 'LINES') {
        if (!this.TRIANGLES)
            throw new Error('TRIANGLES must be defined.');
        const canonEdges = new Set();
        function canonEdge(i0, i1) {
            const iMin = min(i0, i1), iMax = max(i0, i1);
            return (iMin << 16) | iMax;
        }
        // function uncanonEdge(key) {
        // 	return [key >> 16, key & 0xffff]
        // }
        const t = this.TRIANGLES;
        for (let i = 0; i < t.length; i += 3) {
            canonEdges.add(canonEdge(t[i + 0], t[i + 1]));
            canonEdges.add(canonEdge(t[i + 1], t[i + 2]));
            canonEdges.add(canonEdge(t[i + 2], t[i + 0]));
        }
        const data = indexBufferName;
        if (!this[data])
            this.addIndexBuffer(indexBufferName);
        //this.LINES = new Array(canonEdges.size)
        canonEdges.forEach(val => this[data].push(val >> 16, val & 0xffff));
        this.hasBeenCompiled = false;
        return this;
    }
    computeWireframeFromFlatTrianglesClosedMesh(indexBufferName = 'LINES') {
        if (!this.TRIANGLES)
            throw new Error('TRIANGLES must be defined.');
        if (!this.LINES)
            this.addIndexBuffer('LINES');
        const tris = this.TRIANGLES;
        if (!this[indexBufferName])
            this.addIndexBuffer(indexBufferName);
        const lines = this[indexBufferName];
        for (let i = 0; i < tris.length; i += 3) {
            if (tris[i + 0] < tris[i + 1])
                lines.push(tris[i + 0], tris[i + 1]);
            if (tris[i + 1] < tris[i + 2])
                lines.push(tris[i + 1], tris[i + 2]);
            if (tris[i + 2] < tris[i + 0])
                lines.push(tris[i + 2], tris[i + 0]);
        }
        this.hasBeenCompiled = false;
        return this;
    }
    computeNormalLines(length = 1, indexBufferName = 'LINES') {
        if (!this.normals) {
            throw new Error('normals must be defined.');
        }
        const vs = this.vertices, si = this.vertices.length;
        if (!this[indexBufferName])
            this.addIndexBuffer(indexBufferName);
        for (let i = 0; i < this.normals.length; i++) {
            vs[si + i] = vs[i].plus(this.normals[i].toLength(length));
            this[indexBufferName].push(si + i, i);
        }
        this.hasBeenCompiled = false;
        return this;
    }
    getAABB() {
        return new AABB().addPoints(this.vertices);
    }
    getBoundingSphere() {
        const sphere = { center: this.getAABB().getCenter(), radius: 0 };
        for (let i = 0; i < this.vertices.length; i++) {
            sphere.radius = Math.max(sphere.radius, this.vertices[i].minus(sphere.center).length());
        }
        return sphere;
    }
    // ### Mesh.plane([options])
    //
    // Generates a square 2x2 mesh the xy plane centered at the origin. The
    // `options` argument specifies options to pass to the mesh constructor.
    // Additional options include `detailX` and `detailY`, which set the tesselation
    // in x and y, and `detail`, which sets both `detailX` and `detailY` at once.
    // Two triangles are generated by default.
    // Example usage:
    //
    //     var mesh1 = Mesh.plane();
    //     var mesh2 = Mesh.plane({ detail: 5 });
    //     var mesh3 = Mesh.plane({ detailX: 20, detailY: 40 });
    //
    /**
     * Generates a square mesh in the XY plane.
     * Texture coordinates (buffer "coords") are set to go from 0 to 1 in either direction.
     *
     *
     * @param {Object=} options
     * @param {number=} options.detail Defaults to 1
     * @param {number=} options.detailX Defaults to options.detail. Number of subdivisions in X direction.
     * @param {number=} options.detailY Defaults to options.detail. Number of subdivisions in Y direction.j
     * @param {number=} options.width defaults to 1
     * @param {number=} options.height defaults to 1
     * @param {number=} options.startX defaults to 0
     * @param {number=} options.startY defaults to 0
     */
    static plane(options = {}) {
        const detailX = options.detailX || options.detail || 1;
        const detailY = options.detailY || options.detail || 1;
        const startX = options.startX || 0;
        const startY = options.startY || 0;
        const width = options.width || 1;
        const height = options.height || 1;
        const mesh = new Mesh()
            .addIndexBuffer('LINES')
            .addIndexBuffer('TRIANGLES')
            .addVertexBuffer('normals', 'ts_Normal')
            .addVertexBuffer('coords', 'ts_TexCoord');
        for (let j = 0; j <= detailY; j++) {
            const t = j / detailY;
            for (let i = 0; i <= detailX; i++) {
                const s = i / detailX;
                mesh.vertices.push(new V3(startX + s * width, startY + t * height, 0));
                mesh.coords.push([s, t]);
                mesh.normals.push(V3.Z);
                if (i < detailX && j < detailY) {
                    const offset = i + j * (detailX + 1);
                    mesh.TRIANGLES.push(offset, offset + detailX + 1, offset + 1, offset + detailX + 1, offset + detailX + 2, offset + 1);
                }
            }
        }
        for (let i = 0; i < detailX; i++) {
            mesh.LINES.push(i, i + 1);
            mesh.LINES.push((detailX + 1) * detailY + i, (detailX + 1) * detailY + i + 1);
        }
        for (let j = 0; j < detailY; j++) {
            mesh.LINES.push(detailX * j, detailX * (j + 1) + 1);
            mesh.LINES.push(detailX * (j + 1), detailX * (j + 2) + 1);
        }
        mesh.compile();
        return mesh;
    }
    /**
     * Generates a unit cube (1x1x1) starting at the origin and extending into the (+ + +) octant.
     * I.e. box from V3.O to V3(1,1,1)
     * Creates line, triangle, vertex and normal1 buffers.
     */
    static cube() {
        const mesh = new Mesh()
            .addVertexBuffer('normals', 'ts_Normal')
            .addIndexBuffer('TRIANGLES')
            .addIndexBuffer('LINES');
        // basically indexes for faces of the cube. vertices each need to be added 3 times,
        // as they have different normals depending on the face being rendered
        const VERTEX_CORNERS = [
            0, 1, 2, 3,
            4, 5, 6, 7,
            0, 4, 1, 5,
            2, 6, 3, 7,
            2, 6, 0, 4,
            3, 7, 1, 5,
        ];
        mesh.vertices = VERTEX_CORNERS.map(i => Mesh.UNIT_CUBE_CORNERS[i]);
        mesh.normals = [V3.X.negated(), V3.X, V3.Y.negated(), V3.Y, V3.Z.negated(), V3.Z].map(v => [v, v, v, v]).concatenated();
        for (let i = 0; i < 6 * 4; i += 4) {
            pushQuad(mesh.TRIANGLES, 0 != i % 8, VERTEX_CORNERS[i], VERTEX_CORNERS[i + 1], VERTEX_CORNERS[i + 2], VERTEX_CORNERS[i + 3]);
        }
        // indexes of LINES relative to UNIT_CUBE_CORNERS. Mapped to VERTEX_CORNERS.indexOf
        // so they make sense in the context of the mesh
        mesh.LINES = [
            0, 1,
            0, 2,
            1, 3,
            2, 3,
            0, 4,
            1, 5,
            2, 6,
            3, 7,
            4, 5,
            4, 6,
            5, 7,
            6, 7,
        ].map(i => VERTEX_CORNERS.indexOf(i));
        mesh.compile();
        return mesh;
    }
    static isocahedron() {
        return Mesh.sphere(0);
    }
    static sphere2(las, longs) {
        const baseVertices = arrayFromFunction(las, i => {
            const angle = i / (las - 1) * PI$2 - PI$2 / 2;
            return new V3(0, cos(angle), sin(angle));
        });
        return Mesh.rotation(baseVertices, { anchor: V3.O, dir1: V3.Z }, 2 * PI$2, longs, true, baseVertices);
    }
    /**
     * Returns a sphere mesh with radius 1 created by subdividing the faces of a isocahedron (20-sided) recursively
     * The sphere is positioned at the origin
     * @param subdivisions
     *      How many recursive divisions to do. A subdivision divides a triangle into 4,
     *      so the total number of triangles is 20 * 4^subdivisions
     * @returns
     *      Contains vertex and normal1 buffers and index buffers for triangles and LINES
     */
    static sphere(subdivisions = 3) {
        const golden = (1 + Math.sqrt(5)) / 2, u = new V3(1, golden, 0).unit(), s = u.x, t = u.y;
        // base vertices of isocahedron
        const vertices = [
            new V3(-s, t, 0),
            new V3(s, t, 0),
            new V3(-s, -t, 0),
            new V3(s, -t, 0),
            new V3(0, -s, t),
            new V3(0, s, t),
            new V3(0, -s, -t),
            new V3(0, s, -t),
            new V3(t, 0, -s),
            new V3(t, 0, s),
            new V3(-t, 0, -s),
            new V3(-t, 0, s)
        ];
        // base triangles of isocahedron
        const triangles = [
            // 5 faces around point 0
            0, 11, 5,
            0, 5, 1,
            0, 1, 7,
            0, 7, 10,
            0, 10, 11,
            // 5 adjacent faces
            1, 5, 9,
            5, 11, 4,
            11, 10, 2,
            10, 7, 6,
            7, 1, 8,
            // 5 faces around point 3
            3, 9, 4,
            3, 4, 2,
            3, 2, 6,
            3, 6, 8,
            3, 8, 9,
            // 5 adjacent faces
            4, 9, 5,
            2, 4, 11,
            6, 2, 10,
            8, 6, 7,
            9, 8, 1,
        ];
        /**
         * Tesselates triangle a b c
         * a b c must already be in vertices with the indexes ia ib ic
         * res is the number of subdivisions to do. 0 just results in triangle and line indexes being added to the
         * respective buffers.
         */
        function tesselateRecursively(a, b, c, res, vertices, triangles, ia, ib, ic, lines) {
            if (0 == res) {
                triangles.push(ia, ib, ic);
                if (ia < ib)
                    lines.push(ia, ib);
                if (ib < ic)
                    lines.push(ib, ic);
                if (ic < ia)
                    lines.push(ic, ia);
            }
            else {
                // subdivide the triangle abc into 4 by adding a vertex (with the correct distance from the origin)
                // between each segment ab, bc and cd, then calling the function recursively
                const abMid1 = a.plus(b).toLength(1), bcMid1 = b.plus(c).toLength(1), caMid1 = c.plus(a).toLength(1);
                // indexes of new vertices:
                const iabm = vertices.length, ibcm = iabm + 1, icam = iabm + 2;
                vertices.push(abMid1, bcMid1, caMid1);
                tesselateRecursively(abMid1, bcMid1, caMid1, res - 1, vertices, triangles, iabm, ibcm, icam, lines);
                tesselateRecursively(a, abMid1, caMid1, res - 1, vertices, triangles, ia, iabm, icam, lines);
                tesselateRecursively(b, bcMid1, abMid1, res - 1, vertices, triangles, ib, ibcm, iabm, lines);
                tesselateRecursively(c, caMid1, bcMid1, res - 1, vertices, triangles, ic, icam, ibcm, lines);
            }
        }
        const mesh = new Mesh()
            .addVertexBuffer('normals', 'ts_Normal')
            .addIndexBuffer('TRIANGLES')
            .addIndexBuffer('LINES');
        mesh.vertices.push(...vertices);
        subdivisions = undefined == subdivisions ? 4 : subdivisions;
        for (let i = 0; i < 20; i++) {
            const [ia, ic, ib] = triangles.slice(i * 3, i * 3 + 3);
            tesselateRecursively(vertices[ia], vertices[ic], vertices[ib], subdivisions, mesh.vertices, mesh.TRIANGLES, ia, ic, ib, mesh.LINES);
        }
        mesh.normals = mesh.vertices;
        mesh.compile();
        return mesh;
    }
    static aabb(aabb) {
        const matrix = M4.multiplyMultiple(M4.translate(aabb.min), M4.scale(aabb.size().max(new V3(NLA_PRECISION, NLA_PRECISION, NLA_PRECISION))));
        const mesh = Mesh.cube().transform(matrix);
        // mesh.vertices = aabb.corners()
        mesh.computeNormalLines(20);
        mesh.compile();
        return mesh;
    }
    static offsetVertices(vertices, offset, close, normals) {
        assertVectors.apply(undefined, vertices);
        assertVectors(offset);
        const mesh = new Mesh()
            .addIndexBuffer('TRIANGLES')
            .addVertexBuffer('coords', 'ts_TexCoord');
        normals && mesh.addVertexBuffer('normals', 'ts_Normal');
        mesh.vertices = vertices.concat(vertices.map(v => v.plus(offset)));
        const vl = vertices.length;
        mesh.coords = arrayFromFunction(vl * 2, (i) => [(i % vl) / vl, (i / vl) | 0]);
        const triangles = mesh.TRIANGLES;
        for (let i = 0; i < vertices.length - 1; i++) {
            pushQuad(triangles, false, i, i + 1, vertices.length + i, vertices.length + i + 1);
        }
        if (close) {
            pushQuad(triangles, false, 0, vertices.length - 1, vertices.length, vertices.length * 2 - 1);
        }
        if (normals) {
            mesh.normals = normals.concat(normals);
        }
        mesh.compile();
        return mesh;
    }
    // Creates a new $Mesh by rotating $vertices by $totalRads around $lineAxis (according to the right-hand
    // rule). $steps is the number of steps to take. $close is whether the vertices of the first and last step
    // should be connected by triangles. If $normals is set (pass an array of V3s of the same length as $vertices),
    // these will also be rotated and correctly added to the mesh.
    // @example const precious = Mesh.rotation([V(10, 0, -2), V(10, 0, 2), V(11, 0, 2), V(11, 0, -2)], , L3.Z, 512)
    static rotation(vertices, lineAxis, totalRads, steps, close = true, normals) {
        const mesh = new Mesh().addIndexBuffer('TRIANGLES');
        normals && mesh.addVertexBuffer('normals', 'ts_Normal');
        const vc = vertices.length, vTotal = vc * steps;
        const rotMat = new M4();
        const triangles = mesh.TRIANGLES;
        for (let i = 0; i < steps; i++) {
            // add triangles
            const rads = totalRads / steps * i;
            M4.rotateLine(lineAxis.anchor, lineAxis.dir1, rads, rotMat);
            mesh.vertices.push(...rotMat.transformedPoints(vertices));
            normals && mesh.normals.push(...rotMat.transformedVectors(normals));
            if (close || i !== steps - 1) {
                for (let j = 0; j < vc - 1; j++) {
                    pushQuad(triangles, false, i * vc + j + 1, i * vc + j, ((i + 1) * vc + j + 1) % vTotal, ((i + 1) * vc + j) % vTotal);
                }
            }
        }
        mesh.compile();
        return mesh;
    }
    static parametric(pF, pN, sMin, sMax, tMin, tMax, sRes, tRes) {
        const mesh = new Mesh()
            .addVertexBuffer('normals', 'ts_Normal')
            .addIndexBuffer('TRIANGLES');
        for (let si = 0; si <= sRes; si++) {
            const s = lerp(sMin, sMax, si / sRes);
            for (let ti = 0; ti <= tRes; ti++) {
                const t = lerp(tMin, tMax, ti / tRes);
                mesh.vertices.push(pF(s, t));
                mesh.normals.push(pN(s, t));
                if (ti < tRes && si < sRes) {
                    const offset = ti + si * (tRes + 1);
                    pushQuad(mesh.TRIANGLES, false, offset, offset + tRes + 1, offset + 1, offset + tRes + 2);
                }
            }
        }
        mesh.compile();
        return mesh;
    }
    static load(json) {
        const mesh = new Mesh();
        if (Array.isArray(json.vertices[0])) {
            mesh.vertices = json.vertices.map(x => V(x));
        }
        else {
            throw new Error();
        }
        if (json.triangles) {
            mesh.addIndexBuffer('TRIANGLES');
            mesh.TRIANGLES = json.triangles;
        }
        if (json.normals) {
            mesh.addVertexBuffer('normals', 'ts_Normal');
            mesh.normals = json.normals;
        }
        mesh.compile();
        return mesh;
    }
}
// unique corners of a unit cube. Used by Mesh.cube to generate a cube mesh.
Mesh.UNIT_CUBE_CORNERS = [
    V3.O,
    new V3(0, 0, 1),
    new V3(0, 1, 0),
    new V3(0, 1, 1),
    new V3(1, 0, 0),
    new V3(1, 0, 1),
    new V3(1, 1, 0),
    V3.XYZ,
];

/* tslint:disable:no-string-literal */
const WGL$2 = WebGLRenderingContext;
/**
 * These are all the draw modes usable in OpenGL ES
 */
const DRAW_MODE_NAMES = {
    [WGL$2.POINTS]: 'POINTS',
    [WGL$2.LINES]: 'LINES',
    [WGL$2.LINE_STRIP]: 'LINE_STRIP',
    [WGL$2.LINE_LOOP]: 'LINE_LOOP',
    [WGL$2.TRIANGLES]: 'TRIANGLES',
    [WGL$2.TRIANGLE_STRIP]: 'TRIANGLE_STRIP',
    [WGL$2.TRIANGLE_FAN]: 'TRIANGLE_FAN',
};
const DRAW_MODE_CHECKS = {
    [WGL$2.POINTS]: _ => true,
    [WGL$2.LINES]: x => 0 == x % 2,
    [WGL$2.LINE_STRIP]: x => x > 2,
    [WGL$2.LINE_LOOP]: x => x > 2,
    [WGL$2.TRIANGLES]: x => 0 == x % 3,
    [WGL$2.TRIANGLE_STRIP]: x => x > 3,
    [WGL$2.TRIANGLE_FAN]: x => x > 3,
};


function isFloatArray(obj) {
    return Float32Array == obj.constructor || Float64Array == obj.constructor ||
        Array.isArray(obj) && obj.every(x => 'number' == typeof x);
}
function isIntArray(x) {
    if ([Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array]
        .some(y => x instanceof y)) {
        return true;
    }
    return (x instanceof Float32Array || x instanceof Float64Array || Array.isArray(x)) &&
        x.every(x => Number.isInteger(x));
}
//const x:UniformTypes = undefined as 'FLOAT_VEC4' | 'FLOAT_VEC3'
class Shader {
    /**
     * Provides a convenient wrapper for WebGL shaders. A few uniforms and attributes,
     * prefixed with `gl_`, are automatically added to all shader sources to make
     * simple shaders easier to write.
     * Headers for the following variables are automatically prepended to the passed source. The correct variables
     * are also automatically passed to the shader when drawing.
     *
     * For vertex and fragment shaders:
     uniform mat3 ts_NormalMatrix;
     uniform mat4 ts_ModelViewMatrix;
     uniform mat4 ts_ProjectionMatrix;
     uniform mat4 ts_ModelViewProjectionMatrix;
     uniform mat4 ts_ModelViewMatrixInverse;
     uniform mat4 ts_ProjectionMatrixInverse;
     uniform mat4 ts_ModelViewProjectionMatrixInverse;
     *
     *
     * Example usage:
     *
     *  const shader = new GL.Shader(
     *      `void main() { gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex; }`,
     *      `uniform vec4 color; void main() { gl_FragColor = color; }`)
     *
     *  shader.uniforms({ color: [1, 0, 0, 1] }).draw(mesh)
     *
     * Compiles a shader program using the provided vertex and fragment shaders.
     */
    constructor(vertexSource, fragmentSource, gl = currentGL()) {
        this.projectionMatrixVersion = -1;
        this.modelViewMatrixVersion = -1;
        // const versionRegex = /^(?:\s+|\/\/[\s\S]*?[\r\n]+|\/\*[\s\S]*?\*\/)+(#version\s+(\d+)\s+es)/
        // Headers are prepended to the sources to provide some automatic functionality.
        const header = `
		uniform mat3 ts_NormalMatrix;
		uniform mat4 ts_ModelViewMatrix;
		uniform mat4 ts_ProjectionMatrix;
		uniform mat4 ts_ModelViewProjectionMatrix;
		uniform mat4 ts_ModelViewMatrixInverse;
		uniform mat4 ts_ProjectionMatrixInverse;
		uniform mat4 ts_ModelViewProjectionMatrixInverse;
	`;
        const matrixNames = header.match(/\bts_\w+/g);
        // Compile and link errors are thrown as strings.
        function compileSource(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw new Error('compile error: ' + gl.getShaderInfoLog(shader));
            }
            return shader;
        }
        this.gl = gl;
        this.program = gl.createProgram();
        gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource));
        gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource));
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error('link error: ' + gl.getProgramInfoLog(this.program));
        }
        this.attributeLocations = {};
        this.uniformLocations = {};
        this.constantAttributes = {};
        // Check for the use of built-in matrices that require expensive matrix
        // multiplications to compute, and record these in `activeMatrices`.
        this.activeMatrices = {};
        matrixNames && matrixNames.forEach(name => {
            if (gl.getUniformLocation(this.program, name)) {
                this.activeMatrices[name] = true;
            }
        });
        this.uniformInfos = {};
        for (let i = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS); i-- > 0;) {
            // see https://www.khronos.org/registry/OpenGL-Refpages/es2.0/xhtml/glGetActiveUniform.xml
            // this.program has already been checked
            // i is in bounds
            const info = gl.getActiveUniform(this.program, i);
            this.uniformInfos[info.name] = info;
        }
    }
    static create(vertexSource, fragmentSource, gl) {
        return new Shader(vertexSource, fragmentSource, gl);
    }
    /**
     * Set a uniform for each property of `uniforms`. The correct `viewerGL.uniform*()` method is inferred from the
     * value types and from the stored uniform sampler flags.
     */
    uniforms(uniforms) {
        const gl = this.gl;
        gl.useProgram(this.program);
        for (const name in uniforms) {
            const location = this.uniformLocations[name] || gl.getUniformLocation(this.program, name);
            // !location && console.warn(name + ' uniform is not used in shader')
            if (!location)
                continue;
            this.uniformLocations[name] = location;
            let value = uniforms[name];
            const info = this.uniformInfos[name];
            if (NLA_DEBUG) {
                // TODO: better errors
                if (gl.SAMPLER_2D == info.type || gl.SAMPLER_CUBE == info.type || gl.INT == info.type) {
                    if (1 == info.size) {
                        assert(Number.isInteger(value));
                    }
                    else {
                        assert(isIntArray(value) && value.length == info.size, 'value must be int array if info.size != 1');
                    }
                }
                assert(gl.FLOAT != info.type ||
                    (1 == info.size && 'number' === typeof value || isFloatArray(value) && info.size == value.length));
                assert(gl.FLOAT_VEC3 != info.type ||
                    (1 == info.size && value instanceof V3 ||
                        Array.isArray(value) && info.size == value.length && assertVectors(...value)));
                assert(gl.FLOAT_VEC4 != info.type || 1 != info.size || isFloatArray(value) && value.length == 4);
                assert(gl.FLOAT_MAT4 != info.type || value instanceof M4, () => value.toSource());
                assert(gl.FLOAT_MAT3 != info.type || value.length == 9 || value instanceof M4);
            }
            if (value instanceof V3) {
                value = value.toArray();
            }
            if (gl.FLOAT_VEC4 == info.type && info.size != 1) {
                gl.uniform4fv(location, value.concatenated());
            }
            else if (gl.FLOAT == info.type && info.size != 1) {
                gl.uniform1fv(location, value);
            }
            else if (gl.FLOAT_VEC3 == info.type && info.size != 1) {
                gl.uniform3fv(location, V3.pack(value));
            }
            else if (value.length) {
                switch (value.length) {
                    case 1:
                        gl.uniform1fv(location, value);
                        break;
                    case 2:
                        gl.uniform2fv(location, value);
                        break;
                    case 3:
                        gl.uniform3fv(location, value);
                        break;
                    case 4:
                        gl.uniform4fv(location, value);
                        break;
                    // Matrices are automatically transposed, since WebGL uses column-major
                    // indices instead of row-major indices.
                    case 9:
                        gl.uniformMatrix3fv(location, false, new Float32Array([
                            value[0], value[3], value[6],
                            value[1], value[4], value[7],
                            value[2], value[5], value[8],
                        ]));
                        break;
                    case 16:
                        gl.uniformMatrix4fv(location, false, new Float32Array([
                            value[0], value[4], value[8], value[12],
                            value[1], value[5], value[9], value[13],
                            value[2], value[6], value[10], value[14],
                            value[3], value[7], value[11], value[15],
                        ]));
                        break;
                    default:
                        throw new Error('don\'t know how to load uniform "' + name + '" of length ' + value.length);
                }
            }
            else if ('number' == typeof value) {
                if (gl.SAMPLER_2D == info.type || gl.SAMPLER_CUBE == info.type || gl.INT == info.type) {
                    gl.uniform1i(location, value);
                }
                else {
                    gl.uniform1f(location, value);
                }
            }
            else if ('boolean' == typeof value) {
                gl.uniform1i(location, +value);
            }
            else if (value instanceof M4) {
                const m = value.m;
                if (gl.FLOAT_MAT4 == info.type) {
                    gl.uniformMatrix4fv(location, false, [
                        m[0], m[4], m[8], m[12],
                        m[1], m[5], m[9], m[13],
                        m[2], m[6], m[10], m[14],
                        m[3], m[7], m[11], m[15]
                    ]);
                }
                else if (gl.FLOAT_MAT3 == info.type) {
                    gl.uniformMatrix3fv(location, false, [
                        m[0], m[4], m[8],
                        m[1], m[5], m[9],
                        m[2], m[6], m[10]
                    ]);
                }
                else if (gl.FLOAT_MAT2 == info.type) {
                    gl.uniformMatrix2fv(location, false, new Float32Array([
                        m[0], m[4],
                        m[1], m[5]
                    ]));
                }
                else {
                    throw new Error(`Can't assign M4 to ${info.type}`);
                }
            }
            else {
                throw new Error('attempted to set uniform "' + name + '" to invalid value ' + value);
            }
        }
        return this;
    }
    attributes(attributes) {
        const gl = this.gl;
        gl.useProgram(this.program);
        for (const name in attributes) {
            const location = this.attributeLocations[name] || gl.getAttribLocation(this.program, name);
            if (location == -1) {
                if (!name.startsWith('ts_')) {
                    console.warn(`Vertex buffer ${name} was not bound because the attribute is not active.`);
                }
                continue;
            }
            this.attributeLocations[name] = location;
            gl.disableVertexAttribArray(location);
            let value = attributes[name];
            if (value instanceof V3) {
                value = value.toArray();
            }
            if ('number' === typeof value) {
                gl.vertexAttrib1f(location, value);
            }
            else {
                gl.vertexAttrib4fv(location, value);
                // switch ((value as number[]).length) {
                // 	case 1:
                // 		gl.vertexAttrib1fv(location, value as number[])
                // 		break
                // 	case 2:
                // 		gl.vertexAttrib2fv(location, value as number[])
                // 		break
                // 	case 3:
                // 		gl.vertexAttrib3fv(location, value as number[])
                // 		break
                // 	case 4:
                // 		break
                // }
            }
            this.constantAttributes[name] = true;
        }
        return this;
    }
    /**
     * Sets all uniform matrix attributes, binds all relevant buffers, and draws the mesh geometry as indexed
     * triangles or indexed LINES. Set `mode` to `gl.LINES` (and either add indices to `LINES` or call
     * `computeWireframe()`) to draw the mesh in wireframe.
     *
     * @param mesh
     * @param mode Defaults to 'TRIANGLES'. Must be passed as string so the correct index buffer can be
     *     automatically drawn.
     * @param start int
     * @param count int
     */
    draw(mesh, mode = WGL$2.TRIANGLES, start, count) {
        assert(mesh.hasBeenCompiled, 'mesh.hasBeenCompiled');
        assert(undefined != DRAW_MODE_NAMES[mode]);
        const modeName = DRAW_MODE_NAMES[mode];
        // assert(mesh.indexBuffers[modeStr], `mesh.indexBuffers[${modeStr}] undefined`)
        return this.drawBuffers(mesh.vertexBuffers, mesh.indexBuffers[modeName], mode, start, count);
    }
    /**
     * Sets all uniform matrix attributes, binds all relevant buffers, and draws the
     * indexed mesh geometry. The `vertexBuffers` argument is a map from attribute
     * names to `Buffer` objects of type `WGL.ARRAY_BUFFER`, `indexBuffer` is a `Buffer`
     * object of type `WGL.ELEMENT_ARRAY_BUFFER`, and `mode` is a WebGL primitive mode
     * like `WGL.TRIANGLES` or `WGL.LINES`. This method automatically creates and caches
     * vertex attribute pointers for attributes as needed.
     */
    drawBuffers(vertexBuffers, indexBuffer, mode = WGL$2.TRIANGLES, start = 0, count) {
        const gl = this.gl;
        assert(undefined != DRAW_MODE_NAMES[mode]);
        assertf(() => 1 <= Object.keys(vertexBuffers).length);
        Object.keys(vertexBuffers).forEach(key => assertInst(Buffer, vertexBuffers[key]));
        // Only varruct up the built-in matrices that are active in the shader
        const on = this.activeMatrices;
        const modelViewMatrixInverse = (on['ts_ModelViewMatrixInverse'] || on['ts_NormalMatrix'])
            //&& this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            && gl.modelViewMatrix.inversed();
        const projectionMatrixInverse = on['ts_ProjectionMatrixInverse']
            //&& this.projectionMatrixVersion != gl.projectionMatrixVersion
            && gl.projectionMatrix.inversed();
        const modelViewProjectionMatrix = (on['ts_ModelViewProjectionMatrix'] || on['ts_ModelViewProjectionMatrixInverse'])
            //&& (this.projectionMatrixVersion != gl.projectionMatrixVersion || this.modelViewMatrixVersion !=
            // gl.modelViewMatrixVersion)
            && gl.projectionMatrix.times(gl.modelViewMatrix);
        const uni = {}; // Uniform Matrices
        on['ts_ModelViewMatrix']
            && this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            && (uni['ts_ModelViewMatrix'] = gl.modelViewMatrix);
        on['ts_ModelViewMatrixInverse'] && (uni['ts_ModelViewMatrixInverse'] = modelViewMatrixInverse);
        on['ts_ProjectionMatrix']
            && this.projectionMatrixVersion != gl.projectionMatrixVersion
            && (uni['ts_ProjectionMatrix'] = gl.projectionMatrix);
        projectionMatrixInverse && (uni['ts_ProjectionMatrixInverse'] = projectionMatrixInverse);
        modelViewProjectionMatrix && (uni['ts_ModelViewProjectionMatrix'] = modelViewProjectionMatrix);
        modelViewProjectionMatrix && on['ts_ModelViewProjectionMatrixInverse']
            && (uni['ts_ModelViewProjectionMatrixInverse'] = modelViewProjectionMatrix.inversed());
        on['ts_NormalMatrix']
            && this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            && (uni['ts_NormalMatrix'] = modelViewMatrixInverse.transposed());
        this.uniforms(uni);
        this.projectionMatrixVersion = gl.projectionMatrixVersion;
        this.modelViewMatrixVersion = gl.modelViewMatrixVersion;
        // Create and enable attribute pointers as necessary.
        let minVertexBufferLength = Infinity;
        for (const attribute in vertexBuffers) {
            const buffer = vertexBuffers[attribute];
            assert(buffer.hasBeenCompiled);
            const location = this.attributeLocations[attribute] || gl.getAttribLocation(this.program, attribute);
            if (location == -1 || !buffer.buffer) {
                if (!attribute.startsWith('ts_')) {
                    console.warn(`Vertex buffer ${attribute} was not bound because the attribute is not active.`);
                }
                continue;
            }
            this.attributeLocations[attribute] = location;
            gl.bindBuffer(WGL$2.ARRAY_BUFFER, buffer.buffer);
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, buffer.spacing, WGL$2.FLOAT, false, 0, 0);
            minVertexBufferLength = Math.min(minVertexBufferLength, buffer.count);
        }
        // Disable unused attribute pointers.
        for (const attribute in this.attributeLocations) {
            if (!(attribute in vertexBuffers)) {
                gl.disableVertexAttribArray(this.attributeLocations[attribute]);
            }
        }
        if (NLA_DEBUG) {
            const numAttribs = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
            for (let i = 0; i < numAttribs; ++i) {
                const buffer = gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
                if (!buffer) {
                    const info = gl.getActiveAttrib(this.program, i);
                    if (!this.constantAttributes[info.name]) {
                        console.warn('No buffer is bound to attribute ' + info.name + ' and it was not set with .attributes()');
                    }
                }
                // console.log('name:', info.name, 'type:', info.type, 'size:', info.size)
            }
        }
        // Draw the geometry.
        if (minVertexBufferLength) {
            count = count || (indexBuffer ? indexBuffer.count : minVertexBufferLength);
            assert(DRAW_MODE_CHECKS[mode](count), 'count ' + count + ' doesn\'t fulfill requirement '
                + DRAW_MODE_CHECKS[mode].toString() + ' for mode ' + DRAW_MODE_NAMES[mode]);
            if (indexBuffer) {
                assert(indexBuffer.hasBeenCompiled);
                assert(minVertexBufferLength > indexBuffer.maxValue);
                assert(count % indexBuffer.spacing == 0);
                assert(start % indexBuffer.spacing == 0);
                if (start + count > indexBuffer.count) {
                    throw new Error('Buffer not long enough for passed parameters start/length/buffer length' + ' ' + start + ' ' + count + ' ' + indexBuffer.count);
                }
                gl.bindBuffer(WGL$2.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
                // start parameter has to be multiple of sizeof(WGL.UNSIGNED_SHORT)
                gl.drawElements(mode, count, WGL$2.UNSIGNED_SHORT, 2 * start);
            }
            else {
                if (start + count > minVertexBufferLength) {
                    throw new Error('invalid');
                }
                gl.drawArrays(mode, start, count);
            }
            gl.drawCallCount++;
        }
        return this;
    }
}

class Texture {
    /**
     * Provides a simple wrapper around WebGL textures that supports render-to-texture.
     *
     * The arguments `width` and `height` give the size of the texture in texels.
     * WebGL texture dimensions must be powers of two unless `filter` is set to
     * either `WGL.NEAREST` or `WGL.LINEAR` and `wrap` is set to `WGL.CLAMP_TO_EDGE`
     * (which they are by default).
     *
     * Texture parameters can be passed in via the `options` argument.
     * Example usage:
     *
     *      let tex = new GL.Texture(256, 256, {
         *       magFilter: WGL.NEAREST,
         *       minFilter: WGL.LINEAR,
         *
         *       wrapS: WGL.REPEAT,
         *       wrapT: WGL.REPEAT,
         *
         *       format: WGL.RGB, // Defaults to WGL.RGBA
         *       type: WGL.FLOAT // Defaults to WGL.UNSIGNED_BYTE
         *     })
     *
     */
    constructor(width, height, options = {}, gl = currentGL()) {
        this.gl = gl;
        this.width = width;
        this.height = height;
        this.format = options.format || gl.RGBA;
        this.internalFormat = options.internalFormat || gl.RGBA;
        this.type = options.type || gl.UNSIGNED_BYTE;
        const magFilter = options.filter || options.magFilter || gl.LINEAR;
        const minFilter = options.filter || options.minFilter || gl.LINEAR;
        if (this.type === gl.FLOAT) {
            if (gl.version != 2 && !gl.getExtension('OES_texture_float')) {
                throw new Error('OES_texture_float is required but not supported');
            }
            if ((minFilter !== gl.NEAREST || magFilter !== gl.NEAREST) && !gl.getExtension('OES_texture_float_linear')) {
                throw new Error('OES_texture_float_linear is required but not supported');
            }
        }
        else if (this.type === gl.HALF_FLOAT_OES) {
            if (!gl.getExtension('OES_texture_half_float')) {
                throw new Error('OES_texture_half_float is required but not supported');
            }
            if ((minFilter !== gl.NEAREST || magFilter !== gl.NEAREST) && !gl.getExtension('OES_texture_half_float_linear')) {
                throw new Error('OES_texture_half_float_linear is required but not supported');
            }
        }
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrap || options.wrapS || gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrap || options.wrapT || gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, width, height, 0, this.format, this.type, options.data);
    }
    setData(data) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.format, this.width, this.height, 0, this.format, this.type, data);
    }
    bind(unit) {
        this.gl.activeTexture((this.gl.TEXTURE0 + unit));
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }
    unbind(unit) {
        this.gl.activeTexture((this.gl.TEXTURE0 + unit));
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
    drawTo(render) {
        const gl = this.gl;
        const prevFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
        if (!this.framebuffer) {
            // create a renderbuffer for the depth component
            const prevRenderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING);
            const depthRenderbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer);
            // DEPTH_COMPONENT16 is the only depth format
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
            gl.bindRenderbuffer(gl.RENDERBUFFER, prevRenderbuffer);
            // create a framebuffer to render to
            this.framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderbuffer);
            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                throw new Error('Rendering to this texture is not supported (incomplete this.framebuffer)');
            }
        }
        else if (prevFramebuffer !== this.framebuffer) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        }
        const prevViewport = gl.getParameter(gl.VIEWPORT);
        gl.viewport(0, 0, this.width, this.height);
        render(gl);
        // restore previous state
        prevFramebuffer !== this.framebuffer && gl.bindFramebuffer(gl.FRAMEBUFFER, prevFramebuffer);
        gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
    }
    swapWith(other) {
        assert(this.gl == other.gl);
        let temp;
        temp = other.texture;
        other.texture = this.texture;
        this.texture = temp;
        temp = other.width;
        other.width = this.width;
        this.width = temp;
        temp = other.height;
        other.height = this.height;
        this.height = temp;
    }
    /**
     * Return a new texture created from `imgElement`, an `<img>` tag.
     */
    static fromImage(imgElement, options = {}, gl = currentGL()) {
        const texture = new Texture(imgElement.width, imgElement.height, options, gl);
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, texture.format, texture.format, texture.type, imgElement);
        }
        catch (e) {
            if (location.protocol == 'file:') {
                throw new Error('imgElement not loaded for security reasons (serve this page over "http://" instead)');
            }
            else {
                throw new Error('imgElement not loaded for security reasons (imgElement must originate from the same ' +
                    'domain as this page or use Cross-Origin Resource Sharing)');
            }
        }
        if (options.minFilter && options.minFilter != gl.NEAREST && options.minFilter != gl.LINEAR) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        return texture;
    }
    /**
     * Returns a checkerboard texture that will switch to the correct texture when it loads.
     */
    static fromURLSwitch(url, options, gl = currentGL()) {
        Texture.checkerBoardCanvas = Texture.checkerBoardCanvas || (function () {
            const c = document.createElement('canvas').getContext('2d');
            if (!c)
                throw new Error('Could not create 2d canvas.');
            c.canvas.width = c.canvas.height = 128;
            for (let y = 0; y < c.canvas.height; y += 16) {
                for (let x = 0; x < c.canvas.width; x += 16) {
                    //noinspection JSBitwiseOperatorUsage
                    c.fillStyle = (x ^ y) & 16 ? '#FFF' : '#DDD';
                    c.fillRect(x, y, 16, 16);
                }
            }
            return c.canvas;
        })();
        const texture = Texture.fromImage(Texture.checkerBoardCanvas, options);
        const image = new Image();
        image.onload = () => Texture.fromImage(image, options, gl).swapWith(texture);
        // error event doesn't return a reason. Most likely a 404.
        image.onerror = () => { throw new Error('Could not load image ' + image.src + '. 404?'); };
        image.src = url;
        return texture;
    }
    static fromURL(url, options, gl = currentGL()) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(Texture.fromImage(image, options, gl));
            image.onerror = () => reject('Could not load image ' + image.src + '. 404?');
            image.src = url;
        });
    }
}

/*
** Copyright (c) 2012 The Khronos Group Inc.
**
** Permission is hereby granted, free of charge, to any person obtaining a
** copy of this software and/or associated documentation files (the
** 'Materials'), to deal in the Materials without restriction, including
** without limitation the rights to use, copy, modify, merge, publish,
** distribute, sublicense, and/or sell copies of the Materials, and to
** permit persons to whom the Materials are furnished to do so, subject to
** the following conditions:
**
** The above copyright notice and this permission notice shall be included
** in all copies or substantial portions of the Materials.
**
** THE MATERIALS ARE PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
** EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
** MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
** IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
** CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
** TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
** MATERIALS OR THE USE OR OTHER DEALINGS IN THE MATERIALS.
*/
// Various functions for helping debug WebGL apps.
/**
 * Wrapped logging function.
 * @param msg Message to log.
 */
function log(msg) {
    if (window.console && window.console.log) {
        window.console.log(msg);
    }
}
/**
 * Wrapped error logging function.
 * @param msg Message to log.
 */
function error(msg) {
    if (window.console && window.console.error) {
        window.console.error(msg);
    }
    else {
        log(msg);
    }
}
/**
 * Which arguments are enums based on the number of arguments to the function.
 * So
 *    'texImage2D': {
 *       9: { 0:true, 2:true, 6:true, 7:true },
 *       6: { 0:true, 2:true, 3:true, 4:true },
 *    },
 *
 * means if there are 9 arguments then 6 and 7 are enums, if there are 6
 * arguments 3 and 4 are enums
 *
 * @type {!Object.<number, !Object.<number, string>}
 */
const glValidEnumContexts = {
    // Generic setters and getters
    'enable': { 1: { 0: true } },
    'disable': { 1: { 0: true } },
    'getParameter': { 1: { 0: true } },
    // Rendering
    'drawArrays': { 3: { 0: true } },
    'drawElements': { 4: { 0: true, 2: true } },
    // Shaders
    'createShader': { 1: { 0: true } },
    'getShaderParameter': { 2: { 1: true } },
    'getProgramParameter': { 2: { 1: true } },
    'getShaderPrecisionFormat': { 2: { 0: true, 1: true } },
    // Vertex attributes
    'getVertexAttrib': { 2: { 1: true } },
    'vertexAttribPointer': { 6: { 2: true } },
    // Textures
    'bindTexture': { 2: { 0: true } },
    'activeTexture': { 1: { 0: true } },
    'getTexParameter': { 2: { 0: true, 1: true } },
    'texParameterf': { 3: { 0: true, 1: true } },
    'texParameteri': { 3: { 0: true, 1: true, 2: true } },
    // texImage2D and texSubImage2D are defined below with WebGL 2 entrypoints
    'copyTexImage2D': { 8: { 0: true, 2: true } },
    'copyTexSubImage2D': { 8: { 0: true } },
    'generateMipmap': { 1: { 0: true } },
    // compressedTexImage2D and compressedTexSubImage2D are defined below with WebGL 2 entrypoints
    // Buffer objects
    'bindBuffer': { 2: { 0: true } },
    // bufferData and bufferSubData are defined below with WebGL 2 entrypoints
    'getBufferParameter': { 2: { 0: true, 1: true } },
    // Renderbuffers and framebuffers
    'pixelStorei': { 2: { 0: true, 1: true } },
    // readPixels is defined below with WebGL 2 entrypoints
    'bindRenderbuffer': { 2: { 0: true } },
    'bindFramebuffer': { 2: { 0: true } },
    'checkFramebufferStatus': { 1: { 0: true } },
    'framebufferRenderbuffer': { 4: { 0: true, 1: true, 2: true } },
    'framebufferTexture2D': { 5: { 0: true, 1: true, 2: true } },
    'getFramebufferAttachmentParameter': { 3: { 0: true, 1: true, 2: true } },
    'getRenderbufferParameter': { 2: { 0: true, 1: true } },
    'renderbufferStorage': { 4: { 0: true, 1: true } },
    // Frame buffer operations (clear, blend, depth test, stencil)
    'clear': { 1: { 0: { 'enumBitwiseOr': ['COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT', 'STENCIL_BUFFER_BIT'] } } },
    'depthFunc': { 1: { 0: true } },
    'blendFunc': { 2: { 0: true, 1: true } },
    'blendFuncSeparate': { 4: { 0: true, 1: true, 2: true, 3: true } },
    'blendEquation': { 1: { 0: true } },
    'blendEquationSeparate': { 2: { 0: true, 1: true } },
    'stencilFunc': { 3: { 0: true } },
    'stencilFuncSeparate': { 4: { 0: true, 1: true } },
    'stencilMaskSeparate': { 2: { 0: true } },
    'stencilOp': { 3: { 0: true, 1: true, 2: true } },
    'stencilOpSeparate': { 4: { 0: true, 1: true, 2: true, 3: true } },
    // Culling
    'cullFace': { 1: { 0: true } },
    'frontFace': { 1: { 0: true } },
    // ANGLE_instanced_arrays extension
    'drawArraysInstancedANGLE': { 4: { 0: true } },
    'drawElementsInstancedANGLE': { 5: { 0: true, 2: true } },
    // EXT_blend_minmax extension
    'blendEquationEXT': { 1: { 0: true } },
    // WebGL 2 Buffer objects
    'bufferData': {
        3: { 0: true, 2: true },
        4: { 0: true, 2: true },
        5: { 0: true, 2: true } // WebGL 2
    },
    'bufferSubData': {
        3: { 0: true },
        4: { 0: true },
        5: { 0: true } // WebGL 2
    },
    'copyBufferSubData': { 5: { 0: true, 1: true } },
    'getBufferSubData': { 3: { 0: true }, 4: { 0: true }, 5: { 0: true } },
    // WebGL 2 Framebuffer objects
    'blitFramebuffer': { 10: { 8: { 'enumBitwiseOr': ['COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT', 'STENCIL_BUFFER_BIT'] }, 9: true } },
    'framebufferTextureLayer': { 5: { 0: true, 1: true } },
    'invalidateFramebuffer': { 2: { 0: true } },
    'invalidateSubFramebuffer': { 6: { 0: true } },
    'readBuffer': { 1: { 0: true } },
    // WebGL 2 Renderbuffer objects
    'getInternalformatParameter': { 3: { 0: true, 1: true, 2: true } },
    'renderbufferStorageMultisample': { 5: { 0: true, 2: true } },
    // WebGL 2 Texture objects
    'texStorage2D': { 5: { 0: true, 2: true } },
    'texStorage3D': { 6: { 0: true, 2: true } },
    'texImage2D': {
        9: { 0: true, 2: true, 6: true, 7: true },
        6: { 0: true, 2: true, 3: true, 4: true },
        10: { 0: true, 2: true, 6: true, 7: true } // WebGL 2
    },
    'texImage3D': {
        10: { 0: true, 2: true, 7: true, 8: true },
        11: { 0: true, 2: true, 7: true, 8: true }
    },
    'texSubImage2D': {
        9: { 0: true, 6: true, 7: true },
        7: { 0: true, 4: true, 5: true },
        10: { 0: true, 6: true, 7: true } // WebGL 2
    },
    'texSubImage3D': {
        11: { 0: true, 8: true, 9: true },
        12: { 0: true, 8: true, 9: true }
    },
    'copyTexSubImage3D': { 9: { 0: true } },
    'compressedTexImage2D': {
        7: { 0: true, 2: true },
        8: { 0: true, 2: true },
        9: { 0: true, 2: true } // WebGL 2
    },
    'compressedTexImage3D': {
        8: { 0: true, 2: true },
        9: { 0: true, 2: true },
        10: { 0: true, 2: true }
    },
    'compressedTexSubImage2D': {
        8: { 0: true, 6: true },
        9: { 0: true, 6: true },
        10: { 0: true, 6: true } // WebGL 2
    },
    'compressedTexSubImage3D': {
        10: { 0: true, 8: true },
        11: { 0: true, 8: true },
        12: { 0: true, 8: true }
    },
    // WebGL 2 Vertex attribs
    'vertexAttribIPointer': { 5: { 2: true } },
    // WebGL 2 Writing to the drawing buffer
    'drawArraysInstanced': { 4: { 0: true } },
    'drawElementsInstanced': { 5: { 0: true, 2: true } },
    'drawRangeElements': { 6: { 0: true, 4: true } },
    // WebGL 2 Reading back pixels
    'readPixels': {
        7: { 4: true, 5: true },
        8: { 4: true, 5: true } // WebGL 2
    },
    // WebGL 2 Multiple Render Targets
    'clearBufferfv': { 3: { 0: true }, 4: { 0: true } },
    'clearBufferiv': { 3: { 0: true }, 4: { 0: true } },
    'clearBufferuiv': { 3: { 0: true }, 4: { 0: true } },
    'clearBufferfi': { 4: { 0: true } },
    // WebGL 2 Query objects
    'beginQuery': { 2: { 0: true } },
    'endQuery': { 1: { 0: true } },
    'getQuery': { 2: { 0: true, 1: true } },
    'getQueryParameter': { 2: { 1: true } },
    // WebGL 2 Sampler objects
    'samplerParameteri': { 3: { 1: true, 2: true } },
    'samplerParameterf': { 3: { 1: true } },
    'getSamplerParameter': { 2: { 1: true } },
    // WebGL 2 Sync objects
    'fenceSync': { 2: { 0: true, 1: { 'enumBitwiseOr': [] } } },
    'clientWaitSync': { 3: { 1: { 'enumBitwiseOr': ['SYNC_FLUSH_COMMANDS_BIT'] } } },
    'waitSync': { 3: { 1: { 'enumBitwiseOr': [] } } },
    'getSyncParameter': { 2: { 1: true } },
    // WebGL 2 Transform Feedback
    'bindTransformFeedback': { 2: { 0: true } },
    'beginTransformFeedback': { 1: { 0: true } },
    'transformFeedbackVaryings': { 3: { 2: true } },
    // WebGL2 Uniform Buffer Objects and Transform Feedback Buffers
    'bindBufferBase': { 3: { 0: true } },
    'bindBufferRange': { 5: { 0: true } },
    'getIndexedParameter': { 2: { 0: true } },
    'getActiveUniforms': { 3: { 2: true } },
    'getActiveUniformBlockParameter': { 3: { 2: true } }
};
/**
 * Map of numbers to names.
 * @type {Object}
 */
let glEnums = null;
/**
 * Map of names to numbers.
 * @type {Object}
 */
let enumStringToValue = null;
/**
 * Initializes this module. Safe to call more than once.
 * @param ctx A WebGL context. If
 *    you have more than one context it doesn't matter which one
 *    you pass in, it is only used to pull out constants.
 */
function init() {
    if (null === glEnums) {
        glEnums = {};
        enumStringToValue = {};
        const c = window.WebGL2RenderingContext || window.WebGLRenderingContext;
        if (!c)
            throw new Error('Neither WebGL2RenderingContext nor WebGLRenderingContext exists on window.');
        for (const propertyName in c) {
            const prop = c[propertyName];
            if ('number' === typeof prop) {
                glEnums[prop] = propertyName;
                enumStringToValue[propertyName] = prop;
            }
        }
    }
}
/**
 * Returns true or false if value matches any WebGL enum
 * @param value Value to check if it might be an enum.
 * @return True if value matches one of the WebGL defined enums
 */

/**
 * Gets an string version of an WebGL enum.
 *
 * Example:
 *   var str = WebGLDebugUtil.glEnumToString(ctx.getError())
 *
 * @param value Value to return an enum for
 * @return The string version of the enum.
 */
function glEnumToString(value) {
    init();
    var name = glEnums[value];
    return (name !== undefined) ? ('gl.' + name) :
        ('/*UNKNOWN WebGL ENUM*/ 0x' + value.toString(16) + '');
}
/**
 * Converts the argument of a WebGL function to a string.
 * Attempts to convert enum arguments to strings.
 *
 * Example:
 *   WebGLDebugUtil.init(ctx)
 *   var str = WebGLDebugUtil.glFunctionArgToString('bindTexture', 2, 0, gl.TEXTURE_2D)
 *
 * would return 'TEXTURE_2D'
 *
 * @param functionName the name of the WebGL function.
 * @param numArgs the number of arguments passed to the function.
 * @param argumentIndex the index of the argument.
 * @param value The value of the argument.
 * @return The value as a string.
 */
function glFunctionArgToString(functionName, numArgs, argumentIndex, value) {
    const funcInfo = glValidEnumContexts[functionName];
    if (funcInfo !== undefined) {
        const funcOverloadInfo = funcInfo[numArgs];
        if (funcOverloadInfo !== undefined) {
            const argInfo = funcOverloadInfo[argumentIndex];
            if (argInfo) {
                if (typeof argInfo === 'object') {
                    const enums = argInfo.enumBitwiseOr;
                    const orEnums = [];
                    let orResult = 0;
                    for (let i = 0; i < enums.length; ++i) {
                        const enumValue = enumStringToValue[enums[i]];
                        if ((value & enumValue) !== 0) {
                            orResult |= enumValue;
                            orEnums.push(glEnumToString(enumValue));
                        }
                    }
                    if (orResult === value) {
                        return orEnums.join(' | ');
                    }
                    else {
                        return glEnumToString(value);
                    }
                }
                else {
                    return glEnumToString(value);
                }
            }
        }
    }
    if (value === null) {
        return 'null';
    }
    else if (value === undefined) {
        return 'undefined';
    }
    else {
        return value.toString();
    }
}
/**
 * Converts the arguments of a WebGL function to a string.
 * Attempts to convert enum arguments to strings.
 *
 * @param functionName the name of the WebGL function.
 * @param args The arguments.
 * @return The arguments as a string.
 */

function makePropertyWrapper(wrapper, original, propertyName) {
    //log('wrap prop: ' + propertyName)
    wrapper.__defineGetter__(propertyName, function () {
        return original[propertyName];
    });
    // TODO(gmane): this needs to handle properties that take more than
    // one value?
    wrapper.__defineSetter__(propertyName, function (value) {
        //log('set: ' + propertyName)
        original[propertyName] = value;
    });
}
/**
 * Given a WebGL context returns a wrapped context that calls
 * gl.getError after every command and calls a function if the
 * result is not NO_ERROR.
 *
 * You can supply your own function if you want. For example, if you'd like
 * an exception thrown on any GL error you could do this
 *
 *    function throwOnGLError(err, funcName, args) {
 *      throw new Error(WebGLDebugUtils.glEnumToString(err) +
 *            ' was caused by call to ' + funcName)
 *    }
 *
 *    ctx = WebGLDebugUtils.makeDebugContext(
 *        canvas.getContext('webgl'), throwOnGLError)
 *
 * @param ctx The webgl context to wrap.
 * @param opt_onErrorFunc The function
 *     to call when gl.getError returns an error. If not specified the default
 *     function calls console.log with a message.
 * @param opt_onFunc The
 *     function to call when each webgl function is called. You
 *     can use this to log all calls for example.
 * @param opt_err_ctx The webgl context
 *        to call getError on if different than ctx.
 */
function makeDebugContext(ctx, opt_onErrorFunc, opt_onFunc, opt_err_ctx = ctx) {
    init();
    opt_onErrorFunc = opt_onErrorFunc || function (err, functionName, args) {
        // apparently we can't do args.join(',')
        var argStr = '';
        var numArgs = args.length;
        for (let i = 0; i < numArgs; ++i) {
            argStr += ((i == 0) ? '' : ', ') +
                glFunctionArgToString(functionName, numArgs, i, args[i]);
        }
        error('WebGL error ' + glEnumToString(err) + ' in ' + functionName +
            '(' + argStr + ')');
    };
    // Holds booleans for each GL error so after we get the error ourselves
    // we can still return it to the client app.
    const glErrorShadow = {};
    // Makes a function that calls a WebGL function and then calls getError.
    function makeErrorWrapper(ctx, functionName) {
        return function (...args) {
            if (opt_onFunc) {
                opt_onFunc(functionName, args);
            }
            const result = ctx[functionName].apply(ctx, args);
            const err = opt_err_ctx.getError();
            if (err != 0) {
                glErrorShadow[err] = true;
                opt_onErrorFunc(err, functionName, args);
            }
            return result;
        };
    }
    // Make a an object that has a copy of every property of the WebGL context
    // but wraps all functions.
    const wrapper = {};
    for (let propertyName in ctx) {
        const prop = ctx[propertyName];
        if ('function' === typeof prop) {
            if (propertyName != 'getExtension') {
                wrapper[propertyName] = makeErrorWrapper(ctx, propertyName);
            }
            else {
                let wrapped = makeErrorWrapper(ctx, propertyName);
                wrapper[propertyName] = function () {
                    const result = wrapped.apply(ctx, arguments);
                    if (!result) {
                        return null;
                    }
                    return makeDebugContext(result, opt_onErrorFunc, opt_onFunc, opt_err_ctx);
                };
            }
        }
        else {
            makePropertyWrapper(wrapper, ctx, propertyName);
        }
    }
    // Override the getError function with one that returns our saved results.
    wrapper.getError = function () {
        for (const err in glErrorShadow) {
            if (glErrorShadow.hasOwnProperty(err)) {
                if (glErrorShadow[err]) {
                    glErrorShadow[err] = false;
                    return parseInt(err);
                }
            }
        }
        return ctx.NO_ERROR;
    };
    return wrapper;
}
function isWebGL2RenderingContext(o) {
    return !!o.createTransformFeedback;
}
/**
 * Resets a context to the initial state.
 * @param ctx The webgl context to
 *     reset.
 */

/**
 * Given a canvas element returns a wrapped canvas element that will
 * simulate lost context. The canvas returned adds the following functions.
 *
 * loseContext:
 *   simulates a lost context event.
 *
 * restoreContext:
 *   simulates the context being restored.
 *
 * lostContextInNCalls:
 *   loses the context after N gl calls.
 *
 * getNumCalls:
 *   tells you how many gl calls there have been so far.
 *
 * setRestoreTimeout:
 *   sets the number of milliseconds until the context is restored
 *   after it has been lost. Defaults to 0. Pass -1 to prevent
 *   automatic restoring.
 *
 * @param canvas The canvas element to wrap.
 */

/**
 * There's only one constant, use it for default values. Use chroma-js or similar for actual colors.
 */

function currentGL() {
    return TSGLContextBase.gl;
}

class TSGLContextBase {
    constructor(gl, immediate = {
        mesh: new Mesh()
            .addVertexBuffer('coords', 'ts_TexCoord')
            .addVertexBuffer('colors', 'ts_Color'),
        mode: -1,
        coord: [0, 0],
        color: [1, 1, 1, 1],
        pointSize: 1,
        shader: Shader.create(`
			attribute vec4 ts_Color;
			attribute vec4 ts_Vertex;
			uniform mat4 ts_ModelViewProjectionMatrix;
			attribute vec2 ts_TexCoord;
            uniform float pointSize;
            varying vec4 color;
            varying vec2 coord;
            void main() {
                color = ts_Color;
                coord = ts_TexCoord;
                gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
                gl_PointSize = pointSize;
            }
		`, `
			precision highp float;
            uniform sampler2D texture;
            uniform float pointSize;
            // uniform bool useTexture;
            varying vec4 color;
            varying vec2 coord;
            void main() {
                gl_FragColor = color;
                // if (useTexture) gl_FragColor *= texture2D(texture, coord.xy);
            }
        `, gl),
    }) {
        this.immediate = immediate;
        this.modelViewMatrix = M4.identity();
        this.projectionMatrix = M4.identity();
        this.tempMatrix = new M4();
        this.resultMatrix = new M4();
        this.modelViewStack = [];
        this.projectionStack = [];
        this.drawCallCount = 0;
        this.projectionMatrixVersion = 0;
        this.modelViewMatrixVersion = 0;
        this.matrixMode(TSGLContextBase.MODELVIEW);
    }
    /// Implement the OpenGL modelview and projection matrix stacks, along with some other useful GLU matrix functions.
    matrixMode(mode) {
        switch (mode) {
            case this.MODELVIEW:
                this.currentMatrixName = 'modelViewMatrix';
                this.stack = this.modelViewStack;
                break;
            case this.PROJECTION:
                this.currentMatrixName = 'projectionMatrix';
                this.stack = this.projectionStack;
                break;
            default:
                throw new Error('invalid matrix mode ' + mode);
        }
    }
    loadIdentity() {
        M4.identity(this[this.currentMatrixName]);
        this.currentMatrixName == 'projectionMatrix' ? this.projectionMatrixVersion++ : this.modelViewMatrixVersion++;
    }
    loadMatrix(m4) {
        M4.copy(m4, this[this.currentMatrixName]);
        this.currentMatrixName == 'projectionMatrix' ? this.projectionMatrixVersion++ : this.modelViewMatrixVersion++;
    }
    multMatrix(m4) {
        M4.multiply(this[this.currentMatrixName], m4, this.resultMatrix);
        const temp = this.resultMatrix;
        this.resultMatrix = this[this.currentMatrixName];
        this[this.currentMatrixName] = temp;
        this.currentMatrixName == 'projectionMatrix' ? this.projectionMatrixVersion++ : this.modelViewMatrixVersion++;
    }
    mirror(plane) {
        this.multMatrix(M4.mirror(plane));
    }
    perspective(fovDegrees, aspect, near, far) {
        this.multMatrix(M4.perspectiveRad(fovDegrees * DEG, aspect, near, far, this.tempMatrix));
    }
    frustum(left, right, bottom, top, near, far) {
        this.multMatrix(M4.frustum(left, right, bottom, top, near, far, this.tempMatrix));
    }
    ortho(left, right, bottom, top, near, far) {
        this.multMatrix(M4.ortho(left, right, bottom, top, near, far, this.tempMatrix));
    }
    scale(...args) {
        this.multMatrix(M4.scale(...args, this.tempMatrix));
    }
    mirroredX() {
        this.multMatrix(M4.mirror(P3ZX));
    }
    translate(x, y, z) {
        if (undefined !== y) {
            this.multMatrix(M4.translate(x, y, z, this.tempMatrix));
        }
        else {
            this.multMatrix(M4.translate(x, this.tempMatrix));
        }
    }
    rotate(angleDegrees, x, y, z) {
        this.multMatrix(M4.rotate(angleDegrees * DEG, { x, y, z }, this.tempMatrix));
    }
    lookAt(eye, center, up) {
        this.multMatrix(M4.lookAt(eye, center, up, this.tempMatrix));
    }
    pushMatrix() {
        this.stack.push(M4.copy(this[this.currentMatrixName]));
    }
    popMatrix() {
        const pop = this.stack.pop();
        assert(undefined !== pop);
        this[this.currentMatrixName] = pop;
        this.currentMatrixName == 'projectionMatrix' ? this.projectionMatrixVersion++ : this.modelViewMatrixVersion++;
    }
    /**
     * World coordinates (WC) to screen/window coordinates matrix
     */
    wcToWindowMatrix() {
        const viewport = this.getParameter(this.VIEWPORT);
        const [x, y, w, h] = viewport;
        const viewportToScreenMatrix = new M4([
            w / 2, 0, 0, x + w / 2,
            h / 2, 0, 0, y + h / 2,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
        return M4.multiplyMultiple(viewportToScreenMatrix, this.projectionMatrix, this.modelViewMatrix);
    }
    /////////// IMMEDIATE MODE
    // ### Immediate mode
    //
    // Provide an implementation of OpenGL's deprecated immediate mode. This is
    // deprecated for a reason: constantly re-specifying the geometry is a bad
    // idea for performance. You should use a `GL.Mesh` instead, which specifies
    // the geometry once and caches it on the graphics card. Still, nothing
    // beats a quick `viewerGL.begin(WGL.POINTS); viewerGL.vertex(1, 2, 3); viewerGL.end();` for
    // debugging. This intentionally doesn't implement fixed-function lighting
    // because it's only meant for quick debugging tasks.
    pointSize(pointSize) {
        this.immediate.shader.uniforms({ pointSize: pointSize });
    }
    begin(mode) {
        if (this.immediate.mode != -1)
            throw new Error('mismatched viewerGL.begin() and viewerGL.end() calls');
        this.immediate.mode = mode;
        this.immediate.mesh.colors = [];
        this.immediate.mesh.coords = [];
        this.immediate.mesh.vertices = [];
    }
    color(...args) {
        this.immediate.color =
            (1 == args.length && Array.isArray(args[0]))
                ? args[0]
                : (1 == args.length && 'number' == typeof args[0])
                    ? hexIntToGLColor(args[0])
                    : (1 == args.length && 'string' == typeof args[0])
                        ? chroma(args[0]).gl()
                        : [args[0], args[1], args[2], args[3] || 0];
    }
    texCoord(...args) {
        this.immediate.coord = V.apply(undefined, args).toArray(2);
    }
    vertex(...args) {
        this.immediate.mesh.colors.push(this.immediate.color);
        this.immediate.mesh.coords.push(this.immediate.coord);
        this.immediate.mesh.vertices.push(V.apply(undefined, args));
    }
    end() {
        if (this.immediate.mode == -1)
            throw new Error('mismatched viewerGL.begin() and viewerGL.end() calls');
        this.immediate.mesh.compile();
        this.immediate.shader.uniforms({
            useTexture: !!TSGLContextBase.gl.getParameter(this.TEXTURE_BINDING_2D),
        }).drawBuffers(this.immediate.mesh.vertexBuffers, undefined, this.immediate.mode);
        this.immediate.mode = -1;
    }
    makeCurrent() {
        TSGLContextBase.gl = this;
    }
    /**
     * Starts an animation loop.
     */
    animate(callback) {
        const requestAnimationFrame = window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            function (callback) {
                setTimeout(() => callback(performance.now()), 1000 / 60);
            };
        let time$$1 = performance.now(), keepUpdating = true;
        const update = (now) => {
            if (keepUpdating) {
                callback.call(this, now, now - time$$1);
                time$$1 = now;
                requestAnimationFrame(update);
            }
        };
        requestAnimationFrame(update);
        return () => { keepUpdating = false; };
    }
    /**
     * Provide an easy way to get a fullscreen app running, including an
     * automatic 3D perspective projection matrix by default. This should be
     * called once.
     *
     * Just fullscreen, no automatic camera:
     *
     *     viewerGL.fullscreen({ camera: false })
     *
     * Adjusting field of view, near plane distance, and far plane distance:
     *
     *     viewerGL.fullscreen({ fov: 45, near: 0.1, far: 1000 })
     *
     * Adding padding from the edge of the window:
     *
     *     viewerGL.fullscreen({ paddingLeft: 250, paddingBottom: 60 })
     */
    fullscreen(options = {}) {
        const top = options.paddingTop || 0;
        const left = options.paddingLeft || 0;
        const right = options.paddingRight || 0;
        const bottom = options.paddingBottom || 0;
        if (!document.body) {
            throw new Error('document.body doesn\'t exist yet (call viewerGL.fullscreen() from ' +
                'window.onload() or from inside the <body> tag)');
        }
        document.body.appendChild(this.canvas);
        document.body.style.overflow = 'hidden';
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = left + 'px';
        this.canvas.style.top = top + 'px';
        this.canvas.style.width = window.innerWidth - left - right + 'px';
        this.canvas.style.bottom = window.innerHeight - top - bottom + 'px';
        const gl = this;
        function windowOnResize() {
            gl.canvas.width = (window.innerWidth - left - right) * window.devicePixelRatio;
            gl.canvas.height = (window.innerHeight - top - bottom) * window.devicePixelRatio;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            if (options.camera) {
                gl.matrixMode(TSGLContextBase.PROJECTION);
                gl.loadIdentity();
                gl.perspective(options.fov || 45, gl.canvas.width / gl.canvas.height, options.near || 0.1, options.far || 1000);
                gl.matrixMode(TSGLContextBase.MODELVIEW);
            }
        }
        window.addEventListener('resize', windowOnResize);
        windowOnResize();
        return this;
    }
    viewportFill() {
        this.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    static create(options = {}) {
        const canvas = options.canvas || document.createElement('canvas');
        if (!options.canvas) {
            canvas.width = 800;
            canvas.height = 600;
        }
        if (!('alpha' in options))
            options.alpha = false;
        let newGL = undefined;
        try {
            newGL = canvas.getContext('webgl2', options);
            newGL && (newGL.version = 2);
            if (!newGL) {
                newGL = (canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options));
                newGL && (newGL.version = 1);
            }
            console.log('getting context');
        }
        catch (e) {
            console.log(e, 'Failed to get context');
        }
        if (!newGL)
            throw new Error('WebGL not supported');
        if (options.throwOnError) {
            newGL = makeDebugContext(newGL, (err, funcName) => {
                throw new Error(glEnumToString(err) + ' was caused by ' + funcName);
            });
        }
        TSGLContextBase.gl = newGL;
        addOwnProperties(newGL, TSGLContextBase.prototype);
        addOwnProperties(newGL, new TSGLContextBase(newGL));
        //addEventListeners(newGL)
        return newGL;
    }
}
TSGLContextBase.MODELVIEW = 0;
TSGLContextBase.PROJECTION = 1;
TSGLContextBase.HALF_FLOAT_OES = 0x8D61;

(function (TSGLContext) {
    /**
     * `create()` creates a new WebGL context and augments it with more methods. The alpha channel is disabled
     * by default because it usually causes unintended transparencies in the canvas.
     */
    TSGLContext.create = TSGLContextBase.create;
})(exports.TSGLContext || (exports.TSGLContext = {}));
// enum WGL_ERROR {
// 	NO_ERROR = WGL.NO_ERROR,
// 	INVALID_ENUM = WGL.INVALID_ENUM,
// 	INVALID_VALUE = WGL.INVALID_VALUE,
// 	INVALID_OPERATION = WGL.INVALID_OPERATION,
// 	INVALID_FRAMEBUFFER_OPERATION = WGL.INVALID_FRAMEBUFFER_OPERATION,
// 	OUT_OF_MEMORY = WGL.OUT_OF_MEMORY,
// 	CONTEXT_LOST_WEBGL = WGL.CONTEXT_LOST_WEBGL,
// }
TSGLContextBase.prototype.MODELVIEW = TSGLContextBase.MODELVIEW;
TSGLContextBase.prototype.PROJECTION = TSGLContextBase.PROJECTION;
TSGLContextBase.prototype.HALF_FLOAT_OES = TSGLContextBase.HALF_FLOAT_OES;
/**
 *
 * Push two triangles:
 * c - d
 * | \ |
 * a - b
 */
function pushQuad(triangles, flipped, a, b, c, d) {
    if (flipped) {
        triangles.push(a, c, b, b, c, d);
    }
    else {
        triangles.push(a, b, c, b, d, c);
    }
}
function hexIntToGLColor(color) {
    return [(color >> 16) / 255.0, ((color >> 8) & 0xff) / 255.0, (color & 0xff) / 255.0, 1.0];
}

var posNormalColorVS = "precision mediump float;uniform mat4 ts_ModelViewProjectionMatrix;uniform mat3 ts_NormalMatrix;attribute vec3 ts_Normal;attribute vec4 ts_Vertex;attribute vec4 ts_Color;varying vec3 normal;varying vec4 color;void main(){gl_Position=ts_ModelViewProjectionMatrix*ts_Vertex;normal=ts_NormalMatrix*ts_Normal;color=ts_Color;}";

/// <reference path="../types.d.ts" />
/**
 * Move camera using mouse.
 */
function camera(gl) {
    let yRot = -10 * DEG;
    let zRot = 90 * DEG;
    let camera = new V3(0, -5, 1);
    const mesh = Mesh.sphere().computeWireframeFromFlatTriangles().compile();
    const shader = Shader.create(posNormalColorVS, `
precision mediump float;
uniform float brightness;
varying vec3 normal;
void main() {
	gl_FragColor = vec4(brightness * (normal * 0.5 + 0.5), 1.0);
}
`);
    let lastPos = V3.O;
    // scene rotation
    gl.canvas.onmousemove = function (e) {
        const pagePos = V(e.pageX, e.pageY);
        const delta = lastPos.to(pagePos);
        if (e.buttons & 1) {
            zRot -= delta.x * 0.25 * DEG;
            yRot = clamp(yRot - delta.y * 0.25 * DEG, -85 * DEG, 85 * DEG);
        }
        lastPos = pagePos;
    };
    gl.canvas.contentEditable = 'true';
    const keys = {};
    gl.canvas.onkeydown = function (e) {
        keys[e.code] = true;
    };
    gl.canvas.onkeyup = function (e) {
        keys[e.code] = false;
    };
    gl.clearColor(1, 1, 1, 1);
    // setup camera
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 1);
    gl.clearColor(0.8, 0.8, 0.8, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.vertexAttrib1f(0, 42);
    gl.enableVertexAttribArray(0);
    console.log(gl.getVertexAttrib(0, gl.CURRENT_VERTEX_ATTRIB));
    console.log(gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_ENABLED));
    const gl2 = gl;
    const vao = gl2.createVertexArray();
    gl2.bindVertexArray(vao);
    gl2.vertexAttrib1f(0, 31);
    console.log(gl.getVertexAttrib(0, gl.CURRENT_VERTEX_ATTRIB));
    console.log(gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_ENABLED));
    gl2.bindVertexArray(null);
    console.log(gl.getVertexAttrib(0, gl.CURRENT_VERTEX_ATTRIB));
    console.log(gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_ENABLED));
    return gl.animate(function (_abs, diff) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.loadIdentity();
        const speed = diff / 1000 * 4;
        // Forward movement
        const forwardMov = +!!(keys.KeyW || keys.ArrowUp) - +!!(keys.KeyS || keys.ArrowDown);
        const forwardV3 = V3.sphere(zRot, yRot);
        // Sideways movement
        const sideMov = +!!(keys.KeyA || keys.ArrowLeft) - +!!(keys.KeyD || keys.ArrowRight);
        const sideV3 = V3.sphere(zRot + Math.PI / 2, 0);
        const movementV3 = forwardV3.times(forwardMov).plus(sideV3.times(sideMov));
        camera = movementV3.likeO() ? camera : camera.plus(movementV3.toLength(speed));
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.matrixMode(gl.PROJECTION);
        gl.loadIdentity();
        gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000);
        gl.lookAt(camera, camera.plus(forwardV3), V3.Z);
        gl.matrixMode(gl.MODELVIEW);
        gl.loadIdentity();
        gl.rotate(-zRot, 0, 0, 1);
        gl.rotate(-yRot, 0, 1, 0);
        gl.translate(-camera.x, -camera.y, -camera.z);
        shader.uniforms({ brightness: 1 }).attributes({ ts_Color: chroma('red').gl() }).draw(mesh, gl.TRIANGLES);
        shader.uniforms({ brightness: 0 }).draw(mesh, gl.LINES);
    });
}
camera.info = 'LMB-drag to move camera.';

/// <reference path="../types.d.ts" />
/**
 * Draw soft shadows by calculating a light map in multiple passes.
 */
function gpuLightMap(gl) {
    if (!isWebGL2RenderingContext(gl))
        throw new Error('needs WebGL2');
    gl.getExtension('EXT_color_buffer_float');
    // modified version of https://evanw.github.io/lightgl.js/tests/gpulightmap.html
    let angleX = 0;
    let angleY = 0;
    if (gl.version !== 2 && (!gl.getExtension('OES_texture_float') || !gl.getExtension('OES_texture_float_linear'))) {
        document.write('This demo requires the OES_texture_float and OES_texture_float_linear extensions to run');
        throw new Error('not supported');
    }
    const texturePlane = Mesh.plane();
    const textureShader = Shader.create(`
  attribute vec2 ts_TexCoord;
  varying vec2 coord;
  void main() {
    coord = ts_TexCoord;
    gl_Position = vec4(coord * 2.0 - 1.0, 0.0, 1.0);
  }
`, `
precision highp float;
  uniform sampler2D texture;
  varying vec2 coord;
  void main() {
    gl_FragColor = texture2D(texture, coord);
  }
`);
    const depthMap = new Texture(1024, 1024, { format: gl.RGBA });
    const depthShader = Shader.create(`
	uniform mat4 ts_ModelViewProjectionMatrix;
	attribute vec4 ts_Vertex;
	// GL does not make the fragment position in NDC available, (gl_FragCoord is in window coords)
	// so we have an addition varying pos to calculate it ourselves.
  varying vec4 pos;
  void main() {
    gl_Position = pos = ts_ModelViewProjectionMatrix * ts_Vertex;
  }
`, `
precision highp float;
  varying vec4 pos;
  void main() {
    float depth = pos.z / pos.w;
    gl_FragColor = vec4(depth * 0.5 + 0.5);
  }
`);
    const shadowTestShader = Shader.create(`
  uniform mat4 shadowMapMatrix;
  uniform vec3 light;
  attribute vec4 offsetPosition;
  attribute vec3 ts_Normal;
  attribute vec2 ts_TexCoord;
  varying vec4 shadowMapPos; // position inside the shadow map frustrum
  varying vec3 normal;

  void main() {
    normal = ts_Normal;
    shadowMapPos = shadowMapMatrix * offsetPosition;
    gl_Position = vec4(ts_TexCoord * 2.0 - 1.0, 0.0, 1.0);
  }
`, `
	precision highp float;
  uniform float sampleCount;
  uniform sampler2D depthMap;
  uniform vec3 light;
  varying vec4 shadowMapPos;
  varying vec3 normal;
  uniform vec4 res;

  void main() {
    /* Run shadow test */
    const float bias = -0.0025;
    float depth = texture2D(depthMap, shadowMapPos.xy / shadowMapPos.w * 0.5 + 0.5).r;
    float shadow = (bias + shadowMapPos.z / shadowMapPos.w * 0.5 + 0.5 - depth > 0.0) ? 1.0 : 0.0;

    /* Points on polygons facing away from the light are always in shadow */
    float color = dot(normal, light) > 0.0 ? 1.0 - shadow : 0.0;
    gl_FragColor = vec4(vec3(color), 1.0 / (1.0 + sampleCount));
  }
`);
    /**
     * Wrapper for a Mesh made only of quads (two triangles in a "square") and
     * an associated automatically UV-unwrapped texture.
     */
    class QuadMesh {
        constructor() {
            this.mesh = new Mesh()
                .addVertexBuffer('normals', 'ts_Normal')
                .addIndexBuffer('TRIANGLES')
                .addVertexBuffer('coords', 'ts_TexCoord')
                .addVertexBuffer('offsetCoords', 'offsetCoord')
                .addVertexBuffer('offsetPositions', 'offsetPosition');
            this.index = 0;
            this.sampleCount = 0;
            this.countedQuads = 0;
        }
        // Add a quad given its four vertices and allocate space for it in the lightmap
        addQuad(a, b, c, d) {
            // Add vertices
            const vl = this.mesh.vertices.length;
            this.mesh.vertices.push(a, b, c, d);
            // Add normal
            const normal = V3.normalOnPoints(a, b, c).unit();
            this.mesh.normals.push(normal, normal, normal, normal);
            // A quad is two triangles
            pushQuad(this.mesh.TRIANGLES, false, vl, vl + 1, vl + 2, vl + 3);
            this.countedQuads++;
        }
        addDoubleQuad(a, b, c, d) {
            // Need a separate lightmap for each side of the quad
            this.addQuad(a, b, c, d);
            this.addQuad(a, c, b, d);
        }
        addCube(m4) {
            [
                [V3.O, V3.Y, V3.X, V3.XY],
                [V3.Z, new V3(1, 0, 1), new V3(0, 1, 1), V3.XYZ],
                [V3.O, V3.X, V3.Z, new V3(1, 0, 1)],
                [V3.X, new V3(1, 1, 0), new V3(1, 0, 1), new V3(1, 1, 1)],
                [new V3(1, 1, 0), V3.Y, V3.XYZ, new V3(0, 1, 1)],
                [V3.Y, V3.O, new V3(0, 1, 1), V3.Z],
            ].forEach(vs => this.addQuad(...(m4 ? m4.transformedPoints(vs) : vs)));
        }
        compile(texelsPerSide) {
            const numQuads = this.mesh.vertices.length / 4;
            if (numQuads % 1 != 0)
                throw new Error('not quads');
            const quadsPerSide = Math.ceil(Math.sqrt(numQuads));
            for (let i = 0; i < numQuads; i++) {
                // Compute location of texture cell
                const s = i % quadsPerSide;
                const t = (i - s) / quadsPerSide;
                // Coordinates that are on the edge of border texels (to avoid cracks when rendering)
                const rs0 = s / quadsPerSide;
                const rt0 = t / quadsPerSide;
                const rs1 = (s + 1) / quadsPerSide;
                const rt1 = (t + 1) / quadsPerSide;
                this.mesh.coords.push([rs0, rt0], [rs1, rt0], [rs0, rt1], [rs1, rt1]);
                const half = 1 / texelsPerSide;
                const [a, b, c, d] = this.mesh.vertices.slice(i * 4, (i + 1) * 4);
                // Add fake positions
                function bilerp(x, y) {
                    return a.times((1 - x) * (1 - y)).plus(b.times(x * (1 - y)))
                        .plus(c.times((1 - x) * y)).plus(d.times(x * y));
                }
                this.mesh.offsetPositions.push(bilerp(-half, -half), bilerp(1 + half, -half), bilerp(-half, 1 + half), bilerp(1 + half, 1 + half));
                const s0 = (s + half) / quadsPerSide;
                const t0 = (t + half) / quadsPerSide;
                const s1 = (s + 1 - half) / quadsPerSide;
                const t1 = (t + 1 - half) / quadsPerSide;
                this.mesh.offsetCoords.push([s0, t0], [s1, t0], [s0, t1], [s1, t1]);
            }
            // Finalize mesh
            this.mesh.compile();
            this.bounds = this.mesh.getBoundingSphere();
            // Create textures
            const textureSize = quadsPerSide * texelsPerSide;
            console.log('texture size: ' + textureSize);
            this.lightmapTexture = new Texture(textureSize, textureSize, { internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT, filter: gl.LINEAR });
        }
        drawShadow(dir) {
            // Construct a camera looking from the light toward the object
            const r = this.bounds.radius, c = this.bounds.center;
            gl.matrixMode(gl.PROJECTION);
            gl.pushMatrix();
            gl.loadIdentity();
            gl.ortho(-r, r, -r, r, -r, r);
            gl.matrixMode(gl.MODELVIEW);
            gl.pushMatrix();
            gl.loadIdentity();
            const at = c.minus(dir);
            const useY = (dir.maxElement() != dir.z);
            const up = new V3(+!useY, 0, +useY).cross(dir);
            gl.lookAt(c, at, up);
            // Render the object viewed from the light using a shader that returns the fragment depth
            const mesh = this.mesh;
            const shadowMapMatrix = gl.projectionMatrix.times(gl.modelViewMatrix);
            depthMap.drawTo(function (gl) {
                gl.enable(gl.DEPTH_TEST);
                gl.clearColor(1, 1, 1, 1);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                depthShader.draw(mesh);
            });
            //Run the shadow test for each texel in the lightmap and
            //accumulate that onto the existing lightmap contents
            const sampleCount = this.sampleCount++;
            depthMap.bind(0);
            this.lightmapTexture.drawTo(function (gl) {
                gl.enable(gl.BLEND);
                gl.disable(gl.CULL_FACE);
                gl.disable(gl.DEPTH_TEST);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                shadowTestShader.uniforms({
                    shadowMapMatrix: shadowMapMatrix,
                    sampleCount: sampleCount,
                    light: dir,
                }).draw(mesh);
                gl.disable(gl.BLEND);
            });
            depthMap.unbind(0);
            // Reset the transform
            gl.matrixMode(gl.PROJECTION);
            gl.popMatrix();
            gl.matrixMode(gl.MODELVIEW);
            gl.popMatrix();
        }
    }
    // Make a mesh of quads
    const numArcQuads = 32;
    const groundTilesPerSide = 5;
    const quadMesh = new QuadMesh();
    // Arc of randomly oriented quads
    quadMesh.addCube(M4.multiplyMultiple(M4.translate(0, 0, -0.2), M4.rotateAB(V3.XYZ, V3.Z)));
    for (let i = 0; i < numArcQuads; i++) {
        const r = 0.4;
        const t = i / numArcQuads * TAU;
        const center = V(0, 0, Math.sqrt(3) / 2 - 0.2).plus(V(0, 1.5, 0).times(Math.cos(t))).plus(V(1, 0, -1).toLength(1.5).times(Math.sin(t)));
        // const center = V3.sphere(0, (i + Math.random()) / numArcQuads * Math.PI)
        const a = V3.randomUnit();
        const b = V3.randomUnit().cross(a).unit();
        quadMesh.addCube(M4.multiplyMultiple(M4.translate(center), M4.forSys(a, b), M4.scale(r, r, r), M4.translate(-0.5, -0.5, -0.5)));
    }
    // Plane of quads
    for (let x = 0; x < groundTilesPerSide; x++) {
        for (let z = 0; z < groundTilesPerSide; z++) {
            const dx = x - groundTilesPerSide / 2;
            const dz = z - groundTilesPerSide / 2;
            quadMesh.addQuad(new V3(dx, dz, 0), new V3(dx + 1, dz, 0), new V3(dx, dz + 1, 0), new V3(dx + 1, dz + 1, 0));
        }
    }
    quadMesh.compile(128);
    // The mesh will be drawn with texture mapping
    const mesh = quadMesh.mesh;
    const textureMapShader = Shader.create(`
		attribute vec4 ts_Vertex;
		uniform mat4 ts_ModelViewProjectionMatrix;
        attribute vec2 offsetCoord;
        varying vec2 coord;
        void main() {
            coord = offsetCoord;
            gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
        }
`, `
		precision highp float;
        uniform sampler2D texture;
        varying vec2 coord;
        void main() {
            gl_FragColor = texture2D(texture, coord);
        }
`);
    let lastPos = V3.O;
    // scene rotation
    gl.canvas.onmousemove = function (e) {
        const pagePos = V(e.pageX, e.pageY);
        const delta = lastPos.to(pagePos);
        if (e.buttons & 1) {
            angleY += delta.x;
            angleX = clamp(angleX + delta.y, -90, 90);
        }
        lastPos = pagePos;
    };
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    const lightDir = V3.XYZ;
    const ambientFraction = 0.4;
    return gl.animate(function (_abs, _diff) {
        const gl = this;
        gl.enable(gl.CULL_FACE);
        gl.clearColor(0.9, 0.9, 0.9, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // setup camera
        gl.matrixMode(gl.PROJECTION);
        gl.loadIdentity();
        gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000);
        gl.lookAt(V(0, -3, 3), V3.O, V3.Z);
        gl.matrixMode(gl.MODELVIEW);
        gl.loadIdentity();
        gl.rotate(angleX, 1, 0, 0);
        gl.rotate(angleY, 0, 0, 1);
        // Alternate between a shadow from a random point on the sky hemisphere
        // and a random point near the light (creates a soft shadow)
        const dir = Math.random() < ambientFraction
            ? V3.randomUnit()
            : lightDir.plus(V3.randomUnit().times(0.1 * Math.sqrt(Math.random()))).unit();
        quadMesh.drawShadow(dir.z < 0 ? dir.negated() : dir);
        // Draw the mesh with the ambient occlusion so far
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        quadMesh.lightmapTexture.bind(0);
        textureMapShader.draw(mesh);
        // Draw depth map overlay
        gl.disable(gl.CULL_FACE);
        quadMesh.lightmapTexture.bind(0);
        gl.viewport(10, 10, 10 + 256, 10 + 256);
        textureShader.draw(texturePlane);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    });
}
gpuLightMap.info = 'LMB-drag to rotate camera.';

/**
 * OpenGL-style immediate mode.
 */
function immediateMode(gl) {
    // setup camera
    gl.disable(gl.CULL_FACE);
    gl.matrixMode(gl.PROJECTION);
    gl.loadIdentity();
    gl.perspective(90, gl.canvas.width / gl.canvas.height, 0.0001, 1000000);
    gl.lookAt(V(0, -3, 2), V3.O, V3.Z);
    gl.matrixMode(gl.MODELVIEW);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(1, 1, 1, 0);
    return gl.animate(function (abs, _diff) {
        const angleDeg = abs / 1000 * 45;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.loadIdentity();
        // gl.translate(0, 0, -5)
        gl.rotate(angleDeg, 0, 0, 1);
        gl.color(0.5, 0.5, 0.5);
        gl.lineWidth(1);
        gl.begin(gl.LINES);
        for (let i = -10; i <= 10; i++) {
            gl.vertex(i, -10, 0);
            gl.vertex(i, +10, 0);
            gl.vertex(-10, i, 0);
            gl.vertex(+10, i, 0);
        }
        gl.end();
        gl.pointSize(10);
        gl.begin(gl.POINTS);
        gl.color(1, 0, 0);
        gl.vertex(1, 0, 0);
        gl.color(0, 1, 0);
        gl.vertex(0, 1, 0);
        gl.color(0, 0, 1);
        gl.vertex(0, 0, 1);
        gl.end();
        gl.lineWidth(2);
        gl.begin(gl.LINE_LOOP);
        gl.color('red');
        gl.vertex(1, 0, 0);
        gl.color('green');
        gl.vertex(0, 1, 0);
        gl.color('blue');
        gl.vertex(0, 0, 1);
        gl.end();
        gl.begin(gl.TRIANGLES);
        gl.color(1, 1, 0);
        gl.vertex(0.5, 0.5, 0);
        gl.color(0, 1, 1);
        gl.vertex(0, 0.5, 0.5);
        gl.color(1, 0, 1);
        gl.vertex(0.5, 0, 0.5);
        gl.end();
    });
}

var varyingColorFS = "precision mediump float;varying vec4 color;void main(){gl_FragColor=color;}";

/// <reference path="../types.d.ts" />
// import colorFS from '../shaders/colorFS.glslx'
/**
 * Calculate and render magnetic field lines.
 */
function mag(gl) {
    const cubeMesh = Mesh.cube();
    // simple pos/color
    const shader = Shader.create(posNormalColorVS, varyingColorFS);
    gl.clearColor(1, 1, 1, 1);
    // given a magnetic field created by fieldCharges, calculate the field strength/dir at pos
    function fieldAtPos(fieldCharges, pos) {
        const fieldChargeForces = fieldCharges.map(p => {
            const posToP = pos.to(p.pos);
            const r = posToP.length();
            const partialForceMagnitude = p.charge / r / r;
            const partialForce = posToP.toLength(partialForceMagnitude);
            return partialForce;
        });
        return V3.add(...fieldChargeForces);
    }
    /**
     * Iteratively calculate a field line
     * @param fieldCharges charge defining magnetic field
     * @param bounds within which to calc field lines
     * @param start start point of field line
     * @param dir step size to take. negative to plot field line in reverse
     */
    function* qPath(fieldCharges, bounds, start, dir) {
        let pos = start, f, i = 0;
        while (true) {
            f = fieldAtPos(fieldCharges, pos);
            pos = pos.plus(f.toLength(dir));
            if (!bounds.containsPoint(pos) // pos outside bounds
                || i++ > 1000 // to many iterations
                || f.squared() > 2.5e7 // force to high, i.e. to close to charge
            )
                break;
            yield pos;
        }
    }
    /**
     * Returns array of PointCharges to model a bar magnet.
     * @param count
     */
    function barMagnet(count = 4) {
        return arrayFromFunction(count * count, i => {
            const x = i % count;
            const y = (i / count) | 0;
            return { pos: V((0.5 + x) / count, (0.5 + y) / count, 0), charge: (+(x < count / 2) || -1) };
        });
    }
    const enabledBarMagnets = [true, true, true, true, true];
    const barMagnetMatrices = [
        M4.scale(0.2, 0.1, 0.02).rotateZ(20 * DEG).translate(0.5, 0.5, 0.1),
        M4.scale(0.1, 0.05, 0.02).rotateZ(60 * DEG).translate(0.2, 0.1),
        M4.scale(0.2, 0.02, 0.02).rotateY(-100 * DEG).rotateZ(120 * DEG).translate(0.2, 0.8),
        M4.scale(0.2, 0.1, 0.02).rotateX(90 * DEG).rotateZ(270 * DEG).translate(0.9, 0.4, 0.1),
        M4.scale(0.2, 0.1, 0.02).rotateX(90 * DEG).rotateZ(270 * DEG).translate(0.9, 0.9, 0.1),
    ];
    const bounds = new AABB(V3.O, V(1, 1, 0.3));
    let linesDensity = 10;
    const linesMesh = new Mesh().addIndexBuffer('LINES');
    function calculateFieldLines() {
        const ps = [];
        barMagnetMatrices.forEach((mat, index) => enabledBarMagnets[index] && ps.push(...barMagnet(6).map(p => {
            p.pos = mat.transformPoint(p.pos);
            return p;
        })));
        linesMesh.LINES.clear();
        linesMesh.vertices.clear();
        console.log('generation took (ms): ' + time(() => {
            for (const [x, y, z] of grid3d(linesDensity, linesDensity, Math.ceil(0.4 * linesDensity))) {
                const start = V(x, y, z * bounds.max.z);
                linesMesh.vertices.push(start);
                const STEP = 0.01;
                for (const p of qPath(ps, bounds, start, STEP)) {
                    linesMesh.vertices.push(p);
                    linesMesh.LINES.push(linesMesh.vertices.length - 2, linesMesh.vertices.length - 1);
                }
                linesMesh.vertices.push(start);
                for (const p of qPath(ps, bounds, start, -STEP)) {
                    linesMesh.vertices.push(p);
                    linesMesh.LINES.push(linesMesh.vertices.length - 2, linesMesh.vertices.length - 1);
                }
            }
        }));
        linesMesh.compile();
    }
    calculateFieldLines();
    const vectorFieldMesh = new Mesh();
    const fieldLinesXSide = 64;
    const vectorFieldVectorLength = 2 * 0.9 / fieldLinesXSide;
    vectorFieldMesh.vertices = ballGrid(fieldLinesXSide).flatMap(p => [new V3(p.x, p.y, -vectorFieldVectorLength / 2), new V3(p.x, p.y, vectorFieldVectorLength / 2)]);
    // vectorFieldMesh.vertices = arrayFromFunction(fieldLinesXSide * fieldLinesXSide * 2, i => {
    //     const startOrEnd = i % 2
    //     const x = ((i / 2) | 0) % fieldLinesXSide
    //     const y = ((i / 2 / fieldLinesXSide) | 0) % fieldLinesXSide
    //     return new V3(x / fieldLinesXSide, y / fieldLinesXSide, (startOrEnd || -1) * 0.01)
    // })
    vectorFieldMesh.compile();
    // setup camera
    gl.matrixMode(gl.PROJECTION);
    gl.loadIdentity();
    gl.perspective(45, gl.canvas.width / gl.canvas.height, 0.1, 1000);
    gl.lookAt(V(0.5, 2, 1), V(0.5, 0.5), V3.Z);
    gl.matrixMode(gl.MODELVIEW);
    gl.clearColor(1, 1, 1, 0);
    gl.enable(gl.DEPTH_TEST);
    // vectorFieldShader.uniforms({
    // 	'ps[0]': ps as any,
    // 	color: chroma('red').gl(),
    // })
    gl.canvas.tabIndex = 0;
    gl.canvas.focus();
    gl.canvas.addEventListener('keypress', e => {
        const index = e.key.charCodeAt(0) - '1'.charCodeAt(0);
        if (0 <= index && index <= 4) {
            enabledBarMagnets[index] = !enabledBarMagnets[index];
            calculateFieldLines();
        }
        if (e.key == '+' && linesDensity < 50) {
            linesDensity++;
            calculateFieldLines();
        }
        if (e.key == '-' && linesDensity > 1) {
            linesDensity--;
            calculateFieldLines();
        }
    });
    return gl.animate(function (abs, _diff) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.loadIdentity();
        gl.multMatrix(M4.rotateLine(V(0.5, 0.5), V3.Z, abs / 5000));
        // gl.translate(-1, -1, -1)
        // gl.scale(2)
        shader.attributes({ ts_Color: chroma('black').gl() }).draw(linesMesh, gl.LINES);
        barMagnetMatrices.forEach((mat, index) => {
            if (enabledBarMagnets[index]) {
                gl.pushMatrix();
                gl.multMatrix(mat);
                gl.scale(0.5, 1, 1);
                shader.attributes({ ts_Color: chroma('red').gl() }).draw(cubeMesh, gl.LINES);
                gl.translate(1, 0);
                shader.attributes({ ts_Color: chroma('blue').gl() }).draw(cubeMesh, gl.LINES);
                gl.popMatrix();
            }
        });
        gl.scale(bounds.max);
        shader.attributes({ ts_Color: chroma('grey').gl() }).draw(cubeMesh, gl.LINES);
        // vectorFieldShader.drawBuffers(vectorFieldMesh.vertexBuffers, undefined, DRAW_MODES.LINES)
    });
}
/**
 * Returns a 1d array of V3s in a 2d-grid. The V3s are all within [0; 1]²
 * The V3s are spaced like circles fit together as tight as possible. i.e. rows offset by half the x-spacing.
 * .   .   .
 *   .   .   .
 * .   .   .
 *
 * @param xCount
 */
function ballGrid(xCount = 64) {
    const xSpacing = 1 / xCount;
    const ySpacing = xSpacing * Math.sqrt(3) / 2;
    const yCount = (1 / ySpacing) | 0;
    return arrayFromFunction(xCount * yCount, i => {
        const x = i % xCount;
        const y = (i / xCount) | 0;
        return new V3((x + (y % 2) * 0.5) / xCount, y / yCount, 0);
    });
}
function grid3d(xCount = 64, yCount = xCount, zCount = 1) {
    return arrayFromFunction(xCount * yCount * zCount, i => {
        const x = i % xCount;
        const y = (i / xCount) % yCount | 0;
        const z = (i / xCount / yCount) | 0;
        return new V3(x / xCount, y / yCount, z / zCount);
    });
}
mag.info = 'Press keys 1-5 to toggle magnets, +/- to change to number of field lines.';

/// <reference path="../types.d.ts" />
/**
 * Blend two textures while rendering them to a quad.
 */
function multiTexture(gl) {
    const mesh = Mesh.plane();
    const texture = Texture.fromURLSwitch('texture.png');
    const texture2 = Texture.fromURLSwitch('texture2.png');
    const shader = Shader.create(`
	attribute vec2 ts_TexCoord;
	attribute vec4 ts_Vertex;
	uniform mat4 ts_ModelViewProjectionMatrix;
  varying vec2 coord;
  void main() {
    coord = ts_TexCoord;
    gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
  }
`, `
	precision highp float;
  uniform sampler2D texture;
  uniform sampler2D texture2;
  varying vec2 coord;
  void main() {
    //gl_FragColor = vec4(coord.x, coord.y, 0, 1);
    gl_FragColor = texture2D(texture, coord) - texture2D(texture2, coord);
  }
`);
    gl.clearColor(1, 1, 1, 1);
    // setup camera
    gl.matrixMode(gl.PROJECTION);
    gl.loadIdentity();
    gl.perspective(40, gl.canvas.width / gl.canvas.height, 0.1, 1000);
    gl.lookAt(V(0, -2, 1.5), V3.O, V3.Z);
    gl.matrixMode(gl.MODELVIEW);
    gl.enable(gl.DEPTH_TEST);
    return gl.animate(function (abs, _diff) {
        const angleDeg = abs / 1000 * 45;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.loadIdentity();
        //gl.translate(0, 0, -5)
        gl.rotate(angleDeg, 0, 0, 1);
        gl.translate(-0.5, -0.5);
        texture.bind(0);
        texture2.bind(1);
        shader.uniforms({
            texture: 0,
            texture2: 1,
        }).draw(mesh);
    });
}

var rayTracerVS = "#version 300 es\nprecision mediump float;in vec4 ts_Vertex;out vec4 pos;void main(){gl_Position=ts_Vertex;pos=ts_Vertex;}";

var rayTracerFS = "#version 300 es\nprecision highp float;const float INFINITY=1.0e9;const int TRIANGLE_COUNT=1024;uniform vec3 sphereCenters[8];uniform mat4 ts_ModelViewProjectionMatrixInverse;uniform float sphereRadii[8];uniform sampler2D vertices;uniform sampler2D texCoords;uniform sampler2D triangleTexture;in vec4 pos;out vec4 fragColor;float intersectSphere(vec3 origin,vec3 ray,vec3 sphereCenter,float sphereRadius){vec3 toSphere=origin-sphereCenter;float a=dot(ray,ray);float b=2.0*dot(toSphere,ray);float c=dot(toSphere,toSphere)-sphereRadius*sphereRadius;float discriminant=b*b-4.0*a*c;if(discriminant>0.0){float t=(-b-sqrt(discriminant))/(2.0*a);if(t>0.0)return t;}return INFINITY;}struct TriangleHitTest{float t;vec3 hit;float u;float v;};const TriangleHitTest INFINITY_HIT=TriangleHitTest(INFINITY,vec3(0.0),0.0,0.0);TriangleHitTest intersectTriangle(vec3 rayOrigin,vec3 rayVector,vec3 vertex0,vec3 vertex1,vec3 vertex2){const float EPSILON=0.0000001;vec3 edge1,edge2,h,s,q;float a,f,u,v;edge1=vertex1-vertex0;edge2=vertex2-vertex0;h=cross(rayVector,edge2);a=dot(edge1,h);if(a>-EPSILON&&a<EPSILON)return INFINITY_HIT;f=1.0/a;s=rayOrigin-vertex0;u=f*dot(s,h);if(u<0.0||u>1.0)return INFINITY_HIT;q=cross(s,edge1);v=f*dot(rayVector,q);if(v<0.0||u+v>1.0)return INFINITY_HIT;float t=f*dot(edge2,q);if(t>0.0001){return TriangleHitTest(t,rayOrigin+rayVector*t,u,v);}else return INFINITY_HIT;}vec3 vertexi(int i){return texelFetch(vertices,ivec2(i,0),0).xyz;}vec3 textcoordi(int i){return texelFetch(texCoords,ivec2(i,0),0).xyz;}void main(){vec3 rayStart=(ts_ModelViewProjectionMatrixInverse*vec4(pos.xy,1.0,1.0)).xyz;vec3 rayEnd=(ts_ModelViewProjectionMatrixInverse*vec4(pos.xy,-1.0,1.0)).xyz;vec3 rayDir=rayEnd-rayStart;fragColor=vec4(0.0,0.0,0.0,1.0);vec4 mask=vec4(1.0,1.0,1.0,1.0);for(int bounce=0;bounce<8;bounce++){vec3 closestHit;vec4 closestColor=vec4(0.0);float closestT=INFINITY;vec3 closestNormal;float closestSpecular=0.0;for(int s=0;s<8;s++){if(sphereRadii[s]==0.0){break;}float sphereT=intersectSphere(rayStart,rayDir,sphereCenters[s],sphereRadii[s]);if(sphereT<closestT){closestT=sphereT;closestHit=rayStart+rayDir*sphereT;closestNormal=(closestHit-sphereCenters[s])/sphereRadii[s];closestSpecular=0.95;closestColor=vec4(0.0);}}for(int i=0;i<TRIANGLE_COUNT;i++){vec3 a=vertexi(i*3);vec3 b=vertexi(i*3+1);vec3 c=vertexi(i*3+2);if(a==vec3(0.0)&&b==vec3(0.0)){break;}TriangleHitTest hitTest=intersectTriangle(rayStart,rayDir,a,b,c);float triangleT=hitTest.t;if(triangleT<closestT){closestT=triangleT;vec3 ab=b-a;vec3 ac=c-a;closestNormal=normalize(cross(ab,ac));closestHit=hitTest.hit;vec3 texCoordsAndSheen=textcoordi(i*3)*(1.0-hitTest.u-hitTest.v)+textcoordi(i*3+1)*(hitTest.u)+textcoordi(i*3+2)*(hitTest.v);closestColor=texture(triangleTexture,texCoordsAndSheen.xy);closestSpecular=texCoordsAndSheen.z;}}if(closestT==INFINITY){fragColor+=mask;break;}fragColor+=mask*(1.0-closestSpecular)*closestColor;if(0.0==closestSpecular){break;}rayDir=reflect(rayDir,closestNormal);rayStart=closestHit;mask*=closestSpecular;}}";

/// <reference path="../types.d.ts" />
/**
 * Realtime GPU ray tracing including reflection.
 */
function rayTracing(gl) {
    return __awaiter$1(this, void 0, void 0, function* () {
        if (!isWebGL2RenderingContext(gl))
            throw new Error('require webgl2');
        let angleX = 30;
        let angleY = 10;
        // This is the mesh we tell WebGL to draw. It covers the whole view so each pixel will get a fragment shader call.
        const mesh = Mesh.plane({ startX: -1, startY: -1, width: 2, height: 2 });
        // floor and dodecahedron are meshes we will ray-trace
        // add a vertex buffer "specular", which defines how reflective the mesh is.
        // specular=1 means it is perfectly reflective, specular=0 perfectly matte
        // meshes neeed coords vertex buffer as we will draw them with meshes
        const floor = Mesh.plane({ startX: -4, startY: -4, width: 8, height: 8 })
            .addVertexBuffer('specular', 'specular')
            .rotateX(90 * DEG);
        floor.specular = floor.vertices.map(_ => 0); // floor doesn't reflect
        const dodecahedron = Mesh.sphere(0)
            .addVertexBuffer('specular', 'specular')
            .addVertexBuffer('coords', 'ts_TexCoord')
            .translate(3, 1);
        // d20 reflects most of the light
        dodecahedron.specular = dodecahedron.vertices.map(_ => 0.8);
        // all uv coordinates the same to pick a solid color from the texture
        dodecahedron.coords = dodecahedron.vertices.map(_ => [0, 0]);
        // don't transform the vertices at all
        // out/in pos so we get the world position of the fragments
        const shader = Shader.create(rayTracerVS, rayTracerFS);
        // define spheres which we will have the shader ray-trace
        const sphereCenters = arrayFromFunction(8, i => [V(0.0, 1.6, 0.0), V(3, 3, 3), V(-3, 3, 3)][i] || V3.O);
        const sphereRadii = arrayFromFunction(8, i => [1.5, 0.5, 0.5][i] || 0);
        // texture for ray-traced mesh
        const floorTexture = yield Texture.fromURL('./mandelbrot.jpg');
        const showMesh = floor.concat(dodecahedron);
        const textureWidth = 1024;
        const textureHeight = 1;
        // verticesTexture contains the mesh vertices
        // vertices are unpacked so we don't have an extra index buffer for the triangles
        const verticesTexture = new Texture(textureWidth, textureHeight);
        const verticesBuffer = new Float32Array(textureWidth * textureHeight * 3);
        V3.pack(showMesh.TRIANGLES.map(i => showMesh.vertices[i]), verticesBuffer);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, textureWidth, textureHeight, 0, gl.RGB, gl.FLOAT, verticesBuffer);
        // uvTexture contains the uv coordinates for the vertices as wel as the specular value for each vertex
        const uvTexture = new Texture(textureWidth, textureHeight, { format: gl.RGB, type: gl.FLOAT });
        const uvBuffer = new Float32Array(textureWidth * textureHeight * 3);
        showMesh.TRIANGLES.forEach((i, index) => {
            uvBuffer[index * 3] = showMesh.coords[i][0];
            uvBuffer[index * 3 + 1] = showMesh.coords[i][1];
            uvBuffer[index * 3 + 2] = showMesh.specular[i];
        });
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, textureWidth, textureHeight, 0, gl.RGB, gl.FLOAT, uvBuffer);
        let lastPos = V3.O;
        // scene rotation
        gl.canvas.onmousemove = function (e) {
            const pagePos = V(e.pageX, e.pageY);
            const delta = lastPos.to(pagePos);
            if (e.buttons & 1) {
                angleY += delta.x;
                angleX = clamp(angleX + delta.y, -90, 90);
            }
            lastPos = pagePos;
        };
        gl.matrixMode(gl.PROJECTION);
        gl.loadIdentity();
        verticesTexture.bind(0);
        floorTexture.bind(1);
        uvTexture.bind(2);
        shader.uniforms({
            'sphereCenters[0]': sphereCenters,
            'sphereRadii[0]': sphereRadii,
            'vertices': 0,
            'triangleTexture': 1,
            'texCoords': 2
        });
        return gl.animate(function (_abs, _diff) {
            // Camera setup
            gl.matrixMode(gl.MODELVIEW);
            gl.loadIdentity();
            // gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000)
            // gl.lookAt(V(0, 200, 200), V(0, 0, 0), V3.Z)
            gl.translate(0, 0, -10);
            gl.rotate(angleX, 1, 0, 0);
            gl.rotate(angleY, 0, 1, 0);
            gl.scale(0.2);
            shader.draw(mesh);
            // Draw debug output to show that the raytraced scene lines up correctly with
            // the rasterized scene
            gl.color(0, 0, 0, 0.5);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.begin(gl.LINES);
            for (let s = 4, i = -s; i <= s; i++) {
                gl.vertex(-s, 0, i);
                gl.vertex(s, 0, i);
                gl.vertex(i, 0, -s);
                gl.vertex(i, 0, s);
            }
            gl.end();
            gl.disable(gl.BLEND);
        });
    });
}
rayTracing.info = 'LMB-drag to rotate camera.';

var vertices = [[-37.001838,9.438225,38.579569],[-36.915702,9.438225,39.123438],[-38.675697,9.438225,39.123438],[-34.205551,11.229561,37.671],[-34.186286,16.649834,37.664744],[-33.955245,16.652184,39.123438],[-33.975509,11.229561,39.123438],[-36.733184,94.276329,38.492274],[-38.675697,94.276329,39.123438],[-36.633216,94.276329,39.123438],[-37.251831,9.438225,38.088938],[-34.873161,11.229561,36.360743],[-34.85678,16.647721,36.348841],[-37.0233,94.276329,37.922907],[-37.641197,9.438225,37.699564],[-35.912994,11.229561,35.320902],[-35.9011,16.646042,35.30453],[-37.475158,94.276329,37.471034],[-38.131828,9.438225,37.44958],[-37.223258,11.229561,34.6533],[-37.217002,16.644966,34.634043],[-38.04454,94.276329,37.180933],[-38.675697,9.438225,37.363444],[-38.675697,11.229561,34.423243],[-38.675697,16.644585,34.40301],[-38.675697,94.276329,37.080958],[-39.219566,9.438225,37.44958],[-40.128143,11.229561,34.6533],[-40.134391,16.644966,34.634043],[-39.306861,94.276329,37.180933],[-39.710205,9.438225,37.699564],[-41.438407,11.229561,35.320902],[-41.450302,16.646042,35.30453],[-39.876235,94.276329,37.471034],[-40.099571,9.438225,38.088938],[-42.478233,11.229561,36.360743],[-42.494621,16.647721,36.348841],[-40.328102,94.276329,37.922907],[-40.349555,9.438225,38.579569],[-42.143463,86.821404,37.996699],[-42.143463,93.296955,37.996699],[-41.625556,93.296955,36.98025],[-41.625556,86.818085,36.98025],[-40.618217,94.276329,38.492274],[-40.435699,9.438225,39.123438],[-40.455963,16.65638,39.123438],[-40.718177,86.825089,39.123438],[-40.618217,86.821404,38.492274],[-40.368827,16.654038,38.573313],[-40.718177,94.276329,39.123438],[-40.349555,9.438225,39.667307],[-42.143463,86.82877,40.250193],[-42.143463,93.296955,40.250193],[-42.321922,93.296955,39.123438],[-42.321922,86.825089,39.123438],[-40.618217,94.276329,39.754603],[-40.099571,9.438225,40.157938],[-42.478233,11.229561,41.886149],[-42.494636,16.656639,41.898066],[-43.165122,16.654526,40.582148],[-43.145843,11.229561,40.575877],[-40.328102,94.276329,40.323985],[-39.710205,9.438225,40.547312],[-40.818893,86.834725,42.073298],[-40.818893,93.296955,42.073298],[-41.625556,93.296955,41.266642],[-41.625556,86.832085,41.266642],[-39.876235,94.276329,40.775843],[-39.219566,9.438225,40.797297],[-40.128135,11.229561,43.593592],[-40.134406,16.659401,43.612879],[-41.450324,16.658318,42.942393],[-41.4384,11.229561,42.925974],[-39.306861,94.276329,41.065958],[-38.675697,9.438225,40.883448],[-38.675697,16.663964,40.903727],[-38.675697,86.837002,41.165919],[-39.306861,86.836418,41.065958],[-39.225837,16.663597,40.816599],[-38.675697,94.276329,41.165919],[-38.131828,9.438225,40.797297],[-37.223258,11.229561,43.593592],[-37.216995,16.659401,43.612879],[-38.675697,16.659767,43.843928],[-38.675697,11.229561,43.823634],[-38.04454,94.276329,41.065958],[-37.641197,9.438225,40.547312],[-37.629272,16.662522,40.563715],[-37.475158,86.834725,40.775843],[-38.04454,86.836418,41.065958],[-38.125556,16.663597,40.816599],[-37.475158,94.276329,40.775843],[-37.251831,9.438225,40.157938],[-37.23542,16.660843,40.169856],[-37.0233,86.832085,40.323985],[-37.0233,94.276329,40.323985],[-37.001838,9.438225,39.667307],[-36.982559,16.65873,39.673579],[-36.733184,86.82877,39.754603],[-36.733184,94.276329,39.754603],[-35.029472,86.825089,39.123438],[-35.029472,93.296955,39.123438],[-35.207931,93.296955,40.250193],[-35.207931,86.82877,40.250193],[-35.207931,86.821404,37.996699],[-35.207931,93.296955,37.996699],[-35.029472,93.296955,39.123438],[-35.029472,86.825089,39.123438],[-35.725845,86.818085,36.98025],[-35.725845,93.296955,36.98025],[-36.532501,86.815457,36.173579],[-36.532501,93.296955,36.173579],[-37.548957,86.813759,35.65568],[-37.548957,93.296955,35.65568],[-38.675697,86.813175,35.477213],[-38.675697,93.296955,35.477213],[-39.802444,86.813759,35.65568],[-39.802444,93.296955,35.65568],[-40.818901,86.815457,36.173579],[-40.818901,93.296955,36.173579],[-40.328102,86.818085,37.922907],[-40.115951,16.651924,38.077036],[-43.396156,16.652184,39.123438],[-43.375892,11.229561,39.123438],[-39.802444,86.836418,42.591212],[-39.802444,93.296955,42.591212],[-38.675697,86.837002,42.769663],[-38.675697,93.296955,42.769663],[-37.548957,86.836418,42.591212],[-37.548957,93.296955,42.591212],[-36.532501,86.834725,42.073298],[-36.532501,93.296955,42.073298],[-35.725837,86.832085,41.266642],[-35.725837,93.296955,41.266642],[-36.895439,16.65638,39.123438],[-36.633216,86.825089,39.123438],[-36.733184,93.296955,38.492274],[-36.633216,93.296955,39.123438],[-37.0233,93.296955,37.922907],[-37.475158,93.296955,37.471034],[-38.04454,93.296955,37.180933],[-38.675697,93.296955,37.080958],[-39.306861,93.296955,37.180933],[-39.876235,93.296955,37.471034],[-40.328102,93.296955,37.922907],[-40.618217,93.296955,38.492274],[-40.718177,93.296955,39.123438],[-40.618217,93.296955,39.754603],[-40.328102,93.296955,40.323985],[-39.876235,93.296955,40.775843],[-39.306861,93.296955,41.065958],[-38.675697,93.296955,41.165919],[-38.04454,93.296955,41.065958],[-37.475158,93.296955,40.775843],[-37.0233,93.296955,40.323985],[-36.733184,93.296955,39.754603],[-40.328102,93.296955,37.922907],[-40.618217,93.296955,38.492274],[-40.618217,86.82877,39.754603],[-40.718177,93.296955,39.123438],[-40.618217,93.296955,39.754603],[-39.876235,86.834725,40.775843],[-40.328102,86.832085,40.323985],[-40.328102,93.296955,40.323985],[-39.876235,93.296955,40.775843],[-36.733184,93.296955,39.754603],[-36.633216,93.296955,39.123438],[-36.733184,86.821404,38.492274],[-36.633216,86.825089,39.123438],[-36.633216,93.296955,39.123438],[-36.733184,93.296955,38.492274],[-37.0233,86.818085,37.922907],[-37.0233,93.296955,37.922907],[-37.475158,86.815457,37.471034],[-37.475158,93.296955,37.471034],[-38.04454,86.813759,37.180933],[-38.04454,93.296955,37.180933],[-38.675697,86.813175,37.080958],[-38.675697,93.296955,37.080958],[-39.306861,86.813759,37.180933],[-39.306861,93.296955,37.180933],[-39.876235,86.815457,37.471034],[-39.876235,93.296955,37.471034],[-39.306861,93.296955,41.065958],[-38.675697,93.296955,41.165919],[-38.04454,93.296955,41.065958],[-37.475158,93.296955,40.775843],[-37.0233,93.296955,40.323985],[-36.982574,16.654038,38.573313],[-36.895439,16.65638,39.123438],[-37.23545,16.651924,38.077036],[-37.629295,16.650238,37.683192],[-38.125572,16.649162,37.430338],[-38.675697,16.648789,37.343195],[-39.225822,16.649162,37.430338],[-39.722099,16.650238,37.683192],[-43.165115,16.649834,37.664744],[-43.145851,11.229561,37.671],[-40.115974,16.660843,40.169856],[-40.368835,16.65873,39.673579],[-39.722122,16.662522,40.563715],[-35.912994,11.229561,42.925974],[-35.901077,16.658318,42.942393],[-34.873168,11.229561,41.886149],[-34.856758,16.656639,41.898066],[-34.205551,11.229561,40.575877],[-34.186271,16.654526,40.582148],[-33.975509,11.229561,39.123438],[-33.955245,16.652184,39.123438],[-36.915702,11.233757,39.123438],[-37.001838,11.233757,38.579569],[-37.251831,11.233757,38.088938],[-37.641197,11.233757,37.699564],[-38.131828,11.233757,37.44958],[-38.675697,11.233757,37.363444],[-39.219566,11.233757,37.44958],[-39.710205,11.233757,37.699564],[-40.099571,11.233757,38.088938],[-40.349555,11.233757,38.579569],[-40.435699,11.233757,39.123438],[-40.349555,11.233757,39.667307],[-40.099571,11.233757,40.157938],[-39.710205,11.233757,40.547312],[-39.219566,11.233757,40.797297],[-38.675697,11.233757,40.883448],[-38.131828,11.233757,40.797297],[-37.641197,11.233757,40.547312],[-37.251831,11.233757,40.157938],[-37.001838,11.233757,39.667307],[-37.001838,11.233757,38.579569],[-36.915702,11.233757,39.123438],[-37.251831,11.233757,38.088938],[-37.641197,11.233757,37.699564],[-38.131828,11.233757,37.44958],[-38.675697,11.233757,37.363444],[-39.219566,11.233757,37.44958],[-39.710205,11.233757,37.699564],[-40.099571,11.233757,38.088938],[-40.099571,11.233757,40.157938],[-40.349555,11.233757,39.667307],[-39.219566,11.233757,40.797297],[-39.710205,11.233757,40.547312],[-38.131828,11.233757,40.797297],[-38.675697,11.233757,40.883448],[-40.435699,11.233757,39.123438],[-40.349555,11.233757,38.579569],[-37.641197,11.233757,40.547312],[-37.251831,11.233757,40.157938],[-37.001838,11.233757,39.667307],[-36.915702,11.233757,39.123438],[40.218375,9.438225,-38.974897],[40.304515,9.438225,-38.431028],[38.544515,9.438225,-38.431028],[43.014663,11.229561,-39.883459],[43.033928,16.649834,-39.889722],[43.26497,16.652184,-38.43102],[43.244706,11.229561,-38.43102],[40.487029,94.276329,-39.062185],[38.544515,94.276329,-38.431028],[40.586995,94.276329,-38.431028],[39.968385,9.438225,-39.465528],[42.347051,11.229561,-41.193723],[42.363432,16.647721,-41.205633],[40.196917,94.276329,-39.631567],[39.579017,9.438225,-39.854894],[41.307219,11.229561,-42.233556],[41.319118,16.646042,-42.249937],[39.745055,94.276329,-40.083425],[39.088385,9.438225,-40.104887],[39.996955,11.229561,-42.901174],[40.003209,16.644966,-42.920423],[39.175676,94.276329,-40.37354],[38.544515,9.438225,-40.191022],[38.544515,11.229561,-43.131216],[38.544515,16.644585,-43.151456],[38.544515,94.276329,-40.473508],[38.000645,9.438225,-40.104887],[37.092076,11.229561,-42.901174],[37.085821,16.644966,-42.920423],[37.913354,94.276329,-40.37354],[37.510013,9.438225,-39.854894],[35.781811,11.229561,-42.233556],[35.769913,16.646042,-42.249937],[37.343976,94.276329,-40.083425],[37.120645,9.438225,-39.465528],[34.74198,11.229561,-41.193723],[34.725598,16.647721,-41.205633],[36.892114,94.276329,-39.631567],[36.870656,9.438225,-38.974897],[35.076749,86.821404,-39.557767],[35.076749,93.296955,-39.557767],[35.594657,93.296955,-40.574224],[35.594657,86.818085,-40.574224],[36.602001,94.276329,-39.062185],[36.784515,9.438225,-38.431028],[36.764252,16.65638,-38.431028],[36.502035,86.825089,-38.431028],[36.602001,86.821404,-39.062185],[36.851391,16.654038,-38.981153],[36.502035,94.276329,-38.431028],[36.870656,9.438225,-37.887159],[35.076749,86.82877,-37.304281],[35.076749,93.296955,-37.304281],[34.89829,93.296955,-38.431028],[34.89829,86.825089,-38.431028],[36.602001,94.276329,-37.799863],[37.120646,9.438225,-37.39652],[34.741983,11.229561,-35.668325],[34.725577,16.656639,-35.6564],[34.05509,16.654526,-36.972318],[34.074369,11.229561,-36.978582],[36.892114,94.276329,-37.230489],[37.510014,9.438225,-37.007154],[36.401319,86.834725,-35.481168],[36.401319,93.296955,-35.481168],[35.594657,93.296955,-36.287824],[35.594657,86.832085,-36.287824],[37.343976,94.276329,-36.778623],[38.000646,9.438225,-36.757169],[37.092078,11.229561,-33.960882],[37.085809,16.659401,-33.941587],[35.769892,16.658318,-34.612081],[35.781814,11.229561,-34.628492],[37.913355,94.276329,-36.488508],[38.544516,9.438225,-36.671026],[38.544516,16.663964,-36.650739],[38.544516,86.837002,-36.388547],[37.913355,86.836418,-36.488508],[37.994376,16.663597,-36.737875],[38.544516,94.276329,-36.388547],[39.088386,9.438225,-36.757169],[39.996955,11.229561,-33.960882],[40.003224,16.659401,-33.941587],[38.544516,16.659767,-33.710546],[38.544516,11.229561,-33.730833],[39.175677,94.276329,-36.488508],[39.579018,9.438225,-37.007154],[39.590941,16.662522,-36.990743],[39.745055,86.834725,-36.778623],[39.175677,86.836418,-36.488508],[39.094655,16.663597,-36.737875],[39.745055,94.276329,-36.778623],[39.968386,9.438225,-37.39652],[39.984791,16.660843,-37.384603],[40.196917,86.832085,-37.230489],[40.196917,94.276329,-37.230489],[40.218375,9.438225,-37.887159],[40.237655,16.65873,-37.880895],[40.487029,86.82877,-37.799863],[40.487029,94.276329,-37.799863],[42.19074,86.825089,-38.431028],[42.19074,93.296955,-38.431028],[42.012281,93.296955,-37.304281],[42.012281,86.82877,-37.304281],[42.012281,86.821404,-39.557767],[42.012281,93.296955,-39.557767],[42.19074,93.296955,-38.431028],[42.19074,86.825089,-38.431028],[41.494373,86.818085,-40.574224],[41.494373,93.296955,-40.574224],[40.687713,86.815457,-41.38088],[40.687713,93.296955,-41.38088],[39.671261,86.813759,-41.898794],[39.671261,93.296955,-41.898794],[38.544515,86.813175,-42.077253],[38.544515,93.296955,-42.077253],[37.41777,86.813759,-41.898794],[37.41777,93.296955,-41.898794],[36.401318,86.815457,-41.38088],[36.401318,93.296955,-41.38088],[36.892114,86.818085,-39.631567],[37.104263,16.651924,-39.47743],[33.824061,16.652184,-38.43102],[33.844325,11.229561,-38.43102],[37.41777,86.836418,-34.963262],[37.41777,93.296955,-34.963262],[38.544516,86.837002,-34.784803],[38.544516,93.296955,-34.784803],[39.671261,86.836418,-34.963262],[39.671261,93.296955,-34.963262],[40.687713,86.834725,-35.481168],[40.687713,93.296955,-35.481168],[41.494374,86.832085,-36.287832],[41.494374,93.296955,-36.287832],[40.324779,16.65638,-38.431028],[40.586995,86.825089,-38.431028],[40.487029,93.296955,-39.062185],[40.586995,93.296955,-38.431028],[40.196917,93.296955,-39.631567],[39.745055,93.296955,-40.083425],[39.175676,93.296955,-40.37354],[38.544515,93.296955,-40.473508],[37.913354,93.296955,-40.37354],[37.343976,93.296955,-40.083425],[36.892114,93.296955,-39.631567],[36.602001,93.296955,-39.062185],[36.502035,93.296955,-38.431028],[36.602001,93.296955,-37.799863],[36.892114,93.296955,-37.230489],[37.343976,93.296955,-36.778623],[37.913355,93.296955,-36.488508],[38.544516,93.296955,-36.388547],[39.175677,93.296955,-36.488508],[39.745055,93.296955,-36.778623],[40.196917,93.296955,-37.230489],[40.487029,93.296955,-37.799863],[36.892114,93.296955,-39.631567],[36.602001,93.296955,-39.062185],[36.602001,86.82877,-37.799863],[36.502035,93.296955,-38.431028],[36.602001,93.296955,-37.799863],[37.343976,86.834725,-36.778623],[36.892114,86.832085,-37.230489],[36.892114,93.296955,-37.230489],[37.343976,93.296955,-36.778623],[40.487029,93.296955,-37.799863],[40.586995,93.296955,-38.431028],[40.487029,86.821404,-39.062185],[40.586995,86.825089,-38.431028],[40.586995,93.296955,-38.431028],[40.487029,93.296955,-39.062185],[40.196917,86.818085,-39.631567],[40.196917,93.296955,-39.631567],[39.745055,86.815457,-40.083425],[39.745055,93.296955,-40.083425],[39.175676,86.813759,-40.37354],[39.175676,93.296955,-40.37354],[38.544515,86.813175,-40.473508],[38.544515,93.296955,-40.473508],[37.913354,86.813759,-40.37354],[37.913354,93.296955,-40.37354],[37.343976,86.815457,-40.083425],[37.343976,93.296955,-40.083425],[37.913355,93.296955,-36.488508],[38.544516,93.296955,-36.388547],[39.175677,93.296955,-36.488508],[39.745055,93.296955,-36.778623],[40.196917,93.296955,-37.230489],[40.23764,16.654038,-38.981153],[40.324779,16.65638,-38.431028],[39.984767,16.651924,-39.47743],[39.590916,16.650238,-39.871275],[39.09464,16.649162,-40.124136],[38.544515,16.648789,-40.211263],[37.994391,16.649162,-40.124136],[37.498114,16.650238,-39.871275],[34.055103,16.649834,-39.889722],[34.074368,11.229561,-39.883459],[37.10424,16.660843,-37.384603],[36.851376,16.65873,-37.880895],[37.498091,16.662522,-36.990743],[41.307217,11.229561,-34.628492],[41.31914,16.658318,-34.612081],[42.347049,11.229561,-35.668325],[42.363454,16.656639,-35.6564],[43.014662,11.229561,-36.978582],[43.033942,16.654526,-36.972318],[43.244706,11.229561,-38.43102],[43.26497,16.652184,-38.43102],[40.304515,11.233757,-38.431028],[40.218375,11.233757,-38.974897],[39.968385,11.233757,-39.465528],[39.579017,11.233757,-39.854894],[39.088385,11.233757,-40.104887],[38.544515,11.233757,-40.191022],[38.000645,11.233757,-40.104887],[37.510013,11.233757,-39.854894],[37.120645,11.233757,-39.465528],[36.870656,11.233757,-38.974897],[36.784515,11.233757,-38.431028],[36.870656,11.233757,-37.887159],[37.120646,11.233757,-37.39652],[37.510014,11.233757,-37.007154],[38.000646,11.233757,-36.757169],[38.544516,11.233757,-36.671026],[39.088386,11.233757,-36.757169],[39.579018,11.233757,-37.007154],[39.968386,11.233757,-37.39652],[40.218375,11.233757,-37.887159],[40.218375,11.233757,-38.974897],[40.304515,11.233757,-38.431028],[39.968385,11.233757,-39.465528],[39.579017,11.233757,-39.854894],[39.088385,11.233757,-40.104887],[38.544515,11.233757,-40.191022],[38.000645,11.233757,-40.104887],[37.510013,11.233757,-39.854894],[37.120645,11.233757,-39.465528],[37.120646,11.233757,-37.39652],[36.870656,11.233757,-37.887159],[38.000646,11.233757,-36.757169],[37.510014,11.233757,-37.007154],[39.088386,11.233757,-36.757169],[38.544516,11.233757,-36.671026],[36.784515,11.233757,-38.431028],[36.870656,11.233757,-38.974897],[39.579018,11.233757,-37.007154],[39.968386,11.233757,-37.39652],[40.218375,11.233757,-37.887159],[40.304515,11.233757,-38.431028],[39.884177,9.438225,37.911051],[39.970317,9.438225,38.45492],[38.210317,9.438225,38.45492],[42.680465,11.229561,37.002482],[42.69973,16.649834,36.996226],[42.930772,16.652184,38.45492],[42.910508,11.229561,38.45492],[40.152831,94.276329,37.823756],[38.210317,94.276329,38.45492],[40.252797,94.276329,38.45492],[39.634187,9.438225,37.42042],[42.012853,11.229561,35.692225],[42.029234,16.647721,35.680323],[39.862719,94.276329,37.254389],[39.244819,9.438225,37.031046],[40.973021,11.229561,34.652384],[40.98492,16.646042,34.636012],[39.410857,94.276329,36.802515],[38.754187,9.438225,36.781062],[39.662757,11.229561,33.984782],[39.669011,16.644966,33.965525],[38.841478,94.276329,36.512415],[38.210317,9.438225,36.694926],[38.210317,11.229561,33.754725],[38.210317,16.644585,33.734492],[38.210317,94.276329,36.41244],[37.666447,9.438225,36.781062],[36.757878,11.229561,33.984782],[36.751623,16.644966,33.965525],[37.579156,94.276329,36.512415],[37.175815,9.438225,37.031046],[35.447613,11.229561,34.652384],[35.435715,16.646042,34.636012],[37.009778,94.276329,36.802515],[36.786447,9.438225,37.42042],[34.407782,11.229561,35.692225],[34.3914,16.647721,35.680323],[36.557916,94.276329,37.254389],[36.536458,9.438225,37.911051],[34.742551,86.821404,37.328181],[34.742551,93.296955,37.328181],[35.260459,93.296955,36.311732],[35.260459,86.818085,36.311732],[36.267804,94.276329,37.823756],[36.450317,9.438225,38.45492],[36.430054,16.65638,38.45492],[36.167837,86.825089,38.45492],[36.267804,86.821404,37.823756],[36.517193,16.654038,37.904795],[36.167837,94.276329,38.45492],[36.536458,9.438225,38.998789],[34.742551,86.82877,39.581675],[34.742551,93.296955,39.581675],[34.564092,93.296955,38.45492],[34.564092,86.825089,38.45492],[36.267804,94.276329,39.086085],[36.786448,9.438225,39.48942],[34.407785,11.229561,41.217631],[34.391379,16.656639,41.229548],[33.720892,16.654526,39.91363],[33.740171,11.229561,39.907359],[36.557916,94.276329,39.655467],[37.175816,9.438225,39.878794],[36.067121,86.834725,41.40478],[36.067121,93.296955,41.40478],[35.260459,93.296955,40.598124],[35.260459,86.832085,40.598124],[37.009778,94.276329,40.107325],[37.666448,9.438225,40.128779],[36.75788,11.229561,42.925074],[36.751611,16.659401,42.944361],[35.435694,16.658318,42.273875],[35.447616,11.229561,42.257456],[37.579157,94.276329,40.39744],[38.210318,9.438225,40.21493],[38.210318,16.663964,40.235209],[38.210318,86.837002,40.497401],[37.579157,86.836418,40.39744],[37.660178,16.663597,40.148081],[38.210318,94.276329,40.497401],[38.754188,9.438225,40.128779],[39.662757,11.229561,42.925074],[39.669026,16.659401,42.944361],[38.210318,16.659767,43.17541],[38.210318,11.229561,43.155116],[38.841479,94.276329,40.39744],[39.24482,9.438225,39.878794],[39.256743,16.662522,39.895197],[39.410857,86.834725,40.107325],[38.841479,86.836418,40.39744],[38.760457,16.663597,40.148081],[39.410857,94.276329,40.107325],[39.634188,9.438225,39.48942],[39.650593,16.660843,39.501337],[39.862719,86.832085,39.655467],[39.862719,94.276329,39.655467],[39.884177,9.438225,38.998789],[39.903457,16.65873,39.005061],[40.152831,86.82877,39.086085],[40.152831,94.276329,39.086085],[41.856542,86.825089,38.45492],[41.856542,93.296955,38.45492],[41.678083,93.296955,39.581675],[41.678083,86.82877,39.581675],[41.678083,86.821404,37.328181],[41.678083,93.296955,37.328181],[41.856542,93.296955,38.45492],[41.856542,86.825089,38.45492],[41.160175,86.818085,36.311732],[41.160175,93.296955,36.311732],[40.353515,86.815457,35.505061],[40.353515,93.296955,35.505061],[39.337063,86.813759,34.987162],[39.337063,93.296955,34.987162],[38.210317,86.813175,34.808695],[38.210317,93.296955,34.808695],[37.083572,86.813759,34.987162],[37.083572,93.296955,34.987162],[36.06712,86.815457,35.505061],[36.06712,93.296955,35.505061],[36.557916,86.818085,37.254389],[36.770065,16.651924,37.408518],[33.489863,16.652184,38.45492],[33.510127,11.229561,38.45492],[37.083572,86.836418,41.922694],[37.083572,93.296955,41.922694],[38.210318,86.837002,42.101145],[38.210318,93.296955,42.101145],[39.337063,86.836418,41.922694],[39.337063,93.296955,41.922694],[40.353515,86.834725,41.40478],[40.353515,93.296955,41.40478],[41.160176,86.832085,40.598124],[41.160176,93.296955,40.598124],[39.990581,16.65638,38.45492],[40.252797,86.825089,38.45492],[40.152831,93.296955,37.823756],[40.252797,93.296955,38.45492],[39.862719,93.296955,37.254389],[39.410857,93.296955,36.802515],[38.841478,93.296955,36.512415],[38.210317,93.296955,36.41244],[37.579156,93.296955,36.512415],[37.009778,93.296955,36.802515],[36.557916,93.296955,37.254389],[36.267804,93.296955,37.823756],[36.167837,93.296955,38.45492],[36.267804,93.296955,39.086085],[36.557916,93.296955,39.655467],[37.009778,93.296955,40.107325],[37.579157,93.296955,40.39744],[38.210318,93.296955,40.497401],[38.841479,93.296955,40.39744],[39.410857,93.296955,40.107325],[39.862719,93.296955,39.655467],[40.152831,93.296955,39.086085],[36.557916,93.296955,37.254389],[36.267804,93.296955,37.823756],[36.267804,86.82877,39.086085],[36.167837,93.296955,38.45492],[36.267804,93.296955,39.086085],[37.009778,86.834725,40.107325],[36.557916,86.832085,39.655467],[36.557916,93.296955,39.655467],[37.009778,93.296955,40.107325],[40.152831,93.296955,39.086085],[40.252797,93.296955,38.45492],[40.152831,86.821404,37.823756],[40.252797,86.825089,38.45492],[40.252797,93.296955,38.45492],[40.152831,93.296955,37.823756],[39.862719,86.818085,37.254389],[39.862719,93.296955,37.254389],[39.410857,86.815457,36.802515],[39.410857,93.296955,36.802515],[38.841478,86.813759,36.512415],[38.841478,93.296955,36.512415],[38.210317,86.813175,36.41244],[38.210317,93.296955,36.41244],[37.579156,86.813759,36.512415],[37.579156,93.296955,36.512415],[37.009778,86.815457,36.802515],[37.009778,93.296955,36.802515],[37.579157,93.296955,40.39744],[38.210318,93.296955,40.497401],[38.841479,93.296955,40.39744],[39.410857,93.296955,40.107325],[39.862719,93.296955,39.655467],[39.903442,16.654038,37.904795],[39.990581,16.65638,38.45492],[39.650569,16.651924,37.408518],[39.256718,16.650238,37.014674],[38.760442,16.649162,36.76182],[38.210317,16.648789,36.674677],[37.660193,16.649162,36.76182],[37.163916,16.650238,37.014674],[33.720905,16.649834,36.996226],[33.74017,11.229561,37.002482],[36.770042,16.660843,39.501337],[36.517178,16.65873,39.005061],[37.163893,16.662522,39.895197],[40.973019,11.229561,42.257456],[40.984942,16.658318,42.273875],[42.012851,11.229561,41.217631],[42.029256,16.656639,41.229548],[42.680464,11.229561,39.907359],[42.699744,16.654526,39.91363],[42.910508,11.229561,38.45492],[42.930772,16.652184,38.45492],[39.970317,11.233757,38.45492],[39.884177,11.233757,37.911051],[39.634187,11.233757,37.42042],[39.244819,11.233757,37.031046],[38.754187,11.233757,36.781062],[38.210317,11.233757,36.694926],[37.666447,11.233757,36.781062],[37.175815,11.233757,37.031046],[36.786447,11.233757,37.42042],[36.536458,11.233757,37.911051],[36.450317,11.233757,38.45492],[36.536458,11.233757,38.998789],[36.786448,11.233757,39.48942],[37.175816,11.233757,39.878794],[37.666448,11.233757,40.128779],[38.210318,11.233757,40.21493],[38.754188,11.233757,40.128779],[39.24482,11.233757,39.878794],[39.634188,11.233757,39.48942],[39.884177,11.233757,38.998789],[39.884177,11.233757,37.911051],[39.970317,11.233757,38.45492],[39.634187,11.233757,37.42042],[39.244819,11.233757,37.031046],[38.754187,11.233757,36.781062],[38.210317,11.233757,36.694926],[37.666447,11.233757,36.781062],[37.175815,11.233757,37.031046],[36.786447,11.233757,37.42042],[36.786448,11.233757,39.48942],[36.536458,11.233757,38.998789],[37.666448,11.233757,40.128779],[37.175816,11.233757,39.878794],[38.754188,11.233757,40.128779],[38.210318,11.233757,40.21493],[36.450317,11.233757,38.45492],[36.536458,11.233757,37.911051],[39.24482,11.233757,39.878794],[39.634188,11.233757,39.48942],[39.884177,11.233757,38.998789],[39.970317,11.233757,38.45492],[-37.002082,9.438225,-39.643529],[-36.915946,9.438225,-39.09966],[-38.675941,9.438225,-39.09966],[-34.205795,11.229561,-40.552091],[-34.186531,16.649834,-40.558355],[-33.95549,16.652184,-39.099653],[-33.975753,11.229561,-39.099653],[-36.733428,94.276329,-39.730817],[-38.675941,94.276329,-39.09966],[-36.63346,94.276329,-39.09966],[-37.252075,9.438225,-40.134161],[-34.873405,11.229561,-41.862356],[-34.857025,16.647721,-41.874258],[-37.023544,94.276329,-40.300199],[-37.641441,9.438225,-40.523527],[-35.913238,11.229561,-42.902189],[-35.901344,16.646042,-42.918569],[-37.475402,94.276329,-40.752058],[-38.132072,9.438225,-40.773519],[-37.223503,11.229561,-43.569807],[-37.217246,16.644966,-43.589056],[-38.044784,94.276329,-41.042173],[-38.675941,9.438225,-40.859655],[-38.675941,11.229561,-43.799848],[-38.675941,16.644585,-43.820089],[-38.675941,94.276329,-41.142141],[-39.21981,9.438225,-40.773519],[-40.128387,11.229561,-43.569807],[-40.134635,16.644966,-43.589056],[-39.307105,94.276329,-41.042173],[-39.710449,9.438225,-40.523527],[-41.438651,11.229561,-42.902189],[-41.450546,16.646042,-42.918569],[-39.87648,94.276329,-40.752058],[-40.099815,9.438225,-40.134161],[-42.478477,11.229561,-41.862356],[-42.494865,16.647721,-41.874258],[-40.328346,94.276329,-40.300199],[-40.3498,9.438225,-39.643529],[-42.143707,86.821404,-40.2264],[-42.143707,93.296955,-40.2264],[-41.625801,93.296955,-41.242857],[-41.625801,86.818085,-41.242857],[-40.618461,94.276329,-39.730817],[-40.435943,9.438225,-39.09966],[-40.456207,16.65638,-39.09966],[-40.718421,86.825089,-39.09966],[-40.618461,86.821404,-39.730817],[-40.369071,16.654038,-39.649786],[-40.718421,94.276329,-39.09966],[-40.3498,9.438225,-38.555791],[-42.143707,86.82877,-37.972913],[-42.143707,93.296955,-37.972913],[-42.322166,93.296955,-39.09966],[-42.322166,86.825089,-39.09966],[-40.618461,94.276329,-38.468496],[-40.099815,9.438225,-38.065153],[-42.478477,11.229561,-36.33695],[-42.49488,16.656639,-36.325033],[-43.165367,16.654526,-37.640951],[-43.146087,11.229561,-37.647214],[-40.328346,94.276329,-37.899114],[-39.710449,9.438225,-37.675787],[-40.819137,86.834725,-36.149801],[-40.819137,93.296955,-36.149801],[-41.625801,93.296955,-36.956457],[-41.625801,86.832085,-36.956457],[-39.87648,94.276329,-37.447256],[-39.21981,9.438225,-37.425802],[-40.128379,11.229561,-34.629514],[-40.134651,16.659401,-34.61022],[-41.450569,16.658318,-35.280714],[-41.438644,11.229561,-35.297124],[-39.307105,94.276329,-37.15714],[-38.675941,9.438225,-37.339658],[-38.675941,16.663964,-37.319372],[-38.675941,86.837002,-37.05718],[-39.307105,86.836418,-37.15714],[-39.226081,16.663597,-37.406507],[-38.675941,94.276329,-37.05718],[-38.132072,9.438225,-37.425802],[-37.223503,11.229561,-34.629514],[-37.217239,16.659401,-34.61022],[-38.675941,16.659767,-34.379179],[-38.675941,11.229561,-34.399465],[-38.044784,94.276329,-37.15714],[-37.641441,9.438225,-37.675787],[-37.629516,16.662522,-37.659376],[-37.475402,86.834725,-37.447256],[-38.044784,86.836418,-37.15714],[-38.125801,16.663597,-37.406507],[-37.475402,94.276329,-37.447256],[-37.252075,9.438225,-38.06516],[-37.235664,16.660843,-38.053236],[-37.023544,86.832085,-37.899122],[-37.023544,94.276329,-37.899122],[-37.002082,9.438225,-38.555791],[-36.982803,16.65873,-38.549528],[-36.733428,86.82877,-38.468496],[-36.733428,94.276329,-38.468496],[-35.029716,86.825089,-39.09966],[-35.029716,93.296955,-39.09966],[-35.208175,93.296955,-37.972913],[-35.208175,86.82877,-37.972913],[-35.208175,86.821404,-40.2264],[-35.208175,93.296955,-40.2264],[-35.029716,93.296955,-39.09966],[-35.029716,86.825089,-39.09966],[-35.726089,86.818085,-41.242857],[-35.726089,93.296955,-41.242857],[-36.532745,86.815457,-42.049512],[-36.532745,93.296955,-42.049512],[-37.549201,86.813759,-42.567426],[-37.549201,93.296955,-42.567426],[-38.675941,86.813175,-42.745885],[-38.675941,93.296955,-42.745885],[-39.802688,86.813759,-42.567426],[-39.802688,93.296955,-42.567426],[-40.819145,86.815457,-42.049512],[-40.819145,93.296955,-42.049512],[-40.328346,86.818085,-40.300199],[-40.116195,16.651924,-40.146062],[-43.3964,16.652184,-39.099653],[-43.376136,11.229561,-39.099653],[-39.802688,86.836418,-35.631895],[-39.802688,93.296955,-35.631895],[-38.675941,86.837002,-35.453435],[-38.675941,93.296955,-35.453435],[-37.549201,86.836418,-35.631895],[-37.549201,93.296955,-35.631895],[-36.532745,86.834725,-36.149801],[-36.532745,93.296955,-36.149801],[-35.726081,86.832085,-36.956464],[-35.726081,93.296955,-36.956464],[-36.895683,16.65638,-39.09966],[-36.63346,86.825089,-39.09966],[-36.733428,93.296955,-39.730817],[-36.63346,93.296955,-39.09966],[-37.023544,93.296955,-40.300199],[-37.475402,93.296955,-40.752058],[-38.044784,93.296955,-41.042173],[-38.675941,93.296955,-41.142141],[-39.307105,93.296955,-41.042173],[-39.87648,93.296955,-40.752058],[-40.328346,93.296955,-40.300199],[-40.618461,93.296955,-39.730817],[-40.718421,93.296955,-39.09966],[-40.618461,93.296955,-38.468496],[-40.328346,93.296955,-37.899114],[-39.87648,93.296955,-37.447256],[-39.307105,93.296955,-37.15714],[-38.675941,93.296955,-37.05718],[-38.044784,93.296955,-37.15714],[-37.475402,93.296955,-37.447256],[-37.023544,93.296955,-37.899122],[-36.733428,93.296955,-38.468496],[-40.328346,93.296955,-40.300199],[-40.618461,93.296955,-39.730817],[-40.618461,86.82877,-38.468496],[-40.718421,93.296955,-39.09966],[-40.618461,93.296955,-38.468496],[-39.87648,86.834725,-37.447256],[-40.328346,86.832085,-37.899114],[-40.328346,93.296955,-37.899114],[-39.87648,93.296955,-37.447256],[-36.733428,93.296955,-38.468496],[-36.63346,93.296955,-39.09966],[-36.733428,86.821404,-39.730817],[-36.63346,86.825089,-39.09966],[-36.63346,93.296955,-39.09966],[-36.733428,93.296955,-39.730817],[-37.023544,86.818085,-40.300199],[-37.023544,93.296955,-40.300199],[-37.475402,86.815457,-40.752058],[-37.475402,93.296955,-40.752058],[-38.044784,86.813759,-41.042173],[-38.044784,93.296955,-41.042173],[-38.675941,86.813175,-41.142141],[-38.675941,93.296955,-41.142141],[-39.307105,86.813759,-41.042173],[-39.307105,93.296955,-41.042173],[-39.87648,86.815457,-40.752058],[-39.87648,93.296955,-40.752058],[-39.307105,93.296955,-37.15714],[-38.675941,93.296955,-37.05718],[-38.044784,93.296955,-37.15714],[-37.475402,93.296955,-37.447256],[-37.023544,93.296955,-37.899122],[-36.982818,16.654038,-39.649786],[-36.895683,16.65638,-39.09966],[-37.235694,16.651924,-40.146062],[-37.629539,16.650238,-40.539907],[-38.125816,16.649162,-40.792768],[-38.675941,16.648789,-40.879896],[-39.226066,16.649162,-40.792768],[-39.722343,16.650238,-40.539907],[-43.165359,16.649834,-40.558355],[-43.146095,11.229561,-40.552091],[-40.116218,16.660843,-38.053236],[-40.369079,16.65873,-38.549528],[-39.722366,16.662522,-37.659376],[-35.913238,11.229561,-35.297124],[-35.901321,16.658318,-35.280714],[-34.873413,11.229561,-36.336958],[-34.857002,16.656639,-36.325033],[-34.205795,11.229561,-37.647214],[-34.186515,16.654526,-37.640951],[-33.975753,11.229561,-39.099653],[-33.95549,16.652184,-39.099653],[-36.915946,11.233757,-39.09966],[-37.002082,11.233757,-39.643529],[-37.252075,11.233757,-40.134161],[-37.641441,11.233757,-40.523527],[-38.132072,11.233757,-40.773519],[-38.675941,11.233757,-40.859655],[-39.21981,11.233757,-40.773519],[-39.710449,11.233757,-40.523527],[-40.099815,11.233757,-40.134161],[-40.3498,11.233757,-39.643529],[-40.435943,11.233757,-39.09966],[-40.3498,11.233757,-38.555791],[-40.099815,11.233757,-38.065153],[-39.710449,11.233757,-37.675787],[-39.21981,11.233757,-37.425802],[-38.675941,11.233757,-37.339658],[-38.132072,11.233757,-37.425802],[-37.641441,11.233757,-37.675787],[-37.252075,11.233757,-38.06516],[-37.002082,11.233757,-38.555791],[-37.002082,11.233757,-39.643529],[-36.915946,11.233757,-39.09966],[-37.252075,11.233757,-40.134161],[-37.641441,11.233757,-40.523527],[-38.132072,11.233757,-40.773519],[-38.675941,11.233757,-40.859655],[-39.21981,11.233757,-40.773519],[-39.710449,11.233757,-40.523527],[-40.099815,11.233757,-40.134161],[-40.099815,11.233757,-38.065153],[-40.3498,11.233757,-38.555791],[-39.21981,11.233757,-37.425802],[-39.710449,11.233757,-37.675787],[-38.132072,11.233757,-37.425802],[-38.675941,11.233757,-37.339658],[-40.435943,11.233757,-39.09966],[-40.3498,11.233757,-39.643529],[-37.641441,11.233757,-37.675787],[-37.252075,11.233757,-38.06516],[-37.002082,11.233757,-38.555791],[-36.915946,11.233757,-39.09966],[-52.713798,9.438225,-0.866415],[-52.627662,9.438225,-0.322546],[-54.387657,9.438225,-0.322546],[-49.91751,11.229561,-1.774976],[-49.898246,16.649834,-1.78124],[-49.667205,16.652184,-0.322546],[-49.687469,11.229561,-0.322546],[-52.445144,94.276329,-0.953703],[-54.387657,94.276329,-0.322546],[-52.345176,94.276329,-0.322546],[-52.96379,9.438225,-1.357046],[-50.585121,11.229561,-3.085241],[-50.56874,16.647721,-3.097143],[-52.735259,94.276329,-1.523084],[-53.353156,9.438225,-1.746412],[-51.624954,11.229561,-4.125074],[-51.613059,16.646042,-4.141454],[-53.187118,94.276329,-1.974943],[-53.843788,9.438225,-1.996404],[-52.935218,11.229561,-4.792692],[-52.928962,16.644966,-4.811941],[-53.7565,94.276329,-2.265058],[-54.387657,9.438225,-2.08254],[-54.387657,11.229561,-5.022733],[-54.387657,16.644585,-5.042974],[-54.387657,94.276329,-2.365026],[-54.931526,9.438225,-1.996404],[-55.840103,11.229561,-4.792692],[-55.846351,16.644966,-4.811941],[-55.018821,94.276329,-2.265058],[-55.422164,9.438225,-1.746412],[-57.150367,11.229561,-4.125074],[-57.162261,16.646042,-4.141454],[-55.588195,94.276329,-1.974943],[-55.811531,9.438225,-1.357046],[-58.190193,11.229561,-3.085241],[-58.206581,16.647721,-3.097143],[-56.040061,94.276329,-1.523084],[-56.061515,9.438225,-0.866415],[-57.855422,86.821404,-1.449285],[-57.855422,93.296955,-1.449285],[-57.337516,93.296955,-2.465742],[-57.337516,86.818085,-2.465742],[-56.330177,94.276329,-0.953703],[-56.147659,9.438225,-0.322546],[-56.167922,16.65638,-0.322546],[-56.430137,86.825089,-0.322546],[-56.330177,86.821404,-0.953703],[-56.080787,16.654038,-0.872671],[-56.430137,94.276329,-0.322546],[-56.061515,9.438225,0.221323],[-57.855422,86.82877,0.804209],[-57.855422,93.296955,0.804209],[-58.033882,93.296955,-0.322546],[-58.033882,86.825089,-0.322546],[-56.330177,94.276329,0.308619],[-55.811531,9.438225,0.711955],[-58.190193,11.229561,2.440165],[-58.206596,16.656639,2.452082],[-58.877082,16.654526,1.136164],[-58.857803,11.229561,1.129893],[-56.040061,94.276329,0.878001],[-55.422164,9.438225,1.101328],[-56.530853,86.834725,2.627314],[-56.530853,93.296955,2.627314],[-57.337516,93.296955,1.820658],[-57.337516,86.832085,1.820658],[-55.588195,94.276329,1.329859],[-54.931526,9.438225,1.351313],[-55.840095,11.229561,4.147608],[-55.846366,16.659401,4.166895],[-57.162284,16.658318,3.496409],[-57.15036,11.229561,3.47999],[-55.018821,94.276329,1.619975],[-54.387657,9.438225,1.437464],[-54.387657,16.663964,1.457743],[-54.387657,86.837002,1.719935],[-55.018821,86.836418,1.619975],[-54.937797,16.663597,1.370615],[-54.387657,94.276329,1.719935],[-53.843788,9.438225,1.351313],[-52.935218,11.229561,4.147608],[-52.928955,16.659401,4.166895],[-54.387657,16.659767,4.397944],[-54.387657,11.229561,4.37765],[-53.7565,94.276329,1.619975],[-53.353156,9.438225,1.101328],[-53.341232,16.662522,1.117732],[-53.187118,86.834725,1.329859],[-53.7565,86.836418,1.619975],[-53.837516,16.663597,1.370615],[-53.187118,94.276329,1.329859],[-52.96379,9.438225,0.711955],[-52.94738,16.660843,0.723872],[-52.735259,86.832085,0.878001],[-52.735259,94.276329,0.878001],[-52.713798,9.438225,0.221323],[-52.694518,16.65873,0.227595],[-52.445144,86.82877,0.308619],[-52.445144,94.276329,0.308619],[-50.741432,86.825089,-0.322546],[-50.741432,93.296955,-0.322546],[-50.919891,93.296955,0.804209],[-50.919891,86.82877,0.804209],[-50.919891,86.821404,-1.449285],[-50.919891,93.296955,-1.449285],[-50.741432,93.296955,-0.322546],[-50.741432,86.825089,-0.322546],[-51.437805,86.818085,-2.465742],[-51.437805,93.296955,-2.465742],[-52.244461,86.815457,-3.272398],[-52.244461,93.296955,-3.272398],[-53.260917,86.813759,-3.790311],[-53.260917,93.296955,-3.790311],[-54.387657,86.813175,-3.968771],[-54.387657,93.296955,-3.968771],[-55.514404,86.813759,-3.790311],[-55.514404,93.296955,-3.790311],[-56.53086,86.815457,-3.272398],[-56.53086,93.296955,-3.272398],[-56.040061,86.818085,-1.523084],[-55.827911,16.651924,-1.368948],[-59.108116,16.652184,-0.322546],[-59.087852,11.229561,-0.322546],[-55.514404,86.836418,3.145228],[-55.514404,93.296955,3.145228],[-54.387657,86.837002,3.323679],[-54.387657,93.296955,3.323679],[-53.260917,86.836418,3.145228],[-53.260917,93.296955,3.145228],[-52.244461,86.834725,2.627314],[-52.244461,93.296955,2.627314],[-51.437797,86.832085,1.820658],[-51.437797,93.296955,1.820658],[-52.607398,16.65638,-0.322546],[-52.345176,86.825089,-0.322546],[-52.445144,93.296955,-0.953703],[-52.345176,93.296955,-0.322546],[-52.735259,93.296955,-1.523084],[-53.187118,93.296955,-1.974943],[-53.7565,93.296955,-2.265058],[-54.387657,93.296955,-2.365026],[-55.018821,93.296955,-2.265058],[-55.588195,93.296955,-1.974943],[-56.040061,93.296955,-1.523084],[-56.330177,93.296955,-0.953703],[-56.430137,93.296955,-0.322546],[-56.330177,93.296955,0.308619],[-56.040061,93.296955,0.878001],[-55.588195,93.296955,1.329859],[-55.018821,93.296955,1.619975],[-54.387657,93.296955,1.719935],[-53.7565,93.296955,1.619975],[-53.187118,93.296955,1.329859],[-52.735259,93.296955,0.878001],[-52.445144,93.296955,0.308619],[-56.040061,93.296955,-1.523084],[-56.330177,93.296955,-0.953703],[-56.330177,86.82877,0.308619],[-56.430137,93.296955,-0.322546],[-56.330177,93.296955,0.308619],[-55.588195,86.834725,1.329859],[-56.040061,86.832085,0.878001],[-56.040061,93.296955,0.878001],[-55.588195,93.296955,1.329859],[-52.445144,93.296955,0.308619],[-52.345176,93.296955,-0.322546],[-52.445144,86.821404,-0.953703],[-52.345176,86.825089,-0.322546],[-52.345176,93.296955,-0.322546],[-52.445144,93.296955,-0.953703],[-52.735259,86.818085,-1.523084],[-52.735259,93.296955,-1.523084],[-53.187118,86.815457,-1.974943],[-53.187118,93.296955,-1.974943],[-53.7565,86.813759,-2.265058],[-53.7565,93.296955,-2.265058],[-54.387657,86.813175,-2.365026],[-54.387657,93.296955,-2.365026],[-55.018821,86.813759,-2.265058],[-55.018821,93.296955,-2.265058],[-55.588195,86.815457,-1.974943],[-55.588195,93.296955,-1.974943],[-55.018821,93.296955,1.619975],[-54.387657,93.296955,1.719935],[-53.7565,93.296955,1.619975],[-53.187118,93.296955,1.329859],[-52.735259,93.296955,0.878001],[-52.694534,16.654038,-0.872671],[-52.607398,16.65638,-0.322546],[-52.94741,16.651924,-1.368948],[-53.341255,16.650238,-1.762792],[-53.837531,16.649162,-2.015653],[-54.387657,16.648789,-2.102781],[-54.937782,16.649162,-2.015653],[-55.434059,16.650238,-1.762792],[-58.877075,16.649834,-1.78124],[-58.85781,11.229561,-1.774976],[-55.827934,16.660843,0.723872],[-56.080795,16.65873,0.227595],[-55.434081,16.662522,1.117732],[-51.624954,11.229561,3.47999],[-51.613037,16.658318,3.496409],[-50.585128,11.229561,2.440165],[-50.568717,16.656639,2.452082],[-49.91751,11.229561,1.129893],[-49.898231,16.654526,1.136164],[-49.687469,11.229561,-0.322546],[-49.667205,16.652184,-0.322546],[-52.627662,11.233757,-0.322546],[-52.713798,11.233757,-0.866415],[-52.96379,11.233757,-1.357046],[-53.353156,11.233757,-1.746412],[-53.843788,11.233757,-1.996404],[-54.387657,11.233757,-2.08254],[-54.931526,11.233757,-1.996404],[-55.422164,11.233757,-1.746412],[-55.811531,11.233757,-1.357046],[-56.061515,11.233757,-0.866415],[-56.147659,11.233757,-0.322546],[-56.061515,11.233757,0.221323],[-55.811531,11.233757,0.711955],[-55.422164,11.233757,1.101328],[-54.931526,11.233757,1.351313],[-54.387657,11.233757,1.437464],[-53.843788,11.233757,1.351313],[-53.353156,11.233757,1.101328],[-52.96379,11.233757,0.711955],[-52.713798,11.233757,0.221323],[-52.713798,11.233757,-0.866415],[-52.627662,11.233757,-0.322546],[-52.96379,11.233757,-1.357046],[-53.353156,11.233757,-1.746412],[-53.843788,11.233757,-1.996404],[-54.387657,11.233757,-2.08254],[-54.931526,11.233757,-1.996404],[-55.422164,11.233757,-1.746412],[-55.811531,11.233757,-1.357046],[-55.811531,11.233757,0.711955],[-56.061515,11.233757,0.221323],[-54.931526,11.233757,1.351313],[-55.422164,11.233757,1.101328],[-53.843788,11.233757,1.351313],[-54.387657,11.233757,1.437464],[-56.147659,11.233757,-0.322546],[-56.061515,11.233757,-0.866415],[-53.353156,11.233757,1.101328],[-52.96379,11.233757,0.711955],[-52.713798,11.233757,0.221323],[-52.627662,11.233757,-0.322546],[55.731806,9.438225,-0.197835],[55.817946,9.438225,0.346034],[54.057946,9.438225,0.346034],[58.528094,11.229561,-1.106397],[58.54736,16.649834,-1.112661],[58.778401,16.652184,0.346034],[58.758137,11.229561,0.346034],[56.00046,94.276329,-0.285131],[54.057946,94.276329,0.346034],[56.100426,94.276329,0.346034],[55.481816,9.438225,-0.688467],[57.860482,11.229561,-2.416662],[57.876864,16.647721,-2.428564],[55.710347,94.276329,-0.854505],[55.092448,9.438225,-1.077833],[56.820651,11.229561,-3.456495],[56.832549,16.646042,-3.472875],[55.258486,94.276329,-1.306364],[54.601817,9.438225,-1.327825],[55.510386,11.229561,-4.124113],[55.51664,16.644966,-4.143362],[54.689107,94.276329,-1.596479],[54.057946,9.438225,-1.413961],[54.057946,11.229561,-4.354154],[54.057946,16.644585,-4.374395],[54.057946,94.276329,-1.696447],[53.514077,9.438225,-1.327825],[52.605506,11.229561,-4.124113],[52.599252,16.644966,-4.143362],[53.426785,94.276329,-1.596479],[53.023444,9.438225,-1.077833],[51.295242,11.229561,-3.456495],[51.283343,16.646042,-3.472875],[52.857406,94.276329,-1.306364],[52.634077,9.438225,-0.688467],[50.255411,11.229561,-2.416662],[50.239029,16.647721,-2.428564],[52.405545,94.276329,-0.854505],[52.384087,9.438225,-0.197835],[50.59018,86.821404,-0.780706],[50.59018,93.296955,-0.780706],[51.108088,93.296955,-1.797163],[51.108088,86.818085,-1.797163],[52.115432,94.276329,-0.285131],[52.297947,9.438225,0.346034],[52.277682,16.65638,0.346034],[52.015466,86.825089,0.346034],[52.115432,86.821404,-0.285131],[52.364822,16.654038,-0.204092],[52.015466,94.276329,0.346034],[52.384087,9.438225,0.889903],[50.59018,86.82877,1.472788],[50.59018,93.296955,1.472788],[50.411721,93.296955,0.346034],[50.411721,86.825089,0.346034],[52.115432,94.276329,0.977198],[52.634077,9.438225,1.380534],[50.255414,11.229561,3.108744],[50.239008,16.656639,3.120661],[49.56852,16.654526,1.804743],[49.5878,11.229561,1.798472],[52.405545,94.276329,1.54658],[53.023445,9.438225,1.769907],[51.91475,86.834725,3.295893],[51.91475,93.296955,3.295893],[51.108088,93.296955,2.489237],[51.108088,86.832085,2.489237],[52.857407,94.276329,1.998438],[53.514077,9.438225,2.019892],[52.605508,11.229561,4.816187],[52.59924,16.659401,4.835474],[51.283322,16.658318,4.164988],[51.295245,11.229561,4.14857],[53.426785,94.276329,2.288554],[54.057946,9.438225,2.106043],[54.057946,16.663964,2.126322],[54.057946,86.837002,2.388514],[53.426785,86.836418,2.288554],[53.507807,16.663597,2.039195],[54.057946,94.276329,2.388514],[54.601817,9.438225,2.019892],[55.510384,11.229561,4.816187],[55.516656,16.659401,4.835474],[54.057948,16.659767,5.066523],[54.057948,11.229561,5.046229],[54.689108,94.276329,2.288554],[55.092448,9.438225,1.769907],[55.104371,16.662522,1.786311],[55.258486,86.834725,1.998438],[54.689108,86.836418,2.288554],[54.608086,16.663597,2.039195],[55.258486,94.276329,1.998438],[55.481816,9.438225,1.380534],[55.498223,16.660843,1.392451],[55.710347,86.832085,1.54658],[55.710347,94.276329,1.54658],[55.731806,9.438225,0.889903],[55.751086,16.65873,0.896174],[56.00046,86.82877,0.977198],[56.00046,94.276329,0.977198],[57.704171,86.825089,0.346034],[57.704171,93.296955,0.346034],[57.525712,93.296955,1.472788],[57.525712,86.82877,1.472788],[57.525712,86.821404,-0.780706],[57.525712,93.296955,-0.780706],[57.704171,93.296955,0.346034],[57.704171,86.825089,0.346034],[57.007804,86.818085,-1.797163],[57.007804,93.296955,-1.797163],[56.201144,86.815457,-2.603818],[56.201144,93.296955,-2.603818],[55.184691,86.813759,-3.121732],[55.184691,93.296955,-3.121732],[54.057946,86.813175,-3.300191],[54.057946,93.296955,-3.300191],[52.931201,86.813759,-3.121732],[52.931201,93.296955,-3.121732],[51.914749,86.815457,-2.603818],[51.914749,93.296955,-2.603818],[52.405545,86.818085,-0.854505],[52.617694,16.651924,-0.700368],[49.337492,16.652184,0.346034],[49.357756,11.229561,0.346034],[52.931202,86.836418,3.813807],[52.931202,93.296955,3.813807],[54.057948,86.837002,3.992258],[54.057948,93.296955,3.992258],[55.184693,86.836418,3.813807],[55.184693,93.296955,3.813807],[56.201144,86.834725,3.295893],[56.201144,93.296955,3.295893],[57.007805,86.832085,2.489237],[57.007805,93.296955,2.489237],[55.83821,16.65638,0.346034],[56.100426,86.825089,0.346034],[56.00046,93.296955,-0.285131],[56.100426,93.296955,0.346034],[55.710347,93.296955,-0.854505],[55.258486,93.296955,-1.306364],[54.689107,93.296955,-1.596479],[54.057946,93.296955,-1.696447],[53.426785,93.296955,-1.596479],[52.857406,93.296955,-1.306364],[52.405545,93.296955,-0.854505],[52.115432,93.296955,-0.285131],[52.015466,93.296955,0.346034],[52.115432,93.296955,0.977198],[52.405545,93.296955,1.54658],[52.857407,93.296955,1.998438],[53.426785,93.296955,2.288554],[54.057946,93.296955,2.388514],[54.689108,93.296955,2.288554],[55.258486,93.296955,1.998438],[55.710347,93.296955,1.54658],[56.00046,93.296955,0.977198],[52.405545,93.296955,-0.854505],[52.115432,93.296955,-0.285131],[52.115432,86.82877,0.977198],[52.015466,93.296955,0.346034],[52.115432,93.296955,0.977198],[52.857407,86.834725,1.998438],[52.405545,86.832085,1.54658],[52.405545,93.296955,1.54658],[52.857407,93.296955,1.998438],[56.00046,93.296955,0.977198],[56.100426,93.296955,0.346034],[56.00046,86.821404,-0.285131],[56.100426,86.825089,0.346034],[56.100426,93.296955,0.346034],[56.00046,93.296955,-0.285131],[55.710347,86.818085,-0.854505],[55.710347,93.296955,-0.854505],[55.258486,86.815457,-1.306364],[55.258486,93.296955,-1.306364],[54.689107,86.813759,-1.596479],[54.689107,93.296955,-1.596479],[54.057946,86.813175,-1.696447],[54.057946,93.296955,-1.696447],[53.426785,86.813759,-1.596479],[53.426785,93.296955,-1.596479],[52.857406,86.815457,-1.306364],[52.857406,93.296955,-1.306364],[53.426785,93.296955,2.288554],[54.057946,93.296955,2.388514],[54.689108,93.296955,2.288554],[55.258486,93.296955,1.998438],[55.710347,93.296955,1.54658],[55.751071,16.654038,-0.204092],[55.83821,16.65638,0.346034],[55.498198,16.651924,-0.700368],[55.104348,16.650238,-1.094213],[54.608071,16.649162,-1.347074],[54.057946,16.648789,-1.434202],[53.507823,16.649162,-1.347074],[53.011546,16.650238,-1.094213],[49.568533,16.649834,-1.112661],[49.587799,11.229561,-1.106397],[52.617671,16.660843,1.392451],[52.364808,16.65873,0.896174],[53.011521,16.662522,1.786311],[56.820649,11.229561,4.14857],[56.832572,16.658318,4.164988],[57.86048,11.229561,3.108744],[57.876885,16.656639,3.120661],[58.528092,11.229561,1.798472],[58.547371,16.654526,1.804743],[58.758137,11.229561,0.346034],[58.778401,16.652184,0.346034],[55.817946,11.233757,0.346034],[55.731806,11.233757,-0.197835],[55.481816,11.233757,-0.688467],[55.092448,11.233757,-1.077833],[54.601817,11.233757,-1.327825],[54.057946,11.233757,-1.413961],[53.514077,11.233757,-1.327825],[53.023444,11.233757,-1.077833],[52.634077,11.233757,-0.688467],[52.384087,11.233757,-0.197835],[52.297947,11.233757,0.346034],[52.384087,11.233757,0.889903],[52.634077,11.233757,1.380534],[53.023445,11.233757,1.769907],[53.514077,11.233757,2.019892],[54.057946,11.233757,2.106043],[54.601817,11.233757,2.019892],[55.092448,11.233757,1.769907],[55.481816,11.233757,1.380534],[55.731806,11.233757,0.889903],[55.731806,11.233757,-0.197835],[55.817946,11.233757,0.346034],[55.481816,11.233757,-0.688467],[55.092448,11.233757,-1.077833],[54.601817,11.233757,-1.327825],[54.057946,11.233757,-1.413961],[53.514077,11.233757,-1.327825],[53.023444,11.233757,-1.077833],[52.634077,11.233757,-0.688467],[52.634077,11.233757,1.380534],[52.384087,11.233757,0.889903],[53.514077,11.233757,2.019892],[53.023445,11.233757,1.769907],[54.601817,11.233757,2.019892],[54.057946,11.233757,2.106043],[52.297947,11.233757,0.346034],[52.384087,11.233757,-0.197835],[55.092448,11.233757,1.769907],[55.481816,11.233757,1.380534],[55.731806,11.233757,0.889903],[55.817946,11.233757,0.346034],[1.28938,9.438225,54.210612],[1.375519,9.438225,54.754481],[-0.384479,9.438225,54.754481],[4.085667,11.229561,53.302042],[4.104935,16.649834,53.295786],[4.335976,16.652184,54.754481],[4.315713,11.229561,54.754481],[1.558034,94.276329,54.123316],[-0.384479,94.276329,54.754481],[1.658001,94.276329,54.754481],[1.039391,9.438225,53.719981],[3.418057,11.229561,51.991785],[3.434437,16.647721,51.979884],[1.267922,94.276329,53.55395],[0.650025,9.438225,53.330607],[2.378224,11.229561,50.951945],[2.390122,16.646042,50.935572],[0.81606,94.276329,53.102076],[0.15939,9.438225,53.080622],[1.067959,11.229561,50.284342],[1.074215,16.644966,50.265086],[0.246682,94.276329,52.811976],[-0.384479,9.438225,52.994486],[-0.384479,11.229561,50.054301],[-0.384479,16.644585,50.034052],[-0.384479,94.276329,52.712],[-0.928348,9.438225,53.080622],[-1.836917,11.229561,50.284342],[-1.843173,16.644966,50.265086],[-1.01564,94.276329,52.811976],[-1.418983,9.438225,53.330607],[-3.147182,11.229561,50.951945],[-3.15908,16.646042,50.935572],[-1.585018,94.276329,53.102076],[-1.808349,9.438225,53.719981],[-4.187015,11.229561,51.991785],[-4.203395,16.647721,51.979884],[-2.03688,94.276329,53.55395],[-2.058338,9.438225,54.210612],[-3.852245,86.821404,53.627741],[-3.852245,93.296955,53.627741],[-3.334339,93.296955,52.611292],[-3.334339,86.818085,52.611292],[-2.326991,94.276329,54.123316],[-2.144477,9.438225,54.754481],[-2.164741,16.65638,54.754481],[-2.426959,86.825089,54.754481],[-2.326991,86.821404,54.123316],[-2.077602,16.654038,54.204356],[-2.426959,94.276329,54.754481],[-2.058338,9.438225,55.29835],[-3.852245,86.82877,55.881236],[-3.852245,93.296955,55.881236],[-4.030704,93.296955,54.754481],[-4.030704,86.825089,54.754481],[-2.326991,94.276329,55.385645],[-1.808349,9.438225,55.788981],[-4.187011,11.229561,57.517191],[-4.203418,16.656639,57.529108],[-4.873905,16.654526,56.213191],[-4.854625,11.229561,56.206919],[-2.03688,94.276329,55.955027],[-1.418979,9.438225,56.178355],[-2.527675,86.834725,57.70434],[-2.527675,93.296955,57.70434],[-3.334339,93.296955,56.897685],[-3.334339,86.832085,56.897685],[-1.585018,94.276329,56.406886],[-0.928348,9.438225,56.428339],[-1.836917,11.229561,59.224635],[-1.843185,16.659401,59.243922],[-3.159103,16.658318,58.573435],[-3.147178,11.229561,58.557017],[-1.01564,94.276329,56.697001],[-0.384479,9.438225,56.514491],[-0.384479,16.663964,56.534769],[-0.384479,86.837002,56.796961],[-1.01564,86.836418,56.697001],[-0.934619,16.663597,56.447642],[-0.384479,94.276329,56.796961],[0.15939,9.438225,56.428339],[1.067959,11.229561,59.224635],[1.074231,16.659401,59.243922],[-0.384479,16.659767,59.47497],[-0.384479,11.229561,59.454676],[0.246682,94.276329,56.697001],[0.650025,9.438225,56.178355],[0.661946,16.662522,56.194758],[0.81606,86.834725,56.406886],[0.246682,86.836418,56.697001],[0.165661,16.663597,56.447642],[0.81606,94.276329,56.406886],[1.039391,9.438225,55.788981],[1.055798,16.660843,55.800898],[1.267922,86.832085,55.955027],[1.267922,94.276329,55.955027],[1.28938,9.438225,55.29835],[1.308659,16.65873,55.304621],[1.558034,86.82877,55.385645],[1.558034,94.276329,55.385645],[3.261746,86.825089,54.754481],[3.261746,93.296955,54.754481],[3.083287,93.296955,55.881236],[3.083287,86.82877,55.881236],[3.083287,86.821404,53.627741],[3.083287,93.296955,53.627741],[3.261746,93.296955,54.754481],[3.261746,86.825089,54.754481],[2.565381,86.818085,52.611292],[2.565381,93.296955,52.611292],[1.758717,86.815457,51.804621],[1.758717,93.296955,51.804621],[0.742268,86.813759,51.286723],[0.742268,93.296955,51.286723],[-0.384479,86.813175,51.108256],[-0.384479,93.296955,51.108256],[-1.511226,86.813759,51.286723],[-1.511226,93.296955,51.286723],[-2.527675,86.815457,51.804621],[-2.527675,93.296955,51.804621],[-2.03688,86.818085,53.55395],[-1.824729,16.651924,53.708079],[-5.104934,16.652184,54.754481],[-5.08467,11.229561,54.754481],[-1.511222,86.836418,58.222254],[-1.511222,93.296955,58.222254],[-0.384479,86.837002,58.400706],[-0.384479,93.296955,58.400706],[0.742268,86.836418,58.222254],[0.742268,93.296955,58.222254],[1.758717,86.834725,57.70434],[1.758717,93.296955,57.70434],[2.565381,86.832085,56.897685],[2.565381,93.296955,56.897685],[1.395783,16.65638,54.754481],[1.658001,86.825089,54.754481],[1.558034,93.296955,54.123316],[1.658001,93.296955,54.754481],[1.267922,93.296955,53.55395],[0.81606,93.296955,53.102076],[0.246682,93.296955,52.811976],[-0.384479,93.296955,52.712],[-1.01564,93.296955,52.811976],[-1.585018,93.296955,53.102076],[-2.03688,93.296955,53.55395],[-2.326991,93.296955,54.123316],[-2.426959,93.296955,54.754481],[-2.326991,93.296955,55.385645],[-2.03688,93.296955,55.955027],[-1.585018,93.296955,56.406886],[-1.01564,93.296955,56.697001],[-0.384479,93.296955,56.796961],[0.246682,93.296955,56.697001],[0.81606,93.296955,56.406886],[1.267922,93.296955,55.955027],[1.558034,93.296955,55.385645],[-2.03688,93.296955,53.55395],[-2.326991,93.296955,54.123316],[-2.326991,86.82877,55.385645],[-2.426959,93.296955,54.754481],[-2.326991,93.296955,55.385645],[-1.585018,86.834725,56.406886],[-2.03688,86.832085,55.955027],[-2.03688,93.296955,55.955027],[-1.585018,93.296955,56.406886],[1.558034,93.296955,55.385645],[1.658001,93.296955,54.754481],[1.558034,86.821404,54.123316],[1.658001,86.825089,54.754481],[1.658001,93.296955,54.754481],[1.558034,93.296955,54.123316],[1.267922,86.818085,53.55395],[1.267922,93.296955,53.55395],[0.81606,86.815457,53.102076],[0.81606,93.296955,53.102076],[0.246682,86.813759,52.811976],[0.246682,93.296955,52.811976],[-0.384479,86.813175,52.712],[-0.384479,93.296955,52.712],[-1.01564,86.813759,52.811976],[-1.01564,93.296955,52.811976],[-1.585018,86.815457,53.102076],[-1.585018,93.296955,53.102076],[-1.01564,93.296955,56.697001],[-0.384479,93.296955,56.796961],[0.246682,93.296955,56.697001],[0.81606,93.296955,56.406886],[1.267922,93.296955,55.955027],[1.308644,16.654038,54.204356],[1.395783,16.65638,54.754481],[1.055771,16.651924,53.708079],[0.661923,16.650238,53.314234],[0.165646,16.649162,53.061381],[-0.384479,16.648789,52.974238],[-0.934604,16.649162,53.061381],[-1.430881,16.650238,53.314234],[-4.873893,16.649834,53.295786],[-4.854625,11.229561,53.302042],[-1.824756,16.660843,55.800898],[-2.077617,16.65873,55.304621],[-1.430904,16.662522,56.194758],[2.378224,11.229561,58.557017],[2.390145,16.658318,58.573435],[3.418053,11.229561,57.517191],[3.43446,16.656639,57.529108],[4.085667,11.229561,56.206919],[4.104947,16.654526,56.213191],[4.315713,11.229561,54.754481],[4.335976,16.652184,54.754481],[1.375519,11.233757,54.754481],[1.28938,11.233757,54.210612],[1.039391,11.233757,53.719981],[0.650025,11.233757,53.330607],[0.15939,11.233757,53.080622],[-0.384479,11.233757,52.994486],[-0.928348,11.233757,53.080622],[-1.418983,11.233757,53.330607],[-1.808349,11.233757,53.719981],[-2.058338,11.233757,54.210612],[-2.144477,11.233757,54.754481],[-2.058338,11.233757,55.29835],[-1.808349,11.233757,55.788981],[-1.418979,11.233757,56.178355],[-0.928348,11.233757,56.428339],[-0.384479,11.233757,56.514491],[0.15939,11.233757,56.428339],[0.650025,11.233757,56.178355],[1.039391,11.233757,55.788981],[1.28938,11.233757,55.29835],[1.28938,11.233757,54.210612],[1.375519,11.233757,54.754481],[1.039391,11.233757,53.719981],[0.650025,11.233757,53.330607],[0.15939,11.233757,53.080622],[-0.384479,11.233757,52.994486],[-0.928348,11.233757,53.080622],[-1.418983,11.233757,53.330607],[-1.808349,11.233757,53.719981],[-1.808349,11.233757,55.788981],[-2.058338,11.233757,55.29835],[-0.928348,11.233757,56.428339],[-1.418979,11.233757,56.178355],[0.15939,11.233757,56.428339],[-0.384479,11.233757,56.514491],[-2.144477,11.233757,54.754481],[-2.058338,11.233757,54.210612],[0.650025,11.233757,56.178355],[1.039391,11.233757,55.788981],[1.28938,11.233757,55.29835],[1.375519,11.233757,54.754481],[1.289364,9.438225,-55.240804],[1.375504,9.438225,-54.696935],[-0.384494,9.438225,-54.696935],[4.085652,11.229561,-56.149374],[4.10492,16.649834,-56.15563],[4.335961,16.652184,-54.696935],[4.315697,11.229561,-54.696935],[1.558018,94.276329,-55.328092],[-0.384494,94.276329,-54.696935],[1.657986,94.276329,-54.696935],[1.039376,9.438225,-55.731435],[3.418042,11.229561,-57.459638],[3.434422,16.647721,-57.47154],[1.267907,94.276329,-55.897474],[0.65001,9.438225,-56.120802],[2.378209,11.229561,-58.499471],[2.390107,16.646042,-58.515844],[0.816044,94.276329,-56.349332],[0.159375,9.438225,-56.370794],[1.067944,11.229561,-59.167081],[1.0742,16.644966,-59.18633],[0.246667,94.276329,-56.639448],[-0.384494,9.438225,-56.456937],[-0.384494,11.229561,-59.397123],[-0.384494,16.644585,-59.417364],[-0.384494,94.276329,-56.739416],[-0.928363,9.438225,-56.370794],[-1.836933,11.229561,-59.167081],[-1.843189,16.644966,-59.18633],[-1.015655,94.276329,-56.639448],[-1.418998,9.438225,-56.120802],[-3.147197,11.229561,-58.499471],[-3.159095,16.646042,-58.515844],[-1.585033,94.276329,-56.349332],[-1.808364,9.438225,-55.731435],[-4.18703,11.229561,-57.459638],[-4.203411,16.647721,-57.47154],[-2.036895,94.276329,-55.897474],[-2.058353,9.438225,-55.240804],[-3.85226,86.821404,-55.823682],[-3.85226,93.296955,-55.823682],[-3.334354,93.296955,-56.840131],[-3.334354,86.818085,-56.840131],[-2.327007,94.276329,-55.328092],[-2.144493,9.438225,-54.696935],[-2.164756,16.65638,-54.696935],[-2.426975,86.825089,-54.696935],[-2.327007,86.821404,-55.328092],[-2.077617,16.654038,-55.247068],[-2.426975,94.276329,-54.696935],[-2.058353,9.438225,-54.153066],[-3.85226,86.82877,-53.570188],[-3.85226,93.296955,-53.570188],[-4.030719,93.296955,-54.696935],[-4.030719,86.825089,-54.696935],[-2.327007,94.276329,-54.065771],[-1.808364,9.438225,-53.662435],[-4.187026,11.229561,-51.934232],[-4.203433,16.656639,-51.922308],[-4.87392,16.654526,-53.238226],[-4.85464,11.229561,-53.244497],[-2.036895,94.276329,-53.496397],[-1.418994,9.438225,-53.273061],[-2.52769,86.834725,-51.747076],[-2.52769,93.296955,-51.747076],[-3.334354,93.296955,-52.553739],[-3.334354,86.832085,-52.553739],[-1.585033,94.276329,-53.04453],[-0.928363,9.438225,-53.023077],[-1.836933,11.229561,-50.226789],[-1.8432,16.659401,-50.207494],[-3.159118,16.658318,-50.877988],[-3.147193,11.229561,-50.894399],[-1.015655,94.276329,-52.754423],[-0.384494,9.438225,-52.936933],[-0.384494,16.663964,-52.916647],[-0.384494,86.837002,-52.654455],[-1.015655,86.836418,-52.754423],[-0.934635,16.663597,-53.003782],[-0.384494,94.276329,-52.654455],[0.159375,9.438225,-53.023077],[1.067944,11.229561,-50.226789],[1.074215,16.659401,-50.207494],[-0.384494,16.659767,-49.976453],[-0.384494,11.229561,-49.996748],[0.246667,94.276329,-52.754423],[0.65001,9.438225,-53.273069],[0.661931,16.662522,-53.256658],[0.816044,86.834725,-53.04453],[0.246667,86.836418,-52.754423],[0.165646,16.663597,-53.003782],[0.816044,94.276329,-53.04453],[1.039376,9.438225,-53.662435],[1.055783,16.660843,-53.65051],[1.267907,86.832085,-53.496397],[1.267907,94.276329,-53.496397],[1.289364,9.438225,-54.153066],[1.308644,16.65873,-54.146802],[1.558018,86.82877,-54.065771],[1.558018,94.276329,-54.065771],[3.261731,86.825089,-54.696935],[3.261731,93.296955,-54.696935],[3.083272,93.296955,-53.570188],[3.083272,86.82877,-53.570188],[3.083272,86.821404,-55.823682],[3.083272,93.296955,-55.823682],[3.261731,93.296955,-54.696935],[3.261731,86.825089,-54.696935],[2.565365,86.818085,-56.840131],[2.565365,93.296955,-56.840131],[1.758702,86.815457,-57.646795],[1.758702,93.296955,-57.646795],[0.742253,86.813759,-58.164701],[0.742253,93.296955,-58.164701],[-0.384494,86.813175,-58.34316],[-0.384494,93.296955,-58.34316],[-1.511241,86.813759,-58.164701],[-1.511241,93.296955,-58.164701],[-2.52769,86.815457,-57.646795],[-2.52769,93.296955,-57.646795],[-2.036895,86.818085,-55.897474],[-1.824745,16.651924,-55.743337],[-5.104949,16.652184,-54.696935],[-5.084686,11.229561,-54.696935],[-1.511238,86.836418,-51.229169],[-1.511238,93.296955,-51.229169],[-0.384494,86.837002,-51.05071],[-0.384494,93.296955,-51.05071],[0.742253,86.836418,-51.229169],[0.742253,93.296955,-51.229169],[1.758702,86.834725,-51.747076],[1.758702,93.296955,-51.747076],[2.565365,86.832085,-52.553739],[2.565365,93.296955,-52.553739],[1.395768,16.65638,-54.696935],[1.657986,86.825089,-54.696935],[1.558018,93.296955,-55.328092],[1.657986,93.296955,-54.696935],[1.267907,93.296955,-55.897474],[0.816044,93.296955,-56.349332],[0.246667,93.296955,-56.639448],[-0.384494,93.296955,-56.739416],[-1.015655,93.296955,-56.639448],[-1.585033,93.296955,-56.349332],[-2.036895,93.296955,-55.897474],[-2.327007,93.296955,-55.328092],[-2.426975,93.296955,-54.696935],[-2.327007,93.296955,-54.065771],[-2.036895,93.296955,-53.496397],[-1.585033,93.296955,-53.04453],[-1.015655,93.296955,-52.754423],[-0.384494,93.296955,-52.654455],[0.246667,93.296955,-52.754423],[0.816044,93.296955,-53.04453],[1.267907,93.296955,-53.496397],[1.558018,93.296955,-54.065771],[-2.036895,93.296955,-55.897474],[-2.327007,93.296955,-55.328092],[-2.327007,86.82877,-54.065771],[-2.426975,93.296955,-54.696935],[-2.327007,93.296955,-54.065771],[-1.585033,86.834725,-53.04453],[-2.036895,86.832085,-53.496397],[-2.036895,93.296955,-53.496397],[-1.585033,93.296955,-53.04453],[1.558018,93.296955,-54.065771],[1.657986,93.296955,-54.696935],[1.558018,86.821404,-55.328092],[1.657986,86.825089,-54.696935],[1.657986,93.296955,-54.696935],[1.558018,93.296955,-55.328092],[1.267907,86.818085,-55.897474],[1.267907,93.296955,-55.897474],[0.816044,86.815457,-56.349332],[0.816044,93.296955,-56.349332],[0.246667,86.813759,-56.639448],[0.246667,93.296955,-56.639448],[-0.384494,86.813175,-56.739416],[-0.384494,93.296955,-56.739416],[-1.015655,86.813759,-56.639448],[-1.015655,93.296955,-56.639448],[-1.585033,86.815457,-56.349332],[-1.585033,93.296955,-56.349332],[-1.015655,93.296955,-52.754423],[-0.384494,93.296955,-52.654455],[0.246667,93.296955,-52.754423],[0.816044,93.296955,-53.04453],[1.267907,93.296955,-53.496397],[1.308629,16.654038,-55.247068],[1.395768,16.65638,-54.696935],[1.055756,16.651924,-55.743337],[0.661908,16.650238,-56.137182],[0.165631,16.649162,-56.390043],[-0.384494,16.648789,-56.477171],[-0.934619,16.649162,-56.390043],[-1.430896,16.650238,-56.137182],[-4.873908,16.649834,-56.15563],[-4.85464,11.229561,-56.149374],[-1.824771,16.660843,-53.65051],[-2.077632,16.65873,-54.146802],[-1.430919,16.662522,-53.256658],[2.378209,11.229561,-50.894399],[2.39013,16.658318,-50.877988],[3.418038,11.229561,-51.934232],[3.434445,16.656639,-51.922315],[4.085652,11.229561,-53.244497],[4.104931,16.654526,-53.238233],[4.315697,11.229561,-54.696935],[4.335961,16.652184,-54.696935],[1.375504,11.233757,-54.696935],[1.289364,11.233757,-55.240804],[1.039376,11.233757,-55.731435],[0.65001,11.233757,-56.120802],[0.159375,11.233757,-56.370794],[-0.384494,11.233757,-56.456937],[-0.928363,11.233757,-56.370794],[-1.418998,11.233757,-56.120802],[-1.808364,11.233757,-55.731435],[-2.058353,11.233757,-55.240804],[-2.144493,11.233757,-54.696935],[-2.058353,11.233757,-54.153066],[-1.808364,11.233757,-53.662435],[-1.418994,11.233757,-53.273061],[-0.928363,11.233757,-53.023077],[-0.384494,11.233757,-52.936933],[0.159375,11.233757,-53.023077],[0.65001,11.233757,-53.273069],[1.039376,11.233757,-53.662435],[1.289364,11.233757,-54.153066],[1.289364,11.233757,-55.240804],[1.375504,11.233757,-54.696935],[1.039376,11.233757,-55.731435],[0.65001,11.233757,-56.120802],[0.159375,11.233757,-56.370794],[-0.384494,11.233757,-56.456937],[-0.928363,11.233757,-56.370794],[-1.418998,11.233757,-56.120802],[-1.808364,11.233757,-55.731435],[-1.808364,11.233757,-53.662435],[-2.058353,11.233757,-54.153066],[-0.928363,11.233757,-53.023077],[-1.418994,11.233757,-53.273061],[0.159375,11.233757,-53.023077],[-0.384494,11.233757,-52.936933],[-2.144493,11.233757,-54.696935],[-2.058353,11.233757,-55.240804],[0.65001,11.233757,-53.273069],[1.039376,11.233757,-53.662435],[1.289364,11.233757,-54.153066],[1.375504,11.233757,-54.696935],[59.752339,0,-60.715505],[84.645913,0,-0.254339],[-0.346061,0,-0.254339],[59.752339,0,-60.715505],[59.752339,3.035423,-60.715505],[84.645913,3.035423,-0.254339],[84.645913,0,-0.254339],[59.752339,6.070854,-60.715505],[84.645913,6.070854,-0.254339],[59.752339,9.106278,-60.715505],[84.645913,9.106278,-0.254339],[60.115105,12.187508,-60.715505],[85.158944,12.187508,-0.254339],[60.115105,12.187508,-60.715505],[-0.346061,12.187508,-0.254339],[85.158944,12.187508,-0.254339],[-0.346065,0,-85.759336],[5.885304,0,-100.712926],[5.885304,3.035423,-100.712926],[65.983712,3.035423,-75.669103],[65.983712,0,-75.669103],[3.808182,3.035423,-95.728399],[3.808182,6.070854,-95.728399],[63.906586,6.070854,-70.684568],[63.906586,3.035423,-70.684568],[1.807988,6.070854,-90.92848],[1.807988,9.106278,-90.92848],[61.906392,9.106278,-65.884649],[61.906392,6.070854,-65.884649],[-0.346065,9.106278,-85.759336],[-0.346065,12.187508,-85.759336],[-0.346065,12.187508,-85.759336],[-60.444465,0,-60.715498],[-60.444465,0,-60.715498],[-60.444465,3.035423,-60.715498],[-0.346065,3.035423,-85.759336],[-0.346065,0,-85.759336],[-60.444465,6.070854,-60.715498],[-0.346065,6.070854,-85.759336],[-60.444465,9.106278,-60.715498],[-60.807228,12.187508,-60.715498],[-60.807228,12.187508,-60.715498],[-85.338035,0,-0.254324],[-100.318016,0,-6.42201],[-100.318016,3.035423,-6.42201],[-75.424438,3.035423,-66.883176],[-75.424438,0,-66.883176],[-95.324684,3.035423,-4.366117],[-95.324684,6.070854,-4.366117],[-70.431114,6.070854,-64.827283],[-70.431114,3.035423,-64.827283],[-90.516296,6.070854,-2.386365],[-90.516296,9.106278,-2.386365],[-65.622726,9.106278,-62.847539],[-65.622726,6.070854,-62.847539],[-85.338035,9.106278,-0.254324],[-85.851066,12.187508,-0.254324],[-85.851066,12.187508,-0.254324],[-60.444457,0,60.206843],[-60.444457,0,60.206843],[-60.444457,3.035423,60.206843],[-85.338035,3.035423,-0.254324],[-85.338035,0,-0.254324],[-60.444457,6.070854,60.206843],[-85.338035,6.070854,-0.254324],[-60.444457,9.106278,60.206843],[-60.807228,12.187508,60.206843],[-60.807228,12.187508,60.206843],[-0.34605,0,85.250666],[-6.577419,0,100.204264],[-6.577419,3.035423,100.204264],[-66.675826,3.035423,75.160426],[-66.675826,0,75.160426],[-4.500297,3.035423,95.219721],[-4.500297,6.070854,95.219721],[-64.598701,6.070854,70.175898],[-64.598701,3.035423,70.175898],[-2.500102,6.070854,90.41981],[-2.500102,9.106278,90.41981],[-62.59851,9.106278,65.375971],[-62.59851,6.070854,65.375971],[-0.34605,9.106278,85.250666],[-0.34605,12.187508,85.250666],[-0.34605,12.187508,85.250666],[59.75235,0,60.206812],[59.75235,0,60.206812],[59.75235,3.035423,60.206812],[-0.34605,3.035423,85.250666],[-0.34605,0,85.250666],[59.75235,6.070854,60.206812],[-0.34605,6.070854,85.250666],[59.75235,9.106278,60.206812],[60.115117,12.187508,60.206812],[60.115117,12.187508,60.206812],[99.625886,0,5.91334],[99.625886,3.035423,5.91334],[74.732323,3.035423,66.374506],[74.732323,0,66.374506],[94.632561,3.035423,3.857447],[94.632561,6.070854,3.857447],[69.738999,6.070854,64.318598],[69.738999,3.035423,64.318598],[89.824174,6.070854,1.877696],[89.824174,9.106278,1.877696],[64.930611,9.106278,62.338862],[64.930611,6.070854,62.338862],[84.645913,9.106278,-0.254339],[85.158944,12.187508,-0.254339],[1.807988,0,-90.92848],[61.906392,0,-65.884649],[1.807988,3.035423,-90.92848],[61.906392,3.035423,-65.884649],[-90.516296,0,-2.386365],[-65.622726,0,-62.847539],[-90.516296,3.035423,-2.386365],[-65.622726,3.035423,-62.847539],[-2.500102,0,90.41981],[-62.59851,0,65.375971],[-2.500102,3.035423,90.41981],[-62.59851,3.035423,65.375971],[84.645913,0,-0.254339],[89.824174,0,1.877696],[64.930611,0,62.338862],[84.645913,3.035423,-0.254339],[89.824174,3.035423,1.877696],[64.930611,3.035423,62.338862],[84.645913,6.070854,-0.254339],[3.808182,0,-95.728399],[63.906586,0,-70.684568],[-95.324684,0,-4.366117],[-70.431114,0,-64.827283],[-4.500297,0,95.219721],[-64.598701,0,70.175898],[94.632561,0,3.857447],[69.738999,0,64.318598],[35.009278,93.33799,-35.446012],[49.653939,93.33799,-0.090673],[-0.346061,93.33799,-0.090673],[52.612717,93.33799,-53.049451],[52.612717,96.46299,-53.049451],[74.548958,96.46299,-0.090673],[74.548958,93.33799,-0.090673],[44.018735,96.46299,-44.174718],[31.679715,101.865816,-31.835699],[44.746708,101.865816,-0.28919],[62.196713,96.46299,-0.28919],[32.89861,101.865816,-33.33534],[32.89861,104.689253,-33.33534],[46.669007,104.689253,-0.090673],[46.669007,101.865816,-0.090673],[31.8821,104.689253,-31.347105],[18.646397,114.650044,-18.111402],[25.826222,114.650044,-0.777776],[44.544327,104.689253,-0.777776],[18.226546,114.936747,-17.583181],[25.155789,114.936697,-0.854589],[25.826222,114.650044,-0.777776],[18.646397,114.650044,-18.111402],[2.638199,125.066454,-2.424917],[2.713383,125.553162,-2.242948],[2.76186,124.753163,-2.125616],[2.713383,128.898188,-2.242948],[2.216527,129.518137,-2.659757],[3.277894,129.518307,-0.090673],[3.335328,128.898188,-0.73763],[1.248738,134.61434,-1.685537],[1.248738,135.617205,-1.685537],[1.907685,135.617205,-0.090658],[1.907685,134.61434,-0.090658],[-0.279716,146.690781,-0.157186],[-0.346061,146.690781,-0.090658],[-0.252235,146.690781,-0.090658],[-0.346065,93.33799,-50.090673],[-0.346065,93.33799,-74.985693],[-0.346065,96.46299,-74.985693],[-0.147548,96.46299,-62.633443],[-0.147548,101.865816,-45.183439],[31.398972,101.865816,-32.116445],[43.737988,96.46299,-44.455465],[-0.346065,101.865816,-47.105733],[-0.346065,104.689253,-47.105733],[0.34105,104.689253,-44.981054],[0.34105,114.650044,-26.262952],[17.674674,114.650044,-19.083128],[30.910374,104.689253,-32.31883],[0.442662,114.9368,-25.582296],[0.442608,124.753163,-3.721876],[1.657826,124.753163,-3.217237],[17.121342,114.936751,-18.673788],[0.300416,125.553162,-3.78092],[0.300416,128.898188,-3.78092],[1.799611,128.898188,-3.158361],[1.799611,125.553162,-3.158361],[-0.346061,129.517967,-3.724004],[-0.346061,134.61434,-2.347799],[-0.346061,135.617205,-2.347799],[-0.346061,146.690781,-0.184728],[-35.701408,93.33799,-35.446004],[-53.304847,93.33799,-53.049444],[-53.304847,96.46299,-53.049444],[-44.430114,96.46299,-44.455465],[-32.091094,101.865816,-32.116445],[-0.544578,101.865816,-45.183439],[-0.544578,96.46299,-62.633443],[-33.590736,101.865816,-33.33534],[-33.590736,104.689253,-33.33534],[-31.6025,104.689253,-32.318822],[-18.366798,114.650044,-19.083128],[-1.033176,114.650044,-26.262952],[-1.033176,104.689253,-44.981054],[-2.349948,124.753163,-3.217237],[-1.134731,124.753163,-3.721876],[-1.134788,114.9368,-25.582296],[-17.813468,114.936751,-18.673788],[-2.491733,125.553162,-3.158361],[-0.992538,125.553162,-3.78092],[-2.908649,129.518137,-2.659757],[-0.346061,129.517967,-3.724004],[-0.992538,128.898188,-3.78092],[-2.491733,128.898188,-3.158361],[-1.94086,134.61434,-1.685537],[-1.94086,135.617205,-1.685537],[-0.412406,146.690781,-0.157186],[-50.346061,93.33799,-0.090673],[-75.241081,93.33799,-0.090673],[-75.241081,96.46299,-0.090673],[-62.888832,96.46299,-0.28919],[-45.438835,101.865816,-0.28919],[-32.371841,101.865816,-31.835699],[-44.710861,96.46299,-44.174718],[-47.361129,101.865816,-0.090673],[-47.361129,104.689253,-0.090673],[-45.23645,104.689253,-0.777776],[-26.518344,114.650044,-0.777776],[-19.338523,114.650044,-18.111402],[-32.574226,104.689253,-31.347105],[-26.507873,114.658523,-0.757452],[-25.847911,114.936697,-0.854581],[-3.979057,124.753163,-0.854749],[-4.02745,125.553162,-0.73763],[-3.405506,125.553162,-2.242948],[-3.453983,124.753163,-2.125616],[-3.970016,129.518307,-0.090673],[-2.908649,129.518137,-2.659757],[-3.405506,128.898188,-2.242948],[-4.02745,128.898188,-0.73763],[-2.599803,134.61434,-0.090658],[-2.599803,135.617205,-0.090658],[-0.439887,146.690781,-0.090658],[-35.701393,93.33799,35.264674],[-53.304832,93.33799,52.868113],[-53.304832,96.46299,52.868113],[-44.710853,96.46299,43.993372],[-32.371833,101.865816,31.654368],[-45.438835,101.865816,0.107844],[-62.888832,96.46299,0.107844],[-33.590728,101.865816,33.154002],[-33.590728,104.689253,33.154002],[-32.574218,104.689253,31.165766],[-19.338516,114.650044,17.930064],[-26.518344,114.650044,0.596446],[-45.23645,104.689253,0.596446],[-18.918666,114.936747,17.40185],[-25.847911,114.936697,0.673258],[-26.518344,114.650044,0.596446],[-19.338516,114.650044,17.930064],[-3.405506,125.553162,2.06161],[-3.405506,128.898188,2.06161],[-4.02745,128.898188,0.556284],[-4.02745,125.553162,0.556284],[-2.908649,129.518137,2.478419],[-3.970016,129.518307,-0.090673],[-1.94086,134.61434,1.504206],[-1.94086,135.617205,1.504206],[-0.412406,146.690781,-0.024145],[-0.346054,93.33799,49.909327],[-0.346054,93.33799,74.804347],[-0.346054,96.46299,74.804347],[-0.54457,96.46299,62.452097],[-0.54457,101.865816,45.0021],[-32.091087,101.865816,31.935114],[-44.430107,96.46299,44.274119],[-0.346054,101.865816,46.924403],[-0.346054,104.689253,46.924403],[-1.033168,104.689253,44.799708],[-1.033172,114.650044,26.081614],[-18.366794,114.650044,18.901789],[-31.602493,104.689253,32.137492],[-1.134784,114.9368,25.40095],[-1.134731,124.753163,3.540537],[-2.349948,124.753163,3.035899],[-17.813461,114.936751,18.492457],[-0.992534,125.553162,3.599589],[-2.491733,125.553162,2.97703],[-2.349948,124.753163,3.035899],[-1.134731,124.753163,3.540537],[-2.908649,129.518137,2.478419],[-2.491733,128.898188,2.97703],[-0.992534,128.898188,3.599589],[-0.346061,129.517969,3.542658],[-0.346061,134.61434,2.166468],[-0.346061,135.617205,2.166468],[-0.346061,146.690781,0.003397],[35.009282,93.33799,35.264658],[52.612721,93.33799,52.868098],[52.612721,96.46299,52.868098],[43.737992,96.46299,44.274119],[31.398974,101.865816,31.935099],[-0.14754,101.865816,45.0021],[-0.147537,96.46299,62.452097],[32.898614,101.865816,33.154002],[32.898614,104.689253,33.154002],[30.910376,104.689253,32.137476],[17.674676,114.650044,18.901789],[0.341054,114.650044,26.081614],[0.341057,104.689253,44.799708],[17.681611,114.658488,18.880106],[17.146187,114.936751,18.482157],[0.300416,125.553162,3.599589],[0.417687,124.753163,3.550883],[1.682541,124.753163,3.025629],[1.799611,125.553162,2.977015],[2.216527,129.518137,2.478419],[-0.346061,129.517969,3.542658],[0.300416,128.898188,3.599589],[1.799611,128.898188,2.977015],[1.248738,134.61434,1.504206],[1.248738,135.617205,1.504206],[-0.279716,146.690781,-0.024145],[74.548958,93.33799,-0.090673],[74.548958,96.46299,-0.090673],[62.196713,96.46299,0.107844],[44.746708,101.865816,0.107844],[31.679719,101.865816,31.654353],[44.018738,96.46299,43.993372],[46.669007,101.865816,-0.090673],[46.669007,104.689253,-0.090673],[44.544327,104.689253,0.596446],[25.826222,114.650044,0.596446],[18.646399,114.650044,17.930064],[31.8821,104.689253,31.165766],[25.826222,114.650044,0.596446],[25.815751,114.658523,0.576121],[25.155789,114.936697,0.673243],[3.335328,128.898188,0.556284],[2.713383,128.898188,2.06161],[2.713383,125.553162,2.06161],[3.335328,125.553162,0.556284],[3.277894,129.518307,-0.090673],[2.216527,129.518137,2.478419],[2.713383,128.898188,2.06161],[3.335328,128.898188,0.556284],[1.907685,134.61434,-0.090658],[1.907685,135.617205,-0.090658],[35.009278,93.33799,-35.446012],[49.653939,93.33799,-0.090673],[44.077927,96.46299,-44.514661],[-0.346065,93.33799,-50.090673],[43.737988,96.46299,-44.455465],[-35.701408,93.33799,-35.446004],[-44.770057,96.46299,-44.514654],[-50.346061,93.33799,-0.090673],[-62.888832,96.46299,-0.28919],[-44.710861,96.46299,-44.174718],[-35.701393,93.33799,35.264674],[-63.171066,96.46299,-0.090673],[-0.346054,93.33799,49.909327],[-0.346054,96.46299,62.734324],[35.009282,93.33799,35.264658],[49.653939,93.33799,-0.090673],[44.077931,96.46299,44.333308],[0.329476,134.61434,-0.767919],[0.609292,134.61434,-0.090658],[0.609292,135.617205,-0.090658],[0.329476,135.617205,-0.767919],[-0.346061,134.61434,-1.048444],[-0.346061,135.617205,-1.048444],[-1.021598,134.61434,-0.767919],[-1.021598,135.617205,-0.767919],[-1.301414,134.61434,-0.090658],[-1.301414,135.617205,-0.090658],[-1.021598,134.61434,0.586588],[-1.021598,135.617205,0.586588],[-0.346061,134.61434,0.867121],[-0.346061,135.617205,0.867121],[0.329476,134.61434,0.586588],[0.329476,135.617205,0.586588],[0.609292,134.61434,-0.090658],[0.609292,135.617205,-0.090658],[0.329476,135.617205,-0.767919],[0.609292,135.617205,-0.090658],[-0.346061,135.617205,-1.048444],[-1.021598,135.617205,-0.767919],[-1.301414,135.617205,-0.090658],[-1.021598,135.617205,0.586588],[-0.346061,135.617205,0.867121],[0.329476,135.617205,0.586588],[44.083996,97.136672,-44.520727],[42.631142,97.772826,-43.067876],[60.432881,97.772826,-0.090673],[62.487526,97.136672,-0.090673],[62.487526,97.136672,-0.090673],[60.432881,97.772826,-0.090673],[42.631146,97.772826,42.88653],[44.084,97.136672,44.339381],[-0.346065,97.136672,-62.924261],[-0.346065,97.772826,-60.869619],[42.631142,97.772826,-43.067876],[44.083996,97.136672,-44.520727],[44.084,97.136672,44.339381],[42.631146,97.772826,42.88653],[-0.346054,97.772826,60.688258],[-0.346054,97.136672,62.742915],[-44.776123,97.136672,-44.520727],[-43.323265,97.772826,-43.067876],[-0.346065,97.772826,-60.869619],[-0.346065,97.136672,-62.924261],[-0.346054,97.136672,62.742915],[-0.346054,97.772826,60.688258],[-43.323257,97.772826,42.88653],[-44.776115,97.136672,44.339381],[-63.179649,97.136672,-0.090673],[-61.125007,97.772826,-0.090673],[-43.323265,97.772826,-43.067876],[-44.776123,97.136672,-44.520727],[-44.776115,97.136672,44.339381],[-43.323257,97.772826,42.88653],[-61.125007,97.772826,-0.090673],[-63.179649,97.136672,-0.090673],[62.196713,96.46299,-0.28919],[44.018735,96.46299,-44.174718],[60.224297,97.099144,-0.090673],[42.483651,97.099144,-42.920385],[43.978337,96.654042,44.233714],[44.018738,96.46299,43.993372],[42.483655,97.099144,42.739039],[60.224297,97.099144,-0.090673],[-0.147548,96.46299,-62.633443],[-0.346065,96.654042,-62.774831],[42.483651,97.099144,-42.920385],[-0.346065,97.099144,-60.661031],[-0.147537,96.46299,62.452097],[43.737992,96.46299,44.274119],[-0.346054,97.099144,60.479685],[42.483655,97.099144,42.739039],[-0.544578,96.46299,-62.633443],[-0.346065,97.099144,-60.661031],[-43.175773,97.099144,-42.920385],[-44.430107,96.46299,44.274119],[-0.54457,96.46299,62.452097],[-43.175765,97.099144,42.739039],[-0.346054,97.099144,60.479685],[-62.888832,96.46299,-0.28919],[-44.710861,96.46299,-44.174718],[-43.175773,97.099144,-42.920385],[-60.916419,97.099144,-0.090673],[-63.030219,96.654042,-0.090673],[-62.888832,96.46299,0.107844],[-60.916419,97.099144,-0.090673],[-43.175765,97.099144,42.739039],[44.746708,101.865816,-0.28919],[31.679715,101.865816,-31.835699],[45.528939,104.689253,-0.090673],[-0.346065,101.865816,-45.465673],[-0.346065,104.689253,-45.965673],[-32.091094,101.865816,-32.116445],[-0.346065,104.689253,-45.965673],[-32.784583,104.689253,-32.529195],[-32.431022,101.865816,31.994303],[-32.574218,104.689253,31.165766],[-45.23645,104.689253,0.596446],[-1.033168,104.689253,44.799708],[-31.602493,104.689253,32.137492],[-0.346054,101.865816,45.284327],[-0.346054,104.689253,45.784327],[45.028939,101.865816,-0.090673],[45.528939,104.689253,-0.090673],[26.445841,115.279585,-0.090673],[28.137759,114.379235,-0.090673],[19.795041,114.379235,-20.231771],[18.598673,115.279585,-19.035406],[18.598673,115.279585,-19.035406],[19.795041,114.379235,-20.231771],[-0.346061,114.379235,-28.574483],[-0.346061,115.279585,-26.882574],[18.598675,115.279585,18.85406],[19.795043,114.379235,20.050425],[28.137759,114.379235,-0.090673],[26.445841,115.279585,-0.090673],[-0.346061,115.279585,-26.882574],[-0.346061,114.379235,-28.574483],[-20.487167,114.379235,-20.231771],[-19.290798,115.279585,-19.035406],[-0.346057,115.279585,26.701228],[-0.346057,114.379235,28.393153],[19.795043,114.379235,20.050425],[18.598675,115.279585,18.85406],[-19.290798,115.279585,-19.035406],[-20.487167,114.379235,-20.231771],[-28.829879,114.379235,-0.090673],[-27.137962,115.279585,-0.090673],[-19.290794,115.279585,18.85406],[-20.487159,114.379235,20.05044],[-0.346057,114.379235,28.393153],[-0.346057,115.279585,26.701228],[-27.137962,115.279585,-0.090673],[-28.829879,114.379235,-0.090673],[-20.487159,114.379235,20.05044],[-19.290794,115.279585,18.85406],[18.594311,115.267995,-19.031042],[18.646397,114.650044,-18.111402],[19.558154,113.749694,-19.994886],[27.80275,113.749694,-0.090673],[0.34105,114.650044,-26.262952],[17.674674,114.650044,-19.083128],[-0.346061,113.749694,-28.239477],[19.558154,113.749694,-19.994886],[18.646399,114.650044,17.930064],[25.826222,114.650044,0.596446],[27.80275,113.749694,-0.090673],[19.558156,113.749694,19.813548],[-19.286437,115.267995,-19.031042],[-18.366798,114.650044,-19.083128],[-20.250278,113.749694,-19.994878],[-0.346061,113.749694,-28.239477],[18.594313,115.267995,18.849696],[17.674676,114.650044,18.901789],[19.558156,113.749694,19.813548],[-0.346057,113.749694,28.058146],[-19.338523,114.650044,-18.111402],[-28.494873,113.749694,-0.090673],[-20.250278,113.749694,-19.994878],[-0.346057,115.267995,26.695063],[-1.033172,114.650044,26.081614],[-0.346057,113.749694,28.058146],[-20.250274,113.749694,19.813548],[-26.518344,114.650044,0.596446],[-27.131797,115.267995,-0.090673],[-20.250274,113.749694,19.813548],[-28.494873,113.749694,-0.090673],[62.196713,96.46299,-0.28919],[62.196713,96.46299,-0.28919],[62.478943,96.46299,-0.090673],[43.737988,96.46299,-44.455465],[44.077927,96.46299,-44.514661],[-0.346065,96.46299,-62.915678],[-0.147548,96.46299,-62.633443],[-0.544578,96.46299,-62.633443],[-44.430114,96.46299,-44.455465],[-0.544578,96.46299,-62.633443],[-63.171066,96.46299,-0.090673],[-62.888832,96.46299,-0.28919],[-44.710861,96.46299,-44.174718],[-44.770057,96.46299,-44.514654],[-44.710853,96.46299,43.993372],[-62.888832,96.46299,0.107844],[-44.770042,96.46299,44.333308],[-44.710853,96.46299,43.993372],[-44.430107,96.46299,44.274119],[-0.54457,96.46299,62.452097],[-44.430107,96.46299,44.274119],[44.077931,96.46299,44.333308],[-0.147537,96.46299,62.452097],[-0.346054,96.46299,62.734324],[62.196713,96.46299,0.107844],[62.196713,96.46299,0.107844],[44.018735,96.46299,-44.174718],[43.978333,96.654042,-44.415067],[62.338097,96.654042,-0.090673],[62.196713,96.46299,0.107844],[62.196713,96.46299,0.107844],[43.737988,96.46299,-44.455465],[43.737992,96.46299,44.274119],[43.978337,96.654042,44.233714],[-0.346054,96.654042,62.593485],[-0.544578,96.46299,-62.633443],[-44.430114,96.46299,-44.455465],[-44.670463,96.654042,-44.41506],[-44.670448,96.654042,44.233729],[-44.430107,96.46299,44.274119],[-62.888832,96.46299,-0.28919],[-63.030219,96.654042,-0.090673],[45.028939,101.865816,-0.090673],[44.746708,101.865816,-0.28919],[31.679715,101.865816,-31.835699],[31.738907,101.865816,-32.175634],[31.398972,101.865816,-32.116445],[31.398972,101.865816,-32.116445],[-0.147548,101.865816,-45.183439],[-32.091094,101.865816,-32.116445],[-32.431037,101.865816,-32.175634],[-0.346065,101.865816,-45.465673],[-0.544578,101.865816,-45.183439],[-32.371841,101.865816,-31.835699],[-45.438835,101.865816,-0.28919],[-45.721061,101.865816,-0.090673],[-45.438835,101.865816,0.107844],[-45.438835,101.865816,0.107844],[-32.371833,101.865816,31.654368],[-0.54457,101.865816,45.0021],[-0.346054,101.865816,45.284327],[-32.431022,101.865816,31.994303],[-32.091087,101.865816,31.935114],[-0.14754,101.865816,45.0021],[31.398974,101.865816,31.935099],[31.398974,101.865816,31.935099],[31.738911,101.865816,31.994288],[31.679719,101.865816,31.654353],[44.746708,101.865816,0.107844],[31.679719,101.865816,31.654353],[44.746708,101.865816,-0.28919],[44.746708,101.865816,0.107844],[44.018735,96.46299,-44.174718],[31.679715,101.865816,-31.835699],[-0.544578,101.865816,-45.183439],[-0.147548,101.865816,-45.183439],[-0.147548,96.46299,-62.633443],[-44.430114,96.46299,-44.455465],[-32.371841,101.865816,-31.835699],[-32.091094,101.865816,-32.116445],[-45.438835,101.865816,0.107844],[-62.888832,96.46299,-0.28919],[-44.710853,96.46299,43.993372],[-32.091087,101.865816,31.935114],[-0.14754,101.865816,45.0021],[-0.54457,96.46299,62.452097],[43.737992,96.46299,44.274119],[44.018738,96.46299,43.993372],[31.679719,101.865816,31.654353],[62.478943,96.46299,-0.090673],[45.028939,101.865816,-0.090673],[44.077927,96.46299,-44.514661],[43.737988,96.46299,-44.455465],[43.978333,96.654042,-44.415067],[31.398972,101.865816,-32.116445],[-0.346065,96.46299,-62.915678],[-0.544578,101.865816,-45.183439],[-44.770057,96.46299,-44.514654],[-44.710861,96.46299,-44.174718],[-44.670463,96.654042,-44.41506],[-32.371841,101.865816,-31.835699],[-62.888832,96.46299,0.107844],[-63.030219,96.654042,-0.090673],[-63.171066,96.46299,-0.090673],[-45.438835,101.865816,0.107844],[-45.438835,101.865816,-0.28919],[-44.670448,96.654042,44.233729],[-32.431022,101.865816,31.994303],[-32.371833,101.865816,31.654368],[-0.54457,96.46299,62.452097],[-0.346054,96.46299,62.734324],[-0.147537,96.46299,62.452097],[-0.346054,96.654042,62.593485],[-0.346054,101.865816,45.284327],[44.077931,96.46299,44.333308],[44.018738,96.46299,43.993372],[31.738911,101.865816,31.994288],[31.398974,101.865816,31.935099],[18.226546,114.936747,-17.583181],[2.76186,124.753163,-2.125616],[3.286934,124.753163,-0.854749],[25.155789,114.936697,-0.854589],[0.442662,114.9368,-25.582296],[17.121342,114.936751,-18.673788],[17.674674,114.650044,-19.083128],[0.34105,114.650044,-26.262952],[-1.134788,114.9368,-25.582296],[-1.012836,114.658532,-26.252477],[-1.033176,114.650044,-26.262952],[-18.91867,114.936747,-17.583181],[-25.847911,114.936697,-0.854581],[-18.918666,114.936747,17.40185],[-3.453983,124.753163,1.94427],[-3.979057,124.753163,0.673411],[-25.847911,114.936697,0.673258],[-1.134784,114.9368,25.40095],[-17.813461,114.936751,18.492457],[-18.366794,114.650044,18.901789],[1.682541,124.753163,3.025629],[0.417687,124.753163,3.550883],[0.417859,114.9368,25.411234],[17.146187,114.936751,18.482157],[3.286934,124.753163,0.673411],[2.76186,124.753163,1.94427],[18.226548,114.936747,17.401835],[25.155789,114.936697,0.673243],[32.092461,104.689253,-32.529195],[31.8821,104.689253,-31.347105],[44.544327,104.689253,-0.777776],[30.910374,104.689253,-32.31883],[0.34105,104.689253,-44.981054],[30.910374,104.689253,-32.31883],[-32.784583,104.689253,-32.529195],[-31.6025,104.689253,-32.318822],[-31.6025,104.689253,-32.318822],[-1.033176,104.689253,-44.981054],[-45.23645,104.689253,-0.777776],[-32.574226,104.689253,-31.347105],[-46.221061,104.689253,-0.090673],[-45.23645,104.689253,-0.777776],[-45.23645,104.689253,0.596446],[-32.784583,104.689253,32.347865],[-32.574218,104.689253,31.165766],[-0.346054,104.689253,45.784327],[-1.033168,104.689253,44.799708],[-31.602493,104.689253,32.137492],[32.092465,104.689253,32.347849],[30.910376,104.689253,32.137476],[30.910376,104.689253,32.137476],[0.341057,104.689253,44.799708],[31.8821,104.689253,31.165766],[31.8821,104.689253,31.165766],[44.544327,104.689253,0.596446],[18.646397,114.650044,-18.111402],[25.826222,114.650044,-0.777776],[25.826222,114.650044,-0.777776],[26.439673,115.267995,-0.090673],[-0.346061,115.267995,-26.876401],[17.674674,114.650044,-19.083128],[18.594311,115.267995,-19.031042],[18.646399,114.650044,17.930064],[18.594313,115.267995,18.849696],[-18.366798,114.650044,-19.083128],[-1.033176,114.650044,-26.262952],[17.674676,114.650044,18.901789],[0.341054,114.650044,26.081614],[0.341054,114.650044,26.081614],[-0.346057,115.267995,26.695063],[-27.131797,115.267995,-0.090673],[-26.518344,114.650044,-0.777776],[-18.366794,114.650044,18.901789],[-19.28643,115.267995,18.849711],[-18.366794,114.650044,18.901789],[-19.338516,114.650044,17.930064],[-19.338516,114.650044,17.930064],[-26.518344,114.650044,0.596446],[25.826222,114.650044,-0.777776],[25.826222,114.650044,0.596446],[44.544327,104.689253,0.596446],[44.544327,104.689253,-0.777776],[31.8821,104.689253,-31.347105],[-1.033176,114.650044,-26.262952],[0.34105,114.650044,-26.262952],[-31.6025,104.689253,-32.318822],[-32.574226,104.689253,-31.347105],[-19.338523,114.650044,-18.111402],[-26.518344,114.650044,-0.777776],[-45.23645,104.689253,-0.777776],[-45.23645,104.689253,0.596446],[-32.574218,104.689253,31.165766],[0.341054,114.650044,26.081614],[-1.033172,114.650044,26.081614],[-1.033168,104.689253,44.799708],[30.910376,104.689253,32.137476],[18.646399,114.650044,17.930064],[45.528939,104.689253,-0.090673],[44.544327,104.689253,-0.777776],[25.815751,114.658523,-0.757452],[31.8821,104.689253,-31.347105],[32.092461,104.689253,-32.529195],[17.681609,114.658488,-19.061452],[18.624508,114.658568,-18.118414],[-0.346065,104.689253,-45.965673],[-1.033176,104.689253,-44.981054],[0.34105,104.689253,-44.981054],[-1.012836,114.658532,-26.252477],[0.32071,114.658532,-26.252477],[0.34105,114.650044,-26.262952],[-31.6025,104.689253,-32.318822],[-32.574226,104.689253,-31.347105],[-26.507873,114.658523,0.576121],[-26.507873,114.658523,-0.757452],[-26.518344,114.650044,-0.777776],[-32.574218,104.689253,31.165766],[-31.602493,104.689253,32.137492],[-19.28643,115.267995,18.849711],[-18.373729,114.658488,18.880122],[0.341057,104.689253,44.799708],[-0.346054,104.689253,45.784327],[0.320717,114.658532,26.071131],[32.092465,104.689253,32.347849],[18.62451,114.658568,17.937067],[17.681611,114.658488,18.880106],[18.226546,114.936747,-17.583181],[25.155789,114.936697,-0.854589],[25.815751,114.658523,-0.757452],[2.713383,125.553162,-2.242948],[3.335328,125.553162,-0.73763],[1.799611,125.553162,-3.158361],[1.974408,125.074459,-3.085775],[1.657826,124.753163,-3.217237],[-2.491733,128.898188,-3.158361],[-0.992538,128.898188,-3.78092],[-0.992538,125.553162,-3.78092],[-2.491733,125.553162,-3.158361],[-18.91867,114.936747,-17.583181],[-19.316635,114.658568,-18.118406],[-25.847911,114.936697,-0.854581],[-4.02745,128.898188,-0.73763],[-3.405506,128.898188,-2.242948],[-3.405506,125.553162,-2.242948],[-4.02745,125.553162,-0.73763],[-19.316627,114.658568,17.937067],[-18.918666,114.936747,17.40185],[-25.847911,114.936697,0.673258],[-26.507873,114.658523,0.576121],[-4.02745,125.553162,0.556284],[-4.102661,125.066387,0.374247],[-3.979057,124.753163,0.673411],[-0.992534,125.553162,3.599589],[-0.992534,128.898188,3.599589],[-2.491733,128.898188,2.97703],[-2.491733,125.553162,2.97703],[0.417859,114.9368,25.411234],[0.320717,114.658532,26.071131],[17.146187,114.936751,18.482157],[1.799611,128.898188,2.977015],[0.300416,128.898188,3.599589],[0.300416,125.553162,3.599589],[1.799611,125.553162,2.977015],[18.226548,114.936747,17.401835],[18.646399,114.650044,17.930064],[18.226548,114.936747,17.401835],[18.62451,114.658568,17.937067],[2.713383,125.553162,2.06161],[2.638199,125.066454,2.243586],[2.76186,124.753163,1.94427],[0.442662,114.9368,-25.582296],[17.681609,114.658488,-19.061452],[-18.366798,114.650044,-19.083128],[-17.813468,114.936751,-18.673788],[-1.134788,114.9368,-25.582296],[-18.373733,114.658488,-19.061452],[-17.813468,114.936751,-18.673788],[-1.012832,114.658532,26.071131],[-1.134784,114.9368,25.40095],[-18.373729,114.658488,18.880122],[25.815751,114.658523,0.576121],[25.815751,114.658523,0.576121],[-19.316627,114.658568,17.937067],[-19.316627,114.658568,17.937067],[-1.012832,114.658532,26.071131],[17.681611,114.658488,18.880106],[3.286934,124.753163,-0.854749],[3.286934,124.753163,0.673411],[25.155789,114.936697,0.673243],[1.657826,124.753163,-3.217237],[2.76186,124.753163,-2.125616],[17.121342,114.936751,-18.673788],[-1.134731,124.753163,-3.721876],[0.442608,124.753163,-3.721876],[-3.453983,124.753163,-2.125616],[-2.349948,124.753163,-3.217237],[-17.813468,114.936751,-18.673788],[-18.91867,114.936747,-17.583181],[-25.847911,114.936697,-0.854581],[-3.979057,124.753163,-0.854749],[-2.349948,124.753163,3.035899],[-3.453983,124.753163,1.94427],[-17.813461,114.936751,18.492457],[0.417687,124.753163,3.550883],[-1.134731,124.753163,3.540537],[17.146187,114.936751,18.482157],[2.76186,124.753163,1.94427],[1.682541,124.753163,3.025629],[3.410538,125.066387,-0.555593],[3.410538,125.066387,0.374247],[3.286934,124.753163,0.673411],[3.286934,124.753163,-0.854749],[1.974408,125.074459,-3.085775],[2.638199,125.066454,-2.424917],[2.76186,124.753163,-2.125616],[1.657826,124.753163,-3.217237],[25.155789,114.936697,0.673243],[18.624508,114.658568,-18.118414],[17.681609,114.658488,-19.061452],[17.121342,114.936751,-18.673788],[18.226546,114.936747,-17.583181],[-0.817851,125.074593,-3.85346],[0.125729,125.074593,-3.85346],[0.442608,124.753163,-3.721876],[-1.134731,124.753163,-3.721876],[-3.330322,125.066454,-2.424917],[-2.66653,125.074459,-3.085775],[-2.349948,124.753163,-3.217237],[-3.453983,124.753163,-2.125616],[-4.102661,125.066387,0.374247],[-4.102661,125.066387,-0.555593],[-3.979057,124.753163,-0.854749],[-3.979057,124.753163,0.673411],[-1.134788,114.9368,-25.582296],[0.442662,114.9368,-25.582296],[0.32071,114.658532,-26.252477],[-1.012836,114.658532,-26.252477],[-2.349948,124.753163,3.035899],[-2.66653,125.074459,2.904429],[-3.330322,125.066454,2.243586],[-3.453983,124.753163,1.94427],[0.118584,125.066464,3.675089],[-0.817851,125.074593,3.672129],[-1.134731,124.753163,3.540537],[0.417687,124.753163,3.550883],[2.638199,125.066454,2.243586],[1.981499,125.066395,2.901484],[1.682541,124.753163,3.025629],[-26.507873,114.658523,-0.757452],[-26.507873,114.658523,0.576121],[-25.847911,114.936697,0.673258],[-19.316627,114.658568,17.937067],[-18.373729,114.658488,18.880122],[-17.813461,114.936751,18.492457],[-18.918666,114.936747,17.40185],[0.320717,114.658532,26.071131],[-1.012832,114.658532,26.071131],[18.226548,114.936747,17.401835],[3.335328,125.553162,-0.73763],[3.410538,125.066387,-0.555593],[3.286934,124.753163,-0.854749],[2.216527,129.518137,-2.659757],[3.277894,129.518307,-0.090673],[-0.346061,129.517967,-3.724004],[2.216527,129.518137,-2.659757],[-2.66653,125.074459,-3.085775],[-0.992538,125.553162,-3.78092],[-0.817851,125.074593,-3.85346],[-0.346061,129.517967,-3.724004],[-2.908649,129.518137,-2.659757],[-4.102661,125.066387,-0.555593],[-3.405506,125.553162,-2.242948],[-3.330322,125.066454,-2.424917],[-2.908649,129.518137,-2.659757],[-3.970016,129.518307,-0.090673],[-2.908649,129.518137,2.478419],[-2.491733,125.553162,2.97703],[-2.66653,125.074459,2.904429],[-0.992534,125.553162,3.599589],[-0.346061,129.517969,3.542658],[-2.908649,129.518137,2.478419],[0.300416,125.553162,3.599589],[0.118584,125.066464,3.675089],[1.981499,125.066395,2.901484],[-0.346061,129.517969,3.542658],[2.216527,129.518137,2.478419],[2.216527,129.518137,2.478419],[0.300416,125.553162,-3.78092],[0.300416,125.553162,-3.78092],[-3.405506,125.553162,2.06161],[-3.330322,125.066454,2.243586],[-3.405506,125.553162,2.06161],[3.286934,124.753163,0.673411],[3.335328,125.553162,0.556284],[2.713383,125.553162,2.06161],[3.410538,125.066387,0.374247],[3.335328,125.553162,0.556284],[3.335328,125.553162,0.556284],[3.335328,128.898188,-0.73763],[3.335328,128.898188,0.556284],[1.799611,128.898188,-3.158361],[2.713383,128.898188,-2.242948],[2.713383,125.553162,-2.242948],[1.799611,125.553162,-3.158361],[-0.992538,128.898188,-3.78092],[0.300416,128.898188,-3.78092],[-0.992538,125.553162,-3.78092],[-3.405506,128.898188,-2.242948],[-2.491733,128.898188,-3.158361],[-2.491733,125.553162,-3.158361],[-3.405506,125.553162,-2.242948],[-4.02745,125.553162,-0.73763],[-4.02745,128.898188,0.556284],[-4.02745,128.898188,-0.73763],[-2.491733,128.898188,2.97703],[-3.405506,128.898188,2.06161],[0.300416,128.898188,3.599589],[-0.992534,128.898188,3.599589],[2.713383,128.898188,2.06161],[1.799611,128.898188,2.977015],[1.799611,125.553162,2.977015],[2.713383,125.553162,2.06161],[3.277894,129.518307,-0.090673],[3.335328,128.898188,0.556284],[3.335328,128.898188,-0.73763],[2.216527,129.518137,-2.659757],[2.713383,128.898188,-2.242948],[1.799611,128.898188,-3.158361],[-0.992538,128.898188,-3.78092],[-0.346061,129.517967,-3.724004],[3.335328,125.553162,-0.73763],[3.410538,125.066387,-0.555593],[-2.908649,129.518137,-2.659757],[-2.491733,128.898188,-3.158361],[-3.405506,128.898188,-2.242948],[-4.02745,128.898188,-0.73763],[-2.908649,129.518137,2.478419],[-3.405506,128.898188,2.06161],[-2.491733,128.898188,2.97703],[-0.346061,129.517969,3.542658],[-0.992534,128.898188,3.599589],[0.300416,128.898188,3.599589],[2.713383,128.898188,2.06161],[-2.491733,125.553162,-3.158361],[-4.02745,125.553162,-0.73763],[-4.102661,125.066387,-0.555593],[-2.66653,125.074459,2.904429],[-3.330322,125.066454,2.243586],[0.300416,125.553162,3.599589],[1.799611,125.553162,2.977015]];
var normals = [[0.801047,-0.558925,-0.214306],[0.828066,-0.558924,0.043715],[0,-1,0],[0.677582,-0.712784,-0.181166],[0.657628,0.709071,-0.254446],[0.884754,0.444266,-0.140851],[0.440033,-0.895273,-0.069694],[0.774024,0.558925,-0.297471],[0,1,0],[0.828065,0.558925,-0.043718],[0.695615,-0.558924,-0.451357],[0.588436,-0.712784,-0.381683],[0.546934,0.709083,-0.445044],[0.644226,0.558924,-0.522089],[0.522095,-0.558925,-0.64422],[0.441688,-0.712784,-0.54484],[0.382918,0.709105,-0.592068],[0.451351,0.558926,-0.695618],[0.297458,-0.558925,-0.77403],[0.251707,-0.712784,-0.654662],[0.181665,0.709133,-0.68127],[0.214311,0.558924,-0.801046],[0.043715,-0.558924,-0.828066],[0.037085,-0.712785,-0.700402],[-0.037222,0.709164,-0.70406],[-0.043721,0.558925,-0.828064],[-0.2143,-0.558925,-0.801049],[-0.181167,-0.712784,-0.677582],[-0.252438,0.709198,-0.658265],[-0.297461,0.558924,-0.774029],[-0.451352,-0.558925,-0.695618],[-0.381684,-0.712784,-0.588435],[-0.443088,0.709229,-0.548332],[-0.522093,0.558925,-0.644222],[-0.644227,-0.558925,-0.522087],[-0.54484,-0.712784,-0.441688],[-0.590591,0.709253,-0.384918],[-0.695613,0.558924,-0.45136],[-0.774029,-0.558924,-0.297462],[-0.657227,-0.711172,-0.249574],[-0.679317,0.710984,-0.181742],[-0.589909,0.710984,-0.382765],[-0.547734,-0.711152,-0.440739],[-0.801047,0.558925,-0.214306],[-0.828065,-0.558925,-0.043719],[-0.704152,0.708955,-0.039396],[-0.701047,-0.711966,0.040465],[-0.67916,-0.711995,-0.17834],[-0.657545,0.708959,-0.254975],[-0.828066,0.558924,0.043715],[-0.801046,-0.558924,0.21431],[-0.678454,-0.711157,0.184272],[-0.656404,0.710984,0.252261],[-0.70223,0.710984,0.037073],[-0.702185,-0.711173,-0.034191],[-0.774028,0.558925,0.297462],[-0.695619,-0.558925,0.45135],[-0.588435,-0.712784,0.381684],[-0.548681,0.709269,0.442591],[-0.658659,0.709279,0.251179],[-0.677582,-0.712784,0.181167],[-0.644219,0.558925,0.522097],[-0.522094,-0.558925,0.644221],[-0.441511,-0.711077,0.547209],[-0.382769,0.710984,0.589907],[-0.546323,0.710984,0.442756],[-0.588585,-0.711124,0.384538],[-0.451357,0.558924,0.695615],[-0.297462,-0.558924,0.774029],[-0.251705,-0.712784,0.654663],[-0.182967,0.709223,0.680827],[-0.384777,0.709249,0.590688],[-0.441689,-0.712784,0.544839],[-0.214305,0.558925,0.801047],[-0.043723,-0.558926,0.828064],[-0.03701,0.709204,0.704031],[0.037112,-0.712243,0.700952],[-0.180304,-0.71215,0.678478],[-0.253454,0.709137,0.657941],[0.043716,0.558924,0.828066],[0.214317,-0.558924,0.801044],[0.181169,-0.712784,0.677582],[0.253185,0.709159,0.65802],[0.036908,0.709192,0.704048],[-0.037086,-0.712784,0.700402],[0.297463,0.558925,0.774028],[0.451355,-0.558925,0.695615],[0.384952,0.709325,0.590482],[0.440324,-0.712426,0.54641],[0.250871,-0.712339,0.655467],[0.183031,0.709271,0.680761],[0.522093,0.558925,0.644222],[0.644225,-0.558924,0.52209],[0.548861,0.709367,0.442211],[0.58713,-0.712499,0.384217],[0.695615,0.558925,0.451357],[0.774027,-0.558925,0.297465],[0.65874,0.709391,0.250652],[0.676939,-0.71255,0.184461],[0.801046,0.558925,0.21431],[0.883235,-0.44712,0.14135],[0.441708,0.894427,0.069959],[0.679318,0.710984,0.181741],[0.655584,-0.710784,0.254943],[0.680181,-0.7108,-0.179211],[0.656403,0.710984,-0.252263],[0.883415,0.447214,-0.13992],[0.442195,-0.89449,-0.065963],[0.591226,-0.710836,-0.381003],[0.546327,0.710983,-0.442752],[0.443999,-0.710887,-0.54544],[0.382765,0.710984,-0.589909],[0.252917,-0.710946,-0.656193],[0.181743,0.710983,-0.679317],[0.036864,-0.711009,-0.702216],[-0.037075,0.710984,-0.70223],[-0.182776,-0.711067,-0.678953],[-0.252258,0.710983,-0.656406],[-0.38425,-0.711116,-0.588783],[-0.442756,0.710984,-0.546323],[-0.590477,-0.71205,-0.379896],[-0.546752,0.708983,-0.445428],[-0.704041,0.709281,0.035316],[-0.700402,-0.712784,-0.037083],[-0.251605,-0.711021,0.656616],[-0.18174,0.710984,0.679318],[-0.037284,-0.710959,0.702245],[0.037073,0.710983,0.702231],[0.180709,-0.710899,0.679681],[0.252261,0.710984,0.656404],[0.381279,-0.710846,0.591037],[0.442753,0.710984,0.546326],[0.544918,-0.710807,0.444768],[0.589907,0.710984,0.382768],[0.885079,0.444427,0.138277],[0.440283,-0.89482,0.073808],[0.966024,0,-0.258452],[0.998609,0,0.052722],[0.838879,0,-0.544318],[0.629624,0,-0.7769],[0.358721,0,-0.933445],[0.052727,0,-0.998609],[-0.25845,0,-0.966025],[-0.54431,0,-0.838884],[-0.776903,0,-0.62962],[-0.933441,0,-0.358732],[-0.998609,0,-0.052718],[-0.966027,0,0.25844],[-0.838879,0,0.544318],[-0.629617,0,0.776906],[-0.358729,0,0.933442],[-0.052718,0,0.998609],[0.258442,0,0.966027],[0.544316,0,0.838881],[0.776903,0,0.629621],[0.933441,0,0.35873],[0,1,0],[0,1,0],[-0.654277,-0.711972,0.254986],[0,1,0],[0,1,0],[-0.380396,-0.712067,0.590135],[-0.543719,-0.712007,0.444315],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.656081,-0.712574,-0.24859],[0.882431,-0.450008,-0.137143],[0,1,0],[0,1,0],[0.54689,-0.712541,-0.43954],[0,1,0],[0.383706,-0.712486,-0.58748],[0,1,0],[0.182505,-0.712408,-0.677619],[0,1,0],[-0.0369,-0.712318,-0.700886],[0,1,0],[-0.25271,-0.71222,-0.65489],[0,1,0],[-0.443528,-0.712128,-0.544202],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.680287,0.709373,-0.184387],[0.442829,0.893649,-0.07276],[0.590229,0.709337,-0.385319],[0.442718,0.709285,-0.548558],[0.252169,0.70922,-0.658345],[0.03712,0.709153,-0.704077],[-0.181604,0.709085,-0.681336],[-0.382741,0.709027,-0.592276],[-0.680539,0.709271,-0.183849],[-0.654662,-0.712784,-0.251706],[-0.592522,0.709014,0.382384],[-0.681812,0.708975,0.180243],[-0.444918,0.709069,0.547055],[0.381683,-0.712784,0.588436],[0.444548,0.709126,0.547281],[0.544839,-0.712784,0.441688],[0.592162,0.709099,0.382783],[0.654662,-0.712784,0.251706],[0.681559,0.70908,0.180784],[0.881979,-0.45011,0.139691],[0.44364,0.893649,0.067634],[0.998609,0,-0.052719],[0.933441,0,-0.35873],[0.776906,0,-0.629617],[0.544314,0,-0.838882],[0.258439,0,-0.966028],[-0.052719,0,-0.998609],[-0.358717,0,-0.933446],[-0.629622,0,-0.776902],[-0.838886,0,-0.544308],[-0.966025,0,-0.258448],[-0.998609,0,0.052724],[-0.933443,0,0.358725],[-0.776909,0,0.629613],[-0.544311,0,0.838884],[-0.258454,0,0.966023],[0.052728,0,0.998609],[0.35873,0,0.933441],[0.629624,0,0.7769],[0.83888,0,0.544316],[0.966026,0,0.258443],[-0.001381,-0.999999,0.000369],[-0.001427,-0.999999,0.000226],[-0.001199,-0.999999,0.000778],[-0.0009,-0.999999,0.00111],[-0.000513,-0.999999,0.001334],[-0.000075,-0.999999,0.001427],[0.000369,-0.999999,0.001381],[0.000778,-0.999999,0.001199],[0.00111,-0.999999,0.0009],[0.001199,-0.999999,-0.000778],[0.001381,-0.999999,-0.000369],[0.000513,-0.999999,-0.001334],[0.0009,-0.999999,-0.00111],[-0.000369,-0.999999,-0.001381],[0.000075,-0.999999,-0.001427],[0.001427,-0.999999,0.000075],[0.001334,-0.999999,0.000513],[-0.000778,-0.999999,-0.001199],[-0.00111,-0.999999,-0.0009],[-0.001334,-0.999999,-0.000513],[-0.001427,-0.999999,-0.000226],[0.801046,-0.558925,-0.214308],[0.828065,-0.558925,0.043717],[0,-1,0],[0.677582,-0.712784,-0.181166],[0.657629,0.709071,-0.254446],[0.884754,0.444266,-0.140851],[0.440033,-0.895273,-0.069694],[0.774028,0.558925,-0.297462],[0,1,0],[0.828065,0.558925,-0.043718],[0.695614,-0.558925,-0.451358],[0.588435,-0.712785,-0.381683],[0.546934,0.709083,-0.445045],[0.644221,0.558925,-0.522094],[0.522093,-0.558925,-0.644222],[0.441689,-0.712785,-0.544839],[0.382919,0.709104,-0.592068],[0.451357,0.558925,-0.695615],[0.297464,-0.558925,-0.774027],[0.251706,-0.712785,-0.654662],[0.181662,0.709133,-0.681271],[0.214311,0.558925,-0.801046],[0.043715,-0.558924,-0.828066],[0.037085,-0.712784,-0.700402],[-0.03722,0.709164,-0.704061],[-0.043718,0.558925,-0.828065],[-0.214304,-0.558925,-0.801047],[-0.181167,-0.712785,-0.677582],[-0.25244,0.709198,-0.658265],[-0.297467,0.558925,-0.774026],[-0.451358,-0.558925,-0.695614],[-0.381685,-0.712784,-0.588434],[-0.443087,0.709228,-0.548333],[-0.522092,0.558925,-0.644223],[-0.644221,-0.558925,-0.522094],[-0.544839,-0.712785,-0.441688],[-0.590592,0.709253,-0.384917],[-0.695615,0.558925,-0.451356],[-0.774027,-0.558925,-0.297464],[-0.657228,-0.711172,-0.249573],[-0.679317,0.710984,-0.181742],[-0.589908,0.710984,-0.382767],[-0.54773,-0.711152,-0.440743],[-0.801046,0.558925,-0.214308],[-0.828065,-0.558925,-0.043718],[-0.704152,0.708955,-0.039401],[-0.701046,-0.711967,0.040464],[-0.67916,-0.711994,-0.17834],[-0.657546,0.708958,-0.254972],[-0.828065,0.558925,0.043717],[-0.801047,-0.558925,0.214308],[-0.678454,-0.711157,0.184272],[-0.656405,0.710984,0.25226],[-0.70223,0.710984,0.037074],[-0.702185,-0.711173,-0.03419],[-0.774027,0.558925,0.297466],[-0.695616,-0.558925,0.451354],[-0.588435,-0.712784,0.381685],[-0.548681,0.709268,0.442591],[-0.658658,0.70928,0.25118],[-0.677582,-0.712784,0.181168],[-0.644223,0.558925,0.522092],[-0.52209,-0.558925,0.644224],[-0.44151,-0.711077,0.54721],[-0.382766,0.710984,0.589909],[-0.546324,0.710984,0.442755],[-0.588586,-0.711124,0.384537],[-0.451358,0.558925,0.695614],[-0.297461,-0.558924,0.774029],[-0.251706,-0.712784,0.654663],[-0.182968,0.709223,0.680827],[-0.384776,0.709249,0.590689],[-0.441688,-0.712784,0.54484],[-0.214305,0.558925,0.801047],[-0.043719,-0.558925,0.828065],[-0.03701,0.709204,0.704031],[0.037115,-0.712243,0.700951],[-0.180306,-0.71215,0.678478],[-0.253451,0.709136,0.657943],[0.043715,0.558924,0.828066],[0.214309,-0.558924,0.801046],[0.181168,-0.712784,0.677582],[0.253184,0.709159,0.658021],[0.036909,0.709192,0.704048],[-0.037085,-0.712784,0.700402],[0.297464,0.558925,0.774027],[0.451352,-0.558925,0.695618],[0.384948,0.709326,0.590485],[0.440326,-0.712426,0.546408],[0.250865,-0.712339,0.65547],[0.183028,0.70927,0.680762],[0.522095,0.558925,0.64422],[0.644222,-0.558925,0.522092],[0.548863,0.709367,0.442208],[0.587132,-0.712499,0.384215],[0.695615,0.558925,0.451356],[0.774029,-0.558925,0.297461],[0.65874,0.70939,0.250652],[0.676939,-0.71255,0.184463],[0.801046,0.558925,0.214308],[0.883235,-0.44712,0.141351],[0.441708,0.894427,0.06996],[0.679317,0.710984,0.181742],[0.655583,-0.710784,0.254943],[0.680182,-0.7108,-0.179209],[0.656405,0.710984,-0.25226],[0.883415,0.447214,-0.13992],[0.442195,-0.89449,-0.065963],[0.591226,-0.710837,-0.381002],[0.546324,0.710984,-0.442755],[0.443997,-0.710887,-0.545442],[0.382768,0.710984,-0.589907],[0.252921,-0.710946,-0.656191],[0.181743,0.710984,-0.679317],[0.036862,-0.711008,-0.702217],[-0.037074,0.710984,-0.70223],[-0.182776,-0.711067,-0.678952],[-0.252263,0.710984,-0.656403],[-0.384253,-0.711115,-0.588782],[-0.442754,0.710984,-0.546325],[-0.590478,-0.712051,-0.379894],[-0.546752,0.708983,-0.445428],[-0.704041,0.709281,0.035314],[-0.700402,-0.712784,-0.037084],[-0.251603,-0.711021,0.656617],[-0.181741,0.710984,0.679317],[-0.037286,-0.710959,0.702244],[0.037074,0.710984,0.70223],[0.18071,-0.710899,0.679681],[0.25226,0.710984,0.656405],[0.381278,-0.710846,0.591037],[0.442755,0.710984,0.546324],[0.54492,-0.710807,0.444765],[0.589908,0.710984,0.382767],[0.885078,0.444427,0.138279],[0.440283,-0.89482,0.073807],[0.966026,0,-0.258446],[0.998609,0,0.05272],[0.838881,0,-0.544314],[0.629619,0,-0.776904],[0.358731,0,-0.933441],[0.052722,0,-0.998609],[-0.258449,0,-0.966025],[-0.544316,0,-0.83888],[-0.776902,0,-0.629622],[-0.933442,0,-0.358727],[-0.998609,0,-0.052722],[-0.966026,0,0.258447],[-0.83888,0,0.544316],[-0.629623,0,0.776901],[-0.358728,0,0.933442],[-0.052719,0,0.998609],[0.258442,0,0.966027],[0.544318,0,0.838879],[0.776904,0,0.629619],[0.933442,0,0.358729],[0,1,0],[0,1,0],[-0.654277,-0.711971,0.254988],[0,1,0],[0,1,0],[-0.380392,-0.712068,0.590136],[-0.543722,-0.712006,0.444312],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.656083,-0.712573,-0.248585],[0.882431,-0.450008,-0.137145],[0,1,0],[0,1,0],[0.546888,-0.712542,-0.439542],[0,1,0],[0.383709,-0.712485,-0.58748],[0,1,0],[0.1825,-0.712409,-0.677619],[0,1,0],[-0.036894,-0.712317,-0.700887],[0,1,0],[-0.252713,-0.71222,-0.654888],[0,1,0],[-0.44353,-0.712128,-0.544201],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.680287,0.709373,-0.184387],[0.442829,0.893649,-0.072763],[0.590231,0.709337,-0.385316],[0.442715,0.709284,-0.548561],[0.252169,0.709221,-0.658344],[0.037117,0.709151,-0.704079],[-0.181597,0.709086,-0.681337],[-0.382747,0.709027,-0.592272],[-0.68054,0.709271,-0.183849],[-0.654662,-0.712784,-0.251705],[-0.592523,0.709014,0.382382],[-0.681812,0.708974,0.180242],[-0.444916,0.70907,0.547055],[0.381684,-0.712784,0.588436],[0.444549,0.709126,0.547281],[0.544839,-0.712784,0.441689],[0.592161,0.709099,0.382784],[0.654662,-0.712784,0.251707],[0.681559,0.70908,0.180785],[0.881979,-0.45011,0.139692],[0.44364,0.893649,0.067635],[0.998609,0,-0.052721],[0.933442,0,-0.358729],[0.776902,0,-0.629622],[0.544318,0,-0.838879],[0.258442,0,-0.966027],[-0.052718,0,-0.998609],[-0.358729,0,-0.933442],[-0.62962,0,-0.776903],[-0.83888,0,-0.544316],[-0.966025,0,-0.258447],[-0.998609,0,0.052722],[-0.933443,0,0.358725],[-0.776903,0,0.62962],[-0.54431,0,0.838884],[-0.258447,0,0.966026],[0.052723,0,0.998609],[0.358725,0,0.933443],[0.629617,0,0.776906],[0.838883,0,0.544312],[0.966026,0,0.258444],[-0.001381,-0.999999,0.000369],[-0.001427,-0.999999,0.000226],[-0.001199,-0.999999,0.000778],[-0.0009,-0.999999,0.00111],[-0.000513,-0.999999,0.001334],[-0.000075,-0.999999,0.001427],[0.000369,-0.999999,0.001381],[0.000778,-0.999999,0.001199],[0.00111,-0.999999,0.0009],[0.001199,-0.999999,-0.000778],[0.001381,-0.999999,-0.000369],[0.000513,-0.999999,-0.001334],[0.0009,-0.999999,-0.00111],[-0.000369,-0.999999,-0.001381],[0.000075,-0.999999,-0.001427],[0.001427,-0.999999,0.000075],[0.001334,-0.999999,0.000513],[-0.000778,-0.999999,-0.001199],[-0.00111,-0.999999,-0.0009],[-0.001334,-0.999999,-0.000513],[-0.001427,-0.999999,-0.000226],[0.801046,-0.558925,-0.214308],[0.828065,-0.558925,0.043717],[0,-1,0],[0.677582,-0.712784,-0.181167],[0.657628,0.709071,-0.254447],[0.884754,0.444266,-0.140852],[0.440033,-0.895273,-0.069694],[0.774026,0.558925,-0.297467],[0,1,0],[0.828065,0.558925,-0.043717],[0.695616,-0.558924,-0.451355],[0.588435,-0.712784,-0.381684],[0.546934,0.709083,-0.445044],[0.644226,0.558924,-0.522089],[0.522094,-0.558925,-0.644221],[0.441688,-0.712784,-0.544839],[0.382918,0.709105,-0.592068],[0.45135,0.558926,-0.695618],[0.297457,-0.558925,-0.77403],[0.251707,-0.712784,-0.654662],[0.181664,0.709133,-0.68127],[0.214311,0.558924,-0.801046],[0.043715,-0.558924,-0.828066],[0.037085,-0.712785,-0.700402],[-0.037222,0.709164,-0.70406],[-0.043721,0.558925,-0.828064],[-0.214302,-0.558925,-0.801048],[-0.181167,-0.712784,-0.677582],[-0.252438,0.709198,-0.658266],[-0.297459,0.558924,-0.77403],[-0.451354,-0.558925,-0.695617],[-0.381684,-0.712785,-0.588435],[-0.443088,0.709229,-0.548332],[-0.522094,0.558926,-0.64422],[-0.644225,-0.558925,-0.522089],[-0.54484,-0.712784,-0.441687],[-0.590591,0.709254,-0.384917],[-0.695615,0.558924,-0.451357],[-0.774027,-0.558925,-0.297464],[-0.657227,-0.711172,-0.249575],[-0.679317,0.710984,-0.181742],[-0.589909,0.710984,-0.382766],[-0.547733,-0.711152,-0.44074],[-0.801046,0.558925,-0.214311],[-0.828065,-0.558925,-0.043718],[-0.704152,0.708955,-0.039401],[-0.701046,-0.711967,0.040464],[-0.67916,-0.711995,-0.178342],[-0.657546,0.708959,-0.254974],[-0.828065,0.558925,0.043718],[-0.801046,-0.558925,0.214309],[-0.678454,-0.711157,0.184272],[-0.656404,0.710984,0.252261],[-0.70223,0.710984,0.037073],[-0.702185,-0.711173,-0.034191],[-0.774028,0.558925,0.297462],[-0.695616,-0.558924,0.451355],[-0.588435,-0.712784,0.381685],[-0.548681,0.709269,0.442591],[-0.658659,0.709279,0.251179],[-0.677582,-0.712784,0.181166],[-0.644221,0.558925,0.522094],[-0.522094,-0.558925,0.644221],[-0.441511,-0.711077,0.547209],[-0.382768,0.710984,0.589907],[-0.546323,0.710984,0.442756],[-0.588585,-0.711124,0.384539],[-0.451357,0.558925,0.695615],[-0.297465,-0.558924,0.774027],[-0.251705,-0.712784,0.654663],[-0.182967,0.709223,0.680827],[-0.384776,0.709249,0.590688],[-0.441689,-0.712784,0.544839],[-0.214305,0.558925,0.801047],[-0.043723,-0.558926,0.828064],[-0.03701,0.709204,0.704031],[0.037112,-0.712243,0.700952],[-0.180303,-0.71215,0.678478],[-0.253454,0.709137,0.657941],[0.043715,0.558924,0.828066],[0.214317,-0.558924,0.801045],[0.181169,-0.712784,0.677582],[0.253185,0.709159,0.65802],[0.036908,0.709192,0.704049],[-0.037086,-0.712784,0.700402],[0.297464,0.558925,0.774027],[0.451354,-0.558925,0.695616],[0.384953,0.709325,0.590482],[0.440324,-0.712426,0.54641],[0.250871,-0.712339,0.655467],[0.18303,0.709271,0.680761],[0.522092,0.558925,0.644223],[0.644225,-0.558925,0.522089],[0.54886,0.709366,0.442212],[0.587129,-0.7125,0.384218],[0.695616,0.558925,0.451355],[0.774027,-0.558925,0.297464],[0.65874,0.70939,0.250653],[0.676939,-0.71255,0.184461],[0.801047,0.558925,0.214307],[0.883235,-0.44712,0.14135],[0.441708,0.894427,0.069959],[0.679317,0.710984,0.181741],[0.655583,-0.710784,0.254943],[0.680182,-0.7108,-0.17921],[0.656404,0.710984,-0.252261],[0.883415,0.447214,-0.13992],[0.442195,-0.89449,-0.065963],[0.591227,-0.710837,-0.381001],[0.546327,0.710984,-0.442752],[0.443998,-0.710887,-0.54544],[0.382765,0.710984,-0.589909],[0.252917,-0.710946,-0.656193],[0.181743,0.710983,-0.679317],[0.036864,-0.711009,-0.702216],[-0.037076,0.710984,-0.70223],[-0.182777,-0.711067,-0.678953],[-0.252259,0.710983,-0.656405],[-0.38425,-0.711116,-0.588783],[-0.442755,0.710984,-0.546324],[-0.590479,-0.71205,-0.379893],[-0.546754,0.708983,-0.445425],[-0.704041,0.709281,0.035314],[-0.700402,-0.712784,-0.037084],[-0.251604,-0.711021,0.656616],[-0.181739,0.710984,0.679318],[-0.037284,-0.710959,0.702245],[0.037073,0.710983,0.702231],[0.180709,-0.710899,0.679681],[0.252261,0.710984,0.656404],[0.38128,-0.710846,0.591036],[0.442754,0.710984,0.546325],[0.544918,-0.710807,0.444767],[0.589907,0.710984,0.382768],[0.885079,0.444427,0.138278],[0.440283,-0.89482,0.073807],[0.966025,0,-0.258448],[0.998609,0,0.052721],[0.838881,0,-0.544316],[0.629623,0,-0.776901],[0.358721,0,-0.933445],[0.052726,0,-0.998609],[-0.25845,0,-0.966025],[-0.544309,0,-0.838885],[-0.776907,0,-0.629615],[-0.93344,0,-0.358733],[-0.998609,0,-0.052722],[-0.966026,0,0.258445],[-0.838881,0,0.544314],[-0.629619,0,0.776904],[-0.358728,0,0.933442],[-0.052719,0,0.998609],[0.258442,0,0.966027],[0.544316,0,0.83888],[0.776902,0,0.629622],[0.933443,0,0.358726],[0,1,0],[0,1,0],[-0.654276,-0.711971,0.254989],[0,1,0],[0,1,0],[-0.380396,-0.712067,0.590135],[-0.543721,-0.712007,0.444313],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.656082,-0.712573,-0.248587],[0.882431,-0.450008,-0.137144],[0,1,0],[0,1,0],[0.546889,-0.712542,-0.439541],[0,1,0],[0.383706,-0.712486,-0.587481],[0,1,0],[0.182505,-0.712408,-0.677619],[0,1,0],[-0.0369,-0.712318,-0.700886],[0,1,0],[-0.252709,-0.71222,-0.65489],[0,1,0],[-0.443529,-0.712129,-0.544201],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.680287,0.709373,-0.184387],[0.442829,0.893649,-0.072763],[0.590229,0.709337,-0.385319],[0.442716,0.709285,-0.54856],[0.252169,0.70922,-0.658345],[0.03712,0.709153,-0.704077],[-0.181604,0.709085,-0.681336],[-0.38274,0.709027,-0.592276],[-0.680539,0.709271,-0.183849],[-0.654662,-0.712784,-0.251706],[-0.592522,0.709014,0.382384],[-0.681811,0.708975,0.180245],[-0.44492,0.709069,0.547053],[0.381683,-0.712784,0.588436],[0.444548,0.709126,0.547281],[0.54484,-0.712784,0.441688],[0.592162,0.709099,0.382782],[0.654662,-0.712784,0.251706],[0.681559,0.70908,0.180785],[0.881979,-0.45011,0.139692],[0.44364,0.893649,0.067635],[0.998609,0,-0.052721],[0.933442,0,-0.358729],[0.776906,0,-0.629617],[0.544312,0,-0.838883],[0.258438,0,-0.966028],[-0.052719,0,-0.998609],[-0.35872,0,-0.933445],[-0.629622,0,-0.776902],[-0.838882,0,-0.544313],[-0.966025,0,-0.258447],[-0.998609,0,0.052722],[-0.933442,0,0.35873],[-0.776906,0,0.629617],[-0.544313,0,0.838882],[-0.258456,0,0.966023],[0.052728,0,0.998609],[0.358729,0,0.933442],[0.629622,0,0.776901],[0.838882,0,0.544313],[0.966026,0,0.258446],[-0.001381,-0.999999,0.000369],[-0.001427,-0.999999,0.000226],[-0.001199,-0.999999,0.000778],[-0.0009,-0.999999,0.00111],[-0.000513,-0.999999,0.001334],[-0.000075,-0.999999,0.001427],[0.000369,-0.999999,0.001381],[0.000778,-0.999999,0.001199],[0.00111,-0.999999,0.0009],[0.001199,-0.999999,-0.000778],[0.001381,-0.999999,-0.000369],[0.000513,-0.999999,-0.001334],[0.0009,-0.999999,-0.00111],[-0.000369,-0.999999,-0.001381],[0.000075,-0.999999,-0.001427],[0.001427,-0.999999,0.000075],[0.001334,-0.999999,0.000513],[-0.000778,-0.999999,-0.001199],[-0.00111,-0.999999,-0.0009],[-0.001334,-0.999999,-0.000513],[-0.001427,-0.999999,-0.000226],[0.801047,-0.558925,-0.214306],[0.828066,-0.558924,0.043715],[0,-1,0],[0.677582,-0.712784,-0.181165],[0.657628,0.709071,-0.254445],[0.884754,0.444266,-0.140851],[0.440033,-0.895273,-0.069694],[0.774027,0.558925,-0.297466],[0,1,0],[0.828065,0.558925,-0.043719],[0.695614,-0.558925,-0.451359],[0.588435,-0.712784,-0.381683],[0.546933,0.709083,-0.445045],[0.644222,0.558925,-0.522093],[0.522094,-0.558925,-0.644221],[0.441689,-0.712784,-0.544839],[0.38292,0.709104,-0.592067],[0.451357,0.558925,-0.695615],[0.297465,-0.558925,-0.774027],[0.251707,-0.712785,-0.654662],[0.181662,0.709133,-0.68127],[0.214311,0.558925,-0.801046],[0.043715,-0.558924,-0.828066],[0.037085,-0.712784,-0.700402],[-0.03722,0.709164,-0.704061],[-0.043718,0.558925,-0.828065],[-0.214304,-0.558925,-0.801047],[-0.181167,-0.712784,-0.677582],[-0.25244,0.709198,-0.658264],[-0.297467,0.558925,-0.774026],[-0.451355,-0.558925,-0.695616],[-0.381685,-0.712784,-0.588434],[-0.443087,0.709228,-0.548333],[-0.522091,0.558924,-0.644224],[-0.644223,-0.558925,-0.522091],[-0.54484,-0.712784,-0.441688],[-0.590591,0.709253,-0.384918],[-0.695614,0.558925,-0.451358],[-0.774028,-0.558924,-0.297462],[-0.657228,-0.711172,-0.249573],[-0.679318,0.710984,-0.181741],[-0.589909,0.710984,-0.382766],[-0.547731,-0.711152,-0.440742],[-0.801047,0.558925,-0.214304],[-0.828065,-0.558925,-0.043719],[-0.704152,0.708955,-0.039395],[-0.701047,-0.711967,0.040466],[-0.679161,-0.711995,-0.178338],[-0.657546,0.708959,-0.254973],[-0.828066,0.558924,0.043714],[-0.801047,-0.558924,0.214308],[-0.678454,-0.711157,0.184271],[-0.656405,0.710984,0.252259],[-0.70223,0.710984,0.037074],[-0.702185,-0.711173,-0.03419],[-0.774028,0.558925,0.297462],[-0.695619,-0.558925,0.45135],[-0.588435,-0.712784,0.381685],[-0.548681,0.709269,0.442591],[-0.658659,0.70928,0.25118],[-0.677582,-0.712784,0.181168],[-0.644219,0.558925,0.522097],[-0.52209,-0.558925,0.644224],[-0.441509,-0.711077,0.54721],[-0.382766,0.710984,0.589909],[-0.546324,0.710984,0.442755],[-0.588586,-0.711125,0.384537],[-0.451358,0.558924,0.695615],[-0.297459,-0.558924,0.77403],[-0.251706,-0.712784,0.654663],[-0.182968,0.709223,0.680827],[-0.384776,0.709249,0.590689],[-0.441687,-0.712784,0.544841],[-0.214305,0.558925,0.801047],[-0.043719,-0.558925,0.828065],[-0.03701,0.709204,0.704031],[0.037115,-0.712243,0.700951],[-0.180306,-0.71215,0.678478],[-0.253452,0.709136,0.657942],[0.043716,0.558924,0.828066],[0.21431,-0.558924,0.801046],[0.181168,-0.712784,0.677582],[0.253184,0.709159,0.658021],[0.036909,0.709192,0.704048],[-0.037085,-0.712784,0.700402],[0.297463,0.558925,0.774028],[0.451355,-0.558925,0.695616],[0.384948,0.709326,0.590485],[0.440326,-0.712427,0.546408],[0.250866,-0.712339,0.65547],[0.183028,0.70927,0.680762],[0.522097,0.558925,0.644219],[0.644225,-0.558924,0.52209],[0.548864,0.709367,0.442207],[0.587132,-0.712499,0.384214],[0.695615,0.558924,0.451358],[0.774027,-0.558925,0.297465],[0.658741,0.70939,0.250651],[0.676938,-0.71255,0.184463],[0.801045,0.558925,0.214312],[0.883235,-0.44712,0.141351],[0.441708,0.894427,0.06996],[0.679317,0.710984,0.181741],[0.655584,-0.710784,0.254943],[0.680181,-0.7108,-0.17921],[0.656404,0.710984,-0.252262],[0.883415,0.447214,-0.13992],[0.442195,-0.89449,-0.065963],[0.591226,-0.710837,-0.381003],[0.546324,0.710984,-0.442755],[0.443998,-0.710887,-0.545441],[0.382768,0.710984,-0.589907],[0.25292,-0.710946,-0.656191],[0.181743,0.710984,-0.679317],[0.036863,-0.711008,-0.702217],[-0.037074,0.710984,-0.70223],[-0.182776,-0.711067,-0.678953],[-0.252262,0.710984,-0.656404],[-0.384253,-0.711116,-0.588782],[-0.442755,0.710984,-0.546325],[-0.590476,-0.712051,-0.379897],[-0.54675,0.708983,-0.44543],[-0.704041,0.709281,0.035316],[-0.700402,-0.712784,-0.037083],[-0.251604,-0.711021,0.656617],[-0.181742,0.710984,0.679317],[-0.037286,-0.710959,0.702244],[0.037075,0.710984,0.70223],[0.180711,-0.710899,0.679681],[0.25226,0.710984,0.656405],[0.381277,-0.710846,0.591038],[0.442753,0.710984,0.546325],[0.544919,-0.710807,0.444766],[0.589908,0.710984,0.382767],[0.885079,0.444427,0.138278],[0.440283,-0.89482,0.073808],[0.966025,0,-0.258449],[0.998609,0,0.052722],[0.83888,0,-0.544316],[0.629621,0,-0.776902],[0.35873,0,-0.933441],[0.052723,0,-0.998609],[-0.258449,0,-0.966025],[-0.544316,0,-0.83888],[-0.7769,0,-0.629624],[-0.933443,0,-0.358726],[-0.998609,0,-0.052719],[-0.966027,0,0.25844],[-0.838879,0,0.544318],[-0.629617,0,0.776905],[-0.358729,0,0.933442],[-0.052717,0,0.998609],[0.258441,0,0.966027],[0.544319,0,0.838878],[0.776905,0,0.629618],[0.93344,0,0.358734],[0,1,0],[0,1,0],[-0.654278,-0.711971,0.254984],[0,1,0],[0,1,0],[-0.380391,-0.712067,0.590138],[-0.54372,-0.712007,0.444314],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.656082,-0.712573,-0.248588],[0.882431,-0.450008,-0.137143],[0,1,0],[0,1,0],[0.546889,-0.712542,-0.439541],[0,1,0],[0.383709,-0.712485,-0.587479],[0,1,0],[0.1825,-0.712409,-0.677619],[0,1,0],[-0.036894,-0.712317,-0.700887],[0,1,0],[-0.252714,-0.71222,-0.654888],[0,1,0],[-0.44353,-0.712128,-0.544202],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.680287,0.709373,-0.184387],[0.442829,0.893649,-0.07276],[0.59023,0.709337,-0.385317],[0.442718,0.709284,-0.548559],[0.252169,0.709221,-0.658344],[0.037118,0.709151,-0.704079],[-0.181598,0.709086,-0.681337],[-0.382747,0.709027,-0.592272],[-0.68054,0.709271,-0.183848],[-0.654662,-0.712785,-0.251706],[-0.592524,0.709014,0.382381],[-0.681813,0.708974,0.180241],[-0.444914,0.70907,0.547057],[0.381684,-0.712784,0.588435],[0.444549,0.709127,0.54728],[0.544839,-0.712784,0.441689],[0.592161,0.709099,0.382785],[0.654662,-0.712784,0.251707],[0.681559,0.70908,0.180784],[0.881979,-0.45011,0.139691],[0.44364,0.893649,0.067634],[0.998609,0,-0.052719],[0.933442,0,-0.358729],[0.776902,0,-0.629622],[0.544318,0,-0.838879],[0.258443,0,-0.966027],[-0.052719,0,-0.998609],[-0.358725,0,-0.933443],[-0.62962,0,-0.776903],[-0.838883,0,-0.544311],[-0.966025,0,-0.258447],[-0.998609,0,0.052723],[-0.933444,0,0.358722],[-0.776906,0,0.629617],[-0.544308,0,0.838885],[-0.258446,0,0.966026],[0.052724,0,0.998609],[0.358726,0,0.933443],[0.629623,0,0.776901],[0.83888,0,0.544316],[0.966026,0,0.258443],[-0.001381,-0.999999,0.000369],[-0.001427,-0.999999,0.000226],[-0.001199,-0.999999,0.000778],[-0.0009,-0.999999,0.00111],[-0.000513,-0.999999,0.001334],[-0.000075,-0.999999,0.001427],[0.000369,-0.999999,0.001381],[0.000778,-0.999999,0.001199],[0.00111,-0.999999,0.0009],[0.001199,-0.999999,-0.000778],[0.001381,-0.999999,-0.000369],[0.000513,-0.999999,-0.001334],[0.0009,-0.999999,-0.00111],[-0.000369,-0.999999,-0.001381],[0.000075,-0.999999,-0.001427],[0.001427,-0.999999,0.000075],[0.001334,-0.999999,0.000513],[-0.000778,-0.999999,-0.001199],[-0.00111,-0.999999,-0.0009],[-0.001334,-0.999999,-0.000513],[-0.001427,-0.999999,-0.000226],[0.801047,-0.558925,-0.214305],[0.828066,-0.558924,0.043715],[0,-1,0],[0.677582,-0.712784,-0.181166],[0.657628,0.709071,-0.254446],[0.884754,0.444266,-0.140851],[0.440033,-0.895273,-0.069694],[0.774027,0.558925,-0.297466],[0,1,0],[0.828065,0.558925,-0.043719],[0.695614,-0.558925,-0.451359],[0.588435,-0.712784,-0.381684],[0.546934,0.709083,-0.445045],[0.644222,0.558925,-0.522093],[0.522094,-0.558925,-0.644222],[0.441689,-0.712784,-0.544839],[0.38292,0.709104,-0.592067],[0.451357,0.558925,-0.695615],[0.297464,-0.558925,-0.774027],[0.251707,-0.712785,-0.654662],[0.181662,0.709133,-0.68127],[0.214311,0.558925,-0.801046],[0.043715,-0.558924,-0.828066],[0.037085,-0.712784,-0.700402],[-0.03722,0.709164,-0.704061],[-0.043718,0.558925,-0.828065],[-0.214304,-0.558925,-0.801047],[-0.181167,-0.712784,-0.677582],[-0.25244,0.709198,-0.658264],[-0.297468,0.558925,-0.774026],[-0.451356,-0.558925,-0.695616],[-0.381685,-0.712784,-0.588434],[-0.443087,0.709229,-0.548333],[-0.522091,0.558924,-0.644224],[-0.644223,-0.558925,-0.522091],[-0.54484,-0.712784,-0.441688],[-0.590591,0.709253,-0.384918],[-0.695613,0.558925,-0.451359],[-0.774029,-0.558924,-0.297462],[-0.657228,-0.711172,-0.249573],[-0.679317,0.710984,-0.181742],[-0.589909,0.710984,-0.382766],[-0.547732,-0.711152,-0.440741],[-0.801047,0.558925,-0.214304],[-0.828065,-0.558925,-0.043719],[-0.704152,0.708955,-0.039396],[-0.701047,-0.711966,0.040465],[-0.679161,-0.711995,-0.178338],[-0.657546,0.708959,-0.254973],[-0.828066,0.558924,0.043714],[-0.801046,-0.558924,0.21431],[-0.678454,-0.711157,0.184272],[-0.656404,0.710984,0.25226],[-0.70223,0.710984,0.037074],[-0.702185,-0.711173,-0.034191],[-0.774028,0.558925,0.297462],[-0.695619,-0.558925,0.45135],[-0.588435,-0.712784,0.381684],[-0.548681,0.709269,0.442591],[-0.658659,0.709279,0.251179],[-0.677582,-0.712784,0.181167],[-0.644219,0.558925,0.522097],[-0.522093,-0.558925,0.644221],[-0.441511,-0.711077,0.547209],[-0.382769,0.710984,0.589907],[-0.546323,0.710984,0.442756],[-0.588585,-0.711124,0.384538],[-0.451358,0.558924,0.695615],[-0.297463,-0.558924,0.774028],[-0.251705,-0.712784,0.654663],[-0.182967,0.709223,0.680827],[-0.384777,0.709249,0.590688],[-0.441689,-0.712784,0.544839],[-0.214305,0.558925,0.801047],[-0.043723,-0.558926,0.828064],[-0.03701,0.709204,0.704031],[0.037112,-0.712243,0.700952],[-0.180304,-0.71215,0.678478],[-0.253455,0.709137,0.657941],[0.043716,0.558924,0.828066],[0.214317,-0.558924,0.801044],[0.181169,-0.712784,0.677582],[0.253185,0.709159,0.65802],[0.036908,0.709192,0.704048],[-0.037086,-0.712784,0.700402],[0.297463,0.558925,0.774028],[0.451355,-0.558925,0.695616],[0.384952,0.709325,0.590482],[0.440324,-0.712426,0.54641],[0.250871,-0.712339,0.655467],[0.18303,0.709271,0.680761],[0.522093,0.558925,0.644222],[0.644225,-0.558924,0.52209],[0.548861,0.709367,0.442211],[0.58713,-0.712499,0.384218],[0.695615,0.558925,0.451357],[0.774027,-0.558925,0.297464],[0.65874,0.709391,0.250652],[0.676939,-0.71255,0.184461],[0.801046,0.558925,0.21431],[0.883235,-0.44712,0.14135],[0.441708,0.894427,0.069959],[0.679318,0.710984,0.181741],[0.655584,-0.710784,0.254943],[0.680181,-0.7108,-0.17921],[0.656404,0.710984,-0.252262],[0.883415,0.447214,-0.13992],[0.442195,-0.89449,-0.065963],[0.591226,-0.710837,-0.381003],[0.546324,0.710984,-0.442755],[0.443998,-0.710887,-0.545441],[0.382768,0.710984,-0.589907],[0.25292,-0.710946,-0.656191],[0.181743,0.710984,-0.679317],[0.036863,-0.711008,-0.702217],[-0.037074,0.710984,-0.70223],[-0.182776,-0.711067,-0.678953],[-0.252262,0.710984,-0.656404],[-0.384253,-0.711116,-0.588782],[-0.442755,0.710984,-0.546324],[-0.590476,-0.712051,-0.379897],[-0.54675,0.708983,-0.44543],[-0.704041,0.709281,0.035316],[-0.700402,-0.712784,-0.037083],[-0.251605,-0.711021,0.656616],[-0.18174,0.710984,0.679318],[-0.037284,-0.710959,0.702245],[0.037073,0.710983,0.702231],[0.180709,-0.710899,0.679681],[0.252261,0.710984,0.656404],[0.381279,-0.710846,0.591037],[0.442753,0.710984,0.546326],[0.544918,-0.710807,0.444768],[0.589907,0.710984,0.382768],[0.885079,0.444427,0.138277],[0.440283,-0.89482,0.073808],[0.966025,0,-0.258449],[0.998609,0,0.052721],[0.83888,0,-0.544316],[0.62962,0,-0.776903],[0.35873,0,-0.933441],[0.052723,0,-0.998609],[-0.25845,0,-0.966025],[-0.544317,0,-0.83888],[-0.776899,0,-0.629625],[-0.933442,0,-0.358727],[-0.998609,0,-0.052719],[-0.966027,0,0.25844],[-0.838878,0,0.544319],[-0.629618,0,0.776905],[-0.35873,0,0.933441],[-0.052717,0,0.998609],[0.258441,0,0.966027],[0.544316,0,0.83888],[0.776902,0,0.629621],[0.933442,0,0.358729],[0,1,0],[0,1,0],[-0.654277,-0.711972,0.254987],[0,1,0],[0,1,0],[-0.380396,-0.712067,0.590135],[-0.543719,-0.712007,0.444315],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.656082,-0.712573,-0.248588],[0.882431,-0.450008,-0.137144],[0,1,0],[0,1,0],[0.546889,-0.712542,-0.439541],[0,1,0],[0.383709,-0.712485,-0.587479],[0,1,0],[0.1825,-0.712409,-0.677619],[0,1,0],[-0.036894,-0.712317,-0.700887],[0,1,0],[-0.252714,-0.71222,-0.654888],[0,1,0],[-0.44353,-0.712128,-0.544202],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.680287,0.709373,-0.184388],[0.442829,0.893649,-0.072761],[0.59023,0.709337,-0.385317],[0.442717,0.709284,-0.548559],[0.252169,0.709221,-0.658344],[0.037117,0.709151,-0.704079],[-0.181598,0.709086,-0.681337],[-0.382747,0.709027,-0.592272],[-0.68054,0.709271,-0.183849],[-0.654662,-0.712785,-0.251706],[-0.592522,0.709014,0.382384],[-0.681812,0.708975,0.180242],[-0.444918,0.709069,0.547055],[0.381683,-0.712784,0.588436],[0.444548,0.709126,0.547281],[0.544839,-0.712784,0.441689],[0.592162,0.709099,0.382783],[0.654662,-0.712784,0.251706],[0.681559,0.70908,0.180784],[0.881979,-0.45011,0.13969],[0.44364,0.893649,0.067634],[0.998609,0,-0.052719],[0.933442,0,-0.358729],[0.776902,0,-0.629622],[0.544318,0,-0.838879],[0.258442,0,-0.966027],[-0.052719,0,-0.998609],[-0.358725,0,-0.933443],[-0.629619,0,-0.776904],[-0.838883,0,-0.544311],[-0.966025,0,-0.258448],[-0.998609,0,0.052724],[-0.933443,0,0.358725],[-0.776908,0,0.629614],[-0.544311,0,0.838884],[-0.258455,0,0.966023],[0.052728,0,0.998609],[0.35873,0,0.933442],[0.629623,0,0.776901],[0.838881,0,0.544315],[0.966027,0,0.258442],[-0.001381,-0.999999,0.000369],[-0.001427,-0.999999,0.000226],[-0.001199,-0.999999,0.000778],[-0.0009,-0.999999,0.00111],[-0.000513,-0.999999,0.001334],[-0.000075,-0.999999,0.001427],[0.000369,-0.999999,0.001381],[0.000778,-0.999999,0.001199],[0.00111,-0.999999,0.0009],[0.001199,-0.999999,-0.000778],[0.001381,-0.999999,-0.000369],[0.000513,-0.999999,-0.001334],[0.0009,-0.999999,-0.00111],[-0.000369,-0.999999,-0.001381],[0.000075,-0.999999,-0.001427],[0.001427,-0.999999,0.000075],[0.001334,-0.999999,0.000513],[-0.000778,-0.999999,-0.001199],[-0.00111,-0.999999,-0.0009],[-0.001334,-0.999999,-0.000513],[-0.001427,-0.999999,-0.000226],[0.801046,-0.558925,-0.214308],[0.828065,-0.558925,0.043717],[0,-1,0],[0.677582,-0.712784,-0.181166],[0.657628,0.709071,-0.254446],[0.884754,0.444265,-0.140852],[0.440033,-0.895273,-0.069695],[0.774027,0.558925,-0.297466],[0,1,0],[0.828065,0.558925,-0.043717],[0.695615,-0.558925,-0.451357],[0.588435,-0.712784,-0.381684],[0.546934,0.709083,-0.445045],[0.644221,0.558925,-0.522094],[0.522093,-0.558925,-0.644222],[0.441689,-0.712784,-0.544839],[0.38292,0.709104,-0.592067],[0.451357,0.558925,-0.695615],[0.297464,-0.558925,-0.774027],[0.251706,-0.712785,-0.654662],[0.181662,0.709133,-0.681271],[0.214311,0.558925,-0.801046],[0.043715,-0.558924,-0.828066],[0.037085,-0.712784,-0.700402],[-0.03722,0.709164,-0.704061],[-0.043718,0.558925,-0.828065],[-0.214305,-0.558925,-0.801047],[-0.181167,-0.712785,-0.677582],[-0.252441,0.709198,-0.658264],[-0.297466,0.558925,-0.774026],[-0.451358,-0.558925,-0.695615],[-0.381685,-0.712784,-0.588434],[-0.443087,0.709228,-0.548333],[-0.522092,0.558925,-0.644223],[-0.644222,-0.558925,-0.522093],[-0.54484,-0.712784,-0.441687],[-0.590592,0.709253,-0.384917],[-0.695614,0.558925,-0.451358],[-0.774027,-0.558925,-0.297464],[-0.657228,-0.711172,-0.249573],[-0.679317,0.710984,-0.181741],[-0.589908,0.710984,-0.382767],[-0.54773,-0.711152,-0.440743],[-0.801046,0.558925,-0.214309],[-0.828065,-0.558925,-0.043717],[-0.704152,0.708955,-0.0394],[-0.701046,-0.711967,0.040465],[-0.67916,-0.711995,-0.178342],[-0.657546,0.708958,-0.254973],[-0.828065,0.558925,0.043717],[-0.801046,-0.558925,0.214308],[-0.678454,-0.711157,0.184272],[-0.656404,0.710984,0.252261],[-0.70223,0.710984,0.037073],[-0.702185,-0.711173,-0.034191],[-0.774028,0.558925,0.297463],[-0.695616,-0.558925,0.451356],[-0.588435,-0.712784,0.381685],[-0.548681,0.709268,0.442591],[-0.658659,0.709279,0.251179],[-0.677582,-0.712784,0.181166],[-0.644221,0.558925,0.522094],[-0.522094,-0.558925,0.644221],[-0.441511,-0.711077,0.547209],[-0.382768,0.710984,0.589907],[-0.546323,0.710984,0.442756],[-0.588585,-0.711124,0.384539],[-0.451358,0.558924,0.695615],[-0.297465,-0.558924,0.774027],[-0.251705,-0.712784,0.654663],[-0.182967,0.709223,0.680827],[-0.384776,0.709249,0.590688],[-0.441689,-0.712784,0.544839],[-0.214304,0.558925,0.801047],[-0.043723,-0.558926,0.828064],[-0.03701,0.709204,0.704032],[0.037111,-0.712243,0.700952],[-0.180303,-0.71215,0.678478],[-0.253454,0.709137,0.657941],[0.043715,0.558924,0.828066],[0.214317,-0.558924,0.801044],[0.181169,-0.712784,0.677582],[0.253185,0.709159,0.65802],[0.036908,0.709192,0.704049],[-0.037086,-0.712784,0.700402],[0.297464,0.558925,0.774027],[0.451355,-0.558925,0.695616],[0.384953,0.709325,0.590482],[0.440324,-0.712426,0.54641],[0.250871,-0.712339,0.655467],[0.18303,0.709271,0.680761],[0.522092,0.558925,0.644223],[0.644224,-0.558925,0.52209],[0.548861,0.709367,0.442212],[0.58713,-0.7125,0.384218],[0.695615,0.558925,0.451356],[0.774027,-0.558925,0.297465],[0.65874,0.70939,0.250653],[0.676939,-0.71255,0.184461],[0.801047,0.558925,0.214307],[0.883235,-0.44712,0.14135],[0.441708,0.894427,0.069959],[0.679317,0.710984,0.181741],[0.655583,-0.710784,0.254943],[0.680182,-0.7108,-0.179209],[0.656405,0.710984,-0.25226],[0.883415,0.447214,-0.13992],[0.442195,-0.89449,-0.065963],[0.591226,-0.710837,-0.381002],[0.546324,0.710984,-0.442755],[0.443997,-0.710886,-0.545442],[0.382768,0.710984,-0.589907],[0.25292,-0.710946,-0.656191],[0.181742,0.710984,-0.679317],[0.036862,-0.711008,-0.702217],[-0.037074,0.710984,-0.70223],[-0.182776,-0.711067,-0.678952],[-0.252263,0.710984,-0.656403],[-0.384253,-0.711115,-0.588782],[-0.442754,0.710984,-0.546325],[-0.590477,-0.712051,-0.379895],[-0.546752,0.708983,-0.445428],[-0.704041,0.709281,0.035314],[-0.700402,-0.712784,-0.037084],[-0.251604,-0.711021,0.656616],[-0.181739,0.710984,0.679318],[-0.037284,-0.710959,0.702245],[0.037073,0.710983,0.702231],[0.180709,-0.710899,0.679681],[0.252261,0.710984,0.656404],[0.38128,-0.710846,0.591036],[0.442754,0.710984,0.546325],[0.544918,-0.710807,0.444767],[0.589907,0.710984,0.382768],[0.885078,0.444427,0.138279],[0.440283,-0.89482,0.073807],[0.966026,0,-0.258447],[0.998609,0,0.052721],[0.838879,0,-0.544318],[0.62962,0,-0.776903],[0.358731,0,-0.933441],[0.052722,0,-0.998609],[-0.258449,0,-0.966025],[-0.544316,0,-0.83888],[-0.776901,0,-0.629622],[-0.933441,0,-0.35873],[-0.998609,0,-0.052721],[-0.966026,0,0.258445],[-0.838881,0,0.544315],[-0.629619,0,0.776904],[-0.358728,0,0.933442],[-0.052718,0,0.998609],[0.258441,0,0.966027],[0.544317,0,0.83888],[0.776902,0,0.629621],[0.933443,0,0.358727],[0,1,0],[0,1,0],[-0.654276,-0.711971,0.254989],[0,1,0],[0,1,0],[-0.380396,-0.712067,0.590135],[-0.543721,-0.712007,0.444313],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.656082,-0.712573,-0.248586],[0.882431,-0.450008,-0.137144],[0,1,0],[0,1,0],[0.546888,-0.712542,-0.439543],[0,1,0],[0.383709,-0.712485,-0.587479],[0,1,0],[0.182501,-0.712409,-0.677619],[0,1,0],[-0.036894,-0.712317,-0.700887],[0,1,0],[-0.252713,-0.71222,-0.654888],[0,1,0],[-0.44353,-0.712128,-0.544201],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.680287,0.709373,-0.184387],[0.442829,0.893649,-0.072763],[0.59023,0.709337,-0.385318],[0.442716,0.709284,-0.54856],[0.25217,0.709221,-0.658344],[0.037117,0.709151,-0.704079],[-0.181598,0.709086,-0.681337],[-0.382747,0.709027,-0.592272],[-0.680539,0.709271,-0.183849],[-0.654662,-0.712784,-0.251706],[-0.592522,0.709013,0.382383],[-0.681811,0.708975,0.180245],[-0.44492,0.709069,0.547053],[0.381683,-0.712784,0.588436],[0.444548,0.709126,0.547281],[0.54484,-0.712784,0.441688],[0.592162,0.709099,0.382782],[0.654663,-0.712784,0.251706],[0.681559,0.70908,0.180785],[0.881979,-0.45011,0.139693],[0.44364,0.893649,0.067635],[0.998609,0,-0.052721],[0.933442,0,-0.358729],[0.776902,0,-0.629622],[0.544317,0,-0.838879],[0.258442,0,-0.966027],[-0.052719,0,-0.998609],[-0.358728,0,-0.933442],[-0.62962,0,-0.776903],[-0.83888,0,-0.544316],[-0.966026,0,-0.258446],[-0.998609,0,0.052721],[-0.933442,0,0.358729],[-0.776905,0,0.629617],[-0.544313,0,0.838882],[-0.258456,0,0.966023],[0.052727,0,0.998609],[0.35873,0,0.933441],[0.629622,0,0.776902],[0.838881,0,0.544314],[0.966026,0,0.258446],[-0.001381,-0.999999,0.000369],[-0.001427,-0.999999,0.000226],[-0.001199,-0.999999,0.000778],[-0.0009,-0.999999,0.00111],[-0.000513,-0.999999,0.001334],[-0.000075,-0.999999,0.001427],[0.000369,-0.999999,0.001381],[0.000778,-0.999999,0.001199],[0.00111,-0.999999,0.0009],[0.001199,-0.999999,-0.000778],[0.001381,-0.999999,-0.000369],[0.000513,-0.999999,-0.001334],[0.0009,-0.999999,-0.00111],[-0.000369,-0.999999,-0.001381],[0.000075,-0.999999,-0.001427],[0.001427,-0.999999,0.000075],[0.001334,-0.999999,0.000513],[-0.000778,-0.999999,-0.001199],[-0.00111,-0.999999,-0.0009],[-0.001334,-0.999999,-0.000513],[-0.001427,-0.999999,-0.000226],[0.801047,-0.558925,-0.214307],[0.828065,-0.558925,0.043717],[0,-1,0],[0.677582,-0.712784,-0.181167],[0.657628,0.709071,-0.254447],[0.884754,0.444265,-0.140852],[0.440033,-0.895273,-0.069695],[0.774026,0.558925,-0.297468],[0,1,0],[0.828065,0.558925,-0.043718],[0.695617,-0.558924,-0.451354],[0.588435,-0.712784,-0.381684],[0.546934,0.709083,-0.445044],[0.644226,0.558924,-0.522089],[0.522095,-0.558925,-0.64422],[0.441688,-0.712784,-0.544839],[0.382918,0.709104,-0.592068],[0.451351,0.558926,-0.695618],[0.297457,-0.558925,-0.77403],[0.251704,-0.712785,-0.654663],[0.181662,0.709132,-0.681271],[0.214312,0.558924,-0.801046],[0.043715,-0.558924,-0.828066],[0.037085,-0.712785,-0.700402],[-0.03722,0.709163,-0.704061],[-0.043722,0.558926,-0.828064],[-0.214302,-0.558925,-0.801048],[-0.181165,-0.712785,-0.677582],[-0.252439,0.709198,-0.658265],[-0.297459,0.558924,-0.77403],[-0.451354,-0.558925,-0.695616],[-0.381684,-0.712785,-0.588435],[-0.443087,0.709229,-0.548332],[-0.522094,0.558926,-0.64422],[-0.644226,-0.558924,-0.522088],[-0.54484,-0.712784,-0.441687],[-0.590591,0.709254,-0.384917],[-0.695616,0.558924,-0.451356],[-0.774028,-0.558925,-0.297463],[-0.657227,-0.711172,-0.249574],[-0.679317,0.710984,-0.181742],[-0.589909,0.710984,-0.382766],[-0.547733,-0.711152,-0.440741],[-0.801045,0.558925,-0.214311],[-0.828065,-0.558925,-0.043717],[-0.704152,0.708955,-0.039401],[-0.701046,-0.711967,0.040464],[-0.67916,-0.711995,-0.178342],[-0.657545,0.708959,-0.254974],[-0.828065,0.558925,0.043718],[-0.801047,-0.558925,0.214307],[-0.678454,-0.711157,0.184271],[-0.656404,0.710984,0.25226],[-0.70223,0.710984,0.037073],[-0.702185,-0.711173,-0.034191],[-0.774028,0.558925,0.297462],[-0.695616,-0.558925,0.451355],[-0.588435,-0.712784,0.381685],[-0.548681,0.709268,0.442591],[-0.658659,0.709279,0.251179],[-0.677582,-0.712784,0.181167],[-0.644222,0.558925,0.522093],[-0.522093,-0.558925,0.644222],[-0.44151,-0.711077,0.547209],[-0.382768,0.710984,0.589908],[-0.546323,0.710984,0.442756],[-0.588585,-0.711124,0.384538],[-0.451357,0.558925,0.695615],[-0.297465,-0.558924,0.774027],[-0.251705,-0.712784,0.654663],[-0.182967,0.709223,0.680827],[-0.384777,0.709249,0.590688],[-0.441689,-0.712784,0.544839],[-0.214304,0.558925,0.801047],[-0.043723,-0.558926,0.828064],[-0.03701,0.709204,0.704032],[0.037112,-0.712243,0.700952],[-0.180302,-0.71215,0.678479],[-0.253453,0.709137,0.657941],[0.043715,0.558924,0.828066],[0.214317,-0.558924,0.801045],[0.181168,-0.712784,0.677582],[0.253185,0.709159,0.65802],[0.036908,0.709192,0.704049],[-0.037086,-0.712784,0.700402],[0.297463,0.558925,0.774027],[0.451353,-0.558925,0.695617],[0.384953,0.709325,0.590482],[0.440324,-0.712426,0.54641],[0.250871,-0.712339,0.655467],[0.18303,0.709271,0.680761],[0.522092,0.558925,0.644223],[0.644226,-0.558924,0.522088],[0.548861,0.709367,0.442211],[0.58713,-0.7125,0.384217],[0.695616,0.558925,0.451355],[0.774028,-0.558925,0.297463],[0.65874,0.70939,0.250652],[0.676939,-0.71255,0.184461],[0.801046,0.558925,0.214308],[0.883235,-0.44712,0.14135],[0.441708,0.894427,0.069959],[0.679318,0.710984,0.181741],[0.655584,-0.710784,0.254943],[0.680182,-0.7108,-0.17921],[0.656404,0.710984,-0.252261],[0.883415,0.447214,-0.13992],[0.442195,-0.89449,-0.065963],[0.591227,-0.710837,-0.381001],[0.546326,0.710984,-0.442753],[0.443998,-0.710887,-0.545441],[0.382765,0.710984,-0.589909],[0.252917,-0.710946,-0.656193],[0.181743,0.710983,-0.679317],[0.036864,-0.711009,-0.702216],[-0.037076,0.710984,-0.70223],[-0.182777,-0.711067,-0.678953],[-0.252259,0.710983,-0.656405],[-0.38425,-0.711116,-0.588783],[-0.442754,0.710984,-0.546324],[-0.590479,-0.71205,-0.379893],[-0.546755,0.708983,-0.445424],[-0.704041,0.709281,0.035314],[-0.700402,-0.712784,-0.037084],[-0.251604,-0.711021,0.656616],[-0.18174,0.710984,0.679318],[-0.037285,-0.710959,0.702245],[0.037073,0.710984,0.702231],[0.180709,-0.710899,0.679681],[0.252262,0.710984,0.656404],[0.38128,-0.710846,0.591037],[0.442753,0.710984,0.546326],[0.544918,-0.710807,0.444768],[0.589907,0.710984,0.382768],[0.885078,0.444427,0.138279],[0.440283,-0.89482,0.073807],[0.966025,0,-0.258449],[0.998609,0,0.052722],[0.83888,0,-0.544316],[0.629623,0,-0.776901],[0.358722,0,-0.933444],[0.052727,0,-0.998609],[-0.258451,0,-0.966024],[-0.544309,0,-0.838885],[-0.776907,0,-0.629615],[-0.93344,0,-0.358733],[-0.998609,0,-0.052722],[-0.966026,0,0.258446],[-0.838882,0,0.544313],[-0.629619,0,0.776904],[-0.358727,0,0.933442],[-0.052718,0,0.998609],[0.258441,0,0.966027],[0.544316,0,0.83888],[0.776902,0,0.629621],[0.933443,0,0.358726],[0,1,0],[0,1,0],[-0.654277,-0.711971,0.254988],[0,1,0],[0,1,0],[-0.380396,-0.712067,0.590135],[-0.543721,-0.712007,0.444312],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.656082,-0.712573,-0.248587],[0.882431,-0.450008,-0.137145],[0,1,0],[0,1,0],[0.54689,-0.712542,-0.43954],[0,1,0],[0.383705,-0.712486,-0.587481],[0,1,0],[0.182505,-0.712408,-0.677618],[0,1,0],[-0.0369,-0.712318,-0.700886],[0,1,0],[-0.252709,-0.71222,-0.65489],[0,1,0],[-0.44353,-0.712129,-0.544201],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.680287,0.709373,-0.184387],[0.442829,0.893649,-0.072763],[0.59023,0.709337,-0.385318],[0.442717,0.709285,-0.548559],[0.252169,0.70922,-0.658345],[0.03712,0.709153,-0.704077],[-0.181604,0.709085,-0.681336],[-0.382741,0.709027,-0.592275],[-0.680539,0.709271,-0.18385],[-0.654662,-0.712784,-0.251706],[-0.592523,0.709014,0.382382],[-0.681812,0.708975,0.180244],[-0.44492,0.709069,0.547053],[0.381683,-0.712784,0.588436],[0.444548,0.709126,0.547281],[0.54484,-0.712784,0.441688],[0.592162,0.709099,0.382782],[0.654662,-0.712784,0.251706],[0.681559,0.70908,0.180785],[0.881979,-0.45011,0.139693],[0.44364,0.893649,0.067635],[0.998609,0,-0.052721],[0.933442,0,-0.358728],[0.776907,0,-0.629615],[0.544313,0,-0.838882],[0.258438,0,-0.966028],[-0.052719,0,-0.998609],[-0.35872,0,-0.933445],[-0.629623,0,-0.776901],[-0.838883,0,-0.544312],[-0.966026,0,-0.258445],[-0.998609,0,0.052721],[-0.933442,0,0.358728],[-0.776905,0,0.629618],[-0.544312,0,0.838883],[-0.258457,0,0.966023],[0.052728,0,0.998609],[0.358728,0,0.933442],[0.629623,0,0.776901],[0.838883,0,0.544312],[0.966026,0,0.258445],[-0.001381,-0.999999,0.000369],[-0.001427,-0.999999,0.000226],[-0.001199,-0.999999,0.000778],[-0.0009,-0.999999,0.00111],[-0.000513,-0.999999,0.001334],[-0.000075,-0.999999,0.001427],[0.000369,-0.999999,0.001381],[0.000778,-0.999999,0.001199],[0.00111,-0.999999,0.0009],[0.001199,-0.999999,-0.000778],[0.001381,-0.999999,-0.000369],[0.000513,-0.999999,-0.001334],[0.0009,-0.999999,-0.00111],[-0.000369,-0.999999,-0.001381],[0.000075,-0.999999,-0.001427],[0.001427,-0.999999,0.000075],[0.001334,-0.999999,0.000513],[-0.000778,-0.999999,-0.001199],[-0.00111,-0.999999,-0.0009],[-0.001334,-0.999999,-0.000513],[-0.001427,-0.999999,-0.000226],[0.801046,-0.558925,-0.214308],[0.828065,-0.558925,0.043717],[0,-1,0],[0.677582,-0.712784,-0.181166],[0.657628,0.709071,-0.254446],[0.884754,0.444265,-0.140852],[0.440033,-0.895273,-0.069695],[0.774028,0.558924,-0.297463],[0,1,0],[0.828065,0.558925,-0.043719],[0.695616,-0.558925,-0.451355],[0.588435,-0.712784,-0.381684],[0.546933,0.709083,-0.445045],[0.644221,0.558925,-0.522094],[0.522094,-0.558925,-0.644222],[0.441688,-0.712784,-0.54484],[0.382918,0.709104,-0.592068],[0.451358,0.558924,-0.695615],[0.297466,-0.558925,-0.774027],[0.251705,-0.712784,-0.654662],[0.181662,0.709133,-0.681271],[0.214311,0.558925,-0.801045],[0.043719,-0.558925,-0.828065],[0.037085,-0.712785,-0.700402],[-0.03722,0.709164,-0.704061],[-0.043718,0.558925,-0.828065],[-0.214311,-0.558925,-0.801046],[-0.181166,-0.712784,-0.677582],[-0.25244,0.709198,-0.658265],[-0.297467,0.558925,-0.774026],[-0.451357,-0.558925,-0.695615],[-0.381684,-0.712784,-0.588435],[-0.443086,0.709229,-0.548333],[-0.522092,0.558924,-0.644223],[-0.644223,-0.558925,-0.522092],[-0.54484,-0.712784,-0.441688],[-0.590591,0.709254,-0.384917],[-0.695616,0.558925,-0.451355],[-0.774027,-0.558925,-0.297464],[-0.657227,-0.711172,-0.249574],[-0.679317,0.710984,-0.181741],[-0.589908,0.710984,-0.382767],[-0.547731,-0.711152,-0.440742],[-0.801046,0.558925,-0.21431],[-0.828065,-0.558925,-0.043717],[-0.704152,0.708955,-0.039401],[-0.701046,-0.711967,0.040464],[-0.67916,-0.711994,-0.17834],[-0.657546,0.708959,-0.254972],[-0.828065,0.558925,0.043718],[-0.801046,-0.558925,0.214308],[-0.678454,-0.711157,0.184272],[-0.656404,0.710984,0.25226],[-0.70223,0.710984,0.037074],[-0.702185,-0.711173,-0.03419],[-0.774027,0.558925,0.297466],[-0.695616,-0.558925,0.451355],[-0.588435,-0.712784,0.381684],[-0.548681,0.709268,0.442591],[-0.658659,0.709279,0.25118],[-0.677582,-0.712784,0.181167],[-0.644224,0.558925,0.522091],[-0.522093,-0.558925,0.644222],[-0.441511,-0.711077,0.547208],[-0.382767,0.710984,0.589908],[-0.546325,0.710984,0.442754],[-0.588586,-0.711124,0.384537],[-0.451354,0.558925,0.695617],[-0.297462,-0.558924,0.774029],[-0.251705,-0.712784,0.654663],[-0.182967,0.709223,0.680827],[-0.384776,0.709249,0.590689],[-0.441688,-0.712784,0.54484],[-0.214308,0.558924,0.801047],[-0.043719,-0.558925,0.828065],[-0.037013,0.709204,0.704031],[0.037115,-0.712243,0.700951],[-0.180306,-0.71215,0.678478],[-0.253452,0.709136,0.657943],[0.043718,0.558925,0.828065],[0.214312,-0.558925,0.801045],[0.181166,-0.712784,0.677582],[0.253184,0.709159,0.658021],[0.036908,0.709192,0.704049],[-0.037085,-0.712784,0.700402],[0.297461,0.558924,0.774029],[0.451357,-0.558925,0.695615],[0.384946,0.709325,0.590486],[0.440321,-0.712427,0.546411],[0.250869,-0.712338,0.655469],[0.183033,0.70927,0.680761],[0.522093,0.558925,0.644222],[0.644223,-0.558925,0.522092],[0.548862,0.709367,0.442209],[0.587132,-0.712499,0.384214],[0.695616,0.558925,0.451356],[0.774028,-0.558925,0.297463],[0.658741,0.70939,0.250651],[0.676938,-0.71255,0.184463],[0.801046,0.558925,0.21431],[0.883235,-0.44712,0.141351],[0.441708,0.894427,0.06996],[0.679317,0.710984,0.181742],[0.655583,-0.710784,0.254943],[0.680182,-0.7108,-0.179209],[0.656404,0.710984,-0.252261],[0.883415,0.447214,-0.139919],[0.442196,-0.89449,-0.065963],[0.591226,-0.710837,-0.381002],[0.546325,0.710984,-0.442754],[0.443998,-0.710887,-0.545441],[0.382767,0.710984,-0.589908],[0.252918,-0.710946,-0.656192],[0.181741,0.710984,-0.679317],[0.036862,-0.711008,-0.702217],[-0.037074,0.710984,-0.70223],[-0.182775,-0.711067,-0.678953],[-0.25226,0.710984,-0.656404],[-0.384252,-0.711116,-0.588783],[-0.442754,0.710984,-0.546325],[-0.590477,-0.712051,-0.379895],[-0.546751,0.708983,-0.445429],[-0.704041,0.709281,0.035315],[-0.700402,-0.712784,-0.037084],[-0.251603,-0.711021,0.656617],[-0.181741,0.710984,0.679317],[-0.037286,-0.710959,0.702244],[0.037074,0.710984,0.70223],[0.180711,-0.710899,0.679681],[0.252261,0.710984,0.656404],[0.381278,-0.710846,0.591037],[0.442754,0.710984,0.546325],[0.544919,-0.710807,0.444766],[0.589908,0.710984,0.382767],[0.885078,0.444427,0.138281],[0.440283,-0.89482,0.073808],[0.966025,0,-0.258447],[0.998609,0,0.052722],[0.838882,0,-0.544314],[0.629619,0,-0.776904],[0.358733,0,-0.93344],[0.052722,0,-0.998609],[-0.25845,0,-0.966025],[-0.544317,0,-0.83888],[-0.776902,0,-0.629622],[-0.933442,0,-0.358727],[-0.998609,0,-0.052723],[-0.966025,0,0.258448],[-0.838881,0,0.544315],[-0.629621,0,0.776902],[-0.358724,0,0.933444],[-0.052722,0,0.998609],[0.258446,0,0.966026],[0.544313,0,0.838883],[0.776905,0,0.629618],[0.933442,0,0.358729],[0,1,0],[0,1,0],[-0.654277,-0.711971,0.254987],[0,1,0],[0,1,0],[-0.380393,-0.712068,0.590136],[-0.54372,-0.712007,0.444314],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.656082,-0.712573,-0.248587],[0.882431,-0.450008,-0.137146],[0,1,0],[0,1,0],[0.546889,-0.712542,-0.439541],[0,1,0],[0.383709,-0.712485,-0.58748],[0,1,0],[0.182501,-0.712409,-0.677618],[0,1,0],[-0.036894,-0.712317,-0.700887],[0,1,0],[-0.252714,-0.71222,-0.654888],[0,1,0],[-0.443531,-0.712128,-0.544201],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.680287,0.709373,-0.184389],[0.442829,0.893649,-0.072762],[0.590231,0.709337,-0.385317],[0.442716,0.709284,-0.54856],[0.25217,0.709221,-0.658344],[0.037117,0.709151,-0.704079],[-0.181598,0.709086,-0.681337],[-0.382748,0.709027,-0.592271],[-0.680539,0.709271,-0.183849],[-0.654662,-0.712784,-0.251706],[-0.592522,0.709014,0.382383],[-0.681813,0.708974,0.180242],[-0.444917,0.709069,0.547055],[0.381684,-0.712784,0.588435],[0.444549,0.709127,0.54728],[0.54484,-0.712784,0.441688],[0.592162,0.709099,0.382782],[0.654662,-0.712784,0.251706],[0.681559,0.70908,0.180785],[0.881979,-0.45011,0.139693],[0.44364,0.893649,0.067636],[0.998609,0,-0.052721],[0.933443,0,-0.358727],[0.776904,0,-0.629619],[0.544317,0,-0.83888],[0.25845,0,-0.966025],[-0.052723,0,-0.998609],[-0.358731,0,-0.933441],[-0.629621,0,-0.776902],[-0.838881,0,-0.544315],[-0.966026,0,-0.258446],[-0.998609,0,0.052721],[-0.933442,0,0.358728],[-0.776905,0,0.629618],[-0.544312,0,0.838883],[-0.258448,0,0.966025],[0.052724,0,0.998609],[0.358731,0,0.933441],[0.629621,0,0.776903],[0.838881,0,0.544314],[0.966026,0,0.258445],[-0.001381,-0.999999,0.000369],[-0.001427,-0.999999,0.000226],[-0.001199,-0.999999,0.000778],[-0.0009,-0.999999,0.00111],[-0.000513,-0.999999,0.001334],[-0.000075,-0.999999,0.001427],[0.000369,-0.999999,0.001381],[0.000778,-0.999999,0.001199],[0.00111,-0.999999,0.0009],[0.001199,-0.999999,-0.000778],[0.001381,-0.999999,-0.000369],[0.000513,-0.999999,-0.001334],[0.0009,-0.999999,-0.00111],[-0.000369,-0.999999,-0.001381],[0.000075,-0.999999,-0.001427],[0.001427,-0.999999,0.000075],[0.001334,-0.999999,0.000513],[-0.000778,-0.999999,-0.001199],[-0.00111,-0.999999,-0.0009],[-0.001334,-0.999999,-0.000513],[-0.001427,-0.999999,-0.000226],[0,-1,0],[0,-1,0],[0,-1,0],[0.965281,-0.261204,0.002054],[0.999998,0,0.002128],[0.92469,0,-0.380721],[0.92469,0,-0.380721],[0.999998,0,0.002128],[0.92469,0,-0.380721],[0.862701,0.359662,-0.355514],[0.923493,-0.050855,-0.380228],[0.602656,-0.054843,-0.796114],[0.916418,-0.130184,-0.378457],[0,1,0],[0,1,0],[0,1,0],[0,-1,0],[-0.358939,-0.333333,-0.871809],[-0.219805,0.816497,-0.533872],[0.871809,0.333333,-0.358939],[0.533872,-0.816497,-0.219805],[-0.702181,0.182574,-0.688193],[-0.219805,0.816497,-0.533872],[0.871809,0.333333,-0.358939],[0.889652,0.436436,0.134324],[-0.702181,0.182574,-0.688192],[-0.219805,0.816497,-0.533872],[0.871809,0.333333,-0.358939],[0.889652,0.436436,0.134324],[-0.378058,0.161635,-0.911563],[-0.137396,-0.016093,-0.990385],[0,1,0],[0,-1,0],[-0.002054,-0.261204,-0.965281],[-0.002127,0,-0.999998],[-0.707107,0,-0.707107],[-0.480069,-0.734212,-0.480069],[-0.002127,0,-0.999998],[-0.707107,0,-0.707107],[-0.353571,0.386337,-0.851899],[-0.792007,-0.109171,-0.600672],[0,1,0],[0,-1,0],[-0.870274,-0.333333,0.362646],[-0.532932,0.816497,0.222074],[-0.362646,0.333333,-0.870274],[-0.222074,-0.816497,-0.532932],[-0.685198,0.182574,0.705103],[-0.532932,0.816497,0.222074],[-0.362646,0.333333,-0.870274],[0.130536,0.436436,-0.890216],[-0.685199,0.182574,0.705103],[-0.532932,0.816496,0.222074],[-0.362646,0.333333,-0.870274],[0.130537,0.436436,-0.890216],[-0.918488,0.100738,0.382403],[-0.979845,-0.147161,0.13508],[0,1,0],[0,-1,0],[-0.965281,-0.261204,-0.002054],[-0.999998,0,-0.002128],[-0.707107,0,0.707107],[-0.479613,-0.734808,0.479613],[-0.999998,0,-0.002128],[-0.707107,0,0.707107],[-0.862701,0.359662,0.355514],[-0.602656,-0.054843,0.796114],[0,1,0],[0,-1,0],[0.35894,-0.333333,0.871809],[0.219805,0.816497,0.533872],[-0.871809,0.333333,0.358939],[-0.533872,-0.816497,0.219804],[0.702181,0.182574,0.688193],[0.219804,0.816496,0.533872],[-0.871809,0.333333,0.35894],[-0.889652,0.436436,-0.134323],[0.702181,0.182574,0.688193],[0.219805,0.816497,0.533872],[-0.871809,0.333333,0.358939],[-0.889652,0.436436,-0.134324],[0.378058,0.161635,0.911563],[0.137396,-0.016093,0.990385],[0,1,0],[0,-1,0],[0.002053,-0.261204,0.965281],[0.002127,0,0.999998],[0.707107,0,0.707107],[0.48007,-0.734212,0.480069],[0.002127,0,0.999998],[0.707107,0,0.707107],[0.353571,0.386336,0.851899],[0.792007,-0.109172,0.600672],[0,1,0],[0.870274,-0.333333,-0.362646],[0.532932,0.816497,-0.222074],[0.362645,0.333334,0.870274],[0.222074,-0.816497,0.532932],[0.685198,0.182574,-0.705103],[0.532932,0.816497,-0.222074],[0.362647,0.333333,0.870274],[-0.130536,0.436436,0.890216],[0.685198,0.182574,-0.705103],[0.532932,0.816497,-0.222074],[0.362645,0.333334,0.870274],[-0.130538,0.436436,0.890216],[0.8913,0.254188,-0.375462],[0.913139,-0.152039,0.378234],[-0.652703,-0.707107,-0.27199],[0.652703,-0.707107,0.27199],[-0.923061,0,-0.384653],[0.923061,0,0.384653],[-0.269211,-0.707107,0.653854],[0.26921,-0.707107,-0.653855],[-0.380722,0,0.92469],[0.380721,0,-0.92469],[0.652703,-0.707107,0.27199],[-0.652703,-0.707107,-0.27199],[0.923061,0,0.384653],[-0.923061,0,-0.384653],[0.170264,-0.894427,-0.413534],[0.26921,-0.707107,-0.653855],[-0.26921,-0.707107,0.653855],[0.380721,0,-0.92469],[0.380721,0,-0.92469],[-0.380721,0,0.92469],[0.380721,0,-0.92469],[-0.652703,-0.707107,-0.271991],[0.652703,-0.707107,0.271991],[-0.269211,-0.707107,0.653854],[0.26921,-0.707107,-0.653855],[0.652703,-0.707107,0.271991],[-0.652703,-0.707107,-0.27199],[0.269211,-0.707107,-0.653854],[-0.269211,-0.707107,0.653854],[0,-1,0],[0,-1,0],[0,-1,0],[0.543712,-0.731307,-0.411786],[0.255161,0.906303,-0.336909],[0.653281,0.707107,-0.270598],[0.413171,-0.894427,-0.171141],[0.198007,0.976763,-0.082017],[0.29357,0.948172,-0.121601],[0.29357,0.948172,-0.121601],[0.293571,0.948172,-0.121601],[0.456923,-0.819431,-0.346055],[0.255161,0.906303,-0.336909],[0.653281,0.707107,-0.270598],[0.292156,-0.948683,-0.121015],[0.461124,0.866535,-0.191004],[0.461124,0.866535,-0.191004],[0.461124,0.866535,-0.191004],[0.238663,0.966058,-0.098857],[0.403758,0.89945,-0.167241],[0.403737,0.899461,-0.167232],[0.403751,0.899453,-0.167241],[0.403799,0.899433,-0.167231],[0.924221,-0.000001,-0.381858],[0.924221,-0.000001,-0.381858],[0.924222,0,-0.381856],[0.882491,0.297097,-0.364614],[0.536429,0.461046,-0.706881],[0.831911,0.435642,-0.343716],[0.913968,0.148548,-0.37762],[0.544081,-0.731307,-0.411298],[0.412273,0.731307,-0.543343],[0.826649,0.447214,-0.341542],[0.413325,-0.894427,-0.170771],[0.473409,0.621765,-0.623933],[0,1,0],[0.776027,0.621582,-0.106852],[0,-1,0],[0.093286,-0.731307,-0.675639],[-0.078396,0.819431,-0.567792],[0.061604,0.986958,-0.148725],[0.377692,-0.160979,-0.91183],[0.121601,0.948172,-0.293571],[0.121601,0.948172,-0.29357],[0.06679,-0.87266,-0.48374],[-0.06679,0.87266,-0.48374],[0.131289,0.939308,-0.316961],[0.191004,0.866534,-0.461124],[0.191004,0.866535,-0.461124],[0.191004,0.866535,-0.461124],[0.167492,0.899364,-0.403845],[0.167701,0.899327,-0.40384],[0.167492,0.899364,-0.403845],[0.167282,0.899401,-0.40385],[0.38351,0,-0.923537],[0.36614,0.297551,-0.881706],[0.379242,0.148777,-0.913258],[0.38351,0,-0.923537],[0.345091,0.436271,-0.831011],[0.093502,-0.731417,-0.67549],[-0.093502,0.731417,-0.67549],[-0.107371,0.62189,-0.775709],[0,-1,0],[-0.411786,-0.731307,-0.543712],[-0.389284,0.87266,-0.294827],[-0.082017,0.976763,-0.198007],[-0.121601,0.948172,-0.29357],[-0.377692,-0.160979,-0.91183],[-0.121601,0.948172,-0.293571],[-0.255161,-0.906303,-0.336909],[-0.456923,0.819431,-0.346055],[-0.191004,0.866534,-0.461124],[-0.191004,0.866534,-0.461124],[-0.191004,0.866534,-0.461124],[-0.098857,0.966058,-0.238663],[-0.347766,0.421092,-0.837699],[-0.359796,0.346176,-0.866435],[-0.167492,0.899364,-0.403845],[-0.167282,0.899401,-0.40385],[-0.38351,-0.000002,-0.923537],[-0.383512,0.000001,-0.923536],[-0.345089,0.436276,-0.83101],[-0.345091,0.436271,-0.831011],[-0.345089,0.436276,-0.83101],[-0.345086,0.436281,-0.831008],[-0.412273,-0.731307,-0.543343],[-0.544082,0.731307,-0.411297],[-0.624787,0.621742,-0.472312],[0,-1,0],[-0.675639,-0.731307,-0.093286],[-0.48374,0.87266,0.066791],[-0.293571,0.948172,-0.121601],[-0.267179,-0.957271,-0.110669],[-0.534358,0.815764,-0.221338],[-0.29357,0.948172,-0.121601],[-0.567792,-0.819431,-0.078396],[-0.483739,0.87266,0.066791],[-0.461124,0.866535,-0.191004],[-0.418287,0.891637,-0.173262],[-0.432721,0.883531,-0.179235],[-0.238663,0.966058,-0.098857],[-0.403736,0.89946,-0.167241],[-0.403736,0.89946,-0.167241],[-0.838234,0.421131,-0.346428],[-0.924222,-0.000004,-0.381856],[-0.924222,-0.000002,-0.381855],[-0.867067,0.346206,-0.358241],[-0.831911,0.435642,-0.343716],[-0.83191,0.435643,-0.343716],[-0.831911,0.435642,-0.343716],[-0.831911,0.435641,-0.343716],[-0.675788,-0.731197,-0.093069],[-0.675788,0.731197,0.093071],[-0.776022,0.621581,0.106895],[0,-1,0],[-0.543712,-0.731307,0.411786],[-0.294827,0.87266,0.389284],[-0.293571,0.948172,0.121601],[-0.91183,-0.160979,0.377693],[-0.293571,0.948172,0.121601],[-0.148725,0.986958,0.061604],[-0.336909,-0.906303,0.255161],[-0.294828,0.87266,0.389283],[-0.461124,0.866535,0.191004],[-0.461124,0.866535,0.191004],[-0.461124,0.866535,0.191004],[-0.461124,0.866535,0.191004],[-0.403759,0.899449,0.167241],[-0.403737,0.899461,0.167231],[-0.403751,0.899453,0.167238],[-0.403776,0.899439,0.167256],[-0.924223,0,0.381854],[-0.882491,0.297097,0.364613],[-0.913969,0.148548,0.377617],[-0.924223,0,0.381854],[-0.83191,0.435644,0.343715],[-0.831911,0.435642,0.343715],[-0.544081,-0.731307,0.411299],[-0.412273,0.731307,0.543343],[-0.473398,0.621759,0.623947],[0,-1,0],[-0.093286,-0.731307,0.675639],[0.066791,0.87266,0.48374],[-0.082017,0.976763,0.198008],[-0.110669,-0.957271,0.267179],[-0.221338,0.815764,0.534358],[-0.121601,0.948172,0.293571],[-0.078396,-0.819431,0.567792],[0.057805,0.906303,0.418657],[-0.191004,0.866534,0.461124],[-0.191004,0.866534,0.461124],[-0.191004,0.866534,0.461124],[-0.191004,0.866535,0.461124],[-0.167491,0.899364,0.403845],[-0.167701,0.899327,0.40384],[-0.167491,0.899364,0.403845],[-0.167282,0.899401,0.40385],[-0.383511,-0.000006,0.923536],[-0.383509,-0.00001,0.923537],[-0.38352,-0.00001,0.923533],[-0.383515,-0.000002,0.923535],[-0.345086,0.436286,0.831006],[-0.345084,0.436289,0.831005],[-0.345086,0.436286,0.831006],[-0.345087,0.436283,0.831007],[-0.093502,-0.731417,0.67549],[0.093502,0.731417,0.67549],[0.107374,0.621891,0.775708],[0,-1,0],[0.411786,-0.731307,0.543712],[0.336909,0.906303,0.255161],[0.082017,0.976763,0.198007],[0.121601,0.948172,0.29357],[0.221338,0.815764,0.534358],[0.041009,0.994242,0.099004],[0.255162,-0.906303,0.336909],[0.456923,0.819431,0.346055],[0.191004,0.866534,0.461124],[0.173306,0.8916,0.418348],[0.179235,0.883508,0.432768],[0.098857,0.966058,0.238663],[0.16733,0.899423,0.40378],[0.16733,0.899423,0.40378],[0.383516,-0.000005,0.923534],[0.383507,-0.000009,0.923538],[0.383513,-0.000004,0.923535],[0.383518,-0.000002,0.923533],[0.345091,0.436275,0.831009],[0.345087,0.436284,0.831006],[0.345091,0.436275,0.831009],[0.345096,0.436267,0.831012],[0.412272,-0.731306,0.543344],[0.54408,0.731306,0.4113],[0.624774,0.621739,0.472332],[0.826343,-0.447214,0.342282],[0.413171,0.894427,0.171141],[0.29357,0.948172,0.121601],[0.91183,-0.160979,0.377692],[0.29357,0.948172,0.121601],[0.148725,0.986958,0.061604],[0.653281,-0.707107,0.270598],[0.292156,0.948683,0.121015],[0.31696,0.939308,0.131289],[0.461124,0.866535,0.191004],[0.461124,0.866535,0.191004],[0.461124,0.866535,0.191004],[0.403748,0.899455,0.167238],[0.403734,0.899462,0.167234],[0.403734,0.899462,0.167234],[0.924222,0,0.381855],[0.924222,0,0.381855],[0.924222,0,0.381855],[0.924222,0,0.381855],[0.831911,0.435641,0.343715],[0.831911,0.435642,0.343715],[0.831911,0.435641,0.343715],[0.831912,0.435641,0.343715],[0.826648,-0.447214,0.341545],[0.413324,0.894427,0.170772],[0,-1,0],[0,-1,0],[0,1,0],[0,-1,0],[0,1,0],[0,-1,0],[0,1,0],[0,-1,0],[0,1,0],[0,1,0],[0,-1,0],[0,1,0],[0,-1,0],[0,1,0],[0,-1,0],[0,-1,0],[0,1,0],[0.501766,-0.557715,-0.6612],[0.921869,-0.071319,-0.380881],[0,1,0],[0,1,0],[0,-0.788033,-0.615633],[0,1,0],[-0.501766,-0.557715,-0.6612],[0,1,0],[-0.935442,-0.353481,0.000002],[0,1,0],[-0.501766,-0.557714,0.6612],[0,1,0],[0,-0.788035,0.615631],[0,1,0],[0.501766,-0.557714,0.6612],[0,1,0],[0.78304,-0.531206,0.323525],[0,1,0],[0.795371,0.076915,-0.601224],[0.987719,0.076845,0.136034],[0.136668,0.077032,-0.987617],[-0.602641,0.07696,-0.794293],[-0.987724,0.076845,-0.136001],[-0.795354,0.076915,0.601245],[-0.136669,0.077033,0.987617],[0.602642,0.076961,0.794292],[0.883849,0.291171,-0.366101],[-0.675386,0.682342,0.279754],[-0.137138,0.988922,0.056804],[0.909629,0.174949,-0.376787],[0.817584,0.465688,0.338659],[-0.675386,0.682342,-0.279754],[-0.137138,0.988922,-0.056804],[0.923197,0.038419,0.382403],[0.338665,0.465687,-0.817583],[-0.279754,0.682344,0.675385],[-0.056804,0.988922,0.137138],[0.382395,0.038421,-0.9232],[0.366108,0.291167,0.883848],[-0.279756,0.682338,-0.67539],[-0.056806,0.988921,-0.137141],[0.376793,0.174947,0.909627],[-0.366106,0.291167,-0.883849],[0.279754,0.682344,0.675385],[0.056804,0.988922,0.137137],[-0.376796,0.174946,-0.909626],[-0.338665,0.465687,0.817583],[0.279756,0.682338,-0.67539],[0.056805,0.988922,-0.137139],[-0.382385,0.038425,0.923204],[-0.817584,0.465687,-0.338663],[0.675385,0.682344,0.279753],[0.137138,0.988922,0.056804],[-0.923199,0.03842,-0.382398],[-0.88385,0.291169,0.366101],[0.675385,0.682344,-0.279754],[0.137137,0.988922,-0.056804],[-0.909627,0.174947,0.376791],[0.936199,0.041176,-0.34905],[0.737664,0.602072,-0.30555],[-0.888254,0.275019,0.367927],[-0.888254,0.275019,0.367927],[0.888251,-0.275021,0.367932],[0.899577,0.227848,0.37262],[-0.888254,0.275019,-0.367927],[-0.888254,0.275019,-0.367927],[0.367935,-0.27502,-0.88825],[-0.000003,-0.295764,-0.955261],[-0.367926,0.275022,0.888253],[-0.367926,0.275024,0.888252],[0.349054,0.041173,0.936198],[0.186309,0.873487,0.449789],[-0.367927,0.275012,-0.888255],[-0.367927,0.275019,-0.888254],[-0.260187,0.481007,-0.837219],[0.367926,0.275022,0.888253],[0.367927,0.275019,0.888254],[-0.367927,-0.275018,0.888254],[-0.367926,-0.275022,0.888253],[0.367927,0.275013,-0.888255],[0.367928,0.275006,-0.888257],[-0.888253,-0.275022,-0.367926],[-0.888256,-0.275016,-0.367922],[0.888253,0.275022,0.367926],[0.888252,0.275024,0.367926],[-0.888245,-0.275015,0.367949],[-0.837222,0.481006,0.260179],[0.888253,0.275022,-0.367926],[0.888253,0.27502,-0.367927],[0,-1,0],[0,-1,0],[0,1,0],[0,-1,0],[0,1,0],[0,-1,0],[0,1,0],[0,1,0],[0,-1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,-1,0],[0,1,0],[0,-1,0],[0,1,0],[-0.44783,0.874667,0.185491],[0.923857,-0.006918,-0.382674],[0.76345,0.563154,-0.316231],[-0.549902,0.803554,0.227837],[-0.111538,0.956634,0.269093],[0.382674,-0.006916,-0.923858],[0.316231,0.563153,-0.76345],[-0.27065,0.706717,0.653681],[-0.269123,0.956627,-0.111524],[0.923857,-0.006916,0.382674],[0.76345,0.563153,0.316231],[-0.653722,0.706634,-0.27077],[0.18538,0.87471,0.447792],[-0.382674,-0.00692,-0.923857],[-0.316232,0.563151,-0.763452],[0.227849,0.803567,0.549876],[-0.185555,0.874639,-0.447857],[0.382675,-0.006912,0.923857],[0.316231,0.563156,0.763448],[-0.22786,0.803573,-0.549863],[0.269148,0.956622,0.111509],[-0.923857,-0.006919,-0.382674],[-0.76345,0.563154,-0.316231],[0.653742,0.706587,0.270844],[0.111349,0.956555,-0.269451],[-0.382674,-0.006918,0.923857],[-0.316231,0.563155,0.763449],[0.270843,0.706583,-0.653746],[0.447855,0.87464,-0.185555],[-0.923857,-0.006917,0.382674],[-0.76345,0.563154,0.316231],[0.550043,0.803476,-0.227769],[-0.828988,0.441339,0.343509],[-0.351274,0.936239,0.008011],[0.829097,-0.441202,-0.343423],[0.829097,-0.441202,-0.343423],[-0.343423,0.441204,0.829096],[-0.1168,0.801767,0.586113],[0.343423,-0.441199,-0.829098],[0.343423,-0.4412,-0.829098],[-0.583142,0.658609,-0.475583],[-0.829097,0.441214,-0.343408],[0.829098,-0.4412,0.343423],[0.829099,-0.441198,0.343424],[0.624227,0.469887,0.624137],[0.008033,0.936252,0.351237],[-0.343423,-0.441204,-0.829096],[-0.343424,-0.441199,-0.829098],[-0.351706,0.79785,-0.489632],[-0.008051,0.936261,-0.351214],[0.343425,-0.441196,0.829099],[0.343424,-0.4412,0.829098],[0.829078,0.441226,0.343437],[-0.829096,-0.441203,-0.343423],[-0.829095,-0.441207,-0.343422],[0.343593,0.441028,-0.829119],[0.124369,0.94579,-0.300024],[-0.343423,-0.441203,0.829096],[-0.343422,-0.441206,0.829095],[-0.049388,0.986887,-0.153671],[0.829118,0.441028,-0.343596],[-0.829097,-0.4412,0.343423],[-0.829098,-0.441199,0.343424],[0,1,0],[0.31761,0.833806,-0.451543],[0,1,0],[0.105758,0.988752,-0.105758],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[-0.30555,0.602072,-0.737664],[0,1,0],[0,1,0],[0,1,0],[-0.105758,0.988752,-0.105758],[0,1,0],[-0.845225,0.525184,0.098873],[-0.737665,0.602071,0.305551],[-0.251708,0.934495,0.25172],[-0.737664,0.602072,0.30555],[-0.105759,0.988752,0.105758],[-0.305573,0.602074,0.737653],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0.31761,0.833806,0.451543],[0.149565,0.988752,0],[0.888257,-0.275015,-0.367921],[0.675468,-0.29576,-0.675477],[0.996701,0.081155,0],[0.888254,-0.275019,0.367927],[0.88825,-0.275015,0.367939],[0.367918,-0.275014,-0.888258],[0.367946,-0.275027,0.888243],[0.367946,-0.275027,0.888243],[-0.000001,-0.295764,0.955261],[-0.372618,0.227845,-0.899579],[-0.367938,-0.275024,-0.888247],[-0.67548,-0.295766,-0.675463],[-0.675455,-0.295755,0.675492],[-0.11592,0.063725,0.991212],[-0.888245,-0.275015,-0.367949],[-0.888245,-0.275015,-0.367949],[0,-1,0],[0,-1,0],[0,-1,0],[0,-1,0],[0,-1,0],[0.699155,-0.149565,-0.699151],[0,-1,0],[0,-1,0],[0,-1,0],[0,-1,0],[0,-1,0],[0,-1,0],[-0.988752,-0.149565,0],[0,-1,0],[0,-1,0],[0,-1,0],[-0.699153,-0.149565,0.699153],[0,-0.962186,0.272395],[0,-1,0],[0,-1,0],[0,-1,0],[0,-1,0],[0.699154,-0.149565,0.699152],[0,-1,0],[0,-1,0],[0,-1,0],[0,-1,0],[0,-1,0],[0.295765,0.955261,0],[0.295765,0.955261,0],[0.36495,0.856518,-0.364949],[0.699157,-0.149565,-0.699149],[0,0.955261,-0.295765],[0,0.955261,-0.295765],[0,0.955261,-0.295765],[-0.36495,0.856518,-0.36495],[-0.209137,0.955261,-0.209138],[-0.699152,-0.149565,-0.699154],[-0.295765,0.955261,0],[-0.516117,0.856518,0],[-0.209138,0.955261,0.209138],[-0.209138,0.955261,0.209138],[0,0.955261,0.295765],[0,0.955261,0.295765],[0.209138,0.955261,0.209137],[0.209138,0.955261,0.209137],[0.209138,0.955261,0.209137],[0.804913,0.593392,0],[0,-1,0],[0,1,0],[0.631438,0.450079,-0.631438],[0.568394,-0.594858,-0.568394],[0,-1,0],[0,1,0],[0,-1,0],[0,1,0],[-0.631437,0.450082,-0.631437],[-0.568397,-0.594852,-0.568397],[0,-1,0],[-0.892991,0.450074,0],[-0.803825,-0.594866,0],[0,1,0],[0,-1,0],[0,-1,0],[-0.56916,0.593367,0.569186],[0,-1,0],[0,-1,0],[0,0.450073,0.892992],[0,1,0],[0,0.450073,0.892992],[0,-0.594869,0.803823],[0,-1,0],[0,1,0],[0,1,0],[0,-1,0],[0,-1,0],[0.403893,0.899418,-0.167085],[0.404038,0.899381,-0.166933],[0.403893,0.899418,-0.167085],[0.401839,0.914001,-0.055924],[0.083939,0.90903,-0.408191],[0.167261,0.899402,-0.403855],[0.234153,0.896267,-0.376667],[-0.003768,0.999948,0.009504],[-0.083956,0.909022,-0.408203],[-0.16732,0.89938,-0.403881],[0.002863,0.980272,-0.19763],[-0.403825,0.899434,-0.167162],[-0.397506,0.913754,-0.083919],[-0.403892,0.899418,0.167085],[-0.404037,0.899381,0.166934],[-0.403892,0.899418,0.167085],[-0.403748,0.899455,0.167236],[-0.085294,0.908924,0.408144],[-0.16721,0.899384,0.403918],[-0.234133,0.896262,0.376692],[0.167492,0.899364,0.403845],[0.167702,0.899327,0.40384],[0.167388,0.89938,0.403851],[0.167282,0.899401,0.403849],[0.403893,0.899418,0.167085],[0.404037,0.899381,0.166934],[0.403893,0.899418,0.167085],[0.403741,0.899459,0.167233],[0,1,0],[0,1,0],[0,1,0],[0.113728,0.986981,-0.113729],[0,0.970254,-0.242088],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,0.970254,-0.242088],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[-0.171182,0.970254,0.171182],[0,1,0],[0,1,0],[0,1,0],[0,0.970254,0.242088],[0.113728,0.986981,0.113729],[0,1,0],[0,1,0],[-0.299662,0.950737,-0.07938],[-0.657291,0.748659,-0.086477],[-0.829093,0.441229,0.343398],[-0.668852,0.743395,-0.000002],[-0.000001,0.470094,0.882616],[-0.34356,0.441418,0.828925],[-0.34356,0.441418,0.828925],[-0.828987,0.44134,-0.343512],[-0.828987,0.44134,-0.343512],[0.343423,0.441204,0.829096],[0.343053,0.441567,0.829056],[-0.475588,0.658617,-0.583129],[0.086556,0.748694,-0.657241],[-0.343595,0.441028,-0.829118],[-0.097676,0.797814,-0.594939],[0.829116,0.441027,0.343603],[0.829106,0.441115,0.343513],[0.525841,0.748509,-0.404013],[0.624146,0.469383,-0.624597],[0.343424,0.441196,-0.8291],[0.155959,0.956147,-0.247911],[0.829098,0.4412,-0.343424],[0.155903,0.950725,-0.267987],[0.469773,0.882787,0],[0.104843,0.955966,0.274109],[0.469773,0.882787,0],[0.469773,0.882787,0],[0.33218,0.882787,-0.332179],[0,0.882787,-0.469773],[0,0.882787,-0.469773],[-0.332179,0.882787,-0.33218],[-0.332178,0.882787,-0.332181],[-0.332179,0.882787,-0.33218],[-0.469773,0.882787,0],[-0.469773,0.882787,0],[-0.242088,0.970254,0],[-0.33218,0.882787,0.332179],[0,0.882787,0.469773],[-0.274161,0.955944,0.104912],[0,0.946851,0.321673],[0.332179,0.882787,0.332181],[0.332179,0.882787,0.332181],[0,1,0],[0,1,0],[-0.518976,0.814612,-0.258981],[0,1,0],[0,1,0],[0.445134,0.776989,-0.445133],[0.429569,0.848212,-0.30985],[0,1,0],[0,1,0],[0,1,0],[0,0.776946,-0.629567],[0.08466,0.84818,-0.5229],[0,0.776946,-0.629567],[0,1,0],[0,1,0],[-0.629309,0.777155,0],[-0.629309,0.777155,0],[-0.629309,0.777155,0],[0,1,0],[0,1,0],[0.333248,0.882023,-0.333138],[0.545961,0.824864,0.146717],[0,1,0],[0,1,0],[0.259057,0.814636,-0.5189],[0,1,0],[-0.494172,0.715346,-0.494038],[-0.494172,0.715346,-0.494038],[0.327555,0.910934,-0.250812],[0.403737,0.899459,-0.16724],[0.394778,0.917073,-0.055925],[0.866063,0.051545,-0.49727],[0.924222,0,-0.381856],[0.383507,-0.000002,-0.923538],[0.605542,0.103077,-0.78911],[0.383509,0,-0.923537],[-0.38351,0,-0.923537],[-0.38351,0,-0.923537],[-0.38351,0,-0.923537],[-0.383507,-0.000001,-0.923538],[-0.403789,0.899436,-0.167239],[-0.403789,0.899436,-0.167239],[-0.403735,0.899462,-0.167231],[-0.924222,0,-0.381856],[-0.924222,0,-0.381856],[-0.924222,0,-0.381856],[-0.924221,-0.000002,-0.381859],[-0.403771,0.89944,0.16726],[-0.327538,0.910936,0.250827],[-0.408065,0.909089,0.083912],[-0.403737,0.899461,0.167232],[-0.980013,0.039003,0.195074],[-0.924222,0,0.381856],[-0.857557,0.435644,0.273516],[-0.130704,0.051426,0.990087],[-0.383509,0,0.923537],[-0.383509,0,0.923537],[-0.556316,0,0.830971],[0.054149,0.914079,0.401906],[0.167198,0.899404,0.403877],[0.167277,0.899408,0.403836],[0.383518,0,0.923533],[0.383518,0,0.923533],[0.383518,0,0.923533],[0.383513,0,0.923536],[0.403755,0.899451,0.16724],[0.403773,0.899441,0.167253],[0.347914,0.909067,0.229242],[0.294287,0.954625,0.045678],[0.924227,-0.000002,0.381842],[0.789768,0.104034,0.60452],[0.862988,-0.126639,0.489096],[0.16732,0.89938,-0.403881],[0.167245,0.899397,-0.403873],[-0.167272,0.899397,-0.403864],[-0.167277,0.899407,-0.403838],[-0.167285,0.899396,-0.403859],[-0.167246,0.899397,-0.403873],[-0.167246,0.899397,-0.403873],[-0.355255,0.932457,0.065708],[-0.056763,0.917742,0.393099],[0.198207,0.97864,-0.05457],[0.0583,0.961231,0.269511],[-0.698775,0.715342,0],[-0.146551,0.824884,-0.545975],[0.494175,0.715349,-0.494032],[0,0.715353,-0.698764],[-0.149317,0.961208,0.231913],[0.409514,0.912304,0],[0.409514,0.912304,0],[0.409514,0.912304,0],[0.287835,0.912272,-0.291396],[0.28797,0.912277,-0.291244],[0.2877,0.912266,-0.291548],[0,0.912246,-0.409642],[0.300541,0.35745,-0.884254],[-0.287835,0.912272,-0.291396],[-0.287987,0.912267,-0.291262],[-0.287835,0.912272,-0.291396],[-0.287684,0.912276,-0.29153],[-0.409514,0.912304,0],[-0.409514,0.912304,0],[-0.287835,0.912272,0.291396],[-0.287971,0.912277,0.291243],[-0.2877,0.912266,0.291548],[-0.002722,0.912243,0.409641],[-0.00273,0.912243,0.40964],[0.282237,0.916927,0.282113],[0.289751,0.912275,0.289481],[0.289897,0.91227,0.28935],[0.930193,-0.367071,0],[0.930193,-0.367071,0],[0.930193,-0.367071,0],[0.930193,-0.367071,0],[0.652402,-0.372846,-0.659817],[0.700278,-0.113669,-0.704763],[0.652402,-0.372846,-0.659817],[0.652398,-0.372854,-0.659816],[0.388407,0.921488,0],[0.271866,0.922591,-0.273708],[0.271098,0.923575,-0.271136],[0.271866,0.922591,-0.273708],[0.272631,0.921598,-0.276277],[0,-0.378855,-0.925456],[0.133501,-0.079713,-0.987838],[0,-0.378855,-0.925456],[0,-0.378855,-0.925456],[-0.6524,-0.37285,-0.659816],[-0.700071,-0.116024,-0.704584],[-0.6524,-0.37285,-0.659816],[-0.652401,-0.372842,-0.65982],[-0.993815,-0.111051,0],[-0.930193,-0.367071,0],[-0.930193,-0.367071,0],[-0.930193,-0.367071,0],[0,0.923553,-0.383471],[0,0.923553,-0.383471],[0,0.923553,-0.383471],[0,0.923553,-0.383471],[-0.652397,-0.372851,0.659818],[-0.652399,-0.372835,0.659826],[-0.652397,-0.372851,0.659818],[-0.861867,-0.128503,0.490584],[-0.006179,-0.373636,0.927555],[-0.136157,-0.078051,0.987608],[-0.006179,-0.373636,0.927555],[-0.006182,-0.373626,0.927559],[0.658156,-0.367814,0.65692],[0.70336,-0.111282,0.702069],[0.658156,-0.367814,0.65692],[-0.388407,0.921488,0],[-0.388407,0.921488,0],[-0.388407,0.921488,0],[-0.271868,0.92259,0.273708],[-0.271099,0.923576,0.271133],[-0.271868,0.92259,0.273708],[-0.272635,0.921596,0.276281],[-0.001286,0.92256,0.385851],[0,0.923553,0.383471],[0.274679,0.921466,0.274686],[0.965885,-0.000003,-0.258971],[0.92422,-0.000004,-0.381861],[0.924221,-0.000003,-0.381857],[0.831912,0.435641,-0.343714],[0.885885,0.463905,0],[0.345089,0.436274,-0.83101],[0.345091,0.436274,-0.83101],[-0.383505,-0.000001,-0.923539],[-0.383501,0.000002,-0.92354],[-0.130376,0.101898,-0.986214],[-0.345089,0.436274,-0.83101],[-0.345091,0.436274,-0.83101],[-0.924219,-0.000003,-0.381862],[-0.924221,-0.000001,-0.381858],[-0.789492,0.102653,-0.605116],[-0.831912,0.435641,-0.343714],[-0.940202,0.340616,0],[-0.831911,0.43564,0.343717],[-0.553768,0.076456,0.829154],[-0.383537,-0.000016,0.923525],[-0.383518,-0.000002,0.923534],[-0.345093,0.436272,0.83101],[-0.345089,0.436273,0.831011],[0.195524,-0.000005,0.980699],[0.12977,0.10285,0.986196],[0.383508,-0.000001,0.923538],[0.345093,0.436272,0.83101],[0.543166,0.273236,0.793922],[0.831911,0.43564,0.343717],[0.196062,0.076616,-0.977594],[0.130063,0.000001,-0.991506],[-0.924222,-0.000002,0.381855],[-0.924227,-0.000002,0.381842],[-0.758918,0.061569,0.648269],[0.924222,-0.000003,0.381855],[0.977652,0.078056,0.195201],[0.924222,-0.000003,0.381855],[0.98609,0.103814,0.129808],[0.924223,-0.000002,0.381854],[1,0,0],[1,0,0],[1,0,0],[0.707741,0,-0.706472],[0.707741,0,-0.706472],[0.707741,0,-0.706472],[0.705747,0.075013,-0.704482],[0,0,-1],[0,0.045772,-0.998952],[0,0.075145,-0.997173],[-0.70774,0,-0.706473],[-0.70774,0,-0.706473],[-0.70774,0,-0.706473],[-0.705655,0.076718,-0.70439],[-1,0,0],[-0.999526,0.03077,0],[-1,0,0],[-0.707743,0,0.70647],[-0.707743,0,0.70647],[0,0,1],[0,0,1],[0.707738,0,0.706475],[0.70699,0.045969,0.705728],[0.707738,0,0.706475],[0.705652,0.076724,0.704393],[0.995738,0.092223,0],[0.995738,0.092223,0],[0.995738,0.092223,0],[0.704749,0.091846,-0.703486],[0.704749,0.091846,-0.703486],[0.704749,0.091846,-0.703486],[0,0.091448,-0.99581],[0,0.091448,-0.99581],[0.988273,0.152695,0],[0.988273,0.152695,0],[-0.704749,0.091846,-0.703486],[-0.704749,0.091846,-0.703486],[-0.704749,0.091846,-0.703486],[-0.995738,0.092223,0],[-0.704751,0.09185,0.703483],[-0.704751,0.09185,0.703483],[-0.704751,0.09185,0.703483],[0,0.091472,0.995808],[0,0.091472,0.995808],[0,0.091472,0.995808],[0.704747,0.091841,0.703489],[-0.698991,0.150972,-0.699013],[-0.988273,0.152697,0],[-0.988273,0.152697,0],[-0.698934,0.151612,0.698931],[-0.698084,0.15364,0.699338],[0,0.153294,0.988181],[0.699408,0.153005,0.698154]];
var triangles = [0,1,2,3,4,5,3,5,6,7,8,9,10,0,2,11,12,4,11,4,3,13,8,7,14,10,2,15,16,12,15,12,11,17,8,13,18,14,2,19,20,16,19,16,15,21,8,17,22,18,2,23,24,20,23,20,19,25,8,21,26,22,2,27,28,24,27,24,23,29,8,25,30,26,2,31,32,28,31,28,27,33,8,29,34,30,2,35,36,32,35,32,31,37,8,33,38,34,2,39,40,41,39,41,42,43,8,37,44,38,2,45,46,47,45,47,48,49,8,43,50,44,2,51,52,53,51,53,54,55,8,49,56,50,2,57,58,59,57,59,60,61,8,55,62,56,2,63,64,65,63,65,66,67,8,61,68,62,2,69,70,71,69,71,72,73,8,67,74,68,2,75,76,77,75,77,78,79,8,73,80,74,2,81,82,83,81,83,84,85,8,79,86,80,2,87,88,89,87,89,90,91,8,85,92,86,2,93,94,88,93,88,87,95,8,91,96,92,2,97,98,94,97,94,93,99,8,95,1,96,2,100,101,102,100,102,103,9,8,99,104,105,106,104,106,107,108,109,105,108,105,104,110,111,109,110,109,108,112,113,111,112,111,110,114,115,113,114,113,112,116,117,115,116,115,114,118,119,117,118,117,116,42,41,119,42,119,118,120,121,48,120,48,47,54,53,40,54,40,39,122,123,60,122,60,59,66,65,52,66,52,51,58,57,72,58,72,71,124,125,64,124,64,63,126,127,125,126,125,124,128,129,127,128,127,126,130,131,129,130,129,128,132,133,131,132,131,130,103,102,133,103,133,132,98,97,134,98,134,135,136,7,9,136,9,137,138,13,7,138,7,136,139,17,13,139,13,138,140,21,17,140,17,139,141,25,21,141,21,140,142,29,25,142,25,141,143,33,29,143,29,142,144,37,33,144,33,143,145,43,37,145,37,144,146,49,43,146,43,145,147,55,49,147,49,146,148,61,55,148,55,147,149,67,61,149,61,148,150,73,67,150,67,149,151,79,73,151,73,150,152,85,79,152,79,151,153,91,85,153,85,152,154,95,91,154,91,153,155,99,95,155,95,154,137,9,99,137,99,155,47,39,42,47,42,120,156,41,40,156,40,157,158,51,54,158,54,46,159,53,52,159,52,160,161,63,66,161,66,162,163,65,64,163,64,164,135,100,103,135,103,98,165,102,101,165,101,166,167,104,107,167,107,168,169,106,105,169,105,170,171,108,104,171,104,167,170,105,109,170,109,172,173,110,108,173,108,171,172,109,111,172,111,174,175,112,110,175,110,173,174,111,113,174,113,176,177,114,112,177,112,175,176,113,115,176,115,178,179,116,114,179,114,177,178,115,117,178,117,180,181,118,116,181,116,179,180,117,119,180,119,182,120,42,118,120,118,181,182,119,41,182,41,156,46,54,39,46,39,47,157,40,53,157,53,159,162,66,51,162,51,158,160,52,65,160,65,163,77,124,63,77,63,161,164,64,125,164,125,183,76,126,124,76,124,77,183,125,127,183,127,184,89,128,126,89,126,76,184,127,129,184,129,185,88,130,128,88,128,89,185,129,131,185,131,186,94,132,130,94,130,88,186,131,133,186,133,187,98,103,132,98,132,94,187,133,102,187,102,165,188,167,168,188,168,189,190,171,167,190,167,188,191,173,171,191,171,190,192,175,173,192,173,191,193,177,175,193,175,192,194,179,177,194,177,193,195,181,179,195,179,194,121,120,181,121,181,195,196,197,123,196,123,122,198,162,158,198,158,199,78,77,161,78,161,200,70,69,84,70,84,83,90,89,76,90,76,75,82,81,201,82,201,202,202,201,203,202,203,204,204,203,205,204,205,206,36,35,197,36,197,196,199,158,46,199,46,45,200,161,162,200,162,198,206,205,207,206,207,208,209,1,0,209,0,210,210,0,10,210,10,211,211,10,14,211,14,212,212,14,18,212,18,213,213,18,22,213,22,214,214,22,26,214,26,215,215,26,30,215,30,216,216,30,34,216,34,217,217,34,38,217,38,218,218,38,44,218,44,219,219,44,50,219,50,220,220,50,56,220,56,221,221,56,62,221,62,222,222,62,68,222,68,223,223,68,74,223,74,224,224,74,80,224,80,225,225,80,86,225,86,226,226,86,92,226,92,227,227,92,96,227,96,228,228,96,1,228,1,209,229,3,6,229,6,230,189,5,4,189,4,188,231,11,3,231,3,229,188,4,12,188,12,190,232,15,11,232,11,231,190,12,16,190,16,191,233,19,15,233,15,232,191,16,20,191,20,192,234,23,19,234,19,233,192,20,24,192,24,193,235,27,23,235,23,234,193,24,28,193,28,194,236,31,27,236,27,235,194,28,32,194,32,195,237,35,31,237,31,236,195,32,36,195,36,121,238,57,60,238,60,239,199,59,58,199,58,198,240,69,72,240,72,241,200,71,70,200,70,78,242,81,84,242,84,243,75,83,82,75,82,90,45,122,59,45,59,199,239,60,123,239,123,244,198,58,71,198,71,200,241,72,57,241,57,238,48,196,122,48,122,45,244,123,197,244,197,245,78,70,83,78,83,75,243,84,69,243,69,240,90,82,202,90,202,87,246,201,81,246,81,242,87,202,204,87,204,93,247,203,201,247,201,246,93,204,206,93,206,97,248,205,203,248,203,247,121,36,196,121,196,48,245,197,35,245,35,237,97,206,208,97,208,134,249,207,205,249,205,248,250,251,252,253,254,255,253,255,256,257,258,259,260,250,252,261,262,254,261,254,253,263,258,257,264,260,252,265,266,262,265,262,261,267,258,263,268,264,252,269,270,266,269,266,265,271,258,267,272,268,252,273,274,270,273,270,269,275,258,271,276,272,252,277,278,274,277,274,273,279,258,275,280,276,252,281,282,278,281,278,277,283,258,279,284,280,252,285,286,282,285,282,281,287,258,283,288,284,252,289,290,291,289,291,292,293,258,287,294,288,252,295,296,297,295,297,298,299,258,293,300,294,252,301,302,303,301,303,304,305,258,299,306,300,252,307,308,309,307,309,310,311,258,305,312,306,252,313,314,315,313,315,316,317,258,311,318,312,252,319,320,321,319,321,322,323,258,317,324,318,252,325,326,327,325,327,328,329,258,323,330,324,252,331,332,333,331,333,334,335,258,329,336,330,252,337,338,339,337,339,340,341,258,335,342,336,252,343,344,338,343,338,337,345,258,341,346,342,252,347,348,344,347,344,343,349,258,345,251,346,252,350,351,352,350,352,353,259,258,349,354,355,356,354,356,357,358,359,355,358,355,354,360,361,359,360,359,358,362,363,361,362,361,360,364,365,363,364,363,362,366,367,365,366,365,364,368,369,367,368,367,366,292,291,369,292,369,368,370,371,298,370,298,297,304,303,290,304,290,289,372,373,310,372,310,309,316,315,302,316,302,301,308,307,322,308,322,321,374,375,314,374,314,313,376,377,375,376,375,374,378,379,377,378,377,376,380,381,379,380,379,378,382,383,381,382,381,380,353,352,383,353,383,382,348,347,384,348,384,385,386,257,259,386,259,387,388,263,257,388,257,386,389,267,263,389,263,388,390,271,267,390,267,389,391,275,271,391,271,390,392,279,275,392,275,391,393,283,279,393,279,392,394,287,283,394,283,393,395,293,287,395,287,394,396,299,293,396,293,395,397,305,299,397,299,396,398,311,305,398,305,397,399,317,311,399,311,398,400,323,317,400,317,399,401,329,323,401,323,400,402,335,329,402,329,401,403,341,335,403,335,402,404,345,341,404,341,403,405,349,345,405,345,404,387,259,349,387,349,405,297,289,292,297,292,370,406,291,290,406,290,407,408,301,304,408,304,296,409,303,302,409,302,410,411,313,316,411,316,412,413,315,314,413,314,414,385,350,353,385,353,348,415,352,351,415,351,416,417,354,357,417,357,418,419,356,355,419,355,420,421,358,354,421,354,417,420,355,359,420,359,422,423,360,358,423,358,421,422,359,361,422,361,424,425,362,360,425,360,423,424,361,363,424,363,426,427,364,362,427,362,425,426,363,365,426,365,428,429,366,364,429,364,427,428,365,367,428,367,430,431,368,366,431,366,429,430,367,369,430,369,432,370,292,368,370,368,431,432,369,291,432,291,406,296,304,289,296,289,297,407,290,303,407,303,409,412,316,301,412,301,408,410,302,315,410,315,413,327,374,313,327,313,411,414,314,375,414,375,433,326,376,374,326,374,327,433,375,377,433,377,434,339,378,376,339,376,326,434,377,379,434,379,435,338,380,378,338,378,339,435,379,381,435,381,436,344,382,380,344,380,338,436,381,383,436,383,437,348,353,382,348,382,344,437,383,352,437,352,415,438,417,418,438,418,439,440,421,417,440,417,438,441,423,421,441,421,440,442,425,423,442,423,441,443,427,425,443,425,442,444,429,427,444,427,443,445,431,429,445,429,444,371,370,431,371,431,445,446,447,373,446,373,372,448,412,408,448,408,449,328,327,411,328,411,450,320,319,334,320,334,333,340,339,326,340,326,325,332,331,451,332,451,452,452,451,453,452,453,454,454,453,455,454,455,456,286,285,447,286,447,446,449,408,296,449,296,295,450,411,412,450,412,448,456,455,457,456,457,458,459,251,250,459,250,460,460,250,260,460,260,461,461,260,264,461,264,462,462,264,268,462,268,463,463,268,272,463,272,464,464,272,276,464,276,465,465,276,280,465,280,466,466,280,284,466,284,467,467,284,288,467,288,468,468,288,294,468,294,469,469,294,300,469,300,470,470,300,306,470,306,471,471,306,312,471,312,472,472,312,318,472,318,473,473,318,324,473,324,474,474,324,330,474,330,475,475,330,336,475,336,476,476,336,342,476,342,477,477,342,346,477,346,478,478,346,251,478,251,459,479,253,256,479,256,480,439,255,254,439,254,438,481,261,253,481,253,479,438,254,262,438,262,440,482,265,261,482,261,481,440,262,266,440,266,441,483,269,265,483,265,482,441,266,270,441,270,442,484,273,269,484,269,483,442,270,274,442,274,443,485,277,273,485,273,484,443,274,278,443,278,444,486,281,277,486,277,485,444,278,282,444,282,445,487,285,281,487,281,486,445,282,286,445,286,371,488,307,310,488,310,489,449,309,308,449,308,448,490,319,322,490,322,491,450,321,320,450,320,328,492,331,334,492,334,493,325,333,332,325,332,340,295,372,309,295,309,449,489,310,373,489,373,494,448,308,321,448,321,450,491,322,307,491,307,488,298,446,372,298,372,295,494,373,447,494,447,495,328,320,333,328,333,325,493,334,319,493,319,490,340,332,452,340,452,337,496,451,331,496,331,492,337,452,454,337,454,343,497,453,451,497,451,496,343,454,456,343,456,347,498,455,453,498,453,497,371,286,446,371,446,298,495,447,285,495,285,487,347,456,458,347,458,384,499,457,455,499,455,498,500,501,502,503,504,505,503,505,506,507,508,509,510,500,502,511,512,504,511,504,503,513,508,507,514,510,502,515,516,512,515,512,511,517,508,513,518,514,502,519,520,516,519,516,515,521,508,517,522,518,502,523,524,520,523,520,519,525,508,521,526,522,502,527,528,524,527,524,523,529,508,525,530,526,502,531,532,528,531,528,527,533,508,529,534,530,502,535,536,532,535,532,531,537,508,533,538,534,502,539,540,541,539,541,542,543,508,537,544,538,502,545,546,547,545,547,548,549,508,543,550,544,502,551,552,553,551,553,554,555,508,549,556,550,502,557,558,559,557,559,560,561,508,555,562,556,502,563,564,565,563,565,566,567,508,561,568,562,502,569,570,571,569,571,572,573,508,567,574,568,502,575,576,577,575,577,578,579,508,573,580,574,502,581,582,583,581,583,584,585,508,579,586,580,502,587,588,589,587,589,590,591,508,585,592,586,502,593,594,588,593,588,587,595,508,591,596,592,502,597,598,594,597,594,593,599,508,595,501,596,502,600,601,602,600,602,603,509,508,599,604,605,606,604,606,607,608,609,605,608,605,604,610,611,609,610,609,608,612,613,611,612,611,610,614,615,613,614,613,612,616,617,615,616,615,614,618,619,617,618,617,616,542,541,619,542,619,618,620,621,548,620,548,547,554,553,540,554,540,539,622,623,560,622,560,559,566,565,552,566,552,551,558,557,572,558,572,571,624,625,564,624,564,563,626,627,625,626,625,624,628,629,627,628,627,626,630,631,629,630,629,628,632,633,631,632,631,630,603,602,633,603,633,632,598,597,634,598,634,635,636,507,509,636,509,637,638,513,507,638,507,636,639,517,513,639,513,638,640,521,517,640,517,639,641,525,521,641,521,640,642,529,525,642,525,641,643,533,529,643,529,642,644,537,533,644,533,643,645,543,537,645,537,644,646,549,543,646,543,645,647,555,549,647,549,646,648,561,555,648,555,647,649,567,561,649,561,648,650,573,567,650,567,649,651,579,573,651,573,650,652,585,579,652,579,651,653,591,585,653,585,652,654,595,591,654,591,653,655,599,595,655,595,654,637,509,599,637,599,655,547,539,542,547,542,620,656,541,540,656,540,657,658,551,554,658,554,546,659,553,552,659,552,660,661,563,566,661,566,662,663,565,564,663,564,664,635,600,603,635,603,598,665,602,601,665,601,666,667,604,607,667,607,668,669,606,605,669,605,670,671,608,604,671,604,667,670,605,609,670,609,672,673,610,608,673,608,671,672,609,611,672,611,674,675,612,610,675,610,673,674,611,613,674,613,676,677,614,612,677,612,675,676,613,615,676,615,678,679,616,614,679,614,677,678,615,617,678,617,680,681,618,616,681,616,679,680,617,619,680,619,682,620,542,618,620,618,681,682,619,541,682,541,656,546,554,539,546,539,547,657,540,553,657,553,659,662,566,551,662,551,658,660,552,565,660,565,663,577,624,563,577,563,661,664,564,625,664,625,683,576,626,624,576,624,577,683,625,627,683,627,684,589,628,626,589,626,576,684,627,629,684,629,685,588,630,628,588,628,589,685,629,631,685,631,686,594,632,630,594,630,588,686,631,633,686,633,687,598,603,632,598,632,594,687,633,602,687,602,665,688,667,668,688,668,689,690,671,667,690,667,688,691,673,671,691,671,690,692,675,673,692,673,691,693,677,675,693,675,692,694,679,677,694,677,693,695,681,679,695,679,694,621,620,681,621,681,695,696,697,623,696,623,622,698,662,658,698,658,699,578,577,661,578,661,700,570,569,584,570,584,583,590,589,576,590,576,575,582,581,701,582,701,702,702,701,703,702,703,704,704,703,705,704,705,706,536,535,697,536,697,696,699,658,546,699,546,545,700,661,662,700,662,698,706,705,707,706,707,708,709,501,500,709,500,710,710,500,510,710,510,711,711,510,514,711,514,712,712,514,518,712,518,713,713,518,522,713,522,714,714,522,526,714,526,715,715,526,530,715,530,716,716,530,534,716,534,717,717,534,538,717,538,718,718,538,544,718,544,719,719,544,550,719,550,720,720,550,556,720,556,721,721,556,562,721,562,722,722,562,568,722,568,723,723,568,574,723,574,724,724,574,580,724,580,725,725,580,586,725,586,726,726,586,592,726,592,727,727,592,596,727,596,728,728,596,501,728,501,709,729,503,506,729,506,730,689,505,504,689,504,688,731,511,503,731,503,729,688,504,512,688,512,690,732,515,511,732,511,731,690,512,516,690,516,691,733,519,515,733,515,732,691,516,520,691,520,692,734,523,519,734,519,733,692,520,524,692,524,693,735,527,523,735,523,734,693,524,528,693,528,694,736,531,527,736,527,735,694,528,532,694,532,695,737,535,531,737,531,736,695,532,536,695,536,621,738,557,560,738,560,739,699,559,558,699,558,698,740,569,572,740,572,741,700,571,570,700,570,578,742,581,584,742,584,743,575,583,582,575,582,590,545,622,559,545,559,699,739,560,623,739,623,744,698,558,571,698,571,700,741,572,557,741,557,738,548,696,622,548,622,545,744,623,697,744,697,745,578,570,583,578,583,575,743,584,569,743,569,740,590,582,702,590,702,587,746,701,581,746,581,742,587,702,704,587,704,593,747,703,701,747,701,746,593,704,706,593,706,597,748,705,703,748,703,747,621,536,696,621,696,548,745,697,535,745,535,737,597,706,708,597,708,634,749,707,705,749,705,748,750,751,752,753,754,755,753,755,756,757,758,759,760,750,752,761,762,754,761,754,753,763,758,757,764,760,752,765,766,762,765,762,761,767,758,763,768,764,752,769,770,766,769,766,765,771,758,767,772,768,752,773,774,770,773,770,769,775,758,771,776,772,752,777,778,774,777,774,773,779,758,775,780,776,752,781,782,778,781,778,777,783,758,779,784,780,752,785,786,782,785,782,781,787,758,783,788,784,752,789,790,791,789,791,792,793,758,787,794,788,752,795,796,797,795,797,798,799,758,793,800,794,752,801,802,803,801,803,804,805,758,799,806,800,752,807,808,809,807,809,810,811,758,805,812,806,752,813,814,815,813,815,816,817,758,811,818,812,752,819,820,821,819,821,822,823,758,817,824,818,752,825,826,827,825,827,828,829,758,823,830,824,752,831,832,833,831,833,834,835,758,829,836,830,752,837,838,839,837,839,840,841,758,835,842,836,752,843,844,838,843,838,837,845,758,841,846,842,752,847,848,844,847,844,843,849,758,845,751,846,752,850,851,852,850,852,853,759,758,849,854,855,856,854,856,857,858,859,855,858,855,854,860,861,859,860,859,858,862,863,861,862,861,860,864,865,863,864,863,862,866,867,865,866,865,864,868,869,867,868,867,866,792,791,869,792,869,868,870,871,798,870,798,797,804,803,790,804,790,789,872,873,810,872,810,809,816,815,802,816,802,801,808,807,822,808,822,821,874,875,814,874,814,813,876,877,875,876,875,874,878,879,877,878,877,876,880,881,879,880,879,878,882,883,881,882,881,880,853,852,883,853,883,882,848,847,884,848,884,885,886,757,759,886,759,887,888,763,757,888,757,886,889,767,763,889,763,888,890,771,767,890,767,889,891,775,771,891,771,890,892,779,775,892,775,891,893,783,779,893,779,892,894,787,783,894,783,893,895,793,787,895,787,894,896,799,793,896,793,895,897,805,799,897,799,896,898,811,805,898,805,897,899,817,811,899,811,898,900,823,817,900,817,899,901,829,823,901,823,900,902,835,829,902,829,901,903,841,835,903,835,902,904,845,841,904,841,903,905,849,845,905,845,904,887,759,849,887,849,905,797,789,792,797,792,870,906,791,790,906,790,907,908,801,804,908,804,796,909,803,802,909,802,910,911,813,816,911,816,912,913,815,814,913,814,914,885,850,853,885,853,848,915,852,851,915,851,916,917,854,857,917,857,918,919,856,855,919,855,920,921,858,854,921,854,917,920,855,859,920,859,922,923,860,858,923,858,921,922,859,861,922,861,924,925,862,860,925,860,923,924,861,863,924,863,926,927,864,862,927,862,925,926,863,865,926,865,928,929,866,864,929,864,927,928,865,867,928,867,930,931,868,866,931,866,929,930,867,869,930,869,932,870,792,868,870,868,931,932,869,791,932,791,906,796,804,789,796,789,797,907,790,803,907,803,909,912,816,801,912,801,908,910,802,815,910,815,913,827,874,813,827,813,911,914,814,875,914,875,933,826,876,874,826,874,827,933,875,877,933,877,934,839,878,876,839,876,826,934,877,879,934,879,935,838,880,878,838,878,839,935,879,881,935,881,936,844,882,880,844,880,838,936,881,883,936,883,937,848,853,882,848,882,844,937,883,852,937,852,915,938,917,918,938,918,939,940,921,917,940,917,938,941,923,921,941,921,940,942,925,923,942,923,941,943,927,925,943,925,942,944,929,927,944,927,943,945,931,929,945,929,944,871,870,931,871,931,945,946,947,873,946,873,872,948,912,908,948,908,949,828,827,911,828,911,950,820,819,834,820,834,833,840,839,826,840,826,825,832,831,951,832,951,952,952,951,953,952,953,954,954,953,955,954,955,956,786,785,947,786,947,946,949,908,796,949,796,795,950,911,912,950,912,948,956,955,957,956,957,958,959,751,750,959,750,960,960,750,760,960,760,961,961,760,764,961,764,962,962,764,768,962,768,963,963,768,772,963,772,964,964,772,776,964,776,965,965,776,780,965,780,966,966,780,784,966,784,967,967,784,788,967,788,968,968,788,794,968,794,969,969,794,800,969,800,970,970,800,806,970,806,971,971,806,812,971,812,972,972,812,818,972,818,973,973,818,824,973,824,974,974,824,830,974,830,975,975,830,836,975,836,976,976,836,842,976,842,977,977,842,846,977,846,978,978,846,751,978,751,959,979,753,756,979,756,980,939,755,754,939,754,938,981,761,753,981,753,979,938,754,762,938,762,940,982,765,761,982,761,981,940,762,766,940,766,941,983,769,765,983,765,982,941,766,770,941,770,942,984,773,769,984,769,983,942,770,774,942,774,943,985,777,773,985,773,984,943,774,778,943,778,944,986,781,777,986,777,985,944,778,782,944,782,945,987,785,781,987,781,986,945,782,786,945,786,871,988,807,810,988,810,989,949,809,808,949,808,948,990,819,822,990,822,991,950,821,820,950,820,828,992,831,834,992,834,993,825,833,832,825,832,840,795,872,809,795,809,949,989,810,873,989,873,994,948,808,821,948,821,950,991,822,807,991,807,988,798,946,872,798,872,795,994,873,947,994,947,995,828,820,833,828,833,825,993,834,819,993,819,990,840,832,952,840,952,837,996,951,831,996,831,992,837,952,954,837,954,843,997,953,951,997,951,996,843,954,956,843,956,847,998,955,953,998,953,997,871,786,946,871,946,798,995,947,785,995,785,987,847,956,958,847,958,884,999,957,955,999,955,998,1000,1001,1002,1003,1004,1005,1003,1005,1006,1007,1008,1009,1010,1000,1002,1011,1012,1004,1011,1004,1003,1013,1008,1007,1014,1010,1002,1015,1016,1012,1015,1012,1011,1017,1008,1013,1018,1014,1002,1019,1020,1016,1019,1016,1015,1021,1008,1017,1022,1018,1002,1023,1024,1020,1023,1020,1019,1025,1008,1021,1026,1022,1002,1027,1028,1024,1027,1024,1023,1029,1008,1025,1030,1026,1002,1031,1032,1028,1031,1028,1027,1033,1008,1029,1034,1030,1002,1035,1036,1032,1035,1032,1031,1037,1008,1033,1038,1034,1002,1039,1040,1041,1039,1041,1042,1043,1008,1037,1044,1038,1002,1045,1046,1047,1045,1047,1048,1049,1008,1043,1050,1044,1002,1051,1052,1053,1051,1053,1054,1055,1008,1049,1056,1050,1002,1057,1058,1059,1057,1059,1060,1061,1008,1055,1062,1056,1002,1063,1064,1065,1063,1065,1066,1067,1008,1061,1068,1062,1002,1069,1070,1071,1069,1071,1072,1073,1008,1067,1074,1068,1002,1075,1076,1077,1075,1077,1078,1079,1008,1073,1080,1074,1002,1081,1082,1083,1081,1083,1084,1085,1008,1079,1086,1080,1002,1087,1088,1089,1087,1089,1090,1091,1008,1085,1092,1086,1002,1093,1094,1088,1093,1088,1087,1095,1008,1091,1096,1092,1002,1097,1098,1094,1097,1094,1093,1099,1008,1095,1001,1096,1002,1100,1101,1102,1100,1102,1103,1009,1008,1099,1104,1105,1106,1104,1106,1107,1108,1109,1105,1108,1105,1104,1110,1111,1109,1110,1109,1108,1112,1113,1111,1112,1111,1110,1114,1115,1113,1114,1113,1112,1116,1117,1115,1116,1115,1114,1118,1119,1117,1118,1117,1116,1042,1041,1119,1042,1119,1118,1120,1121,1048,1120,1048,1047,1054,1053,1040,1054,1040,1039,1122,1123,1060,1122,1060,1059,1066,1065,1052,1066,1052,1051,1058,1057,1072,1058,1072,1071,1124,1125,1064,1124,1064,1063,1126,1127,1125,1126,1125,1124,1128,1129,1127,1128,1127,1126,1130,1131,1129,1130,1129,1128,1132,1133,1131,1132,1131,1130,1103,1102,1133,1103,1133,1132,1098,1097,1134,1098,1134,1135,1136,1007,1009,1136,1009,1137,1138,1013,1007,1138,1007,1136,1139,1017,1013,1139,1013,1138,1140,1021,1017,1140,1017,1139,1141,1025,1021,1141,1021,1140,1142,1029,1025,1142,1025,1141,1143,1033,1029,1143,1029,1142,1144,1037,1033,1144,1033,1143,1145,1043,1037,1145,1037,1144,1146,1049,1043,1146,1043,1145,1147,1055,1049,1147,1049,1146,1148,1061,1055,1148,1055,1147,1149,1067,1061,1149,1061,1148,1150,1073,1067,1150,1067,1149,1151,1079,1073,1151,1073,1150,1152,1085,1079,1152,1079,1151,1153,1091,1085,1153,1085,1152,1154,1095,1091,1154,1091,1153,1155,1099,1095,1155,1095,1154,1137,1009,1099,1137,1099,1155,1047,1039,1042,1047,1042,1120,1156,1041,1040,1156,1040,1157,1158,1051,1054,1158,1054,1046,1159,1053,1052,1159,1052,1160,1161,1063,1066,1161,1066,1162,1163,1065,1064,1163,1064,1164,1135,1100,1103,1135,1103,1098,1165,1102,1101,1165,1101,1166,1167,1104,1107,1167,1107,1168,1169,1106,1105,1169,1105,1170,1171,1108,1104,1171,1104,1167,1170,1105,1109,1170,1109,1172,1173,1110,1108,1173,1108,1171,1172,1109,1111,1172,1111,1174,1175,1112,1110,1175,1110,1173,1174,1111,1113,1174,1113,1176,1177,1114,1112,1177,1112,1175,1176,1113,1115,1176,1115,1178,1179,1116,1114,1179,1114,1177,1178,1115,1117,1178,1117,1180,1181,1118,1116,1181,1116,1179,1180,1117,1119,1180,1119,1182,1120,1042,1118,1120,1118,1181,1182,1119,1041,1182,1041,1156,1046,1054,1039,1046,1039,1047,1157,1040,1053,1157,1053,1159,1162,1066,1051,1162,1051,1158,1160,1052,1065,1160,1065,1163,1077,1124,1063,1077,1063,1161,1164,1064,1125,1164,1125,1183,1076,1126,1124,1076,1124,1077,1183,1125,1127,1183,1127,1184,1089,1128,1126,1089,1126,1076,1184,1127,1129,1184,1129,1185,1088,1130,1128,1088,1128,1089,1185,1129,1131,1185,1131,1186,1094,1132,1130,1094,1130,1088,1186,1131,1133,1186,1133,1187,1098,1103,1132,1098,1132,1094,1187,1133,1102,1187,1102,1165,1188,1167,1168,1188,1168,1189,1190,1171,1167,1190,1167,1188,1191,1173,1171,1191,1171,1190,1192,1175,1173,1192,1173,1191,1193,1177,1175,1193,1175,1192,1194,1179,1177,1194,1177,1193,1195,1181,1179,1195,1179,1194,1121,1120,1181,1121,1181,1195,1196,1197,1123,1196,1123,1122,1198,1162,1158,1198,1158,1199,1078,1077,1161,1078,1161,1200,1070,1069,1084,1070,1084,1083,1090,1089,1076,1090,1076,1075,1082,1081,1201,1082,1201,1202,1202,1201,1203,1202,1203,1204,1204,1203,1205,1204,1205,1206,1036,1035,1197,1036,1197,1196,1199,1158,1046,1199,1046,1045,1200,1161,1162,1200,1162,1198,1206,1205,1207,1206,1207,1208,1209,1001,1000,1209,1000,1210,1210,1000,1010,1210,1010,1211,1211,1010,1014,1211,1014,1212,1212,1014,1018,1212,1018,1213,1213,1018,1022,1213,1022,1214,1214,1022,1026,1214,1026,1215,1215,1026,1030,1215,1030,1216,1216,1030,1034,1216,1034,1217,1217,1034,1038,1217,1038,1218,1218,1038,1044,1218,1044,1219,1219,1044,1050,1219,1050,1220,1220,1050,1056,1220,1056,1221,1221,1056,1062,1221,1062,1222,1222,1062,1068,1222,1068,1223,1223,1068,1074,1223,1074,1224,1224,1074,1080,1224,1080,1225,1225,1080,1086,1225,1086,1226,1226,1086,1092,1226,1092,1227,1227,1092,1096,1227,1096,1228,1228,1096,1001,1228,1001,1209,1229,1003,1006,1229,1006,1230,1189,1005,1004,1189,1004,1188,1231,1011,1003,1231,1003,1229,1188,1004,1012,1188,1012,1190,1232,1015,1011,1232,1011,1231,1190,1012,1016,1190,1016,1191,1233,1019,1015,1233,1015,1232,1191,1016,1020,1191,1020,1192,1234,1023,1019,1234,1019,1233,1192,1020,1024,1192,1024,1193,1235,1027,1023,1235,1023,1234,1193,1024,1028,1193,1028,1194,1236,1031,1027,1236,1027,1235,1194,1028,1032,1194,1032,1195,1237,1035,1031,1237,1031,1236,1195,1032,1036,1195,1036,1121,1238,1057,1060,1238,1060,1239,1199,1059,1058,1199,1058,1198,1240,1069,1072,1240,1072,1241,1200,1071,1070,1200,1070,1078,1242,1081,1084,1242,1084,1243,1075,1083,1082,1075,1082,1090,1045,1122,1059,1045,1059,1199,1239,1060,1123,1239,1123,1244,1198,1058,1071,1198,1071,1200,1241,1072,1057,1241,1057,1238,1048,1196,1122,1048,1122,1045,1244,1123,1197,1244,1197,1245,1078,1070,1083,1078,1083,1075,1243,1084,1069,1243,1069,1240,1090,1082,1202,1090,1202,1087,1246,1201,1081,1246,1081,1242,1087,1202,1204,1087,1204,1093,1247,1203,1201,1247,1201,1246,1093,1204,1206,1093,1206,1097,1248,1205,1203,1248,1203,1247,1121,1036,1196,1121,1196,1048,1245,1197,1035,1245,1035,1237,1097,1206,1208,1097,1208,1134,1249,1207,1205,1249,1205,1248,1250,1251,1252,1253,1254,1255,1253,1255,1256,1257,1258,1259,1260,1250,1252,1261,1262,1254,1261,1254,1253,1263,1258,1257,1264,1260,1252,1265,1266,1262,1265,1262,1261,1267,1258,1263,1268,1264,1252,1269,1270,1266,1269,1266,1265,1271,1258,1267,1272,1268,1252,1273,1274,1270,1273,1270,1269,1275,1258,1271,1276,1272,1252,1277,1278,1274,1277,1274,1273,1279,1258,1275,1280,1276,1252,1281,1282,1278,1281,1278,1277,1283,1258,1279,1284,1280,1252,1285,1286,1282,1285,1282,1281,1287,1258,1283,1288,1284,1252,1289,1290,1291,1289,1291,1292,1293,1258,1287,1294,1288,1252,1295,1296,1297,1295,1297,1298,1299,1258,1293,1300,1294,1252,1301,1302,1303,1301,1303,1304,1305,1258,1299,1306,1300,1252,1307,1308,1309,1307,1309,1310,1311,1258,1305,1312,1306,1252,1313,1314,1315,1313,1315,1316,1317,1258,1311,1318,1312,1252,1319,1320,1321,1319,1321,1322,1323,1258,1317,1324,1318,1252,1325,1326,1327,1325,1327,1328,1329,1258,1323,1330,1324,1252,1331,1332,1333,1331,1333,1334,1335,1258,1329,1336,1330,1252,1337,1338,1339,1337,1339,1340,1341,1258,1335,1342,1336,1252,1343,1344,1338,1343,1338,1337,1345,1258,1341,1346,1342,1252,1347,1348,1344,1347,1344,1343,1349,1258,1345,1251,1346,1252,1350,1351,1352,1350,1352,1353,1259,1258,1349,1354,1355,1356,1354,1356,1357,1358,1359,1355,1358,1355,1354,1360,1361,1359,1360,1359,1358,1362,1363,1361,1362,1361,1360,1364,1365,1363,1364,1363,1362,1366,1367,1365,1366,1365,1364,1368,1369,1367,1368,1367,1366,1292,1291,1369,1292,1369,1368,1370,1371,1298,1370,1298,1297,1304,1303,1290,1304,1290,1289,1372,1373,1310,1372,1310,1309,1316,1315,1302,1316,1302,1301,1308,1307,1322,1308,1322,1321,1374,1375,1314,1374,1314,1313,1376,1377,1375,1376,1375,1374,1378,1379,1377,1378,1377,1376,1380,1381,1379,1380,1379,1378,1382,1383,1381,1382,1381,1380,1353,1352,1383,1353,1383,1382,1348,1347,1384,1348,1384,1385,1386,1257,1259,1386,1259,1387,1388,1263,1257,1388,1257,1386,1389,1267,1263,1389,1263,1388,1390,1271,1267,1390,1267,1389,1391,1275,1271,1391,1271,1390,1392,1279,1275,1392,1275,1391,1393,1283,1279,1393,1279,1392,1394,1287,1283,1394,1283,1393,1395,1293,1287,1395,1287,1394,1396,1299,1293,1396,1293,1395,1397,1305,1299,1397,1299,1396,1398,1311,1305,1398,1305,1397,1399,1317,1311,1399,1311,1398,1400,1323,1317,1400,1317,1399,1401,1329,1323,1401,1323,1400,1402,1335,1329,1402,1329,1401,1403,1341,1335,1403,1335,1402,1404,1345,1341,1404,1341,1403,1405,1349,1345,1405,1345,1404,1387,1259,1349,1387,1349,1405,1297,1289,1292,1297,1292,1370,1406,1291,1290,1406,1290,1407,1408,1301,1304,1408,1304,1296,1409,1303,1302,1409,1302,1410,1411,1313,1316,1411,1316,1412,1413,1315,1314,1413,1314,1414,1385,1350,1353,1385,1353,1348,1415,1352,1351,1415,1351,1416,1417,1354,1357,1417,1357,1418,1419,1356,1355,1419,1355,1420,1421,1358,1354,1421,1354,1417,1420,1355,1359,1420,1359,1422,1423,1360,1358,1423,1358,1421,1422,1359,1361,1422,1361,1424,1425,1362,1360,1425,1360,1423,1424,1361,1363,1424,1363,1426,1427,1364,1362,1427,1362,1425,1426,1363,1365,1426,1365,1428,1429,1366,1364,1429,1364,1427,1428,1365,1367,1428,1367,1430,1431,1368,1366,1431,1366,1429,1430,1367,1369,1430,1369,1432,1370,1292,1368,1370,1368,1431,1432,1369,1291,1432,1291,1406,1296,1304,1289,1296,1289,1297,1407,1290,1303,1407,1303,1409,1412,1316,1301,1412,1301,1408,1410,1302,1315,1410,1315,1413,1327,1374,1313,1327,1313,1411,1414,1314,1375,1414,1375,1433,1326,1376,1374,1326,1374,1327,1433,1375,1377,1433,1377,1434,1339,1378,1376,1339,1376,1326,1434,1377,1379,1434,1379,1435,1338,1380,1378,1338,1378,1339,1435,1379,1381,1435,1381,1436,1344,1382,1380,1344,1380,1338,1436,1381,1383,1436,1383,1437,1348,1353,1382,1348,1382,1344,1437,1383,1352,1437,1352,1415,1438,1417,1418,1438,1418,1439,1440,1421,1417,1440,1417,1438,1441,1423,1421,1441,1421,1440,1442,1425,1423,1442,1423,1441,1443,1427,1425,1443,1425,1442,1444,1429,1427,1444,1427,1443,1445,1431,1429,1445,1429,1444,1371,1370,1431,1371,1431,1445,1446,1447,1373,1446,1373,1372,1448,1412,1408,1448,1408,1449,1328,1327,1411,1328,1411,1450,1320,1319,1334,1320,1334,1333,1340,1339,1326,1340,1326,1325,1332,1331,1451,1332,1451,1452,1452,1451,1453,1452,1453,1454,1454,1453,1455,1454,1455,1456,1286,1285,1447,1286,1447,1446,1449,1408,1296,1449,1296,1295,1450,1411,1412,1450,1412,1448,1456,1455,1457,1456,1457,1458,1459,1251,1250,1459,1250,1460,1460,1250,1260,1460,1260,1461,1461,1260,1264,1461,1264,1462,1462,1264,1268,1462,1268,1463,1463,1268,1272,1463,1272,1464,1464,1272,1276,1464,1276,1465,1465,1276,1280,1465,1280,1466,1466,1280,1284,1466,1284,1467,1467,1284,1288,1467,1288,1468,1468,1288,1294,1468,1294,1469,1469,1294,1300,1469,1300,1470,1470,1300,1306,1470,1306,1471,1471,1306,1312,1471,1312,1472,1472,1312,1318,1472,1318,1473,1473,1318,1324,1473,1324,1474,1474,1324,1330,1474,1330,1475,1475,1330,1336,1475,1336,1476,1476,1336,1342,1476,1342,1477,1477,1342,1346,1477,1346,1478,1478,1346,1251,1478,1251,1459,1479,1253,1256,1479,1256,1480,1439,1255,1254,1439,1254,1438,1481,1261,1253,1481,1253,1479,1438,1254,1262,1438,1262,1440,1482,1265,1261,1482,1261,1481,1440,1262,1266,1440,1266,1441,1483,1269,1265,1483,1265,1482,1441,1266,1270,1441,1270,1442,1484,1273,1269,1484,1269,1483,1442,1270,1274,1442,1274,1443,1485,1277,1273,1485,1273,1484,1443,1274,1278,1443,1278,1444,1486,1281,1277,1486,1277,1485,1444,1278,1282,1444,1282,1445,1487,1285,1281,1487,1281,1486,1445,1282,1286,1445,1286,1371,1488,1307,1310,1488,1310,1489,1449,1309,1308,1449,1308,1448,1490,1319,1322,1490,1322,1491,1450,1321,1320,1450,1320,1328,1492,1331,1334,1492,1334,1493,1325,1333,1332,1325,1332,1340,1295,1372,1309,1295,1309,1449,1489,1310,1373,1489,1373,1494,1448,1308,1321,1448,1321,1450,1491,1322,1307,1491,1307,1488,1298,1446,1372,1298,1372,1295,1494,1373,1447,1494,1447,1495,1328,1320,1333,1328,1333,1325,1493,1334,1319,1493,1319,1490,1340,1332,1452,1340,1452,1337,1496,1451,1331,1496,1331,1492,1337,1452,1454,1337,1454,1343,1497,1453,1451,1497,1451,1496,1343,1454,1456,1343,1456,1347,1498,1455,1453,1498,1453,1497,1371,1286,1446,1371,1446,1298,1495,1447,1285,1495,1285,1487,1347,1456,1458,1347,1458,1384,1499,1457,1455,1499,1455,1498,1500,1501,1502,1503,1504,1505,1503,1505,1506,1507,1508,1509,1510,1500,1502,1511,1512,1504,1511,1504,1503,1513,1508,1507,1514,1510,1502,1515,1516,1512,1515,1512,1511,1517,1508,1513,1518,1514,1502,1519,1520,1516,1519,1516,1515,1521,1508,1517,1522,1518,1502,1523,1524,1520,1523,1520,1519,1525,1508,1521,1526,1522,1502,1527,1528,1524,1527,1524,1523,1529,1508,1525,1530,1526,1502,1531,1532,1528,1531,1528,1527,1533,1508,1529,1534,1530,1502,1535,1536,1532,1535,1532,1531,1537,1508,1533,1538,1534,1502,1539,1540,1541,1539,1541,1542,1543,1508,1537,1544,1538,1502,1545,1546,1547,1545,1547,1548,1549,1508,1543,1550,1544,1502,1551,1552,1553,1551,1553,1554,1555,1508,1549,1556,1550,1502,1557,1558,1559,1557,1559,1560,1561,1508,1555,1562,1556,1502,1563,1564,1565,1563,1565,1566,1567,1508,1561,1568,1562,1502,1569,1570,1571,1569,1571,1572,1573,1508,1567,1574,1568,1502,1575,1576,1577,1575,1577,1578,1579,1508,1573,1580,1574,1502,1581,1582,1583,1581,1583,1584,1585,1508,1579,1586,1580,1502,1587,1588,1589,1587,1589,1590,1591,1508,1585,1592,1586,1502,1593,1594,1588,1593,1588,1587,1595,1508,1591,1596,1592,1502,1597,1598,1594,1597,1594,1593,1599,1508,1595,1501,1596,1502,1600,1601,1602,1600,1602,1603,1509,1508,1599,1604,1605,1606,1604,1606,1607,1608,1609,1605,1608,1605,1604,1610,1611,1609,1610,1609,1608,1612,1613,1611,1612,1611,1610,1614,1615,1613,1614,1613,1612,1616,1617,1615,1616,1615,1614,1618,1619,1617,1618,1617,1616,1542,1541,1619,1542,1619,1618,1620,1621,1548,1620,1548,1547,1554,1553,1540,1554,1540,1539,1622,1623,1560,1622,1560,1559,1566,1565,1552,1566,1552,1551,1558,1557,1572,1558,1572,1571,1624,1625,1564,1624,1564,1563,1626,1627,1625,1626,1625,1624,1628,1629,1627,1628,1627,1626,1630,1631,1629,1630,1629,1628,1632,1633,1631,1632,1631,1630,1603,1602,1633,1603,1633,1632,1598,1597,1634,1598,1634,1635,1636,1507,1509,1636,1509,1637,1638,1513,1507,1638,1507,1636,1639,1517,1513,1639,1513,1638,1640,1521,1517,1640,1517,1639,1641,1525,1521,1641,1521,1640,1642,1529,1525,1642,1525,1641,1643,1533,1529,1643,1529,1642,1644,1537,1533,1644,1533,1643,1645,1543,1537,1645,1537,1644,1646,1549,1543,1646,1543,1645,1647,1555,1549,1647,1549,1646,1648,1561,1555,1648,1555,1647,1649,1567,1561,1649,1561,1648,1650,1573,1567,1650,1567,1649,1651,1579,1573,1651,1573,1650,1652,1585,1579,1652,1579,1651,1653,1591,1585,1653,1585,1652,1654,1595,1591,1654,1591,1653,1655,1599,1595,1655,1595,1654,1637,1509,1599,1637,1599,1655,1547,1539,1542,1547,1542,1620,1656,1541,1540,1656,1540,1657,1658,1551,1554,1658,1554,1546,1659,1553,1552,1659,1552,1660,1661,1563,1566,1661,1566,1662,1663,1565,1564,1663,1564,1664,1635,1600,1603,1635,1603,1598,1665,1602,1601,1665,1601,1666,1667,1604,1607,1667,1607,1668,1669,1606,1605,1669,1605,1670,1671,1608,1604,1671,1604,1667,1670,1605,1609,1670,1609,1672,1673,1610,1608,1673,1608,1671,1672,1609,1611,1672,1611,1674,1675,1612,1610,1675,1610,1673,1674,1611,1613,1674,1613,1676,1677,1614,1612,1677,1612,1675,1676,1613,1615,1676,1615,1678,1679,1616,1614,1679,1614,1677,1678,1615,1617,1678,1617,1680,1681,1618,1616,1681,1616,1679,1680,1617,1619,1680,1619,1682,1620,1542,1618,1620,1618,1681,1682,1619,1541,1682,1541,1656,1546,1554,1539,1546,1539,1547,1657,1540,1553,1657,1553,1659,1662,1566,1551,1662,1551,1658,1660,1552,1565,1660,1565,1663,1577,1624,1563,1577,1563,1661,1664,1564,1625,1664,1625,1683,1576,1626,1624,1576,1624,1577,1683,1625,1627,1683,1627,1684,1589,1628,1626,1589,1626,1576,1684,1627,1629,1684,1629,1685,1588,1630,1628,1588,1628,1589,1685,1629,1631,1685,1631,1686,1594,1632,1630,1594,1630,1588,1686,1631,1633,1686,1633,1687,1598,1603,1632,1598,1632,1594,1687,1633,1602,1687,1602,1665,1688,1667,1668,1688,1668,1689,1690,1671,1667,1690,1667,1688,1691,1673,1671,1691,1671,1690,1692,1675,1673,1692,1673,1691,1693,1677,1675,1693,1675,1692,1694,1679,1677,1694,1677,1693,1695,1681,1679,1695,1679,1694,1621,1620,1681,1621,1681,1695,1696,1697,1623,1696,1623,1622,1698,1662,1658,1698,1658,1699,1578,1577,1661,1578,1661,1700,1570,1569,1584,1570,1584,1583,1590,1589,1576,1590,1576,1575,1582,1581,1701,1582,1701,1702,1702,1701,1703,1702,1703,1704,1704,1703,1705,1704,1705,1706,1536,1535,1697,1536,1697,1696,1699,1658,1546,1699,1546,1545,1700,1661,1662,1700,1662,1698,1706,1705,1707,1706,1707,1708,1709,1501,1500,1709,1500,1710,1710,1500,1510,1710,1510,1711,1711,1510,1514,1711,1514,1712,1712,1514,1518,1712,1518,1713,1713,1518,1522,1713,1522,1714,1714,1522,1526,1714,1526,1715,1715,1526,1530,1715,1530,1716,1716,1530,1534,1716,1534,1717,1717,1534,1538,1717,1538,1718,1718,1538,1544,1718,1544,1719,1719,1544,1550,1719,1550,1720,1720,1550,1556,1720,1556,1721,1721,1556,1562,1721,1562,1722,1722,1562,1568,1722,1568,1723,1723,1568,1574,1723,1574,1724,1724,1574,1580,1724,1580,1725,1725,1580,1586,1725,1586,1726,1726,1586,1592,1726,1592,1727,1727,1592,1596,1727,1596,1728,1728,1596,1501,1728,1501,1709,1729,1503,1506,1729,1506,1730,1689,1505,1504,1689,1504,1688,1731,1511,1503,1731,1503,1729,1688,1504,1512,1688,1512,1690,1732,1515,1511,1732,1511,1731,1690,1512,1516,1690,1516,1691,1733,1519,1515,1733,1515,1732,1691,1516,1520,1691,1520,1692,1734,1523,1519,1734,1519,1733,1692,1520,1524,1692,1524,1693,1735,1527,1523,1735,1523,1734,1693,1524,1528,1693,1528,1694,1736,1531,1527,1736,1527,1735,1694,1528,1532,1694,1532,1695,1737,1535,1531,1737,1531,1736,1695,1532,1536,1695,1536,1621,1738,1557,1560,1738,1560,1739,1699,1559,1558,1699,1558,1698,1740,1569,1572,1740,1572,1741,1700,1571,1570,1700,1570,1578,1742,1581,1584,1742,1584,1743,1575,1583,1582,1575,1582,1590,1545,1622,1559,1545,1559,1699,1739,1560,1623,1739,1623,1744,1698,1558,1571,1698,1571,1700,1741,1572,1557,1741,1557,1738,1548,1696,1622,1548,1622,1545,1744,1623,1697,1744,1697,1745,1578,1570,1583,1578,1583,1575,1743,1584,1569,1743,1569,1740,1590,1582,1702,1590,1702,1587,1746,1701,1581,1746,1581,1742,1587,1702,1704,1587,1704,1593,1747,1703,1701,1747,1701,1746,1593,1704,1706,1593,1706,1597,1748,1705,1703,1748,1703,1747,1621,1536,1696,1621,1696,1548,1745,1697,1535,1745,1535,1737,1597,1706,1708,1597,1708,1634,1749,1707,1705,1749,1705,1748,1750,1751,1752,1753,1754,1755,1753,1755,1756,1757,1758,1759,1760,1750,1752,1761,1762,1754,1761,1754,1753,1763,1758,1757,1764,1760,1752,1765,1766,1762,1765,1762,1761,1767,1758,1763,1768,1764,1752,1769,1770,1766,1769,1766,1765,1771,1758,1767,1772,1768,1752,1773,1774,1770,1773,1770,1769,1775,1758,1771,1776,1772,1752,1777,1778,1774,1777,1774,1773,1779,1758,1775,1780,1776,1752,1781,1782,1778,1781,1778,1777,1783,1758,1779,1784,1780,1752,1785,1786,1782,1785,1782,1781,1787,1758,1783,1788,1784,1752,1789,1790,1791,1789,1791,1792,1793,1758,1787,1794,1788,1752,1795,1796,1797,1795,1797,1798,1799,1758,1793,1800,1794,1752,1801,1802,1803,1801,1803,1804,1805,1758,1799,1806,1800,1752,1807,1808,1809,1807,1809,1810,1811,1758,1805,1812,1806,1752,1813,1814,1815,1813,1815,1816,1817,1758,1811,1818,1812,1752,1819,1820,1821,1819,1821,1822,1823,1758,1817,1824,1818,1752,1825,1826,1827,1825,1827,1828,1829,1758,1823,1830,1824,1752,1831,1832,1833,1831,1833,1834,1835,1758,1829,1836,1830,1752,1837,1838,1839,1837,1839,1840,1841,1758,1835,1842,1836,1752,1843,1844,1838,1843,1838,1837,1845,1758,1841,1846,1842,1752,1847,1848,1844,1847,1844,1843,1849,1758,1845,1751,1846,1752,1850,1851,1852,1850,1852,1853,1759,1758,1849,1854,1855,1856,1854,1856,1857,1858,1859,1855,1858,1855,1854,1860,1861,1859,1860,1859,1858,1862,1863,1861,1862,1861,1860,1864,1865,1863,1864,1863,1862,1866,1867,1865,1866,1865,1864,1868,1869,1867,1868,1867,1866,1792,1791,1869,1792,1869,1868,1870,1871,1798,1870,1798,1797,1804,1803,1790,1804,1790,1789,1872,1873,1810,1872,1810,1809,1816,1815,1802,1816,1802,1801,1808,1807,1822,1808,1822,1821,1874,1875,1814,1874,1814,1813,1876,1877,1875,1876,1875,1874,1878,1879,1877,1878,1877,1876,1880,1881,1879,1880,1879,1878,1882,1883,1881,1882,1881,1880,1853,1852,1883,1853,1883,1882,1848,1847,1884,1848,1884,1885,1886,1757,1759,1886,1759,1887,1888,1763,1757,1888,1757,1886,1889,1767,1763,1889,1763,1888,1890,1771,1767,1890,1767,1889,1891,1775,1771,1891,1771,1890,1892,1779,1775,1892,1775,1891,1893,1783,1779,1893,1779,1892,1894,1787,1783,1894,1783,1893,1895,1793,1787,1895,1787,1894,1896,1799,1793,1896,1793,1895,1897,1805,1799,1897,1799,1896,1898,1811,1805,1898,1805,1897,1899,1817,1811,1899,1811,1898,1900,1823,1817,1900,1817,1899,1901,1829,1823,1901,1823,1900,1902,1835,1829,1902,1829,1901,1903,1841,1835,1903,1835,1902,1904,1845,1841,1904,1841,1903,1905,1849,1845,1905,1845,1904,1887,1759,1849,1887,1849,1905,1797,1789,1792,1797,1792,1870,1906,1791,1790,1906,1790,1907,1908,1801,1804,1908,1804,1796,1909,1803,1802,1909,1802,1910,1911,1813,1816,1911,1816,1912,1913,1815,1814,1913,1814,1914,1885,1850,1853,1885,1853,1848,1915,1852,1851,1915,1851,1916,1917,1854,1857,1917,1857,1918,1919,1856,1855,1919,1855,1920,1921,1858,1854,1921,1854,1917,1920,1855,1859,1920,1859,1922,1923,1860,1858,1923,1858,1921,1922,1859,1861,1922,1861,1924,1925,1862,1860,1925,1860,1923,1924,1861,1863,1924,1863,1926,1927,1864,1862,1927,1862,1925,1926,1863,1865,1926,1865,1928,1929,1866,1864,1929,1864,1927,1928,1865,1867,1928,1867,1930,1931,1868,1866,1931,1866,1929,1930,1867,1869,1930,1869,1932,1870,1792,1868,1870,1868,1931,1932,1869,1791,1932,1791,1906,1796,1804,1789,1796,1789,1797,1907,1790,1803,1907,1803,1909,1912,1816,1801,1912,1801,1908,1910,1802,1815,1910,1815,1913,1827,1874,1813,1827,1813,1911,1914,1814,1875,1914,1875,1933,1826,1876,1874,1826,1874,1827,1933,1875,1877,1933,1877,1934,1839,1878,1876,1839,1876,1826,1934,1877,1879,1934,1879,1935,1838,1880,1878,1838,1878,1839,1935,1879,1881,1935,1881,1936,1844,1882,1880,1844,1880,1838,1936,1881,1883,1936,1883,1937,1848,1853,1882,1848,1882,1844,1937,1883,1852,1937,1852,1915,1938,1917,1918,1938,1918,1939,1940,1921,1917,1940,1917,1938,1941,1923,1921,1941,1921,1940,1942,1925,1923,1942,1923,1941,1943,1927,1925,1943,1925,1942,1944,1929,1927,1944,1927,1943,1945,1931,1929,1945,1929,1944,1871,1870,1931,1871,1931,1945,1946,1947,1873,1946,1873,1872,1948,1912,1908,1948,1908,1949,1828,1827,1911,1828,1911,1950,1820,1819,1834,1820,1834,1833,1840,1839,1826,1840,1826,1825,1832,1831,1951,1832,1951,1952,1952,1951,1953,1952,1953,1954,1954,1953,1955,1954,1955,1956,1786,1785,1947,1786,1947,1946,1949,1908,1796,1949,1796,1795,1950,1911,1912,1950,1912,1948,1956,1955,1957,1956,1957,1958,1959,1751,1750,1959,1750,1960,1960,1750,1760,1960,1760,1961,1961,1760,1764,1961,1764,1962,1962,1764,1768,1962,1768,1963,1963,1768,1772,1963,1772,1964,1964,1772,1776,1964,1776,1965,1965,1776,1780,1965,1780,1966,1966,1780,1784,1966,1784,1967,1967,1784,1788,1967,1788,1968,1968,1788,1794,1968,1794,1969,1969,1794,1800,1969,1800,1970,1970,1800,1806,1970,1806,1971,1971,1806,1812,1971,1812,1972,1972,1812,1818,1972,1818,1973,1973,1818,1824,1973,1824,1974,1974,1824,1830,1974,1830,1975,1975,1830,1836,1975,1836,1976,1976,1836,1842,1976,1842,1977,1977,1842,1846,1977,1846,1978,1978,1846,1751,1978,1751,1959,1979,1753,1756,1979,1756,1980,1939,1755,1754,1939,1754,1938,1981,1761,1753,1981,1753,1979,1938,1754,1762,1938,1762,1940,1982,1765,1761,1982,1761,1981,1940,1762,1766,1940,1766,1941,1983,1769,1765,1983,1765,1982,1941,1766,1770,1941,1770,1942,1984,1773,1769,1984,1769,1983,1942,1770,1774,1942,1774,1943,1985,1777,1773,1985,1773,1984,1943,1774,1778,1943,1778,1944,1986,1781,1777,1986,1777,1985,1944,1778,1782,1944,1782,1945,1987,1785,1781,1987,1781,1986,1945,1782,1786,1945,1786,1871,1988,1807,1810,1988,1810,1989,1949,1809,1808,1949,1808,1948,1990,1819,1822,1990,1822,1991,1950,1821,1820,1950,1820,1828,1992,1831,1834,1992,1834,1993,1825,1833,1832,1825,1832,1840,1795,1872,1809,1795,1809,1949,1989,1810,1873,1989,1873,1994,1948,1808,1821,1948,1821,1950,1991,1822,1807,1991,1807,1988,1798,1946,1872,1798,1872,1795,1994,1873,1947,1994,1947,1995,1828,1820,1833,1828,1833,1825,1993,1834,1819,1993,1819,1990,1840,1832,1952,1840,1952,1837,1996,1951,1831,1996,1831,1992,1837,1952,1954,1837,1954,1843,1997,1953,1951,1997,1951,1996,1843,1954,1956,1843,1956,1847,1998,1955,1953,1998,1953,1997,1871,1786,1946,1871,1946,1798,1995,1947,1785,1995,1785,1987,1847,1956,1958,1847,1958,1884,1999,1957,1955,1999,1955,1998,2000,2001,2002,2003,2004,2005,2003,2005,2006,2004,2007,2008,2004,2008,2005,2007,2009,2010,2007,2010,2008,2009,2011,2012,2009,2012,2010,2013,2014,2015,2016,2000,2002,2017,2018,2019,2017,2019,2020,2021,2022,2023,2021,2023,2024,2025,2026,2027,2025,2027,2028,2029,2030,2011,2029,2011,2009,2031,2014,2013,2032,2016,2002,2033,2034,2035,2033,2035,2036,2034,2037,2038,2034,2038,2035,2037,2039,2029,2037,2029,2038,2039,2040,2030,2039,2030,2029,2041,2014,2031,2042,2032,2002,2043,2044,2045,2043,2045,2046,2047,2048,2049,2047,2049,2050,2051,2052,2053,2051,2053,2054,2055,2056,2040,2055,2040,2039,2057,2014,2041,2058,2042,2002,2059,2060,2061,2059,2061,2062,2060,2063,2064,2060,2064,2061,2063,2065,2055,2063,2055,2064,2065,2066,2056,2065,2056,2055,2067,2014,2057,2068,2058,2002,2069,2070,2071,2069,2071,2072,2073,2074,2075,2073,2075,2076,2077,2078,2079,2077,2079,2080,2081,2082,2066,2081,2066,2065,2083,2014,2067,2084,2068,2002,2085,2086,2087,2085,2087,2088,2086,2089,2090,2086,2090,2087,2089,2091,2081,2089,2081,2090,2091,2092,2082,2091,2082,2081,2093,2014,2083,2001,2084,2002,2094,2095,2096,2094,2096,2097,2098,2099,2100,2098,2100,2101,2102,2103,2104,2102,2104,2105,2106,2107,2092,2106,2092,2091,2015,2014,2093,2036,2108,2109,2036,2109,2003,2035,2110,2108,2035,2108,2036,2003,2109,2111,2003,2111,2004,2038,2025,2110,2038,2110,2035,2004,2111,2028,2004,2028,2007,2029,2026,2025,2029,2025,2038,2009,2027,2026,2009,2026,2029,2007,2028,2027,2007,2027,2009,2062,2112,2113,2062,2113,2033,2061,2114,2112,2061,2112,2062,2033,2113,2115,2033,2115,2034,2064,2051,2114,2064,2114,2061,2034,2115,2054,2034,2054,2037,2055,2052,2051,2055,2051,2064,2039,2053,2052,2039,2052,2055,2037,2054,2053,2037,2053,2039,2088,2116,2117,2088,2117,2059,2087,2118,2116,2087,2116,2088,2059,2117,2119,2059,2119,2060,2090,2077,2118,2090,2118,2087,2060,2119,2080,2060,2080,2063,2081,2078,2077,2081,2077,2090,2065,2079,2078,2065,2078,2081,2063,2080,2079,2063,2079,2065,2120,2121,2122,2120,2122,2085,2123,2124,2121,2123,2121,2120,2085,2122,2125,2085,2125,2086,2126,2102,2124,2126,2124,2123,2086,2125,2105,2086,2105,2089,2106,2103,2102,2106,2102,2126,2091,2104,2103,2091,2103,2106,2089,2105,2104,2089,2104,2091,2108,2127,2128,2108,2128,2109,2110,2021,2127,2110,2127,2108,2109,2128,2024,2109,2024,2111,2025,2022,2021,2025,2021,2110,2028,2023,2022,2028,2022,2025,2111,2024,2023,2111,2023,2028,2112,2129,2130,2112,2130,2113,2114,2047,2129,2114,2129,2112,2113,2130,2050,2113,2050,2115,2051,2048,2047,2051,2047,2114,2054,2049,2048,2054,2048,2051,2115,2050,2049,2115,2049,2054,2116,2131,2132,2116,2132,2117,2118,2073,2131,2118,2131,2116,2117,2132,2076,2117,2076,2119,2077,2074,2073,2077,2073,2118,2080,2075,2074,2080,2074,2077,2119,2076,2075,2119,2075,2080,2121,2133,2134,2121,2134,2122,2124,2098,2133,2124,2133,2121,2122,2134,2101,2122,2101,2125,2102,2099,2098,2102,2098,2124,2105,2100,2099,2105,2099,2102,2125,2101,2100,2125,2100,2105,2127,2017,2020,2127,2020,2128,2021,2018,2017,2021,2017,2127,2024,2019,2018,2024,2018,2021,2128,2020,2019,2128,2019,2024,2129,2043,2046,2129,2046,2130,2047,2044,2043,2047,2043,2129,2050,2045,2044,2050,2044,2047,2130,2046,2045,2130,2045,2050,2131,2069,2072,2131,2072,2132,2073,2070,2069,2073,2069,2131,2076,2071,2070,2076,2070,2073,2132,2072,2071,2132,2071,2076,2133,2094,2097,2133,2097,2134,2098,2095,2094,2098,2094,2133,2101,2096,2095,2101,2095,2098,2134,2097,2096,2134,2096,2101,2135,2136,2137,2138,2139,2140,2138,2140,2141,2142,2143,2144,2142,2144,2145,2146,2147,2148,2146,2148,2149,2150,2151,2152,2150,2152,2153,2154,2155,2156,2154,2156,2157,2158,2159,2160,2161,2162,2163,2161,2163,2164,2165,2166,2167,2165,2167,2168,2169,2170,2171,2172,2135,2137,2173,2174,2139,2173,2139,2138,2175,2176,2177,2175,2177,2178,2179,2180,2147,2179,2147,2146,2181,2182,2183,2181,2183,2184,2185,2186,2187,2185,2187,2188,2189,2190,2191,2189,2191,2192,2190,2193,2162,2190,2162,2191,2194,2195,2166,2194,2166,2165,2196,2170,2169,2197,2172,2137,2198,2199,2174,2198,2174,2173,2200,2201,2202,2200,2202,2203,2204,2205,2180,2204,2180,2179,2206,2207,2208,2206,2208,2209,2210,2211,2212,2210,2212,2213,2210,2214,2215,2210,2215,2211,2216,2217,2218,2216,2218,2219,2220,2221,2195,2220,2195,2194,2222,2170,2196,2223,2197,2137,2224,2225,2199,2224,2199,2198,2226,2227,2228,2226,2228,2229,2230,2231,2205,2230,2205,2204,2232,2233,2234,2232,2234,2235,2233,2236,2237,2238,2239,2240,2238,2240,2241,2242,2243,2244,2242,2244,2245,2246,2247,2221,2246,2221,2220,2248,2170,2222,2249,2223,2137,2250,2251,2225,2250,2225,2224,2252,2253,2254,2252,2254,2255,2256,2257,2231,2256,2231,2230,2258,2259,2260,2258,2260,2261,2262,2263,2264,2262,2264,2265,2266,2267,2268,2266,2268,2269,2267,2270,2271,2267,2271,2268,2272,2273,2247,2272,2247,2246,2274,2170,2248,2275,2249,2137,2276,2277,2251,2276,2251,2250,2278,2279,2280,2278,2280,2281,2282,2283,2257,2282,2257,2256,2284,2285,2286,2284,2286,2287,2288,2289,2290,2288,2290,2291,2292,2293,2294,2292,2294,2295,2296,2297,2298,2296,2298,2299,2300,2301,2273,2300,2273,2272,2302,2170,2274,2303,2275,2137,2304,2305,2277,2304,2277,2276,2306,2307,2308,2306,2308,2309,2310,2311,2283,2310,2283,2282,2312,2313,2314,2312,2314,2315,2313,2316,2317,2318,2319,2320,2318,2320,2321,2322,2323,2324,2322,2324,2325,2326,2327,2301,2326,2301,2300,2328,2170,2302,2136,2303,2137,2329,2330,2305,2329,2305,2304,2331,2332,2333,2331,2333,2334,2335,2336,2311,2335,2311,2310,2337,2338,2339,2337,2339,2340,2341,2342,2343,2344,2345,2346,2344,2346,2347,2348,2349,2350,2348,2350,2351,2352,2353,2327,2352,2327,2326,2171,2170,2328,2354,2138,2141,2354,2141,2355,2139,2356,2142,2357,2173,2138,2357,2138,2354,2139,2174,2175,2139,2175,2358,2359,2198,2173,2359,2173,2357,2199,2360,2200,2361,2224,2198,2361,2198,2359,2225,2362,2363,2225,2363,2199,2364,2250,2224,2364,2224,2361,2255,2365,2225,2366,2276,2250,2366,2250,2364,2277,2367,2278,2368,2304,2276,2368,2276,2366,2309,2277,2305,2309,2305,2306,2369,2329,2304,2369,2304,2368,2334,2370,2305,2371,2165,2168,2371,2168,2372,2373,2167,2166,2373,2166,2374,2375,2194,2165,2375,2165,2371,2374,2166,2195,2374,2195,2376,2377,2220,2194,2377,2194,2375,2376,2195,2221,2376,2221,2378,2379,2246,2220,2379,2220,2377,2378,2221,2247,2378,2247,2380,2381,2272,2246,2381,2246,2379,2380,2247,2273,2380,2273,2382,2383,2300,2272,2383,2272,2381,2382,2273,2301,2382,2301,2384,2385,2326,2300,2385,2300,2383,2384,2301,2327,2384,2327,2386,2387,2352,2326,2387,2326,2385,2386,2327,2353,2386,2353,2388,2389,2169,2171,2389,2171,2390,2391,2196,2169,2391,2169,2389,2392,2222,2196,2392,2196,2391,2393,2248,2222,2393,2222,2392,2394,2274,2248,2394,2248,2393,2395,2302,2274,2395,2274,2394,2396,2328,2302,2396,2302,2395,2390,2171,2328,2390,2328,2396,2397,2398,2399,2397,2399,2400,2401,2402,2403,2401,2403,2404,2405,2406,2407,2405,2407,2408,2409,2410,2411,2409,2411,2412,2413,2414,2415,2413,2415,2416,2417,2418,2419,2417,2419,2420,2421,2422,2423,2421,2423,2424,2425,2426,2427,2425,2427,2428,2397,2400,2429,2397,2429,2430,2431,2399,2398,2431,2398,2432,2404,2433,2434,2435,2403,2402,2435,2402,2436,2437,2438,2405,2439,2407,2406,2439,2406,2440,2409,2412,2441,2409,2441,2442,2443,2411,2410,2443,2410,2444,2416,2438,2445,2446,2415,2414,2446,2414,2447,2420,2448,2449,2420,2449,2417,2450,2419,2418,2450,2418,2451,2452,2421,2424,2452,2424,2453,2454,2423,2422,2454,2422,2455,2428,2456,2457,2458,2427,2426,2458,2426,2459,2149,2460,2461,2149,2461,2146,2153,2462,2148,2176,2463,2179,2180,2464,2181,2204,2179,2202,2204,2202,2465,2209,2466,2180,2227,2230,2204,2227,2204,2228,2235,2467,2205,2253,2468,2256,2257,2469,2470,2257,2470,2231,2279,2282,2256,2279,2256,2280,2283,2471,2472,2283,2472,2257,2282,2473,2308,2315,2474,2283,2332,2475,2335,2336,2476,2337,2477,2478,2479,2477,2479,2480,2481,2482,2483,2481,2483,2484,2485,2486,2487,2485,2487,2488,2489,2490,2491,2489,2491,2492,2493,2494,2495,2493,2495,2496,2497,2498,2499,2497,2499,2500,2501,2502,2503,2501,2503,2504,2505,2506,2507,2505,2507,2508,2480,2509,2510,2511,2479,2478,2511,2478,2512,2484,2513,2514,2484,2514,2481,2515,2483,2482,2515,2482,2516,2517,2485,2488,2517,2488,2518,2519,2487,2486,2519,2486,2520,2492,2521,2522,2523,2491,2490,2523,2490,2524,2496,2525,2526,2527,2495,2494,2527,2494,2528,2529,2521,2497,2530,2499,2498,2530,2498,2531,2504,2532,2533,2534,2503,2502,2534,2502,2535,2536,2537,2505,2538,2507,2506,2538,2506,2539,2540,2140,2139,2540,2139,2430,2541,2542,2140,2543,2544,2139,2174,2545,2546,2547,2174,2199,2547,2199,2548,2549,2545,2174,2225,2550,2551,2552,2553,2199,2251,2554,2555,2251,2555,2225,2251,2556,2557,2558,2556,2251,2277,2559,2560,2277,2560,2251,2305,2561,2442,2562,2563,2277,2330,2542,2564,2305,2330,2565,2305,2565,2434,2566,2567,2397,2400,2568,2429,2569,2401,2404,2569,2404,2434,2570,2568,2401,2408,2567,2571,2437,2405,2408,2437,2408,2571,2572,2573,2409,2412,2574,2441,2413,2416,2575,2413,2575,2548,2576,2577,2413,2420,2578,2579,2559,2574,2417,2580,2581,2421,2424,2577,2453,2425,2428,2555,2425,2555,2557,2554,2578,2425,2149,2582,2583,2584,2585,2146,2146,2585,2586,2179,2146,2587,2179,2587,2588,2589,2590,2204,2179,2591,2592,2204,2590,2593,2594,2595,2230,2230,2595,2596,2256,2230,2597,2256,2597,2598,2599,2600,2282,2256,2601,2602,2310,2282,2603,2310,2603,2604,2605,2606,2310,2310,2607,2608,2310,2608,2335,2310,2606,2609,2610,2611,2565,2610,2565,2429,2612,2543,2587,2612,2587,2613,2614,2615,2616,2614,2616,2445,2617,2552,2618,2617,2618,2619,2620,2594,2621,2620,2621,2457,2622,2558,2623,2622,2623,2598,2624,2599,2625,2624,2625,2441,2626,2627,2628,2626,2628,2604,2629,2541,2568,2629,2568,2564,2630,2608,2583,2612,2631,2632,2612,2632,2633,2634,2585,2613,2635,2575,2546,2636,2591,2588,2617,2637,2638,2617,2638,2639,2640,2590,2619,2641,2642,2621,2641,2621,2643,2644,2595,2645,2646,2554,2556,2646,2556,2579,2647,2648,2602,2649,2650,2651,2649,2651,2652,2599,2603,2653,2654,2655,2442,2656,2657,2609,2658,2659,2660,2658,2660,2661,2662,2663,2664,2662,2664,2665,2666,2667,2668,2238,2241,2669,2238,2669,2670,2671,2672,2673,2671,2673,2674,2675,2676,2677,2675,2677,2533,2678,2679,2680,2678,2680,2681,2682,2683,2684,2682,2684,2685,2147,2686,2687,2688,2148,2147,2688,2147,2687,2689,2686,2147,2147,2180,2690,2147,2690,2691,2205,2692,2693,2180,2205,2694,2180,2694,2695,2231,2696,2697,2231,2697,2205,2231,2698,2699,2700,2698,2231,2257,2701,2702,2283,2703,2704,2705,2701,2257,2311,2706,2707,2283,2311,2708,2283,2708,2709,2710,2706,2311,2711,2311,2336,2711,2336,2712,2477,2480,2713,2477,2713,2714,2715,2716,2477,2484,2717,2665,2718,2719,2481,2720,2721,2485,2488,2716,2518,2489,2492,2722,2489,2722,2668,2723,2717,2489,2493,2496,2724,2493,2724,2725,2726,2727,2493,2500,2728,2729,2529,2497,2500,2529,2500,2729,2730,2731,2501,2732,2501,2504,2732,2504,2533,2508,2731,2733,2505,2508,2734,2505,2734,2735,2736,2737,2738,2736,2738,2739,2740,2689,2664,2740,2664,2510,2741,2742,2690,2741,2690,2695,2743,2744,2745,2743,2745,2522,2536,2746,2747,2536,2747,2748,2749,2705,2677,2749,2677,2733,2750,2751,2752,2750,2752,2709,2753,2710,2754,2753,2754,2526,2755,2756,2712,2757,2716,2714,2689,2758,2759,2760,2761,2713,2760,2713,2514,2762,2763,2764,2765,2766,2767,2765,2767,2668,2768,2692,2769,2696,2698,2748,2770,2771,2772,2770,2772,2735,2773,2701,2774,2775,2730,2776,2777,2752,2778,2779,2727,2725,2710,2708,2780,2781,2782,2525,2761,2783,2157,2784,2785,2156,2786,2161,2164,2786,2164,2787,2788,2789,2790,2791,2792,2793,2791,2793,2794,2795,2796,2234,2233,2797,2669,2233,2669,2234,2798,2799,2800,2798,2800,2801,2802,2803,2265,2804,2805,2264,2806,2807,2808,2809,2810,2811,2809,2811,2812,2813,2814,2314,2313,2815,2680,2313,2680,2314,2816,2817,2818,2816,2818,2819,2820,2821,2341,2820,2341,2685,2822,2823,2821,2824,2825,2826,2766,2827,2665,2663,2828,2664,2829,2830,2831,2829,2831,2668,2829,2832,2833,2834,2835,2533,2676,2836,2677,2837,2737,2716,2757,2838,2716,2775,2839,2733,2775,2836,2840,2779,2841,2727,2834,2751,2727,2517,2823,2525,2842,2724,2525,2843,2844,2845,2843,2845,2661,2846,2847,2783,2846,2783,2848,2662,2666,2849,2662,2849,2850,2851,2852,2853,2851,2853,2854,2855,2804,2808,2855,2808,2856,2857,2858,2803,2857,2803,2859,2675,2813,2860,2675,2860,2861,2862,2822,2863,2862,2863,2864,2865,2866,2867,2865,2867,2868,2869,2870,2871,2869,2871,2872,2873,2837,2785,2873,2785,2661,2874,2875,2876,2874,2876,2877,2878,2879,2880,2878,2880,2881,2882,2883,2884,2882,2884,2885,2886,2887,2888,2886,2888,2889,2890,2891,2892,2890,2892,2893,2894,2895,2896,2894,2896,2897,2898,2899,2900,2898,2900,2901,2902,2903,2904,2902,2904,2826,2905,2906,2907,2905,2907,2670,2908,2909,2910,2908,2910,2911,2912,2813,2835,2912,2835,2913,2862,2842,2823,2862,2823,2914,2915,2916,2917,2786,2915,2917,2786,2917,2160,2918,2371,2372,2918,2372,2919,2920,2375,2371,2920,2371,2921,2210,2922,2794,2923,2924,2211,2377,2375,2925,2377,2925,2926,2238,2927,2801,2928,2929,2241,2379,2377,2930,2379,2930,2931,2932,2381,2379,2932,2379,2931,2933,2934,2294,2899,2935,2295,2936,2383,2381,2936,2381,2937,2938,2939,2319,2320,2940,2819,2385,2383,2941,2385,2941,2942,2387,2385,2943,2387,2943,2919,2944,2788,2790,2944,2790,2850,2879,2945,2850,2946,2806,2808,2946,2808,2897,2947,2948,2897,2949,2950,2951,2949,2951,2826,2949,2952,2953,2954,2915,2955,2954,2955,2956,2957,2958,2959,2957,2959,2960,2961,2962,2945,2961,2945,2963,2964,2965,2966,2964,2966,2967,2968,2806,2969,2968,2969,2970,2971,2972,2948,2971,2948,2812,2809,2938,2973,2809,2973,2974,2975,2976,2977,2975,2977,2978,2979,2980,2981,2982,2983,2984,2962,2985,2986,2987,2950,2952,2987,2952,2988,2989,2990,2991,2786,2870,2789,2786,2789,2960,2992,2969,2931,2993,2994,2995,2996,2997,2998,2976,2999,2942,2944,2879,2924,2944,2924,2963,3000,2883,2929,3000,2929,2967,2886,2806,3001,2886,3001,3002,3003,2933,2948,3003,2948,3004,2809,2899,2939,2809,2939,3005,3006,2903,2825,3006,2825,2978];
var gazeboJSON = {
	vertices: vertices,
	normals: normals,
	triangles: triangles
};

const { sin: sin$1, PI: PI$3 } = Math;
/**
 * Render mesh to texture, then render that texture to another mesh.
 */
function renderToTexture(gl) {
    const mesh = Mesh.load(gazeboJSON);
    const sinVertices = arrayFromFunction(32, i => {
        const x = lerp(-PI$3, PI$3, i / 31);
        const y = sin$1(x);
        return new V3(x / 7.64, y / 7.64, 0);
    });
    const cyl = Mesh.offsetVertices(sinVertices, V3.Z, false);
    const plane = Mesh.plane();
    const texture = Texture.fromURLSwitch('texture.png');
    const overlay = new Texture(1024, 1024);
    const meshShader = Shader.create(`
	attribute vec3 ts_Normal;
	attribute vec4 ts_Vertex;
	uniform mat4 ts_ModelViewProjectionMatrix;
  varying vec3 normal;
  void main() {
    normal = ts_Normal;
    gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
  }
`, `
	precision highp float;
  varying vec3 normal;
  void main() {
    gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
  }
`);
    const planeShader = Shader.create(`
	attribute vec2 ts_TexCoord;
	attribute vec4 ts_Vertex;
	uniform mat4 ts_ModelViewProjectionMatrix;
  varying vec2 coord;
  void main() {
    coord = ts_TexCoord.xy;
    gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
  }
`, `
	precision highp float;
  uniform sampler2D texture;
  uniform sampler2D overlay;
  varying vec2 coord;
  void main() {
    gl_FragColor = (texture2D(overlay, coord) + texture2D(texture, coord)) / 2.0;
  }
`);
    gl.clearColor(1, 1, 1, 1);
    gl.enable(gl.DEPTH_TEST);
    return gl.animate(function (abs) {
        const angleDeg = abs / 1000 * 20;
        gl.pushMatrix();
        overlay.drawTo(function (gl) {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.matrixMode(gl.PROJECTION);
            gl.loadIdentity();
            gl.perspective(60, 1, 0.1, 1000);
            gl.lookAt(V(0, -2, 0.5), V(0, 0, 0.5), V3.Z);
            gl.matrixMode(gl.MODELVIEW);
            gl.loadIdentity();
            gl.rotate(angleDeg, 0, 0, 1);
            gl.rotate(90, 1, 0, 0);
            gl.scale(0.01, 0.01, 0.01);
            meshShader.draw(mesh);
        });
        gl.popMatrix();
        gl.matrixMode(gl.PROJECTION);
        gl.loadIdentity();
        gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000);
        gl.lookAt(V(0, -2, 1), V(0.5, 0, 0), V3.Z);
        gl.matrixMode(gl.MODELVIEW);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        texture.bind(0);
        overlay.bind(1);
        planeShader.uniforms({
            texture: 0,
            overlay: 1,
        });
        gl.loadIdentity();
        //gl.rotate(angleDeg, 0, 0, 1)
        //gl.rotate(30 * DEG, 1, 0, 0)
        //gl.rotate(90, 0,0,1)
        planeShader.draw(cyl);
        gl.loadIdentity();
        gl.rotate(90, 1, 0, 0);
        gl.translate(0.5, 0);
        planeShader.draw(plane);
    });
}

/**
 * Draw a rotating cube.
 */
function setupDemo(gl) {
    return __awaiter$1(this, void 0, void 0, function* () {
        const mesh = Mesh.cube();
        const shader = Shader.create(`
		uniform mat4 ts_ModelViewProjectionMatrix;
		attribute vec4 ts_Vertex;
		varying vec4 foo;
		void main() {
			foo = vec4(1.0, 1.0, 1.0, 1.0);
			gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
		}
	`, `
		precision highp float;
		uniform vec4 color;
		varying vec4 bar;
		void main() {
			gl_FragColor = color;
		}
	`);
        // setup camera
        gl.matrixMode(gl.PROJECTION);
        gl.loadIdentity();
        gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000);
        gl.lookAt(V(0, -2, 1.5), V3.O, V3.Z);
        gl.matrixMode(gl.MODELVIEW);
        gl.enable(gl.DEPTH_TEST);
        return gl.animate(function (abs, _diff) {
            const angleDeg = abs / 1000 * 45;
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.loadIdentity();
            gl.rotate(angleDeg, 0, 0, 1);
            gl.scale(1.5);
            gl.translate(-0.5, -0.5, -0.5);
            shader.uniforms({ color: [1, 1, 0, 1] }).draw(mesh);
            shader.uniforms({ color: [0, 0, 0, 1] }).draw(mesh, gl.LINES);
        });
    });
}

var vertices$1 = [[-5.69717,0.515,-5.891471],[-5.72387,0.27754,-5.439746],[-5.75319,0.270695,-5.443699],[-5.725741,0.506409,-5.89643],[-5.850048,0.612533,-5.24634],[-5.8775,0.886754,-5.67684],[-5.879369,0.605688,-5.250291],[-5.906069,0.878163,-5.681799],[-5.850048,0.244744,-10.201769],[-5.72387,0.579735,-10.395179],[-5.69717,0.852211,-9.96367],[-5.8775,0.480458,-9.749037],[-5.75319,0.586581,-10.39913],[-5.725741,0.860801,-9.96863],[-5.850048,4.720167,-8.042569],[-5.72387,4.720168,-7.655754],[-5.69717,4.210233,-7.635538],[-5.8775,4.210232,-8.064801],[-5.75319,4.720168,-7.647849],[-5.725741,4.210233,-7.625618],[-5.879369,4.720168,-8.034665],[-5.906069,4.210233,-8.054882],[-5.879369,0.251588,-10.205723],[-5.906069,0.489048,-9.753997],[18.159278,2.438747,1.45513],[17.879753,2.483789,1.490303],[19.267018,2.251733,1.345302],[18.161284,2.43781,-1.486655],[19.268873,2.250866,-1.37546],[17.881804,2.48283,-1.522172],[5.380975,4.819923,0.076994],[5.380975,4.88095,0.076994],[4.280626,4.864074,0.076355],[-2.636017,3.079511,2.192974],[-4.6425,2.780761,2.233326],[-1.972793,3.108552,2.355161],[21.36221,2.76963,1.09366],[17.868822,2.80813,1.483224],[19.263021,2.757818,1.316512],[-1.917432,4.595467,-1.420597],[-2.017059,4.477894,-1.50456],[-2.104407,4.560241,-1.356001],[-3.183457,3.144578,-2.038952],[-2.720528,3.284008,-2.132794],[-2.720809,3.182815,-2.172881],[-2.723398,3.285349,2.079071],[-2.575683,3.650582,1.97561],[-2.836728,3.656777,1.910954],[-3.1862,3.14586,1.984797],[23.472979,2.885158,0.640697],[23.472979,2.835347,0.73395],[24.471337,2.667251,0.489959],[12.900351,3.93739,1.492109],[11.47506,4.02476,1.606535],[11.47506,3.743384,1.823993],[12.900345,3.668613,1.708483],[5.948194,4.229896,1.866089],[5.697489,4.229896,1.883743],[5.69747,3.912889,2.157148],[5.948217,3.912889,2.136911],[24.472022,2.666931,-0.514522],[23.473872,2.884741,-0.666523],[24.471936,2.684219,-0.451608],[12.924575,3.666367,-1.744916],[11.477574,3.742209,-1.863876],[11.477278,4.023723,-1.646599],[12.924281,3.934929,-1.528939],[5.951161,3.911513,-2.181267],[5.678529,3.911499,-2.20358],[5.678155,4.228681,-1.930153],[5.950767,4.228693,-1.910647],[0.999399,3.992871,-2.242147],[-0.24061,3.992876,-2.234116],[-0.195366,4.289366,-1.999498],[0.99902,4.323619,-1.962341],[-10.051267,2.993182,-0.739974],[-9.280603,3.066158,-0.803361],[-9.258684,3.058205,-0.843703],[-10.051216,2.98241,-0.778124],[-10.915952,2.858348,0.628692],[-10.052233,2.982886,0.715868],[-10.052233,2.993634,0.67771],[-10.894258,2.873091,0.593037],[-7.835605,1.654483,-2.293155],[-7.835549,2.261373,-2.214988],[-7.791855,2.261248,-2.218932],[-7.791769,1.67342,-2.294123],[-4.683334,2.75784,-2.293749],[-7.792105,2.711066,-1.96841],[-7.814214,2.742776,-1.94468],[-4.661184,2.790797,-2.272556],[-4.686191,1.674839,2.401434],[-7.794855,1.674863,2.235715],[-7.816822,1.635205,2.233833],[-4.664222,1.635203,2.400805],[16.177781,3.85451,0.977584],[12.92222,4.174551,1.163519],[12.94413,4.153314,1.197147],[16.155858,3.838165,1.013893],[16.199641,2.439202,1.657367],[16.199611,2.901617,1.646728],[16.155898,2.902839,1.650929],[16.155929,2.437569,1.661618],[12.9441,3.360828,1.828607],[12.944082,3.66617,1.704912],[12.900334,3.362354,1.83244],[-9.236729,3.06606,-0.826689],[-7.835929,2.728869,-1.956662],[-7.816822,2.743996,1.885565],[-7.838555,2.730097,1.897533],[-7.794746,2.712301,1.909341],[-0.271001,4.911246,-0.025999],[-0.16102,4.908525,0.073958],[-0.160884,4.908462,-0.125831],[-9.256976,1.737231,-2.097727],[-7.815547,3.121029,-0.966519],[-7.814392,2.856865,-1.813732],[-9.257757,2.796012,-1.524281],[-10.050463,2.743509,-1.329136],[-11.982271,2.624956,-0.532438],[-11.982946,2.69833,-0.032125],[-10.937188,2.954944,-0.031618],[-10.936332,2.861944,-0.671072],[-13.04158,2.36361,-0.365567],[-13.042028,2.415337,-0.032632],[-4.844725,3.363268,-0.028196],[-4.674229,3.335153,-0.903612],[-7.816819,3.242468,-0.029717],[-3.223373,3.124351,-2.052526],[-4.660583,2.897624,-2.160372],[-4.137935,3.266489,-1.449259],[-1.596104,4.889084,-0.026738],[-0.159917,4.875617,-0.835379],[-1.705939,4.834268,-0.792724],[1.02181,3.055075,-2.543575],[1.021866,2.286631,-2.584493],[-0.393609,2.286629,-2.588487],[-0.393681,3.03368,-2.537381],[-2.834086,3.655543,-1.965041],[-2.577757,3.988322,-1.815252],[-2.342302,4.013766,-1.872067],[-2.572954,3.649306,-2.029399],[-2.100018,4.577596,-1.318543],[-1.776533,4.83,-0.77514],[-10.914243,2.520524,-1.286464],[-11.981601,2.335209,-1.023642],[-11.981847,2.469712,-0.844088],[-10.914489,2.654207,-1.105935],[2.989106,2.289685,-2.58228],[2.989084,1.666825,-2.567377],[1.021845,1.653322,-2.569584],[0.99962,3.616211,-2.404363],[-0.292827,3.616204,-2.414585],[3.734022,2.287499,-2.581439],[3.734002,1.667223,-2.566539],[3.361543,1.667024,-2.566958],[3.361563,2.288593,-2.581859],[3.710634,4.561702,-1.561517],[3.711176,4.282786,-1.959397],[3.360715,4.287726,-1.959795],[3.360172,4.567188,-1.561916],[5.384417,3.008264,-2.546427],[5.38444,2.274745,-2.562846],[3.733999,3.036431,-2.564752],[5.677624,4.501822,-1.539959],[5.405544,4.228669,-1.949658],[5.405052,4.501813,-1.555474],[5.678958,3.008281,-2.518791],[5.678981,2.274762,-2.535026],[7.602424,3.492264,-2.196853],[7.602614,2.980798,-2.338434],[5.973502,3.008298,-2.491156],[5.973295,3.530985,-2.340017],[9.843126,2.255032,-2.297917],[9.843112,1.667399,-2.287297],[7.602622,1.667364,-2.342544],[7.602638,2.262374,-2.353487],[9.819984,4.410455,-1.39815],[9.820482,4.146142,-1.751942],[7.623765,4.174907,-1.790978],[7.62329,4.44229,-1.429219],[10.891314,4.628277,-0.120292],[10.892142,4.584158,-0.727047],[9.841028,4.67027,-0.759431],[9.840157,4.705636,-0.121019],[11.476001,4.533763,-0.708998],[11.476785,4.293099,-1.285014],[10.89295,4.33824,-1.318434],[10.918208,3.435397,-2.045318],[11.477754,3.409738,-1.996052],[11.477937,2.911094,-2.129728],[10.894133,2.927389,-2.184592],[10.89395,3.417191,-2.052659],[12.924741,3.360429,-1.868547],[16.180051,2.901778,-1.682919],[16.180064,2.437554,-1.693298],[12.924928,2.280481,-2.006359],[12.924912,2.901581,-1.993545],[16.178519,4.017897,-0.561781],[16.179162,3.847032,-1.031041],[12.923858,4.166196,-1.22055],[12.923099,4.394756,-0.66421],[19.268756,3.084218,-1.289137],[17.870867,2.807175,-1.515311],[16.179907,3.244742,-1.577641],[23.474002,2.834872,-0.759744],[23.474074,2.77808,-0.813137],[23.473364,2.970204,-0.29353],[23.473691,2.927705,-0.533446],[19.268149,3.505445,-0.843406],[19.267624,3.624968,-0.460488],[21.363721,2.768925,-1.121789],[19.264834,2.756969,-1.346997],[24.472069,2.647254,-0.550939],[11.16091,3.755973,-1.895354],[5.951374,3.550197,-2.336386],[5.678743,3.550181,-2.360322],[2.989081,3.041739,-2.565594],[3.36154,3.039085,-2.565173],[3.009714,4.572674,-1.562314],[2.987687,4.58025,-1.543692],[3.359685,4.705287,-1.2051],[17.870875,2.532524,-1.522045],[18.071662,2.535295,-1.497556],[23.472979,2.616619,0.844724],[23.472979,2.693459,0.841263],[22.994113,2.640814,0.901673],[3.007616,3.598622,2.354469],[2.985617,3.579664,2.360132],[2.985617,3.043359,2.518456],[3.336077,3.040861,2.518456],[3.336078,3.595265,2.354469],[5.970137,2.276363,2.463916],[5.970137,3.009871,2.4474],[5.697443,3.009871,2.472675],[5.697442,2.276363,2.489363],[5.948149,4.502789,1.479712],[5.970137,4.51002,1.459819],[5.970137,4.772298,0.782666],[5.697554,4.644456,1.124237],[5.697515,4.502789,1.493695],[24.471337,2.71401,0.17721],[24.471337,2.715976,0.050865],[23.472983,2.97606,0.21846],[23.472979,2.970384,0.26765],[24.471337,2.684499,0.427034],[23.472979,2.928037,0.507592],[24.471337,2.618118,0.563234],[24.471337,2.647597,0.526388],[23.472979,2.77859,0.787379],[18.069639,2.536239,1.465868],[18.562026,2.665552,1.403291],[17.868822,2.533484,1.490132],[19.267018,3.505973,0.812448],[16.199577,3.845267,0.995088],[19.267018,3.625251,0.429453],[16.177781,4.018244,0.527017],[16.177779,4.046257,0.21846],[12.92222,4.433961,0.080398],[12.92222,4.395167,0.625539],[12.900351,4.168764,1.183253],[11.496931,4.284402,1.262016],[11.47506,4.255207,1.303944],[12.900386,1.765992,1.962258],[12.900347,2.281078,1.971085],[11.47506,2.237474,2.104611],[11.47506,1.678443,2.095272],[11.47506,4.534202,0.66861],[11.47506,4.576854,0.079528],[10.891177,4.628341,0.079186],[10.891179,4.584609,0.685968],[10.891179,2.239622,2.159125],[10.891179,2.928768,2.14457],[9.84002,2.965987,2.24198],[9.84002,2.256483,2.257139],[9.84002,4.670741,0.717114],[9.84002,4.705699,0.078679],[7.599456,4.754508,0.078235],[7.599458,4.70843,0.734536],[9.84002,3.470761,2.103541],[9.818141,3.490906,2.100144],[7.621338,3.512073,2.14738],[7.599458,3.49365,2.154623],[7.599458,2.982274,2.296531],[5.970135,4.819779,0.077316],[7.599458,1.668843,2.301477],[7.599458,2.26386,2.312041],[5.970137,1.668843,2.452482],[-4.642291,2.288262,2.358515],[-1.860104,2.288262,2.46602],[-1.860104,2.981474,2.381214],[-4.642353,2.77968,2.233477],[-0.159743,4.625329,1.528177],[-1.576152,4.575445,1.427836],[-0.397104,4.524159,1.657891],[-0.159377,4.506837,1.659046],[-0.198057,4.290624,1.947979],[0.996381,4.324853,1.912145],[0.996382,4.609536,1.514485],[-3.226134,3.12564,1.998339],[-4.663378,2.898931,2.104502],[-4.664124,2.792173,2.216756],[-11.982951,2.335841,0.959623],[-10.915952,2.521324,1.223529],[-10.915952,2.654892,1.042915],[-11.982951,2.470229,0.779983],[-7.816822,2.858001,1.754545],[-2.106218,4.561088,1.30216],[-2.019073,4.478835,1.450869],[-1.919333,4.596354,1.366944],[-2.603763,3.989944,1.750438],[-2.381842,3.956506,1.843534],[1.018377,2.288262,2.53562],[1.018377,3.05668,2.494213],[-0.397104,3.03528,2.486438],[-0.397104,2.288262,2.53802],[-3.213706,3.139871,1.98475],[-4.139873,3.267394,1.393952],[-4.675377,3.335689,0.847438],[-7.816822,3.121626,0.907163],[-13.042034,2.363822,0.300337],[-13.042034,2.266011,0.484345],[-11.982951,2.625275,0.468235],[-10.937204,2.862351,0.607895],[-10.052233,2.744335,1.267031],[-10.052233,2.257262,1.720653],[-10.052233,1.738548,1.86456],[-9.259792,1.738548,2.037157],[-9.259792,2.28836,1.880117],[-7.838689,1.655925,2.234709],[-9.259792,2.666427,1.63146],[-7.838527,2.262765,2.156156],[-9.259792,2.796963,1.463036],[-9.259792,3.058722,0.78229],[-4.653234,3.329691,0.878543],[-1.860104,3.102536,2.366403],[-0.369105,3.2151,2.456183],[-1.713902,3.113683,2.376213],[1.018377,1.654943,2.521115],[-0.397104,1.654943,2.516315],[-0.16102,4.876134,0.783528],[-1.706984,4.834756,0.739158],[-13.042034,2.143932,0.637801],[2.985617,1.668445,2.521115],[2.985617,2.291315,2.53562],[0.996378,3.617726,2.354618],[0.996379,3.994283,2.192162],[-0.243619,3.994283,2.182735],[-0.296083,3.617726,2.363384],[7.621374,4.443187,1.386408],[9.818107,4.411332,1.355974],[9.84002,4.417623,1.336233],[7.599458,4.451968,1.369072],[10.891179,3.418486,2.012324],[10.891179,1.668843,2.149457],[12.900334,2.902985,1.957862],[11.47506,2.912438,2.090374],[11.47506,4.293904,1.244779],[16.199588,2.03932,1.649374],[19.267018,3.385196,1.024749],[16.199587,3.672924,1.255006],[19.267018,3.244896,1.173401],[19.267018,3.085031,1.258447],[23.472979,2.482747,0.841979],[23.472979,2.546389,0.844963],[24.471337,2.699347,0.337595],[5.697443,1.668843,2.477784],[3.007615,3.968921,2.192336],[3.336078,3.964886,2.192336],[3.732607,4.568564,-1.542834],[3.732133,4.702774,-1.195347],[3.010255,4.292665,-1.960193],[11.349751,4.012407,-1.681308],[11.476864,4.254364,-1.344154],[24.472119,2.617751,-0.587766],[18.563961,2.664649,-1.434508],[19.268436,3.384533,-1.05563],[16.177915,4.046193,-0.229077],[12.922356,4.433898,-0.119093],[11.475195,4.57679,-0.119945],[11.477955,2.236121,-2.143535],[10.894148,2.238234,-2.198709],[9.843106,2.964546,-2.28321],[9.842916,3.469408,-2.145092],[9.841872,4.416758,-1.378388],[7.601352,4.451083,-1.411913],[7.60049,4.707948,-0.777541],[5.406111,3.550166,-2.384259],[5.384205,3.530981,-2.391856],[5.382098,4.771774,-0.845619],[5.676666,4.77178,-0.836583],[5.677144,4.636801,-1.188271],[5.38257,4.640343,-1.191823],[3.733783,3.570535,-2.406792],[3.731659,4.836984,-0.84786],[3.3592,4.843387,-0.848284],[-1.856823,2.97994,-2.43377],[-1.856844,3.101012,-2.419036],[-1.710626,3.112153,-2.428688],[-0.157626,4.624339,-1.579866],[-0.394809,4.523087,-1.709783],[-1.574169,4.574518,-1.481089],[-13.041118,2.143505,-0.70289],[-13.041328,2.265682,-0.549512],[-9.257528,2.665369,-1.692622],[1.021627,3.5968,-2.409011],[-0.365724,3.213519,-2.507209],[-4.639536,2.779376,-2.289093],[-1.969547,3.107036,-2.407925],[-4.63939,2.778295,-2.289243],[-10.915054,2.857927,-0.691843],[-9.237807,3.176064,-0.030732],[-4.686303,2.759228,2.237946],[-7.81374,1.633763,-2.29224],[-10.893409,2.872694,-0.656173],[12.944103,2.902839,1.953764],[16.155988,2.035999,1.653602],[16.155906,3.672835,1.263633],[-4.642253,1.654943,2.405254],[-4.686207,2.288082,2.356113],[-4.661042,1.633715,-2.455838],[-4.683009,1.673351,-2.456519],[-9.281657,3.066649,0.741919],[3.711557,3.958899,-2.239244],[3.361097,3.963204,-2.239642],[19.26864,3.244139,-1.204192],[11.301142,4.05477,1.593169],[11.0797,3.760592,1.862831],[16.155919,3.475638,1.440751],[16.199605,3.472721,1.437076],[-2.632991,3.078097,-2.246467],[-2.115472,4.564835,-1.336613],[2.986741,4.849791,-0.848707],[-2.371145,4.260438,1.599688],[-2.18225,4.271814,1.647984],[5.675556,4.772298,0.791371],[-3.210965,3.13859,-2.038932],[-2.723733,3.184182,2.119222],[12.944091,3.930305,1.494447],[16.179763,3.473414,-1.473369],[16.179516,3.674158,-1.291187],[5.405898,3.911485,-2.225892],[3.336078,4.289269,1.912282],[3.007615,4.293899,1.912282],[-10.894262,2.963517,-0.031597],[-9.281651,3.173029,-0.030755],[-4.683083,2.286622,-2.411605],[-4.639165,2.2868,-2.413955],[-7.794838,2.262643,2.160149],[16.199632,3.244599,1.541355],[16.1559,3.246514,1.545301],[12.944012,1.769143,1.958154],[12.944072,2.2828,1.966959],[-9.237813,3.066566,0.765296],[-9.257188,2.287143,-1.941037],[-10.049845,2.256146,-1.782447],[-10.050224,2.61148,-1.504628],[-10.91368,1.737485,-1.699049],[-10.91385,2.205057,-1.572848],[-10.04965,1.73734,-1.926023],[-11.981185,1.737722,-1.327885],[-11.981321,2.10508,-1.229964],[-13.040862,1.738001,-0.890341],[-13.040954,1.997042,-0.825747],[-4.652047,3.329136,-0.934689],[-0.393641,1.653324,-2.566378],[-1.856735,1.653368,-2.498426],[-1.856708,2.286674,-2.518135],[-1.798953,4.577853,-1.450201],[-2.573843,4.579814,-0.851356],[-2.145677,4.818652,-0.508319],[0.998481,4.608556,-1.564862],[-0.15708,4.505764,-1.710659],[3.711776,3.589943,-2.401143],[3.361317,3.593525,-2.40154],[5.384423,1.667232,-2.550713],[5.678966,1.66725,-2.523048],[5.973524,2.27478,-2.507205],[9.820832,3.839206,-1.999778],[9.821031,3.489554,-2.141733],[7.624294,3.510692,-2.189597],[7.6241,3.864405,-2.044412],[10.894139,1.667462,-2.188677],[12.924919,1.766073,-1.997215],[11.477944,1.677097,-2.13384],[11.498676,4.283585,-1.302221],[16.180055,2.036747,-1.685037],[19.267156,3.643792,-0.229077],[23.473111,2.976001,-0.229077],[23.474143,2.692915,-0.866966],[24.471812,2.699124,-0.362178],[24.471421,2.715936,-0.07546],[24.471593,2.71389,-0.201803],[5.971234,4.771785,-0.827546],[5.972156,4.509075,-1.504531],[5.950197,4.501832,-1.524445],[2.988865,3.578145,-2.407612],[3.010857,3.597107,-2.401937],[5.383043,4.508911,-1.538026],[23.525546,2.578205,0.831745],[3.336077,2.290287,2.53562],[5.970137,3.532462,2.295928],[5.948221,3.551671,2.29226],[5.697458,3.551671,2.313991],[24.471337,2.578208,0.567091],[11.47506,3.410996,1.95638],[10.915448,3.436687,2.005],[10.891179,4.339066,1.277513],[9.84002,1.668843,2.246894],[9.818134,3.840466,1.957967],[7.621343,3.865694,2.00197],[1.018377,3.598319,2.359303],[-10.052233,2.612419,1.442608],[-1.800893,4.57876,1.396693],[-13.042034,1.997547,0.760751],[-11.982951,2.105843,1.166092],[-10.915952,2.206039,1.510114],[-10.915952,1.738548,1.636613],[-11.982951,1.738548,1.264247],[-13.042034,1.738548,0.82551],[-1.860104,1.654943,2.446715],[-1.777552,4.830477,0.721497],[-2.101781,4.578418,1.264696],[9.818125,4.147244,1.709935],[7.621355,4.176034,1.748339],[19.26702,3.643855,0.21846],[24.471337,2.545153,0.563832],[3.336077,1.668633,2.521115],[3.007615,4.573654,1.514224],[3.336079,4.568512,1.514224],[3.010636,3.967509,-2.240039],[5.973507,1.667267,-2.495383],[7.599592,4.754445,-0.121269],[5.970271,4.819715,-0.122228],[5.38111,4.819859,-0.122569],[4.280761,4.86401,-0.123197],[3.730738,4.8827,-0.173397],[-2.718365,4.570126,-0.415293],[-2.216286,4.800619,-0.259522],[-2.380984,4.272957,-1.637141],[-2.179967,4.270747,-1.701726],[1.019503,4.889663,-0.850948],[1.020449,4.615592,-1.545971],[1.018513,4.939797,-0.125047],[-4.639066,1.653453,-2.460275],[3.693969,4.888978,-0.090279],[3.730637,4.886098,-0.073512],[-2.117257,4.565669,1.282757],[24.471337,2.465352,0.200326],[24.471337,2.458776,-0.012215],[24.471627,2.465216,-0.224761],[24.472035,2.483749,-0.526206],[24.47209,2.511745,-0.56621],[24.472119,2.544786,-0.588317],[24.472125,2.577839,-0.591597],[24.471337,2.512098,0.541746],[24.471337,2.484076,0.50176],[3.336079,4.713401,1.139211],[2.985617,4.850316,0.800416],[2.985617,4.581219,1.495573],[3.620554,4.894769,-0.023803],[2.985616,4.905882,-0.024164],[-2.718891,4.570374,0.360755],[-2.574967,4.580339,0.796975],[-2.146333,4.818959,0.454267],[-2.216602,4.800767,0.205403],[-2.22062,4.790023,-0.027058],[1.128348,4.944406,-0.025222],[1.018377,4.93986,0.074482],[1.018377,4.890189,0.800416],[5.380977,4.772298,0.800076],[3.730534,4.882796,0.125924],[3.730535,4.837509,0.800416],[-2.753014,4.578715,-0.027246],[3.693878,4.88902,0.04276],[3.730568,4.886129,0.026036],[3.358076,4.843913,0.800416],[1.018377,4.616561,1.495614],[23.526696,2.577667,-0.857316],[23.474148,2.616073,-0.870378],[22.995358,2.640232,-0.927883],[23.474143,2.482203,-0.867549],[23.474148,2.545843,-0.870573],[5.38111,4.880929,-0.122569],[-9.236865,0.329422,-0.824935],[-7.837451,0.18935,-0.962988],[-7.838737,0.06916,-0.028718],[-9.237873,0.213944,-0.029788],[-4.6862,0.133495,0.940686],[-4.686229,0.47796,1.996261],[-7.816822,0.524937,1.745395],[-7.816822,0.195714,0.925725],[-7.838724,0.189945,0.905475],[-9.237949,0.329929,0.765286],[-9.235898,0.651441,-1.477998],[-7.814405,0.523807,-1.803096],[-7.815523,0.195106,-0.983216],[-9.237871,0.652364,1.418143],[-4.683578,0.476721,-2.050554],[-4.684931,0.132902,-0.994751],[-1.621065,0.355724,1.654869],[-1.860104,0.125975,0.903295],[-1.124549,0.233971,1.256582],[5.697241,1.041824,2.381549],[5.434856,0.45689,2.238232],[5.970137,0.546292,2.193992],[5.970137,1.061323,2.361836],[-1.618775,0.354654,-1.705484],[-1.858838,0.125384,-0.954034],[-1.857362,0.455897,-2.037707],[-4.642224,0.125975,0.921214],[-4.642226,0.484722,2.018124],[-4.685,0.123222,-0.954662],[-7.793582,0.184564,-0.944645],[-9.280387,0.33403,-0.821496],[-9.279467,0.663031,-1.489477],[-7.816822,0.548577,1.775703],[-9.259792,0.676592,1.446361],[12.944086,1.275412,1.889247],[12.900355,1.250901,1.890297],[-4.640981,0.125395,-0.975223],[-4.664222,0.502601,2.026335],[-9.257189,1.154558,-1.940316],[-7.813871,1.046043,-2.195845],[-7.814365,0.547428,-1.833418],[-9.25778,0.675651,-1.506256],[-10.052229,0.331391,-0.030284],[-10.05124,0.438042,-0.758149],[-9.281512,0.218861,-0.029814],[-10.915078,0.60952,-0.672451],[-10.914344,0.873988,-1.211758],[-10.050405,0.742684,-1.371671],[-11.982271,0.851505,-0.531308],[-11.981702,1.059294,-0.949776],[-13.04158,1.113063,-0.36477],[-13.041202,1.259598,-0.640862],[-1.860104,0,-0.02533],[-4.642223,0,-0.026963],[-1.122802,0.233155,-1.306561],[-0.496893,0.125384,-0.9525],[1.022088,1.069469,-2.478586],[-0.393687,1.068924,-2.437637],[5.384296,1.059771,-2.457557],[3.733868,1.047,-2.467849],[5.973154,0.544881,-2.236179],[5.382238,0.20157,-0.945927],[5.383996,0.437458,-2.236288],[5.678839,1.059788,-2.430954],[7.602507,1.0724,-2.257388],[5.973384,1.059805,-2.404351],[10.893829,0.612943,-1.962596],[10.892262,0.290354,-0.814111],[9.841152,0.249625,-0.85029],[9.842787,0.581732,-2.05057],[11.476117,0.328325,-0.793995],[11.47506,0.217621,-0.01882],[10.891177,0.177326,-0.019136],[12.92321,0.524963,-0.743558],[12.922218,0.423102,-0.01807],[16.179816,1.296251,-1.510059],[16.178613,1.06977,-0.627765],[12.924637,0.815688,-1.791133],[16.177779,0.990433,-0.016418],[19.268805,1.982023,-1.324747],[19.268677,1.754142,-1.23187],[16.179971,1.635972,-1.623485],[23.474101,2.386764,-0.835664],[23.474019,2.305878,-0.777308],[23.472979,2.233306,-0.012706],[23.473408,2.252092,-0.327079],[1.535722,1.02632,-2.470311],[2.98895,1.044017,-2.468686],[2.986244,0.909136,-2.424191],[-1.856686,0.486714,-2.17771],[-1.911985,0.483386,-2.123027],[-1.535822,0.356457,-1.770176],[-1.058155,0.243403,1.334962],[-1.5382,0.357568,1.719652],[5.380977,0.49716,2.256475],[5.380977,1.042063,2.408988],[3.732397,1.029808,2.416069],[3.754428,0.807852,2.336156],[23.472979,2.387288,0.810155],[19.267018,1.982858,1.294759],[16.199618,1.63944,1.58815],[16.177781,1.297202,1.477029],[16.177781,1.617943,1.583891],[12.92222,1.233711,1.882447],[12.92222,0.816817,1.754743],[12.92222,0.525425,0.707353],[11.47506,0.645485,1.875763],[11.47506,0.328819,0.756285],[10.891179,0.61418,1.924048],[10.891179,0.29086,0.775768],[9.84002,0.583026,2.010858],[9.84002,0.250154,0.810789],[7.599458,1.073825,2.2167],[5.380977,0.202159,0.903295],[5.970137,0.202159,0.884656],[5.380975,0.081318,-0.021278],[3.730535,0.171341,0.903295],[3.730534,0.04796,-0.022197],[2.985616,0.040807,-0.022614],[2.985617,0.164702,0.903295],[1.018377,0.125975,0.903295],[1.018376,0.000001,-0.023709],[-0.397104,0.000001,-0.024506],[-0.397104,0.119253,0.853749],[-0.49816,0.125975,0.903295],[-1.860104,1.021624,2.31722],[-4.664222,1.021624,2.296974],[-7.816822,1.047423,2.137812],[-13.042034,1.479552,0.760751],[-13.042034,1.259985,0.576335],[-11.982951,1.059879,0.88657],[-11.982951,1.371255,1.166092],[-10.915952,0.87474,1.149872],[-10.915952,1.271058,1.510114],[-10.052233,0.743539,1.310841],[-10.052233,1.200052,1.720653],[-9.281456,0.663961,1.429566],[-9.259792,1.155775,1.880117],[-10.052233,0.438506,0.697513],[-9.281464,0.334534,0.761794],[-10.915952,0.609929,0.610733],[-11.982951,0.851823,0.468235],[-13.042034,1.113275,0.300337],[-1.860104,0.457179,1.986759],[-0.342103,0.125975,0.903295],[5.970135,0.081318,-0.020946],[7.599456,0.113988,-0.020039],[7.599458,0.232343,0.830403],[7.599458,0.569394,2.059482],[9.840019,0.133267,-0.019714],[10.891179,1.098064,2.070586],[9.84002,1.081203,2.164238],[11.47506,1.119411,2.018503],[16.177781,1.070159,0.594879],[19.267018,1.754918,1.202027],[23.472979,2.306365,0.751851],[23.472979,2.252292,0.301656],[1.532388,1.027878,2.42282],[2.982971,0.910666,2.378408],[2.985617,1.045574,2.42282],[-1.914845,0.484722,2.071999],[-1.859619,0.488085,2.126742],[-1.0563,0.242537,-1.384872],[5.384081,0.495709,-2.299294],[3.757642,0.80635,-2.381005],[12.924822,1.251703,-1.924998],[11.477641,0.644278,-1.913673],[9.842999,1.079812,-2.204267],[7.602293,0.568069,-2.099849],[5.437935,0.455451,-2.280965],[3.731797,0.170751,-0.947767],[3.361409,1.045508,-2.468268],[-0.340839,0.125384,-0.952324],[1.019641,0.125385,-0.950792],[-0.395906,0.118694,-0.902836],[-1.856912,1.020132,-2.368528],[-1.715778,0.700522,-2.241355],[-1.857194,0.557033,-2.160852],[-4.639547,0.483469,-2.072369],[-4.661178,1.0202,-2.351601],[-13.042028,1.061755,-0.0322],[-11.982948,0.778762,-0.031514],[-10.915948,0.516938,-0.03083],[16.155912,1.654337,1.59512],[-7.794826,0.066944,-0.028693],[-4.686216,0.12379,0.900603],[-4.686218,0.000471,-0.026989],[-1.212076,0.885231,-2.344279],[-0.61068,1.020099,-2.418227],[-1.215236,0.886709,2.293783],[-1.718798,0.701933,2.19041],[-7.794831,0.185147,0.887185],[-4.661533,0.501344,-2.080618],[-10.049845,1.198937,-1.781773],[-10.913852,1.270077,-1.572252],[-11.981321,1.370492,-1.229496],[-13.040954,1.479047,-0.825417],[2.98688,0.164112,-0.948601],[5.971371,0.201582,-0.926625],[7.600618,0.231801,-0.870556],[10.894031,1.096733,-2.109442],[11.477838,1.118113,-2.056716],[19.267698,1.602294,-0.513342],[3.362427,0.85684,-2.401946],[-0.395901,0.129639,-1.011304],[-0.397244,0.130268,0.96221],[-1.860104,0.558393,2.109839],[3.358187,1.028194,2.4162],[3.359185,0.858355,2.35662],[3.336077,1.046978,2.42282],[19.267018,1.602612,0.483596],[19.26702,1.54913,-0.014856],[1.018744,1.071033,2.430489],[-0.613942,1.021624,2.368322],[-0.396972,1.070461,2.387946],[5.380977,0.438868,2.193506],[5.378623,0.451181,2.292816],[5.381777,0.449707,-2.335609],[-1.196027,0.844873,2.327049],[-0.397013,1.023222,2.427194],[3.358326,0.828478,2.378869],[3.412482,0.806464,2.387261],[3.742729,0.763648,2.370732],[1.018144,1.02324,2.472791],[2.98062,0.865366,2.412711],[3.303629,0.820996,2.39326],[-1.699983,0.657367,2.225906],[3.353976,0.785931,2.391155],[2.968858,0.782526,2.416197],[3.346136,0.730701,2.393479],[3.745991,0.762124,-2.415566],[1.021545,1.02165,-2.520858],[-0.393672,1.02166,-2.476856],[3.357266,0.784393,-2.43644],[3.349428,0.729162,-2.438738],[2.972181,0.780972,-2.461914],[2.98394,0.863814,-2.458468],[3.306923,0.819457,-2.438625],[3.361599,0.826948,-2.424177],[3.415766,0.804929,-2.432494],[-1.192821,0.843375,-2.377497],[-1.696915,0.655933,-2.276802],[-10.052229,3.094007,-0.031164],[-14.024373,1.898354,-0.163698],[-14.024436,1.928032,-0.119343],[-14.024343,1.593386,-0.185687],[-14.024284,1.659914,-0.230201],[-14.024551,1.861432,0.134664],[-14.024551,1.898437,0.097658],[-14.024551,1.817059,0.164313],[-14.024551,1.738548,0.179929],[-14.024551,1.549011,0.053284],[-14.024547,1.533392,-0.032904],[-14.024551,1.593483,0.119841],[-14.024263,1.738412,-0.245868],[-14.024547,1.943701,-0.033035],[-14.024284,1.816933,-0.230301],[-14.024322,1.861325,-0.20068],[-14.024436,1.548956,-0.119102],[-14.024551,1.660039,0.164313],[-14.024551,1.928087,0.053284],[-3.332652,4.057836,-1.063095],[-3.153399,4.20189,-0.978916],[-2.861372,4.201594,-1.293815],[-3.040627,4.05754,-1.377994],[-4.058686,3.808134,-0.191132],[-4.042151,3.798636,-0.53655],[-4.339955,3.604217,-0.576061],[-4.35649,3.613715,-0.230643],[-4.340696,3.604562,0.520238],[-4.637379,3.348078,0.84282],[-4.184889,3.586328,0.86577],[-3.178836,3.906232,1.408784],[-2.647922,3.990849,1.730195],[-3.042466,4.058402,1.323419],[-2.707556,4.362851,1.107557],[-2.607785,4.561005,0.814063],[-2.906794,4.366321,0.836176],[-3.080562,4.379916,0.082497],[-2.791449,4.559597,-0.027262],[-3.080411,4.379845,-0.137306],[-3.532217,3.916297,-1.121467],[-3.714848,3.929577,-0.819678],[-3.515282,4.071116,-0.761306],[-3.516283,4.071584,0.706188],[-3.284408,4.209557,0.657789],[-3.362013,4.217448,0.373838],[-3.593889,4.079475,0.422237],[-4.058909,3.808238,0.135571],[-3.830173,3.94735,0.135655],[-3.829951,3.947246,-0.191047],[-3.154695,4.202496,0.924122],[-2.863098,4.202401,1.239351],[-3.354814,4.222151,-0.169383],[-3.355007,4.222241,0.11435],[-3.824676,3.940726,0.443636],[-3.715927,3.930081,0.764426],[-3.952016,3.571962,-1.248832],[-3.701301,3.773986,-1.184674],[-3.345962,3.763006,-1.526623],[10.891179,4.070983,1.639571],[9.861889,4.14059,1.712168],[9.861893,3.844345,1.951949],[10.886686,3.78358,1.869171],[10.889261,3.782376,-1.909743],[9.864581,3.843088,-1.993714],[9.86425,4.139486,-1.754122],[10.893443,4.069926,-1.680322],[2.966635,3.974179,-2.237445],[1.043393,3.998704,-2.239614],[1.043022,4.319328,-1.967871],[2.966265,4.28945,-1.965673],[-1.857374,3.993007,-2.028737],[-2.281253,3.98345,-1.905531],[-2.14298,4.261613,-1.722182],[-1.819518,4.306366,-1.782879],[-3.593274,4.079188,-0.477447],[-3.599191,4.086008,-0.169477],[-3.361467,4.217192,-0.428875],[-0.397104,4.288125,1.956221],[-1.821912,4.307485,1.729521],[-1.860102,3.994282,1.975535],[-0.397104,3.994283,2.181135],[-4.115119,3.286181,-1.427132],[-4.636239,3.347544,-0.898958],[-0.284607,3.992877,-2.233818],[-0.336825,3.616204,-2.414933],[-0.393846,3.616204,-2.415383],[-0.394096,3.992877,-2.232689],[-2.608245,3.113509,-2.232342],[-2.678388,3.198093,-2.178331],[-2.678152,3.281249,-2.145372],[-2.534004,3.63897,-2.045258],[-1.857114,3.616328,-2.217833],[-1.856856,3.139428,-2.409173],[-0.403536,3.24993,-2.496918],[-1.824621,4.565212,-1.463461],[-1.743535,4.5565,-1.480185],[-1.981904,4.467238,-1.526873],[-1.907471,4.527875,-1.48506],[5.361988,3.918217,-2.225161],[5.36219,3.569011,-2.378344],[3.755761,3.607511,-2.392882],[3.755542,3.964107,-2.236387],[10.880449,3.455733,-2.041167],[9.864775,3.506186,-2.130447],[11.200562,4.055681,1.615855],[11.442039,4.276689,1.281042],[10.891179,4.319318,1.311924],[7.577544,4.174021,1.756848],[7.577532,4.433618,1.405132],[5.992063,4.490217,1.49343],[5.99205,4.225259,1.868391],[-0.243479,4.283187,1.957669],[-0.207652,4.484526,1.68946],[-0.397104,4.499341,1.68926],[2.963617,3.617413,2.346523],[2.963618,3.975589,2.189687],[1.040375,4.000114,2.189675],[1.040377,3.635854,2.346485],[-0.340082,3.617726,2.363683],[-0.287617,3.994283,2.182387],[-0.397104,3.617726,2.364069],[-4.117027,3.287072,1.371838],[-3.953673,3.572736,1.193503],[-4.356758,3.613841,0.174796],[-4.804571,3.373611,-0.028176],[-4.042845,3.79896,0.481013],[-3.348005,3.763962,1.471892],[-2.872861,3.662974,1.890166],[-2.403183,4.289721,1.525152],[-2.138568,4.55968,1.274978],[-2.536755,3.640256,1.99152],[-2.681039,3.282598,2.091699],[-2.681321,3.199464,2.124711],[-2.611249,3.114914,2.178854],[-1.860104,3.140945,2.356515],[-1.8601,3.617723,2.164871],[-0.406902,3.251504,2.445826],[-1.909458,4.528804,1.431461],[-1.983949,4.468193,1.473229],[-2.145291,4.262692,1.668488],[-1.745517,4.557426,1.426753],[9.861891,4.396355,1.369483],[11.443813,4.27586,-1.321303],[11.281583,4.050747,-1.650116],[10.892997,4.318469,-1.352833],[7.580305,3.872175,-2.045396],[7.580489,3.530478,-2.18564],[5.995191,3.568143,-2.324851],[5.994979,3.917049,-2.175119],[-3.087065,4.374887,-0.396799],[-2.754608,4.551767,-0.427203],[-3.824034,3.940426,-0.499018],[-3.283474,4.20912,-0.712734],[3.755169,4.277956,-1.96474],[5.361624,4.225565,-1.956802],[11.008235,3.790191,1.85329],[-3.934096,3.788315,0.801803],[-3.035693,4.373,-0.624612],[-3.702877,3.774724,1.129536],[-3.550742,3.53884,1.518092],[-3.599386,4.086098,0.114256],[-2.905617,4.36577,-0.890794],[-3.08757,4.375122,0.341985],[-3.334065,4.058497,1.008191],[-3.548637,3.537855,-1.572908],[-2.645527,3.989729,-1.784282],[-3.176879,3.905317,-1.463416],[-2.706008,4.362128,-1.161949],[-2.401067,4.288732,-1.579155],[-3.533709,3.916994,1.066429],[-3.036507,4.373381,0.569843],[-3.932966,3.787787,-0.85721],[-4.183681,3.585762,-0.921368],[11.14863,3.815083,-1.867461],[-0.394401,4.286862,-2.007963],[-2.33407,3.983504,1.837188],[2.963618,4.290687,1.917715],[1.040374,4.320565,1.917727],[-3.222345,3.148423,-2.02045],[-2.870248,3.661753,-1.944298],[-2.606637,4.560469,-0.868469],[-2.136793,4.55885,-1.328854],[2.966848,3.615903,-2.394052],[1.043608,3.634343,-2.396192],[-0.240775,4.281924,-2.009234],[-0.394767,4.498248,-1.741136],[-0.205315,4.483433,-1.741113],[5.3611,4.491148,-1.573187],[3.754645,4.549152,-1.577859],[9.863784,4.395469,-1.4116],[10.877696,3.457021,2.000793],[7.577541,3.531857,2.143361],[7.577547,3.873464,2.0029],[5.992047,3.91842,2.130809],[5.992054,3.569611,2.280764],[-1.826578,4.566128,1.409932],[2.963617,4.5628,1.530524],[1.040375,4.597302,1.530561],[-2.755154,4.552022,0.372636],[-3.225062,3.149693,1.966249],[9.861901,3.50753,2.088897],[7.579476,4.43271,-1.447986],[7.579967,4.172889,-1.799536],[5.994626,4.224054,-1.912897],[5.99413,4.489251,-1.538105],[2.965737,4.56181,-1.578656],[1.042496,4.596311,-1.580881],[1.81552,1.472143,-19.133414],[0.449626,1.682451,-22.125938],[1.529021,1.699363,-22.124896],[-0.401541,0.5226,-6.452579],[0.967598,0.5226,-6.451037],[3.346274,0.804271,-10.277924],[4.857296,0.825086,-10.276235],[5.186025,0.575657,-6.446319],[3.590816,0.554194,-6.448103],[-1.071483,0.856212,-10.282933],[-0.435927,0.772601,-10.282163],[-1.070011,0.605877,-6.45375],[1.937736,1.702267,-22.124538],[2.293438,1.475495,-19.132877],[2.663559,0.799575,-10.27869],[2.372304,1.030567,-13.319844],[2.984682,1.034801,-13.319157],[1.523576,1.753132,-22.174598],[1.931179,1.756022,-22.17414],[-0.352642,1.750389,22.126611],[-0.726375,1.80165,22.126611],[-0.73772,1.748712,22.076768],[-0.357158,1.696528,22.076764],[1.907619,1.716346,22.07705],[2.813136,1.729814,22.077344],[2.783468,1.752532,22.126611],[-1.085462,0.862746,10.232606],[-0.449903,0.779135,10.232606],[0.847172,0.779098,10.232606],[-0.410299,0.526694,6.403223],[0.958839,0.526694,6.403223],[2.861437,0.553664,6.403223],[-1.540122,0.423011,2.632883],[-1.854221,0.525616,2.622071],[2.649583,0.806108,10.232606],[-1.532352,0.946355,10.232606],[-1.790546,1.029963,10.232606],[-1.818128,0.776528,6.404321],[-1.548062,0.69325,6.403955],[0.419508,1.69653,22.076787],[2.267397,1.487668,19.085934],[3.32587,1.502973,19.085934],[0.417238,1.750389,22.126611],[0.447423,1.736278,-22.1758],[2.813651,1.738422,-22.173137],[2.843253,1.715735,-22.123824],[0.861148,0.772565,-10.280702],[-1.51837,0.939821,-10.283489],[-1.5393,0.689154,-6.454697],[2.870194,0.549571,-6.448912],[-1.850613,0.523929,-2.673056],[-1.536499,0.421318,-2.683449],[1.789479,1.484317,19.085934],[2.354184,1.039037,13.27328],[-1.078772,0.609972,6.403588],[4.340261,1.053725,-13.317641],[-0.707602,1.734632,-22.127258],[-0.327041,1.682449,-22.126788],[-0.696189,1.787539,-22.177119],[-0.322456,1.736278,-22.176666],[1.900995,1.770132,22.126611],[1.493391,1.767242,22.126611],[1.498903,1.713441,22.076951],[3.332299,0.810804,10.232606],[2.966561,1.04327,13.27328],[4.322143,1.062195,13.27328],[4.843321,0.831618,10.232606],[3.58206,0.558287,6.403223],[5.177269,0.57975,6.403223],[3.351909,1.490801,-19.131694],[-1.776567,1.023428,-10.283834],[-1.809366,0.772432,-6.455421],[1.899814,1.927501,22.126611],[1.692225,1.948979,22.126611],[2.783468,1.769666,22.126611],[-0.351429,2.040242,22.126611],[-0.780291,1.96384,22.126611],[-1.037629,1.897444,22.126611],[-1.069761,1.871472,22.126611],[-0.98766,1.85262,22.126611],[1.48689,1.971487,22.126611],[0.415769,2.040242,22.126611],[-1.194401,0.858651,2.620978],[0.706492,1.629866,14.13075],[0.84728,1.405424,10.232606],[-0.449817,1.405428,10.232606],[0.616943,1.856724,18.130513],[0.560299,1.862927,18.178578],[1.787167,1.835502,19.085934],[0.419513,2.08737,22.076722],[-0.357158,2.087368,22.076695],[2.81314,1.781582,22.077321],[1.915255,1.973703,22.077008],[3.286787,0.998746,6.404564],[3.228127,0.976261,6.405729],[2.351216,1.480369,13.27328],[2.628579,1.450968,13.27328],[2.664596,1.445638,13.243482],[2.992003,1.258204,10.232606],[2.646263,1.294595,10.232606],[2.69434,1.444204,13.27328],[2.978053,1.415916,13.27328],[3.345124,1.223265,10.232606],[2.867012,1.040088,6.404588],[0.968407,1.15043,6.404644],[-1.629063,1.155151,10.232606],[-1.647065,0.901162,6.404414],[-1.694987,0.680393,2.620572],[-1.174694,1.025796,6.404508],[-0.401034,1.15043,6.404601],[-1.182149,1.280304,10.232606],[3.228924,1.007181,6.454375],[3.177371,1.009296,6.404569],[4.322207,1.181448,13.27328],[4.843395,0.974182,10.232606],[2.026034,1.811205,19.115735],[1.704027,1.995548,22.076947],[2.276337,1.784195,19.085934],[2.06225,1.805993,19.085934],[0.50713,1.859961,18.127049],[1.496946,2.018238,22.076897],[0.649719,1.632645,14.179005],[0.75953,1.629408,14.182469],[-0.795664,2.009272,22.076726],[3.325878,1.577676,19.085934],[5.185606,0.721005,6.404475],[3.604398,0.969004,6.404549],[1.996505,1.81289,19.085934],[3.237749,1.003055,-6.499939],[3.186129,1.005202,-6.450192],[3.236885,0.972166,-6.451273],[2.675628,1.409265,-13.32125],[2.667831,1.348955,-13.324274],[2.357692,1.381831,-13.324643],[2.369338,1.471899,-13.320127],[2.646698,1.442497,-13.319796],[2.08829,1.793819,-19.133311],[2.052115,1.799013,-19.163154],[2.022546,1.800717,-19.133388],[0.52881,1.767373,-18.180732],[0.638627,1.764134,-18.18407],[0.641684,1.845159,-18.179549],[0.531868,1.848398,-18.176212],[0.756469,1.548387,14.187037],[0.613879,1.775702,18.135083],[0.504068,1.778939,18.131619],[0.646657,1.551623,14.183574],[2.85525,0.957248,6.408073],[2.025425,1.779593,19.087445],[2.339567,1.390304,13.27784],[2.649707,1.357428,13.27784],[2.657507,1.417736,13.274788],[1.775518,1.745437,19.090497],[0.666018,1.542572,-14.232385],[0.669074,1.623597,-14.227864],[3.229049,0.916935,-6.45357],[2.682676,1.437187,-13.289956],[2.712461,1.435734,-13.319719],[1.801565,1.733261,-19.138156],[1.813209,1.823328,-19.13364],[2.864014,0.953151,-6.454025],[2.875771,1.035994,-6.45058],[0.775835,1.539334,-14.235723],[0.778891,1.620359,-14.231202],[3.220285,0.921031,6.408052],[2.017624,1.719285,19.090497],[2.051468,1.767419,-19.134841],[2.043671,1.707109,-19.137866],[3.295545,0.994651,-6.450057],[1.527064,2.004159,-22.125037],[0.449631,2.073291,-22.126121],[0.585106,1.851331,-18.227679],[0.72578,1.62085,-14.179545],[-0.43584,1.398894,-10.282562],[-1.691378,0.678708,-2.671477],[0.977169,1.146334,-6.452845],[0.861256,1.39889,-10.281101],[-0.392272,1.146334,-6.454344],[4.857368,0.96765,-10.276325],[3.359099,1.216732,-10.278173],[3.613156,0.96491,-6.449665],[5.194364,0.716911,-6.447653],[-0.32704,2.073289,-22.126971],[-0.765545,1.995193,-22.127448],[-1.16817,1.27377,-10.283307],[1.734145,1.981469,-22.124843],[1.72241,1.934869,-22.174491],[1.517076,1.957377,-22.174735],[2.813651,1.755556,-22.173148],[1.929999,1.913391,-22.174243],[1.945372,1.959625,-22.124652],[2.302378,1.772022,-19.133056],[2.660239,1.288062,-10.279004],[3.00598,1.251671,-10.278592],[4.340325,1.172978,-13.317718],[2.996174,1.407446,-13.319381],[-1.615084,1.148616,-10.283731],[-1.638303,0.897066,-6.455402],[-1.190796,0.856965,-2.671432],[-1.165932,1.0217,-6.455043],[2.843258,1.767503,-22.123828],[3.351918,1.565503,-19.131744],[0.445956,2.026132,-22.175987],[-0.321243,2.026131,-22.176849],[-0.750105,1.949729,-22.177284],[-0.957473,1.838509,-22.177448],[-1.039575,1.857361,-22.177551],[-1.007441,1.883332,-22.177531],[-1.928197,4.542508,-1.464196],[-1.82762,4.579469,-1.445283],[3.708537,3.960311,2.192336],[3.752525,3.965517,2.189525],[3.752523,4.279193,1.917677],[3.708538,4.28402,1.912282],[5.402892,3.551671,2.339519],[5.402894,3.912889,2.180922],[5.358986,3.919621,2.180137],[5.358979,3.570511,2.333542],[3.708536,3.591458,2.354469],[3.730535,3.572053,2.360155],[3.752531,3.60902,2.346247],[-1.829554,4.580373,1.391742],[-1.930156,4.543424,1.410565],[3.730535,4.569532,1.495562],[3.708538,4.562682,1.514224],[3.752526,4.550142,1.530623],[5.380977,3.532491,2.347103],[5.402918,4.229896,1.904486],[5.358987,4.226798,1.911582],[5.402963,4.502789,1.510127],[5.358986,4.492135,1.527798],[5.380977,4.509876,1.49265],[3.730535,1.068311,2.42595],[3.380076,1.066907,2.425953],[3.730535,1.668843,2.521115],[3.380076,1.668656,2.521115],[5.380977,1.081094,2.417398],[5.65367,1.668843,2.481845],[5.653665,1.081093,2.393101],[5.380977,1.668843,2.507148],[3.380076,2.290158,2.53562],[3.380076,3.020552,2.518915],[5.653671,2.276363,2.493447],[5.653671,2.989877,2.477197],[5.380977,2.989877,2.502468],[5.380977,2.276363,2.518895],[3.730535,2.289129,2.53562],[3.730535,3.018055,2.518914],[5.653624,4.229896,1.886832],[5.653643,3.912889,2.160685],[5.653651,3.029046,2.471016],[5.380977,3.029047,2.496324],[3.380075,3.594815,2.354469],[3.380075,3.964345,2.192336],[5.380977,4.634001,1.165065],[5.653561,4.630737,1.162094],[5.380977,4.648174,1.12766],[5.653656,3.551671,2.317788],[5.653598,4.502789,1.496145],[3.730535,3.057225,2.512772],[3.380076,3.059722,2.512767],[3.730535,4.696327,1.16665],[3.380075,4.288649,1.912282],[3.380074,4.567823,1.514224],[3.380074,4.698697,1.175436],[3.730535,4.710714,1.129327],[-0.975182,1.786816,-22.127605],[-1.159893,1.85308,22.076791],[-1.005302,1.800896,22.076783],[-1.129773,1.839,-22.127818],[-1.063243,1.931176,22.076764],[18.788078,2.500272,8.51434],[18.729334,2.56415,8.514363],[19.051996,2.648879,8.51424],[19.063619,2.643446,-8.544886],[18.740959,2.558717,-8.54532],[18.799701,2.494838,-8.545189],[-1.033125,1.917097,-22.127738],[23.199994,9.109592,0.225111],[23.133116,9.194953,0.224719],[22.299987,9.230214,0.221563],[18.10557,5.629587,0.218995],[19.959877,5.219996,0.219631],[22.262238,9.266567,0.086238],[18.067822,5.665941,0.084964],[18.067921,5.665941,-0.099812],[22.262307,9.266567,-0.106211],[22.30008,9.230214,-0.243481],[18.105695,5.629588,-0.231505],[23.200083,9.109592,-0.239951],[19.960004,5.219996,-0.230993],[23.133212,9.194953,-0.240596],[21.943213,2.609936,8.589093],[22.239571,2.586565,8.589093],[22.239571,2.601822,8.589093],[19.06837,2.601448,8.589093],[18.789087,2.549785,8.589093],[18.808559,2.528606,8.589093],[20.879122,2.658698,8.589093],[19.51922,2.644491,8.589093],[23.211541,2.551694,2.509941],[23.211541,2.616663,2.509753],[22.518448,2.616777,6.924062],[22.518448,2.565755,6.924115],[22.268668,2.570823,8.514846],[19.702169,2.720947,6.984821],[19.459206,2.719525,7.003589],[19.429632,2.698576,8.51415],[21.258856,2.758207,2.705787],[20.985036,2.727941,6.976966],[19.513952,2.687717,8.539117],[19.711709,2.716489,-7.014783],[21.262561,2.756474,-2.734023],[20.994561,2.723487,-7.005487],[19.525609,2.682267,-8.569267],[19.530946,2.639011,-8.61921],[19.080096,2.595968,-8.619691],[19.441255,2.693143,-8.544403],[18.800813,2.544304,-8.619972],[19.468772,2.715054,-7.033823],[18.820285,2.523125,-8.619936],[23.21498,2.550087,-2.535847],[22.280291,2.565391,-8.54182],[22.527901,2.561336,-6.950806],[22.251294,2.581085,-8.616109],[21.954938,2.604456,-8.616458],[20.890847,2.653218,-8.617687],[22.251294,2.596342,-8.61612],[20.988114,2.65695,-7.004639],[21.082355,2.649515,-6.982894],[21.309684,2.698619,-6.979633],[21.350773,2.682489,-2.704797],[21.256117,2.689937,-2.733176],[19.470668,2.648281,-7.033079],[19.443152,2.626369,-8.543658],[21.25241,2.691669,2.704975],[21.347107,2.684203,2.676707],[21.300193,2.703056,6.951482],[21.072859,2.653954,6.954519],[20.978589,2.661403,6.976152],[21.574437,2.733304,2.673668],[19.431529,2.631802,8.51345],[19.461103,2.652751,7.002889],[21.578101,2.731592,-2.701533],[19.535902,2.66133,8.516302],[22.268668,2.616819,8.514845],[21.955146,2.632664,8.514663],[22.170539,2.634354,6.936308],[22.768557,2.639045,2.554459],[20.886483,2.717048,8.514222],[19.754892,2.710668,8.513152],[19.48318,2.671609,6.987971],[23.21498,2.615057,-2.535701],[22.772055,2.637409,-2.580919],[21.966767,2.627232,-8.54203],[20.898104,2.711615,-8.542845],[22.18001,2.629927,-6.963435],[19.766515,2.705236,-8.543046],[19.54753,2.655895,-8.546411],[19.492723,2.667148,-7.018148],[22.527901,2.612357,-6.950785],[22.280291,2.611386,-8.541847],[21.254774,4.066154,-0.229077],[19.267156,4.388259,-0.229077],[24.056401,10.067563,-0.234871],[24.312575,10.190331,-0.21592],[26.52991,10.189793,-0.195347],[26.449845,10.021049,-0.221142],[24.371876,10.021049,-0.240892],[23.473111,3.70666,-0.229077],[24.693185,3.70666,-0.07546],[11.475195,4.861459,-0.119945],[12.922356,4.861459,-0.119093],[5.970271,4.880881,-0.122228],[7.599592,4.861459,-0.121269],[27.172269,10.239848,-0.016162],[26.529242,10.239848,-0.140369],[26.529189,10.239848,0.15014],[27.172253,10.239848,0.021325],[9.840157,4.861459,-0.121019],[17.130634,4.861482,-0.229077],[17.250978,4.895864,-0.229077],[23.598462,10.19035,-0.21976],[23.815144,10.013569,-0.24331],[23.173836,9.980307,-0.24891],[27.172286,10.189943,-0.056805],[27.172286,10.021049,-0.067524],[23.674937,9.184401,-0.239265],[24.51397,9.143552,-0.232032],[21.76006,4.028765,-0.229077],[10.891314,4.861459,-0.120292],[24.312508,10.239848,-0.15898],[24.312459,10.239848,0.157972],[9.840054,4.911459,0.028679],[7.599489,4.911459,0.028235],[7.599456,4.861459,0.078235],[9.84002,4.861459,0.078679],[17.13051,4.861495,0.21846],[17.188914,4.911459,0.084697],[12.922253,4.911459,0.030398],[5.381075,4.911459,-0.072569],[5.970236,4.911459,-0.072228],[10.891281,4.911459,-0.070292],[11.475162,4.911459,-0.069945],[12.922322,4.911459,-0.069093],[23.584265,10.239848,0.077056],[23.141146,10.021049,0.086505],[23.173703,9.980276,0.224013],[23.598254,10.190063,0.208673],[24.312441,10.19003,0.212246],[17.250842,4.895864,0.21846],[23.584315,10.239848,-0.089875],[9.840125,4.911459,-0.071019],[10.89121,4.911459,0.029186],[5.381008,4.911459,0.026994],[5.970169,4.911459,0.027316],[11.475094,4.911459,0.029528],[17.189022,4.911459,-0.098471],[26.529441,10.189545,0.20211],[7.599558,4.911459,-0.071269],[11.47506,4.861459,0.079528],[12.92222,4.861459,0.080398],[5.970135,4.880902,0.077316],[10.891177,4.861459,0.079186],[23.141207,10.021049,-0.107552],[27.172236,10.189847,0.058801],[27.172236,10.021049,0.058801],[24.693101,3.70666,0.050865],[23.675677,9.185392,0.224858],[21.254641,4.066154,0.21846],[19.26702,4.388259,0.21846],[24.056529,10.067587,0.222499],[23.815045,10.013564,0.225958],[24.519839,9.152842,0.221819],[24.371802,10.021049,0.225908],[26.449761,10.021049,0.217595],[23.472983,3.70666,0.21846],[21.759928,4.028765,0.21846],[21.25444,4.066369,-0.140678],[21.48516,4.02898,-0.140678],[23.132474,9.195684,-0.152202],[23.39964,9.185131,-0.150871],[23.401124,9.185505,0.136458],[23.133122,9.195066,0.136319],[21.254505,4.06628,0.13006],[24.519715,9.152965,0.133419],[21.485223,4.028891,0.13006],[23.81441,10.014301,-0.154915],[24.513636,9.143769,-0.143633],[23.815051,10.013676,0.137558],[24.097249,10.021161,0.137508],[24.096579,10.021779,-0.152498],[24.768571,9.143835,0.132739],[25.043255,9.143713,0.221139],[24.762488,9.13464,-0.142017],[25.037381,9.134425,-0.230416],[25.059247,4.639043,-0.074288],[26.806224,9.088664,-0.068696],[26.806168,9.088664,0.057629],[25.059168,4.639043,0.052037],[23.912533,4.639043,0.218332],[26.010214,9.088664,0.217723],[23.912654,4.639043,-0.227906],[26.0103,9.088664,-0.222314],[2.094202,5.627749,0.006582],[2.094247,5.627728,-0.058062],[1.71214,5.617577,-0.058316],[1.712096,5.617598,0.006412],[-5.6918,1.457,-7.69956],[-5.481741,1.457,-7.69956],[-5.481741,1.51706,-7.581685],[-5.6918,1.51706,-7.581685],[-5.6918,1.610607,-7.488139],[-5.481741,1.610607,-7.488139],[-5.481741,1.728482,-7.428078],[-5.6918,1.728482,-7.428078],[-5.6918,1.859148,-7.407382],[-5.481741,1.859148,-7.407382],[-5.481741,1.989814,-7.428078],[-5.6918,1.989814,-7.428078],[-5.6918,2.107689,-7.488139],[-5.481741,2.107689,-7.488139],[-5.481741,2.201236,-7.581685],[-5.6918,2.201236,-7.581685],[-5.6918,2.261296,-7.69956],[-5.481741,2.261296,-7.69956],[-5.481741,2.281991,-7.830226],[-5.6918,2.281991,-7.830226],[-5.6918,2.261296,-7.960892],[-5.481741,2.261296,-7.960892],[-5.481741,2.201236,-8.078767],[-5.6918,2.201236,-8.078767],[-5.6918,2.107689,-8.172314],[-5.481741,2.107689,-8.172314],[-5.481741,1.989814,-8.232375],[-5.6918,1.989814,-8.232375],[-5.6918,1.859148,-8.25307],[-5.481741,1.859148,-8.25307],[-5.481741,1.728482,-8.232375],[-5.6918,1.728482,-8.232375],[-5.6918,1.610607,-8.172314],[-5.481741,1.610607,-8.172314],[-5.481741,1.51706,-8.078767],[-5.6918,1.51706,-8.078767],[-5.6918,1.457,-7.960892],[-5.481741,1.457,-7.960892],[-5.481741,1.436304,-7.830226],[-5.6918,1.436304,-7.830226],[-5.6918,1.534835,-7.935602],[-5.6918,1.518145,-7.830226],[-5.6918,1.658711,-8.106103],[-5.6918,1.583271,-8.030663],[-5.6918,1.859148,-8.171229],[-5.6918,1.753772,-8.154539],[-5.6918,2.059585,-8.106103],[-5.6918,1.964524,-8.154539],[-5.6918,2.183461,-7.935602],[-5.6918,2.135025,-8.030663],[-5.6918,2.183461,-7.72485],[-5.6918,2.200151,-7.830226],[-5.6918,2.059585,-7.554349],[-5.6918,2.135025,-7.62979],[-5.6918,1.859148,-7.489223],[-5.6918,1.964524,-7.505913],[-5.6918,1.658711,-7.554349],[-5.6918,1.753772,-7.505913],[-5.6918,1.534835,-7.72485],[-5.6918,1.583271,-7.62979],[-5.811834,1.534835,-7.72485],[-5.811834,1.583271,-7.62979],[-5.811834,1.658711,-7.554349],[-5.811834,1.753772,-7.505913],[-5.811834,1.859148,-7.489223],[-5.811834,1.964524,-7.505913],[-5.811834,2.059585,-7.554349],[-5.811834,2.135025,-7.62979],[-5.811834,2.183461,-7.72485],[-5.811834,2.200151,-7.830226],[-5.811834,2.183461,-7.935602],[-5.811834,2.135025,-8.030663],[-5.811834,2.059585,-8.106103],[-5.811834,1.964524,-8.154539],[-5.811834,1.859148,-8.171229],[-5.811834,1.753772,-8.154539],[-5.811834,1.658711,-8.106103],[-5.811834,1.583271,-8.030663],[-5.811834,1.534835,-7.935602],[-5.811834,1.518145,-7.830226],[-5.811834,1.457,-7.960892],[-5.811834,1.436304,-7.830226],[-5.811834,1.610607,-8.172314],[-5.811834,1.51706,-8.078767],[-5.811834,1.859148,-8.25307],[-5.811834,1.728482,-8.232375],[-5.811834,2.107689,-8.172314],[-5.811834,1.989814,-8.232375],[-5.811834,2.261296,-7.960892],[-5.811834,2.201236,-8.078767],[-5.811834,2.261296,-7.69956],[-5.811834,2.281991,-7.830226],[-5.811834,2.107689,-7.488139],[-5.811834,2.201236,-7.581685],[-5.811834,1.859148,-7.407382],[-5.811834,1.989814,-7.428078],[-5.811834,1.610607,-7.488139],[-5.811834,1.728482,-7.428078],[-5.811834,1.457,-7.69956],[-5.811834,1.51706,-7.581685],[-6.006887,1.436304,-7.830226],[-6.006887,1.457,-7.69956],[-6.006887,1.51706,-7.581685],[-6.006887,1.610607,-7.488139],[-6.006887,1.728482,-7.428078],[-6.006887,1.859148,-7.407382],[-6.006887,1.989814,-7.428078],[-6.006887,2.107689,-7.488139],[-6.006887,2.201236,-7.581685],[-6.006887,2.261296,-7.69956],[-6.006887,2.281991,-7.830226],[-6.006887,2.261296,-7.960892],[-6.006887,2.201236,-8.078767],[-6.006887,2.107689,-8.172314],[-6.006887,1.989814,-8.232375],[-6.006887,1.859148,-8.25307],[-6.006887,1.728482,-8.232375],[-6.006887,1.610607,-8.172314],[-6.006887,1.51706,-8.078767],[-6.006887,1.457,-7.960892],[-6.712082,1.638615,-7.901882],[-6.712082,1.627266,-7.830226],[-7.207219,1.859148,-7.830226],[-6.712082,1.671551,-7.966523],[-6.712082,1.722851,-8.017822],[-6.712082,1.787493,-8.05076],[-6.712082,1.859148,-8.062108],[-6.712082,1.930804,-8.05076],[-6.712082,1.995445,-8.017822],[-6.712082,2.046745,-7.966523],[-6.712082,2.079681,-7.901882],[-6.712082,2.09103,-7.830226],[-6.712082,2.079681,-7.758571],[-6.712082,2.046745,-7.69393],[-6.712082,1.995445,-7.64263],[-6.712082,1.930804,-7.609693],[-6.712082,1.859148,-7.598345],[-6.712082,1.787493,-7.609693],[-6.712082,1.722851,-7.64263],[-6.712082,1.671551,-7.69393],[-6.712082,1.638615,-7.758571],[-6.291967,1.477225,-7.830226],[-6.291967,1.495917,-7.712206],[-6.291967,1.550165,-7.605738],[-6.291967,1.634659,-7.521243],[-6.291967,1.741127,-7.466995],[-6.291967,1.859148,-7.448303],[-6.291967,1.977169,-7.466995],[-6.291967,2.083637,-7.521243],[-6.291967,2.16813,-7.605738],[-6.291967,2.222378,-7.712206],[-6.291967,2.241071,-7.830226],[-6.291967,2.222378,-7.948247],[-6.291967,2.16813,-8.054715],[-6.291967,2.083637,-8.139209],[-6.291967,1.977169,-8.193457],[-6.291967,1.859148,-8.21215],[-6.291967,1.741127,-8.193457],[-6.291967,1.634659,-8.139209],[-6.291967,1.550165,-8.054715],[-6.291967,1.495917,-7.948247],[-4.631236,0.959079,7.784774],[-4.587262,0.948063,7.784774],[-4.595569,0.960928,7.791612],[-4.639551,0.97178,7.791612],[-4.639551,0.97178,-7.842062],[-4.595569,0.960928,-7.842062],[-4.587262,0.948063,-7.835224],[-4.631236,0.959079,-7.835224],[-4.639551,0.97178,7.777934],[-4.595569,0.960928,7.777934],[-4.595569,0.960928,-7.828384],[-4.639551,0.97178,-7.828384],[-5.374722,1.472621,-8.441257],[-5.371228,1.523549,-8.725335],[-5.304669,1.476553,-8.763135],[-5.308419,1.421894,-8.466993],[-5.328768,2.142234,-8.763213],[-5.326994,2.16809,-8.498073],[-5.255221,2.197061,-8.52622],[-5.257125,2.16931,-8.802621],[-5.365013,1.614087,-8.91472],[-5.358024,1.715942,-8.952597],[-5.290497,1.683042,-9.000047],[-5.297999,1.573724,-8.960561],[-5.426882,1.584157,-8.716904],[-5.421142,1.667814,-8.891895],[-5.390849,2.109214,-8.757068],[-5.389108,2.134584,-8.496922],[-5.32399,2.211851,-7.98303],[-5.325493,2.189971,-8.056935],[-5.437885,2.149999,-8.027096],[-5.326263,2.178735,-8.278646],[-5.389108,2.134584,-8.277875],[-5.437885,2.114611,-8.079835],[-5.326019,2.182283,-8.130838],[-5.377052,1.438669,-8.240637],[-5.37731,1.434897,-8.105499],[-5.437885,1.504981,-8.073301],[-5.432639,1.500302,-8.237947],[-5.335865,2.038812,-6.755728],[-5.264744,2.058311,-6.709885],[-5.25393,2.134821,-6.773082],[-5.334061,2.109922,-6.810035],[-5.437885,2.114611,-7.59061],[-5.325493,2.189971,-7.613512],[-5.437885,2.149999,-7.64335],[-5.389108,2.134584,-7.39257],[-5.326263,2.178735,-7.391802],[-5.326019,2.182283,-7.539608],[-5.32399,2.211851,-7.687416],[-5.437885,2.177016,-7.700848],[-5.390849,2.109214,-6.913378],[-5.380157,2.092153,-6.830626],[-5.328768,2.142234,-6.907234],[-5.388349,2.023545,-6.76963],[-5.402282,1.942627,-6.747372],[-5.342078,1.94831,-6.717849],[-5.257125,2.16931,-6.867826],[-5.322703,2.230619,-7.76132],[-5.322539,2.233,-7.835224],[-5.437885,2.200897,-7.835224],[-5.437885,2.193684,-7.767192],[-5.271408,1.961179,-6.670398],[-5.415387,1.751657,-6.747372],[-5.358024,1.715942,-6.717849],[-5.326994,2.16809,-7.172373],[-5.255221,2.197061,-7.144224],[-5.255221,2.197061,-7.37297],[-5.255221,2.197061,-7.527055],[-5.254815,2.202974,-7.604097],[-5.335865,2.038812,-8.914719],[-5.388349,2.023545,-8.900815],[-5.380157,2.092153,-8.83982],[-5.310919,1.385455,-8.257854],[-5.311198,1.381406,-8.116977],[-5.437885,2.177016,-7.969599],[-5.437885,2.193684,-7.903254],[-5.322703,2.230619,-7.909126],[-5.254815,2.202974,-8.066349],[-5.253273,2.225446,-7.989307],[-5.334061,2.109922,-8.86041],[-5.415387,1.751657,-8.923074],[-5.402282,1.942627,-8.923074],[-5.25393,2.134821,-8.897364],[-5.25189,2.245615,-7.835224],[-5.252212,2.240893,-7.912265],[-5.342078,1.94831,-8.952597],[-5.271408,1.961179,-9.000047],[-5.430323,1.534042,-8.43736],[-5.255221,2.197061,-8.297475],[-5.255221,2.197061,-8.143392],[-5.312611,1.3608,-7.976099],[-5.379842,1.398008,-7.970362],[-5.378902,1.411721,-8.037931],[-5.31223,1.366372,-8.046539],[-5.253273,2.225446,-7.681139],[-5.389108,2.134584,-7.173524],[-5.365013,1.614087,-6.755726],[-5.297999,1.573724,-6.709884],[-5.290497,1.683042,-6.670398],[-5.252212,2.240893,-7.758181],[-5.421142,1.667814,-6.77855],[-5.264744,2.058311,-8.960561],[-4.58633,1.975675,-9.132789],[-4.578225,2.093776,-9.088974],[-4.538269,2.10207,-9.108087],[-4.541646,1.976915,-9.149016],[-4.635497,1.043309,-8.541326],[-4.630936,1.12378,-8.869917],[-4.586845,1.114836,-8.882843],[-4.591462,1.033355,-8.550128],[-4.639396,0.974505,-7.913507],[-4.526073,2.1071,-9.113641],[-4.535352,1.980838,-9.152895],[-4.531536,1.996374,-9.150336],[-4.585867,1.025792,-8.550672],[-4.578354,1.105204,-8.88644],[-4.582916,1.024746,-8.561974],[-4.528488,2.187983,-9.026281],[-4.516607,2.199382,-9.037956],[-4.594541,0.979035,-7.353559],[-4.586213,0.96655,-7.356432],[-4.569398,1.42265,-6.52143],[-4.578636,1.259689,-6.565792],[-4.569972,1.253102,-6.560344],[-4.560542,1.419485,-6.515611],[-4.566647,2.262478,-7.753481],[-4.566647,2.262478,-7.0634],[-4.521715,2.267319,-7.053775],[-4.568963,2.228736,-6.756717],[-4.524061,2.233154,-6.743241],[-4.511857,2.279306,-8.618043],[-4.521715,2.267319,-8.616671],[-4.511857,2.279306,-7.052402],[-4.535352,1.980838,-6.517551],[-4.541646,1.976915,-6.52143],[-4.533223,1.967997,-6.515611],[-4.585867,1.025792,-7.119774],[-4.591462,1.033355,-7.120319],[-4.583168,1.020287,-7.130625],[-4.583168,1.020287,-8.53982],[-4.572437,2.178122,-9.015962],[-4.578636,1.259689,-9.104654],[-4.569972,1.253102,-9.110102],[-4.524061,2.233154,-8.927205],[-4.514252,2.244422,-8.931173],[-4.622829,1.266837,-9.088977],[-4.568963,2.228736,-8.913728],[-4.613707,1.427778,-9.132789],[-4.569398,1.42265,-9.149016],[-4.638538,0.989663,-8.311],[-4.594541,0.979035,-8.316888],[-4.533223,1.967997,-9.154836],[-4.560542,1.419485,-9.154836],[-4.586213,0.96655,-8.314015],[-4.582916,1.024746,-7.108473],[-4.586845,1.114836,-6.787603],[-4.578354,1.105204,-6.784006],[-4.528488,2.187983,-6.644166],[-4.516607,2.199382,-6.632488],[-4.514252,2.244422,-6.739274],[-4.572437,2.178122,-6.654484],[-4.566647,2.262478,-8.607044],[-4.566647,2.262478,-7.916965],[-4.538269,2.10207,-6.562359],[-4.526073,2.1071,-6.556806],[-4.635497,1.043309,-7.129119],[-4.638538,0.989663,-7.359446],[-4.58633,1.975675,-6.537657],[-4.613707,1.427778,-6.537657],[-4.578225,2.093776,-6.58147],[-4.630936,1.12378,-6.800529],[-4.639396,0.974505,-7.75694],[-4.622829,1.266837,-6.581469],[-4.531536,1.996374,-6.520109],[-5.313319,1.350496,-7.905661],[-5.380621,1.38666,-7.902792],[-5.437885,1.44547,-7.707172],[-5.379842,1.398008,-7.700085],[-5.378902,1.411721,-7.632517],[-5.312611,1.3608,-7.694347],[-5.380621,1.38666,-7.767654],[-5.313319,1.350496,-7.764785],[-5.38075,1.384774,-7.835224],[-5.313377,1.349654,-7.835224],[-5.437885,1.504981,-7.597147],[-5.437885,1.46957,-7.649088],[-5.37731,1.434897,-7.564947],[-5.374722,1.472621,-7.22919],[-5.377052,1.438669,-7.429809],[-5.310919,1.385455,-7.412592],[-5.308419,1.421894,-7.203454],[-5.371228,1.523549,-6.94511],[-5.304669,1.476553,-6.907311],[-5.426882,1.584157,-6.953543],[-5.437885,1.423849,-7.835224],[-5.437885,1.428324,-7.770124],[-5.437885,1.44547,-7.963274],[-5.437885,1.428324,-7.900323],[-5.437885,1.46957,-8.021358],[-5.31223,1.366372,-7.623908],[-5.311198,1.381406,-7.553469],[-5.430323,1.534042,-7.233085],[-5.432639,1.500302,-7.432499],[-5.430606,1.529905,-8.237128],[-5.424142,1.6241,-8.20943],[-5.428732,1.557204,-8.167289],[-5.437885,1.575739,-8.143971],[-5.437885,1.637219,-8.1827],[-5.39845,1.998465,-8.210499],[-5.404052,1.916836,-8.241035],[-5.437885,1.909621,-8.212111],[-5.437885,1.985436,-8.18375],[-5.397204,2.016626,-6.803711],[-5.395007,2.048638,-6.846264],[-5.414912,1.758594,-6.769515],[-5.419507,1.691635,-6.794414],[-5.399447,1.983945,-6.790031],[-5.40281,1.934925,-6.769515],[-5.391138,2.105016,-7.174332],[-5.392855,2.07999,-6.917705],[-5.391138,2.105016,-7.391077],[-5.410881,1.817334,-7.416124],[-5.404052,1.916836,-7.429412],[-5.437885,1.909621,-7.458336],[-5.437885,1.817042,-7.445972],[-5.424142,1.6241,-7.461016],[-5.417974,1.71398,-7.427864],[-5.437885,1.637219,-7.487747],[-5.430421,1.532588,-7.527744],[-5.428732,1.557204,-7.503158],[-5.430606,1.529905,-7.433318],[-5.437885,1.720851,-7.456899],[-5.394052,2.062548,-7.49938],[-5.392079,2.0913,-7.527071],[-5.437885,2.044357,-7.522954],[-5.408861,1.846759,-6.769515],[-5.4249,1.613047,-6.958805],[-5.394052,2.062548,-8.171066],[-5.437885,2.044357,-8.147493],[-5.437885,1.720851,-8.213548],[-5.430421,1.532588,-8.142703],[-5.428304,1.563445,-8.43496],[-5.417974,1.71398,-8.242582],[-5.410881,1.817334,-8.254322],[-5.437885,1.817042,-8.224474],[-5.437885,1.575739,-7.526476],[-5.437885,1.985436,-7.486697],[-5.39845,1.998465,-7.459948],[-5.428304,1.563445,-7.235485],[-5.392079,2.0913,-8.143377],[-4.631078,0.961861,-7.907265],[-4.630201,0.977337,-8.308078],[-4.614161,1.260336,-9.094295],[-4.604848,1.424658,-9.138473],[-4.559164,2.239859,-8.917583],[-4.5568,2.27431,-8.608338],[-4.562711,2.188181,-9.020669],[-4.568621,2.102063,-9.094292],[-4.5568,2.27431,-7.910752],[-4.5568,2.27431,-7.835224],[-4.5568,2.27431,-7.759694],[-4.568621,2.102063,-6.576154],[-4.576895,1.98148,-6.531974],[-4.622439,1.114272,-6.797041],[-4.627097,1.032111,-7.128375],[-4.630201,0.977337,-7.362368],[-4.604848,1.424658,-6.531974],[-4.5568,2.27431,-7.062109],[-4.576895,1.98148,-9.138473],[-4.627097,1.032111,-8.54207],[-4.622439,1.114272,-8.873405],[-4.631078,0.961861,-7.763182],[-4.559164,2.239859,-6.752863],[-4.562711,2.188181,-6.649776],[-4.614161,1.260336,-6.576151],[-5.391138,2.105016,-8.496114],[-5.391138,2.105016,-8.279369],[-5.395007,2.048638,-8.824182],[-5.392855,2.07999,-8.75274],[-5.414912,1.758594,-8.900931],[-5.408861,1.846759,-8.900931],[-5.397204,2.016626,-8.866735],[-5.419507,1.691635,-8.876031],[-5.40281,1.934925,-8.900931],[-5.399447,1.983945,-8.880414],[-5.4249,1.613047,-8.711641],[-5.308419,1.421894,8.416543],[-5.304669,1.476553,8.712685],[-5.371228,1.523549,8.674886],[-5.374722,1.472621,8.390807],[-5.257125,2.16931,8.752171],[-5.255221,2.197061,8.47577],[-5.326994,2.16809,8.447623],[-5.328768,2.142234,8.712764],[-5.297999,1.573724,8.910111],[-5.290497,1.683042,8.949597],[-5.358024,1.715942,8.902147],[-5.365013,1.614087,8.86427],[-5.421142,1.667814,8.841445],[-5.426882,1.584157,8.666454],[-5.389108,2.134584,8.446472],[-5.390849,2.109214,8.706618],[-5.325493,2.189971,8.006485],[-5.32399,2.211851,7.93258],[-5.437885,2.177016,7.919149],[-5.326019,2.182283,8.080388],[-5.437885,2.114611,8.029385],[-5.389108,2.134584,8.227425],[-5.326263,2.178735,8.228196],[-5.437885,2.149999,7.976646],[-5.432639,1.500302,8.187497],[-5.437885,1.504981,8.022851],[-5.37731,1.434897,8.05505],[-5.377052,1.438669,8.190187],[-5.380157,2.092153,8.78937],[-5.388349,2.023545,8.850365],[-5.335865,2.038812,8.864269],[-5.380157,2.092153,6.780176],[-5.335865,2.038812,6.705278],[-5.388349,2.023545,6.71918],[-5.325493,2.189971,7.563062],[-5.326019,2.182283,7.489158],[-5.437885,2.114611,7.54016],[-5.326263,2.178735,7.341352],[-5.389108,2.134584,7.34212],[-5.437885,2.177016,7.650398],[-5.437885,2.149999,7.5929],[-5.328768,2.142234,6.856784],[-5.334061,2.109922,6.759585],[-5.390849,2.109214,6.862928],[-5.342078,1.94831,6.667399],[-5.402282,1.942627,6.696922],[-5.271408,1.961179,6.619948],[-5.290497,1.683042,6.619948],[-5.358024,1.715942,6.667399],[-5.252212,2.240893,7.707731],[-5.322703,2.230619,7.71087],[-5.322539,2.233,7.784774],[-5.25189,2.245615,7.784774],[-5.255221,2.197061,7.093774],[-5.257125,2.16931,6.817376],[-5.326994,2.16809,7.121923],[-5.297999,1.573724,6.659434],[-5.365013,1.614087,6.705276],[-5.389108,2.134584,7.123074],[-5.32399,2.211851,7.636966],[-5.253273,2.225446,7.630689],[-5.254815,2.202974,7.553647],[-5.437885,2.193684,7.716742],[-5.25393,2.134821,6.722632],[-5.264744,2.058311,6.659435],[-5.31223,1.366372,7.996089],[-5.378902,1.411721,7.987481],[-5.379842,1.398008,7.919912],[-5.312611,1.3608,7.925649],[-5.254815,2.202974,8.015899],[-5.255221,2.197061,8.092942],[-5.255221,2.197061,8.247025],[-5.430323,1.534042,8.38691],[-5.342078,1.94831,8.902147],[-5.402282,1.942627,8.872624],[-5.25393,2.134821,8.846914],[-5.334061,2.109922,8.80996],[-5.310919,1.385455,8.207404],[-5.437885,2.200897,7.784774],[-5.437885,2.193684,7.852804],[-5.322703,2.230619,7.858676],[-5.252212,2.240893,7.861815],[-5.271408,1.961179,8.949597],[-5.415387,1.751657,8.872624],[-5.253273,2.225446,7.938857],[-5.311198,1.381406,8.066527],[-5.264744,2.058311,8.910111],[-5.255221,2.197061,7.476605],[-5.255221,2.197061,7.32252],[-5.415387,1.751657,6.696922],[-5.421142,1.667814,6.7281],[-4.528488,2.187983,6.593716],[-4.538269,2.10207,6.511909],[-4.578225,2.093776,6.53102],[-4.541646,1.976915,6.47098],[-4.526073,2.1071,6.506356],[-4.591462,1.033355,7.069869],[-4.594541,0.979035,7.303109],[-4.638538,0.989663,7.308996],[-4.635497,1.043309,7.078669],[-4.569398,1.42265,6.47098],[-4.613707,1.427778,6.487207],[-4.58633,1.975675,6.487207],[-4.586845,1.114836,6.737153],[-4.630936,1.12378,6.750079],[-4.639396,0.974505,7.70649],[-4.531536,1.996374,6.469659],[-4.533223,1.967997,6.465161],[-4.535352,1.980838,6.467101],[-4.516607,2.199382,6.582038],[-4.578636,1.259689,6.515342],[-4.622829,1.266837,6.531019],[-4.572437,2.178122,6.604034],[-4.524061,2.233154,8.876755],[-4.521715,2.267319,8.566221],[-4.566647,2.262478,8.556595],[-4.568963,2.228736,8.863278],[-4.578636,1.259689,9.054204],[-4.569398,1.42265,9.098566],[-4.613707,1.427778,9.082339],[-4.622829,1.266837,9.038527],[-4.639396,0.974505,7.863057],[-4.516607,2.199382,8.987507],[-4.514252,2.244422,8.880723],[-4.528488,2.187983,8.975831],[-4.578354,1.105204,8.83599],[-4.569972,1.253102,9.059652],[-4.586845,1.114836,8.832393],[-4.572437,2.178122,8.965512],[-4.578225,2.093776,9.038524],[-4.538269,2.10207,9.057637],[-4.582916,1.024746,7.058023],[-4.583168,1.020287,7.080175],[-4.585867,1.025792,7.069324],[-4.578354,1.105204,6.733556],[-4.511857,2.279306,7.001952],[-4.514252,2.244422,6.688824],[-4.524061,2.233154,6.692791],[-4.521715,2.267319,7.003325],[-4.566647,2.262478,7.01295],[-4.566647,2.262478,7.703031],[-4.566647,2.262478,7.866515],[-4.568963,2.228736,6.706267],[-4.569972,1.253102,6.509894],[-4.533223,1.967997,9.104386],[-4.531536,1.996374,9.099886],[-4.535352,1.980838,9.102445],[-4.526073,2.1071,9.063191],[-4.582916,1.024746,8.511524],[-4.591462,1.033355,8.499678],[-4.585867,1.025792,8.500222],[-4.541646,1.976915,9.098566],[-4.511857,2.279306,8.567593],[-4.630936,1.12378,8.819467],[-4.58633,1.975675,9.082339],[-4.594541,0.979035,8.266438],[-4.635497,1.043309,8.490876],[-4.638538,0.989663,8.26055],[-4.560542,1.419485,9.104386],[-4.586213,0.96655,8.263565],[-4.586213,0.96655,7.305982],[-4.560542,1.419485,6.465161],[-4.583168,1.020287,8.48937],[-5.313319,1.350496,7.855211],[-5.380621,1.38666,7.852342],[-5.38075,1.384774,7.784774],[-5.313377,1.349654,7.784774],[-5.437885,1.46957,7.970908],[-5.437885,1.44547,7.912824],[-5.313319,1.350496,7.714335],[-5.380621,1.38666,7.717204],[-5.379842,1.398008,7.649635],[-5.312611,1.3608,7.643897],[-5.37731,1.434897,7.514497],[-5.437885,1.46957,7.598638],[-5.437885,1.504981,7.546697],[-5.308419,1.421894,7.153004],[-5.310919,1.385455,7.362142],[-5.377052,1.438669,7.379359],[-5.374722,1.472621,7.17874],[-5.304669,1.476553,6.856861],[-5.371228,1.523549,6.89466],[-5.426882,1.584157,6.903093],[-5.437885,1.428324,7.719674],[-5.437885,1.423849,7.784774],[-5.437885,1.44547,7.656722],[-5.437885,1.428324,7.849873],[-5.378902,1.411721,7.582067],[-5.31223,1.366372,7.573458],[-5.311198,1.381406,7.503019],[-5.432639,1.500302,7.382049],[-5.430323,1.534042,7.182635],[-5.430606,1.529905,8.186678],[-5.430421,1.532588,8.092253],[-5.437885,1.720851,8.163098],[-5.417974,1.71398,8.192132],[-5.410881,1.817334,8.203872],[-5.437885,1.985436,8.133301],[-5.437885,1.909621,8.161661],[-5.404052,1.916836,8.190585],[-5.39845,1.998465,8.160049],[-5.428304,1.563445,7.185035],[-5.4249,1.613047,6.908355],[-5.399447,1.983945,6.739581],[-5.397204,2.016626,6.753261],[-5.437885,1.720851,7.406449],[-5.417974,1.71398,7.377414],[-5.424142,1.6241,7.410566],[-5.437885,1.575739,7.476026],[-5.428732,1.557204,7.452708],[-5.430421,1.532588,7.477294],[-5.430606,1.529905,7.382868],[-5.437885,1.817042,7.395522],[-5.410881,1.817334,7.365674],[-5.395007,2.048638,6.795814],[-5.392855,2.07999,6.867255],[-5.414912,1.758594,6.719065],[-5.408861,1.846759,6.719065],[-5.40281,1.934925,6.719065],[-5.437885,2.044357,8.097043],[-5.394052,2.062548,8.120616],[-5.437885,1.637219,8.132251],[-5.424142,1.6241,8.15898],[-5.428732,1.557204,8.116839],[-5.437885,1.575739,8.093521],[-5.428304,1.563445,8.38451],[-5.437885,1.817042,8.174024],[-5.437885,2.044357,7.472504],[-5.437885,1.985436,7.436247],[-5.437885,1.909621,7.407886],[-5.437885,1.637219,7.437297],[-5.419507,1.691635,6.743964],[-5.391138,2.105016,7.123882],[-5.392079,2.0913,8.092927],[-5.39845,1.998465,7.409498],[-5.404052,1.916836,7.378962],[-5.394052,2.062548,7.44893],[-5.392079,2.0913,7.476621],[-5.391138,2.105016,7.340627],[-4.627097,1.032111,8.49162],[-4.630201,0.977337,8.257628],[-4.576895,1.98148,9.088023],[-4.604848,1.424658,9.088023],[-4.5568,2.27431,7.860302],[-4.5568,2.27431,8.557888],[-4.5568,2.27431,7.784774],[-4.559164,2.239859,6.702413],[-4.5568,2.27431,7.011659],[-4.614161,1.260336,6.525701],[-4.604848,1.424658,6.481524],[-4.631078,0.961861,7.712732],[-4.630201,0.977337,7.311918],[-4.622439,1.114272,6.746591],[-4.562711,2.188181,6.599326],[-4.568621,2.102063,6.525704],[-4.631078,0.961861,7.856815],[-4.568621,2.102063,9.043842],[-4.622439,1.114272,8.822955],[-4.614161,1.260336,9.043845],[-4.559164,2.239859,8.867133],[-4.562711,2.188181,8.970219],[-4.5568,2.27431,7.709244],[-4.576895,1.98148,6.481524],[-4.627097,1.032111,7.077925],[-5.392855,2.07999,8.70229],[-5.395007,2.048638,8.773732],[-5.40281,1.934925,8.850481],[-5.408861,1.846759,8.850481],[-5.414912,1.758594,8.850481],[-5.397204,2.016626,8.816285],[-5.419507,1.691635,8.825581],[-5.399447,1.983945,8.829964],[-5.391138,2.105016,8.445664],[-5.391138,2.105016,8.228919],[-5.4249,1.613047,8.661191],[4.507982,1.41378,6.943487],[4.507982,1.41378,8.626059],[4.515696,1.371797,8.598529],[4.515696,1.371797,6.971017],[4.515696,1.371797,-7.021467],[4.515696,1.371797,-8.648978],[4.507982,1.41378,-8.676509],[4.507982,1.41378,-6.993937],[4.598183,1.358011,-7.023537],[4.626426,1.393986,-6.996076],[4.716628,1.338216,-7.025607],[4.634141,1.352002,-7.023537],[4.74487,1.374191,-6.998217],[4.752587,1.332207,-8.644838],[4.835071,1.318421,-8.642767],[4.863316,1.354395,-8.670088],[4.74487,1.374191,-8.672228],[4.953517,1.298626,-7.029749],[4.871031,1.312412,-7.027678],[4.863316,1.354395,-7.000358],[4.981761,1.3346,-7.002498],[5.071962,1.278831,-7.03182],[4.989476,1.292617,-7.029749],[5.100205,1.314805,-7.004639],[5.107921,1.272822,-8.638625],[5.190405,1.259036,-8.636556],[5.21865,1.29501,-8.663666],[5.100205,1.314805,-8.665806],[5.308851,1.239241,-7.03596],[5.226365,1.253026,-7.03389],[5.21865,1.29501,-7.00678],[5.337096,1.275215,-7.008921],[5.34481,1.233232,-8.634485],[5.427296,1.219446,-8.632415],[5.455541,1.25542,-8.659385],[5.337096,1.275215,-8.661525],[5.545742,1.199651,-7.040102],[5.463254,1.213436,-7.038031],[5.455541,1.25542,-7.011061],[5.573985,1.235625,-7.013202],[5.664186,1.179856,-7.042172],[5.581702,1.193641,-7.040102],[5.692431,1.21583,-7.015343],[7.420602,0.907091,6.499247],[7.421121,0.91465,6.574417],[7.421432,0.919186,6.67967],[7.421639,0.92221,6.995413],[7.421639,0.92221,8.574133],[7.421432,0.919186,8.889876],[7.421121,0.91465,8.995129],[7.420602,0.907091,9.0703],[7.419875,0.896507,9.115407],[7.417007,0.854694,9.11213],[7.416141,0.842075,9.070301],[7.415311,0.829978,8.84477],[7.414857,0.823368,8.51608],[7.414835,0.823053,8.496766],[7.414533,0.818639,8.145623],[7.414429,0.817127,7.784774],[7.414533,0.818639,7.423923],[7.414835,0.823053,7.07278],[7.414857,0.823368,7.053467],[7.415311,0.829978,6.724776],[7.416141,0.842075,6.499245],[7.417007,0.854694,6.457417],[7.419875,0.896507,6.454139],[4.626426,1.393986,8.623919],[4.598183,1.358011,8.596459],[4.74487,1.374191,8.621778],[4.716628,1.338216,8.594388],[4.634141,1.352002,8.596459],[4.863316,1.354395,6.949908],[4.74487,1.374191,6.947767],[4.752587,1.332207,6.975157],[4.835071,1.318421,6.977228],[4.863316,1.354395,8.619638],[4.981761,1.3346,8.617497],[4.953517,1.298626,8.590247],[4.871031,1.312412,8.592317],[5.100205,1.314805,8.615356],[5.071962,1.278831,8.588176],[4.989476,1.292617,8.590247],[5.21865,1.29501,6.95633],[5.100205,1.314805,6.954189],[5.107921,1.272822,6.98137],[5.190405,1.259036,6.98344],[5.21865,1.29501,8.613216],[5.337096,1.275215,8.611075],[5.308851,1.239241,8.584035],[5.226365,1.253026,8.586106],[5.455541,1.25542,6.960611],[5.337096,1.275215,6.958471],[5.34481,1.233232,6.98551],[5.427296,1.219446,6.987581],[5.455541,1.25542,8.608935],[5.573985,1.235625,8.606794],[5.545742,1.199651,8.579895],[5.463254,1.213436,8.581965],[5.692431,1.21583,8.604653],[5.664186,1.179856,8.577823],[5.581702,1.193641,8.579895],[5.692431,1.21583,6.964893],[5.573985,1.235625,6.962752],[5.581702,1.193641,6.989652],[5.664186,1.179856,6.991722],[5.463254,1.213436,6.987581],[5.545742,1.199651,6.989652],[5.427296,1.219446,8.581965],[5.34481,1.233232,8.584035],[5.226365,1.253026,6.98344],[5.308851,1.239241,6.98551],[5.190405,1.259036,8.586106],[5.107921,1.272822,8.588176],[4.981761,1.3346,6.952048],[4.989476,1.292617,6.979299],[5.071962,1.278831,6.98137],[4.871031,1.312412,6.977228],[4.953517,1.298626,6.979299],[4.835071,1.318421,8.592317],[4.752587,1.332207,8.594388],[4.626426,1.393986,6.945626],[4.634141,1.352002,6.973087],[4.716628,1.338216,6.975157],[4.598183,1.358011,6.973087],[5.581702,1.193641,-8.630345],[5.664186,1.179856,-8.628273],[5.692431,1.21583,-8.655103],[5.573985,1.235625,-8.657244],[5.463254,1.213436,-8.632415],[5.545742,1.199651,-8.630345],[5.427296,1.219446,-7.038031],[5.34481,1.233232,-7.03596],[5.226365,1.253026,-8.636556],[5.308851,1.239241,-8.634485],[5.190405,1.259036,-7.03389],[5.107921,1.272822,-7.03182],[4.989476,1.292617,-8.640697],[5.071962,1.278831,-8.638625],[4.981761,1.3346,-8.667947],[4.871031,1.312412,-8.642767],[4.953517,1.298626,-8.640697],[4.835071,1.318421,-7.027678],[4.752587,1.332207,-7.025607],[4.634141,1.352002,-8.646909],[4.716628,1.338216,-8.644838],[4.626426,1.393986,-8.674369],[4.598183,1.358011,-8.646909],[7.419875,0.896507,-6.504589],[7.417007,0.854694,-6.507867],[7.416141,0.842075,-6.549695],[7.415311,0.829978,-6.775226],[7.414857,0.823368,-7.103917],[7.414835,0.823053,-7.12323],[7.414533,0.818639,-7.474373],[7.414429,0.817127,-7.835224],[7.414533,0.818639,-8.196073],[7.414835,0.823053,-8.547216],[7.414857,0.823368,-8.566529],[7.415311,0.829978,-8.89522],[7.416141,0.842075,-9.120751],[7.417007,0.854694,-9.16258],[7.419875,0.896507,-9.165857],[7.420602,0.907091,-9.12075],[7.421121,0.91465,-9.045579],[7.421432,0.919186,-8.940326],[7.421639,0.92221,-8.624583],[7.421639,0.92221,-7.045863],[7.421432,0.919186,-6.73012],[7.421121,0.91465,-6.624867],[7.420602,0.907091,-6.549697],[-3.243625,0.862913,-9.036077],[-3.233474,1.041991,-9.291578],[-0.13705,0.901664,-9.291578],[-0.148742,0.71342,-9.036077],[-3.896139,0.857288,-8.623956],[-3.890978,0.94833,-8.977617],[-3.249171,0.765052,-8.663753],[-3.881521,1.115186,-9.220679],[-3.837019,2.253737,-9.025892],[-3.84018,2.197807,-9.136886],[-3.837809,1.95553,-9.26929],[-3.835883,1.983593,-9.264426],[-0.155435,0.605634,-8.641828],[-3.249438,0.76037,-8.641811],[-0.155132,0.610541,-8.663708],[-3.244548,1.752776,-9.33761],[-3.234266,1.902608,-9.33761],[-3.206217,1.936471,-9.340505],[-3.241251,1.245214,-9.340505],[-3.814681,2.292537,-8.674793],[-3.795156,2.291206,-8.698353],[-3.834256,2.292166,-8.684036],[-3.797922,2.254478,-9.028039],[-3.188851,2.190008,-9.204438],[-3.184798,2.249698,-9.085366],[-3.145815,2.248907,-9.087177],[-3.149919,2.189088,-9.206414],[-0.112721,0.602958,-8.641828],[-0.116988,0.534265,-8.244024],[-0.159702,0.536942,-8.244024],[-0.082138,1.095369,-9.338963],[-0.094334,0.898987,-9.291578],[-0.124853,1.098046,-9.338963],[-0.029295,1.977844,-9.206414],[-0.035744,1.883866,-9.291575],[-0.078459,1.886289,-9.291575],[-0.072009,1.980266,-9.206414],[1.840256,1.816472,-9.082198],[1.837086,1.770283,-9.200408],[-0.025424,2.034238,-9.087177],[1.763797,0.536847,-8.659538],[1.763513,0.532257,-8.637793],[-0.112417,0.607863,-8.663708],[-0.044774,1.752279,-9.342677],[1.824407,1.585537,-9.334127],[1.792127,0.992969,-9.32871],[-0.080168,1.127099,-9.342677],[3.178906,1.570135,-9.161929],[3.174774,1.509912,-9.24367],[1.831804,1.693312,-9.284318],[3.118297,0.519815,-8.615487],[3.115007,0.466869,-8.376837],[1.759521,0.467987,-8.242172],[4.458129,0.52026,-8.614451],[4.457939,0.517232,-8.593892],[3.118535,0.523669,-8.63663],[4.497906,1.26696,-9.251902],[4.476819,0.821188,-9.247503],[3.142324,0.906689,-9.28742],[3.168986,1.425588,-9.292318],[4.506796,1.396507,-9.012841],[3.181387,1.606274,-9.046937],[3.183041,1.630365,-8.700925],[5.659517,0.574275,-8.574672],[5.653594,0.478912,-8.348099],[4.455073,0.471053,-8.363782],[5.661816,0.611289,-8.935804],[5.659621,0.57596,-8.59472],[4.462073,0.583766,-8.964143],[5.67002,0.743373,-9.212548],[4.46929,0.699965,-9.203464],[5.691427,1.201204,-8.982911],[5.689922,1.179264,-9.092],[4.505017,1.370597,-9.124725],[5.665831,0.675934,-9.169481],[5.687413,1.142703,-9.169713],[3.113188,0.437579,-8.205977],[3.113595,0.444128,-8.254917],[4.45212,0.423521,-8.267163],[3.112569,0.427584,-8.083263],[4.4505,0.397415,-7.475785],[3.113188,0.437579,-7.464468],[3.112569,0.427584,-7.587183],[4.449765,0.385618,-7.598144],[4.45212,0.423521,-7.403282],[5.691427,1.201204,-6.687535],[5.689922,1.179264,-6.578445],[5.687413,1.142703,-6.500733],[5.683899,1.09151,-6.454288],[5.67002,0.743373,-6.457897],[5.665831,0.675934,-6.500964],[5.659511,0.574169,-7.292773],[5.659493,0.573878,-7.835224],[4.502055,1.327419,-6.466074],[4.497906,1.26696,-6.418545],[4.476819,0.821188,-6.422943],[4.46929,0.699965,-6.466982],[5.659517,0.574275,-7.095774],[4.457939,0.517232,-7.076555],[4.455073,0.471053,-7.306663],[3.118297,0.519815,-7.054958],[3.115007,0.466869,-7.293608],[4.505017,1.370597,-6.545721],[4.506796,1.396507,-6.657603],[3.181387,1.606274,-6.623508],[3.178906,1.570135,-6.508517],[3.174774,1.509912,-6.426777],[3.168986,1.425588,-6.378128],[4.458129,0.52026,-7.055994],[4.462073,0.583766,-6.706302],[3.123556,0.604499,-6.674256],[3.118535,0.523669,-7.033817],[1.763797,0.536847,-7.010908],[1.763513,0.532257,-7.032653],[3.183041,1.630365,-6.96952],[1.842369,1.847264,-6.944269],[1.840256,1.816472,-6.588248],[3.142324,0.906689,-6.383026],[1.824407,1.585537,-6.336319],[1.792127,0.992969,-6.341735],[-0.080168,1.127099,-6.327769],[-0.082138,1.095369,-6.331483],[1.769776,0.633104,-6.641141],[1.780714,0.809229,-6.388235],[-0.094334,0.898987,-6.378869],[-0.106028,0.710743,-6.63437],[1.758154,0.445971,-7.835224],[1.759521,0.467987,-7.428274],[-0.116988,0.534265,-7.426422],[-0.11845,0.510734,-7.835224],[1.831804,1.693312,-6.386128],[1.837086,1.770283,-6.470037],[-0.029295,1.977844,-6.464031],[-0.035744,1.883866,-6.378872],[-0.044774,1.752279,-6.327769],[-0.078459,1.886289,-6.378872],[-0.087489,1.754701,-6.327769],[-0.13705,0.901664,-6.378869],[-0.148742,0.71342,-6.63437],[-0.159702,0.536942,-7.426422],[-0.161164,0.513412,-7.835224],[-3.184798,2.249698,-6.585079],[-3.188851,2.190008,-6.466008],[-3.149919,2.189088,-6.464031],[-3.145815,2.248907,-6.583269],[-3.834256,2.292166,-6.986411],[-3.837019,2.253737,-6.644554],[-3.797922,2.254478,-6.642406],[-3.795156,2.291206,-6.972092],[-3.814681,2.292537,-6.995652],[-3.234266,1.902608,-6.332835],[-3.244548,1.752776,-6.332835],[-3.241251,1.245214,-6.32994],[-3.206217,1.936471,-6.32994],[-3.249438,0.76037,-7.028635],[-0.155435,0.605634,-7.028617],[-0.155132,0.610541,-7.006738],[-3.249171,0.765052,-7.006693],[-3.837809,1.95553,-6.401155],[-3.835883,1.983593,-6.40602],[-3.846857,2.103113,-6.452707],[-3.828599,2.08971,-6.4449],[-3.901027,0.771047,-7.835224],[-3.899845,0.791904,-7.314903],[-3.881521,1.115186,-6.449767],[-3.870882,1.302898,-6.401155],[-3.185036,1.963983,-6.332642],[-3.177288,2.076869,-6.374002],[-3.25314,0.695026,-7.288277],[-3.254409,0.67264,-7.835224],[-3.222995,1.226891,-6.331971],[-3.233474,1.041991,-6.378869],[-0.124853,1.098046,-6.331483],[-3.243625,0.862913,-6.63437],[-3.890978,0.94833,-6.692829],[-3.896139,0.857288,-7.04649],[-3.84018,2.197807,-6.53356],[-3.896397,0.852701,-7.06844],[-3.823741,1.785665,-6.39826],[-3.143079,2.288784,-6.940971],[-3.162702,2.289396,-6.952119],[-3.182397,2.288253,-6.931177],[-3.156754,2.089404,-6.378872],[-3.195092,2.100344,-6.389362],[-3.807626,2.11242,-6.456039],[-0.112721,0.602958,-7.028617],[-0.072009,1.980266,-6.464031],[-0.025424,2.034238,-6.583269],[1.842369,1.847264,-8.726176],[3.132743,0.752396,-6.42827],[4.449211,0.376666,-7.835224],[3.111848,0.415993,-7.835224],[5.659621,0.57596,-7.075725],[5.661816,0.611289,-6.734641],[3.113595,0.444128,-7.415529],[4.4505,0.397415,-8.194661],[4.449765,0.385618,-8.0723],[5.649478,0.412639,-8.255383],[5.659511,0.574169,-8.377673],[5.683899,1.09151,-9.216157],[5.646653,0.367156,-8.062417],[5.646349,0.362258,-7.835224],[4.502055,1.327419,-9.204371],[3.123556,0.604499,-8.996189],[3.132743,0.752396,-9.242176],[1.780714,0.809229,-9.282212],[1.769776,0.633104,-9.029306],[-0.106028,0.710743,-9.036077],[-0.022844,2.071833,-8.729475],[-0.068139,2.036661,-9.087177],[-0.122883,1.129776,-9.342677],[-3.807626,2.11242,-9.214407],[-3.195092,2.100344,-9.281083],[-3.177288,2.076869,-9.296444],[-3.828599,2.08971,-9.225545],[-3.156754,2.089404,-9.291575],[-3.143079,2.288784,-8.729475],[-3.182397,2.288253,-8.739268],[-3.162702,2.289396,-8.718327],[-3.823741,1.785665,-9.272185],[-3.870882,1.302898,-9.26929],[-3.896397,0.852701,-8.602006],[-3.185036,1.963983,-9.337804],[-3.846857,2.103113,-9.217738],[-3.222995,1.226891,-9.338475],[-3.899845,0.791904,-8.355541],[-3.25314,0.695026,-8.382169],[-3.16633,1.949826,-9.342677],[-3.201461,1.259702,-9.342677],[-3.813491,1.935031,-9.272185],[-3.801875,2.197525,-9.141642],[-0.087489,1.754701,-9.342677],[5.647583,0.382145,-8.183847],[5.647583,0.382145,-7.486599],[5.646653,0.367156,-7.608028],[-0.112417,0.607863,-7.006738],[-0.022844,2.071833,-6.940971],[-0.122883,1.129776,-6.327769],[-0.065559,2.074256,-8.729475],[-0.065559,2.074256,-6.940971],[-3.801875,2.197525,-6.528805],[-3.813491,1.935031,-6.39826],[-3.201461,1.259702,-6.327769],[-3.16633,1.949826,-6.327769],[-0.068139,2.036661,-6.583269],[5.653594,0.478912,-7.322347],[5.649478,0.412639,-7.415064],[-0.148742,0.71342,8.985627],[-0.13705,0.901664,9.241128],[-3.233474,1.041991,9.241128],[-3.243625,0.862913,8.985627],[-3.249171,0.765052,8.613303],[-3.890978,0.94833,8.927167],[-3.896139,0.857288,8.573506],[-3.881521,1.115186,9.170229],[-3.84018,2.197807,9.086436],[-3.837019,2.253737,8.975442],[-3.185036,1.963983,9.287354],[-3.206217,1.936471,9.290055],[-3.16633,1.949826,9.292228],[-0.122883,1.129776,9.292228],[-3.201461,1.259702,9.292228],[-3.222995,1.226891,9.288026],[-0.124853,1.098046,9.288513],[-3.837809,1.95553,9.21884],[-3.813491,1.935031,9.221735],[-3.234266,1.902608,9.287161],[-3.828599,2.08971,9.175095],[-3.807626,2.11242,9.163957],[-3.846857,2.103113,9.167289],[-3.801875,2.197525,9.091192],[-3.797922,2.254478,8.977589],[-3.145815,2.248907,9.036727],[-3.143079,2.288784,8.679025],[-3.182397,2.288253,8.688818],[-3.184798,2.249698,9.034917],[-0.159702,0.536942,8.193574],[-0.161164,0.513412,7.784774],[-0.11845,0.510734,7.784774],[-0.116988,0.534265,8.193574],[-0.106028,0.710743,8.985627],[-0.094334,0.898987,9.241128],[-0.078459,1.886289,9.241125],[-0.087489,1.754701,9.292228],[-0.044774,1.752279,9.292228],[-0.035744,1.883866,9.241125],[-0.029295,1.977844,9.155965],[1.831804,1.693312,9.233868],[1.837086,1.770283,9.149958],[-0.112721,0.602958,8.591378],[1.759521,0.467987,8.191722],[1.763513,0.532257,8.587343],[-0.082138,1.095369,9.288513],[1.780714,0.809229,9.231762],[1.792127,0.992969,9.27826],[1.824407,1.585537,9.283677],[3.168986,1.425588,9.241868],[3.174774,1.509912,9.19322],[1.758154,0.445971,7.784774],[3.111848,0.415993,7.784774],[3.112569,0.427584,8.032813],[1.769776,0.633104,8.978856],[3.123556,0.604499,8.94574],[3.132743,0.752396,9.191726],[3.142324,0.906689,9.23697],[4.46929,0.699965,9.153014],[4.476819,0.821188,9.197053],[4.497906,1.26696,9.201452],[4.502055,1.327419,9.153921],[4.449211,0.376666,7.784774],[4.449765,0.385618,8.02185],[4.458129,0.52026,8.564001],[4.457939,0.517232,8.543443],[5.659517,0.574275,8.524222],[5.659621,0.57596,8.54427],[5.661816,0.611289,8.885354],[5.665831,0.675934,9.119031],[4.505017,1.370597,9.074275],[5.687413,1.142703,9.119263],[5.689922,1.179264,9.04155],[4.506796,1.396507,8.962392],[5.691427,1.201204,8.932462],[5.659511,0.574169,8.327224],[5.683899,1.09151,9.165707],[4.455073,0.471053,8.313332],[4.45212,0.423521,8.216714],[5.649478,0.412639,8.204933],[3.113595,0.444128,8.204468],[3.113188,0.437579,8.155527],[5.646653,0.367156,7.557578],[4.449765,0.385618,7.547694],[4.4505,0.397415,7.425335],[5.647583,0.382145,7.436149],[4.455073,0.471053,7.256213],[4.45212,0.423521,7.352832],[3.113595,0.444128,7.365079],[3.113188,0.437579,7.414018],[5.689922,1.179264,6.527995],[5.691427,1.201204,6.637085],[5.687413,1.142703,6.450283],[5.665831,0.675934,6.450514],[5.67002,0.743373,6.407447],[5.659621,0.57596,7.025275],[5.661816,0.611289,6.684191],[5.659511,0.574169,7.242323],[5.659493,0.573878,7.784774],[4.506796,1.396507,6.607153],[4.502055,1.327419,6.415624],[4.505017,1.370597,6.495271],[4.462073,0.583766,6.655852],[4.46929,0.699965,6.416532],[4.457939,0.517232,7.026105],[4.458129,0.52026,7.005544],[5.659517,0.574275,7.045324],[3.112569,0.427584,7.536733],[3.174774,1.509912,6.376327],[3.178906,1.570135,6.458067],[3.123556,0.604499,6.623806],[3.132743,0.752396,6.37782],[1.763797,0.536847,6.960458],[1.769776,0.633104,6.590691],[3.118535,0.523669,6.983367],[1.842369,1.847264,6.893819],[1.842369,1.847264,8.675727],[3.183041,1.630365,8.650475],[3.183041,1.630365,6.91907],[1.824407,1.585537,6.285869],[1.831804,1.693312,6.335678],[3.168986,1.425588,6.327678],[-0.094334,0.898987,6.328419],[-0.082138,1.095369,6.281033],[1.792127,0.992969,6.291285],[1.780714,0.809229,6.337785],[-0.116988,0.534265,7.375972],[-0.112721,0.602958,6.978167],[1.763513,0.532257,6.982203],[1.759521,0.467987,7.377824],[-0.029295,1.977844,6.413581],[-0.025424,2.034238,6.532819],[1.840256,1.816472,6.537798],[1.837086,1.770283,6.419587],[-0.078459,1.886289,6.328422],[-0.072009,1.980266,6.413581],[-0.035744,1.883866,6.328422],[-0.13705,0.901664,6.328419],[-0.124853,1.098046,6.281033],[-0.159702,0.536942,7.375972],[-0.155435,0.605634,6.978167],[-3.177288,2.076869,6.323552],[-3.828599,2.08971,6.39445],[-3.807626,2.11242,6.405589],[-3.195092,2.100344,6.338912],[-3.188851,2.190008,6.415558],[-3.149919,2.189088,6.413581],[-3.156754,2.089404,6.328422],[-3.182397,2.288253,6.880727],[-3.162702,2.289396,6.901669],[-3.143079,2.288784,6.890521],[-3.241251,1.245214,6.27949],[-3.870882,1.302898,6.350705],[-3.823741,1.785665,6.34781],[-3.244548,1.752776,6.282385],[-3.896139,0.857288,6.99604],[-3.249171,0.765052,6.956243],[-3.249438,0.76037,6.978185],[-3.896397,0.852701,7.01799],[-3.835883,1.983593,6.35557],[-3.185036,1.963983,6.282192],[-3.206217,1.936471,6.27949],[-3.837809,1.95553,6.350705],[-3.837019,2.253737,6.594104],[-3.84018,2.197807,6.48311],[-3.899845,0.791904,7.264453],[-3.254409,0.67264,7.784774],[-3.25314,0.695026,7.237827],[-3.233474,1.041991,6.328419],[-3.222995,1.226891,6.281521],[-0.148742,0.71342,6.58392],[-3.243625,0.862913,6.58392],[-3.890978,0.94833,6.642379],[-3.881521,1.115186,6.399317],[-3.834256,2.292166,6.935961],[-0.155132,0.610541,6.956288],[-3.234266,1.902608,6.282385],[-3.795156,2.291206,6.921642],[-3.814681,2.292537,6.945202],[-3.797922,2.254478,6.591956],[-0.068139,2.036661,6.532819],[-0.065559,2.074256,6.890521],[-0.022844,2.071833,6.890521],[-0.112417,0.607863,6.956288],[-0.122883,1.129776,6.277319],[-0.080168,1.127099,6.277319],[-0.044774,1.752279,6.277319],[3.142324,0.906689,6.332576],[3.181387,1.606274,6.573058],[3.118297,0.519815,7.004508],[3.115007,0.466869,7.243158],[5.653594,0.478912,7.271897],[4.476819,0.821188,6.372493],[4.497906,1.26696,6.368095],[5.683899,1.09151,6.403838],[3.115007,0.466869,8.326387],[4.462073,0.583766,8.913693],[5.653594,0.478912,8.297649],[3.181387,1.606274,8.996487],[3.118535,0.523669,8.58618],[3.118297,0.519815,8.565038],[3.178906,1.570135,9.11148],[-0.080168,1.127099,9.292228],[-0.155132,0.610541,8.613258],[-0.112417,0.607863,8.613258],[-0.065559,2.074256,8.679025],[-0.068139,2.036661,9.036727],[-0.025424,2.034238,9.036727],[-0.022844,2.071833,8.679025],[-3.156754,2.089404,9.241125],[-3.195092,2.100344,9.230634],[-3.177288,2.076869,9.245994],[-3.870882,1.302898,9.21884],[-3.823741,1.785665,9.221735],[-3.896397,0.852701,8.551556],[-3.241251,1.245214,9.290055],[-3.834256,2.292166,8.633586],[-3.25314,0.695026,8.331719],[-3.249438,0.76037,8.591361],[-3.899845,0.791904,8.305092],[-3.835883,1.983593,9.213977],[-0.155435,0.605634,8.591378],[-3.244548,1.752776,9.287161],[-3.795156,2.291206,8.647903],[-3.814681,2.292537,8.624344],[-3.149919,2.189088,9.155965],[-3.188851,2.190008,9.153989],[-0.072009,1.980266,9.155965],[1.840256,1.816472,9.031749],[1.763797,0.536847,8.609088],[5.67002,0.743373,9.162099],[-0.106028,0.710743,6.58392],[-0.087489,1.754701,6.277319],[-3.145815,2.248907,6.532819],[-3.184798,2.249698,6.534629],[-3.813491,1.935031,6.34781],[-3.16633,1.949826,6.277319],[-3.201461,1.259702,6.277319],[-3.901027,0.771047,7.784774],[-3.162702,2.289396,8.667877],[-3.846857,2.103113,6.402257],[-3.801875,2.197525,6.478355],[5.646349,0.362258,7.784774],[5.646653,0.367156,8.011967],[4.4505,0.397415,8.144212],[5.647583,0.382145,8.133397],[5.649478,0.412639,7.364614],[-3.266033,1.768837,9.294255],[-3.257782,1.889086,9.294255],[-3.798563,1.919357,9.233172],[-3.806786,1.799544,9.233172],[-3.820153,1.785462,9.211604],[-3.809903,1.934828,9.211604],[-3.79992,1.799154,9.213774],[-3.259166,1.768448,9.274858],[-3.791698,1.918968,6.355771],[-3.250914,1.888697,6.294688],[-3.257782,1.889086,6.275291],[-3.798563,1.919357,6.336374],[-3.24096,1.752573,6.292517],[-3.230678,1.902405,6.292517],[-3.820153,1.785462,-9.262054],[-3.24096,1.752573,-9.327479],[-3.798563,1.919357,-9.283622],[-3.806786,1.799544,-9.283622],[-3.79992,1.799154,-9.264224],[-3.791698,1.918968,-9.264224],[-3.257782,1.889086,-6.325741],[-3.266033,1.768837,-6.325741],[-3.259166,1.768448,-6.345138],[-3.250914,1.888697,-6.345138],[-3.809903,1.934828,-6.408392],[-3.230678,1.902405,-6.342967],[-3.798563,1.919357,-6.386824],[-3.806786,1.799544,-6.386824],[-3.820153,1.785462,-6.408392],[-3.79992,1.799154,-6.406221],[-3.257782,1.889086,-9.344705],[-3.250914,1.888697,-9.325308],[-3.230678,1.902405,-9.327479],[-3.820153,1.785462,6.357942],[-3.79992,1.799154,6.355771],[-3.806786,1.799544,6.336374],[-3.250914,1.888697,9.274858],[-3.230678,1.902405,9.277029],[-3.24096,1.752573,9.277029],[-3.791698,1.918968,9.213774],[-3.259166,1.768448,6.294688],[-3.266033,1.768837,6.275291],[-3.809903,1.934828,6.357942],[-3.809903,1.934828,-9.262054],[-3.266033,1.768837,-9.344705],[-3.259166,1.768448,-9.325308],[-3.791698,1.918968,-6.406221],[-3.24096,1.752573,-6.342967],[-5.155273,1.650316,-6.893078],[-5.157529,1.617443,-6.961841],[-5.158866,1.597958,-6.958805],[-5.153473,1.676547,-6.794414],[-5.150331,1.722347,-6.793864],[-5.152161,1.695666,-6.803787],[-5.148877,1.743505,-6.769515],[-5.150714,1.716745,-7.408697],[-5.149524,1.734099,-7.406706],[-5.148393,1.750568,-7.421994],[-5.15194,1.698891,-7.427864],[-5.14387,1.816494,-6.780552],[-5.144878,1.801797,-6.780552],[-5.145852,1.787588,-6.769515],[-5.142827,1.831671,-6.769515],[-5.143535,1.821361,-7.400295],[-5.142228,1.840395,-7.403408],[-5.140976,1.858644,-7.425255],[-5.144847,1.802245,-7.416124],[-5.141842,1.846025,-6.780582],[-5.145985,1.785651,-7.400833],[-5.147911,1.757607,-6.780549],[-5.153252,1.679774,-7.41387],[-5.158204,1.607612,-7.442713],[-5.15689,1.62677,-7.454466],[-5.161182,1.564229,-7.467665],[-5.162699,1.542115,-7.503158],[-5.155438,1.647925,-7.425617],[-5.146901,1.772304,-6.780549],[-5.147177,1.768295,-7.402824],[-5.164389,1.517499,-7.527744],[-5.164572,1.514816,-7.433318],[-5.162271,1.548356,-7.235485],[-5.140833,1.860722,-6.780582],[-5.139802,1.875753,-6.769515],[-5.128078,2.046581,8.140038],[-5.128929,2.034189,8.735791],[-5.226666,2.039733,8.735791],[-5.225816,2.052124,8.140038],[-5.131152,2.001803,8.802295],[-5.130329,2.013792,8.159227],[-5.228067,2.019336,8.159227],[-5.22889,2.007347,8.802295],[-5.134533,1.952521,8.822671],[-5.133796,1.963257,8.188656],[-5.231534,1.968801,8.188656],[-5.232272,1.958065,8.822671],[-5.137796,1.904985,8.839412],[-5.138375,1.896562,8.207464],[-5.236112,1.902105,8.207464],[-5.235535,1.910528,8.839412],[-5.143535,1.821361,8.219702],[-5.141842,1.846025,8.839413],[-5.23958,1.851568,8.839413],[-5.241273,1.826904,8.219702],[-5.14387,1.816494,8.839444],[-5.145985,1.785651,8.219164],[-5.243722,1.791195,8.219164],[-5.241606,1.822038,8.839444],[-5.150714,1.716745,8.2113],[-5.147911,1.757607,8.839448],[-5.245648,1.76315,8.839448],[-5.248452,1.722288,8.2113],[-5.150331,1.722347,8.826133],[-5.153252,1.679774,8.206127],[-5.250989,1.685316,8.206127],[-5.248067,1.72789,8.826133],[-5.161182,1.564229,7.417215],[-5.158204,1.607612,7.392263],[-5.255942,1.613155,7.392263],[-5.258919,1.569772,7.417215],[-5.152161,1.695666,6.753337],[-5.155438,1.647925,7.375167],[-5.253175,1.653468,7.375167],[-5.249899,1.701208,6.753337],[-5.149524,1.734099,7.356256],[-5.146901,1.772304,6.730099],[-5.24464,1.777848,6.730099],[-5.24726,1.739642,7.356256],[-5.144878,1.801797,6.730102],[-5.147177,1.768295,7.352374],[-5.244914,1.773839,7.352374],[-5.242615,1.807341,6.730102],[-5.142228,1.840395,7.352958],[-5.140833,1.860722,6.730132],[-5.238572,1.866266,6.730132],[-5.239966,1.845939,7.352958],[-5.138805,1.890288,6.730134],[-5.13968,1.877531,7.358968],[-5.237418,1.883073,7.358968],[-5.236542,1.895831,6.730134],[-5.135656,1.936177,6.740035],[-5.135749,1.93482,7.370252],[-5.233487,1.940364,7.370252],[-5.233392,1.941722,6.740035],[-5.132278,1.985403,6.760363],[-5.13138,1.998475,7.400893],[-5.229118,2.004019,7.400893],[-5.230014,1.990948,6.760363],[-5.224743,2.067759,-8.177534],[-5.225816,2.052124,-8.190488],[-5.128078,2.046581,-8.190488],[-5.127006,2.062215,-8.177534],[-5.230014,1.990948,-8.859632],[-5.22889,2.007347,-8.852744],[-5.131152,2.001803,-8.852744],[-5.132278,1.985403,-8.859632],[-5.233392,1.941722,-8.87996],[-5.232272,1.958065,-8.873121],[-5.134533,1.952521,-8.873121],[-5.135656,1.936177,-8.87996],[-5.236542,1.895831,-8.889862],[-5.235535,1.910528,-8.889862],[-5.137796,1.904985,-8.889862],[-5.138805,1.890288,-8.889862],[-5.239966,1.845939,-8.267038],[-5.241273,1.826904,-8.270151],[-5.143535,1.821361,-8.270151],[-5.142228,1.840395,-8.267038],[-5.242615,1.807341,-8.889894],[-5.241606,1.822038,-8.889894],[-5.14387,1.816494,-8.889894],[-5.144878,1.801797,-8.889894],[-5.24726,1.739642,-8.263741],[-5.248452,1.722288,-8.261749],[-5.150714,1.716745,-8.261749],[-5.149524,1.734099,-8.263741],[-5.249899,1.701208,-8.866658],[-5.248067,1.72789,-8.876582],[-5.150331,1.722347,-8.876582],[-5.152161,1.695666,-8.866658],[-5.258919,1.569772,-7.467665],[-5.255942,1.613155,-7.442713],[-5.249899,1.701208,-6.803787],[-5.253175,1.653468,-7.425617],[-5.24726,1.739642,-7.406706],[-5.24464,1.777848,-6.780549],[-5.242615,1.807341,-6.780552],[-5.244914,1.773839,-7.402824],[-5.239966,1.845939,-7.403408],[-5.238572,1.866266,-6.780582],[-5.236542,1.895831,-6.780584],[-5.237418,1.883073,-7.409418],[-5.13968,1.877531,-7.409418],[-5.138805,1.890288,-6.780584],[-5.233392,1.941722,-6.790485],[-5.233487,1.940364,-7.420702],[-5.135749,1.93482,-7.420702],[-5.135656,1.936177,-6.790485],[-5.230014,1.990948,-6.810813],[-5.229118,2.004019,-7.451343],[-5.13138,1.998475,-7.451343],[-5.132278,1.985403,-6.810813],[-5.225816,2.052124,-7.479958],[-5.224743,2.067759,-7.492912],[-5.127006,2.062215,-7.492912],[-5.128078,2.046581,-7.479958],[-5.22889,2.007347,-6.817701],[-5.131152,2.001803,-6.817701],[-5.232272,1.958065,-6.797326],[-5.134533,1.952521,-6.797326],[-5.235535,1.910528,-6.780584],[-5.137796,1.904985,-6.780584],[-5.241273,1.826904,-7.400295],[-5.241606,1.822038,-6.780552],[-5.248452,1.722288,-7.408697],[-5.248067,1.72789,-6.793864],[-5.253011,1.655859,-8.777368],[-5.255942,1.613155,-8.227735],[-5.158204,1.607612,-8.227735],[-5.155273,1.650316,-8.777368],[-5.253175,1.653468,-8.244828],[-5.155438,1.647925,-8.244828],[-5.24464,1.777848,-8.889898],[-5.146901,1.772304,-8.889898],[-5.244914,1.773839,-8.267623],[-5.147177,1.768295,-8.267623],[-5.238572,1.866266,-8.889863],[-5.140833,1.860722,-8.889863],[-5.237418,1.883073,-8.261029],[-5.13968,1.877531,-8.261029],[-5.233487,1.940364,-8.249745],[-5.135749,1.93482,-8.249745],[-5.229118,2.004019,-8.219102],[-5.13138,1.998475,-8.219102],[-5.128078,2.046581,7.429508],[-5.127006,2.062215,7.442462],[-5.224743,2.067759,7.442462],[-5.225816,2.052124,7.429508],[-5.131152,2.001803,6.767251],[-5.22889,2.007347,6.767251],[-5.134533,1.952521,6.746876],[-5.232272,1.958065,6.746876],[-5.137796,1.904985,6.730134],[-5.235535,1.910528,6.730134],[-5.143535,1.821361,7.349845],[-5.241273,1.826904,7.349845],[-5.14387,1.816494,6.730102],[-5.241606,1.822038,6.730102],[-5.150714,1.716745,7.358247],[-5.248452,1.722288,7.358247],[-5.150331,1.722347,6.743414],[-5.248067,1.72789,6.743414],[-5.158204,1.607612,8.177285],[-5.161182,1.564229,8.152331],[-5.258919,1.569772,8.152331],[-5.255942,1.613155,8.177285],[-5.155438,1.647925,8.194379],[-5.253175,1.653468,8.194379],[-5.146901,1.772304,8.839448],[-5.24464,1.777848,8.839448],[-5.147177,1.768295,8.217173],[-5.244914,1.773839,8.217173],[-5.140833,1.860722,8.839413],[-5.238572,1.866266,8.839413],[-5.13968,1.877531,8.21058],[-5.237418,1.883073,8.21058],[-5.135749,1.93482,8.199295],[-5.233487,1.940364,8.199295],[-5.13138,1.998475,8.168652],[-5.229118,2.004019,8.168652],[-5.127006,2.062215,8.127085],[-5.224743,2.067759,8.127085],[-5.132278,1.985403,8.809182],[-5.230014,1.990948,8.809182],[-5.135656,1.936177,8.82951],[-5.233392,1.941722,8.82951],[-5.138805,1.890288,8.839412],[-5.236542,1.895831,8.839412],[-5.142228,1.840395,8.216588],[-5.239966,1.845939,8.216588],[-5.144878,1.801797,8.839444],[-5.242615,1.807341,8.839444],[-5.149524,1.734099,8.213291],[-5.24726,1.739642,8.213291],[-5.152161,1.695666,8.816209],[-5.249899,1.701208,8.816209],[-5.155273,1.650316,6.842628],[-5.253011,1.655859,6.842628],[-5.153252,1.679774,7.36342],[-5.250989,1.685316,7.36342],[-5.147911,1.757607,6.730099],[-5.245648,1.76315,6.730099],[-5.145985,1.785651,7.350383],[-5.243722,1.791195,7.350383],[-5.141842,1.846025,6.730132],[-5.23958,1.851568,6.730132],[-5.138375,1.896562,7.362082],[-5.236112,1.902105,7.362082],[-5.133796,1.963257,7.380889],[-5.231534,1.968801,7.380889],[-5.130329,2.013792,7.410319],[-5.228067,2.019336,7.410319],[-5.226666,2.039733,-8.786241],[-5.128929,2.034189,-8.786241],[-5.228067,2.019336,-8.209677],[-5.130329,2.013792,-8.209677],[-5.231534,1.968801,-8.239105],[-5.133796,1.963257,-8.239105],[-5.236112,1.902105,-8.257914],[-5.138375,1.896562,-8.257914],[-5.23958,1.851568,-8.889863],[-5.141842,1.846025,-8.889863],[-5.243722,1.791195,-8.269613],[-5.145985,1.785651,-8.269613],[-5.245648,1.76315,-8.889898],[-5.147911,1.757607,-8.889898],[-5.250989,1.685316,-8.256577],[-5.153252,1.679774,-8.256577],[-5.253011,1.655859,-6.893078],[-5.250989,1.685316,-7.41387],[-5.245648,1.76315,-6.780549],[-5.243722,1.791195,-7.400833],[-5.23958,1.851568,-6.780582],[-5.236112,1.902105,-7.412532],[-5.138375,1.896562,-7.412532],[-5.231534,1.968801,-7.431339],[-5.133796,1.963257,-7.431339],[-5.228067,2.019336,-7.460769],[-5.130329,2.013792,-7.460769],[-5.226666,2.039733,-6.884205],[-5.128929,2.034189,-6.884205],[-5.258919,1.569772,-8.202781],[-5.161182,1.564229,-8.202781],[-5.128929,2.034189,6.833755],[-5.226666,2.039733,6.833755],[-5.155273,1.650316,8.726918],[-5.253011,1.655859,8.726918],[-5.130416,2.012519,-6.812931],[-5.13117,2.001537,-6.803711],[-5.128973,2.033549,-6.846264],[-5.129676,2.023313,-6.835098],[-5.129973,2.018979,-6.884353],[-5.132416,1.983377,-7.459948],[-5.133413,1.968856,-6.790031],[-5.126458,2.070215,-7.390083],[-5.125104,2.089927,-7.391077],[-5.126047,2.076211,-7.527071],[-5.127853,2.049866,-6.919931],[-5.126822,2.064901,-6.917705],[-5.126458,2.070215,-7.17487],[-5.125104,2.089927,-7.174332],[-5.129263,2.029318,-7.488218],[-5.136778,1.919836,-6.769515],[-5.137106,1.915044,-7.434386],[-5.224195,2.075759,-7.390083],[-5.224195,2.075759,-7.17487],[-5.22559,2.055411,-6.919931],[-5.255267,1.622987,-6.961841],[-5.126458,2.070215,-8.280364],[-5.126047,2.076211,-8.143377],[-5.125104,2.089927,-8.279369],[-5.133413,1.968856,-8.880414],[-5.132416,1.983377,-8.210499],[-5.136778,1.919836,-8.900931],[-5.137106,1.915044,-8.23606],[-5.129676,2.023313,-8.835346],[-5.128973,2.033549,-8.824182],[-5.13117,2.001537,-8.866735],[-5.130416,2.012519,-8.857514],[-5.129973,2.018979,-8.786093],[-5.129263,2.029318,-8.182229],[-5.127853,2.049866,-8.750513],[-5.126822,2.064901,-8.75274],[-5.126458,2.070215,-8.495575],[-5.125104,2.089927,-8.496114],[-5.255267,1.622987,-8.708604],[-5.157529,1.617443,-8.708604],[-5.22559,2.055411,-8.750513],[-5.224195,2.075759,-8.495575],[-5.224195,2.075759,-8.280364],[-5.148393,1.750568,-8.248453],[-5.145852,1.787588,-8.900931],[-5.153473,1.676547,-8.876031],[-5.15689,1.62677,-8.21598],[-5.158866,1.597958,-8.711641],[-5.162699,1.542115,-8.167289],[-5.15194,1.698891,-8.242582],[-5.148877,1.743505,-8.900931],[-5.162271,1.548356,-8.43496],[-5.164572,1.514816,-8.237128],[-5.164389,1.517499,-8.142703],[-5.144847,1.802245,-8.254322],[-5.140976,1.858644,-8.245191],[-5.142827,1.831671,-8.900931],[-5.139802,1.875753,-8.900931],[-5.15689,1.62677,7.404016],[-5.153473,1.676547,6.743964],[-5.15194,1.698891,7.377414],[-5.148877,1.743505,6.719065],[-5.144847,1.802245,7.365674],[-5.142827,1.831671,6.719065],[-5.140976,1.858644,7.374805],[-5.145852,1.787588,6.719065],[-5.148393,1.750568,7.371544],[-5.158866,1.597958,6.908355],[-5.157529,1.617443,6.911391],[-5.162699,1.542115,7.452708],[-5.139802,1.875753,6.719065],[-5.162271,1.548356,7.185035],[-5.164572,1.514816,7.382868],[-5.164389,1.517499,7.477294],[-5.132416,1.983377,7.409498],[-5.133413,1.968856,6.739581],[-5.129263,2.029318,7.437768],[-5.125104,2.089927,7.340627],[-5.125104,2.089927,7.123882],[-5.126458,2.070215,7.12442],[-5.126458,2.070215,7.339633],[-5.126822,2.064901,6.867255],[-5.128973,2.033549,6.795814],[-5.129676,2.023313,6.784648],[-5.127853,2.049866,6.869481],[-5.126047,2.076211,7.476621],[-5.13117,2.001537,6.753261],[-5.130416,2.012519,6.762481],[-5.129973,2.018979,6.833903],[-5.136778,1.919836,6.719065],[-5.137106,1.915044,7.383936],[-5.224195,2.075759,7.339633],[-5.22559,2.055411,6.869481],[-5.224195,2.075759,7.12442],[-5.255267,1.622987,6.911391],[-5.126047,2.076211,8.092927],[-5.129263,2.029318,8.131779],[-5.133413,1.968856,8.829964],[-5.13117,2.001537,8.816285],[-5.130416,2.012519,8.807064],[-5.136778,1.919836,8.850481],[-5.129676,2.023313,8.784897],[-5.129973,2.018979,8.735643],[-5.128973,2.033549,8.773732],[-5.137106,1.915044,8.185611],[-5.132416,1.983377,8.160049],[-5.125104,2.089927,8.228919],[-5.126458,2.070215,8.229914],[-5.126822,2.064901,8.70229],[-5.125104,2.089927,8.445664],[-5.126458,2.070215,8.445125],[-5.127853,2.049866,8.700063],[-5.157529,1.617443,8.658154],[-5.255267,1.622987,8.658154],[-5.22559,2.055411,8.700063],[-5.224195,2.075759,8.229914],[-5.224195,2.075759,8.445125],[-5.148393,1.750568,8.198004],[-5.15194,1.698891,8.192132],[-5.153473,1.676547,8.825581],[-5.148877,1.743505,8.850481],[-5.158866,1.597958,8.661191],[-5.15689,1.62677,8.16553],[-5.145852,1.787588,8.850481],[-5.162699,1.542115,8.116839],[-5.164389,1.517499,8.092253],[-5.164572,1.514816,8.186678],[-5.162271,1.548356,8.38451],[-5.139802,1.875753,8.850481],[-5.140976,1.858644,8.194741],[-5.144847,1.802245,8.203872],[-5.142827,1.831671,8.850481],[-5.481741,1.436304,7.779776],[-5.481741,1.457,7.64911],[-5.481741,1.51706,7.531235],[-5.481741,1.610607,7.437689],[-5.481741,1.728482,7.377628],[-5.481741,1.859148,7.356932],[-5.481741,1.989814,7.377628],[-5.481741,2.107689,7.437689],[-5.481741,2.201236,7.531235],[-5.481741,2.261296,7.64911],[-5.481741,2.281991,7.779776],[-5.481741,2.261296,7.910442],[-5.481741,2.201236,8.028317],[-5.481741,2.107689,8.121864],[-5.481741,1.989814,8.181926],[-5.481741,1.859148,8.20262],[-5.481741,1.728482,8.181926],[-5.481741,1.610607,8.121864],[-5.481741,1.51706,8.028317],[-5.481741,1.457,7.910442],[-5.6918,1.457,7.64911],[-5.6918,1.436304,7.779776],[-5.6918,1.610607,7.437689],[-5.6918,1.51706,7.531235],[-5.6918,1.859148,7.356932],[-5.6918,1.728482,7.377628],[-5.6918,2.107689,7.437689],[-5.6918,1.989814,7.377628],[-5.6918,2.261296,7.64911],[-5.6918,2.201236,7.531235],[-5.6918,2.261296,7.910442],[-5.6918,2.281991,7.779776],[-5.6918,2.107689,8.121864],[-5.6918,2.201236,8.028317],[-5.6918,1.859148,8.20262],[-5.6918,1.989814,8.181926],[-5.6918,1.610607,8.121864],[-5.6918,1.728482,8.181926],[-5.6918,1.457,7.910442],[-5.6918,1.51706,8.028317],[-5.6918,1.534835,7.885152],[-5.6918,1.583271,7.980213],[-5.6918,1.658711,8.055653],[-5.6918,1.753772,8.10409],[-5.6918,1.859148,8.120779],[-5.6918,1.964524,8.10409],[-5.6918,2.059585,8.055653],[-5.6918,2.135025,7.980213],[-5.6918,2.183461,7.885152],[-5.6918,2.200151,7.779776],[-5.6918,2.183461,7.6744],[-5.6918,2.135025,7.57934],[-5.6918,2.059585,7.503899],[-5.6918,1.964524,7.455463],[-5.6918,1.859148,7.438773],[-5.6918,1.753772,7.455463],[-5.6918,1.658711,7.503899],[-5.6918,1.583271,7.57934],[-5.6918,1.534835,7.6744],[-5.6918,1.518145,7.779776],[-5.811834,1.534835,7.6744],[-5.811834,1.518145,7.779776],[-5.811834,1.658711,7.503899],[-5.811834,1.583271,7.57934],[-5.811834,1.859148,7.438773],[-5.811834,1.753772,7.455463],[-5.811834,2.059585,7.503899],[-5.811834,1.964524,7.455463],[-5.811834,2.183461,7.6744],[-5.811834,2.135025,7.57934],[-5.811834,2.183461,7.885152],[-5.811834,2.200151,7.779776],[-5.811834,2.059585,8.055653],[-5.811834,2.135025,7.980213],[-5.811834,1.859148,8.120779],[-5.811834,1.964524,8.10409],[-5.811834,1.658711,8.055653],[-5.811834,1.753772,8.10409],[-5.811834,1.534835,7.885152],[-5.811834,1.583271,7.980213],[-5.811834,1.457,7.910442],[-5.811834,1.51706,8.028317],[-5.811834,1.610607,8.121864],[-5.811834,1.728482,8.181926],[-5.811834,1.859148,8.20262],[-5.811834,1.989814,8.181926],[-5.811834,2.107689,8.121864],[-5.811834,2.201236,8.028317],[-5.811834,2.261296,7.910442],[-5.811834,2.281991,7.779776],[-5.811834,2.261296,7.64911],[-5.811834,2.201236,7.531235],[-5.811834,2.107689,7.437689],[-5.811834,1.989814,7.377628],[-5.811834,1.859148,7.356932],[-5.811834,1.728482,7.377628],[-5.811834,1.610607,7.437689],[-5.811834,1.51706,7.531235],[-5.811834,1.457,7.64911],[-5.811834,1.436304,7.779776],[-6.712082,1.638615,7.708121],[-6.291967,1.495917,7.661756],[-6.291967,1.477225,7.779776],[-6.712082,1.627266,7.779776],[-6.712082,1.671551,7.64348],[-6.291967,1.550165,7.555288],[-6.712082,1.722851,7.59218],[-6.291967,1.634659,7.470793],[-6.712082,1.787493,7.559243],[-6.291967,1.741127,7.416545],[-6.712082,1.859148,7.547895],[-6.291967,1.859148,7.397853],[-6.712082,1.930804,7.559243],[-6.291967,1.977169,7.416545],[-6.712082,1.995445,7.59218],[-6.291967,2.083637,7.470793],[-6.712082,2.046745,7.64348],[-6.291967,2.16813,7.555288],[-6.712082,2.079681,7.708121],[-6.291967,2.222378,7.661756],[-6.712082,2.09103,7.779776],[-6.291967,2.241071,7.779776],[-6.712082,2.079681,7.851432],[-6.291967,2.222378,7.897797],[-6.712082,2.046745,7.916073],[-6.291967,2.16813,8.004266],[-6.712082,1.995445,7.967372],[-6.291967,2.083637,8.088759],[-6.712082,1.930804,8.00031],[-6.291967,1.977169,8.143007],[-6.712082,1.859148,8.011658],[-6.291967,1.859148,8.1617],[-6.712082,1.787493,8.00031],[-6.291967,1.741127,8.143007],[-6.712082,1.722851,7.967372],[-6.291967,1.634659,8.088759],[-6.712082,1.671551,7.916073],[-6.291967,1.550165,8.004266],[-6.712082,1.638615,7.851432],[-6.291967,1.495917,7.897797],[-6.006887,1.436304,7.779776],[-6.006887,1.457,7.910442],[-6.006887,1.51706,8.028317],[-6.006887,1.610607,8.121864],[-6.006887,1.728482,8.181926],[-6.006887,1.859148,8.20262],[-6.006887,1.989814,8.181926],[-6.006887,2.107689,8.121864],[-6.006887,2.201236,8.028317],[-6.006887,2.261296,7.910442],[-6.006887,2.281991,7.779776],[-6.006887,2.261296,7.64911],[-6.006887,2.201236,7.531235],[-6.006887,2.107689,7.437689],[-6.006887,1.989814,7.377628],[-6.006887,1.859148,7.356932],[-6.006887,1.728482,7.377628],[-6.006887,1.610607,7.437689],[-6.006887,1.51706,7.531235],[-6.006887,1.457,7.64911],[-7.207219,1.859148,7.779776],[-5.752388,0.345276,-10.712753],[-5.77054,0.212379,-10.83661],[-5.800765,0.216048,-10.838728],[-5.782317,0.350233,-10.715615],[-5.818516,1.70018,-7.949137],[-5.880109,0.661771,-9.471956],[-5.775283,1.702541,-7.950499],[-5.800765,5.286137,-7.748942],[-5.832702,5.286137,-7.937241],[-5.850852,5.112424,-7.990404],[-5.782317,5.112425,-7.69429],[-5.832702,0.238332,-4.808859],[-5.802475,0.242001,-4.806742],[-5.820925,0.376186,-4.929854],[-5.850852,0.371228,-4.932717],[-5.786931,0.046434,-10.905588],[-5.817498,0.047209,-10.906038],[-5.81631,0.076211,-10.92278],[-5.785742,0.075435,-10.922333],[-5.695036,0.697236,-6.168021],[-5.741704,1.811723,-7.646917],[-5.880109,1.036056,-5.972402],[-5.802475,5.286137,-7.941478],[-5.77054,5.286137,-7.753177],[-5.752388,5.112425,-7.700014],[-5.820925,5.112425,-7.996129],[-5.824299,5.375797,-7.904941],[-5.793902,5.375796,-7.908008],[-5.829726,1.703113,-7.95083],[-5.778942,0.139576,-10.898107],[-5.809339,0.142232,-10.89964],[-5.817498,5.428848,-7.861505],[-5.786931,5.428846,-7.862402],[-5.695036,3.879616,-7.655083],[-5.880109,3.879617,-8.046319],[-5.908204,1.026545,-5.977895],[-5.850633,1.821961,-7.641006],[-5.858545,1.815056,-7.644992],[-5.81631,5.428846,-7.828018],[-5.785742,5.428847,-7.828914],[-5.87315,1.782933,-7.663538],[-5.809339,5.375796,-7.782412],[-5.793902,0.033463,-10.836843],[-5.850852,0.093791,-10.567558],[-5.820925,0.088833,-10.564696],[-5.908204,0.671284,-9.477448],[-5.778942,5.375796,-7.785479],[-5.786931,0.102164,-4.722689],[-5.817498,0.101387,-4.723135],[-5.81631,0.072386,-4.739881],[-5.785742,0.073162,-4.739433],[-5.850633,1.713872,-7.957042],[-5.695036,1.000592,-9.667574],[-5.723132,1.010104,-9.673066],[-5.773515,1.729066,-7.694639],[-5.784724,1.726133,-7.696333],[-5.827957,1.728493,-7.69497],[-5.861535,1.750062,-7.682516],[-5.829726,1.832719,-7.634794],[-5.818516,1.835653,-7.633101],[-5.775283,1.833292,-7.634464],[-5.730089,1.778852,-7.665895],[-5.744694,1.746729,-7.68444],[-5.752608,1.739824,-7.688427],[-5.773515,2.041611,-7.785365],[-5.784724,2.041611,-7.781978],[-5.827957,2.041611,-7.784705],[-5.861535,2.041611,-7.80961],[-5.87315,2.041611,-7.847566],[-5.858545,2.041611,-7.884658],[-5.850633,2.041611,-7.892631],[-5.829726,2.041611,-7.905054],[-5.818516,2.041611,-7.908441],[-5.775283,2.041611,-7.905715],[-5.741704,2.041611,-7.880809],[-5.730089,2.041611,-7.842853],[-5.744694,2.041611,-7.805762],[-5.752608,2.041611,-7.797788],[-5.730089,1.756981,-7.98193],[-5.741704,1.72411,-7.962951],[-5.773515,1.806767,-8.010674],[-5.784724,1.8097,-8.012368],[-5.827957,1.80734,-8.011005],[-5.861535,1.785771,-7.998551],[-5.87315,1.7529,-7.979574],[-5.858545,1.720777,-7.961028],[-5.744694,1.789103,-8.000476],[-5.752608,1.796008,-8.004463],[-5.824299,0.036119,-10.838376],[-5.802475,0.049307,-10.74246],[-5.908204,3.879616,-8.035337],[-5.723132,3.879616,-7.6441],[-5.824299,0.165528,-4.747361],[-5.793902,0.168184,-4.745828],[-5.723132,0.687724,-6.173513],[-5.809339,0.059416,-4.808626],[-5.800765,0.075259,-4.903009],[-5.752388,0.119743,-5.077911],[-5.782317,0.114786,-5.080774],[-5.77054,0.078928,-4.900891],[-5.778942,0.062072,-4.807093],[-5.832702,0.052976,-10.744578],[-5.723132,1.010104,9.622617],[-5.773515,1.806767,7.960224],[-5.784724,1.8097,7.961918],[-5.793902,0.033463,10.786393],[-5.778942,0.139576,10.847657],[-5.785742,0.075435,10.871883],[-5.786931,0.046434,10.855139],[-5.723132,3.879616,7.59365],[-5.827957,2.041611,7.734255],[-5.861535,2.041611,7.75916],[-5.850633,2.041611,7.842181],[-5.829726,2.041611,7.854604],[-5.908204,3.879616,7.984887],[-5.695036,0.697236,6.117571],[-5.741704,1.811723,7.596467],[-5.730089,1.778852,7.615445],[-5.879369,0.605688,5.199841],[-5.850048,0.612533,5.19589],[-5.820925,0.376186,4.879404],[-5.850852,0.371228,4.882267],[-5.880109,3.879617,7.995869],[-5.824299,5.375797,7.854491],[-5.793902,5.375796,7.857558],[-5.786931,5.428846,7.811952],[-5.817498,5.428848,7.811055],[-5.827957,1.80734,7.960555],[-5.908204,0.671284,9.426998],[-5.880109,0.661771,9.421507],[-5.8775,0.480458,9.698587],[-5.906069,0.489048,9.703547],[-5.809339,0.059416,4.758176],[-5.824299,0.165528,4.696911],[-5.817498,0.101387,4.672685],[-5.81631,0.072386,4.689431],[-5.72387,0.27754,5.389296],[-5.752388,0.119743,5.027461],[-5.824299,0.036119,10.787926],[-5.817498,0.047209,10.855588],[-5.879369,0.251588,10.155273],[-5.850048,0.244744,10.151319],[-5.820925,0.088833,10.514246],[-5.850852,0.093791,10.517108],[-5.809339,0.142232,10.84919],[-5.81631,0.076211,10.87233],[-5.725741,0.860801,9.91818],[-5.69717,0.852211,9.91322],[-5.695036,1.000592,9.617124],[-5.752608,1.796008,7.954013],[-5.800765,0.216048,10.788278],[-5.77054,0.212379,10.78616],[-5.75319,0.586581,10.34868],[-5.782317,0.350233,10.665166],[-5.744694,1.789103,7.950026],[-5.861535,1.785771,7.948101],[-5.858545,1.720777,7.910578],[-5.850633,1.713872,7.906592],[-5.741704,1.72411,7.912501],[-5.829726,1.703113,7.90038],[-5.818516,1.70018,7.898687],[-5.802475,0.049307,10.69201],[-5.730089,1.756981,7.93148],[-5.850852,5.112424,7.939954],[-5.820925,5.112425,7.945679],[-5.802475,5.286137,7.891028],[-5.832702,5.286137,7.886791],[-5.879369,4.720168,7.984216],[-5.850048,4.720167,7.99212],[-5.809339,5.375796,7.731962],[-5.81631,5.428846,7.777568],[-5.785742,5.428847,7.778464],[-5.778942,5.375796,7.735029],[-5.725741,4.210233,7.575168],[-5.69717,4.210233,7.585088],[-5.695036,3.879616,7.604633],[-5.752608,2.041611,7.747338],[-5.773515,2.041611,7.734915],[-5.800765,5.286137,7.698492],[-5.77054,5.286137,7.702727],[-5.75319,4.720168,7.597399],[-5.782317,5.112425,7.64384],[-5.784724,2.041611,7.731528],[-5.744694,2.041611,7.755312],[-5.87315,2.041611,7.797116],[-5.858545,2.041611,7.834208],[-5.775283,2.041611,7.855265],[-5.741704,2.041611,7.830359],[-5.752388,5.112425,7.649564],[-5.818516,2.041611,7.857991],[-5.730089,2.041611,7.792403],[-5.802475,0.242001,4.756292],[-5.832702,0.238332,4.758409],[-5.793902,0.168184,4.695378],[-5.782317,0.114786,5.030324],[-5.800765,0.075259,4.852559],[-5.77054,0.078928,4.850441],[-5.773515,1.729066,7.644189],[-5.723132,0.687724,6.123063],[-5.75319,0.270695,5.393249],[-5.908204,1.026545,5.927445],[-5.906069,0.878163,5.631349],[-5.725741,0.506409,5.84598],[-5.827957,1.728493,7.64452],[-5.784724,1.726133,7.645883],[-5.744694,1.746729,7.63399],[-5.861535,1.750062,7.632066],[-5.87315,1.782933,7.613088],[-5.752608,1.739824,7.637977],[-5.775283,1.833292,7.584014],[-5.818516,1.835653,7.582651],[-5.829726,1.832719,7.584344],[-5.850633,1.821961,7.590556],[-5.858545,1.815056,7.594542],[-5.775283,1.702541,7.900049],[-5.87315,1.7529,7.929124],[-5.880109,1.036056,5.921952],[-5.778942,0.062072,4.756643],[-5.785742,0.073162,4.688983],[-5.786931,0.102164,4.672239],[-5.69717,0.515,5.841021],[-5.8775,0.886754,5.62639],[-5.72387,4.720168,7.605304],[-5.8775,4.210232,8.014352],[-5.906069,4.210233,8.004432],[-5.72387,0.579735,10.344729],[-5.752388,0.345276,10.662303],[-5.832702,0.052976,10.694128]];
var normals$1 = [[0.902567,-0.383391,-0.195918],[0.864348,-0.472172,-0.173081],[-0.454132,-0.794974,-0.402219],[-0.394987,-0.786428,-0.474885],[0.475905,0.727883,0.493661],[0.411854,0.786284,0.46058],[-0.876742,0.37865,0.296561],[-0.910354,0.360128,0.203872],[0.475903,-0.791465,0.383535],[0.864346,0.385981,-0.322374],[0.902565,0.361369,-0.234069],[0.411855,-0.792016,0.450652],[-0.454135,0.745818,-0.487357],[-0.39499,0.804475,-0.443624],[0.475901,0.063582,-0.877198],[0.864351,0.086193,0.495448],[0.902571,0.022026,0.429978],[0.411856,0.005731,-0.911231],[-0.454124,0.049156,0.889581],[-0.394985,-0.018048,0.91851],[-0.876743,0.067504,-0.476199],[-0.910349,-0.003506,-0.413827],[-0.876743,-0.446151,0.179639],[-0.910355,-0.35662,0.209942],[-0.005186,-0.358115,0.933663],[0.149689,0.283908,0.947095],[0.139834,0.049655,0.988929],[-0.285113,-0.665181,-0.690105],[0.139848,0.06967,-0.987719],[0.136762,0.178388,-0.97441],[0.009234,0.683269,0.730109],[-0.003423,0.58355,0.81207],[0.022647,0.934776,0.354514],[-0.185554,0.677727,0.711517],[-0.103291,0.577807,0.809611],[-0.133413,0.576286,0.806285],[0.123457,0.659555,0.741448],[0.110529,0.067786,0.991559],[-0.010391,0.921434,0.388396],[-0.15461,0.826622,-0.541102],[-0.212599,0.727039,-0.652852],[-0.345955,0.821097,-0.453999],[-0.270792,0.543416,-0.794588],[-0.266883,0.358317,-0.894641],[-0.255193,0.525018,-0.811931],[-0.254086,0.349376,0.901874],[-0.234459,0.436597,0.868569],[-0.295026,0.466752,0.833728],[-0.290092,0.498272,0.817051],[0.199798,0.903021,0.380309],[0.204168,0.782661,0.588011],[0.690095,0.661525,0.293521],[0.093052,0.725077,0.682352],[0.089865,0.695743,0.712647],[0.099999,0.496731,0.862124],[0.090633,0.503856,0.85902],[0.045648,0.73916,0.671981],[0.04704,0.741355,0.669462],[0.067853,0.529443,0.845628],[0.058091,0.527581,0.847516],[0.690297,0.661513,-0.293071],[0.198077,0.887409,-0.416257],[0.686196,0.705293,-0.178036],[0.099022,0.499984,-0.860355],[0.111477,0.486505,-0.866537],[0.108992,0.707481,-0.698278],[0.104611,0.737816,-0.666846],[0.063217,0.528091,-0.846831],[0.06867,0.53161,-0.844201],[0.047876,0.739911,-0.670998],[0.043808,0.737796,-0.6736],[-0.006666,0.52765,-0.849436],[0.008926,0.527571,-0.849464],[0.012414,0.701725,-0.71234],[-0.007498,0.744968,-0.667058],[-0.124835,0.971552,-0.201255],[-0.098756,0.977755,-0.185046],[-0.110082,0.942036,-0.316938],[-0.154753,0.926651,-0.342593],[-0.181028,0.917426,0.354343],[-0.139609,0.936416,0.321924],[-0.142388,0.967644,0.208303],[-0.167419,0.964211,0.205594],[-0.088866,0.027991,-0.99565],[-0.122099,0.364818,-0.923038],[-0.078671,0.269199,-0.959866],[-0.049637,0.035953,-0.99812],[-0.081682,0.421142,-0.903309],[-0.05401,0.526117,-0.848695],[-0.099124,0.69227,-0.714798],[-0.127035,0.684331,-0.718021],[-0.066828,0.021221,0.997539],[-0.055629,0.063989,0.996399],[-0.086985,-0.131578,0.987482],[-0.050472,-0.133685,0.989738],[0.103101,0.908454,0.405069],[0.11778,0.903773,0.411487],[0.117905,0.844183,0.522927],[0.094566,0.85549,0.509111],[0.098093,0.006604,0.995155],[0.101438,0.186127,0.977275],[0.095928,0.154005,0.983402],[0.095764,0.00122,0.995403],[0.093961,0.323564,0.941529],[0.10008,0.51652,0.850407],[0.093124,0.317609,0.943638],[-0.082847,0.971807,-0.220744],[-0.083758,0.5957,-0.798828],[-0.088583,0.69902,0.709594],[-0.095386,0.569527,0.816419],[-0.059446,0.499956,0.864008],[-0.002804,0.999996,-0.000317],[-0.065099,0.939629,0.335947],[-0.106563,0.979769,-0.1694],[-0.17861,-0.058473,-0.982181],[-0.057601,0.978578,-0.197656],[-0.089079,0.874301,-0.47714],[-0.155432,0.839901,-0.520008],[-0.182617,0.852127,-0.49044],[-0.261278,0.919883,-0.292488],[-0.248768,0.968561,-0.001913],[-0.217256,0.976115,-0.000433],[-0.212154,0.939551,-0.268766],[-0.362905,0.880409,-0.305253],[-0.347836,0.937546,-0.00415],[-0.158905,0.987258,-0.008391],[-0.170327,0.960678,-0.219285],[-0.048579,0.998393,0.029172],[-0.183844,0.769371,-0.611776],[-0.126912,0.857427,-0.49871],[-0.223187,0.887468,-0.403222],[-0.078128,0.996936,-0.003798],[-0.025636,0.980935,-0.192636],[-0.068956,0.977713,-0.198297],[-0.004545,0.157342,-0.987534],[-0.000866,0.007766,-0.999969],[-0.030746,0.029968,-0.999078],[-0.034454,0.13957,-0.989613],[-0.297785,0.452653,-0.840494],[-0.291517,0.60122,-0.744011],[-0.212293,0.570296,-0.793533],[-0.234786,0.418704,-0.877247],[-0.280587,0.903167,-0.324901],[-0.155655,0.966716,-0.203058],[-0.268361,0.712968,-0.647811],[-0.308518,0.694819,-0.649649],[-0.272742,0.826382,-0.492651],[-0.226845,0.83516,-0.501048],[0.00118,-0.000797,-0.999999],[0.001812,-0.099481,-0.995038],[-0.004744,-0.099324,-0.995044],[0.016024,0.344834,-0.938527],[-0.001517,0.311904,-0.950113],[0.006231,-0.000845,-0.99998],[0.005714,-0.090056,-0.99592],[0.001246,-0.090552,-0.995891],[0.001155,-0.000854,-0.999999],[0.030906,0.861446,-0.506907],[0.002451,0.742061,-0.670328],[0.011229,0.741497,-0.670863],[0.014275,0.889901,-0.455929],[0.051368,0.154013,-0.986733],[0.05231,0.000472,-0.998631],[0.007491,0.173074,-0.98488],[0.022931,0.897425,-0.440571],[0.050313,0.743142,-0.66724],[0.014042,0.865517,-0.500682],[0.090477,0.170702,-0.98116],[0.093844,0.001118,-0.995586],[0.085786,0.296076,-0.951304],[0.071787,0.145231,-0.98679],[0.09216,0.167284,-0.981592],[0.096142,0.299575,-0.949216],[0.059432,0.001218,-0.998232],[0.05891,-0.079266,-0.995111],[0.058415,-0.081059,-0.994996],[0.059317,0.001076,-0.998239],[0.064659,0.861326,-0.503922],[0.056055,0.71916,-0.69258],[0.048138,0.721944,-0.690275],[0.038357,0.860563,-0.507897],[0.056284,0.680889,-0.73022],[0.08915,0.969251,-0.229356],[0.051628,0.962229,-0.267301],[0.025917,0.684833,-0.728239],[0.095876,0.968329,-0.230538],[0.084002,0.903518,-0.420237],[0.093147,0.892995,-0.440322],[0.092901,0.309502,-0.94635],[0.095688,0.325369,-0.940733],[0.095213,0.157886,-0.982856],[0.096683,0.140691,-0.985321],[0.091711,0.286397,-0.953712],[0.095143,0.324128,-0.941217],[0.099796,0.131297,-0.986307],[0.09799,0.001699,-0.995186],[0.094997,0.00178,-0.995476],[0.094207,0.147395,-0.984581],[0.12344,0.967777,-0.219475],[0.119059,0.885462,-0.449202],[0.108829,0.880395,-0.461584],[0.107792,0.961553,-0.252579],[0.12046,0.399749,-0.908675],[0.11272,0.039517,-0.992841],[0.100557,0.357552,-0.928464],[0.202881,0.749715,-0.629894],[0.199332,0.597124,-0.776988],[0.206885,0.968596,-0.137914],[0.206651,0.94798,-0.242137],[0.138974,0.91193,-0.386095],[0.143009,0.969827,-0.197445],[0.121214,0.632887,-0.764697],[0.018961,0.882735,-0.469488],[0.696298,0.56651,-0.440722],[0.128582,0.443174,-0.887166],[0.088208,0.333043,-0.938777],[0.08083,0.349902,-0.933293],[-0.000899,0.176855,-0.984236],[0.002347,0.154072,-0.988057],[-0.001525,0.861555,-0.507663],[0.003256,0.9194,-0.39331],[0.015735,0.932516,-0.360786],[0.110153,0.024795,-0.993605],[-0.250148,0.379039,-0.89093],[0.371034,0.429764,0.823187],[0.202931,0.259491,0.944184],[0.109866,0.890434,0.441652],[-0.00145,0.339868,0.940472],[-0.006388,0.30726,0.951604],[-0.002169,0.166989,0.985956],[0.009908,0.154592,0.987929],[0.003564,0.343248,0.939238],[0.092676,0.002055,0.995694],[0.090104,0.169732,0.981363],[0.081541,0.153137,0.984835],[0.092755,0.00188,0.995687],[0.044685,0.882279,0.468601],[0.06141,0.908642,0.413035],[0.027318,0.95927,0.281166],[0.015318,0.933767,0.357553],[0.02709,0.882492,0.469546],[0.690489,0.72137,0.053388],[0.968607,0.109998,0.222936],[0.184795,0.553401,0.812156],[0.205277,0.970897,0.123368],[0.686191,0.705184,0.17849],[0.201088,0.951477,0.232925],[0.645486,0.296632,0.703816],[0.69588,0.566654,0.441196],[0.202087,0.607903,0.767864],[-0.394831,-0.097776,0.913536],[-0.109032,0.820462,0.561208],[0.113194,0.021589,0.993338],[0.139976,0.915821,0.376403],[0.109005,0.896235,0.429978],[0.139992,0.970604,0.195783],[0.122765,0.969326,0.212922],[0.075021,0.675706,0.733344],[0.058353,0.681473,0.729513],[0.106854,0.963809,0.244245],[0.111453,0.843158,0.525987],[0.09015,0.875222,0.475246],[0.095349,0.791843,0.603235],[0.097914,-0.0774,0.992181],[0.093625,0.002027,0.995605],[0.093217,0.002118,0.995644],[0.095971,-0.07657,0.992435],[0.094639,0.968474,0.230439],[0.064047,0.678323,0.731967],[0.056236,0.678918,0.732057],[0.086861,0.969976,0.22716],[0.092897,0.00216,0.995673],[0.095704,0.141919,0.985241],[0.061847,0.182027,0.981347],[0.058627,0.002094,0.998278],[0.048756,0.968251,0.245181],[0.0405,0.684113,0.728251],[0.017814,0.683518,0.729716],[0.040339,0.973587,0.224725],[0.102089,0.286748,0.952551],[0.064612,0.326903,0.942847],[0.052208,0.339559,0.939135],[0.059434,0.299584,0.952217],[0.058803,0.147127,0.987368],[0.015791,0.773214,0.633949],[0.058211,-0.079342,0.995146],[0.058631,0.002108,0.998278],[0.091712,-0.081973,0.992406],[-0.041064,0.139814,0.989326],[-0.04983,0.036115,0.998105],[-0.064126,0.146346,0.987153],[-0.035084,0.177697,0.98346],[-0.007723,0.859069,0.511801],[-0.062654,0.847302,0.527403],[-0.02738,0.788429,0.614515],[0.026477,0.777724,0.628048],[0.011708,0.714578,0.699458],[-0.005526,0.729178,0.684302],[0.018236,0.869706,0.493233],[-0.132383,0.801075,0.58374],[-0.110169,0.875312,0.470842],[-0.109159,0.668474,0.735682],[-0.295819,0.706336,0.643102],[-0.250806,0.709439,0.658629],[-0.25006,0.826798,0.503861],[-0.282957,0.819723,0.497986],[-0.109577,0.853132,0.510058],[-0.329538,0.820931,0.466344],[-0.212846,0.733087,0.645972],[-0.16867,0.78259,0.599253],[-0.258045,0.587836,0.766721],[-0.228499,0.560352,0.796112],[-0.000467,0.01792,0.999839],[-0.005994,0.130705,0.991403],[-0.045089,0.112437,0.992635],[-0.019662,0.00928,0.999764],[-0.205809,0.782929,0.587082],[-0.226417,0.86467,0.448421],[-0.155065,0.964725,0.212746],[-0.066207,0.960824,0.269137],[-0.362691,0.884121,0.294595],[-0.415925,0.743037,0.524311],[-0.259936,0.929944,0.260071],[-0.224962,0.929867,0.291099],[-0.199447,0.844153,0.497621],[-0.221248,0.451063,0.864634],[-0.233242,0.00285,0.972415],[-0.176334,0.016599,0.98419],[-0.181878,0.411088,0.893268],[-0.107888,0.058094,0.992464],[-0.179378,0.6987,0.692562],[-0.120627,0.273243,0.954352],[-0.143999,0.875057,0.462103],[-0.102476,0.943832,0.314134],[-0.248416,0.90119,0.355171],[-0.074648,0.183737,0.980137],[-0.023061,0.212429,0.976904],[-0.076852,0.203406,0.976074],[-0.000328,-0.090318,0.995913],[-0.031415,-0.128093,0.991265],[-0.022852,0.975312,0.219646],[-0.079461,0.972848,0.217376],[-0.380258,0.669839,0.637746],[0.000554,-0.098988,0.995088],[-0.002034,0.004928,0.999986],[0.011736,0.330994,0.94356],[-0.014017,0.526918,0.849801],[-0.002392,0.52904,0.848593],[0.003692,0.351118,0.936324],[0.031286,0.884957,0.464621],[0.076166,0.851914,0.518112],[0.075999,0.910425,0.406634],[0.048462,0.905808,0.420908],[0.088945,0.279974,0.955878],[0.092777,-0.076658,0.992732],[0.092933,0.142139,0.985475],[0.09455,0.158032,0.982897],[0.083643,0.897639,0.432721],[0.104043,-0.090929,0.990407],[0.130797,0.797191,0.589389],[0.116862,0.753203,0.647324],[0.128825,0.617704,0.775787],[0.117306,0.3884,0.913994],[0.183362,-0.125758,0.974968],[0.553789,-0.217088,0.803859],[0.687515,0.718706,0.10385],[0.090576,-0.084555,0.992293],[0.014353,0.533009,0.845988],[0.006616,0.533557,0.845738],[0.034303,0.914656,-0.402775],[0.027667,0.932909,-0.359048],[0.017331,0.740817,-0.671484],[0.146518,0.656918,-0.739589],[0.11034,0.789154,-0.604203],[0.592729,0.257476,-0.763137],[-0.034771,0.706893,-0.706465],[0.138012,0.832488,-0.536578],[0.06819,0.677998,-0.731894],[0.063479,0.678054,-0.732266],[0.0627,0.678184,-0.732212],[0.09408,0.00154,-0.995563],[0.093954,0.00136,-0.995576],[0.056236,0.160861,-0.985374],[0.074916,0.266807,-0.960834],[0.099929,0.896612,-0.431394],[0.032843,0.906352,-0.421245],[0.033859,0.974755,-0.220694],[0.069201,0.341907,-0.937182],[0.028437,0.314002,-0.948996],[0.021051,0.981001,-0.192857],[0.009285,0.960408,-0.278442],[0.010509,0.933878,-0.357437],[0.026794,0.934017,-0.356223],[0.020671,0.309635,-0.950631],[0.027793,0.97608,-0.215626],[0.017028,0.976087,-0.21671],[-0.064423,0.114299,-0.991355],[-0.074064,0.194704,-0.978062],[-0.076971,0.197627,-0.977251],[-0.023541,0.845375,-0.533655],[0.002633,0.784727,-0.619836],[-0.078206,0.789291,-0.609018],[-0.439689,0.620183,-0.649651],[-0.354967,0.786447,-0.50547],[-0.181165,0.667649,-0.722097],[0.013692,0.246288,-0.9691],[-0.038512,0.211211,-0.976681],[-0.101534,0.543068,-0.833528],[-0.12334,0.511423,-0.850431],[-0.031431,0.188046,-0.981657],[-0.195197,0.90409,-0.380156],[-0.059077,0.997247,-0.044809],[-0.080182,0.357447,0.930485],[-0.078901,-0.116954,-0.989998],[-0.159518,0.963185,-0.216399],[0.093257,0.143149,0.985298],[0.101431,-0.084939,0.99121],[0.113607,0.739386,0.663628],[-0.046579,-0.045007,0.9979],[-0.065793,0.201101,0.977359],[-0.062931,-0.107931,-0.992165],[-0.06678,0.017542,-0.997613],[-0.107042,0.974084,0.199253],[0.002313,0.533514,-0.845788],[0.007564,0.532797,-0.84621],[0.127182,0.632817,-0.763785],[0.120519,0.704895,0.698998],[0.091993,0.502278,0.859799],[0.110176,0.54547,0.830857],[0.110641,0.566124,0.816861],[-0.19539,0.620625,-0.759373],[-0.343786,0.861975,-0.372572],[0.018253,0.975813,-0.217843],[-0.32361,0.742401,0.586615],[-0.218709,0.673456,0.706132],[0.006744,0.976832,0.213903],[-0.226383,0.808815,-0.542742],[-0.248806,0.385919,0.888348],[0.093894,0.714806,0.692991],[0.105688,0.532549,-0.839774],[0.115971,0.768652,-0.629067],[0.066674,0.534233,-0.842704],[0.010466,0.741475,0.670899],[0.023881,0.741031,0.671046],[-0.175001,0.984568,-0.00078],[-0.086505,0.996251,-0.000968],[-0.049536,0.167689,-0.984595],[-0.046592,0.142529,-0.988693],[-0.064769,0.303327,0.950683],[0.103361,0.348722,0.931509],[0.097835,0.346769,0.932834],[0.100193,-0.079614,0.991778],[0.09434,0.001588,0.995539],[-0.074486,0.978812,0.19073],[-0.185137,0.380433,-0.906088],[-0.223226,0.425856,-0.876822],[-0.226278,0.704259,-0.672917],[-0.290726,0.001905,-0.956805],[-0.279643,0.450681,-0.847754],[-0.232356,0.005243,-0.972617],[-0.354442,0.003222,-0.935072],[-0.335686,0.44836,-0.828425],[-0.466105,0.012415,-0.884642],[-0.4461,0.40908,-0.79602],[-0.227853,0.912705,-0.339193],[-0.02458,-0.134733,-0.990577],[-0.033515,-0.100095,-0.994413],[-0.040722,0.083351,-0.995688],[-0.078889,0.725825,-0.683341],[-0.375644,0.901696,-0.214095],[-0.242475,0.960468,-0.136777],[0.026716,0.861976,-0.506245],[0.01828,0.780478,-0.624917],[0.012314,0.341064,-0.939959],[0.00456,0.342811,-0.939393],[0.05122,-0.086797,-0.994908],[0.092681,-0.084876,-0.992072],[0.093863,0.001008,-0.995585],[0.040217,0.508644,-0.860037],[0.07377,0.323832,-0.943234],[0.044662,0.30475,-0.951385],[0.079519,0.509948,-0.856522],[0.09347,-0.077718,-0.992584],[0.099938,-0.078221,-0.991914],[0.095853,-0.077006,-0.992412],[0.089767,0.849067,-0.520603],[0.103992,-0.084244,-0.991004],[0.059715,0.427741,-0.901927],[0.193771,0.779112,-0.596186],[0.186682,0.243483,-0.95177],[0.787836,0.610949,-0.077818],[0.815295,0.364577,-0.449864],[0.687455,0.723085,-0.067479],[0.028699,0.981771,-0.187891],[0.051845,0.9105,-0.410247],[0.047094,0.87305,-0.485352],[-0.0044,0.298283,-0.954467],[-0.001104,0.348644,-0.937255],[0.016251,0.921934,-0.387006],[0.265462,0.006888,0.964097],[0.000029,-0.000241,1],[0.093818,0.299277,0.949543],[0.086197,0.343006,0.93537],[0.081287,0.338888,0.937309],[0.79771,-0.000583,0.60304],[0.096129,0.312777,0.944949],[0.080195,0.323455,0.942839],[0.091571,0.894147,0.43831],[0.057925,-0.077987,0.99527],[0.05742,0.507558,0.859702],[0.051513,0.510044,0.858604],[0.008113,0.280166,0.959917],[-0.217215,0.686082,0.694341],[-0.07758,0.716674,0.69308],[-0.448446,0.393039,0.802756],[-0.334844,0.445227,0.830453],[-0.273882,0.462136,0.843456],[-0.292731,-0.000917,0.956194],[-0.355522,-0.003819,0.93466],[-0.467148,-0.012985,0.884084],[-0.033899,-0.100617,0.994348],[-0.164752,0.963098,0.212837],[-0.272859,0.903027,0.331798],[0.039024,0.721346,0.691475],[0.075084,0.722515,0.687266],[0.099309,0.664986,0.740224],[0.581609,-0.177169,0.793941],[0.000088,-0.089949,0.995946],[0.000808,0.87547,0.483271],[0.01337,0.870405,0.492155],[0.021805,0.532283,-0.846286],[0.092613,-0.083766,-0.992172],[0.023751,0.681624,-0.731317],[0.008941,0.77345,-0.633794],[0.014201,0.683048,-0.730236],[0.028009,0.939732,-0.340762],[0.041145,0.997687,-0.054114],[-0.415067,0.906832,-0.073321],[-0.317279,0.948237,-0.013424],[-0.32466,0.727369,-0.604591],[-0.194907,0.687125,-0.699907],[0.005156,0.977353,-0.211551],[0.029437,0.909554,-0.414541],[0.151924,0.732921,-0.663133],[-0.0423,-0.073001,-0.996434],[0.069309,0.997386,-0.020447],[0.028938,0.981111,-0.191267],[-0.346027,0.858592,0.378267],[0.992223,-0.124124,0.009265],[0.488649,-0.872297,0.017897],[0.666558,-0.744553,-0.03662],[0.688433,-0.701311,-0.184992],[0.707431,-0.468906,-0.528837],[0.63614,-0.201378,-0.744831],[0.798354,-0.000982,-0.602187],[0.706929,-0.468404,0.529952],[0.617511,-0.743209,0.257527],[0.015169,0.932674,0.360401],[0.018583,0.980541,0.195431],[0.005334,0.914084,0.405489],[0.025054,0.999358,-0.025598],[0.018731,0.999737,0.013206],[-0.419589,0.904613,0.074972],[-0.359141,0.907551,0.217642],[-0.264124,0.958939,0.103314],[-0.299166,0.9542,-0.001303],[-0.297502,0.954651,-0.011602],[0.01021,0.999878,-0.011807],[0.273976,0.903308,0.330109],[0.007356,0.963207,0.26866],[0.029514,0.980874,0.192394],[0.030566,0.997427,0.064846],[0.027693,0.976066,0.215704],[-0.411497,0.911276,-0.01568],[0.046232,0.998728,0.020124],[0.027142,0.996689,0.076644],[0.016902,0.983729,0.178862],[0.034747,0.910583,0.411864],[0.266563,-0.007904,-0.963785],[0.559415,0.216095,-0.800223],[0.110289,0.890164,-0.44209],[0.203022,-0.158569,-0.966249],[0.386444,-0.221572,-0.895303],[-0.004498,0.489264,-0.872124],[-0.117999,-0.963178,-0.241588],[-0.088337,-0.956563,-0.277819],[-0.07893,-0.995854,-0.04522],[-0.109954,-0.992884,0.045739],[-0.031214,-0.957572,0.286498],[-0.081305,-0.87556,0.476218],[-0.094506,-0.863494,0.495425],[-0.077952,-0.932829,0.351785],[-0.074601,-0.976859,0.200453],[-0.125182,-0.932999,0.337405],[-0.133677,-0.872311,-0.470323],[-0.135935,-0.852285,-0.505106],[-0.058544,-0.946274,-0.318022],[-0.145511,-0.848719,0.508432],[-0.077037,-0.856846,-0.509784],[-0.02682,-0.959638,-0.279955],[-0.065268,-0.971464,0.228031],[-0.003226,-0.970121,0.242601],[-0.04424,-0.972744,0.227624],[0.098051,-0.216828,0.971273],[0.28315,-0.491689,0.823449],[0.102948,-0.818042,0.56587],[0.087329,-0.227231,0.969917],[-0.071625,-0.969665,-0.233709],[-0.002657,-0.972464,-0.233039],[-0.07309,-0.964609,-0.253354],[-0.015076,-0.97439,0.224361],[-0.048151,-0.710851,0.701692],[-0.025895,-0.982278,-0.185632],[-0.027665,-0.983113,-0.180898],[-0.136275,-0.945993,-0.294154],[-0.14758,-0.785829,-0.600577],[-0.155752,-0.715882,0.680628],[-0.170196,-0.69532,0.698257],[0.11634,-0.174037,0.977843],[0.114261,-0.205778,0.971905],[-0.01599,-0.975151,-0.220964],[-0.092841,-0.625608,0.774594],[-0.197493,-0.522169,-0.82966],[-0.112728,-0.326095,-0.938592],[-0.123846,-0.664932,-0.736564],[-0.169863,-0.740189,-0.650589],[-0.177268,-0.984163,-0.00026],[-0.183687,-0.938305,-0.292988],[-0.12918,-0.991621,0.000352],[-0.229627,-0.929546,-0.288472],[-0.249108,-0.773282,-0.583078],[-0.203547,-0.802168,-0.561334],[-0.259572,-0.921626,-0.288493],[-0.292137,-0.759728,-0.58092],[-0.362795,-0.884093,-0.294549],[-0.402914,-0.704898,-0.583762],[0.000171,-1,-0.000158],[-0.005498,-0.999985,-0.000138],[-0.051784,-0.973441,-0.223007],[-0.016658,-0.987366,-0.157577],[0.004859,0.189041,-0.981957],[-0.059982,0.248801,-0.966695],[0.046957,-0.222498,-0.973802],[0.006024,-0.246923,-0.969016],[0.112706,-0.732087,-0.671823],[0.163966,-0.97688,-0.137192],[0.5767,-0.805555,-0.13601],[0.097911,-0.228163,-0.968687],[0.055821,-0.222069,-0.973432],[0.089257,-0.21172,-0.973246],[0.085851,-0.712636,-0.696261],[0.057828,-0.976955,-0.205461],[0.028113,-0.978694,-0.203389],[0.052183,-0.7167,-0.695426],[0.103918,-0.973271,-0.204802],[0.104732,-0.9945,0.000854],[0.055781,-0.998443,-0.000051],[0.153002,-0.96813,-0.19828],[0.155624,-0.987813,0.002639],[0.166677,-0.725815,-0.667392],[0.169833,-0.968745,-0.180804],[0.151752,-0.710112,-0.687541],[0.173848,-0.984755,0.00591],[0.131974,-0.291614,-0.947388],[0.171365,-0.776703,-0.606108],[0.118493,-0.234971,-0.964753],[0.215934,-0.449219,-0.866934],[0.218789,-0.86238,-0.456544],[0.188652,-0.981958,0.013001],[0.184177,-0.979152,-0.085673],[0.041588,0.226795,-0.973054],[0.002636,-0.219992,-0.975498],[0.077217,0.227897,-0.970619],[-0.759576,-0.464417,-0.455369],[-0.167027,-0.767087,-0.619419],[-0.185559,-0.974201,-0.128454],[-0.123909,-0.985467,0.116195],[-0.168546,-0.975232,0.143226],[0.190248,0.152468,0.969824],[0.065093,-0.237563,0.969189],[0.000515,-0.276339,0.96106],[0.079301,0.218168,0.972684],[0.210579,-0.419463,0.88301],[0.130934,-0.311192,0.941284],[0.108609,-0.234619,0.966001],[0.166373,-0.722074,0.671513],[0.113155,-0.286687,0.951318],[0.124478,-0.263649,0.956553],[0.150497,-0.652392,0.742789],[0.153317,-0.96753,0.200949],[0.123561,-0.70787,0.695451],[0.105271,-0.972894,0.205901],[0.088689,-0.711947,0.69661],[0.058208,-0.976863,0.20579],[0.045925,-0.716287,0.696293],[0.026944,-0.978693,0.203551],[0.056329,-0.220223,0.973822],[0.412767,-0.899477,0.143404],[0.016296,-0.983079,0.182456],[0.010561,-0.999944,0.0003],[0.014713,-0.994807,0.100708],[0.014558,-0.999894,0.000842],[0.014903,-0.999889,0.000746],[0.012124,-0.994749,0.101624],[0.012298,-0.994594,0.10311],[0.007673,-0.99997,0.000569],[0.000039,-1,0.000304],[0.002754,-0.992629,0.121163],[-0.016464,-0.985363,0.169673],[-0.032832,-0.311006,0.949841],[-0.035447,-0.317188,0.9477],[-0.131608,-0.445573,0.885519],[-0.446575,-0.409755,0.795406],[-0.402894,-0.706917,0.58133],[-0.295864,-0.758455,0.580699],[-0.336548,-0.448939,0.827762],[-0.253679,-0.772605,0.582004],[-0.280496,-0.461074,0.841862],[-0.198923,-0.781314,0.59159],[-0.216593,-0.496017,0.840865],[-0.137523,-0.804811,0.577379],[-0.189706,-0.384292,0.90351],[-0.182365,-0.938624,0.292792],[-0.137424,-0.945707,0.294538],[-0.232384,-0.928909,0.288314],[-0.262014,-0.91996,0.291586],[-0.363602,-0.880476,0.304228],[-0.087333,-0.966054,0.243132],[0.006089,-0.994646,0.103158],[0.011237,-0.999936,-0.001052],[0.014946,-0.999888,-0.000873],[0.018765,-0.979606,0.200048],[0.047294,-0.719965,0.692397],[0.025615,-0.999672,-0.000238],[0.092582,-0.21324,0.972603],[0.056547,-0.216605,0.97462],[0.101844,-0.212612,0.971815],[0.170441,-0.967586,0.186352],[0.16313,-0.701751,0.693494],[0.220352,-0.821804,0.525436],[0.184489,-0.977918,0.098184],[0.026948,0.087245,0.995822],[0.077402,0.324587,0.942684],[0.003844,-0.254553,0.967051],[-0.221954,-0.777817,0.587994],[-0.699839,-0.49269,0.517186],[-0.116846,-0.985087,-0.126293],[0.212096,0.061401,-0.975318],[0.089057,0.229683,-0.969182],[0.11158,-0.216905,-0.969795],[0.114797,-0.709714,-0.695074],[0.057661,-0.217951,-0.974255],[0.038779,-0.720128,-0.692757],[0.329775,-0.545211,-0.77071],[0.011902,-0.994831,-0.100841],[0.003191,-0.242139,-0.970236],[0.000098,-0.993557,-0.113336],[0.00794,-0.995262,-0.096902],[0.000135,-0.990998,-0.133879],[-0.037148,-0.333467,-0.94203],[-0.340149,0.101743,-0.934851],[-0.485144,-0.04642,-0.873201],[-0.058269,-0.780953,-0.621866],[-0.039141,-0.341964,-0.938897],[-0.347843,-0.937546,0.003704],[-0.248771,-0.968561,0.001584],[-0.223995,-0.97459,-0.000162],[0.102374,-0.190798,0.976276],[-0.03653,-0.999332,-0.000333],[-0.025109,-0.984541,0.173343],[-0.016154,-0.999869,-0.000329],[-0.195335,0.188253,-0.962499],[-0.121145,0.08775,-0.988749],[-0.223011,0.176047,0.958788],[-0.404736,0.029057,0.913972],[-0.021844,-0.981329,0.19109],[-0.084123,-0.560129,-0.824123],[-0.217045,-0.496123,-0.840686],[-0.276241,-0.460789,-0.843424],[-0.333461,-0.445832,-0.830685],[-0.447166,-0.393636,-0.803177],[0.015368,-0.994688,-0.101782],[0.016282,-0.980822,-0.194224],[0.016818,-0.979558,-0.20046],[0.092904,-0.214354,-0.972328],[0.10079,-0.213051,-0.971828],[0.164477,-0.975895,-0.143447],[0.059862,0.040118,-0.9974],[-0.045355,-0.995118,-0.087654],[-0.035672,-0.993117,0.11156],[-0.323138,-0.203456,0.924223],[0.011254,-0.294848,0.955478],[0.049358,-0.023201,0.998512],[0.009892,-0.234774,0.972],[0.163664,-0.974341,0.154514],[0.167952,-0.985725,0.01179],[-0.002132,0.266269,0.963897],[-0.129285,0.116881,0.984695],[-0.084062,0.232967,0.968845],[0.411702,-0.898801,0.15053],[0.833365,0.358471,0.420716],[0.762394,0.320339,-0.562261],[-0.318339,0.842391,0.434784],[-0.143992,0.868128,0.474994],[0.124037,0.593672,0.79509],[0.041785,0.751565,0.658335],[0.155234,0.893626,0.421111],[0.042657,0.877632,0.477432],[0.456982,0.642625,0.61498],[0.092268,0.26904,0.958699],[-0.598639,0.686178,0.41327],[-0.389313,0.547283,0.740889],[0.372458,0.511476,0.774382],[-0.750151,0.547819,0.370362],[0.160555,0.891317,-0.424001],[0.036972,0.881515,-0.470707],[-0.15508,0.891901,-0.424809],[-0.449403,0.292391,-0.844123],[-0.284877,0.887671,-0.36178],[0.719702,0.248954,-0.648113],[0.275801,0.505768,-0.817394],[0.106807,0.386493,-0.916087],[0.12275,0.593059,-0.795747],[-0.030543,0.904719,-0.424912],[-0.331815,0.780085,-0.530439],[-0.596947,0.686926,-0.414472],[-0.128639,0.991691,-0.001407],[-0.740814,0.540899,-0.398275],[-0.781111,0.595163,-0.188805],[-0.80547,-0.407111,-0.430672],[-0.820331,-0.192906,-0.538372],[-0.754521,0.444535,0.482791],[-0.859168,0.395633,0.324506],[-0.820891,0.192656,0.537608],[-0.82442,-0.0469,0.564032],[-0.988582,-0.143847,0.044876],[-0.650955,-0.758094,-0.039374],[-0.681809,-0.567442,0.461678],[-0.823794,0.046538,-0.564975],[-0.776128,0.629769,0.031893],[-0.815025,0.275892,-0.509528],[-0.866295,0.316253,-0.386674],[-0.787812,-0.562643,-0.25057],[-0.814627,-0.276988,0.509568],[-0.786507,0.564427,0.250659],[-0.467289,0.797159,-0.382333],[-0.464559,0.827129,-0.316294],[-0.438615,0.785368,-0.436822],[-0.446972,0.750895,-0.486182],[-0.533822,0.845081,-0.029525],[-0.530757,0.8347,-0.146876],[-0.536952,0.832627,-0.135703],[-0.541373,0.839931,-0.037835],[-0.523482,0.836317,0.162911],[-0.388335,0.878289,0.278933],[-0.499841,0.797616,0.337592],[-0.449823,0.728128,0.517193],[-0.401551,0.673353,0.620767],[-0.445678,0.761887,0.47],[-0.436663,0.803941,0.403739],[-0.423485,0.854368,0.301192],[-0.475774,0.828641,0.294944],[-0.50057,0.865624,0.011142],[-0.481524,0.876398,0.007848],[-0.509983,0.860181,-0.002315],[-0.472046,0.789495,-0.392263],[-0.503768,0.823947,-0.259478],[-0.48559,0.835283,-0.257885],[-0.489379,0.842222,0.22621],[-0.476946,0.852684,0.213195],[-0.492911,0.86553,0.088863],[-0.50345,0.860335,0.079757],[-0.533309,0.845745,0.017219],[-0.51619,0.856318,0.016323],[-0.520579,0.853672,-0.015528],[-0.458332,0.819379,0.344312],[-0.438292,0.788537,0.431403],[-0.495073,0.868834,-0.005468],[-0.493496,0.869747,0.001384],[-0.517841,0.846361,0.124555],[-0.495823,0.823185,0.276633],[-0.48651,0.712507,-0.505611],[-0.47719,0.764975,-0.432555],[-0.451006,0.670011,-0.589643],[0.094277,0.714216,0.693547],[0.080626,0.718394,0.690948],[0.090371,0.504496,0.858672],[0.091517,0.52942,0.843409],[0.0924,0.502112,-0.859852],[0.083789,0.506166,-0.858356],[0.090208,0.715788,-0.692467],[0.086582,0.718222,-0.690406],[0.015507,0.530532,-0.847523],[-0.008582,0.526419,-0.850182],[0.003709,0.737294,-0.675561],[0.025037,0.740688,-0.671383],[-0.192791,0.545465,-0.815659],[-0.216815,0.559292,-0.800115],[-0.24021,0.690795,-0.681984],[-0.142204,0.706899,-0.692873],[-0.501613,0.858547,-0.10621],[-0.503048,0.864081,-0.01753],[-0.494639,0.866672,-0.064904],[-0.037176,0.706571,0.706665],[-0.151367,0.71814,0.679237],[-0.162308,0.530201,0.832192],[-0.039853,0.52559,0.849804],[-0.353091,0.729913,-0.585281],[-0.417944,0.860024,-0.292716],[-0.001448,0.525618,-0.85072],[0.004746,0.348583,-0.937266],[-0.052811,0.35364,-0.933889],[-0.081541,0.527905,-0.84538],[-0.220844,0.395485,-0.891526],[-0.225911,0.39197,-0.891809],[-0.251295,0.355993,-0.900067],[-0.23832,0.411871,-0.879526],[-0.17064,0.401428,-0.899854],[-0.136847,0.360879,-0.922518],[-0.035229,0.216779,-0.975585],[-0.118315,0.764347,-0.633858],[-0.071999,0.768542,-0.635735],[-0.220352,0.747626,-0.626498],[-0.214453,0.740278,-0.637181],[0.036965,0.53491,-0.8441],[0.03041,0.37888,-0.924946],[0.021213,0.370141,-0.928734],[0.002865,0.534003,-0.845478],[0.07779,0.358803,-0.930166],[0.103475,0.341833,-0.934047],[0.112161,0.706695,0.698571],[0.093548,0.821107,0.563057],[0.092691,0.83089,0.548662],[0.080862,0.727153,0.681697],[0.055069,0.837413,0.543789],[0.068785,0.84731,0.526626],[0.050915,0.737979,0.6729],[0.018157,0.691622,0.722031],[0.028882,0.788393,0.614494],[-0.014795,0.779731,0.62594],[-0.002151,0.363872,0.931446],[0.020891,0.532933,0.8459],[-0.002669,0.529076,0.84857],[0.013701,0.360848,0.932524],[-0.005507,0.331015,0.943609],[0.007274,0.527125,0.849757],[-0.073662,0.353779,0.932424],[-0.372146,0.734247,0.567793],[-0.470025,0.720745,0.509512],[-0.518596,0.854557,0.028098],[-0.409942,0.912096,-0.005306],[-0.531031,0.840239,0.109565],[-0.466832,0.676187,0.569947],[-0.42154,0.525303,0.739163],[-0.423739,0.772517,0.47293],[-0.391458,0.814584,0.428035],[-0.226871,0.409732,0.883543],[-0.255816,0.357393,0.898236],[-0.252771,0.359706,0.898175],[-0.225901,0.408118,0.884538],[-0.151934,0.383264,0.911057],[-0.170886,0.391223,0.904291],[-0.068648,0.251566,0.965403],[-0.207836,0.749976,0.627965],[-0.226954,0.736628,0.637081],[-0.234449,0.700154,0.674402],[-0.07342,0.770391,0.63333],[0.10391,0.834637,0.540911],[0.086923,0.830845,-0.549674],[0.09467,0.741359,-0.664397],[0.094691,0.830779,-0.548488],[0.092413,0.515056,-0.852161],[0.082009,0.354654,-0.931394],[0.092751,0.356315,-0.929751],[0.064031,0.526933,-0.847491],[-0.495707,0.865069,-0.077005],[-0.4557,0.882757,-0.114358],[-0.515584,0.8513,-0.097268],[-0.484999,0.850372,-0.204068],[0.018507,0.74327,-0.668736],[0.04757,0.744726,-0.665672],[0.106305,0.496726,0.861373],[-0.513893,0.808531,0.286691],[-0.468748,0.861844,-0.193649],[-0.49214,0.729742,0.474632],[-0.466196,0.637268,0.613637],[-0.501621,0.865051,0.00796],[-0.469012,0.83236,-0.295305],[-0.485871,0.872739,0.047496],[-0.469288,0.805599,0.361634],[-0.464507,0.549619,-0.694372],[-0.426838,0.69301,-0.580987],[-0.446524,0.722855,-0.527349],[-0.448838,0.796406,-0.405316],[-0.444569,0.7838,-0.433608],[-0.469807,0.775808,0.421193],[-0.48544,0.856571,0.175024],[-0.517456,0.794902,-0.316814],[-0.501816,0.811264,-0.300052],[0.102859,0.539839,-0.835461],[-0.044541,0.70055,-0.712212],[-0.222818,0.546146,0.807512],[0.017251,0.739459,0.672981],[-0.005809,0.735699,0.677284],[-0.364103,0.570572,-0.736122],[-0.413623,0.565233,-0.713742],[-0.42939,0.852161,-0.299076],[-0.394916,0.818373,-0.4175],[-0.001952,0.372847,-0.927891],[0.013933,0.357802,-0.933693],[0.023892,0.722706,-0.690743],[-0.019166,0.785453,-0.618624],[0.046701,0.784916,-0.61784],[0.018404,0.857722,-0.513784],[0.039637,0.848991,-0.526919],[0.105848,0.829104,-0.548983],[0.092355,0.346493,0.933495],[0.082059,0.353664,0.931766],[0.098841,0.509684,0.854665],[0.072453,0.521862,0.849947],[0.090668,0.365594,0.926348],[-0.104778,0.771301,0.627786],[-0.001469,0.849022,0.528355],[0.027052,0.852453,0.522103],[-0.460742,0.883066,0.088952],[-0.327334,0.621727,0.711553],[0.102758,0.348662,0.931599],[0.054307,0.845821,-0.530695],[0.092588,0.72118,-0.686533],[0.062547,0.732426,-0.677968],[0.069266,0.843483,-0.532672],[0.002231,0.853401,-0.521249],[0.028386,0.845282,-0.533565],[0.010505,-0.996996,-0.076736],[0.010043,-0.938349,-0.345543],[0.010417,-0.900043,-0.435676],[-0.075419,-0.994867,-0.067458],[0.006919,-0.9976,-0.068897],[0.010333,-0.997401,-0.071299],[0.697073,-0.705012,-0.130566],[0.728688,-0.679837,-0.082678],[0.010932,-0.997658,-0.067524],[-0.156858,-0.985059,-0.071098],[-0.066015,-0.995293,-0.070943],[-0.154906,-0.98559,-0.067947],[0.0074,-0.900733,-0.434309],[0.01072,-0.996984,-0.076866],[0.011016,-0.997395,-0.071292],[0.010457,-0.996997,-0.076731],[0.010477,-0.996989,-0.076833],[0.005307,-0.435748,-0.900053],[-0.000456,-0.241189,-0.970478],[-0.039485,-0.433411,0.900331],[-0.075234,-0.428465,0.900421],[-0.147465,-0.887276,0.437031],[-0.064139,-0.897307,0.436722],[0.005874,-0.92681,0.375484],[0.627427,-0.663341,0.407815],[0.209256,-0.386875,0.898075],[-0.156181,-0.985131,0.071584],[-0.064064,-0.995396,0.071298],[0.007534,-0.997393,0.071763],[-0.062703,-0.995669,0.068645],[0.006175,-0.997534,0.069907],[0.011263,-0.99756,0.0689],[-0.242708,-0.967556,0.070203],[-0.972682,-0.230354,0.028756],[-0.054783,-0.996308,0.066095],[-0.244801,-0.966852,0.072592],[-0.985795,-0.163352,0.039037],[-0.982199,-0.186395,0.023285],[-0.239132,-0.968712,0.066425],[0.007976,-0.922827,0.385132],[0.01075,-0.996932,0.077529],[0.697563,-0.695504,0.172277],[0.002272,-0.436211,0.899841],[0.005539,-0.436398,-0.899737],[0.434361,-0.40103,-0.806539],[0.774497,-0.515623,-0.366452],[0.00741,-0.997438,-0.071149],[-0.246213,-0.966477,-0.072812],[-0.249185,-0.966178,-0.066388],[0.010897,-0.997638,-0.067826],[-0.978195,-0.20572,-0.028536],[-0.241454,-0.968,-0.068383],[-0.05445,-0.995989,0.070996],[-0.107743,-0.992017,0.065528],[-0.150366,-0.986321,0.067528],[0.697574,-0.695839,-0.170874],[-0.144174,-0.887969,-0.43672],[-0.05687,-0.898002,-0.4363],[-0.066212,-0.430682,-0.900072],[-0.018741,-0.435522,-0.899983],[-0.000732,-0.363925,0.931428],[0.004642,-0.364059,0.931364],[0.00913,-0.862619,0.505771],[0.010252,-0.997353,0.071991],[0.010482,-0.996938,0.077493],[0.697313,-0.695759,0.172259],[0.700988,-0.697591,0.148263],[0.010379,-0.997593,0.068555],[0.694637,-0.712676,0.097839],[0.697828,-0.69558,-0.170893],[-0.983408,-0.175948,-0.044169],[-0.986014,-0.165411,-0.020394],[0.043392,0.308351,0.950283],[0.035209,0.334037,0.941902],[0.50575,0.403784,0.762349],[-0.010379,0.176895,0.984175],[-0.115587,0.565609,0.816533],[-0.193451,0.449851,0.871901],[-0.278038,0.100713,0.955276],[-0.113422,-0.450585,0.885499],[0.044134,0.467954,0.88265],[0.024688,0.578577,0.815254],[-0.251517,0.966929,-0.042277],[0.035944,0.998086,-0.050332],[0.03615,0.997465,-0.061293],[-0.064127,0.996098,-0.060628],[-0.485148,0.80491,-0.341689],[0.036963,0.99741,-0.061699],[0.24736,0.881952,-0.401216],[0.023939,0.905846,0.422931],[-0.058312,0.968613,0.241636],[0.823793,0.483228,0.296406],[0.144819,0.942084,0.302499],[-0.121309,0.98361,-0.133401],[-0.408397,0.491067,-0.769457],[0.39081,0.909742,0.14013],[0.061948,0.593021,0.8028],[0.101537,0.993505,-0.05137],[0.102188,0.993284,-0.054267],[0.084492,0.994756,-0.057629],[-0.070875,0.979942,0.186253],[0.129461,0.99049,-0.046581],[0.124518,0.990807,-0.052876],[0.277394,0.829917,-0.484035],[0.032533,0.998192,-0.05054],[-0.44993,0.891882,-0.045932],[-0.445966,0.893671,-0.049661],[-0.50827,0.86009,-0.04366],[-0.219534,0.974025,-0.055504],[-0.099536,0.993849,-0.048543],[-0.2192,0.973899,-0.058923],[0.098838,0.976417,-0.19194],[0.213571,0.839522,-0.499589],[0.761433,0.642534,0.08585],[0.767466,0.639282,0.048105],[0.104245,0.993298,-0.049924],[0.096098,0.898509,0.428307],[0.143651,0.988629,-0.044466],[-0.132573,0.959851,-0.247206],[0.292019,0.761006,-0.579306],[0.084107,0.965943,0.244703],[0.440038,0.876826,0.19376],[-0.183622,0.903762,0.386648],[-0.207758,0.919783,0.332921],[0.767647,0.634912,0.087204],[0.808301,0.588697,0.009179],[0.129119,0.99016,-0.053948],[0.085521,0.799,-0.595218],[0.09944,0.976461,0.191404],[0.187169,0.535226,0.823712],[-0.310452,0.706421,0.636074],[-0.547887,0.269699,-0.791885],[-0.316945,0.891167,-0.324602],[0.671057,0.271511,-0.689902],[0.207754,0.949259,-0.236105],[0.07785,0.737939,-0.670363],[-0.03681,0.963165,0.266381],[0.105207,0.993226,0.049323],[0.053293,0.510367,0.858304],[0.445218,0.347612,0.825195],[-0.632837,0.667335,0.392659],[-0.157536,0.85239,0.498612],[0.55578,0.773494,0.304658],[-0.653888,0.707058,0.269257],[-0.369486,0.373899,-0.850694],[0.699508,0.625124,-0.346277],[0.395694,0.439276,0.806513],[0.7071,0.21635,-0.673203],[-0.503387,0.165973,-0.847971],[0.318936,0.528292,0.786885],[-0.784015,0.541893,0.302776],[-0.548637,0.483401,0.682144],[0.727648,0.227827,-0.647012],[0.678029,0.66149,-0.320481],[0.212379,0.890453,-0.402478],[-0.750436,0.489899,0.443671],[0.102513,0.993435,0.050777],[-0.132606,0.986145,-0.09967],[0.323568,0.470487,0.820942],[0.38786,0.904548,0.177082],[0.32573,0.465333,0.823022],[0.441592,0.869436,0.221533],[-0.418777,0.468716,-0.777774],[-0.502642,0.837786,-0.213227],[-0.306653,0.838189,-0.451002],[-0.309868,0.818886,-0.483122],[-0.506869,0.36999,0.778583],[-0.731896,0.464352,0.498704],[-0.082924,0.985106,0.150631],[0.088165,0.93313,-0.348563],[0.040287,0.937773,-0.344904],[0.031535,0.997547,0.062491],[0.030758,0.998334,0.04882],[-0.071006,0.995636,0.060564],[-0.520419,0.852857,0.042407],[0.029677,0.998421,0.047699],[0.030714,0.997711,0.060252],[-0.088245,0.994813,0.050586],[0.757995,0.649366,-0.061379],[0.126093,0.990666,0.051779],[0.130943,0.99014,0.049772],[0.775276,0.631399,-0.016783],[-0.056282,0.976598,-0.20758],[-0.214056,0.91238,-0.348916],[-0.217712,0.974285,0.058055],[0.095623,0.898271,-0.428913],[0.017374,0.150695,-0.988428],[0.046542,0.575574,-0.816425],[0.289992,0.39771,-0.870478],[0.060457,0.463554,-0.884004],[0.139349,0.961804,-0.235615],[0.149539,0.987809,0.043272],[0.084754,0.994767,0.057057],[0.100889,0.993437,0.053883],[0.758358,0.646349,-0.084417],[0.133192,0.990039,0.045647],[-0.446311,0.893648,0.04691],[-0.452119,0.89044,0.052005],[-0.266114,0.963067,0.041052],[-0.222269,0.973443,0.054824],[0.714656,0.623021,-0.317981],[0.763716,0.639861,-0.085534],[0.01108,0.472172,-0.881437],[-0.054184,0.467097,-0.882544],[-0.113825,0.472898,-0.873734],[-0.086837,-0.426024,-0.900535],[-0.203527,-0.180559,-0.962276],[-0.254438,0.43032,-0.866075],[-0.14776,0.698597,-0.700093],[-0.093718,0.718994,-0.688669],[-0.002673,0.534414,0.845219],[0.01059,0.535227,0.844642],[0.007096,0.742567,0.669734],[0.006753,0.742172,0.670176],[0.060275,0.352749,0.933775],[0.067283,0.53342,0.84317],[0.049777,0.535458,0.843094],[0.022361,0.373701,0.92728],[0.011808,0.351111,0.936259],[0.018085,0.311556,0.950056],[0.019874,0.376081,0.926373],[-0.116483,0.716431,0.687865],[-0.154987,0.690257,0.70677],[0.037403,0.919946,0.390258],[0.031951,0.861817,0.506211],[0.03959,0.855829,0.515741],[0.044955,0.308139,0.950279],[0.05346,0.744718,0.665235],[0.036248,0.744484,0.666656],[0.014798,0.865337,0.500972],[0.015864,0.853258,0.521247],[0.015286,0.917244,0.398032],[0.002735,-0.20202,0.979377],[0.011519,-0.197652,0.980205],[0.003872,-0.089205,0.996006],[0.000126,-0.090019,0.99594],[0.033701,-0.188031,0.981585],[0.098031,-0.084378,0.9916],[0.095465,-0.170197,0.980775],[0.049862,-0.085577,0.995083],[0.000022,-0.000242,1],[0.010644,0.089116,0.995964],[0.092715,0.001877,0.995691],[0.080116,0.076,0.993884],[0.065267,0.089116,0.993881],[0.051524,0.001877,0.99867],[0.00482,0.000434,0.999988],[0.007836,0.08913,0.995989],[0.046935,0.742718,0.667957],[0.06778,0.530998,0.844658],[0.079614,0.227699,0.970471],[0.039065,0.219886,0.974743],[0.003502,0.343482,0.939153],[0.006619,0.53384,0.84556],[0.02509,0.934373,0.355412],[0.017336,0.934051,0.356718],[0.024537,0.93429,0.355669],[0.080901,0.340155,0.936883],[0.027471,0.883289,0.468024],[0.005283,0.229234,0.973357],[0.013943,0.232716,0.972445],[0.025361,0.933074,0.358789],[0.010471,0.741725,0.670622],[0.01402,0.896255,0.443318],[0.015274,0.932806,0.360055],[0.024359,0.933037,0.358956],[-0.215121,-0.878365,-0.426846],[-0.765701,-0.061784,0.640222],[-0.231539,-0.86761,0.440049],[-0.741365,-0.189621,-0.643756],[-0.428097,0.842732,0.326397],[-0.324702,-0.928612,0.179576],[-0.868815,0.287155,0.403365],[-0.168734,0.95979,0.224346],[-0.176175,0.941987,-0.285697],[-0.94019,-0.036568,-0.338681],[-0.372751,-0.897707,-0.234902],[-0.436391,0.832769,-0.340674],[-0.001414,0.001281,0.999998],[0.24309,0.407784,0.880125],[-0.316969,0.367354,0.874404],[-0.368734,0.4288,0.824722],[0.000436,-0.001581,0.999999],[-0.640357,0.745873,0.183347],[-0.64022,0.745712,0.184476],[-0.640276,0.745435,-0.185401],[-0.641139,0.746216,-0.179174],[-0.368081,0.425488,-0.826726],[-0.312268,0.361271,-0.878619],[0.001663,-0.004102,-0.99999],[-0.000263,-0.002085,-0.999998],[0.366428,-0.072801,-0.927594],[0.032295,0.63778,0.769541],[0.215929,-0.427298,0.877947],[0.656483,0.339826,0.673461],[-0.051516,0.395497,0.917021],[-0.379131,0.396516,0.836083],[-0.324745,-0.532165,0.781883],[0.004949,0.514512,0.857469],[-0.028824,0.545806,0.837416],[0.59097,-0.80103,0.09542],[0.716223,0.688752,0.11245],[0.716144,0.688836,0.112439],[0.934825,-0.322883,0.147813],[0.663669,-0.701789,0.258913],[-0.034322,0.977529,0.207988],[0.578002,0.677693,0.454584],[0.189631,0.977796,-0.089195],[0.511391,0.73821,0.439916],[0.186363,0.971545,-0.146181],[-0.034003,0.78965,0.612614],[-0.057519,0.986761,-0.15164],[0.326864,0.823724,-0.463291],[0.465095,0.864889,0.188823],[-0.051958,0.7923,-0.607915],[-0.020839,0.413444,-0.910291],[-0.071218,0.536491,-0.840896],[0.540504,0.804206,0.247201],[-0.414377,0.117415,-0.902499],[0.284741,0.858844,-0.425805],[-0.159212,-0.639134,-0.752435],[0.582835,-0.80727,-0.092839],[0.567257,-0.786112,-0.245452],[0.933462,-0.327571,-0.146105],[0.519106,-0.269962,-0.810956],[0.011255,0.277368,-0.960698],[0.016208,0.72853,-0.684822],[0.350933,0.67111,-0.653038],[0.350872,0.61672,0.704659],[-0.085874,0.981726,0.169823],[-0.039117,0.932326,0.359496],[0.09087,0.648444,-0.75582],[0.760539,0.549589,-0.345735],[0.63333,0.690883,-0.348674],[0.473264,0.632322,0.613344],[0.71066,0.4501,0.540715],[0.024131,0.882814,0.469102],[-0.068626,0.94972,-0.305487],[-0.09906,0.950458,-0.294646],[0.553122,0.687555,-0.470451],[0.027045,0.965655,0.258415],[0.780497,0.459091,-0.424334],[0.309864,0.849775,0.426458],[0.007728,0.988714,-0.149613],[-0.318481,0.764496,-0.56046],[0.692111,0.668754,0.271572],[0.06428,0.992087,0.107852],[0.06491,0.99786,0.007887],[0.067539,0.997663,0.010338],[0.030247,0.923763,0.381769],[-0.087583,0.995717,0.029614],[-0.143909,0.790747,0.594987],[0.716495,0.688554,-0.111934],[0.062621,0.997986,-0.010155],[0.060176,0.980159,-0.188856],[0.026514,0.963669,-0.26578],[0.064953,0.997833,-0.010514],[-0.060442,0.983572,-0.170096],[-0.307313,0.840441,0.446337],[-0.095035,0.624394,-0.775307],[0.716437,0.688614,-0.111929],[0.687125,0.680247,-0.255193],[0.313187,0.140989,-0.939168],[-0.000195,-0.001121,-0.999999],[0.006467,0.149012,-0.988814],[0.006507,0.476418,-0.879195],[0.09918,0.434037,-0.895419],[0.092218,0.030727,-0.995265],[-0.080396,-0.02915,-0.996337],[0.067152,-0.014094,-0.997643],[0.723507,-0.208018,-0.658229],[0.000546,0.382683,-0.923879],[-0.013852,0.387407,-0.921805],[0.001867,0.526746,-0.85002],[0.0021,0.305098,-0.952319],[0.334109,0.867034,-0.369626],[0.028778,0.957554,-0.286813],[0.025813,0.928582,0.370227],[0.645716,0.642678,0.41233],[0.000386,0.382683,-0.923879],[-0.053063,0.440535,-0.896166],[-0.272706,0.510924,-0.815223],[-0.13452,0.623264,-0.770354],[0.180551,-0.488787,-0.853515],[-0.324419,0.481691,-0.81408],[0.91963,0.14393,-0.365466],[0.757153,-0.151646,-0.635392],[-0.040866,0.417128,-0.907929],[0.198776,-0.63111,-0.749792],[-0.046775,0.239795,-0.969696],[0.000591,0.382683,-0.923879],[-0.002815,0.934989,-0.354665],[-0.007169,0.953442,0.301491],[-0.000112,0.92388,0.382683],[-0.000116,0.95232,0.305102],[0.001236,0.466319,0.884616],[-0.000307,0.382683,0.923879],[-0.061686,0.443668,0.894066],[-0.325772,0.923834,0.201006],[-0.004353,0.926028,0.377429],[-0.007419,0.962597,-0.270836],[0.000126,0.976291,-0.216462],[0.00024,0.92388,-0.382683],[0.000226,0.92388,-0.382683],[-0.003642,0.949329,-0.314264],[-0.258203,0.953032,0.158307],[-0.575352,0.797628,0.180993],[-0.286958,0.514561,0.808011],[-0.105181,0.618794,0.77848],[0.000422,0.504278,0.863541],[-0.306463,0.485517,0.818751],[-0.228375,0.955198,-0.188258],[0.000191,0.92388,-0.382683],[-0.000198,0.92388,0.382683],[-0.007345,0.962697,0.270482],[0.001348,0.940182,0.340669],[-0.000226,0.92388,0.382683],[-0.372932,0.910455,-0.178867],[0.083207,0.345435,0.934747],[0.001425,0.914507,-0.404569],[-0.000548,0.382683,0.923879],[-0.012431,0.305088,0.952243],[0.001826,0.388872,0.92129],[-0.000491,0.382683,0.923879],[-0.502831,0.845674,-0.178873],[0.681334,0.150812,0.716268],[0.766721,-0.117401,0.631155],[0.720287,-0.229138,0.654738],[-0.082067,0.198182,0.976724],[0.177598,0.234476,0.955761],[-0.000082,-0.000401,1],[-0.002145,0.08648,0.996251],[0.321851,-0.442636,0.83695],[0.410424,-0.539601,0.735108],[-0.040493,-0.249426,0.967547],[0.11034,-0.004696,0.993883],[0.069394,-0.020364,0.997381],[-0.090169,0.232372,0.968438],[0.675657,0.301195,-0.672881],[-0.083308,0.537922,-0.838868],[0.458724,0.742599,-0.487975],[-0.13328,0.362091,-0.922565],[-0.083334,0.765357,0.638188],[0.614211,-0.110664,0.781344],[0.678271,-0.035316,0.733963],[0.27474,-0.88112,0.384896],[-0.024967,0.782043,0.622725],[0.462278,-0.673271,-0.577066],[0.497584,-0.627621,-0.598751],[0.278128,-0.907531,0.314695],[-0.147947,-0.131902,0.98016],[-0.095945,-0.683693,-0.723435],[-0.155717,-0.149954,0.976353],[-0.053791,-0.302447,0.951647],[-0.128499,-0.668483,-0.732542],[-0.084351,-0.090891,-0.992282],[0.777043,-0.306329,-0.549878],[0.62098,-0.246644,-0.744009],[0.782081,-0.310326,0.540413],[0.592874,-0.236311,0.769843],[0.096968,-0.043586,0.994333],[0.102855,-0.04619,0.993623],[0.066671,-0.028706,-0.997362],[0.105775,-0.045625,-0.993343],[0.194922,0.554419,0.809089],[0.672745,-0.375406,-0.637561],[-0.110046,0.838961,-0.532948],[-0.229113,0.923248,0.308417],[-0.710984,-0.656404,0.252261],[0.558925,-0.801046,0.21431],[0.558925,-0.695615,0.451356],[-0.710984,-0.546323,0.442756],[-0.710984,-0.382768,0.589908],[0.558924,-0.522092,0.644223],[0.558925,-0.297467,0.774026],[-0.710984,-0.181744,0.679317],[-0.710984,0.037075,0.70223],[0.558925,-0.043719,0.828065],[0.558925,0.214312,0.801045],[-0.710984,0.252264,0.656403],[-0.710984,0.442753,0.546326],[0.558924,0.451357,0.695615],[0.558925,0.644221,0.522095],[-0.710984,0.589908,0.382767],[-0.710984,0.679318,0.181739],[0.558925,0.774028,0.297462],[0.558925,0.828065,0.043717],[-0.710984,0.702231,-0.037073],[-0.710984,0.656405,-0.252259],[0.558925,0.801047,-0.214306],[0.558925,0.695616,-0.451355],[-0.710984,0.546325,-0.442754],[-0.710984,0.382769,-0.589907],[0.558925,0.522094,-0.644222],[0.558925,0.297466,-0.774027],[-0.710984,0.181741,-0.679317],[-0.710984,-0.037073,-0.702231],[0.558925,0.043717,-0.828065],[0.558925,-0.214308,-0.801046],[-0.710984,-0.252262,-0.656404],[-0.710984,-0.442755,-0.546324],[0.558925,-0.451358,-0.695614],[0.319369,-0.736217,-0.596647],[-0.710984,-0.589908,-0.382766],[-0.710984,-0.679317,-0.181743],[0.986684,-0.151823,-0.058347],[0.31937,-0.946312,-0.049962],[-0.710984,-0.70223,0.037075],[-0.710984,-0.656404,-0.252261],[-0.710984,-0.70223,-0.037074],[-0.710984,-0.382767,-0.589908],[-0.710984,-0.546325,-0.442754],[-0.710984,0.037074,-0.70223],[-0.710984,-0.181742,-0.679317],[-0.710984,0.442754,-0.546325],[-0.710984,0.252261,-0.656404],[-0.710984,0.679317,-0.181742],[-0.710984,0.589908,-0.382767],[-0.710984,0.656403,0.252263],[-0.710984,0.70223,0.037074],[-0.710984,0.382768,0.589907],[-0.710984,0.546326,0.442753],[-0.710984,-0.037074,0.70223],[-0.710984,0.181742,0.679317],[-0.710984,-0.442757,0.546323],[-0.710984,-0.252261,0.656404],[-0.710984,-0.679317,0.181743],[-0.710984,-0.589908,0.382768],[0.710984,-0.656403,0.252263],[0.710984,-0.546326,0.442753],[0.710984,-0.382768,0.589907],[0.710984,-0.181742,0.679317],[0.710984,0.037074,0.70223],[0.710984,0.252261,0.656404],[0.710984,0.442757,0.546323],[0.710984,0.589908,0.382768],[0.710984,0.679317,0.181743],[0.710984,0.70223,-0.037074],[0.710984,0.656404,-0.252261],[0.710984,0.546325,-0.442754],[0.710984,0.382767,-0.589908],[0.710984,0.181742,-0.679317],[0.710984,-0.037074,-0.70223],[0.710984,-0.252261,-0.656404],[0.710984,-0.442754,-0.546325],[0.710984,-0.589908,-0.382767],[0.710984,-0.679317,-0.181742],[0.710984,-0.70223,0.037074],[0.710984,-0.656404,-0.252261],[0.710984,-0.70223,-0.037075],[0.710984,-0.382769,-0.589907],[0.710984,-0.546325,-0.442754],[0.710984,0.037073,-0.702231],[0.710984,-0.181741,-0.679317],[0.710984,0.442755,-0.546324],[0.710984,0.252262,-0.656404],[0.710984,0.679318,-0.181739],[0.710984,0.589908,-0.382766],[0.710984,0.656405,0.252259],[0.710984,0.702231,0.037073],[0.710984,0.382768,0.589908],[0.710984,0.546323,0.442756],[0.710984,-0.037075,0.70223],[0.710984,0.181744,0.679317],[0.710984,-0.442753,0.546326],[0.710984,-0.252264,0.656403],[0.710984,-0.679317,0.181743],[0.710984,-0.589908,0.382767],[-0.071232,-0.99746,0.000264],[-0.071232,-0.94856,0.308481],[-0.071232,-0.806807,0.586506],[-0.07123,-0.586081,0.807115],[-0.07123,-0.307986,0.948721],[-0.071232,0.000264,0.99746],[-0.071231,0.308484,0.948559],[-0.07123,0.586503,0.806809],[-0.071232,0.807117,0.586079],[-0.071233,0.948722,0.30798],[-0.071231,0.99746,-0.000261],[-0.071232,0.94856,-0.308479],[-0.071232,0.806808,-0.586503],[-0.071231,0.586083,-0.807114],[-0.071232,0.307983,-0.948722],[-0.071231,-0.000261,-0.99746],[-0.071232,-0.308483,-0.948559],[-0.071231,-0.586505,-0.806807],[-0.071231,-0.807117,-0.586079],[-0.071231,-0.948721,-0.307984],[-0.371702,-0.891681,-0.258345],[-0.371701,-0.927873,0.029841],[-1,0.000001,0],[-0.371702,-0.768203,-0.52125],[-0.371702,-0.569533,-0.733123],[-0.371702,-0.315109,-0.873238],[-0.371702,-0.029842,-0.927872],[-0.371702,0.25835,-0.89168],[-0.371701,0.521252,-0.768202],[-0.371702,0.733124,-0.569532],[-0.371701,0.873239,-0.315107],[-0.371701,0.927873,-0.02984],[-0.371701,0.891681,0.258348],[-0.371701,0.768206,0.521247],[-0.371702,0.569536,0.733121],[-0.371702,0.315106,0.873239],[-0.371701,0.029839,0.927873],[-0.371702,-0.258343,0.891682],[-0.371702,-0.521249,0.768204],[-0.371702,-0.733126,0.56953],[-0.371702,-0.873238,0.315107],[-0.240472,-0.970655,0.001249],[-0.240472,-0.922763,0.301133],[-0.240472,-0.784545,0.571544],[-0.240471,-0.56953,0.786009],[-0.240473,-0.298762,0.923534],[-0.240473,0.00125,0.970655],[-0.240471,0.301131,0.922764],[-0.240472,0.571549,0.784541],[-0.240473,0.786012,0.569524],[-0.240472,0.923534,0.298763],[-0.240472,0.970655,-0.001246],[-0.240472,0.922763,-0.301135],[-0.240472,0.784545,-0.571544],[-0.240472,0.569528,-0.786009],[-0.240472,0.298766,-0.923532],[-0.240472,-0.001249,-0.970655],[-0.240472,-0.301134,-0.922763],[-0.240472,-0.571548,-0.784542],[-0.240472,-0.786009,-0.569528],[-0.240472,-0.923534,-0.298761],[0.220065,-0.924891,0.310077],[-0.505512,-0.854719,-0.117953],[-0.349355,-0.870279,0.347224],[0.815854,-0.248141,0.522311],[0.143892,-0.653001,-0.743562],[-0.522831,-0.823387,-0.22064],[-0.505514,-0.854714,-0.117985],[0.220053,-0.924922,0.309992],[0.143866,-0.653089,-0.74349],[-0.522826,-0.823395,-0.220619],[-0.349355,-0.870295,0.347186],[0.815854,-0.248214,0.522276],[-0.68766,-0.713678,-0.133367],[-0.694102,-0.679647,-0.237283],[-0.562505,-0.77424,-0.29007],[-0.569449,-0.806294,-0.160056],[-0.444218,0.879786,-0.169252],[-0.466099,0.882991,-0.05548],[-0.280218,0.958453,-0.053338],[-0.281778,0.936847,-0.207168],[-0.684676,-0.457898,-0.567053],[-0.561226,-0.10667,-0.82076],[-0.435129,-0.120566,-0.892259],[-0.537271,-0.522826,-0.661811],[-0.941335,-0.307449,-0.139153],[-0.917115,-0.17421,-0.35854],[-0.776209,0.618451,-0.122544],[-0.895082,0.44551,-0.018689],[-0.276737,0.921407,-0.27281],[-0.333043,0.916653,-0.220975],[-0.746089,0.603503,-0.281309],[-0.432972,0.900881,-0.030796],[-0.857861,0.510215,-0.061284],[-0.86893,0.439812,-0.226993],[-0.35451,0.933939,-0.045609],[-0.686377,-0.72416,-0.066922],[-0.715024,-0.674792,-0.182748],[-0.973106,-0.212208,-0.089623],[-0.913616,-0.40204,-0.060574],[-0.489783,0.487068,0.723102],[-0.322659,0.504931,0.800585],[-0.388001,0.763244,0.516637],[-0.478103,0.759174,0.441671],[-0.861001,0.406983,0.305028],[-0.330169,0.909096,0.254033],[-0.746088,0.603505,0.281307],[-0.809716,0.583149,0.065563],[-0.396441,0.917802,0.021785],[-0.384953,0.921082,0.058469],[-0.2617,0.927439,0.267151],[-0.717675,0.66331,0.212046],[-0.861369,0.493358,0.121001],[-0.760839,0.521951,0.385604],[-0.451919,0.87314,0.182747],[-0.809363,0.33804,0.480271],[-0.778394,0.140576,0.611835],[-0.493884,0.194928,0.847397],[-0.287923,0.928786,0.233361],[-0.239711,0.961708,0.132881],[-0.223677,0.974292,-0.026894],[-0.7041,0.710065,0.007208],[-0.80942,0.57817,0.102758],[-0.394891,0.19663,0.897439],[-0.91336,-0.033441,0.405778],[-0.554816,-0.102889,0.825587],[-0.398179,0.915495,0.057637],[-0.227425,0.971953,0.059869],[-0.203593,0.979025,0.007694],[-0.174237,0.984096,0.034597],[-0.148799,0.975686,0.160922],[-0.468714,0.45875,-0.754888],[-0.837307,0.34807,-0.421621],[-0.749006,0.556075,-0.360238],[-0.557127,-0.824756,-0.096883],[-0.580528,-0.805546,-0.11867],[-0.810649,0.551488,-0.196746],[-0.642829,0.756652,-0.119365],[-0.224332,0.963636,-0.14519],[-0.145998,0.969654,-0.196102],[-0.128631,0.963233,-0.235872],[-0.494187,0.722191,-0.483963],[-0.903447,0.013408,-0.428489],[-0.867628,0.187109,-0.460664],[-0.268794,0.785154,-0.557928],[-0.104995,0.994459,0.005311],[-0.113529,0.987597,-0.108458],[-0.512518,0.197533,-0.835647],[-0.392578,0.200802,-0.897531],[-0.944192,-0.322279,-0.068094],[-0.18628,0.982486,-0.004566],[-0.153527,0.987266,-0.041652],[-0.507393,-0.853816,-0.116408],[-0.575926,-0.798396,-0.175705],[-0.619102,-0.763927,-0.18201],[-0.528245,-0.839436,-0.127689],[-0.140165,0.959904,0.242773],[-0.806314,0.590553,0.033224],[-0.664088,-0.471146,0.580524],[-0.558246,-0.523098,0.643995],[-0.435404,-0.115311,0.89282],[-0.106381,0.986397,0.125316],[-0.933701,-0.239605,0.266068],[-0.438186,0.483129,-0.75801],[0.822413,0.438908,-0.361934],[0.846207,-0.297591,0.442012],[-0.436752,0.480448,-0.760538],[-0.47922,0.173672,-0.860341],[0.829435,-0.544809,-0.123373],[0.826819,-0.4468,-0.341672],[-0.581773,-0.749565,-0.315741],[-0.500964,-0.840505,-0.206364],[0.819313,-0.573,-0.019944],[-0.477987,0.451484,-0.753453],[-0.444874,0.12689,-0.886559],[-0.253277,0.26583,-0.930153],[-0.775247,-0.612868,-0.152923],[-0.546108,-0.756479,-0.359869],[-0.445009,-0.871967,-0.204062],[-0.609622,0.6586,-0.441143],[-0.357355,0.754768,-0.550112],[-0.613615,-0.779672,0.124852],[-0.546782,-0.829474,0.114034],[-0.481231,-0.071303,0.873689],[-0.556311,-0.452671,0.696855],[-0.470882,-0.501758,0.72561],[-0.388087,-0.102064,0.915954],[0.988349,0.152207,0],[0.877212,0.475235,0.068201],[-0.527297,0.848901,0.036404],[0.852884,0.446911,0.269925],[-0.500594,0.841085,0.204893],[-0.494342,0.868455,-0.037576],[-0.323262,0.945363,-0.042316],[-0.298291,0.953062,0.051923],[-0.466324,0.106249,0.87821],[-0.4945,0.219204,0.841083],[-0.200864,0.092384,0.975253],[-0.778784,-0.608684,0.151656],[-0.501248,-0.839782,0.208608],[-0.425524,-0.882153,0.201832],[-0.583522,-0.791493,-0.181773],[0.094901,0.812587,-0.575062],[-0.516174,-0.49047,-0.702142],[-0.497177,-0.469055,-0.729933],[-0.524369,0.820108,-0.229042],[-0.449603,0.86841,-0.209094],[0.798491,0.045028,-0.60032],[0.870775,0.491318,-0.018908],[0.863911,0.178542,-0.470935],[-0.476941,-0.077418,-0.875519],[0.82047,-0.55433,-0.139812],[-0.59059,-0.798373,-0.117489],[-0.289977,0.079213,-0.95375],[-0.389781,-0.095471,-0.915945],[-0.575256,-0.808548,-0.123813],[-0.592592,-0.783705,0.186121],[-0.605379,-0.728037,0.32168],[-0.525492,-0.776707,0.347254],[-0.498946,0.717283,0.486371],[-0.554366,0.682214,0.476721],[-0.453929,0.858094,0.240046],[0.949961,-0.262846,-0.16878],[0.999525,0.028795,0.010998],[0.999449,0.033177,0],[-0.562915,0.464195,0.683849],[-0.348276,0.475628,0.807763],[0.834994,-0.538891,0.111272],[0.826063,-0.563501,-0.009292],[0.818564,-0.264484,0.509904],[0.82227,-0.432737,0.369608],[-0.082259,0.518085,0.851364],[0.8332,-0.552507,0.022654],[0.9916,-0.129315,0.002646],[0.720349,-0.693358,-0.018765],[-0.287972,0.266274,0.919875],[-0.4872,-0.869763,-0.078412],[-0.539434,-0.836766,-0.093987],[-0.799607,-0.575959,0.170001],[-0.569273,-0.808295,0.150291],[-0.642445,-0.732227,0.226072],[-0.48813,-0.86566,0.111181],[-0.531066,-0.84272,0.08827],[-0.479971,-0.875078,0.062172],[-0.520466,-0.853848,-0.007584],[-0.481232,-0.876592,0.001505],[-0.984172,-0.148144,0.097259],[-0.901883,-0.390411,0.184896],[-0.692737,-0.70718,0.141462],[-0.690364,-0.711174,0.132777],[-0.701729,-0.707452,0.08419],[-0.597677,-0.797357,0.083693],[-0.571672,-0.804891,0.159187],[-0.688975,-0.685747,0.234659],[-0.57364,-0.77208,0.273548],[-0.943341,-0.315024,0.104248],[-0.741884,-0.670499,0.006248],[-0.997205,-0.073658,0.012516],[-0.852594,-0.502433,-0.14368],[-0.837543,-0.542368,-0.066019],[-0.866881,-0.462233,-0.186703],[-0.541128,-0.825617,0.159804],[-0.558134,-0.824933,0.089286],[-0.944234,-0.322424,0.066825],[-0.946385,-0.321396,0.032558],[-0.740991,0.671369,0.014009],[-0.615658,-0.311185,-0.723968],[-0.626133,-0.445313,-0.640043],[-0.978712,-0.111101,-0.17257],[-0.976741,-0.094765,-0.192347],[-0.316089,0.432021,-0.844657],[-0.360431,0.248335,-0.899121],[-0.863158,0.150656,-0.481934],[-0.841145,0.260418,-0.47398],[-0.938416,-0.15275,-0.309908],[-0.685301,-0.625923,-0.372268],[-0.705237,0.131092,-0.696747],[-0.704189,0.436785,-0.559765],[-0.626442,-0.263995,-0.733401],[-0.830203,-0.065384,-0.553614],[-0.750287,-0.660709,-0.023077],[-0.606962,-0.77681,-0.167819],[-0.710948,-0.696035,0.100441],[-0.390773,0.020865,0.92025],[-0.335134,0.243612,0.910131],[-0.882124,0.107929,0.458486],[-0.915602,0.000188,0.402086],[-0.440801,-0.385898,0.810418],[-0.543512,-0.190802,0.817428],[-0.957302,-0.106064,0.26893],[-0.736619,0.577095,0.352638],[-0.689392,-0.448278,0.569022],[-0.639051,0.766726,-0.061202],[-0.957124,-0.066957,0.281834],[-0.267968,0.59506,0.757692],[-0.410938,0.044592,0.910572],[-0.835692,0.326841,0.441355],[-0.553411,0.037982,-0.832042],[-0.667228,0.703404,-0.245009],[-0.282618,0.587855,-0.757993],[-0.827532,0.364446,-0.427047],[-0.923861,-0.064479,-0.377256],[-0.778319,-0.088914,-0.621542],[-0.662132,0.739724,0.119957],[-0.381744,-0.162257,-0.909914],[-0.423278,0.043375,-0.904961],[-0.892809,0.03513,-0.449063],[-0.988917,-0.092603,0.116052],[-0.85493,0.221078,0.469276],[-0.299402,0.427102,0.853195],[-0.662147,0.739353,-0.122145],[-0.584076,-0.322722,-0.744786],[-0.142637,-0.982769,-0.117561],[0.997935,0.028175,0.057728],[0.632754,-0.761427,0.140893],[0.857138,-0.401771,-0.322326],[0.871632,0.433391,-0.228976],[0.495833,0.867466,-0.040662],[0.964974,-0.225935,0.133338],[0.238922,0.491697,-0.837347],[0.431966,0.891546,-0.136203],[0.633788,0.773019,0.027459],[0.420394,0.898863,0.12375],[0.924185,-0.229993,-0.304937],[0.896721,0.310475,0.315432],[0.769517,-0.52917,0.357522],[0.750004,-0.652062,0.11095],[0.231306,-0.964531,0.127192],[0.906025,0.103411,0.410396],[0.880433,0.474074,-0.009541],[0.877053,-0.190801,-0.440877],[0.752037,-0.652568,-0.092712],[0.743416,-0.66441,0.076765],[-0.134711,-0.984423,0.112983],[0.877022,0.480065,0.019227],[0.309584,0.7651,0.564606],[0.799554,0.014535,0.600418],[-0.750218,-0.659578,0.046155],[-0.58698,-0.804386,-0.09175],[-0.944686,-0.274719,0.17916],[-0.859142,-0.492278,0.139772],[-0.547065,0.232572,0.804133],[-0.598595,0.041081,0.799998],[-0.528788,-0.494785,0.689616],[-0.695773,0.570319,0.43662],[-0.566621,-0.069613,0.821033],[-0.764842,-0.185008,0.61708],[-0.666025,0.722647,0.184908],[-0.571672,-0.804891,0.159187],[-0.57364,-0.772081,0.273549],[-0.688975,-0.685747,0.234659],[-0.690364,-0.711173,0.132777],[-0.287922,0.928786,0.233363],[-0.227425,0.971954,0.059868],[-0.398178,0.915496,0.057637],[-0.451921,0.873138,0.18275],[-0.558244,-0.523099,0.643997],[-0.435401,-0.115313,0.892821],[-0.554812,-0.102889,0.825589],[-0.664089,-0.471146,0.580523],[-0.933701,-0.239605,0.266066],[-0.943341,-0.315025,0.104248],[-0.806315,0.590553,0.033224],[-0.86137,0.493357,0.121001],[-0.330086,0.902822,0.275601],[-0.235978,0.941604,0.240202],[-0.662762,0.71512,0.222147],[-0.384954,0.921082,0.058469],[-0.861004,0.406977,0.305026],[-0.809715,0.58315,0.065563],[-0.396441,0.917802,0.021785],[-0.837974,0.474924,0.268788],[-0.946385,-0.321396,0.032558],[-0.969938,-0.211785,0.119863],[-0.686236,-0.719506,0.106727],[-0.701729,-0.707452,0.08419],[-0.760839,0.521952,0.385603],[-0.809367,0.338036,0.480268],[-0.489786,0.487068,0.723101],[-0.749005,0.556075,-0.360238],[-0.46871,0.458747,-0.754892],[-0.837304,0.348072,-0.421626],[-0.332784,0.909935,-0.247533],[-0.35451,0.933939,-0.045609],[-0.868929,0.439812,-0.226995],[-0.432972,0.900881,-0.030796],[-0.857861,0.510214,-0.061284],[-0.732089,0.64645,-0.21482],[-0.837972,0.474928,-0.268786],[-0.444218,0.879787,-0.16925],[-0.49419,0.722188,-0.483963],[-0.776208,0.618453,-0.122545],[-0.512522,0.197536,-0.835644],[-0.899891,0.172657,-0.400482],[-0.392582,0.200803,-0.897529],[-0.435131,-0.120565,-0.892258],[-0.561227,-0.106669,-0.820759],[-0.113529,0.987597,-0.108457],[-0.224332,0.963636,-0.14519],[-0.223677,0.974292,-0.026893],[-0.104995,0.994459,0.005312],[-0.256218,0.965536,-0.04575],[-0.281777,0.936848,-0.207167],[-0.466099,0.882991,-0.05548],[-0.537271,-0.522825,-0.661811],[-0.684677,-0.457897,-0.567052],[-0.895082,0.44551,-0.018689],[-0.257967,0.932849,-0.251488],[-0.128631,0.963233,-0.235872],[-0.145999,0.969653,-0.196103],[-0.642829,0.756652,-0.119365],[-0.268793,0.785154,-0.557927],[-0.438189,0.483129,-0.758008],[-0.541127,-0.825617,0.159805],[-0.667576,-0.700135,0.253285],[-0.569273,-0.808295,0.15029],[-0.48813,-0.865661,0.11118],[-0.148798,0.975686,0.160922],[-0.174237,0.984096,0.034597],[-0.203592,0.979026,0.007694],[-0.944234,-0.322423,0.066824],[-0.493884,0.194926,0.847397],[-0.778394,0.140578,0.611834],[-0.388001,0.763244,0.516637],[-0.478102,0.759176,0.441669],[-0.597677,-0.797357,0.083693],[-0.7041,0.710064,0.007209],[-0.80942,0.57817,0.102758],[-0.23971,0.961708,0.132882],[-0.106381,0.986397,0.125316],[-0.394888,0.196626,0.897442],[-0.913361,-0.033442,0.405776],[-0.140164,0.959904,0.242772],[-0.558134,-0.824933,0.089287],[-0.322657,0.504931,0.800586],[-0.162198,0.985491,-0.049983],[-0.186281,0.982486,-0.004566],[-0.864715,0.002384,-0.502257],[-0.917114,-0.17421,-0.358543],[-0.586633,0.654448,-0.477032],[-0.488259,0.469185,-0.735845],[0.853401,0.249417,-0.457709],[-0.467613,0.16412,-0.868564],[-0.458501,0.420066,-0.783148],[-0.590106,-0.78523,-0.187585],[-0.559226,-0.821651,-0.110256],[0.820471,-0.554328,-0.139811],[0.829437,-0.544806,-0.123372],[-0.461912,-0.095174,-0.881804],[0.863911,0.178592,-0.470917],[0.862209,0.002474,0.506547],[-0.537412,-0.771427,-0.340717],[0.826819,-0.4468,-0.341672],[0.819313,-0.573,-0.019944],[-0.204168,0.246403,-0.947418],[-0.330447,0.072008,-0.941074],[-0.461002,0.19431,-0.865864],[-0.357369,0.754764,-0.550108],[-0.516163,-0.490472,-0.702149],[0.798491,0.045028,-0.60032],[0.404544,0.79162,-0.457911],[-0.500596,0.841084,0.204893],[-0.527298,0.8489,0.036404],[0.877211,0.475236,0.068201],[0.85288,0.446919,0.269924],[-0.556311,-0.452671,0.696855],[-0.471244,-0.087837,0.877618],[0.822295,-0.432636,0.369671],[0.720369,-0.693338,-0.01873],[0.9916,-0.129315,0.002646],[-0.554365,0.682216,0.476719],[-0.453932,0.858093,0.240047],[-0.498947,0.717282,0.486373],[-0.525491,-0.776707,0.347254],[-0.470893,-0.501757,0.725603],[-0.566074,-0.74714,0.348343],[0.949963,-0.262843,-0.168772],[-0.082222,0.51808,0.851371],[-0.562938,0.46419,0.683834],[-0.445004,-0.871968,-0.204068],[-0.636654,-0.752764,-0.167386],[-0.789941,-0.59777,-0.136621],[-0.589497,-0.7365,-0.331754],[-0.494342,0.868455,-0.037576],[-0.449605,0.86841,-0.209091],[-0.524364,0.82011,-0.229045],[-0.323262,0.945363,-0.042316],[0.999525,0.028789,0.010998],[0.999449,0.033177,0],[0.988349,0.152207,0],[0.870777,0.491315,-0.01891],[-0.497177,-0.469054,-0.729933],[-0.200905,0.092399,0.975243],[-0.318038,0.248122,0.915034],[-0.44551,0.126784,0.886254],[-0.319713,0.458924,0.828959],[-0.632744,-0.75273,0.181751],[-0.601248,-0.775018,0.194546],[-0.766447,-0.62372,0.153404],[-0.501648,0.195292,0.84274],[-0.29829,0.953062,0.051923],[0.833199,-0.552509,0.022654],[0.818573,-0.264389,0.509938],[-0.575521,-0.808933,0.120013],[0.834992,-0.538895,0.111273],[0.826063,-0.563501,-0.009292],[-0.411029,-0.083398,0.907799],[-0.589655,-0.798714,0.119845],[-0.575256,-0.808549,-0.123812],[-0.389759,-0.095471,-0.915955],[-0.425517,-0.882157,0.201828],[-0.479971,-0.875078,0.062172],[-0.531066,-0.84272,0.08827],[-0.520466,-0.853848,-0.007583],[-0.481232,-0.876592,0.001506],[-0.92372,-0.336726,0.182638],[-0.871592,-0.470179,0.138779],[-0.4872,-0.869763,-0.078412],[-0.539434,-0.836766,-0.093987],[-0.575925,-0.798397,-0.175706],[-0.507393,-0.853815,-0.116409],[-0.715024,-0.674792,-0.182747],[-0.866881,-0.462233,-0.186704],[-0.961138,-0.257236,-0.100219],[-0.56945,-0.806293,-0.160057],[-0.557127,-0.824756,-0.096883],[-0.686377,-0.72416,-0.066922],[-0.687659,-0.713679,-0.133367],[-0.562504,-0.774241,-0.290069],[-0.694102,-0.679646,-0.237283],[-0.941335,-0.307448,-0.139152],[-0.746616,-0.660381,-0.080383],[-0.997016,-0.077189,0.000719],[-0.852594,-0.502434,-0.14368],[-0.762635,-0.637688,0.108358],[-0.619101,-0.763928,-0.182008],[-0.528245,-0.839436,-0.127688],[-0.580529,-0.805546,-0.118668],[-0.950234,-0.307244,-0.051545],[-0.944192,-0.32228,-0.068094],[-0.639051,0.766726,-0.061202],[-0.736619,0.577094,0.352639],[-0.926941,-0.058334,0.370645],[-0.499855,-0.210205,0.840214],[-0.410481,-0.007727,0.911837],[-0.854927,0.22108,0.46928],[-0.882124,0.107924,0.458487],[-0.283897,0.232784,0.930169],[-0.299395,0.427108,0.853195],[-0.662132,0.739724,0.119956],[-0.666025,0.722648,0.184908],[-0.764842,-0.185005,0.617082],[-0.528787,-0.494795,0.68961],[-0.948448,-0.072576,-0.30851],[-0.390609,-0.145806,-0.908936],[-0.615663,-0.311186,-0.723963],[-0.978712,-0.111101,-0.172567],[-0.626133,-0.445317,-0.640039],[-0.878317,-0.068033,-0.473214],[-0.663102,0.748078,0.025972],[-0.883035,0.026744,-0.468544],[-0.262479,0.081869,-0.961458],[-0.944685,-0.27472,0.179163],[-0.859143,-0.492277,0.139774],[-0.700075,0.213312,0.681464],[-0.446159,0.030621,0.89443],[-0.45657,-0.056089,0.887918],[-0.835687,0.326851,0.441356],[-0.267976,0.595054,0.757694],[-0.957299,-0.106068,0.268939],[-0.440793,-0.385895,0.810424],[-0.689389,-0.448278,0.569026],[-0.988917,-0.092603,0.116052],[-0.662147,0.739353,-0.122145],[-0.933395,0.003526,0.358833],[-0.827533,0.364449,-0.427044],[-0.841147,0.260415,-0.473979],[-0.863158,0.150658,-0.481934],[-0.976742,-0.094763,-0.192342],[-0.695774,0.570317,0.43662],[-0.750218,-0.659578,0.046155],[-0.410957,0.044561,0.910565],[-0.316088,0.432018,-0.844659],[-0.360432,0.248341,-0.899119],[-0.282621,0.587862,-0.757987],[-0.58408,-0.322715,-0.744786],[-0.586978,-0.804387,-0.09175],[0.750004,-0.652062,0.11095],[0.231306,-0.964531,0.127192],[0.896721,0.310423,0.315483],[0.906019,0.103383,0.410416],[0.420394,0.898863,0.12375],[0.880432,0.474076,-0.009541],[0.633788,0.773019,0.02746],[0.871635,0.433387,-0.228973],[0.878622,0.473214,-0.063969],[0.632725,-0.761443,0.140936],[0.85713,-0.401833,-0.322271],[-0.142637,-0.982769,-0.117561],[0.997935,0.028175,0.057728],[0.743416,-0.66441,0.076765],[0.964971,-0.225945,0.133345],[0.23888,0.491709,-0.837353],[-0.134711,-0.984423,0.112983],[0.924213,-0.229963,-0.304872],[0.769517,-0.52917,0.357524],[0.799553,0.014534,0.600419],[0.877022,0.480065,0.019228],[0.309577,0.765102,0.564607],[0.274603,0.956586,-0.097653],[0.877062,-0.190849,-0.44084],[0.752037,-0.652568,-0.092712],[-0.606962,-0.77681,-0.167818],[-0.685301,-0.625924,-0.372266],[-0.830204,-0.06539,-0.553612],[-0.370525,0.02543,-0.928474],[-0.705237,0.131095,-0.696746],[-0.938417,-0.152743,-0.309908],[-0.704187,0.43679,-0.559763],[-0.626442,-0.263985,-0.733405],[-0.750287,-0.660709,-0.023077],[-0.71095,-0.696033,0.100441],[-0.667229,0.703403,-0.245009],[0.481118,0.868794,0.117147],[0.310342,0.911797,-0.268914],[0.618902,0.755098,-0.216303],[0.418627,0.737418,0.530062],[0.618902,0.755098,-0.216303],[0.418628,0.737416,0.530064],[0.481116,0.868795,0.117145],[0.310343,0.911797,-0.268912],[-0.145991,0.846293,-0.512323],[0.020588,0.95036,-0.310471],[-0.146148,0.845926,-0.512884],[0.618963,0.754988,-0.216515],[-0.016021,0.869537,-0.493608],[0.418622,0.736596,0.531208],[-0.289828,0.935184,0.203544],[0.311821,0.90021,0.303956],[0.363733,0.813845,0.453161],[-0.146437,0.845201,-0.513995],[0.619095,0.754755,-0.216946],[-0.049324,0.776176,-0.628584],[0.045689,0.923237,-0.381504],[-0.146592,0.844835,-0.514552],[0.619161,0.75464,-0.217159],[-0.011959,0.840131,-0.542251],[0.418636,0.735332,0.532946],[-0.290109,0.934964,0.204154],[0.283512,0.901038,0.328254],[0.330248,0.762477,0.556385],[-0.146895,0.84409,-0.515687],[0.619296,0.754404,-0.217595],[-0.006409,0.89716,-0.441659],[-0.042008,0.86727,-0.496063],[0.418643,0.734478,0.534116],[-0.290302,0.934816,0.204558],[0.279421,0.835051,0.473935],[0.34392,0.790042,0.507497],[-0.147211,0.843347,-0.516812],[0.619443,0.754157,-0.218032],[0.063345,0.949231,-0.308135],[-0.005735,0.903099,-0.429395],[-0.147351,0.842976,-0.517376],[0.619488,0.75406,-0.218239],[-0.142627,0.981871,-0.124844],[0.99959,0.024091,-0.015467],[0.449006,0.875662,-0.177789],[0.659658,0.748614,-0.066543],[0.662005,0.749362,-0.014349],[0.662922,0.748684,0.002535],[0.661034,0.749913,0.025787],[0.657734,0.747767,0.09072],[0.652735,0.729788,0.20334],[0.680675,0.427539,0.594889],[0.525471,-0.410811,0.74506],[0.719821,-0.685181,0.111287],[0.602843,-0.793174,0.086346],[0.611227,-0.790687,0.03486],[0.614112,-0.78872,0.028076],[0.613163,-0.789945,0.004312],[0.527757,-0.849395,0],[0.731668,-0.68164,-0.005292],[0.613739,-0.789475,-0.007324],[0.614046,-0.788702,-0.029957],[0.608671,-0.792182,-0.044351],[0.598724,-0.785703,-0.155563],[0.625685,-0.489622,-0.60728],[0.363907,0.413486,-0.834626],[0.019575,0.954695,-0.296943],[-0.145994,0.846291,-0.512326],[-0.048011,0.895614,-0.442233],[-0.146152,0.845923,-0.512888],[0.618962,0.754987,-0.216519],[0.36085,0.822225,0.440151],[0.422052,0.795847,0.434165],[0.41862,0.736593,0.531213],[-0.289829,0.935183,0.203547],[0.019434,0.954433,-0.297792],[0.019958,0.921723,-0.387335],[-0.146436,0.845202,-0.513994],[0.619096,0.754756,-0.216943],[-0.041437,0.837721,-0.544523],[-0.146594,0.84483,-0.51456],[0.619162,0.754638,-0.217162],[0.256375,0.520606,0.814396],[0.302654,0.591908,0.747025],[0.418631,0.735334,0.532946],[-0.29011,0.934964,0.204153],[0.055042,0.958399,-0.280073],[-0.042005,0.867273,-0.496057],[-0.146897,0.844092,-0.515683],[0.619294,0.754405,-0.217596],[0.275628,0.826033,0.491629],[0.294333,0.699161,0.651569],[0.41864,0.734477,0.53412],[-0.290304,0.934816,0.204557],[0.020865,0.937456,-0.347477],[-0.005739,0.903097,-0.429398],[-0.147209,0.843345,-0.516816],[0.619444,0.754156,-0.218031],[-0.142626,0.981872,-0.124842],[-0.147357,0.842975,-0.517377],[0.619486,0.75406,-0.218243],[0.004893,0.9139,0.40591],[0.302293,0.589578,0.74901],[0.418633,0.733636,0.53528],[-0.290499,0.934666,0.204965],[0.418638,0.734053,0.534704],[-0.290421,0.934735,0.204759],[-0.147038,0.843724,-0.516245],[0.619374,0.754278,-0.217809],[0.418631,0.734903,0.533541],[-0.290215,0.934887,0.204357],[-0.146732,0.844465,-0.51512],[0.619226,0.754525,-0.217374],[0.237088,0.825752,0.511784],[0.418628,0.735757,0.532364],[-0.290031,0.935033,0.203949],[0.418628,0.736173,0.531789],[-0.28993,0.935109,0.203746],[-0.146281,0.845568,-0.513437],[0.619018,0.754881,-0.21673],[0.309857,0.90388,0.29494],[0.418624,0.737004,0.53064],[-0.289762,0.935247,0.203351],[-0.289661,0.935323,0.203146],[0.418627,0.73364,0.535278],[-0.290501,0.934666,0.20496],[0.004891,0.913901,0.405909],[0.302294,0.589571,0.749015],[0.418641,0.734048,0.534709],[-0.29042,0.934734,0.204763],[-0.147042,0.843721,-0.516249],[0.619374,0.754277,-0.217813],[0.418628,0.734908,0.533536],[-0.290215,0.934888,0.204353],[-0.146733,0.844468,-0.515115],[0.619225,0.754526,-0.217371],[0.418625,0.735756,0.532368],[-0.290033,0.935033,0.203948],[0.281404,0.897181,0.340407],[0.418628,0.736172,0.53179],[-0.28993,0.935108,0.20375],[-0.146284,0.845565,-0.51344],[0.619018,0.754881,-0.21673],[0.418622,0.737003,0.530644],[-0.289764,0.935246,0.20335],[0.31177,0.900522,0.303083],[-0.28966,0.935322,0.20315],[0.995718,0.00524,0.092293],[0.322609,-0.442897,0.83652],[0.598729,-0.785699,0.155562],[0.726794,-0.686455,0.023466],[0.611306,-0.790626,0.034862],[0.614176,-0.78867,0.028076],[0.613159,-0.789948,0.004312],[0.612467,-0.790496,0.000134],[0.612746,-0.790268,-0.004314],[0.61368,-0.789521,-0.007325],[0.613972,-0.788759,-0.029957],[0.608668,-0.792185,-0.044351],[0.598723,-0.785704,-0.155562],[0.625688,-0.489621,-0.607277],[0.572659,0.350108,-0.741273],[0.77648,0.620043,-0.112359],[0.566571,0.806918,-0.166978],[0.783802,0.620756,-0.017758],[0.661998,0.749368,-0.014349],[0.662947,0.748662,0.002535],[0.661072,0.749879,0.025787],[0.657759,0.747746,0.09072],[0.443399,0.864956,0.235051],[-0.098598,-0.90046,-0.423615],[-0.089366,-0.561794,-0.822436],[-0.029504,-0.555224,-0.831177],[-0.049932,-0.898683,-0.435747],[-0.183814,-0.95641,-0.22692],[-0.205196,-0.888775,-0.409845],[-0.082557,-0.968358,-0.235516],[-0.190533,-0.512006,-0.837584],[-0.040955,0.961074,-0.273239],[-0.071576,0.810934,-0.580743],[-0.13549,0.069888,-0.988311],[-0.117288,0.264181,-0.957315],[-0.053206,-0.976788,-0.207496],[-0.117414,-0.96729,-0.224863],[-0.055689,-0.967201,-0.247831],[-0.323218,0.584338,-0.744365],[-0.678055,-0.2526,-0.690243],[-0.100833,0.080481,-0.991643],[-0.088953,-0.072873,-0.993366],[-0.007916,0.999761,-0.020359],[-0.007464,0.996088,-0.088051],[-0.017768,0.996863,-0.077127],[-0.026298,0.958638,-0.283409],[-0.026861,0.812163,-0.582812],[-0.007743,0.958938,-0.283511],[0.039305,0.951593,-0.304836],[0.017222,0.746809,-0.664816],[-0.048985,-0.980012,-0.192811],[-0.048938,-0.99244,-0.112551],[-0.054913,-0.992251,-0.111455],[-0.009003,-0.187018,-0.982315],[-0.029276,-0.55349,-0.832341],[-0.008631,-0.169462,-0.985499],[0.070496,0.806319,-0.587265],[0.046444,0.535659,-0.843157],[0.033394,0.540104,-0.840936],[0.052258,0.836552,-0.545389],[0.134444,0.962431,-0.235903],[0.117484,0.838311,-0.532384],[0.084509,0.959859,-0.267448],[-0.022496,-0.973838,-0.226126],[-0.021064,-0.9833,-0.180769],[-0.048968,-0.969382,-0.240624],[0.016492,0.164135,-0.9863],[0.050241,0.267983,-0.962113],[0.008737,-0.109774,-0.993918],[-0.001603,-0.069761,-0.997562],[0.144125,0.878052,-0.456348],[0.113386,0.66371,-0.739346],[0.085125,0.589666,-0.803149],[-0.005391,-0.983077,-0.183111],[-0.007454,-0.970529,-0.240869],[-0.023876,-0.992173,-0.122569],[0.020693,-0.987689,-0.155054],[0.025606,-0.986109,-0.164114],[-0.004471,-0.980358,-0.197178],[0.074805,0.328005,-0.94171],[0.019556,-0.168797,-0.985457],[0.021724,-0.141824,-0.989654],[0.063468,0.272376,-0.960095],[0.161999,0.978717,-0.125977],[0.157275,0.968379,-0.193667],[0.160363,0.986347,-0.037469],[0.247886,-0.960799,-0.124164],[0.814252,-0.518357,-0.261343],[0.013816,-0.925561,-0.378345],[0.07559,-0.983971,-0.161518],[0.091855,-0.991767,-0.089223],[0.006148,-0.957596,-0.288049],[0.028611,-0.261693,-0.964727],[0.000768,-0.686203,-0.727409],[0.163482,0.98243,-0.090027],[0.154747,0.925155,-0.346614],[0.152084,0.916345,-0.370382],[0.051254,-0.854679,-0.516621],[0.13559,0.846946,-0.514099],[-0.023506,-0.989224,-0.144508],[-0.017765,-0.987248,-0.158198],[-0.009899,-0.945147,-0.326494],[-0.02547,-0.997749,-0.062034],[-0.018557,-0.97392,0.226132],[-0.022107,-0.987793,0.154194],[-0.027442,-0.997508,0.065004],[-0.019158,-0.997454,0.068694],[-0.010175,-0.948944,0.315282],[0.16264,0.982737,0.088178],[0.154834,0.952127,0.263592],[0.136083,0.84446,0.518042],[0.073832,0.328298,0.941684],[0.02791,-0.230989,0.972556],[0.045915,-0.779964,0.624137],[0.614317,-0.789058,0.001318],[0.886371,-0.462975,-0.000569],[0.129594,0.746812,0.652286],[0.068784,0.29445,0.953188],[0.017488,-0.214313,0.976609],[0.007201,-0.683862,0.729576],[0.22035,-0.967132,0.126893],[0.020217,-0.984775,0.172652],[0.012056,-0.934545,0.35564],[-0.001681,-0.97995,0.199238],[-0.007665,-0.972001,0.234853],[0.154073,0.921436,0.356676],[0.163114,0.980706,0.107747],[0.157251,0.971802,0.175708],[0.144678,0.885569,0.441402],[0.113062,0.662401,0.740569],[0.059239,0.235285,0.97012],[0.022581,-0.98709,0.158568],[0.011864,-0.949843,0.312503],[-0.008484,-0.926526,0.376136],[-0.004152,-0.979922,0.199339],[-0.021478,-0.97355,0.227462],[-0.022906,-0.98051,0.195132],[0.160259,0.986567,0.031656],[0.139325,0.989426,0.040309],[0.135058,0.966282,0.219224],[0.020746,-0.158233,0.987184],[0.033518,0.133161,0.990528],[0.01137,-0.159915,0.987065],[0.006051,-0.046937,0.99888],[-0.000821,-0.153672,0.988122],[-0.022116,-0.908362,0.417598],[-0.010112,-0.576151,0.817281],[-0.027267,-0.555752,0.830901],[-0.045284,-0.899101,0.435393],[-0.028666,-0.999587,0.001806],[-0.025347,-0.992906,0.116171],[-0.048406,-0.992343,0.113634],[-0.048657,-0.998815,0.000579],[0.083125,0.583716,0.807692],[0.117657,0.843885,0.523465],[0.067154,0.808932,0.584055],[0.042259,0.531875,0.845768],[0.016634,0.219753,0.975414],[0.029844,0.491993,0.870087],[0.011174,0.180238,0.98356],[-0.030614,-0.553494,0.83229],[-0.049683,-0.899514,0.434059],[-0.053942,-0.990474,0.126693],[-0.056497,-0.998399,-0.002774],[-0.004963,0.958898,0.283708],[-0.03722,0.769942,0.637028],[0.015682,0.811153,0.584624],[0.036828,0.959064,0.280785],[-0.017212,0.997782,0.0643],[-0.04218,0.957993,0.283672],[-0.026202,0.958679,0.283279],[-0.002259,0.996588,0.082504],[-0.000534,0.999769,0.021472],[-0.381368,-0.541125,0.749495],[-0.635112,0.341728,0.692715],[-0.095234,-0.102885,0.990124],[-0.095122,0.055586,0.993912],[-0.081419,-0.972976,0.216075],[-0.056459,-0.980152,0.190037],[-0.05353,-0.970164,0.236465],[-0.116645,-0.966196,0.229913],[-0.126082,0.080731,0.988729],[-0.133665,0.262053,0.955752],[-0.112291,0.470113,0.875434],[-0.089098,0.420194,0.90305],[-0.2001,-0.979775,-0.000479],[-0.202177,-0.96962,0.137703],[-0.185755,-0.512328,0.83846],[-0.144363,-0.063883,0.987461],[-0.069794,0.275752,0.958692],[-0.065617,0.423099,0.903705],[-0.099497,-0.984387,0.1452],[-0.100588,-0.994924,-0.002945],[-0.028766,-0.179847,0.983274],[-0.089472,-0.559455,0.824017],[-0.0103,-0.186941,0.982317],[-0.100781,-0.901489,0.420905],[-0.204517,-0.890173,0.407142],[-0.216483,-0.950778,0.221714],[-0.084547,0.772937,0.628824],[-0.184598,-0.957424,0.221951],[0.179879,0.499144,0.847643],[0.042161,0.997081,0.063656],[0.011587,0.999551,0.027619],[0.00557,0.996057,0.088542],[0.002301,0.507622,0.861577],[-0.071391,0.561518,0.824379],[-0.073271,0.59789,0.798222],[-0.048583,-0.979946,0.193251],[0.049187,0.779067,0.625009],[0.08267,0.962285,0.259177],[0.139255,0.989178,-0.04621],[0.000377,-0.617918,0.786243],[-0.021504,-0.99976,0.004198],[-0.026402,-0.999648,0.002719],[0.090655,-0.991423,0.09414],[0.076933,-0.98072,0.179638],[-0.017765,-0.987248,0.158198],[-0.018025,-0.979635,-0.199974],[-0.024951,-0.997509,-0.06598],[0.542654,-0.747178,-0.383734],[0.73401,-0.679132,-0.00288],[0.064467,0.27691,-0.958731],[0.226769,-0.971661,-0.066713],[0.870053,-0.492927,0.005521],[0.128098,0.745203,-0.654418],[-0.009692,-0.931523,-0.363553],[-0.000132,-0.610653,-0.791898],[-0.010871,-0.570073,-0.821522],[-0.024349,-0.911448,-0.410694],[-0.046945,-0.899875,-0.433614],[0.088067,0.994732,-0.052457],[0.059697,0.969564,-0.23745],[-0.002434,-0.046428,-0.998919],[-0.073027,0.556505,-0.827629],[-0.060963,0.601929,-0.796219],[-0.060972,0.412768,-0.908793],[-0.101253,0.402862,-0.909643],[-0.008023,0.502148,-0.864744],[0.037543,0.998117,-0.048501],[0.001884,0.996547,-0.083005],[0.008409,0.999722,-0.022038],[0.374297,0.221248,-0.900528],[-0.161306,-0.099083,-0.981918],[-0.217561,-0.951639,-0.216909],[-0.075257,0.264436,-0.961462],[-0.104761,0.538232,-0.83626],[-0.058179,-0.193453,-0.979383],[-0.202263,-0.969284,-0.139922],[-0.099534,-0.986411,-0.130717],[-0.019267,0.200244,-0.979557],[-0.012709,-0.05963,-0.99814],[0.102836,-0.5218,-0.846847],[-0.063599,0.769769,-0.635146],[0.010812,0.183454,-0.982969],[0.536945,-0.810927,-0.232566],[0.535699,-0.827766,0.166824],[0.679935,-0.731576,0.04985],[-0.048407,-0.969317,0.241002],[0.087473,0.994943,0.049363],[-0.003537,-0.067433,0.997718],[0.062868,0.996586,-0.053508],[0.063007,0.996634,0.052455],[-0.057817,0.811633,0.5813],[0.363767,-0.269791,0.891564],[-0.025325,-0.047777,0.998537],[-0.022571,0.147377,0.988823],[0.060577,0.960551,0.271426],[0.814252,-0.518358,0.261341],[0.437794,-0.812254,0.385462],[-0.049683,-0.899514,0.434058],[-0.030614,-0.553493,0.832291],[-0.09651,-0.515483,0.851448],[-0.100781,-0.901489,0.420904],[-0.116645,-0.966196,0.229912],[-0.204517,-0.890173,0.407142],[-0.216482,-0.950778,0.221712],[-0.193743,-0.556197,0.808151],[-0.084552,0.772937,0.628824],[-0.04218,0.957993,0.283671],[-0.067537,0.277001,0.958493],[-0.095138,0.055586,0.993911],[-0.029932,0.10901,0.99359],[-0.003537,-0.067447,0.997717],[-0.025359,-0.047767,0.998537],[-0.028793,-0.179843,0.983274],[-0.0103,-0.18695,0.982315],[-0.126082,0.080707,0.988731],[0.363759,-0.269781,0.89157],[-0.381353,-0.541122,0.749504],[-0.089087,0.420187,0.903054],[-0.073273,0.597877,0.798232],[-0.104787,0.499517,0.859943],[-0.057821,0.811633,0.5813],[-0.026199,0.95868,0.283277],[0.031766,0.967744,0.249924],[0.044371,0.99703,0.062945],[0.00557,0.996057,0.088543],[-0.004961,0.958898,0.283706],[-0.053942,-0.990474,0.126693],[-0.056497,-0.998399,-0.002774],[-0.048657,-0.998815,0.000579],[-0.048406,-0.992343,0.113634],[-0.045284,-0.899101,0.435393],[-0.027267,-0.55575,0.830902],[0.029844,0.491995,0.870086],[0.013803,0.221834,0.974987],[0.016634,0.219753,0.975414],[0.04226,0.531878,0.845766],[0.067154,0.808933,0.584052],[0.083126,0.583717,0.807691],[0.117657,0.843885,0.523465],[-0.048584,-0.979947,0.193246],[-0.025347,-0.992906,0.116171],[-0.022906,-0.98051,0.19513],[-0.007432,-0.17711,0.984163],[-0.010111,-0.576147,0.817283],[0.009616,-0.152623,0.988238],[0.033697,0.169144,0.985015],[0.059239,0.235281,0.97012],[0.113062,0.662402,0.740568],[-0.028666,-0.999587,0.001806],[-0.026402,-0.999648,0.00272],[-0.027442,-0.997508,0.065004],[-0.022116,-0.908363,0.417598],[-0.008484,-0.926526,0.376136],[0.000377,-0.617917,0.786243],[0.020746,-0.158233,0.987184],[0.007201,-0.683863,0.729575],[0.017488,-0.214315,0.976608],[0.068786,0.294454,0.953187],[0.129594,0.746814,0.652284],[-0.021504,-0.99976,0.004199],[-0.019158,-0.997454,0.068694],[0.022581,-0.987089,0.158575],[0.018457,-0.977713,0.209134],[0.253245,-0.960552,0.11492],[0.090655,-0.991423,0.094141],[0.073284,-0.976939,0.200549],[0.0592,-0.833149,0.549871],[0.154073,0.921436,0.356676],[0.136083,0.844459,0.518045],[0.154834,0.952127,0.263591],[0.16338,0.981253,0.102223],[0.163012,0.983137,0.082881],[0.614317,-0.789058,0.001318],[0.073832,0.328302,0.941683],[0.001676,-0.945079,0.326837],[-0.011133,-0.92035,0.390936],[0.437793,-0.812253,0.385463],[-0.01628,-0.971303,0.237289],[-0.024205,-0.993957,0.10707],[0.426537,-0.902409,-0.061026],[-0.024951,-0.997509,-0.06598],[-0.018503,-0.981849,-0.18876],[0.536948,-0.810928,-0.232558],[0.010815,-0.950615,-0.310185],[-0.00651,-0.90549,-0.424319],[-0.01628,-0.971303,-0.237288],[-0.025451,-0.994159,-0.104879],[0.156894,0.941699,-0.297635],[0.164542,0.981124,-0.101593],[0.13559,0.846946,-0.5141],[0.051254,-0.854678,-0.516622],[0.028612,-0.261697,-0.964726],[0.091855,-0.991767,-0.089219],[0.07559,-0.983971,-0.161518],[0.529716,-0.848167,-0.003632],[0.948893,-0.315598,0],[0.161417,0.977378,-0.136664],[0.128098,0.7452,-0.654421],[0.152084,0.916345,-0.370382],[0.006148,-0.957596,-0.28805],[0.000768,-0.686203,-0.72741],[0.025606,-0.98611,-0.164109],[0.020693,-0.98769,-0.155052],[0.247886,-0.9608,-0.124163],[-0.02547,-0.997749,-0.062033],[0.113386,0.663711,-0.739345],[0.144125,0.87805,-0.456352],[-0.009692,-0.931523,-0.363554],[-0.000133,-0.610653,-0.791899],[-0.022496,-0.973838,-0.226127],[-0.02435,-0.911448,-0.410695],[-0.004471,-0.980357,-0.197183],[0.139255,0.989178,-0.04621],[0.139325,0.989426,0.040308],[0.160259,0.986567,0.031656],[0.160363,0.986347,-0.037469],[0.043199,0.223406,-0.973768],[0.085125,0.589664,-0.80315],[0.063468,0.272376,-0.960095],[-0.029276,-0.553493,-0.832339],[-0.009003,-0.187021,-0.982315],[0.009353,-0.125408,-0.992061],[-0.010871,-0.570076,-0.82152],[-0.048938,-0.99244,-0.11255],[-0.048985,-0.980012,-0.192814],[-0.021064,-0.983299,-0.180772],[-0.023876,-0.992173,-0.122569],[0.070496,0.806317,-0.587268],[0.084509,0.95986,-0.267446],[0.134444,0.962432,-0.235902],[0.117484,0.838309,-0.532387],[0.031021,0.497563,-0.866873],[0.050301,0.824134,-0.564156],[0.046443,0.535657,-0.843157],[-0.029504,-0.555226,-0.831176],[-0.008631,-0.169464,-0.985499],[-0.054913,-0.992251,-0.111455],[-0.053206,-0.976787,-0.2075],[-0.058684,0.411085,-0.909706],[-0.107387,0.389845,-0.914597],[-0.07302,0.556511,-0.827625],[-0.060954,0.601925,-0.796223],[-0.026865,0.812164,-0.58281],[0.023861,0.77317,-0.63375],[-0.013577,0.537392,-0.843223],[0.001884,0.996547,-0.083004],[0.021735,0.999682,-0.012792],[0.036425,0.997587,-0.059106],[-0.082519,-0.048315,-0.995418],[-0.15763,-0.116559,-0.980595],[0.374307,0.22125,-0.900524],[-0.323219,0.584334,-0.744367],[-0.183814,-0.95641,-0.22692],[-0.082557,-0.968357,-0.235517],[-0.117414,-0.96729,-0.224864],[-0.217561,-0.951639,-0.216912],[-0.117286,0.264195,-0.957311],[-0.054142,0.282387,-0.957772],[-0.100827,0.080494,-0.991642],[-0.135491,0.069888,-0.988311],[-0.040958,0.961074,-0.273238],[-0.071572,0.810935,-0.580743],[-0.202263,-0.969284,-0.139923],[-0.100588,-0.994924,-0.002945],[-0.099534,-0.986411,-0.130716],[-0.089365,-0.561796,-0.822435],[-0.070187,-0.201428,-0.976985],[-0.049932,-0.898683,-0.435747],[-0.098598,-0.90046,-0.423615],[-0.205196,-0.888775,-0.409845],[-0.199141,-0.555768,-0.807133],[-0.017769,0.996863,-0.077128],[-0.055689,-0.9672,-0.247835],[-0.67805,-0.252595,-0.690249],[-0.007467,0.996088,-0.088051],[-0.007916,0.999761,-0.020359],[-0.026299,0.958638,-0.283411],[0.060041,0.959815,-0.274137],[0.062868,0.996586,-0.053508],[0.088067,0.994732,-0.052457],[-0.048968,-0.969381,-0.240629],[-0.002434,-0.046428,-0.998919],[-0.000685,-0.059694,-0.998217],[0.01812,0.193149,-0.981002],[0.021724,-0.141825,-0.989653],[0.157275,0.968379,-0.193667],[-0.005391,-0.983077,-0.183114],[-0.005991,-0.979895,-0.199426],[0.875365,-0.437648,-0.205428],[0.019556,-0.168796,-0.985457],[0.074805,0.328,-0.941711],[0.064467,0.276914,-0.95873],[-0.00624,-0.981344,0.192161],[0.011864,-0.949843,0.312502],[0.700232,-0.662569,0.265851],[0.157251,0.971802,0.175706],[-0.004152,-0.979922,0.199339],[-0.001681,-0.97995,0.199235],[0.144678,0.885569,0.441402],[0.000526,-0.040365,0.999185],[-0.05353,-0.970165,0.236461],[-0.048407,-0.969317,0.240999],[0.062213,0.997446,0.035097],[0.060698,0.952693,0.297811],[0.082669,0.962285,0.259177],[0.087473,0.994943,0.049363],[-0.001277,0.550909,0.834564],[-0.071402,0.561507,0.824385],[-0.046701,0.405412,0.91294],[-0.143067,-0.085749,0.985991],[0.179874,0.499141,0.847646],[-0.184598,-0.957424,0.22195],[-0.089749,-0.082748,0.992521],[-0.01721,0.997782,0.064301],[-0.099497,-0.984387,0.1452],[-0.081419,-0.972976,0.216074],[-0.202177,-0.96962,0.137703],[-0.13492,0.270192,0.953306],[-0.056459,-0.980153,0.190034],[-0.635108,0.341729,0.692719],[-0.002258,0.996588,0.082505],[-0.000534,0.999769,0.021472],[0.023619,0.828481,0.559519],[-0.037219,0.769942,0.637028],[0.046889,0.756659,0.652126],[0.135058,0.966281,0.219225],[-0.021478,-0.973551,0.22746],[0.027911,-0.230992,0.972555],[-0.046945,-0.899875,-0.433615],[0.010812,0.183458,-0.982968],[0.035529,0.958357,-0.283354],[-0.00774,0.958937,-0.283513],[0.10284,-0.521804,-0.846844],[-0.030446,0.152634,-0.987814],[-0.012699,-0.059634,-0.99814],[-0.2001,-0.979775,-0.000478],[0.02434,0.999569,0.016384],[-0.097038,0.573011,-0.813783],[-0.063592,0.76977,-0.635146],[0.680161,-0.733011,0.008692],[0.679935,-0.731576,0.04985],[-0.018897,-0.976914,0.212794],[0.535699,-0.827766,0.166822],[0.436869,-0.790705,-0.428873],[0.191358,-0.648956,0.736368],[0.696639,0.33485,0.634484],[-0.368503,0.727374,0.578907],[-0.912094,-0.383528,0.144882],[0.39217,0.218489,0.893569],[0.125679,-0.519561,0.84514],[-0.391618,-0.538263,0.746263],[0.36365,-0.269809,0.891606],[-0.326562,0.584817,-0.742527],[0.392057,0.21853,-0.893608],[0.263741,0.620031,-0.73892],[-0.85379,0.500481,-0.143389],[-0.641374,0.341718,-0.686927],[-0.39122,-0.538348,-0.746411],[0.183441,0.499367,-0.846748],[-0.641374,0.34174,-0.686916],[-0.85379,0.500479,-0.143401],[-0.450498,-0.676071,-0.583078],[-0.678171,-0.25252,-0.690158],[-0.326541,0.584804,-0.742546],[0.696639,0.33485,0.634484],[0.191358,-0.648956,0.736368],[0.363648,-0.269825,0.891602],[0.183073,0.499485,0.846758],[0.125659,-0.519554,0.845147],[-0.678046,-0.252596,0.690252],[-0.368502,0.727376,0.578904],[-0.912095,-0.383531,0.144869],[0.39217,0.218477,0.893572],[-0.39164,-0.538273,0.746245],[0.263741,0.620031,-0.73892],[0.392057,0.218514,-0.893612],[-0.39122,-0.538352,-0.746408],[0.183421,0.499362,-0.846755],[-0.678179,-0.252537,-0.690143],[-0.450498,-0.676074,-0.583075],[0.183073,0.499485,0.846758],[-0.678044,-0.252614,0.690248],[-0.326131,0.584831,0.742705],[-0.641518,0.341667,0.686818],[0.125296,-0.519626,-0.845157],[0.649544,-0.424827,-0.630567],[0.36377,-0.26979,-0.891563],[0.363769,-0.269801,-0.89156],[0.649544,-0.424827,-0.630567],[0.125296,-0.519626,-0.845157],[-0.641524,0.341685,0.686803],[-0.326131,0.584831,0.742705],[-0.911222,0.402825,0.086064],[-0.751834,-0.617491,0.231194],[-0.825221,0.548592,-0.134377],[-0.882235,0.384953,-0.271059],[-0.82108,0.523906,0.226606],[-0.783181,-0.376459,0.49488],[-0.939083,0.174569,-0.296055],[-0.85462,-0.461458,-0.238079],[-0.760347,0.371654,-0.532677],[-0.985318,0.049024,0.16354],[-0.837364,-0.037816,0.545337],[-0.771224,0.589101,0.24119],[-0.81083,-0.210502,0.546117],[-0.984075,0.067521,0.164433],[-0.892336,0.061248,-0.447197],[-0.822875,-0.515225,-0.239626],[-0.803154,0.23967,-0.545438],[-0.981892,0.094008,0.164473],[-0.759477,0.081466,0.645413],[-0.812462,-0.211053,0.543473],[-0.761497,0.372401,-0.530509],[-0.809519,-0.209944,0.548273],[-0.729915,0.476428,-0.490143],[-0.711296,0.541981,-0.447565],[-0.904301,-0.116237,0.410765],[-0.905502,-0.377661,-0.193487],[-0.821667,-0.294216,0.48816],[-0.882987,-0.412179,-0.224593],[-0.772485,0.589724,0.235567],[-0.853222,-0.46106,-0.243796],[-0.900126,-0.061506,0.431265],[-0.262123,0.9644,-0.03498],[-0.50427,0.851921,-0.141215],[-0.769335,0.588031,0.249684],[-0.98408,0.067518,-0.164403],[-0.775348,-0.598879,-0.200449],[-0.945808,0.264693,0.188111],[-0.701371,-0.671526,0.239022],[-0.851636,-0.412775,-0.323005],[-0.806701,0.555789,0.200827],[-0.870552,0.046183,-0.489905],[-0.464101,0.78322,-0.413736],[-0.579343,0.582948,0.569679],[-0.719592,0.651274,0.240891],[-0.83975,0.142598,-0.523913],[-0.422643,0.802031,-0.422042],[-0.579676,0.582552,0.569745],[-0.767216,0.586635,0.259305],[-0.805446,0.240348,-0.541747],[-0.3827,0.815518,-0.434132],[-0.646455,0.378505,0.662442],[-0.82287,-0.515235,-0.239622],[-0.812461,-0.211053,0.543473],[-0.449305,-0.779354,0.436729],[-0.674348,-0.385152,-0.63001],[-0.771224,0.589101,0.24119],[-0.761497,0.372401,-0.530509],[-0.339173,0.840652,-0.422214],[-0.651759,0.381281,0.655618],[-0.85462,-0.461458,-0.238079],[-0.809519,-0.209944,0.548273],[-0.445583,-0.77194,0.453392],[-0.709824,-0.220108,-0.669105],[-0.821085,0.5239,0.226604],[-0.729912,0.476439,-0.490137],[-0.311941,0.867312,-0.387895],[-0.728759,0.161469,0.665461],[-0.876616,0.060438,0.47738],[-0.703544,0.664366,0.252277],[-0.558803,0.631131,0.537971],[-0.568666,-0.74645,0.345589],[-0.793657,-0.541606,-0.277076],[-0.857891,-0.028622,0.513034],[-0.526406,-0.761201,0.378774],[-0.642453,-0.477161,-0.599643],[-0.745751,0.600032,0.289513],[-0.789696,0.323276,-0.521414],[-0.36722,0.855764,-0.364441],[-0.616631,0.435621,0.655744],[-0.82793,-0.476759,-0.295353],[-0.833372,-0.154931,0.530553],[-0.480279,-0.787994,0.385225],[-0.677655,-0.284006,-0.678324],[-0.782893,0.552943,0.285187],[-0.786464,0.322269,-0.526894],[-0.363617,0.848612,-0.384239],[-0.670542,0.278646,0.687553],[-0.831982,-0.47972,-0.278702],[-0.806483,-0.293012,0.513546],[-0.438863,-0.81848,0.370795],[-0.682683,-0.286582,-0.672172],[-0.877641,-0.400234,-0.263741],[-0.790552,-0.381588,0.478976],[-0.417514,-0.840899,0.344342],[-0.735504,-0.033696,-0.676682],[-0.880721,-0.401219,-0.2517],[-0.776802,-0.459168,0.430979],[-0.400683,-0.860822,0.31375],[-0.739806,-0.03301,-0.67201],[-0.927138,-0.000744,0.374718],[-0.392259,-0.876887,0.277853],[-0.851646,-0.41277,0.322986],[-0.849109,0.454199,0.269663],[-0.739806,-0.03301,-0.67201],[-0.311423,0.88485,-0.346491],[-0.57931,0.583009,-0.569649],[-0.93095,-0.304824,-0.201035],[-0.73549,-0.033765,-0.676694],[-0.311675,0.885075,-0.34569],[-0.729391,0.497456,-0.469603],[-0.877629,-0.400255,-0.263749],[-0.682683,-0.286582,-0.672172],[-0.361259,0.843471,-0.397554],[-0.78429,0.321502,-0.530589],[-0.831982,-0.47972,-0.278702],[-0.670542,0.278646,0.687553],[-0.441487,-0.822911,0.357642],[-0.808646,-0.293574,0.509809],[-0.782893,0.552943,0.285187],[-0.677655,-0.284006,-0.678324],[-0.365758,0.852985,-0.372341],[-0.788378,0.32287,-0.523655],[-0.82793,-0.476759,-0.295353],[-0.616622,0.435652,0.655732],[-0.482267,-0.790712,0.377086],[-0.834774,-0.155,0.528325],[-0.745744,0.600042,0.289509],[-0.642451,-0.477177,-0.599632],[-0.431471,0.817364,-0.38177],[-0.845901,0.144039,-0.513521],[-0.793655,-0.541612,-0.277072],[-0.773358,0.053442,-0.631713],[-0.297081,0.88654,-0.354669],[-0.409462,-0.82227,0.395238],[-0.743893,-0.062415,-0.665378],[-0.338083,0.837399,-0.429492],[-0.653444,0.382027,0.653503],[-0.447242,-0.775257,0.446039],[-0.70795,-0.219741,-0.671208],[-0.380019,0.809501,-0.447541],[-0.64925,0.380026,0.658828],[-0.452221,-0.784873,0.42364],[-0.671592,-0.383814,-0.633759],[-0.820648,-0.514188,-0.249295],[-0.814728,-0.211807,0.539775],[-0.517538,-0.733536,0.440544],[-0.651384,-0.48574,-0.582886],[-0.801207,-0.548587,-0.238999],[-0.851902,-0.006622,0.52366],[-0.522691,-0.740159,0.423036],[-0.634661,-0.57302,-0.518511],[-0.784376,-0.578659,-0.223402],[-0.909931,0.010789,0.41462],[-0.626238,-0.629013,-0.460618],[-0.737716,0.573516,-0.356167],[-0.880383,-0.020926,-0.473801],[-0.856522,-0.487978,-0.168068],[-0.579336,0.582972,0.569661],[-0.56792,0.769167,0.292999],[-0.579662,0.5826,0.56971],[-0.719582,0.651291,0.240878],[-0.646455,0.378505,0.662442],[-0.767216,0.586635,0.259305],[-0.674353,-0.385124,-0.630022],[-0.651759,0.381281,0.655618],[-0.709824,-0.220108,-0.669105],[-0.728751,0.161491,0.665464],[-0.617688,0.764903,-0.182716],[-0.558799,0.631146,0.537958],[-0.703541,0.664371,0.252272],[-0.950874,-0.187763,-0.246137],[-0.526417,-0.761194,0.378774],[-0.857896,-0.028593,0.513027],[-0.36722,0.855764,-0.364441],[-0.789696,0.323276,-0.521414],[-0.48027,-0.788001,0.385219],[-0.833367,-0.154961,0.530552],[-0.363617,0.848612,-0.384239],[-0.786464,0.322269,-0.526894],[-0.438857,-0.818487,0.370786],[-0.806479,-0.293037,0.513538],[-0.417506,-0.840911,0.344322],[-0.790546,-0.381628,0.478954],[-0.400686,-0.860816,0.313762],[-0.776805,-0.45915,0.430994],[-0.76968,-0.509141,0.385187],[-0.849109,0.454198,0.269663],[-0.777754,-0.054155,0.626232],[-0.392259,-0.876887,0.277853],[-0.815007,0.428224,-0.390368],[-0.311423,0.88485,-0.346491],[-0.729379,0.497498,-0.469577],[-0.311665,0.885087,-0.345667],[-0.78429,0.321502,-0.530589],[-0.361259,0.843471,-0.397554],[-0.808646,-0.293574,0.509809],[-0.441487,-0.822911,0.357642],[-0.788378,0.32287,-0.523655],[-0.365758,0.852985,-0.372341],[-0.834769,-0.15503,0.528325],[-0.482258,-0.79072,0.377081],[-0.845896,0.144056,-0.513525],[-0.431465,0.817368,-0.38177],[-0.711293,0.541993,-0.447555],[-0.905506,-0.377654,-0.193483],[-0.773363,0.053466,-0.631705],[-0.297079,0.886544,-0.354661],[-0.882991,-0.412173,-0.224591],[-0.743897,-0.062396,-0.665375],[-0.772485,0.589724,0.235567],[-0.653444,0.382027,0.653503],[-0.853222,-0.46106,-0.243796],[-0.70795,-0.219741,-0.671208],[-0.769335,0.588031,0.249684],[-0.64925,0.380026,0.658828],[-0.820638,-0.514207,-0.249288],[-0.671582,-0.383871,-0.633735],[-0.801201,-0.548597,-0.238992],[-0.651379,-0.485771,-0.582866],[-0.784379,-0.578652,-0.223409],[-0.634665,-0.572999,-0.518529],[-0.880377,-0.020908,-0.473813],[-0.476705,0.736752,-0.479529],[-0.854862,-0.006006,0.518821],[-0.522681,-0.740165,0.423036],[-0.851892,-0.006676,0.523675],[-0.517518,-0.73355,0.440544],[-0.814728,-0.211807,0.539775],[-0.452221,-0.784873,0.42364],[-0.803161,0.239644,-0.545438],[-0.380027,0.809495,-0.447546],[-0.81083,-0.210502,0.546117],[-0.447242,-0.775257,0.446039],[-0.760347,0.371654,-0.532677],[-0.338083,0.837399,-0.429492],[-0.783179,-0.376473,0.494872],[-0.40946,-0.822274,0.395231],[-0.950874,-0.187761,-0.24614],[-0.617686,0.764903,-0.182719],[-0.71956,0.639529,0.270621],[-0.58032,0.556769,0.594337],[-0.826618,-0.475642,-0.300779],[-0.67599,-0.283117,-0.680355],[-0.746843,0.60125,0.284118],[-0.618023,0.436828,0.653628],[-0.829643,-0.478053,-0.28837],[-0.679744,-0.285125,-0.67576],[-0.785109,0.554719,0.275481],[-0.673594,0.27998,0.684019],[-0.815053,0.52083,0.253821],[-0.719866,0.159005,0.675656],[-0.841652,0.485854,0.235728],[-0.763852,0.034508,0.644468],[-0.842683,0.418083,-0.339253],[-0.897259,-0.412482,-0.157434],[-0.763841,0.034539,0.644479],[-0.8967,0.401189,0.187021],[-0.719886,0.158946,0.675648],[-0.815065,0.520813,0.253815],[-0.673605,0.279949,0.684022],[-0.785116,0.55471,0.275481],[-0.679744,-0.285125,-0.67576],[-0.829643,-0.478053,-0.28837],[-0.618032,0.436797,0.653639],[-0.74685,0.60124,0.284122],[-0.67599,-0.283117,-0.680355],[-0.826618,-0.475642,-0.300779],[-0.580312,0.556796,0.59432],[-0.719555,0.639538,0.270615],[-0.892365,-0.292257,0.343906],[-0.311943,0.867309,-0.387901],[-0.445583,-0.77194,0.453392],[-0.339173,0.840652,-0.422214],[-0.449305,-0.779354,0.436729],[-0.382683,0.815531,-0.434123],[-0.80543,0.240399,-0.541747],[-0.42263,0.802038,-0.422041],[-0.839741,0.142629,-0.52392],[-0.464112,0.783215,-0.413732],[-0.920011,0.052367,-0.388377],[-0.701367,-0.671527,0.239033],[-0.842682,0.41808,0.339259],[-0.568674,-0.746445,0.345585],[-0.876619,0.060456,0.477372],[-0.976943,-0.194968,-0.087002],[-0.94582,0.264638,-0.188124],[-0.911222,0.402824,0.086062],[-0.892365,-0.292259,0.343902],[-0.997653,0.068466,-0.000003],[-0.034728,-0.612275,-0.789882],[-0.494219,-0.741624,-0.453588],[-0.997654,0.068462,0],[-0.997656,0.068422,0.000005],[-0.879328,0.268647,0.393205],[-0.903734,-0.111038,-0.413443],[-0.661777,0.748814,-0.036447],[-0.750309,-0.660656,0.023862],[-0.898218,-0.335122,0.284424],[-0.764353,0.634945,0.112292],[-0.751567,-0.62359,-0.215135],[-0.661761,0.749481,0.018694],[-0.750229,-0.659565,-0.046156],[-0.874272,0.336922,0.349474],[-0.837299,0.003642,-0.546733],[-0.816153,0.199934,0.542144],[-0.503835,0.863533,-0.021455],[-0.261118,0.963996,0.050289],[-0.765401,0.618783,0.176831],[-0.372887,-0.904703,0.206077],[-0.661755,0.749499,0.018221],[-0.869731,0.158251,-0.467467],[-0.750247,-0.659433,-0.047725],[-0.903732,-0.11103,0.413449],[-0.881038,0.242907,-0.405916],[-0.842051,-0.050093,0.537067],[-0.817866,0.169271,-0.549947],[-0.997651,0.068505,-0.00003],[-0.49428,-0.741593,0.453571],[-0.860659,-0.274582,0.428802],[-0.997652,0.068481,-0.000008],[-0.997657,0.068407,0.000007],[-0.87581,0.311455,-0.368717],[-0.765393,0.618798,-0.176814],[-0.752774,-0.6427,0.142365],[-0.661792,0.748755,-0.037386],[-0.750287,-0.660709,0.023077],[-0.60589,-0.747381,-0.272614],[-0.753232,-0.639676,-0.153152],[-0.509357,0.846223,-0.156403],[-0.503854,0.863508,-0.022008],[-0.261113,0.964063,0.049024],[-0.996036,0.061014,-0.064726],[-0.946464,0.06495,0.316209],[-0.88774,0.302027,0.347416],[-0.906247,-0.1443,-0.397359],[-0.764709,0.60998,0.207712],[-0.87874,-0.269676,-0.393817],[-0.90075,-0.049497,-0.431508],[-0.891399,0.113253,0.43884],[-0.662165,0.739337,0.122143],[-0.262374,0.960081,0.096981],[-0.764585,0.568098,-0.304424],[-0.8356,0.062517,-0.545769],[-0.981894,0.093992,-0.164469],[-0.830115,0.056975,0.554673],[-0.984078,0.06752,0.164411],[-0.906247,-0.144302,-0.397358],[-0.88774,0.302024,0.347418],[-0.901401,-0.058459,-0.429021],[-0.891399,0.113251,0.438841],[-0.894447,0.051555,-0.444191],[-0.892344,0.061246,0.44718],[-0.943067,0.115215,-0.312009],[-0.946464,0.06495,0.316209],[-0.948857,0.029424,-0.314331],[-0.764709,0.609981,0.207712],[-0.753232,-0.639676,-0.153153],[-0.912604,-0.223972,-0.342038],[-0.946454,0.064939,0.316239],[-0.504289,0.851479,0.143791],[-0.505494,0.858651,0.084819],[-0.509719,0.749748,-0.421977],[-0.881038,0.242909,-0.405915],[-0.903733,-0.111035,0.413447],[-0.902352,0.283333,-0.324781],[-0.750247,-0.659433,-0.047725],[-0.750287,-0.660709,0.023077],[-0.661792,0.748755,-0.037386],[-0.661755,0.749499,0.018221],[-0.83904,-0.530539,0.120586],[-0.29159,-0.820542,0.491616],[-0.997652,0.068488,-0.00002],[-0.66809,0.714212,-0.208703],[-0.869733,0.158262,-0.467459],[-0.860628,-0.274633,0.428831],[-0.997654,0.068461,-0.000005],[-0.997656,0.068432,0.000003],[-0.903034,-0.053716,0.426197],[-0.886546,0.156792,-0.435261],[-0.503878,0.862708,0.042911],[-0.265417,0.947347,-0.179128],[-0.503829,0.863523,-0.022009],[-0.60589,-0.74738,-0.272617],[-0.898217,-0.335124,0.284427],[-0.900996,0.305728,0.307794],[-0.927117,-0.088779,-0.364104],[-0.034727,-0.612265,-0.78989],[-0.997652,0.068493,0.000016],[-0.899217,0.003909,-0.437486],[-0.997651,0.068495,0.000024],[-0.997654,0.068456,0.000001],[-0.86287,-0.420423,-0.280533],[-0.884327,0.189113,0.426852],[-0.879329,0.268648,0.393204],[-0.750309,-0.660656,0.023863],[-0.661777,0.748814,-0.036447],[-0.751567,-0.62359,-0.215133],[-0.750229,-0.659565,-0.046156],[-0.661761,0.749481,0.018694],[-0.666901,0.733266,0.132534],[-0.751834,-0.617492,0.231192],[-0.372887,-0.904703,0.206075],[-0.510712,0.823727,0.246267],[-0.503818,0.863543,-0.021457],[-0.50389,0.862645,0.044017],[-0.948859,0.029395,0.314329],[-0.8991,-0.023748,0.437099],[-0.882234,0.384954,-0.271059],[-0.887966,0.16507,-0.429264],[-0.86551,0.48708,-0.116811],[-0.904301,-0.116236,0.410766],[-0.892342,0.061227,-0.447188],[-0.821667,-0.294213,0.488163],[-0.808182,-0.109929,0.578582],[-0.505173,0.862475,-0.030624],[-0.261564,0.951609,-0.161318],[-0.946457,0.064937,-0.316232],[-0.942726,0.115362,0.312984],[-0.891587,0.087994,0.444217],[-0.946463,0.064963,-0.316208],[0.986684,-0.162423,-0.008575],[0.319369,-0.884558,-0.339942],[0.558925,-0.644221,-0.522095],[0.558924,-0.451357,-0.695615],[0.558925,-0.214312,-0.801045],[0.558925,0.043719,-0.828065],[0.558925,0.297467,-0.774026],[0.558924,0.522092,-0.644223],[0.558925,0.695615,-0.451356],[0.558925,0.801047,-0.214306],[0.558925,0.828065,0.043717],[0.558925,0.774028,0.297462],[0.558925,0.644223,0.522092],[0.558924,0.451362,0.695612],[0.558925,0.214305,0.801047],[0.558924,-0.043714,0.828066],[0.558925,-0.297467,0.774026],[0.558924,-0.522095,0.64422],[0.558925,-0.695616,0.451355],[0.319369,-0.915435,0.244913],[-0.710984,-0.679317,-0.181743],[-0.710984,-0.70223,0.037075],[-0.710984,-0.442753,-0.546326],[-0.710984,-0.589908,-0.382767],[-0.710984,-0.037075,-0.70223],[-0.710984,-0.252264,-0.656403],[-0.710984,0.382768,-0.589908],[-0.710984,0.181744,-0.679317],[-0.710984,0.656405,-0.252259],[-0.710984,0.546323,-0.442756],[-0.710984,0.679318,0.181739],[-0.710984,0.702231,-0.037073],[-0.710984,0.442756,0.546323],[-0.710984,0.589908,0.382766],[-0.710983,0.037072,0.702231],[-0.710984,0.252263,0.656403],[-0.710984,-0.382772,0.589905],[-0.710984,-0.181739,0.679317],[-0.710984,-0.656404,0.252261],[-0.710984,-0.546325,0.442754],[-0.710984,-0.679317,0.181742],[-0.710984,-0.589908,0.382767],[-0.710984,-0.442756,0.546324],[-0.710984,-0.252262,0.656403],[-0.710983,-0.037072,0.702231],[-0.710984,0.181739,0.679317],[-0.710984,0.382771,0.589906],[-0.710984,0.546325,0.442754],[-0.710984,0.656404,0.252261],[-0.710984,0.70223,0.037074],[-0.710984,0.679317,-0.181743],[-0.710984,0.589908,-0.382768],[-0.710984,0.442757,-0.546323],[-0.710984,0.252261,-0.656404],[-0.710984,0.037074,-0.70223],[-0.710984,-0.181742,-0.679317],[-0.710984,-0.382768,-0.589907],[-0.710984,-0.546326,-0.442753],[-0.710984,-0.656403,-0.252263],[-0.710984,-0.70223,-0.037074],[0.710984,-0.679317,-0.181743],[0.710984,-0.70223,0.037074],[0.710984,-0.442757,-0.546323],[0.710984,-0.589908,-0.382768],[0.710984,-0.037074,-0.70223],[0.710984,-0.252261,-0.656404],[0.710984,0.382768,-0.589907],[0.710984,0.181742,-0.679317],[0.710984,0.656403,-0.252263],[0.710984,0.546326,-0.442753],[0.710984,0.679317,0.181742],[0.710984,0.70223,-0.037074],[0.710984,0.442756,0.546324],[0.710984,0.589908,0.382767],[0.710983,0.037072,0.702231],[0.710984,0.252262,0.656403],[0.710984,-0.382771,0.589906],[0.710984,-0.181739,0.679317],[0.710984,-0.656404,0.252261],[0.710984,-0.546325,0.442754],[0.710984,-0.679317,0.181743],[0.710984,-0.589908,0.382766],[0.710984,-0.442756,0.546323],[0.710984,-0.252263,0.656403],[0.710983,-0.037072,0.702231],[0.710984,0.181739,0.679317],[0.710984,0.382772,0.589905],[0.710984,0.546325,0.442754],[0.710984,0.656405,0.252259],[0.710984,0.702231,0.037073],[0.710984,0.679318,-0.181739],[0.710984,0.589908,-0.382767],[0.710984,0.442753,-0.546326],[0.710984,0.252264,-0.656403],[0.710984,0.037075,-0.70223],[0.710984,-0.181744,-0.679317],[0.710984,-0.382768,-0.589908],[0.710984,-0.546323,-0.442756],[0.710984,-0.656404,-0.252261],[0.710984,-0.70223,-0.037075],[-0.371702,-0.891681,-0.258346],[-0.240472,-0.923534,-0.298761],[-0.240472,-0.970655,0.001248],[-0.371701,-0.927873,0.029839],[-0.371702,-0.768205,-0.521247],[-0.240473,-0.786011,-0.569526],[-0.371702,-0.569533,-0.733123],[-0.240472,-0.571547,-0.784543],[-0.371702,-0.315104,-0.873239],[-0.240471,-0.301132,-0.922764],[-0.371701,-0.02984,-0.927873],[-0.240473,-0.001251,-0.970655],[-0.371702,0.258345,-0.891681],[-0.240472,0.298763,-0.923533],[-0.371702,0.521251,-0.768203],[-0.240471,0.569531,-0.786007],[-0.371701,0.733127,-0.569529],[-0.240472,0.784546,-0.571543],[-0.371701,0.873239,-0.315107],[-0.240473,0.922762,-0.301136],[-0.371701,0.927873,-0.029842],[-0.240472,0.970655,-0.001248],[-0.371701,0.891681,0.258347],[-0.240472,0.923534,0.298761],[-0.371702,0.768204,0.521249],[-0.240472,0.78601,0.569527],[-0.371702,0.569535,0.733122],[-0.240472,0.571548,0.784542],[-0.371702,0.31511,0.873237],[-0.240473,0.301135,0.922762],[-0.371702,0.02984,0.927873],[-0.240473,0.001248,0.970655],[-0.371702,-0.258349,0.89168],[-0.240473,-0.298764,0.923533],[-0.371702,-0.52125,0.768203],[-0.240473,-0.569526,0.786011],[-0.371703,-0.733122,0.569534],[-0.240471,-0.784544,0.571546],[-0.371702,-0.873239,0.315106],[-0.240471,-0.922764,0.301131],[-0.071232,-0.99746,0.000263],[-0.071231,-0.94856,0.308481],[-0.07123,-0.806809,0.586503],[-0.07123,-0.586084,0.807113],[-0.071233,-0.307981,0.948722],[-0.071232,0.00026,0.99746],[-0.071233,0.308484,0.948559],[-0.071232,0.586507,0.806806],[-0.071231,0.807117,0.586079],[-0.071232,0.948723,0.30798],[-0.071231,0.99746,-0.000261],[-0.071232,0.94856,-0.30848],[-0.071233,0.806807,-0.586505],[-0.071231,0.586082,-0.807114],[-0.07123,0.307986,-0.948721],[-0.071232,-0.000264,-0.99746],[-0.071231,-0.308484,-0.948559],[-0.07123,-0.586503,-0.806809],[-0.071231,-0.807116,-0.58608],[-0.071231,-0.948721,-0.307984],[-1,0.000001,0],[0.822164,0.367592,-0.434652],[0.789197,0.355739,-0.500618],[-0.582237,0.565345,-0.584281],[-0.52713,0.664242,-0.530016],[-0.077383,-0.209837,0.974669],[0.172314,-0.823535,0.540461],[0.231597,-0.178513,0.956293],[-0.582248,0.223325,0.781737],[-0.798321,0.241951,-0.551492],[-0.835847,0.147077,-0.528893],[-0.527125,0.126889,0.840261],[-0.798312,0.356637,0.485291],[0.593938,0.552932,0.584383],[0.54593,0.629188,0.553248],[-0.835846,0.384498,0.391819],[0.564264,-0.618532,-0.546831],[-0.362224,-0.822294,-0.438893],[-0.448869,-0.053923,-0.891969],[0.475105,-0.106852,-0.873417],[0.906207,-0.34024,-0.251049],[0.700279,0.659426,-0.273436],[0.172315,0.87982,0.442972],[0.593926,0.229627,-0.771053],[0.789189,0.255682,0.558397],[0.82216,0.192624,0.535676],[0.545925,0.164534,-0.82152],[-0.764452,0.340804,-0.547234],[0.643951,0.380036,-0.664003],[-0.311328,-0.335318,0.889178],[0.749578,0.238468,-0.617468],[-0.628107,0.456392,-0.630228],[-0.362226,0.791241,-0.492676],[0.564258,0.78284,-0.262249],[0.906208,-0.047295,0.420179],[0.172332,-0.056285,-0.98343],[-0.944985,0.302927,0.123448],[-0.415575,0.829834,-0.372387],[-0.565955,0.688377,-0.453687],[-0.448865,0.799432,0.399286],[0.475107,0.809827,0.344172],[-0.67785,0.390161,-0.623133],[-0.628108,0.3176,0.710359],[0.64395,-0.765062,0.002884],[-0.835845,-0.531576,0.137075],[0.54593,-0.793721,0.268267],[-0.944988,-0.258364,0.200613],[0.749581,0.41551,0.515247],[0.564272,-0.164309,0.809073],[-0.362216,0.031053,0.931577],[-0.448853,-0.745516,0.492684],[0.475125,-0.702973,0.529231],[-0.41557,-0.092429,0.904853],[0.906207,0.387536,-0.169132],[-0.256114,0.863416,-0.434648],[0.092078,0.297628,-0.950231],[0.099085,-0.488166,-0.867108],[-0.23163,-0.178455,-0.956296],[-0.700288,-0.092898,-0.70779],[-0.311343,0.937704,-0.154196],[-0.077427,0.948999,-0.305624],[0.231619,0.917425,-0.323548],[0.677861,0.34454,-0.649459],[0.565941,0.048672,-0.823008],[0.530784,-0.336181,-0.777979],[0.092076,-0.971736,0.217372],[0.099059,-0.506824,0.856339],[-0.231625,-0.738913,0.632738],[-0.700279,-0.566516,0.434362],[-0.677846,-0.734733,-0.026326],[-0.565942,-0.737097,-0.369321],[-0.415575,-0.737414,-0.532464],[-0.311317,-0.602392,-0.734987],[-0.077394,-0.739173,-0.669054],[0.231619,-0.738914,-0.632739],[0.700279,-0.566515,-0.434361],[0.677845,-0.734733,0.026329],[0.565926,-0.737099,0.36934],[0.530788,-0.505659,0.680127],[0.677853,0.390174,0.623121],[0.700278,-0.092908,0.707798],[0.092092,0.674135,0.732845],[0.09907,0.995023,0.010718],[-0.23161,0.917444,0.323502],[-0.700279,0.659426,0.273435],[-0.677842,0.34456,0.649468],[-0.565929,0.048695,0.823015],[0.56594,0.688436,0.453615],[0.53079,0.841842,0.097798],[-0.764454,-0.644319,-0.021524],[0.593929,-0.782564,0.186662],[-0.944983,-0.044555,-0.324072],[-0.256122,-0.055292,0.965062],[-0.764447,0.303523,0.568765],[0.643954,0.385027,0.661118],[-0.256113,-0.808124,-0.530417],[-0.628103,-0.773993,-0.080133],[-0.582235,-0.788676,-0.197462],[0.822166,-0.560213,-0.101018],[-0.527126,-0.791131,-0.310242],[0.789198,-0.611415,-0.057767],[0.749583,-0.653971,0.102214],[-0.798317,-0.598588,0.06621],[-0.287769,0.851872,0.437611],[0.359798,0.928648,0.090318],[0.077371,0.948985,-0.30568],[0.648846,-0.755545,-0.090277],[0.783331,0.29785,0.545598],[0.512323,-0.104523,0.852409],[0.31618,-0.862822,0.394422],[-0.287775,-0.046954,-0.956546],[-0.231625,-0.738913,-0.632738],[-0.700279,-0.566516,-0.434362],[-0.415575,-0.737414,0.532464],[-0.311317,-0.602392,0.734987],[-0.856463,-0.046826,0.514081],[0.904927,-0.3444,0.249992],[0.700276,0.659427,0.27344],[0.677865,0.344532,0.649459],[-0.878353,0.365528,-0.308033],[0.47922,0.736159,-0.477931],[0.548586,0.656785,-0.517384],[-0.836355,0.35256,-0.419776],[0.375253,-0.044285,0.925864],[-0.769066,0.400525,0.498113],[0.648849,0.299589,0.699458],[0.316185,0.772989,0.550014],[-0.606238,0.773281,0.185772],[-0.231611,0.917429,-0.323543],[-0.856469,-0.421785,-0.297586],[0.375241,-0.779684,-0.501286],[0.413998,-0.779104,-0.470747],[-0.911558,-0.366985,-0.185427],[-0.664988,-0.746778,0.010628],[-0.769062,0.231118,-0.595926],[-0.606226,-0.225761,-0.762576],[-0.487026,-0.732651,-0.475425],[0.890159,-0.422977,0.169433],[0.849596,-0.51052,0.132498],[-0.769067,-0.631641,0.097805],[-0.60624,-0.547522,0.576795],[-0.878355,-0.449526,-0.162538],[0.479217,-0.781982,-0.398567],[0.548589,-0.776459,-0.3101],[-0.836354,-0.539818,-0.095437],[-0.664996,0.38259,0.641409],[-0.487048,-0.045405,0.872194],[-0.430738,0.778481,0.456544],[0.919004,0.343025,0.194335],[0.904928,0.388697,0.173262],[0.098758,0.603105,-0.791525],[-0.60947,0.549085,0.571885],[0.810213,0.348967,0.470933],[-0.500686,0.717473,0.4843],[-0.567239,0.620752,0.541209],[0.724678,0.660176,-0.197509],[-0.700279,0.659424,-0.273439],[-0.565929,0.048695,-0.823015],[-0.41557,-0.092428,-0.904853],[0.700277,-0.092904,-0.7078],[-0.311323,-0.335319,-0.889179],[-0.077384,-0.209835,-0.97467],[0.597899,-0.776044,-0.200677],[0.677836,0.390174,-0.62314],[-0.836358,0.187256,0.51521],[0.548585,0.119676,0.827485],[0.597894,0.214231,0.772417],[-0.801343,0.247316,0.544687],[-0.878356,0.084001,0.470569],[0.479213,0.045823,0.876502],[-0.664991,0.364185,-0.65204],[-0.487046,0.778047,-0.396774],[0.512331,0.790467,-0.335677],[0.78333,0.323579,-0.530745],[-0.430727,0.006138,-0.902461],[0.919005,-0.003214,-0.394233],[0.904927,-0.044299,-0.423255],[0.098772,-0.987029,-0.126562],[0.359797,-0.386073,-0.849408],[-0.609479,0.220723,-0.761457],[0.810202,0.233361,-0.537694],[-0.500681,0.06068,-0.863502],[-0.567249,0.158322,-0.808185],[0.077394,-0.739175,-0.669052],[0.724697,-0.501123,-0.472959],[-0.677846,-0.734733,0.026326],[-0.565942,-0.737097,0.369321],[0.231619,-0.738914,0.632739],[0.700279,-0.566515,0.434361],[0.849597,0.140513,-0.508371],[-0.077394,-0.739173,0.669054],[0.677845,-0.734733,-0.026329],[0.597906,0.561812,-0.571731],[-0.801334,0.348064,-0.486534],[0.648854,0.455951,-0.609178],[-0.567241,-0.779075,0.266983],[-0.609467,-0.769811,0.189578],[0.810212,-0.582324,0.066749],[0.359816,-0.542572,0.759044],[-0.28777,-0.804918,0.518937],[-0.500686,-0.778153,0.379199],[-0.856465,0.468616,-0.216487],[-0.911559,0.344076,-0.225105],[-0.430734,-0.78462,0.445914],[-0.231627,-0.178472,0.956293],[0.07743,-0.209817,0.97467],[0.724703,-0.159061,0.670451],[-0.700287,-0.092897,0.707792],[-0.677846,0.390162,0.623135],[0.098777,0.383901,0.918076],[0.231618,0.917424,0.323552],[-0.077426,0.948997,0.30563],[-0.311343,0.937704,0.154199],[-0.415573,0.829834,0.37239],[-0.565952,0.688377,0.453691],[0.231595,-0.178507,-0.956294],[-0.677841,0.344561,-0.649468],[0.37524,0.823968,-0.424583],[0.783334,-0.621423,-0.014857],[0.512343,-0.685936,-0.516717],[0.316198,0.08983,-0.944431],[0.919004,-0.33981,0.1999],[0.413998,0.79723,-0.439352],[0.890163,0.064754,-0.451017],[0.413999,-0.018127,0.910097],[-0.911562,0.022909,0.410524],[0.890157,0.358225,0.281594],[0.849598,0.370004,0.375872],[-0.801341,-0.595374,-0.058161]];
var triangles$1 = [0,1,2,0,2,3,4,1,0,4,0,5,2,6,7,2,7,3,8,9,10,8,10,11,10,9,12,10,12,13,14,15,16,14,16,17,16,15,18,16,18,19,6,4,5,6,5,7,18,20,21,18,21,19,20,14,17,20,17,21,12,22,23,12,23,13,22,8,11,22,11,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,45,47,48,49,50,51,52,53,54,52,54,55,56,57,58,56,58,59,60,61,62,63,64,65,63,65,66,67,68,69,67,69,70,71,72,73,71,73,74,75,76,77,75,77,78,79,80,81,79,81,82,83,84,85,83,85,86,87,88,89,87,89,90,91,92,93,91,93,94,95,96,97,95,97,98,99,100,101,99,101,102,103,104,55,103,55,105,106,77,76,107,89,88,108,109,110,111,112,113,84,83,114,77,106,115,77,115,116,77,116,117,118,78,77,118,77,117,119,120,121,119,121,122,123,124,120,123,120,119,125,126,115,125,115,127,128,129,130,131,111,113,131,113,132,131,132,133,134,135,136,134,136,137,138,139,140,138,140,141,39,142,143,39,143,133,116,129,90,116,90,89,144,145,146,144,146,147,148,149,150,148,150,135,71,151,152,71,152,72,153,154,155,153,155,156,157,158,159,157,159,160,161,162,153,161,153,163,164,69,165,164,165,166,167,168,162,167,162,161,169,170,171,169,171,172,173,174,175,173,175,176,177,178,179,177,179,180,181,182,183,181,183,184,185,186,187,185,187,182,188,189,190,188,190,191,188,191,192,63,193,189,63,189,64,194,195,196,194,196,197,198,199,200,198,200,201,202,203,194,202,194,204,205,206,202,207,208,209,207,209,210,211,212,203,60,213,205,64,189,188,64,188,214,215,172,171,215,171,167,215,167,216,148,217,218,148,218,156,160,219,220,160,220,221,29,222,223,29,223,27,224,225,36,224,36,226,227,228,229,227,229,230,227,230,231,232,233,234,232,234,235,236,237,238,236,238,239,236,239,240,241,242,243,241,243,244,245,246,49,247,248,249,250,251,37,250,37,252,49,246,253,254,253,255,254,255,256,254,256,95,99,252,37,99,37,100,256,257,258,256,258,259,52,260,261,52,261,262,52,262,53,263,264,265,263,265,266,267,268,269,267,269,270,271,272,273,271,273,274,275,276,277,275,277,278,273,279,280,273,280,281,273,281,282,273,282,283,278,277,284,278,284,238,285,286,232,285,232,287,288,289,290,288,290,291,292,293,294,295,296,297,295,297,298,299,300,301,299,301,34,302,303,304,302,304,305,300,306,108,300,108,301,307,308,309,310,47,46,310,46,311,312,313,314,312,314,315,316,299,33,316,33,48,299,317,300,318,125,127,318,127,319,320,321,305,320,305,322,323,322,305,323,305,304,323,304,79,79,304,324,79,324,80,325,326,327,325,327,328,328,327,329,109,330,328,109,328,331,80,324,332,80,332,333,120,322,323,120,323,121,124,320,322,124,322,120,300,334,318,335,35,34,336,337,314,338,312,315,338,315,339,293,292,340,293,340,341,293,341,309,330,109,108,330,108,306,330,306,332,342,302,305,342,305,321,343,344,312,343,312,338,345,346,347,345,347,348,286,283,233,286,233,232,274,273,283,274,283,286,349,350,351,349,351,275,349,275,278,349,278,352,272,353,279,272,279,273,266,265,271,266,271,354,264,355,356,264,356,265,261,260,96,261,96,259,261,259,267,261,267,357,26,25,99,26,99,358,359,253,254,359,254,360,249,361,362,363,364,24,363,24,26,362,225,249,50,249,248,365,241,244,365,244,246,56,236,240,56,240,57,287,232,235,287,235,366,367,227,231,367,231,368,251,38,37,369,157,160,369,160,221,369,221,370,371,219,160,371,160,159,149,148,156,149,156,155,67,215,216,67,216,68,65,372,373,62,61,208,206,213,374,375,223,222,375,222,203,208,61,376,210,209,199,210,199,198,195,222,29,377,198,201,377,201,378,204,194,197,204,197,193,378,201,185,378,185,379,193,197,190,193,190,189,190,380,381,190,381,191,192,191,382,192,382,383,183,384,177,183,177,180,183,180,385,183,385,386,382,173,176,382,176,170,387,216,167,387,167,161,387,161,388,389,390,391,389,391,392,388,161,163,388,163,393,394,370,221,394,221,395,163,153,156,163,156,218,396,397,398,396,398,137,399,400,401,217,148,135,217,135,134,145,402,403,145,403,146,89,107,404,89,404,117,89,117,116,39,133,132,39,132,399,405,134,137,405,137,406,405,406,152,405,152,151,141,43,42,141,42,138,407,408,397,407,397,396,407,396,409,126,129,116,126,116,115,403,123,119,403,119,146,146,119,122,146,122,410,146,410,147,147,410,78,147,78,118,411,127,115,411,115,106,254,95,98,291,34,412,87,90,407,413,83,86,410,122,414,415,103,105,415,105,355,358,99,102,358,102,416,360,254,98,360,98,417,418,288,419,418,419,91,84,107,88,84,88,85,420,413,86,420,86,421,80,333,422,80,422,81,414,75,78,414,78,410,297,296,347,297,347,346,423,424,159,423,159,158,64,214,372,64,372,65,425,376,61,53,426,427,53,427,54,360,417,428,360,428,429,359,361,50,44,430,128,142,41,431,407,90,129,407,129,128,221,220,432,221,432,395,252,99,25,308,307,433,308,433,434,239,238,435,222,195,194,222,194,203,128,430,407,44,128,436,437,45,48,50,49,359,55,104,438,55,438,52,205,425,61,439,63,66,439,66,440,68,441,165,68,165,69,434,433,310,434,310,311,442,443,367,442,367,368,121,323,82,121,82,444,76,445,411,76,411,106,446,87,409,446,409,447,92,448,331,92,331,329,301,108,110,301,110,412,100,449,450,100,450,101,451,452,264,451,264,263,438,97,260,438,260,52,333,453,422,407,409,87,329,93,92,34,301,412,404,107,84,404,84,454,455,456,404,455,404,454,457,458,455,457,455,459,460,461,458,460,458,457,462,463,461,462,461,460,126,464,129,136,465,466,136,466,467,135,150,465,135,465,136,399,401,468,399,468,39,142,469,470,142,470,143,456,144,147,456,147,118,464,130,129,471,472,399,399,472,400,467,447,409,467,409,396,423,473,474,423,474,424,162,475,154,162,154,153,68,216,387,68,387,441,168,476,475,168,475,162,170,176,477,170,477,171,478,479,480,478,480,481,381,482,174,381,174,173,379,185,182,379,182,181,196,483,484,196,484,380,485,200,66,485,66,65,485,65,373,195,486,483,195,483,196,199,440,66,199,66,200,487,210,198,487,198,377,425,202,204,425,204,439,208,376,209,488,207,210,488,210,487,374,489,206,490,62,208,491,492,207,491,207,488,390,493,494,390,494,495,390,495,164,390,164,391,171,477,168,171,168,167,217,496,497,217,497,474,217,474,218,164,166,498,164,498,392,164,392,391,375,203,212,499,224,364,229,344,500,229,500,230,233,501,502,233,502,503,233,503,234,53,262,426,248,51,50,499,504,247,499,247,225,499,225,224,362,36,225,246,244,255,246,255,253,249,50,361,37,362,449,37,449,100,95,256,259,95,259,96,105,55,54,105,54,505,356,505,506,356,506,353,356,353,272,357,267,270,357,270,507,354,271,274,354,274,508,280,509,510,280,510,281,352,278,238,352,238,237,289,315,314,289,314,290,229,228,511,229,511,313,334,300,317,303,512,324,303,324,304,293,309,513,336,314,313,336,313,511,336,511,345,336,345,348,112,111,131,112,131,341,112,341,340,335,34,291,335,291,290,300,318,319,300,319,306,342,514,515,342,515,302,302,515,516,302,516,303,303,516,325,303,325,512,127,411,453,127,453,319,331,328,329,319,453,333,319,333,332,319,332,306,512,325,328,512,328,330,516,517,326,516,326,325,515,518,517,515,517,516,514,519,518,514,518,515,520,289,288,520,288,418,339,315,289,339,289,520,33,437,48,341,131,521,309,522,307,522,309,341,522,341,521,512,330,332,512,332,324,34,33,299,344,229,313,344,313,312,295,292,294,335,290,314,335,314,337,435,238,284,435,284,30,283,282,501,283,501,233,508,274,286,508,286,285,523,350,349,523,349,524,270,269,276,270,276,275,507,270,275,507,275,351,265,356,272,265,272,271,355,105,505,355,505,356,259,258,268,259,268,267,255,525,257,255,257,256,362,361,429,362,429,449,49,253,359,244,243,525,244,525,255,526,504,499,526,499,364,526,364,363,249,225,247,245,365,246,505,54,427,505,427,506,502,59,58,502,58,503,344,343,527,344,527,500,528,443,442,528,442,529,252,25,24,252,24,250,498,369,370,498,370,392,497,530,424,497,424,474,477,531,476,477,476,168,495,70,69,495,69,164,492,490,208,492,208,207,213,206,205,203,202,211,205,202,425,209,376,440,209,440,199,29,28,486,29,486,195,439,204,193,439,193,63,201,200,485,201,485,186,201,186,185,197,196,380,197,380,190,380,484,482,380,482,381,191,381,173,191,173,382,184,183,386,184,386,532,480,479,383,480,383,382,480,382,170,480,170,169,532,386,493,532,493,533,176,175,531,176,531,477,533,493,390,533,390,389,533,389,534,394,389,392,394,392,370,535,534,389,535,389,394,535,394,536,473,393,163,473,163,218,473,218,474,136,467,396,136,396,137,496,217,134,496,134,405,430,408,407,404,456,118,404,118,117,469,537,538,469,538,470,539,41,40,539,40,540,541,542,471,541,471,399,541,399,132,113,543,541,113,541,132,406,137,398,467,466,544,467,544,447,463,402,145,463,145,461,461,145,144,461,144,458,458,144,456,458,456,455,459,455,454,459,454,114,454,84,114,536,545,546,536,546,535,96,260,97,94,418,91,544,420,421,323,79,82,452,415,355,452,355,264,449,429,428,449,428,450,288,291,412,288,412,419,448,110,109,448,109,331,421,446,447,421,447,544,453,411,445,453,445,422,444,414,122,444,122,121,140,139,539,140,539,540,424,530,371,424,371,159,478,481,179,478,179,178,425,439,440,425,440,376,60,205,61,523,524,510,523,510,509,359,360,429,359,429,361,51,245,49,44,436,42,41,142,39,472,471,74,472,74,73,36,362,37,307,522,547,548,549,550,548,550,551,548,551,552,548,552,553,548,553,554,548,554,374,548,374,213,548,213,60,548,60,62,548,62,490,548,490,492,548,492,491,548,491,242,548,242,241,548,241,365,548,365,245,548,245,51,548,51,248,548,248,247,548,247,504,548,504,526,548,526,555,548,555,556,557,558,559,557,559,528,557,528,529,133,143,131,560,545,536,560,536,394,560,394,395,560,395,432,560,432,561,562,563,564,562,564,565,131,566,565,131,565,564,563,522,521,563,521,564,558,561,567,558,567,568,558,568,569,570,30,32,570,32,571,570,571,572,386,385,494,386,494,493,537,573,566,537,566,538,131,470,538,574,571,32,574,32,575,435,30,570,295,298,292,567,543,568,545,560,574,545,574,575,545,575,546,470,131,143,432,220,542,432,542,541,558,557,576,576,572,571,576,571,574,576,574,560,573,562,565,573,565,566,564,521,131,568,112,340,568,340,569,298,577,569,298,569,340,298,340,292,559,558,569,559,569,577,567,561,432,567,432,541,567,541,543,131,538,566,576,560,561,576,561,558,211,206,489,374,554,578,374,578,579,374,579,489,489,579,580,489,580,211,578,554,553,578,553,581,578,581,582,578,582,579,582,581,28,582,28,27,211,202,206,182,187,384,182,384,183,534,535,583,584,585,586,584,586,587,588,589,590,588,590,591,592,593,587,592,587,586,594,595,596,594,596,585,594,585,584,591,590,597,591,597,593,591,593,592,598,599,596,598,596,595,600,601,602,603,604,605,603,605,606,607,608,609,610,611,589,610,589,588,612,613,596,612,596,599,614,615,594,614,594,584,597,590,616,597,616,617,618,451,263,618,263,619,620,612,599,611,621,589,622,623,624,622,624,625,626,627,614,626,614,628,629,630,631,629,631,627,632,633,630,632,630,629,634,635,633,634,633,632,608,636,637,608,637,620,608,638,639,150,640,641,150,641,465,475,642,643,475,643,154,644,645,646,476,647,642,476,642,475,175,648,649,175,649,531,650,651,652,650,652,653,654,655,656,654,656,651,657,658,655,657,655,654,659,660,657,659,657,661,660,662,658,660,658,657,663,664,659,663,659,665,666,667,664,550,549,668,550,668,669,552,551,667,670,671,672,673,609,674,673,675,607,673,607,609,676,677,600,676,600,602,678,679,680,678,680,681,606,287,366,606,366,603,526,363,682,682,363,26,682,26,683,683,26,358,683,358,684,685,686,687,685,687,688,689,688,690,689,690,691,691,690,692,691,692,693,693,692,694,693,694,695,696,285,287,696,287,606,697,698,605,699,697,700,699,700,701,702,703,704,702,704,705,706,707,708,706,708,601,706,601,636,709,520,418,709,418,94,709,94,710,710,94,93,710,93,711,712,713,714,712,714,715,715,714,716,715,716,717,717,716,718,717,718,719,719,718,720,719,720,617,719,617,721,93,329,327,93,327,721,93,721,711,718,722,723,718,723,720,716,724,722,716,722,718,714,725,724,714,724,716,713,726,725,713,725,714,621,710,711,636,601,610,636,610,637,601,600,727,705,704,728,705,728,707,705,707,706,729,698,697,729,697,699,730,731,698,730,698,729,695,694,732,695,732,731,733,695,731,733,731,730,692,734,735,692,735,694,690,736,734,690,734,692,688,687,619,688,619,736,688,736,690,662,737,689,662,689,658,738,683,684,738,684,686,738,686,685,739,682,683,549,548,740,549,740,668,556,555,739,741,742,743,744,727,745,677,745,727,677,727,600,675,746,638,675,638,607,642,747,748,642,748,643,531,649,647,531,647,476,553,666,581,581,666,663,581,663,28,28,663,665,28,665,486,665,659,661,665,661,749,661,657,654,661,654,750,750,654,651,750,651,650,651,656,733,651,733,652,174,751,648,174,648,175,648,752,644,648,644,649,647,649,644,647,644,753,647,753,747,647,747,642,645,699,701,645,701,754,154,643,755,154,755,155,756,757,705,756,705,706,756,706,758,759,760,761,674,609,608,674,608,620,674,620,762,763,624,623,764,634,632,764,632,765,765,632,629,765,629,766,766,629,627,766,627,626,627,631,615,627,615,614,114,83,413,114,413,623,114,623,622,617,720,597,585,596,613,767,618,687,767,687,686,593,597,720,593,720,723,625,624,595,625,595,594,586,585,613,586,613,768,637,610,769,637,769,770,771,759,772,602,601,708,773,709,774,638,608,607,588,591,775,588,775,769,599,598,762,599,762,620,628,614,584,628,584,587,621,616,590,621,590,589,769,610,588,776,762,598,619,687,618,777,459,114,777,114,622,630,778,777,630,777,631,633,779,778,633,778,630,635,780,779,635,779,633,612,770,768,612,768,613,763,776,624,544,466,759,544,759,763,544,763,420,639,758,706,639,706,636,639,636,608,781,702,705,781,705,757,754,701,702,754,702,781,782,729,699,782,699,645,783,730,729,783,729,782,653,652,783,653,783,752,652,733,730,652,730,783,784,650,653,784,653,751,484,785,784,484,784,482,483,749,785,483,785,484,664,786,660,664,660,659,667,669,786,667,786,664,551,550,669,551,669,667,553,552,666,755,787,672,755,672,671,756,758,639,756,639,788,789,676,602,789,602,708,744,745,790,681,680,791,681,791,792,343,743,793,343,793,527,555,682,739,739,683,738,668,740,794,668,794,795,795,794,737,795,737,662,737,685,688,737,688,689,658,689,691,658,691,655,655,691,693,655,693,656,656,693,695,656,695,733,735,508,285,735,285,696,732,696,606,732,606,605,604,603,679,604,679,678,741,743,343,741,343,338,741,338,796,797,798,339,797,339,520,797,520,709,611,744,790,611,790,709,611,709,710,611,710,621,621,711,616,770,769,775,770,775,768,519,712,715,519,715,518,518,715,717,518,717,517,517,717,719,517,719,326,326,719,721,326,721,327,711,721,617,711,617,616,722,626,628,722,628,723,724,766,626,724,626,722,725,765,766,725,766,724,726,764,765,726,765,725,601,727,744,601,744,611,601,611,610,709,773,797,796,338,339,796,339,798,701,700,703,701,703,702,605,604,799,605,799,697,731,732,605,731,605,698,694,735,696,694,696,732,734,354,508,734,508,735,736,266,354,736,354,734,619,263,266,619,266,736,794,738,685,794,685,737,740,739,738,740,738,794,548,556,739,548,739,740,682,555,526,792,791,793,792,793,743,792,743,742,707,728,789,707,789,708,746,788,639,746,639,638,674,761,673,643,748,787,643,787,755,671,149,155,671,155,755,667,666,552,666,664,663,669,668,795,669,795,786,786,795,662,786,662,660,486,665,749,486,749,483,749,661,750,749,750,785,785,750,650,785,650,784,482,784,751,482,751,174,751,653,752,751,752,648,752,783,782,752,782,644,753,644,646,644,782,645,149,671,670,149,670,640,149,640,150,465,641,772,465,772,759,465,759,466,759,761,674,759,674,762,759,762,776,759,776,763,420,763,623,420,623,413,780,462,460,780,460,779,779,460,457,779,457,778,778,457,459,778,459,777,615,631,777,615,777,622,615,622,625,686,684,767,615,625,594,591,592,775,684,358,416,684,416,767,587,593,723,587,723,628,598,595,624,598,624,776,768,775,592,768,592,586,770,612,620,770,620,637,760,759,771,774,709,790,604,678,800,753,801,747,753,646,801,800,799,604,802,803,797,802,797,773,681,792,804,681,804,805,681,805,806,796,807,741,804,792,742,804,742,808,804,808,809,810,802,773,810,773,774,809,811,805,804,809,805,812,813,811,812,811,809,812,809,808,796,798,803,796,803,807,678,681,806,678,806,800,797,803,798,742,741,807,742,807,808,745,810,774,745,774,790,748,747,801,748,801,814,641,640,815,641,815,816,817,818,819,817,819,820,817,820,821,821,822,823,816,824,771,816,771,772,822,787,748,822,748,814,822,814,823,772,641,816,670,672,820,670,820,815,825,673,761,825,761,760,823,817,821,824,825,760,824,760,771,672,787,822,672,822,821,672,821,820,640,670,815,414,444,826,414,826,75,87,85,88,419,110,448,444,82,81,444,81,826,446,421,86,446,86,85,75,826,445,75,445,76,91,419,448,91,448,92,826,81,422,826,422,445,419,412,110,87,446,85,827,828,123,827,123,403,829,830,780,829,780,635,831,342,321,831,321,832,833,834,519,833,519,514,835,836,764,835,764,726,831,833,514,831,514,342,837,835,726,837,726,713,830,838,462,830,462,780,828,839,124,828,124,123,840,841,402,840,402,463,842,829,635,842,635,634,834,843,712,834,712,519,839,844,320,839,320,124,844,832,321,844,321,320,843,837,713,843,713,712,402,841,827,402,827,403,838,840,463,838,463,462,836,842,634,836,634,764,835,837,843,835,843,834,835,834,833,835,833,831,835,831,832,835,832,844,835,844,839,835,839,828,835,828,827,835,827,841,835,841,840,835,840,838,835,838,830,835,830,829,835,829,842,835,842,836,845,846,847,845,847,848,849,850,851,849,851,852,853,854,855,856,857,858,859,860,861,862,863,864,865,866,867,865,867,845,868,869,870,868,870,871,872,873,874,872,874,849,875,876,859,875,859,861,877,878,862,877,862,864,868,871,879,868,879,880,881,882,883,884,885,886,884,886,887,888,889,890,888,890,891,892,893,894,892,894,895,896,897,898,896,898,899,900,901,877,900,877,902,903,904,905,903,905,906,907,908,881,909,910,911,909,911,912,913,914,915,913,915,916,913,916,917,913,917,918,911,919,918,920,921,899,898,922,923,924,925,926,924,926,927,888,928,929,888,929,889,930,931,932,930,932,884,933,934,935,933,935,936,903,937,938,903,938,939,940,941,942,940,942,943,944,945,906,944,906,946,854,947,948,853,949,950,853,950,854,879,873,872,879,872,951,857,952,953,859,954,955,859,955,860,956,957,958,956,958,959,956,959,960,956,960,961,962,946,961,963,964,965,963,965,904,904,903,939,904,939,966,884,932,967,884,967,885,968,969,891,968,891,970,971,972,973,971,973,974,911,910,919,896,917,916,896,916,897,975,864,863,975,863,976,912,911,917,912,917,896,874,977,850,874,850,849,852,851,908,852,908,950,937,903,906,937,906,945,954,876,858,954,858,857,845,867,978,845,978,846,924,927,979,924,979,980,930,884,887,930,887,981,900,867,866,900,866,977,982,951,853,982,853,855,978,902,975,978,975,983,984,948,985,984,985,952,879,951,982,879,982,880,986,878,877,986,877,901,983,987,846,983,846,978,988,862,878,988,878,870,858,876,875,858,875,989,985,953,952,949,853,951,949,951,872,990,907,881,991,992,848,993,994,847,992,883,882,992,882,865,950,949,852,855,948,984,855,984,982,995,984,952,995,952,856,861,996,869,861,869,875,864,975,902,864,902,877,900,902,978,900,978,867,873,879,871,873,871,986,866,997,850,866,850,977,847,846,987,847,987,993,870,869,996,870,996,988,874,873,986,874,986,901,850,997,998,850,998,851,999,888,891,999,891,969,912,896,899,912,899,1000,870,878,986,870,986,871,904,965,1001,904,1001,905,1002,1003,942,1002,942,941,1004,907,990,1004,990,1005,992,991,1005,992,1005,883,994,993,1006,994,1006,1007,892,1008,1009,892,1009,893,1010,1000,1011,1010,1011,1012,1013,980,979,1013,979,1014,970,891,890,970,890,1015,981,887,1016,1017,1018,1019,1017,1019,1020,904,966,1021,904,1021,963,962,961,960,1002,1022,1023,1002,1023,1003,862,988,1024,862,1024,863,946,906,905,946,905,961,857,856,952,947,1025,953,947,953,985,854,948,855,995,880,982,995,982,984,996,861,860,996,860,1024,961,905,1001,961,1001,956,946,962,944,1016,887,886,1016,886,1026,999,928,888,1027,1028,1029,1027,1029,1030,1000,899,921,1000,921,1011,923,920,899,923,899,898,911,918,917,1031,895,894,1031,894,1032,987,983,976,987,976,1006,866,865,882,866,882,997,908,998,881,875,869,868,875,868,989,991,848,847,991,847,994,909,912,1000,909,1000,1010,971,974,1029,971,1029,1028,933,936,1019,933,1019,1018,883,990,881,852,949,872,852,872,849,858,989,995,858,995,856,845,848,992,845,992,865,997,882,881,997,881,998,880,995,989,880,989,868,977,874,901,977,901,900,975,976,983,996,1024,988,954,859,876,948,947,985,998,908,851,883,1005,990,987,1006,993,1033,1034,1035,788,1036,1037,788,1037,757,788,757,756,1038,1039,1040,1038,1040,1041,1042,1043,1036,1042,1036,1044,1035,1045,1046,1035,1046,1033,1038,1047,1048,1038,1048,1049,1050,1051,1045,1050,1045,1035,1052,1053,1054,1052,1054,1055,1056,1057,1058,1055,1054,1059,1055,1059,1060,1061,1060,1062,1061,1062,1063,1064,1063,704,1064,704,703,1063,1062,789,1063,789,728,1063,728,704,1065,1066,745,1065,745,677,1067,1061,1063,1067,1063,1064,1068,1069,1070,1068,1070,1071,1072,1055,1060,1072,1060,1061,1057,1056,1073,1057,1073,1074,1075,1052,1055,1075,1055,1072,1076,1050,1035,1076,1035,1034,1077,1078,1045,1034,1033,1048,1034,1048,1047,1034,1047,1079,1080,1042,1044,1080,1044,1081,1047,1038,1041,1047,1041,1082,1083,1084,675,1083,675,673,1085,1072,1061,1085,1061,1067,1085,1067,1086,1065,676,1087,1065,1087,1071,1044,1036,788,1044,788,746,1037,1082,781,1037,781,757,1043,1079,1037,1043,1037,1036,1049,1088,1039,1049,1039,1038,1089,1090,1043,1089,1043,1042,1045,1051,1077,1091,1092,1090,1091,1090,1089,1093,1094,1095,1093,1095,1056,1067,1096,1097,1067,1097,1086,1098,1097,1096,1098,1096,1099,1060,1059,1087,1060,1087,1062,1099,1096,1100,1099,1100,1101,1062,1087,676,1062,676,789,676,1065,677,1096,1067,1064,1096,1064,1100,1059,1068,1071,1059,1071,1087,1058,1093,1056,1094,1075,1072,1094,1072,1095,1092,1076,1034,1092,1034,1090,1045,1078,1102,1045,1102,1046,1090,1034,1079,1090,1079,1043,1103,1080,1081,1103,1081,1104,1079,1047,1082,1079,1082,1037,1084,1081,1044,1084,1044,746,1084,746,675,1093,1105,1106,1093,1106,1094,1105,1093,1058,1105,1058,1107,1108,1109,1110,1108,1110,1111,1108,1111,1112,1108,1112,1053,1108,1053,1052,1108,1052,1075,1108,1075,1094,1108,1094,1106,1108,1106,1113,1108,1113,1114,1115,803,802,1116,1117,1118,1119,1120,1121,1108,1114,1122,1108,1122,1123,1107,1124,1125,1126,805,811,1126,811,1127,1128,1129,1130,1128,1130,1131,1128,1131,1132,1130,1133,1134,1130,1134,1135,1130,1135,1131,1117,1132,1136,1117,1136,1137,1069,1138,1139,1069,1139,1070,1140,1115,802,1140,802,810,1115,1141,1142,1115,1142,803,1138,1143,1141,1138,1141,1139,1132,1131,1144,1132,1144,1145,1132,1145,1136,1134,1146,1147,1134,1147,1135,1116,1128,1132,1116,1132,1117,1148,1149,1125,1148,1125,1150,1148,1150,1151,1106,1105,1125,1106,1125,1149,1152,1120,1119,1120,1122,1153,1120,1153,1121,1154,1116,1118,1123,1120,1152,1116,1155,1128,1109,1108,1123,1109,1123,1156,1114,1113,1153,1114,1153,1122,1125,1124,1157,1125,1157,1150,1156,1123,1118,1156,1118,1143,1135,1147,1158,1135,1158,1159,1118,1117,1137,1118,1137,1142,1137,1136,808,1137,808,807,1066,1140,810,1066,810,745,1142,1137,807,1142,807,803,1143,1118,1142,1143,1142,1141,1144,1131,1135,1144,1135,1159,1144,1159,1126,1123,1152,1154,1123,1154,1118,1153,1149,1148,1153,1148,1160,1153,1160,1121,1113,1106,1149,1113,1149,1153,1125,1105,1107,1155,1116,1154,1123,1122,1120,1155,1119,1121,1155,1121,1128,1161,1162,1163,1164,1165,1166,1164,1166,1167,1164,1167,1168,1169,1170,1171,1172,1173,1174,1172,1174,1175,1176,1177,1119,1176,1119,1155,1178,1177,1176,1178,1176,1179,1180,812,808,1180,808,1136,1160,1151,1181,1182,1183,1184,1182,1184,1129,1182,1129,1128,1185,1182,1128,1185,1128,1121,1129,1184,1133,1179,1176,1155,1179,1155,1154,1186,1172,1175,1186,1175,1187,1188,818,817,1188,817,1163,1168,1189,1190,1166,1191,1192,1166,1192,1167,1144,1126,1127,1193,1188,1163,1193,1163,1162,1193,1162,1194,1145,1144,1127,1193,819,818,1193,818,1188,1168,1190,1164,819,1193,1194,819,1194,820,1173,1172,1186,1173,1186,1195,1173,1195,1196,1173,1196,1174,1177,1178,1152,1177,1152,1119,1133,1130,1129,812,1180,1197,812,1197,813,1181,1198,1185,1181,1185,1121,1181,1121,1160,1160,1148,1151,813,1197,1127,813,1127,811,1178,1179,1154,1178,1154,1152,1195,1186,1187,1195,1187,1196,1171,1199,1169,1191,1200,1199,1191,1199,1171,1191,1171,1192,1127,1197,1180,1127,1180,1136,1127,1136,1145,1163,1201,1161,1146,1098,1099,1146,1099,1147,1124,1057,1074,1124,1074,1157,1107,1058,1057,1107,1057,1124,1147,1099,1101,1147,1101,1158,1056,1095,1085,1056,1085,1073,1072,1085,1095,1192,1202,1203,1192,1203,1204,1205,1187,1206,1207,1083,673,1207,673,825,1194,1208,815,1194,815,820,1209,1206,1210,1209,1210,1208,1211,1212,1213,1211,1213,1214,1215,1216,1217,1215,1217,1206,1170,1218,1202,1170,1202,1192,1170,1192,1171,1219,1220,1202,1219,1202,1218,1221,1222,1223,1175,1174,1204,1223,1218,1170,1223,1170,1169,1223,1169,1224,1189,1168,1167,1189,1167,1225,1189,1225,1226,1227,1228,1212,1227,1212,1211,1225,1209,1208,1225,1208,1194,1229,1103,1104,1229,1104,1230,1231,1207,825,1231,825,824,1187,1175,1215,1187,1215,1206,1192,1204,1174,1231,816,1210,1231,1210,1232,1175,1204,1215,1167,1192,1174,1167,1174,1196,1208,1210,816,1208,816,815,1206,1217,1232,1206,1232,1210,1212,1226,1161,1212,1161,1201,1212,1201,1213,1205,1206,1209,1233,1223,1224,1233,1224,1234,1222,1219,1218,1222,1218,1223,1196,1187,1205,1223,1233,1221,823,1201,1163,823,1163,817,1167,1205,1209,1167,1209,1225,1228,1190,1189,1228,1189,1226,1228,1226,1212,1161,1226,1225,1161,1225,1194,1161,1194,1162,1217,1229,1230,1217,1230,1232,816,1231,824,1167,1196,1205,1204,1203,1215,1235,1236,1215,1235,1215,1203,1220,1235,1203,1220,1203,1202,1236,1237,1216,1236,1216,1215,1077,1221,1233,1077,1233,1078,1039,1211,1214,1039,1214,1040,1078,1233,1234,1078,1234,1102,1088,1227,1211,1088,1211,1039,1219,1222,1051,1219,1051,1050,1219,1050,1076,1219,1076,1092,1219,1092,1091,1219,1091,1238,1219,1238,1239,1219,1239,1240,1219,1240,1237,1219,1237,1236,1219,1236,1235,1219,1235,1220,1051,1222,1221,1051,1221,1077,1241,39,1242,999,969,372,441,924,980,441,980,165,857,310,433,311,1001,965,311,965,434,346,942,1003,346,1003,297,1243,1244,1245,1243,1245,1246,431,1007,1006,431,1006,469,431,469,142,431,41,1007,138,42,1004,138,1004,1005,922,898,540,922,540,40,914,913,430,914,430,44,72,152,910,72,910,909,920,923,1241,920,1241,1242,542,1032,471,369,1014,157,494,1030,495,893,1009,151,893,151,71,1014,979,158,1014,158,157,166,165,980,166,980,1013,973,972,169,973,169,172,384,1015,177,1015,890,178,1015,178,177,373,372,969,373,969,968,1026,886,509,1026,509,280,506,1016,353,524,349,934,524,934,933,936,935,236,936,236,56,1247,1248,1249,1247,1249,1250,443,528,1022,443,1022,1002,1003,1023,298,1003,298,297,349,352,934,1251,1252,1253,528,559,1022,966,939,294,966,294,293,944,962,336,944,336,348,960,33,35,956,1001,311,956,311,46,47,310,857,47,857,953,854,950,125,854,125,318,1024,860,563,1024,563,562,513,309,1254,860,955,547,860,547,522,860,522,563,547,955,307,48,47,953,48,953,1025,965,964,308,965,308,434,959,958,437,959,437,33,348,347,945,348,945,944,963,1021,1254,963,1254,1255,577,298,1023,1256,1257,1258,237,236,935,559,577,1023,559,1023,1022,227,367,941,227,941,940,1250,1253,1252,1250,1252,1259,352,237,935,352,935,934,281,510,1018,281,1018,1017,261,357,931,357,507,932,357,932,931,1016,1026,279,1016,279,353,214,188,928,214,928,999,187,186,968,187,968,970,485,373,968,481,480,972,481,972,971,369,498,1013,369,1013,1014,927,926,473,927,473,423,1009,1008,496,1009,496,405,169,972,480,473,926,393,219,1031,220,1011,921,401,1011,401,400,919,910,152,919,152,406,918,408,430,897,916,141,897,141,140,139,138,1005,139,1005,991,950,908,126,950,126,125,1006,976,537,1006,537,469,40,39,1241,994,539,991,72,909,1010,72,1010,73,530,892,895,530,895,371,481,971,1028,481,1028,179,1260,1261,1249,1260,1249,1248,524,933,1018,524,1018,510,1242,39,468,1254,309,1255,509,886,885,509,885,523,59,1019,936,59,936,56,178,890,889,178,889,478,70,1029,974,70,974,67,74,894,893,74,893,71,540,898,897,540,897,140,539,139,991,126,908,464,907,1004,436,907,436,128,907,128,130,436,1004,42,468,401,921,915,914,44,915,44,43,430,913,918,472,73,1010,472,1010,1012,923,922,40,923,40,1241,496,1008,497,166,1013,498,1032,894,74,1032,74,471,219,371,895,219,895,1031,441,387,925,441,925,924,974,973,215,974,215,67,485,968,186,479,929,383,889,929,479,889,479,478,426,262,931,426,931,930,885,967,350,885,350,523,280,279,1026,931,262,261,1020,1019,59,1020,59,502,1260,1262,1263,1260,1263,1261,1245,1258,1257,1245,1257,1246,943,942,346,943,346,345,502,501,1020,1259,1247,1250,345,511,943,1021,966,513,1021,513,1254,295,294,939,295,939,938,962,960,337,962,337,336,957,956,46,957,46,45,335,337,960,335,960,35,955,954,433,955,433,307,947,854,334,947,334,317,863,1024,562,863,562,573,318,334,854,316,1025,947,316,947,317,316,317,299,316,48,1025,513,966,293,958,957,45,958,45,437,960,959,33,296,295,938,296,938,937,964,963,1255,964,1255,308,228,227,940,1262,1264,1263,282,281,1017,940,943,511,940,511,228,1253,1244,1243,1253,1243,1251,1264,1256,1258,1264,1258,1263,1017,1020,501,1017,501,282,351,350,967,507,351,967,507,967,932,506,427,981,506,981,1016,929,928,192,929,192,383,188,192,928,180,179,1028,180,1028,1027,1030,1029,70,1030,70,495,926,925,388,926,388,393,530,497,1008,530,1008,892,215,973,172,388,925,387,151,1009,405,921,920,1242,921,1242,468,400,472,1012,400,1012,1011,918,919,406,918,406,398,916,915,43,916,43,141,398,397,408,398,408,918,994,1007,41,994,41,539,908,907,130,908,130,464,976,863,573,976,573,537,443,1002,941,443,941,367,296,937,945,296,945,347,857,433,954,158,979,927,158,927,423,214,999,372,426,930,981,426,981,427,1255,309,308,384,187,970,384,970,1015,494,385,1027,494,1027,1030,180,1027,385,542,220,1031,542,1031,1032,1265,1266,791,1265,791,680,1265,1267,1268,1265,1268,1266,793,791,1266,1269,1265,680,1269,680,679,603,366,1270,603,1270,1271,527,793,1266,527,1266,1268,1269,1272,1267,1269,1267,1265,1271,1270,1272,1271,1272,1269,1271,1269,679,1271,679,603,230,500,1273,230,1273,1274,1275,1276,1277,1275,1277,1278,1279,1280,1274,1279,1274,1273,1278,1277,1280,1278,1280,1279,235,234,1276,235,1276,1275,500,527,1268,500,1268,1273,1270,1275,1278,1270,1278,1272,1267,1279,1273,1267,1273,1268,1272,1278,1279,1272,1279,1267,366,235,1275,366,1275,1270,1281,1260,1248,1281,1248,1282,1283,1284,1277,1283,1277,1276,368,231,1285,368,1285,1286,1287,1288,239,1287,239,1289,234,503,1290,234,1290,1283,234,1283,1276,1264,1262,1291,1264,1291,1288,1264,1288,1287,1284,1259,1252,1284,1252,1292,1292,1252,1251,1292,1251,1285,1292,1285,1293,1290,1282,1248,1290,1248,1247,1256,1264,1287,1256,1287,1294,503,58,1282,503,1282,1290,529,442,1295,529,1295,1296,1284,1292,1280,1284,1280,1277,57,1281,1282,57,1282,58,1246,1295,1286,1246,1286,1243,231,230,1293,231,1293,1285,240,239,1288,240,1288,1291,230,1274,1293,1283,1290,1247,1283,1247,1259,1283,1259,1284,1251,1243,1286,1251,1286,1285,1246,1257,1296,1246,1296,1295,1281,1291,1262,1281,1262,1260,1296,1257,1256,1296,1256,1294,1296,1294,1297,1294,1287,1289,1294,1289,1298,57,240,1291,57,1291,1281,557,529,1296,557,1296,1297,1292,1293,1274,1292,1274,1280,368,1286,1295,368,1295,442,1298,572,576,1298,576,557,1297,1294,1298,1297,1298,557,435,570,1289,435,1289,239,570,572,1298,570,1298,1289,1261,1263,1258,1261,1258,1245,1261,1245,1244,1261,1244,1249,1250,1249,1244,1250,1244,1253,767,416,451,767,451,618,416,102,452,416,452,451,417,438,104,417,104,428,101,450,103,101,103,415,450,428,104,450,104,103,102,101,415,102,415,452,417,98,97,417,97,438,1182,1185,1198,1182,1198,1183,1151,1133,1184,1151,1184,1181,1183,1198,1181,1183,1181,1184,1150,1157,1146,1150,1146,1134,1126,1159,806,1126,806,805,1159,1158,800,1159,800,806,1151,1150,1134,1151,1134,1133,1158,1101,697,800,1158,697,800,697,799,1157,1074,1098,1157,1098,1146,1101,1100,700,1101,700,697,1100,1064,703,1100,703,700,1074,1073,1097,1074,1097,1098,1073,1085,1086,1073,1086,1097,1299,1089,1042,1299,1042,1080,1112,1111,1300,1112,1300,1301,1301,1300,1069,1301,1069,1068,1071,1070,1066,1071,1066,1065,1239,1238,1299,1239,1299,1302,1302,1299,1080,1302,1080,1103,1104,1081,1084,1104,1084,1083,1053,1112,1301,1053,1301,1054,1054,1301,1068,1054,1068,1059,1238,1091,1089,1238,1089,1299,1070,1139,1140,1110,1109,1156,1110,1156,1303,1300,1303,1138,1300,1138,1069,1139,1141,1115,1139,1115,1140,1111,1110,1303,1111,1303,1300,1303,1156,1143,1303,1143,1138,1070,1140,1066,1304,1305,250,1304,250,24,1305,1306,251,1305,251,250,1307,1308,223,1307,223,375,1308,1309,27,1308,27,223,1310,1302,1103,1310,1103,1229,1230,1104,1083,1216,1310,1229,1216,1229,1217,1230,1083,1207,1232,1230,1207,1232,1207,1231,1237,1240,1310,1237,1310,1216,1240,1239,1302,1240,1302,1310,1311,1312,1313,1311,1313,1314,1311,1314,1315,1316,1317,1314,1316,1314,1313,1318,1317,1316,1318,1316,1319,1320,1321,1318,1320,1318,1319,1322,1323,1321,1322,1321,1320,1322,1320,1324,1325,1326,1327,1328,1329,1330,1328,1330,1326,1328,1326,1325,1328,1325,1331,1328,1331,1332,1333,1334,1335,1333,1335,1336,1326,1330,1304,1326,1304,1337,1333,24,364,1333,1336,1337,1333,1337,1304,1333,1304,24,1338,38,1339,1306,1340,1339,1306,1339,38,1306,38,251,1306,1305,1329,1341,38,1338,1341,1338,1342,1329,1328,1306,38,1341,36,1328,1332,1343,1328,1343,1340,1328,1340,1306,1330,1329,1305,1330,1305,1304,1344,212,1345,1344,1345,1346,1347,1348,1349,1347,1349,1307,1347,1307,1350,1351,1308,1307,1345,212,211,1352,1350,1307,1352,1307,375,1352,375,212,1307,1349,1351,212,1344,1352,1351,1353,1309,1351,1309,1308,1354,27,1309,1354,1309,1355,1354,1355,1356,1353,1357,1355,1353,1355,1309,27,1354,582,1358,1357,1353,1358,1353,1351,1358,1351,1349,1358,1349,1348,1358,1348,1359,1358,1360,1357,1361,1362,1363,1364,1365,1345,1366,1367,1350,1366,1350,1352,1341,1368,1369,1370,1371,1372,1372,1368,1341,1372,1341,1342,1365,1361,1346,1365,1346,1345,1372,1342,1370,1369,1373,1341,1374,1375,1339,1374,1339,1340,1364,1345,1376,1361,1363,1346,1375,1374,1377,1325,1327,1378,1325,1378,1379,1372,1371,1369,1372,1369,1368,1370,1380,1381,1370,1381,1373,1381,1334,224,1381,224,226,1342,1382,1379,1342,1379,1380,1342,1380,1370,1325,1379,1382,1343,1383,1340,1384,1377,1383,1384,1383,1338,1369,1371,1370,1369,1370,1373,1331,1325,1382,1383,1382,1342,1383,1342,1338,1379,1378,1335,1379,1335,1380,36,1373,1381,36,1381,226,1334,1381,1380,1334,1380,1335,1343,1332,1331,1343,1331,1382,1343,1382,1383,1377,1384,1375,1373,36,1341,364,224,1334,364,1334,1333,1327,1326,1337,1327,1337,1378,1378,1337,1336,1378,1336,1335,1377,1374,1340,1377,1340,1383,1339,1384,1338,1384,1339,1375,1385,1386,580,1385,580,579,1387,1388,1346,1387,1346,1363,1387,1363,1389,1359,1348,1347,1359,1347,1390,1359,1390,1388,1347,1350,1390,1362,1364,1376,1362,1376,1363,1391,1366,1392,1358,1359,1387,1386,1385,1393,1386,1393,1389,211,1376,1345,1376,211,580,1376,580,1386,1389,1363,1376,1389,1376,1386,1388,1390,1344,1388,1344,1346,1359,1388,1387,1391,1367,1366,1391,1392,1344,1391,1344,1390,1360,1358,1387,1360,1387,1394,1362,1361,1365,1362,1365,1364,1394,1387,1389,1394,1389,1393,1392,1352,1344,1392,1366,1352,1391,1350,1367,1350,1391,1390,1357,1360,1394,1357,1394,1355,1355,1394,1393,1355,1393,1356,1385,1354,1356,1385,1356,1393,579,582,1354,579,1354,1385,1190,1169,1199,1190,1199,1164,1200,1165,1164,1200,1164,1199,1191,1166,1165,1191,1165,1200,1213,1201,823,1213,823,814,1224,1169,1190,1224,1190,1228,1214,1213,814,1214,814,801,1234,1224,1228,1234,1228,1227,1040,1214,801,1102,1234,1227,1102,1227,1088,1040,801,646,1040,646,645,1046,1102,1088,1046,1088,1049,1041,1040,645,1041,645,754,1033,1046,1049,1033,1049,1048,1082,1041,754,1082,754,781,1323,1395,1396,1397,1398,1399,1397,1399,1400,1397,1400,1401,1402,1403,491,1402,491,488,1404,1405,378,1404,378,379,1406,1407,532,1406,532,533,1408,1409,1410,1408,1410,1411,1407,1412,184,1407,184,532,1405,1413,377,1405,377,378,1396,1414,1321,1396,1321,1323,1415,1398,1397,1415,1397,1416,1415,1416,1417,1397,1401,1416,1395,487,1396,1399,1418,1419,1399,1419,1400,1395,1323,1322,1395,1322,1420,1395,1420,1421,487,1395,1422,487,1422,1402,487,1402,488,1423,1404,379,1423,379,181,583,1406,533,583,533,534,1409,1424,1425,1409,1425,1410,1412,1423,181,1412,181,184,1413,1414,1396,1413,1396,487,1413,487,377,1417,1416,1324,1417,1324,1320,1322,1324,1420,1426,1427,1428,1426,1428,1429,1430,1431,1432,1433,1434,1406,1433,1406,583,1435,1436,1404,1435,1404,1423,1437,1413,1405,1438,1439,1440,1438,1440,1441,1425,1441,1442,1424,1398,1415,1430,1443,1431,1424,1444,1438,1424,1438,1425,1435,1445,1426,1435,1426,1446,1434,1433,1447,1434,1447,1448,1436,1435,1446,1436,1446,1449,575,1447,1433,575,1433,546,1450,1431,1317,1450,1317,1318,1399,1409,1408,1410,1425,1442,1410,1442,1451,1411,1410,1451,1317,1431,1443,1317,1443,1314,1321,1414,1450,1321,1450,1318,1445,1435,1423,1445,1423,1412,1434,1452,1406,1432,1449,1453,1432,1453,1454,1448,1455,1428,32,31,1447,32,1447,575,1427,1448,1428,1446,1426,1429,1446,1429,1456,546,1433,583,546,583,535,1452,1407,1406,1436,1437,1405,1436,1405,1404,1417,1320,1319,1417,1319,1457,1439,1316,1313,1439,1313,1440,1451,1458,1411,1408,1418,1399,1413,1450,1414,1439,1457,1319,1439,1319,1316,1450,1437,1432,1450,1432,1431,1445,1452,1427,1445,1427,1426,1452,1434,1448,1452,1448,1427,1437,1436,1449,1437,1449,1432,1438,1444,1457,1438,1457,1439,1424,1409,1399,1424,1399,1398,1415,1444,1424,1425,1438,1441,1415,1417,1457,1415,1457,1444,1437,1450,1413,1452,1445,1412,1452,1412,1407,1432,1454,1430,1449,1446,1456,1449,1456,1453,1448,1447,31,1448,31,1455,1418,1408,1411,1418,1411,1458,1418,1458,1459,1418,1459,1419,1403,1460,242,1403,242,491,1311,1461,1312,1462,1315,1463,1455,31,30,1455,30,284,1453,1456,269,1453,269,268,525,1462,1463,1463,1443,1430,1463,1430,257,1463,257,525,1456,1429,276,1456,276,269,1443,1463,1315,1443,1315,1314,1464,1442,1441,1464,1441,1440,1464,1440,1465,1315,1462,1466,1315,1466,1461,1315,1461,1311,1464,1465,1467,1458,1451,1468,1458,1468,1459,1428,1455,284,1428,284,277,1454,1453,268,1454,268,258,1460,1469,243,1460,243,242,1430,1454,258,1430,258,257,1429,1428,277,1429,277,276,1465,1440,1313,1465,1313,1312,1451,1442,1464,1451,1464,1467,1451,1467,1468,1462,525,243,1462,243,1469,1462,1469,1470,1395,1471,1472,1473,1474,1420,1473,1420,1324,1475,1476,1312,1475,1312,1461,1477,1478,1466,1477,1466,1462,1479,1462,1470,1480,1473,1324,1480,1324,1416,1481,1471,1395,1481,1395,1421,1476,1482,1465,1476,1465,1312,1479,1477,1462,1482,1483,1467,1482,1467,1465,1484,1480,1416,1484,1416,1401,1472,1422,1395,1478,1485,1486,1478,1486,1466,1487,1481,1421,1487,1421,1488,1489,1490,1491,1489,1491,1492,1491,1490,1419,1491,1419,1459,1489,1492,1460,1489,1460,1403,1493,1470,1469,1470,1493,1494,1470,1494,1486,1491,1494,1493,1491,1493,1492,1483,1482,1476,1483,1476,1475,1483,1475,1461,1483,1461,1467,1486,1467,1461,1486,1461,1466,1485,1479,1470,1485,1470,1486,1486,1494,1468,1486,1468,1467,1469,1460,1492,1469,1492,1493,1477,1479,1485,1477,1485,1478,1494,1491,1459,1494,1459,1468,1480,1484,1474,1480,1474,1473,1403,1402,1495,1403,1495,1489,1400,1419,1490,1400,1490,1496,1472,1471,1481,1472,1481,1487,1472,1487,1488,1472,1488,1422,1495,1422,1488,1495,1488,1496,1474,1484,1401,1474,1401,1420,1489,1495,1496,1489,1496,1490,1421,1420,1401,1421,1401,1488,1495,1402,1422,1488,1401,1400,1488,1400,1496,1497,1498,1499,1497,1499,1500,1500,1499,113,1500,113,112,1499,1498,543,1499,543,113,1498,1497,568,1498,568,543,1497,1500,112,1497,112,568,1501,1502,1503,1501,1503,1504,1505,1506,1507,1505,1507,1508,1509,1510,1511,1509,1511,1512,1513,1514,1515,1513,1515,1516,1517,1518,1519,1517,1519,1520,1521,1522,1523,1521,1523,1524,1525,1526,1527,1525,1527,1528,1529,1530,1531,1529,1531,1532,1533,1534,1535,1533,1535,1536,1537,1538,1539,1537,1539,1540,1536,1535,1538,1536,1538,1537,1532,1531,1534,1532,1534,1533,1528,1527,1530,1528,1530,1529,1524,1523,1526,1524,1526,1525,1520,1519,1522,1520,1522,1521,1516,1515,1518,1516,1518,1517,1512,1511,1514,1512,1514,1513,1508,1507,1510,1508,1510,1509,1504,1503,1506,1504,1506,1505,1540,1539,1502,1540,1502,1501,1541,1537,1540,1541,1540,1542,1543,1533,1536,1543,1536,1544,1545,1529,1532,1545,1532,1546,1547,1525,1528,1547,1528,1548,1549,1521,1524,1549,1524,1550,1551,1517,1520,1551,1520,1552,1553,1513,1516,1553,1516,1554,1555,1509,1512,1555,1512,1556,1557,1505,1508,1557,1508,1558,1559,1501,1504,1559,1504,1560,1542,1540,1501,1542,1501,1559,1560,1504,1505,1560,1505,1557,1558,1508,1509,1558,1509,1555,1556,1512,1513,1556,1513,1553,1554,1516,1517,1554,1517,1551,1552,1520,1521,1552,1521,1549,1550,1524,1525,1550,1525,1547,1548,1528,1529,1548,1529,1545,1546,1532,1533,1546,1533,1543,1544,1536,1537,1544,1537,1541,1561,1559,1560,1561,1560,1562,1563,1557,1558,1563,1558,1564,1565,1555,1556,1565,1556,1566,1567,1553,1554,1567,1554,1568,1569,1551,1552,1569,1552,1570,1571,1549,1550,1571,1550,1572,1573,1547,1548,1573,1548,1574,1575,1545,1546,1575,1546,1576,1577,1543,1544,1577,1544,1578,1579,1541,1542,1579,1542,1580,1578,1544,1541,1578,1541,1579,1576,1546,1543,1576,1543,1577,1574,1548,1545,1574,1545,1575,1572,1550,1547,1572,1547,1573,1570,1552,1549,1570,1549,1571,1568,1554,1551,1568,1551,1569,1566,1556,1553,1566,1553,1567,1564,1558,1555,1564,1555,1565,1562,1560,1557,1562,1557,1563,1580,1542,1559,1580,1559,1561,1581,1579,1580,1581,1580,1582,1583,1577,1578,1583,1578,1584,1585,1575,1576,1585,1576,1586,1587,1573,1574,1587,1574,1588,1589,1571,1572,1589,1572,1590,1591,1569,1570,1591,1570,1592,1593,1567,1568,1593,1568,1594,1595,1565,1566,1595,1566,1596,1597,1563,1564,1597,1564,1598,1599,1561,1562,1599,1562,1600,1582,1580,1561,1582,1561,1599,1600,1562,1563,1600,1563,1597,1598,1564,1565,1598,1565,1595,1596,1566,1567,1596,1567,1593,1594,1568,1569,1594,1569,1591,1592,1570,1571,1592,1571,1589,1590,1572,1573,1590,1573,1587,1588,1574,1575,1588,1575,1585,1586,1576,1577,1586,1577,1583,1584,1578,1579,1584,1579,1581,1601,1582,1599,1601,1599,1602,1602,1599,1600,1602,1600,1603,1603,1600,1597,1603,1597,1604,1604,1597,1598,1604,1598,1605,1605,1598,1595,1605,1595,1606,1606,1595,1596,1606,1596,1607,1607,1596,1593,1607,1593,1608,1608,1593,1594,1608,1594,1609,1609,1594,1591,1609,1591,1610,1610,1591,1592,1610,1592,1611,1611,1592,1589,1611,1589,1612,1612,1589,1590,1612,1590,1613,1613,1590,1587,1613,1587,1614,1614,1587,1588,1614,1588,1615,1615,1588,1585,1615,1585,1616,1616,1585,1586,1616,1586,1617,1617,1586,1583,1617,1583,1618,1618,1583,1584,1618,1584,1619,1619,1584,1581,1619,1581,1620,1620,1581,1582,1620,1582,1601,1621,1622,1623,1624,1621,1623,1625,1624,1623,1626,1625,1623,1627,1626,1623,1628,1627,1623,1629,1628,1623,1630,1629,1623,1631,1630,1623,1632,1631,1623,1633,1632,1623,1634,1633,1623,1635,1634,1623,1636,1635,1623,1637,1636,1623,1638,1637,1623,1639,1638,1623,1640,1639,1623,1641,1640,1623,1622,1641,1623,1642,1601,1602,1642,1602,1643,1643,1602,1603,1643,1603,1644,1644,1603,1604,1644,1604,1645,1645,1604,1605,1645,1605,1646,1646,1605,1606,1646,1606,1647,1647,1606,1607,1647,1607,1648,1648,1607,1608,1648,1608,1649,1649,1608,1609,1649,1609,1650,1650,1609,1610,1650,1610,1651,1651,1610,1611,1651,1611,1652,1652,1611,1612,1652,1612,1653,1653,1612,1613,1653,1613,1654,1654,1613,1614,1654,1614,1655,1655,1614,1615,1655,1615,1656,1656,1615,1616,1656,1616,1657,1657,1616,1617,1657,1617,1658,1658,1617,1618,1658,1618,1659,1659,1618,1619,1659,1619,1660,1660,1619,1620,1660,1620,1661,1661,1620,1601,1661,1601,1642,1621,1661,1642,1621,1642,1622,1624,1660,1661,1624,1661,1621,1625,1659,1660,1625,1660,1624,1626,1658,1659,1626,1659,1625,1627,1657,1658,1627,1658,1626,1628,1656,1657,1628,1657,1627,1629,1655,1656,1629,1656,1628,1630,1654,1655,1630,1655,1629,1631,1653,1654,1631,1654,1630,1632,1652,1653,1632,1653,1631,1633,1651,1652,1633,1652,1632,1634,1650,1651,1634,1651,1633,1635,1649,1650,1635,1650,1634,1636,1648,1649,1636,1649,1635,1637,1647,1648,1637,1648,1636,1638,1646,1647,1638,1647,1637,1639,1645,1646,1639,1646,1638,1640,1644,1645,1640,1645,1639,1641,1643,1644,1641,1644,1640,1622,1642,1643,1622,1643,1641,1538,1535,1534,1538,1534,1531,1538,1531,1530,1538,1530,1527,1538,1527,1526,1538,1526,1523,1538,1523,1522,1538,1522,1519,1538,1519,1518,1538,1518,1515,1538,1515,1514,1538,1514,1511,1538,1511,1510,1538,1510,1507,1538,1507,1506,1538,1506,1503,1538,1503,1502,1538,1502,1539,1662,1663,1664,1662,1664,1665,1666,1667,1668,1666,1668,1669,1663,1662,1670,1663,1670,1671,1672,1673,1669,1672,1669,1668,1674,1675,1676,1674,1676,1677,1678,1679,1680,1678,1680,1681,1682,1683,1684,1682,1684,1685,1686,1687,1682,1686,1682,1675,1688,1689,1679,1688,1679,1678,1690,1691,1692,1693,1694,1695,1693,1695,1696,1691,1696,1695,1697,1698,1699,1697,1699,1700,1701,1702,1703,1701,1703,1704,1705,1706,1707,1708,1709,1710,1708,1710,1705,1707,1711,1712,1713,1714,1704,1713,1704,1715,1716,1717,1718,1716,1718,1701,1715,1704,1703,1715,1703,1719,1720,1721,1722,1720,1722,1723,1701,1718,1724,1701,1724,1702,1717,1725,1726,1717,1726,1718,1727,1728,1729,1727,1729,1709,1709,1729,1730,1709,1730,1710,1710,1730,1731,1710,1731,1706,1716,1701,1714,1732,1733,1734,1697,1735,1736,1697,1736,1698,1690,1737,1738,1690,1738,1739,1740,1691,1690,1740,1690,1741,1734,1688,1678,1734,1678,1742,1687,1743,1683,1687,1683,1682,1744,1733,1732,1742,1678,1681,1742,1681,1745,1697,1674,1677,1697,1677,1735,1721,1739,1738,1721,1738,1722,1675,1682,1685,1675,1685,1676,1721,1746,1747,1721,1747,1739,1683,1748,1749,1683,1749,1684,1732,1748,1744,1750,1686,1675,1750,1675,1674,1680,1679,1693,1680,1693,1751,1751,1693,1696,1751,1696,1752,1752,1696,1691,1752,1691,1740,1753,1754,1755,1753,1755,1756,1734,1742,1732,1701,1704,1714,1712,1711,1720,1712,1720,1723,1706,1731,1757,1706,1757,1711,1758,1713,1715,1758,1715,1727,1726,1759,1760,1726,1760,1761,1727,1715,1719,1727,1719,1728,1746,1721,1720,1746,1720,1762,1718,1726,1761,1718,1761,1724,1725,1763,1759,1725,1759,1726,1758,1727,1709,1758,1709,1708,1707,1706,1711,1711,1757,1762,1711,1762,1720,1705,1710,1706,1764,1732,1742,1764,1742,1745,1695,1692,1691,1741,1690,1739,1741,1739,1747,1692,1737,1690,1679,1689,1694,1679,1694,1693,1700,1750,1674,1700,1674,1697,1743,1744,1748,1743,1748,1683,1748,1732,1764,1748,1764,1749,1755,1698,1736,1755,1736,1756,1765,1766,1767,1765,1767,1768,1769,1770,1771,1769,1771,1772,1666,1773,1667,1768,1767,1774,1775,1768,1776,1777,1772,1771,1777,1771,1778,1777,1778,1779,1774,1767,1780,1774,1780,1781,1782,1672,1668,1782,1668,1783,1784,1785,1786,1784,1786,1787,1788,1789,1790,1789,1791,1792,1789,1792,1790,1793,1794,1790,1793,1790,1795,1796,1797,1784,1796,1784,1787,1796,1787,1798,1799,1800,1782,1799,1782,1783,1799,1783,1801,1777,1779,1802,1767,1803,1780,1771,1804,1805,1771,1805,1778,1780,1806,1807,1780,1807,1781,1770,1808,1804,1770,1804,1771,1803,1809,1806,1803,1806,1780,1810,1765,1768,1810,1768,1811,1812,1769,1772,1812,1772,1813,1811,1768,1775,1811,1775,1814,1811,1814,1815,1813,1772,1777,1813,1777,1802,1813,1802,1816,1767,1766,1803,1799,1801,1817,1785,1818,1819,1785,1819,1786,1792,1820,1821,1792,1821,1822,1791,1823,1820,1791,1820,1792,1794,1824,1825,1794,1825,1788,1794,1788,1790,1790,1792,1822,1790,1822,1795,1818,1800,1799,1818,1799,1817,1818,1817,1819,1775,1776,1814,1667,1813,1816,1667,1816,1668,1804,1811,1815,1804,1815,1805,1768,1774,1776,1806,1794,1793,1806,1793,1807,1773,1812,1813,1773,1813,1667,1808,1810,1811,1808,1811,1804,1809,1824,1794,1809,1794,1806,1821,1820,1826,1827,1826,1797,1828,1829,1782,1828,1782,1800,1830,1831,1784,1830,1784,1797,1832,1830,1797,1833,1828,1800,1833,1800,1818,1829,1834,1672,1829,1672,1782,1832,1826,1820,1832,1820,1823,1834,1673,1672,1831,1835,1785,1831,1785,1784,1797,1826,1832,1835,1833,1818,1835,1818,1785,1797,1796,1836,1797,1836,1827,1826,1827,1821,1796,1798,1836,1754,1753,1837,1754,1837,1838,1839,1840,1841,1842,1840,1843,1842,1843,1844,1845,1846,1844,1845,1844,1843,1847,1848,1849,1850,1851,1852,1850,1852,1853,1854,1850,1853,1854,1853,1855,1763,1856,1854,1763,1854,1759,1857,1845,1843,1857,1843,1858,1840,1839,1858,1840,1858,1843,1859,1754,1838,1859,1838,1860,1698,1755,1861,1861,1699,1698,1845,1857,1860,1845,1860,1838,1840,1842,1862,1840,1862,1841,1852,1851,1849,1852,1849,1863,1864,1865,1851,1864,1851,1850,1849,1841,1862,1849,1862,1863,1759,1854,1855,1759,1855,1760,1856,1864,1850,1856,1850,1854,1848,1841,1849,1849,1851,1865,1849,1865,1847,1839,1841,1848,1754,1859,1861,1754,1861,1755,1846,1845,1838,1846,1838,1837,1866,1700,1699,1867,1868,1869,1867,1869,1870,1871,1872,1873,1871,1873,1874,1875,1716,1714,1875,1714,1876,1877,1878,1763,1877,1763,1725,1879,1880,1716,1881,1882,1713,1881,1713,1758,1883,1708,1705,1884,1885,1886,1884,1886,1887,1888,1889,1890,1891,1892,1847,1893,1891,1847,1893,1847,1865,1889,1884,1887,1889,1887,1894,1895,1896,1705,1895,1705,1897,1876,1714,1713,1898,1877,1725,1878,1899,1856,1878,1856,1763,1900,1871,1874,1900,1874,1901,1867,1870,1902,1868,1903,1699,1868,1699,1869,1866,1904,1750,1866,1750,1700,1905,1867,1902,1872,1906,1907,1872,1907,1873,1858,1839,1848,1858,1848,1847,1858,1847,1908,1858,1908,1890,1858,1890,1894,1858,1894,1887,1858,1887,1886,1858,1886,1909,1858,1909,1897,1858,1897,1705,1858,1705,1707,1858,1707,1712,1858,1712,1723,1858,1723,1722,1858,1722,1738,1858,1738,1737,1858,1737,1692,1858,1692,1695,1858,1695,1901,1858,1901,1874,1858,1874,1873,1858,1873,1907,1858,1907,1902,1858,1902,1870,1858,1870,1869,1858,1869,1699,1858,1699,1861,1858,1861,1859,1858,1859,1860,1858,1860,1857,1880,1898,1725,1880,1725,1717,1882,1876,1713,1883,1881,1758,1883,1758,1708,1885,1910,1909,1885,1909,1886,1892,1888,1890,1892,1890,1908,1911,1893,1865,1911,1865,1864,1892,1908,1847,1889,1894,1890,1910,1895,1897,1910,1897,1909,1705,1896,1883,1875,1879,1716,1880,1717,1716,1899,1911,1864,1899,1864,1856,1912,1900,1901,1912,1901,1695,1906,1905,1902,1906,1902,1907,1903,1866,1699,1812,1773,1913,1812,1913,1914,1810,1808,1915,1810,1915,1916,1824,1809,1917,1824,1917,1918,1919,1803,1766,1919,1766,1920,1788,1825,1921,1788,1921,1922,1788,1922,1923,1830,1832,1924,1830,1924,1925,1828,1833,1926,1828,1926,1927,1829,1828,1927,1829,1927,1928,1831,1830,1925,1831,1925,1929,1789,1788,1923,1789,1923,1930,1825,1824,1918,1825,1918,1921,1765,1810,1916,1765,1916,1931,1769,1812,1914,1769,1914,1932,1808,1770,1933,1808,1933,1915,1809,1803,1919,1809,1919,1917,1673,1834,1934,1673,1934,1669,1823,1791,1935,1823,1935,1936,1833,1835,1937,1833,1937,1926,1834,1829,1928,1834,1928,1934,1835,1831,1929,1835,1929,1937,1791,1789,1930,1791,1930,1935,1823,1936,1924,1823,1924,1832,1773,1666,1669,1773,1669,1913,1766,1765,1931,1766,1931,1920,1770,1769,1932,1770,1932,1933,1938,1939,1694,1938,1694,1689,1940,1941,1734,1942,1943,1743,1733,1944,1940,1733,1940,1734,1945,1942,1743,1945,1743,1687,1744,1946,1947,1941,1938,1689,1941,1689,1688,1939,1695,1694,1939,1912,1695,1947,1733,1744,1947,1944,1733,1904,1948,1686,1904,1686,1750,1948,1945,1687,1948,1687,1686,1943,1946,1744,1943,1744,1743,1941,1688,1734,1949,1950,1951,1949,1951,1952,1953,1954,1955,1953,1955,1956,1957,1958,1959,1957,1959,1960,1951,1960,1961,1951,1961,1962,1956,1955,1963,1956,1963,1964,1965,1966,1967,1968,1969,1970,1968,1970,1971,1965,1972,1969,1973,1974,1975,1973,1975,1976,1977,1978,1979,1980,1981,1982,1983,1984,1985,1985,1984,1986,1985,1986,1987,1988,1983,1989,1990,1991,1980,1990,1980,1992,1981,1993,1994,1995,1996,1997,1995,1997,1993,1998,1999,2000,1998,2000,2001,2002,2003,1990,2002,1990,2004,1996,2005,2006,1996,2006,1997,2004,1990,1992,2004,1992,2007,2008,2009,2010,2008,2010,1983,2011,1999,2008,2011,2008,1988,1991,2012,2013,1991,2013,1981,2014,2015,2016,2014,2016,2017,2018,1965,1968,2018,1968,2019,2019,1968,1971,2019,1971,2020,2020,1971,1955,2020,1955,1954,1952,1951,1962,1952,1962,2021,2022,1979,1978,2022,1978,2023,2024,1953,1956,2024,1956,2025,2026,1949,1952,2026,1952,1976,2027,2028,2029,2027,2029,2000,1950,1957,1960,1950,1960,1951,2029,2030,2001,2029,2001,2000,1958,2031,2022,1958,2022,1959,1960,1959,2032,1960,2032,1961,2025,1956,1964,2025,1964,1977,2033,1966,1965,2033,1965,2018,2029,2028,1967,2029,1967,1966,1975,2034,2026,1975,2026,1976,2024,2025,1979,2024,1979,2035,1983,2010,2036,1983,2036,1984,1984,2036,2037,1984,2037,1986,1986,2037,2002,1986,2002,2004,1993,1997,2038,1993,2038,1994,2013,1995,1993,2013,1993,1981,2011,2027,2000,2011,2000,1999,2003,2012,1991,2003,1991,1990,1981,1994,1982,1997,2006,2039,1997,2039,2038,1987,1986,2004,1987,2004,2007,1988,2008,1983,1999,1998,2009,1999,2009,2008,1985,1989,1983,1980,1991,1981,1979,2025,1977,1965,1969,1968,2030,2029,1966,2030,1966,2033,1967,1972,1965,1971,1970,1963,1971,1963,1955,1976,1952,2021,1976,2021,1973,1959,2022,2023,1959,2023,2032,2031,2035,1979,2031,1979,2022,2014,2034,1975,2014,1975,2015,2040,2041,2042,2043,2041,2044,2045,2046,2047,2045,2047,2048,2043,2049,2050,2043,2050,2051,2043,2051,2042,2052,2045,2048,2052,2048,2053,1671,1670,2054,2055,2056,2057,2040,2058,2044,2040,2044,2041,2054,2047,2046,2054,2046,1671,2049,2059,2060,2049,2060,2050,2042,2041,2043,2059,2052,2053,2059,2053,2060,2044,2055,2057,2044,2057,2043,2061,2040,2042,2062,2063,2064,2062,2064,2065,2066,2067,2068,2066,2068,2069,2070,1665,1664,2071,2072,2062,2071,2062,2073,2074,2075,2066,2074,2066,2076,2073,2077,2078,2073,2078,2079,2080,2081,2082,2083,2080,2082,2083,2082,2045,2083,2045,2052,2084,2085,2086,2084,2086,2087,2087,2088,2089,2087,2089,2090,2087,2090,2063,2086,2040,2061,2086,2061,2091,2085,2058,2040,2085,2040,2086,2092,2083,2052,2092,2052,2059,2093,2094,2095,2071,2079,2096,2097,2074,2076,2097,2076,2098,2097,2098,2099,2096,2079,2100,2072,2101,2063,2072,2063,2062,2076,2066,2069,2076,2069,2102,2073,2062,2065,2073,2065,2077,2067,2100,2103,2067,2103,2068,2104,2098,2105,2104,2105,2106,2094,2096,2100,2094,2100,2095,2075,2107,2067,2075,2067,2066,1663,2108,2104,1663,2104,1664,2071,2073,2079,2081,2109,2046,2081,2046,2045,2081,2045,2082,2056,2110,2049,2056,2049,2043,2056,2043,2057,2084,2087,2063,2084,2063,2101,2087,2086,2091,2087,2091,2088,2090,2064,2063,2110,2092,2059,2110,2059,2049,2109,1663,1671,2109,1671,2046,2111,2097,2099,2108,2111,2099,2108,2099,2098,2108,2098,2104,2107,2093,2095,2107,2095,2100,2107,2100,2067,1664,2104,2106,1664,2106,2070,2098,2076,2102,2098,2102,2105,2100,2079,2078,2100,2078,2103,2112,2113,2114,2112,2114,2115,2015,2116,2117,2015,2117,2016,2118,2119,2120,2118,2120,2121,2119,2118,2115,2119,2115,2114,2122,2123,2124,2125,2126,2127,2125,2127,2128,2129,2125,2128,2129,2128,2130,2006,2130,2131,2006,2131,2039,2132,2119,2114,2132,2114,2133,2119,2132,2134,2119,2134,2120,2135,2113,2016,2135,2016,2117,2015,1975,1974,2015,1974,2116,2113,2135,2133,2113,2133,2114,2136,2137,2121,2136,2121,2120,2138,2122,2127,2138,2127,2126,2128,2127,2139,2128,2139,2140,2138,2137,2136,2138,2136,2122,2005,2129,2130,2005,2130,2006,2130,2128,2140,2130,2140,2131,2122,2136,2123,2124,2139,2127,2124,2127,2122,2123,2136,2120,2123,2120,2134,2113,2112,2017,2113,2017,2016,1974,1973,2141,1974,2141,2142,2143,2144,2145,2146,2147,2148,2146,2148,2149,2131,2140,2150,2131,2150,2151,2152,2153,1982,1982,1994,2152,2154,2155,2156,2124,2157,2158,2124,2158,2159,2139,2124,2159,2139,2159,2160,2161,2162,2155,1980,2163,2164,1994,2038,2165,1994,2165,2166,1994,2166,2167,2163,1980,1982,2163,1982,2153,2168,2146,2149,2168,2149,2169,2170,2171,2144,2172,2173,1974,1973,2021,2174,1973,2174,2141,1974,2142,2172,2143,2170,2144,2147,2175,2145,2147,2145,2148,2133,2135,2117,2133,2117,2116,2133,2116,1974,2133,1974,2173,2133,2173,2170,2133,2170,2143,2133,2143,2175,2133,2175,2147,2133,2147,2146,2133,2146,2168,2133,2168,1969,2133,1969,1972,2133,1972,1967,2133,1967,2028,2133,2028,2027,2133,2027,2011,2133,2011,1988,2133,1988,1989,2133,1989,1985,2133,1985,2176,2133,2176,2177,2133,2177,2178,2133,2178,2161,2133,2161,2154,2133,2154,2179,2133,2179,2157,2133,2157,2124,2133,2124,2123,2133,2123,2134,2133,2134,2132,2039,2131,2151,2039,2151,2180,1992,1980,2164,2154,2161,2155,2157,2179,2156,2157,2156,2158,2140,2139,2160,2140,2160,2150,2179,2154,2156,2007,1992,2164,2007,2164,2181,1994,2167,2152,2038,2039,2180,2038,2180,2165,1969,2168,2169,1969,2169,2182,2175,2143,2145,2170,2173,2172,2170,2172,2171,2178,2177,2183,2178,2183,2184,2177,2176,2185,2177,2185,2183,2161,2178,2184,2161,2184,2162,2176,1985,2186,2176,2186,2185,1985,2187,2186,1987,2007,2181,1987,2181,2187,1985,1987,2187,2188,2189,2106,2188,2106,2105,2190,2191,2068,2190,2068,2103,2192,2193,2064,2192,2064,2090,2194,2192,2090,2195,2196,2088,2195,2088,2091,2197,2198,2050,2197,2050,2060,2199,2200,2047,2199,2047,2054,2201,2197,2060,2201,2060,2053,2202,2195,2091,2202,2091,2061,2042,2203,2202,2042,2202,2061,2204,1662,1665,2204,1665,2070,2205,2190,2103,2205,2103,2078,2206,2188,2105,2206,2105,2102,2189,2204,2070,2189,2070,2106,2191,2207,2069,2191,2069,2068,2193,2208,2065,2193,2065,2064,2205,2078,2077,2205,2077,2209,2196,2210,2089,2196,2089,2088,2198,2211,2051,2198,2051,2050,2200,2212,2048,2200,2048,2047,2212,2201,2053,2212,2053,2048,2211,2203,2042,2211,2042,2051,2210,2194,2090,2210,2090,2089,1662,2199,2054,1662,2054,1670,2208,2209,2077,2208,2077,2065,2207,2206,2102,2207,2102,2069,1964,2213,2214,2032,2023,2215,2032,2215,2216,2032,2216,2217,1977,2214,2218,1977,2218,1978,1961,2032,2217,1961,2217,2219,2220,2215,1978,1964,1963,2221,1964,2221,2213,1970,1969,2222,1969,2182,2222,1978,2218,2220,2215,2023,1978,2021,1962,2223,2021,2223,2174,1962,1961,2219,1962,2219,2223,1977,1964,2214,1963,1970,2222,1963,2222,2221,1746,1922,1921,1746,1921,1747,1684,1749,1931,1684,1931,1916,1735,1677,1932,1735,1932,1914,1918,1680,1751,1918,1751,1752,1918,1752,1921,1753,1756,1913,1730,1923,1731,1719,1703,1936,1719,1936,1935,1728,1719,1935,1728,1935,1930,1761,1760,1937,1761,1937,1929,1731,1923,1757,1920,1764,1745,1920,1745,1919,1741,1747,1921,1685,1684,1916,1685,1916,1915,1681,1680,1918,1681,1918,1917,1756,1736,1913,1749,1764,1920,1749,1920,1931,1677,1676,1933,1677,1933,1932,1740,1741,1921,1702,1924,1936,1702,1936,1703,1757,1923,1762,1702,1724,1925,1702,1925,1924,1922,1746,1762,1922,1762,1923,1724,1761,1929,1724,1929,1925,1729,1728,1930,1729,1930,1923,1729,1923,1730,1735,1914,1913,1735,1913,1736,1752,1740,1921,1676,1685,1915,1676,1915,1933,1745,1681,1917,1745,1917,1919,2224,2225,2226,2224,2226,2227,2228,2229,2230,2228,2230,2231,2232,2228,2231,2232,2231,2233,2234,2235,2233,2234,2233,2236,2237,2238,2239,2237,2239,2240,2241,2242,2243,2241,2243,2244,2245,2246,2244,2245,2244,2247,2248,2249,2250,2248,2250,2251,2252,2253,2254,2252,2254,2255,2256,2257,2258,2256,2258,2259,2260,2261,2262,2260,2262,2263,2264,2265,2263,2264,2263,2266,2267,2268,2269,2267,2269,2270,2267,2270,2271,2267,2271,2272,2267,2272,2273,2267,2273,2274,2267,2274,2275,2267,2275,2276,2267,2276,2277,2267,2277,2278,2267,2278,2279,2267,2279,2280,2267,2280,2281,2267,2281,2282,2267,2282,2283,2267,2283,2284,2267,2284,2285,2267,2285,2286,2267,2286,2287,2267,2287,2288,2267,2288,2289,2225,2290,2291,2225,2291,2226,2290,2292,2293,2290,2293,2294,2295,2296,2297,2295,2297,2298,2299,2300,2301,2299,2301,2302,2300,2303,2304,2300,2304,2305,2306,2307,2308,2306,2308,2309,2310,2311,2312,2310,2312,2313,2314,2315,2316,2314,2316,2317,2318,2319,2320,2318,2320,2321,2319,2322,2323,2319,2323,2324,2325,2326,2327,2325,2327,2328,2326,2314,2329,2326,2329,2330,2311,2318,2331,2311,2331,2332,2315,2306,2333,2315,2333,2334,2303,2310,2335,2303,2335,2336,2307,2337,2338,2307,2338,2339,2337,2295,2340,2337,2340,2341,2292,2299,2342,2292,2342,2343,2296,2344,2345,2296,2345,2346,2344,2224,2227,2344,2227,2347,2348,2349,2350,2348,2350,2351,2352,2353,2351,2352,2351,2258,2354,2355,2255,2354,2255,2262,2356,2357,2259,2356,2259,2250,2358,2359,2247,2358,2247,2254,2360,2361,2251,2360,2251,2362,2363,2364,2362,2363,2362,2239,2365,2366,2236,2365,2236,2243,2367,2368,2240,2367,2240,2369,2229,2370,2369,2229,2369,2230,2371,2372,2373,2371,2373,2374,2371,2374,2375,2371,2375,2376,2371,2376,2377,2371,2377,2378,2371,2378,2379,2371,2379,2380,2371,2380,2381,2371,2381,2382,2371,2382,2383,2371,2383,2384,2371,2384,2385,2371,2385,2386,2371,2386,2387,2371,2387,2388,2371,2388,2389,2371,2389,2390,2371,2390,2391,2371,2391,2392,2371,2392,2393,2349,2264,2266,2349,2266,2350,2322,2325,2328,2322,2328,2323,2394,2395,2396,2394,2396,2397,2398,2399,2394,2398,2394,2400,2399,2401,2395,2399,2395,2394,1779,1778,2399,1779,2399,2398,1781,1807,2402,1781,2402,2403,2404,1814,1776,2404,1776,2405,2406,2407,2400,2406,2400,2408,2409,2410,2411,2409,2411,2412,2413,2414,2415,2402,2415,2414,2402,2414,2416,2417,2418,2419,2417,2419,2420,2421,2422,2423,2421,2423,2406,2424,2425,2396,2424,2396,2426,2427,2428,2429,2427,2429,2430,2431,2432,2427,2431,2427,2433,2434,2435,2421,2434,2421,2436,2437,2438,2439,2424,2440,2439,2441,2442,2443,2441,2443,2432,2444,2445,2446,2444,2446,2435,2447,2448,2444,2447,2444,2449,2450,2451,2452,2450,2452,2453,2230,2454,2455,2230,2455,2456,2457,2458,2459,2460,2461,2447,2460,2447,2462,2463,2464,2451,2465,2466,2467,2465,2467,2454,2381,2380,2457,2381,2457,2461,2383,2460,2468,2387,2386,2469,2470,2471,2472,2471,2446,2445,2472,2445,2459,2473,2446,2470,2474,2475,2476,2474,2476,2477,2478,2475,2474,2392,2479,2480,2371,2481,2482,2372,2483,2484,2485,2486,2378,2485,2378,2377,2391,2390,2266,2391,2266,2479,2482,2481,2487,2482,2487,2488,2484,2489,2490,2491,2492,2493,2493,2492,2494,2493,2494,2495,2496,2497,2498,2496,2498,2499,2488,2500,2501,2502,2503,2504,2502,2504,2505,2494,2505,2506,2494,2506,2507,2498,2508,2509,2498,2509,2510,2511,2501,2512,2511,2512,2513,2514,2515,2512,2516,2517,2518,2516,2518,2519,2520,2521,2522,2520,2522,2523,2524,2525,2526,2524,2526,2527,2528,2527,2529,2528,2529,2530,2519,2518,2531,2519,2531,2532,2523,2522,2533,2523,2533,2534,2535,2536,2537,2535,2537,2538,2539,2540,2541,2539,2541,2542,2543,2539,2542,2544,2545,2546,2544,2546,2547,2548,2549,2550,2548,2550,2551,1798,2552,2553,1798,2553,1836,2554,1827,1836,2554,1836,2553,2554,2553,2555,1783,1668,2556,1783,2556,2557,1787,1786,2558,1787,2558,2559,2555,2553,2560,2555,2560,2561,2562,2563,2534,2562,2534,2533,2564,2565,2531,2564,2531,2566,2565,2567,2532,2565,2532,2531,2568,2569,2551,2568,2551,2567,2546,2559,2558,2546,2558,2565,2546,2565,2564,1786,1819,2568,1786,2568,2558,2413,2415,1793,2413,1793,1795,2413,1795,2539,2413,2539,2543,1827,2554,2570,1827,2570,1821,2552,2547,2560,2552,2560,2553,2571,2548,2551,2571,2551,2569,2545,2572,2559,2545,2559,2546,2573,2574,2575,2576,2537,2536,2576,2536,2577,2577,2578,2555,2577,2555,2561,2522,2579,2549,2522,2549,2533,2518,2515,2566,2518,2566,2531,2527,2526,2580,2527,2580,2529,2525,2510,2581,2525,2581,2526,2521,2507,2579,2521,2579,2522,2517,2513,2515,2517,2515,2518,2501,2500,2524,2501,2524,2512,2508,2456,2582,2508,2582,2509,2505,2504,2516,2505,2516,2506,2503,2490,2583,2503,2583,2504,2487,2496,2499,2487,2499,2500,2584,2477,2476,2584,2476,2585,2491,2586,2502,2491,2502,2492,2587,2490,2503,2481,2480,2496,2481,2496,2487,2244,2243,2236,2244,2236,2233,2244,2233,2497,2479,2266,2263,2479,2263,2262,2376,2375,2586,2376,2586,2491,2374,2373,2587,2393,2392,2480,2588,2495,2521,2478,2493,2495,2476,2475,2521,2470,2589,2590,2470,2590,2473,2591,2459,2458,2387,2466,2465,2469,2386,2385,2468,2463,2384,2382,2381,2461,2382,2461,2460,2380,2379,2592,2380,2592,2457,2250,2259,2258,2250,2258,2465,2239,2362,2454,2369,2454,2230,2593,2463,2451,2593,2451,2450,2468,2462,2464,2594,2595,2584,2594,2584,2590,2454,2467,2441,2454,2441,2455,2596,2453,2442,2462,2447,2449,2462,2449,2597,2449,2444,2435,2449,2435,2434,2455,2441,2432,2455,2432,2431,2452,2598,2599,2452,2599,2439,2600,2434,2436,2600,2436,2601,2582,2431,2433,2582,2433,2602,2433,2427,2430,2433,2430,2603,2440,2424,2426,2440,2426,2604,2436,2421,2406,2436,2406,2408,2605,2606,2607,2605,2607,2608,2420,2609,2606,2420,2606,2417,2610,2611,2612,2613,2409,2412,2613,2412,2614,2407,2615,2398,2407,2398,2400,2411,2404,2405,2411,2405,2616,2617,1774,1781,2617,1781,2403,1807,1793,2415,1807,2415,2402,1778,1805,2401,1778,2401,2399,2401,2614,2412,2401,2412,2618,2401,2618,2395,2619,2615,2407,2619,2407,2620,2400,2394,2397,2400,2397,2408,2395,2618,2426,2395,2426,2396,2563,2620,2423,2563,2423,2534,2405,2608,2607,2405,2607,2616,1815,1814,2404,1815,2404,2614,1816,1802,2615,1816,2615,2619,1776,1774,2617,1776,2617,2608,1776,2608,2405,2621,2411,2616,2426,2618,2622,2426,2622,2604,2410,2623,2404,2410,2404,2411,2617,2605,2608,2403,2402,2416,2403,2416,2624,2418,2611,2610,2418,2610,2419,2422,2523,2534,2422,2534,2423,2425,2601,2397,2425,2397,2396,2428,2437,2625,2428,2625,2429,2432,2443,2428,2432,2428,2427,2435,2446,2422,2435,2422,2421,2439,2599,2425,2439,2425,2424,2442,2453,2438,2442,2438,2443,2473,2585,2520,2473,2520,2446,2598,2597,2600,2598,2600,2599,2451,2464,2598,2451,2598,2452,2596,2450,2453,2590,2584,2585,2590,2585,2473,2461,2457,2448,2461,2448,2447,2468,2460,2462,2466,2469,2596,2466,2596,2467,2369,2240,2239,2369,2239,2454,2362,2251,2250,2362,2250,2465,2362,2465,2454,2258,2351,2350,2258,2350,2465,2379,2378,2486,2379,2486,2592,2384,2383,2468,2385,2593,2469,2388,2387,2465,2472,2591,2626,2472,2626,2589,2591,2472,2459,2470,2446,2471,2627,2474,2477,2627,2477,2628,2495,2588,2478,2393,2480,2481,2372,2371,2482,2372,2482,2483,2373,2484,2587,2390,2389,2350,2390,2350,2266,2262,2255,2254,2262,2254,2247,2262,2247,2244,2262,2244,2497,2262,2497,2479,2233,2231,2497,2483,2482,2488,2483,2488,2489,2587,2484,2490,2595,2628,2477,2595,2477,2584,2497,2231,2508,2497,2508,2498,2489,2488,2501,2489,2501,2511,2492,2502,2505,2492,2505,2494,2495,2494,2507,2495,2507,2521,2499,2498,2510,2499,2510,2525,2583,2511,2513,2583,2513,2517,2506,2516,2519,2506,2519,2629,2509,2582,2602,2509,2602,2630,2512,2524,2527,2512,2527,2528,2514,2528,2530,2514,2530,2631,2629,2519,2532,2629,2532,2550,2630,2602,2632,2630,2632,2633,2575,2535,2538,2575,2538,2573,2540,2570,2634,2540,2634,2541,2554,2555,2578,2635,2544,2547,2635,2547,2552,2564,2566,2631,2564,2631,2636,2637,2560,2547,1822,1821,2570,1822,2570,2540,1801,1783,2557,1801,2557,2571,1798,1787,2559,1798,2559,2552,2557,2556,2563,2557,2563,2562,2548,2562,2533,2548,2533,2549,2610,2612,2574,2610,2574,2573,2610,2573,2633,2610,2633,2632,2567,2551,2550,2567,2550,2532,2571,2557,2562,2571,2562,2548,2558,2568,2567,2558,2567,2565,1819,1817,2569,1819,2569,2568,1795,1822,2540,1795,2540,2539,2546,2564,2636,2547,2546,2636,2547,2636,2637,1801,2571,2569,1801,2569,1817,2572,2635,2552,2572,2552,2559,2561,2576,2577,2578,2634,2570,2578,2570,2554,2581,2630,2633,2581,2633,2638,2579,2629,2550,2579,2550,2549,2515,2514,2631,2515,2631,2566,2526,2581,2638,2526,2638,2580,2510,2509,2630,2510,2630,2581,2507,2506,2629,2507,2629,2579,2512,2528,2514,2515,2513,2512,2500,2499,2525,2500,2525,2524,2585,2476,2521,2585,2521,2520,2504,2583,2517,2504,2517,2516,2490,2489,2511,2490,2511,2583,2488,2487,2500,2231,2230,2456,2231,2456,2508,2639,2491,2493,2586,2587,2503,2586,2503,2502,2484,2483,2489,2480,2479,2497,2480,2497,2496,2377,2376,2491,2377,2491,2485,2375,2374,2587,2375,2587,2586,2484,2373,2372,2371,2393,2481,2392,2391,2479,2478,2588,2475,2475,2588,2521,2589,2626,2594,2589,2594,2590,2472,2471,2445,2472,2589,2470,2387,2469,2466,2385,2384,2463,2385,2463,2593,2383,2382,2460,2389,2388,2465,2389,2465,2350,2469,2593,2450,2469,2450,2596,2463,2468,2464,2457,2459,2448,2448,2459,2445,2448,2445,2444,2467,2596,2442,2467,2442,2441,2464,2462,2597,2464,2597,2598,2597,2449,2434,2597,2434,2600,2456,2455,2431,2456,2431,2582,2453,2452,2439,2453,2439,2438,2440,2437,2439,2599,2600,2601,2599,2601,2425,2446,2520,2523,2446,2523,2422,2443,2438,2437,2443,2437,2428,2437,2440,2604,2437,2604,2625,2601,2436,2408,2601,2408,2397,2602,2433,2603,2602,2603,2632,2624,2605,2617,2624,2617,2403,2607,2606,2609,2623,2613,2614,2623,2614,2404,2615,1802,1779,2615,1779,2398,2412,2411,2621,2412,2621,2622,2412,2622,2618,1668,1816,2619,1668,2619,2556,1805,1815,2614,1805,2614,2401,2556,2619,2620,2556,2620,2563,2620,2407,2406,2620,2406,2423,1928,1852,1863,1928,1863,1934,1760,1855,1926,1760,1926,1937,1855,1853,1927,1855,1927,1926,1842,1844,1934,1669,1846,1837,1669,1837,1913,1753,1913,1837,1846,1669,1934,1846,1934,1844,1862,1934,1863,1853,1852,1928,1853,1928,1927,1842,1934,1862,2640,2639,2493,2640,2478,2474,2640,2474,2627,2493,2478,2640,2209,2208,1953,2209,1953,2024,2206,2207,1957,2206,1957,1950,2192,2018,2019,2192,2019,2020,2192,2020,2193,2204,2014,2017,2012,2202,2203,2012,2203,2013,2010,2210,2036,2195,2202,2012,2195,2012,2003,2196,2195,2003,2196,2003,2002,2198,2197,2005,2198,2005,1996,2009,2210,2010,2192,2030,2033,2207,2191,1958,2207,1958,1957,2208,2193,1954,2208,1954,1953,2204,2034,2014,2190,2205,2035,2190,2035,2031,2188,2206,1950,2188,1950,1949,2192,2033,2018,1998,2210,2009,2203,2211,1995,2203,1995,2013,2210,1998,2001,2210,2001,2194,2211,2198,1996,2211,1996,1995,2210,2196,2002,2210,2002,2037,2210,2037,2036,2209,2024,2035,2209,2035,2205,2034,2204,2189,2034,2189,2026,2020,1954,2193,2189,2188,1949,2189,1949,2026,2191,2190,2031,2191,2031,1958,2030,2192,2194,2030,2194,2001,2641,2642,2643,2641,2643,2644,2645,2644,2646,2645,2646,2647,2644,2643,2648,2644,2648,2646,2647,2646,2074,2647,2074,2097,2649,2650,2072,2649,2072,2071,2651,2652,2653,2654,2655,2656,2654,2656,2657,2652,2658,2659,2652,2659,2660,2661,2662,2663,2664,2665,2650,2664,2650,2649,2666,2667,2668,2666,2668,2669,2670,2671,2672,2670,2672,2673,2642,2641,2674,2642,2674,2675,2676,2677,2678,2676,2678,2679,2680,2679,2681,2680,2681,2682,2683,2673,2684,2683,2684,2685,2686,2675,2687,2686,2687,2688,2681,2689,2690,2681,2690,2691,2684,2692,2693,2684,2693,2694,2687,2695,2696,2687,2696,2697,2698,2697,2699,2698,2699,2700,2691,2701,2702,2694,2693,2703,2694,2703,2704,2705,2706,2707,2705,2707,2708,2699,2709,2710,2711,2702,2712,2711,2712,2713,2299,2292,2290,2299,2290,2714,2310,2303,2300,2310,2300,2714,2310,2714,2715,2715,2322,2319,2715,2319,2318,2707,2716,2281,2707,2281,2280,2710,2277,2276,2712,2717,2275,2715,2713,2273,2718,2719,2720,2721,2684,2722,2723,2724,2725,2723,2725,2726,2727,2728,2729,2725,2730,2729,2731,2732,2269,2733,2267,2289,2734,2735,2288,2736,2737,2286,2736,2286,2285,2738,2283,2282,2738,2282,2739,2314,2326,2325,2314,2325,2732,2344,2296,2295,2344,2295,2337,2344,2337,2740,2741,2742,2731,2741,2731,2733,2743,2744,2734,2745,2746,2736,2745,2736,2747,2693,2748,2724,2693,2724,2703,2749,2750,2742,2749,2742,2741,2751,2752,2744,2751,2744,2743,2753,2754,2751,2753,2751,2755,2756,2757,2758,2756,2758,2759,2760,2761,2749,2760,2749,2762,2763,2764,2765,2763,2765,2766,2767,2768,2769,2767,2769,2770,2771,2772,2773,2771,2773,2774,2775,2776,2771,2775,2771,2777,2778,2779,2764,2778,2764,2763,2780,2781,2768,2780,2768,2767,2782,2783,2784,2782,2784,2785,2785,2786,2787,2785,2787,2788,2789,2790,2791,2792,2793,2794,2792,2794,2795,2796,2797,2798,2796,2798,2799,2800,2801,2802,2800,2802,2803,2804,2805,2058,2804,2058,2085,2799,2806,2109,2799,2109,2081,2803,2793,2110,2803,2110,2056,2782,2801,2800,2782,2800,2783,2780,2671,2807,2780,2807,2808,2779,2778,2809,2779,2809,2810,2778,2811,2812,2778,2812,2809,2812,2797,2796,2812,2796,2813,2809,2812,2813,2809,2813,2814,2813,2796,2080,2813,2080,2083,2815,2804,2085,2815,2085,2084,2055,2800,2803,2055,2803,2056,2797,2816,2781,2797,2781,2798,2802,2792,2795,2802,2795,2817,2818,2815,2819,2818,2820,2804,2818,2804,2815,2821,2822,2823,2821,2823,2772,2781,2816,2824,2781,2824,2768,2779,2825,2826,2779,2826,2764,2776,2821,2772,2776,2772,2771,2772,2823,2756,2772,2756,2773,2768,2824,2753,2768,2753,2769,2826,2827,2760,2826,2760,2765,2765,2760,2762,2765,2762,2828,2773,2756,2759,2773,2759,2829,2769,2753,2755,2769,2755,2830,2755,2751,2743,2755,2743,2746,2762,2749,2741,2750,2829,2740,2750,2740,2742,2831,2830,2745,2831,2745,2727,2727,2747,2832,2744,2833,2735,2834,2741,2733,2834,2733,2835,2325,2322,2271,2325,2271,2270,2737,2734,2287,2735,2835,2289,2735,2289,2288,2733,2268,2267,2770,2729,2730,2718,2836,2721,2836,2684,2721,2713,2274,2273,2710,2709,2278,2708,2707,2280,2708,2280,2279,2714,2711,2713,2714,2713,2715,2700,2699,2710,2837,2705,2708,2837,2708,2709,2706,2838,2707,2758,2839,2714,2758,2714,2225,2690,2698,2700,2690,2700,2701,2840,2841,2706,2840,2706,2705,2685,2684,2836,2685,2836,2841,2682,2681,2691,2682,2691,2842,2843,2686,2688,2675,2674,2695,2675,2695,2687,2673,2672,2692,2673,2692,2684,2679,2678,2689,2679,2689,2681,2677,2654,2843,2677,2843,2678,2641,2844,2845,2641,2845,2674,2846,2847,2848,2846,2848,2849,2649,2663,2662,2649,2662,2664,2850,2851,2852,2658,2853,2854,2658,2854,2659,2647,2097,2111,2647,2111,2855,2655,2653,2652,2655,2652,2856,2656,2655,2856,2650,2857,2101,2650,2101,2072,2646,2648,2075,2646,2075,2074,2643,2656,2856,2643,2856,2853,2643,2853,2648,2858,2859,2855,2858,2855,2860,2844,2641,2644,2844,2644,2645,2642,2657,2656,2642,2656,2643,2671,2670,2858,2671,2858,2807,2651,2852,2661,2651,2661,2861,2853,2658,2093,2853,2093,2107,2860,2855,2111,2860,2111,2108,2861,2661,2663,2861,2663,2096,2861,2096,2094,2861,2094,2093,2861,2093,2658,2844,2645,2859,2844,2859,2862,2856,2652,2660,2856,2660,2863,2857,2864,2865,2665,2864,2857,2665,2857,2650,2866,2666,2669,2866,2669,2867,2862,2670,2673,2862,2673,2683,2657,2642,2675,2657,2675,2686,2868,2676,2679,2868,2679,2680,2848,2680,2682,2848,2682,2869,2845,2683,2685,2845,2685,2870,2843,2688,2689,2843,2689,2678,2689,2688,2698,2689,2698,2690,2757,2869,2839,2757,2839,2758,2695,2870,2840,2695,2840,2696,2697,2696,2837,2697,2837,2699,2842,2691,2702,2842,2702,2711,2841,2836,2718,2841,2718,2706,2706,2718,2838,2700,2710,2871,2702,2701,2717,2702,2717,2712,2322,2715,2272,2322,2272,2271,2710,2278,2277,2717,2871,2276,2717,2276,2275,2713,2712,2274,2718,2721,2719,2722,2684,2694,2724,2748,2730,2724,2730,2725,2733,2731,2268,2737,2287,2286,2747,2736,2285,2747,2285,2284,2742,2740,2732,2742,2732,2731,2744,2735,2734,2746,2743,2737,2746,2737,2736,2727,2745,2747,2759,2758,2225,2759,2225,2224,2762,2741,2834,2752,2828,2833,2752,2833,2744,2754,2766,2752,2754,2752,2751,2692,2770,2748,2692,2748,2693,2761,2774,2750,2761,2750,2749,2764,2826,2765,2872,2763,2766,2872,2766,2754,2672,2767,2770,2672,2770,2692,2777,2771,2774,2777,2774,2761,2873,2775,2777,2873,2777,2827,2811,2778,2763,2811,2763,2872,2671,2780,2767,2671,2767,2672,2874,2787,2786,2874,2786,2875,2785,2788,2782,2793,2803,2876,2793,2876,2794,2080,2796,2799,2080,2799,2081,2877,2878,2792,2877,2792,2802,2878,2810,2792,2806,2879,1663,2806,1663,2109,2793,2814,2092,2793,2092,2110,2808,2807,2879,2808,2879,2806,2781,2780,2808,2781,2808,2798,2846,2822,2791,2846,2791,2790,2846,2790,2880,2846,2880,2667,2811,2816,2797,2811,2797,2812,2798,2808,2806,2798,2806,2799,2810,2809,2814,2810,2814,2793,2810,2793,2792,2814,2813,2083,2814,2083,2092,2819,2815,2084,2819,2084,2101,2819,2101,2857,2819,2857,2865,2802,2801,2877,2878,2825,2779,2878,2779,2810,2803,2802,2817,2803,2817,2876,2784,2783,2881,2820,2882,2805,2820,2805,2804,2791,2874,2875,2791,2875,2789,2822,2846,2849,2822,2849,2823,2816,2811,2872,2816,2872,2824,2825,2873,2827,2825,2827,2826,2827,2777,2761,2827,2761,2760,2823,2849,2757,2823,2757,2756,2824,2872,2754,2824,2754,2753,2766,2765,2828,2766,2828,2752,2774,2773,2829,2774,2829,2750,2770,2769,2830,2770,2830,2831,2830,2755,2746,2830,2746,2745,2828,2762,2834,2828,2834,2833,2829,2759,2224,2829,2224,2740,2703,2724,2723,2703,2723,2883,2743,2734,2737,2833,2834,2835,2833,2835,2735,2740,2224,2344,2337,2307,2306,2337,2306,2315,2337,2315,2314,2337,2314,2732,2337,2732,2740,2732,2325,2270,2732,2270,2269,2738,2747,2284,2738,2284,2283,2734,2288,2287,2835,2733,2289,2731,2269,2268,2725,2729,2728,2770,2831,2729,2729,2831,2727,2770,2730,2748,2838,2718,2720,2715,2273,2272,2712,2275,2274,2871,2710,2276,2709,2708,2279,2709,2279,2278,2716,2739,2282,2716,2282,2281,2318,2311,2310,2318,2310,2715,2300,2299,2714,2290,2225,2714,2701,2700,2871,2701,2871,2717,2699,2837,2709,2704,2703,2883,2704,2883,2884,2839,2842,2711,2839,2711,2714,2691,2690,2701,2696,2840,2705,2696,2705,2837,2870,2685,2841,2870,2841,2840,2869,2682,2842,2869,2842,2839,2688,2687,2697,2688,2697,2698,2674,2845,2870,2674,2870,2695,2849,2848,2869,2849,2869,2757,2847,2868,2680,2847,2680,2848,2654,2657,2686,2654,2686,2843,2844,2862,2683,2844,2683,2845,2661,2852,2851,2661,2851,2662,2867,2851,2850,2867,2850,2866,2880,2668,2667,2853,2856,2863,2853,2863,2854,2645,2647,2855,2645,2855,2859,2651,2861,2658,2651,2658,2652,2649,2071,2096,2649,2096,2663,2879,2860,2108,2879,2108,1663,2648,2853,2107,2648,2107,2075,2807,2858,2860,2807,2860,2879,2670,2862,2859,2670,2859,2858,2885,2886,2720,2885,2720,2719,2058,2805,2881,2058,2881,2044,2881,2805,2882,2881,2882,2784,2728,2727,2832,2704,2884,2886,2704,2886,2885,2885,2719,2721,2721,2722,2885,2832,2887,2728,2726,2725,2728,2726,2728,2887,2783,2800,2055,2783,2055,2044,2783,2044,2881,2694,2704,2885,2694,2885,2722,2199,2138,2126,2199,2126,2200,2197,2201,2129,2197,2129,2005,2201,2212,2125,2201,2125,2129,2199,2118,2121,2204,2112,2115,2204,2115,1662,2112,2204,2017,2118,2199,1662,2118,1662,2115,2138,2199,2137,2212,2200,2126,2212,2126,2125,2137,2199,2121,2419,2610,2632,2419,2632,2603,2622,2621,2625,2622,2625,2604,2638,2633,2573,2638,2573,2538,2637,2636,2631,2637,2631,2530,2429,2609,2420,2429,2420,2430,2621,2616,2607,2621,2607,2609,2621,2609,2429,2621,2429,2625,2576,2529,2580,2576,2580,2537,2538,2537,2580,2538,2580,2638,2576,2561,2560,2576,2560,2637,2576,2637,2530,2576,2530,2529,2430,2420,2419,2430,2419,2603,2847,2666,2866,2847,2866,2868,2868,2866,2850,2868,2850,2676,2775,2873,2877,2775,2877,2801,2775,2801,2782,2775,2782,2788,2821,2776,2787,2821,2787,2874,2677,2676,2850,2677,2850,2852,2677,2852,2651,2677,2651,2653,2873,2825,2878,2873,2878,2877,2874,2791,2822,2874,2822,2821,2787,2776,2775,2787,2775,2788,2654,2677,2653,2654,2653,2655,2847,2846,2667,2847,2667,2666,2606,2605,2624,2606,2624,2417,2542,2575,2574,2542,2574,2543,2542,2541,2535,2542,2535,2575,2541,2634,2536,2541,2536,2535,2416,2414,2611,2416,2611,2418,2612,2413,2543,2612,2543,2574,2578,2577,2536,2578,2536,2634,2611,2414,2413,2611,2413,2612,2624,2416,2418,2624,2418,2417,2789,2875,2820,2789,2820,2818,2875,2786,2882,2875,2882,2820,2819,2790,2789,2819,2789,2818,2867,2664,2662,2867,2662,2851,2669,2668,2864,2669,2864,2665,2880,2865,2864,2880,2864,2668,2882,2786,2785,2882,2785,2784,2790,2819,2865,2790,2865,2880,2867,2669,2665,2867,2665,2664,2888,2889,2890,2888,2890,2891,2659,2854,2892,2659,2892,2893,2894,2895,2888,2894,2888,2891,2896,2897,2898,2896,2898,2899,2817,2795,2900,2817,2900,2901,2902,2903,2409,2902,2409,2613,2904,2905,2906,2904,2906,2907,2908,2909,2910,2908,2910,2911,2912,2913,2544,2912,2544,2635,2914,2915,2909,2914,2909,2908,2916,2912,2635,2916,2635,2572,2909,2915,2917,2909,2917,2910,2918,2904,2907,2918,2907,2919,2903,2920,2410,2903,2410,2409,2795,2794,2921,2795,2921,2900,2922,2896,2899,2922,2899,2923,2895,2924,2889,2895,2889,2888,2660,2659,2893,2660,2893,2925,2854,2863,2926,2854,2926,2892,2927,2894,2891,2927,2891,2890,2897,2928,2929,2897,2929,2898,2876,2817,2901,2876,2901,2930,2898,2929,2923,2898,2923,2899,2931,2902,2613,2931,2613,2623,2905,2932,2933,2905,2933,2906,2914,2908,2911,2914,2911,2934,2913,2935,2545,2913,2545,2544,2935,2916,2572,2935,2572,2545,2915,2914,2934,2915,2934,2917,2932,2918,2919,2932,2919,2933,2920,2931,2623,2920,2623,2410,2905,2904,2918,2905,2918,2932,2794,2876,2930,2794,2930,2921,2928,2922,2923,2928,2923,2929,2924,2927,2890,2924,2890,2889,2863,2660,2925,2863,2925,2926,2910,2917,2916,2910,2916,2935,2911,2910,2935,2911,2935,2913,2917,2934,2912,2917,2912,2916,2934,2911,2913,2934,2913,2912,2907,2906,2902,2907,2902,2931,2919,2907,2931,2919,2931,2920,2906,2933,2903,2906,2903,2902,2933,2919,2920,2933,2920,2903,2921,2930,2896,2921,2896,2922,2930,2901,2897,2930,2897,2896,2900,2921,2922,2900,2922,2928,2901,2900,2928,2901,2928,2897,2892,2926,2895,2892,2895,2894,2926,2925,2924,2926,2924,2895,2893,2892,2894,2893,2894,2927,2925,2893,2927,2925,2927,2924,2936,2937,2938,2936,2938,2939,2940,2941,2939,2940,2939,2942,2943,2944,2945,2943,2945,2946,2947,2948,2949,2947,2949,2950,2951,2952,2953,2951,2953,2954,2955,2951,2954,2955,2954,2950,2956,2947,2950,2956,2950,2954,2957,2943,2946,2957,2946,2942,2958,2940,2942,2958,2942,2946,2959,2936,2939,2959,2939,2960,2937,2961,2962,2937,2962,2938,2941,2963,2960,2941,2960,2939,2944,2964,2949,2944,2949,2945,2948,2965,2945,2948,2945,2949,2966,2967,2968,2966,2968,2938,2966,2938,2962,2969,2955,2950,2969,2950,2970,2965,2956,2954,2965,2954,2945,2964,2957,2942,2964,2942,2949,2963,2958,2946,2963,2946,2960,2961,2959,2960,2961,2960,2962,2971,2972,2973,2971,2973,2974,2975,2976,2977,2975,2977,2978,2979,2980,2981,2979,2981,2982,2983,2984,2985,2983,2985,2986,2987,2988,2989,2987,2989,2990,2991,2992,2993,2991,2993,2994,2995,2996,2997,2995,2997,2998,2999,3000,3001,2999,3001,3002,3003,3004,3005,3003,3005,3006,3007,3008,3009,3007,3009,3010,3011,3012,3013,3011,3013,3014,3015,3016,3017,3015,3017,3018,3019,3020,3021,3019,3021,3022,3023,3024,3025,3023,3025,3026,3027,3028,3029,3027,3029,3030,3031,3032,3033,3031,3033,3034,3035,3036,3037,3035,3037,3038,3039,3040,3041,3039,3041,3042,3043,3044,3045,3043,3045,3046,3047,3048,3049,3047,3049,3050,3051,3052,3053,3051,3053,3054,3055,3056,3057,3055,3057,3058,3059,3060,3061,3059,3061,3062,3063,3064,3065,3063,3065,3066,3067,3068,2959,3067,2959,2961,3069,3070,2963,3069,2963,2941,3071,3072,2964,3071,2964,2944,3073,3074,2965,3073,2965,2948,3075,3076,2969,3075,2969,2952,3077,3078,3079,3077,3079,3080,3081,3082,3083,3081,3083,3084,3085,3086,3087,3085,3087,3088,3089,3090,3091,3089,3091,3092,3093,3085,3088,3093,3088,3094,3095,3081,3084,3095,3084,3096,3097,3077,3080,3097,3080,3098,3099,3075,2952,3099,2952,2951,3100,3073,2948,3100,2948,2947,3101,3071,2944,3101,2944,2943,3102,3069,2941,3102,2941,2940,3103,3104,3105,3103,3105,3106,3107,3063,3066,3107,3066,3108,3109,3059,3062,3109,3062,3110,3111,3055,3058,3111,3058,3112,3113,3051,3054,3113,3054,3114,3115,3047,3050,3115,3050,3116,3117,3043,3046,3117,3046,3118,3119,3039,3042,3119,3042,3120,3121,3122,3123,3121,3123,3124,3125,3031,3034,3125,3034,3126,3127,3027,3030,3127,3030,3128,3129,3023,3026,3129,3026,3130,3131,3019,3022,3131,3022,3132,3133,3015,3018,3133,3018,3134,3135,3011,3014,3135,3014,3136,3137,3007,3010,3137,3010,3138,3139,3140,3141,3139,3141,3142,3000,3143,3144,3000,3144,3001,2996,3145,3146,2996,3146,2997,2992,3147,3148,2992,3148,2993,2988,3149,3150,2988,3150,2989,2984,3151,3152,2984,3152,2985,2980,3153,3154,2980,3154,2981,2976,3155,3156,2976,3156,2977,3157,2971,2974,3157,2974,3158,3159,2975,2978,3159,2978,3160,3161,2979,2982,3161,2982,3162,3163,2983,2986,3163,2986,3164,3165,2987,2990,3165,2990,3166,3167,2991,2994,3167,2994,3168,3169,2995,2998,3169,2998,3170,3171,2999,3002,3171,3002,3172,3004,3173,3174,3004,3174,3005,3008,3175,3176,3008,3176,3009,3012,3177,3178,3012,3178,3013,3016,3179,3180,3016,3180,3017,3020,3181,3182,3020,3182,3021,3024,3183,3184,3024,3184,3025,3028,3185,3186,3028,3186,3029,3032,3187,3188,3032,3188,3033,3036,3189,3190,3036,3190,3037,3040,3191,3192,3040,3192,3041,3044,3193,3194,3044,3194,3045,3048,3195,3196,3048,3196,3049,3052,3197,3198,3052,3198,3053,3056,3199,3200,3056,3200,3057,3060,3201,3202,3060,3202,3061,3064,3203,3204,3064,3204,3065,3068,3205,2936,3068,2936,2959,3070,3206,2958,3070,2958,2963,3072,3207,2957,3072,2957,2964,3074,3208,2956,3074,2956,2965,3076,3209,2955,3076,2955,2969,3078,3210,3211,3078,3211,3079,3082,3212,3213,3082,3213,3083,3086,3214,3215,3086,3215,3087,3216,3089,3092,3216,3092,3217,3214,3093,3094,3214,3094,3215,3212,3095,3096,3212,3096,3213,3210,3097,3098,3210,3098,3211,3209,3099,2951,3209,2951,2955,3208,3100,2947,3208,2947,2956,3207,3101,2943,3207,2943,2957,3206,3102,2940,3206,2940,2958,3104,3218,3219,3104,3219,3105,3203,3107,3108,3203,3108,3204,3201,3109,3110,3201,3110,3202,3199,3111,3112,3199,3112,3200,3197,3113,3114,3197,3114,3198,3195,3115,3116,3195,3116,3196,3193,3117,3118,3193,3118,3194,3191,3119,3120,3191,3120,3192,3220,3121,3124,3220,3124,3221,3187,3125,3126,3187,3126,3188,3185,3127,3128,3185,3128,3186,3183,3129,3130,3183,3130,3184,3181,3131,3132,3181,3132,3182,3179,3133,3134,3179,3134,3180,3177,3135,3136,3177,3136,3178,3175,3137,3138,3175,3138,3176,3222,3139,3142,3222,3142,3223,3143,3171,3172,3143,3172,3144,3145,3169,3170,3145,3170,3146,3147,3167,3168,3147,3168,3148,3149,3165,3166,3149,3166,3150,3151,3163,3164,3151,3164,3152,3153,3161,3162,3153,3162,3154,3155,3159,3160,3155,3160,3156,3224,3225,3226,3227,3228,3226,3088,3087,3229,3088,3229,3230,3091,3231,3232,3091,3232,3233,3234,3217,3227,3234,3227,3226,3234,3226,3235,3231,3236,3237,3231,3237,3232,3087,3215,3238,3087,3238,3229,3213,3096,3230,3213,3230,3229,3096,3084,3239,3096,3239,3230,3224,3094,3088,3224,3088,3230,3224,3230,3225,3092,3091,3233,3092,3233,3238,3227,3217,3092,3227,3092,3238,3227,3238,3228,3236,3234,3235,3236,3235,3237,3215,3094,3224,3215,3224,3228,3215,3228,3238,3228,3224,3226,3079,3211,3240,3079,3240,2953,3083,3213,3229,3083,3229,3240,3080,3079,2953,3080,2953,2970,2952,2969,2970,2952,2970,2953,3211,3098,3239,3211,3239,3240,3084,3083,3240,3084,3240,3239,3098,3080,2970,3098,2970,3239,3241,3242,3236,3241,3236,3231,3242,3243,3234,3242,3234,3236,3090,3241,3231,3090,3231,3091,3243,3216,3217,3243,3217,3234,3205,3244,2937,3205,2937,2936,3244,3067,2961,3244,2961,2937,2486,2485,2639,2486,2639,2640,2486,2640,2627,2486,2627,2628,2486,2628,2595,2457,2592,2458,2595,2594,2626,2595,2626,2591,2595,2591,2458,2595,2458,2592,2595,2592,2486,2491,2639,2485,3245,3038,3246,3245,3246,3247,3120,3042,3248,3120,3248,3249,3118,3046,3250,3118,3250,3251,3252,3253,3254,3255,3256,3254,3046,3045,3248,3046,3248,3250,3042,3041,3255,3042,3255,3254,3042,3254,3248,3038,3037,3257,3038,3257,3246,3252,3190,3258,3252,3258,3259,3252,3259,3253,3260,3245,3247,3260,3247,3261,3192,3120,3249,3192,3249,3257,3194,3118,3251,3194,3251,3249,3256,3252,3254,3045,3194,3249,3045,3249,3248,3255,3041,3192,3255,3192,3257,3255,3257,3256,3258,3260,3261,3258,3261,3259,3037,3190,3252,3037,3252,3256,3037,3256,3257,3262,3103,3106,3262,3106,3263,3218,3262,3263,3218,3263,3219,3264,3265,3260,3264,3260,3258,3265,3266,3245,3265,3245,3260,3189,3264,3258,3189,3258,3190,3266,3035,3038,3266,3038,3245,3110,3062,3267,3110,3267,3268,3108,3066,3269,3108,3269,3270,3219,3263,3271,3219,3271,3272,3105,3219,3272,3105,3272,3270,3204,3108,3270,3204,3270,3273,3202,3110,3268,3202,3268,3274,3062,3061,3273,3062,3273,3267,3066,3065,3274,3066,3274,3269,3263,3106,3269,3263,3269,3271,3106,3105,3270,3106,3270,3269,3065,3204,3273,3065,3273,3274,3061,3202,3274,3061,3274,3273,3275,3276,3277,3275,3277,3272,3275,3272,3271,3054,3053,3278,3054,3278,3279,3058,3057,3280,3058,3280,3268,3057,3200,3278,3057,3278,3280,3053,3198,3280,3053,3280,3278,3114,3054,3279,3114,3279,3281,3112,3058,3268,3112,3268,3267,3200,3112,3267,3200,3267,3278,3198,3114,3281,3198,3281,3280,3049,3196,3251,3049,3251,3250,3050,3049,3250,3050,3250,3281,3196,3116,3279,3196,3279,3251,3116,3050,3281,3116,3281,3279,3282,3283,3173,3282,3173,3004,3284,3285,3137,3284,3137,3175,3285,3284,3135,3285,3135,3177,3286,3287,3133,3286,3133,3179,3287,3286,3131,3287,3131,3181,3286,3288,3019,3286,3019,3131,3287,3289,3015,3287,3015,3133,3284,3290,3011,3284,3011,3135,3285,3283,3007,3285,3007,3137,3283,3291,3292,3283,3292,3173,3293,3282,3004,3293,3004,3003,3282,3284,3175,3282,3175,3008,3289,3285,3177,3289,3177,3012,3290,3286,3179,3290,3179,3016,3294,3287,3181,3294,3181,3020,3293,3291,3295,3293,3295,3296,3293,3296,3297,3289,3290,3016,3289,3016,3015,3290,3289,3012,3290,3012,3011,3283,3282,3008,3283,3008,3007,3291,3293,3003,3291,3003,3292,3298,3299,3127,3298,3127,3185,3298,3300,3187,3298,3187,3032,3301,3302,3303,3301,3303,3304,3305,3306,3307,3305,3307,3220,3305,3220,3308,3309,3301,3304,3309,3304,3122,3299,3298,3032,3299,3032,3031,3310,3311,3312,3306,3312,3307,3306,3310,3312,3300,3312,3311,3300,3311,3125,3300,3125,3187,3302,3305,3308,3302,3308,3303,3312,3300,3121,3312,3121,3220,3312,3220,3307,3300,3309,3122,3300,3122,3121,3310,3299,3031,3310,3031,3125,3310,3125,3311,3299,3313,3027,3299,3027,3127,3288,3294,3020,3288,3020,3019,3294,3288,3024,3294,3024,3023,3314,3298,3185,3314,3185,3028,3288,3314,3183,3288,3183,3024,3313,3294,3023,3313,3023,3129,3313,3314,3028,3313,3028,3027,3314,3313,3129,3314,3129,3183,3122,3304,3315,3122,3315,3123,3308,3220,3221,3308,3221,3316,3304,3303,3317,3304,3317,3315,3303,3308,3316,3303,3316,3317,3173,3292,3318,3173,3318,3174,3292,3003,3006,3292,3006,3318,2739,2716,2838,2739,2838,2720,2739,2720,2886,2739,2886,2884,2739,2884,2883,2738,2832,2747,2832,2738,2739,2832,2739,2883,2832,2883,2723,2832,2723,2726,2832,2726,2887,2838,2716,2707,3319,3320,2971,3319,2971,3157,3321,3322,3323,3321,3323,2975,3321,2975,3159,3324,3321,2979,3324,2979,3161,3325,3326,3323,3322,3327,3323,3328,3324,3161,3328,3161,3153,3329,3321,3159,3329,3159,3155,3330,3319,3157,3330,3157,3331,3320,3326,3325,3320,3325,2972,3320,2972,2971,3332,3333,3334,3332,3334,3335,3326,3320,2976,3326,2976,2975,3326,2975,3323,3321,3329,2980,3321,2980,2979,3327,3325,3323,3329,3328,3153,3329,3153,2980,3320,3329,3155,3320,3155,2976,3333,3330,3331,3333,3331,3334,3327,3332,3335,3327,3335,2972,3327,2972,3325,3140,3336,3337,3140,3337,3141,3336,3222,3223,3336,3223,3337,2972,3335,3338,2972,3338,2973,3331,3157,3158,3331,3158,3339,3335,3334,3340,3335,3340,3338,3334,3331,3339,3334,3339,3340,3341,3342,2995,3341,2995,3169,3343,3344,2999,3343,2999,3171,3345,3343,3222,3345,3222,3336,3343,3346,3139,3343,3139,3222,3344,3342,3000,3344,3000,2999,3342,3344,2996,3342,2996,2995,3347,3341,3169,3347,3169,3145,3346,3343,3171,3346,3171,3143,3348,3345,3336,3348,3336,3140,3346,3348,3140,3346,3140,3139,3342,3346,3143,3342,3143,3000,3344,3347,3145,3344,3145,2996,3345,3348,3349,3345,3349,3350,3345,3350,3351,3352,3353,3165,3352,3165,3149,3341,3347,3167,3341,3167,3147,3354,3341,3147,3354,3147,2992,3355,3352,3149,3355,3149,2988,3353,3354,2987,3353,2987,3165,3347,3355,2991,3347,2991,3167,3355,3354,2992,3355,2992,2991,3354,3355,2988,3354,2988,2987,3328,3353,3151,3328,3151,2984,3353,3352,3163,3353,3163,3151,3324,3328,2984,3324,2984,2983,3352,3324,2983,3352,2983,3163,2974,2973,3338,2974,3338,3340,2974,3340,3339,2974,3339,3158,2982,2981,3154,2982,3154,3162,2990,2989,3150,2990,3150,3166,3188,3126,3034,3188,3034,3033,3176,3138,3010,3176,3010,3009,3262,3218,3104,3262,3104,3103,3047,3115,3195,3047,3195,3048,3076,3075,3099,3076,3099,3209,3082,3081,3095,3082,3095,3212,3243,3242,3241,3243,3241,3090,3243,3090,3089,3243,3089,3216,3074,3073,3100,3074,3100,3208,3072,3071,3101,3072,3101,3207,3039,3119,3191,3039,3191,3040,3063,3107,3203,3063,3203,3064,3005,3174,3318,3005,3318,3006,3184,3130,3026,3184,3026,3025,2998,2997,3146,2998,3146,3170,2994,2993,3148,2994,3148,3168,3002,3001,3144,3002,3144,3172,2978,2977,3156,2978,3156,3160,3182,3132,3022,3182,3022,3021,3186,3128,3030,3186,3030,3029,3221,3124,3123,3221,3123,3315,3221,3315,3317,3221,3317,3316,3055,3111,3199,3055,3199,3056,3051,3113,3197,3051,3197,3052,3086,3085,3093,3086,3093,3214,3070,3069,3102,3070,3102,3206,3067,3244,3205,3067,3205,3068,3078,3077,3097,3078,3097,3210,3059,3109,3201,3059,3201,3060,3043,3117,3193,3043,3193,3044,3035,3266,3265,3035,3265,3264,3035,3264,3189,3035,3189,3036,3180,3134,3018,3180,3018,3017,3178,3136,3014,3178,3014,3013,2986,2985,3152,2986,3152,3164,3223,3142,3141,3223,3141,3337,3278,3267,3273,3278,3273,1905,3278,1905,1906,3246,3257,1900,3246,1900,1912,2954,2953,3240,2954,3240,1885,2954,1885,1884,2966,2962,1892,2966,1892,1891,2946,2945,2954,2946,2954,1884,2946,1884,1889,3238,3233,1896,3238,1896,1895,3251,3279,3278,3251,3278,1906,3251,1906,1872,3272,3277,1903,3272,1903,1868,3273,3270,1867,3273,1867,1905,3257,3249,1871,3257,1871,1900,3240,3229,1910,3240,1910,1885,2962,2960,1888,2962,1888,1892,2960,2946,1889,2960,1889,1888,3229,3238,1895,3229,1895,1910,3249,3251,1872,3249,1872,1871,3270,3272,1868,3270,1868,1867,3230,3239,1880,3230,1880,1879,3232,3237,1881,3232,1881,1883,3237,3235,1882,3237,1882,1881,3239,2970,2950,3239,2950,1898,3239,1898,1880,3225,1875,1876,3225,1876,3226,3225,3230,1879,3225,1879,1875,3233,3232,1883,3233,1883,1896,3235,3226,1876,3235,1876,1882,2950,2949,2942,2950,2942,1877,2950,1877,1898,2942,2939,1878,2942,1878,1877,2968,2967,1893,2968,1893,1911,2938,2968,1911,2938,1911,1899,2967,2966,1891,2967,1891,1893,2939,2938,1899,2939,1899,1878,3261,3247,1939,3261,1939,1938,3250,3248,1947,3250,1947,1946,3274,3268,1943,3274,1943,1942,3269,3274,1942,3269,1942,1945,3248,3254,1944,3248,1944,1947,3247,3246,1912,3247,1912,1939,3259,3261,1938,3259,1938,1941,3280,3281,3250,3280,3250,1946,3280,1946,1943,1944,3254,3253,1944,3253,1940,3268,3280,1943,3253,3259,1941,3253,1941,1940,3276,3275,1904,3276,1904,1866,3275,3271,1948,3275,1948,1904,3277,3276,1866,3277,1866,1903,3271,3269,1945,3271,1945,1948,2185,2186,3309,2185,3309,3300,2155,2162,3286,2155,3286,3290,2155,3290,3284,2159,2158,3293,2159,3293,3297,2162,2184,3314,2162,3314,3288,2162,3288,3286,2183,2185,3300,2183,3300,3298,2156,2155,3284,2156,3284,3282,2158,2156,3282,2158,3282,3293,2184,2183,3298,2184,3298,3314,2167,2166,3287,2167,3287,3294,2167,3294,3313,2181,2164,3305,2181,3305,3302,2187,2181,3302,2187,3302,3301,2152,2167,3313,2152,3313,3299,2164,2163,3306,2164,3306,3305,2186,2187,3301,2186,3301,3309,2153,2152,3299,2153,3299,3310,3306,2163,2153,3306,2153,3310,2166,2165,3285,2166,3285,3289,2165,2180,3283,2165,3283,3285,3289,3287,2166,2160,2159,3297,2160,3297,3296,2180,2151,3291,2180,3291,3283,2150,2160,3296,2150,3296,3295,2151,2150,3295,2151,3295,3291,2145,2144,3342,2145,3342,3341,2145,3341,3354,2182,2169,3320,2182,3320,3319,2148,2145,3354,2148,3354,3353,2148,3353,3328,2172,2142,3349,2172,3349,3348,2144,2171,3346,2144,3346,3342,2169,2149,3329,2169,3329,3320,2149,2148,3328,2149,3328,3329,2171,2172,3348,2171,3348,3346,2213,2221,3333,2213,3333,3332,2216,2215,3324,2216,3324,3352,2216,3352,3355,2214,3327,3322,2214,3322,2218,2216,3355,3347,2214,2213,3332,2214,3332,3327,2221,2222,3330,2221,3330,3333,2215,2220,3321,2215,3321,3324,3347,3344,2217,3347,2217,2216,2219,2217,3344,2219,3344,3343,2220,2218,3322,2220,3322,3321,2222,2182,3319,2222,3319,3330,2174,2223,3345,2174,3345,3351,2141,2174,3351,2141,3351,3350,2223,2219,3343,2223,3343,3345,2142,2141,3350,2142,3350,3349,2319,2326,2330,2319,2330,2320,2315,2311,2332,2315,2332,2316,2311,2315,2334,2311,2334,2312,2307,2303,2336,2307,2336,2308,2303,2307,2339,2303,2339,2304,2300,2337,2341,2300,2341,2301,2296,2292,2343,2296,2343,2297,2292,2296,2346,2292,2346,2293,2290,2344,2347,2290,2347,2291,2317,2316,2332,2317,2332,2331,2309,2308,2336,2309,2336,2335,2265,2348,2351,2265,2351,2263,2261,2352,2258,2261,2258,2262,2257,2354,2262,2257,2262,2258,2253,2356,2250,2253,2250,2254,2249,2358,2254,2249,2254,2250,2246,2360,2362,2246,2362,2244,2242,2363,2239,2242,2239,2243,2238,2365,2243,2238,2243,2239,2235,2367,2369,2235,2369,2233,2265,2264,2349,2265,2349,2348,2238,2237,2366,2238,2366,2365,2261,2260,2353,2261,2353,2352,2242,2241,2364,2242,2364,2363,2253,2252,2357,2253,2357,2356,2226,2291,2347,2226,2347,2227,2294,2293,2346,2294,2346,2345,2305,2304,2339,2305,2339,2338,2313,2312,2334,2313,2334,2333,2302,2301,2341,2302,2341,2340,2246,2245,2361,2246,2361,2360,2235,2234,2368,2235,2368,2367,2228,2232,2370,2228,2370,2229,2249,2248,2359,2249,2359,2358,2257,2256,2355,2257,2355,2354,2370,2232,2233,2370,2233,2369,2368,2234,2236,2368,2236,2240,2366,2237,2240,2366,2240,2236,2364,2241,2244,2364,2244,2362,2361,2245,2247,2361,2247,2251,2359,2248,2251,2359,2251,2247,2357,2252,2255,2357,2255,2259,2355,2256,2259,2355,2259,2255,2353,2260,2263,2353,2263,2351,2321,2320,2330,2321,2330,2329,2298,2297,2343,2298,2343,2342,2324,2323,2328,2324,2328,2327,2344,2290,2294,2344,2294,2345,2299,2295,2298,2299,2298,2342,2295,2299,2302,2295,2302,2340,2337,2300,2305,2337,2305,2338,2310,2306,2309,2310,2309,2335,2306,2310,2313,2306,2313,2333,2318,2314,2317,2318,2317,2331,2314,2318,2321,2314,2321,2329,2326,2319,2324,2326,2324,2327,3356,3357,3358,3356,3358,3359,3356,3359,3360,3356,3360,3361,3356,3361,3362,3356,3362,3363,3356,3363,3364,3356,3364,3365,3356,3365,3366,3356,3366,3367,3356,3367,3368,3356,3368,3369,3356,3369,3370,3356,3370,3371,3356,3371,3372,3356,3372,3373,3356,3373,3374,3356,3374,3375,3376,3357,3356,3376,3356,3377,3378,3359,3358,3378,3358,3379,3380,3361,3360,3380,3360,3381,3382,3363,3362,3382,3362,3383,3384,3365,3364,3384,3364,3385,3386,3367,3366,3386,3366,3387,3388,3369,3368,3388,3368,3389,3390,3371,3370,3390,3370,3391,3392,3373,3372,3392,3372,3393,3394,3375,3374,3394,3374,3395,3377,3356,3375,3377,3375,3394,3395,3374,3373,3395,3373,3392,3393,3372,3371,3393,3371,3390,3391,3370,3369,3391,3369,3388,3389,3368,3367,3389,3367,3386,3387,3366,3365,3387,3365,3384,3385,3364,3363,3385,3363,3382,3383,3362,3361,3383,3361,3380,3381,3360,3359,3381,3359,3378,3379,3358,3357,3379,3357,3376,3396,3394,3395,3396,3395,3397,3398,3392,3393,3398,3393,3399,3400,3390,3391,3400,3391,3401,3402,3388,3389,3402,3389,3403,3404,3386,3387,3404,3387,3405,3406,3384,3385,3406,3385,3407,3408,3382,3383,3408,3383,3409,3410,3380,3381,3410,3381,3411,3412,3378,3379,3412,3379,3413,3414,3376,3377,3414,3377,3415,3413,3379,3376,3413,3376,3414,3411,3381,3378,3411,3378,3412,3409,3383,3380,3409,3380,3410,3407,3385,3382,3407,3382,3408,3405,3387,3384,3405,3384,3406,3403,3389,3386,3403,3386,3404,3401,3391,3388,3401,3388,3402,3399,3393,3390,3399,3390,3400,3397,3395,3392,3397,3392,3398,3415,3377,3394,3415,3394,3396,3416,3414,3415,3416,3415,3417,3418,3412,3413,3418,3413,3419,3420,3410,3411,3420,3411,3421,3422,3408,3409,3422,3409,3423,3424,3406,3407,3424,3407,3425,3426,3404,3405,3426,3405,3427,3428,3402,3403,3428,3403,3429,3430,3400,3401,3430,3401,3431,3432,3398,3399,3432,3399,3433,3434,3396,3397,3434,3397,3435,3417,3415,3396,3417,3396,3434,3435,3397,3398,3435,3398,3432,3433,3399,3400,3433,3400,3430,3431,3401,3402,3431,3402,3428,3429,3403,3404,3429,3404,3426,3427,3405,3406,3427,3406,3424,3425,3407,3408,3425,3408,3422,3423,3409,3410,3423,3410,3420,3421,3411,3412,3421,3412,3418,3419,3413,3414,3419,3414,3416,3436,3434,3435,3436,3435,3437,3438,3432,3433,3438,3433,3439,3440,3430,3431,3440,3431,3441,3442,3428,3429,3442,3429,3443,3444,3426,3427,3444,3427,3445,3446,3424,3425,3446,3425,3447,3448,3422,3423,3448,3423,3449,3450,3420,3421,3450,3421,3451,3452,3418,3419,3452,3419,3453,3454,3416,3417,3454,3417,3455,3453,3419,3416,3453,3416,3454,3451,3421,3418,3451,3418,3452,3449,3423,3420,3449,3420,3450,3447,3425,3422,3447,3422,3448,3445,3427,3424,3445,3424,3446,3443,3429,3426,3443,3426,3444,3441,3431,3428,3441,3428,3442,3439,3433,3430,3439,3430,3440,3437,3435,3432,3437,3432,3438,3455,3417,3434,3455,3434,3436,3456,3457,3458,3456,3458,3459,3460,3461,3457,3460,3457,3456,3462,3463,3461,3462,3461,3460,3464,3465,3463,3464,3463,3462,3466,3467,3465,3466,3465,3464,3468,3469,3467,3468,3467,3466,3470,3471,3469,3470,3469,3468,3472,3473,3471,3472,3471,3470,3474,3475,3473,3474,3473,3472,3476,3477,3475,3476,3475,3474,3478,3479,3477,3478,3477,3476,3480,3481,3479,3480,3479,3478,3482,3483,3481,3482,3481,3480,3484,3485,3483,3484,3483,3482,3486,3487,3485,3486,3485,3484,3488,3489,3487,3488,3487,3486,3490,3491,3489,3490,3489,3488,3492,3493,3491,3492,3491,3490,3494,3495,3493,3494,3493,3492,3459,3458,3495,3459,3495,3494,3458,3496,3497,3458,3497,3495,3495,3497,3498,3495,3498,3493,3493,3498,3499,3493,3499,3491,3491,3499,3500,3491,3500,3489,3489,3500,3501,3489,3501,3487,3487,3501,3502,3487,3502,3485,3485,3502,3503,3485,3503,3483,3483,3503,3504,3483,3504,3481,3481,3504,3505,3481,3505,3479,3479,3505,3506,3479,3506,3477,3477,3506,3507,3477,3507,3475,3475,3507,3508,3475,3508,3473,3473,3508,3509,3473,3509,3471,3471,3509,3510,3471,3510,3469,3469,3510,3511,3469,3511,3467,3467,3511,3512,3467,3512,3465,3465,3512,3513,3465,3513,3463,3463,3513,3514,3463,3514,3461,3461,3514,3515,3461,3515,3457,3457,3515,3496,3457,3496,3458,3516,3456,3459,3516,3460,3456,3516,3462,3460,3516,3464,3462,3516,3466,3464,3516,3468,3466,3516,3470,3468,3516,3472,3470,3516,3474,3472,3516,3476,3474,3516,3478,3476,3516,3480,3478,3516,3482,3480,3516,3484,3482,3516,3486,3484,3516,3488,3486,3516,3490,3488,3516,3492,3490,3516,3494,3492,3516,3459,3494,3496,3455,3436,3496,3436,3497,3497,3436,3437,3497,3437,3498,3498,3437,3438,3498,3438,3499,3499,3438,3439,3499,3439,3500,3500,3439,3440,3500,3440,3501,3501,3440,3441,3501,3441,3502,3502,3441,3442,3502,3442,3503,3503,3442,3443,3503,3443,3504,3504,3443,3444,3504,3444,3505,3505,3444,3445,3505,3445,3506,3506,3445,3446,3506,3446,3507,3507,3446,3447,3507,3447,3508,3508,3447,3448,3508,3448,3509,3509,3448,3449,3509,3449,3510,3510,3449,3450,3510,3450,3511,3511,3450,3451,3511,3451,3512,3512,3451,3452,3512,3452,3513,3513,3452,3453,3513,3453,3514,3514,3453,3454,3514,3454,3515,3515,3454,3455,3515,3455,3496,3517,3518,3519,3517,3519,3520,3521,3522,3523,3524,3525,3526,3524,3526,3527,3528,3529,3530,3528,3530,3531,3532,3533,3534,3532,3534,3535,3536,3537,3538,3539,3540,3541,3539,3541,3542,3543,3544,3539,3543,3539,3525,3521,3545,3522,3546,3535,3534,3546,3534,3547,3548,3549,3544,3548,3544,3543,17,16,3550,17,3550,3551,3552,3553,3554,3549,3548,3555,3549,3555,3556,3554,3557,3552,7,5,3538,7,3538,3552,3555,3548,3543,3555,3543,3558,3532,3535,3546,3532,3546,3559,3560,3561,8,3560,8,22,3562,3522,3545,3526,3542,14,3526,14,20,3549,3556,3563,3549,3563,3544,3564,3565,3566,3564,3566,3567,3563,3556,3555,3563,3555,3558,3562,3545,3568,3569,10,13,3569,13,3570,9,3517,3520,9,3520,12,3541,3540,3524,3541,3524,3527,3571,3572,3573,3571,3573,3574,3571,3574,3557,3571,3557,3554,3571,3554,3553,3571,3553,3575,3571,3575,3576,3571,3576,3577,3571,3577,3537,3571,3537,3578,3571,3578,3579,3571,3579,3580,3561,3517,9,3561,9,8,3518,3546,3547,3518,3547,3519,3581,3582,3583,3581,3583,3584,3581,3584,3585,3581,3585,3586,3581,3586,3587,3581,3587,3588,3581,3588,3589,3581,3589,3590,3581,3590,3591,3581,3591,3592,3581,3592,3593,3581,3593,3594,3595,3596,3569,3597,3598,3599,3597,3599,3600,3597,3600,3601,3597,3601,3602,3597,3602,3568,3597,3568,3545,3597,3545,3521,3597,3521,3523,3597,3523,3596,3597,3596,3595,3597,3595,3603,3597,3603,3604,13,23,3562,13,3562,3570,3533,3532,3559,3533,3559,3605,23,11,3522,23,3522,3562,3600,3599,3570,3603,3595,3569,3598,3570,3599,3520,3560,22,3520,22,12,3569,3597,3604,3534,3533,3605,3534,3605,3547,3559,3546,3518,3559,3518,3606,11,10,3569,11,3569,3522,3569,3596,3522,3602,3601,3562,21,17,3551,21,3551,3607,3584,3583,3608,3593,3592,3550,3582,3608,3583,3527,3526,20,3527,20,18,3540,3563,3558,3540,3558,3524,3550,3608,3581,3550,16,19,3550,19,3608,3592,3591,3550,3544,3563,3540,3544,3540,3539,3607,3588,3587,3589,3551,3590,3550,3591,3551,3586,3585,3607,3609,3610,3529,3609,3529,3528,3557,3574,3552,3536,3580,3579,3572,3571,3611,3612,3609,3528,3612,3528,3613,3,7,3552,3,3552,3611,1,3614,3615,1,3615,2,3536,3571,3580,3614,3616,3613,3614,3613,3615,3613,3528,3531,3613,3531,3615,3552,3574,3611,3530,3614,1,3530,1,4,3552,3538,3575,3576,3575,3538,3564,3567,3617,3564,3617,3610,5,0,3536,5,3536,3538,3537,3577,3538,3529,3616,3614,3529,3614,3530,3576,3538,3577,3552,3575,3553,3610,3617,3616,3610,3616,3529,3578,3537,3536,3566,3565,3609,3566,3609,3612,3617,3567,3566,3617,3566,3612,3536,0,3,3536,3,3611,3536,3611,3571,3616,3617,3612,3616,3612,3613,3615,3531,6,3615,6,2,3572,3611,3573,3579,3578,3536,3574,3573,3611,3565,3564,3610,3565,3610,3609,3531,3530,4,3531,4,6,3607,3587,3586,3591,3590,3551,3589,3588,3551,3607,3551,3588,3542,3541,15,3542,15,14,3607,3584,3608,3550,3581,3594,15,3541,3527,15,3527,18,19,21,3607,19,3607,3608,3558,3543,3525,3558,3525,3524,3582,3581,3608,3550,3594,3593,3585,3584,3607,3525,3539,3542,3525,3542,3526,3562,3568,3602,3596,3523,3522,3606,3518,3517,3606,3517,3561,3562,3600,3570,3519,3618,3560,3519,3560,3520,3569,3570,3597,3547,3605,3618,3547,3618,3519,3598,3597,3570,3569,3604,3603,3601,3600,3562,3618,3606,3561,3618,3561,3560,3605,3559,3606,3605,3606,3618,3619,3620,3621,3622,3623,3624,3622,3624,3625,3626,3627,3628,3629,3630,3631,3632,3633,3634,3635,3636,3637,3635,3637,3638,3630,3639,3631,3640,3641,3642,3640,3642,3643,3644,3619,3621,3645,3646,3647,3645,3647,3648,3649,3650,3651,3649,3651,3652,3636,3653,3654,3636,3654,3637,3655,3622,3625,3655,3625,3656,3657,3658,3659,3657,3659,3660,3661,3655,3656,3661,3656,3662,3661,3662,3624,3661,3624,3623,3619,3663,3664,3619,3664,3665,3666,3620,3665,3667,3661,3623,3667,3623,3668,3669,3657,3660,3669,3660,3670,3671,3666,3665,3619,3644,3672,3673,3674,3645,3646,3675,3665,3646,3665,3664,3646,3664,3647,3646,3676,3677,3676,3646,3645,3678,3668,3623,3678,3623,3622,3665,3675,3679,3680,3681,3682,3680,3682,3683,3684,3685,3681,3684,3681,3680,3686,3640,3643,3686,3643,3687,3686,3687,3688,3686,3688,3689,3626,3690,3691,3626,3691,3692,3693,3694,3692,3695,3686,3689,3695,3689,3696,3697,3684,3680,3697,3680,3698,3626,3694,3699,3700,3693,3692,3631,3628,3701,3631,3701,3702,3639,3703,3704,3681,3705,3696,3681,3696,3682,3639,3630,3706,3682,3696,3689,3682,3689,3641,3692,3704,3707,3638,3637,3708,3638,3708,3709,3709,3708,3710,3709,3710,3650,3711,3638,3709,3711,3709,3712,3711,3712,3713,3711,3713,3654,3714,3715,3632,3716,3711,3654,3716,3654,3653,3715,3717,3718,3715,3718,3719,3712,3709,3650,3712,3650,3649,3720,3715,3721,3632,3634,3722,3717,3723,3724,3688,3687,3643,3688,3643,3642,3725,3722,3634,3725,3634,3633,3725,3633,3726,3725,3726,3727,3725,3727,3728,3725,3728,3729,3725,3729,3730,3725,3730,3724,3725,3724,3723,3725,3723,3720,3725,3720,3721,3725,3721,3714,3666,3671,3679,3666,3679,3675,3666,3675,3731,3666,3731,3677,3666,3677,3676,3666,3676,3674,3666,3674,3673,3666,3673,3732,3666,3732,3672,3666,3672,3644,3666,3644,3621,3666,3621,3620,3717,3724,3730,3733,3726,3633,3637,3654,3713,3637,3713,3708,3733,3728,3727,3728,3733,3717,3708,3713,3734,3708,3734,3710,3729,3728,3717,3726,3733,3727,3710,3734,3735,3710,3735,3736,3733,3632,3737,3733,3737,3738,3733,3633,3632,3730,3729,3717,3693,3700,3707,3693,3707,3704,3693,3704,3703,3693,3703,3706,3693,3706,3630,3693,3630,3629,3693,3629,3702,3693,3702,3701,3693,3701,3628,3693,3628,3627,3693,3627,3699,3693,3699,3694,3735,3652,3651,3735,3651,3736,3624,3662,3656,3624,3656,3625,3715,3720,3723,3722,3725,3632,3715,3714,3721,3716,3635,3638,3716,3638,3711,3712,3649,3734,3712,3734,3713,3725,3714,3632,3715,3719,3737,3715,3737,3632,3649,3652,3735,3649,3735,3734,3715,3723,3717,3650,3710,3736,3650,3736,3651,3717,3733,3738,3717,3738,3718,3685,3739,3705,3685,3705,3681,3703,3639,3706,3641,3689,3688,3641,3688,3642,3639,3692,3691,3639,3691,3740,3639,3704,3692,3702,3629,3631,3692,3707,3700,3627,3626,3699,3695,3683,3640,3695,3640,3686,3626,3631,3741,3626,3741,3690,3697,3698,3705,3697,3705,3739,3694,3626,3692,3698,3695,3696,3698,3696,3705,3698,3680,3683,3698,3683,3695,3626,3628,3631,3683,3682,3641,3683,3641,3640,3631,3639,3740,3631,3740,3741,3658,3742,3743,3658,3743,3659,3674,3676,3645,3731,3646,3677,3659,3743,3668,3659,3668,3678,3646,3731,3675,3645,3732,3673,3645,3672,3732,3665,3679,3671,3667,3744,3655,3667,3655,3661,3619,3645,3648,3619,3648,3663,3669,3670,3743,3669,3743,3742,3620,3619,3665,3670,3667,3668,3670,3668,3743,3670,3660,3744,3670,3744,3667,3619,3672,3645,3744,3678,3622,3744,3622,3655,3660,3659,3678,3660,3678,3744,3738,3737,3653,3738,3653,3636,3719,3716,3653,3719,3653,3737,3648,3647,3658,3648,3658,3657,3663,3669,3742,3663,3742,3664,3741,3740,3685,3741,3685,3684,3690,3697,3739,3690,3739,3691,3719,3718,3635,3719,3635,3716,3718,3738,3636,3718,3636,3635,3690,3741,3684,3690,3684,3697,3740,3691,3739,3740,3739,3685,3663,3648,3657,3663,3657,3669,3647,3664,3742,3647,3742,3658];
var cessnaJSON = {
	vertices: vertices$1,
	normals: normals$1,
	triangles: triangles$1
};

/**
 * Draw shadow of a mesh using a shadow map.
 */
function shadowMap(gl) {
    //const mesh = await fetch('dodecahedron.stl')
    //    .then(r => r.blob())
    //    .then(Mesh.fromBinarySTL)
    //    .then(mesh => mesh.translate(0,1,0).scale(5).compile())
    const mesh = Mesh.load(cessnaJSON);
    let angleX = 20;
    let angleY = 20;
    let useBoundingSphere = true;
    const cube = Mesh.cube();
    const sphere = Mesh.sphere(2).computeWireframeFromFlatTriangles().compile();
    const plane = Mesh.plane().translate(-0.5, -0.5).scale(300, 300, 1);
    const depthMap = new Texture(1024, 1024, { format: gl.RGBA });
    const texturePlane = Mesh.plane();
    const boundingSphere = mesh.getBoundingSphere();
    const boundingBox = mesh.getAABB();
    const frustrumCube = Mesh.cube().scale(2).translate(V3.XYZ.negated());
    const colorShader = Shader.create(`
	uniform mat4 ts_ModelViewProjectionMatrix;
	attribute vec4 ts_Vertex;
  void main() {
    gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
  }
`, `
	precision highp float;
  uniform vec4 color;
  void main() {
    gl_FragColor = color;
  }
`);
    const depthShader = Shader.create(`
	uniform mat4 ts_ModelViewProjectionMatrix;
	attribute vec4 ts_Vertex;
  varying vec4 pos;
  void main() {
    gl_Position = pos = ts_ModelViewProjectionMatrix * ts_Vertex;
  }
`, `
	precision highp float;
  varying vec4 pos;
  void main() {
    float depth = pos.z / pos.w;
    gl_FragColor = vec4(depth * 0.5 + 0.5);
  }
`);
    const displayShader = Shader.create(`
	uniform mat4 ts_ModelViewMatrix;
	uniform mat3 ts_NormalMatrix;
	uniform mat4 ts_ModelViewProjectionMatrix;
	attribute vec4 ts_Vertex;
	attribute vec3 ts_Normal;
  uniform mat4 shadowMapMatrix;
  uniform vec3 light;
  varying vec4 coord;
  varying vec3 normal;
  varying vec3 toLight;
  void main() {
    toLight = light - (ts_ModelViewMatrix * ts_Vertex).xyz;
    normal = ts_NormalMatrix * ts_Normal;
    gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
    coord = shadowMapMatrix * gl_Position;
  }
`, `
	precision highp float;
  uniform sampler2D depthMap;
  varying vec4 coord;
  varying vec3 normal;
  varying vec3 toLight;
  void main() {
    float shadow = 0.0;
    if (coord.w > 0.0) {
      float depth = 0.0;
      vec2 sample = coord.xy / coord.w * 0.5 + 0.5;
      if (clamp(sample, 0.0, 1.0) == sample) {
        float sampleDepth = texture2D(depthMap, sample).r;
        depth = (sampleDepth == 1.0) ? 1.0e9 : sampleDepth;
      }
      if (depth > 0.0) {
        float bias = -0.002;
        shadow = clamp(300.0 * (bias + coord.z / coord.w * 0.5 + 0.5 - depth), 0.0, 1.0);
      }
    }
    float ambient = 0.1;
    float diffuse = max(0.0, dot(normalize(toLight), normalize(normal)));
    gl_FragColor = vec4((normal * 0.5 + 0.5) * mix(ambient, 1.0, diffuse * (1.0 - shadow)), 1.0);
  }
`);
    const textureShader = Shader.create(`
  varying vec2 coord;
  attribute vec2 ts_TexCoord;
  void main() {
    coord = ts_TexCoord;
    gl_Position = vec4(coord * 2.0 - 1.0, 0.0, 1.0);
  }
`, `
	precision highp float;
  uniform sampler2D texture;
  varying vec2 coord;
  void main() {
    gl_FragColor = texture2D(texture, coord);
  }
`);
    let lastPos = V3.O;
    // scene rotation
    gl.canvas.onmousemove = function (e) {
        const pagePos = V(e.pageX, e.pageY);
        const delta = lastPos.to(pagePos);
        if (e.buttons & 1) {
            angleY += delta.x;
            angleX = clamp(angleX + delta.y, -90, 90);
        }
        lastPos = pagePos;
    };
    gl.canvas.contentEditable = 'true';
    gl.canvas.addEventListener('keypress', () => {
        useBoundingSphere = !useBoundingSphere;
    });
    gl.enable(gl.DEPTH_TEST);
    function cameraForBoundingSphere(light, sphere) {
        const distance = sphere.center.minus(light).length();
        const angle = 2 * Math.asin(sphere.radius / distance);
        gl.matrixMode(gl.PROJECTION);
        gl.loadIdentity();
        gl.perspective(angle / DEG, 1, distance - sphere.radius, distance + sphere.radius);
        gl.matrixMode(gl.MODELVIEW);
        gl.loadIdentity();
        gl.lookAt(light, sphere.center, V3.Y);
    }
    function cameraForBoundingBox(light, boundingBox) {
        const center = boundingBox.min.plus(boundingBox.max).div(2);
        const axisZ = center.minus(light).unit();
        const axisX = axisZ.cross(new V3(0, 1, 0)).unit();
        const axisY = axisX.cross(axisZ);
        let near = Number.MAX_VALUE;
        let far = -Number.MAX_VALUE;
        let slopeNegX = 0;
        let slopePosX = 0;
        let slopeNegY = 0;
        let slopePosY = 0;
        // Loop over all the points and find the maximum slope for each direction.
        // Incidentally, this algorithm works for convex hulls of any shape and will
        // return the optimal bounding frustum for every hull.
        const bbPoints = boundingBox.corners();
        for (const point of bbPoints) {
            const toPoint = point.minus(light);
            const dotZ = toPoint.dot(axisZ);
            const slopeX = toPoint.dot(axisX) / dotZ;
            const slopeY = toPoint.dot(axisY) / dotZ;
            slopeNegX = Math.min(slopeNegX, slopeX);
            slopeNegY = Math.min(slopeNegY, slopeY);
            slopePosX = Math.max(slopePosX, slopeX);
            slopePosY = Math.max(slopePosY, slopeY);
            near = Math.min(near, dotZ);
            far = Math.max(far, dotZ);
        }
        // Need to fit an oblique view frustum to get optimal bounds
        gl.matrixMode(gl.PROJECTION);
        gl.loadIdentity();
        gl.frustum(slopeNegX * near, slopePosX * near, slopeNegY * near, slopePosY * near, near, far);
        gl.matrixMode(gl.MODELVIEW);
        gl.loadIdentity();
        gl.lookAt(light, center, V3.Y);
    }
    return gl.animate(function (abs) {
        const time$$1 = abs / 1000;
        // Move the light around
        const light = new V3(100 * Math.sin(time$$1 * 0.2), 25, 20 * Math.cos(time$$1 * 0.2));
        // Construct a camera looking from the light toward the object. The view
        // frustum is fit so it tightly encloses the bounding volume of the object
        // (sphere or box) to make best use of shadow map resolution. A frustum is
        // a pyramid shape with the apex chopped off.
        if (useBoundingSphere) {
            cameraForBoundingSphere(light, boundingSphere);
        }
        else {
            cameraForBoundingBox(light, boundingBox);
        }
        // Render the object viewed from the light using a shader that returns the
        // fragment depth.
        const shadowMapMatrix = gl.projectionMatrix.times(gl.modelViewMatrix);
        depthMap.unbind(0);
        depthMap.drawTo(function () {
            gl.clearColor(1, 1, 1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            depthShader.draw(mesh);
        });
        const shadowMapMatrixInversed = shadowMapMatrix.inversed();
        // Set up the camera for the scene
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.matrixMode(gl.PROJECTION);
        gl.loadIdentity();
        gl.perspective(45, gl.canvas.width / gl.canvas.height, 1, 1000);
        gl.matrixMode(gl.MODELVIEW);
        gl.loadIdentity();
        gl.translate(0, 0, -100);
        gl.rotate(angleX, 1, 0, 0);
        gl.rotate(angleY, 0, 1, 0);
        // Draw view frustum
        gl.pushMatrix();
        gl.translate(light);
        colorShader.uniforms({
            color: [1, 1, 0, 1],
        }).draw(sphere, gl.LINES);
        gl.popMatrix();
        gl.pushMatrix();
        gl.multMatrix(shadowMapMatrixInversed);
        colorShader.uniforms({
            color: [1, 1, 0, 1],
        }).draw(frustrumCube, gl.LINES);
        gl.popMatrix();
        // Draw the bounding volume
        gl.pushMatrix();
        if (useBoundingSphere) {
            gl.translate(boundingSphere.center);
            gl.scale(boundingSphere.radius);
            colorShader.uniforms({
                color: [0, 1, 1, 1],
            }).draw(sphere, gl.LINES);
        }
        else {
            gl.translate(boundingBox.min);
            gl.scale(boundingBox.size());
            colorShader.uniforms({
                color: [0, 1, 1, 1],
            }).draw(cube, gl.LINES);
        }
        gl.popMatrix();
        // Draw mesh
        depthMap.bind(0);
        displayShader.uniforms({
            shadowMapMatrix: shadowMapMatrix.times(gl.projectionMatrix.times(gl.modelViewMatrix).inversed()),
            light: gl.modelViewMatrix.transformPoint(light),
            depthMap: 0,
        }).draw(mesh);
        // Draw plane
        gl.pushMatrix();
        gl.rotate(-90, 1, 0, 0);
        displayShader.draw(plane);
        gl.popMatrix();
        // Draw depth map overlay
        gl.viewport(10, 10, 10 + 256, 10 + 256);
        textureShader.draw(texturePlane);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    });
}
shadowMap.info = 'Press any key to toggle between sphere- or AABB-based camera clipping.';

exports.camera = camera;
exports.gpuLightMap = gpuLightMap;
exports.immediateMode = immediateMode;
exports.mag = mag;
exports.multiTexture = multiTexture;
exports.rayTracing = rayTracing;
exports.renderToTexture = renderToTexture;
exports.setupDemo = setupDemo;
exports.shadowMap = shadowMap;

return exports;

}({},chroma));
//# sourceMappingURL=demo.js.map
