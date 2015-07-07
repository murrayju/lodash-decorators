'use strict';

import forOwn from 'lodash/object/forOwn';
import isFunction from 'lodash/lang/isFunction';
import partial from 'lodash/function/partial';

import CompositeKeyWeakMap from './utils/CompositeKeyWeakMap';
import copyMetaData from './utils/copyMetaData';
import Applicator from './Applicator';

const { applicators } = Applicator;

export function createDecorator(method, applicator = applicators.pre) {
  const getterSetterMap = new CompositeKeyWeakMap();

  return applicator === applicators.single ? wrapper() : wrapper;

  function wrapper(...args) {
    return function decorator(target, name, descriptor) {
      const { value, get, set } = descriptor;

      if (get && !getterSetterMap.has([target, name, 'get'])) {
        descriptor.get = Applicator.invoke(applicator, method, target, get, ...args);
        copyMetaData(descriptor.get, get);
        getterSetterMap.set([target, name, 'get'], descriptor.get);

      } else if (set && !getterSetterMap.has([target, name, 'set'])) {
        descriptor.set = Applicator.invoke(applicator, method, target, set, ...args);
        copyMetaData(descriptor.set, set);
        getterSetterMap.set([target, name, 'set'], descriptor.set);

      } else if (value) {
        descriptor.value = Applicator.invoke(applicator, method, target, value, ...args);
        copyMetaData(descriptor.value, value);
      }

      return descriptor;
    };
  }
}

export function createInstanceDecorator(method, applicator = applicators.pre) {
  const objectMap = new CompositeKeyWeakMap();
  const getterSetterMap = new CompositeKeyWeakMap();

  return applicator === applicators.single ? wrapper() : wrapper;

  function wrapper(...args) {
    return function decorator(target, name, descriptor) {
      const { value, get, set } = descriptor;

      if (get && !getterSetterMap.has([target, name, 'get'])) {
        descriptor.get = copyMetaData(partial(instanceDecoratorWrapper, get), get);
        getterSetterMap.set([target, name, 'get'], descriptor.get);

      } else if (set && !getterSetterMap.has([target, name, 'set'])) {
        descriptor.set = copyMetaData(partial(instanceDecoratorWrapper, set), set);
        getterSetterMap.set([target, name, 'set'], descriptor.set);

      } else if (value) {
        descriptor.value = copyMetaData(partial(instanceDecoratorWrapper, value), value);
      }

      return descriptor;

      function instanceDecoratorWrapper(toWrap, ...methodArgs) {
        if (!objectMap.has([this, toWrap])) {
          objectMap.set([this, toWrap], Applicator.invoke(applicator, method, this, toWrap, ...args));
        }

        const fn = objectMap.get([this, toWrap]);

        return fn.apply(this, methodArgs);
      }
    };
  }
}
