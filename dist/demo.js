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
    scale(factor) {
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
        const indexMap = P.permutationAsIndexMap();
        const dependentRowIndexes = dependents.map((b, index) => b && indexMap[index]).filter(x => x != undefined);
        return dependentRowIndexes;
    }
}

const { abs, PI: PI$1, sign } = Math;
const TAU = 2 * PI$1;
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
    if (PI$1 == this) {
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
function addOwnProperties(target, props) {
    Object.getOwnPropertyNames(props).forEach(key => {
        //console.log(props, key)
        if (target.hasOwnProperty(key)) {
            console.warn('target ', target, ' already has property ', key, target[key]);
        }
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(props, key));
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
if (!Object.prototype.toSource) {
    Object.defineProperty(Object.prototype, 'toSource', { value: function () { return JSON.stringify(this, SCE); } });
}
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
        assert(result.length - destStart >= v3count * 3, 'dest.length - destStart >= v3count * 3');
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
        assertf(() => 2 == arguments.length);
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
/**
 * Utility method for creating V3s
 *
 * Example usage:
 *
 *     V(1, 2, 3)
 *     V([1, 2, 3])
 *     V({ x: 1, y: 2, z: 3 })
 *     V(1, 2) * assumes z=0
 *     V([1, 2]) // assumes z=0
 *
 */
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

const { PI: PI$1$1, abs: abs$1 } = Math;
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
        return this.transformPoint(V3.O);
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
            const phi = a_ii === a_kk ? PI$1$1 / 4 : Math.atan(2 * a_ik / (a_ii - a_kk)) / 2;
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
        assert(w === 0, () => 'w != 0 needs to be true for this to make sense (w =' + w + this.str);
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
     * Get the translation part of this matrix, i.e. the result of this.transformVector(V3.O)
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
    is3x3() {
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
    toSource() {
        if (this.isIdentity()) {
            return 'M4.IDENTITY';
        }
        else if (this.isTranslation()) {
            return callsce('M4.translate', this.O);
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
Object.assign(M4.prototype, Transformable.prototype);

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

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
}

const { cos, sin: sin$1, PI: PI$2, min, max } = Math;
const WGL$2 = WebGLRenderingContext;
/**
 * @example new Mesh()
 *        .addIndexBuffer('TRIANGLES')
 *        .addIndexBuffer('LINES')
 *        .addVertexBuffer('normals', 'LGL_Normal')
 */
class Mesh extends Transformable {
    constructor() {
        super();
        this.hasBeenCompiled = false;
        this.vertexBuffers = {};
        this.indexBuffers = {};
        this.addVertexBuffer('vertices', 'LGL_Vertex');
        //if (options.coords) this.addVertexBuffer('coords', 'LGL_TexCoord')
        //if (options.normals) this.addVertexBuffer('normals', 'LGL_Normal')
        //if (options.colors) this.addVertexBuffer('colors', 'LGL_Color')
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
     * @example new Mesh().addVertexBuffer('coords', 'LGL_TexCoord')
     */
    addVertexBuffer(name, attribute) {
        assert(!this.vertexBuffers[attribute], 'Buffer ' + attribute + ' already exists.');
        //assert(!this[name])
        this.hasBeenCompiled = false;
        assert('string' == typeof name);
        assert('string' == typeof attribute);
        const buffer = this.vertexBuffers[attribute] = new Buffer(WGL$2.ARRAY_BUFFER, Float32Array);
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
        const buffer = this.indexBuffers[name] = new Buffer(WGL$2.ELEMENT_ARRAY_BUFFER, Uint16Array);
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
                mesh[bufferName].push(oldMesh[bufferName]);
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
        Object.getOwnPropertyNames(this.vertexBuffers).forEach(attribute => {
            const buffer = this.vertexBuffers[attribute];
            buffer.data = this[buffer.name];
            buffer.compile(undefined, gl);
            
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
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const mesh = new Mesh()
                    .addVertexBuffer('normals', 'LGL_Normal');
                const fileReader = new FileReader();
                fileReader.onerror = reject;
                fileReader.onload = function (progressEvent) {
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
            mesh.addVertexBuffer('normals', 'LGL_Normal');
            const invTrans = m4.as3x3().inversed().transposed().normalized();
            mesh.normals = this.normals.map(n => invTrans.transformVector(n).unit());
            // mesh.normals.forEach(n => assert(n.hasLength(1)))
        }
        for (const name in this.indexBuffers) {
            mesh.addIndexBuffer(name);
            mesh[name] = this[name];
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
            this.addVertexBuffer('normals', 'LGL_Normal');
        // tslint:disable:no-string-literal
        //this.vertexBuffers['LGL_Normal'].data = arrayFromFunction(this.vertices.length, i => V3.O)
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
            .addVertexBuffer('normals', 'LGL_Normal')
            .addVertexBuffer('coords', 'LGL_TexCoord');
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
            .addVertexBuffer('normals', 'LGL_Normal')
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
            return new V3(0, cos(angle), sin$1(angle));
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
            .addVertexBuffer('normals', 'LGL_Normal')
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
            .addVertexBuffer('coords', 'LGL_TexCoord');
        normals && mesh.addVertexBuffer('normals', 'LGL_Normal');
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
        normals && mesh.addVertexBuffer('normals', 'LGL_Normal');
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
            .addVertexBuffer('normals', 'LGL_Normal')
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
            mesh.addVertexBuffer('normals', 'LGL_Normal');
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
const WGL$3 = WebGLRenderingContext;
/**
 * These are all the draw modes usable in OpenGL ES
 */
var DRAW_MODES;
(function (DRAW_MODES) {
    DRAW_MODES[DRAW_MODES["POINTS"] = WGL$3.POINTS] = "POINTS";
    DRAW_MODES[DRAW_MODES["LINES"] = WGL$3.LINES] = "LINES";
    DRAW_MODES[DRAW_MODES["LINE_STRIP"] = WGL$3.LINE_STRIP] = "LINE_STRIP";
    DRAW_MODES[DRAW_MODES["LINE_LOOP"] = WGL$3.LINE_LOOP] = "LINE_LOOP";
    DRAW_MODES[DRAW_MODES["TRIANGLES"] = WGL$3.TRIANGLES] = "TRIANGLES";
    DRAW_MODES[DRAW_MODES["TRIANGLE_STRIP"] = WGL$3.TRIANGLE_STRIP] = "TRIANGLE_STRIP";
    DRAW_MODES[DRAW_MODES["TRIANGLE_FAN"] = WGL$3.TRIANGLE_FAN] = "TRIANGLE_FAN";
})(DRAW_MODES || (DRAW_MODES = {}));

const DRAW_MODE_CHECKS = {
    [DRAW_MODES.POINTS]: x => true,
    [DRAW_MODES.LINES]: x => 0 == x % 2,
    [DRAW_MODES.LINE_STRIP]: x => x > 2,
    [DRAW_MODES.LINE_LOOP]: x => x > 2,
    [DRAW_MODES.TRIANGLES]: x => 0 == x % 3,
    [DRAW_MODES.TRIANGLE_STRIP]: x => x > 3,
    [DRAW_MODES.TRIANGLE_FAN]: x => x > 3,
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
//const x:keyof UniformTypesMap = undefined as 'FLOAT_VEC4' | 'FLOAT_VEC3'
class Shader {
    /**
     * Provides a convenient wrapper for WebGL shaders. A few uniforms and attributes,
     * prefixed with `gl_`, are automatically added to all shader sources to make
     * simple shaders easier to write.
     * Headers for the following variables are automatically prepended to the passed source. The correct variables
     * are also automatically passed to the shader when drawing.
     *
     * For vertex and fragment shaders:
     uniform mat3 LGL_NormalMatrix;
     uniform mat4 LGL_ModelViewMatrix;
     uniform mat4 LGL_ProjectionMatrix;
     uniform mat4 LGL_ModelViewProjectionMatrix;
     uniform mat4 LGL_ModelViewMatrixInverse;
     uniform mat4 LGL_ProjectionMatrixInverse;
     uniform mat4 LGL_ModelViewProjectionMatrixInverse;
     *
     *
     * Example usage:
     *
     *  const shader = new GL.Shader(
     *      `void main() { gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex; }`,
     *      `uniform vec4 color; void main() { gl_FragColor = color; }`)
     *
     *  shader.uniforms({ color: [1, 0, 0, 1] }).draw(mesh)
     *
     * Compiles a shader program using the provided vertex and fragment shaders.
     */
    constructor(vertexSource, fragmentSource, gl = currentGL()) {
        this.projectionMatrixVersion = -1;
        this.modelViewMatrixVersion = -1;
        // Headers are prepended to the sources to provide some automatic functionality.
        const header = `
		uniform mat3 LGL_NormalMatrix;
		uniform mat4 LGL_ModelViewMatrix;
		uniform mat4 LGL_ProjectionMatrix;
		uniform mat4 LGL_ModelViewProjectionMatrix;
		uniform mat4 LGL_ModelViewMatrixInverse;
		uniform mat4 LGL_ProjectionMatrixInverse;
		uniform mat4 LGL_ModelViewProjectionMatrixInverse;
	`;
        const vertexHeader = header + `
		attribute vec4 LGL_Vertex;
		attribute vec2 LGL_TexCoord;
		attribute vec3 LGL_Normal;
		attribute vec4 LGL_Color;
	`;
        const fragmentHeader = `  precision highp float;` + header;
        const matrixNames = header.match(/\bLGL_\w+/g);
        // Compile and link errors are thrown as strings.
        function compileSource(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, WGL$3.COMPILE_STATUS)) {
                throw new Error('compile error: ' + gl.getShaderInfoLog(shader));
            }
            return shader;
        }
        this.gl = gl;
        const program = gl.createProgram();
        if (!program) {
            gl.handleError();
        }
        this.program = program;
        gl.attachShader(this.program, compileSource(WGL$3.VERTEX_SHADER, vertexHeader + vertexSource));
        gl.attachShader(this.program, compileSource(WGL$3.FRAGMENT_SHADER, fragmentHeader + fragmentSource));
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, WGL$3.LINK_STATUS)) {
            throw new Error('link error: ' + gl.getProgramInfoLog(this.program));
        }
        this.attributes = {};
        this.uniformLocations = {};
        // Check for the use of built-in matrices that require expensive matrix
        // multiplications to compute, and record these in `activeMatrices`.
        this.activeMatrices = {};
        matrixNames && matrixNames.forEach(name => {
            if (gl.getUniformLocation(this.program, name)) {
                this.activeMatrices[name] = true;
            }
        });
        this.uniformInfos = {};
        for (let i = gl.getProgramParameter(this.program, WGL$3.ACTIVE_UNIFORMS); i-- > 0;) {
            // see https://www.khronos.org/registry/OpenGL-Refpages/es2.0/xhtml/glGetActiveUniform.xml
            // this.program has already been checked
            // i is in bounds
            const info = gl.getActiveUniform(this.program, i);
            this.uniformInfos[info.name] = info;
        }
        gl.handleError();
    }
    static create(vertexSource, fragmentSource) {
        return new Shader(vertexSource, fragmentSource);
    }
    /**
     * Set a uniform for each property of `uniforms`. The correct `viewerGL.uniform*()` method is inferred from the
     * value types and from the stored uniform sampler flags.
     */
    uniforms(uniforms) {
        const gl = this.gl;
        gl.useProgram(this.program);
        gl.handleError();
        for (const name in uniforms) {
            const location = this.uniformLocations[name] || gl.getUniformLocation(this.program, name);
            !location && console.warn(name + ' uniform is not used in shader');
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
            gl.handleError();
        }
        return this;
    }
    /**
     * Sets all uniform matrix attributes, binds all relevant buffers, and draws the mesh geometry as indexed
     * triangles or indexed LINES. Set `mode` to `WGL.LINES` (and either add indices to `LINES` or call
     * `computeWireframe()`) to draw the mesh in wireframe.
     *
     * @param mesh
     * @param mode Defaults to 'TRIANGLES'. Must be passed as string so the correct index buffer can be
     *     automatically drawn.
     * @param start int
     * @param count int
     */
    draw(mesh, mode = DRAW_MODES.TRIANGLES, start, count) {
        assert(mesh.hasBeenCompiled, 'mesh.hasBeenCompiled');
        assert(undefined != DRAW_MODES[mode]);
        const modeStr = DRAW_MODES[mode];
        // assert(mesh.indexBuffers[modeStr], `mesh.indexBuffers[${modeStr}] undefined`)
        return this.drawBuffers(mesh.vertexBuffers, mesh.indexBuffers[modeStr], mode, start, count);
    }
    /**
     * Sets all uniform matrix attributes, binds all relevant buffers, and draws the
     * indexed mesh geometry. The `vertexBuffers` argument is a map from attribute
     * names to `Buffer` objects of type `WGL.ARRAY_BUFFER`, `indexBuffer` is a `Buffer`
     * object of type `WGL.ELEMENT_ARRAY_BUFFER`, and `mode` is a WebGL primitive mode
     * like `WGL.TRIANGLES` or `WGL.LINES`. This method automatically creates and caches
     * vertex attribute pointers for attributes as needed.
     */
    drawBuffers(vertexBuffers, indexBuffer, mode = DRAW_MODES.TRIANGLES, start = 0, count) {
        const gl = this.gl;
        gl.handleError();
        assert(undefined != DRAW_MODES[mode]);
        assertf(() => 1 <= Object.keys(vertexBuffers).length);
        Object.keys(vertexBuffers).forEach(key => assertInst(Buffer, vertexBuffers[key]));
        // Only varruct up the built-in matrices that are active in the shader
        const on = this.activeMatrices;
        const modelViewMatrixInverse = (on['LGL_ModelViewMatrixInverse'] || on['LGL_NormalMatrix'])
            //&& this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            && gl.modelViewMatrix.inversed();
        const projectionMatrixInverse = on['LGL_ProjectionMatrixInverse']
            //&& this.projectionMatrixVersion != gl.projectionMatrixVersion
            && gl.projectionMatrix.inversed();
        const modelViewProjectionMatrix = (on['LGL_ModelViewProjectionMatrix'] || on['LGL_ModelViewProjectionMatrixInverse'])
            //&& (this.projectionMatrixVersion != gl.projectionMatrixVersion || this.modelViewMatrixVersion !=
            // gl.modelViewMatrixVersion)
            && gl.projectionMatrix.times(gl.modelViewMatrix);
        const uni = {}; // Uniform Matrices
        on['LGL_ModelViewMatrix']
            && this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            && (uni['LGL_ModelViewMatrix'] = gl.modelViewMatrix);
        on['LGL_ModelViewMatrixInverse'] && (uni['LGL_ModelViewMatrixInverse'] = modelViewMatrixInverse);
        on['LGL_ProjectionMatrix']
            && this.projectionMatrixVersion != gl.projectionMatrixVersion
            && (uni['LGL_ProjectionMatrix'] = gl.projectionMatrix);
        projectionMatrixInverse && (uni['LGL_ProjectionMatrixInverse'] = projectionMatrixInverse);
        modelViewProjectionMatrix && (uni['LGL_ModelViewProjectionMatrix'] = modelViewProjectionMatrix);
        modelViewProjectionMatrix && on['LGL_ModelViewProjectionMatrixInverse']
            && (uni['LGL_ModelViewProjectionMatrixInverse'] = modelViewProjectionMatrix.inversed());
        on['LGL_NormalMatrix']
            && this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            && (uni['LGL_NormalMatrix'] = modelViewMatrixInverse.transposed());
        this.uniforms(uni);
        this.projectionMatrixVersion = gl.projectionMatrixVersion;
        this.modelViewMatrixVersion = gl.modelViewMatrixVersion;
        // Create and enable attribute pointers as necessary.
        let minVertexBufferLength = Infinity;
        for (const attribute in vertexBuffers) {
            const buffer = vertexBuffers[attribute];
            assert(buffer.hasBeenCompiled);
            const location = this.attributes[attribute] || gl.getAttribLocation(this.program, attribute);
            gl.handleError();
            if (location == -1 || !buffer.buffer) {
                //console.warn(`Vertex buffer ${attribute} was not bound because the attribute is not active.`)
                continue;
            }
            this.attributes[attribute] = location;
            gl.bindBuffer(WGL$3.ARRAY_BUFFER, buffer.buffer);
            gl.handleError();
            gl.enableVertexAttribArray(location);
            gl.handleError();
            gl.vertexAttribPointer(location, buffer.spacing, WGL$3.FLOAT, false, 0, 0);
            gl.handleError();
            minVertexBufferLength = Math.min(minVertexBufferLength, buffer.count);
        }
        // Disable unused attribute pointers.
        for (const attribute in this.attributes) {
            if (!(attribute in vertexBuffers)) {
                gl.disableVertexAttribArray(this.attributes[attribute]);
                gl.handleError();
            }
        }
        // Draw the geometry.
        if (minVertexBufferLength) {
            count = count || (indexBuffer ? indexBuffer.count : minVertexBufferLength);
            assert(DRAW_MODE_CHECKS[mode](count), 'count ' + count + ' doesn\'t fulfill requirement '
                + DRAW_MODE_CHECKS[mode].toString() + ' for mode ' + DRAW_MODES[mode]);
            if (indexBuffer) {
                assert(indexBuffer.hasBeenCompiled);
                assert(minVertexBufferLength > indexBuffer.maxValue);
                assert(count % indexBuffer.spacing == 0);
                assert(start % indexBuffer.spacing == 0);
                if (start + count > indexBuffer.count) {
                    throw new Error('Buffer not long enough for passed parameters start/length/buffer length' + ' ' + start + ' ' + count + ' ' + indexBuffer.count);
                }
                gl.bindBuffer(WGL$3.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
                gl.handleError();
                // start parameter has to be multiple of sizeof(WGL.UNSIGNED_SHORT)
                gl.drawElements(mode, count, WGL$3.UNSIGNED_SHORT, 2 * start);
                gl.handleError();
            }
            else {
                if (start + count > minVertexBufferLength) {
                    throw new Error('invalid');
                }
                gl.drawArrays(mode, start, count);
                gl.handleError();
            }
            gl.drawCallCount++;
        }
        return this;
    }
}

/**
 * There's only one constant, use it for default values. Use chroma-js or similar for actual colors.
 */

function currentGL() {
    return LightGLContext.gl;
}
const WGL$1 = WebGLRenderingContext;

class LightGLContext {
    constructor(gl, immediate = {
            mesh: new Mesh()
                .addVertexBuffer('coords', 'LGL_TexCoord')
                .addVertexBuffer('colors', 'LGL_Color'),
            mode: -1,
            coord: [0, 0],
            color: [1, 1, 1, 1],
            pointSize: 1,
            shader: new Shader(`
            uniform float pointSize;
            varying vec4 color;
            varying vec2 coord;
            void main() {
                color = LGL_Color;
                coord = LGL_TexCoord;
                gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
                gl_PointSize = pointSize;
            }
        `, `
            uniform sampler2D texture;
            uniform float pointSize;
            uniform bool useTexture;
            varying vec4 color;
            varying vec2 coord;
            void main() {
                gl_FragColor = color;
                if (useTexture) gl_FragColor *= texture2D(texture, coord.xy);
            }
        `, gl),
        }) {
        this.immediate = immediate;
        this.modelViewMatrix = new M4();
        this.projectionMatrix = new M4();
        this.MODELVIEW = LightGLContext.MODELVIEW;
        this.PROJECTION = LightGLContext.PROJECTION;
        this.tempMatrix = new M4();
        this.resultMatrix = new M4();
        this.modelViewStack = [];
        this.projectionStack = [];
        this.drawCallCount = 0;
        this.projectionMatrixVersion = 0;
        this.modelViewMatrixVersion = 0;
        this.matrixMode(LightGLContext.MODELVIEW);
    }
    /// Implement the OpenGL modelview and projection matrix stacks, along with some other useful GLU matrix functions.
    matrixMode(mode) {
        switch (mode) {
            case this.MODELVIEW:
                this.currentMatrixName = 'modelViewMatrix';
                //this.currentMatrix = this.modelViewMatrix
                this.stack = this.modelViewStack;
                break;
            case this.PROJECTION:
                this.currentMatrixName = 'projectionMatrix';
                //this.currentMatrix = this.projectionMatrix
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
    perspective(fovDegrees, aspect, near, far, result) {
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
            useTexture: !!LightGLContext.gl.getParameter(WGL$1.TEXTURE_BINDING_2D),
        }).drawBuffers(this.immediate.mesh.vertexBuffers, undefined, this.immediate.mode);
        this.immediate.mode = -1;
    }
    makeCurrent() {
        LightGLContext.gl = this;
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
        const update = (domHighResTimeStamp) => {
            const now = performance.now();
            callback.call(this, now, now - time$$1);
            time$$1 = now;
            keepUpdating && requestAnimationFrame(update);
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
        const gl = this;
        function windowOnResize() {
            gl.canvas.width = window.innerWidth - left - right;
            gl.canvas.height = window.innerHeight - top - bottom;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            if (options.camera) {
                gl.matrixMode(LightGLContext.PROJECTION);
                gl.loadIdentity();
                gl.perspective(options.fov || 45, gl.canvas.width / gl.canvas.height, options.near || 0.1, options.far || 1000);
                gl.matrixMode(LightGLContext.MODELVIEW);
            }
        }
        window.addEventListener('resize', windowOnResize);
        windowOnResize();
        return this;
    }
    viewportFill() {
        this.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    handleError() {
        // const errorCode = this.getError()
        // if (0 !== errorCode) {
        //     throw new Error('' + errorCode + WGL_ERROR[errorCode])
        // }
    }
    /**
     * `create()` creates a new WebGL context and augments it with more methods. The alpha channel is disabled
     * by default because it usually causes unintended transparencies in the canvas.
     */
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
            newGL = canvas.getContext('webgl', options);
            console.log('getting context');
        }
        catch (e) {
            console.log(e, newGL);
        }
        try {
            newGL = newGL || canvas.getContext('experimental-webgl', options);
        }
        catch (e) {
            console.log(e, newGL);
        }
        if (!newGL)
            throw new Error('WebGL not supported');
        LightGLContext.gl = newGL;
        addOwnProperties(newGL, LightGLContext.prototype);
        addOwnProperties(newGL, new LightGLContext(newGL));
        //addEventListeners(newGL)
        return newGL;
    }
}
LightGLContext.MODELVIEW = 0;
LightGLContext.PROJECTION = 1;
LightGLContext.HALF_FLOAT_OES = 0x8D61;
var WGL_ERROR;
(function (WGL_ERROR) {
    WGL_ERROR[WGL_ERROR["NO_ERROR"] = WGL$1.NO_ERROR] = "NO_ERROR";
    WGL_ERROR[WGL_ERROR["INVALID_ENUM"] = WGL$1.INVALID_ENUM] = "INVALID_ENUM";
    WGL_ERROR[WGL_ERROR["INVALID_VALUE"] = WGL$1.INVALID_VALUE] = "INVALID_VALUE";
    WGL_ERROR[WGL_ERROR["INVALID_OPERATION"] = WGL$1.INVALID_OPERATION] = "INVALID_OPERATION";
    WGL_ERROR[WGL_ERROR["INVALID_FRAMEBUFFER_OPERATION"] = WGL$1.INVALID_FRAMEBUFFER_OPERATION] = "INVALID_FRAMEBUFFER_OPERATION";
    WGL_ERROR[WGL_ERROR["OUT_OF_MEMORY"] = WGL$1.OUT_OF_MEMORY] = "OUT_OF_MEMORY";
    WGL_ERROR[WGL_ERROR["CONTEXT_LOST_WEBGL"] = WGL$1.CONTEXT_LOST_WEBGL] = "CONTEXT_LOST_WEBGL";
})(WGL_ERROR || (WGL_ERROR = {}));
LightGLContext.prototype.MODELVIEW = LightGLContext.MODELVIEW;
LightGLContext.prototype.PROJECTION = LightGLContext.PROJECTION;
LightGLContext.prototype.HALF_FLOAT_OES = LightGLContext.HALF_FLOAT_OES;
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
        this.spacing = 0;
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
     * @param type Either `WGL.STATIC_DRAW` or `WGL.DYNAMIC_DRAW`. Defaults to `WGL.STATIC_DRAW`
     */
    compile(type = WGL.STATIC_DRAW, gl = currentGL()) {
        assert(WGL.STATIC_DRAW == type || WGL.DYNAMIC_DRAW == type, 'WGL.STATIC_DRAW == type || WGL.DYNAMIC_DRAW == type');
        gl.handleError();
        this.buffer = this.buffer || gl.createBuffer();
        gl.handleError();
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
            assert(spacing !== 0);
            this.spacing = spacing;
            this.count = this.data.length;
        }
        gl.bindBuffer(this.target, this.buffer);
        gl.handleError();
        gl.bufferData(this.target, buffer, type);
        gl.handleError();
        this.hasBeenCompiled = true;
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
        this.texture = gl.createTexture();
        gl.handleError(); // in case createTexture returns null & fails
        this.width = width;
        this.height = height;
        this.format = options.format || gl.RGBA;
        this.type = options.type || gl.UNSIGNED_BYTE;
        const magFilter = options.filter || options.magFilter || gl.LINEAR;
        const minFilter = options.filter || options.minFilter || gl.LINEAR;
        if (this.type === gl.FLOAT) {
            if (!gl.getExtension('OES_texture_float')) {
                throw new Error('OES_texture_float is required but not supported');
            }
            if ((minFilter !== gl.NEAREST || magFilter !== gl.NEAREST) && !gl.getExtension('OES_texture_float_linear')) {
                throw new Error('OES_texture_float_linear is required but not supported');
            }
        }
        else if (this.type === LightGLContext.HALF_FLOAT_OES) {
            if (!gl.getExtension('OES_texture_half_float')) {
                throw new Error('OES_texture_half_float is required but not supported');
            }
            if ((minFilter !== gl.NEAREST || magFilter !== gl.NEAREST) && !gl.getExtension('OES_texture_half_float_linear')) {
                throw new Error('OES_texture_half_float_linear is required but not supported');
            }
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrap || options.wrapS || gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrap || options.wrapT || gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
    }
    bind(unit) {
        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }
    unbind(unit) {
        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
    canDrawTo() {
        const gl = this.gl;
        this.framebuffer = this.framebuffer || gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        const result = gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return result;
    }
    drawTo(callback) {
        const gl = this.gl;
        this.framebuffer = this.framebuffer || gl.createFramebuffer();
        this.renderbuffer = this.renderbuffer || gl.createRenderbuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
        if (this.width != this.renderbuffer.width || this.height != this.renderbuffer.height) {
            this.renderbuffer.width = this.width;
            this.renderbuffer.height = this.height;
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
        }
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderbuffer);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
            throw new Error('Rendering to this texture is not supported (incomplete this.framebuffer)');
        }
        const viewport = gl.getParameter(gl.VIEWPORT);
        gl.viewport(0, 0, this.width, this.height);
        callback(gl);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
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
    static fromImage(imgElement, options, gl = currentGL()) {
        options = options || {};
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
    static fromURL(url, options = {}, gl = currentGL()) {
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
        image.src = url;
        return texture;
    }
}

var colorFS = "uniform vec4 color;void main(){gl_FragColor=color;}";

var posVS = "void main(){gl_Position=LGL_ModelViewProjectionMatrix*LGL_Vertex;}";

var varyingColorFS = "varying vec4 color;void main(){gl_FragColor=color;}";

var vectorFieldVS = "const int NUM_PS=64;float q=0.01;uniform vec4 ps[NUM_PS];varying vec4 color;vec3 forceAtPos(vec3 coord){vec3 totalForce=vec3(0.0,0.0,0.0);for(int i=0;i<NUM_PS;i++){vec4 p=ps[i];float pCharge=p.w;vec3 coordToP=p.xyz-coord;float r=length(coordToP);float partialForceMagnitude=pCharge*q/r/r;vec3 partialForce=normalize(coordToP)*partialForceMagnitude;totalForce+=partialForce;}return totalForce;}void main(){vec4 pos=LGL_Vertex;vec3 fieldPos=pos.xyz;vec3 fieldForce=forceAtPos(fieldPos);color=vec4(1,0,0,1)*sqrt(length(fieldForce))/1.0;gl_Position=vec4(fieldPos*2.0+normalize(fieldForce)*pos.z+vec3(-1,-1,-1),1);}";

/// <reference path="types.d.ts" />
const { sin, PI } = Math;
/**
 * Draw a rotating cube.
 */
function setupDemo(gl) {
    return __awaiter(this, void 0, void 0, function* () {
        const mesh = Mesh.cube();
        const shader = new Shader(`
void main() {
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
}`, `
uniform vec4 color;
void main() {
    gl_FragColor = color;
}`);
        // setup camera
        gl.matrixMode(gl.PROJECTION);
        gl.loadIdentity();
        gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000);
        gl.lookAt(V(0, -2, 1.5), V3.O, V3.Z);
        gl.matrixMode(gl.MODELVIEW);
        gl.enable(gl.DEPTH_TEST);
        return gl.animate(function (abs, diff) {
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
/**
 * Blend two textures while rendering them to a quad.
 */
function multiTexture(gl) {
    const mesh = Mesh.plane();
    const texture = Texture.fromURL('texture.png');
    const texture2 = Texture.fromURL('texture2.png');
    const shader = new Shader(`
  varying vec2 coord;
  void main() {
    coord = LGL_TexCoord;
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
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
    return gl.animate(function (abs, diff) {
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
/**
 * Move camera using mouse.
 */
function camera(gl) {
    let yRot = -10 * DEG;
    let zRot = 90 * DEG;
    let camera = new V3(0, -5, 1);
    const mesh = Mesh.sphere().computeWireframeFromFlatTriangles().compile();
    const shader = new Shader(`
  varying vec3 normal;
  void main() {
    normal = LGL_Normal;
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
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
    return gl.animate(function (abs, diff) {
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
        shader.uniforms({ brightness: 1 }).draw(mesh, gl.TRIANGLES);
        shader.uniforms({ brightness: 0 }).draw(mesh, gl.LINES);
    });
}
/**
 * OpenGL-style immediate mode.
 */
function immediateMode(gl) {
    // setup camera
    gl.matrixMode(gl.PROJECTION);
    gl.loadIdentity();
    gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000);
    gl.lookAt(V(0, -2, 1.5), V3.O, V3.Z);
    gl.matrixMode(gl.MODELVIEW);
    gl.enable(gl.DEPTH_TEST);
    return gl.animate(function (abs, diff) {
        const angleDeg = abs / 1000 * 45;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.loadIdentity();
        gl.translate(0, 0, -5);
        gl.rotate(30, 1, 0, 0);
        gl.rotate(angleDeg, 0, 1, 0);
        gl.color(0.5, 0.5, 0.5);
        gl.lineWidth(1);
        gl.begin(gl.LINES);
        for (let i = -10; i <= 10; i++) {
            gl.vertex(i, 0, -10);
            gl.vertex(i, 0, +10);
            gl.vertex(-10, 0, i);
            gl.vertex(+10, 0, i);
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
        gl.color(1, 0, 0);
        gl.vertex(1, 0, 0);
        gl.color(0, 1, 0);
        gl.vertex(0, 1, 0);
        gl.color(0, 0, 1);
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
/**
 * Render mesh to texture, then render that texture to another mesh.
 */
function renderToTexture(gl) {
    return __awaiter(this, void 0, void 0, function* () {
        const mesh = Mesh.load(yield fetch('gazebo.json').then(response => response.json()));
        const sinVertices = arrayFromFunction(32, i => {
            const x = lerp(-PI, PI, i / 31);
            const y = sin(x);
            return new V3(x / 7.64, y / 7.64, 0);
        });
        const cyl = Mesh.offsetVertices(sinVertices, V3.Z, false);
        const plane = Mesh.plane();
        const texture = Texture.fromURL('texture.png');
        const overlay = new Texture(1024, 1024);
        const meshShader = new Shader(`
  varying vec3 normal;
  void main() {
    normal = LGL_Normal;
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
  varying vec3 normal;
  void main() {
    gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
  }
`);
        const planeShader = new Shader(`
  varying vec2 coord;
  void main() {
    coord = LGL_TexCoord.xy;
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
  uniform sampler2D texture;
  uniform sampler2D overlay;
  varying vec2 coord;
  void main() {
    gl_FragColor = (texture2D(overlay, coord) + texture2D(texture, coord)) / 2.0;
  }
`);
        gl.clearColor(1, 1, 1, 1);
        gl.enable(gl.DEPTH_TEST);
        return gl.animate(function (abs, diff) {
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
    });
}
/**
 * Draw shadow of a mesh using a shadow map.
 */
function shadowMap(gl) {
    return __awaiter(this, void 0, void 0, function* () {
        //const mesh = await fetch('dodecahedron.stl')
        //    .then(r => r.blob())
        //    .then(Mesh.fromBinarySTL)
        //    .then(mesh => mesh.translate(0,1,0).scale(5).compile())
        const mesh = Mesh.load(yield fetch('cessna.json').then(r => r.json()));
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
        const colorShader = new Shader(`
  void main() {
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
  uniform vec4 color;
  void main() {
    gl_FragColor = color;
  }
`);
        const depthShader = new Shader(`
  varying vec4 pos;
  void main() {
    gl_Position = pos = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
  varying vec4 pos;
  void main() {
    float depth = pos.z / pos.w;
    gl_FragColor = vec4(depth * 0.5 + 0.5);
  }
`);
        const displayShader = new Shader(`
  uniform mat4 shadowMapMatrix;
  uniform vec3 light;
  varying vec4 coord;
  varying vec3 normal;
  varying vec3 toLight;
  void main() {
    toLight = light - (LGL_ModelViewMatrix * LGL_Vertex).xyz;
    normal = LGL_NormalMatrix * LGL_Normal;
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
    coord = shadowMapMatrix * gl_Position;
  }
`, `
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
        const textureShader = new Shader(`
  varying vec2 coord;
  void main() {
    coord = LGL_TexCoord;
    gl_Position = vec4(coord * 2.0 - 1.0, 0.0, 1.0);
  }
`, `
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
        gl.canvas.onkeydown = function (e) {
            useBoundingSphere = !useBoundingSphere;
        };
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
        return gl.animate(function (abs, diff) {
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
    });
}
//function rayTracing() {
//
//
//    let angleX = 30
//    let angleY = 10
//    const gl = LightGLContext.create()
//    const mesh = Mesh.plane()
//    const shader = new Shader(`
//  uniform vec3 ray00;
//  uniform vec3 ray10;
//  uniform vec3 ray01;
//  uniform vec3 ray11;
//  varying vec3 initialRay;
//
//  void main() {
//    vec2 t = LGL_Vertex.xy * 0.5 + 0.5;
//    initialRay = mix(mix(ray00, ray10, t.x), mix(ray01, ray11, t.x), t.y);
//    gl_Position = LGL_Vertex;
//  }
//`, `
//  const float INFINITY = 1.0e9;
//  uniform vec3 eye;
//  varying vec3 initialRay;
//
//  float intersectSphere(vec3 origin, vec3 ray, vec3 sphereCenter, float sphereRadius) {
//    vec3 toSphere = origin - sphereCenter;
//    float a = dot(ray, ray);
//    float b = 2.0 * dot(toSphere, ray);
//    float c = dot(toSphere, toSphere) - sphereRadius * sphereRadius;
//    float discriminant = b * b - 4.0 * a * c;
//    if (discriminant > 0.0) {
//      float t = (-b - sqrt(discriminant)) / (2.0 * a);
//      if (t > 0.0) return t;
//    }
//    return INFINITY;
//  }
//
//  void main() {
//    vec3 origin = eye, ray = initialRay, color = vec3(0.0), mask = vec3(1.0);
//    vec3 sphereCenter = vec3(0.0, 1.6, 0.0);
//    float sphereRadius = 1.5;
//
//    for (int bounce = 0; bounce < 2; bounce++) {
//      /* Find the closest intersection with the scene */
//      float planeT = -origin.y / ray.y;
//      vec3 hit = origin + ray * planeT;
//      if (planeT < 0.0 || abs(hit.x) > 4.0 || abs(hit.z) > 4.0) planeT = INFINITY;
//      float sphereT = intersectSphere(origin, ray, sphereCenter, sphereRadius);
//      float t = min(planeT, sphereT);
//
//      /* The background is white */
//      if (t == INFINITY) {
//        color += mask;
//        break;
//      }
//
//      /* Calculate the intersection */
//      hit = origin + ray * t;
//      if (t == planeT) {
//        /* Look up the checkerboard color */
//        vec3 c = fract(hit * 0.5) - 0.5;
//        float checkerboard = c.x * c.z > 0.0 ? 1.0 : 0.0;
//        color += vec3(1.0, checkerboard, 0.0) * mask;
//        break;
//      } else {
//        /* Get the sphere color and reflect a new ray for the next iteration */
//        vec3 normal = (hit - sphereCenter) / sphereRadius;
//        ray = reflect(ray, normal);
//        origin = hit;
//        mask *= 0.8 * (0.5 + 0.5 * max(0.0, normal.y));
//      }
//    }
//
//    gl_FragColor = vec4(color, 1.0);
//  }
//`)
//
//
//    let lastPos = V3.O
//    // scene rotation
//    gl.canvas.onmousemove = function(e) {
//        const pagePos = V(e.pageX, e.pageY)
//        const delta = lastPos.to(pagePos)
//        if (e.buttons & 1) {
//            angleY += delta.x
//            angleX = clamp(angleX + delta.y, -90, 90)
//        }
//        lastPos = pagePos
//    }
//
//    return gl.animate(function(abs, diff) {
//        // Camera setup
//        gl.loadIdentity()
//        gl.translate(0, 0, -10)
//        gl.rotate(angleX, 1, 0, 0)
//        gl.rotate(angleY, 0, 1, 0)
//
//        // Get corner rays
//        const w = gl.canvas.width
//        const h = gl.canvas.height
//        const tracer = new Raytracer()
//        shader.uniforms({
//            eye: tracer.eye,
//            ray00: tracer.getRayForPixel(0, h),
//            ray10: tracer.getRayForPixel(w, h),
//            ray01: tracer.getRayForPixel(0, 0),
//            ray11: tracer.getRayForPixel(w, 0)
//        })
//
//        // Trace the rays
//        shader.draw(mesh)
//
//        // Draw debug output to show that the raytraced scene lines up correctly with
//        // the rasterized scene
//        gl.color(0, 0, 0, 0.5)
//        gl.enable(gl.BLEND)
//        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
//        gl.begin(gl.LINES)
//        for (let s = 4, i = -s; i <= s; i++) {
//            gl.vertex(-s, 0, i)
//            gl.vertex(s, 0, i)
//            gl.vertex(i, 0, -s)
//            gl.vertex(i, 0, s)
//        }
//        gl.end()
//        gl.disable(gl.BLEND)
//    })
//
//}
/**
 * Draw soft shadows by calculating a light map in multiple passes.
 */
function gpuLightMap(gl) {
    return __awaiter(this, void 0, void 0, function* () {
        // modified version of https://evanw.github.io/lightgl.js/tests/gpulightmap.html
        const gazebo = Mesh.load(yield fetch('gazebo.json').then(response => response.json()));
        let angleX = 0;
        let angleY = 0;
        if (!gl.getExtension('OES_texture_float') || !gl.getExtension('OES_texture_float_linear')) {
            document.write('This demo requires the OES_texture_float and OES_texture_float_linear extensions to run');
            throw new Error('not supported');
        }
        const texturePlane = Mesh.plane();
        const textureShader = new Shader(`
  varying vec2 coord;
  void main() {
    coord = LGL_TexCoord;
    gl_Position = vec4(coord * 2.0 - 1.0, 0.0, 1.0);
  }
`, `
  uniform sampler2D texture;
  varying vec2 coord;
  void main() {
    gl_FragColor = texture2D(texture, coord);
  }
`);
        const texture = Texture.fromURL('texture.png');
        const depthMap = new Texture(1024, 1024, { format: gl.RGBA });
        const depthShader = new Shader(`
  varying vec4 pos;
  void main() {
    gl_Position = pos = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
  varying vec4 pos;
  void main() {
    float depth = pos.z / pos.w;
    gl_FragColor = vec4(depth * 0.5 + 0.5);
  }
`);
        const shadowTestShader = new Shader(`
  uniform mat4 shadowMapMatrix;
  uniform vec3 light;
  attribute vec4 offsetPosition;
  varying vec4 shadowMapPos; // position inside the shadow map frustrum
  varying vec3 normal;

  void main() {
    normal = LGL_Normal;
    shadowMapPos = shadowMapMatrix * offsetPosition;
    gl_Position = vec4(LGL_TexCoord * 2.0 - 1.0, 0.0, 1.0);
  }
`, `
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
                    .addVertexBuffer('normals', 'LGL_Normal')
                    .addIndexBuffer('TRIANGLES')
                    .addVertexBuffer('coords', 'LGL_TexCoord')
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
                this.lightmapTexture = new Texture(textureSize, textureSize, { format: gl.RGBA, type: gl.FLOAT, filter: gl.LINEAR });
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
            // quadMesh.addDoubleQuad(
            //     center.minus(a).minus(b),
            //     center.minus(a).plus(b),
            //     center.plus(a).minus(b),
            //     center.plus(a).plus(b)
            // )
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
        const textureMapShader = new Shader(`
        attribute vec2 offsetCoord;
        varying vec2 coord;
        void main() {
            coord = offsetCoord;
            gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
        }
`, `
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
        return gl.animate(function (abs, diff) {
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
/**
 * Calculate and render magnetic field lines.
 */
function mag(gl) {
    return __awaiter(this, void 0, void 0, function* () {
        const cubeMesh = Mesh.cube();
        const cubeShader = new Shader(posVS, colorFS);
        const vectorFieldShader = new Shader(vectorFieldVS, varyingColorFS);
        gl.clearColor(1, 1, 1, 1);
        const vec4 = (...args) => [...args];
        const ps = [];
        // ps.push(
        //     vec4(0.2, 0.5, 0, 1),
        //     vec4(0.2, 0.8, 0, 1),
        //     vec4(0.8, 0.5, 0, -1),
        // )
        const q = 0.01;
        function forceAtPos(coord) {
            let totalForce = V3.O;
            ps.forEach(p => {
                const pCharge = p[3];
                const coordToP = new V3(p[0], p[1], p[2]).minus(coord);
                const r = coordToP.length();
                const partialForceMagnitude = pCharge * q / r / r;
                const partialForce = coordToP.toLength(partialForceMagnitude);
                totalForce = totalForce.plus(partialForce);
            });
            return totalForce;
        }
        const bounds = new AABB(V3.O, V(1, 1, 0.3));
        function* qPath(start, dir) {
            let pos = start, f, i = 0;
            while (true) {
                f = forceAtPos(pos);
                pos = pos.plus(f.toLength(dir));
                if (!(f.squared() / q < 2.5e5 && i++ < 1000 && bounds.containsPoint(pos)))
                    break;
                yield pos;
            }
        }
        function barMagnet(count = 4) {
            return arrayFromFunction(count * count, i => {
                const x = i % count;
                const y = (i / count) | 0;
                return vec4((0.5 + x) / count, (0.5 + y) / count, 0, (+(x < count / 2) || -1));
            });
        }
        const barMats = [
            M4.multiplyMultiple(M4.translate(0.5, 0.5, 0.1), M4.rotateZ(20 * DEG), M4.scale(0.2, 0.1, 0.02)),
            M4.multiplyMultiple(M4.translate(0.2, 0.1), M4.rotateZ(60 * DEG), M4.scale(0.1, 0.05, 0.02)),
            M4.multiplyMultiple(M4.translate(0.2, 0.8), M4.rotateZ(120 * DEG), M4.rotateY(-100 * DEG), M4.scale(0.2, 0.02, 0.02)),
        ];
        barMats.forEach(mat => ps.push(...(barMagnet(6).map(([x, y, z, c]) => {
            const pos = mat.transformPoint(new V3(x, y, z));
            return [...pos, c];
        }))));
        const linesMesh = new Mesh().addIndexBuffer('LINES');
        console.log('generation took (ms): ' + time(() => {
            for (const [x, y, z] of grid3d(10, 10, 4)) {
                const start = V(x, y, z * bounds.max.z);
                linesMesh.vertices.push(start);
                const STEP = 0.01;
                for (const p of qPath(start, STEP)) {
                    linesMesh.vertices.push(p);
                    linesMesh.LINES.push(linesMesh.vertices.length - 2, linesMesh.vertices.length - 1);
                }
                linesMesh.vertices.push(start);
                for (const p of qPath(start, -STEP)) {
                    linesMesh.vertices.push(p);
                    linesMesh.LINES.push(linesMesh.vertices.length - 2, linesMesh.vertices.length - 1);
                }
            }
        }));
        linesMesh.compile();
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
        gl.perspective(60, gl.canvas.width / gl.canvas.height, 0.1, 1000);
        gl.lookAt(V(0.5, 2, 1), V(0.5, 0.5), V3.Z);
        gl.matrixMode(gl.MODELVIEW);
        gl.clearColor(...chroma('black').gl());
        gl.enable(gl.DEPTH_TEST);
        vectorFieldShader.uniforms({
            'ps[0]': ps,
            color: chroma('red').gl(),
        });
        return gl.animate(function (abs, diff) {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.loadIdentity();
            gl.multMatrix(M4.rotateLine(V(0.5, 0.5), V3.Z, abs / 5000));
            // gl.translate(-1, -1, -1)
            // gl.scale(2)
            cubeShader.uniforms({ color: chroma('white').gl() }).draw(linesMesh, DRAW_MODES.LINES);
            barMats.forEach(mat => {
                gl.pushMatrix();
                gl.multMatrix(mat);
                gl.scale(0.5, 1, 1);
                cubeShader.uniforms({ color: chroma('red').gl() }).draw(cubeMesh, DRAW_MODES.LINES);
                gl.translate(1, 0);
                cubeShader.uniforms({ color: chroma('blue').gl() }).draw(cubeMesh, DRAW_MODES.LINES);
                gl.popMatrix();
            });
            gl.scale(bounds.max);
            cubeShader.uniforms({ color: chroma('grey').gl() }).draw(cubeMesh, DRAW_MODES.LINES);
            // vectorFieldShader.drawBuffers(vectorFieldMesh.vertexBuffers, undefined, DRAW_MODES.LINES)
        });
    });
}

exports.LightGLContext = LightGLContext;
exports.setupDemo = setupDemo;
exports.multiTexture = multiTexture;
exports.camera = camera;
exports.immediateMode = immediateMode;
exports.renderToTexture = renderToTexture;
exports.shadowMap = shadowMap;
exports.gpuLightMap = gpuLightMap;
exports.mag = mag;

return exports;

}({},chroma));
//# sourceMappingURL=demo.js.map
