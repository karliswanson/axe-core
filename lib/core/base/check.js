/*global CheckResult */

function createExecutionContext(spec) {
	/*jshint evil:true */
	'use strict';
	if (typeof spec === 'string') {
		return new Function('return ' + spec + ';')();
	}
	return spec;
}

function Check(spec) {
	'use strict';

	/**
	 * Unique ID for the check.  Checks may be re-used, so there may be additional instances of checks
	 * with the same ID.
	 * @type {String}
	 */
	this.id = spec.id;

	/**
	 * Free-form options that are passed as the second parameter to the `evaluate`
	 * @type {Mixed}
	 */
	this.options = spec.options;

	/**
	 * Optional. If specified, only nodes that match this CSS selector are tested
	 * @type {String}
	 */
	this.selector = spec.selector;

	/**
	 * The actual code, accepts 2 parameters: node (the node under test), options (see this.options).
	 * This function is run in the context of a checkHelper, which has the following methods
	 * - `async()` - if called, the check is considered to be asynchronous; returns a callback function
	 * - `data()` - free-form data object, associated to the `CheckResult` which is specific to each node
	 * @type {Function}
	 */
	this.evaluate = createExecutionContext(spec.evaluate);

	/**
	 * Optional. Filter and/or modify checks for all nodes
	 * @type {Function}
	 */
	if (spec.after) {
		this.after = createExecutionContext(spec.after);
	}

	if (spec.matches) {
		/**
		 * Optional function to test if check should be run against a node, overrides Check#matches
		 * @type {Function}
		 */
		this.matches = createExecutionContext(spec.matches);
	}

	/**
	 * enabled by default, if false, this check will not be included in the rule's evaluation
	 * @type {Boolean}
	 */
	this.enabled = spec.hasOwnProperty('enabled') ? spec.enabled : true;
}

/**
 * Determines whether the check should be run against a node
 * @param  {HTMLElement} node The node to test
 * @return {Boolean}      Whether the check should be run
 */
Check.prototype.matches = function (node) {
	'use strict';

	if (!this.selector || axe.utils.matchesSelector(node, this.selector)) {
		return true;
	}

	return false;
};

/**
 * Run the check's evaluate function (call `this.evaluate(node, options)`)
 * @param  {HTMLElement} node  The node to test
 * @param  {Object} options    The options that override the defaults and provide additional
 *                             information for the check
 * @param  {Function} callback Function to fire when check is complete
 */
Check.prototype.run = function (node, options, resolve, reject) {
	'use strict';
	options = options || {};
	var enabled = options.hasOwnProperty('enabled') ? options.enabled : this.enabled,
		checkOptions = options.options || this.options;

	if (enabled && this.matches(node)) {
		var checkResult = new CheckResult(this);
		var checkHelper = axe.utils.checkHelper(checkResult, resolve, reject);
		var result;

		try {
			result = this.evaluate.call(checkHelper, node, checkOptions);
		} catch (e) {
			reject(e);
			return;
		}

		if (!checkHelper.isAsync) {
			checkResult.result = result;
			setTimeout(function () {
				resolve(checkResult);
			}, 0);
		}
	} else {
		resolve(null);
	}
};

/**
 * Override a check's settings after construction to allow for changing options
 * without having to implement the entire check
 *
 * @param {Object} spec - the specification of the attributes to be changed
 */

Check.prototype.configure = function (spec) {
	/*jshint maxstatements:18 */
	/*jshint evil:true */
	'use strict';

	if (spec.hasOwnProperty('options')) {
		this.options = spec.options;
	}

	if (spec.hasOwnProperty('selector')) {
		this.selector = spec.selector;
	}

	if (spec.hasOwnProperty('evaluate')) {
		if (typeof spec.evaluate === 'string') {
			this.evaluate = new Function('return ' + spec.evaluate + ';')();
		} else {
			this.evaluate = spec.evaluate;
		}
	}

	if (spec.hasOwnProperty('after')) {
		if (typeof spec.after === 'string') {
			this.after = new Function('return ' + spec.after + ';')();
		} else {
			this.after = spec.after;
		}
	}

	if (spec.hasOwnProperty('matches')) {
		if (typeof spec.matches === 'string') {
			this.matches = new Function('return ' + spec.matches + ';')();
		} else {
			this.matches = spec.matches;
		}
	}

	if (spec.hasOwnProperty('enabled')) {
		this.enabled = spec.enabled;
	}

};

