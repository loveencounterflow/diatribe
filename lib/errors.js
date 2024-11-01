(function() {
  //===========================================================================================================
  /* TAINT Later to be extended so we pass in parameters, not messages */
  this.Dialog_error = class Dialog_error extends Error {};

  this.Overrun_error = class Overrun_error extends this.Dialog_error {};

  this.Dulicate_ref_error = class Dulicate_ref_error extends this.Dialog_error {};

  //===========================================================================================================
  /* TAINT Later to be extended so we pass in parameters, not messages */
  this.Dialog_failure = class Dialog_failure {
    constructor(message) {
      this.message = message;
      void 0;
    }

  };

  this.Misstep_failure = class Misstep_failure extends this.Dialog_failure {};

  this.Underrun_failure = class Underrun_failure extends this.Dialog_failure {};

  this.Overrun_failure = class Overrun_failure extends this.Dialog_failure {};

  this.Duplicate_ref_failure = class Duplicate_ref_failure extends this.Dialog_failure {};

}).call(this);

//# sourceMappingURL=errors.js.map