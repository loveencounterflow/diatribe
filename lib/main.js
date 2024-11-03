(function() {
  'use strict';
  var CLK, E, GUY, Interactive_dialog, PATH, Programmatic_dialog, alert, bold, debug, echo, help, info, inspect, log, mark, plain, praise, reverse, rpr, urge, warn, whisper;

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

  //===========================================================================================================
  Programmatic_dialog = class Programmatic_dialog {
    //---------------------------------------------------------------------------------------------------------
    constructor(exp_steps) {
      this.cfg = Object.freeze({
        unique_refs: true
      });
      this./* TAINT make configurable */exp_steps = exp_steps;
      this._exp_refs = Object.keys(this.exp_steps);
      this._pc = -1;
      this.act_steps = {};
      this.results = {};
      //.......................................................................................................
      GUY.props.def(this, '_failures', {
        enumerable: false,
        configurable: false,
        get: function() {
          var d, i, len, ref1, results;
          ref1 = this.act_steps;
          results = [];
          for (i = 0, len = ref1.length; i < len; i++) {
            d = ref1[i];
            if (d instanceof E.Dialog_failure) {
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
      var R, message, ref1, ref2;
      this._pc++;
      if (((ref = (ref1 = this._exp_refs[this._pc]) != null ? ref1 : null) == null) || ((R = (ref2 = this.exp_steps[ref]) != null ? ref2 : null) == null)) {
        message = `emergency halt, running too long: act ${this._count_act_steps()} exp ${this._exp_refs.length}`;
        this._fail(ref, new E.Overrun_failure(message));
        throw new E.Overrun_error(message);
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _fail(ref, failure) {
      this.act_steps[ref] = failure;
      this._failures.push(failure);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    async _step(dlg_name, cfg) {
      var act_ref, exp_ref, message, ref1, value;
      act_ref = (ref1 = cfg != null ? cfg.ref : void 0) != null ? ref1 : `$q${this._pc + 2}`;
      //.......................................................................................................
      if (this.cfg.unique_refs && Reflect.has(this.results, act_ref)) {
        message = `duplicate ref: ${act_ref}`;
        this._fail(act_ref, new E.Duplicate_ref_failure(message));
        throw new E.Dulicate_ref_error(message);
      }
      //.......................................................................................................
      [exp_ref, value] = this._next(act_ref);
      this.results[act_ref] = value;
      debug('Ω__1', {dlg_name, act_ref, exp_ref});
      //.......................................................................................................
      if (act_ref === exp_ref) {
        this.act_steps[act_ref] = dlg_name;
      } else {
        this.act_steps[act_ref] = new E.Misstep_failure(`step#${this._pc}: act ${rpr(act_ref)}, exp ${rpr(exp_ref)}`);
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
      return this._count_act_steps() === this._exp_refs.length;
    }

    // _is_underrun:     -> @_count_act_steps() <  @_exp_refs.length
    _is_overrun() {
      return this._count_act_steps() > this._exp_refs.length;
    }

    //---------------------------------------------------------------------------------------------------------
    finish(...P) {
      if (this._is_finished() || this._is_overrun()) {
        //### `dlg.finish()` should be called after the simulated dialog has ben run to issue an  ####
        return true;
      }
      this._fail('$finish', new E.Underrun_failure(`finished too early: act ${this._count_act_steps()} exp ${this._exp_refs.length}`));
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
      var dlg_name;
      return (await this._step((dlg_name = 'confirm'), step_cfg));
    }

    async text(step_cfg) {
      var dlg_name;
      return (await this._step((dlg_name = 'text'), step_cfg));
    }

    async select(step_cfg) {
      var dlg_name;
      return (await this._step((dlg_name = 'select'), step_cfg));
    }

    async multiselect(step_cfg) {
      var dlg_name;
      return (await this._step((dlg_name = 'multiselect'), step_cfg));
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
  module.exports = {
    Programmatic_dialog,
    Interactive_dialog,
    errors: E
  };

}).call(this);

//# sourceMappingURL=main.js.map