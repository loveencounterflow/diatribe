(function() {
  'use strict';
  var CLK, E, GUY, Interactive_dialog, PATH, Programmatic_dialog, alert, bold, debug, echo, help, info, inspect, invalid, log, mark, plain, praise, reverse, rpr, urge, warn, whisper;

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

  E = require('./errors');

  invalid = Symbol('invalid');

  //===========================================================================================================
  Interactive_dialog = class Interactive_dialog {
    //---------------------------------------------------------------------------------------------------------
    constructor() {
      this.cfg = Object.freeze({
        unique_refs: true
      });
      this./* TAINT make configurable */_pc = -1;
      this.results = {};
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    _record(cfg, value) {
      var message, ref, ref1;
      this._pc++;
      ref = (ref1 = cfg != null ? cfg.ref : void 0) != null ? ref1 : `$q${this._pc + 1}`;
      //.......................................................................................................
      if (this.cfg.unique_refs && Reflect.has(this.results, ref)) {
        message = `duplicate ref: ${ref}`;
        throw new E.Dulicate_ref_error(message);
      }
      //.......................................................................................................
      this.results[ref] = value;
      return value;
    }

    //---------------------------------------------------------------------------------------------------------
    ctrlc(value) {
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
      return this._record(cfg, this.ctrlc((await CLK.confirm(cfg))));
    }

    async text(cfg) {
      return this._record(cfg, this.ctrlc((await CLK.text(cfg))));
    }

    async select(cfg) {
      return this._record(cfg, this.ctrlc((await CLK.select(cfg))));
    }

    async multiselect(cfg) {
      return this._record(cfg, this.ctrlc((await CLK.multiselect(cfg))));
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

  Programmatic_dialog = (function() {
    //===========================================================================================================
    class Programmatic_dialog {
      //---------------------------------------------------------------------------------------------------------
      constructor(exp_steps) {
        this.cfg = Object.freeze({
          unique_refs: true
        });
        this./* TAINT make configurable */exp_steps = this._compile_steps(exp_steps);
        this._pc = -1;
        this.act_steps = [];
        this.results = {};
        // @finished       = false
        this.overrun = false;
        this.invalid = invalid;
        //.......................................................................................................
        GUY.props.def(this, '_failures', {
          enumerable: false,
          configurable: false,
          get: function() {
            var i, len, ref1, results, step;
            ref1 = this.act_steps;
            results = [];
            for (i = 0, len = ref1.length; i < len; i++) {
              step = ref1[i];
              if (step instanceof E.Dialog_failure) {
                results.push(step);
              }
            }
            return results;
          }
        });
        //.......................................................................................................
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _compile_steps(exp_steps) {
        var R, answer, i, len, modal, ref;
        /* TAINT validate properly */
        // unless Array.isArray exp_steps
        //   throw new Error "expected `exp_steps` to be a list, got #{rpr exp_steps}"
        //.......................................................................................................
        R = [];
        for (i = 0, len = exp_steps.length; i < len; i++) {
          ({ref, modal, answer} = exp_steps[i]);
          if (ref == null) {
            ref = null;
          }
          if (modal == null) {
            modal = null;
          }
          if (answer == null) {
            answer = null;
          }
          /* TAINT use method to instantiate */
          R.push(Object.freeze({ref, modal, answer}));
        }
        return Object.freeze(R);
      }

      //---------------------------------------------------------------------------------------------------------
      _next(ref) {
        var message;
        this._pc++;
        if (this._pc >= this.exp_steps.length) {
          message = `emergency halt, running too long: act ${this._count_act_steps()} exp ${this.exp_steps.length}`;
          this._fail(ref, new E.Overrun_failure(message));
          return null;
        }
        // throw new E.Overrun_error message
        return this.exp_steps[this._pc];
      }

      //---------------------------------------------------------------------------------------------------------
      _fail(ref, failure) {
        this.act_steps.push(failure);
        if (failure instanceof E.Overrun_failure) {
          this.overrun = true;
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      async _step(modal, dlg_cfg) {
        var act_ref, exp_step, message, ref1;
        if (this.overrun) {
          return (await GUY.async.defer(function() {
            return invalid;
          }));
        }
        act_ref = (ref1 = dlg_cfg.ref) != null ? ref1 : `$q${this._pc + 2}`;
        //.......................................................................................................
        if (this.cfg.unique_refs && Reflect.has(this.results, act_ref)) {
          message = `duplicate ref: ${act_ref}`;
          this._fail(act_ref, new E.Duplicate_ref_failure(message));
          throw new E.Dulicate_ref_error(message);
        }
        //.......................................................................................................
        exp_step = this._next(act_ref);
        if (this.overrun) {
          return (await GUY.async.defer(function() {
            return invalid;
          }));
        }
        //.......................................................................................................
        this.results[act_ref] = exp_step.answer;
        //.......................................................................................................
        if (act_ref === exp_step.ref) {
          /* TAINT use method to instantiate step */
          this.act_steps.push({
            ref: act_ref,
            modal,
            answer: exp_step.answer
          });
        } else {
          this._fail(act_ref, new E.Misstep_failure(`step#${this._pc}: act ${rpr(act_ref)}, exp ${rpr(exp_step.ref)}`));
        }
        return (await GUY.async.defer(function() {
          return exp_step.answer;
        }));
      }

      //---------------------------------------------------------------------------------------------------------
      _count_act_steps() {
        return this._pc + 1;
      }

      _is_finished() {
        return this._count_act_steps() === this.exp_steps.length;
      }

      // _is_underrun:     -> @_count_act_steps() <  @exp_steps.length
      _is_overrun() {
        return this._count_act_steps() > this.exp_steps.length;
      }

      //---------------------------------------------------------------------------------------------------------
      finish(...P) {
        if (this._is_finished() || this._is_overrun()) {
          //### `dlg.finish()` should be called after the simulated dialog has ben run to issue an  ####
          return true;
        }
        this._fail('$finish', new E.Underrun_failure(`finished too early: act ${this._count_act_steps()} exp ${this.exp_steps.length}`));
        return false;
      }

      //---------------------------------------------------------------------------------------------------------
      intro(step_cfg) {
        return null;
      }

      outro(step_cfg) {
        return null;
      }

      async confirm(step_cfg) {
        var modal;
        return (await this._step((modal = 'confirm'), step_cfg));
      }

      async text(step_cfg) {
        var modal;
        return (await this._step((modal = 'text'), step_cfg));
      }

      async select(step_cfg) {
        var modal;
        return (await this._step((modal = 'select'), step_cfg));
      }

      async multiselect(step_cfg) {
        var modal;
        return (await this._step((modal = 'multiselect'), step_cfg));
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

    //---------------------------------------------------------------------------------------------------------
    Programmatic_dialog.invalid = invalid;

    return Programmatic_dialog;

  }).call(this);

  //===========================================================================================================
  module.exports = {
    Programmatic_dialog,
    Interactive_dialog,
    errors: E,
    invalid
  };

}).call(this);

//# sourceMappingURL=main.js.map