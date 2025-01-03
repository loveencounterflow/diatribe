
# Diatribe

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Diatribe](#diatribe)
  - [Purpose](#purpose)
  - [Method and Example](#method-and-example)
    - [Scripting a Dialog](#scripting-a-dialog)
    - [Running with Interactive Dialog](#running-with-interactive-dialog)
    - [Running with Programmatic Dialog](#running-with-programmatic-dialog)
  - [Notes](#notes)
  - [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->



# Diatribe

## Purpose

Diatribe facilitates authoring command-line interface (CLI) dialogs with a human user including yes&nbsp;/
no questions, singular and plural selection lists and text inputs.

When program control flow depends on user inputs the question arises: *how to test a program that interacts
with the console for correctness of program execution?*

For example, in a given CLI, one step of the dialog might be `Do you want to create a folder for images
(Yes/No)?`.

* If the user answers `No`, then the next question might be
  * to input a name for that folder and test whether it's viable (typically, whether that filename is not
    taken or represents an existing but empty folder)
* If the user, however, answers `Yes`, that step can be skipped.

As a result, we already have two distinct control flow paths to test for. This can become more complex quite
quickly when several chained choices multiply the number of paths a Q&nbsp;\&&nbsp;A session can take. In
very simple cases, tests can be done manually by running the program several times and give answers
manually, but that quickly becomes prone to errors and omissions when possible control flows become more
numerous.

One way to automate testing the user interaction and program reactions is to simulate keyboard inputs in a
child process running the CLI program. That option is fraught with a number of technical difficulties,
however; also, it's frequently not so much the functionality of user interaction *as such* that we want to
test, that is, we can quickly convince ourselves that our chosen CLI dialog tool reacts correctly to, say,
pressing <kbd>arrow-up</kbd> and <kbd>arrow-down</kbd> or that it accepts user text inputs and so on.

Rather, we want to guide our program to walk down each possible control flow path and assert that side
effects (such as creation of folders and so on) have been successfully performed. What is needed, therefore,
is a way to run our program along a prescribed path with fidelity but without halting to wait for user
interaction, and this is what Diatribe enables.

## Method and Example

### Scripting a Dialog

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
  want_pizza  = await dlg.confirm { ref: 'want_pizza', message: "Do you want pizza?", }
  #.........................................................................................................
  # Depending on answer, decide what to do:
  if want_pizza
    console.log "You want pizza. Good!"
    #.......................................................................................................
    # If so inclined, we could perform some actions here that only take place when the answer was `Yes`; in
    # this example, we only ask a conditional follow-up question for the toppings.
    #.......................................................................................................
    want_pineapple  = await dlg.confirm { ref: 'want_pineapple', message: "Do you want pinapple?", }
  else
    console.log "Maybe next time."
  #.........................................................................................................
  # It is mandatory to call `dlg.finish()` to signal completion:
  dlg.finish()
  #.........................................................................................................
  # Return whatever is most useful to you; conventionally, the `dlg` instance:
  return dlg
```

### Running with Interactive Dialog


**1)** In this very simple example, there are only two possible control flow paths, depending on whether the
 answer to the first question is `No` or `Yes`. If it's `No`, a message is printed and no further
 questions are asked:

```
│
◇  Do you want pizza?
│  No
Maybe next time.
```

Inspecting the **`Interactive_dialog::results`** property tells you what the answer to that single question
was; you may choose to do whatever you program is meant to do either *during* the interview, using the
individual return values of each dialog, or *after* the interview, using the `Interactive_dialog::results`
property:

```
dlg.results: { want_pizza: false }
```

In addition to `Interactive_dialog::results`, there's **`Interactive_dialog::act_steps`** which lists
the steps that were `act`ually taken during the conversation:

```
dlg.act_steps: [ { ref: 'want_pizza', modal: 'confirm', answer: false } ]
```

In this case there was only a single question asked, so there's just a single entry in the `act_steps`
list. This property will become important for testing, see below.


**2)** The only other control flow in this simple example is caused by answering `Yes` to the first
question:

```
◇  Do you want pizza?
│  ● Yes / ○ No
│  Yes
You want pizza. Good!
│
◇  Do you want pinapple?
│  ● Yes / ○ No
│  Yes
```

The **`Interactive_dialog::results`** property reflects the additional result:

```
dlg.results: { want_pizza: true, want_pineapple: true }
```

And we can see the additional step in the **`Interactive_dialog::act_steps`** property:

```
dlg.act_steps: [
  { ref: 'want_pizza',      modal: 'confirm', answer: true },
  { ref: 'want_pineapple',  modal: 'confirm', answer: false } ]
```

### Running with Programmatic Dialog

In order to write a test for this dialog, we will pass in an explicit `Programmatic_dialog` instance instead
of using the implicitly instantiated `Interactive_dialog` instance (this is the part that is called
`dependency injection` because we 'inject' (pass in) a value that our program depends on). The setup used
here is of course purely conventional; we could've just as well written two methods
`run_interactive_dialog()`, `run_programmatic_dialog()` or pass in a Boolean `for_testing` to signal what we
want instead; design this part according to your needs.

Now, in order to instantiate a `Programmatic_dialog`, we have to give it a list of `exp`ected steps
(`exp_steps`). The shape of this list is the same as that of `act_steps`; crucially, we have to supply an
`answer` value for each dialog that should be one of the possible values that an actual interactive dialog
method would return (IOW `act_steps[ n ].answer` represents what the user chose to answer while `exp_steps[
n ].answer` represents what the tester wants the answer to be).

We can only model a single control flow with a given run of the interview, meaning that in order to obtain
complete test coverage in our toy example, we must write two tests (or three if we wanted to test for the
second question as well—which does not, however, affect control flow).

When the `run_my_dialog()` method has called `finish()`ed, we can then test whether `dlg.act_steps` and the
`exp_steps` list are stepwise equal; if so, our test was successful.


<!-- ################################################################################################### -->

```
————————————————————————————————————————
exp_steps: [
  { exp_ref: 'want_pizza', exp_modal: 'confirm', answer: false } ]

00:00 ⚙  diatribe Ω___2 { modal: 'confirm', act_ref: 'want_pizza', exp_ref: 'want_pizza', exp_modal: 'confirm', answer: false }
Maybe next time.

dlg.act_steps: { want_pizza: 'confirm' }
dlg.results: { want_pizza: false }
————————————————————————————————————————
exp_steps: [
  { exp_ref: 'want_pizza', exp_modal: 'confirm', answer: true } ]

00:00 ⚙  diatribe Ω___2 { modal: 'confirm', act_ref: 'want_pizza', exp_ref: 'want_pizza', exp_modal: 'confirm', answer: true }
You want pizza. Good!
00:00 !  diatribe/test-all Ω__12 emergency halt, running too long: act 2 exp 1
————————————————————————————————————————
exp_steps: [
  { exp_ref: 'want_pizza',      exp_modal: 'confirm', answer: true   },
  { exp_ref: 'want_pineapple',  exp_modal: 'confirm', answer: false  } ]

00:00 ⚙  diatribe Ω___2 { modal: 'confirm', act_ref: 'want_pizza', exp_ref: 'want_pizza', exp_modal: 'confirm', answer: true }
You want pizza. Good!
00:00 ⚙  diatribe Ω___2 { modal: 'confirm', act_ref: 'want_pineapple', exp_ref: 'want_pineapple', exp_modal: 'confirm', answer: false }

dlg.act_steps: { want_pizza: 'confirm', want_pineapple: 'confirm' }
dlg.results: { want_pizza: true, want_pineapple: false }
————————————————————————————————————————
exp_steps: [
  { exp_ref: 'want_pizza',      exp_modal: 'confirm', answer: false },
  { exp_ref: 'want_pineapple',  exp_modal: 'confirm', answer: false } ]

00:00 ⚙  diatribe Ω___2 { modal: 'confirm', act_ref: 'want_pizza', exp_ref: 'want_pizza', exp_modal: 'confirm', answer: false }
Maybe next time.

dlg.act_steps: { want_pizza: 'confirm', '$finish': Underrun_failure { message: 'finished too early: act 1 exp 2' } }
dlg.results: { want_pizza: false }
```



<!-- ################################################################################################### -->

## Notes

* Testable CLI dialogs for NodeJS

* [`<qclack/prompts`](https://github.com/bombshell-dev/clack/tree/main/packages/prompts#readme)

* Errors entail failures


## To Do

* **[–]** documentation
* **[–]** test for proper ordering of steps
* **[–]** test for wrong refs
* **[–]** implement `set()` or similar to set the value of a given result identified by its `ref`
* **[+]** do not throw error on overrun; instead, set flag that instructs potential next dialog step to
  insert an `Overrun_failure()` into `dlg.act_steps` and return a special sentinel value `dlg.invalid` (a
  private symbol); all subsequent calls to a dialog method will do nothing but return `dlg.invalid`
  * **[–]** add documentation that when writing a conversation, one should always check for the return value
    being `dlg.invalid`
* **[–]** do throw error when user tries to run `dlg` instance more than once


