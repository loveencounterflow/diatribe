


'use strict'

#===========================================================================================================
GUY                       = require 'guy'
{ alert
  debug
  help
  info
  plain
  praise
  urge
  warn
  whisper }               = GUY.trm.get_loggers 'diatribe'
{ rpr
  inspect
  echo
  reverse
  bold
  log     }               = GUY.trm
#...........................................................................................................
CLK                       = require '@clack/prompts'
PATH                      = require 'node:path'
mark                      = ( ref ) -> urge reverse bold " #{ref} "


#===========================================================================================================
### TAINT Later to be extended so we pass in parameters, not messages ###
class Dialog_error              extends Error
class Overrun_error             extends Dialog_error
class Dulicate_ref_error        extends Dialog_error

#===========================================================================================================
### TAINT Later to be extended so we pass in parameters, not messages ###
class Dialog_failure
  constructor: ( @message ) -> undefined

class Misstep_failure       extends Dialog_failure
class Underrun_failure      extends Dialog_failure
class Overrun_failure       extends Dialog_failure
class Duplicate_ref_failure extends Dialog_failure


#===========================================================================================================
class Interactive_dialog

  #---------------------------------------------------------------------------------------------------------
  ctrlc: ( value ) ->
    # debug 'Ω___3', rpr value
    if CLK.isCancel value
      CLK.cancel "Operation cancelled."
      @process_exit 0
    return value

  #---------------------------------------------------------------------------------------------------------
  intro:        ( cfg ) -> @ctrlc await CLK.intro       cfg
  outro:        ( cfg ) -> @ctrlc await CLK.outro       cfg
  confirm:      ( cfg ) -> @ctrlc await CLK.confirm     cfg
  text:         ( cfg ) -> @ctrlc await CLK.text        cfg
  select:       ( cfg ) -> @ctrlc await CLK.select      cfg
  multiselect:  ( cfg ) -> @ctrlc await CLK.multiselect cfg
  get_spinner:  ( cfg ) -> CLK.spinner()
  finish:               -> null

  #---------------------------------------------------------------------------------------------------------
  process_exit: ( code = 0 ) -> process.exit code


#===========================================================================================================
class Programmatic_dialog

  #---------------------------------------------------------------------------------------------------------
  constructor: ( steps ) ->
    @cfg        = Object.freeze { unique_refs: true, } ### TAINT make configurable ###
    @_exp_steps = steps
    @_exp_keys  = Object.keys @_exp_steps
    @_pc        = -1
    @_act_steps = {}
    @results    = {}
    #.......................................................................................................
    GUY.props.def @, '_failures',
      enumerable:   false
      configurable: false
      get:          -> ( d for d in @_act_steps when d instanceof Dialog_failure )
    #.......................................................................................................
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _next: ( ref ) ->
    @_pc++
    if ( not ( key = @_exp_keys[ @_pc ] ? null )? ) or ( not ( R = @_exp_steps[ key ] ? null )? )
      message = "emergency halt, running too long: act #{@_count_act_steps()} exp #{@_exp_keys.length}"
      @_fail ref, new Overrun_failure message
      throw new Overrun_error message
    return R

  #---------------------------------------------------------------------------------------------------------
  _fail: ( ref, failure ) ->
    @_act_steps[ ref ] = failure
    @_failures.push failure
    return null

  #---------------------------------------------------------------------------------------------------------
  _step: ( act_key, cfg ) ->
    ref = cfg?.ref ? "$q#{@_pc + 2}"
    #.......................................................................................................
    if @cfg.unique_refs and Reflect.has @results, ref
      message = "duplicate ref: #{ref}"
      @_fail ref, new Duplicate_ref_failure message
      throw new Dulicate_ref_error message
    #.......................................................................................................
    [ exp_key, value, ] = @_next ref
    @results[ ref ]     = value
    #.......................................................................................................
    if act_key is exp_key
      @_act_steps[ ref ] = act_key
    else
      @_act_steps[ ref ] = new Misstep_failure "step##{@_pc}: act #{rpr act_key}, exp #{rpr exp_key}"
    return await GUY.async.defer -> value

  #---------------------------------------------------------------------------------------------------------
  _count_act_steps: -> @_pc + 1
  _is_finished:     -> @_count_act_steps() is @_exp_keys.length
  # _is_underrun:     -> @_count_act_steps() <  @_exp_keys.length
  _is_overrun:      -> @_count_act_steps() >  @_exp_keys.length

  #---------------------------------------------------------------------------------------------------------
  finish: ( P... ) ->
    #### `dlg.finish()` should be called after the simulated dialog has ben run to issue an  ####
    return true if @_is_finished() or @_is_overrun()
    @_fail '$finish', new Underrun_failure "finished too early: act #{@_count_act_steps()} exp #{@_exp_keys.length}"
    return false

  #---------------------------------------------------------------------------------------------------------
  intro:        ( cfg ) -> null
  outro:        ( cfg ) -> null
  confirm:      ( cfg ) -> await @_step 'confirm',      cfg
  text:         ( cfg ) -> await @_step 'text',         cfg
  select:       ( cfg ) -> await @_step 'select',       cfg
  multiselect:  ( cfg ) -> await @_step 'multiselect',  cfg
  get_spinner:          -> { start: ( -> ), stop: ( -> ), }

  #---------------------------------------------------------------------------------------------------------
  process_exit: ( code ) ->
    # not really exiting the process
    return code



#===========================================================================================================

