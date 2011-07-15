// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var common = require('../common');
var assert = require('assert');

// async_func(callback) should exercise an async pathway
// that arranges for callback to be called after returning.
function testCatcher(name, async_func, done) {
  console.log(name + ':');
  process.exceptionCatcher = function (e) {
    console.log(name + ': caught');
    assert.equal(name, e.message);
    process.exceptionCatcher = null;
    done();
  };
  async_func(function () {
      // This should be called after testCatcher returns.
      console.log(name + ': throwing');
      throw new Error(name);
  });
  // This tests that exceptionCatcher is indeed
  // restored by the caller of callback.
  process.exceptionCatcher = undefined;
}

var async_funcs = {
  'nextTick': function (callback) {
    process.nextTick(callback);
  },
  'setTimeout': function (callback) {
    setTimeout(callback, 10);
  },
  'setInterval': function (callback) {
    var timer = setInterval(function () {
      clearInterval(timer);
      callback();
    }, 10);
  },
};
var names = Object.keys(async_funcs);

function run(i, done) {
  var name = names[i];
  testCatcher(names[i], async_funcs[names[i]], function () {
    i++;
    if (i < names.length) {
      run(i, done);
    } else {
      done();
    }
  });
}

var all_passed;

run(0, function () {
  console.log('done');
  all_passed = true;
});

process.addListener('exit', function () {
  console.log('exit');
  assert.equal(true, all_passed);
});
