process.mixin(require("./common"));

var ee = new process.EventEmitter;

function a () {}
function b () {}

ee.addListener('foo', a);
ee.addListener('foo', b);

assert.deepEqual([a, b], ee.listeners('foo'));

ee.removeListener('foo', a);

assert.deepEqual([b], ee.listeners('foo'));
puts('exit');
