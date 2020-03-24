/**
 * @license
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import {ENGINE} from '../engine';
import {Tensor} from '../tensor';
import {convertToTensor} from '../tensor_util_env';
import {TensorLike} from '../types';
import * as util from '../util';

import * as axis_util from './axis_util';
import {op} from './operation';
import {gradForMinAndMax} from './reduction_ops';

/**
 * Computes the maximum of elements across dimensions of a `tf.Tensor`.
 *
 * Reduces the input along the dimensions given in `axes`. Unless `keepDims`
 * is true, the rank of the `tf.Tensor` is reduced by 1 for each entry in
 * `axes`. If `keepDims` is true, the reduced dimensions are retained with
 * length 1. If `axes` has no entries, all dimensions are reduced, and an
 * `tf.Tensor` with a single element is returned.
 *
 * ```js
 * const x = tf.tensor1d([1, 2, 3]);
 *
 * x.max().print();  // or tf.max(x)
 * ```
 *
 * ```js
 * const x = tf.tensor2d([1, 2, 3, 4], [2, 2]);
 *
 * const axis = 1;
 * x.max(axis).print();  // or tf.max(x, axis)
 * ```
 *
 * @param x The input tensor.
 * @param axis The dimension(s) to reduce. By default it reduces
 *     all dimensions.
 * @param keepDims If true, retains reduced dimensions with size 1.
 */
/** @doc {heading: 'Operations', subheading: 'Reduction'} */
function max_<T extends Tensor>(
    x: Tensor|TensorLike, axis: number|number[] = null, keepDims = false): T {
  let $x = convertToTensor(x, 'x', 'max');
  const xOrig = $x;

  const origAxes = util.parseAxisParam(axis, $x.shape);
  let axes = origAxes;
  const permutedAxes = axis_util.getAxesPermutation(axes, $x.rank);
  if (permutedAxes != null) {
    $x = $x.transpose(permutedAxes);
    axes = axis_util.getInnerMostAxes(axes.length, $x.rank);
  }

  const grad = (dy: T, saved: Tensor[]) =>
      gradForMinAndMax(dy, saved[1], saved[0], origAxes, permutedAxes);

  const inputsToSave = [xOrig];
  const outputsToSave: boolean[] = [true];
  let res = ENGINE.runKernelFunc((backend, save) => {
    const y = backend.max($x, axes);
    save([xOrig, y]);
    return y;
  }, {x: $x}, grad, 'Max', {axes}, inputsToSave, outputsToSave);
  if (keepDims) {
    const newShape = axis_util.expandShapeToKeepDim(res.shape, origAxes);
    res = res.reshape(newShape) as T;
  }
  return res as T;
}

export const max = op({max_});
