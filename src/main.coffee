


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
E                         = require './errors'


#===========================================================================================================
class Interactive_dialog

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    @cfg        = Object.freeze { unique_refs: true, } ### TAINT make configurable ###
    @_pc        = -1
    @results    = {}
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _record: ( cfg, value ) ->
    @_pc++
    ref = cfg?.ref ? "$q#{@_pc + 1}"
    #.......................................................................................................
    if @cfg.unique_refs and Reflect.has @results, ref
      message = "duplicate ref: #{ref}"
      throw new E.Dulicate_ref_error message
    #.......................................................................................................
    @results[ ref ]     = value
    return value

  #---------------------------------------------------------------------------------------------------------
  ctrlc: ( value ) ->
    if CLK.isCancel value
      CLK.cancel "Operation cancelled."
      @process_exit 0
    return value

  #---------------------------------------------------------------------------------------------------------
  intro:        ( cfg ) ->                @ctrlc await CLK.intro       cfg
  outro:        ( cfg ) ->                @ctrlc await CLK.outro       cfg
  confirm:      ( cfg ) -> @_record cfg,  @ctrlc await CLK.confirm     cfg
  text:         ( cfg ) -> @_record cfg,  @ctrlc await CLK.text        cfg
  select:       ( cfg ) -> @_record cfg,  @ctrlc await CLK.select      cfg
  multiselect:  ( cfg ) -> @_record cfg,  @ctrlc await CLK.multiselect cfg
  get_spinner:  ( cfg ) -> CLK.spinner()
  finish:               -> null

  #---------------------------------------------------------------------------------------------------------
  process_exit: ( code = 0 ) -> process.exit code


#===========================================================================================================
class Programmatic_dialog

  #---------------------------------------------------------------------------------------------------------
  constructor: ( exp_steps ) ->
    @cfg            = Object.freeze { unique_refs: true, } ### TAINT make configurable ###
    @exp_steps      = @_compile_steps exp_steps
    @_pc            = -1
    @act_steps      = {}
    @results        = {}
    #.......................................................................................................
    GUY.props.def @, '_failures',
      enumerable:   false
      configurable: false
      get:          -> ( d for d in @act_steps when d instanceof E.Dialog_failure )
    #.......................................................................................................
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _compile_steps: ( exp_steps ) ->
    ### TAINT validate ###
    R = []
    for { exp_ref, exp_modal, answer, } in exp_steps
      exp_ref    ?= null
      exp_modal  ?= null
      answer     ?= null
      R.push Object.freeze { exp_ref, exp_modal, answer, }
    return Object.freeze R

  #---------------------------------------------------------------------------------------------------------
  _next: ( ref ) ->
    @_pc++
    if @_pc >= @exp_steps.length
      message = "emergency halt, running too long: act #{@_count_act_steps()} exp #{@exp_steps.length}"
      @_fail ref, new E.Overrun_failure message
      throw new E.Overrun_error message
    return @exp_steps[ @_pc ]

  #---------------------------------------------------------------------------------------------------------
  _fail: ( ref, failure ) ->
    @act_steps[ ref ] = failure
    @_failures.push failure
    return null

  #---------------------------------------------------------------------------------------------------------
  _step: ( modal, dlg_cfg ) ->
    act_ref = dlg_cfg.ref ? "$q#{@_pc + 2}"
    #.......................................................................................................
    if @cfg.unique_refs and Reflect.has @results, act_ref
      message = "duplicate ref: #{act_ref}"
      @_fail act_ref, new E.Duplicate_ref_failure message
      throw new E.Dulicate_ref_error message
    #.......................................................................................................
    { exp_ref
      exp_modal
      answer          } = @_next act_ref
    @results[ act_ref ] = answer
    debug 'Ω___2', { modal, act_ref, exp_ref, exp_modal, answer, }
    #.......................................................................................................
    if act_ref is exp_ref
      @act_steps[ act_ref ] = modal
    else
      @act_steps[ act_ref ] = new E.Misstep_failure "step##{@_pc}: act #{rpr act_ref}, exp #{rpr exp_ref}"
    return await GUY.async.defer -> answer

  #---------------------------------------------------------------------------------------------------------
  _count_act_steps: -> @_pc + 1
  _is_finished:     -> @_count_act_steps() is @exp_steps.length
  # _is_underrun:     -> @_count_act_steps() <  @exp_steps.length
  _is_overrun:      -> @_count_act_steps() >  @exp_steps.length

  #---------------------------------------------------------------------------------------------------------
  finish: ( P... ) ->
    #### `dlg.finish()` should be called after the simulated dialog has ben run to issue an  ####
    return true if @_is_finished() or @_is_overrun()
    @_fail '$finish', new E.Underrun_failure "finished too early: act #{@_count_act_steps()} exp #{@exp_steps.length}"
    return false

  #---------------------------------------------------------------------------------------------------------
  intro:        ( step_cfg )  -> null
  outro:        ( step_cfg )  -> null
  confirm:      ( step_cfg )  -> await @_step ( modal = 'confirm'     ),  step_cfg
  text:         ( step_cfg )  -> await @_step ( modal = 'text'        ),  step_cfg
  select:       ( step_cfg )  -> await @_step ( modal = 'select'      ),  step_cfg
  multiselect:  ( step_cfg )  -> await @_step ( modal = 'multiselect' ),  step_cfg
  get_spinner:                -> { start: ( -> ), stop: ( -> ), }

  #---------------------------------------------------------------------------------------------------------
  process_exit: ( code ) ->
    # not really exiting the process
    return code



#===========================================================================================================
module.exports = { Programmatic_dialog, Interactive_dialog, errors: E, }
