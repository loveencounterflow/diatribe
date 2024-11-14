
# Diatribe

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Diatribe](#diatribe)
  - [Purpose](#purpose)
  - [Notes](#notes)
  - [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->



# Diatribe

## Purpose

Diatribe facilitates authoring command-line interface (CLI) dialogs with a human user including yes&nbsp;/
no questions, singular and plural selection lists and text inputs.

When program control flow depends on user inputs, as it often does, the question arises how to test a
program that interacts with the console for correctness of program execution. For example, in a given CLI,
the question might be `Do you want to create a folder for images (Yes/No)?`. If the user answers `No`, then
the next question might be to input a name for that folder and test whether it's viable (typically, whether
that filename is not taken or represents an existing but empty folder); if the user answers `Yes`, that step
can be skipped. In very simple cases, tests can be done manually by running the program several times and
give answers manually, but that quickly becomes prone to errors and omissions when possible control flows
become more numerous.

One possible way to automate testing the user interaction and program reactions would be to simulate
keyboard inputs in a child process running the CLI program. That option is fraught with a number of
technical difficulties, however; also, it's frequently not so much the functionality of user interaction
that we want to test but rather the resulting program control flow and the effects given inputs have on the
program and the environment.

Another way is to not actually print questions and await user input, but assume that the toolkit responsible
for the display will work OK (something we can establish independently in a manual and generalized manner),
and that what we really should run tests against is the program control flow (resulting from a set of user
inputs) and side effects (like a folder getting created) thereof, and this is what Diatribe enables.

Diatribe offers two classes, `Interactive_dialog` and `Programmatic_dialog` that are expected to be used, in
dependency-injection style, as (optional) arguments to a function that runs the user dialog. Using Diatribe
takes the following general shape:

```coffee
{ Interactive_dialog
  Programmatic_dialog } = require 'diatribe'

#-----------------------------------------------------------------------------------------------------------
run_my_dialog = ( dlg = null ) ->
  # Provide default implementation if none given:
  dlg        ?= new Interactive_dialog()
  #.........................................................................................................
  # Start running user interaction:
  want_pizza  = await dlg.decision { ref: 'want_pizza', message: "Do you want pizza?", }
  #.........................................................................................................
  # Depending on answer, decide what to do:
  if want_pizza
    console.log "You want pizza. Good!"
    want_pineapple  = await dlg.decision { ref: 'want_pineapple', message: "Do you want pinapple?", }
  else
    console.log "Maybe next time."
  #.........................................................................................................
  # It is mandatory to call `dlg.finish()` to signal completion:
  dlg.finish()
  #.........................................................................................................
  # Return what is most useful to you:
  return dlg
```


## Notes

* Testable CLI dialogs for NodeJS

* [`<qclack/prompts`](https://github.com/bombshell-dev/clack/tree/main/packages/prompts#readme)

* Errors entail failures


## To Do

* **[–]** documentation
* **[–]** test for proper ordering of steps
* **[–]** test for wrong refs


