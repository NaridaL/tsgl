try {
	;(global as any).WebGLRenderingContext = {}
} catch (e) {}

import assert from 'assert'
import { V } from 'ts3dutils'
import { Mesh } from '..'

describe('Mesh', () => {
	it('concat', () => {
		const a = new Mesh().addIndexBuffer('TRIANGLES')
		a.vertices.push(V(0, 0, 0), V(0, 1, 0), V(0, 1, 0))
		a.TRIANGLES.push(0, 1, 2)
		const b = new Mesh().addIndexBuffer('TRIANGLES')
		b.vertices.push(V(0, 0, 1), V(0, 1, 1), V(0, 1, 1))
		b.TRIANGLES.push(0, 1, 2)

		const c = new Mesh().addIndexBuffer('TRIANGLES').concat(a, b, a)
		assert.deepEqual(c.TRIANGLES, [0, 1, 2, 3, 4, 5, 6, 7, 8])
		assert.deepEqual(c.vertices, [
			V(0, 0, 0),
			V(0, 1, 0),
			V(0, 1, 0),
			V(0, 0, 1),
			V(0, 1, 1),
			V(0, 1, 1),
			V(0, 0, 0),
			V(0, 1, 0),
			V(0, 1, 0),
		])
	})
})
