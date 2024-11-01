#===========================================================================================================
### TAINT Later to be extended so we pass in parameters, not messages ###
class @Dialog_error              extends Error
class @Overrun_error             extends @Dialog_error
class @Dulicate_ref_error        extends @Dialog_error

#===========================================================================================================
### TAINT Later to be extended so we pass in parameters, not messages ###
class @Dialog_failure
  constructor: ( @message ) -> undefined

class @Misstep_failure       extends @Dialog_failure
class @Underrun_failure      extends @Dialog_failure
class @Overrun_failure       extends @Dialog_failure
class @Duplicate_ref_failure extends @Dialog_failure
