(async function() {
  'use strict';
  var CLK, Dialog_error, Dialog_failure, Dulicate_ref_error, Duplicate_ref_failure, GUY, Interactive_dialog, Misstep_failure, Overrun_error, Overrun_failure, PATH, Programmatic_dialog, Underrun_failure, alert, bold, debug, demo_run_interactive, demo_run_programmatic, echo, help, info, inspect, log, mark, plain, praise, reverse, rpr, sample_dialog, urge, warn, whisper;

  //===========================================================================================================
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('diatribe'));

  ({rpr, inspect, echo, reverse, bold, log} = GUY.trm);

  //...........................................................................................................
  CLK = require('@clack/prompts');

  PATH = require('node:path');

  mark = function(ref) {
    return urge(reverse(bold(` ${ref} `)));
  };

  //===========================================================================================================
  /* TAINT Later to be extended so we pass in parameters, not messages */
  Dialog_error = class Dialog_error extends Error {};

  Overrun_error = class Overrun_error extends Dialog_error {};

  Dulicate_ref_error = class Dulicate_ref_error extends Dialog_error {};

  //===========================================================================================================
  /* TAINT Later to be extended so we pass in parameters, not messages */
  Dialog_failure = class Dialog_failure {
    constructor(message1) {
      this.message = message1;
      void 0;
    }

  };

  Misstep_failure = class Misstep_failure extends Dialog_failure {};

  Underrun_failure = class Underrun_failure extends Dialog_failure {};

  Overrun_failure = class Overrun_failure extends Dialog_failure {};

  Duplicate_ref_failure = class Duplicate_ref_failure extends Dialog_failure {};

  //===========================================================================================================
  Interactive_dialog = class Interactive_dialog {
    //---------------------------------------------------------------------------------------------------------
    ctrlc(value) {
      // debug 'Ω___3', rpr value
      if (CLK.isCancel(value)) {
        CLK.cancel("Operation cancelled.");
        this.process_exit(0);
      }
      return value;
    }

    //---------------------------------------------------------------------------------------------------------
    async intro(cfg) {
      return this.ctrlc((await CLK.intro(cfg)));
    }

    async outro(cfg) {
      return this.ctrlc((await CLK.outro(cfg)));
    }

    async confirm(cfg) {
      return this.ctrlc((await CLK.confirm(cfg)));
    }

    async text(cfg) {
      return this.ctrlc((await CLK.text(cfg)));
    }

    async select(cfg) {
      return this.ctrlc((await CLK.select(cfg)));
    }

    async multiselect(cfg) {
      return this.ctrlc((await CLK.multiselect(cfg)));
    }

    get_spinner(cfg) {
      return CLK.spinner();
    }

    finish() {
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    process_exit(code = 0) {
      return process.exit(code);
    }

  };

  //===========================================================================================================
  Programmatic_dialog = class Programmatic_dialog {
    //---------------------------------------------------------------------------------------------------------
    constructor(steps) {
      this.cfg = Object.freeze({
        unique_refs: true
      });
      this./* TAINT make configurable */_exp_steps = steps;
      this._exp_keys = Object.keys(this._exp_steps);
      this._pc = -1;
      this._act_steps = {};
      this.results = {};
      //.......................................................................................................
      GUY.props.def(this, '_failures', {
        enumerable: false,
        configurable: false,
        get: function() {
          var d, i, len, ref1, results;
          ref1 = this._act_steps;
          results = [];
          for (i = 0, len = ref1.length; i < len; i++) {
            d = ref1[i];
            if (d instanceof Dialog_failure) {
              results.push(d);
            }
          }
          return results;
        }
      });
      //.......................................................................................................
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    _next(ref) {
      var R, key, message, ref1, ref2;
      this._pc++;
      if (((key = (ref1 = this._exp_keys[this._pc]) != null ? ref1 : null) == null) || ((R = (ref2 = this._exp_steps[key]) != null ? ref2 : null) == null)) {
        message = `emergency halt, running too long: act ${this._count_act_steps()} exp ${this._exp_keys.length}`;
        this._fail(ref, new Overrun_failure(message));
        throw new Overrun_error(message);
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _fail(ref, failure) {
      this._act_steps[ref] = failure;
      this._failures.push(failure);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    async _step(act_key, cfg) {
      var exp_key, message, ref, ref1, value;
      ref = (ref1 = cfg != null ? cfg.ref : void 0) != null ? ref1 : `$q${this._pc + 2}`;
      //.......................................................................................................
      if (this.cfg.unique_refs && Reflect.has(this.results, ref)) {
        message = `duplicate ref: ${ref}`;
        this._fail(ref, new Duplicate_ref_failure(message));
        throw new Dulicate_ref_error(message);
      }
      //.......................................................................................................
      [exp_key, value] = this._next(ref);
      this.results[ref] = value;
      //.......................................................................................................
      if (act_key === exp_key) {
        this._act_steps[ref] = act_key;
      } else {
        this._act_steps[ref] = new Misstep_failure(`step#${this._pc}: act ${rpr(act_key)}, exp ${rpr(exp_key)}`);
      }
      return (await GUY.async.defer(function() {
        return value;
      }));
    }

    //---------------------------------------------------------------------------------------------------------
    _count_act_steps() {
      return this._pc + 1;
    }

    _is_finished() {
      return this._count_act_steps() === this._exp_keys.length;
    }

    // _is_underrun:     -> @_count_act_steps() <  @_exp_keys.length
    _is_overrun() {
      return this._count_act_steps() > this._exp_keys.length;
    }

    //---------------------------------------------------------------------------------------------------------
    finish(...P) {
      if (this._is_finished() || this._is_overrun()) {
        //### `dlg.finish()` should be called after the simulated dialog has ben run to issue an  ####
        return true;
      }
      this._fail('$finish', new Underrun_failure(`finished too early: act ${this._count_act_steps()} exp ${this._exp_keys.length}`));
      return false;
    }

    //---------------------------------------------------------------------------------------------------------
    intro(cfg) {
      return null;
    }

    outro(cfg) {
      return null;
    }

    async confirm(cfg) {
      return (await this._step('confirm', cfg));
    }

    async text(cfg) {
      return (await this._step('text', cfg));
    }

    async select(cfg) {
      return (await this._step('select', cfg));
    }

    async multiselect(cfg) {
      return (await this._step('multiselect', cfg));
    }

    get_spinner() {
      return {
        start: (function() {}),
        stop: (function() {})
      };
    }

    //---------------------------------------------------------------------------------------------------------
    process_exit(code) {
      // not really exiting the process
      return code;
    }

  };

  //===========================================================================================================
  sample_dialog = async function(dlg = null) {
    var value;
    if (dlg == null) {
      dlg = new Interactive_dialog();
    }
    //.........................................................................................................
    dlg.intro("create-my-app");
    while (true) {
      //.........................................................................................................
      if (value = (await dlg.confirm({
        ref: 'q1',
        message: "do you want to loop?"
      }))) {
        debug('Ω___5', rpr(value));
        continue;
      }
      break;
    }
    await dlg.text({
      ref: 'q2',
      message: "please enter text"
    });
    await (async() => {      //.........................................................................................................
      var cfg, project_type;
      cfg = {
        ref: 'q3',
        message: "Pick a project type.",
        options: [
          {
            value: 'ts',
            label: 'TypeScript'
          },
          {
            value: 'js',
            label: 'JavaScript'
          },
          {
            value: 'coffee',
            label: 'CoffeeScript',
            hint: 'yes!'
          }
        ]
      };
      project_type = (await dlg.select(cfg));
      return null;
    })();
    await (async() => {      //.........................................................................................................
      var cfg, spinner, tools;
      spinner = dlg.get_spinner();
      spinner.start("asking questions");
      cfg = {
        ref: null, // intentionally left out
        message: "Select additional tools.",
        options: [
          {
            value: 'eslint',
            label: 'ESLint',
            hint: 'recommended'
          },
          {
            value: 'prettier',
            label: 'Prettier'
          },
          {
            value: 'gh-action',
            label: 'GitHub Action'
          }
        ],
        required: false
      };
      tools = (await dlg.multiselect(cfg));
      spinner.stop("thanks!");
      return null;
    })();
    //.........................................................................................................
    dlg.outro("You're all set!");
    //.........................................................................................................
    return dlg.results;
  };

  //===========================================================================================================
  demo_run_interactive = async function() {
    await sample_dialog(); // or `sample_dialog new Interactive_dialog()`
    return null;
  };

  //-----------------------------------------------------------------------------------------------------------
  demo_run_programmatic = async function() {
    var dlg, error, ref, ref1, step, steps;
    // steps = [
    //   # [ 'confirm',  true, ]

    //   # [ 'outro', ]
    //   ]
    steps = {
      q1: ['confirm', false],
      q2: ['text', "helo"],
      q3: ['select', 'coffee'],
      $q4: ['multiselect', ['prettier']],
      whatever: ['select', 'js']
    };
    dlg = new Programmatic_dialog(steps);
    try {
      await sample_dialog(dlg);
    } catch (error1) {
      error = error1;
      if (!(error instanceof Dialog_error)) {
        throw error;
      }
      warn('Ω___8', reverse(bold(error.message)));
    }
    dlg.finish();
    ref1 = dlg._act_steps;
    for (ref in ref1) {
      step = ref1[ref];
      if (step instanceof Dialog_failure) {
        warn(ref, step);
      } else {
        help(ref, step);
      }
    }
    info(dlg.results);
    return null;
  };

  //===========================================================================================================
  if (module === require.main) {
    await (async() => {
      // await demo_run_interactive()
      await demo_run_programmatic();
      return null;
    })();
  }

}).call(this);

//# sourceMappingURL=main.js.map