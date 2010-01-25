process.mixin(require("./common"));

var caught = {};

var expected = {
 "uncaughtException": {
  "main": 1,
  "catcher2": 1
 },
 "catcher1": {
  "timeout1": 1
 },
 "catcher2": {
  "timeout2": 1
 }
};

var oldCatcher = process.exceptionCatcher;

function rememberCaught(catcher, message)
{
	puts(catcher + ' caught: ' + message);
	if (!caught[catcher]) {
		caught[catcher] = {};
	}
	if (!caught[catcher][message]) {
		caught[catcher][message] = 0;
	}
	caught[catcher][message]++;
}

process.exceptionCatcher = function (e) {
	rememberCaught('catcher1', e.message);
}

setTimeout(function () {
        throw new Error('timeout1');
}, 1);

process.exceptionCatcher = function (e) {
	rememberCaught('catcher2', e.message);
        throw new Error('catcher2');
}

setTimeout(function () {
        throw new Error('timeout2');
}, 2);

process.exceptionCatcher = oldCatcher;

var uncaughtExceptionHandler = function (e) {
	rememberCaught('uncaughtException', e.message);
};

process.addListener('uncaughtException', uncaughtExceptionHandler);

process.addListener("exit", function () {
	// Avoid hiding any exceptions raised by assertions
	process.removeListener('uncaughtException', uncaughtExceptionHandler);
	process.exceptionCatcher = undefined;

	assert.deepEqual(caught, expected);

	puts('exit');
});

throw new Error('main');

